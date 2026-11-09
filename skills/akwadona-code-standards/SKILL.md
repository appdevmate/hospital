---
name: akwadona-code-standards
description: Use when writing, editing, or reviewing Akwadona code — Lambda handlers, Angular components/services, CDK stacks, PowerShell scripts, or docs. Enforces the project's established conventions: inline helpers, JWT claim parsing, CRUD patterns, Lambda factory, memory sizing, catch-all routes, CFN resource budget, deploy flow, cache-cleanup, test fixtures. Keeps new code shaped like existing code so the diff reviewer never has to re-decide fundamentals.
---

# Akwadona Code Standards

The platform has 42 Lambdas (39 API-serving + pre-token, seed, create-users), 2 CDK stacks (edge/WAF stack currently not deployed), 23 Angular services, and 30+ numbered docs. Consistency matters more than cleverness. Match the shape of what already exists.

## 1. Lambda conventions

### 1.1 Factory signature
Lambdas are built with the `fn()` helper in `lib/akwadona-cdk-stack.ts`:
```ts
fn(logicalId, folder, handler, runtime?, extraEnv?, { memorySize?, functionName? })
```
- Default memory **512 MB** — don't lower it; cold start scales with CPU which scales with memory.
- Default runtime **NODEJS_20_X** (raised from 18 on 2026-10-29 — never add a new Lambda on 18). `NODEJS_24_X` for aggregate domain Lambdas (examinations, pharmacy, document-manager, audit, appointments, invoices).
- **Never filter or sort on an encrypted field inside a DynamoDB expression.** `name`, `dob`, `email`, `qid`, `phone`, `notes`, `education`, `licenseNumber` are ciphertext (see `PATIENT_PHI_FIELDS` / `DOCTOR_PHI_FIELDS` in `crypto.js`). Query the tenant GSI with plaintext predicates only, `decryptItems()`, then filter/sort in memory. `getAllPatients/index.js` is the reference implementation.
- **Never Scan.** Every list is a Query on `tenant-entityType-index` (tenant rows) or `EntityType-index` (global rows such as TENANT / departments). A `ScanCommand` import is a code-review blocker.
- **TTL attribute is `expiresAt`** (epoch seconds). Not `ttl`.
- **Read-only Lambda → `readOnlyFunctions` list in the CDK stack** (grantReadData + scoped THROTTLE# UpdateItem). Mutating Lambda → `readWriteFunctions`.
- **No CORS headers from Lambda.** API Gateway's `corsPreflight` allow-list is the only source; a literal `Access-Control-Allow-Origin` in a handler is a code-review blocker.
- `functionName` override is REQUIRED for new Lambdas → must deploy as `akwadona-<kebab-case-feature>`. Source folder can keep original name for diff minimality.

### 1.2 Shared helpers must be inlined
`require('../_shared/*')` fails at runtime (CDK packages one folder). Copy the helper function into the Lambda's `index.js` AND remember to re-run `scripts/sync-shared-helpers.js` after editing a `_shared/*` reference copy.

### 1.3 Handler skeleton (copy this for new Lambdas)
```js
'use strict';
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' }));
const TABLE = process.env.TABLE_NAME || 'Hospital';

// ── INLINE tenant guard (do NOT require ../_shared/tenant.js) ──
function getTenant(event) {
  const c = event.requestContext?.authorizer?.jwt?.claims || event.requestContext?.authorizer?.claims || {};
  const tid = c.tenantId || c['custom:tenantId'];
  if (!tid || tid === 'UNASSIGNED') { const e = new Error('Tenant not assigned'); e.statusCode = 403; throw e; }
  return tid;
}

// ── INLINE identity + role parsing ──
function getActor(event) {
  const c = event.requestContext?.authorizer?.jwt?.claims || event.requestContext?.authorizer?.claims || {};
  const g = c['cognito:groups'] || '';
  const groups = Array.isArray(g) ? g.map(x => String(x).trim())
                                  : String(g).trim().replace(/^\[|\]$/g, '').split(/[,\s]+/).filter(Boolean);
  return {
    email: (c.email || c['cognito:username'] || '').toLowerCase().trim(),
    name:  c.name  || '',
    role:  c.role  || '',
    doctorId: c.doctorId || null,
    groups,
    isAdmin:      groups.some(x => ['Admin','admin','Developers','Developer','developer'].includes(x)),
    isDoctor:     groups.some(x => ['Doctors','Doctor','doctor'].includes(x)),
    isPharmacist: groups.some(x => ['Pharmacists','Pharmacist','pharmacist'].includes(x)),
    isOperator:   c.role === 'operator'
  };
}

const res = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const err = (code, message) => res(code, { error: message, message });
const now = () => new Date().toISOString();

exports.handler = async (event) => {
  if (event && event._warmup) return { ok: true, warmed: true };
  try {
    if (event.requestContext?.http?.method === 'OPTIONS') return res(200, {});
    const tenantId = getTenant(event);
    const actor = getActor(event);
    const route = event.routeKey || `${event.requestContext?.http?.method} ${event.rawPath}`;
    // Dispatch…
    return err(404, `Unknown route: ${route}`);
  } catch (e) {
    if (e.statusCode) return err(e.statusCode, e.message);
    console.error('handler error:', e);
    return err(500, e.message || 'Internal error');
  }
};
```

### 1.4 CRUD patterns

| Operation | Pattern |
|---|---|
| CREATE | PutItem with `tenantId`, `EntityType`, `dataClass`, `createdAt`, `updatedAt` (both set to `now()`, **never NULL**). Encrypt PHI with `crypto::encryptForTenant`. Compute `*Hash` for searchable fields. |
| LIST | Query `tenant-entityType-index`, PK=`tenantId`, SK=`EntityType`. **No Scan.** |
| GET by id | GetItem → if `item.tenantId !== tenantId` return **404** (not 403). |
| PATCH | GetItem (verify tenant) → UpdateItem (set `updatedAt`). Never set `updatedAt` to `null`. |
| DELETE | Soft-delete via `deletedAt`. Hard-delete only in operator wizard rollback. |
| Audit | Write `AUDIT#YYYY-MM-DD / AUDIT#<iso>#<uuid>` row. Swallow errors with try/catch. |

### 1.5 No wildcard CORS
Lambda response headers must NOT include `Access-Control-Allow-Origin: '*'`. The HTTP API `corsPreflight` config already carries the tenant allow-list.

## 2. CDK conventions

- Keep new resources inside `AkwadonaStack` unless they belong on the edge (CloudFront WAF).
- Logical IDs: PascalCase, start with `Akwadona`. Example: `AkwadonaBloodbank` not `BloodbankLambda`.
- Resource budget: CloudFormation stack is near the **500-resource ceiling**. Prefer catch-all routes (`/foo/{proxy+}`) and shared `ManagedPolicy` over per-Lambda statements.
- Memory: default 512 MB. Don't instance-tune without a profile — the CPU allocation vs memory ratio is Lambda's main perf knob.
- Deployed names: use the `functionName` override so AWS Console / CloudWatch logs show `akwadona-<kebab-case>`.

## 3. Angular conventions

- Angular 20 standalone components. No NgModules.
- Services under `src/app/services/`, components under `src/app/components/<feature>/`.
- Breadcrumb strings in routes are **translation keys** (`'pages.doctors.title'`), not literal English. Add the key to every `public/i18n/*.json`.
- API calls go through `Config.buildUrl(path)` — single source of truth for the API host.
- Auth: `authInterceptor` adds the Bearer token for same-origin, redirects on 401. `offlineQueueInterceptor` runs first and short-circuits mutations when offline.
- State: signals-based (no RxJS BehaviorSubject proliferation). Keep component state in `signal<...>()` / `computed()`.
- Change detection: `ChangeDetectionStrategy.OnPush` on every new component. Call `cdr.markForCheck()` from async callbacks that mutate state.

## 4. PowerShell / scripts

- Script header must declare `[CmdletBinding()]` + `$ErrorActionPreference = 'Stop'`.
- Idempotency first: a backfill script must be safe to re-run. Guard mutations with `attribute_not_exists` or dedup by HMAC-hashed input.
- Timestamps in log output use ISO-8601 (`Get-Date -Format o`).
- Use `aws cognito-idp` / `aws dynamodb` / `aws kms` directly where possible — avoid wrapping in Node unless the logic is reusable from a Lambda.

## 5. Docs

- Every new feature gets a doc number continuing the 00- series (`docs/<nn>-<feature>.md`).
- Use the four-part explain pattern from `AKW-SO-01-Solution-Overview.md`: **What it is → Why it exists → Real-life example → How Akwadona uses it.**
- Cross-link related docs (`See AKW-SSP-05-System-Security-Plan.md`), don't duplicate content.
- Code blocks must be executable or exactly-copyable. If you reference a variable, define it in the preceding block.

## 6. Deploy flow (canonical)

Current, non-stale version — do NOT use the committed `deploy.ps1` or `deploy-push-commands.txt` without updating their IDs first (both still reference dead Tiryaq-era resources).

```powershell
# Backend
cd "C:\Users\Sami Toufic Taha\Desktop\aws apps\hospital\akwadona-cdk"
npx cdk deploy --require-approval never --profile tiryaq-cdk

# Frontend (from repo root)
cd "C:\Users\Sami Toufic Taha\Desktop\aws apps\hospital"
Remove-Item -Recurse -Force .angular\cache -ErrorAction SilentlyContinue
ng build --configuration production
aws s3 sync "dist\verona-ng\browser" "s3://<CURRENT_akwadonacdkstack_bucket>" --delete
aws cloudfront create-invalidation --distribution-id E1YOKWKHQNSPQW --paths "/*"
```

Verify the bucket name live: `aws s3 ls | grep akwadonacdkstack`.

## 7. Testing

- Unit tests via Karma (template kept but under-used — add when touching critical crypto/tenant code).
- End-to-end: `AKW-EH-10-Engineering-Handbook.md` + `AKW-EH-10-Engineering-Handbook.md` are the manual walkthroughs. Update them when adding modules.
- Load test: `scripts/loadtest/` — targeted at per-tenant throughput, not whole-platform.
- Security probes: `scripts/cross-tenant-probe.js` (cross-tenant CRUD) and `scripts/security-tests/` (transport, auth bypass, CORS, enumeration, injection, role escalation, rate limit). Run both before every release; neither is scheduled yet — do not describe them as "nightly". Extend `destructive/10-cross-tenant-crud.js` when adding a module.

## 8. Git hygiene

- Branch: work on `development`. There is no `main` in regular use.
- Commits: imperative subject, scope prefix for infra (`feat(infra): …`, `fix(auth): …`, `docs: …`).
- `git status` shows CRLF noise — ignore it unless your diff truly adds content. Use `git diff -w --shortstat` to confirm.
- Do not commit `node_modules/`, `dist/`, `.angular/`, `cdk.out/`, `function.zip`.

## 9. Response format when applying this skill

For any code change proposal:

1. **Pattern match** — which existing Lambda / component / doc does this most resemble?
2. **Diff** — exact file:line edits.
3. **Spots to recheck** — reference other skills (`akwadona-security-review`, `akwadona-deploy-safety`) if the change crosses their domain.
4. **Doc update** — which `docs/<nn>-*.md` to update + what to add.

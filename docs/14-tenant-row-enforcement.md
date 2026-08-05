# Step 2d-4 — Per-Row Tenant Enforcement on Big Domain Lambdas

## What this is — easy English

- Akwadona is multi-tenant. Tiryaq Hospital, Alshifaa Hospital, and every future customer share the same Lambdas and the same DynamoDB table (the "bridge" model — same one Stripe Connect, Athenahealth, and Salesforce use).
- Step 2d already proved the user belongs to a tenant by reading the signed JWT (`tenantId` claim from the Cognito pre-token Lambda).
- Step 2d-4 closes the last gap: **every single row read or write is now also gated by `tenantId`**, not just the API call boundary.
- Result: even if a Tiryaq user steals or guesses an Alshifaa row id, the database itself refuses the request.

## Why one tenant check is not enough — the leak we closed

- Old shape: Lambda reads `tenantId` from the JWT at the start, but then runs `GetCommand({ Key: { PK: 'PATIENT#xyz' } })` blindly. DynamoDB does not know which tenant the caller belongs to. It returns whatever row matches the key.
- An attacker who knows or guesses a row id from Tenant A → Lambda happily returns it.
- This is OWASP A01:2021 — Broken Access Control. The fix is mandatory for any HIPAA-grade SaaS.
- Same defense pattern as:
  - **Stripe** — every read carries `account_id` and is filtered server-side
  - **Athenahealth** — per-practice row guards on every PHI table
  - **Salesforce** — every row carries `Org-Id`; the multi-tenant query rewriter injects it into every SQL

## The three defense layers (depth-in-depth)

1. **JWT entry guard** — Cognito-signed JWT carries `tenantId`. Rejects users where `tenantId` is missing or `UNASSIGNED`. Cannot be forged client-side. (Step 2d.)
2. **Application guard** (Step 2d-4 — new) — Before returning any row by id, the Lambda calls `assertRowTenant(row, callerTenantId)`. Mismatch → 404 (not 403, to hide existence).
3. **Database guard** (Step 2d-4 — new) — Every `UpdateCommand` / `DeleteCommand` carries `ConditionExpression: #tenantId = :__callerTenantId`. DynamoDB atomically rejects cross-tenant writes even under race conditions.

## The shared helper — `_shared/tenant-guard.js`

Master copy at `akwadona-cdk/lambda/_shared/tenant-guard.js`. Synced by `scripts/sync-shared-helpers.js` into every target Lambda folder before `cdk deploy`.

Public API:

- `assertRowTenant(row, callerTenantId, opts?)` — read-side guard. Throws `Error` with `statusCode = 404` on mismatch. Sets `crossTenantAttempt = true` for server-side logging.
- `tenantCondition(callerTenantId)` — returns `{ ConditionExpression, ExpressionAttributeNames, ExpressionAttributeValues }` ready to merge into any DDB write.
- `mergeTenantCondition(existing, callerTenantId)` — combines tenant guard with any existing condition (e.g. `attribute_exists(PK)`) using AND.
- `throwAs404IfCrossTenant(err)` — translates DynamoDB `ConditionalCheckFailedException` to a 404.

## Why 404 (not 403) — hide existence

- 403 leaks that the id exists somewhere on the platform.
- 404 makes "wrong tenant" identical to "doesn't exist anywhere".
- OWASP recommendation; matches Stripe / GitHub / Box patterns.

## Per-Lambda matrix — what got wired

| Lambda | DDB calls | Tenant refs before | Tenant refs after | Notes |
|---|---|---|---|---|
| akwadona-bloodbank | 39 | 7 | 66 | Donors, donations, units, requests, crossmatches, issues — every row stamped + guarded |
| akwadona-pharmacy | 35 | 7 | 42 | Medications, inventory, dispense, POs, alerts — cross-domain reads (PATIENT/EXAM/MED) also tenant-checked |
| akwadona-examinations | 22 | 14 | 35 | **Fixed latent bug**: existing crypto calls referenced undefined `tenantId` (was `__tenantId`); renamed for consistency |
| akwadona-calendar | 16 | 6 | 25 | Calendars + events; cascade-delete also tenant-scoped |
| akwadona-scribe | 8 | 5 | 18 | Scribe sessions + audit rows; **fixed latent bug**: getTenant return value was discarded |
| akwadona-document-manager | 3 | 6 | 24 | No PHI rows in DDB — S3 key prefix rewritten to isolate listings per tenant |

## Per-row stamping — every `Put` now carries `tenantId`

- Bloodbank: donors, donations, units, requests, crossmatches, issues
- Pharmacy: medications, inventory, dispense, purchase orders
- Examinations: exams, DOCTOR_PATIENT link rows
- Calendar: calendars, events
- Scribe: sessions, audit rows
- Document Manager: S3 object metadata (`tenant-id`)

## List queries — every `Query` now filters by `tenantId`

- Every list endpoint adds `FilterExpression: 'tenantId = :tnt'` against the JWT-derived tenant id.
- Result: cross-tenant data cannot even be enumerated, let alone read.

## Document Manager — S3 key format change (BREAKING for legacy files)

- **Old key**: `folder/<userId>/<timestamp>_<file>` → `/list?folder=lab-results` returned EVERY tenant's files. This was the worst leak in the codebase.
- **New key**: `folder/<tenantId>/<userId>/<timestamp>_<file>` → `/list` scopes to `folder/<callerTenantId>/`.
- **Backward compat**: download + delete recognize legacy keys (`folder/<userId>/...`) but only admin/developer roles can touch them. Logged as `legacy doc download` / `legacy doc delete` for forensics.
- **Migration job (todo)**: write a one-off script to rewrite legacy S3 keys into the new shape using the user's known tenant. After migration, drop the legacy branch.

## Latent bugs uncovered + fixed

- **akwadona-examinations**: 7 calls to `encryptItem(..., tenantId)` referenced an undefined `tenantId` symbol (the variable was named `__tenantId`). Encryption likely worked because the helper tolerated undefined, but cross-tenant key separation was effectively broken. Fixed by renaming the variable.
- **akwadona-scribe**: router called `getTenant(event)` but discarded the return value. Throttle had to re-derive tenantId from claims as a fallback. Fixed by capturing properly.
- **akwadona-document-manager**: `/list` exposed every tenant's files. Fixed by switching the S3 key prefix to include `tenantId`.

## What the helpers do at the wire level

### Read path

```js
const row = (await ddb.send(new GetCommand({ ... }))).Item;
assertRowTenant(row, tenantId);  // throws 404 if row.tenantId !== tenantId
```

### Write path

```js
const guarded = mergeTenantCondition(
  { ConditionExpression: 'attribute_exists(PK)' },
  tenantId
);
await ddb.send(new UpdateCommand({
  Key, UpdateExpression: 'SET #n = :n',
  ExpressionAttributeNames:  { '#n': 'name', ...guarded.ExpressionAttributeNames },
  ExpressionAttributeValues: { ':n': 'x',    ...guarded.ExpressionAttributeValues },
  ConditionExpression:       guarded.ConditionExpression
}));
```

Final `ConditionExpression` becomes `(attribute_exists(PK)) AND (#tenantId = :__callerTenantId)`. The Lambda catches `ConditionalCheckFailedException` and returns 404.

## How to deploy

```powershell
# 1. Sync the shared helper into every target Lambda folder.
node scripts/sync-shared-helpers.js

# 2. Deploy backend only (no frontend changes in Step 2d-4).
powershell -ExecutionPolicy Bypass -File .\deploy.ps1 -BackendOnly

# 3. Confirm the per-Lambda code zips updated.
aws lambda get-function-configuration --function-name akwadona-bloodbank --query LastUpdateStatus
aws lambda get-function-configuration --function-name akwadona-pharmacy --query LastUpdateStatus
aws lambda get-function-configuration --function-name akwadona-examinations --query LastUpdateStatus
aws lambda get-function-configuration --function-name akwadona-calendar --query LastUpdateStatus
aws lambda get-function-configuration --function-name akwadona-scribe --query LastUpdateStatus
aws lambda get-function-configuration --function-name akwadona-document-manager --query LastUpdateStatus
```

## How to verify (test plan)

1. **Smoke test** — sign in as the Tiryaq admin, list each module (Blood Bank, Pharmacy, Calendar, Documents, Consultations, Voice Scribe). Counts should match pre-deploy.
2. **Cross-tenant read** — get a row id from Tenant A (e.g. a donor id). Sign in as a Tenant B user. Try `GET /bloodbank/donors/<that-id>`. Expect 404.
3. **Cross-tenant write** — same probe via `PATCH /bloodbank/donors/<that-id>`. Expect 404 + a `cross-tenant attempt` warn line in CloudWatch.
4. **List isolation** — confirm `GET /pharmacy/inventory` from Tenant B does NOT include Tenant A's medications.
5. **Document list** — `GET /documents/list?folder=lab-results` returns only Tenant B's uploads.
6. **Legacy doc access** — pre-2d-4 file should be 404 to a non-admin, downloadable by an admin, with a `legacy doc download` warn line in CloudWatch.

## Watch list (open backlog)

- Migration job for legacy S3 keys → new tenant-prefixed shape; drop legacy branch.
- Apply the same pattern to the remaining smaller Lambdas (admin-panel cross-domain reads, audit reader).
- Premium isolation tier (silo per tenant) — separate DDB table + Lambda alias per tenant for customers who require it.
- Hardened operator IAM — explicit DENY on `kms:Decrypt` for operator role so even an SDK call cannot fetch PHI.

## References

- OWASP Top 10 2021 — A01:2021 Broken Access Control
- AWS DynamoDB Multi-Tenant Patterns (re:Invent DAT328)
- Stripe Connect platform isolation (every API call carries `account_id`)
- Athenahealth Practice Bridge — per-practice row guards
- Salesforce Multi-Tenant Architecture — Org-Id row filter at the query rewriter

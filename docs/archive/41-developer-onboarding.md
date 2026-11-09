# 41 — Developer Onboarding

> **Status:** Live. Last audited: 2026-10-02.
> **Audience:** New engineer joining the project. Finish this doc in 2–4 hours.
> **Companion skill:** `../skills/akwadona-code-standards/SKILL.md`.

## 1. TL;DR (Day 1)
1. Install prerequisites (Node 20, Angular CLI, AWS CLI, PowerShell).
2. Clone the repo. Read `docs/00-akwadona-explained.md`.
3. Set up an AWS CLI profile. Verify with `aws sts get-caller-identity`.
4. `cd` into the repo, `npm install`, `ng serve` → open `http://localhost:4200`.
5. Make a tiny doc PR to confirm you can commit + push.
6. Shadow a deploy using [`18-deploy-and-operations.md`](18-deploy-and-operations.md).

## 2. What this is

**What it is** — the Day-1 to Day-30 playbook for someone new.

**Why it exists** — reading 20+ docs in random order is slow. This gives sequence.

**Real-life example** — a new engineer joins. In a half-day, they can run the app locally, understand the multi-tenant architecture, and make a small doc PR. In a week, they can ship a bugfix. In a month, they can design a feature.

**How Akwadona uses it** — the file lives in `docs/` so it's version-controlled. Updates to onboarding land through PRs like any other change.

## 3. Day 1 — environment setup

### 3.1 Prerequisites
Install on Windows 11 (project primary platform):
- [Node.js 20 LTS](https://nodejs.org) — confirm with `node -v`.
- Angular CLI: `npm install -g @angular/cli@20`.
- AWS CLI v2: `winget install Amazon.AWSCLI` or [installer](https://awscli.amazonaws.com/AWSCLIV2.msi). Confirm with `aws --version`.
- PowerShell 7 (built into Windows 11 Terminal).
- Git for Windows.
- Visual Studio Code + Angular Language Service extension.

### 3.2 Clone + install
```powershell
cd "C:\Users\<you>\Desktop\aws apps"
git clone <repo-url> hospital
cd hospital
npm install                 # frontend deps
cd akwadona-cdk; npm install; cd ..   # CDK deps
```

### 3.3 Must-read docs (in order)
1. [`00-akwadona-explained.md`](00-akwadona-explained.md) — platform overview.
2. [`01-lambda-and-infrastructure.md`](01-lambda-and-infrastructure.md) — the AWS shape.
3. [`19-ui-architecture.md`](19-ui-architecture.md) — the frontend shape.
4. [`03-encryption-and-zero-knowledge.md`](03-encryption-and-zero-knowledge.md) — the key compliance claim.
5. [`14-tenant-row-enforcement.md`](14-tenant-row-enforcement.md) — the key correctness claim.

### 3.4 Verify AWS access
Ask the Security Officer for:
- An IAM user in the Akwadona AWS account (`483176634665`).
- Read-only access to start (`arn:aws:iam::aws:policy/ReadOnlyAccess`). Elevate later.

Set up a profile:
```powershell
aws configure --profile akwadona-dev
# AWS Access Key ID, Secret, Default region us-east-1, Default output json
aws sts get-caller-identity --profile akwadona-dev
```

### 3.5 Run the app locally
```powershell
ng serve
```
Opens on `http://localhost:4200`. Sign in with a Cognito test user if provisioned (ask Security Officer). The app connects to the live dev API by default — don't create real data; use the `test-plan-v2.md` test accounts.

### 3.6 First commit
Pick a one-line doc typo. Fix it. Commit, push, open a PR.
```powershell
git checkout -b yourname/doc-typo
# Edit the typo.
git add docs/<file>.md
git commit -m "docs: fix typo in <file>"
git push -u origin yourname/doc-typo
```

## 4. Day 2–7 — understanding the architecture

### 4.1 Read these in week 1
In order:
- [`20-api-reference.md`](20-api-reference.md)
- [`akwadona-multitenant-setup.md`](akwadona-multitenant-setup.md)
- [`04-hashed-search-fields.md`](04-hashed-search-fields.md)
- [`07-operator-console.md`](07-operator-console.md)
- [`08-throttling.md`](08-throttling.md)
- [`13-i18n.md`](13-i18n.md)
- [`15-tenant-onboarding-wizard.md`](15-tenant-onboarding-wizard.md)
- [`18-deploy-and-operations.md`](18-deploy-and-operations.md)
- [`25-monitoring-and-observability.md`](25-monitoring-and-observability.md)
- [`26-incident-response.md`](26-incident-response.md)
- `../skills/*/SKILL.md` (all eight)

### 4.2 Run the test plan
Walk through [`test-plan-v2.md`](../test-plan-v2.md) end-to-end. You'll:
- Create doctors and patients.
- Make an appointment, consultation, prescription, dispense.
- Observe allergy guardrail, operator read-only view; run `node scripts/cross-tenant-probe.js` and `node scripts/security-tests/run-safe.js` yourself (neither is scheduled yet).

Don't skip. Half the "weird gotchas" in this codebase are things you'll only see by walking the flow.

### 4.3 Trace one request end-to-end
Pick POST `/patients`. Trace it:
1. Browser → `patients.service.ts` → `Config.buildUrl('patients')`.
2. HTTP request → `offlineQueueInterceptor` → `authInterceptor` → network.
3. CloudFront → API Gateway JWT authorizer → Cognito-signed JWT verified.
4. `akwadona-create-patient` Lambda handler.
5. Lambda extracts `tenantId` from claims, encrypts PHI, computes HMAC hashes.
6. `TransactWriteCommand` writes: patient profile + unique-lock rows (QID, phone).
7. Audit row written.
8. Response → interceptors → component → UI.

If you can't explain each hop, re-read the referenced doc.

## 5. Day 8–30 — making real changes

### 5.1 First real change
Pick a backlog item from [`backlog.md`](backlog.md) that touches ONE Lambda. Pair with the owner. Before writing code, invoke:
- `akwadona-security-review` skill — pre-flight checklist.
- `akwadona-code-standards` skill — pattern you'll follow.
- `akwadona-doc-writer` skill — doc you'll update.

### 5.2 PR template (what reviewers expect)
```markdown
## What
<one-paragraph description>

## Why
<forcing function>

## How
<approach, trade-offs>

## Test
- [ ] Manual test from `test-plan-v2.md` step X
- [ ] `scripts/cross-tenant-probe.js` → exit 0
- [ ] CloudWatch logs show tenant-scoped behavior

## Doc
<which docs/*.md updated>

## Security surface
<skill: akwadona-security-review verdict summary>
```

### 5.3 Deploy to dev
Follow [`18-deploy-and-operations.md`](18-deploy-and-operations.md) step by step. Shadow a senior engineer on your first real deploy.

## 6. Day 30 — reaching autonomy

By end of month 1, you can:
- Design a small feature using the `akwadona-solution-architect` skill format.
- Run an incident drill using the `akwadona-incident-response` skill.
- Add a new tenant through the operator wizard end-to-end.
- Give a 10-minute walkthrough of the zero-knowledge claim to a non-technical reviewer.

## 7. Common new-engineer mistakes (don't take them personally)

| Mistake | Correction |
|---|---|
| "I'll just scan the DynamoDB table to find patients" | Query the `tenant-entityType-index` with `PK = tenantId`. |
| Returning 403 for an other-tenant resource | Return 404. Don't leak existence. |
| `require('../_shared/compliance')` | Inline the helper. CDK packages one folder. |
| Hardcoding tenant slug or ARN | Read from the TENANT profile row via `crypto.js`. |
| Logging the JWT or Authorization header | Never. Log actor email + tenantId + action only. |
| Running `.\deploy.ps1` without updating the IDs | They're stale. Use [`18-deploy-and-operations.md`](18-deploy-and-operations.md). |
| Filtering or sorting on `name` / `dob` / `email` inside a DynamoDB FilterExpression | Those fields are ciphertext. Filter after `decryptItems()`; see `getAllPatients/index.js` header. |
| Writing `ttl` for expiry | The TTL attribute is `expiresAt`. |
| `grantReadWriteData` on a Lambda that only reads | Use `grantReadData` + the scoped `THROTTLE#*` UpdateItem (see the CDK `readOnlyFunctions` block). |
| Testing with real-looking PHI | Use `17-test-fixtures.md` values. |
| Committing `function.zip`, `node_modules/`, `dist/`, or `.angular/` | They're in `.gitignore`. If they appear in `git status`, something's wrong. |

## 8. Getting help

- `akwadona-code-standards` + `akwadona-security-review` skills — before asking a human.
- `docs/README.md` navigator.
- `backlog.md` + git log — what's happening right now.
- A senior engineer — on specific trade-offs.

## 9. Security onboarding (one-time, before first PHI-touching commit)

- Read HIPAA Privacy Rule overview (external).
- Sign the project's internal confidentiality agreement.
- Complete the BAA training (per [`05d-baa-template.md`](05d-baa-template.md)) — Security Officer walks you through.
- Enable MFA on your AWS console + GitHub account.
- Verify your workstation is encrypted at rest (BitLocker on Windows).

## 10. Compliance surface
- HIPAA §164.308(a)(5) — security awareness and training.
- PDPPL Art. 9 — data-handling training is implicit requirement.
- GDPR Art. 32 — organizational security measures include staff training.

## 11. References
- All of `docs/README.md`
- All of `../skills/*/SKILL.md`
- `test-plan.md`, `test-plan-v2.md`
- `backlog.md`

# Tiryaq User Manual — Developer

**Document version:** 2.0
**Date:** 2026-05-25
**Audience:** Users in the **Developers** Cognito group
**Tone:** Technical, code-aware, assumes AWS literacy.

> **What changed in 2.0:** Single-stack deploy (the WAF edge stack is disabled); MFA is currently disabled by design (documented regression); Angular 20; added the `updatedAt`/GSI-null rule, `updatedBy` stamping, duty-day enforcement, and backend-error-surfacing conventions; added references to the new backend reference and `deploy.ps1`.

---

## 1. Who you are

You build and operate Tiryaq — CDK, Lambda, and Angular. You deploy and debug production. You have broad read access for diagnostics but must not browse PHI casually; every read is audited. In the app, the Developer role behaves like an Admin (the dashboard and admin panel treat `Developers` as administrators).

---

## 2. Repository layout

```
hospital/
├── src/                      # Angular 20 + PrimeNG 20 frontend (standalone components, signals)
│   ├── app/
│   │   ├── components/       # Domain modules (appointments, pharmacy, dashboard, …)
│   │   ├── services/         # API clients, auth, helpers
│   │   ├── interceptors/     # JWT injection
│   │   └── guards/           # auth.guard + role.guard (roleGuard([...roles]))
│   ├── app.config.ts         # Cognito wiring (authority, clientId)
│   └── app.routes.ts         # Routes + per-route roleGuard
├── tiryaq-cdk/
│   ├── bin/tiryaq-cdk.ts     # CDK app entry — TiryaqCdkStack only (edge stack commented out)
│   ├── lib/tiryaq-cdk-stack.ts
│   └── lambda/               # Node.js Lambda functions (CommonJS), built via Code.fromAsset
├── docs/
│   ├── backend/              # 01-Lambda-API-Reference.md (+ per-function notes)
│   ├── compliance/           # PDPPL/MOPH/NCSA documentation
│   ├── frontend/             # pharmacy.md, admin-panel.md, …
│   ├── infrastructure/       # 01-AWS-CDK-Reference.md
│   ├── scribefirst/          # ScribeFirst feature docs
│   └── user-manuals/         # This folder
├── deploy.ps1                # Backend-then-frontend deploy script
└── ...
```

---

## 3. Local development

### 3.1 Frontend
```powershell
cd hospital
npm install
npm start          # ng serve on http://localhost:4200
```
`localhost:4200` is in the Cognito callback URLs and the API Gateway CORS allow-list.

### 3.2 CDK
```powershell
cd hospital\tiryaq-cdk
npm install
npx cdk synth      # validate templates
npx cdk diff       # diff vs. live stack
```

### 3.3 Lambda fast iteration (optional)
Lambdas deploy via `cdk deploy` (which repackages each function from its folder via `Code.fromAsset`). For a single-function hotfix you can bypass CDK:
```powershell
cd tiryaq-cdk\lambda\createPatient
Compress-Archive -Path *.js -DestinationPath function.zip -Force
aws lambda update-function-code --function-name createPatient --zip-file fileb://function.zip --region us-east-1
```
Use full `cdk deploy` whenever CDK metadata changes (IAM, env vars, new routes). Note the stray `function.zip` files are **not** what `cdk deploy` uses — it always re-zips from source.

---

## 4. Conventions you must follow

### 4.1 Single-table design
One table `Hospital`. Every item has `PK`, `SK`, `EntityType`. Use `withCompliance` (`lambda/_shared/compliance.js`) to stamp `dataClass`/timestamps where applicable.

### 4.2 `updatedAt` is a GSI sort key — never write it as NULL
`dataClass-index` sorts on `updatedAt`. **Never** write `updatedAt: null`, and **never** SET a GSI key attribute (email, dataClass, updatedAt, …) to NULL — DynamoDB rejects the write and you get a 500. Pattern: on create stamp `createdAt`/`updatedAt` with a timestamp; on update, filter out null/undefined fields and always stamp `updatedAt`.

### 4.3 Stamp `updatedBy` on audited writes
Appointments and invoices (and similar) set `updatedBy` (and `createdBy`) to the caller email from the JWT (`claims.email || claims.username`).

### 4.4 Cognito groups arrive bracket-wrapped
`cognito:groups` may be `"[Doctors]"` (string) or an array. Strip `[`/`]` and split before matching:
```js
const groups = Array.isArray(raw) ? raw
  : String(raw).trim().replace(/^\[/, '').replace(/\]$/, '').split(/[,\s]+/).filter(Boolean);
```

### 4.5 Transactional uniqueness locks
For unique fields (email, QID, phone) use `TransactWriteItems` with `attribute_not_exists(PK)` lock items (see `createPatient`/`createDoctor`). Throw user-readable errors ("…already exists") — the frontend surfaces `message`.

### 4.6 Surface real errors to the client
Return `{ message, error }` with a meaningful status. The frontend's `HelpersService.extractError`/`notifyApiError` reads `error.error.message` (or `message`) and shows it in a toast, so write messages for humans.

### 4.7 Business rules to preserve
- **Duty days:** appointment create/update validates the date against the doctor's `dutyDays` (UTC-midnight weekday).
- **Cancel, not delete:** appointment cancellation requires `cancelReason` and sets `cancelledAt`/`cancelledBy`; the UI exposes Cancel, not Delete.
- **Pharmacy is pharmacist-only** at the Lambda (`canAccessPharmacy`), route guard, and menu.
- **Dispense override** requires `approvalDocumentKey` when `allergyOverrideConfirmed` is true.

### 4.8 No hardcoded secrets/endpoints
Secrets Manager for runtime secrets; CDK env vars for config; the frontend reads the API base from `config.ts`.

---

## 5. Deployment workflow

### 5.1 Standard release
1. Branch from `main`; code + commit.
2. `npx cdk diff` to review AWS changes.
3. Backend: `cd tiryaq-cdk && npx cdk deploy --require-approval never` (single stack — `--all` is no longer required because the edge/WAF stack is disabled).
4. Frontend: `ng build --configuration production` → `aws s3 sync dist\verona-ng\browser s3://<frontend-bucket> --delete` → `aws cloudfront create-invalidation --distribution-id <id> --paths "/*"`.

Or run `deploy.ps1` from the repo root (does backend-then-frontend with checks; flags `-BackendOnly`, `-FrontendOnly`, `-SkipInvalidation`).

### 5.2 One GSI per update
DynamoDB allows only one GSI add/remove per table update. Add new GSIs one at a time.

### 5.3 Region-pinning
`bin/tiryaq-cdk.ts` defaults to `us-east-1` (dev). Production target is `me-south-1`; override with `$env:CDK_DEPLOY_REGION` only with a documented MOPH approval reason.

---

## 6. Debugging in production

```powershell
# Lambda logs
aws logs tail "/aws/lambda/tiryaq-appointments" --region us-east-1 --since 10m --follow

# CloudTrail "who did what"
aws cloudtrail lookup-events --region us-east-1 `
  --lookup-attributes AttributeKey=Username,AttributeValue=admin1 --max-results 50

# DynamoDB query
aws dynamodb query --table-name Hospital --region us-east-1 `
  --key-condition-expression "PK = :pk" `
  --expression-attribute-values '{ \":pk\": { \"S\": \"APPOINTMENT#<id>\" } }'
```

For request tracing, find the request ID (API Gateway access log / browser network tab) and search CloudWatch Logs Insights with `filter @message like /<request-id>/`.

---

## 7. Code quality expectations

- Production-grade, single-responsibility Lambdas; typed Angular services (avoid `any`).
- ESLint + Prettier on commit (`npm run format`).
- PRs include a manual test note (see `docs/test-plan-batch-2026-05-24.md` for the recent batch's format).

---

## 8. What you should NOT do

- Don't browse PATIENT records out of curiosity — reads are audited.
- Don't commit AWS credentials or expose Lambda logs.
- Don't make a production deploy from a dev machine without a signed-off ticket.
- Don't re-enable or disable security controls (WAF, MFA) silently — they are currently **disabled as a documented cost regression** (`docs/compliance/updates/2026-05-02-regression-01-waf-and-mfa-disabled.md`). Re-enabling is a deliberate, reviewed change (see `docs/infrastructure/01-AWS-CDK-Reference.md` §7).

---

## 9. Useful AWS Console links (us-east-1 dev)

- CloudFormation: https://us-east-1.console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks
- DynamoDB: https://us-east-1.console.aws.amazon.com/dynamodbv2/home?region=us-east-1#tables
- Cognito: https://us-east-1.console.aws.amazon.com/cognito/v2/idp/user-pools?region=us-east-1
- CloudFront: https://us-east-1.console.aws.amazon.com/cloudfront/v4/home

> WAFv2 is currently disabled; its console link is omitted until the edge stack is re-enabled.

---

## 10. Where to find more docs

- `docs/backend/01-Lambda-API-Reference.md` — all Lambdas, routes, rules
- `docs/infrastructure/01-AWS-CDK-Reference.md` — services + deploy runbook
- `docs/frontend/` — module-level frontend docs (pharmacy, admin-panel)
- `docs/compliance/` — regulatory framework, status, updates
- `docs/scribefirst/01-ScribeFirst-Design.md` — voice-scribe feature
- `CLAUDE.md` — project conventions & rules

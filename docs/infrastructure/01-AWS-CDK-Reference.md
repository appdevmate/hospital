# Tiryaq — AWS Services and CDK Stack Reference

**Document version:** 2.0
**Date:** 2026-05-25
**Owner:** Sami Taha
**Scope:** Infrastructure only. Derived directly from `tiryaq-cdk/lib/tiryaq-cdk-stack.ts` and `tiryaq-cdk/bin/tiryaq-cdk.ts`. No application logic, no user manuals.

> **What changed in 2.0:** Re-derived from the current CDK code. Two items that earlier versions described as active are **currently disabled in code**: the **WAF edge stack** and **Cognito MFA**. Both are documented below as disabled with the exact re-enable steps. The deploy runbook now matches the single-stack reality.

---

## 1. Purpose

This is the operations-and-architecture reference. It answers:

1. Which AWS services does Tiryaq use, and how are they configured?
2. How is the CDK stack organised?
3. How do you deploy it (backend + frontend)?

---

## 2. Architecture at a glance

```
┌────────────────────────────────────────────────────────────────────┐
│  TiryaqCdkStack  (us-east-1 dev — me-south-1 is the production target)│
│                                                                       │
│  ┌────────────┐    ┌──────────────┐    ┌──────────────────┐          │
│  │ CloudFront │───▶│ S3 (data CMK)│    │ S3 audit (audit  │          │
│  │ OAC, TLS1.2│    │ Angular SPA  │    │ CMK + ObjectLock)│          │
│  └─────┬──────┘    └──────────────┘    └──────────────────┘          │
│        │  (WAF webAclId is commented out — see §7)                    │
│        ▼                                                              │
│  ┌──────────────────────────┐                                        │
│  │ API Gateway HTTP API v2  │   JWT authorizer → Cognito user pool   │
│  │ tiryaq-api               │                                        │
│  └──────────┬───────────────┘                                        │
│             │                                                         │
│   ~38 ┌─────▼──────────────┐      pre-token      ┌────────────────┐  │
│   ────▶ Lambda (Node 18/20/24)│ ◀───────────────│ Cognito        │  │
│       └─────┬──────────────┘                     │ User Pool      │  │
│             │ read/write                          │ (MFA OFF §7)   │  │
│             ▼                                      └────────────────┘  │
│      ┌────────────────┐                                               │
│      │  DynamoDB      │  single table "Hospital", 7 GSIs              │
│      │  data CMK+PITR │                                               │
│      └────────────────┘                                               │
│                                                                       │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │ KMS data │  │ KMS audit │  │ Secrets Manager  │  │ CloudTrail   │ │
│  │ CMK      │  │ CMK       │  │ /tiryaq/seed-... │  │ multi-region │ │
│  └──────────┘  └───────────┘  └──────────────────┘  └──────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

Only **one** stack (`TiryaqCdkStack`) is deployed today. The former `TiryaqEdgeStack` (CloudFront-scoped WAF in us-east-1) is commented out in `bin/tiryaq-cdk.ts`.

---

## 3. AWS services in use

### 3.1 Compute — AWS Lambda

Every API endpoint is a Lambda. There are **~38 application functions** plus 3 operational functions (pre-token generation, seed, user-seed). Runtimes are Node.js 18.x, 20.x, or 24.x (CommonJS), 30-second timeout, shared environment `{ TABLE_NAME: 'Hospital', USER_POOL_ID }`.

All application functions are built with `lambda.Code.fromAsset('lambda/<folder>')`, so **`cdk deploy` repackages each function fresh from its source directory** — the stray `function.zip` files in some folders are not used by this code path.

### 3.2 Networking & delivery

| Service | Role | Configuration |
|---------|------|---------------|
| **Amazon CloudFront** | Global CDN + TLS termination | 1 distribution; OAC to the S3 origin; `REDIRECT_TO_HTTPS`; `CACHING_OPTIMIZED`; `ALLOW_GET_HEAD`; `SECURITY_HEADERS` response policy; TLS 1.2 (2021); SPA fallback `403/404 → /index.html (200)`; standard logging to the access-logs bucket. **WAF `webAclId` is commented out (§7).** |
| **Amazon API Gateway (HTTP API v2)** | Entry point for all Lambdas | `tiryaq-api`; ~60 route registrations; JWT authorizer bound to the Cognito user pool; CORS allow-list (no wildcard) |
| **AWS Shield Standard** | DDoS protection on CloudFront | Free, automatic |

CORS allow-list (origins): `http://localhost:4200`, `https://d6i7iwknkj0bg.cloudfront.net`, `https://akwadona.com`, `https://www.akwadona.com`. Methods `GET, POST, PATCH, DELETE, OPTIONS`; headers `Content-Type, Authorization`; `allowCredentials: false`; `maxAge: 10m`.

### 3.3 Identity — Amazon Cognito

| Item | Configuration |
|------|---------------|
| User pool | `tiryaq-user-pool`; self-sign-up **disabled**; sign-in by username or email; email auto-verify |
| Password policy | min **12 chars**, upper + lower + digit + symbol; temp password valid **3 days** |
| MFA | **OFF** (regression — see §7). Account recovery: email only |
| Threat protection | `FULL_FUNCTION` (advanced security); device tracking with new-device challenge |
| App client | `Tiryaq`; no secret; auth flows userPassword + userSRP + custom; OAuth auth-code; scopes openid/email/phone/profile; **access & ID token 1h**, refresh token 30 days; `preventUserExistenceErrors` |
| Hosted domain | prefix `tiryaq-hospital` |
| Groups | `Admin`, `Developers`, `Doctors`, `Pharmacists` |
| Pre-token Lambda | `cognito-pre-token-generation` (V3_0) injects `email` + `name` claims into the access token so every Lambda can identify the actor |

### 3.4 Storage

| Service | Role | Configuration |
|---------|------|---------------|
| **DynamoDB** | Primary DB, single-table | `Hospital`; PK/SK; **7 GSIs**; PAY_PER_REQUEST; **data CMK**; PITR ON; deletion protection ON; TTL on `expiresAt` |
| **S3 — frontend** | Angular SPA build | data CMK; versioned; OAC-only (block public); enforce SSL; server access logs |
| **S3 — audit** | CloudTrail + audit exports | audit CMK; **Object Lock compliance mode, 7-year retention**; versioned; lifecycle to Glacier/Deep Archive |
| **S3 — access-logs** | S3 + CloudFront service logs | SSE-S3 (S3/CloudFront logging refuses SSE-KMS); versioned; IA@30d, Glacier@90d, expire @7y |

The 7 GSIs:

| # | Index | Partition / Sort | Projection | Used for |
|---|-------|------------------|------------|----------|
| 1 | `EntityType-index` | `EntityType` | ALL | main entity-type queries (appointments, payments, exams) |
| 2 | `PatientID-index` | `patientId` / `SK` | ALL | patient-related rows |
| 3 | `email-index` | `email` / `EntityType` | ALL | lookup by email |
| 4 | `doctorEmail-createdAt-index` | `doctorEmail` / `createdAt` | ALL | doctor-scoped appointments & invoices |
| 5 | `GSI1` | `GSI1PK` / `GSI1SK` | ALL | generic |
| 6 | `GSI2` | `name_prefix` / `name_lower` | ALL | name search |
| 7 | `dataClass-index` | `dataClass` / `updatedAt` | KEYS_ONLY | PDPPL breach scoping (Update 06) |

> **GSI deploy rule:** DynamoDB allows only ONE GSI add/remove per table update. On a fresh deploy all 7 are created at once (CREATE). Adding a new GSI to an existing table must be done one at a time.

> **`updatedAt` must be a String when present.** Because `dataClass-index` sorts on `updatedAt`, no Lambda may write `updatedAt: null` or SET a GSI key attribute to NULL — DynamoDB rejects the write. All create/update Lambdas stamp a timestamp instead and skip empty fields.

### 3.5 Security & secrets

| Service | Configuration |
|---------|---------------|
| **AWS KMS** | 2 CMKs: `alias/tiryaq/data` (DynamoDB + frontend bucket), `alias/tiryaq/audit` (audit bucket + CloudTrail). Annual rotation; `RETAIN` |
| **AWS Secrets Manager** | 8 seed-user temp passwords under `/tiryaq/seed-users/*`, encrypted with the data CMK; never logged or returned |
| **AWS CloudTrail** | `tiryaq-cloudtrail`, multi-region, log-file validation, CloudWatch Logs forward (1-year), encrypted to audit bucket |
| **AWS IAM** | Per-Lambda execution roles auto-managed by CDK; explicit KMS Encrypt/Decrypt grants on the data CMK; `tiryaq-scribe` granted Bedrock `InvokeModel` on the Claude Haiku 4.5 US inference profile + underlying model ARNs in us-east-1/-east-2/-west-2; `tiryaq-admin-panel` granted Cognito admin actions |

---

## 4. CDK stack layout

```
tiryaq-cdk/
├── bin/
│   └── tiryaq-cdk.ts          # CDK app entry — instantiates TiryaqCdkStack only
│                              #   (TiryaqEdgeStack import + block are commented out)
├── lib/
│   └── tiryaq-cdk-stack.ts    # The single deployed stack
├── lambda/
│   ├── _shared/compliance.js  # withCompliance helper (PHI/PII/AUDIT tagging)
│   ├── tiryaq-appointments/
│   ├── tiryaq-pharmacy/
│   ├── createPatient/  updatePatient/  createDoctor/  updateDoctor/  …
│   └── …                       # ~38 function folders
├── cdk.json
└── package.json
```

Reference data baked into the stack: **28 departments** and **47 specializations** (seeded once), plus 8 seed users (2× each role).

---

## 5. API route table (authoritative)

All routes require a valid Cognito JWT (the authorizer rejects unauthenticated calls). **Role enforcement is inside each Lambda** from the `cognito:groups` claim.

| Resource | Methods | Lambda |
|----------|---------|--------|
| `/patients` | GET, POST | getAllPatients, createPatient |
| `/patients/{patientID}` | GET, PATCH, DELETE | getPatientByID, updatePatient, deletePatient |
| `/patients/{patientID}/restore` | PATCH | updatePatient |
| `/patients/search` | GET | getPatientsDataByFilters |
| `/doctors` | GET, POST | getAllDoctors, createDoctor |
| `/doctors/{doctorID}` | GET, PATCH, DELETE | getDoctorByID, updateDoctor, deleteDoctor |
| `/doctors/email/{email}` | GET | getDoctorByEmail |
| `/patients/{patientID}/payments` | GET, POST | getAllPaymentsForPatient, createPatientPayment |
| `/patients/{patientID}/payments/{paymentID}` | GET, PATCH, DELETE | getPaymentByID, updatePatientPayment, deletePayment |
| `/payments` | GET | listAllPaymentsForPatientByID |
| `/invoices` | GET | getAllInvoices |
| `/patients/{patientID}/surgeries` | GET, POST | listAllSurgeriesForPatientByID, createPatientSurgery |
| `/surgeries/{surgeryID}` | GET | getSurgeryByID |
| `/departments` | GET, POST, DELETE | getAllDepartments, createNewDepartment, deleteAllDepartments |
| `/departments/bulk` | POST | bulkCreateDepartments |
| `/specializations` | GET, POST, DELETE | getAllSpecializations, createNewSpecialization, deleteAllSpecializations |
| `/specializations/bulk` | POST | bulkCreateSpecializations |
| `/admin/stats` | GET | tiryaq-admin-panel |
| `/admin/users` | GET | tiryaq-admin-panel |
| `/admin/users/{username}/disable` | POST | tiryaq-admin-panel |
| `/admin/users/{username}/enable` | POST | tiryaq-admin-panel |
| `/admin/users/{username}/set-password` | POST | tiryaq-admin-panel |
| `/admin/audit` | GET | tiryaq-admin-panel |
| `/examinations` | GET, POST | tiryaq-examinations |
| `/examinations/{examId}` | GET, PATCH, DELETE | tiryaq-examinations |
| `/examinations/{examId}/signoff` | POST | tiryaq-examinations |
| `/pharmacy/medications` | GET, POST | tiryaq-pharmacy |
| `/pharmacy/medications/{medId}` | PATCH, DELETE | tiryaq-pharmacy |
| `/pharmacy/inventory` | GET, POST | tiryaq-pharmacy |
| `/pharmacy/inventory/{medId}` | PATCH | tiryaq-pharmacy |
| `/pharmacy/prescriptions` | GET, POST | tiryaq-pharmacy |
| `/pharmacy/prescriptions/{rxId}` | GET, PATCH | tiryaq-pharmacy |
| `/pharmacy/dispense` | GET, POST | tiryaq-pharmacy |
| `/pharmacy/purchase-orders` | GET, POST | tiryaq-pharmacy |
| `/pharmacy/purchase-orders/{poId}` | GET, PATCH | tiryaq-pharmacy |
| `/pharmacy/alerts` | GET | tiryaq-pharmacy |
| `/documents` | GET, POST | tiryaq-document-manager |
| `/documents/{documentId}` | GET, DELETE | tiryaq-document-manager |
| `/documents/{documentId}/presign` | GET | tiryaq-document-manager |
| `/audit` | GET, POST | tiryaq-audit |
| `/appointments` | GET, POST | tiryaq-appointments |
| `/appointments/{apptId}` | GET, PATCH, DELETE | tiryaq-appointments |
| `/calendars` | GET, POST | tiryaq-calendar |
| `/calendars/{calendarId}` | DELETE | tiryaq-calendar |
| `/calendars/{calendarId}/events` | GET, POST | tiryaq-calendar |
| `/calendars/{calendarId}/events/{eventId}` | PATCH, DELETE | tiryaq-calendar |
| `/scribe/sessions` | POST | tiryaq-scribe |
| `/scribe/sessions/{id}` | GET | tiryaq-scribe |
| `/scribe/sessions/{id}/soap` | POST | tiryaq-scribe |
| `/scribe/sessions/{id}/approve` | POST | tiryaq-scribe |

---

## 6. Deploy runbook

### 6.1 First-time setup

```powershell
aws sts get-caller-identity              # confirm the right account/region

$env:CDK_DEPLOY_ACCOUNT = "<your-account-id>"
$env:CDK_DEPLOY_REGION  = "us-east-1"    # production target is me-south-1

cd tiryaq-cdk
npm install
npx cdk bootstrap "aws://$env:CDK_DEPLOY_ACCOUNT/$env:CDK_DEPLOY_REGION"
```

> The edge/WAF stack is disabled, so **`--all` is no longer required** and only `us-east-1` bootstrap matters for the deploy region you choose.

### 6.2 Deploy the backend

```powershell
cd tiryaq-cdk
npx cdk deploy --require-approval never
```

This deploys the single `TiryaqCdkStack` and repackages every Lambda from source.

### 6.3 Capture outputs

```powershell
aws cloudformation describe-stacks --stack-name TiryaqCdkStack `
    --region $env:CDK_DEPLOY_REGION --query "Stacks[0].Outputs"
```

| Output | Used in |
|--------|---------|
| `ApiUrl` | `src/app/services/config.ts` (`tiryaqUrl`) |
| `UserPoolId` | `src/app.config.ts` (`authority`) |
| `AppClientId` | `src/app.config.ts` (`clientId`) |
| `CognitoAuthority` | reference |
| `CloudFrontUrl` | open in browser; also keep in CDK callback/logout URLs |
| `S3BucketName` | `aws s3 sync` target |
| `DistributionId` | `aws cloudfront create-invalidation` |

### 6.4 Build and publish the frontend

This is the exact sequence (current bucket + distribution shown):

```powershell
cd "C:\Users\Sami Toufic Taha\Desktop\aws apps\hospital"
Remove-Item -Recurse -Force .angular\cache -ErrorAction SilentlyContinue
ng build --configuration production
aws s3 sync "dist\verona-ng\browser" s3://tiryaqcdkstack-tiryaqfrontendbucket18b23106-jsz6deto6hub --delete
aws cloudfront create-invalidation --distribution-id E1Z1ZKYM74LVA7 --paths "/*"
```

The Angular build output path (`dist/verona-ng/browser`) matches `angular.json` (`outputPath: dist/verona-ng`, application builder → `/browser`). After the invalidation reaches **Completed**, hard-refresh the site.

> A turnkey script that does backend-then-frontend with error checks is at the repo root: `deploy.ps1` (`powershell -ExecutionPolicy Bypass -File .\deploy.ps1`; flags `-BackendOnly`, `-FrontendOnly`, `-SkipInvalidation`).

### 6.5 Tear down

```powershell
aws s3 rm s3://<frontend-bucket> --recursive
aws s3 rm s3://<access-logs-bucket> --recursive
# Audit bucket has Object Lock — it cannot be emptied. Leave it.
npx cdk destroy --force
# DynamoDB, Cognito, and KMS keys are RETAIN by design — delete manually if truly required.
```

---

## 7. Disabled-by-design (regressions to re-enable)

| Feature | Current state | How to re-enable |
|---------|---------------|------------------|
| **WAFv2 edge stack** | `webAclId` commented out in `tiryaq-cdk-stack.ts`; the `TiryaqEdgeStack` import + block commented out in `bin/tiryaq-cdk.ts` | Uncomment both, restore `crossRegionReferences: true` + `webAclArn`, deploy with `cdk deploy --all` |
| **Cognito MFA** | `mfa: cognito.Mfa.OFF` | Restore `Mfa.REQUIRED` + `mfaSecondFactor: { sms: true, otp: true }`. Note Cognito refuses `REQUIRED → OFF` directly on a live pool, hence the staged change |

Both were disabled to stop recurring charges (see `docs/compliance/updates/2026-05-02-regression-01-waf-and-mfa-disabled.md`). User-facing docs should not claim MFA is enforced until this is reverted.

---

## 8. Compliance posture (summary)

Full treatment: `docs/compliance/01-Qatar-GCC-Compliance-Master.md`.

| Control | Service | Status |
|---------|---------|--------|
| Encryption at rest | DynamoDB CMK, S3 KMS, Secrets Manager KMS | Active |
| Encryption in transit | CloudFront TLS 1.2+, API Gateway HTTPS | Active |
| Auth | Cognito (12-char password, threat protection) | Active |
| MFA | Cognito | **Disabled (§7)** |
| Application audit | `tiryaq-audit` + DynamoDB AUDIT entities + `/admin/audit` viewer | Active |
| Infrastructure audit | CloudTrail multi-region, file validation, immutable S3 (Object Lock 7y) | Active |
| WAF / OWASP | WAFv2 managed rules + rate limit | **Disabled (§7)** |
| DDoS | Shield Standard | Active (automatic) |
| Backup / recovery | DynamoDB PITR | Active |
| Data residency note | Bedrock SOAP uses a US cross-region inference profile | Documented (compliance control #19) |

---

## 9. Document control

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | 2026-04-30 | Sami Taha | Initial issuance |
| 2.0 | 2026-05-25 | Sami Taha | Re-derived from code: single-stack deploy, WAF + MFA documented as disabled, accurate GSI/route/Lambda inventory, deploy runbook aligned with the live bucket/distribution and `deploy.ps1` |

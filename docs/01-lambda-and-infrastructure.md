# Akwadona — Lambda & Infrastructure Documentation

> **Product name:** Akwadona. **Customers (tenants):** Tiryaq, Alshifaa, ...
> All AWS resources have been renamed to the `akwadona-*` convention: CDK stack `AkwadonaCdkStack`, Lambdas `akwadona-*`, Cognito pool `akwadona-user-pool` (`us-east-1_KkINt5vOF`), S3 buckets `akwadona-*`, KMS aliases `alias/akwadona/*`. The legacy `tiryaq-*` resources from the first stack have been destroyed (one audit bucket remains under COMPLIANCE Object Lock until ~2033).

> **Multi-tenant model (Step 2):** Pooled tenancy — one DynamoDB table, one Cognito pool, one set of Lambdas, scoped per customer by the opaque `tenantId` claim in the signed JWT. Each row carries `tenantId`; reads use the `tenant-entityType-index` GSI; writes use ConditionExpression `tenantId = :tid`. Full design and per-Lambda coverage status: see `akwadona-multitenant-setup.md`.

Single reference for the backend. Covers the AWS infrastructure, every Lambda function (what it does + why), the database shape, security, and a code-review register at the end. Plain English, bullet points, glossary at the bottom.

---

## Table of contents

1. [System map](#1-system-map)
2. [Infrastructure (CDK stack)](#2-infrastructure-cdk-stack)
3. [DynamoDB schema](#3-dynamodb-schema)
4. [Lambda functions](#4-lambda-functions)
5. [Cross-cutting features](#5-cross-cutting-features)
6. [Security model](#6-security-model)
7. [Deployment](#7-deployment)
8. [Operations & cost](#8-operations--cost)
9. [Code-review register](#9-code-review-register)
10. [Glossary](#10-glossary)

---

## 1. System map

```
Browser (Angular SPA on CloudFront)
        │ HTTPS
        ▼
API Gateway HTTP API (JWT authorizer via Cognito User Pool)
        │
        ▼
Lambdas (Node 18 / 20 / 24, 512 MB memory, 30 s timeout)
        │
        ▼
DynamoDB single table "Hospital" (1 PK/SK + 7 GSIs, KMS-encrypted)
S3 (frontend bucket + documents bucket + access-logs bucket, KMS-encrypted)
EventBridge (5-min warmer ping)
Cognito User Pool (Admin / Developers / Doctors / Pharmacists groups)
Bedrock (LLM for the voice-scribe SOAP split)
```

- Frontend is hosted as static files on **S3 behind CloudFront**.
- Every API call carries a Cognito **JWT**; the HTTP API authorizer validates the signature before invoking the Lambda.
- All clinical data lives in **one DynamoDB table** (`Hospital`) keyed by `PK`/`SK`; queries use GSIs.

---

## 2. Infrastructure (CDK stack)

The whole infrastructure is described in `akwadona-cdk/lib/akwadona-cdk-stack.ts`. One stack: **AkwadonaCdkStack**.

**Compute**

- 41 Lambda functions, all 512 MB memory, 30 s timeout.
- Runtimes: Node.js 18.x, 20.x, 24.x (mixed — newer Lambdas on 24.x).
- `Code.fromAsset('lambda/<folder>')` per Lambda — each folder packaged independently.

**Storage**

- DynamoDB table `Hospital` — single table, PK/SK = String, **customer-managed KMS** encryption, point-in-time recovery on.
- S3 `AkwadonaFrontendBucket` (SPA) and `AkwadonaDocumentsBucket` (PHI uploads) — both KMS-encrypted, block-public-access on, versioning on.
- Access-logs bucket for CloudFront + S3.

**Networking & edge**

- API Gateway HTTP API v2 (cheaper / faster than REST API v1).
- CloudFront distribution with OAC to the S3 origin; SPA fallback rewrites 403/404 to `/index.html`.
- `akwadona-edge-stack.ts` (us-east-1) defines a WAFv2 rate-limit ACL — **currently commented out** in the main stack to avoid the $5 base charge; re-enable by uncommenting `webAclId` in the CloudFront distribution.

**Identity & access**

- Cognito User Pool `akwadona-user-pool` (`us-east-1_KkINt5vOF`). Sign-in UX is a **custom Angular login** in the SPA — no Hosted UI. The OIDC library is still configured for token refresh and session-end via the `auth.akwadona.com` custom domain, but authentication calls go through `InitiateAuth` REST directly (`USER_PASSWORD_AUTH` + `RespondToAuthChallenge` for first-login + `ForgotPassword`).
- Groups: `Admin`, `Developers`, `Doctors`, `Pharmacists`, `Operator`. (`Patients` is defined but not yet exposed.)
- `cognito-pre-token-generation` Lambda (V3_0 trigger) enriches the JWTs with `email`, `name`, `tenantId`, `role` (`operator` / `tenant_user`), and `doctorId` (for doctor users), so the frontend never needs a `/userInfo` round-trip.
- SES wired as the email sender — Cognito sends from `noreply@akwadona.com` (DKIM-signed). See `16-ses-setup.md`.
- KMS customer-managed keys: stack-level data + audit CMKs (encrypt the DDB table and audit bucket), plus per-tenant CMKs (`alias/akwadona-tenant-<slug>`) and HMAC keys (`alias/akwadona-tenant-<slug>-hmac`) for envelope encryption + searchable hashed fields. Every Lambda's role is whitelisted by the `AkwadonaCdkStack-*ServiceRole*` ArnLike in each tenant CMK's key policy.

**Warmer**

- One EventBridge rule fires every 5 minutes and pings 5 Lambdas (preTokenGen, appointments, getAllPatients, getAllDoctors, getAllInvoices) with `{ _warmup: true }`.
- Each Lambda short-circuits the warmup event and returns immediately so it costs nothing while keeping a warm container alive.

**Compliance**

- KMS CMK encryption everywhere at rest.
- All clinical rows tagged `dataClass: 'PHI'`; audit log row written on every mutation.
- Soft-delete only (set `deletedAt`); rows are never permanently removed.

---

## 3. DynamoDB schema

Single table `Hospital`. Items distinguished by `EntityType` and key pattern.

**Key patterns**

```
Patient           PK = PATIENT#<id>          SK = PROFILE
Doctor            PK = DOCTOR#<id>           SK = PROFILE
Appointment       PK = APPOINTMENT#<id>      SK = PROFILE
Examination       PK = EXAM#<id>             SK = PROFILE
Payment           PK = PATIENT#<id>          SK = PAYMENT#<paymentId>
Surgery           PK = PATIENT#<id>          SK = SURGERY#<surgeryId>
Calendar          PK = CALENDAR#<calId>      SK = PROFILE
Calendar event    PK = CALENDAR#<calId>      SK = EVENT#<eventId>
BB donor          PK = DONOR#<donorId>       SK = PROFILE
BB donation       PK = DONOR#<donorId>       SK = DONATION#<donationId>
BB unit           PK = BBUNIT#<unitId>       SK = PROFILE
BB request        PK = BBREQ#<requestId>     SK = PROFILE
BB crossmatch     PK = BBREQ#<requestId>     SK = XMATCH#<unitId>
BB issue          PK = BBREQ#<requestId>     SK = ISSUE#<issueId>
Department        PK = DEPARTMENT#<id>       SK = DEPARTMENT
Specialization    PK = SPECIALIZATION#<id>   SK = SPECIALIZATION
Email lock        PK = EMAIL#<email>         SK = LOCK
QID lock          PK = QID#<qid>             SK = LOCK
Phone lock        PK = PHONE#<phone>         SK = LOCK
Counter           PK = COUNTER#<TYPE>        SK = TOTAL
Idempotency       PK = IDEMP#<cid>           SK = PROFILE   (24h TTL)
Audit             PK = AUDIT#YYYY-MM-DD      SK = AUDIT#<entity>#<id>#<ts>
```

**GSIs**

| Index | Partition key | Sort key | Used by |
| --- | --- | --- | --- |
| `EntityType-index` | EntityType | — | "List all rows of type X" |
| `doctorEmail-createdAt-index` | doctorEmail | createdAt | Doctor's own appointments/invoices |
| `email-index` | email | — | Find a doctor by email |
| `qid-index` | qid | — | Lookups by Qatar ID |
| `dataClass-index` | dataClass | updatedAt | Compliance scans of all PHI rows |
| `PatientID-index` | patientID | — | Patient relationships |
| `cognitoUsername-index` | cognitoUsername | — | Cognito → user record |

`dataClass-index` requires `updatedAt` to always be a non-null **String**. Any write that sets `updatedAt = null` fails. Pattern enforced by writing `updatedAt: nowIso()` on every mutation.

---

## 4. Lambda functions

Each section below: **Business purpose → Routes → What it does → Side effects**. All mutating Lambdas implement Phase D idempotency (see §5).

### 4.1 Patient management

#### `createPatient`
- **Purpose** — admin adds a new patient (single or bulk import).
- **Routes** — `POST /patients` (single or `{patients:[]}` for bulk).
- **What it does**
  - Rejects callers not in `Admin` or `Developers`.
  - Required fields: name, dob, gender, phone, qid.
  - Refuses duplicates via QID + phone uniqueness locks.
  - Writes patient + locks atomically (TransactWrite).
  - Bumps `COUNTER#PATIENTS / TOTAL`.

#### `updatePatient`
- **Purpose** — edit a patient or restore a soft-deleted one.
- **Routes** — `PATCH /patients/{patientID}` and `PATCH /patients/{patientID}/restore`.
- **What it does** — admin/developer only; writes allowed fields; refreshes `updatedAt`+`updatedBy`.

#### `deletePatient`
- **Purpose** — soft-delete a patient.
- **Routes** — `DELETE /patients/{patientID}`.
- **What it does** — admin/developer only; sets `deletedAt`; decrements counter.

#### `getAllPatients`
- **Purpose** — paginated list with filters/search/sort.
- **Routes** — `GET /patients?pageSize&lastKey&sortField&sortOrder&search&...`.
- **What it does** — uses `COUNTER#PATIENTS` for fast unfiltered counts; falls back to Scan with `Select=COUNT` for filtered counts.

#### `getPatientByID`
- **Purpose** — fetch one patient.
- **Routes** — `GET /patients/{patientID}`.
- **What it does** — single GetItem; 404 if soft-deleted.

#### `getPatientsDataByFilters`
- **Purpose** — bulk filtered read used by reporting tools.
- **Routes** — `POST /patients/filter`.

### 4.2 Doctor management

#### `createDoctor`
- **Purpose** — add a new doctor (single or bulk).
- **Routes** — `POST /doctors`.
- **What it does** — admin/developer only; required fields + email/QID/phone locks; bumps `COUNTER#DOCTORS`.

#### `updateDoctor`
- **Purpose** — edit a doctor profile.
- **Routes** — `PATCH /doctors/{doctorID}`.
- **What it does** — currently allows any authenticated user (review register §9.1 flags this).

#### `deleteDoctor`
- **Purpose** — soft-delete a doctor.
- **Routes** — `DELETE /doctors/{doctorID}`.
- **What it does** — same — no server-side role check today (§9.1).

#### `getAllDoctors`
- **Purpose** — paginated doctor list.
- **Routes** — `GET /doctors`.
- **What it does** — queries `EntityType-index` (the Scan-based version timed out at 1 M-row scale); total comes from `COUNTER#DOCTORS`.

#### `getDoctorByID` / `getDoctorByEmail`
- Single GetItem and `email-index` lookup respectively.

### 4.3 Appointments

#### `akwadona-appointments`
- **Purpose** — the whole appointment lifecycle.
- **Routes** — `POST/GET/PATCH/DELETE /appointments[/{apptId}]`.
- **What it does**
  - **Create** — admin/dev only; enforces duty days, blocks past-time bookings, blocks overlapping appointments for the same doctor or same patient.
  - **List** — paginated with tab (upcoming/past/all), date range, status[], priority[], visitType[], doctorId, patientId, free-text q. Returns 25 rows by default, cursor in `nextToken`, total via `COUNTER#APPOINTMENTS`.
  - **Patch** — admin/dev edit any; doctors edit/cancel only their own future ones; re-runs overlap check on date/time changes.
  - **Delete** — admin only; decrements counter.
- **Side effects** — writes a calendar event on the doctor's calendar; writes an audit row; idempotency cache.

### 4.4 Examinations (consultations)

#### `akwadona-examinations`
- **Purpose** — doctor's SOAP form (sections, diagnosis, prescriptions, lab/radiology orders, sign-off).
- **Routes** — `POST /examinations`, `PATCH /examinations/{id}/sections`, `POST /examinations/{id}/signoff`, `DELETE /examinations/{id}`.
- **What it does** — Doctor/Admin/Dev only; doctor can only write into an exam where `doctorEmail` matches their own; sign-off requires at least one primary diagnosis + chief complaint; on sign-off the linked appointment is marked `completed`.

### 4.5 Pharmacy

#### `akwadona-pharmacy`
- **Purpose** — medications, inventory, prescription queue, dispense, purchase orders, alerts.
- **Routes** — `/pharmacy/medications`, `/pharmacy/inventory`, `/pharmacy/prescriptions`, `/pharmacy/dispense`, `/pharmacy/purchase-orders`, `/pharmacy/alerts`.
- **What it does** — Pharmacist/Admin/Dev only; dispense decrements stock and writes a history row; POs walk `draft → submitted → ordered → partially_received → received`.

### 4.6 Blood Bank

#### `akwadona-bloodbank`
- **Purpose** — donors, donations, unit inventory, transfusion requests with cross-match + issue.
- **Routes** — see `docs/blood-bank.md` (now folded into §4.6).

```
Donors:        /bloodbank/donors          (GET/POST), /bloodbank/donors/{donorId}      (GET/PATCH/DELETE)
Donations:     /bloodbank/donations       (GET),     /bloodbank/donors/{donorId}/donations (GET/POST)
Units:         /bloodbank/units           (GET/PATCH/DELETE)
Stock summary: /bloodbank/stock           (GET)
Requests:      /bloodbank/requests        (GET/POST), /bloodbank/requests/{requestId}  (GET/PATCH/DELETE)
Cross-match:   POST /bloodbank/requests/{requestId}/crossmatch
Issue:         POST /bloodbank/requests/{requestId}/issue
```

- ABO/Rh compatibility checked automatically on cross-match.
- Compatible units reserved for two hours.
- Issue requires every unit to have a compatible cross-match on file.

### 4.7 Calendar

#### `akwadona-calendar`
- **Purpose** — one calendar per doctor; holds duty shifts + auto-created appointment events.
- **Routes** — `GET/POST /calendars`, `DELETE /calendars/{id}`, `GET/POST /calendars/{id}/events`, `PATCH/DELETE /calendars/{id}/events/{eventId}`.

### 4.8 Documents

#### `akwadona-document-manager`
- **Purpose** — upload/download/list/delete documents via S3 presigned URLs.
- **Routes** — `POST /documents/upload-url`, `POST /documents/download-url`, `GET /documents/list`, `GET /documents/folders`, `DELETE /documents/delete`.
- **What it does**
  - Folder allow-list: `doctors-documents`, `patients-documents`, `lab-results`, `radiology-images` (Admin/Doctor only); `prescriptions`, `pharmacy-approvals` (Pharm/Doctor/Admin).
  - Per-key owner check: non-admin can only see/delete keys uploaded under their own Cognito sub.
  - Rejects requests where the JWT lacks a `sub` claim.

### 4.9 Admin panel

#### `akwadona-admin-panel`
- **Purpose** — admin user management.
- **Routes** — `GET /admin/stats`, `GET /admin/users`, `POST /admin/users/{u}/disable`, `POST /admin/users/{u}/enable`, `POST /admin/users/{u}/set-password`, `GET /admin/audit`.
- **What it does** — admin/developer only; wraps Cognito Admin APIs; audit endpoint queries `AUDIT#YYYY-MM-DD` partition.

### 4.10 Voice Scribe

#### `akwadona-scribe`
- **Purpose** — turn dictation into SOAP via Bedrock Claude Haiku.
- **Routes** — `POST /scribe/sessions`, `GET /scribe/sessions/{id}`, `POST /scribe/sessions/{id}/soap`, `POST /scribe/sessions/{id}/approve`.
- **What it does** — Doctor/Admin only; stores session + transcript + SOAP output.

### 4.11 Audit

#### `akwadona-audit`
- **Purpose** — compliance forensic queries.
- **Routes** — `GET /audit?date=&entityType=&entityId=&action=&actor=`.

### 4.12 Reference data

| Lambda | Routes | Purpose |
| --- | --- | --- |
| `createNewDepartment` | `POST /departments` | Add one department |
| `bulkCreateDepartments` | `POST /departments/bulk` | Add many (BatchWrite chunks of 25) |
| `deleteAllDepartments` | `DELETE /departments` | Wipe the catalogue |
| `getAllDepartments` | `GET /departments` | Read |
| same trio for `Specializations` | `/specializations` | |

### 4.13 Patient payments / invoices

| Lambda | Routes | Purpose |
| --- | --- | --- |
| `createPatientPayment` | `POST /patients/{id}/payments` | Create invoice |
| `updatePatientPayment` | `PATCH /patients/{id}/payments/{paymentID}` | Edit invoice |
| `deletePayment` | `DELETE /patients/{id}/payments/{paymentID}` | Soft-delete invoice |
| `getAllPaymentsForPatient` | `GET /patients/{id}/payments` | List per patient |
| `listAllPaymentsForPatientByID` | `GET /patients/{id}/payments/list` | Paginated list |
| `getPaymentByID` | `GET /payments/{paymentID}` | One invoice |
| `getAllInvoices` | `GET /invoices` | Admin: all invoices via `EntityType-index`; doctors: own via `doctorEmail-createdAt-index` |

### 4.14 Surgeries

`createPatientSurgery` is a placeholder; `getSurgeryByID` and `listAllSurgeriesForPatientByID` are standard reads.

### 4.15 Cognito hooks

#### `cognito-pre-token-generation`
- Fires on every sign-in.
- Adds `email` + `name` to the access token claims.
- Short-circuits the warmer ping.

---

## 5. Cross-cutting features

### 5.1 Idempotency (Phase D)

- Every mutating Lambda reads the `X-Client-Request-Id` header.
- If a row exists at `IDEMP#<cid> / PROFILE` it returns the cached response — replay-safe.
- The cache row stores the entire response under `response` and has `expiresAt = now + 24h` (DynamoDB TTL deletes it).

### 5.2 Audit log

- Mutating Lambdas write to `AUDIT#YYYY-MM-DD / AUDIT#<entity>#<id>#<ts>`.
- Captures `actorEmail`, `actorName`, `before`, `after`, `ipAddress`.
- Queried via `akwadona-audit`.

### 5.3 Counters

- `COUNTER#PATIENTS`, `COUNTER#DOCTORS`, `COUNTER#APPOINTMENTS` rows hold `total`.
- Atomically `ADD :one` on create / `ADD :neg` on delete (inside the same transaction as the row write).
- Dashboard reads are O(1).

### 5.4 Lambda warmer

- EventBridge rule fires every 5 min → pings 5 critical Lambdas with `{ _warmup: true }`.
- Each Lambda's first line: `if (event?._warmup) return { ok: true, warmed: true };` — returns in milliseconds.
- Keeps an execution environment hot; first real user call doesn't pay cold-start.

### 5.5 Offline support pairing

- The frontend Service Worker queues mutations when offline, replays on reconnect with the same `X-Client-Request-Id`.
- Backend idempotency makes the replay safe.

---

## 6. Security model

### 6.1 Authentication

- **Cognito OIDC**. Frontend uses `angular-auth-oidc-client`.
- Access tokens stored in `sessionStorage` (never localStorage — prevents XSS-token-theft).
- API Gateway HTTP API JWT authorizer validates the token signature on every call.

### 6.2 Authorization

- Lambdas inspect `cognito:groups` from the JWT claims.
- Helper pattern:
  ```js
  function isAdminOrDeveloper(event) { … }
  function getCaller(event) { return { email, isAdmin, isDoctor, ... } }
  ```
- Role matrix:

| Group | What they can do |
| --- | --- |
| Admin / Developers | Everything |
| Doctors | Read/write own appointments + consultations; create blood requests; access doctor folders |
| Pharmacists | Pharmacy + blood bank inventory/donations/cross-match/issue; pharmacy folders |
| (Patients) | Reserved — not yet exposed |

### 6.3 Encryption

- **At rest**: customer-managed KMS CMK encrypts the DynamoDB table + every S3 bucket.
- **In transit**: TLS 1.2 minimum on CloudFront; default on API Gateway.
- KMS key rotation: managed by AWS (yearly).

### 6.4 CORS

- API Gateway `corsPreflight.allowOrigins` whitelist: `https://akwadona.com`, `https://www.akwadona.com`, `https://d37kqu4c91mlc4.cloudfront.net`.
- `allowHeaders` includes `Content-Type`, `Authorization`, `X-Client-Request-Id`.

### 6.5 Secrets

- Seed admin credentials → AWS Secrets Manager (created by a custom resource on first deploy).
- No secrets in source code.

### 6.6 Input validation

- Required-field checks per Lambda.
- QID = 11 digits; phone normalized; gender from allow-list; blood type from allow-list.
- Filter expressions never accept raw user attribute names — always whitelist via placeholder maps.

### 6.7 Audit & soft-delete

- Every mutation logged.
- Rows are soft-deleted (`deletedAt`), never removed — required for PDPPL.

---

## 7. Deployment

### 7.1 One-time setup (per developer machine)

Install once on a clean Windows / macOS box.

- **Node.js ≥ 20** (`node --version`).
- **AWS CLI v2** (`aws --version`).
- **PowerShell 5+** (Windows) or any POSIX shell.
- Clone the repo and install deps:
  ```powershell
  git clone https://github.com/appdevmate/hospital.git
  cd hospital
  npm install
  cd akwadona-cdk
  npm install
  cd ..\scripts
  npm install        # only needed if you run seed / cleanup scripts
  cd ..
  ```
- **AWS credentials**:
  - Configure once: `aws configure` → access key + secret of `hospital-deploy-user`, region `us-east-1`, output `json`.
  - The `hospital-deploy-user` already has the inline policy `HospitalDevAccess` (DynamoDB + CloudFormation read + Logs + Budgets).

### 7.2 Backend deploy (CDK)

```powershell
cd "C:\Users\Sami Toufic Taha\Desktop\aws apps\hospital\akwadona-cdk"
npm run build
npx cdk deploy --require-approval never
```

What happens:

- `npm run build` compiles `akwadona-cdk-stack.ts` → `.js`.
- `cdk deploy` synthesizes the CloudFormation template + uploads each Lambda's `lambda/<folder>` as a zip asset to the CDK assets bucket.
- CloudFormation rolls out only the changed resources.
- Typical time: **2–3 minutes**.

Tips:

- Use `npx cdk diff` first to preview what will change.
- Use `npx cdk deploy --hotswap` for dev iterations — pushes Lambda code directly without a CloudFormation changeset (~10 s) when only Lambda code changed. **Don't use in production.**

### 7.3 Frontend deploy (S3 + CloudFront)

```powershell
cd "C:\Users\Sami Toufic Taha\Desktop\aws apps\hospital"
npm run build
aws s3 sync dist/verona-ng/browser s3://akwadonacdkstack-akwadonafrontendbuckete011c800-tal731ksbepv --delete
aws cloudfront create-invalidation --distribution-id EMIDMHCZ9PRK4 --paths "/*"
```

Tips:

- The `--delete` flag on `s3 sync` removes orphan chunks from previous deploys (keeps the bucket clean).
- CloudFront cache invalidation takes ~30 s globally.
- After deploy, users still see the old bundle until the **Service Worker** updates. Force-update on the user side: DevTools → Application → Storage → Clear site data → reload.

### 7.4 First-ever deploy (fresh AWS account)

If you're deploying into a brand-new account:

```powershell
# 1. Bootstrap the CDK toolkit (one-time per account+region)
cd "C:\Users\Sami Toufic Taha\Desktop\aws apps\hospital\akwadona-cdk"
npx cdk bootstrap aws://ACCOUNT_ID/us-east-1

# 2. Deploy the main stack
npm run build
npx cdk deploy --require-approval never

# 3. Capture the outputs into your frontend config
aws cloudformation describe-stacks --stack-name AkwadonaCdkStack --region us-east-1 --query "Stacks[0].Outputs"
```

Then:

- Open the **Cognito User Pool** in the console and create the four groups: `Admin`, `Developers`, `Doctors`, `Pharmacists`.
- Create the first admin user (or pull from the Secrets Manager secret seeded by the custom resource).
- Update `src/app/services/config.ts` and `src/app.config.ts` with the new API URL, Cognito authority, and client id.
- Build + push the frontend (§7.3).

### 7.5 Live values (current environment)

```
Account             = 483176634665
Region              = us-east-1
Stack               = AkwadonaCdkStack
ApiUrl              = https://a2s6jk35d9.execute-api.us-east-1.amazonaws.com
AppClientId         = 5i94ivu752m12uivl62v99pu4
CloudFrontUrl       = https://d37kqu4c91mlc4.cloudfront.net
DistributionId      = EMIDMHCZ9PRK4
S3BucketName        = akwadonacdkstack-akwadonafrontendbuckete011c800-tal731ksbepv
UserPoolId          = us-east-1_KkINt5vOF
CognitoAuthority    = https://cognito-idp.us-east-1.amazonaws.com/us-east-1_KkINt5vOF
DocumentsBucketName = akwadona-documents-483176634665-us-east-1
```

To discover them again any time:

```powershell
aws cloudformation describe-stacks --stack-name AkwadonaCdkStack --region us-east-1 --query "Stacks[0].Outputs"
```

### 7.6 Domain + DNS (`akwadona.com`)

- Apex `akwadona.com` → CloudFront distribution (alias record at the DNS provider).
- Subdomain `www.akwadona.com` → CNAME to `d37kqu4c91mlc4.cloudfront.net`.
- Both hostnames must be added to the **CloudFront distribution → Alternate domain names (CNAMEs)** list.
- ACM certificate (us-east-1) must cover both.
- Cognito **App client → Allowed callback URLs** + **Sign-out URLs** must include both `https://akwadona.com/` and `https://www.akwadona.com/`.
- The API Gateway `corsPreflight.allowOrigins` list must include both.

### 7.7 Rollback

Two paths:

1. **CloudFormation rollback** — if a `cdk deploy` fails mid-way, CloudFormation auto-rolls back. No action needed.
2. **Manual revert**:
   ```powershell
   git revert <bad-commit>
   git push
   cd akwadona-cdk
   npm run build
   npx cdk deploy --require-approval never
   ```
   For the frontend, re-deploy the previous `dist/` build (or rebuild from the reverted commit) and invalidate CloudFront.

### 7.8 Smoke test after a deploy

1. Open an incognito window → `https://akwadona.com`.
2. Sign in as admin1.
3. Hit:
   - Dashboard → numbers populated.
   - Appointments → list loads in <2 s.
   - Doctors Management → list loads in <2 s.
   - Pharmacy → no 500s.
4. Done.

### 7.9 Maintenance scripts (`/scripts/`)

| Script | Purpose | Safe? |
| --- | --- | --- |
| `seed-appointments.js` | Bulk-seed N synthetic appointments (BatchWriteItem). | Dev / load-test only |
| `sync-appointments-counter.js` | Rebuild `COUNTER#APPOINTMENTS / TOTAL` after bulk operations. | Anytime |
| `cleanup-doctor-locks.js` | Remove orphan EMAIL/QID/PHONE locks left from failed creates. | Anytime |
| `delete-all-doctors.js` | Wipe every doctor + their locks. | **DEV ONLY** |
| `delete-all-patients.js` | Wipe every patient + their locks. | **DEV ONLY** |

---

## 8. Operations & cost

### 8.1 Cold starts

- Mitigated by **memory bump to 512 MB** (3× faster cold start) + **5-min EventBridge warmer** on 5 critical Lambdas.
- Other Lambdas pay 1–2 s cold start on the first call after a quiet period.

### 8.2 Pagination at scale

- Appointments list: cursor-based, server-side filters, max page 100. Total via counter row.
- Doctors list: now queries `EntityType-index` (replaces a Scan that timed out at 1 M rows).
- Invoices list: same fix.

### 8.3 Cost estimate

| Item | Monthly cost (typical) |
| --- | --- |
| KMS CMK | $1.00 |
| DynamoDB on-demand | <$0.50 (free tier covers most) |
| Lambda compute | <$0.50 |
| S3 storage + CloudFront | <$0.10 |
| API Gateway requests | $0 (free tier 12 mo) |
| CloudWatch Logs | $0 (5 GB free; we set 7-day retention) |
| Bedrock (Voice Scribe) | per token, ≈ pennies |
| **Total** | **≈ $1–3** |

Items that would push past $5/month:
- Re-enabling WAF (~$5 base).
- Provisioned Concurrency (~$13 per PC).
- Heavy CloudWatch logging (set 7-day retention).
- High public traffic.

### 8.4 Budget alert

A `Akwadona-5-USD` AWS Budget is in place; alerts emailed at 80% actual and 100% forecast.

### 8.5 CloudFormation resource ceiling

- The stack is at **~497 / 500 resources**.
- Future feature work must consolidate small Lambdas or split the stack (see §9.4).

---

## 9. Code-review register

Findings from the comprehensive review of June 2026. Severity: 🔴 high · 🟠 medium · 🟡 low.

### 9.1 Security

| # | Severity | Finding | Status |
| --- | --- | --- | --- |
| S-1 | 🔴 | `updateDoctor` + `deleteDoctor` lack an `isAdminOrDeveloper` check at the handler level — only API Gateway JWT auth gates them, so any authenticated user can edit / soft-delete any doctor. | **Open** — frontend hides the button; backend must enforce. |
| S-2 | 🔴 | Reference-data Lambdas (`createNewDepartment`, `bulkCreateDepartments`, `deleteAllDepartments`, three specialization ones) lack a role check. Pharmacist could delete every department. | **Open**. |
| S-3 | 🔴 | `deletePayment` has no role check. | **Open**. |
| S-4 | 🟠 | `getPatientByID` + `getDoctorByID` + the `get*` Lambdas have no per-row authorization. Any authenticated user can read any patient/doctor. Frontend mitigates by hiding pages, but the API exposes PHI. | **Open** — consider tighter scoping. |
| S-5 | 🟠 | MFA is **OFF** on the Cognito User Pool (intentional cost decision; documented in CDK comment). | Documented. |
| S-6 | 🟠 | WAF disabled at CloudFront (cost decision). The edge stack with rate limiting still exists; toggle `webAclId` to re-enable. | Documented. |
| S-7 | 🟡 | Idempotency cache stores entire response (may contain PHI) under `dataClass: 'SYSTEM'`. Erasure-request pipelines that scan `dataClass = PHI` would miss it. | **Open** — tag with `PHI` when response contains PHI. |
| S-8 | 🟡 | OIDC discovery + jwks responses cached by the SW for 24 h. First sign-in cold-load is slow; subsequent loads are instant. Acceptable, documented. | Documented. |

### 9.2 Bugs

| # | Severity | Finding | Status |
| --- | --- | --- | --- |
| B-1 | 🟡 | Counter rows can drift if a Lambda crashes between the row write and the counter bump. `createPatient` uses TransactWrite (safe). Some others (e.g. appointments counter bump after `PutCommand`) are non-transactional → ±1 drift possible. | **Open** — fold counter into the transact write. |
| B-2 | 🟡 | `findRealIdInResponse` in the offline replay walks a fixed list of id keys (`examinationId`, `appointmentId`, …). New endpoints with unusual id names would silently lose temp-id mapping. | **Open** — convention: every create endpoint must echo a canonical `id` field. |
| B-3 | 🟡 | Appointments list `MAX_UPSTREAM_PAGES = 10` — when a highly-selective filter is applied (e.g. a tiny doctor's appointments across 1 M rows), pages may return short. UI shows "X of Y" mismatch. | **Open** — add a date-bucket GSI for selective queries. |
| B-4 | 🟡 | Mismatch between `auth.service.parseRole` (single role) and `roleGuard` (single role check). A user in both Doctors + Admin maps to whichever appears first in the precedence list. | **Open** — refactor around `isInGroup(group)`. |

### 9.3 Clean code / naming

- **Mixed casing**: most Lambdas folder-named camelCase (`createPatient`) but newer ones kebab-case with prefix (`akwadona-appointments`). Inconsistent but not blocking — the camelCase ones are older CRUD, the prefixed ones are domain workspaces.
- **Dead code**: ~400 lines of commented-out code at the top of `Patients Management/new-patient.ts`, `edit-patient.ts`, and `getAllDoctors/index.js`. Remove on next touch.
- **Duplicated role-helper functions**: `isAdmin(event)`, `isAdminOrDeveloper(event)`, `getCaller(event)` re-implemented in 8 Lambdas with subtle variations. Should live in `lambda/_shared/auth.js` but CDK packages per-folder so each must inline. Acceptable trade-off — but extract to a Lambda layer eventually.
- **Magic strings**: group names checked as raw strings (`'Admin'`, `'Doctors'`) — extract to a single constant.
- **Hard-coded IDs**: `Config.apiBaseUrl`, Cognito clientId, distribution ID, S3 bucket name are baked into source. Workable for one environment, friction for multi-env. Move to `assets/runtime-config.json` baked at deploy time.

### 9.4 Architecture

- **CloudFormation resource ceiling** — stack at ~497/500 resources. Next feature will likely require splitting the stack.
- **Per-Lambda CRUD vs domain workspace** — the codebase has 16 single-purpose CRUD Lambdas + 9 domain workspaces. Folding the CRUD Lambdas into 2–3 workspaces (`patients`, `doctors`, `payments`) would reclaim ~30 resources and reduce the role-check duplication.
- **GSI strategy** — `EntityType-index` is overloaded. At true 10 M+ scale we'd want bucketed indexes (e.g. `date-startTime-index` on appointments) so selective filters don't burn RCUs.

---

## 10. Glossary

| Term | Meaning |
| --- | --- |
| Lambda | A small server-less program on AWS. Runs only when called, scales automatically. |
| DynamoDB | AWS key-value database. Sub-10 ms reads/writes with the right keys. |
| PK / SK | Partition key / sort key — the two halves of a DynamoDB primary key. |
| GSI | Global Secondary Index — a second access path on a DynamoDB table. |
| API Gateway HTTP API | The public URL surface. Forwards HTTPS calls to Lambdas. |
| JWT | JSON Web Token — signed string proving caller identity. Issued by Cognito. |
| Cognito | AWS user authentication service. Hosts the sign-in page and issues JWTs. |
| Cognito groups | Buckets users belong to: `Admin`, `Developers`, `Doctors`, `Pharmacists`. |
| OIDC | OpenID Connect — the auth protocol Cognito speaks. |
| CORS | Cross-Origin Resource Sharing — browser security check on cross-domain calls. |
| CMK / KMS | Customer Master Key — AWS encryption keys. Our table + buckets use one. |
| TTL | Time-to-live. DynamoDB auto-deletes rows whose `expiresAt` epoch has passed. |
| Idempotency | Same action twice = same effect as once. Enforced via the `IDEMP#<cid>` cache. |
| CID / `X-Client-Request-Id` | UUID generated by the frontend on every mutation. |
| PHI | Protected Health Information. All clinical rows have `dataClass = PHI`. |
| Soft-delete | Setting `deletedAt` instead of removing the row. Required by PDPPL. |
| Counter row | A DynamoDB row whose `total` attribute is updated atomically on create/delete. |
| Cold start | First Lambda invocation after a quiet period. ~1–2 s extra. |
| Warmer | EventBridge schedule that pings critical Lambdas every 5 min. |
| EventBridge | AWS scheduled-event service. |
| Bedrock | AWS managed LLM service. We use Claude Haiku for the SOAP split. |
| SOAP note | Subjective / Objective / Assessment / Plan — clinical note structure. |
| QID | Qatar ID — 11-digit national identity number. |
| Presigned URL | Short-lived URL signed by AWS letting the browser PUT/GET S3 directly. |
| OAC | Origin Access Control — CloudFront authenticating itself to a private S3 bucket. |
| SPA | Single-Page Application — the Angular front-end. |
| CDK | Cloud Development Kit — TypeScript infrastructure-as-code. |
| BatchWriteItem | DynamoDB API writing up to 25 rows per request. Used for bulk imports. |
| TransactWriteItems | DynamoDB API for atomic multi-row writes. All succeed or all fail. |
| `dataClass-index` | GSI compliance tooling uses to scan all PHI rows. Requires non-null `updatedAt`. |
| `_warmup` flag | Field on warmer events; Lambdas short-circuit on it. |
| PDPPL | Qatar Personal Data Privacy Protection Law. |
| MOPH | Qatar Ministry of Public Health (regulator). |
| MFA | Multi-Factor Authentication. Currently OFF on the User Pool. |
| WAF | Web Application Firewall. Currently disabled to save the $5/month base charge. |

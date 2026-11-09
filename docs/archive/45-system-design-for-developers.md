# 45 — System Design for Developers

> **Status:** Live. Written 2026-10-29 from the code, not from older docs. Every claim here was checked against `akwadona-cdk/lib/akwadona-cdk-stack.ts`, the Lambda sources, and `src/app/`.
> **Audience:** an engineer who will change this system. Assumes you have read [`00-akwadona-explained.md`](00-akwadona-explained.md) (the plain-English tour) and [`02-aws-services-reference.md`](02-aws-services-reference.md) (what each AWS service is for).
> **Style:** `../skills/akwadona-easy-english/SKILL.md` — short sentences, one analogy per new idea, every abbreviation expanded on first use. Code names and identifiers stay exact.

---

## 1. TL;DR

Akwadona is one CloudFormation stack (`AkwadonaCdkStack`, region `us-east-1`, account `483176634665`) that serves many hospitals from one codebase. One DynamoDB table holds every row for every hospital; every row carries a `tenantId`. One Cognito pool holds every user; a Lambda stamps `tenantId` into the JWT at login. 39 Lambdas behind one HTTP API read that claim and never trust anything else. Patient data is encrypted in the Lambda with a key that belongs to the hospital, and the platform operator's Lambda is explicitly forbidden — by IAM, not by convention — from using that key.

The system has four places where it is fragile. Know them before you touch anything:

1. The stack is at **496 of 500** CloudFormation resources. Adding a route, an alarm, or a Lambda can fail the deploy.
2. Every row has its own encryption key, so listing N rows costs N KMS calls on a cold container. The DEK cache hides this for repeat reads; it does not make first reads free.
3. Shared code is **copied** into each Lambda folder, not imported. Change `_shared/crypto.js` → copy it to 16 folders.
4. Several fields are ciphertext in DynamoDB. A filter on them inside a DynamoDB expression silently matches nothing.

---

## 2. The system in one paragraph

A doctor opens `tiryaq.akwadona.com`. CloudFront serves the Angular app from an S3 bucket. The app shows its own login screen and calls Cognito's `InitiateAuth` API directly. Cognito runs a **pre-token Lambda** that adds `tenantId`, `role`, `tenantSlug`, and (for doctors) `doctorId` to the JWT (JSON Web Token). The app stores the token and sends it as `Authorization: Bearer …` on every API call to `vbsex10bd6.execute-api.us-east-1.amazonaws.com`. API Gateway verifies the token's signature against the Cognito pool and rejects anything else before any code runs. The matching Lambda reads `tenantId` from the verified claims, checks the per-tenant rate limit, does its work against the `Hospital` table using the `tenant-entityType-index` so it physically cannot read another hospital's rows, encrypts or decrypts PHI (Protected Health Information) fields with that hospital's KMS (Key Management Service) key, writes an audit row, and returns JSON. CloudTrail records every AWS API call, including every `kms:Decrypt`, into an S3 bucket with Object Lock so nobody can edit the history.

---

## 3. Infrastructure map

Everything below is defined in `akwadona-cdk/lib/akwadona-cdk-stack.ts` unless noted. The CDK symbol is the variable name in that file — search for it.

### 3.1 Keys and audit (the foundation)

| Resource | CDK symbol | Purpose | Notes |
|---|---|---|---|
| KMS key `alias/akwadona/data` | `akwadonaDataKey` | Encrypts the DynamoDB table, the frontend bucket, the documents bucket, and the seed-user secrets | Annual rotation. Every Lambda gets `grantEncryptDecrypt` because DynamoDB `CUSTOMER_MANAGED` encryption requires the caller to hold key access. |
| KMS key `alias/akwadona/audit` | `akwadonaAuditKey` | Encrypts the audit bucket + CloudTrail | Separate from the data key on purpose: a data-key compromise cannot touch the audit chain. |
| KMS keys `alias/akwadona-tenant-<slug>` and `-hmac` | **not in CDK** | Per-hospital PHI key + per-hospital HMAC key | Created by the operator wizard (`akwadona-operator-console/index.js`, search `CreateKeyCommand`). Tagged `akwadona:tenantId`. ARNs stored on the hospital's `TENANT#<slug>` row. |
| S3 `akwadona-access-logs-…` | `accessLogsBucket` | S3 + CloudFront service logs | SSE-S3 because those AWS services refuse KMS destinations. 7-year lifecycle. |
| S3 `akwadona-audit-v7-…` | `auditBucket` | CloudTrail + exported app audit | KMS (audit key), **Object Lock compliance mode, 7 years** — nobody, including root, can delete within the window. |
| CloudTrail `akwadona-cloudtrail` | `trail` | Every control-plane call, multi-region, log-file validation | Also mirrored to CloudWatch Logs (1-year retention). |

### 3.2 Data

| Resource | CDK symbol | Purpose |
|---|---|---|
| DynamoDB table `Hospital` | `table` | The only table. PK/SK strings, pay-per-request, PITR (Point-In-Time Recovery) on, deletion protection on, TTL attribute **`expiresAt`**, encrypted with the data key. |
| 9 GSIs (Global Secondary Indexes) | `table.addGlobalSecondaryIndex` × 9 | See §6.3. Adding a GSI to a live table is one-per-deploy. |

### 3.3 Identity

| Resource | CDK symbol | Purpose | Notes |
|---|---|---|---|
| Cognito pool `akwadona-user-pool` (`us-east-1_bpipvSdQi`) | `userPool` | Every user of every hospital + platform staff | 12-char password policy, 3-day temp passwords, `preventUserExistenceErrors`, Advanced Security `FULL_FUNCTION`, device tracking, **MFA = OPTIONAL (TOTP)** since 2026-10-29 (was OFF). Custom attribute `custom:tenantId`. |
| App client `Akwadona` (`4r9fcr8f54pmubmmbnuldi9fqc`) | `appClient` | What the Angular app authenticates against | No secret. `USER_PASSWORD_AUTH` + SRP + custom flows. Access/ID tokens 1 h, refresh 30 d. |
| Groups `Admin`, `Developers`, `Doctors`, `Pharmacists`, `Operator` | `CfnUserPoolGroup` × 5 | Role source | `cognito:groups` claim. The frontend maps these to lowercase role names. |
| Lambda `cognito-pre-token-generation` | `preTokenFn` | Stamps `tenantId`, `role`, `tenantSlug`, `doctorId` into the JWT | V3_0 trigger. Read-only on the table + `kms:GenerateMac` on tenant HMAC keys (to find a doctor by encrypted email). Kept warm by `PreTokenWarmerRule` every 5 min because Cognito kills triggers at 5 s. |
| Cognito domain `akwadona-hospital` + custom `auth.akwadona.com` | `userPool.addDomain` (prefix only; custom domain was added by CLI, see `docs/10`) | Token refresh endpoint | The user never sees a Cognito-hosted page. |

### 3.4 Compute and API

| Resource | CDK symbol | Purpose |
|---|---|---|
| 39 API Lambdas | `fn(...)` factory, `readOnlyFunctions` + `readWriteFunctions` | One folder each under `akwadona-cdk/lambda/`. 512 MB, 30 s, Node 20 default (24 for the aggregate modules). Env: `TABLE_NAME`, `USER_POOL_ID`, `TENANT_KEYS`/`TENANT_HMAC_KEYS` (both `{}` — the wizard model made them obsolete). |
| 2 support Lambdas | `seedFn`, `usersFn` | Run once at deploy via CloudFormation custom resources: seed departments/specializations/counters; create 8 seed users with random temp passwords stored in Secrets Manager `/akwadona/seed-users/*`. |
| HTTP API `akwadona-api` | `api` | Single JWT authorizer (`HttpJwtAuthorizer` → the pool). CORS allow-list = localhost, raw CloudFront domain, `akwadona.com`, `www`, and each `tenantSlugs[]` subdomain. **Stage throttle 200 r/s sustained / 500 burst** (2026-10-29). |
| ~70 routes | `route(...)` + two `{proxy+}` catch-alls | Every route carries the authorizer. `/admin/{proxy+}` and `/operator/{proxy+}` fan out inside one Lambda each to save resources. |

### 3.5 Edge

| Resource | CDK symbol | Purpose | Notes |
|---|---|---|---|
| S3 frontend bucket (`akwadonacdkstack-akwadonafrontendbucket…`) | `siteBucket` | Angular build output | KMS, versioned, access-logged, OAC-only (no public access). |
| CloudFront `EMIDMHCZ9PRK4` (`d37kqu4c91mlc4.cloudfront.net`) | `distribution` | Serves the SPA on `akwadona.com` + `*.akwadona.com` | TLS 1.2 (2021) floor, redirect HTTP→HTTPS, managed `SECURITY_HEADERS` response policy, 403/404 → `index.html` for SPA routing, logs to the access-logs bucket. **No WAF attached** (edge stack disabled for cost). |
| ACM wildcard cert | `siteCert` (imported by ARN, created by CLI) | `*.akwadona.com` + apex | Lives in `us-east-1` by CloudFront rule; outside CDK so teardown keeps it. |
| S3 documents bucket (`akwadona-documents-…`) | `documentsBucket` | Patient uploads via pre-signed URLs | **KMS (data key) since 2026-10-29**, was SSE-S3. CORS to the same allow-list. Only `documentManagerFn` has access. |
| DNS | GoDaddy, not Route 53 | CNAMEs `www`, `tiryaq`, `alshifaa`, `auth` | See `docs/16` §3 for the GoDaddy workflow. |

### 3.6 Operations

| Resource | CDK symbol | Purpose |
|---|---|---|
| SNS topic `akwadona-alarms` | `alarmTopic` | Alarm fan-out. Subscribe your e-mail once after deploy (see `docs/25` §5). |
| Alarm `akwadona-api-5xx` | `api5xxAlarm` | ≥1 API 5xx in 5 min |
| Alarm `akwadona-lambda-errors` | `lambdaErrorsAlarm` | ≥1 Lambda error in 5 min, any function |
| Managed policy `akwadona-throttle-metrics` | `throttleMetricsPolicy` | One shared `cloudwatch:PutMetricData` policy (namespace `Akwadona/Throttle`) instead of 39 inline ones — saves 38 CFN resources. |
| EventBridge `PreTokenWarmerRule` | — | The only schedule. 5-minute warm-up ping to the pre-token Lambda. |

### 3.7 Not deployed (but in the repo)

`akwadona-cdk/lib/akwadona-edge-stack.ts` — `AkwadonaEdgeStack`, a CloudFront-scoped WAFv2 WebACL (AWS managed Core + Known-Bad-Inputs rule sets + per-IP rate limit). Commented out in `bin/akwadona-cdk.ts` "to stop charges". Re-enable = uncomment two blocks + redeploy with `--all`. Cost ≈ $10/month.

---

## 4. Request lifecycle — `POST /patients`, hop by hop

Think of this as a parcel going through a sorting office. Each station checks something and either stamps it through or sends it back.

```
Browser (tiryaq.akwadona.com)
  │  patients.service.ts → Config.buildUrl('patients')
  │  offline-queue.interceptor: online? send : queue in IndexedDB
  │  auth.interceptor: add Authorization: Bearer <accessToken>   (only for API + Cognito hosts)
  ▼
API Gateway  vbsex10bd6                                    ~5 ms
  │  stage throttle: 200 r/s / 500 burst  → 429 if exceeded
  │  CORS: Origin in allow-list?          → no ACAO header if not
  │  HttpJwtAuthorizer: signature, issuer, audience, expiry → 401 if any fail
  │  route match: POST /patients → createPatientFn
  ▼
Lambda akwadona-create-patient                             cold ~400 ms / warm ~20 ms
  │  _warmup short-circuit
  │  getTenant(event): claims.tenantId, reject UNASSIGNED → 403
  │  throttle.precheck(): read TENANT profile (cached 60 s), UpdateItem THROTTLE#<tenant>/<minute> + /<day> → 429 if over plan
  │  validate body (required fields, shapes)
  │  stampHashes(): qidHash / emailHash / phoneHash via kms:GenerateMac on the tenant HMAC key   ~15 ms each, cached
  │  encryptItem(): kms:GenerateDataKey → DEK; AES-256-GCM each PHI field; store wrapped DEK on the row   ~15 ms
  │  TransactWriteCommand: PATIENT#<uuid>/PROFILE + QID_LOCK#<hash> + PHONE_LOCK#<hash> (all-or-nothing uniqueness)   ~15 ms
  │  PutCommand AUDIT#… row (who, what, when; before/after encrypted)
  │  return 201 { patientId }   (no CORS headers — API Gateway adds them)
  ▼
API Gateway adds Access-Control-Allow-Origin for the matching origin
  ▼
Browser: interceptors unwrap → component → signal update → UI re-renders
```

Timing budget for a warm call: ~80–120 ms end to end. Cold: add ~400 ms. The pre-token Lambda has the tightest budget (5 s, enforced by Cognito) — that is why it is the only warmed function.

**Where each defence lives:**

| Threat | Stopped at | By |
|---|---|---|
| No / forged / expired token | API Gateway | `HttpJwtAuthorizer` — no Lambda runs |
| Cross-site request from a strange origin | API Gateway | `corsPreflight` allow-list |
| Flood | API Gateway, then Lambda | Stage throttle, then `throttle.js` per-tenant plan |
| Reading another hospital's row | Lambda | `tenant-entityType-index` key condition + `tenantId` check on single-item reads → **404** (never 403: no existence oracle) |
| Operator reading PHI | IAM | Explicit `DENY kms:Decrypt` on the operator role for `alias/akwadona-tenant-*` + key-policy exclusion |
| Read-only Lambda writing | IAM | `grantReadData` + scoped `UpdateItem` on `THROTTLE#*` only (2026-10-29) |
| Stolen DynamoDB backup | Crypto | Rows hold ciphertext + a DEK wrapped by a key that never leaves KMS |
| Tampered audit history | S3 | Object Lock compliance mode, 7 years |

---

## 5. Login lifecycle

```
Angular login page (custom, 6 languages)
  │ cognito-auth.service.ts → POST cognito-idp.us-east-1.amazonaws.com  InitiateAuth USER_PASSWORD_AUTH
  ▼
Cognito
  │ password check; NEW_PASSWORD_REQUIRED / SOFTWARE_TOKEN_MFA challenges round-trip to the UI
  │ V3_0 pre-token trigger → cognito-pre-token-generation
  │     tenantId   ← custom:tenantId attribute (or "UNASSIGNED")
  │     role       ← "operator" if in Operator group else "tenant_user"
  │     tenantSlug ← Query tenant-entityType-index (tenantId, TENANT)          [was a table Scan]
  │     doctorId   ← if in Doctors group: HMAC(email, tenant) → Query emailHash-EntityType-index
  │                  fallback: Query email-index (legacy plaintext rows)         [was a table Scan on plaintext email — never matched encrypted doctors]
  │ issues access + id + refresh tokens with those claims in BOTH tokens
  ▼
Angular
  │ stores accessToken in sessionStorage (this tab) and localStorage (survive browser close)
  │ auth.guard reads it; role.guard maps cognito:groups → ['admin'|'developer'|'doctor'|'pharmacist']; operator.guard checks role === 'operator'
  │ tenant.service compares URL subdomain to tenantSlug claim → redirect if the user is on the wrong hospital's URL
```

Why a custom login and not Cognito's Hosted UI: branding, six languages, RTL (right-to-left) layout, and the hosted page cannot show the tenant's logo. The trade-off is that the app handles the challenge states itself (`cognito-auth.service.ts` already does, including `SOFTWARE_TOKEN_MFA`, which is why flipping MFA to OPTIONAL needed no UI change).

---

## 6. Data model

### 6.1 One table, many shapes

Think of one filing cabinet with coloured labels. The label is `EntityType`; the drawer is `PK`; the folder inside the drawer is `SK`.

| EntityType | PK | SK | What |
|---|---|---|---|
| `TENANT` | `TENANT#<slug>` | `PROFILE` | One per hospital: `tenantId`, plan, `kmsKeyArn`, `kmsHmacKeyArn`, display name |
| `PATIENT` | `PATIENT#<uuid>` | `PROFILE` | PHI encrypted; `qidHash` / `emailHash` / `phoneHash` for lookup |
| `QID_LOCK` / `PHONE_LOCK` / `EMAIL_LOCK` | `<KIND>_LOCK#<hmac>` | `LOCK` | Uniqueness guard written in the same transaction as the profile |
| `DOCTOR` | `DOCTOR#<uuid>` | `PROFILE` | PHI encrypted (incl. email); same lock pattern |
| doctor↔patient link | `DOCTOR#<uuid>` | `PATIENT#<uuid>` | Which doctor can see which patient |
| `APPOINTMENT`, `EXAM`, `MED`, `DISPENSE`, `PO`, `CALENDAR`, `DONOR`, `BBUNIT`, `BBREQ`, `SCRIBE` | `<PREFIX>#<uuid>` | `PROFILE` or sub-rows | Module rows; see each module doc |
| `AUDIT` | `AUDIT#<date>` | `<timestamp>#<uuid>` | Who did what; before/after JSON encrypted |
| `COUNTER` | `COUNTER#PATIENTS#<tenantId>` | `TOTAL` | O(1) totals for list pages |
| `THROTTLE_COUNTER` | `THROTTLE#<tenantId>` | `<minute>` / `<day>` | Rate-limit windows; `expiresAt` set (fixed 2026-10-29) |
| `IDEMP` | `IDEMP#<clientRequestId>` | … | 24 h idempotency memory for mutating calls |

Every row also carries `tenantId`, `dataClass` (`PHI` / `PII` / `PUBLIC` / `AUDIT` / `SYSTEM`), `createdAt`, `updatedAt` (string, never null — `dataClass-index` needs it).

### 6.2 Three kinds of field

| Kind | Examples | Stored as | Can filter in DynamoDB? | Can search? |
|---|---|---|---|---|
| Plaintext | `gender`, `insurance`, `status`, `department`, `specialization`, `bloodGroup`, `dutyDays`, `hiringDate`, `createdAt` | the value | **Yes** | Yes (FilterExpression) |
| Encrypted | `name`, `dob`, `qid`, `phone`, `email`, `medicalHistory`, `notes`, `allergies`, `medications`, `licenseNumber`, `education` | base64 `iv‖tag‖ct` per field + one `_kms_dek` per row | **No — silently matches nothing** | Only after `decryptItems()` in memory |
| Hashed | `qidHash`, `emailHash`, `phoneHash` | HMAC-SHA256 hex via the tenant's KMS HMAC key | Equality only, via a GSI | Exact match ("find by QID") |

The list in `crypto.js` (`PATIENT_PHI_FIELDS`, `DOCTOR_PHI_FIELDS`, `APPOINTMENT_PHI_FIELDS`, …) is the law. If you add a field, decide which kind it is there first.

### 6.3 The nine GSIs

| Index | Keys | Use it for | Don't |
|---|---|---|---|
| `tenant-entityType-index` | `tenantId` / `EntityType` | **Every per-tenant list.** The workhorse. | — |
| `EntityType-index` | `EntityType` | Global rows: `TENANT` list, departments, specializations | per-tenant lists (no tenant bound) |
| `emailHash-EntityType-index` | `emailHash` / `EntityType` | Find PATIENT or DOCTOR by email (after HMAC) | — |
| `email-index` | `email` / `EntityType` | Legacy: DOCTOR rows that pre-date encryption | anything new — `email` is ciphertext now |
| `PatientID-index` | `patientId` / `SK` | Rows that hang off a patient (payments, surgeries) | — |
| `doctorEmail-createdAt-index` | `doctorEmail` / `createdAt` | Invoices per doctor by date | — |
| `dataClass-index` | `dataClass` / `updatedAt` (KEYS_ONLY) | Forensics: "every PHI row touched between t1 and t2" | — |
| `GSI1` | `GSI1PK` / `GSI1SK` | Generic adjacency (modules) | — |
| `GSI2` | `name_prefix` / `name_lower` | **Unused** — `name` is encrypted, nothing writes these keys | name search (do it in memory) |

---

## 7. Encryption design

### 7.1 Envelope per row

```
write:  DEK = kms:GenerateDataKey(tenant data key)        → plaintext + wrapped
        field = AES-256-GCM(field, DEK, fresh IV)          per PHI field
        row._kms_dek = wrapped DEK                          stored with the row
        DEK plaintext wiped from memory (cached copy kept 5 min — §7.3)

read:   DEK = cache hit ? cached : kms:Decrypt(row._kms_dek)
        field = AES-256-GCM⁻¹(field, DEK)
```

Analogy: each row is a locked box; the box's key is itself locked in a hospital-owned safe (the KMS key). Melting the safe key (`ScheduleKeyDeletion`) makes every box permanently unopenable — that is cryptographic erasure, and it is how "right to be forgotten" works at the hospital level.

### 7.2 Zero-knowledge — three independent layers

1. **Identity policy:** the operator Lambda role carries `DENY kms:Decrypt|Encrypt|GenerateDataKey*|GenerateMac|VerifyMac|ReEncrypt*` on any key whose alias matches `alias/akwadona-tenant-*`. Explicit DENY beats any ALLOW anywhere.
2. **Resource policy:** each tenant key's policy grants use only to principals matching `AkwadonaCdkStack-*ServiceRole*` and excludes `*Operator*`.
3. **Code:** `akwadona-operator-console/index.js` never imports `crypto.js`.

Since 2026-10-29 a fourth guard protects the keys themselves: the operator may `ScheduleKeyDeletion` only on keys tagged `akwadona:tenantId` (so never the platform data/audit keys or anything hand-made), and is explicitly DENIED on the live tenants' tags (`T_2572fc71`, `T_a4b8aef9`). Add new tenant IDs to `PROTECTED_TENANT_IDS` after onboarding is confirmed.

### 7.3 DEK cache (2026-10-29)

`_shared/crypto.js` keeps a `Map<wrappedDekBase64, plaintextDek>` with a 5-minute TTL (Time To Live) and 2,000-entry cap, wipe-on-evict. Repeat reads of the same rows within a container's life cost zero KMS calls. `decryptItems()` also caps parallel KMS calls at 32 so a big page cannot trip the account-wide KMS quota.

Security note: plaintext DEKs in Lambda memory for ≤5 min is the same model the AWS Encryption SDK's caching CMM uses. The operator Lambda cannot reach this path at all (layer 1 above).

### 7.4 HMAC search

`computeHmac(value, tenantId)` → `kms:GenerateMac` on the tenant's HMAC key → hex. Same plaintext + same tenant = same hash; different tenant = different hash. So `john@gmail.com` at Tiryaq and at Alshifaa produce unrelated fingerprints, and a stolen table cannot be joined across hospitals. The secret never leaves the HSM (Hardware Security Module).

---

## 8. Code map

### 8.1 Repository

```
hospital/
├── akwadona-cdk/
│   ├── bin/akwadona-cdk.ts            stack wiring; edge stack commented out
│   ├── lib/akwadona-cdk-stack.ts      THE infrastructure (1,500 lines)
│   ├── lib/akwadona-edge-stack.ts     WAF (not deployed)
│   └── lambda/
│       ├── _shared/                   REFERENCE copies: crypto.js, throttle.js, tenant.js, tenant-guard.js, compliance.js, plan-defaults.js
│       ├── lib/                       older reference copies (throttle.js with usage header)
│       ├── <one folder per Lambda>/   index.js + copies of whichever _shared files it needs
│       └── cognito-pre-token-generation/  index.js + crypto.js (since 2026-10-29)
├── src/
│   ├── app.routes.ts                  lazy routes + role sets
│   ├── app.config.ts                  providers, interceptors order
│   └── app/
│       ├── components/<21 features>/  standalone components, signals, OnPush
│       ├── services/<24>/             one HTTP client per domain + tenant/auth/config/cache
│       ├── guards/                    auth.guard, role.guard, operator.guard
│       └── interceptors/              offline-queue (first), auth (second)
├── scripts/
│   ├── cross-tenant-probe.js          A creates → B must 404 (manual)
│   ├── security-tests/                safe/ + destructive/ attack suite (manual)
│   ├── purge-throttle-counters.js     one-time cleanup after the ttl→expiresAt fix
│   ├── backfill-*.js, migrate-*.js    historical migrations
│   └── *.ps1                          deploy / recover / teardown
└── docs/                              you are here
```

### 8.2 A Lambda folder, and why it looks like that

```
createPatient/
├── index.js          the handler
├── crypto.js         copied from _shared — envelope, HMAC, field lists
├── throttle.js       copied from _shared — per-tenant rate limit
├── plan-defaults.js  copied from _shared — plan → limits
└── function.zip      build artefact (gitignored)
```

`lambda.Code.fromAsset('lambda/<folder>')` zips **that folder only**. A `require('../_shared/x')` resolves at build time on your laptop and fails at runtime in Lambda. So shared code is copied. The cost is 16 copies of `crypto.js`; the benefit is zero Lambda Layer resources (each layer version would be a CFN resource) and no cross-folder coupling at deploy. Keep the copies identical — `md5sum` them (see `docs/18` §6).

Every handler has the same spine:

```js
exports.handler = async (event) => {
  if (event._warmup) return { ok: true };                          // warmer short-circuit
  let tenantId; try { tenantId = getTenant(event); } catch (e) { return err(403) }   // JWT claim, reject UNASSIGNED
  const limit = await throttle.precheck(event, { tenantId, role }); if (limit) return limit;   // 429
  // ... role gate if the route is privileged (isAdmin / role === 'operator' / requireAdminOrOperator)
  // ... validate, work (Query the tenant GSI, never Scan), encrypt/decrypt, audit row
  return ok(body);                                                 // no CORS headers
};
```

### 8.3 The Angular layers

| Layer | Files | Rule |
|---|---|---|
| Routes | `src/app.routes.ts` | Every feature is `loadComponent` (lazy). Role sets are constants at the top (`ADMIN_ROLES`, `PATIENTS_ROLES`, …). |
| Guards | `guards/` | `authGuard` (token present + not expired) → `roleGuard(set)` (group ∈ set) → `operatorGuard` (`role === 'operator'`). Order matters. |
| Interceptors | `interceptors/` | `offlineQueueInterceptor` runs first (queue or pass), `authInterceptor` second (adds the bearer only for the API host and Cognito hosts — never to third parties). |
| Services | `services/` | One per backend domain, all through `Config.buildUrl()`. `tenant.service.ts` reads the subdomain and the `tenantSlug` claim; `cognito-auth.service.ts` owns login/challenges/refresh. |
| Components | `components/` | Standalone, `ChangeDetectionStrategy.OnPush`, state in signals, PrimeNG widgets, Tailwind utilities. |
| PWA | `ngsw-config.json`, `offline-queue.interceptor.ts` | App shell cached; writes queued in IndexedDB while offline and drained on reconnect. |

No `innerHTML`, no `bypassSecurityTrust*`, no `eval` anywhere in `src/app` (checked 2026-10-29). Tokens are never logged.

---

## 9. Design decisions and the debts they left

This is the honest list. Each entry: what we chose, why, what it costs, what to do about it.

| # | Decision | Why | Cost today | Plan |
|---|---|---|---|---|
| 1 | **One CloudFormation stack** | Simplest deploy; one `cdk deploy` | **496/500 resources.** Each new route/alarm/Lambda risks a failed deploy. Alarms were skipped for a year because of this. | Split into `AkwadonaCoreStack` (table, keys, Cognito), `AkwadonaApiStack` (Lambdas + routes), `AkwadonaMonitoringStack` (alarms, probes). Cross-stack refs via `cdk.Fn.importValue`. Highest-value refactor on the board. |
| 2 | **Per-row DEK** | Per-row rotation + fine-grained erasure | Listing N rows = N KMS calls cold. Sorted lists must load the whole tenant set. | Per-tenant DEK (one `GenerateDataKey` per tenant per container) with per-field IV. Needs a `_kms_v: 2` format and a backfill. Makes lists O(page). |
| 3 | **Encrypt `name` and `dob`** | They are PHI | Cannot sort/filter server-side; done in memory after decrypt (2026-10-29). Fine to ~10k rows/tenant. | Either (a) per-tenant DEK above, or (b) a deterministic `nameSortKey` = HMAC of the lower-cased first 3 chars (leaks only bucket membership) for server-side ordering. |
| 4 | **Pooled multi-tenancy, one table** | 100 hospitals ≠ 100 stacks; cheapest to run | Blast radius: a bug in a tenant filter is cross-tenant. Mitigated by the GSI key condition + 404 rule + probe. | Silo tier (own table + own Lambda set) is the premium offering; the code already resolves keys per tenant so it is mostly CDK. |
| 5 | **Copy, don't import, shared code** | No Layer resources, no runtime surprise | 16 copies to keep identical | A `scripts/sync-shared.ps1` that copies + verifies md5; a pre-commit check. |
| 6 | **Custom login, not Hosted UI** | Branding, i18n, RTL | App owns challenge flows | Done; MFA challenge already handled. |
| 7 | **WAF disabled** | ~$10/month | No managed-rule filtering at the edge; stage throttle is the stand-in | Re-enable when a third tenant signs. Two uncomments. |
| 8 | **MFA OPTIONAL** | Was OFF; REQUIRED would lock out un-enrolled users | Phishable passwords for Operator/Admin | Enrol every Operator/Admin, then flip `Mfa.REQUIRED`. Product decision. |
| 9 | **Probes run by hand** | No spare CFN resources for an EventBridge rule + Lambda | Sales claim "nightly" was false — now reworded | GitHub Actions cron on `run-safe.js` (zero AWS resources) **this week**; EventBridge after the stack split. |
| 10 | **No CSP (Content-Security-Policy) header** | PrimeNG/Tailwind inline styles need `'unsafe-inline'` for styles | XSS blast radius is larger than it could be | Custom `ResponseHeadersPolicy` (+1 CFN resource) with `default-src 'self'; connect-src <api> <cognito>; style-src 'self' 'unsafe-inline'`. After the split. |
| 11 | **Tokens in localStorage** | SPA with no cookie-setting backend | XSS = token theft (mitigated by no `innerHTML`, strict interceptor host list, 1 h expiry) | Move to httpOnly cookie via a tiny token-exchange Lambda — only if a CSP cannot be shipped. |
| 12 | **Secrets in env vars** | Nothing third-party yet | Fine today | Secrets Manager when the first external integration (lab, PACS) arrives. |

---

## 10. How to change things safely

Each is a checklist. Skipping a line is how the landmines in §1 go off.

**Add a Lambda**
1. Copy an existing folder of the same shape (read-only → `getPatientByID`; mutating → `createPatient`; module → `akwadona-pharmacy`).
2. Keep the handler spine (§8.2). `getTenant` → `throttle.precheck` → role gate if needed.
3. Copy `crypto.js` / `throttle.js` / `plan-defaults.js` from `_shared/`, never `require('../_shared')`.
4. In the CDK: `fn(...)` with `functionName: 'akwadona-<kebab>'`; add to `readOnlyFunctions` **or** `readWriteFunctions`; add routes with `route(...)` (each route = 1 resource — prefer a `{proxy+}` if the Lambda has >3 paths).
5. `cdk synth` and check the resource count: `python -c "import json;print(len(json.load(open('cdk.out/AkwadonaCdkStack.template.json'))['Resources']))"` must be ≤ 500.
6. Add a line to `scripts/security-tests/safe/02-unauthenticated.js` `ROUTES` and, if it has tenant data, to `destructive/10-cross-tenant-crud.js`.

**Add a field to PATIENT / DOCTOR**
1. Decide: plaintext, encrypted, or hashed (§6.2). PHI → encrypted (+ hashed only if you must look it up by equality).
2. Encrypted → add to `PATIENT_PHI_FIELDS` in `_shared/crypto.js` → copy to 16 folders. Hashed → add to `PATIENT_HASH_FIELDS` too.
3. Never reference an encrypted field in a `FilterExpression` or `KeyConditionExpression`. In `getAllPatients`, encrypted filters go in `applyEncryptedFilters`, plaintext in `buildPlaintextFilter`.
4. `normalizePatient()` in every list/get Lambda.
5. `docs/22-data-model.md` (when written) and the Angular model.

**Onboard a tenant**
1. Operator wizard (`docs/15`). It creates the two KMS keys (tagged), the TENANT row, the admin user.
2. Add the slug to `tenantSlugs[]` in the CDK (CORS) and to `callbackUrls`/`logoutUrls`; redeploy.
3. GoDaddy CNAME `<slug>` → `d37kqu4c91mlc4.cloudfront.net` (wildcard alias on CloudFront already covers it).
4. After the first successful week, add the new `tenantId` to `PROTECTED_TENANT_IDS` in the CDK so its keys can never be scheduled for deletion by the operator role.

**Add a GSI**
One per `cdk deploy`. DynamoDB refuses two in one update. Projection `KEYS_ONLY` unless you need attributes — each projected attribute is storage you pay for twice.

**Deploy**
`docs/18-deploy-and-operations.md`. Short version: `cdk synth` (type-check + resource count) → `cdk deploy` → Lambda-only changes via `update-function-code` → frontend `ng build` → `aws s3 sync` → CloudFront invalidation → run `scripts/security-tests/run-safe.js` → run `scripts/cross-tenant-probe.js` against a dev stack.

---

## 11. What changed on 2026-10-29 (audit + fix pass)

| Area | File(s) | Change |
|---|---|---|
| **Security** | `lib/akwadona-cdk-stack.ts` | Operator `kms:ScheduleKeyDeletion` scoped to `akwadona:tenantId`-tagged keys + explicit DENY on live tenants (was `*` with a never-executed guard) |
| Security | `lib/akwadona-cdk-stack.ts` | 14 read-only Lambdas → `grantReadData` + scoped `THROTTLE#*` UpdateItem (were read-write on the whole table) |
| Security | `lib/akwadona-cdk-stack.ts` | Cognito MFA `OFF` → `OPTIONAL` (TOTP) |
| Security | `lib/akwadona-cdk-stack.ts` | Documents bucket `S3_MANAGED` → KMS (data key) + access logging |
| Security | `lib/akwadona-cdk-stack.ts` | API Gateway `$default` stage throttle 200 r/s / 500 burst |
| Security | `lib/akwadona-cdk-stack.ts` | Default runtime `NODEJS_18_X` → `NODEJS_20_X` (27 Lambdas) |
| Security | 6 reference-data Lambdas (`createNewDepartment`, `bulkCreateDepartments`, `deleteAllDepartments`, `createNewSpecialization`, `bulkCreateSpecializations`, `deleteAllSpecializations`) | `requireAdminOrOperator()` gate — any JWT could previously wipe global reference data |
| Security | `admin-panel`, `operator-console`, `createDoctor`, `createPatient`, `getPatientByID`, `updatePatient`, `_shared/throttle.js` (+40 copies) | Removed `Access-Control-Allow-Origin: *` echoes |
| Security | `lib/akwadona-cdk-stack.ts` | Dead `d6i7iwknkj0bg.cloudfront.net` removed from CORS + Cognito callbacks; current domain + tenant subdomains added |
| **Bug** | `getAllPatients/index.js`, `getAllDoctors/index.js` | Name / DOB / email / search filters ran on ciphertext → never matched. Now post-decrypt in memory. |
| Bug | `cognito-pre-token-generation/index.js` (+ `crypto.js`) | Doctor lookup by plaintext email could not find any doctor created after encryption → no `doctorId` claim → empty patient list. Now HMAC lookup with legacy fallback; CDK grants `kms:GenerateMac`. |
| Bug | `_shared/throttle.js` (+40 copies) | Expiry written to `ttl` instead of `expiresAt` → counters never swept. Fixed; `scripts/purge-throttle-counters.js` clears the backlog. |
| **Performance** | `getAllPatients`, `getAllDoctors` | Sorted path + filtered count were full-table Scans → Queries on `tenant-entityType-index` |
| Performance | `cognito-pre-token-generation` | Two full-table Scans at login → two GSI Queries |
| Performance | `_shared/throttle.js`, `akwadona-operator-console` | TENANT lookups were full-table Scans → `EntityType-index` Query |
| Performance | `_shared/crypto.js` (+16 copies) | DEK cache (5 min / 2,000 entries) + 32-wide decrypt concurrency cap |
| Performance | `getAllPatients` | Doctor path reads `claims.doctorId` first (no lookup) |
| **Ops** | `lib/akwadona-cdk-stack.ts` | SNS topic `akwadona-alarms` + alarms `akwadona-api-5xx`, `akwadona-lambda-errors` (there were none) |
| **Tests** | `scripts/security-tests/` | New attack suite: 6 safe + 4 destructive files, runners, README |
| Tests | `scripts/cross-tenant-probe.js` | Stale API/client defaults replaced |
| **Docs** | `00`, `01`, `02`, `05a`, `05c`, `15`, `20`, `25`, `26`, `40`, `41`, `44`, `README`, `akwadona-multitenant-setup`, `backlog`, `test-plan-v2`, four skills | Dead IDs, false control claims (WAF live, 10 alarms, nightly probe, MFA required), Lambda count, TTL attribute, Cognito groups, stack name |

Deploy order and rollback for all of the above: `docs/18-deploy-and-operations.md` §10 (2026-10-29 change set).

---

## 12. References

- [`00-akwadona-explained.md`](00-akwadona-explained.md) — plain-English tour
- [`02-aws-services-reference.md`](02-aws-services-reference.md) — every AWS service, with status banners
- [`03-encryption-and-zero-knowledge.md`](03-encryption-and-zero-knowledge.md), [`04-hashed-search-fields.md`](04-hashed-search-fields.md)
- [`14-tenant-row-enforcement.md`](14-tenant-row-enforcement.md)
- [`18-deploy-and-operations.md`](18-deploy-and-operations.md), [`25-monitoring-and-observability.md`](25-monitoring-and-observability.md), [`26-incident-response.md`](26-incident-response.md)
- [`20-api-reference.md`](20-api-reference.md), [`19-ui-architecture.md`](19-ui-architecture.md)
- `../scripts/security-tests/README.md`
- `../skills/akwadona-code-standards/SKILL.md`, `../skills/akwadona-security-review/SKILL.md`, `../skills/akwadona-solution-architect/SKILL.md`

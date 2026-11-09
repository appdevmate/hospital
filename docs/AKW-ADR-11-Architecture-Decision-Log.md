# Akwadona Hospital Platform — Architecture Decision Log

| Document control | |
|---|---|
| **Document ID** | AKW-ADR-11 |
| **Document type** | Architecture Decision Records (ADR) + migration records + change log |
| **Version** | 1.1 |
| **Status** | Approved |
| **Classification** | Internal |
| **Owner** | Solution Architect |
| **Approver** | Founder / CTO |
| **Effective date** | 2026-10-30 |
| **Review cycle** | Append-only; a new ADR for every significant design choice |
| **Supersedes** | `archive/09-rename-runbook.md`, `archive/10-doctor-id-refactor.md`, `archive/11-customer-migration-guide.md`, `archive/CHANGELOG.md`, the decisions table formerly in `archive/45-system-design-for-developers.md` §9 |
| **Related documents** | AKW-SAD-02 §10 (summary table), AKW-RR-12 (the debts each decision left) |

| Revision history | | | |
|---|---|---|---|
| **Version** | **Date** | **Author** | **Change** |
| 1.0 | 2026-10-30 | Platform team | Consolidated into the enterprise document set |
| 1.1 | 2026-10-31 | Platform team | Added "This document answers" and "Abbreviations used in this document" blocks after document control |

## This document answers

1. Why is the system built the way it is — decision by decision, with what each choice cost?
2. Which decisions are being reconsidered, and what would replace them?
3. How were the big migrations done (the rename and rebuild, the doctor-identity refactor, importing a hospital's existing data)?
4. What changed, and when?

## Abbreviations used in this document

> **Why this table exists.** Every short form that appears anywhere in this document is listed here with (1) what the letters stand for and (2) what it means in plain words. If a term is not here and is not obvious, that is a documentation bug — add it. The complete glossary with examples and console links is AKW-SO-01 Appendix A.

| Abbreviation | Stands for | What it means |
|---|---|---|
| **ADR** | Architecture Decision Record | A short note that records one design decision: the situation, the choice made, and what it costs. Written once, never edited; a later record can replace it. |
| **AES** | Advanced Encryption Standard | The standard symmetric encryption algorithm. "AES-256" uses a 256-bit key. |
| **API** | Application Programming Interface | The set of URLs one program calls to use another program's features. Ours is a REST API. |
| **ARN** | Amazon Resource Name | The unique ID string of any AWS resource. |
| **AWS** | Amazon Web Services | Amazon's cloud-computing platform. Everything Akwadona runs on it. |
| **CDK** | Cloud Development Kit | AWS's tool for describing infrastructure in a programming language (we use TypeScript). It compiles to CloudFormation. |
| **CFN** | CloudFormation | AWS's service that builds and updates infrastructure from a text template. One "stack" = one template; a stack may hold at most 500 resources. |
| **CMK** | Customer Managed Key | A KMS encryption key that we create and control (as opposed to one AWS manages for us). |
| **CNAME** | Canonical Name record | A DNS record that says "this name is an alias of that name". |
| **CORS** | Cross-Origin Resource Sharing | The browser rule that decides which websites may call our API. We allow only our own domains. |
| **CSP** | Content Security Policy | A response header that limits where a page may load scripts and styles from, to reduce XSS risk. Planned. |
| **CSV** | Comma-Separated Values | A plain-text spreadsheet format. |
| **CTO** | Chief Technology Officer | The head of technology. |
| **DEK** | Data Encryption Key | The key that actually encrypts a row's fields. A fresh one per row. |
| **DNS** | Domain Name System | The internet's phone book — turns akwadona.com into a server address. Ours is in Route 53; GoDaddy only holds the registration. |
| **DOB** | Date of Birth | The date a person was born. |
| **EC2** | Elastic Compute Cloud | AWS virtual servers. We do not use them (serverless only). |
| **EMR** | Electronic Medical Record | The digital version of a patient's chart. Akwadona is an EMR. |
| **FHIR** | Fast Healthcare Interoperability Resources | The modern standard for exchanging health data between systems. On our roadmap. |
| **FTP** | File Transfer Protocol | An old way to move files between computers. |
| **GCM** | Galois/Counter Mode | A way of running AES that also detects tampering. We use AES-256-GCM. |
| **GSI** | Global Secondary Index | A second way to look up rows in a DynamoDB table, by a different attribute. We have nine. |
| **HIPAA** | Health Insurance Portability and Accountability Act | The US law that sets rules for protecting patients' health information. Its "Security Rule" lists the technical safeguards we must have. |
| **HL7** | Health Level Seven | An older family of healthcare data-exchange standards; FHIR is its latest generation. |
| **HMAC** | Hash-based Message Authentication Code | A fingerprint of a value computed with a secret key. Same value + same key = same fingerprint; different keys give different fingerprints. We use it to search encrypted fields. |
| **HTTPS** | HTTP Secure | HTTP wrapped in TLS encryption — the padlock. |
| **IAM** | Identity and Access Management | AWS's permission system: which user or service may do which action on which resource. |
| **IV** | Initialisation Vector | A random value mixed into each encryption so identical inputs produce different ciphertext. |
| **JSON** | JavaScript Object Notation | The text format our API uses for data. |
| **JWT** | JSON Web Token | A signed digital ID card the browser sends with every request. It names the user, their hospital, and their role. |
| **KMS** | Key Management Service | AWS's vault for encryption keys. Keys never leave it; it encrypts and decrypts on request. |
| **MFA** | Multi-Factor Authentication | Needing two proofs to sign in — a password plus a code from a phone app. |
| **OPS** | Operations | Running the system day to day: deploying, monitoring, backing up, recovering. |
| **PDPPL** | Personal Data Privacy Protection Law | Qatar's national privacy law (Law No. 13 of 2016). Qatar's equivalent of GDPR. |
| **PHI** | Protected Health Information | Any information that identifies a patient and relates to their health: name, ID number, diagnosis, medication, phone, date of birth. |
| **PK** | Partition Key | The main lookup key of a DynamoDB row — the "drawer". |
| **QID** | Qatari ID | The national identity number of a Qatar resident (11 digits). |
| **RR** | Risk Register | A list of every known risk with a score, an owner, and a plan. |
| **RTL** | Right-to-Left | Text direction for Arabic, Hebrew, Urdu. Our layout flips for these languages. |
| **S3** | Simple Storage Service | AWS file storage — a bucket holds files of any size. |
| **SAD** | Solution Architecture Document | The master technical design document: how the whole system is built, from infrastructure to data to security. |
| **SK** | Sort Key | The second part of a DynamoDB key — the "folder inside the drawer". |
| **SLA** | Service Level Agreement | A promise about service quality, usually uptime — e.g. "99.9 % per month". |
| **SNS** | Simple Notification Service | AWS's service for sending alerts (e-mail, SMS, to other services). |
| **SSE** | Server-Side Encryption | Encryption done by the storage service itself. "SSE-S3" uses an Amazon-managed key; "SSE-KMS" uses our own key. |
| **UI** | User Interface | The screens a person uses. |
| **URL** | Uniform Resource Locator | A web address. |
| **UUID** | Universally Unique Identifier | A random 36-character ID that will never collide. |
| **UX** | User Experience | How it feels to use the system. |
| **WAF** | Web Application Firewall | A filter in front of a website that blocks known-bad traffic. Ours is defined but currently switched off. |

**Format.** Each ADR: Context → Decision → Consequences → Status. ADRs are never edited after acceptance; a later ADR supersedes an earlier one. Part B holds the migration records (one-off runbooks that changed the system's shape). Part C is the change log.

---

## Part A — Architecture Decision Records

### ADR-001 — Pooled multi-tenancy on a single DynamoDB table
**Status:** Accepted (Step 2, 2026-06). **Context:** Serving many small hospitals cheaply; 100 hospitals cannot mean 100 stacks. **Decision:** One table `Hospital`, every row stamped `tenantId`, lists via `tenant-entityType-index`, cross-tenant reads return 404. **Consequences:** Lowest run cost; blast radius of a tenant-filter bug is cross-tenant — mitigated by the GSI key condition, the 404 rule, and the isolation probe. A silo tier (own table + Lambdas) remains the premium offering.

### ADR-002 — Per-tenant KMS keys with application-layer envelope encryption
**Status:** Accepted (Step 3). **Context:** "Can your staff read our patients?" must be answerable with *no, provably*. **Decision:** Each tenant gets a data CMK and an HMAC CMK; PHI fields are AES-256-GCM encrypted in the Lambda with a per-row DEK wrapped by the tenant CMK; the operator role carries an explicit IAM DENY on those keys. **Consequences:** Zero-knowledge is structural. Cost: DynamoDB cannot filter or sort on encrypted fields; per-row DEK makes list reads KMS-bound (see ADR-012).

### ADR-003 — HMAC-SHA256 via KMS for searchable encrypted fields
**Status:** Accepted (Step 4). **Context:** "Find patient by Qatari ID" stopped working once the field was encrypted with random IVs. **Decision:** Store an HMAC of the plaintext computed inside KMS with a per-tenant HMAC key (`qidHash`, `emailHash`, `phoneHash`); query `emailHash-EntityType-index`. **Consequences:** Deterministic per tenant, one-way, and unlinkable across tenants; uniqueness locks use the same hash so plaintext never appears in a key.

### ADR-004 — Serverless only (Lambda + DynamoDB + S3 + CloudFront)
**Status:** Accepted (inception). **Decision:** No EC2, no containers, no relational database. **Consequences:** No servers to patch; pay per request; scale to ~5,000 concurrent users per region without re-architecture. Cold starts (~400 ms at 512 MB) are the latency tax.

### ADR-005 — One CloudFormation stack
**Status:** Accepted (inception); **Superseded by ADR-013 (planned)**. **Decision:** Everything in `AkwadonaCdkStack`. **Consequences:** Simplest deploy. Hit the 500-resource ceiling (496 today): catch-all routes and one shared managed policy were needed; alarms were deferred for a year.

### ADR-006 — Shared Lambda code is copied, not layered or imported
**Status:** Accepted (Step 2g). **Context:** `require('../_shared')` fails at runtime because each Lambda zips one folder; Lambda Layers would each be a CFN resource. **Decision:** Copy `crypto.js`, `throttle.js`, `plan-defaults.js` into each folder; verify by hash. **Consequences:** 17 + 40 copies to keep identical (`scripts/sync-shared-helpers.js`); zero layer resources.

### ADR-007 — Custom Angular login instead of Cognito Hosted UI
**Status:** Accepted (Step 7). **Context:** Branding, six languages, RTL, tenant logo — none possible on the hosted page. **Decision:** The app calls `InitiateAuth` directly and handles `NEW_PASSWORD_REQUIRED` / `SOFTWARE_TOKEN_MFA` challenges itself. **Consequences:** Full UX control; the app owns the challenge state machine; `auth.akwadona.com` remains for token refresh.

### ADR-008 — Tenant and role identity come only from JWT claims injected by a pre-token Lambda
**Status:** Accepted (Step 2 / C.3). **Decision:** `tenantId`, `role`, `tenantSlug`, `doctorId` are stamped into both tokens at login; Lambdas never trust body or query values. **Consequences:** One authority; the pre-token Lambda is the one function with a hard 5-second budget and is kept warm.

### ADR-009 — Catch-all `{proxy+}` routes for high-churn modules
**Status:** Accepted (Step 2g.5 / Step 7). **Context:** Each route × method is a CFN resource. **Decision:** `/admin/{proxy+}` and `/operator/{proxy+}` dispatch inside one Lambda each. **Consequences:** Freed resources; the Lambda owns path parsing.

### ADR-010 — Application-level per-tenant rate limiting with DynamoDB counters
**Status:** Accepted (Step 2g). **Decision:** `throttle.js` increments per-minute and per-day counters (`THROTTLE#<tenant>`) against plan limits; 429 with `Retry-After`; `Akwadona/Throttle` metric. **Consequences:** Fair sharing between tenants; a flood still invokes Lambda — hence the 2026-10-29 API Gateway stage throttle in front.

### ADR-011 — Soft delete everywhere; hard delete operator-assisted
**Status:** Accepted. **Decision:** `deletedAt` marker; lists hide by default; restore is a PATCH. **Consequences:** HIPAA/PDPPL audit retention preserved; storage grows until a retention policy exists (R-15).

### ADR-012 — Per-row data-encryption keys (DEK)
**Status:** Accepted (Step 3); **under review**. **Context:** Per-row DEK gives per-row rotation and fine-grained erasure. **Decision:** One `GenerateDataKey` per row at write; wrapped DEK stored on the row. **Consequences:** Listing N rows costs N `kms:Decrypt` on a cold container. Mitigated 2026-10-29 by a DEK cache and a concurrency cap. **Proposed supersession:** per-tenant DEK with per-field IV (`_kms_v: 2`) — makes lists O(page); needs a backfill. Tracked as R-02.

### ADR-013 — Split the stack into Core / API / Monitoring (PLANNED)
**Status:** Proposed. **Context:** 496/500 resources blocks alarms, WAF re-enable, scheduled probes, CSP policy. **Decision (proposed):** `AkwadonaCoreStack` (table, keys, Cognito, buckets), `AkwadonaApiStack` (Lambdas, routes), `AkwadonaMonitoringStack` (alarms, EventBridge, WAF association) with `Fn.importValue` references. **Consequences:** Three deploys instead of one; unblocks every item in R-05/06/07/13.

### ADR-014 — Encrypted-field filtering and sorting happen after decryption, in memory
**Status:** Accepted (2026-10-29). **Context:** `contains(#name, :v)` on ciphertext never matched — name search and DOB filters were silently broken. **Decision:** Query the tenant GSI with plaintext predicates only; decrypt; filter and sort in memory; offset-paginate; 20,000-row safety ceiling. **Consequences:** Correct results; O(tenant rows) for sorted/searched lists until ADR-012 is superseded.

### ADR-015 — Least-privilege table access per Lambda
**Status:** Accepted (2026-10-29). **Decision:** Read-only Lambdas get `grantReadData` plus `UpdateItem` scoped to `THROTTLE#*`; mutating Lambdas get read/write. **Consequences:** A bug in a GET handler cannot delete rows; same CFN resource count.

### ADR-016 — Operator key-deletion rights scoped by tag and denied for live tenants
**Status:** Accepted (2026-10-29). **Context:** The protective DENY was behind a condition that never ran; the operator role could schedule deletion of any key. **Decision:** `ScheduleKeyDeletion` allowed only where `aws:ResourceTag/akwadona:tenantId` exists; explicit DENY for `PROTECTED_TENANT_IDS`. **Consequences:** Wizard rollback still works for a failed onboarding; live tenants and platform keys are unreachable.

---

## Part B — Migration records

### B.1 Tiryaq → Akwadona rename and full rebuild (2026-06-30)
#### Why

- The product is called **Akwadona**. The original infrastructure was named after the first hospital we built it for, **Tiryaq**.
- Customers, auditors, and AWS support all see resource names. Mixed names look unprofessional and confuse account boundaries.
- What huge SaaS does: rename early. Stripe migrated `/dev/payments` resources to `stripe-*` in their first year. Vercel did the same when they renamed from Zeit.

#### Scope — what changes, what stays

| Category | Action | Reason |
|---|---|---|
| **30 Lambda functions** | rename `tiryaq-*` → `akwadona-*` | Customer-visible in CloudWatch logs, billing. |
| **CDK stack** | rename `AkwadonaCdkStack` → `AkwadonaCdkStack` | Affects ALL nested resource logical IDs. |
| **S3 buckets** | rename `akwadona-documents-*` → `akwadona-documents-*` | Bucket names are global; renaming = create new + copy + delete. |
| **API Gateway** | rename `akwadona-api` → `akwadona-api` | Internal label only; URL stays (`a2s6jk35d9.execute-api.…`). |
| **Cognito User Pool** | rename label `akwadona-user-pool` → `akwadona-user-pool` | Pool ID `us-east-1_KkINt5vOF` is **immutable** — only the display name changes. |
| **CloudFront distribution** | tag `akwadona-frontend` | ID `E1YOKWKHQNSPQW` stays. |
| **IAM roles** | renamed automatically by stack rename | CloudFormation gives them new names. |
| **CloudWatch log groups** | renamed automatically when Lambda renames | New logs go to `/aws/lambda/akwadona-*`. |
| **KMS key aliases** | `alias/tiryaq-tenant-…` → `alias/akwadona-tenant-…` | Key UUIDs stay — only friendly aliases rename. |
| **DynamoDB table** | **STAYS** `Hospital` | Renaming = full data migration. Massive risk, zero value. |
| **KMS key UUIDs** | **STAY** | Same reason as DynamoDB. Customer data is encrypted with these specific UUIDs. |
| **Cognito User IDs / groups** | **STAY** | Same pool, same users, same groups. |
| **Repo folder `tiryaq-cdk/`** | optionally rename to `akwadona-cdk/` | Pure cosmetic; do in a separate git commit. |

#### Critical risks

##### Risk 1 — Lambda rename causes brief downtime

- CloudFormation deletes the old Lambda and creates a new one in one operation. In-flight requests during the swap get a 5xx error.
- **Mitigation — Blue-green cutover (the professional pattern):**
  1. Add the new `akwadona-*` Lambda alongside the existing `tiryaq-*` Lambda. Both exist, both work.
  2. Repoint API Gateway routes to the new Lambda.
  3. Wait 24 hours (soak period) — confirm no errors.
  4. Delete the old `tiryaq-*` Lambda.
- This adds ~6 days total (deploy → 1 day soak per stage) but causes **zero downtime**.

##### Risk 2 — S3 bucket rename = full re-upload

- S3 bucket names are immutable. To rename, you create a new bucket and copy every object.
- For the **documents bucket** (`akwadona-documents-…`): tenants' uploaded files. Hundreds of MB → GB. Use `aws s3 sync` (resumable, parallel).
- For the **frontend bucket** (`tiryaqcdkstack-tiryaqfrontendbucket…`): just static assets, easy to rebuild from `npm run build`.
- **Mitigation:** new bucket up, copy data, repoint Lambdas, delete old bucket after soak.

##### Risk 3 — CDK stack rename = ALL CloudFormation resources recreated

- This is the BIG one. CloudFormation tracks resources by `<StackName>-<LogicalID>-<random>`. Rename the stack and every single resource gets a new physical ID.
- For Lambdas: that's the same as risk 1 × 30.
- **Mitigation — phased migration:**
  - **Phase A** (this runbook 8.2–8.4): Rename the LAMBDAS while keeping stack name = `AkwadonaCdkStack`. Use CDK's `functionName` override.
  - **Phase B** (later, optional): Rename the STACK. Requires either a full teardown + rebuild OR a CloudFormation import — both invasive. Defer until v2 platform refresh.

##### Risk 4 — DynamoDB table name is hardcoded everywhere

- Every Lambda has `const TABLE_NAME = 'Hospital';`.
- We are **not** renaming the table — so no code change needed for this part.
- Future: move to `process.env.TABLE_NAME` (env-driven) so the table name isn't baked in.

#### Cutover sequence (the actual plan)

##### Phase A — Lambdas only (this runbook covers 8.2 → 8.4)

| Step | Action | Downtime | Rollback |
|---|---|---|---|
| 8.2 | Add new `akwadona-*` Lambdas alongside the `tiryaq-*` ones. Same code, same env, new name. Deploy via CDK. | None | Just delete the new ones. |
| 8.3a | Update CDK so API Gateway routes point to the new `akwadona-*` Lambdas. Deploy. | None (API Gateway routes update atomically). | Edit CDK back, redeploy. |
| 8.3b | Soak period — 24 hours. Watch CloudWatch error rate. | None | Same as 8.3a. |
| 8.4 | Remove the old `tiryaq-*` Lambdas from CDK. Deploy. | None — they get no more invocations. | Restore from git history, redeploy. |

##### Phase B — Stack, buckets, API name (deferred to a v2 refresh)

- Stack rename requires either:
  - **Teardown + rebuild** (controlled downtime window, ~30 min) — only realistic on a Sunday at 2 AM with comms to all hospitals.
  - **CloudFormation Import** (zero downtime but multi-day operation requiring AWS support coordination).
- **Recommendation: defer Phase B** until the next major version of the platform when we'd be doing a major change anyway.

#### What customers see during Phase A

- **Tenant users (doctors at Tiryaq / Alshifaa):** **Nothing.** The URL stays the same. The login flow stays the same. Lambdas are renamed but routing is updated atomically.
- **You (operator):** CloudWatch shows two parallel sets of Lambdas during the soak window. Then the old ones disappear.

#### Rollback plan

If after 8.3 we see elevated error rates:

1. Edit `akwadona-cdk-stack.ts` to point routes back to the old Lambdas.
2. `npx cdk deploy --require-approval never`.
3. Investigate the failure in CloudWatch.
4. Re-attempt after fix.

The old Lambdas stay alive until 8.4 specifically so rollback is one CDK deploy away.

#### Naming map

Auto-generated from a `tiryaq-` → `akwadona-` rule. Exceptions noted.

| Old name | New name |
|---|---|
| `akwadona-pharmacy` | `akwadona-pharmacy` |
| `akwadona-bloodbank` | `akwadona-bloodbank` |
| `akwadona-appointments` | `akwadona-appointments` |
| `akwadona-examinations` | `akwadona-examinations` |
| `akwadona-calendar` | `akwadona-calendar` |
| `akwadona-document-manager` | `akwadona-document-manager` |
| `akwadona-scribe` | `akwadona-scribe` |
| `akwadona-admin-panel` | `akwadona-admin-panel` |
| `akwadona-audit` | `akwadona-audit` |
| `akwadona-operator-console` | `akwadona-operator-console` |
| `getAllPatients`, `createDoctor`, … (camelCase) | unchanged at this phase — camelCase names don't carry the "tiryaq" prefix |
| `akwadona-documents-483176634665-us-east-1` (S3) | stays for now (Phase B) |
| `akwadona-user-pool` (Cognito display name) | `akwadona-user-pool` (display label only) |
| `akwadona-api` (API Gateway display) | `akwadona-api` |

**Decision: only rename the 10 Lambdas with the `tiryaq-` prefix.** The camelCase ones (`getAllPatients` etc.) don't carry the brand — leave them alone to minimize blast radius.

#### Done criteria

Phase A is complete when:

- ✅ 10 new `akwadona-*` Lambdas exist and serve all API routes.
- ✅ Old `tiryaq-*` Lambdas are deleted.
- ✅ 24 h of CloudWatch logs show zero unexpected 5xx errors.
- ✅ Operator console + tenant apps still work end-to-end.

Phase B is deferred to a future task with its own runbook.

### B.2 Doctor identity refactor — e-mail foreign key → `doctorId` UUID claim
#### Why we are doing this

- Today, doctors are referenced in several places by their **email address**. If a doctor changes email (marriage, typo at signup, job change), every row that links to the old email becomes orphaned.
- What huge SaaS does: **email is a mutable attribute, never a primary or foreign key.** Stripe uses `cus_xxx` IDs everywhere. Vercel uses `usr_xxx` IDs. GitHub uses immutable user IDs. Email is only ever used for display + search.
- We already have an immutable application UUID for each doctor (`doctorId`), created at signup time. We just need to USE it consistently instead of email.

#### What we are changing (and what we are NOT)

| Area | Today | After refactor | Reason |
|---|---|---|---|
| Doctor profile rows | `PK = DOCTOR#<doctorId>` | unchanged | Already correct. |
| Doctor-Patient link rows | `PK = DOCTOR#<email>` | `PK = DOCTOR#<doctorId>` | Email is mutable; UUID is forever. |
| Appointment rows | field `doctorEmail` | field `doctorId` | Same reason. |
| Examination rows | field `doctorEmail` | field `doctorId` | Same reason. |
| `getAllPatients` doctor-scoped query | `DOCTOR#<email>` | `DOCTOR#<doctorId>` | Same reason. |
| Patient HMAC email index (`emailHash`) | HMAC of email | unchanged | This is for "search patients by email" — looking up, not identifying. Stays. |
| Audit log `actorEmail` | email string | unchanged | HIPAA requires audit logs to be UNCHANGED for 6 years. We add a new audit row when email changes, but old rows keep the historical email. |
| Cognito user attribute `email` | the user's email | the user's email | Cognito IS the source of truth for an email address. We mirror it onto the doctor profile row in DynamoDB. |
| Cognito immutable `sub` | available but rarely used | stored on each doctor profile when the doctor is also a Cognito user | Lets us connect Cognito-tied doctors back to their app records. |

#### The new identity model in one paragraph

Every doctor has an immutable **`doctorId` (UUID)** generated at create time. That's the foreign key used everywhere inside Akwadona — appointments, examinations, doctor-patient links, etc. If the doctor is also a Cognito user, their Cognito **`sub` (UUID)** is stored as a field on the doctor profile so we can map JWT → doctor record. **Email is just an attribute** — display label, login identifier, search target — never a key.

This matches what Stripe, Vercel, GitHub, Salesforce, and Athenahealth do.

#### Migration plan

There is almost no production data yet (per Sami), so the migration is small. The plan still handles all real cases:

##### Phase C.2.a — Map old → new for every doctor

1. Scan `Hospital` table for rows where `PK` starts with `DOCTOR#` and `SK = PROFILE`. Each row has `doctorId` (UUID-based PK) and a `email` field.
2. Build a map: `email → doctorId` for every doctor.

##### Phase C.2.b — Rewrite the doctor-patient link rows

1. Scan rows where `PK` starts with `DOCTOR#` and `SK` starts with `PATIENT#`.
2. For each row whose PK is `DOCTOR#<email>` (recognisable because it does NOT start with `DOCTOR#<UUID-format>`):
   - Look up the `doctorId` for that email.
   - Write a NEW row at `PK = DOCTOR#<doctorId>`, same SK + attributes.
   - Delete the OLD row.
3. If a row's PK already starts with a UUID, leave it alone.

##### Phase C.2.c — Rewrite appointment + examination foreign keys

1. Scan rows where `EntityType IN ('APPOINTMENT', 'EXAMINATION')`.
2. For each row that has a `doctorEmail` field (and no `doctorId` field yet):
   - Look up the `doctorId` for that email.
   - Add `doctorId` to the row. Keep `doctorEmail` for one release cycle as a back-compat field.
3. After Step C.3 (code update), drop the `doctorEmail` field from new writes; old rows are read-only with both fields.

##### Phase C.2.d — Verification

- Re-scan to confirm zero rows with `PK = DOCTOR#<email>` (only `DOCTOR#<UUID>` remain).
- Re-scan to confirm every appointment + examination has a `doctorId`.

#### Code change list (Phase C.3)

| Lambda | What changes |
|---|---|
| `akwadona-get-all-patients` | Doctor path: query by `DOCTOR#<doctorId>` (resolved from JWT). |
| `akwadona-create-patient` | Doctor-Patient link row: PK = `DOCTOR#<doctorId>`. |
| `akwadona-appointments` | Write `doctorId` field instead of `doctorEmail`. Reads use `doctorId`. |
| `akwadona-examinations` | Same as appointments. |
| `akwadona-admin-panel` | New `PATCH /admin/users/{userId}/email` endpoint (Step C.5). |
| (All others) | No change. |

#### Frontend change list (Phase C.4)

- `appointments.service.ts` — send `doctorId` not `doctorEmail` when creating appointments.
- `consultation.service.ts` — same.
- `appointment` UI / `consultation` UI — pass `doctorId` from the doctor list rather than email.
- Doctor profile view stays unchanged (still shows email as a display field).

#### Change-Email endpoint (Phase C.5) — what it does after the refactor

Now trivial because no row references email as a key:

1. **Auth check** — only Admin can change emails for users in their own tenant.
2. **Update Cognito** — `AdminUpdateUserAttributes` with new email + `email_verified=true` (admin-confirmed).
3. **Update DynamoDB** — `UPDATE` the doctor profile row's `email` field.
4. **Update `emailHash`** — HMAC the new email with the tenant's HMAC key, write to the search index.
5. **Audit row** — `OPERATOR_CHANGE_USER_EMAIL` with encrypted `before` and `after`.
6. Cognito sends a verification email to the new address by default (configurable).

#### Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Some doctor rows have no `doctorId` field at all (legacy) | Low | The migration script must skip them OR generate a new ID — log + alert. |
| Cognito sub vs doctor profile mismatch (doctor exists in Cognito but not in profile rows) | Low | Add a reconciliation report in operator console (future). |
| Appointment / examination rows have `doctorEmail` but no matching doctor profile | Low | Migration script reports orphans; manual cleanup. |
| Frontend uses `doctorEmail` heavily in components | Medium | Phase C.4 does a sweep; build will fail if any caller still passes wrong field. |

#### Acceptance criteria

- ✅ Zero DynamoDB rows with `PK` matching `DOCTOR#<anything-not-UUID>`.
- ✅ Every appointment + examination row has a `doctorId` field.
- ✅ Change-Email endpoint changes a doctor's email end-to-end with one POST, no other rows touched (except the audit row).
- ✅ Sign in as a doctor whose email was recently changed → still see only their own patients.

#### Order of operations (deploy sequence)

1. **C.2** — Migrate data (idempotent script; safe to re-run).
2. **C.3** — Deploy backend updates. Backend now accepts BOTH `doctorEmail` and `doctorId` for one release (back-compat).
3. **C.4** — Deploy frontend updates. Frontend now sends `doctorId` only.
4. After 7 days — remove back-compat `doctorEmail` read paths in backend.
5. **C.5** — Ship change-email endpoint.

### B.3 Customer data migration guide (importing an existing hospital's records)
How a brand-new hospital (let's call them "City Hospital") brings their existing patient + doctor + appointment data into Akwadona. The same path used by Athenahealth, Epic on AWS, and Cerner's cloud onboarding kits.

#### When this is needed

- A hospital signs up that already has records in another system (paper, Excel, an old EMR, a competitor SaaS).
- Without migration, they'd have to retype everything by hand. With migration, they upload a CSV, we import it once, they're live.

#### What this guide covers

- Operator side (you): provision the tenant, run the import script, hand back a report.
- Customer side (the hospital): fill the templates, upload securely.

#### High-level flow (5 steps)

1. **Operator provisions tenant.** Slug + per-tenant KMS data key + HMAC key + Cognito users for admin / doctors. ~30 minutes.
2. **Customer downloads templates.** Three CSVs: patients, doctors, appointments. Plain English column headers.
3. **Customer fills + uploads.** They upload to a one-time signed S3 URL we email them. No FTP, no email attachments.
4. **Operator runs the import script.** `scripts/import-tenant-data.js <slug> <s3-key>`. PHI is encrypted with the tenant's KMS key before the first DynamoDB write. Search fields (email, QID, phone) are HMAC'd.
5. **Operator emails a report.** Imported counts + any rows that failed validation. Customer signs off → migration done.

#### Step 1 — Operator provisions the tenant

What huge SaaS does: Athenahealth has a 1-day "tenant provisioning" SLA. We're at ~30 minutes of manual work today.

1. AWS Console → KMS → create two new symmetric keys: one for data encryption, one for HMAC. Tag them `tenant=<slug>`.
2. Update `akwadona-cdk/lib/akwadona-cdk-stack.ts`:
   - Add the new tenant ID + KMS ARN to `tenantKeys`.
   - Add the new tenant ID + HMAC ARN to `tenantHmacKeys`.
3. Run `scripts/seed-tenants.ps1` (or extend it to take a new slug as parameter).
4. AWS Console → Cognito → User Pool → create admin user with `custom:tenantId` = `T_xxxxx`. Add to `Admin` Cognito group.
5. CloudFront alternate domain: register `<slug>.akwadona.com` and the Route 53 wildcard CNAME already covers it (no DNS change).
6. `npx cdk deploy --require-approval never`.

#### Step 2 — Customer downloads templates

Templates live at `scripts/migration-templates/`:

- `patients.csv` — one row per patient.
- `doctors.csv` — one row per doctor.
- `appointments.csv` — one row per existing appointment (future or recent past).

Each template has column headers in plain English (no codes, no jargon) and a comment line explaining the format.

#### Step 3 — Customer uploads via signed S3 URL

We generate a one-time, time-limited signed URL with `aws s3 presign`:

```powershell
aws s3 presign s3://akwadona-migration-uploads/<slug>/patients.csv --expires-in 3600
```

We email that URL to the customer. They use it once to upload (no AWS account, no FTP). URL expires in 1 hour.

The customer can re-request if they need more time.

#### Step 4 — Operator runs the import

```powershell
cd "C:\Users\Sami Toufic Taha\Desktop\aws apps\hospital"
node scripts/import-tenant-data.js <slug> patients   --apply
node scripts/import-tenant-data.js <slug> doctors    --apply
node scripts/import-tenant-data.js <slug> appointments --apply
```

What the script does for each row (in order):
1. Validate required fields. Skip + log row to error list if invalid.
2. For PHI fields (name, DOB, address, diagnosis, notes): encrypt with the tenant's KMS data key (envelope encryption — Step 3 pattern).
3. For searchable fields (email, QID, phone): HMAC with the tenant's KMS HMAC key (Step 4 pattern).
4. Write the row to DynamoDB with the right `PK`, `SK`, `EntityType`, `tenantId`.
5. For doctors: also create a Cognito user invitation (optional, can be deferred).
6. Print progress every 100 rows.

Run without `--apply` first for a dry-run that validates the CSV and reports issues without writing anything.

#### Step 5 — Operator emails the report

The script writes `migration-report-<slug>-<timestamp>.json`:

```json
{
  "tenant": "city-hospital",
  "tenantId": "T_abcdef12",
  "startedAt": "2026-07-01T10:00:00Z",
  "finishedAt": "2026-07-01T10:08:43Z",
  "patients":     { "imported": 4287, "skipped": 12 },
  "doctors":      { "imported":   65, "skipped":  0 },
  "appointments": { "imported": 1903, "skipped":  4 },
  "errors": [
    { "file": "patients.csv", "row": 91,   "error": "missing required field: dateOfBirth" },
    { "file": "patients.csv", "row": 1108, "error": "invalid email format: ahmed@@gmail.com" }
  ]
}
```

Email this to the customer's admin. They fix any error rows in the source CSV → we re-run only the failed rows.

#### Security guarantees during migration

- **In transit:** customer uploads via HTTPS (S3 signed URL). No FTP, no email attachments.
- **At rest in S3:** the upload bucket has SSE-KMS encryption with `akwadona-migration-key`. Only the import Lambda can read.
- **After import:** the source CSV in S3 is deleted by the script after a successful run. Optional: we can keep it 30 days as customer evidence.
- **At rest in DynamoDB:** PHI is envelope-encrypted with the tenant's KMS data key. Search fields are HMAC'd with the tenant's HMAC key.
- **Audit:** every imported row writes a `MIGRATION_IMPORT` audit row with the actor (operator email) and the source row number. HIPAA-compliant.
- **What we (Akwadona staff) can see during the import:** the CSV row text (briefly, in Lambda memory) only. After the row is encrypted + written, we can no longer read it.

#### Customer Q&A

| Question | Answer |
|---|---|
| What format? | CSV (Excel can export to it). FHIR / HL7 JSON support — future. |
| Where do I upload? | The signed S3 URL we email you. One-click upload, no AWS account needed. |
| What about photos / scans? | After migration of records, you upload documents through the normal Documents page in the app. |
| Can we test first? | Yes — we run a dry-run that validates everything and gives you a report. No data is written until you say go. |
| How long does it take? | A few minutes per 10,000 rows (DynamoDB write throughput is the limit). 100k patients ≈ 30 min. |
| What if a row fails? | The report tells you exactly which row + why. Fix in the source CSV, we re-run only that row. |
| Can we cancel? | Until we run `--apply`, nothing has been written. After: we can soft-delete imported rows up to 24 h later. |

#### Template — `patients.csv`

```csv
patientId,name,dateOfBirth,gender,qid,email,phone,address,emergencyContact,emergencyPhone,insurance,bloodType,allergies,chronicConditions
P-001,Ahmed Al-Khalifa,1985-03-15,male,28503151234567,ahmed@example.com,+97455123456,"Doha, Al Sadd",Fatima Al-Khalifa,+97455123457,Hamad,O+,Penicillin,Diabetes II
```

Notes:
- `patientId` is your internal ID — we keep it as `legacyPatientId` for reference but generate a new Akwadona `PK`.
- `dateOfBirth` format: `YYYY-MM-DD`.
- `gender`: `male`, `female`, `other`.
- `qid` (Qatar ID): 11 digits.
- `allergies` + `chronicConditions`: comma-separated within the cell (quote the cell).

#### Template — `doctors.csv`

```csv
legacyDoctorId,name,email,phone,specialization,department,licenseNumber
D-001,Dr Layla Hassan,layla.hassan@example.com,+97455999111,Cardiology,Cardiology,QA-12345
```

Notes:
- `email` becomes the Cognito username (we send them an invite email).
- `specialization` + `department` must match values that already exist in the tenant's lookup tables. If not, the script logs them as "new" and you confirm before creating.

#### Template — `appointments.csv`

```csv
legacyAppointmentId,legacyPatientId,legacyDoctorId,date,startTime,endTime,visitType,priority,status,notes
A-001,P-001,D-001,2026-07-10,09:00,09:30,scheduled,routine,scheduled,"Follow-up for diabetes review"
```

Notes:
- We resolve `legacyPatientId` and `legacyDoctorId` to the Akwadona UUIDs via the lookup the script builds during the patient + doctor imports.
- `date` format: `YYYY-MM-DD`. Times: `HH:mm` (24 h).
- `visitType`: `walk-in` / `scheduled` / `emergency` / `referral` / `follow-up` / `check-up`.
- `priority`: `routine` / `urgent` / `emergency`.

#### What huge SaaS does (precedent)

- **Athenahealth:** offers a self-service CSV import + a paid "white-glove" migration service for hospitals with >100k records.
- **Epic on AWS:** has a dedicated migration team for every new hospital — they accept CSV, HL7, FHIR, or direct database access. Pricing: separate line item on the contract.
- **Cerner Cloud:** uses a standardized FHIR-based migration protocol they call "Cerner Bridge".
- **Stripe Connect** (different vertical, same pattern): customers upload CSV → import Lambda creates Stripe accounts + records → email confirmation.

Akwadona's path matches the standard: CSV first, FHIR / HL7 later when a customer needs it.

#### Done criteria

Migration is complete when:
1. Every row from the customer's CSVs is either imported or in the error list.
2. The customer signs off on the report.
3. The audit log contains a `MIGRATION_COMPLETE` row for the tenant.
4. Customer logs in to Akwadona and sees their data.

---

## Part C — Change log

**Implemented New Features and Enhancements:**
- Upgrade to PrimeNG 19
- Upgrade to Angular 19

## 17.0.0
**Implemented New Features and Enhancements:**
- Upgrade to PrimeNG 17
- Upgrade to Angular 17

### 16.0.0
**Implemented New Features and Enhancements:**
- Update themes
- Upgrade to PrimeNG 16
- Upgrade to Angular 16

## 15.1.0

- General style adjustments

**Implemented New Features and Enhancements:**
- New SlimPlus menu
- Slim & SlimPlus menu scroll

## 15.0.1
**Fixed bugs:**
- Fixed an issue where checkbox does not reflect the actual value of task list in kanban sidebar.

### 15.0.0
**Migration Guide**
- Upgrade to PrimeNG 15
- Upgrade to Angular 15

**Implemented New Features and Enhancements:**
- Update to PrimeNG 15
- Update to Angular 15

### 14.0.1
**Fixed bugs:**
- Fixed a bug causes menu malfunction in menu service.

### 14.0.0
**Migration Guide**
- Upgrade to PrimeNG 14
- Upgrade to Angular 14

**Implemented New Features and Enhancements:**
- Update to PrimeNG 14
- Update to Angular 14
- Add primary color variable to theme variables.

### 13.1.0
- Update your project to PrimeNG 13.1.0
- Update your project to PrimeFlex 3.1.2

**Implemented New Features and Enhancements:**
- Update for demo components.
### 13.0.0
**Migration Guide**
- Update your project to Angular 13.
- Update theme files and layout files.

**Implemented New Features and Enhancements:**

- Upgrade to Angular and PrimeNG 13

### 12.2.0
**Migration Guide**
- Update theme files and layout files.

**Implemented New Features and Enhancements:**

- Styles of new PrimeNG components

### 12.1.0

**Migration Guide**
- Update app files(app.menuitem.component.ts etc..).
- Update theme files and layout files.

**Implemented New Features and Enhancements:**

- New Design for Menu, Topbar and Config
- New Design for Template Pages (Error, Login, Not Found, Access Denied)
- Implementation of Dark and Light Modes

### 12.0.0
**Migration Guide**
- Update your project to Angular 12.
- Update app.menuitem.component.ts
- Update theme files and layout files.

**Implemented New Features and Enhancements:**

- Upgrade to Angular and PrimeNG 12
- Styles of new PrimeNG components

### 11.0.0
**Migration Guide**
- Update your project to Angular 11.
- Update app.main.component.ts, app.layout.component.html and app.component.ts
- Update app.menuitem.component.ts.
- Update theme files and layout files.

**Implemented New Features and Enhancements:**

- Upgrade to Angular and PrimeNG 11
- Styles of new PrimeNG components

### 10.0.0
**Migration Guide**
- Update your project to Angular 10.
- Update theme files and layout files.

**Implemented New Features and Enhancements:**

- Upgrade to Angular and PrimeNG 10
- Migrate to PrimeOne Design Architecture

##### 8.0.0 to 9.0.0
Angular 9 and PrimeNG 9
- Update dependencies with <a href="https://angular.io/cli/update">ng update</a>.
- Update theme.css and layout.css files.
- Update app.menu.component.ts and app.menu.component.html while retaining your MenuModel.
- Include app.menuitem.component.ts under app folder and define it app.module.ts with declarations property.
- Include app.menu.service.ts under app folder and define it app.module.ts with providers property.

##### 7.0.0 to 8.0.0
- Update your project to Angular 8 with ng update. View the official update guide -<a href="https://update.angular.io/">https://update.angular.io/</a>- for more information.
- Update app.menu.component.ts.
- Update layout css files.
- Update theme css files.

##### 6.1.0 to 7.0.0
- Update layout css files.
- Update theme css files.

##### 6.0.0 to 6.1.0
Adds support for new features in PrimeNG 6.1.x
- Update theme css files.
- Update layout css files.

##### 5.2.1 to 6.0.0
Brings support for Angular 6 and RxJS 6, adds theming for new components in PrimeNG such as the new TreeTable
and improves behaviors of the layout menus.
- Add PrimeIcons package.
- Update app.module.ts.
- Update app.component.ts.
- Update layout css files.
- Update theme css files.

##### 5.2.0 to 5.2.1
- Update app.component.ts.
- Update app.menu.component.ts and app.menu.component.html.
- Update app.topbar.component.ts.
- Update layout css files.
- Update theme css files.

##### 5.0.0 to 5.2.0
Adds support for PrimeNG 5.2.0 (e.g. TurboTable), replaces nanoscroller with PrimeNG ScrollPanel
- Remove nanoscroller as it is replaced by ScrollPanel component of PrimeNG.
- Update app.menu.component.ts and app.menu.component.html.
- Update layout css files.
- Update theme css files.

##### 1.0.0 to 5.0.0
- Update theme css files.
- Includes version updates to PrimeNG 5 and Angular 5.

### 2026-10-29 — Security, correctness, and performance change set (undeployed at time of writing)
Full table in AKW-SAD-02 §4.1 note and AKW-OPS-08 §3a. Summary: KMS-deletion guard (ADR-016); least-privilege IAM (ADR-015); MFA OPTIONAL; documents bucket KMS; API stage throttle; Node 20; two alarms + SNS; six authorization gates on reference data; no-Scan rewrites (patients, doctors, pre-token, throttle, operator); post-decrypt filtering (ADR-014); DEK cache; `ttl`→`expiresAt`; CORS cleanup; attack-test suite.

### 2026-10-30 — Documentation consolidation
42 files → 14 enterprise documents with document control (this set). Originals preserved in `docs/archive/`.

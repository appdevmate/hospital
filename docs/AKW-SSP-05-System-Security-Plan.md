# Akwadona Hospital Platform — System Security Plan (SSP)

| Document control | |
|---|---|
| **Document ID** | AKW-SSP-05 |
| **Document type** | System Security Plan — NIST SP 800-18 structure; control families aligned to NIST SP 800-53 / HIPAA Security Rule |
| **Version** | 1.1 |
| **Status** | Approved |
| **Classification** | Confidential — Internal; auditor copy on request |
| **Owner** | Security Officer |
| **Approver** | Founder / CTO |
| **Effective date** | 2026-10-30 |
| **Review cycle** | Quarterly, and on any change to IAM, KMS, Cognito, CORS, or encryption code |
| **Supersedes** | `archive/03-encryption-and-zero-knowledge.md`, `archive/04-hashed-search-fields.md`, `archive/14-tenant-row-enforcement.md`, `scripts/security-tests/README.md` (content kept there too) |
| **Related documents** | AKW-SAD-02 §6 (architecture view), AKW-CCM-06 (regulatory mapping), AKW-IRP-09 (incident response), AKW-OPS-08 (operations) |

| Revision history | | | |
|---|---|---|---|
| **Version** | **Date** | **Author** | **Change** |
| 1.0 | 2026-10-30 | Platform team | Consolidated into the enterprise document set; identifiers and control statements verified against the 2026-10-29 code |
| 1.1 | 2026-10-31 | Platform team | Added "This document answers" and "Abbreviations used in this document" blocks after document control |

## This document answers

1. What is inside the security boundary and what is outside?
2. What security controls exist, family by family, how is each implemented, and is it fully in place, partial, or planned?
3. How does encryption at rest, encryption in transit, searchable encryption, and tenant isolation actually work?
4. What threats were considered, and what stops each one?
5. What attack tests exist, what does each prove, and how are they run?
6. What are the known security gaps, who owns each, and by when will it be closed?

## Abbreviations used in this document

> **Why this table exists.** Every short form that appears anywhere in this document is listed here with (1) what the letters stand for and (2) what it means in plain words. If a term is not here and is not obvious, that is a documentation bug — add it. The complete glossary with examples and console links is AKW-SO-01 Appendix A.

| Abbreviation | Stands for | What it means |
|---|---|---|
| **AES** | Advanced Encryption Standard | The standard symmetric encryption algorithm. "AES-256" uses a 256-bit key. |
| **API** | Application Programming Interface | The set of URLs one program calls to use another program's features. Ours is a REST API. |
| **ARN** | Amazon Resource Name | The unique ID string of any AWS resource. |
| **AWS** | Amazon Web Services | Amazon's cloud-computing platform. Everything Akwadona runs on it. |
| **AZ** | Availability Zone | One independent data centre inside an AWS region. A region has several, so one failing does not take the service down. |
| **BAA** | Business Associate Agreement | A contract required by the US health-privacy law HIPAA between a hospital and any company (like Akwadona) that handles patient data for it. It says how the data will be protected. |
| **BYOK** | Bring Your Own Key | Letting a customer supply their own encryption key. Related to our per-hospital keys. |
| **CCM** | Compliance Controls Matrix | A table that maps each rule in a law or standard to the specific thing we do to satisfy it, and the evidence an auditor can check. |
| **CDK** | Cloud Development Kit | AWS's tool for describing infrastructure in a programming language (we use TypeScript). It compiles to CloudFormation. |
| **CLI** | Command-Line Interface | A text-based tool run from a terminal, e.g. the AWS CLI. |
| **CMK** | Customer Managed Key | A KMS encryption key that we create and control (as opposed to one AWS manages for us). |
| **CMM** | Caching Cryptographic Materials Manager | A component of the AWS Encryption SDK that caches data keys — the model our DEK cache follows. |
| **CORS** | Cross-Origin Resource Sharing | The browser rule that decides which websites may call our API. We allow only our own domains. |
| **CSE** | Client-Side Encryption | Encryption done by our code before the data reaches the storage service. Our PHI fields use this. |
| **CSP** | Content Security Policy | A response header that limits where a page may load scripts and styles from, to reduce XSS risk. Planned. |
| **CTO** | Chief Technology Officer | The head of technology. |
| **DDB** | DynamoDB | Short form of DynamoDB, AWS's NoSQL database. |
| **DEK** | Data Encryption Key | The key that actually encrypts a row's fields. A fresh one per row. |
| **DNS** | Domain Name System | The internet's phone book — turns akwadona.com into a server address. Ours is in Route 53; GoDaddy only holds the registration. |
| **DOB** | Date of Birth | The date a person was born. |
| **DoS** | Denial of Service | Flooding a system so it cannot serve real users. |
| **DPA** | Data Processing Agreement | A contract required by the EU privacy law GDPR between a data controller (the hospital) and a data processor (Akwadona). It says what the processor may do with personal data. |
| **DR** | Disaster Recovery / Document Register | Disaster Recovery: how we restore the system after a major failure. Document Register (AKW-DR-00): the master index of this documentation set. |
| **EH** | Engineering Handbook | The document-type code for the engineering handbook (AKW-EH-10). |
| **ePHI** | electronic Protected Health Information | PHI in digital form. Everything Akwadona stores is ePHI. |
| **EU** | European Union | The political and economic union of 27 European countries. |
| **FIPS** | Federal Information Processing Standard | US government standards for computer security. "FIPS 140-2 Level 3" is the certification level of the hardware that holds our encryption keys. |
| **FK** | Foreign Key | A field in one record that points to another record. |
| **FS** | Functional Specification | The document that describes what the system does — every feature, rule, and setting — without describing how it is built. |
| **GCM** | Galois/Counter Mode | A way of running AES that also detects tampering. We use AES-256-GCM. |
| **GDPR** | General Data Protection Regulation | The European Union's privacy law (2018). It gives people rights over their data and sets duties on companies that process it. |
| **GSI** | Global Secondary Index | A second way to look up rows in a DynamoDB table, by a different attribute. We have nine. |
| **HIPAA** | Health Insurance Portability and Accountability Act | The US law that sets rules for protecting patients' health information. Its "Security Rule" lists the technical safeguards we must have. |
| **HMAC** | Hash-based Message Authentication Code | A fingerprint of a value computed with a secret key. Same value + same key = same fingerprint; different keys give different fingerprints. We use it to search encrypted fields. |
| **HSM** | Hardware Security Module | A tamper-proof physical device that holds encryption keys. KMS keys live in one. |
| **HSTS** | HTTP Strict Transport Security | A response header telling browsers to always use HTTPS for this site. |
| **HTTP** | Hypertext Transfer Protocol | The protocol the web uses to move pages and data. |
| **HTTPS** | HTTP Secure | HTTP wrapped in TLS encryption — the padlock. |
| **IAM** | Identity and Access Management | AWS's permission system: which user or service may do which action on which resource. |
| **IDOR** | Insecure Direct Object Reference | An attack where changing an ID in a request reveals someone else's record. Our 404-for-foreign-rows rule stops it. |
| **IRP** | Incident Response Plan | The step-by-step plan for what to do when something goes wrong — an outage or a suspected data breach. |
| **IV** | Initialisation Vector | A random value mixed into each encryption so identical inputs produce different ciphertext. |
| **JSON** | JavaScript Object Notation | The text format our API uses for data. |
| **JWT** | JSON Web Token | A signed digital ID card the browser sends with every request. It names the user, their hospital, and their role. |
| **KMS** | Key Management Service | AWS's vault for encryption keys. Keys never leave it; it encrypts and decrypts on request. |
| **LRU** | Least Recently Used | A cache-eviction rule: when full, drop the item unused for longest. |
| **MAC** | Message Authentication Code | A tamper-detection tag; HMAC is the hash-based kind. |
| **MFA** | Multi-Factor Authentication | Needing two proofs to sign in — a password plus a code from a phone app. |
| **NIST** | National Institute of Standards and Technology | A US government body that publishes security standards. Its "SP 800-53" lists security controls; "SP 800-18" describes how to write a System Security Plan. Auditors worldwide recognise its structure. |
| **OAC** | Origin Access Control | The CloudFront setting that lets only CloudFront read our S3 bucket — nobody can bypass it. |
| **OPS** | Operations | Running the system day to day: deploying, monitoring, backing up, recovering. |
| **ORE** | Order-Revealing Encryption | An encryption scheme that lets you sort ciphertext. Mentioned as a possible future option. |
| **OWASP** | Open Worldwide Application Security Project | A non-profit that publishes the best-known list of web application risks ("OWASP Top 10"). |
| **PDPPL** | Personal Data Privacy Protection Law | Qatar's national privacy law (Law No. 13 of 2016). Qatar's equivalent of GDPR. |
| **PHI** | Protected Health Information | Any information that identifies a patient and relates to their health: name, ID number, diagnosis, medication, phone, date of birth. |
| **PII** | Personally Identifiable Information | Any data that identifies a person, medical or not — a staff member's home address, for example. |
| **PITR** | Point-In-Time Recovery | DynamoDB's continuous backup — restore the table to any second in the last 35 days. |
| **PK** | Partition Key | The main lookup key of a DynamoDB row — the "drawer". |
| **POA&M** | Plan of Action and Milestones | A NIST term for the list of known security gaps, each with an owner and a target date to close it. |
| **QID** | Qatari ID | The national identity number of a Qatar resident (11 digits). |
| **RPO** | Recovery Point Objective | How much recent data we may lose in a disaster. Ours: 15 minutes. |
| **RR** | Risk Register | A list of every known risk with a score, an owner, and a plan. |
| **RTO** | Recovery Time Objective | How long the system may be down after a disaster before it must be back. Ours: 4 hours. |
| **S3** | Simple Storage Service | AWS file storage — a bucket holds files of any size. |
| **SAD** | Solution Architecture Document | The master technical design document: how the whole system is built, from infrastructure to data to security. |
| **SDK** | Software Development Kit | A library a vendor provides to call its services from code. |
| **SES** | Simple Email Service | AWS's service for sending e-mail. |
| **SHA** | Secure Hash Algorithm | A family of one-way hash functions. SHA-256 is the one we use. |
| **SK** | Sort Key | The second part of a DynamoDB key — the "folder inside the drawer". |
| **SNS** | Simple Notification Service | AWS's service for sending alerts (e-mail, SMS, to other services). |
| **SP** | Special Publication | NIST's label for its standards documents, e.g. SP 800-53. |
| **SQL** | Structured Query Language | The language of relational databases. We use DynamoDB, which has no SQL, but "injection" attacks are still tested. |
| **SSP** | System Security Plan | The document that lists every security control the system has, how it is implemented, and its status. A NIST-defined document type. |
| **STRIDE** | Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege | A checklist of six kinds of threat, used to make sure a threat review covers everything. |
| **TL;DR** | Too long; did not read | A short summary placed at the top of a section. |
| **TLS** | Transport Layer Security | The encryption that protects data travelling over the internet — the "S" in HTTPS. |
| **TOTP** | Time-based One-Time Password | The six-digit code from an authenticator app that changes every 30 seconds. |
| **URL** | Uniform Resource Locator | A web address. |
| **UUID** | Universally Unique Identifier | A random 36-character ID that will never collide. |
| **WAF** | Web Application Firewall | A filter in front of a website that blocks known-bad traffic. Ours is defined but currently switched off. |
| **XML** | Extensible Markup Language | An older text data format with angle-bracket tags. |
| **XSS** | Cross-Site Scripting | An attack that injects a malicious script into a web page. |

---

## 1. System identification

| Field | Value |
|---|---|
| System name | Akwadona Hospital Platform |
| System owner | Akwadona (founder) |
| Security Officer | Founder (interim) — see AKW-RR-12 for the staffing item |
| Data Protection Officer | Founder (interim) |
| Operational status | Production — two tenants |
| Information type | ePHI (electronic Protected Health Information), PII of staff, operational metadata |
| Impact level (FIPS 199 style) | Confidentiality **High**, Integrity **High**, Availability **Moderate** |
| Environment | AWS account `483176634665`, region `us-east-1`; single CloudFormation stack `AkwadonaCdkStack` |

## 2. System boundary and environment

**Inside the boundary:** CloudFront distribution and S3 frontend bucket; API Gateway HTTP API; 42 Lambda functions; DynamoDB `Hospital` table; S3 documents, access-logs, and audit buckets; Cognito user pool and pre-token Lambda; KMS platform keys and per-tenant keys; CloudTrail, CloudWatch, SNS; Secrets Manager seed-user secrets.

**Outside the boundary (interconnections):** Amazon Bedrock (model inference, in-region, BAA-covered); Amazon SES (transactional e-mail); GoDaddy (DNS authority only — no data); end-user browsers.

**Not deployed:** WAFv2 edge stack (defined in code, disabled for cost — see §9).

Architecture, data flows, and the request lifecycle: AKW-SAD-02 §3–§4.

## 3. Security controls by family

Each control: **Implementation** (what is actually in place, with the code or console location) and **Status** (Implemented / Partial / Planned). Regulatory cross-references are in AKW-CCM-06.

### 3.1 Access Control (AC)

| ID | Control | Implementation | Status |
|---|---|---|---|
| AC-1 | Authentication on every API route | API Gateway `HttpJwtAuthorizer` on all ~70 routes; no unauthenticated route exists (`lib/akwadona-cdk-stack.ts` `route()` helper) | Implemented |
| AC-2 | Role-based authorisation | Cognito groups → gates in each Lambda (`isAdmin`, `role === 'operator'`, `requireAdminOrOperator`, `FOLDER_ACCESS`) — matrix in AKW-FS-03 §2 | Implemented |
| AC-3 | Tenant isolation | `tenantId` from verified JWT only; every list is a Query on `tenant-entityType-index`; single-item reads compare `tenantId` and return 404 | Implemented |
| AC-4 | Least privilege — Lambda to data | 14 read-only Lambdas: `grantReadData` + `UpdateItem` scoped to `THROTTLE#*`; 25 mutating: read/write (2026-10-29) | Implemented |
| AC-5 | Least privilege — operator to keys | Explicit DENY on `kms:Decrypt/Encrypt/GenerateDataKey*/GenerateMac/VerifyMac/ReEncrypt*` for `alias/akwadona-tenant-*`; key policies exclude `*Operator*`; `ScheduleKeyDeletion` only on `akwadona:tenantId`-tagged keys and DENIED for live tenants | Implemented |
| AC-6 | Least privilege — pre-token Lambda | Read-only table + `kms:GenerateMac` only (no Decrypt) | Implemented |
| AC-7 | Human access | Engineers use a read-only IAM profile; deploy user cannot read patient data; console MFA for IAM users | Implemented (process) |
| AC-8 | Session management | Access/ID tokens 1 h, refresh 30 d; device tracking with challenge on new device | Implemented |
| AC-9 | Multi-factor authentication for end users | Cognito `Mfa.OPTIONAL` (TOTP); REQUIRED for Operator/Admin pending enrolment | **Partial** — R-03 |

### 3.2 Identification and Authentication (IA)

| ID | Control | Implementation | Status |
|---|---|---|---|
| IA-1 | Password policy | ≥ 12 chars, upper/lower/digit/symbol; temp password 3 days | Implemented |
| IA-2 | Credential storage | Cognito (hashed, never visible); seed temp passwords in Secrets Manager under the data CMK, never logged | Implemented |
| IA-3 | Account enumeration resistance | `preventUserExistenceErrors: true`; ForgotPassword and wrong-password paths return identical errors | Implemented |
| IA-4 | Threat protection | Cognito Advanced Security `FULL_FUNCTION` (risk-based blocking, compromised-credential checks) | Implemented |
| IA-5 | Self-registration | Disabled (`selfSignUpEnabled: false`); users created by admin panel or operator wizard | Implemented |

### 3.3 System and Communications Protection (SC)

| ID | Control | Implementation | Status |
|---|---|---|---|
| SC-1 | Encryption in transit | TLS 1.2 (2021 policy) floor on CloudFront; HTTP→HTTPS redirect; execute-api HTTPS-only; S3 `enforceSSL` | Implemented |
| SC-2 | Encryption at rest — PHI fields | AES-256-GCM per field with a per-row DEK wrapped by the **tenant's** KMS CMK (§4) | Implemented |
| SC-3 | Encryption at rest — storage | DynamoDB, frontend bucket, documents bucket, Secrets Manager under `alias/akwadona/data`; audit bucket + CloudTrail under `alias/akwadona/audit` | Implemented (documents bucket since 2026-10-29) |
| SC-4 | Key management | KMS CMKs, annual rotation on platform keys, HSM-backed, never exported; per-tenant keys created by the wizard and resolved at runtime | Implemented |
| SC-5 | Searchable encryption | HMAC-SHA256 via `kms:GenerateMac` with a per-tenant HMAC CMK (§5) | Implemented |
| SC-6 | Cross-origin protection | API Gateway CORS allow-list; no wildcard anywhere (2026-10-29 sweep) | Implemented |
| SC-7 | Security headers | CloudFront managed `SECURITY_HEADERS` (HSTS, nosniff, X-Frame-Options, Referrer-Policy) | Implemented; CSP planned (R-07) |
| SC-8 | Denial-of-service | API Gateway stage throttle 200 r/s / 500 burst; per-tenant plan throttle; Cognito Advanced Security | Implemented; WAF **disabled** (R-05) |
| SC-9 | Secrets in code | None; environment variables encrypted at rest; `.gitignore` excludes zips/dist | Implemented |

### 3.4 Audit and Accountability (AU)

| ID | Control | Implementation | Status |
|---|---|---|---|
| AU-1 | Infrastructure audit | CloudTrail multi-region, log-file validation, to `akwadona-audit-v7-*` (KMS, Object Lock compliance 7 y) and CloudWatch Logs (1 y) | Implemented |
| AU-2 | Application audit | `AUDIT#` row on every create/update/delete in every module (actor, action, entity, encrypted before/after); operator actions audited separately | Implemented |
| AU-3 | Access logs | CloudFront standard logs + S3 server access logs (frontend, documents) to `akwadona-access-logs-*` (7 y lifecycle) | Implemented |
| AU-4 | Log protection | Object Lock compliance mode — not deletable by account admins within retention | Implemented |
| AU-5 | PHI read logging | Reads are logged at the AWS level (`kms:Decrypt` in CloudTrail); application-level read audit is per module | **Partial** — R-09 |

### 3.5 System and Information Integrity (SI)

| ID | Control | Implementation | Status |
|---|---|---|---|
| SI-1 | Input validation | Per-route required-field, range, and enum checks (AKW-FS-03 business rules); sort-field allow-lists; page-size clamps | Implemented |
| SI-2 | Injection resistance | DynamoDB expression attributes (no string concatenation of user values into expressions); verified by `safe/05-injection-readonly.js` | Implemented |
| SI-3 | Data integrity | AES-GCM authentication tags; DynamoDB transactions for uniqueness locks; conditional writes | Implemented |
| SI-4 | Software currency | Node.js 20 default (18 removed 2026-10-29); CDK 2.244 | Implemented |
| SI-5 | XSS resistance | Angular default escaping; no `innerHTML`, no `bypassSecurityTrust*`, no `eval` in `src/app` (verified 2026-10-29) | Implemented |
| SI-6 | Malware scanning on uploads | None | Planned (R-10) |

### 3.6 Configuration Management (CM)

| ID | Control | Implementation | Status |
|---|---|---|---|
| CM-1 | Infrastructure as code | Single CDK stack in Git; every change is a reviewable diff | Implemented |
| CM-2 | Change procedure | AKW-OPS-08 §3 (synth → resource count → diff → deploy → verify); checklists in AKW-EH-10 §5 | Implemented |
| CM-3 | Shared-code consistency | Copied helpers verified by hash before deploy | Implemented (manual) |
| CM-4 | Baseline hardening | `BlockPublicAccess.BLOCK_ALL` on every bucket; OAC-only CloudFront origin; deletion protection on the table; `RETAIN` on stateful resources | Implemented |

### 3.7 Contingency Planning (CP)

| ID | Control | Implementation | Status |
|---|---|---|---|
| CP-1 | Backup | DynamoDB PITR 35 d; S3 versioning | Implemented |
| CP-2 | Recovery | Full-stack rebuild runbook incl. two-phase alias deploy (AKW-OPS-08 §6); RTO 4 h, RPO 15 min | Implemented (runbook); not drilled (R-11) |
| CP-3 | Multi-AZ | Inherent in all managed services | Implemented |
| CP-4 | Multi-region | Planned (`me-south-1`) | Planned |

### 3.8 Incident Response (IR)
AKW-IRP-09 — severity model, ten-minute drill, containment commands, regulatory notification clocks (PDPPL 72 h, HIPAA 60 d, GDPR 72 h), post-mortem format.

### 3.9 Security Assessment (CA)

| ID | Control | Implementation | Status |
|---|---|---|---|
| CA-1 | Attack-test suite | `scripts/security-tests/` — 6 read-only + 4 destructive files covering transport, auth bypass, CORS, enumeration, injection, method/path, IDOR, role escalation, rate limit, payload/traversal (§6) | Implemented (manual run) |
| CA-2 | Cross-tenant isolation probe | `scripts/cross-tenant-probe.js` (A creates, B must 404) | Implemented (manual run) — scheduling is R-06 |
| CA-3 | Independent penetration test | None yet | Planned Q4 2026 (R-12) |
| CA-4 | Continuous posture (AWS Config, GuardDuty, Security Hub) | None | Planned (R-13) |

## 4. Encryption and zero-knowledge design

This document is the canonical reference for **Step 3**: per-tenant KMS keys + envelope encryption of patient health information (PHI). It explains what is encrypted, who can decrypt it, and how to prove the platform is PHI-blind in an audit.

---

#### TL;DR — the security claim

- Every customer (tenant) gets their own KMS Customer-Managed Key (CMK).
- PHI fields on every row are encrypted with that tenant's key before storage.
- **The Lambda execution role** can decrypt — that's what serves the app.
- **No human IAM principal** (deploy user, admin user, you) has `kms:Decrypt` on tenant keys.
- A subpoena or insider attack on Akwadona's AWS account cannot read patient data.

This is the same architecture used by Athenahealth, Particle Health, and Redox.

---

#### Architecture

##### Per-tenant KMS keys (one CMK per tenant)

| Tenant slug | tenantId | KMS key alias | Key ARN suffix |
|---|---|---|---|
| `tiryaq` | `T_2572fc71` | `alias/akwadona-tenant-tiryaq` | `11b1386b-...` |
| `alshifaa` | `T_a4b8aef9` | `alias/akwadona-tenant-alshifaa` | `c1c1657b-...` |

Keys live in the Akwadona AWS account (`483176634665`) in `us-east-1`. They were created via AWS Console wizard with the standard policy in `akwadona-cdk-stack.ts` (see `tenantKeys` constant).

##### Envelope encryption

Direct KMS encryption is limited to 4 KB and costs ~$0.30 per 100K calls — too expensive for per-field encryption on every row. We use **envelope encryption** instead:

1. On write, the Lambda calls `kms:GenerateDataKey` once per row → KMS returns a plaintext DEK + a wrapped DEK (encrypted with the tenant CMK).
2. The Lambda uses AES-256-GCM locally to encrypt each PHI field with the plaintext DEK.
3. The Lambda stores the wrapped DEK as `_kms_dek` on the row alongside the ciphertext PHI.
4. The plaintext DEK is wiped from memory.
5. On read, the Lambda calls `kms:Decrypt` once with the wrapped DEK → recovers the plaintext DEK, decrypts the PHI fields locally, returns plaintext to the customer's authorised user.

##### Item shape after encryption

```json
{
  "PK":            "PATIENT#abc-123",
  "SK":            "PROFILE",
  "EntityType":    "PATIENT",
  "tenantId":      "T_2572fc71",
  "name":          "AQICAH...",        ← base64 ciphertext
  "qid":           "AQICAH...",
  "phone":         "AQICAH...",
  "email":         "AQICAH...",
  "medicalHistory":"AQICAH...",
  "notes":         "AQICAH...",
  "_kms_dek":      "AQECAH...",        ← KMS-wrapped DEK
  "_kms_v":        1,                  ← format version
  "createdAt":     "2026-06-14T...",
  "updatedAt":     "2026-06-14T..."
}
```

Non-PHI fields (`PK`, `SK`, `EntityType`, `tenantId`, timestamps, FK references) stay plaintext so DynamoDB can index and query them.

---

#### What is encrypted

| Entity | PHI fields encrypted | Lambda |
|---|---|---|
| Patient | name, dob, qid, phone, email, medicalHistory, notes, allergies, medications, bloodGroup | createPatient, updatePatient, getPatientByID, getAllPatients, getPatientsDataByFilters |
| Doctor | name, dob, qid, phone, email, licenseNumber, education, notes | createDoctor, updateDoctor, getDoctorByID, getDoctorByEmail, getAllDoctors |
| Appointment | chiefComplaint, notes, cancelReason | akwadona-appointments |
| Audit log (appointment) | before, after JSON snapshots | akwadona-appointments (writeAudit helper) |
| Examination / consultation | chiefComplaint, notes, diagnosis, findings, prescription_text | akwadona-examinations |

Deferred (queued in Task #74): pharmacy, blood bank, calendar, document manager, scribe.

Frontend never sees ciphertext — the app reads plaintext via Lambda decrypt + sends plaintext over TLS that becomes ciphertext at Lambda write time. End users never know encryption is happening.

---

#### Who can decrypt — the zero-knowledge claim

The per-tenant key policy (`akwadona-cdk/lib/akwadona-cdk-stack.ts`, KMS console) grants:

| Principal | Encrypt | Decrypt | Notes |
|---|---|---|---|
| **Root account** (`arn:aws:iam::483176634665:root`) | ✓ | ✓ | Standard AWS recommendation for emergencies. Logged in CloudTrail. |
| **`hospital-deploy-user`** | ✗ | ✗ | Can manage the key (enable / disable / tag / schedule delete) but cannot use it. |
| **Lambda execution roles** matching `AkwadonaCdkStack-*ServiceRole*` | ✓ | ✓ | The only path used by live traffic. |
| Any future operator-console role | ✗ | ✗ | Step 7 by design — operator console reads only metadata and aggregates. |
| Any other IAM user / role in this account | ✗ | ✗ | No statement matches them. |

This is enforced by the **KMS key policy itself**, not by IAM. Even attaching `AdministratorAccess` to a user does not let them decrypt — the key policy explicitly limits decrypt to the Lambda role principal pattern.

##### Empirical proof

The Step 3f backfill script (`scripts/backfill-encrypt-phi.js`) failed with this exact error when first run as `hospital-deploy-user`:

```
User: arn:aws:iam::483176634665:user/hospital-deploy-user is not
authorized to perform: kms:GenerateDataKey on resource:
arn:aws:kms:us-east-1:483176634665:key/11b1386b-...
```

That denial is your zero-knowledge proof. To complete the one-time backfill the policy was temporarily expanded with a `TempBackfill` statement, then reverted. The temporary grant + revocation are visible in CloudTrail.

##### What an auditor sees

- Key policy → no human principal allowed to decrypt (only the Lambda role pattern + root).
- IAM policies → no user / non-Lambda role has `kms:Decrypt` on tenant keys.
- CloudTrail → every Decrypt call is logged with the role that made it. Cross-reference with Lambda invocations to prove only legitimate app traffic decrypted.
- DynamoDB Explore items → PHI fields are visibly ciphertext.

---

#### Customer revocation

If a customer wants to lock Akwadona out of their data:

1. **Today (KMS in Akwadona's account):** customer files a written request. We schedule the CMK for deletion via Cognito → DynamoDB → KMS → "Schedule key deletion" (7-30 day cooldown). After deletion, all data encrypted with that key is permanently unrecoverable; no party — Akwadona staff, AWS, Anthropic, no one — can decrypt.

2. **Future BYOK mode (customer's own AWS account):** the customer creates the CMK in their own account and grants Akwadona's Lambda role usage via a KMS grant. They can revoke the grant unilaterally at any time. Akwadona Lambdas instantly stop being able to decrypt; the customer-facing app shows an error message. No prior notice or cooperation from Akwadona is required for the customer to cut off our access. This is the truest form of zero-knowledge and is the standard for enterprise contracts.

---

#### Key rotation

KMS supports automatic annual rotation. Recommended setting per tenant key:

- Console → KMS → Customer managed keys → click key → **Key rotation** → **Automatic** → **1 year**.

After rotation, existing data still decrypts (KMS keeps the old key material internally and chooses the right one based on the ciphertext header). New data uses the new key material. No application change required.

Manual emergency rotation: create a new CMK, update the `tenantKeys` map in CDK, re-deploy. Existing data needs re-encryption (re-run `backfill-encrypt-phi.js` with a flag — to be added when needed).

---

#### Operations

##### Add a new tenant

1. AWS Console → KMS → Customer managed keys → Create key.
2. Alias: `akwadona-tenant-<slug>` → tags Product/Akwadona, Tenant/`<slug>`, TenantId/`T_<id>`.
3. Apply the standard key policy template (root admin + deploy user management + Lambda role usage condition).
4. Note the ARN.
5. Edit `akwadona-cdk/lib/akwadona-cdk-stack.ts` → add new `tenantId → ARN` to `tenantKeys` map.
6. Edit `scripts/backfill-encrypt-phi.js` → add new entry to `TENANT_KEYS` map (same as CDK).
7. Edit `src/app/services/tenant.service.ts` → add new slug → tenantId mapping.
8. `cd akwadona-cdk && npx cdk deploy --require-approval never`
9. Add the slug to API Gateway CORS allow list in CDK (`tenantSlugs` array) — same redeploy.
10. Run `scripts/backfill-create-tenants.js` to create the TENANT row.

##### Encrypt newly-added PHI fields

When a new PHI field appears (e.g. `insuranceProvider`):

1. Add the field name to the appropriate `*_PHI_FIELDS` constant in `akwadona-cdk/lambda/_shared/crypto.js`.
2. Add the same field to `scripts/backfill-encrypt-phi.js`'s `PHI_BY_ENTITY` map.
3. `node scripts/sync-shared-helpers.js`
4. `cd akwadona-cdk && npx cdk deploy --require-approval never`
5. `node scripts/backfill-encrypt-phi.js` (the script will re-process and pick up the new field on the next pass — note: existing rows with `_kms_dek` are skipped today; for adding fields to an already-encrypted row a forced-re-encrypt mode needs implementing).

##### Forgotten key — disaster recovery

If a tenant's CMK is accidentally deleted, encrypted PHI for that tenant is **permanently unrecoverable**. There is no backdoor. The 7–30 day pending-deletion window is the only safety net — during that window the deletion can still be cancelled.

Mitigation: enable CMK **key deletion protection** in console (forces a multi-step deletion process), and document the per-tenant CMK in your compliance binder so deletes require explicit signoff.

---

#### Cost

| Item | Monthly cost |
|---|---|
| 2 CMKs × $1 / month | $2 |
| KMS API calls (GenerateDataKey + Decrypt) at ~1000 reqs / day | < $1 |
| **Total** | **~$3 / month for 2 tenants** |

Each additional tenant adds $1 / month flat + a few cents in API calls. Linear, predictable.

---

#### Performance

- Cold-start Lambda: + ~50 ms (one-time SDK load + first KMS call).
- Warm Lambda read of a single patient: + ~5–10 ms (one Decrypt + local AES decrypt).
- Warm Lambda list of 25 patients: + ~10–25 ms (decrypts in parallel via `decryptItems`).
- Lambda write of a new patient: + ~10 ms (one GenerateDataKey + local AES encrypts).

Negligible vs the existing 30–80 ms DynamoDB latency.

---

#### Compliance mapping

| Standard | Requirement | How Step 3 satisfies it |
|---|---|---|
| **HIPAA** § 164.312(a)(2)(iv) | Encryption of ePHI at rest | AES-256-GCM with per-tenant KMS-wrapped keys. |
| **HIPAA** § 164.308(a)(4) | Access controls | Decrypt limited to Lambda execution role principal. |
| **PDPPL** Art. 9 (Qatar) | Integrity and confidentiality of personal data | DynamoDB table CMK + per-tenant CMK + envelope encryption. |
| **GDPR** Art. 32 | Pseudonymisation and encryption | All PHI fields stored as ciphertext keyed per data controller (tenant). |
| **NIST 800-53** SC-12 / SC-13 | Cryptographic protection and key establishment | AWS KMS = FIPS 140-2 Level 3 validated HSMs. |
| **NIST 800-66** § 4.2.7 | Encryption at rest | Storage-layer (DynamoDB CMK) plus field-layer (per-tenant envelope) = defence in depth. |

Full per-regime checklists live in AKW-CCM-06.

---

#### Coverage status as of completion of Step 3

- ✓ Patient flows (create / read / update / list / search)
- ✓ Doctor flows (create / read / update / list / lookup by email)
- ✓ Appointment flows (create / read / update / list / patch / audit snapshots)
- ✓ Examination / consultation flows (create / read / update / list / signoff)
- ✓ Existing rows backfilled to encrypted (Step 3f)
- ⏳ Pharmacy, blood bank, scribe, calendar, documents (entry guard only — Task #74)
- ⏳ Hashed search fields for QID / email lookups (Step 4)

---

#### Verification checklist

Run these and screenshot for the compliance binder:

1. **Console** → DynamoDB → Hospital → Explore items → Query `tenant-entityType-index` for `PATIENT`. Open any row. Confirm `name`, `qid`, `phone`, `email`, etc. are ciphertext + `_kms_dek` present.
2. **Console** → KMS → Customer managed keys → click `alias/akwadona-tenant-tiryaq` → Key policy → confirm no human principal has Encrypt or Decrypt.
3. **Run** `aws kms generate-data-key --key-id arn:aws:kms:us-east-1:483176634665:key/11b1386b-51c2-41ab-b5ba-aa6eb9a0e8a6 --key-spec AES_256 --region us-east-1` as `hospital-deploy-user` → expect `AccessDeniedException` → save the output as Exhibit A in the compliance binder.
4. **App** → sign in → patients list shows readable names → confirms Lambda decryption works end-to-end.
5. **CloudTrail** → search Decrypt events → all rows show the principal as a `AkwadonaCdkStack-*ServiceRole*` ARN → no human in the list.

---

#### Open follow-ups

All Step-3 follow-ups (Tasks #73–#76, Steps 4 & 5) are DONE. See:
- `AKW-SSP-05-System-Security-Plan.md` for the HMAC search design (Step 4)
- `05a/05b/05c/05f-compliance-*.md` for the HIPAA / PDPPL / GDPR mappings + BAA / DPA templates (Step 5)
- `AKW-SAD-02-Solution-Architecture-Document.md` Open follow-ups for the latest backlog

### 4.x DEK cache (added 2026-10-29)
`_shared/crypto.js` keeps `Map<wrappedDekBase64, plaintextDek>` for 5 minutes, 2,000 entries, wipe-on-evict, and caps parallel KMS decrypts at 32. Plaintext DEKs exist only in the Lambda's process memory (same model as the AWS Encryption SDK caching CMM). The operator Lambda cannot reach this code path (AC-5).

## 5. Searchable encryption (HMAC)

This document is the canonical reference for **Step 4**: making PHI fields searchable again after Step 3 encrypted them. Equality lookups by QID, email, and phone are restored without ever putting plaintext into DynamoDB partition keys.

---

#### The problem Step 4 solves

Step 3 encrypted PHI fields with per-row DEKs and AES-256-GCM. Every encryption uses a fresh IV, so the same plaintext produces different ciphertext each time:

```
"qid": "12345678901"  →  write 1  →  "AQICAHj8Ks..."
                          write 2  →  "AQICAHj8Pl..."
                          write 3  →  "AQICAHj8Qr..."
```

Two side-effects:

- **Equality lookups break.** `WHERE email = 'doctor1@tiryaq.com'` matches nothing because the row stores ciphertext that doesn't match the query string. Doctor login (`getDoctorByEmail`), "find patient by QID", phone uniqueness — all broken.
- **Lock partition keys still leaked PHI.** Pre-Step-4, uniqueness locks were `PK = QID#<plaintext-qid>`. Anyone with DynamoDB read access could enumerate QIDs from the partition key index even without decrypting any row.

Step 4 fixes both with **deterministic per-tenant HMACs** stored alongside the ciphertext.

---

#### Architecture

##### Per-tenant KMS HMAC keys

Each tenant has a dedicated KMS key of type `HMAC_256`:

| Tenant slug | HMAC key alias | Purpose |
|---|---|---|
| `tiryaq` | `alias/akwadona-tenant-tiryaq-hmac` | Compute HMAC-SHA256 for Tiryaq's lookups |
| `alshifaa` | `alias/akwadona-tenant-alshifaa-hmac` | Compute HMAC-SHA256 for Alshifaa's lookups |

Both keys live in the Akwadona AWS account (`483176634665`), region `us-east-1`. Key spec: `HMAC_256`. Key usage: `Generate and verify MAC`.

##### How the MAC is computed

The Lambda never sees the HMAC key. It calls `kms.GenerateMac()`:

```
GenerateMac(KeyId=tenant-hmac-key, MacAlgorithm='HMAC_SHA_256', Message='12345678901')
  → returns 32-byte MAC inside the FIPS-validated HSM
```

The Lambda gets back the MAC (base64 in our code) but never touches the key material. The same input + same KMS key always produces the same MAC, so equality lookups become:

```
emailHash = computeHmac(input_email, callerTenantId)
DDB Query  emailHash-EntityType-index  PK=emailHash  SK=EntityType
```

##### What gets hashed

| Entity | Source fields | Stored as |
|---|---|---|
| Patient | qid, email, phone | qidHash, emailHash, phoneHash |
| Doctor | qid, email, phone | qidHash, emailHash, phoneHash |

The encrypted ciphertext (qid, email, phone) stays on the row. The hash fields are added alongside. Hashes are plaintext base64 because they're one-way (can't reverse).

##### What changed about locks

| Lock | Before Step 4 | After Step 4 |
|---|---|---|
| QID | `PK = QID#12345678901` | `PK = QID#<HMAC_base64>` |
| Phone | `PK = PHONE#+97455123456` | `PK = PHONE#<HMAC_base64>` |
| Email (doctor) | `PK = EMAIL#doctor1@tiryaq.com` | `PK = EMAIL#<HMAC_base64>` |

Same row content, but the lookup key is the tenant-scoped HMAC. Two consequences:

- **No plaintext PHI in partition keys** — even reading DynamoDB metadata reveals nothing.
- **Tenant-scoped uniqueness** — the same QID can be a patient at Tiryaq AND a (different) patient at Alshifaa simultaneously, because their hashes differ. This matches real-world Qatar healthcare flow where a patient transfers between hospitals.

---

#### New GSI

```
indexName:     emailHash-EntityType-index
partitionKey:  emailHash  (S)
sortKey:       EntityType (S)
projection:    ALL
```

Used by `getDoctorByEmail` (and any future "find by email" endpoint). Empty until rows have `emailHash` set.

The legacy `email-index` is now dead — it indexes ciphertext which doesn't match any plaintext lookup. We keep it in CDK for now because removing a GSI requires a CDK redeploy with data migration; it'll be removed in a future cleanup.

---

#### Where the security comes from

| Threat | Defence |
|---|---|
| Attacker reads DynamoDB partition keys | All keys are HMACs or opaque IDs — no PHI visible. |
| Attacker reads encrypted PHI columns | They're AES-256-GCM ciphertext, useless without the per-row DEK. |
| Attacker has DynamoDB access AND wants to compute HMACs to brute-force lookups | They need `kms:GenerateMac` on the tenant HMAC key. Key policy whitelists only Lambda execution roles. Human IAM users — including the deploy user — get nothing. |
| Attacker tries dictionary attack on hashes (try all 11-digit QIDs) | They'd need ~100B KMS calls per tenant. At KMS rate limits + $0.03/10K calls = $300K + months of compute, all logged to CloudTrail with the calling principal. Detected immediately. |
| Tiryaq tries to discover if a known QID is registered at Alshifaa | Tiryaq's HMAC of "12345" ≠ Alshifaa's HMAC of "12345" (different keys). Tiryaq cannot generate Alshifaa's hash → cannot probe. |

The hash key cannot be exfiltrated. KMS HMAC keys do not expose key material via any API — only the MAC output ever returns. Even if a Lambda is fully compromised, dropping its IAM role into a different account cannot resurrect the HMAC capability — the key policy's PrincipalArn condition stops working outside the original IAM context.

---

#### Item shape after Step 4

```json
{
  "PK":            "DOCTOR#abc-123",
  "SK":            "PROFILE",
  "EntityType":    "DOCTOR",
  "tenantId":      "T_2572fc71",

  "name":          "AQICAH...",        ← Step 3 ciphertext
  "qid":           "AQICAH...",
  "phone":         "AQICAH...",
  "email":         "AQICAH...",
  "licenseNumber": "AQICAH...",

  "qidHash":       "C5KqMz...",        ← Step 4 HMAC, plaintext base64
  "emailHash":     "P3jLw7...",
  "phoneHash":     "fT9xRn...",

  "_kms_dek":      "AQECAH...",        ← Step 3 wrapped DEK
  "_kms_v":        1,

  "createdAt":     "2026-06-15T...",
  "updatedAt":     "2026-06-15T..."
}
```

And the associated locks:

```
PK = "QID#C5KqMz...",       SK = "LOCK",  doctorPK = DOCTOR#abc-123, tenantId = T_2572fc71
PK = "PHONE#fT9xRn...",     SK = "LOCK",  doctorPK = DOCTOR#abc-123, tenantId = T_2572fc71
PK = "EMAIL#P3jLw7...",     SK = "LOCK",  doctorPK = DOCTOR#abc-123, tenantId = T_2572fc71
```

---

#### What still uses plaintext lookup

Some lookups remain by plaintext partition key because the field isn't PHI:

- **`tenantId`** — opaque ID, not PHI.
- **`PATIENT#<uuid>`, `DOCTOR#<uuid>`, `APPOINTMENT#<uuid>`** — random UUIDs, not derivable from the patient.
- **`AUDIT#YYYY-MM-DD`** — date partition, not PHI.
- **`COUNTER#PATIENTS#<tenantId>`** — counter row keyed by tenantId.
- **`TENANT#<slug>`** — tenant profile row keyed by slug.

These are operational identifiers, not patient identifiers. Anyone who reads them learns the row exists; they learn nothing about who the patient is.

---

#### Cost

| Item | Monthly cost |
|---|---|
| 2 HMAC CMKs × $1 / month | $2 |
| KMS GenerateMac calls at ~1000 req/day | < $1 |
| New GSI storage + write capacity | < $0.50 |
| **Step 4 additional cost** | **~$3 / month for 2 tenants** |

Same scaling as Step 3 — linear per tenant.

---

#### Performance

- Each lookup-by-email: + ~10 ms (one KMS GenerateMac call).
- Each create / update of a Patient or Doctor: + ~30 ms (3 GenerateMac calls — QID, email, phone). Parallelisable but currently serial because the hashes are independent.
- LRU cache in `_shared/crypto.js` caps at 5000 entries — repeated lookups for the same value (e.g. the same doctor logging in repeatedly) cost 0 KMS calls.

---

#### Compliance mapping

| Standard | Requirement | How Step 4 satisfies it |
|---|---|---|
| **HIPAA** § 164.514(d)(2)(i) | De-identification: removing or obscuring direct identifiers | QID, email, phone never appear in plaintext outside encrypted columns or HMAC hashes. |
| **PDPPL** Art. 8 | Data minimisation | Hash values cannot be reversed; queryability is preserved without storing the plaintext in additional places. |
| **GDPR** Art. 4(5) / Recital 26 | Pseudonymisation | HMAC with a tenant-controlled key meets the EU's "pseudonymised personal data" standard. |
| **NIST 800-66** § 4.7.2 | Audit controls | Every GenerateMac call is logged in CloudTrail with the calling principal. |

---

#### Operations

##### Adding a new tenant

For every new tenant onboarding (in addition to the Step 2 + Step 3 steps):

1. KMS Console → Create key → **HMAC**, key spec **HMAC_256**, usage **Generate and verify MAC**.
2. Alias: `akwadona-tenant-<slug>-hmac`.
3. Tags: `Product=Akwadona`, `Tenant=<slug>`, `TenantId=T_<id>`, `Purpose=HmacSearchFields`.
4. Apply the standard HMAC key policy (root admin + deploy user management + Lambda role usage).
5. Add the new tenantId → HMAC key ARN to `tenantHmacKeys` in `akwadona-cdk-stack.ts`.
6. Add the same entry to `scripts/backfill-hash-search-fields.js` `TENANT_HMAC_KEYS`.
7. `cd akwadona-cdk && npx cdk deploy --require-approval never`.

##### Backfilling existing rows

When migrating data created before Step 4:

1. Add temporary `kms:Decrypt` (data keys) and `kms:GenerateMac` (HMAC keys) statements to both key policies for `hospital-deploy-user`.
2. `cd scripts && node backfill-hash-search-fields.js --dry-run`
3. If counts look right: `node backfill-hash-search-fields.js`
4. Remove the temporary policy statements.

The script is self-contained, handles missing-DEK / missing-tenant edge cases, and migrates locks atomically.

##### Adding a new searchable field

E.g. you want to add `nationalIdHash` for a non-Qatar passport number:

1. Update `_shared/crypto.js`'s `PATIENT_HASH_FIELDS` and `DOCTOR_HASH_FIELDS`.
2. `node scripts/sync-shared-helpers.js`.
3. (Optional) Add a new GSI in CDK for fast lookup.
4. Re-deploy CDK.
5. Run a focused backfill for that field.

---

#### What's NOT searchable

Fields that don't have a hash counterpart cannot be looked up by equality:

- `name` — partial matches don't work with hashing. Free-text search needs a different solution (Elasticsearch, OpenSearch). Out of scope.
- `medicalHistory`, `notes`, `diagnosis` — long-form text, never searchable via hash.
- `dob` — could be hashed if needed (low cardinality risk, but still possible).

For full-text PHI search (e.g. "find all patients with diabetes in their medicalHistory"), the recommended path is a separate **encrypted search index** with a CSE (client-side encryption) library on OpenSearch — out of scope for Step 4.

---

#### Verification checklist

1. **DynamoDB Explore items** → query the `emailHash-EntityType-index` with a known emailHash → expect to find the doctor's row. Same query with a random base64 string → expect zero rows.
2. **Add a new doctor in the app** → DDB → confirm `qidHash`, `emailHash`, `phoneHash` are present. Confirm lock rows exist with `PK = QID#<base64>`, no plaintext PHI in any partition key.
3. **Sign out, sign back in as the new doctor** → confirm login works → confirms `getDoctorByEmail` hash lookup is wired.
4. **As `hospital-deploy-user` from CLI:** `aws kms generate-mac --key-id arn:aws:kms:us-east-1:483176634665:key/601f8aab-... --mac-algorithm HMAC_SHA_256 --message "test" --region us-east-1` → expect `AccessDeniedException`. Save the output as Exhibit B in the compliance binder (next to the Step 3 GenerateDataKey denial as Exhibit A).
5. **CloudTrail** → every GenerateMac call is logged with the calling principal. Cross-reference: only Lambda execution role ARNs appear; no human IAM user shows up.

---

#### Open follow-ups

- **Backfill scribe / pharmacy / bloodbank PHI hashes** when those Lambdas get full encryption (Task #74).
- **Replace `email-index`** with `emailHash-EntityType-index` everywhere it's still referenced, then drop the legacy index in a coordinated CDK + backfill migration.
- **Step 5** — compliance docs (HIPAA / PDPPL / GDPR + BAA + DPA templates).
- **Step 6** — scalability proof under encryption + HMAC overhead.
- **Future: range-searchable encryption** (e.g. for DOB ranges) — current design only supports equality. Use an ORE library if needed.

## 6. Tenant isolation enforcement

#### What this is — easy English

- Akwadona is multi-tenant. Tiryaq Hospital, Alshifaa Hospital, and every future customer share the same Lambdas and the same DynamoDB table (the "bridge" model — same one Stripe Connect, Athenahealth, and Salesforce use).
- Step 2d already proved the user belongs to a tenant by reading the signed JWT (`tenantId` claim from the Cognito pre-token Lambda).
- Step 2d-4 closes the last gap: **every single row read or write is now also gated by `tenantId`**, not just the API call boundary.
- Result: even if a Tiryaq user steals or guesses an Alshifaa row id, the database itself refuses the request.

#### Why one tenant check is not enough — the leak we closed

- Old shape: Lambda reads `tenantId` from the JWT at the start, but then runs `GetCommand({ Key: { PK: 'PATIENT#xyz' } })` blindly. DynamoDB does not know which tenant the caller belongs to. It returns whatever row matches the key.
- An attacker who knows or guesses a row id from Tenant A → Lambda happily returns it.
- This is OWASP A01:2021 — Broken Access Control. The fix is mandatory for any HIPAA-grade SaaS.
- Same defense pattern as:
  - **Stripe** — every read carries `account_id` and is filtered server-side
  - **Athenahealth** — per-practice row guards on every PHI table
  - **Salesforce** — every row carries `Org-Id`; the multi-tenant query rewriter injects it into every SQL

#### The three defense layers (depth-in-depth)

1. **JWT entry guard** — Cognito-signed JWT carries `tenantId`. Rejects users where `tenantId` is missing or `UNASSIGNED`. Cannot be forged client-side. (Step 2d.)
2. **Application guard** (Step 2d-4 — new) — Before returning any row by id, the Lambda calls `assertRowTenant(row, callerTenantId)`. Mismatch → 404 (not 403, to hide existence).
3. **Database guard** (Step 2d-4 — new) — Every `UpdateCommand` / `DeleteCommand` carries `ConditionExpression: #tenantId = :__callerTenantId`. DynamoDB atomically rejects cross-tenant writes even under race conditions.

#### The shared helper — `_shared/tenant-guard.js`

Master copy at `akwadona-cdk/lambda/_shared/tenant-guard.js`. Synced by `scripts/sync-shared-helpers.js` into every target Lambda folder before `cdk deploy`.

Public API:

- `assertRowTenant(row, callerTenantId, opts?)` — read-side guard. Throws `Error` with `statusCode = 404` on mismatch. Sets `crossTenantAttempt = true` for server-side logging.
- `tenantCondition(callerTenantId)` — returns `{ ConditionExpression, ExpressionAttributeNames, ExpressionAttributeValues }` ready to merge into any DDB write.
- `mergeTenantCondition(existing, callerTenantId)` — combines tenant guard with any existing condition (e.g. `attribute_exists(PK)`) using AND.
- `throwAs404IfCrossTenant(err)` — translates DynamoDB `ConditionalCheckFailedException` to a 404.

#### Why 404 (not 403) — hide existence

- 403 leaks that the id exists somewhere on the platform.
- 404 makes "wrong tenant" identical to "doesn't exist anywhere".
- OWASP recommendation; matches Stripe / GitHub / Box patterns.

#### Per-Lambda matrix — what got wired

| Lambda | DDB calls | Tenant refs before | Tenant refs after | Notes |
|---|---|---|---|---|
| akwadona-bloodbank | 39 | 7 | 66 | Donors, donations, units, requests, crossmatches, issues — every row stamped + guarded |
| akwadona-pharmacy | 35 | 7 | 42 | Medications, inventory, dispense, POs, alerts — cross-domain reads (PATIENT/EXAM/MED) also tenant-checked |
| akwadona-examinations | 22 | 14 | 35 | **Fixed latent bug**: existing crypto calls referenced undefined `tenantId` (was `__tenantId`); renamed for consistency |
| akwadona-calendar | 16 | 6 | 25 | Calendars + events; cascade-delete also tenant-scoped |
| akwadona-scribe | 8 | 5 | 18 | Scribe sessions + audit rows; **fixed latent bug**: getTenant return value was discarded |
| akwadona-document-manager | 3 | 6 | 24 | No PHI rows in DDB — S3 key prefix rewritten to isolate listings per tenant |

#### Per-row stamping — every `Put` now carries `tenantId`

- Bloodbank: donors, donations, units, requests, crossmatches, issues
- Pharmacy: medications, inventory, dispense, purchase orders
- Examinations: exams, DOCTOR_PATIENT link rows
- Calendar: calendars, events
- Scribe: sessions, audit rows
- Document Manager: S3 object metadata (`tenant-id`)

#### List queries — every `Query` now filters by `tenantId`

- Every list endpoint adds `FilterExpression: 'tenantId = :tnt'` against the JWT-derived tenant id.
- Result: cross-tenant data cannot even be enumerated, let alone read.

#### Document Manager — S3 key format change (BREAKING for legacy files)

- **Old key**: `folder/<userId>/<timestamp>_<file>` → `/list?folder=lab-results` returned EVERY tenant's files. This was the worst leak in the codebase.
- **New key**: `folder/<tenantId>/<userId>/<timestamp>_<file>` → `/list` scopes to `folder/<callerTenantId>/`.
- **Backward compat**: download + delete recognize legacy keys (`folder/<userId>/...`) but only admin/developer roles can touch them. Logged as `legacy doc download` / `legacy doc delete` for forensics.
- **Migration job (todo)**: write a one-off script to rewrite legacy S3 keys into the new shape using the user's known tenant. After migration, drop the legacy branch.

#### Latent bugs uncovered + fixed

- **akwadona-examinations**: 7 calls to `encryptItem(..., tenantId)` referenced an undefined `tenantId` symbol (the variable was named `__tenantId`). Encryption likely worked because the helper tolerated undefined, but cross-tenant key separation was effectively broken. Fixed by renaming the variable.
- **akwadona-scribe**: router called `getTenant(event)` but discarded the return value. Throttle had to re-derive tenantId from claims as a fallback. Fixed by capturing properly.
- **akwadona-document-manager**: `/list` exposed every tenant's files. Fixed by switching the S3 key prefix to include `tenantId`.

#### What the helpers do at the wire level

##### Read path

```js
const row = (await ddb.send(new GetCommand({ ... }))).Item;
assertRowTenant(row, tenantId);  // throws 404 if row.tenantId !== tenantId
```

##### Write path

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

#### How to deploy

```powershell
### 1. Sync the shared helper into every target Lambda folder.
node scripts/sync-shared-helpers.js

### 2. Deploy backend only (no frontend changes in Step 2d-4).
powershell -ExecutionPolicy Bypass -File .\deploy.ps1 -BackendOnly

### 3. Confirm the per-Lambda code zips updated.
aws lambda get-function-configuration --function-name akwadona-bloodbank --query LastUpdateStatus
aws lambda get-function-configuration --function-name akwadona-pharmacy --query LastUpdateStatus
aws lambda get-function-configuration --function-name akwadona-examinations --query LastUpdateStatus
aws lambda get-function-configuration --function-name akwadona-calendar --query LastUpdateStatus
aws lambda get-function-configuration --function-name akwadona-scribe --query LastUpdateStatus
aws lambda get-function-configuration --function-name akwadona-document-manager --query LastUpdateStatus
```

#### How to verify (test plan)

1. **Smoke test** — sign in as the Tiryaq admin, list each module (Blood Bank, Pharmacy, Calendar, Documents, Consultations, Voice Scribe). Counts should match pre-deploy.
2. **Cross-tenant read** — get a row id from Tenant A (e.g. a donor id). Sign in as a Tenant B user. Try `GET /bloodbank/donors/<that-id>`. Expect 404.
3. **Cross-tenant write** — same probe via `PATCH /bloodbank/donors/<that-id>`. Expect 404 + a `cross-tenant attempt` warn line in CloudWatch.
4. **List isolation** — confirm `GET /pharmacy/inventory` from Tenant B does NOT include Tenant A's medications.
5. **Document list** — `GET /documents/list?folder=lab-results` returns only Tenant B's uploads.
6. **Legacy doc access** — pre-2d-4 file should be 404 to a non-admin, downloadable by an admin, with a `legacy doc download` warn line in CloudWatch.

#### Watch list (open backlog)

- Migration job for legacy S3 keys → new tenant-prefixed shape; drop legacy branch.
- Apply the same pattern to the remaining smaller Lambdas (admin-panel cross-domain reads, audit reader).
- Premium isolation tier (silo per tenant) — separate DDB table + Lambda alias per tenant for customers who require it.
- Hardened operator IAM — explicit DENY on `kms:Decrypt` for operator role so even an SDK call cannot fetch PHI.

#### References

- OWASP Top 10 2021 — A01:2021 Broken Access Control
- AWS DynamoDB Multi-Tenant Patterns (re:Invent DAT328)
- Stripe Connect platform isolation (every API call carries `account_id`)
- Athenahealth Practice Bridge — per-practice row guards
- Salesforce Multi-Tenant Architecture — Org-Id row filter at the query rewriter

## 7. Threat model (STRIDE summary)

| Threat | Example | Primary control | Residual risk |
|---|---|---|---|
| Spoofing | Forged / replayed JWT | JWT authorizer (signature, issuer, audience, expiry) | Token theft via XSS — SI-5, R-07, R-08 |
| Tampering | Modified ciphertext; edited audit | AES-GCM tags; Object Lock | — |
| Repudiation | "I never deleted that" | AUDIT# rows + CloudTrail | Application read audit partial (R-09) |
| Information disclosure | Cross-tenant read; operator reading PHI; stolen backup | AC-3, AC-5, SC-2 | Platform-key compromise would expose storage-layer encryption (not field encryption) |
| Denial of service | Flood; KMS quota exhaustion | SC-8; DEK cache + concurrency cap | WAF disabled (R-05) |
| Elevation of privilege | Pharmacist calling admin routes; body-smuggled role | AC-2; claims only from JWT | — |

## 8. Security testing

Attack-style regression tests for the live API and site. Plain Node 18+, no
dependencies. Two sets:

| Set | Runs against | Side effects | Command |
|---|---|---|---|
| **safe/** | Production is fine | None — GET / OPTIONS / unauthenticated POST (rejected by API Gateway before any Lambda runs) | `node scripts/security-tests/run-safe.js` |
| **destructive/** | **Dev stack only** | Creates + deletes rows, floods the API, attempts privileged writes | `node scripts/security-tests/run-all.js --i-understand-this-mutates-data` |

`run-all.js` refuses to start unless `API_BASE` is set to a non-production API
and the acknowledgement flag is passed.

#### What each file attacks

| File | Attack class | Proves |
|---|---|---|
| `safe/01-tls-and-headers.js` | Transport | HTTP→HTTPS redirect; HSTS, nosniff, X-Frame-Options, Referrer-Policy; TLS 1.0/1.1 rejected on site and API; no server banner leak |
| `safe/02-unauthenticated.js` | Auth bypass | 45 routes × no token → 401; forged signature, expired, `alg=none`, token-in-query, token-in-cookie all → 401; junk Authorization never 5xx |
| `safe/03-cors.js` | Cross-origin | Allow-list echoes exact origin (never `*`); six look-alike origins get nothing; credentials off; unknown request header rejected; documents bucket CORS |
| `safe/04-enumeration.js` | Enumeration | 11 non-existent IDs → 404 not 403; foreign-tenant-shaped id → 404; Cognito ForgotPassword/InitiateAuth do not reveal user existence |
| `safe/05-injection-readonly.js` | Injection | 19 payloads × 14 GET endpoints (266 combos): zero 5xx, no DynamoDB/stack internals leaked, no foreign-tenant row returned; unknown sortField ignored; pageSize clamped |
| `safe/06-method-and-path.js` | Protocol | PUT/TRACE/HEAD/CONNECT/PROPFIND → 4xx; 16 KB query string → 4xx; five path-traversal shapes → 401/404; XML / empty / malformed JSON body → 4xx |
| `destructive/10-cross-tenant-crud.js` | IDOR | Tenant A creates patient / appointment / donor; tenant B GET/PATCH/DELETE → 404; B's list excludes it; A's row unchanged; A cleans up |
| `destructive/11-role-escalation.js` | Privilege | Doctor cannot POST/DELETE departments or specializations (403); cannot reach `/admin/*` or `/operator/*`; body-smuggled `tenantId`/`role` ignored; `?doctorEmail=` ignored |
| `destructive/12-rate-limit.js` | DoS | 400 parallel GETs → some 429 with `Retry-After`, no 5xx |
| `destructive/13-payload-and-documents.js` | Resource abuse / traversal | 7 MB body → 413; 5,000-deep JSON → 4xx; upload-url refuses traversal / foreign prefix / NUL / 2 KB names; download-url for foreign key → 404; pre-signed URL cannot be re-pointed |

#### Credentials

Set as environment variables only — never commit them.

```powershell
### Read-only checks that need a login (04, 05, part of 06):
$env:AKWADONA_USERNAME = 'admin1'
$env:AKWADONA_PASSWORD = '<from Secrets Manager /akwadona/seed-users/admin1>'

### Destructive set additionally needs a user in a DIFFERENT tenant and a Doctors-group user:
$env:AKWADONA_B_USERNAME = '...'      ; $env:AKWADONA_B_PASSWORD = '...'
$env:AKWADONA_DOCTOR_USERNAME = '...' ; $env:AKWADONA_DOCTOR_PASSWORD = '...'
```

Use the accounts from `AKW-EH-10-Engineering-Handbook.md`. Do not use a real clinician's account.

#### Reading the output

```
── 02 Unauthenticated access ──
[  ok  ] All 45 routes return 401 with no token
[  ok  ] Forged JWT (bad signature) → 401
[ FAIL ] alg=none JWT → 401  — status=200      ← this would be a critical finding
   6 passed, 1 failed, 0 skipped
```

Exit code 0 = everything passed. Any `FAIL` is a real finding — open an
incident per `AKW-IRP-09-Incident-Response-Plan.md` if it is on production.

#### Adding a test

Each file exports `async function run(ctx) → Report`. `ctx` carries
`apiBase`, `siteBase`, `documentsBucketUrl`, and `sessions.{a,b,doctor}`
(each `{ accessToken, idToken, claims }` or `null`). Use `r.expect(name,
condition, detail)`; use `r.skip(...)` when a precondition (like a session)
is missing rather than failing.

Keep a test in `safe/` only if it is **provably read-only against production**.
If in doubt it goes in `destructive/`.

#### Schedule it

Running `run-safe.js` nightly (GitHub Actions, a Windows Task Scheduler job,
or an EventBridge-triggered Lambda once the stack is split — see
`AKW-SAD-02-Solution-Architecture-Document.md` §9) turns this from a one-off audit
into the "automated nightly isolation probe" the sales handbook promises.

## 9. Known gaps and plan of action (POA&M)

| ID | Gap | Risk | Owner | Target |
|---|---|---|---|---|
| R-03 | MFA optional, not required for Operator/Admin | Phishable admin credentials | Founder | After enrolment — Q4 2026 |
| R-05 | WAF edge stack disabled | No managed-rule filtering at the edge | Founder | On third tenant or stack split |
| R-06 | Isolation probe and attack suite run by hand | Regression goes unnoticed | Engineering | GitHub Actions nightly — this quarter |
| R-07 | No Content-Security-Policy header | Larger XSS blast radius | Engineering | After stack split |
| R-08 | Tokens in `localStorage` | XSS → token theft | Engineering | Evaluate httpOnly cookie exchange after R-07 |
| R-09 | Application-level PHI read audit incomplete | Weaker "who viewed" evidence | Engineering | Add read-audit rows on GET single-item routes |
| R-10 | No malware scanning on document uploads | Stored malware served to staff | Engineering | GuardDuty Malware Protection for S3 |
| R-11 | DR runbook never drilled | Unknown real RTO | Operations | Quarterly drill — first in Q1 2027 |
| R-12 | No independent penetration test | Unvalidated controls | Founder | Q4 2026 |
| R-13 | No AWS Config / GuardDuty / Security Hub | No continuous posture monitoring | Operations | After stack split |

Full register with likelihood/impact scoring: AKW-RR-12.

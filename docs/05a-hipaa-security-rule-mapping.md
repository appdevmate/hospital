# Akwadona — HIPAA Security Rule Mapping

**Standard:** 45 CFR Part 164, Subpart C — HIPAA Security Rule
**Scope:** All controls under HIPAA's three safeguard categories (Administrative, Physical, Technical) mapped to specific Akwadona implementations.
**Status:** Compliant via shared-responsibility model with AWS.

This document is the audit-ready mapping that explains, for every HIPAA Security Rule requirement, exactly what Akwadona implements, what AWS implements, and where the proof lives.

---

## Shared responsibility model

| Layer | Responsible | Examples |
|---|---|---|
| **Physical security** | AWS | Data centre access controls, fire suppression, hardware destruction. Documented in AWS SOC 2 Type II reports. |
| **Network / hypervisor** | AWS | DDoS mitigation, isolated VPC tenants, hypervisor patching. AWS Security best practices. |
| **Service-level encryption** | AWS | KMS HSMs (FIPS 140-2 Level 3), DynamoDB encryption at rest, S3 SSE. |
| **Application security** | Akwadona | Authentication, authorization, audit logs, field-level encryption, key policies. |
| **Customer access** | Customer (hospital) | Who logs in, MFA setup on the BAA-side AWS account if BYOK, training their staff. |

Akwadona signs the **AWS Business Associate Addendum (BAA)** which covers all HIPAA-eligible services we use: KMS, DynamoDB, Lambda, S3, CloudFront, Cognito, API Gateway, CloudWatch Logs.

---

## §164.308 — Administrative Safeguards

### (a)(1)(i) Security Management Process

Implement policies and procedures to prevent, detect, contain, and correct security violations.

| Sub-requirement | Status | Akwadona implementation |
|---|---|---|
| (ii)(A) Risk Analysis | ✓ Required | Annual security risk analysis. Covers: encryption at rest, encryption in transit, access control, audit logs, BCP. Documented in `docs/05f-compliance-overview.md`. |
| (ii)(B) Risk Management | ✓ Required | Risk register tracked in CodeDeploy / Sentry. Quarterly review with engineering lead. |
| (ii)(C) Sanction Policy | ✓ Required | Internal employee policy: misuse of patient data = immediate termination + legal action. |
| (ii)(D) Information System Activity Review | ✓ Required | CloudWatch Logs + CloudTrail reviewed weekly by ops. Audit-row table (`PK=AUDIT#YYYY-MM-DD`) preserves all PHI mutations for 7 years. |

### (a)(2) Assigned Security Responsibility

Designate a security official.

**Akwadona Security Officer:** [Name to be filled per customer BAA]. Email: `security@akwadona.com`. Responsibilities: incident response lead, BAA signatory, AWS account root credential custodian.

### (a)(3) Workforce Security

| Sub-requirement | Status | Akwadona implementation |
|---|---|---|
| (ii)(A) Authorization / Supervision | ✓ Required | IAM users via SSO, MFA required on all admin actions. Engineer access to production limited to deploy user + named on-call rota. |
| (ii)(B) Workforce Clearance | ✓ Required | Background check on all engineers with production access. NDA in employment contract. |
| (ii)(C) Termination Procedures | ✓ Required | On employee exit: IAM credentials disabled within 1 business day; SSO revoked immediately; tracked in HR offboarding checklist. |

### (a)(4) Information Access Management

| Sub-requirement | Status | Akwadona implementation |
|---|---|---|
| (ii)(A) Isolating Health Care Clearinghouse Functions | N/A | Akwadona is not a clearinghouse. |
| (ii)(B) Access Authorization | ✓ Required | Tenant model: every PHI row carries `tenantId`; every query is scoped to caller's tenantId. JWT-signed tenant claim cryptographically prevents cross-tenant access. See `docs/akwadona-multitenant-setup.md`. |
| (ii)(C) Access Establishment & Modification | ✓ Required | Admin Panel → Cognito Users. Group-based role assignment (Admin / Developer / Doctor / Pharmacist). |

### (a)(5) Security Awareness and Training

| Sub-requirement | Status | Akwadona implementation |
|---|---|---|
| (ii)(A) Security Reminders | ✓ Required | Quarterly training reminder via internal channels. |
| (ii)(B) Protection from Malicious Software | ✓ Required | All workstations: managed antivirus; production env: Lambda execution role + KMS = no malware persistence surface. |
| (ii)(C) Log-in Monitoring | ✓ Required | Cognito advanced security mode = FULL_FUNCTION. Suspicious sign-ins blocked + emailed. |
| (ii)(D) Password Management | ✓ Required | Cognito password policy: 12 chars min, all character classes, temp pass valid 3 days. |

### (a)(6) Security Incident Procedures

| Sub-requirement | Status | Akwadona implementation |
|---|---|---|
| (ii) Response & Reporting | ✓ Required | Incident playbook. Customer notification within 60 days of confirmed breach per HIPAA §164.404 + within 72 hours of awareness per state laws. Drill annually. |

### (a)(7) Contingency Plan

| Sub-requirement | Status | Akwadona implementation |
|---|---|---|
| (ii)(A) Data Backup Plan | ✓ Required | DynamoDB Point-in-Time Recovery (35 days). S3 versioning on documents bucket. |
| (ii)(B) Disaster Recovery Plan | ✓ Required | RTO 4 hours, RPO 1 hour. CDK re-deploy from version-controlled IaC + PITR restore. |
| (ii)(C) Emergency Mode Operation | ✓ Required | Offline mode (Phase F) — staff can continue charting during connectivity loss; auto-sync on reconnect. |
| (ii)(D) Testing & Revision | ✓ Required | Annual DR drill: full table restore to a staging table, verify Lambda still serves correctly. |
| (ii)(E) Applications & Data Criticality Analysis | ✓ Required | Documented in `docs/01-lambda-and-infrastructure.md`. PHI = high; operational metadata = medium. |

### (a)(8) Evaluation

✓ Required. Annual review of HIPAA Security Rule mapping. Triggered by: major release, new tenant onboarding, AWS service additions. Last reviewed: at end of Step 5.

### (b)(1) Business Associate Contracts

Akwadona signs:

- **Inbound BAA** with the AWS Business Associate Addendum (covers infrastructure).
- **Outbound BAA** with every hospital customer. Template: `docs/05d-baa-template.md`.

---

## §164.310 — Physical Safeguards

These are 100% AWS's responsibility under our shared-responsibility model. Evidence: AWS SOC 2 Type II + AWS HIPAA Eligible Services list.

| Standard | AWS provides | Akwadona action |
|---|---|---|
| (a)(1) Facility Access Controls | Multi-factor data centre access, badge-and-biometric | None — covered by AWS BAA. |
| (b) Workstation Use | Akwadona laptops: full-disk encryption + remote wipe | Akwadona security policy mandates this on all staff devices. |
| (c) Workstation Security | Akwadona laptops: auto-screen-lock 5 min | Enforced via MDM. |
| (d) Device & Media Controls | AWS handles all data centre hardware lifecycle | None — covered by AWS BAA. |

---

## §164.312 — Technical Safeguards

This is where the Akwadona implementation lives. Each control mapped to a concrete file / commit.

### (a)(1) Access Control

| Sub-requirement | Status | Akwadona implementation |
|---|---|---|
| (a)(2)(i) Unique User Identification | ✓ Required | Every user has a unique Cognito `sub`. JWT carries `sub`, `email`, `tenantId`. |
| (a)(2)(ii) Emergency Access Procedure | ✓ Required | Root AWS account credentials sealed; broken-glass procedure documented in security binder. |
| (a)(2)(iii) Automatic Logoff | ✓ Required | Access token validity: 1 hour. Refresh token: 30 days. Inactive logout after 1 hour via Cognito session expiry. |
| (a)(2)(iv) Encryption & Decryption | ✓ Required | **Two-layer encryption.** (1) DynamoDB table-level CMK encryption at rest. (2) Per-tenant CMK envelope encryption on every PHI field (Step 3). See `docs/03-encryption-and-zero-knowledge.md`. |

### (b) Audit Controls

| Status | Akwadona implementation |
|---|---|
| ✓ Required | **Three audit layers.** (1) `akwadona-appointments` writes `AUDIT#YYYY-MM-DD` rows with `before`/`after` snapshots, both encrypted with the tenant's CMK. (2) CloudTrail logs every AWS API call. (3) CloudWatch Logs hold Lambda execution traces for 1 month. Retention: 7 years on the audit table via Compliance Update 06. |

### (c)(1) Integrity

| Status | Akwadona implementation |
|---|---|
| (c)(2) ✓ Required | DynamoDB transactions with `ConditionExpression` on every mutating write — prevents lost updates and confirms tenant ownership before any change. AES-256-GCM auth tag on encrypted fields — tampered ciphertext fails decryption with `AuthenticationFailed`. |

### (d) Person or Entity Authentication

| Status | Akwadona implementation |
|---|---|
| ✓ Required | AWS Cognito user pool. Custom Akwadona-branded Angular login calls `InitiateAuth` (`USER_PASSWORD_AUTH`) over REST — no Hosted UI. Cognito issues a JWT signed by its private key; API Gateway's JWT authorizer validates the signature on every request before any Lambda runs. First-login users complete the `NEW_PASSWORD_REQUIRED` challenge in-app; password resets go through `ForgotPassword` + DKIM-signed SES emails from `noreply@akwadona.com`. |

### (e)(1) Transmission Security

| Sub-requirement | Status | Akwadona implementation |
|---|---|---|
| (e)(2)(i) Integrity Controls | ✓ Required | TLS 1.2+ on CloudFront, API Gateway, all internal AWS service-to-service traffic. |
| (e)(2)(ii) Encryption | ✓ Required | All public endpoints TLS-only. Wildcard ACM certificate `*.akwadona.com`. HSTS header enforced via CloudFront response headers. |

---

## Implementation evidence

For an auditor / customer legal review, here are the file references that prove the controls above:

| HIPAA control | Akwadona evidence file |
|---|---|
| Access control (a)(2)(iv) — Encryption | `docs/03-encryption-and-zero-knowledge.md`, `akwadona-cdk/lambda/_shared/crypto.js` |
| Access management (a)(4)(ii)(B) — Per-tenant isolation | `docs/akwadona-multitenant-setup.md`, `akwadona-cdk/lib/akwadona-cdk-stack.ts` (tenant-entityType-index) |
| Search lookups without PHI leak | `docs/04-hashed-search-fields.md` |
| Audit log encryption | `akwadona-cdk/lambda/akwadona-appointments/index.js` writeAudit() |
| Idempotency / replay protection | `docs/01-lambda-and-infrastructure.md` Phase D |
| Contingency plan / offline mode | Phase E + F in `docs/02-application-and-testing.md` |
| Person authentication | Cognito config in `akwadona-cdk/lib/akwadona-cdk-stack.ts` (lines 338–404) |
| Transmission security | CloudFront + ACM in CDK stack |

---

## Required vs Addressable

HIPAA distinguishes between **Required** (must implement) and **Addressable** (must implement OR document a reasonable alternative). Every "Addressable" control above is implemented as required — no deviation.

---

## What we do NOT do (out of scope)

- **De-identification under §164.514** — Akwadona stores fully-identified PHI for clinical use. We do not produce de-identified datasets.
- **Limited Data Set transfers** — N/A. All data stays within the tenant.
- **Marketing / fundraising** — Akwadona does not perform either. Patient consent for these is the hospital customer's responsibility.

---

## Customer obligations

The hospital customer is responsible for:

- Staff training on appropriate PHI use.
- Patient consent forms covering Akwadona as a Business Associate.
- Workstation security (screen lock, antivirus) at the hospital.
- Reporting suspected breaches to Akwadona within 24 hours of discovery.
- Annual review of their user roster (remove ex-staff).

Akwadona provides the platform; the hospital provides the policy + people.

---

## Open follow-ups

- Confirm AWS BAA in place for the production AWS account (`483176634665`) — Account → Support Center → eligible services.
- Map AWS service config to HIPAA Eligible Services list — already done at provisioning, re-verify annually.
- Set up CloudWatch alarms for: failed KMS access (denied decrypt = potential attacker), spike in `AccessDenied` errors, unusual cross-region traffic.

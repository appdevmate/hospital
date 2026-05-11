# Tiryaq Hospital Platform — Current Compliance Status

**Document version:** 1.0
**Date:** 2026-04-29
**Status snapshot of:** `tiryaq-cdk/lib/tiryaq-cdk-stack.ts` and supporting Lambdas, prior to any compliance hardening.
**Companion to:** `01-Qatar-GCC-Compliance-Master.md`

---

## How to read this document

This document is split into two clearly separated sections:

- **Section A — WHAT IS COMPLIANT (already in place).** Items the existing Tiryaq codebase already satisfies, with the specific code location.
- **Section B — WHAT IS MISSING (gaps to close).** Items that PDPPL / MOPH / NCSA expect but Tiryaq does not yet implement, with severity and the planned update reference.

Each row is mapped to the obligation IDs from the master document's Section 5 matrix.

---

## Section A — What is compliant

### A.1 Encryption in transit ✅

| Control | Evidence |
|---------|----------|
| HTTPS-only frontend | `tiryaq-cdk-stack.ts:581` — `viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS` |
| TLS-only API | API Gateway HTTP API enforces TLS 1.2+ by default |
| Cognito JWT over HTTPS | `tiryaq-cdk-stack.ts:483` — JWT issuer is HTTPS Cognito endpoint |

**Mapped obligation:** Matrix row 3.

### A.2 Encryption at rest (baseline AWS-managed keys) ✅ (partial)

| Control | Evidence |
|---------|----------|
| DynamoDB encryption | AWS-managed KMS by default. Will be upgraded to CMK in Update 03. |
| S3 encryption | SSE-S3 (AES-256) by default since 2023. Will be upgraded to CMK in Update 03. |

**Mapped obligation:** Matrix row 2 — *baseline only; upgrade pending.*

### A.3 Authentication and identity ✅

| Control | Evidence |
|---------|----------|
| Cognito User Pool | `tiryaq-cdk-stack.ts:179-200` |
| JWT authorizer on every API route | `tiryaq-cdk-stack.ts:483-503` |
| Pre-token Lambda for actor identity | `tiryaq-cdk-stack.ts:239-258` — stamps email and name into access token |
| Token validity 1h, refresh 30d | `tiryaq-cdk-stack.ts:216-218` |
| `preventUserExistenceErrors: true` | `tiryaq-cdk-stack.ts:219` — prevents user enumeration |

**Mapped obligation:** Matrix row 4 (partial — MFA and password strength still missing).

### A.4 Role-based access control ✅

| Control | Evidence |
|---------|----------|
| Four named groups | `tiryaq-cdk-stack.ts:226` — `Admin`, `Developers`, `Doctors`, `Pharmacists` |
| Bracket-stripping convention | Documented in CLAUDE.md and applied in Lambda handlers |
| AdminPanel scoped IAM | `tiryaq-cdk-stack.ts:366-371` — only adminPanelFn has Cognito admin permissions |

**Mapped obligation:** Matrix row 5.

### A.5 Application-layer audit trail ✅

| Control | Evidence |
|---------|----------|
| Dedicated audit Lambda | `tiryaq-cdk-stack.ts:317` — `tiryaq-audit` Lambda |
| Audit endpoint | `tiryaq-cdk-stack.ts:559` — `GET/POST /audit` |
| Admin audit endpoint | `tiryaq-cdk-stack.ts:543` — `GET /admin/audit` |
| Actor identity in JWT | Pre-token Lambda ensures every audit row can attribute the actor |

**Mapped obligation:** Matrix row 6.

### A.6 Backup and recovery (basic) ✅

| Control | Evidence |
|---------|----------|
| DynamoDB Point-in-Time Recovery | `tiryaq-cdk-stack.ts:132` — `pointInTimeRecoveryEnabled: true` (35-day window) |
| Removal policy RETAIN on critical resources | Lines 131, 199, 568 |

**Mapped obligation:** Matrix row 13 — *PITR present; long-term archive vault still missing.*

### A.7 Public access controls ✅

| Control | Evidence |
|---------|----------|
| S3 bucket fully private | `tiryaq-cdk-stack.ts:567` — `BlockPublicAccess.BLOCK_ALL` |
| CloudFront OAC binding | `tiryaq-cdk-stack.ts:572-574` — origin can only be reached via CloudFront |
| Strict bucket policy | `tiryaq-cdk-stack.ts:593-604` — restricts to specific distribution ARN |

**Mapped obligation:** Matrix rows 5 and 15 (partial).

### A.8 Storage of clinical documents (S3 design) ✅

| Control | Evidence |
|---------|----------|
| Pre-signed URL pattern | `tiryaq-cdk-stack.ts:558` — `/documents/{documentId}/presign` |
| Centralized document Lambda | `tiryaq-cdk-stack.ts:316` — `tiryaq-document-manager` |

**Mapped obligation:** Matrix row 5 (object-level access control).

---

## Section B — What is missing

Severity scale:
- 🔴 **Blocker** — must be fixed before any production / MOPH submission.
- 🟠 **High** — required for full PDPPL/MOPH compliance; fix within first hardening sprint.
- 🟡 **Medium** — good practice; required for NCSA NIA and SaaS scale.
- 🔵 **Process** — non-code; legal, contractual, or operational.

### B.1 Region not pinned 🔴

| Issue | Detail |
|-------|--------|
| Code location | `tiryaq-cdk-stack.ts:99` — no `env.region` set on the stack |
| Risk | Stack inherits region from `cdk deploy` shell. PHI can be deployed to any region (including US) by accident. |
| Required state | Stack pinned to `me-south-1` (Bahrain) for Qatar workloads. |
| Update | **Update 01** |

**Mapped obligation:** Matrix row 1.

### B.2 CORS allows all origins 🔴

| Issue | Detail |
|-------|--------|
| Code location | `tiryaq-cdk-stack.ts:491` — `allowOrigins: ['*']` |
| Risk | Any website on the internet can call the Tiryaq API from a browser. CSRF / data-exfiltration vector. |
| Required state | Allow only the production CloudFront domain plus localhost:4200 for dev. |
| Update | **Update 01** |

**Mapped obligation:** Matrix row 5.

### B.3 Cognito password policy too weak 🟠

| Issue | Detail |
|-------|--------|
| Code location | `tiryaq-cdk-stack.ts:191-197` — minLength 8, no symbols required |
| Risk | Brute-force / credential-stuffing attacks. Below MOPH/NCSA expectations for clinical access. |
| Required state | minLength 12, symbols required, history check. |
| Update | **Update 02** |

**Mapped obligation:** Matrix row 4.

### B.4 MFA not enforced 🟠

| Issue | Detail |
|-------|--------|
| Code location | Cognito User Pool definition `tiryaq-cdk-stack.ts:179-200` — `mfa` parameter not set (defaults to OFF). |
| Risk | A leaked password gives full clinical-system access. |
| Required state | MFA REQUIRED with TOTP and SMS as second factors, enforced for every group. |
| Update | **Update 02** |

**Mapped obligation:** Matrix row 4.

### B.5 No customer-managed KMS keys 🟠

| Issue | Detail |
|-------|--------|
| Code location | DynamoDB and S3 use AWS-managed default keys. |
| Risk | No control over key rotation, no central audit of key usage, key cannot be revoked under our control. |
| Required state | Two CMKs (data and audit) with annual rotation, key policy granting Lambda execution roles. |
| Update | **Update 03** |

**Mapped obligation:** Matrix row 2.

### B.6 No WAF on CloudFront 🟠

| Issue | Detail |
|-------|--------|
| Code location | `tiryaq-cdk-stack.ts:576-591` — Distribution has no `webAclId`. |
| Risk | No filtering of OWASP Top-10 attack patterns reaching the API. |
| Required state | WAFv2 with AWS managed Common, Known-Bad-Inputs, SQLi rule sets, and a per-IP rate limit. |
| Update | **Update 04** |

**Mapped obligation:** Matrix row 15. |

### B.7 No CloudTrail organization trail 🟠

| Issue | Detail |
|-------|--------|
| Code location | Not present in the stack. |
| Risk | No tamper-evident record of AWS API calls (who created an IAM user, who deleted a table, etc.). |
| Required state | Multi-region CloudTrail trail with log file validation, S3 destination with Object Lock. |
| Update | **Update 04** |

**Mapped obligation:** Matrix row 7.

### B.8 No dedicated audit log bucket 🟠

| Issue | Detail |
|-------|--------|
| Code location | Application audit goes to DynamoDB; no immutable storage. |
| Risk | A compromised admin could delete audit history. PDPPL requires tamper-evident audit. |
| Required state | Separate S3 bucket with versioning + Object Lock (compliance mode), 7-year retention. |
| Update | **Update 04** |

**Mapped obligation:** Matrix rows 6, 7. |

### B.9 Hardcoded passwords in seed Lambda 🔴

| Issue | Detail |
|-------|--------|
| Code location | `tiryaq-cdk-stack.ts:433-440` — eight users with `Admin@1234`, `Permanent: true`. |
| Risk | Identical, weak credentials known to anyone with code-read access. Cannot be presented to MOPH or any auditor. |
| Required state | Random per-user temp password generated at deploy, written to AWS Secrets Manager, force-change on first login. |
| Update | **Update 05** |

**Mapped obligation:** Matrix rows 4, 18.

### B.10 No data classification on records 🟡

| Issue | Detail |
|-------|--------|
| Code location | DynamoDB items have no `dataClass` attribute. |
| Risk | In a breach, scoping which records are PHI vs PII vs public is manual. |
| Required state | Every item has `dataClass ∈ {PHI, PII, PUBLIC, AUDIT}`. New GSI on `dataClass` for breach scans. |
| Update | **Update 06** |

**Mapped obligation:** Matrix row 12.

### B.11 No retention TTL 🟡

| Issue | Detail |
|-------|--------|
| Code location | DynamoDB table has no `timeToLiveAttribute`. |
| Risk | Transient data (sessions, idempotency keys, locks) accumulates indefinitely — violates PDPPL Art. 7 (storage limitation). |
| Required state | TTL attribute `expiresAt`, used for ephemeral records. Long-term records governed by documented retention table. |
| Update | **Update 06** |

**Mapped obligation:** Matrix row 11.

### B.12 No S3 versioning + lifecycle 🟡

| Issue | Detail |
|-------|--------|
| Code location | `tiryaq-cdk-stack.ts:566-570` — bucket has no `versioned: true`, no lifecycle policy. |
| Risk | Object overwrites cannot be recovered. No archival to cheap storage. |
| Required state | Versioning ON, lifecycle: noncurrent versions to Glacier after 90 days, expire after 7 years. |
| Update | **Update 06** |

**Mapped obligation:** Matrix rows 11, 13.

### B.13 No multi-tenancy in data model 🟠

| Issue | Detail |
|-------|--------|
| Code location | DynamoDB items use `PK: PATIENT#{id}` — no tenant prefix. |
| Risk | Cannot run multiple clinics on a single deployment. Cross-tenant data leakage if not addressed before SaaS launch. |
| Required state | `tenantId` Cognito custom attribute, `PK: TENANT#{tid}#PATIENT#{id}` partition pattern, deny-by-default cross-tenant queries in Lambda. |
| Update | **Deferred — large refactor; requires its own design doc.** |

**Mapped obligation:** Matrix row 14.

### B.14 No breach-notification pipeline 🟡

| Issue | Detail |
|-------|--------|
| Code location | Not present. |
| Risk | Cannot meet 72-hour breach notification SLA reliably without automation. |
| Required state | EventBridge rules on GuardDuty, Security Hub, Cognito anomaly events → SNS → Slack + email. |
| Update | **Deferred to Phase 2 hardening.** |

**Mapped obligation:** Matrix row 8.

### B.15 No on-demand backup vault 🟡

| Issue | Detail |
|-------|--------|
| Code location | Only PITR (35 days) is enabled. |
| Risk | Long-term archival not satisfied. PDPPL retention may exceed 35 days. |
| Required state | AWS Backup vault, daily plan, 7-year retention. |
| Update | **Deferred to Phase 2 hardening.** |

**Mapped obligation:** Matrix row 13.

### B.16 No VPC + endpoints 🔵

| Issue | Detail |
|-------|--------|
| Code location | Lambdas are not VPC-bound; DynamoDB traffic goes via the public AWS network. |
| Risk | MOPH auditors typically prefer private connectivity for PHI workloads. |
| Required state | VPC with private subnets, VPC endpoints for DynamoDB, S3, Cognito IDP, Secrets Manager. |
| Update | **Deferred — adds Lambda cold-start cost; evaluate after MOPH feedback.** |

**Mapped obligation:** Matrix rows 2, 5.

### B.17 Process / contractual gaps 🔵

| Item | Status |
|------|--------|
| AWS Enterprise Agreement DPA | To confirm |
| Sub-processor list maintained | Not yet |
| Documented retention schedule | Not yet |
| Patient consent UI flow | Not yet |
| Data subject request workflow | Not yet |
| Incident response runbook | Not yet |
| Annual penetration test | Not yet |
| Privacy impact assessment template | Not yet |

**Mapped obligation:** Matrix rows 17, 18, 21–25.

---

## Summary table

| Severity | Count | Items |
|----------|-------|-------|
| 🔴 Blocker | 3 | B.1, B.2, B.9 |
| 🟠 High | 6 | B.3, B.4, B.5, B.6, B.7, B.8, B.13 |
| 🟡 Medium | 5 | B.10, B.11, B.12, B.14, B.15 |
| 🔵 Process | 2 | B.16, B.17 |

**Compliance updates planned (code):** 6 — see `updates/` directory.
**Compliance work deferred:** Multi-tenancy refactor (B.13), breach pipeline (B.14), backup vault (B.15), VPC (B.16), and all process/contractual items (B.17).

---

## Document control

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | 2026-04-29 | Sami Taha | Initial issuance |

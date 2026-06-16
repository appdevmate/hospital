# Akwadona — Compliance Overview

This is the master compliance reference for Akwadona. It is the single document a hospital's compliance team or an external auditor should start with. Detailed implementation lives in the linked documents.

**Status:** Production. Compliant with HIPAA (US), PDPPL (Qatar), and GDPR (EU).

---

## 1. What Akwadona is

Akwadona is a cloud-hosted hospital management platform. It stores and processes Protected Health Information (PHI) on behalf of hospital customers. Each customer is a separate **tenant** with cryptographically-isolated data, separate KMS encryption keys, and separate HMAC keys for search.

| Role | Akwadona | Customer (hospital) |
|---|---|---|
| GDPR | Processor (Art. 4(8)) | Controller (Art. 4(7)) |
| HIPAA | Business Associate | Covered Entity |
| PDPPL Qatar | Data Processor | Data Controller |

---

## 2. Regulatory regimes covered

| Regime | Primary instrument | Akwadona document |
|---|---|---|
| **HIPAA** Security Rule (US) | 45 CFR Part 164 Subpart C | `05a-hipaa-security-rule-mapping.md` |
| **PDPPL** Qatar | Law No. 13 of 2016 + NCSA NIA + MOPH guidance | `05b-pdppl-qatar-compliance.md` |
| **GDPR** EU | Regulation (EU) 2016/679 | `05c-gdpr-compliance-and-dpia.md` |
| **HIPAA BAA** template | 45 CFR §164.504(e) | `05d-baa-template.md` |
| **GDPR DPA** template | GDPR Art. 28(3) | `05e-dpa-template.md` |

---

## 3. Security control summary

| Control | Status | Where to verify |
|---|---|---|
| Encryption at rest | ✓ Two layers — DynamoDB table CMK + per-tenant field-level CMK (AES-256-GCM, envelope) | `03-encryption-and-zero-knowledge.md` |
| Encryption in transit | ✓ TLS 1.2+ end-to-end | CloudFront + API Gateway configs |
| Searchable PHI | ✓ HMAC-SHA256 via per-tenant KMS HMAC keys | `04-hashed-search-fields.md` |
| Tenant isolation | ✓ Cryptographic — different KMS keys, indexed per tenant, three-layer Lambda enforcement | `akwadona-multitenant-setup.md` |
| Authentication | ✓ AWS Cognito, OAuth 2.0, MFA-eligible | `01-lambda-and-infrastructure.md` |
| Authorization | ✓ Tenant claim in JWT + role-based gating in every Lambda | `akwadona-multitenant-setup.md` |
| Audit logging | ✓ Encrypted before/after snapshots, 7-year retention | `tiryaq-cdk/lambda/tiryaq-appointments/index.js` writeAudit() |
| Backup & recovery | ✓ DynamoDB PITR (35 days), S3 versioning, KMS deletion window | `01-lambda-and-infrastructure.md` |
| Vulnerability management | ✓ Code review on every release, AWS-managed runtime patching | Internal review process |
| Workforce training | ✓ Annual data-protection training | HR onboarding checklist |
| Incident response | ✓ 48h/72h notification playbook | Section 6 of this doc |

---

## 4. The zero-knowledge proof

The strongest claim Akwadona makes to customers:

> "Akwadona cannot read your patients' data. Not because we promise not to — because mathematically we cannot."

The proof in one paragraph:

Every PHI field is encrypted with a per-tenant KMS Customer-Managed Key. The decrypt permission on each key is granted ONLY to Lambda execution roles (via a key-policy condition matching `TiryaqCdkStack-*ServiceRole*`). No human IAM principal — including Akwadona engineers, the deploy user, or even the AWS account root in day-to-day operation — has decrypt. CloudTrail records every Decrypt call with the calling principal. Any human-principal decrypt would be visible and trigger immediate investigation.

Empirical exhibits in the compliance binder:

- **Exhibit A:** `aws kms generate-data-key` as `hospital-deploy-user` → AccessDenied. Saved log proves the data-key policy excludes humans.
- **Exhibit B:** `aws kms generate-mac` as `hospital-deploy-user` → AccessDenied. Saved log proves the HMAC-key policy excludes humans.
- **Exhibit C:** DynamoDB Explore items screenshot showing `"name": "AQICAH..."` ciphertext on a patient row. Even reading the database directly returns unreadable bytes.
- **Exhibit D:** CloudTrail event showing a successful Decrypt by a Lambda role serving an authenticated customer user.

This stack of evidence is what regulators, customer legal teams, and (if it ever comes to it) journalists will want to see.

---

## 5. Implementation evidence map

For each compliance requirement, the file that proves it:

| Requirement | Evidence file |
|---|---|
| Architecture overview | `01-lambda-and-infrastructure.md` |
| Multi-tenant isolation | `akwadona-multitenant-setup.md` |
| Per-tenant encryption | `03-encryption-and-zero-knowledge.md` |
| Searchable PHI without leak | `04-hashed-search-fields.md` |
| HIPAA control mapping | `05a-hipaa-security-rule-mapping.md` |
| PDPPL control mapping | `05b-pdppl-qatar-compliance.md` |
| GDPR + DPIA | `05c-gdpr-compliance-and-dpia.md` |
| BAA template | `05d-baa-template.md` |
| DPA template | `05e-dpa-template.md` |
| Application & user workflows | `02-application-and-testing.md` |

Code-level evidence:

- `tiryaq-cdk/lib/tiryaq-cdk-stack.ts` — infrastructure-as-code (tenant key maps, IAM policies, table schema, GSIs).
- `tiryaq-cdk/lambda/_shared/crypto.js` — envelope encryption + HMAC helper (the security primitives).
- `tiryaq-cdk/lambda/_shared/compliance.js` — data-class tagging + retention constants.
- Every `tiryaq-cdk/lambda/<name>/index.js` — application code that ties primitives to API endpoints.

---

## 6. Incident response playbook

### 6.1 Trigger sources

- CloudWatch alarm (KMS denial spike, login anomalies, error rate jump).
- Customer-reported suspicion.
- Internal security review finding.
- Third-party tip-off (researcher, journalist, regulator).

### 6.2 First 60 minutes — Contain

1. **Detect & confirm.** On-call engineer acknowledges within 15 minutes; verifies whether it's an actual incident or a false positive.
2. **Wake the security officer.** `security@akwadona.com` + phone tree.
3. **Snapshot evidence.** CloudTrail export for the last 7 days; DynamoDB PITR snapshot; affected Lambda logs to S3 archive.
4. **Containment moves** (only those clearly indicated by initial evidence):
   - Suspicious IAM user → disable.
   - Compromised Lambda → roll back to last known-good version.
   - KMS key suspected compromised → key rotation or pending-deletion (NOT immediate deletion).
   - Suspicious customer activity → suspend that tenant's API access via API Gateway throttling override.

### 6.3 First 24 hours — Scope

1. Identify the **count of affected data subjects** (patient rows touched, by tenantId).
2. Identify the **categories of data** affected (PHI vs metadata).
3. Identify the **root cause** via CloudTrail event reconstruction.
4. Identify whether **Unsecured PHI** was affected (HIPAA term — Unsecured means without proper encryption-at-rest or transit; Akwadona's normal posture is fully Secured, so most incidents are NOT Unsecured PHI events).

### 6.4 First 48 hours — Notify

- Notify each affected hospital customer in writing (their designated breach contact in the BAA/DPA).
- For GDPR breaches: notify within 72 hours of confirmed breach (Art. 33), supervisory authority + Controllers.
- For HIPAA breaches: notify each affected Covered Entity within 60 days of discovery (typically much sooner — Akwadona contractually commits to 48 hours).
- For PDPPL breaches: notify Compliance and Data Protection Department (CDP) within 72 hours.

### 6.5 First 7 days — Communicate publicly if required

- HIPAA: if 500+ individuals in any one state are affected, notify HHS + the media (45 CFR §164.408).
- GDPR: if "high risk to rights and freedoms" of data subjects, communicate to data subjects directly (via Controller hospital) — usually email and / or letter.
- Document the incident in a post-incident report.

### 6.6 First 30 days — Root cause + remediation

- Publish the post-incident report internally + summary to affected customers.
- Implement remediation in production (patch, IAM change, key rotation, etc.).
- Update the risk register, the DPIA, and this playbook.

### 6.7 Annual drill

- Tabletop exercise once per year.
- Real-system DR drill once per year.
- Lessons-learned report distributed.

---

## 7. Risk register summary

Full risks in `05c-gdpr-compliance-and-dpia.md` DPIA. Top risks:

| # | Risk | Residual | Owner | Mitigation |
|---|---|---|---|---|
| 1 | Unauthorised access by Akwadona staff | Low | CTO | KMS key policy excludes humans + CloudTrail anomaly detection |
| 2 | Stolen AWS credentials | Low | CTO | MFA + IAM principle of least privilege + key policy condition |
| 3 | Insider Lambda code modification | Medium | CTO | CI required-review + Lambda code signing (planned) |
| 4 | Cross-tenant data leak | Very low | CTO | Three-layer Lambda enforcement + per-tenant KMS keys |
| 5 | Loss of availability | Low–Medium | CTO | Multi-AZ + PITR + offline mode |
| 6 | KMS key accidental deletion | Low | CTO | 30-day deletion window + deletion-protection flag |
| 7 | Cross-border transfer regulatory change | Medium | CTO/Legal | SCCs in place + planned EU-region deployment |

---

## 8. Sub-processors

| Sub-processor | Role | Data location | Customer-facing notice |
|---|---|---|---|
| **Amazon Web Services, Inc.** (Northern Virginia) | Cloud infrastructure for non-EU customers | `us-east-1` | DPA Annex III |
| **Amazon Web Services EMEA SARL** (Luxembourg) | Cloud infrastructure for EU customers (when in-region deployment is offered) | `eu-central-1` / `eu-west-1` | DPA Annex III |

Any change to this list is communicated to customers 30 days in advance per DPA Section 6.4.

---

## 9. Contacts

| Role | Contact |
|---|---|
| Security incidents | `security@akwadona.com` |
| Data Protection Officer | `dpo@akwadona.com` |
| Compliance / legal | `legal@akwadona.com` |
| Customer support | per Master Services Agreement |

---

## 10. FAQ for customer legal / compliance teams

**Q: Can Akwadona staff read our patients' medical data?**
A: No. The decrypt permission is granted only to Lambda execution roles, never to Akwadona engineers or any IAM user. See "zero-knowledge proof" in Section 4 of this document.

**Q: What happens if your company is breached?**
A: A breached AWS console session, stolen IAM credentials, or compromised Lambda code cannot decrypt your patient data without also breaching the per-tenant KMS key policy. The key policy is itself an audited resource — any modification to expand decrypt permission is logged in CloudTrail and would trigger our security alarm. In a worst-case full-account breach, the attacker would have to (1) modify the key policy and (2) call decrypt — both leaving permanent CloudTrail records.

**Q: Where is our data stored?**
A: AWS region `us-east-1` (Northern Virginia, US) by default. EU customers can request `eu-central-1` (Frankfurt, DE) deployment. Both AWS regions are HIPAA-eligible.

**Q: Can we get a copy of all our data?**
A: Yes. We provide a JSON export of all your tenant's data on request, decrypted and in machine-readable format.

**Q: What happens when we terminate?**
A: Per BAA Section 8.3 / DPA Section 6.7 — you elect either return (JSON export within 60 days) or destruction (cryptographic shredding of your KMS key, written certification provided).

**Q: Can you certify to SOC 2, ISO 27001, HITRUST?**
A: AWS is SOC 2 Type II and ISO 27001 certified — Akwadona inherits the infrastructure layer. Akwadona itself is not yet independently SOC 2 certified; on the roadmap once revenue justifies the audit cost. HITRUST CSF is a future option for the US market.

**Q: What if a US court orders Akwadona to disclose patient data?**
A: We would receive the order, attempt to challenge under data-locality and patient-privacy grounds, and notify the affected Covered Entity (hospital) as legally permissible. In practice, we hold the encrypted data + the key material that can decrypt it; a court could compel us to use the key. The technical mitigation is BYOK (customer holds the key in their own AWS account), which is on our roadmap.

**Q: Can we audit you?**
A: Yes — once per calendar year on 30 days' notice per DPA Section 6.8 / BAA Section 7. We accept third-party certifications (AWS SOC 2, ISO 27001) as primary evidence to reduce the burden.

**Q: What is your breach notification SLA?**
A: 48 hours from awareness to notification to you. We commit to this contractually in both the BAA (Section 4.1) and DPA (Section 7.1).

**Q: Do you sell or share patient data?**
A: No. Explicitly prohibited in our DPA Section 6.1 and BAA Section 2.5.

**Q: Do you use AI on patient data?**
A: Yes for the Voice Scribe feature (transcribes consultations into SOAP notes). The model is Amazon Bedrock — Anthropic Claude, with the AWS Bedrock guarantee that data is not used for model training. The output is reviewed by a human doctor before being saved to the medical record (Art. 22 GDPR compliant).

---

## 11. Updates

This document is reviewed:

- After every major architecture change.
- Annually as part of the compliance review cycle.
- Within 7 days of any incident or regulatory change.

Last reviewed: **at end of Step 5**.
Next scheduled review: 12 months from above.

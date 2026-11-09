# Akwadona Hospital Platform — Compliance Controls Matrix

| Document control | |
|---|---|
| **Document ID** | AKW-CCM-06 |
| **Document type** | Compliance Controls Matrix (CCM) — regulatory requirement → implemented control → evidence; includes the Data Protection Impact Assessment (DPIA) |
| **Version** | 1.1 |
| **Status** | Approved |
| **Classification** | Confidential — auditor and customer DPO copy on request |
| **Owner** | Security Officer / DPO |
| **Approver** | Founder / CTO |
| **Effective date** | 2026-10-30 |
| **Review cycle** | Quarterly, and on any regulatory or control change |
| **Supersedes** | `archive/05f-compliance-overview.md`, `archive/05a-hipaa-security-rule-mapping.md`, `archive/05b-pdppl-qatar-compliance.md`, `archive/05c-gdpr-compliance-and-dpia.md` |
| **Related documents** | AKW-SSP-05 (the controls themselves), AKW-LGL-07 (BAA / DPA), AKW-IRP-09 (breach notification), AKW-RR-12 (open items) |

| Revision history | | | |
|---|---|---|---|
| **Version** | **Date** | **Author** | **Change** |
| 1.0 | 2026-10-30 | Platform team | Consolidated into the enterprise document set; control statements corrected to match the deployed stack (MFA optional, WAF disabled, two alarms, probe manual) |
| 1.1 | 2026-10-31 | Platform team | Added "This document answers" and "Abbreviations used in this document" blocks after document control |

## This document answers

1. Which regulations apply to us, and what is our overall compliance posture today — including what is not yet in place?
2. For each HIPAA Security Rule requirement, which control satisfies it and what evidence can an auditor inspect?
3. For each Qatar PDPPL article, the same.
4. For each GDPR article, the same — and what does the Data Protection Impact Assessment conclude?
5. What must we notify, to whom, and within how many hours, if there is a breach?

## Abbreviations used in this document

> **Why this table exists.** Every short form that appears anywhere in this document is listed here with (1) what the letters stand for and (2) what it means in plain words. If a term is not here and is not obvious, that is a documentation bug — add it. The complete glossary with examples and console links is AKW-SO-01 Appendix A.

| Abbreviation | Stands for | What it means |
|---|---|---|
| **ACM** | AWS Certificate Manager | Issues and renews the certificates that make a site show the HTTPS padlock. Free. |
| **AES** | Advanced Encryption Standard | The standard symmetric encryption algorithm. "AES-256" uses a 256-bit key. |
| **AI** | Artificial Intelligence | Software that performs tasks that normally need human judgement — here, turning a transcript into a clinical note. |
| **API** | Application Programming Interface | The set of URLs one program calls to use another program's features. Ours is a REST API. |
| **AWS** | Amazon Web Services | Amazon's cloud-computing platform. Everything Akwadona runs on it. |
| **AZ** | Availability Zone | One independent data centre inside an AWS region. A region has several, so one failing does not take the service down. |
| **BAA** | Business Associate Agreement | A contract required by the US health-privacy law HIPAA between a hospital and any company (like Akwadona) that handles patient data for it. It says how the data will be protected. |
| **BCP** | Business Continuity Plan | The plan for keeping the business running during a major disruption. |
| **BYOK** | Bring Your Own Key | Letting a customer supply their own encryption key. Related to our per-hospital keys. |
| **CCM** | Compliance Controls Matrix | A table that maps each rule in a law or standard to the specific thing we do to satisfy it, and the evidence an auditor can check. |
| **CDK** | Cloud Development Kit | AWS's tool for describing infrastructure in a programming language (we use TypeScript). It compiles to CloudFormation. |
| **CDP** | Continuous Data Protection | Backups that capture every change — DynamoDB PITR is one. |
| **CFR** | Code of Federal Regulations | The collection of US federal rules. "45 CFR §164" is the part that contains HIPAA's privacy and security rules. |
| **CI** | Continuous Integration | Automatically building and testing code on every change. |
| **CMK** | Customer Managed Key | A KMS encryption key that we create and control (as opposed to one AWS manages for us). |
| **CSF** | Cybersecurity Framework | NIST's high-level security framework (Identify, Protect, Detect, Respond, Recover). |
| **CTO** | Chief Technology Officer | The head of technology. |
| **DDB** | DynamoDB | Short form of DynamoDB, AWS's NoSQL database. |
| **DDoS** | Distributed Denial of Service | A DoS attack from many machines at once. |
| **DKIM** | DomainKeys Identified Mail | A cryptographic signature on outgoing e-mail proving it really came from the domain. |
| **DPA** | Data Processing Agreement | A contract required by the EU privacy law GDPR between a data controller (the hospital) and a data processor (Akwadona). It says what the processor may do with personal data. |
| **DPIA** | Data Protection Impact Assessment | A formal written risk review, required by GDPR, that a company does before processing personal data in a new way. |
| **DPO** | Data Protection Officer | The named person responsible for privacy compliance; required by GDPR for organisations that process health data at scale. |
| **DR** | Disaster Recovery / Document Register | Disaster Recovery: how we restore the system after a major failure. Document Register (AKW-DR-00): the master index of this documentation set. |
| **EH** | Engineering Handbook | The document-type code for the engineering handbook (AKW-EH-10). |
| **EMEA** | Europe, the Middle East and Africa | A common business region grouping. |
| **EU** | European Union | The political and economic union of 27 European countries. |
| **FAQ** | Frequently Asked Questions | A list of common questions and answers. |
| **FHIR** | Fast Healthcare Interoperability Resources | The modern standard for exchanging health data between systems. On our roadmap. |
| **FIPS** | Federal Information Processing Standard | US government standards for computer security. "FIPS 140-2 Level 3" is the certification level of the hardware that holds our encryption keys. |
| **GCC** | Gulf Cooperation Council | The six Gulf states: Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, Oman. |
| **GCM** | Galois/Counter Mode | A way of running AES that also detects tampering. We use AES-256-GCM. |
| **GDPR** | General Data Protection Regulation | The European Union's privacy law (2018). It gives people rights over their data and sets duties on companies that process it. |
| **GSI** | Global Secondary Index | A second way to look up rows in a DynamoDB table, by a different attribute. We have nine. |
| **HA** | High Availability | Designed to keep running when parts fail. |
| **HHS** | US Department of Health and Human Services | The US government department that enforces HIPAA. |
| **HIPAA** | Health Insurance Portability and Accountability Act | The US law that sets rules for protecting patients' health information. Its "Security Rule" lists the technical safeguards we must have. |
| **HITRUST** | Health Information Trust Alliance | A healthcare-specific security certification framework, common in the US. |
| **HL7** | Health Level Seven | An older family of healthcare data-exchange standards; FHIR is its latest generation. |
| **HMAC** | Hash-based Message Authentication Code | A fingerprint of a value computed with a secret key. Same value + same key = same fingerprint; different keys give different fingerprints. We use it to search encrypted fields. |
| **HR** | Human Resources | The department that manages staff. |
| **HSM** | Hardware Security Module | A tamper-proof physical device that holds encryption keys. KMS keys live in one. |
| **HSTS** | HTTP Strict Transport Security | A response header telling browsers to always use HTTPS for this site. |
| **HTTP** | Hypertext Transfer Protocol | The protocol the web uses to move pages and data. |
| **IAM** | Identity and Access Management | AWS's permission system: which user or service may do which action on which resource. |
| **IRP** | Incident Response Plan | The step-by-step plan for what to do when something goes wrong — an outage or a suspected data breach. |
| **ISO** | International Organization for Standardization | The body that publishes international standards; ISO 27001 is the information-security one. |
| **JSON** | JavaScript Object Notation | The text format our API uses for data. |
| **JWT** | JSON Web Token | A signed digital ID card the browser sends with every request. It names the user, their hospital, and their role. |
| **KMS** | Key Management Service | AWS's vault for encryption keys. Keys never leave it; it encrypts and decrypts on request. |
| **LGL** | Legal | The document-type code for the legal agreement templates (AKW-LGL-07). |
| **MDM** | Mobile Device Management | Software that controls company phones and laptops. |
| **MFA** | Multi-Factor Authentication | Needing two proofs to sign in — a password plus a code from a phone app. |
| **MOPH** | Ministry of Public Health | Qatar's health ministry and healthcare regulator. |
| **NCSA** | National Cyber Security Agency | Qatar's cybersecurity authority. |
| **NDA** | Non-Disclosure Agreement | A contract where the receiving party promises to keep information confidential. |
| **NIA** | National Information Assurance | Qatar's NCSA security standard for organisations. |
| **OAuth** | Open Authorization | The standard underneath OIDC for granting an app limited access without sharing a password. |
| **PDPPL** | Personal Data Privacy Protection Law | Qatar's national privacy law (Law No. 13 of 2016). Qatar's equivalent of GDPR. |
| **PHI** | Protected Health Information | Any information that identifies a patient and relates to their health: name, ID number, diagnosis, medication, phone, date of birth. |
| **PII** | Personally Identifiable Information | Any data that identifies a person, medical or not — a staff member's home address, for example. |
| **PITR** | Point-In-Time Recovery | DynamoDB's continuous backup — restore the table to any second in the last 35 days. |
| **PK** | Partition Key | The main lookup key of a DynamoDB row — the "drawer". |
| **QID** | Qatari ID | The national identity number of a Qatar resident (11 digits). |
| **REST** | Representational State Transfer | A style of API built on standard web verbs (GET, POST, PATCH, DELETE) and resource URLs. |
| **RPO** | Recovery Point Objective | How much recent data we may lose in a disaster. Ours: 15 minutes. |
| **RR** | Risk Register | A list of every known risk with a score, an owner, and a plan. |
| **RTO** | Recovery Time Objective | How long the system may be down after a disaster before it must be back. Ours: 4 hours. |
| **S3** | Simple Storage Service | AWS file storage — a bucket holds files of any size. |
| **SAD** | Solution Architecture Document | The master technical design document: how the whole system is built, from infrastructure to data to security. |
| **SARL** | Société à responsabilité limitée | A French/Lebanese limited-liability company form (appears in the legal templates). |
| **SES** | Simple Email Service | AWS's service for sending e-mail. |
| **SK** | Sort Key | The second part of a DynamoDB key — the "folder inside the drawer". |
| **SLA** | Service Level Agreement | A promise about service quality, usually uptime — e.g. "99.9 % per month". |
| **SOAP** | Subjective, Objective, Assessment, Plan | The standard four-part structure of a clinical note: what the patient says, what the doctor observes, the diagnosis, and the treatment plan. |
| **SOC** | System and Organization Controls | An independent audit report (SOC 2) on a service company's security controls. Customers often ask for it. |
| **SSE** | Server-Side Encryption | Encryption done by the storage service itself. "SSE-S3" uses an Amazon-managed key; "SSE-KMS" uses our own key. |
| **SSO** | Single Sign-On | Sign in once, use several systems. |
| **SSP** | System Security Plan | The document that lists every security control the system has, how it is implemented, and its status. A NIST-defined document type. |
| **TBD** | To Be Decided | Not yet decided. |
| **TLS** | Transport Layer Security | The encryption that protects data travelling over the internet — the "S" in HTTPS. |
| **TOTP** | Time-based One-Time Password | The six-digit code from an authenticator app that changes every 30 seconds. |
| **TTL** | Time To Live | A "delete me after this time" marker on a database row. DynamoDB removes expired rows for free. |
| **UI** | User Interface | The screens a person uses. |
| **US** | United States | The United States of America. |
| **VPC** | Virtual Private Cloud | A private network inside AWS. Our serverless services do not need one. |
| **WAF** | Web Application Firewall | A filter in front of a website that blocks known-bad traffic. Ours is defined but currently switched off. |

**How to read this document.** Section 1 is the posture summary. Sections 2–4 map each regulation's requirements to the control that satisfies it and the evidence an auditor can inspect. Section 5 is the DPIA. The regulatory language is kept in audit voice deliberately; the plain-English explanation of each control is in AKW-SSP-05 and AKW-SO-01 Appendix A.

**Posture caveats as of this version** (stated so no claim here outruns the code): end-user MFA is *optional*; the web application firewall is *disabled*; alarms number *two*; the isolation probe is run *manually*. Each is an open item in AKW-RR-12 with an owner and date.

---

## 1. Compliance overview

This is the master compliance reference for Akwadona. It is the single document a hospital's compliance team or an external auditor should start with. Detailed implementation lives in the linked documents.

**Status:** Production. Compliant with HIPAA (US), PDPPL (Qatar), and GDPR (EU).

---

### 1. What Akwadona is

Akwadona is a cloud-hosted hospital management platform. It stores and processes Protected Health Information (PHI) on behalf of hospital customers. Each customer is a separate **tenant** with cryptographically-isolated data, separate KMS encryption keys, and separate HMAC keys for search.

| Role | Akwadona | Customer (hospital) |
|---|---|---|
| GDPR | Processor (Art. 4(8)) | Controller (Art. 4(7)) |
| HIPAA | Business Associate | Covered Entity |
| PDPPL Qatar | Data Processor | Data Controller |

---

### 2. Regulatory regimes covered

| Regime | Primary instrument | Akwadona document |
|---|---|---|
| **HIPAA** Security Rule (US) | 45 CFR Part 164 Subpart C | `AKW-CCM-06-Compliance-Controls-Matrix.md` |
| **PDPPL** Qatar | Law No. 13 of 2016 + NCSA NIA + MOPH guidance | `AKW-CCM-06-Compliance-Controls-Matrix.md` |
| **GDPR** EU | Regulation (EU) 2016/679 | `AKW-CCM-06-Compliance-Controls-Matrix.md` |
| **HIPAA BAA** template | 45 CFR §164.504(e) | `AKW-LGL-07-Legal-Agreement-Templates.md` |
| **GDPR DPA** template | GDPR Art. 28(3) | `AKW-LGL-07-Legal-Agreement-Templates.md` |

---

### 3. Security control summary

| Control | Status | Where to verify |
|---|---|---|
| Encryption at rest | ✓ Two layers — DynamoDB table CMK + per-tenant field-level CMK (AES-256-GCM, envelope) | `AKW-SSP-05-System-Security-Plan.md` |
| Encryption in transit | ✓ TLS 1.2+ end-to-end | CloudFront + API Gateway configs |
| Searchable PHI | ✓ HMAC-SHA256 via per-tenant KMS HMAC keys | `AKW-SSP-05-System-Security-Plan.md` |
| Tenant isolation | ✓ Cryptographic — different KMS keys, indexed per tenant, three-layer Lambda enforcement | `AKW-SAD-02-Solution-Architecture-Document.md` |
| Authentication | ✓ AWS Cognito, OAuth 2.0, MFA-eligible | `AKW-SAD-02-Solution-Architecture-Document.md` |
| Authorization | ✓ Tenant claim in JWT + role-based gating in every Lambda | `AKW-SAD-02-Solution-Architecture-Document.md` |
| Audit logging | ✓ Encrypted before/after snapshots, 7-year retention | `akwadona-cdk/lambda/akwadona-appointments/index.js` writeAudit() |
| Backup & recovery | ✓ DynamoDB PITR (35 days), S3 versioning, KMS deletion window | `AKW-SAD-02-Solution-Architecture-Document.md` |
| Vulnerability management | ✓ Code review on every release, AWS-managed runtime patching | Internal review process |
| Workforce training | ✓ Annual data-protection training | HR onboarding checklist |
| Incident response | ✓ 48h/72h notification playbook | Section 6 of this doc |

---

### 4. The zero-knowledge proof

The strongest claim Akwadona makes to customers:

> "Akwadona cannot read your patients' data. Not because we promise not to — because mathematically we cannot."

The proof in one paragraph:

Every PHI field is encrypted with a per-tenant KMS Customer-Managed Key. The decrypt permission on each key is granted ONLY to Lambda execution roles (via a key-policy condition matching `AkwadonaCdkStack-*ServiceRole*`). No human IAM principal — including Akwadona engineers, the deploy user, or even the AWS account root in day-to-day operation — has decrypt. CloudTrail records every Decrypt call with the calling principal. Any human-principal decrypt would be visible and trigger immediate investigation.

Empirical exhibits in the compliance binder:

- **Exhibit A:** `aws kms generate-data-key` as `hospital-deploy-user` → AccessDenied. Saved log proves the data-key policy excludes humans.
- **Exhibit B:** `aws kms generate-mac` as `hospital-deploy-user` → AccessDenied. Saved log proves the HMAC-key policy excludes humans.
- **Exhibit C:** DynamoDB Explore items screenshot showing `"name": "AQICAH..."` ciphertext on a patient row. Even reading the database directly returns unreadable bytes.
- **Exhibit D:** CloudTrail event showing a successful Decrypt by a Lambda role serving an authenticated customer user.

This stack of evidence is what regulators, customer legal teams, and (if it ever comes to it) journalists will want to see.

---

### 5. Implementation evidence map

For each compliance requirement, the file that proves it:

| Requirement | Evidence file |
|---|---|
| Architecture overview | `AKW-SAD-02-Solution-Architecture-Document.md` |
| Multi-tenant isolation | `AKW-SAD-02-Solution-Architecture-Document.md` |
| Per-tenant encryption | `AKW-SSP-05-System-Security-Plan.md` |
| Searchable PHI without leak | `AKW-SSP-05-System-Security-Plan.md` |
| HIPAA control mapping | `AKW-CCM-06-Compliance-Controls-Matrix.md` |
| PDPPL control mapping | `AKW-CCM-06-Compliance-Controls-Matrix.md` |
| GDPR + DPIA | `AKW-CCM-06-Compliance-Controls-Matrix.md` |
| BAA template | `AKW-LGL-07-Legal-Agreement-Templates.md` |
| DPA template | `AKW-LGL-07-Legal-Agreement-Templates.md` |
| Application & user workflows | `AKW-EH-10-Engineering-Handbook.md` |

Code-level evidence:

- `akwadona-cdk/lib/akwadona-cdk-stack.ts` — infrastructure-as-code (tenant key maps, IAM policies, table schema, GSIs).
- `akwadona-cdk/lambda/_shared/crypto.js` — envelope encryption + HMAC helper (the security primitives).
- `akwadona-cdk/lambda/_shared/compliance.js` — data-class tagging + retention constants.
- Every `akwadona-cdk/lambda/<name>/index.js` — application code that ties primitives to API endpoints.

---

### 6. Incident response playbook

#### 6.1 Trigger sources

- CloudWatch alarm (KMS denial spike, login anomalies, error rate jump).
- Customer-reported suspicion.
- Internal security review finding.
- Third-party tip-off (researcher, journalist, regulator).

#### 6.2 First 60 minutes — Contain

1. **Detect & confirm.** On-call engineer acknowledges within 15 minutes; verifies whether it's an actual incident or a false positive.
2. **Wake the security officer.** `security@akwadona.com` + phone tree.
3. **Snapshot evidence.** CloudTrail export for the last 7 days; DynamoDB PITR snapshot; affected Lambda logs to S3 archive.
4. **Containment moves** (only those clearly indicated by initial evidence):
   - Suspicious IAM user → disable.
   - Compromised Lambda → roll back to last known-good version.
   - KMS key suspected compromised → key rotation or pending-deletion (NOT immediate deletion).
   - Suspicious customer activity → suspend that tenant's API access via API Gateway throttling override.

#### 6.3 First 24 hours — Scope

1. Identify the **count of affected data subjects** (patient rows touched, by tenantId).
2. Identify the **categories of data** affected (PHI vs metadata).
3. Identify the **root cause** via CloudTrail event reconstruction.
4. Identify whether **Unsecured PHI** was affected (HIPAA term — Unsecured means without proper encryption-at-rest or transit; Akwadona's normal posture is fully Secured, so most incidents are NOT Unsecured PHI events).

#### 6.4 First 48 hours — Notify

- Notify each affected hospital customer in writing (their designated breach contact in the BAA/DPA).
- For GDPR breaches: notify within 72 hours of confirmed breach (Art. 33), supervisory authority + Controllers.
- For HIPAA breaches: notify each affected Covered Entity within 60 days of discovery (typically much sooner — Akwadona contractually commits to 48 hours).
- For PDPPL breaches: notify Compliance and Data Protection Department (CDP) within 72 hours.

#### 6.5 First 7 days — Communicate publicly if required

- HIPAA: if 500+ individuals in any one state are affected, notify HHS + the media (45 CFR §164.408).
- GDPR: if "high risk to rights and freedoms" of data subjects, communicate to data subjects directly (via Controller hospital) — usually email and / or letter.
- Document the incident in a post-incident report.

#### 6.6 First 30 days — Root cause + remediation

- Publish the post-incident report internally + summary to affected customers.
- Implement remediation in production (patch, IAM change, key rotation, etc.).
- Update the risk register, the DPIA, and this playbook.

#### 6.7 Annual drill

- Tabletop exercise once per year.
- Real-system DR drill once per year.
- Lessons-learned report distributed.

---

### 7. Risk register summary

Full risks in `AKW-CCM-06-Compliance-Controls-Matrix.md` DPIA. Top risks:

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

### 8. Sub-processors

| Sub-processor | Role | Data location | Customer-facing notice |
|---|---|---|---|
| **Amazon Web Services, Inc.** (Northern Virginia) | Cloud infrastructure for non-EU customers | `us-east-1` | DPA Annex III |
| **Amazon Web Services EMEA SARL** (Luxembourg) | Cloud infrastructure for EU customers (when in-region deployment is offered) | `eu-central-1` / `eu-west-1` | DPA Annex III |

Any change to this list is communicated to customers 30 days in advance per DPA Section 6.4.

---

### 9. Contacts

| Role | Contact |
|---|---|
| Security incidents | `security@akwadona.com` |
| Data Protection Officer | `dpo@akwadona.com` |
| Compliance / legal | `legal@akwadona.com` |
| Customer support | per Master Services Agreement |

---

### 10. FAQ for customer legal / compliance teams

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

### 11. Updates

This document is reviewed:

- After every major architecture change.
- Annually as part of the compliance review cycle.
- Within 7 days of any incident or regulatory change.

Last reviewed: **at end of Step 5**.
Next scheduled review: 12 months from above.

---

## 2. HIPAA Security Rule mapping (45 CFR §164.308–§164.316)

**Standard:** 45 CFR Part 164, Subpart C — HIPAA Security Rule
**Scope:** All controls under HIPAA's three safeguard categories (Administrative, Physical, Technical) mapped to specific Akwadona implementations.
**Status:** Compliant via shared-responsibility model with AWS.

This document is the audit-ready mapping that explains, for every HIPAA Security Rule requirement, exactly what Akwadona implements, what AWS implements, and where the proof lives.

---

### Shared responsibility model

| Layer | Responsible | Examples |
|---|---|---|
| **Physical security** | AWS | Data centre access controls, fire suppression, hardware destruction. Documented in AWS SOC 2 Type II reports. |
| **Network / hypervisor** | AWS | DDoS mitigation, isolated VPC tenants, hypervisor patching. AWS Security best practices. |
| **Service-level encryption** | AWS | KMS HSMs (FIPS 140-2 Level 3), DynamoDB encryption at rest, S3 SSE. |
| **Application security** | Akwadona | Authentication, authorization, audit logs, field-level encryption, key policies. |
| **Customer access** | Customer (hospital) | Who logs in, MFA setup on the BAA-side AWS account if BYOK, training their staff. |

Akwadona signs the **AWS Business Associate Addendum (BAA)** which covers all HIPAA-eligible services we use: KMS, DynamoDB, Lambda, S3, CloudFront, Cognito, API Gateway, CloudWatch Logs.

---

### §164.308 — Administrative Safeguards

#### (a)(1)(i) Security Management Process

Implement policies and procedures to prevent, detect, contain, and correct security violations.

| Sub-requirement | Status | Akwadona implementation |
|---|---|---|
| (ii)(A) Risk Analysis | ✓ Required | Annual security risk analysis. Covers: encryption at rest, encryption in transit, access control, audit logs, BCP. Documented in `AKW-CCM-06-Compliance-Controls-Matrix.md`. |
| (ii)(B) Risk Management | ✓ Required | Risk register tracked in CodeDeploy / Sentry. Quarterly review with engineering lead. |
| (ii)(C) Sanction Policy | ✓ Required | Internal employee policy: misuse of patient data = immediate termination + legal action. |
| (ii)(D) Information System Activity Review | ✓ Required | CloudWatch Logs + CloudTrail reviewed weekly by ops. Audit-row table (`PK=AUDIT#YYYY-MM-DD`) preserves all PHI mutations for 7 years. |

#### (a)(2) Assigned Security Responsibility

Designate a security official.

**Akwadona Security Officer:** [Name to be filled per customer BAA]. Email: `security@akwadona.com`. Responsibilities: incident response lead, BAA signatory, AWS account root credential custodian.

#### (a)(3) Workforce Security

| Sub-requirement | Status | Akwadona implementation |
|---|---|---|
| (ii)(A) Authorization / Supervision | ✓ Required | AWS-console access for engineers via IAM users with MFA. Application MFA for end users is OPTIONAL (TOTP) as of 2026-10-29 — REQUIRED for Operator/Admin is an open action item. Engineer access to production limited to deploy user + named on-call rota. |
| (ii)(B) Workforce Clearance | ✓ Required | Background check on all engineers with production access. NDA in employment contract. |
| (ii)(C) Termination Procedures | ✓ Required | On employee exit: IAM credentials disabled within 1 business day; SSO revoked immediately; tracked in HR offboarding checklist. |

#### (a)(4) Information Access Management

| Sub-requirement | Status | Akwadona implementation |
|---|---|---|
| (ii)(A) Isolating Health Care Clearinghouse Functions | N/A | Akwadona is not a clearinghouse. |
| (ii)(B) Access Authorization | ✓ Required | Tenant model: every PHI row carries `tenantId`; every query is scoped to caller's tenantId. JWT-signed tenant claim cryptographically prevents cross-tenant access. See `AKW-SAD-02-Solution-Architecture-Document.md`. |
| (ii)(C) Access Establishment & Modification | ✓ Required | Admin Panel → Cognito Users. Group-based role assignment (Admin / Developer / Doctor / Pharmacist). |

#### (a)(5) Security Awareness and Training

| Sub-requirement | Status | Akwadona implementation |
|---|---|---|
| (ii)(A) Security Reminders | ✓ Required | Quarterly training reminder via internal channels. |
| (ii)(B) Protection from Malicious Software | ✓ Required | All workstations: managed antivirus; production env: Lambda execution role + KMS = no malware persistence surface. |
| (ii)(C) Log-in Monitoring | ✓ Required | Cognito advanced security mode = FULL_FUNCTION. Suspicious sign-ins blocked + emailed. |
| (ii)(D) Password Management | ✓ Required | Cognito password policy: 12 chars min, all character classes, temp pass valid 3 days. |

#### (a)(6) Security Incident Procedures

| Sub-requirement | Status | Akwadona implementation |
|---|---|---|
| (ii) Response & Reporting | ✓ Required | Incident playbook. Customer notification within 60 days of confirmed breach per HIPAA §164.404 + within 72 hours of awareness per state laws. Drill annually. |

#### (a)(7) Contingency Plan

| Sub-requirement | Status | Akwadona implementation |
|---|---|---|
| (ii)(A) Data Backup Plan | ✓ Required | DynamoDB Point-in-Time Recovery (35 days). S3 versioning on documents bucket. |
| (ii)(B) Disaster Recovery Plan | ✓ Required | RTO 4 hours, RPO 1 hour. CDK re-deploy from version-controlled IaC + PITR restore. |
| (ii)(C) Emergency Mode Operation | ✓ Required | Offline mode (Phase F) — staff can continue charting during connectivity loss; auto-sync on reconnect. |
| (ii)(D) Testing & Revision | ✓ Required | Annual DR drill: full table restore to a staging table, verify Lambda still serves correctly. |
| (ii)(E) Applications & Data Criticality Analysis | ✓ Required | Documented in `AKW-SAD-02-Solution-Architecture-Document.md`. PHI = high; operational metadata = medium. |

#### (a)(8) Evaluation

✓ Required. Annual review of HIPAA Security Rule mapping. Triggered by: major release, new tenant onboarding, AWS service additions. Last reviewed: at end of Step 5.

#### (b)(1) Business Associate Contracts

Akwadona signs:

- **Inbound BAA** with the AWS Business Associate Addendum (covers infrastructure).
- **Outbound BAA** with every hospital customer. Template: `AKW-LGL-07-Legal-Agreement-Templates.md`.

---

### §164.310 — Physical Safeguards

These are 100% AWS's responsibility under our shared-responsibility model. Evidence: AWS SOC 2 Type II + AWS HIPAA Eligible Services list.

| Standard | AWS provides | Akwadona action |
|---|---|---|
| (a)(1) Facility Access Controls | Multi-factor data centre access, badge-and-biometric | None — covered by AWS BAA. |
| (b) Workstation Use | Akwadona laptops: full-disk encryption + remote wipe | Akwadona security policy mandates this on all staff devices. |
| (c) Workstation Security | Akwadona laptops: auto-screen-lock 5 min | Enforced via MDM. |
| (d) Device & Media Controls | AWS handles all data centre hardware lifecycle | None — covered by AWS BAA. |

---

### §164.312 — Technical Safeguards

This is where the Akwadona implementation lives. Each control mapped to a concrete file / commit.

#### (a)(1) Access Control

| Sub-requirement | Status | Akwadona implementation |
|---|---|---|
| (a)(2)(i) Unique User Identification | ✓ Required | Every user has a unique Cognito `sub`. JWT carries `sub`, `email`, `tenantId`. |
| (a)(2)(ii) Emergency Access Procedure | ✓ Required | Root AWS account credentials sealed; broken-glass procedure documented in security binder. |
| (a)(2)(iii) Automatic Logoff | ✓ Required | Access token validity: 1 hour. Refresh token: 30 days. Inactive logout after 1 hour via Cognito session expiry. |
| (a)(2)(iv) Encryption & Decryption | ✓ Required | **Two-layer encryption.** (1) DynamoDB table-level CMK encryption at rest. (2) Per-tenant CMK envelope encryption on every PHI field (Step 3). See `AKW-SSP-05-System-Security-Plan.md`. |

#### (b) Audit Controls

| Status | Akwadona implementation |
|---|---|
| ✓ Required | **Three audit layers.** (1) `akwadona-appointments` writes `AUDIT#YYYY-MM-DD` rows with `before`/`after` snapshots, both encrypted with the tenant's CMK. (2) CloudTrail logs every AWS API call. (3) CloudWatch Logs hold Lambda execution traces for 1 month. Retention: 7 years on the audit table via Compliance Update 06. |

#### (c)(1) Integrity

| Status | Akwadona implementation |
|---|---|
| (c)(2) ✓ Required | DynamoDB transactions with `ConditionExpression` on every mutating write — prevents lost updates and confirms tenant ownership before any change. AES-256-GCM auth tag on encrypted fields — tampered ciphertext fails decryption with `AuthenticationFailed`. |

#### (d) Person or Entity Authentication

| Status | Akwadona implementation |
|---|---|
| ✓ Required | AWS Cognito user pool. Custom Akwadona-branded Angular login calls `InitiateAuth` (`USER_PASSWORD_AUTH`) over REST — no Hosted UI. Cognito issues a JWT signed by its private key; API Gateway's JWT authorizer validates the signature on every request before any Lambda runs. First-login users complete the `NEW_PASSWORD_REQUIRED` challenge in-app; password resets go through `ForgotPassword` + DKIM-signed SES emails from `noreply@akwadona.com`. |

#### (e)(1) Transmission Security

| Sub-requirement | Status | Akwadona implementation |
|---|---|---|
| (e)(2)(i) Integrity Controls | ✓ Required | TLS 1.2+ on CloudFront, API Gateway, all internal AWS service-to-service traffic. |
| (e)(2)(ii) Encryption | ✓ Required | All public endpoints TLS-only. Wildcard ACM certificate `*.akwadona.com`. HSTS header enforced via CloudFront response headers. |

---

### Implementation evidence

For an auditor / customer legal review, here are the file references that prove the controls above:

| HIPAA control | Akwadona evidence file |
|---|---|
| Access control (a)(2)(iv) — Encryption | `AKW-SSP-05-System-Security-Plan.md`, `akwadona-cdk/lambda/_shared/crypto.js` |
| Access management (a)(4)(ii)(B) — Per-tenant isolation | `AKW-SAD-02-Solution-Architecture-Document.md`, `akwadona-cdk/lib/akwadona-cdk-stack.ts` (tenant-entityType-index) |
| Search lookups without PHI leak | `AKW-SSP-05-System-Security-Plan.md` |
| Audit log encryption | `akwadona-cdk/lambda/akwadona-appointments/index.js` writeAudit() |
| Idempotency / replay protection | `AKW-SAD-02-Solution-Architecture-Document.md` Phase D |
| Contingency plan / offline mode | Phase E + F in `AKW-EH-10-Engineering-Handbook.md` |
| Person authentication | Cognito config in `akwadona-cdk/lib/akwadona-cdk-stack.ts` (lines 338–404) |
| Transmission security | CloudFront + ACM in CDK stack |

---

### Required vs Addressable

HIPAA distinguishes between **Required** (must implement) and **Addressable** (must implement OR document a reasonable alternative). Every "Addressable" control above is implemented as required — no deviation.

---

### What we do NOT do (out of scope)

- **De-identification under §164.514** — Akwadona stores fully-identified PHI for clinical use. We do not produce de-identified datasets.
- **Limited Data Set transfers** — N/A. All data stays within the tenant.
- **Marketing / fundraising** — Akwadona does not perform either. Patient consent for these is the hospital customer's responsibility.

---

### Customer obligations

The hospital customer is responsible for:

- Staff training on appropriate PHI use.
- Patient consent forms covering Akwadona as a Business Associate.
- Workstation security (screen lock, antivirus) at the hospital.
- Reporting suspected breaches to Akwadona within 24 hours of discovery.
- Annual review of their user roster (remove ex-staff).

Akwadona provides the platform; the hospital provides the policy + people.

---

### Open follow-ups

- Confirm AWS BAA in place for the production AWS account (`483176634665`) — Account → Support Center → eligible services.
- Map AWS service config to HIPAA Eligible Services list — already done at provisioning, re-verify annually.
- Set up CloudWatch alarms for: failed KMS access (denied decrypt = potential attacker), spike in `AccessDenied` errors, unusual cross-region traffic.

---

## 3. Qatar PDPPL (Law No. 13 of 2016) mapping

**Standard:** Qatar Law No. 13 of 2016 — Protection of Personal Privacy Data (PDPPL).
**Companion frameworks:** NCSA NIA (National Information Assurance) data classification, MOPH (Ministry of Public Health) sector guidance.
**Scope:** All controls under PDPPL mapped to Akwadona implementations.
**Status:** Compliant.

This is the primary compliance regime for Akwadona because both founding customers (Tiryaq Hospital, Alshifaa Hospital) operate in Qatar. PDPPL is enforced by the **Compliance and Data Protection Department (CDP)** under the Ministry of Transport and Communications.

---

### What PDPPL says, simply

- Personal data must be processed **lawfully, fairly, transparently**.
- Hospitals (data controllers) must protect patient data.
- Akwadona (data processor) must follow the controller's instructions and provide adequate technical protection.
- Patients have the right to **access, correct, and delete** their data.
- Breaches must be reported.
- Sensitive data (medical, religious, criminal record) gets extra protection.

The law is structurally similar to GDPR but with Qatar-specific carve-outs for **national security**, **public health**, and **medical research**.

---

### Article-by-article mapping

#### Art. 3 — Definitions

PDPPL defines:

- **Personal Data Subject** = the patient (or staff member).
- **Controller** = the hospital (Tiryaq, Alshifaa).
- **Processor** = Akwadona, processing data on the controller's instructions per the BAA / DPA.
- **Personal Data of Special Nature** = health data, religion, ethnicity, criminal records. This is Art. 16 territory.

#### Art. 4 — Conditions for processing

| Requirement | Akwadona implementation |
|---|---|
| Lawful basis (consent or legal obligation) | Hospitals collect patient consent via their intake forms. Akwadona's role: store + serve the data the hospital provides. Not a direct relationship with the patient. |
| Specific, explicit purpose | Each tenant onboarding includes a Data Processing Agreement (DPA) stating: purpose = clinical record management, billing, appointments. |
| Adequate / relevant / not excessive | Per-tenant data is scoped tightly. No cross-tenant correlation. No analytics on PHI. |

#### Art. 5 — Consent

- Patient consent is collected by the **hospital** (controller), not Akwadona.
- For minors: parent/guardian consent is required (Qatar civil code definition of minor).
- Consent withdrawal: patient asks the hospital; the hospital calls our delete endpoint; Akwadona soft-deletes the row, hard-purges after 7-year medical record retention.

#### Art. 6 — Information rights of the patient

Patient must be informed (by the hospital) of:

- The controller's identity (the hospital).
- The categories of data processed.
- Recipients of the data (e.g. Akwadona as processor).
- Their right to access, correct, delete, withdraw consent.

**Hospital obligation.** Akwadona supports the underlying data operations.

#### Art. 7 — Storage limitation

PDPPL Art. 7 + Qatar medical-record retention norms.

| Implementation |
|---|
| Patient clinical records: retained 10 years post last visit. PHI retention configured via `compliance.js` `RETENTION.PHI_YEARS_10 = 3650 days`. |
| Operational PII (staff records): 3 years post departure. `RETENTION.PII_YEARS_3`. |
| Audit log: 7 years. `RETENTION.AUDIT_YEARS_7`. |
| Session data, locks, idempotency cache: 24 hours via DynamoDB TTL (`expiresAt` attribute). |
| Hard delete after retention period: TTL auto-purges; explicit purge job removes archived data. |

#### Art. 8 — Data minimisation

| Implementation |
|---|
| Only fields collected on the patient intake form are stored. No third-party analytics. |
| Encrypted fields = only what's needed for clinical use. Operational fields (PK, SK, EntityType, dates, tenantId) remain plaintext but contain no PHI. |
| Hashed fields (qidHash, emailHash, phoneHash) replace plaintext partition keys — partition keys no longer expose PHI even in metadata. |

#### Art. 9 — Integrity & confidentiality

The headline article. Akwadona's strongest claim.

| Sub-requirement | Akwadona implementation |
|---|---|
| Protect against unauthorised access | Per-tenant KMS CMKs. Lambda-execution-role-only decrypt. Zero human IAM access. See `AKW-SSP-05-System-Security-Plan.md`. |
| Protect against accidental loss | DynamoDB Point-in-Time Recovery (35 days). S3 versioning. Annual DR drill. |
| Protect against destruction | Deletion protection on Hospital table. KMS key deletion has 30-day waiting window. CloudTrail logs every destructive action. |
| Encryption at rest | Two layers: (1) DynamoDB CMK encrypts the whole table. (2) Per-tenant CMK envelope encryption per PHI field. |
| Encryption in transit | TLS 1.2+ everywhere. HSTS header. No HTTP allowed. |
| Tenant isolation | Cryptographic — different tenant = different KMS key = mathematically cannot decrypt cross-tenant. |

#### Art. 10 — Confidentiality of staff

Anyone with access to the data must keep it confidential, including after termination.

| Implementation |
|---|
| Akwadona employment contracts include perpetual NDA. |
| Cognito IAM credentials disabled on offboarding (within 1 business day). |
| KMS access tied to active IAM role — auto-revoked on credential disable. |
| Audit log captures who accessed what, when (`actorEmail` + `timestamp` on every mutation). |

#### Art. 11 — Subject rights (access, rectification, deletion)

| Right | Akwadona endpoint |
|---|---|
| Access | `GET /patients/{id}` — patient (via hospital) sees their record decrypted. |
| Rectification | `PATCH /patients/{id}` — fields updated, audit row records before/after. |
| Erasure | `DELETE /patients/{id}` — soft delete sets `deletedAt`. Hard purge after retention. |
| Restriction of processing | `PATCH /patients/{id}` setting `processing_paused = true` (TODO — currently flagged but not enforced; planned in Step 7 operator console). |
| Data portability | Export via the patient export endpoint (returns the patient's PHI in JSON). |
| Object to processing | Hospital-side decision; Akwadona honours their delete call. |

Response SLA: 30 days from hospital request (PDPPL standard).

#### Art. 14 — Cross-border transfers

PDPPL Art. 14 requires:

- Transfers outside Qatar are allowed only to jurisdictions with "adequate protection" OR with explicit consent.

| Implementation |
|---|
| Akwadona's AWS region: `us-east-1` (N. Virginia, US). |
| Status: Qatar does not list the US as automatically adequate. Each customer hospital signs the DPA acknowledging US data hosting + explicit consent. |
| **Future:** Migrate to `me-south-1` (Bahrain, GCC-region) for in-region storage. Tracked in Task #75 as a sub-item. AWS Bahrain region supports KMS, DynamoDB, Lambda. |

#### Art. 16 — Data of special nature (PHI)

PHI = "data of special nature" under PDPPL. Triggers extra protection:

- Explicit consent for processing (hospital collects).
- Stronger access controls — implemented as the per-tenant CMK + Lambda-role-only decrypt.
- Stronger audit — every mutation logged.
- Restricted retention — see Art. 7 above.
- No automated profiling without consent — Akwadona doesn't profile.

#### Art. 17 — Children's data

Patients under 18 require parental consent.

| Implementation |
|---|
| Hospital collects parental consent at intake (not Akwadona's responsibility). |
| Akwadona stores the `dob` field encrypted. App computes age from dob client-side, never persists "isMinor" as a queryable flag. |
| Special UI handling for paediatric records: planned for the Paediatrics workflow refresh (Task TBD). |

#### Art. 19 — Notification of data breach

A confirmed breach of personal data must be reported to:

- The Compliance and Data Protection Department (CDP) within **72 hours**.
- The affected data subjects (via the hospital) within a reasonable timeframe.

| Akwadona breach response timeline |
|---|
| T+0: detect (CloudWatch alarm or report). |
| T+1 hour: contain (rotate keys, isolate affected Lambda, disable accounts). |
| T+24 hours: scope (count affected records, identify root cause via CloudTrail). |
| T+48 hours: notify each affected hospital. |
| T+72 hours: report to CDP. The hospital reports to patients per their own SLA. |

Documented in our incident playbook (Task — write playbook in `docs/05f`).

---

### NCSA NIA — Data classification

Qatar's National Cyber Security Agency requires every record to be classified.

Akwadona's `compliance.js` enforces this on every write via `DATA_CLASS`:

| Class | Meaning | Examples |
|---|---|---|
| `PHI` | Protected Health Information | Patient profile, examination notes, prescriptions, voice scribe transcripts |
| `PII` | Personally Identifiable Information (non-medical) | Doctor profile, staff records |
| `PUBLIC` | Reference data, code lookups | Departments, specializations, blood-group codes |
| `AUDIT` | Audit trail entries — append-only, immutable | `AUDIT#YYYY-MM-DD` rows |
| `SYSTEM` | Counters, locks, idempotency, transient bookkeeping | `COUNTER#PATIENTS#<tid>`, `IDEMP#<cid>` |

Every row written by every Lambda carries the `dataClass` attribute. Compliance Update 06 added the `dataClass-index` GSI so a forensic investigation can list all PHI rows touched between two timestamps in a single Query (no full-table scan).

This satisfies NCSA NIA categorisation requirements and powers PDPPL Art. 19 breach scoping.

---

### MOPH sector guidance

Qatar Ministry of Public Health publishes additional guidance for digital health records:

- **Patient access rights:** patient can request their full medical record from the hospital. Akwadona's export endpoint enables this.
- **Audit trail retention:** 10 years for clinical, 7 years for security audit. Implemented.
- **Foreign data residency:** see Art. 14 above; current US, planned migration to Bahrain.
- **Interoperability:** HL7 FHIR alignment recommended but not required for v1. Future roadmap.

---

### Implementation evidence

For an audit or hospital legal review, point to:

| PDPPL Article | Evidence file |
|---|---|
| Art. 7 retention | `akwadona-cdk/lambda/_shared/compliance.js` (RETENTION constants) |
| Art. 8 minimisation | `AKW-SSP-05-System-Security-Plan.md` field tables |
| Art. 9 confidentiality | `AKW-SSP-05-System-Security-Plan.md` (encryption), `AKW-SSP-05-System-Security-Plan.md` (search), `AKW-SAD-02-Solution-Architecture-Document.md` (tenant isolation) |
| Art. 11 subject rights | `akwadona-cdk/lambda/getPatientByID/`, `updatePatient/`, `deletePatient/` |
| Art. 14 cross-border | Current AWS region `us-east-1` + DPA section 7 (notice to customer) |
| Art. 16 special nature | `AKW-SSP-05-System-Security-Plan.md` (entire Step 3 design) |
| Art. 19 breach notification | `AKW-CCM-06-Compliance-Controls-Matrix.md` incident playbook |
| NCSA NIA | `akwadona-cdk/lambda/_shared/compliance.js` (DATA_CLASS) |

---

### What's still pending for full PDPPL parity

- Data residency migration to AWS `me-south-1` (Bahrain) when business case warrants.
- Formal CDP registration if Akwadona crosses the "data processor on substantial volume" threshold.
- Patient-facing data portability portal (currently hospital-mediated).
- Customer DPA in Arabic (currently English-only).

---

### Customer obligations (hospital side)

Akwadona implements the processor controls. The hospital, as controller, must:

- Collect consent at intake.
- Maintain a record of processing activities (the hospital's own register, not Akwadona's).
- Notify patients of their rights per Art. 6.
- Designate a Data Protection Officer (DPO) — required for hospitals under PDPPL.
- Notify Akwadona of any breach affecting Akwadona-hosted data within 24 hours.

The DPA (`AKW-LGL-07-Legal-Agreement-Templates.md`) memorialises this division of responsibility.

---

## 4. GDPR mapping and 5. Data Protection Impact Assessment

**Standard:** Regulation (EU) 2016/679 — General Data Protection Regulation (GDPR).
**Scope:** Required for any customer with EU patients or EU-based staff. Also serves as the rigorous compliance anchor across all jurisdictions.
**Status:** Compliant. DPIA conducted (Section 2 of this document).

GDPR is the strictest mainstream data-protection regime. Hitting GDPR cleanly means HIPAA and PDPPL are usually covered too.

---

### Part 1 — Article-by-article mapping

#### Art. 5 — Principles relating to processing

| Principle | Akwadona implementation |
|---|---|
| (1)(a) Lawfulness, fairness, transparency | Hospital (controller) obtains consent at intake. Akwadona's role disclosed in the hospital's privacy notice. |
| (1)(b) Purpose limitation | Each tenant DPA specifies purpose: clinical record management, appointments, billing. No use beyond this. |
| (1)(c) Data minimisation | Only fields shown in patient/doctor schemas are stored. No third-party analytics. |
| (1)(d) Accuracy | `PATCH /patients/{id}` exists for corrections. Audit log preserves before/after. |
| (1)(e) Storage limitation | Retention schedule in `compliance.js`: PHI 10 years, PII 3 years, audit 7 years, sessions 24h. |
| (1)(f) Integrity & confidentiality | Two-layer encryption (DDB CMK + per-tenant CMK), per-tenant isolation, audit logs. |
| (2) Accountability | This document. Plus `AKW-CCM-06-Compliance-Controls-Matrix.md`, `AKW-CCM-06-Compliance-Controls-Matrix.md`, the DPIA below. |

#### Art. 6 — Lawful basis for processing

| Basis | Akwadona use |
|---|---|
| (1)(a) Consent | Primary basis. Hospital collects from patient. |
| (1)(b) Contract | Doctor employment data. |
| (1)(c) Legal obligation | Medical record retention per Qatar / EU healthcare law. |
| (1)(d) Vital interests | Emergency care without prior consent — supported in the app (admin-only override flag). |
| (1)(e) Public interest / official authority | Not applicable. |
| (1)(f) Legitimate interests | Not used for PHI; used for security logs only. |

#### Art. 7 — Conditions for consent

- Consent records held by the hospital, not Akwadona.
- Withdrawal: hospital triggers `DELETE /patients/{id}` → soft delete + scheduled hard purge.

#### Art. 8 — Children's consent

GDPR sets the age of digital consent at 16 (member states may lower to 13). For health data, **parental/guardian consent** is required regardless — handled by the hospital at intake.

#### Art. 9 — Special categories of personal data

Health data is Art. 9(1) "special category" → processing prohibited **unless** Art. 9(2) exception applies.

| Akwadona's Art. 9(2) basis | Use |
|---|---|
| (2)(a) Explicit consent | Patient consent at hospital intake. |
| (2)(h) Health care / medical diagnosis | The clinical workflow itself. |
| (2)(i) Public interest in public health | Outbreak reporting if mandated by health ministry. |

Stronger safeguards are required for Art. 9 data — Akwadona's per-tenant KMS + envelope encryption (Step 3) + HMAC search hashes (Step 4) exceed industry baseline.

#### Art. 12–14 — Information to data subject

- Hospital provides the privacy notice.
- Akwadona's identity disclosed as processor in the hospital's notice.
- DPO contact: hospital's DPO; Akwadona's `security@akwadona.com` for processor-side enquiries.

#### Art. 15 — Right of access

`GET /patients/{id}` returns the patient's full record decrypted. Hospital-mediated.

#### Art. 16 — Right to rectification

`PATCH /patients/{id}` with the corrected fields.

#### Art. 17 — Right to erasure ("right to be forgotten")

`DELETE /patients/{id}` soft-deletes the row. After the 10-year retention period (or earlier if no legal hold), the TTL purges the row. Audit log entries referencing the patient remain (legally required), but the patient's PHI fields are KMS-encrypted with the tenant's key; deleting the tenant key cryptographically shreds remaining references.

#### Art. 18 — Right to restriction

Currently flag-only. Full enforcement (block reads while flagged) is queued — Task TBD.

#### Art. 20 — Right to data portability

Patient export endpoint returns the patient's PHI in JSON. Future enhancement: standardised FHIR JSON output.

#### Art. 21 — Right to object

Patient objects → hospital escalates to Akwadona → tenant operator removes the record.

#### Art. 22 — Automated decision-making

Akwadona does NOT make automated decisions about patients. The Voice Scribe AI generates a SOAP note draft, but a human doctor reviews and approves before it becomes part of the medical record. This is "automated assistance to a human decision", not Art. 22 territory.

#### Art. 25 — Data protection by design and by default

The strongest evidence in our favour. Each design choice in Akwadona:

- **By design:** every PHI mutation must include tenant context (cryptographically enforced), every PHI field is encrypted before write, every query is tenant-scoped.
- **By default:** new users start with the minimum permissions; new tenants get isolated key material; offline-mode queue encrypts pending mutations.

#### Art. 28 — Processor

Akwadona is a **data processor** under GDPR. Art. 28(3) requires a written contract specifying:

- Subject matter, duration, nature and purpose of processing.
- Type of personal data and categories of data subjects.
- Obligations of the controller.
- Eight specific processor obligations (a)-(h).

These are all covered in the DPA template (`AKW-LGL-07-Legal-Agreement-Templates.md`).

#### Art. 30 — Records of processing activities

Akwadona maintains a processing activity register (this document + the per-tenant DPA registry). Available to supervisory authorities on request.

#### Art. 32 — Security of processing

The single most quoted GDPR article for cloud-hosted health platforms.

| Art. 32 requirement | Akwadona implementation |
|---|---|
| (1)(a) Pseudonymisation and encryption | AES-256-GCM envelope encryption per Step 3. HMAC pseudonymisation of search fields per Step 4. |
| (1)(b) Ongoing confidentiality, integrity, availability, resilience | DDB Multi-AZ replication, Lambda regional redundancy, CloudFront global edge, KMS HA. |
| (1)(c) Restore availability in a timely manner | PITR 35 days. RTO 4h, RPO 1h. |
| (1)(d) Regular testing, assessing, evaluating | Annual DR drill, quarterly security review, this DPIA. |
| (2) Appropriate level of security | Risk assessment in Section 2 of this doc supports the design choices. |

#### Art. 33 — Breach notification to supervisory authority

Required within **72 hours** of awareness.

Akwadona incident playbook timeline matches PDPPL (T+72h to authority). Same playbook handles both.

#### Art. 34 — Breach communication to data subjects

When "high risk to rights and freedoms" — Akwadona supports the hospital in determining whether the threshold is met. Communication itself is the hospital's responsibility.

#### Art. 35 — Data Protection Impact Assessment

**REQUIRED for Akwadona** because: "processing on a large scale of special categories of data" (Art. 35(3)(b)).

See Part 2 of this document.

#### Art. 37–39 — Data Protection Officer

Akwadona designates a DPO whose contact is `dpo@akwadona.com`. Responsibilities per Art. 39:

- Inform / advise on GDPR obligations.
- Monitor compliance.
- Provide advice on DPIAs.
- Cooperate with supervisory authorities.
- Act as contact point for data subjects.

#### Art. 44–50 — Cross-border transfers

Akwadona transfers data to AWS US (`us-east-1`).

| Mechanism | Status |
|---|---|
| Adequacy decision | The US **does not** have a general adequacy decision after Schrems II. |
| Standard Contractual Clauses (SCCs) | AWS provides SCCs in the AWS Customer Agreement / DPA. Akwadona inherits via the AWS DPA. |
| Supplementary measures | KMS encryption + AWS US has FIPS 140-2 endpoints. |
| Future: EU-only region | Move to `eu-central-1` (Frankfurt) or `eu-west-1` (Ireland) when business case warrants. Tracked. |

For EU customers specifically, we'd onboard them in `eu-central-1` from day one. Multi-region architecture is part of the Step 6 scalability roadmap.

---

### Part 2 — Data Protection Impact Assessment (DPIA)

Required by GDPR Art. 35 because Akwadona processes **special category data on a large scale**.

#### 2.1 Description of processing

| Aspect | Description |
|---|---|
| Nature | Storing, querying, displaying, updating clinical records on behalf of hospital customers. |
| Scope | Patient identity, demographics, medical history, current medications, allergies, examination notes, prescriptions, lab orders, appointments, billing, audit logs. |
| Context | Hospital customers (data controllers); Akwadona (data processor). End users: doctors, pharmacists, admin staff. Data subjects: patients (primarily Qatar residents). |
| Purposes | Clinical record management, appointment scheduling, billing, audit trail, regulatory compliance. |

#### 2.2 Necessity and proportionality

| Question | Assessment |
|---|---|
| Could the purpose be achieved with less data? | No — we collect only what's required for clinical use. Demographics, identifiers, and medical history are minimum viable for the hospital's workflow. |
| Is the processing proportionate to the purpose? | Yes — each field stored has a direct clinical or operational use. No marketing, no profiling. |
| Is the legal basis clearly identified? | Yes — Art. 6(1)(b) contract + Art. 9(2)(h) health care, with Art. 9(2)(a) explicit consent collected at intake. |
| Is the data accurate and kept up to date? | Yes — `PATCH` endpoints exist for every field; audit log preserves change history. |
| Is the retention proportionate? | Yes — 10 years post-last-visit is the Qatar / EU norm for medical records. |

#### 2.3 Risk assessment

##### Risk 1: Unauthorised access by Akwadona staff

| Likelihood | Impact | Inherent risk | Residual risk |
|---|---|---|---|
| Medium | Critical | High | **Low** |

Mitigations:

- Per-tenant KMS CMKs. Key policy restricts decrypt to Lambda execution roles ONLY. No human IAM principal (including engineers, deploy user, root account on day-to-day operations) can decrypt PHI.
- CloudTrail logs every KMS Decrypt + GenerateMac call with the calling principal. Anomaly detection (planned: CloudWatch alarm on non-Lambda principal).
- Background checks + NDA on all engineers with production access.

##### Risk 2: Breach via stolen AWS credentials

| Likelihood | Impact | Inherent risk | Residual risk |
|---|---|---|---|
| Low | Critical | High | **Low** |

Mitigations:

- MFA available (TOTP) on all accounts; enforcement for Operator/Admin accounts is an open action item (Cognito pool is `Mfa.OPTIONAL` as of 2026-10-29).
- IAM credentials are short-lived where possible (SSO).
- Even with full IAM access, the attacker cannot decrypt PHI (key policy condition matches only the Lambda role pattern).
- Deletion of KMS keys requires 30-day waiting window — gives the security team time to react.

##### Risk 3: Insider threat — Lambda code modification

| Likelihood | Impact | Inherent risk | Residual risk |
|---|---|---|---|
| Low | Critical | Medium-High | **Medium** |

Mitigations:

- CDK code in version control, every deploy is a commit.
- CI required-review on the deploy branch (TODO — currently relies on engineer discipline; planned for Step 7 operations).
- CloudTrail logs all `UpdateFunctionCode` calls.

Residual risk is medium because a malicious deploy would have time to exfiltrate before detection. **Mitigation in flight:** require CI signed commits, enable code signing on Lambda functions.

##### Risk 4: Cross-tenant data leak

| Likelihood | Impact | Inherent risk | Residual risk |
|---|---|---|---|
| Low | Critical | High | **Very low** |

Mitigations:

- Three-layer defence (entry guard + DDB ConditionExpression + post-query filter) on PHI-touching Lambdas.
- Different tenants use different KMS keys — cross-tenant decrypt is mathematically impossible.
- HMAC search hashes are tenant-scoped — cross-tenant probing impossible.
- Auth guard on frontend prevents wrong-subdomain access.

##### Risk 5: Loss of availability

| Likelihood | Impact | Inherent risk | Residual risk |
|---|---|---|---|
| Medium | High | Medium-High | **Low-Medium** |

Mitigations:

- DynamoDB Multi-AZ replication (AWS-managed).
- Lambda regional redundancy across AZs (AWS-managed).
- CloudFront global edge.
- PITR 35 days for data recovery.
- Offline mode (Phase F): staff can continue charting during connectivity loss; sync on reconnect.
- Annual DR drill.

Residual risk remains medium because a multi-AZ region outage is theoretically possible. Mitigation in flight: multi-region replication when business case warrants (Step 6 scope).

##### Risk 6: KMS key accidentally deleted

| Likelihood | Impact | Inherent risk | Residual risk |
|---|---|---|---|
| Very low | Catastrophic | Medium | **Low** |

Mitigations:

- KMS key deletion has 7–30 day waiting window — gives team time to cancel.
- Key deletion protection flag enabled on console.
- Documented in disaster recovery playbook — first step is "cancel any scheduled deletion".
- Compliance binder lists every tenant CMK, who can administer it, escalation contact.

#### 2.4 Risks to data subjects

| Risk to patient | How realised | Akwadona mitigation |
|---|---|---|
| Identity theft from leaked QID + name | Database breach | Encryption + hashing — leaked DDB rows are unreadable. |
| Embarrassment from leaked medical condition | Database breach + decryption | Zero-knowledge architecture — leak alone is insufficient; would also need KMS access (separate breach). |
| Discrimination in employment / insurance | Cross-system data leakage | Strict purpose limitation in DPA, no analytics on PHI, no third-party access. |
| Loss of trust in healthcare digital systems | Public breach disclosure | 72-hour notification regime, transparent communication, root-cause publication. |

#### 2.5 Conclusion

The combination of **per-tenant KMS CMKs**, **envelope encryption**, **HMAC-hashed search**, **three-layer tenant isolation**, and **append-only audit trail** brings residual risks to the lowest practical level for cloud-hosted SaaS healthcare platforms.

**The DPIA concludes that processing can proceed.** Residual risks are acceptable for the purposes pursued, given the safeguards in place.

Annual DPIA review scheduled. Triggers for ad-hoc review: new tenant onboarding, new entity types, infrastructure region change, AWS service changes.

---

### Part 3 — Implementation evidence (GDPR)

| GDPR control | Akwadona evidence file |
|---|---|
| Art. 5(1)(f) integrity & confidentiality | `AKW-SSP-05-System-Security-Plan.md`, `AKW-SSP-05-System-Security-Plan.md` |
| Art. 5(1)(e) storage limitation | `akwadona-cdk/lambda/_shared/compliance.js` (RETENTION) |
| Art. 25 by design & by default | `AKW-SAD-02-Solution-Architecture-Document.md`, all of `docs/03-*` and `docs/04-*` |
| Art. 28 processor | `AKW-LGL-07-Legal-Agreement-Templates.md` (DPA) |
| Art. 30 records of processing | This document + per-tenant DPA registry |
| Art. 32(1)(a) pseudonymisation | `AKW-SSP-05-System-Security-Plan.md` |
| Art. 32(1)(b)–(d) resilience + testing | `AKW-SAD-02-Solution-Architecture-Document.md` + annual DR drill |
| Art. 33 breach notification | `AKW-CCM-06-Compliance-Controls-Matrix.md` incident playbook |
| Art. 35 DPIA | Part 2 of this document |

---

### Part 4 — Open follow-ups

- **EU region deployment** (`eu-central-1` or `eu-west-1`) for EU customers. Currently Qatar-focused with US AWS region.
- **Patient portal** so patients exercise Art. 15–22 rights directly (today routed via hospital).
- **CI signed-commit + Lambda code-signing** to reduce insider-threat residual risk on the Lambda layer.
- **Annual DPIA review** scheduled.
- **FHIR JSON export** for proper data-portability under Art. 20.

---

### Part 5 — DPO + customer contact

- **Akwadona DPO:** `dpo@akwadona.com`. Responsibilities per Art. 39.
- **Customer data subject enquiries:** route via hospital's DPO; processor-side enquiries to `dpo@akwadona.com`.
- **Supervisory authority cooperation:** Akwadona will respond to any GDPR supervisory authority within the statutory deadlines.

---

### Part 6 — What Akwadona doesn't do (GDPR-relevant exclusions)

To set expectations:

- **No automated decision-making with legal effect** — Voice Scribe is human-reviewed.
- **No profiling on PHI** — no behavioural analytics.
- **No third-party sharing** — data stays within the tenant and AWS infrastructure.
- **No marketing emails using PHI** — system emails (password reset, etc.) only; never references medical context.
- **No selling of data** — explicitly forbidden in the master subscription agreement.

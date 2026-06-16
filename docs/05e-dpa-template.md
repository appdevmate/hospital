# Data Processing Agreement (DPA) — Template

**Use:** This template is signed between Akwadona (Processor) and each hospital customer (Controller) subject to the EU General Data Protection Regulation (GDPR). It satisfies Article 28(3). For customers also subject to Qatar's PDPPL, this DPA stands together with the BAA template (`05d`) and the PDPPL compliance document (`05b`).

> **Disclaimer:** Software-engineering reference template. Legal counsel must review before any actual customer execution. Not legal advice.

---

## Data Processing Agreement

**This Data Processing Agreement** ("DPA" or "Agreement") is entered into as of **[Effective Date]** by and between:

**[Hospital Legal Name]**, with principal offices at **[Hospital Address]** ("Controller")

and

**Akwadona [Legal Entity Name]**, with principal offices at **[Akwadona Address]** ("Processor")

(each, a "Party"; together, the "Parties").

---

### Recitals

**WHEREAS**, Controller and Processor have entered into a Master Services Agreement dated **[MSA Date]** (the "Principal Agreement") under which Processor provides cloud-hosted hospital management software services to Controller;

**WHEREAS**, in providing the services, Processor processes Personal Data on behalf of Controller and qualifies as a Processor under Article 4(8) of the GDPR;

**WHEREAS**, the Parties wish to comply with the obligations under Article 28 of the GDPR in respect of such processing;

**NOW, THEREFORE**, the Parties agree as follows.

---

### 1. Definitions

Capitalized terms not defined herein have the meaning given to them in the GDPR. For clarity:

- **"GDPR"** means Regulation (EU) 2016/679.
- **"Personal Data"** means any data Processor processes on behalf of Controller that constitutes "personal data" within the meaning of GDPR Art. 4(1).
- **"Special-Category Data"** has the meaning at GDPR Art. 9(1) and includes the health, genetic, and biometric data Processor stores on behalf of Controller.
- **"Sub-processor"** means any third party engaged by Processor to process Personal Data on Processor's behalf.

---

### 2. Subject Matter and Duration (Art. 28(3))

**2.1 Subject matter.** Processor processes Personal Data to enable Controller's use of the Akwadona hospital management platform, including: clinical record management, appointment scheduling, billing administration, audit logging, and customer support.

**2.2 Duration.** Until termination of the Principal Agreement, plus any return / deletion period under Section 11.

---

### 3. Nature and Purpose of Processing

**3.1 Nature of processing.** Storage, retrieval, encryption at rest, encryption in transit, transmission to authorized end-users, audit logging, backup, and disaster recovery.

**3.2 Purpose of processing.** To enable Controller's healthcare service delivery — clinical record-keeping, appointments, billing, and regulatory reporting — as specified in the Principal Agreement. No other purpose is permitted without Controller's prior written consent.

---

### 4. Types of Personal Data and Categories of Data Subjects (Art. 28(3))

**4.1 Categories of data subjects:**

- Patients of Controller.
- Doctors, pharmacists, administrative staff, and other workforce of Controller.
- Patient next-of-kin and emergency contacts.

**4.2 Categories of Personal Data:**

- **Identification data:** name, date of birth, national ID (e.g. QID), photograph (optional).
- **Contact data:** address, phone, email.
- **Health and clinical data (Special Category — Art. 9):** medical history, allergies, current medications, diagnoses, examination findings, prescriptions, laboratory orders, radiology orders, blood type, voice-scribe transcripts.
- **Insurance and billing data:** insurance provider, policy number, invoice records, payments.
- **Operational and audit data:** appointment timestamps, user actions, IP addresses for security logs.

**4.3 Special-Category Data is processed under GDPR Art. 9(2)(h) — provision of health care.**

---

### 5. Controller's Obligations and Rights (Art. 28(3))

Controller represents and warrants:

**5.1** Controller has a lawful basis under GDPR Art. 6 for the processing instructed under this DPA.

**5.2** Controller has satisfied the conditions under GDPR Art. 9(2) for processing Special-Category Data.

**5.3** Controller has provided all required information to data subjects (Art. 13 / 14), including the identity of Processor as a service provider.

**5.4** Controller has appointed a Data Protection Officer (DPO) where required by Art. 37, and Controller will share DPO contact details with Processor on request.

**5.5** Controller has obtained any consents required for transfers of Personal Data to Processor and (transitively) to AWS as a Sub-processor.

**5.6** Controller will issue Processor's processing instructions through documented channels (the Principal Agreement, this DPA, customer-support tickets, or written communications from Controller's authorized representative).

---

### 6. Processor Obligations under Art. 28(3)

#### 6.1 (a) — Processing only on documented instructions

Processor shall process Personal Data only on documented instructions from Controller, including with regard to transfers of Personal Data to a third country or an international organisation, unless required to do so by Union or Member State law to which Processor is subject. In such a case, Processor shall inform Controller of that legal requirement before processing, unless that law prohibits such information on important grounds of public interest.

#### 6.2 (b) — Confidentiality

Processor shall ensure that persons authorized to process Personal Data have committed themselves to confidentiality or are under an appropriate statutory obligation of confidentiality. This includes:

- Written confidentiality clauses in employment agreements.
- Perpetual confidentiality obligation surviving employment.
- Mandatory annual training on data protection.

#### 6.3 (c) — Security of processing (Art. 32)

Processor shall take all measures required pursuant to Art. 32, including the technical and organizational measures described in **Annex II — Technical and Organizational Measures**.

#### 6.4 (d) — Sub-processors

**6.4.1** Controller grants Processor general authorisation for the engagement of Sub-processors, subject to Sections 6.4.2 to 6.4.4 below.

**6.4.2** Sub-processor list. Processor maintains an up-to-date list of Sub-processors at **Annex III**. Current Sub-processor: Amazon Web Services EMEA SARL (when serving customers via EU AWS regions) or Amazon Web Services, Inc. (when serving via US AWS regions).

**6.4.3** Notice. Processor shall notify Controller in writing at least thirty (30) days in advance of any intended changes to Sub-processors. Controller may object in writing within fifteen (15) days of such notice, in which case the Parties will negotiate in good faith. If no resolution is reached, Controller may terminate this DPA without penalty.

**6.4.4** Equivalent terms. Processor shall impose on each Sub-processor data-protection obligations no less protective than those in this DPA. Processor remains fully liable to Controller for the performance of each Sub-processor's obligations.

#### 6.5 (e) — Assistance with data subject rights

Processor shall, taking into account the nature of the processing, assist Controller by appropriate technical and organizational measures, insofar as possible, in fulfilling Controller's obligation to respond to data subject requests under Chapter III of the GDPR.

- **Right of access (Art. 15):** Processor provides API endpoints that return all PHI for a specified data subject decrypted in JSON.
- **Right of rectification (Art. 16):** Processor provides update endpoints.
- **Right of erasure (Art. 17):** Processor provides delete endpoints; cryptographic erasure via KMS key deletion is available at Controller's election at end of contract.
- **Right of restriction (Art. 18):** Processor supports a `processing_paused` flag on patient records.
- **Right of portability (Art. 20):** Processor exports data in machine-readable JSON format.
- **Right to object (Art. 21):** Processor honours objections relayed by Controller via the delete or restriction endpoints.

Processor commits to respond to Controller's assistance requests within **fifteen (15) business days**.

#### 6.6 (f) — Assistance with security, breach notification, and DPIAs

Processor shall assist Controller in ensuring compliance with the obligations pursuant to Art. 32 to 36 of the GDPR, including:

- Maintaining the technical and organizational measures in Annex II.
- Notifying Controller of Personal Data Breaches (see Section 7).
- Providing the information required for Controller's Data Protection Impact Assessments. Processor's own DPIA is available at `docs/05c-gdpr-compliance-and-dpia.md`.

#### 6.7 (g) — Deletion or return of Personal Data

At Controller's choice upon termination of services:

- Return all Personal Data within sixty (60) days in a mutually-agreed machine-readable format; OR
- Delete all Personal Data by cryptographically shredding the per-tenant KMS Customer-Managed Key. Deletion of the key renders all stored encrypted Personal Data permanently unreadable. Processor will issue written certification of key deletion.

Processor shall not retain copies of the Personal Data after the chosen action is complete, except where retention is required by Union or Member State law (in which case Section 6.1 applies).

#### 6.8 (h) — Making information available + audits

**6.8.1** Processor shall make available to Controller all information necessary to demonstrate compliance with the obligations laid down in Art. 28 and this DPA.

**6.8.2** Processor shall allow for and contribute to audits, including inspections, conducted by Controller or another auditor mandated by Controller. Such audits may not occur more than once per calendar year unless required by a regulatory authority or following a Personal Data Breach.

**6.8.3** Audits shall be conducted on at least thirty (30) days' written notice during normal business hours and shall not unreasonably interfere with Processor's operations. Controller shall bear the cost of its own audit unless the audit reveals a material breach of this DPA, in which case Processor shall reimburse reasonable audit costs.

**6.8.4** As an alternative to on-site audit, Controller may accept Processor's existing third-party certifications (SOC 2 Type II of AWS, ISO 27001 of AWS, Processor's own DPIA and security documentation) as evidence of compliance.

---

### 7. Personal Data Breach (Art. 33–34)

**7.1** Processor shall notify Controller of any Personal Data Breach affecting Controller's Personal Data **without undue delay and in any event within forty-eight (48) hours** after becoming aware of such a Breach.

**7.2** Notification shall include, to the extent known at the time:

- The nature of the Personal Data Breach including, where possible, the categories and approximate number of data subjects and Personal Data records concerned.
- The likely consequences of the Personal Data Breach.
- The measures taken or proposed to be taken by Processor to address the Personal Data Breach, including measures to mitigate its possible adverse effects.

**7.3** Processor shall cooperate with Controller and provide reasonable assistance in any investigation or remediation following a Personal Data Breach.

---

### 8. International Transfers (Art. 44–50)

**8.1** Personal Data may be transferred outside the European Economic Area (EEA) to AWS data centres. Processor and Controller acknowledge that:

- AWS data centres in the EEA (`eu-central-1` Frankfurt, `eu-west-1` Ireland) involve no third-country transfer.
- AWS data centres outside the EEA (e.g. `us-east-1` Northern Virginia) constitute a third-country transfer.

**8.2** Where Personal Data is transferred outside the EEA to a country without a European Commission adequacy decision, the transfer is governed by the **Standard Contractual Clauses (SCCs)** — Commission Implementing Decision (EU) 2021/914 — Module Two (Controller to Processor), which are hereby incorporated by reference and shall apply with the following clarifications:

- Clause 7 (Docking Clause): not applicable.
- Clause 9 (Use of Sub-processors): Option 2 — general authorisation per Section 6.4 of this DPA.
- Clause 11 (Redress): Option opt-out — data subjects shall have access to redress mechanisms.
- Clause 17 (Governing law): [Governing-Law Jurisdiction] / Republic of Ireland law where the law of Controller's establishment does not allow third-party beneficiary rights.
- Clause 18 (Forum): courts of [Forum].
- Annex I.A (Parties): as defined at the start of this DPA.
- Annex I.B (Description of the transfer): per Sections 3 and 4 above.
- Annex II (Technical and Organisational Measures): per Annex II of this DPA.

**8.3** Supplementary measures. Processor implements supplementary measures including: end-to-end encryption with customer-controlled keys, pseudonymisation of search-index fields via HMAC, contractual restrictions on Sub-processor access, transparency reporting on government data requests.

---

### 9. Liability and Indemnification

The liability provisions of the Principal Agreement apply to claims under this DPA, except to the extent prohibited by applicable law. Each Party shall be liable for damages caused by processing only where it has not complied with obligations of the GDPR specifically directed to processors or has acted outside or contrary to lawful instructions of the Controller (GDPR Art. 82(2)).

---

### 10. Term and Termination

This DPA enters into effect on the Effective Date and remains in effect for the term of the Principal Agreement. Termination is governed by the Principal Agreement. The obligations under Section 6.7 (deletion or return) and Section 7 (breach notification regarding any Personal Data still in Processor's possession) survive termination.

---

### 11. Order of Precedence

In the event of any conflict between this DPA and the Principal Agreement, this DPA prevails to the extent it concerns the processing of Personal Data subject to the GDPR.

---

### 12. General

**12.1 Amendment.** No modification of this DPA is effective unless in writing and signed by both Parties.

**12.2 Severability.** If any provision is held invalid or unenforceable, the remaining provisions remain in full force.

**12.3 Governing law.** This DPA is governed by the laws of **[Governing-Law Jurisdiction]**.

**12.4 Notices.** As provided in the Principal Agreement, with copies of GDPR-related notices to:

- For Controller: **[Controller DPO email]**
- For Processor: `dpo@akwadona.com`

**12.5 Counterparts and electronic signatures.** This DPA may be executed in counterparts including via electronic signature.

---

### Signatures

**Controller: [Hospital Legal Name]**

By: ______________________________
Name: ____________________________
Title: ____________________________
Date: ____________________________

**Processor: Akwadona [Legal Entity]**

By: ______________________________
Name: ____________________________
Title: ____________________________
Date: ____________________________

---

## Annex I — Subject Matter Details

| Field | Value |
|---|---|
| Categories of data subjects | Patients, hospital workforce, patient contacts |
| Categories of Personal Data | Identification, contact, health (Art. 9), insurance, audit |
| Sensitive data | Yes — health data under Art. 9(1) |
| Frequency of transfer | Continuous |
| Nature of processing | Storage, retrieval, encryption, audit, transmission |
| Purpose | Health-care delivery (Art. 9(2)(h)) |
| Retention period | Per Section 6.7 + applicable law |
| Recipients | Controller's authorized workforce + Akwadona Sub-processors |

---

## Annex II — Technical and Organizational Measures (Art. 32)

Processor maintains the following measures. Detailed implementation evidence is referenced at the end of each item.

| Measure | Implementation |
|---|---|
| **Pseudonymisation** | HMAC-SHA256 hashing of search fields via per-tenant KMS HMAC keys (`docs/04-hashed-search-fields.md`). Tenant-scoped, irreversible. |
| **Encryption — at rest** | Two-layer: (1) DynamoDB CMK encryption at rest for the table. (2) AES-256-GCM envelope encryption per PHI field with per-tenant KMS Customer-Managed Keys (`docs/03-encryption-and-zero-knowledge.md`). |
| **Encryption — in transit** | TLS 1.2+ enforced via CloudFront + API Gateway. HSTS header. ACM-issued wildcard certificate. |
| **Confidentiality** | Workforce confidentiality agreements. KMS key policy restricts decrypt to Lambda execution roles only — no human IAM principal can decrypt. |
| **Integrity** | AES-GCM authenticated encryption (tampered ciphertext fails decryption). DynamoDB conditional writes prevent lost-update anomalies. |
| **Availability** | DynamoDB Multi-AZ replication. Lambda regional redundancy. CloudFront global edge. Point-in-Time Recovery (35 days). |
| **Resilience** | Annual disaster-recovery drill. RTO 4 hours, RPO 1 hour. Offline-mode buffer for connectivity loss. |
| **Restore** | DynamoDB PITR. S3 versioning on documents bucket. KMS deletion-protection window. |
| **Testing and evaluation** | Annual security review. Annual DPIA review. Quarterly tabletop exercises. |
| **Access management** | OAuth 2.0 via AWS Cognito with multi-factor-eligible authentication. Tenant isolation enforced via JWT claim + DynamoDB tenant-scoped queries. |
| **Audit logs** | Append-only `AUDIT#YYYY-MM-DD` partition in DynamoDB. Encrypted before/after snapshots. Retained 7 years. |
| **Vulnerability management** | Static code review on every release. Dependency security scanning. AWS-managed runtime patching. |
| **Workforce training** | Annual GDPR + HIPAA training for all staff with potential access. |
| **Sub-processor management** | List in Annex III. Notice + objection rights per Section 6.4. |
| **Breach detection** | CloudWatch alarms on anomalous KMS access patterns, sign-in failure spikes, cross-region traffic. |

---

## Annex III — Sub-processor List (as of Effective Date)

| Sub-processor | Role | Location of Personal Data | Legal Instrument |
|---|---|---|---|
| Amazon Web Services EMEA SARL | Cloud infrastructure (compute, storage, key management) — for EU customers served via EU regions. | Frankfurt (DE) or Dublin (IE) | AWS Data Processing Addendum |
| Amazon Web Services, Inc. | Cloud infrastructure — for non-EU customers served via Northern Virginia (US). | Northern Virginia (US) | AWS Data Processing Addendum + Standard Contractual Clauses |

Any change to this list shall be communicated per Section 6.4.3.

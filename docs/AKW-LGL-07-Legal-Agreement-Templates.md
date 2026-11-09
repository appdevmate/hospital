# Akwadona Hospital Platform — Legal Agreement Templates (BAA and DPA)

| Document control | |
|---|---|
| **Document ID** | AKW-LGL-07 |
| **Document type** | Contract templates — Part A: HIPAA Business Associate Agreement; Part B: GDPR Data Processing Agreement |
| **Version** | 1.1 |
| **Status** | Approved |
| **Classification** | Confidential — provided to customers for signature |
| **Owner** | Founder (with external counsel review before each execution) |
| **Approver** | Founder / CTO |
| **Effective date** | 2026-10-30 |
| **Review cycle** | Annually, and on any change to sub-processors or security controls referenced in the schedules |
| **Supersedes** | `archive/05d-baa-template.md`, `archive/05e-dpa-template.md` |
| **Related documents** | AKW-CCM-06 (controls referenced in the schedules), AKW-SSP-05, AKW-IRP-09 (notification clauses) |

| Revision history | | | |
|---|---|---|---|
| **Version** | **Date** | **Author** | **Change** |
| 1.0 | 2026-10-30 | Platform team | Consolidated into the enterprise document set; control statements corrected to match the deployed stack (MFA optional, WAF disabled, two alarms, probe manual) |
| 1.1 | 2026-10-31 | Platform team | Added "This document answers" and "Abbreviations used in this document" blocks after document control |

## This document answers

1. What contract do we sign with a hospital that needs HIPAA coverage (Business Associate Agreement)?
2. What contract do we sign with a hospital under GDPR (Data Processing Agreement)?
3. What do we promise in each: security measures, sub-processors, breach notification, audit rights, data return and deletion?
4. What must be filled in or checked by counsel before sending?

## Abbreviations used in this document

> **Why this table exists.** Every short form that appears anywhere in this document is listed here with (1) what the letters stand for and (2) what it means in plain words. If a term is not here and is not obvious, that is a documentation bug — add it. The complete glossary with examples and console links is AKW-SO-01 Appendix A.

| Abbreviation | Stands for | What it means |
|---|---|---|
| **ACM** | AWS Certificate Manager | Issues and renews the certificates that make a site show the HTTPS padlock. Free. |
| **AES** | Advanced Encryption Standard | The standard symmetric encryption algorithm. "AES-256" uses a 256-bit key. |
| **API** | Application Programming Interface | The set of URLs one program calls to use another program's features. Ours is a REST API. |
| **AWS** | Amazon Web Services | Amazon's cloud-computing platform. Everything Akwadona runs on it. |
| **AZ** | Availability Zone | One independent data centre inside an AWS region. A region has several, so one failing does not take the service down. |
| **BAA** | Business Associate Agreement | A contract required by the US health-privacy law HIPAA between a hospital and any company (like Akwadona) that handles patient data for it. It says how the data will be protected. |
| **CCM** | Compliance Controls Matrix | A table that maps each rule in a law or standard to the specific thing we do to satisfy it, and the evidence an auditor can check. |
| **CFR** | Code of Federal Regulations | The collection of US federal rules. "45 CFR §164" is the part that contains HIPAA's privacy and security rules. |
| **CMK** | Customer Managed Key | A KMS encryption key that we create and control (as opposed to one AWS manages for us). |
| **CSV** | Comma-Separated Values | A plain-text spreadsheet format. |
| **CTO** | Chief Technology Officer | The head of technology. |
| **DPA** | Data Processing Agreement | A contract required by the EU privacy law GDPR between a data controller (the hospital) and a data processor (Akwadona). It says what the processor may do with personal data. |
| **DPIA** | Data Protection Impact Assessment | A formal written risk review, required by GDPR, that a company does before processing personal data in a new way. |
| **DPO** | Data Protection Officer | The named person responsible for privacy compliance; required by GDPR for organisations that process health data at scale. |
| **EEA** | European Economic Area | The EU plus Iceland, Liechtenstein, and Norway — GDPR applies across all of it. |
| **EMEA** | Europe, the Middle East and Africa | A common business region grouping. |
| **ePHI** | electronic Protected Health Information | PHI in digital form. Everything Akwadona stores is ePHI. |
| **EU** | European Union | The political and economic union of 27 European countries. |
| **FHIR** | Fast Healthcare Interoperability Resources | The modern standard for exchanging health data between systems. On our roadmap. |
| **GCC** | Gulf Cooperation Council | The six Gulf states: Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, Oman. |
| **GCM** | Galois/Counter Mode | A way of running AES that also detects tampering. We use AES-256-GCM. |
| **GDPR** | General Data Protection Regulation | The European Union's privacy law (2018). It gives people rights over their data and sets duties on companies that process it. |
| **HHS** | US Department of Health and Human Services | The US government department that enforces HIPAA. |
| **HIPAA** | Health Insurance Portability and Accountability Act | The US law that sets rules for protecting patients' health information. Its "Security Rule" lists the technical safeguards we must have. |
| **HITECH** | Health Information Technology for Economic and Clinical Health Act | A 2009 US law that strengthened HIPAA, including breach-notification duties. |
| **HMAC** | Hash-based Message Authentication Code | A fingerprint of a value computed with a secret key. Same value + same key = same fingerprint; different keys give different fingerprints. We use it to search encrypted fields. |
| **HSTS** | HTTP Strict Transport Security | A response header telling browsers to always use HTTPS for this site. |
| **IAM** | Identity and Access Management | AWS's permission system: which user or service may do which action on which resource. |
| **IP** | Internet Protocol address | The numeric address of a machine on the internet. |
| **IRP** | Incident Response Plan | The step-by-step plan for what to do when something goes wrong — an outage or a suspected data breach. |
| **ISO** | International Organization for Standardization | The body that publishes international standards; ISO 27001 is the information-security one. |
| **JSON** | JavaScript Object Notation | The text format our API uses for data. |
| **JWT** | JSON Web Token | A signed digital ID card the browser sends with every request. It names the user, their hospital, and their role. |
| **KMS** | Key Management Service | AWS's vault for encryption keys. Keys never leave it; it encrypts and decrypts on request. |
| **LGL** | Legal | The document-type code for the legal agreement templates (AKW-LGL-07). |
| **MFA** | Multi-Factor Authentication | Needing two proofs to sign in — a password plus a code from a phone app. |
| **MSA** | Master Services Agreement | The main commercial contract between a vendor and a customer. |
| **OAuth** | Open Authorization | The standard underneath OIDC for granting an app limited access without sharing a password. |
| **PDPPL** | Personal Data Privacy Protection Law | Qatar's national privacy law (Law No. 13 of 2016). Qatar's equivalent of GDPR. |
| **PHI** | Protected Health Information | Any information that identifies a patient and relates to their health: name, ID number, diagnosis, medication, phone, date of birth. |
| **PITR** | Point-In-Time Recovery | DynamoDB's continuous backup — restore the table to any second in the last 35 days. |
| **QID** | Qatari ID | The national identity number of a Qatar resident (11 digits). |
| **RPO** | Recovery Point Objective | How much recent data we may lose in a disaster. Ours: 15 minutes. |
| **RTO** | Recovery Time Objective | How long the system may be down after a disaster before it must be back. Ours: 4 hours. |
| **S3** | Simple Storage Service | AWS file storage — a bucket holds files of any size. |
| **SAD** | Solution Architecture Document | The master technical design document: how the whole system is built, from infrastructure to data to security. |
| **SARL** | Société à responsabilité limitée | A French/Lebanese limited-liability company form (appears in the legal templates). |
| **SOC** | System and Organization Controls | An independent audit report (SOC 2) on a service company's security controls. Customers often ask for it. |
| **SSP** | System Security Plan | The document that lists every security control the system has, how it is implemented, and its status. A NIST-defined document type. |
| **TLS** | Transport Layer Security | The encryption that protects data travelling over the internet — the "S" in HTTPS. |
| **US** | United States | The United States of America. |
| **WAF** | Web Application Firewall | A filter in front of a website that blocks known-bad traffic. Ours is defined but currently switched off. |

**Use.** These are templates. Before sending to a customer: fill the party details, check the sub-processor list against the current AWS services (AKW-SAD-02 §7), and have counsel review. Executed copies are stored outside this repository.

---

## Part A — Business Associate Agreement (HIPAA)

**Use:** This template is signed between Akwadona (Business Associate) and each Covered Entity hospital customer that needs HIPAA-aligned protections. Fill in the bracketed fields per customer.

> **Disclaimer:** This is a software-engineering reference template. Before use with an actual customer, Akwadona's counsel and the customer's counsel must review and adapt to the specific deal terms, jurisdiction, and any state-law overlays. This document is not a substitute for legal advice.

---

### Business Associate Agreement

**This Business Associate Agreement** ("Agreement" or "BAA") is entered into as of **[Effective Date]** ("Effective Date") by and between:

**[Hospital Legal Name]**, with principal offices at **[Hospital Address]** ("Covered Entity")

and

**Akwadona [Legal Entity Name]**, with principal offices at **[Akwadona Address]** ("Business Associate")

(each, a "Party"; together, the "Parties").

---

#### Recitals

**WHEREAS**, Covered Entity is a Covered Entity as defined under the Health Insurance Portability and Accountability Act of 1996 ("HIPAA") and its implementing regulations at 45 CFR Parts 160 and 164 (the "HIPAA Rules"), as amended by the HITECH Act and the Omnibus Rule;

**WHEREAS**, Business Associate provides cloud-hosted hospital management software-as-a-service to Covered Entity under the Master Services Agreement dated **[MSA Date]** (the "Underlying Agreement");

**WHEREAS**, in the course of providing services under the Underlying Agreement, Business Associate will create, receive, maintain, or transmit Protected Health Information ("PHI") on behalf of Covered Entity;

**NOW, THEREFORE**, the Parties agree as follows.

---

#### 1. Definitions

Capitalized terms not otherwise defined herein have the meanings given to them under the HIPAA Rules. For clarity:

- **"PHI"** means Protected Health Information as defined at 45 CFR § 160.103, limited to information Business Associate creates, receives, maintains, or transmits on behalf of Covered Entity.
- **"Electronic PHI"** or **"ePHI"** means PHI transmitted or maintained in electronic media.
- **"Security Incident"** means as defined at 45 CFR § 164.304.
- **"Breach"** means as defined at 45 CFR § 164.402, excluding incidents that are determined under the risk-assessment process to present no significant risk to the PHI.
- **"Subcontractor"** means an agent or subcontractor of Business Associate that creates, receives, maintains, or transmits PHI on behalf of Business Associate. For purposes of this Agreement, **Amazon Web Services, Inc. ("AWS")** is acknowledged as a Subcontractor under a separate AWS Business Associate Addendum.

---

#### 2. Permitted Uses and Disclosures by Business Associate

Business Associate may use or disclose PHI only as follows:

**2.1** To perform Business Associate's obligations under the Underlying Agreement, specifically: hosting, storing, processing, and transmitting Covered Entity's PHI for the purposes of clinical record management, appointment scheduling, billing administration, audit logging, and customer support, in each case as instructed by Covered Entity.

**2.2** For Business Associate's own proper management and administration of its business, provided that any such disclosure is required by law OR Business Associate obtains reasonable assurances from the recipient that the information will remain confidential and used or further disclosed only as required by law or for the purposes for which it was disclosed, and the recipient agrees to notify Business Associate of any breach of confidentiality.

**2.3** As permitted by the HIPAA Rules, to:

- (a) De-identify PHI in accordance with 45 CFR § 164.514(b) (Akwadona does not currently do this; reserved for future use).
- (b) Aggregate PHI for the data-aggregation services of Covered Entity, if expressly requested by Covered Entity in writing.

**2.4** Business Associate shall NOT use or disclose PHI in any manner that would violate Subpart E of 45 CFR Part 164 if done by Covered Entity, except as permitted in Section 2.2 above.

**2.5** Specifically forbidden uses:

- Selling PHI.
- Marketing communications to data subjects using PHI.
- Profiling or behavioural analytics on data subjects.
- Sharing PHI with any entity not bound by an equivalent Business Associate Agreement.

---

#### 3. Safeguards

Business Associate shall implement administrative, physical, and technical safeguards that reasonably and appropriately protect the confidentiality, integrity, and availability of ePHI consistent with the HIPAA Security Rule (45 CFR Part 164, Subpart C). Without limitation, Business Associate maintains:

**3.1 Encryption at Rest.** All ePHI is encrypted using AES-256-GCM with per-tenant customer-managed keys held in AWS Key Management Service (KMS). Encryption keys are inaccessible to Business Associate's employees in their administrative capacity; access is restricted to authenticated application code paths via cryptographically-enforced IAM key-policy conditions.

**3.2 Encryption in Transit.** All transmissions of ePHI between Covered Entity's authorized users and Business Associate's systems are protected by TLS 1.2 or higher, including HSTS enforcement.

**3.3 Access Control.** Each user accessing ePHI is uniquely identified via OAuth 2.0 with multi-factor-eligible authentication via AWS Cognito. Tenant-isolation controls ensure ePHI of Covered Entity is logically separated from any other Covered Entity's PHI.

**3.4 Audit Controls.** Business Associate maintains immutable audit logs of all create, read, update, and delete operations on ePHI for a minimum of seven (7) years.

**3.5 Integrity Controls.** Business Associate uses authenticated encryption (AES-GCM auth tags) and database-level conditional writes to prevent unauthorized modification of ePHI.

**3.6 Risk Analysis and Risk Management.** Business Associate conducts annual risk analyses and maintains an active risk-management program.

**3.7 Workforce Training.** Business Associate trains all workforce members with potential access to ePHI on HIPAA privacy and security obligations at hire and annually thereafter.

**3.8 Documentation.** Reference: Akwadona's `AKW-SSP-05-System-Security-Plan.md`, `AKW-SSP-05-System-Security-Plan.md`, `AKW-CCM-06-Compliance-Controls-Matrix.md`, `AKW-CCM-06-Compliance-Controls-Matrix.md`.

---

#### 4. Reporting

**4.1 Breach of Unsecured PHI.** Business Associate shall notify Covered Entity of any Breach of Unsecured PHI within **forty-eight (48) hours** of discovery. Notification shall include, to the extent then known: (a) the identification of each individual whose PHI was, or is reasonably believed to have been, accessed, acquired, used, or disclosed; (b) a description of the incident; (c) a description of remedial actions taken or planned.

**4.2 Security Incidents.** Business Associate shall report Security Incidents to Covered Entity on a quarterly basis in aggregate form, unless a Security Incident is reasonably likely to lead to a Breach of Unsecured PHI, in which case Section 4.1 timing applies.

**4.3 Unauthorized Uses or Disclosures.** Business Associate shall report any use or disclosure of PHI not permitted by this Agreement within forty-eight (48) hours of discovery.

**4.4 Mitigation.** Business Associate shall mitigate, to the extent practicable, any harmful effect of a use or disclosure of PHI by Business Associate in violation of this Agreement.

---

#### 5. Subcontractors

**5.1** Business Associate shall enter into a Business Associate Agreement (or equivalent legal instrument) with each Subcontractor that creates, receives, maintains, or transmits PHI on behalf of Business Associate. Such instrument shall impose the same restrictions and conditions on the Subcontractor that apply to Business Associate.

**5.2 AWS as Subcontractor.** The Parties acknowledge that Business Associate uses Amazon Web Services, Inc. as a Subcontractor for cloud-infrastructure services. AWS provides HIPAA-eligible services under the AWS Business Associate Addendum (the "AWS BAA"), which Business Associate has accepted. AWS's role is limited to infrastructure provisioning; AWS does not have access to plaintext PHI.

**5.3 Subcontractor List.** Upon Covered Entity's reasonable written request, Business Associate shall provide a list of its Subcontractors with access to PHI.

---

#### 6. Individual Rights

**6.1 Access (45 CFR § 164.524).** Business Associate shall, within fifteen (15) business days of Covered Entity's request, make available PHI in a Designated Record Set to enable Covered Entity to respond to an individual's request for access.

**6.2 Amendment (45 CFR § 164.526).** Business Associate shall, within fifteen (15) business days of Covered Entity's request, incorporate amendments to PHI in a Designated Record Set as directed by Covered Entity.

**6.3 Accounting of Disclosures (45 CFR § 164.528).** Business Associate shall, within thirty (30) days of Covered Entity's request, provide an accounting of disclosures of PHI to enable Covered Entity to respond to an individual's request. Business Associate's audit-log retention enables this for the prior seven (7) years.

**6.4 Restrictions (45 CFR § 164.522).** Business Associate shall honour any restriction on the use or disclosure of PHI to which Covered Entity has agreed and which Covered Entity has communicated in writing.

---

#### 7. Records Available to the Secretary

Business Associate shall make its internal practices, books, and records relating to the use and disclosure of PHI received from, or created or received on behalf of, Covered Entity available to the Secretary of the U.S. Department of Health and Human Services (HHS) for purposes of determining Covered Entity's compliance with the HIPAA Rules.

---

#### 8. Term and Termination

**8.1 Term.** This Agreement is effective as of the Effective Date and shall continue in effect for so long as Business Associate processes PHI on behalf of Covered Entity under the Underlying Agreement.

**8.2 Termination for Material Breach.** Covered Entity may terminate this Agreement immediately upon written notice if Business Associate has materially breached this Agreement and has failed to cure such breach within thirty (30) days after written notice.

**8.3 Effect of Termination — Return or Destruction.** Upon termination of this Agreement, for any reason, Business Associate shall, at Covered Entity's election:

- (a) Return all PHI in Business Associate's possession, in a mutually-agreed format (e.g. FHIR JSON, CSV export), within sixty (60) days; OR
- (b) Destroy all PHI in Business Associate's possession by cryptographically shredding the per-tenant KMS Customer-Managed Key. Destruction of the key renders all encrypted PHI unrecoverable. Akwadona will provide written certification of key destruction.

If neither return nor destruction is feasible (e.g. backup tapes), Business Associate shall extend the protections of this Agreement to such PHI and limit further uses and disclosures to those purposes that make the return or destruction infeasible.

---

#### 9. Indemnification

Each Party shall indemnify and hold the other Party harmless from and against any and all claims, damages, losses, liabilities, and expenses (including reasonable attorneys' fees) arising out of or resulting from the indemnifying Party's breach of this Agreement, except to the extent such claims arise from the indemnified Party's own negligence or wilful misconduct.

---

#### 10. General

**10.1 Amendment.** No modification of this Agreement is effective unless in writing and signed by both Parties. The Parties shall amend this Agreement as necessary to comply with changes to the HIPAA Rules.

**10.2 Survival.** Sections 2 (Permitted Uses), 3 (Safeguards in respect of any retained PHI), 4 (Reporting), 7 (Records to Secretary), 8.3 (Return or Destruction), 9 (Indemnification), 10 (General) survive termination.

**10.3 No Third-Party Beneficiaries.** Nothing in this Agreement is intended to confer rights upon any person other than the Parties.

**10.4 Interpretation.** Any ambiguity in this Agreement shall be resolved in favour of a meaning that permits Covered Entity to comply with the HIPAA Rules.

**10.5 Governing Law.** This Agreement is governed by the laws of **[Governing-Law Jurisdiction]**, without regard to its conflict-of-laws provisions.

**10.6 Notices.** Notices under this Agreement shall be in writing and sent to:

- For Covered Entity: **[Covered Entity Notice Address + DPO email]**
- For Business Associate: `legal@akwadona.com`, with copy to `dpo@akwadona.com`.

**10.7 Counterparts and Electronic Signatures.** This Agreement may be executed in counterparts, including by electronic signature, each of which is an original.

---

#### Signatures

**Covered Entity: [Hospital Legal Name]**

By: ______________________________
Name: ____________________________
Title: ____________________________
Date: ____________________________

**Business Associate: Akwadona [Legal Entity]**

By: ______________________________
Name: ____________________________
Title: ____________________________
Date: ____________________________

---

### Appendix A — Reference to Akwadona Documentation

This BAA references the following internal Akwadona documents that may be requested by Covered Entity during onboarding or due diligence:

- `AKW-SAD-02-Solution-Architecture-Document.md` — Infrastructure overview.
- `AKW-SSP-05-System-Security-Plan.md` — Encryption design proving Section 3.1.
- `AKW-SSP-05-System-Security-Plan.md` — HMAC-hashed search.
- `AKW-CCM-06-Compliance-Controls-Matrix.md` — Detailed Security Rule mapping.
- `AKW-CCM-06-Compliance-Controls-Matrix.md` — Cross-references for EU/GCC dual-regime customers.

---

### Appendix B — Akwadona's Subcontractor List (as of Effective Date)

| Subcontractor | Role | PHI Access | Legal Instrument |
|---|---|---|---|
| Amazon Web Services, Inc. | Cloud infrastructure (compute, storage, key management) | No plaintext PHI; encrypted-storage and key-management services only | AWS Business Associate Addendum |
| _(no others as of date of this template)_ | | | |

Any change to this list shall be communicated to Covered Entity in writing at least thirty (30) days before becoming effective, except where shorter notice is required by law.

---

## Part B — Data Processing Agreement (GDPR Art. 28)

**Use:** This template is signed between Akwadona (Processor) and each hospital customer (Controller) subject to the EU General Data Protection Regulation (GDPR). It satisfies Article 28(3). For customers also subject to Qatar's PDPPL, this DPA stands together with the BAA template (`05d`) and the PDPPL compliance document (`05b`).

> **Disclaimer:** Software-engineering reference template. Legal counsel must review before any actual customer execution. Not legal advice.

---

### Data Processing Agreement

**This Data Processing Agreement** ("DPA" or "Agreement") is entered into as of **[Effective Date]** by and between:

**[Hospital Legal Name]**, with principal offices at **[Hospital Address]** ("Controller")

and

**Akwadona [Legal Entity Name]**, with principal offices at **[Akwadona Address]** ("Processor")

(each, a "Party"; together, the "Parties").

---

#### Recitals

**WHEREAS**, Controller and Processor have entered into a Master Services Agreement dated **[MSA Date]** (the "Principal Agreement") under which Processor provides cloud-hosted hospital management software services to Controller;

**WHEREAS**, in providing the services, Processor processes Personal Data on behalf of Controller and qualifies as a Processor under Article 4(8) of the GDPR;

**WHEREAS**, the Parties wish to comply with the obligations under Article 28 of the GDPR in respect of such processing;

**NOW, THEREFORE**, the Parties agree as follows.

---

#### 1. Definitions

Capitalized terms not defined herein have the meaning given to them in the GDPR. For clarity:

- **"GDPR"** means Regulation (EU) 2016/679.
- **"Personal Data"** means any data Processor processes on behalf of Controller that constitutes "personal data" within the meaning of GDPR Art. 4(1).
- **"Special-Category Data"** has the meaning at GDPR Art. 9(1) and includes the health, genetic, and biometric data Processor stores on behalf of Controller.
- **"Sub-processor"** means any third party engaged by Processor to process Personal Data on Processor's behalf.

---

#### 2. Subject Matter and Duration (Art. 28(3))

**2.1 Subject matter.** Processor processes Personal Data to enable Controller's use of the Akwadona hospital management platform, including: clinical record management, appointment scheduling, billing administration, audit logging, and customer support.

**2.2 Duration.** Until termination of the Principal Agreement, plus any return / deletion period under Section 11.

---

#### 3. Nature and Purpose of Processing

**3.1 Nature of processing.** Storage, retrieval, encryption at rest, encryption in transit, transmission to authorized end-users, audit logging, backup, and disaster recovery.

**3.2 Purpose of processing.** To enable Controller's healthcare service delivery — clinical record-keeping, appointments, billing, and regulatory reporting — as specified in the Principal Agreement. No other purpose is permitted without Controller's prior written consent.

---

#### 4. Types of Personal Data and Categories of Data Subjects (Art. 28(3))

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

#### 5. Controller's Obligations and Rights (Art. 28(3))

Controller represents and warrants:

**5.1** Controller has a lawful basis under GDPR Art. 6 for the processing instructed under this DPA.

**5.2** Controller has satisfied the conditions under GDPR Art. 9(2) for processing Special-Category Data.

**5.3** Controller has provided all required information to data subjects (Art. 13 / 14), including the identity of Processor as a service provider.

**5.4** Controller has appointed a Data Protection Officer (DPO) where required by Art. 37, and Controller will share DPO contact details with Processor on request.

**5.5** Controller has obtained any consents required for transfers of Personal Data to Processor and (transitively) to AWS as a Sub-processor.

**5.6** Controller will issue Processor's processing instructions through documented channels (the Principal Agreement, this DPA, customer-support tickets, or written communications from Controller's authorized representative).

---

#### 6. Processor Obligations under Art. 28(3)

##### 6.1 (a) — Processing only on documented instructions

Processor shall process Personal Data only on documented instructions from Controller, including with regard to transfers of Personal Data to a third country or an international organisation, unless required to do so by Union or Member State law to which Processor is subject. In such a case, Processor shall inform Controller of that legal requirement before processing, unless that law prohibits such information on important grounds of public interest.

##### 6.2 (b) — Confidentiality

Processor shall ensure that persons authorized to process Personal Data have committed themselves to confidentiality or are under an appropriate statutory obligation of confidentiality. This includes:

- Written confidentiality clauses in employment agreements.
- Perpetual confidentiality obligation surviving employment.
- Mandatory annual training on data protection.

##### 6.3 (c) — Security of processing (Art. 32)

Processor shall take all measures required pursuant to Art. 32, including the technical and organizational measures described in **Annex II — Technical and Organizational Measures**.

##### 6.4 (d) — Sub-processors

**6.4.1** Controller grants Processor general authorisation for the engagement of Sub-processors, subject to Sections 6.4.2 to 6.4.4 below.

**6.4.2** Sub-processor list. Processor maintains an up-to-date list of Sub-processors at **Annex III**. Current Sub-processor: Amazon Web Services EMEA SARL (when serving customers via EU AWS regions) or Amazon Web Services, Inc. (when serving via US AWS regions).

**6.4.3** Notice. Processor shall notify Controller in writing at least thirty (30) days in advance of any intended changes to Sub-processors. Controller may object in writing within fifteen (15) days of such notice, in which case the Parties will negotiate in good faith. If no resolution is reached, Controller may terminate this DPA without penalty.

**6.4.4** Equivalent terms. Processor shall impose on each Sub-processor data-protection obligations no less protective than those in this DPA. Processor remains fully liable to Controller for the performance of each Sub-processor's obligations.

##### 6.5 (e) — Assistance with data subject rights

Processor shall, taking into account the nature of the processing, assist Controller by appropriate technical and organizational measures, insofar as possible, in fulfilling Controller's obligation to respond to data subject requests under Chapter III of the GDPR.

- **Right of access (Art. 15):** Processor provides API endpoints that return all PHI for a specified data subject decrypted in JSON.
- **Right of rectification (Art. 16):** Processor provides update endpoints.
- **Right of erasure (Art. 17):** Processor provides delete endpoints; cryptographic erasure via KMS key deletion is available at Controller's election at end of contract.
- **Right of restriction (Art. 18):** Processor supports a `processing_paused` flag on patient records.
- **Right of portability (Art. 20):** Processor exports data in machine-readable JSON format.
- **Right to object (Art. 21):** Processor honours objections relayed by Controller via the delete or restriction endpoints.

Processor commits to respond to Controller's assistance requests within **fifteen (15) business days**.

##### 6.6 (f) — Assistance with security, breach notification, and DPIAs

Processor shall assist Controller in ensuring compliance with the obligations pursuant to Art. 32 to 36 of the GDPR, including:

- Maintaining the technical and organizational measures in Annex II.
- Notifying Controller of Personal Data Breaches (see Section 7).
- Providing the information required for Controller's Data Protection Impact Assessments. Processor's own DPIA is available at `AKW-CCM-06-Compliance-Controls-Matrix.md`.

##### 6.7 (g) — Deletion or return of Personal Data

At Controller's choice upon termination of services:

- Return all Personal Data within sixty (60) days in a mutually-agreed machine-readable format; OR
- Delete all Personal Data by cryptographically shredding the per-tenant KMS Customer-Managed Key. Deletion of the key renders all stored encrypted Personal Data permanently unreadable. Processor will issue written certification of key deletion.

Processor shall not retain copies of the Personal Data after the chosen action is complete, except where retention is required by Union or Member State law (in which case Section 6.1 applies).

##### 6.8 (h) — Making information available + audits

**6.8.1** Processor shall make available to Controller all information necessary to demonstrate compliance with the obligations laid down in Art. 28 and this DPA.

**6.8.2** Processor shall allow for and contribute to audits, including inspections, conducted by Controller or another auditor mandated by Controller. Such audits may not occur more than once per calendar year unless required by a regulatory authority or following a Personal Data Breach.

**6.8.3** Audits shall be conducted on at least thirty (30) days' written notice during normal business hours and shall not unreasonably interfere with Processor's operations. Controller shall bear the cost of its own audit unless the audit reveals a material breach of this DPA, in which case Processor shall reimburse reasonable audit costs.

**6.8.4** As an alternative to on-site audit, Controller may accept Processor's existing third-party certifications (SOC 2 Type II of AWS, ISO 27001 of AWS, Processor's own DPIA and security documentation) as evidence of compliance.

---

#### 7. Personal Data Breach (Art. 33–34)

**7.1** Processor shall notify Controller of any Personal Data Breach affecting Controller's Personal Data **without undue delay and in any event within forty-eight (48) hours** after becoming aware of such a Breach.

**7.2** Notification shall include, to the extent known at the time:

- The nature of the Personal Data Breach including, where possible, the categories and approximate number of data subjects and Personal Data records concerned.
- The likely consequences of the Personal Data Breach.
- The measures taken or proposed to be taken by Processor to address the Personal Data Breach, including measures to mitigate its possible adverse effects.

**7.3** Processor shall cooperate with Controller and provide reasonable assistance in any investigation or remediation following a Personal Data Breach.

---

#### 8. International Transfers (Art. 44–50)

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

#### 9. Liability and Indemnification

The liability provisions of the Principal Agreement apply to claims under this DPA, except to the extent prohibited by applicable law. Each Party shall be liable for damages caused by processing only where it has not complied with obligations of the GDPR specifically directed to processors or has acted outside or contrary to lawful instructions of the Controller (GDPR Art. 82(2)).

---

#### 10. Term and Termination

This DPA enters into effect on the Effective Date and remains in effect for the term of the Principal Agreement. Termination is governed by the Principal Agreement. The obligations under Section 6.7 (deletion or return) and Section 7 (breach notification regarding any Personal Data still in Processor's possession) survive termination.

---

#### 11. Order of Precedence

In the event of any conflict between this DPA and the Principal Agreement, this DPA prevails to the extent it concerns the processing of Personal Data subject to the GDPR.

---

#### 12. General

**12.1 Amendment.** No modification of this DPA is effective unless in writing and signed by both Parties.

**12.2 Severability.** If any provision is held invalid or unenforceable, the remaining provisions remain in full force.

**12.3 Governing law.** This DPA is governed by the laws of **[Governing-Law Jurisdiction]**.

**12.4 Notices.** As provided in the Principal Agreement, with copies of GDPR-related notices to:

- For Controller: **[Controller DPO email]**
- For Processor: `dpo@akwadona.com`

**12.5 Counterparts and electronic signatures.** This DPA may be executed in counterparts including via electronic signature.

---

#### Signatures

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

### Annex I — Subject Matter Details

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

### Annex II — Technical and Organizational Measures (Art. 32)

Processor maintains the following measures. Detailed implementation evidence is referenced at the end of each item.

| Measure | Implementation |
|---|---|
| **Pseudonymisation** | HMAC-SHA256 hashing of search fields via per-tenant KMS HMAC keys (`AKW-SSP-05-System-Security-Plan.md`). Tenant-scoped, irreversible. |
| **Encryption — at rest** | Two-layer: (1) DynamoDB CMK encryption at rest for the table. (2) AES-256-GCM envelope encryption per PHI field with per-tenant KMS Customer-Managed Keys (`AKW-SSP-05-System-Security-Plan.md`). |
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

### Annex III — Sub-processor List (as of Effective Date)

| Sub-processor | Role | Location of Personal Data | Legal Instrument |
|---|---|---|---|
| Amazon Web Services EMEA SARL | Cloud infrastructure (compute, storage, key management) — for EU customers served via EU regions. | Frankfurt (DE) or Dublin (IE) | AWS Data Processing Addendum |
| Amazon Web Services, Inc. | Cloud infrastructure — for non-EU customers served via Northern Virginia (US). | Northern Virginia (US) | AWS Data Processing Addendum + Standard Contractual Clauses |

Any change to this list shall be communicated per Section 6.4.3.

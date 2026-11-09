# Business Associate Agreement (BAA) — Template

**Use:** This template is signed between Akwadona (Business Associate) and each Covered Entity hospital customer that needs HIPAA-aligned protections. Fill in the bracketed fields per customer.

> **Disclaimer:** This is a software-engineering reference template. Before use with an actual customer, Akwadona's counsel and the customer's counsel must review and adapt to the specific deal terms, jurisdiction, and any state-law overlays. This document is not a substitute for legal advice.

---

## Business Associate Agreement

**This Business Associate Agreement** ("Agreement" or "BAA") is entered into as of **[Effective Date]** ("Effective Date") by and between:

**[Hospital Legal Name]**, with principal offices at **[Hospital Address]** ("Covered Entity")

and

**Akwadona [Legal Entity Name]**, with principal offices at **[Akwadona Address]** ("Business Associate")

(each, a "Party"; together, the "Parties").

---

### Recitals

**WHEREAS**, Covered Entity is a Covered Entity as defined under the Health Insurance Portability and Accountability Act of 1996 ("HIPAA") and its implementing regulations at 45 CFR Parts 160 and 164 (the "HIPAA Rules"), as amended by the HITECH Act and the Omnibus Rule;

**WHEREAS**, Business Associate provides cloud-hosted hospital management software-as-a-service to Covered Entity under the Master Services Agreement dated **[MSA Date]** (the "Underlying Agreement");

**WHEREAS**, in the course of providing services under the Underlying Agreement, Business Associate will create, receive, maintain, or transmit Protected Health Information ("PHI") on behalf of Covered Entity;

**NOW, THEREFORE**, the Parties agree as follows.

---

### 1. Definitions

Capitalized terms not otherwise defined herein have the meanings given to them under the HIPAA Rules. For clarity:

- **"PHI"** means Protected Health Information as defined at 45 CFR § 160.103, limited to information Business Associate creates, receives, maintains, or transmits on behalf of Covered Entity.
- **"Electronic PHI"** or **"ePHI"** means PHI transmitted or maintained in electronic media.
- **"Security Incident"** means as defined at 45 CFR § 164.304.
- **"Breach"** means as defined at 45 CFR § 164.402, excluding incidents that are determined under the risk-assessment process to present no significant risk to the PHI.
- **"Subcontractor"** means an agent or subcontractor of Business Associate that creates, receives, maintains, or transmits PHI on behalf of Business Associate. For purposes of this Agreement, **Amazon Web Services, Inc. ("AWS")** is acknowledged as a Subcontractor under a separate AWS Business Associate Addendum.

---

### 2. Permitted Uses and Disclosures by Business Associate

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

### 3. Safeguards

Business Associate shall implement administrative, physical, and technical safeguards that reasonably and appropriately protect the confidentiality, integrity, and availability of ePHI consistent with the HIPAA Security Rule (45 CFR Part 164, Subpart C). Without limitation, Business Associate maintains:

**3.1 Encryption at Rest.** All ePHI is encrypted using AES-256-GCM with per-tenant customer-managed keys held in AWS Key Management Service (KMS). Encryption keys are inaccessible to Business Associate's employees in their administrative capacity; access is restricted to authenticated application code paths via cryptographically-enforced IAM key-policy conditions.

**3.2 Encryption in Transit.** All transmissions of ePHI between Covered Entity's authorized users and Business Associate's systems are protected by TLS 1.2 or higher, including HSTS enforcement.

**3.3 Access Control.** Each user accessing ePHI is uniquely identified via OAuth 2.0 with multi-factor-eligible authentication via AWS Cognito. Tenant-isolation controls ensure ePHI of Covered Entity is logically separated from any other Covered Entity's PHI.

**3.4 Audit Controls.** Business Associate maintains immutable audit logs of all create, read, update, and delete operations on ePHI for a minimum of seven (7) years.

**3.5 Integrity Controls.** Business Associate uses authenticated encryption (AES-GCM auth tags) and database-level conditional writes to prevent unauthorized modification of ePHI.

**3.6 Risk Analysis and Risk Management.** Business Associate conducts annual risk analyses and maintains an active risk-management program.

**3.7 Workforce Training.** Business Associate trains all workforce members with potential access to ePHI on HIPAA privacy and security obligations at hire and annually thereafter.

**3.8 Documentation.** Reference: Akwadona's `docs/03-encryption-and-zero-knowledge.md`, `docs/04-hashed-search-fields.md`, `docs/05a-hipaa-security-rule-mapping.md`, `docs/05c-gdpr-compliance-and-dpia.md`.

---

### 4. Reporting

**4.1 Breach of Unsecured PHI.** Business Associate shall notify Covered Entity of any Breach of Unsecured PHI within **forty-eight (48) hours** of discovery. Notification shall include, to the extent then known: (a) the identification of each individual whose PHI was, or is reasonably believed to have been, accessed, acquired, used, or disclosed; (b) a description of the incident; (c) a description of remedial actions taken or planned.

**4.2 Security Incidents.** Business Associate shall report Security Incidents to Covered Entity on a quarterly basis in aggregate form, unless a Security Incident is reasonably likely to lead to a Breach of Unsecured PHI, in which case Section 4.1 timing applies.

**4.3 Unauthorized Uses or Disclosures.** Business Associate shall report any use or disclosure of PHI not permitted by this Agreement within forty-eight (48) hours of discovery.

**4.4 Mitigation.** Business Associate shall mitigate, to the extent practicable, any harmful effect of a use or disclosure of PHI by Business Associate in violation of this Agreement.

---

### 5. Subcontractors

**5.1** Business Associate shall enter into a Business Associate Agreement (or equivalent legal instrument) with each Subcontractor that creates, receives, maintains, or transmits PHI on behalf of Business Associate. Such instrument shall impose the same restrictions and conditions on the Subcontractor that apply to Business Associate.

**5.2 AWS as Subcontractor.** The Parties acknowledge that Business Associate uses Amazon Web Services, Inc. as a Subcontractor for cloud-infrastructure services. AWS provides HIPAA-eligible services under the AWS Business Associate Addendum (the "AWS BAA"), which Business Associate has accepted. AWS's role is limited to infrastructure provisioning; AWS does not have access to plaintext PHI.

**5.3 Subcontractor List.** Upon Covered Entity's reasonable written request, Business Associate shall provide a list of its Subcontractors with access to PHI.

---

### 6. Individual Rights

**6.1 Access (45 CFR § 164.524).** Business Associate shall, within fifteen (15) business days of Covered Entity's request, make available PHI in a Designated Record Set to enable Covered Entity to respond to an individual's request for access.

**6.2 Amendment (45 CFR § 164.526).** Business Associate shall, within fifteen (15) business days of Covered Entity's request, incorporate amendments to PHI in a Designated Record Set as directed by Covered Entity.

**6.3 Accounting of Disclosures (45 CFR § 164.528).** Business Associate shall, within thirty (30) days of Covered Entity's request, provide an accounting of disclosures of PHI to enable Covered Entity to respond to an individual's request. Business Associate's audit-log retention enables this for the prior seven (7) years.

**6.4 Restrictions (45 CFR § 164.522).** Business Associate shall honour any restriction on the use or disclosure of PHI to which Covered Entity has agreed and which Covered Entity has communicated in writing.

---

### 7. Records Available to the Secretary

Business Associate shall make its internal practices, books, and records relating to the use and disclosure of PHI received from, or created or received on behalf of, Covered Entity available to the Secretary of the U.S. Department of Health and Human Services (HHS) for purposes of determining Covered Entity's compliance with the HIPAA Rules.

---

### 8. Term and Termination

**8.1 Term.** This Agreement is effective as of the Effective Date and shall continue in effect for so long as Business Associate processes PHI on behalf of Covered Entity under the Underlying Agreement.

**8.2 Termination for Material Breach.** Covered Entity may terminate this Agreement immediately upon written notice if Business Associate has materially breached this Agreement and has failed to cure such breach within thirty (30) days after written notice.

**8.3 Effect of Termination — Return or Destruction.** Upon termination of this Agreement, for any reason, Business Associate shall, at Covered Entity's election:

- (a) Return all PHI in Business Associate's possession, in a mutually-agreed format (e.g. FHIR JSON, CSV export), within sixty (60) days; OR
- (b) Destroy all PHI in Business Associate's possession by cryptographically shredding the per-tenant KMS Customer-Managed Key. Destruction of the key renders all encrypted PHI unrecoverable. Akwadona will provide written certification of key destruction.

If neither return nor destruction is feasible (e.g. backup tapes), Business Associate shall extend the protections of this Agreement to such PHI and limit further uses and disclosures to those purposes that make the return or destruction infeasible.

---

### 9. Indemnification

Each Party shall indemnify and hold the other Party harmless from and against any and all claims, damages, losses, liabilities, and expenses (including reasonable attorneys' fees) arising out of or resulting from the indemnifying Party's breach of this Agreement, except to the extent such claims arise from the indemnified Party's own negligence or wilful misconduct.

---

### 10. General

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

### Signatures

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

## Appendix A — Reference to Akwadona Documentation

This BAA references the following internal Akwadona documents that may be requested by Covered Entity during onboarding or due diligence:

- `docs/01-lambda-and-infrastructure.md` — Infrastructure overview.
- `docs/03-encryption-and-zero-knowledge.md` — Encryption design proving Section 3.1.
- `docs/04-hashed-search-fields.md` — HMAC-hashed search.
- `docs/05a-hipaa-security-rule-mapping.md` — Detailed Security Rule mapping.
- `docs/05c-gdpr-compliance-and-dpia.md` — Cross-references for EU/GCC dual-regime customers.

---

## Appendix B — Akwadona's Subcontractor List (as of Effective Date)

| Subcontractor | Role | PHI Access | Legal Instrument |
|---|---|---|---|
| Amazon Web Services, Inc. | Cloud infrastructure (compute, storage, key management) | No plaintext PHI; encrypted-storage and key-management services only | AWS Business Associate Addendum |
| _(no others as of date of this template)_ | | | |

Any change to this list shall be communicated to Covered Entity in writing at least thirty (30) days before becoming effective, except where shorter notice is required by law.

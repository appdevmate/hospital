# Akwadona — PDPPL (Qatar) Compliance Mapping

**Standard:** Qatar Law No. 13 of 2016 — Protection of Personal Privacy Data (PDPPL).
**Companion frameworks:** NCSA NIA (National Information Assurance) data classification, MOPH (Ministry of Public Health) sector guidance.
**Scope:** All controls under PDPPL mapped to Akwadona implementations.
**Status:** Compliant.

This is the primary compliance regime for Akwadona because both founding customers (Tiryaq Hospital, Alshifaa Hospital) operate in Qatar. PDPPL is enforced by the **Compliance and Data Protection Department (CDP)** under the Ministry of Transport and Communications.

---

## What PDPPL says, simply

- Personal data must be processed **lawfully, fairly, transparently**.
- Hospitals (data controllers) must protect patient data.
- Akwadona (data processor) must follow the controller's instructions and provide adequate technical protection.
- Patients have the right to **access, correct, and delete** their data.
- Breaches must be reported.
- Sensitive data (medical, religious, criminal record) gets extra protection.

The law is structurally similar to GDPR but with Qatar-specific carve-outs for **national security**, **public health**, and **medical research**.

---

## Article-by-article mapping

### Art. 3 — Definitions

PDPPL defines:

- **Personal Data Subject** = the patient (or staff member).
- **Controller** = the hospital (Tiryaq, Alshifaa).
- **Processor** = Akwadona, processing data on the controller's instructions per the BAA / DPA.
- **Personal Data of Special Nature** = health data, religion, ethnicity, criminal records. This is Art. 16 territory.

### Art. 4 — Conditions for processing

| Requirement | Akwadona implementation |
|---|---|
| Lawful basis (consent or legal obligation) | Hospitals collect patient consent via their intake forms. Akwadona's role: store + serve the data the hospital provides. Not a direct relationship with the patient. |
| Specific, explicit purpose | Each tenant onboarding includes a Data Processing Agreement (DPA) stating: purpose = clinical record management, billing, appointments. |
| Adequate / relevant / not excessive | Per-tenant data is scoped tightly. No cross-tenant correlation. No analytics on PHI. |

### Art. 5 — Consent

- Patient consent is collected by the **hospital** (controller), not Akwadona.
- For minors: parent/guardian consent is required (Qatar civil code definition of minor).
- Consent withdrawal: patient asks the hospital; the hospital calls our delete endpoint; Akwadona soft-deletes the row, hard-purges after 7-year medical record retention.

### Art. 6 — Information rights of the patient

Patient must be informed (by the hospital) of:

- The controller's identity (the hospital).
- The categories of data processed.
- Recipients of the data (e.g. Akwadona as processor).
- Their right to access, correct, delete, withdraw consent.

**Hospital obligation.** Akwadona supports the underlying data operations.

### Art. 7 — Storage limitation

PDPPL Art. 7 + Qatar medical-record retention norms.

| Implementation |
|---|
| Patient clinical records: retained 10 years post last visit. PHI retention configured via `compliance.js` `RETENTION.PHI_YEARS_10 = 3650 days`. |
| Operational PII (staff records): 3 years post departure. `RETENTION.PII_YEARS_3`. |
| Audit log: 7 years. `RETENTION.AUDIT_YEARS_7`. |
| Session data, locks, idempotency cache: 24 hours via DynamoDB TTL (`expiresAt` attribute). |
| Hard delete after retention period: TTL auto-purges; explicit purge job removes archived data. |

### Art. 8 — Data minimisation

| Implementation |
|---|
| Only fields collected on the patient intake form are stored. No third-party analytics. |
| Encrypted fields = only what's needed for clinical use. Operational fields (PK, SK, EntityType, dates, tenantId) remain plaintext but contain no PHI. |
| Hashed fields (qidHash, emailHash, phoneHash) replace plaintext partition keys — partition keys no longer expose PHI even in metadata. |

### Art. 9 — Integrity & confidentiality

The headline article. Akwadona's strongest claim.

| Sub-requirement | Akwadona implementation |
|---|---|
| Protect against unauthorised access | Per-tenant KMS CMKs. Lambda-execution-role-only decrypt. Zero human IAM access. See `docs/03-encryption-and-zero-knowledge.md`. |
| Protect against accidental loss | DynamoDB Point-in-Time Recovery (35 days). S3 versioning. Annual DR drill. |
| Protect against destruction | Deletion protection on Hospital table. KMS key deletion has 30-day waiting window. CloudTrail logs every destructive action. |
| Encryption at rest | Two layers: (1) DynamoDB CMK encrypts the whole table. (2) Per-tenant CMK envelope encryption per PHI field. |
| Encryption in transit | TLS 1.2+ everywhere. HSTS header. No HTTP allowed. |
| Tenant isolation | Cryptographic — different tenant = different KMS key = mathematically cannot decrypt cross-tenant. |

### Art. 10 — Confidentiality of staff

Anyone with access to the data must keep it confidential, including after termination.

| Implementation |
|---|
| Akwadona employment contracts include perpetual NDA. |
| Cognito IAM credentials disabled on offboarding (within 1 business day). |
| KMS access tied to active IAM role — auto-revoked on credential disable. |
| Audit log captures who accessed what, when (`actorEmail` + `timestamp` on every mutation). |

### Art. 11 — Subject rights (access, rectification, deletion)

| Right | Akwadona endpoint |
|---|---|
| Access | `GET /patients/{id}` — patient (via hospital) sees their record decrypted. |
| Rectification | `PATCH /patients/{id}` — fields updated, audit row records before/after. |
| Erasure | `DELETE /patients/{id}` — soft delete sets `deletedAt`. Hard purge after retention. |
| Restriction of processing | `PATCH /patients/{id}` setting `processing_paused = true` (TODO — currently flagged but not enforced; planned in Step 7 operator console). |
| Data portability | Export via the patient export endpoint (returns the patient's PHI in JSON). |
| Object to processing | Hospital-side decision; Akwadona honours their delete call. |

Response SLA: 30 days from hospital request (PDPPL standard).

### Art. 14 — Cross-border transfers

PDPPL Art. 14 requires:

- Transfers outside Qatar are allowed only to jurisdictions with "adequate protection" OR with explicit consent.

| Implementation |
|---|
| Akwadona's AWS region: `us-east-1` (N. Virginia, US). |
| Status: Qatar does not list the US as automatically adequate. Each customer hospital signs the DPA acknowledging US data hosting + explicit consent. |
| **Future:** Migrate to `me-south-1` (Bahrain, GCC-region) for in-region storage. Tracked in Task #75 as a sub-item. AWS Bahrain region supports KMS, DynamoDB, Lambda. |

### Art. 16 — Data of special nature (PHI)

PHI = "data of special nature" under PDPPL. Triggers extra protection:

- Explicit consent for processing (hospital collects).
- Stronger access controls — implemented as the per-tenant CMK + Lambda-role-only decrypt.
- Stronger audit — every mutation logged.
- Restricted retention — see Art. 7 above.
- No automated profiling without consent — Akwadona doesn't profile.

### Art. 17 — Children's data

Patients under 18 require parental consent.

| Implementation |
|---|
| Hospital collects parental consent at intake (not Akwadona's responsibility). |
| Akwadona stores the `dob` field encrypted. App computes age from dob client-side, never persists "isMinor" as a queryable flag. |
| Special UI handling for paediatric records: planned for the Paediatrics workflow refresh (Task TBD). |

### Art. 19 — Notification of data breach

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

## NCSA NIA — Data classification

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

## MOPH sector guidance

Qatar Ministry of Public Health publishes additional guidance for digital health records:

- **Patient access rights:** patient can request their full medical record from the hospital. Akwadona's export endpoint enables this.
- **Audit trail retention:** 10 years for clinical, 7 years for security audit. Implemented.
- **Foreign data residency:** see Art. 14 above; current US, planned migration to Bahrain.
- **Interoperability:** HL7 FHIR alignment recommended but not required for v1. Future roadmap.

---

## Implementation evidence

For an audit or hospital legal review, point to:

| PDPPL Article | Evidence file |
|---|---|
| Art. 7 retention | `akwadona-cdk/lambda/_shared/compliance.js` (RETENTION constants) |
| Art. 8 minimisation | `docs/03-encryption-and-zero-knowledge.md` field tables |
| Art. 9 confidentiality | `docs/03-encryption-and-zero-knowledge.md` (encryption), `docs/04-hashed-search-fields.md` (search), `docs/akwadona-multitenant-setup.md` (tenant isolation) |
| Art. 11 subject rights | `akwadona-cdk/lambda/getPatientByID/`, `updatePatient/`, `deletePatient/` |
| Art. 14 cross-border | Current AWS region `us-east-1` + DPA section 7 (notice to customer) |
| Art. 16 special nature | `docs/03-encryption-and-zero-knowledge.md` (entire Step 3 design) |
| Art. 19 breach notification | `docs/05f-compliance-overview.md` incident playbook |
| NCSA NIA | `akwadona-cdk/lambda/_shared/compliance.js` (DATA_CLASS) |

---

## What's still pending for full PDPPL parity

- Data residency migration to AWS `me-south-1` (Bahrain) when business case warrants.
- Formal CDP registration if Akwadona crosses the "data processor on substantial volume" threshold.
- Patient-facing data portability portal (currently hospital-mediated).
- Customer DPA in Arabic (currently English-only).

---

## Customer obligations (hospital side)

Akwadona implements the processor controls. The hospital, as controller, must:

- Collect consent at intake.
- Maintain a record of processing activities (the hospital's own register, not Akwadona's).
- Notify patients of their rights per Art. 6.
- Designate a Data Protection Officer (DPO) — required for hospitals under PDPPL.
- Notify Akwadona of any breach affecting Akwadona-hosted data within 24 hours.

The DPA (`docs/05e-dpa-template.md`) memorialises this division of responsibility.

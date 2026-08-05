# Akwadona — GDPR Compliance + Data Protection Impact Assessment (DPIA)

**Standard:** Regulation (EU) 2016/679 — General Data Protection Regulation (GDPR).
**Scope:** Required for any customer with EU patients or EU-based staff. Also serves as the rigorous compliance anchor across all jurisdictions.
**Status:** Compliant. DPIA conducted (Section 2 of this document).

GDPR is the strictest mainstream data-protection regime. Hitting GDPR cleanly means HIPAA and PDPPL are usually covered too.

---

## Part 1 — Article-by-article mapping

### Art. 5 — Principles relating to processing

| Principle | Akwadona implementation |
|---|---|
| (1)(a) Lawfulness, fairness, transparency | Hospital (controller) obtains consent at intake. Akwadona's role disclosed in the hospital's privacy notice. |
| (1)(b) Purpose limitation | Each tenant DPA specifies purpose: clinical record management, appointments, billing. No use beyond this. |
| (1)(c) Data minimisation | Only fields shown in patient/doctor schemas are stored. No third-party analytics. |
| (1)(d) Accuracy | `PATCH /patients/{id}` exists for corrections. Audit log preserves before/after. |
| (1)(e) Storage limitation | Retention schedule in `compliance.js`: PHI 10 years, PII 3 years, audit 7 years, sessions 24h. |
| (1)(f) Integrity & confidentiality | Two-layer encryption (DDB CMK + per-tenant CMK), per-tenant isolation, audit logs. |
| (2) Accountability | This document. Plus `docs/05a-hipaa-security-rule-mapping.md`, `docs/05b-pdppl-qatar-compliance.md`, the DPIA below. |

### Art. 6 — Lawful basis for processing

| Basis | Akwadona use |
|---|---|
| (1)(a) Consent | Primary basis. Hospital collects from patient. |
| (1)(b) Contract | Doctor employment data. |
| (1)(c) Legal obligation | Medical record retention per Qatar / EU healthcare law. |
| (1)(d) Vital interests | Emergency care without prior consent — supported in the app (admin-only override flag). |
| (1)(e) Public interest / official authority | Not applicable. |
| (1)(f) Legitimate interests | Not used for PHI; used for security logs only. |

### Art. 7 — Conditions for consent

- Consent records held by the hospital, not Akwadona.
- Withdrawal: hospital triggers `DELETE /patients/{id}` → soft delete + scheduled hard purge.

### Art. 8 — Children's consent

GDPR sets the age of digital consent at 16 (member states may lower to 13). For health data, **parental/guardian consent** is required regardless — handled by the hospital at intake.

### Art. 9 — Special categories of personal data

Health data is Art. 9(1) "special category" → processing prohibited **unless** Art. 9(2) exception applies.

| Akwadona's Art. 9(2) basis | Use |
|---|---|
| (2)(a) Explicit consent | Patient consent at hospital intake. |
| (2)(h) Health care / medical diagnosis | The clinical workflow itself. |
| (2)(i) Public interest in public health | Outbreak reporting if mandated by health ministry. |

Stronger safeguards are required for Art. 9 data — Akwadona's per-tenant KMS + envelope encryption (Step 3) + HMAC search hashes (Step 4) exceed industry baseline.

### Art. 12–14 — Information to data subject

- Hospital provides the privacy notice.
- Akwadona's identity disclosed as processor in the hospital's notice.
- DPO contact: hospital's DPO; Akwadona's `security@akwadona.com` for processor-side enquiries.

### Art. 15 — Right of access

`GET /patients/{id}` returns the patient's full record decrypted. Hospital-mediated.

### Art. 16 — Right to rectification

`PATCH /patients/{id}` with the corrected fields.

### Art. 17 — Right to erasure ("right to be forgotten")

`DELETE /patients/{id}` soft-deletes the row. After the 10-year retention period (or earlier if no legal hold), the TTL purges the row. Audit log entries referencing the patient remain (legally required), but the patient's PHI fields are KMS-encrypted with the tenant's key; deleting the tenant key cryptographically shreds remaining references.

### Art. 18 — Right to restriction

Currently flag-only. Full enforcement (block reads while flagged) is queued — Task TBD.

### Art. 20 — Right to data portability

Patient export endpoint returns the patient's PHI in JSON. Future enhancement: standardised FHIR JSON output.

### Art. 21 — Right to object

Patient objects → hospital escalates to Akwadona → tenant operator removes the record.

### Art. 22 — Automated decision-making

Akwadona does NOT make automated decisions about patients. The Voice Scribe AI generates a SOAP note draft, but a human doctor reviews and approves before it becomes part of the medical record. This is "automated assistance to a human decision", not Art. 22 territory.

### Art. 25 — Data protection by design and by default

The strongest evidence in our favour. Each design choice in Akwadona:

- **By design:** every PHI mutation must include tenant context (cryptographically enforced), every PHI field is encrypted before write, every query is tenant-scoped.
- **By default:** new users start with the minimum permissions; new tenants get isolated key material; offline-mode queue encrypts pending mutations.

### Art. 28 — Processor

Akwadona is a **data processor** under GDPR. Art. 28(3) requires a written contract specifying:

- Subject matter, duration, nature and purpose of processing.
- Type of personal data and categories of data subjects.
- Obligations of the controller.
- Eight specific processor obligations (a)-(h).

These are all covered in the DPA template (`docs/05e-dpa-template.md`).

### Art. 30 — Records of processing activities

Akwadona maintains a processing activity register (this document + the per-tenant DPA registry). Available to supervisory authorities on request.

### Art. 32 — Security of processing

The single most quoted GDPR article for cloud-hosted health platforms.

| Art. 32 requirement | Akwadona implementation |
|---|---|
| (1)(a) Pseudonymisation and encryption | AES-256-GCM envelope encryption per Step 3. HMAC pseudonymisation of search fields per Step 4. |
| (1)(b) Ongoing confidentiality, integrity, availability, resilience | DDB Multi-AZ replication, Lambda regional redundancy, CloudFront global edge, KMS HA. |
| (1)(c) Restore availability in a timely manner | PITR 35 days. RTO 4h, RPO 1h. |
| (1)(d) Regular testing, assessing, evaluating | Annual DR drill, quarterly security review, this DPIA. |
| (2) Appropriate level of security | Risk assessment in Section 2 of this doc supports the design choices. |

### Art. 33 — Breach notification to supervisory authority

Required within **72 hours** of awareness.

Akwadona incident playbook timeline matches PDPPL (T+72h to authority). Same playbook handles both.

### Art. 34 — Breach communication to data subjects

When "high risk to rights and freedoms" — Akwadona supports the hospital in determining whether the threshold is met. Communication itself is the hospital's responsibility.

### Art. 35 — Data Protection Impact Assessment

**REQUIRED for Akwadona** because: "processing on a large scale of special categories of data" (Art. 35(3)(b)).

See Part 2 of this document.

### Art. 37–39 — Data Protection Officer

Akwadona designates a DPO whose contact is `dpo@akwadona.com`. Responsibilities per Art. 39:

- Inform / advise on GDPR obligations.
- Monitor compliance.
- Provide advice on DPIAs.
- Cooperate with supervisory authorities.
- Act as contact point for data subjects.

### Art. 44–50 — Cross-border transfers

Akwadona transfers data to AWS US (`us-east-1`).

| Mechanism | Status |
|---|---|
| Adequacy decision | The US **does not** have a general adequacy decision after Schrems II. |
| Standard Contractual Clauses (SCCs) | AWS provides SCCs in the AWS Customer Agreement / DPA. Akwadona inherits via the AWS DPA. |
| Supplementary measures | KMS encryption + AWS US has FIPS 140-2 endpoints. |
| Future: EU-only region | Move to `eu-central-1` (Frankfurt) or `eu-west-1` (Ireland) when business case warrants. Tracked. |

For EU customers specifically, we'd onboard them in `eu-central-1` from day one. Multi-region architecture is part of the Step 6 scalability roadmap.

---

## Part 2 — Data Protection Impact Assessment (DPIA)

Required by GDPR Art. 35 because Akwadona processes **special category data on a large scale**.

### 2.1 Description of processing

| Aspect | Description |
|---|---|
| Nature | Storing, querying, displaying, updating clinical records on behalf of hospital customers. |
| Scope | Patient identity, demographics, medical history, current medications, allergies, examination notes, prescriptions, lab orders, appointments, billing, audit logs. |
| Context | Hospital customers (data controllers); Akwadona (data processor). End users: doctors, pharmacists, admin staff. Data subjects: patients (primarily Qatar residents). |
| Purposes | Clinical record management, appointment scheduling, billing, audit trail, regulatory compliance. |

### 2.2 Necessity and proportionality

| Question | Assessment |
|---|---|
| Could the purpose be achieved with less data? | No — we collect only what's required for clinical use. Demographics, identifiers, and medical history are minimum viable for the hospital's workflow. |
| Is the processing proportionate to the purpose? | Yes — each field stored has a direct clinical or operational use. No marketing, no profiling. |
| Is the legal basis clearly identified? | Yes — Art. 6(1)(b) contract + Art. 9(2)(h) health care, with Art. 9(2)(a) explicit consent collected at intake. |
| Is the data accurate and kept up to date? | Yes — `PATCH` endpoints exist for every field; audit log preserves change history. |
| Is the retention proportionate? | Yes — 10 years post-last-visit is the Qatar / EU norm for medical records. |

### 2.3 Risk assessment

#### Risk 1: Unauthorised access by Akwadona staff

| Likelihood | Impact | Inherent risk | Residual risk |
|---|---|---|---|
| Medium | Critical | High | **Low** |

Mitigations:

- Per-tenant KMS CMKs. Key policy restricts decrypt to Lambda execution roles ONLY. No human IAM principal (including engineers, deploy user, root account on day-to-day operations) can decrypt PHI.
- CloudTrail logs every KMS Decrypt + GenerateMac call with the calling principal. Anomaly detection (planned: CloudWatch alarm on non-Lambda principal).
- Background checks + NDA on all engineers with production access.

#### Risk 2: Breach via stolen AWS credentials

| Likelihood | Impact | Inherent risk | Residual risk |
|---|---|---|---|
| Low | Critical | High | **Low** |

Mitigations:

- MFA enforced on all admin accounts.
- IAM credentials are short-lived where possible (SSO).
- Even with full IAM access, the attacker cannot decrypt PHI (key policy condition matches only the Lambda role pattern).
- Deletion of KMS keys requires 30-day waiting window — gives the security team time to react.

#### Risk 3: Insider threat — Lambda code modification

| Likelihood | Impact | Inherent risk | Residual risk |
|---|---|---|---|
| Low | Critical | Medium-High | **Medium** |

Mitigations:

- CDK code in version control, every deploy is a commit.
- CI required-review on the deploy branch (TODO — currently relies on engineer discipline; planned for Step 7 operations).
- CloudTrail logs all `UpdateFunctionCode` calls.

Residual risk is medium because a malicious deploy would have time to exfiltrate before detection. **Mitigation in flight:** require CI signed commits, enable code signing on Lambda functions.

#### Risk 4: Cross-tenant data leak

| Likelihood | Impact | Inherent risk | Residual risk |
|---|---|---|---|
| Low | Critical | High | **Very low** |

Mitigations:

- Three-layer defence (entry guard + DDB ConditionExpression + post-query filter) on PHI-touching Lambdas.
- Different tenants use different KMS keys — cross-tenant decrypt is mathematically impossible.
- HMAC search hashes are tenant-scoped — cross-tenant probing impossible.
- Auth guard on frontend prevents wrong-subdomain access.

#### Risk 5: Loss of availability

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

#### Risk 6: KMS key accidentally deleted

| Likelihood | Impact | Inherent risk | Residual risk |
|---|---|---|---|
| Very low | Catastrophic | Medium | **Low** |

Mitigations:

- KMS key deletion has 7–30 day waiting window — gives team time to cancel.
- Key deletion protection flag enabled on console.
- Documented in disaster recovery playbook — first step is "cancel any scheduled deletion".
- Compliance binder lists every tenant CMK, who can administer it, escalation contact.

### 2.4 Risks to data subjects

| Risk to patient | How realised | Akwadona mitigation |
|---|---|---|
| Identity theft from leaked QID + name | Database breach | Encryption + hashing — leaked DDB rows are unreadable. |
| Embarrassment from leaked medical condition | Database breach + decryption | Zero-knowledge architecture — leak alone is insufficient; would also need KMS access (separate breach). |
| Discrimination in employment / insurance | Cross-system data leakage | Strict purpose limitation in DPA, no analytics on PHI, no third-party access. |
| Loss of trust in healthcare digital systems | Public breach disclosure | 72-hour notification regime, transparent communication, root-cause publication. |

### 2.5 Conclusion

The combination of **per-tenant KMS CMKs**, **envelope encryption**, **HMAC-hashed search**, **three-layer tenant isolation**, and **append-only audit trail** brings residual risks to the lowest practical level for cloud-hosted SaaS healthcare platforms.

**The DPIA concludes that processing can proceed.** Residual risks are acceptable for the purposes pursued, given the safeguards in place.

Annual DPIA review scheduled. Triggers for ad-hoc review: new tenant onboarding, new entity types, infrastructure region change, AWS service changes.

---

## Part 3 — Implementation evidence (GDPR)

| GDPR control | Akwadona evidence file |
|---|---|
| Art. 5(1)(f) integrity & confidentiality | `docs/03-encryption-and-zero-knowledge.md`, `docs/04-hashed-search-fields.md` |
| Art. 5(1)(e) storage limitation | `akwadona-cdk/lambda/_shared/compliance.js` (RETENTION) |
| Art. 25 by design & by default | `docs/akwadona-multitenant-setup.md`, all of `docs/03-*` and `docs/04-*` |
| Art. 28 processor | `docs/05e-dpa-template.md` (DPA) |
| Art. 30 records of processing | This document + per-tenant DPA registry |
| Art. 32(1)(a) pseudonymisation | `docs/04-hashed-search-fields.md` |
| Art. 32(1)(b)–(d) resilience + testing | `docs/01-lambda-and-infrastructure.md` + annual DR drill |
| Art. 33 breach notification | `docs/05f-compliance-overview.md` incident playbook |
| Art. 35 DPIA | Part 2 of this document |

---

## Part 4 — Open follow-ups

- **EU region deployment** (`eu-central-1` or `eu-west-1`) for EU customers. Currently Qatar-focused with US AWS region.
- **Patient portal** so patients exercise Art. 15–22 rights directly (today routed via hospital).
- **CI signed-commit + Lambda code-signing** to reduce insider-threat residual risk on the Lambda layer.
- **Annual DPIA review** scheduled.
- **FHIR JSON export** for proper data-portability under Art. 20.

---

## Part 5 — DPO + customer contact

- **Akwadona DPO:** `dpo@akwadona.com`. Responsibilities per Art. 39.
- **Customer data subject enquiries:** route via hospital's DPO; processor-side enquiries to `dpo@akwadona.com`.
- **Supervisory authority cooperation:** Akwadona will respond to any GDPR supervisory authority within the statutory deadlines.

---

## Part 6 — What Akwadona doesn't do (GDPR-relevant exclusions)

To set expectations:

- **No automated decision-making with legal effect** — Voice Scribe is human-reviewed.
- **No profiling on PHI** — no behavioural analytics.
- **No third-party sharing** — data stays within the tenant and AWS infrastructure.
- **No marketing emails using PHI** — system emails (password reset, etc.) only; never references medical context.
- **No selling of data** — explicitly forbidden in the master subscription agreement.

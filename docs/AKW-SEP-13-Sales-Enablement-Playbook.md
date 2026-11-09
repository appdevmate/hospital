# Akwadona Hospital Platform — Sales Enablement Playbook

| Document control | |
|---|---|
| **Document ID** | AKW-SEP-13 |
| **Document type** | Sales Enablement Playbook — ICP, value proposition, battlecard, objection handling, RFP response library, demo script |
| **Version** | 1.1 |
| **Status** | Approved |
| **Classification** | Internal — Sales and Marketing |
| **Owner** | Founder / Commercial |
| **Approver** | Founder / CTO |
| **Effective date** | 2026-10-30 |
| **Review cycle** | Quarterly, and whenever a control status in AKW-SSP-05 §9 changes (claims must track reality) |
| **Supersedes** | `archive/40-sales-handbook.md` |
| **Related documents** | AKW-SO-01 (what to send a prospect), AKW-CCM-06 (proof for every compliance claim), AKW-SSP-05 §9 (what we may NOT yet claim), `../skills/akwadona-competitive-positioning/SKILL.md` |

| Revision history | | | |
|---|---|---|---|
| **Version** | **Date** | **Author** | **Change** |
| 1.0 | 2026-10-30 | Platform team | Consolidated into the enterprise document set |
| 1.1 | 2026-10-31 | Platform team | Added "This document answers" and "Abbreviations used in this document" blocks after document control |

## This document answers

1. Who is our ideal customer, and who is not?
2. What are our differentiators, ranked, each with the document that proves it?
3. What are the three objections every call gets, and how do we answer them honestly?
4. What are the approved answers for security, multi-tenancy, compliance, availability, interoperability, and pricing questions in an RFP?
5. Which words do we use, which do we avoid — and which claims are we not allowed to make yet?
6. How do we run a fifteen-minute demo?

## Abbreviations used in this document

> **Why this table exists.** Every short form that appears anywhere in this document is listed here with (1) what the letters stand for and (2) what it means in plain words. If a term is not here and is not obvious, that is a documentation bug — add it. The complete glossary with examples and console links is AKW-SO-01 Appendix A.

| Abbreviation | Stands for | What it means |
|---|---|---|
| **ADR** | Architecture Decision Record | A short note that records one design decision: the situation, the choice made, and what it costs. Written once, never edited; a later record can replace it. |
| **AI** | Artificial Intelligence | Software that performs tasks that normally need human judgement — here, turning a transcript into a clinical note. |
| **API** | Application Programming Interface | The set of URLs one program calls to use another program's features. Ours is a REST API. |
| **ARN** | Amazon Resource Name | The unique ID string of any AWS resource. |
| **AWS** | Amazon Web Services | Amazon's cloud-computing platform. Everything Akwadona runs on it. |
| **BAA** | Business Associate Agreement | A contract required by the US health-privacy law HIPAA between a hospital and any company (like Akwadona) that handles patient data for it. It says how the data will be protected. |
| **CCM** | Compliance Controls Matrix | A table that maps each rule in a law or standard to the specific thing we do to satisfy it, and the evidence an auditor can check. |
| **CFO** | Chief Financial Officer | The head of finance. |
| **CMK** | Customer Managed Key | A KMS encryption key that we create and control (as opposed to one AWS manages for us). |
| **CMO** | Chief Medical Officer | The senior doctor in charge of clinical practice. |
| **CSV** | Comma-Separated Values | A plain-text spreadsheet format. |
| **CTO** | Chief Technology Officer | The head of technology. |
| **DICOM** | Digital Imaging and Communications in Medicine | The standard file format for medical images (X-ray, CT, MRI). |
| **DPA** | Data Processing Agreement | A contract required by the EU privacy law GDPR between a data controller (the hospital) and a data processor (Akwadona). It says what the processor may do with personal data. |
| **DR** | Disaster Recovery / Document Register | Disaster Recovery: how we restore the system after a major failure. Document Register (AKW-DR-00): the master index of this documentation set. |
| **EH** | Engineering Handbook | The document-type code for the engineering handbook (AKW-EH-10). |
| **EMR** | Electronic Medical Record | The digital version of a patient's chart. Akwadona is an EMR. |
| **FHIR** | Fast Healthcare Interoperability Resources | The modern standard for exchanging health data between systems. On our roadmap. |
| **FS** | Functional Specification | The document that describes what the system does — every feature, rule, and setting — without describing how it is built. |
| **GCC** | Gulf Cooperation Council | The six Gulf states: Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, Oman. |
| **GDPR** | General Data Protection Regulation | The European Union's privacy law (2018). It gives people rights over their data and sets duties on companies that process it. |
| **HIPAA** | Health Insurance Portability and Accountability Act | The US law that sets rules for protecting patients' health information. Its "Security Rule" lists the technical safeguards we must have. |
| **HITRUST** | Health Information Trust Alliance | A healthcare-specific security certification framework, common in the US. |
| **HMAC** | Hash-based Message Authentication Code | A fingerprint of a value computed with a secret key. Same value + same key = same fingerprint; different keys give different fingerprints. We use it to search encrypted fields. |
| **IAM** | Identity and Access Management | AWS's permission system: which user or service may do which action on which resource. |
| **ICD** | Interface Control Document / International Classification of Diseases | ICD the document: the exact contract for how one system talks to another (our API). ICD the medical code: a worldwide numbering of diagnoses, e.g. ICD-10. |
| **ICP** | Ideal Customer Profile | A description of the kind of customer the product fits best. |
| **IT** | Information Technology | Computers, networks, and software — and the department that runs them. |
| **JSON** | JavaScript Object Notation | The text format our API uses for data. |
| **JWT** | JSON Web Token | A signed digital ID card the browser sends with every request. It names the user, their hospital, and their role. |
| **KLAS** | KLAS Research | A company that ranks healthcare software vendors. |
| **KMS** | Key Management Service | AWS's vault for encryption keys. Keys never leave it; it encrypts and decrypts on request. |
| **LGL** | Legal | The document-type code for the legal agreement templates (AKW-LGL-07). |
| **LOINC** | Logical Observation Identifiers Names and Codes | A worldwide code set for lab tests and clinical measurements. |
| **MFA** | Multi-Factor Authentication | Needing two proofs to sign in — a password plus a code from a phone app. |
| **MIME** | Multipurpose Internet Mail Extensions | The standard labels for file types, e.g. application/pdf. |
| **OPS** | Operations | Running the system day to day: deploying, monitoring, backing up, recovering. |
| **PACS** | Picture Archiving and Communication System | The hospital system that stores and displays medical images. |
| **PDPPL** | Personal Data Privacy Protection Law | Qatar's national privacy law (Law No. 13 of 2016). Qatar's equivalent of GDPR. |
| **PHI** | Protected Health Information | Any information that identifies a patient and relates to their health: name, ID number, diagnosis, medication, phone, date of birth. |
| **PWA** | Progressive Web App | A web app that can be installed like a phone app and work offline. |
| **QID** | Qatari ID | The national identity number of a Qatar resident (11 digits). |
| **RCM** | Revenue Cycle Management | The billing and insurance-claims side of a hospital. |
| **REST** | Representational State Transfer | A style of API built on standard web verbs (GET, POST, PATCH, DELETE) and resource URLs. |
| **RFP** | Request for Proposal | A formal document a buyer sends to vendors asking them to propose a solution and a price. |
| **RPO** | Recovery Point Objective | How much recent data we may lose in a disaster. Ours: 15 minutes. |
| **RTL** | Right-to-Left | Text direction for Arabic, Hebrew, Urdu. Our layout flips for these languages. |
| **RTO** | Recovery Time Objective | How long the system may be down after a disaster before it must be back. Ours: 4 hours. |
| **S3** | Simple Storage Service | AWS file storage — a bucket holds files of any size. |
| **SAD** | Solution Architecture Document | The master technical design document: how the whole system is built, from infrastructure to data to security. |
| **SEP** | Sales Enablement Playbook | The document that gives sales staff the approved facts, answers, and scripts. |
| **SO** | Solution Overview | The executive summary of the platform in plain language. |
| **SOAP** | Subjective, Objective, Assessment, Plan | The standard four-part structure of a clinical note: what the patient says, what the doctor observes, the diagnosis, and the treatment plan. |
| **SOC** | System and Organization Controls | An independent audit report (SOC 2) on a service company's security controls. Customers often ask for it. |
| **SSP** | System Security Plan | The document that lists every security control the system has, how it is implemented, and its status. A NIST-defined document type. |
| **UI** | User Interface | The screens a person uses. |
| **UK** | United Kingdom | Britain. |
| **US** | United States | The United States of America. |
| **UX** | User Experience | How it feels to use the system. |

**Truth rule.** Every claim in a deck, e-mail, or RFP answer must trace to a row in AKW-CCM-06 or a control marked *Implemented* in AKW-SSP-05. As of this version do **not** say "nightly", "automated", "MFA required", or "WAF" — each is an open item with a date in AKW-RR-12. The honest phrasings are in §5 and §6.

---


**What it is** — the pitch, the objections, the differentiators, the proof — in one place for anyone customer-facing.

**Why it exists** — RFPs ask the same questions. Hospitals object to the same risks. We need one source of truth so Marketing + Sales + Engineering tell the same story.

**Real-life example** — a hospital IT lead asks "How do we know Akwadona staff can't read our patient data?". Instead of inventing an answer, point them at `AKW-SSP-05-System-Security-Plan.md` + run `scripts/cross-tenant-probe.js` live.

**How Akwadona uses it** — Sales reads this before every discovery call. Marketing writes landing pages from §4 differentiators. RFP responses lift from §6.

### 3. Who we sell to

#### 3.1 Ideal customer profile (ICP)
- **Qatar or GCC**, 10–500 beds, single hospital or small group (2–10 branches).
- Currently using paper, Excel, a local vendor, or has an Epic/Cerner RFP that stalled on budget.
- Chief Medical Officer frustrated with doctor documentation burden.
- CFO frustrated with capex + per-bed licensing.
- IT lead who read "zero-knowledge" and understood what it meant.

#### 3.2 Not our customer (yet)
- 1000+ bed academic medical centers in the US / UK (Epic is their choice; we don't out-feature Epic on complex RCM).
- US-only billing (we're not RCM-specialized).
- Hospitals legally required to run on-prem (some govt facilities).

### 4. Ten ranked differentiators

| # | Differentiator | Proof |
|---|---|---|
| 1 | **Zero-knowledge platform** — per-tenant KMS CMKs + operator IAM DENY. Vendor cannot read patient data. | `AKW-SSP-05-System-Security-Plan.md`, `lib/akwadona-cdk-stack.ts` IAM blocks |
| 2 | **PDPPL + HIPAA + GDPR mapped**, article by article | `AKW-CCM-06` |
| 3 | **SaaS pricing** — rent, don't buy; no million-dollar implementation | commercial sheet |
| 4 | **Arabic-first + 6-language UX** with RTL support | `AKW-FS-03-Functional-Specification.md`, screenshots |
| 5 | **Bedrock-native AI (ScribeFirst)** — doctor speaks, SOAP auto-fills | `AKW-FS-03-Functional-Specification.md`, live demo |
| 6 | **Offline-first PWA** — writes queue when WiFi drops, drains on reconnect | `AKW-EH-10-Engineering-Handbook.md` §8, live demo |
| 7 | **AWS-native, serverless** — no servers to patch, scales elastically | `AKW-SAD-02-Solution-Architecture-Document.md`, `AKW-SAD-02-Solution-Architecture-Document.md` |
| 8 | **Multi-hospital network ready** — one operator console manages N tenants | `AKW-FS-03-Functional-Specification.md`, `AKW-FS-03-Functional-Specification.md` |
| 9 | **Modern UX** — PrimeNG + Tailwind + signals; feels 2025, not 2005 | screenshots side-by-side vs Epic |
| 10 | **Operational transparency** — repeatable cross-tenant isolation probe + attack-test suite we can run in front of the customer, plus BAA/DPA templates | `scripts/cross-tenant-probe.js`, `scripts/security-tests/`, `AKW-LGL-07 Part A`, `AKW-LGL-07 Part B` |

### 5. The three objections every call gets

#### 5.1 "We already have Epic / Cerner / Oracle Health"
Response:
> "Epic is excellent for 500-bed academic centers. For a 10–200 bed facility in Qatar, you'd be paying for complexity you can't use. Here's what you get for 1/50th the price: [show the Price Comparison + Arabic UI + ScribeFirst]."

Follow with: "What was the one Epic feature that mattered most to your evaluation?" and show our equivalent.

#### 5.2 "Multi-tenancy worries me — our data is next to another hospital's"
Response:
> "That is the exactly correct question. Each hospital has its own AWS KMS Customer-Managed Key. Your patient's name is encrypted with your key before it enters the shared table. The next hospital's Lambda cannot even request your key — AWS IAM denies the call before the key policy is evaluated. We have a cross-tenant isolation test we can run live in front of your team — it creates a record as one hospital and proves a second hospital gets 'not found' on every path — and an attack-test suite covering forged tokens, injection, and enumeration."

> **Do not say "nightly" or "automated" until it is scheduled.** As of 2026-10-29 the probe is run by hand. The sentence above is the honest version.

Reference: [`AKW-SSP-05-System-Security-Plan.md`](AKW-SSP-05-System-Security-Plan.md).

#### 5.3 "What if Akwadona disappears?"
Response:
> "Vendor lock-in is a legitimate concern for every SaaS. Your data lives in your AWS account's DynamoDB table in a documented single-table schema. We provide an export script that produces a CSV + JSON archive of every encrypted row plus the KMS CMK ARN. In the DPA Section 11 (Transition Assistance), we commit to 90 days of migration support."

Reference: [`AKW-LGL-07-Legal-Agreement-Templates.md`](AKW-LGL-07-Legal-Agreement-Templates.md), [`AKW-ADR-11-Architecture-Decision-Log.md`](AKW-ADR-11-Architecture-Decision-Log.md).

### 6. RFP answer templates

#### 6.1 Security
> "Akwadona uses envelope encryption with per-tenant AWS KMS Customer-Managed Keys (CMKs). Protected Health Information fields (patient name, Qatar ID, phone, email, date of birth, clinical notes) are encrypted at the application layer before storage in DynamoDB; uploaded documents are stored in S3 under a customer-managed key. Equality lookups (e.g., 'find patient by QID') use HMAC-SHA256 hashes computed inside the AWS KMS Hardware Security Module. Vendor employees cannot decrypt customer data: the operator IAM role has an explicit `kms:Decrypt` deny policy on every tenant key. See AKW-SSP-05-System-Security-Plan.md."

#### 6.2 Multi-tenancy
> "Akwadona is a pooled multi-tenant SaaS. One AWS infrastructure serves multiple hospital customers. Isolation is enforced at four layers: (1) JWT `tenantId` claim injected by a Cognito pre-token Lambda; (2) DynamoDB `tenantId` partition key on a dedicated Global Secondary Index; (3) per-tenant KMS Customer-Managed Keys for PHI encryption; (4) a repeatable cross-tenant isolation probe and attack-test suite (`scripts/cross-tenant-probe.js`, `scripts/security-tests/`) that we run before every release and can run on request. See AKW-SSP-05-System-Security-Plan.md."

#### 6.3 Compliance
> "Akwadona maps its controls to HIPAA Security Rule (AKW-CCM-06 §2), Qatar PDPPL (AKW-CCM-06 §3), and GDPR (AKW-CCM-06 §4). We provide a Business Associate Agreement template (AKW-LGL-07 Part A) and a Data Processing Agreement template (AKW-LGL-07 Part B) for signature. CloudTrail multi-region with log file validation, 7-year S3 Object Lock on the audit bucket, and application-layer audit on every PHI mutation together satisfy audit control requirements."

#### 6.4 Availability + disaster recovery
> "Akwadona runs on AWS us-east-1 with planned expansion to me-south-1 (Bahrain) for GCC data residency. DynamoDB with Point-In-Time Recovery (35-day window) and S3 Cross-Region Replication (planned Q1 2027) provide disaster recovery. Recovery Time Objective (RTO) is 4 hours; Recovery Point Objective (RPO) is 15 minutes. See AKW-OPS-08-Operations-Runbook.md."

#### 6.5 Interoperability
> "Akwadona exposes a REST API documented in AKW-ICD-04-Interface-Control-Document.md. FHIR R4 export is on the roadmap for Q2 2027. Data export in CSV + JSON is available on-demand. Integration with external labs and PACS is supported via the Documents module (pre-signed S3 upload with DICOM MIME support)."

#### 6.6 Pricing
Describe in commercial collateral (not in docs). Reference the plan-defaults.js matrix for feature gating.

### 7. Language we use

#### Use
- "Pooled multi-tenancy with per-tenant encryption keys"
- "Zero-knowledge — we cannot read your patient data"
- "Audit-ready"
- "Serverless"
- "AWS-native"
- "Mapped to PDPPL Article X"
- "Days to deploy, not months"
- "Arabic-first with 6-language support"

#### Avoid
- "Bank-grade security" (meaningless)
- "Military-grade encryption" (meaningless²)
- "AI-powered" without naming the model and the use case
- "Best-in-class" / "state-of-the-art" (filler)
- "Blockchain" (we're not)
- "HIPAA-compliant" as a bare claim — always append "mapped to the Security Rule, see AKW-CCM-06 §2"

### 8. Demo script (15 min, works for CMO + IT lead + CFO)

1. (1 min) Open `tiryaq.akwadona.com` → show Arabic login.
2. (2 min) Sign in as doctor1 → dashboard with today's appointments.
3. (2 min) Open a patient → show structured consultation form with ICD-10/LOINC lookup.
4. (3 min) **ScribeFirst**: start recording → speak 3 sentences → Bedrock auto-fills SOAP → doctor approves. "This is the #1 reason doctors leave your hospital."
5. (1 min) Pharmacy allergy guardrail: dispense a flagged medication → system blocks + requires override. "Clinical safety baked in."
6. (2 min) Blood bank: show donor → donation → unit → crossmatch → issue chain. "Full traceability for every unit."
7. (2 min) Operator console at `www.akwadona.com/operator` — show the subscription view, note the absence of patient data. "Our platform staff literally cannot see this. Here's the IAM policy." (open AWS Console on screen).
8. (2 min) Offline demo: disable WiFi, add a patient, re-enable, show the queue drain. "No workflow interruption."

### 9. Compliance surface
- The claims we make must trace to specific controls. See:
  - [`AKW-CCM-06-Compliance-Controls-Matrix.md`](AKW-CCM-06-Compliance-Controls-Matrix.md)
  - [`AKW-CCM-06-Compliance-Controls-Matrix.md`](AKW-CCM-06-Compliance-Controls-Matrix.md)
  - [`AKW-CCM-06-Compliance-Controls-Matrix.md`](AKW-CCM-06-Compliance-Controls-Matrix.md)
  - [`AKW-CCM-06-Compliance-Controls-Matrix.md`](AKW-CCM-06-Compliance-Controls-Matrix.md)

### 10. Open questions / future work
- Reference customer case studies (currently 2 tenants: Tiryaq + Alshifaa; need written case study with each).
- Independent penetration test report (planned Q4 2026). Internal attack-test suite (`scripts/security-tests/`) exists as of 2026-10-29.
- Schedule the isolation probe (GitHub Actions or EventBridge once the stack is split) so "automated" becomes true.
- Decide on MFA REQUIRED for Operator/Admin (currently OPTIONAL).
- SOC 2 Type II audit (planned 2027).
- HITRUST (optional, enterprise ask).
- Analyst coverage (KLAS, Gartner for GCC EMRs).

### 11. References
- All of the document set (AKW-DR-00)
- `../skills/akwadona-competitive-positioning/SKILL.md`

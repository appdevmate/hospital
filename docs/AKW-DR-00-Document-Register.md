# Akwadona Hospital Platform — Document Register

| Document control | |
|---|---|
| **Document ID** | AKW-DR-00 |
| **Document type** | Document Register and Control Record (master index of the documentation set) |
| **Version** | 1.1 |
| **Status** | Approved |
| **Classification** | Internal |
| **Owner** | Founder |
| **Effective date** | 2026-10-30 |
| **Review cycle** | Quarterly — every document below is checked for currency; versions bumped |

| Revision history | | | |
|---|---|---|---|
| **Version** | **Date** | **Author** | **Change** |
| 1.0 | 2026-10-30 | Platform team | Replaced 42 loosely numbered files with a 14-document enterprise set; originals archived |
| 1.1 | 2026-10-31 | Platform team | Added "This document answers" and "Abbreviations used in this document" blocks after document control |

## This document answers

1. Which document do I open for a given question — architecture, a feature, security, an incident, a deployment, a sale?
2. What are the fourteen documents, who owns each, and who is allowed to see each?
3. When something in the system changes, which document must be updated?
4. How are documents versioned, approved, classified, and reviewed?
5. Where did the old numbered documents go, and how do they map to the new set?

## Abbreviations used in this document

> **Why this table exists.** Every short form that appears anywhere in this document is listed here with (1) what the letters stand for and (2) what it means in plain words. If a term is not here and is not obvious, that is a documentation bug — add it. The complete glossary with examples and console links is AKW-SO-01 Appendix A.

| Abbreviation | Stands for | What it means |
|---|---|---|
| **ADR** | Architecture Decision Record | A short note that records one design decision: the situation, the choice made, and what it costs. Written once, never edited; a later record can replace it. |
| **API** | Application Programming Interface | The set of URLs one program calls to use another program's features. Ours is a REST API. |
| **AWS** | Amazon Web Services | Amazon's cloud-computing platform. Everything Akwadona runs on it. |
| **CCM** | Compliance Controls Matrix | A table that maps each rule in a law or standard to the specific thing we do to satisfy it, and the evidence an auditor can check. |
| **CISO** | Chief Information Security Officer | The executive responsible for a company's information security. |
| **DPIA** | Data Protection Impact Assessment | A formal written risk review, required by GDPR, that a company does before processing personal data in a new way. |
| **DPO** | Data Protection Officer | The named person responsible for privacy compliance; required by GDPR for organisations that process health data at scale. |
| **DR** | Disaster Recovery / Document Register | Disaster Recovery: how we restore the system after a major failure. Document Register (AKW-DR-00): the master index of this documentation set. |
| **EH** | Engineering Handbook | The document-type code for the engineering handbook (AKW-EH-10). |
| **FS** | Functional Specification | The document that describes what the system does — every feature, rule, and setting — without describing how it is built. |
| **GDPR** | General Data Protection Regulation | The European Union's privacy law (2018). It gives people rights over their data and sets duties on companies that process it. |
| **HIPAA** | Health Insurance Portability and Accountability Act | The US law that sets rules for protecting patients' health information. Its "Security Rule" lists the technical safeguards we must have. |
| **IAM** | Identity and Access Management | AWS's permission system: which user or service may do which action on which resource. |
| **ICD** | Interface Control Document / International Classification of Diseases | ICD the document: the exact contract for how one system talks to another (our API). ICD the medical code: a worldwide numbering of diagnoses, e.g. ICD-10. |
| **ICP** | Ideal Customer Profile | A description of the kind of customer the product fits best. |
| **IRP** | Incident Response Plan | The step-by-step plan for what to do when something goes wrong — an outage or a suspected data breach. |
| **ITIL** | Information Technology Infrastructure Library | A widely used set of best practices for running IT services (how to handle incidents, changes, releases). Large companies organise their operations documents around it. |
| **KMS** | Key Management Service | AWS's vault for encryption keys. Keys never leave it; it encrypts and decrypts on request. |
| **LGL** | Legal | The document-type code for the legal agreement templates (AKW-LGL-07). |
| **MFA** | Multi-Factor Authentication | Needing two proofs to sign in — a password plus a code from a phone app. |
| **NDA** | Non-Disclosure Agreement | A contract where the receiving party promises to keep information confidential. |
| **NFR** | Non-Functional Requirement | A requirement about how well the system works (speed, uptime, security, cost) rather than what it does. |
| **NIST** | National Institute of Standards and Technology | A US government body that publishes security standards. Its "SP 800-53" lists security controls; "SP 800-18" describes how to write a System Security Plan. Auditors worldwide recognise its structure. |
| **OPS** | Operations | Running the system day to day: deploying, monitoring, backing up, recovering. |
| **PDPPL** | Personal Data Privacy Protection Law | Qatar's national privacy law (Law No. 13 of 2016). Qatar's equivalent of GDPR. |
| **PR** | Pull Request | A proposed code change submitted for review before merging. |
| **QA** | Quality Assurance | Testing. |
| **RFP** | Request for Proposal | A formal document a buyer sends to vendors asking them to propose a solution and a price. |
| **RR** | Risk Register | A list of every known risk with a score, an owner, and a plan. |
| **SAD** | Solution Architecture Document | The master technical design document: how the whole system is built, from infrastructure to data to security. |
| **SEP** | Sales Enablement Playbook | The document that gives sales staff the approved facts, answers, and scripts. |
| **SO** | Solution Overview | The executive summary of the platform in plain language. |
| **SSP** | System Security Plan | The document that lists every security control the system has, how it is implemented, and its status. A NIST-defined document type. |
| **TOGAF** | The Open Group Architecture Framework | A widely used method for describing enterprise architecture. Consulting firms borrow its document names. |

---

## 1. Document set

Document IDs follow `AKW-<TYPE>-<NN>`. The type codes are the ones used in enterprise and consulting deliverable sets (TOGAF / ITIL / NIST naming): SO Solution Overview · SAD Solution Architecture Document · FS Functional Specification · ICD Interface Control Document · SSP System Security Plan · CCM Compliance Controls Matrix · LGL Legal templates · OPS Operations Runbook · IRP Incident Response Plan · EH Engineering Handbook · ADR Architecture Decision Log · RR Risk Register · SEP Sales Enablement Playbook · DR Document Register.

| ID | Document | Purpose — read it when you need to… | Primary audience | Classification | Owner | Version | Status |
|---|---|---|---|---|---|---|---|
| **AKW-DR-00** | [Document Register](AKW-DR-00-Document-Register.md) | find the right document; check what is current | Everyone | Internal | Founder | 1.0 | Approved |
| **AKW-SO-01** | [Solution Overview](AKW-SO-01-Solution-Overview.md) | explain the platform in plain English; look up any AWS resource, concept, abbreviation, or law with a console link (Appendix A) | Everyone; prospects under NDA | Internal | Product | 1.0 | Approved |
| **AKW-SAD-02** | [Solution Architecture Document](AKW-SAD-02-Solution-Architecture-Document.md) | understand how it is built: every resource, request and login lifecycle, data model, encryption, integrations, NFRs, decisions; AWS service reference and Lambda inventory in appendices | Architects, engineers, auditors, technical evaluators | Confidential | Solution Architect | 1.0 | Approved |
| **AKW-FS-03** | [Functional Specification](AKW-FS-03-Functional-Specification.md) | **answer "what does the system do when…" without reading code** — every module, role, screen, route, business rule, and setting; the system of record | Product, engineers, QA, support | Confidential | Product | 1.0 | Approved |
| **AKW-ICD-04** | [Interface Control Document](AKW-ICD-04-Interface-Control-Document.md) | call the API: every route, auth, payload shape, status codes | Engineers, integration partners | Confidential | Lead Engineer | 1.0 | Approved |
| **AKW-SSP-05** | [System Security Plan](AKW-SSP-05-System-Security-Plan.md) | see every security control, how it is implemented, its status, the threat model, the test suite, and the plan of action for gaps | Security Officer, auditors, customer CISOs | Confidential | Security Officer | 1.0 | Approved |
| **AKW-CCM-06** | [Compliance Controls Matrix](AKW-CCM-06-Compliance-Controls-Matrix.md) | map HIPAA, Qatar PDPPL, and GDPR requirements to controls and evidence; the DPIA | DPO, auditors, customer DPOs | Confidential | DPO | 1.0 | Approved |
| **AKW-LGL-07** | [Legal Agreement Templates](AKW-LGL-07-Legal-Agreement-Templates.md) | sign a customer: Business Associate Agreement (HIPAA) and Data Processing Agreement (GDPR) | Founder, counsel, customers | Confidential | Founder | 1.0 | Approved |
| **AKW-OPS-08** | [Operations Runbook](AKW-OPS-08-Operations-Runbook.md) | deploy, hot-patch, roll back, monitor, rebuild after disaster, configure e-mail; includes the pending 2026-10-29 deploy checklist | Operations, on-call | Confidential | Operations | 1.0 | Approved |
| **AKW-IRP-09** | [Incident Response Plan](AKW-IRP-09-Incident-Response-Plan.md) | handle an outage or a suspected breach: severity, containment commands, communications, regulatory clocks, post-mortem | On-call, Security Officer, DPO | Confidential | Security Officer | 1.0 | Approved |
| **AKW-EH-10** | [Engineering Handbook](AKW-EH-10-Engineering-Handbook.md) | join the team, learn the system in six weeks, follow the coding standard, use the change checklists, run the test plan | Engineers | Internal | Lead Engineer | 1.0 | Approved |
| **AKW-ADR-11** | [Architecture Decision Log](AKW-ADR-11-Architecture-Decision-Log.md) | know why something is the way it is: 16 decision records, 3 migration records, change log | Architects, engineers | Internal | Solution Architect | 1.0 | Approved |
| **AKW-RR-12** | [Risk, Debt and Backlog Register](AKW-RR-12-Risk-and-Debt-Register.md) | see every open risk with score, owner, and date; technical debt; product backlog | Founder, engineers | Internal | Founder | 1.0 | Approved |
| **AKW-SEP-13** | [Sales Enablement Playbook](AKW-SEP-13-Sales-Enablement-Playbook.md) | sell honestly: ICP, differentiators with proof, objections, RFP library, demo script | Sales, marketing | Internal | Commercial | 1.0 | Approved |

Supporting material: `images/` (encryption diagrams referenced from AKW-SO-01 Appendix A), `../skills/` (machine-readable rules that mirror AKW-EH-10 §4), `../scripts/security-tests/README.md` (mirrored in AKW-SSP-05 §8), `archive/` (the 42 pre-consolidation files, read-only).

## 2. Reading paths by role

| You are… | Read, in order |
|---|---|
| New to the platform | SO-01 §1–7 → SAD-02 §1–3 → FS-03 §2 |
| Engineer, week one | EH-10 §1 → SO-01 Appendix A → SAD-02 → FS-03 → ICD-04 → EH-10 §4 |
| Changing behaviour | FS-03 (the row you will change) → EH-10 §5 → OPS-08 §3 |
| Changing infrastructure | SAD-02 §4 → ADR-11 → EH-10 §5 → OPS-08 §3 |
| On-call tonight | OPS-08 §2 (identifiers) → IRP-09 → OPS-08 §4 |
| Security review / audit | SSP-05 → CCM-06 → SAD-02 §6 → RR-12 §1 |
| Customer DPO / CISO | SO-01 → CCM-06 → SSP-05 §3 → LGL-07 |
| Sales call / RFP | SEP-13 → SO-01 → CCM-06 (for proof) |
| Deciding what to build next | RR-12 → ADR-11 Part A |

## 3. Document control standard

Every document in the set carries:
- a **"This document answers"** list — the questions a reader can expect it to resolve, placed immediately after the revision history;
- an **"Abbreviations used in this document"** table — every short form in the document with what it stands for and what it means in plain words (master list: AKW-SO-01 Appendix A);
- a **document-control block** (ID, type, version, status, classification, owner, approver, effective date, review cycle, supersedes, related);
- a **revision history** table;
- **semantic versions** — major for restructure, minor for content, patch for corrections;
- **status** ∈ Draft → In Review → Approved → Superseded;
- **classification** ∈ Public · Internal · Confidential (Confidential documents are not sent outside without NDA; LGL-07 goes to customers by design).

### 3.1 Which document a change touches

| Change in… | Update |
|---|---|
| Behaviour, a rule, a setting | FS-03 (same PR) |
| Any AWS resource, IAM, KMS, Cognito, routes | SAD-02; SSP-05 if a control changed; OPS-08 §2 if an identifier changed |
| A route or payload | ICD-04 |
| A control's status (e.g. MFA → REQUIRED) | SSP-05 §3 + §9, CCM-06 caveats, SEP-13 truth rule, RR-12 |
| A deploy step | OPS-08 |
| A significant design choice | new ADR in ADR-11 |
| A new risk, debt, or backlog item | RR-12 |

### 3.2 Quarterly review checklist
1. Every document: is the "Effective date" within the review cycle? Bump or re-approve.
2. Grep the set for dead identifiers (list in SAD-02 Appendix D) — none may appear outside `archive/`.
3. SSP-05 §9 and RR-12 §1: has any item passed its target date? Re-score or re-date.
4. SEP-13: does every claim still trace to an *Implemented* control?
5. FS-03 §19 "last full verification" date — re-verify against code.

## 4. Archive policy
`docs/archive/` holds the 42 files that existed before 2026-10-30, unchanged, for traceability. They are **not maintained**. `archive/ARCHIVE-README.md` maps each old file to its new home. Do not link to archive files from live documents.

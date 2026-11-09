---
name: akwadona-easy-english
description: Use whenever writing or editing any Akwadona content — docs/*.md files, SKILL.md files, README files, backlog, test-plan, release notes, PR descriptions, comments in code — or when chatting with Sami about any part of the Akwadona platform. Enforces easy-English writing (short sentences, no unexplained jargon), a real-life analogy for every new technical concept, and the full phrase in parentheses on first use of every abbreviation (e.g., "PHI (Protected Health Information)"). Keeps the project readable by a solo founder re-reading his own system, by a new hire on day one, and by a non-engineer stakeholder.
---

# akwadona-easy-english

> **When:** every Akwadona-touching reply, doc, SKILL.md, README, comment, release note, or PR description.
> **Why:** Akwadona is read by one founder (Sami), new hires in week 1, auditors who are not engineers, and sales people. All four need to understand the same words.
> **Scope:** writing and speaking style only — does not change what we document, only HOW.

## 1. The three rules

### Rule 1 — Easy English
- Short sentences. Target: under 20 words per sentence.
- One idea per sentence.
- Plain words over clever ones: "use" not "leverage", "stop" not "preclude", "give" not "provision".
- Active voice: "the Lambda writes the row" not "the row is written by the Lambda".
- If a sentence needs a comma because it has three sub-clauses, split it into two sentences.

### Rule 2 — Real-life example for every concept
- Every time a NEW technical concept appears, pair it with a one-sentence example from everyday life (shop, library, hotel, post office, bank branch, hospital reception, apartment building, car — nothing esoteric).
- The example should map the technical shape to something physical the reader has touched.
- Place the analogy **immediately** after introducing the concept, before any detail.

### Rule 3 — Expand every abbreviation on first use
- First mention: `**PHI** (Protected Health Information)` — bold the short form, put the full form in parentheses.
- Every later mention in the same doc: just `PHI`.
- Applies to AWS service names (`**KMS** (Key Management Service)`), standards (`**HIPAA** (Health Insurance Portability and Accountability Act)`), file formats (`**JWT** (JSON Web Token)`), and any three-or-more-letter acronym.
- If the abbreviation is non-English (e.g., `**QID** (Qatari ID)`, `**PDPPL** (Qatar Personal Data Protection Law)`), still expand.

## 2. Example — the right way vs the wrong way

**WRONG (what we're moving away from):**
> We leverage per-tenant CMKs with envelope encryption; the KMS-backed HMAC provides deterministic ciphertext for equality lookups on PHI without decrypt.

**RIGHT (what this skill produces):**
> Each hospital has its own encryption key, stored inside AWS KMS (Key Management Service). Think of it like each hotel room having its own safe — only the key owner can open it. When we save a patient's name, we lock it with that hospital's key before writing it to the database. To search for the patient later by their Qatari ID, we don't unlock the data. Instead, we ask the safe to compute a fingerprint of the ID; the same ID always produces the same fingerprint, so we can match on fingerprints alone. This is called an **HMAC** (Hash-based Message Authentication Code).

Notice:
- Sentences are short.
- The hotel-safe analogy appears before any encryption terminology.
- `KMS`, `HMAC`, and `QID` are expanded on first use.
- No jargon is used without a plain-English hand-off first.

## 3. Analogy bank (reach for these before inventing new ones)

| Technical concept | Everyday analogy |
|---|---|
| Multi-tenant SaaS (Software as a Service) | An apartment building — one building, many apartments; shared plumbing (database), separate locks (keys) per apartment |
| DynamoDB single-table | A filing cabinet with coloured labels — one cabinet, many kinds of file |
| Partition key / Sort key | Street name / house number inside that street |
| Global Secondary Index (GSI) | A separate index card at the end of the book — same records, different order |
| Lambda function | A vending machine — press button, it runs, returns a drink, sits idle again |
| API Gateway | The hotel reception — takes requests, checks ID, routes to the right room |
| CloudFront (CDN) | A chain of corner shops — the main warehouse is far away, the corner shop is near you |
| KMS encryption key | The safe inside the hotel room — Amazon holds the safe, only the owner has the combination |
| IAM role | A visitor badge with a list of doors it can open |
| JWT (JSON Web Token) | A paper boarding pass — stamped at check-in, shown at every gate, expires after a few hours |
| Cognito user pool | The hotel's guest register — one register per brand, many hotels can share it |
| S3 bucket | A warehouse shelf — files sit there until picked up |
| CloudWatch alarm | A smoke detector — silent most of the time, loud when needed |
| CloudTrail | The CCTV tape of every door opening in the building |
| Zero-knowledge | Giving the courier a locked box — he carries it, but he cannot open it |
| Pre-token Lambda | The receptionist stamping "VIP" on your badge before you walk in |
| Service Worker (PWA) | A night-watchman who keeps a list of your purchases when the shop is closed, and settles them in the morning |

Add to this bank — don't invent fresh analogies when one of these already fits.

## 4. Abbreviation glossary (expand on first use, every doc)

| Short | Full |
|---|---|
| **AWS** | Amazon Web Services |
| **ACM** | AWS Certificate Manager |
| **API** | Application Programming Interface |
| **ARN** | Amazon Resource Name |
| **BAA** | Business Associate Agreement |
| **CDK** | Cloud Development Kit |
| **CDN** | Content Delivery Network |
| **CFN** | CloudFormation |
| **CI/CD** | Continuous Integration / Continuous Deployment |
| **CMK** | Customer Managed Key |
| **CORS** | Cross-Origin Resource Sharing |
| **CRUD** | Create / Read / Update / Delete |
| **DKIM** | DomainKeys Identified Mail |
| **DNS** | Domain Name System |
| **DPA** | Data Processing Agreement |
| **DPIA** | Data Protection Impact Assessment |
| **DPO** | Data Protection Officer |
| **EMR** | Electronic Medical Record |
| **GCC** | Gulf Cooperation Council |
| **GDPR** | General Data Protection Regulation |
| **GSI** | Global Secondary Index |
| **HIPAA** | Health Insurance Portability and Accountability Act |
| **HMAC** | Hash-based Message Authentication Code |
| **HSM** | Hardware Security Module |
| **IAM** | Identity and Access Management |
| **ICD-10** | International Classification of Diseases, 10th revision |
| **IdP** | Identity Provider |
| **JWT** | JSON Web Token |
| **KMS** | Key Management Service |
| **LOINC** | Logical Observation Identifiers Names and Codes |
| **MFA** | Multi-Factor Authentication |
| **MOPH** | Ministry of Public Health (Qatar) |
| **OAC** | Origin Access Control |
| **OAuth** | Open Authorization |
| **PDPPL** | Personal Data Protection Law (Qatar) |
| **PHI** | Protected Health Information |
| **PII** | Personally Identifiable Information |
| **PWA** | Progressive Web App |
| **QID** | Qatari ID |
| **RBAC** | Role-Based Access Control |
| **RCM** | Revenue Cycle Management |
| **RPO** | Recovery Point Objective |
| **RTO** | Recovery Time Objective |
| **RTL** | Right-to-Left (writing direction) |
| **S3** | Simple Storage Service |
| **SaaS** | Software as a Service |
| **SES** | Simple Email Service |
| **SOAP** | Subjective, Objective, Assessment, Plan (clinical note format) |
| **SPF** | Sender Policy Framework |
| **SSO** | Single Sign-On |
| **STS** | Security Token Service |
| **TLS** | Transport Layer Security |
| **UUID** | Universally Unique Identifier |
| **VPC** | Virtual Private Cloud |
| **WAF** | Web Application Firewall |

If you use a short form not on this list, add it on first use with the full phrase in parentheses and append the row here in the next doc PR.

## 5. The chat variant — HARD LENGTH CAP (added 2026-11-09 at Sami's request)

When CHATTING with Sami (not writing a doc):

- **Maximum 3–4 sentences per reply.** Use a short bullet list instead of prose when there are several items; the list still counts toward the cap (≈ 4 bullets, one line each).
- **Chunk, don't dump.** If the full answer needs more than that, give the first chunk and end with "— say *done* for the next part." When he says *done*, give the next chunk in the same format. Keep going until the answer is complete, then say so in one line.
- **Lead with the answer**, not context. No preamble, no recap of what was asked, no closing summary.
- Analogies stay to a single clause; abbreviations still expanded on first use.
- Exception: when he explicitly asks for detail, a full explanation, or a document — then normal length applies.
- **In chat:** "Cognito (AWS's user register) issues the JWT (JSON Web Token — a boarding pass)."
- **In a doc:** full sentence per analogy; no length cap beyond the doc's own structure.

## 6. What this skill does NOT do

- It does **not** change the content, structure, or correctness of docs — only the writing style.
- It does **not** forbid technical terms — it forbids using them without a plain-English hand-off first.
- It does **not** apply to code identifiers, SQL/PartiQL fragments, CLI commands, or AWS resource names — those stay verbatim.
- It does **not** apply to the Compliance Officer / RFP voice in `AKW-CCM-06` compliance mappings — those must stay in audit-grade regulatory language because that is the format auditors expect. Add a plain-English TL;DR at the top of each 05* doc instead.

## 7. Review checklist (self-apply before pressing save)

- [ ] Did I expand every abbreviation on first use?
- [ ] Did every new technical concept get an analogy immediately after it was introduced?
- [ ] Is every sentence under 20 words? If not, split it.
- [ ] Did I use active voice?
- [ ] Did I prefer the plainer verb ("use" over "utilise")?
- [ ] Did I check the analogy bank in §3 before inventing a new analogy?
- [ ] Did I add any new abbreviation to §4?

## 8. Companion files
- `akwadona-doc-writer` — the structural rules (four-part explain, cross-link, deprecation banners).
- `AKW-SAD-02-Solution-Architecture-Document.md` — the first doc fully written to this skill; use it as the reference example.
- `AKW-EH-10-Engineering-Handbook.md` — the second; written for Sami's own study.

---
name: akwadona-doc-writer
description: Invoke when writing, updating, or reviewing any of the fourteen AKW-* documents in docs/ (registered in AKW-DR-00), README-like files, or any Markdown destined for engineers / operators / auditors. Also when the user asks "document this", "write a runbook", "add to the compliance folder", "update the API reference", "write the release notes". Enforces the Akwadona doc house style — four-part explain pattern, cross-link don't duplicate, executable code blocks, auditor-grade specificity, no marketing language in engineering docs.
---

# Akwadona Doc Writer

Documentation is deployed code. Every doc is the authoritative source for one specific question. If two docs answer the same question, one of them must link to the other. If a question has no doc, it hasn't been decided — write the decision down first.

## 1. The four-part explain pattern (from `AKW-SO-01-Solution-Overview.md`)

Every substantive concept gets:

```markdown
### <Concept name>

**What it is** — one sentence, no jargon.
**Why it exists (the objective)** — the problem it solves, the forcing function.
**Real-life example** — a concrete scenario in a hospital that non-engineers can picture.
**How Akwadona uses it** — the file / Lambda / CDK stanza / route that implements it.
```

Follow this pattern until the reader could explain the concept back to a customer.

## 2. The document set (enterprise structure — 14 documents, no new numbered files)

Documentation is a fixed set of fourteen enterprise deliverables with document-control blocks, indexed by `docs/AKW-DR-00-Document-Register.md`. **Do not create new numbered files.** New content goes into the existing document that owns that subject; a new document is created only when AKW-DR-00 is updated to register it (new ID, type code, owner, classification).

| ID | Type code (industry name) | Owns |
|---|---|---|
| AKW-DR-00 | Document Register | the index, the control standard, the review checklist |
| AKW-SO-01 | Solution Overview | executive summary, glossary with console links, FAQ |
| AKW-SAD-02 | Solution Architecture Document (HLD + LLD) | every resource, lifecycles, data model, encryption, integrations, NFRs, AWS service reference, Lambda inventory, live IDs |
| AKW-FS-03 | Functional Specification (system of record) | every module, role, screen, route, business rule, constant |
| AKW-ICD-04 | Interface Control Document | the API contract |
| AKW-SSP-05 | System Security Plan | controls by family, threat model, test suite, POA&M |
| AKW-CCM-06 | Compliance Controls Matrix | HIPAA / PDPPL / GDPR mapping, DPIA |
| AKW-LGL-07 | Legal Agreement Templates | BAA, DPA |
| AKW-OPS-08 | Operations Runbook (SOP) | identifiers, deploy, monitoring, DR, SES, fixtures |
| AKW-IRP-09 | Incident Response Plan | severity, containment, communications, post-mortem |
| AKW-EH-10 | Engineering Handbook | onboarding, learning path, front-end architecture, coding standard, change checklists, test plan |
| AKW-ADR-11 | Architecture Decision Log | ADRs, migration records, change log |
| AKW-RR-12 | Risk, Debt and Backlog Register | scored risks, debts, backlog |
| AKW-SEP-13 | Sales Enablement Playbook | ICP, battlecard, objections, RFP library, demo |

Pre-2026-10-30 files are in `docs/archive/` — read-only, never linked from live documents.

## 3. Document-control block (every document starts with this)

```markdown
# Akwadona Hospital Platform — <Document title>

| Document control | |
|---|---|
| **Document ID** | AKW-<TYPE>-<NN> |
| **Document type** | <industry name of the deliverable> |
| **Version** | <semver — major restructure / minor content / patch correction> |
| **Status** | Draft · In Review · Approved · Superseded |
| **Classification** | Public · Internal · Confidential |
| **Owner** | <role> |
| **Approver** | <role> |
| **Effective date** | YYYY-MM-DD |
| **Review cycle** | <trigger + cadence> |
| **Supersedes** | <archive files or prior version> |
| **Related documents** | <IDs> |

| Revision history | | | |
|---|---|---|---|
| **Version** | **Date** | **Author** | **Change** |
| 1.1 | YYYY-MM-DD | <who> | <what changed and why> |
```

Immediately after the revision-history table, every document has two mandatory blocks:

```markdown
## This document answers

1. <question a reader comes here to resolve>
2. …

## Abbreviations used in this document

> **Why this table exists.** Every short form that appears anywhere in this document is listed here with (1) what the letters stand for and (2) what it means in plain words. …

| Abbreviation | Stands for | What it means |
|---|---|---|
| **BAA** | Business Associate Agreement | A contract required by HIPAA between a hospital and a company that handles its patient data… |
```

When you add an abbreviation to a document, add its row (the master definitions are in AKW-SO-01 Appendix A — reuse the wording). When you add a section that answers a new question, add the question.

Bump the version and add a revision row on **every** edit. A module section inside AKW-FS-03 follows the fixed shape: *Purpose · Who can use it · Screens · Operations · Business rules (numbered, with source file) · Data · Open items*.

## 4. House style rules

- **Verb tense**: present ("Lambda stamps `tenantId`"), not future ("will stamp").
- **Pronouns**: "we" / "the platform" / "Akwadona" — never "I".
- **Lists**: bullets for parallel items, numbers for sequence.
- **Code blocks**: specify language fence (` ```ts `, ` ```powershell `, ` ```sql `).
- **Code refs**: `` `file.ts:123` `` or `` `path/to/file.ts` ``. Never say "the code" without pointing.
- **Numbers**: use thousands separators (`500,000`, not `500000`). Metric except in US-regulatory contexts.
- **Dates**: `YYYY-MM-DD`. Never US `MM/DD/YYYY`.
- **Diagrams**: `.svg` in `docs/images/`, referenced from the owning section.
- **Headings**: sentence case. `## How Akwadona uses it`, not `## How Akwadona Uses It`.
- **Links**: inline Markdown links; the link text IS the subject. Cross-document references use the ID and section: "AKW-SSP-05 §4".
- **Tables**: for tabular data, not layout.
- **Easy English**: `akwadona-easy-english` applies to every document except the audit-voice mapping tables in AKW-CCM-06 and the legal text in AKW-LGL-07.
- **Truth**: a control is described as implemented only if it is in the CDK or the code today. Anything else is "Planned" with an ID in AKW-RR-12.

## 5. What goes where

| Content | Lives in | Not in |
|---|---|---|
| A behaviour, rule, limit, or setting | AKW-FS-03 (its module section; constants in §18) | SAD, README, commit message |
| Why a design choice was made | AKW-ADR-11 (new ADR) + one-line summary in AKW-SAD-02 §10 | FS-03 |
| A resource, IAM policy, key, route wiring | AKW-SAD-02 §4; identifiers in Appendix D | OPS-08 (links to SAD) |
| A security control and its status | AKW-SSP-05 §3; regulatory cross-ref in AKW-CCM-06 | SEP-13 (which only cites them) |
| Deploy / rollback / monitoring steps | AKW-OPS-08 | EH-10 (which links) |
| "What is a Lambda / KMS / JWT?" | AKW-SO-01 Appendix A | every doc that mentions it |
| Live tenants, IDs, ARNs | AKW-SAD-02 §2.3 + Appendix D | scattered |
| A risk, debt, or backlog item | AKW-RR-12 | ADR-11, SSP-05 (which link to the R-id) |
| A customer-facing claim | AKW-SEP-13 — only if it traces to an *Implemented* control | anywhere else |

## 6. When to update docs (every PR — reviewers check)

| Change in… | Update |
|---|---|
| Behaviour, a rule, a setting | AKW-FS-03 (same PR) |
| Any AWS resource, IAM, KMS, Cognito, routes | AKW-SAD-02; AKW-SSP-05 if a control changed; AKW-OPS-08 §2 if an identifier changed |
| A route or payload | AKW-ICD-04 |
| A control's status | AKW-SSP-05 §3 + §9, AKW-CCM-06 caveats, AKW-SEP-13 truth rule, AKW-RR-12 |
| A deploy step | AKW-OPS-08 |
| A significant design choice | new ADR in AKW-ADR-11 |
| A new risk, debt, or backlog item | AKW-RR-12 |

If none apply, say so in the PR description.

## 7. Writing for different audiences

### Engineers
- Code refs, trade-offs, failure modes.
- Example: `AKW-SSP-05-System-Security-Plan.md` — the right balance of theory + code.

### Operators (platform admin at Akwadona)
- Step-by-step commands.
- Example: `AKW-OPS-08-Operations-Runbook.md`, `AKW-FS-03-Functional-Specification.md`.

### Auditors / DPOs
- Mapping to specific regulation articles.
- Example: `AKW-CCM-06-Compliance-Controls-Matrix.md`.

### Customers (hospital IT lead)
- Promises + proof.
- Example: `AKW-SO-01-Solution-Overview.md`.

A single doc can mix audiences only if it signals clearly ("§5 is for auditors, §6 is for engineers").

## 8. What NOT to write

- No "introduction to databases" — assume engineering literacy.
- No "the future of healthcare" — stick to this product.
- No "we're the best" — show, don't assert.
- No invented metrics — if you don't have a number, don't make one up.
- No "coming soon" without a tracked backlog item.
- No private customer names outside the two live tenants (tiryaq, alshifaa).

## 9. Deprecation / historical status

When a doc becomes historical (feature removed, approach superseded):
- Add a banner at the top: `> **STATUS: HISTORICAL.** This describes <X>, superseded by <doc Y>.`
- Do NOT delete — the doc explains why the current approach exists.
- Example: `AKW-ADR-11-Architecture-Decision-Log.md` top banner.

## 10. Response format when applying this skill

When writing or reviewing a doc:

1. **Audience declaration** — who is reading this?
2. **One-sentence doc purpose** — if you can't write it, the doc isn't needed.
3. **Where it belongs in the taxonomy** — pick the number.
4. **Does any existing doc already cover this?** — if yes, extend that doc instead of creating a new one.
5. **Produce the draft** using the skeleton in §3.
6. **Cross-link check** — every term defined elsewhere should link to its definition doc.
7. **Executable check** — every code block in a runbook has been tested, or marked `# untested`.

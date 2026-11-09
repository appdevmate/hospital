---
name: akwadona-competitive-positioning
description: Invoke when writing or reviewing anything customer-facing — pitch decks, marketing pages, docs, feature announcements, sales emails, RFP responses, PRDs, product-briefs, Jira epics, release notes — or when the user asks "why would a hospital choose us?", "how do we compare to Epic / Cerner / Oracle Health / Athenahealth?", "what's our moat?", "write the executive summary", "handle this objection". Produces competitor-aware, differentiator-first messaging grounded in Akwadona's actual architecture (zero-knowledge, pooled multi-tenancy, PDPPL residency, AWS-native, SaaS pricing).
---

# Akwadona Competitive Positioning

Hospitals buy EMRs. They do not read your architecture doc. Every customer-facing surface must answer two questions in the first 15 seconds:

1. **Why not Epic / Cerner / Oracle Health?** (the incumbents they already evaluated)
2. **Why not another regional SaaS?** (the "cheaper" alternative)

If a paragraph doesn't move those answers forward, cut it.

## 1. Know the competitors you're writing against

| Competitor | Shape | Where they win | Where we win |
|---|---|---|---|
| **Epic** (US-headquartered, Verona WI) | On-prem, enterprise, 20+ year codebase | Deep clinical workflow depth, lab-ordering, revenue cycle | Price (10–100× cheaper), deployment speed (days vs 12–24 months), modern UX, Arabic-first, GCC data residency |
| **Oracle Health (formerly Cerner)** | Hybrid cloud, enterprise | Large hospital references in Middle East | Zero-knowledge architecture (Oracle Health has operator access to tenant data), SaaS pricing not per-bed, no Oracle lock-in |
| **Athenahealth** | US SaaS, revenue-cycle focused | Mature RCM, US billing | We serve Qatar/GCC (they don't), per-tenant KMS keys, PDPPL compliance scaffolded |
| **MEDITECH Expanse** | Mid-market US | Clinical breadth | Modern UX, PWA offline, 6-language i18n |
| **Local/regional players** (Insta HMS, Bahmni, etc.) | Open-source or regional SaaS | Low price | Zero-knowledge compliance, Bedrock-native AI (ScribeFirst), AWS-grade reliability, formal BAA/DPA templates |
| **In-house build** (hospital hires a dev team) | Custom | "We own it" | 18-24 months saved, HIPAA/PDPPL/GDPR pre-mapped, operator console, repeatable cross-tenant isolation probe + attack-test suite, we handle the AWS bill shock |

## 2. Our ten differentiators — ranked, with evidence

Use these in order of impact. Numbers must trace back to real architecture or docs.

### 1. Zero-knowledge platform (hard moat)
- Per-tenant KMS CMKs (`alias/akwadona-tenant-<slug>`) + explicit IAM DENY on operator roles.
- Documented in `AKW-SSP-05-System-Security-Plan.md`.
- **Proof point**: "A subpoena served to Akwadona cannot produce patient data — the keys are policy-isolated from any Akwadona employee."

### 2. PDPPL + MOPH + NCSA mapping, ready to show
- `AKW-CCM-06-Compliance-Controls-Matrix.md`, `AKW-CCM-06-Compliance-Controls-Matrix.md`, `AKW-CCM-06-Compliance-Controls-Matrix.md`.
- **Proof point**: "Show your auditor a mapping of every PDPPL Article 9 obligation to a line of code and a CDK stanza — not a PDF of promises."

### 3. SaaS pricing — rent, don't buy
- Hospital pays monthly. No perpetual-license fee. No $500k Epic implementation.
- **Proof point**: "A clinic can be live in 3 days. A hospital in 2–4 weeks. Epic takes 12–24 months."

### 4. Arabic-first + 6-language UX
- `AKW-FS-03-Functional-Specification.md`, ngx-translate, RTL support.
- **Proof point**: "Your receptionists see Arabic; your junior doctor sees English — no toggling pages."

### 5. Bedrock-native AI (ScribeFirst)
- Doctor speaks, SOAP note writes itself (Claude Haiku 4.5 via cross-region inference).
- **Proof point**: "Documentation burden was the #1 reason the last 3 doctors you lost quit."

### 6. Offline PWA
- Service worker + IndexedDB queue (`offlineQueueInterceptor`).
- **Proof point**: "When the clinic's WiFi dies at 2pm, your doctors keep working. Writes sync when they're back online."

### 7. AWS-native, serverless
- 42 Lambdas + DynamoDB + CloudFront, no servers to patch.
- **Proof point**: "Scales from 10 patients/day to 10,000 with the same codebase. You pay per request, not per server."

### 8. Multi-hospital network ready
- One operator console manages N tenants; wizard provisions in 5 seconds.
- **Proof point**: "If you acquire a second hospital, we onboard it in a day — no second contract, no second codebase."

### 9. Modern UX (not 2005 Flash)
- PrimeNG + Tailwind, signals-based Angular 20, dark-mode, mobile-responsive.
- **Proof point**: "Compare side-by-side with Epic's hyperspace client — our form is one page, theirs is seven."

### 10. Operational transparency
- Repeatable cross-tenant isolation probe (`scripts/cross-tenant-probe.js`) and attack-test suite (`scripts/security-tests/`), BAA + DPA templates ready, audit log with 7-year S3 Object Lock.
- **Proof point**: "We can run our isolation test and attack suite live in front of your DPO."
- **Never claim** "nightly" / "automated" / "MFA required" / "WAF" until each is actually true in the CDK stack — check `AKW-SAD-02-Solution-Architecture-Document.md` status banners first.

## 3. The three objections every sales conversation gets

### Objection: "We already have Epic / Cerner"
- Acknowledge: "Epic is excellent for huge academic medical centers. The implementation cost assumes you have 500+ beds."
- Pivot: "For a 10–200 bed facility in Qatar, you're paying for complexity you can't use. Here's what you get for 1/50th the price…"
- Proof: show the Price Comparison table + the Arabic-first screen capture.

### Objection: "Multi-tenancy sounds risky — our data is next to Alshifaa's data"
- Acknowledge: "That is the correct question to ask."
- Technical answer: "Each hospital has its own AWS KMS Customer-Managed Key. Your patient's name is encrypted with your key before it's written to the shared table. Alshifaa's Lambda cannot even request your key — AWS IAM denies the call before the key policy is evaluated. We run a cross-tenant isolation test every night and the result is in our audit log."
- Reference: `AKW-SSP-05-System-Security-Plan.md`, section "Zero-knowledge for the vendor".

### Objection: "What if Akwadona disappears?"
- Acknowledge: "Vendor lock-in is a legitimate risk for every SaaS."
- Technical answer: "Your data lives in your AWS account's DynamoDB table in a documented single-table schema. The export script (`scripts/import-tenant-data.js` reversed) produces a CSV + JSON archive of every encrypted row + the KMS CMK ARN. In the DPA Section 11 (Transition Assistance), we commit to 90 days of migration support."
- Reference: `AKW-LGL-07-Legal-Agreement-Templates.md`, `AKW-ADR-11-Architecture-Decision-Log.md`.

## 4. Language we use (and avoid)

### Use
- "Pooled multi-tenancy with per-tenant encryption keys" (not "we isolate the data" — vague).
- "Zero-knowledge — we cannot read your patient data" (specific, verifiable).
- "Audit-ready" (we have the mapping doc, point to it).
- "Serverless" + "SaaS" + "AWS-native" (buyers' language).
- "Days / weeks" (concrete deployment timeline).
- "Mapped to PDPPL Article X" (specific regulation citation).

### Avoid
- "Bank-grade security" (meaningless marketing).
- "Military-grade encryption" (double-meaningless).
- "AI-powered" without naming the model and the use case.
- "World-class" / "best-in-class" / "state-of-the-art" (filler).
- "Blockchain-based" (we're not; don't lie).
- "HIPAA-compliant" as a bare claim — always append "mapped to the Security Rule, see AKW-CCM-06 §2".

## 5. Formats

### 5.1 Executive summary (first-page skimmable)
3 sentences, max 60 words:
- "What we are" (one noun phrase).
- "The one problem we solve" (specific).
- "The one capability nobody else has" (zero-knowledge or Arabic-first or SaaS price).

Example:
> "Akwadona is a SaaS hospital information system for Qatar and the GCC. It replaces Epic/Cerner's million-dollar on-prem deployments with a browser login that runs in days, not months. Every tenant hospital has its own AWS KMS encryption key — Akwadona staff cannot read patient data, by cryptographic design."

### 5.2 Feature announcement (release notes)
```markdown
### <Feature name>
**For:** <buyer persona — Chief Medical Officer / CFO / IT lead>
**Problem:** <one sentence>
**What it does:** <one sentence>
**Why we built it this way:** <trade-off, in architect's voice>
**How to try it:** <link>
**Compliance surface touched:** <HIPAA §/PDPPL Art / GDPR Art — if applicable>
```

### 5.3 RFP answer format
- Direct answer (yes/no/N/A) first.
- One-sentence justification.
- Reference to doc / commit / screenshot.
- Zero marketing fluff.

## 6. Response format when applying this skill

When reviewing or writing customer-facing content:

1. **Who is the reader?** (CMO / CFO / IT / DPO / clinician — each needs different proof).
2. **What objection is this paragraph defusing?** (Name it.)
3. **Does every claim trace to a doc, commit, or screenshot?** (If not, delete the claim.)
4. **Would an Epic sales engineer be able to counter this with a one-liner?** (If yes, strengthen the specificity.)
5. **Length check** — anything over 1 page without a diagram is too long.

Reference docs: `AKW-SO-01-Solution-Overview.md`, `AKW-SSP-05-System-Security-Plan.md`, `AKW-CCM-06-Compliance-Controls-Matrix.md`.

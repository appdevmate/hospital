# 40 — Sales Handbook

> **Status:** Live. Last audited: 2026-10-02.
> **Audience:** Sales + marketing + anyone writing RFP responses or customer-facing content.
> **Companion skill:** `../skills/akwadona-competitive-positioning/SKILL.md` (programmatic version).

## 1. TL;DR
- We sell to small/mid hospitals and polyclinics in Qatar and the GCC.
- Our hard moat: **zero-knowledge, per-tenant encrypted multi-tenant SaaS** — Epic + Oracle Health don't have it, local SaaS competitors can't build it.
- Our proof points live in `docs/03-encryption-and-zero-knowledge.md`, `docs/05a–05f` compliance, `scripts/cross-tenant-probe.js`.

## 2. What this is

**What it is** — the pitch, the objections, the differentiators, the proof — in one place for anyone customer-facing.

**Why it exists** — RFPs ask the same questions. Hospitals object to the same risks. We need one source of truth so Marketing + Sales + Engineering tell the same story.

**Real-life example** — a hospital IT lead asks "How do we know Akwadona staff can't read our patient data?". Instead of inventing an answer, point them at `docs/03-encryption-and-zero-knowledge.md` + run `scripts/cross-tenant-probe.js` live.

**How Akwadona uses it** — Sales reads this before every discovery call. Marketing writes landing pages from §4 differentiators. RFP responses lift from §6.

## 3. Who we sell to

### 3.1 Ideal customer profile (ICP)
- **Qatar or GCC**, 10–500 beds, single hospital or small group (2–10 branches).
- Currently using paper, Excel, a local vendor, or has an Epic/Cerner RFP that stalled on budget.
- Chief Medical Officer frustrated with doctor documentation burden.
- CFO frustrated with capex + per-bed licensing.
- IT lead who read "zero-knowledge" and understood what it meant.

### 3.2 Not our customer (yet)
- 1000+ bed academic medical centers in the US / UK (Epic is their choice; we don't out-feature Epic on complex RCM).
- US-only billing (we're not RCM-specialized).
- Hospitals legally required to run on-prem (some govt facilities).

## 4. Ten ranked differentiators

| # | Differentiator | Proof |
|---|---|---|
| 1 | **Zero-knowledge platform** — per-tenant KMS CMKs + operator IAM DENY. Vendor cannot read patient data. | `docs/03-encryption-and-zero-knowledge.md`, `lib/akwadona-cdk-stack.ts` IAM blocks |
| 2 | **PDPPL + HIPAA + GDPR mapped**, article by article | `docs/05a–05f` |
| 3 | **SaaS pricing** — rent, don't buy; no million-dollar implementation | commercial sheet |
| 4 | **Arabic-first + 6-language UX** with RTL support | `docs/13-i18n.md`, screenshots |
| 5 | **Bedrock-native AI (ScribeFirst)** — doctor speaks, SOAP auto-fills | `docs/33-scribefirst-module.md`, live demo |
| 6 | **Offline-first PWA** — writes queue when WiFi drops, drains on reconnect | `docs/19-ui-architecture.md` §8, live demo |
| 7 | **AWS-native, serverless** — no servers to patch, scales elastically | `docs/01-lambda-and-infrastructure.md`, `docs/06-scalability-report.md` |
| 8 | **Multi-hospital network ready** — one operator console manages N tenants | `docs/07-operator-console.md`, `docs/15-tenant-onboarding-wizard.md` |
| 9 | **Modern UX** — PrimeNG + Tailwind + signals; feels 2025, not 2005 | screenshots side-by-side vs Epic |
| 10 | **Operational transparency** — repeatable cross-tenant isolation probe + attack-test suite we can run in front of the customer, plus BAA/DPA templates | `scripts/cross-tenant-probe.js`, `scripts/security-tests/`, `docs/05d`, `docs/05e` |

## 5. The three objections every call gets

### 5.1 "We already have Epic / Cerner / Oracle Health"
Response:
> "Epic is excellent for 500-bed academic centers. For a 10–200 bed facility in Qatar, you'd be paying for complexity you can't use. Here's what you get for 1/50th the price: [show the Price Comparison + Arabic UI + ScribeFirst]."

Follow with: "What was the one Epic feature that mattered most to your evaluation?" and show our equivalent.

### 5.2 "Multi-tenancy worries me — our data is next to another hospital's"
Response:
> "That is the exactly correct question. Each hospital has its own AWS KMS Customer-Managed Key. Your patient's name is encrypted with your key before it enters the shared table. The next hospital's Lambda cannot even request your key — AWS IAM denies the call before the key policy is evaluated. We have a cross-tenant isolation test we can run live in front of your team — it creates a record as one hospital and proves a second hospital gets 'not found' on every path — and an attack-test suite covering forged tokens, injection, and enumeration."

> **Do not say "nightly" or "automated" until it is scheduled.** As of 2026-10-29 the probe is run by hand. The sentence above is the honest version.

Reference: [`docs/03-encryption-and-zero-knowledge.md`](03-encryption-and-zero-knowledge.md).

### 5.3 "What if Akwadona disappears?"
Response:
> "Vendor lock-in is a legitimate concern for every SaaS. Your data lives in your AWS account's DynamoDB table in a documented single-table schema. We provide an export script that produces a CSV + JSON archive of every encrypted row plus the KMS CMK ARN. In the DPA Section 11 (Transition Assistance), we commit to 90 days of migration support."

Reference: [`docs/05e-dpa-template.md`](05e-dpa-template.md), [`docs/11-customer-migration-guide.md`](11-customer-migration-guide.md).

## 6. RFP answer templates

### 6.1 Security
> "Akwadona uses envelope encryption with per-tenant AWS KMS Customer-Managed Keys (CMKs). Protected Health Information fields (patient name, Qatar ID, phone, email, date of birth, clinical notes) are encrypted at the application layer before storage in DynamoDB; uploaded documents are stored in S3 under a customer-managed key. Equality lookups (e.g., 'find patient by QID') use HMAC-SHA256 hashes computed inside the AWS KMS Hardware Security Module. Vendor employees cannot decrypt customer data: the operator IAM role has an explicit `kms:Decrypt` deny policy on every tenant key. See docs/03-encryption-and-zero-knowledge.md."

### 6.2 Multi-tenancy
> "Akwadona is a pooled multi-tenant SaaS. One AWS infrastructure serves multiple hospital customers. Isolation is enforced at four layers: (1) JWT `tenantId` claim injected by a Cognito pre-token Lambda; (2) DynamoDB `tenantId` partition key on a dedicated Global Secondary Index; (3) per-tenant KMS Customer-Managed Keys for PHI encryption; (4) a repeatable cross-tenant isolation probe and attack-test suite (`scripts/cross-tenant-probe.js`, `scripts/security-tests/`) that we run before every release and can run on request. See docs/14-tenant-row-enforcement.md."

### 6.3 Compliance
> "Akwadona maps its controls to HIPAA Security Rule (docs/05a), Qatar PDPPL (docs/05b), and GDPR (docs/05c). We provide a Business Associate Agreement template (docs/05d) and a Data Processing Agreement template (docs/05e) for signature. CloudTrail multi-region with log file validation, 7-year S3 Object Lock on the audit bucket, and application-layer audit on every PHI mutation together satisfy audit control requirements."

### 6.4 Availability + disaster recovery
> "Akwadona runs on AWS us-east-1 with planned expansion to me-south-1 (Bahrain) for GCC data residency. DynamoDB with Point-In-Time Recovery (35-day window) and S3 Cross-Region Replication (planned Q1 2027) provide disaster recovery. Recovery Time Objective (RTO) is 4 hours; Recovery Point Objective (RPO) is 15 minutes. See docs/27-backup-and-disaster-recovery.md."

### 6.5 Interoperability
> "Akwadona exposes a REST API documented in docs/20-api-reference.md. FHIR R4 export is on the roadmap for Q2 2027. Data export in CSV + JSON is available on-demand. Integration with external labs and PACS is supported via the Documents module (pre-signed S3 upload with DICOM MIME support)."

### 6.6 Pricing
Describe in commercial collateral (not in docs). Reference the plan-defaults.js matrix for feature gating.

## 7. Language we use

### Use
- "Pooled multi-tenancy with per-tenant encryption keys"
- "Zero-knowledge — we cannot read your patient data"
- "Audit-ready"
- "Serverless"
- "AWS-native"
- "Mapped to PDPPL Article X"
- "Days to deploy, not months"
- "Arabic-first with 6-language support"

### Avoid
- "Bank-grade security" (meaningless)
- "Military-grade encryption" (meaningless²)
- "AI-powered" without naming the model and the use case
- "Best-in-class" / "state-of-the-art" (filler)
- "Blockchain" (we're not)
- "HIPAA-compliant" as a bare claim — always append "mapped to the Security Rule, see docs/05a"

## 8. Demo script (15 min, works for CMO + IT lead + CFO)

1. (1 min) Open `tiryaq.akwadona.com` → show Arabic login.
2. (2 min) Sign in as doctor1 → dashboard with today's appointments.
3. (2 min) Open a patient → show structured consultation form with ICD-10/LOINC lookup.
4. (3 min) **ScribeFirst**: start recording → speak 3 sentences → Bedrock auto-fills SOAP → doctor approves. "This is the #1 reason doctors leave your hospital."
5. (1 min) Pharmacy allergy guardrail: dispense a flagged medication → system blocks + requires override. "Clinical safety baked in."
6. (2 min) Blood bank: show donor → donation → unit → crossmatch → issue chain. "Full traceability for every unit."
7. (2 min) Operator console at `www.akwadona.com/operator` — show the subscription view, note the absence of patient data. "Our platform staff literally cannot see this. Here's the IAM policy." (open AWS Console on screen).
8. (2 min) Offline demo: disable WiFi, add a patient, re-enable, show the queue drain. "No workflow interruption."

## 9. Compliance surface
- The claims we make must trace to specific controls. See:
  - [`05a-hipaa-security-rule-mapping.md`](05a-hipaa-security-rule-mapping.md)
  - [`05b-pdppl-qatar-compliance.md`](05b-pdppl-qatar-compliance.md)
  - [`05c-gdpr-compliance-and-dpia.md`](05c-gdpr-compliance-and-dpia.md)
  - [`05f-compliance-overview.md`](05f-compliance-overview.md)

## 10. Open questions / future work
- Reference customer case studies (currently 2 tenants: Tiryaq + Alshifaa; need written case study with each).
- Independent penetration test report (planned Q4 2026). Internal attack-test suite (`scripts/security-tests/`) exists as of 2026-10-29.
- Schedule the isolation probe (GitHub Actions or EventBridge once the stack is split) so "automated" becomes true.
- Decide on MFA REQUIRED for Operator/Admin (currently OPTIONAL).
- SOC 2 Type II audit (planned 2027).
- HITRUST (optional, enterprise ask).
- Analyst coverage (KLAS, Gartner for GCC EMRs).

## 11. References
- All of `docs/00-17`
- `../skills/akwadona-competitive-positioning/SKILL.md`

# Akwadona Hospital Platform — Risk, Technical-Debt and Backlog Register

| Document control | |
|---|---|
| **Document ID** | AKW-RR-12 |
| **Document type** | Risk Register + Technical Debt Register + Product Backlog (single living register) |
| **Version** | 1.1 |
| **Status** | Approved |
| **Classification** | Internal |
| **Owner** | Founder (risk owner); Lead Engineer (debt owner) |
| **Approver** | Founder / CTO |
| **Effective date** | 2026-10-30 |
| **Review cycle** | Reviewed at every release; risk scores re-assessed quarterly |
| **Supersedes** | `archive/backlog.md`, the debts table formerly in `archive/45-system-design-for-developers.md` §9, the POA&M in AKW-SSP-05 §9, the pending-follow-ups notes |
| **Related documents** | AKW-SSP-05 §9 (security POA&M), AKW-ADR-11 (decisions that created each debt), AKW-OPS-08 (release process) |

| Revision history | | | |
|---|---|---|---|
| **Version** | **Date** | **Author** | **Change** |
| 1.0 | 2026-10-30 | Platform team | Consolidated into the enterprise document set |
| 1.1 | 2026-10-31 | Platform team | Added "This document answers" and "Abbreviations used in this document" blocks after document control |

## This document answers

1. What are the known risks, how serious is each, who owns it, and by when will it be closed?
2. What technical debt exists, why it exists, and what it costs us today?
3. What is in the product backlog?

## Abbreviations used in this document

> **Why this table exists.** Every short form that appears anywhere in this document is listed here with (1) what the letters stand for and (2) what it means in plain words. If a term is not here and is not obvious, that is a documentation bug — add it. The complete glossary with examples and console links is AKW-SO-01 Appendix A.

| Abbreviation | Stands for | What it means |
|---|---|---|
| **ACM** | AWS Certificate Manager | Issues and renews the certificates that make a site show the HTTPS padlock. Free. |
| **ADR** | Architecture Decision Record | A short note that records one design decision: the situation, the choice made, and what it costs. Written once, never edited; a later record can replace it. |
| **API** | Application Programming Interface | The set of URLs one program calls to use another program's features. Ours is a REST API. |
| **AWS** | Amazon Web Services | Amazon's cloud-computing platform. Everything Akwadona runs on it. |
| **B2B** | Business-to-Business | Selling to companies (we sell to hospitals). |
| **CCM** | Compliance Controls Matrix | A table that maps each rule in a law or standard to the specific thing we do to satisfy it, and the evidence an auditor can check. |
| **CDK** | Cloud Development Kit | AWS's tool for describing infrastructure in a programming language (we use TypeScript). It compiles to CloudFormation. |
| **CI** | Continuous Integration | Automatically building and testing code on every change. |
| **CMK** | Customer Managed Key | A KMS encryption key that we create and control (as opposed to one AWS manages for us). |
| **CSS** | Cascading Style Sheets | The language that styles web pages. |
| **CSV** | Comma-Separated Values | A plain-text spreadsheet format. |
| **CTO** | Chief Technology Officer | The head of technology. |
| **DDB** | DynamoDB | Short form of DynamoDB, AWS's NoSQL database. |
| **DEK** | Data Encryption Key | The key that actually encrypts a row's fields. A fresh one per row. |
| **DKIM** | DomainKeys Identified Mail | A cryptographic signature on outgoing e-mail proving it really came from the domain. |
| **DPO** | Data Protection Officer | The named person responsible for privacy compliance; required by GDPR for organisations that process health data at scale. |
| **DR** | Disaster Recovery / Document Register | Disaster Recovery: how we restore the system after a major failure. Document Register (AKW-DR-00): the master index of this documentation set. |
| **EMR** | Electronic Medical Record | The digital version of a patient's chart. Akwadona is an EMR. |
| **FHIR** | Fast Healthcare Interoperability Resources | The modern standard for exchanging health data between systems. On our roadmap. |
| **FS** | Functional Specification | The document that describes what the system does — every feature, rule, and setting — without describing how it is built. |
| **GDPR** | General Data Protection Regulation | The European Union's privacy law (2018). It gives people rights over their data and sets duties on companies that process it. |
| **GSI** | Global Secondary Index | A second way to look up rows in a DynamoDB table, by a different attribute. We have nine. |
| **HIPAA** | Health Insurance Portability and Accountability Act | The US law that sets rules for protecting patients' health information. Its "Security Rule" lists the technical safeguards we must have. |
| **HMAC** | Hash-based Message Authentication Code | A fingerprint of a value computed with a secret key. Same value + same key = same fingerprint; different keys give different fingerprints. We use it to search encrypted fields. |
| **i18n** | internationalisation | Building software so it can show different languages (18 letters between i and n). |
| **IAM** | Identity and Access Management | AWS's permission system: which user or service may do which action on which resource. |
| **JSON** | JavaScript Object Notation | The text format our API uses for data. |
| **JWKS** | JSON Web Key Set | The public keys a server publishes so others can verify its JWT signatures. |
| **JWT** | JSON Web Token | A signed digital ID card the browser sends with every request. It names the user, their hospital, and their role. |
| **KMS** | Key Management Service | AWS's vault for encryption keys. Keys never leave it; it encrypts and decrypts on request. |
| **MFA** | Multi-Factor Authentication | Needing two proofs to sign in — a password plus a code from a phone app. |
| **OIDC** | OpenID Connect | A standard protocol for logging in via a central identity service. |
| **OPS** | Operations | Running the system day to day: deploying, monitoring, backing up, recovering. |
| **PDPPL** | Personal Data Privacy Protection Law | Qatar's national privacy law (Law No. 13 of 2016). Qatar's equivalent of GDPR. |
| **PHI** | Protected Health Information | Any information that identifies a patient and relates to their health: name, ID number, diagnosis, medication, phone, date of birth. |
| **PITR** | Point-In-Time Recovery | DynamoDB's continuous backup — restore the table to any second in the last 35 days. |
| **POA&M** | Plan of Action and Milestones | A NIST term for the list of known security gaps, each with an owner and a target date to close it. |
| **QID** | Qatari ID | The national identity number of a Qatar resident (11 digits). |
| **RR** | Risk Register | A list of every known risk with a score, an owner, and a plan. |
| **RTL** | Right-to-Left | Text direction for Arabic, Hebrew, Urdu. Our layout flips for these languages. |
| **RTO** | Recovery Time Objective | How long the system may be down after a disaster before it must be back. Ours: 4 hours. |
| **S3** | Simple Storage Service | AWS file storage — a bucket holds files of any size. |
| **SAD** | Solution Architecture Document | The master technical design document: how the whole system is built, from infrastructure to data to security. |
| **SES** | Simple Email Service | AWS's service for sending e-mail. |
| **SSP** | System Security Plan | The document that lists every security control the system has, how it is implemented, and its status. A NIST-defined document type. |
| **TTL** | Time To Live | A "delete me after this time" marker on a database row. DynamoDB removes expired rows for free. |
| **UI** | User Interface | The screens a person uses. |
| **URL** | Uniform Resource Locator | A web address. |
| **UUID** | Universally Unique Identifier | A random 36-character ID that will never collide. |
| **UX** | User Experience | How it feels to use the system. |
| **WAF** | Web Application Firewall | A filter in front of a website that blocks known-bad traffic. Ours is defined but currently switched off. |
| **XSS** | Cross-Site Scripting | An attack that injects a malicious script into a web page. |

**Scoring.** Likelihood (L) and Impact (I) 1–5; Score = L × I. ≥ 15 is Critical, 9–14 High, 4–8 Medium, ≤ 3 Low. "Owner" is accountable for closing, not necessarily for doing.

---

## 1. Risk register

| ID | Risk | L | I | Score | Mitigation in place | Action to close | Owner | Target |
|---|---|---|---|---|---|---|---|---|
| R-01 | **CloudFormation 500-resource ceiling** (496 used) blocks alarms, WAF, probes; a deploy can fail | 4 | 4 | **16** | Catch-all routes; shared managed policy | Stack split (ADR-013) | Lead Eng | Q4 2026 |
| R-02 | **Per-row DEK** makes sorted/searched lists O(tenant rows) and KMS-bound; a 10k-patient tenant will see multi-second first loads | 3 | 4 | **12** | DEK cache; 32-wide concurrency; 20k ceiling | Per-tenant DEK, `_kms_v: 2`, backfill | Lead Eng | Q1 2027 |
| R-03 | **MFA optional** for Operator/Admin — phishable admin credentials | 3 | 5 | **15** | Advanced Security; 12-char policy | Enrol all operators/admins; flip `Mfa.REQUIRED` | Founder | Q4 2026 |
| R-04 | **Undeployed 2026-10-29 change set** — known critical fixes (operator key deletion, reference-data auth) are not live | 5 | 5 | **25** | None until deployed | Run AKW-OPS-08 §3a | Founder | Immediate |
| R-05 | **WAF disabled** — no managed-rule filtering at the edge | 3 | 3 | 9 | API Gateway stage throttle; Cognito threat protection | Re-enable edge stack after ADR-013 | Founder | On 3rd tenant |
| R-06 | **Security suite and isolation probe run by hand** — regressions go unnoticed; sales claim "automated" was false until reworded | 4 | 3 | **12** | Suite exists; wording corrected | GitHub Actions nightly (`run-safe.js`); EventBridge after split | Lead Eng | This quarter |
| R-07 | **No Content-Security-Policy** header | 2 | 4 | 8 | No `innerHTML`/`eval`; strict interceptor host list | Custom ResponseHeadersPolicy after ADR-013 | Lead Eng | Q1 2027 |
| R-08 | **Tokens in `localStorage`** — XSS → token theft | 2 | 4 | 8 | R-07 controls; 1-h expiry | Evaluate httpOnly-cookie exchange after R-07 | Lead Eng | Q1 2027 |
| R-09 | **Application-level PHI read audit incomplete** — weaker "who viewed" evidence | 3 | 3 | 9 | CloudTrail logs every `kms:Decrypt` | Read-audit rows on single-item GETs | Lead Eng | Q1 2027 |
| R-10 | **No malware scanning on uploads** | 2 | 4 | 8 | Type/size allow-list; pre-signed scope | GuardDuty Malware Protection for S3 | Ops | Q1 2027 |
| R-11 | **DR runbook never drilled** — real RTO unknown | 3 | 4 | **12** | PITR; rebuild runbook documented | Quarterly drill, first Q1 2027 | Ops | Q1 2027 |
| R-12 | **No independent penetration test** | 3 | 4 | **12** | Internal suite | Engage tester | Founder | Q4 2026 |
| R-13 | **No AWS Config / GuardDuty / Security Hub** | 3 | 3 | 9 | CloudTrail; 2 alarms | Enable after ADR-013 | Ops | Q1 2027 |
| R-14 | **No unit tests** — only manual + security suites | 4 | 3 | **12** | Security suite; manual plan | Jest on `_shared/*` and the two list Lambdas first | Lead Eng | Q1 2027 |
| R-15 | **No data-retention policy** — soft-deleted rows and documents grow forever | 2 | 3 | 6 | Audit retention is correct | Retention schedule per folder/entity; TTL where legal | DPO | Q2 2027 |
| R-16 | **No dev/staging stack** — destructive tests have nowhere safe to run | 4 | 3 | **12** | Suite refuses prod by default | Second account + `cdk deploy` with `CDK_DEPLOY_ACCOUNT` | Ops | This quarter |
| R-17 | **Single-person dependency** — founder is Security Officer, DPO, on-call, and approver | 4 | 4 | **16** | Documentation set | Name a second on-call; external DPO service | Founder | Q1 2027 |
| R-18 | **Stale deploy scripts** (`deploy.ps1`, `deploy-push-commands.txt`) still point at dead Tiryaq resources | 3 | 2 | 6 | AKW-OPS-08 is authoritative | Delete or regenerate from live IDs | Ops | This quarter |
| R-19 | **Reference data is global** — one hospital's admin can change departments for all | 2 | 3 | 6 | Admin/operator gate (2026-10-29) | Per-tenant reference data | Product | Backlog |
| R-20 | **GSI2 unused, `email-index` legacy** — storage cost, confusion | 1 | 1 | 1 | Documented | Remove when a GSI slot is needed | Lead Eng | Backlog |

## 2. Technical debt register

| ID | Debt | Created by | Interest paid today | Repayment |
|---|---|---|---|---|
| D-01 | Copied shared helpers (17 × `crypto.js`, 40 × `throttle.js`) | ADR-006 | Manual hash checks every change | `scripts/sync-shared-helpers.js` in a pre-commit hook |
| D-02 | 4 reference-data Lambdas still `Scan` (tiny global set) | Inception | Negligible now | Convert to `EntityType-index` Query when touched |
| D-03 | `GSI2` and `email-index` are legacy | ADR-002/003 | GSI write/storage cost | R-20 |
| D-04 | Hard-coded `tenantSlugs[]` and `PROTECTED_TENANT_IDS` in CDK | ADR-016 | Redeploy per tenant | Read from a parameter / the TENANT rows at synth |
| D-05 | No Lambda warmers except pre-token (removed for resource budget) | ADR-005 | Cold starts on quiet mornings | After ADR-013, or provisioned concurrency on the 3 hottest |
| D-06 | `deploy.ps1` stale | Rename rebuild | Confusion | R-18 |
| D-07 | Angular bundle not audited for size since Tailwind v4 | — | Unknown | `ng build --stats-json` + budget in `angular.json` |
| D-08 | Operator console lacks per-tenant branding/billing | Scope | Manual work | Backlog |

## 3. Product backlog (from the former `AKW-RR-12-Risk-and-Debt-Register.md`)

Tracks pending work after Step 7 (Operator Console) shipped.

### Decision principle (always)

**Every solution must match the bar set by huge professional SaaS systems.**

When the user asks "which approach", the answer is the one that:
- Matches what Athenahealth / Epic / Cerner do for healthcare SaaS.
- Matches what Stripe / Vercel / Linear / Notion do for B2B SaaS UX.
- Matches what AWS / Auth0 / Okta do for identity at scale.

Anything below that bar is wrong by default. The conversation rule "act as a senior AWS architect experienced in government-verified hospital systems" stays in force. Always state in the answer "this is what huge SaaS does because …" so the reasoning is visible.

### Pending tasks

#### Step 2g — Per-tenant API throttling (DONE)
- ✅ 2g.1 — Plan defaults + DynamoDB counter schema (see `akwadona-cdk/lambda/lib/plan-defaults.js`, `AKW-SAD-02-Solution-Architecture-Document.md`).
- ✅ 2g.2 — Shared throttle module `akwadona-cdk/lambda/lib/throttle.js`.
- ✅ 2g.3 — Wired into 7 high-traffic Lambdas: getAllPatients, akwadona-pharmacy, akwadona-appointments, akwadona-bloodbank, akwadona-document-manager, akwadona-calendar, akwadona-examinations.
- ✅ 2g.4 — Wired into all 23 remaining tenant Lambdas via batch script (createPatientSurgery removed earlier — not applicable).
- ✅ 2g.5 — Per-tenant 429 count published as CloudWatch metric `Akwadona/Throttle/Hits` and surfaced on the operator Usage card with amber highlight when > 0.
- 🔲 2g.6 — Load test verifying the limits clamp at the configured numbers. Optional verification.

##### Throttle test snippet (run AFTER a fresh tenant-user login)

Cognito tokens expire after 1 hour. Sign in fresh, copy a NEW token from `sessionStorage.getItem('accessToken')` in the browser DevTools console, then run:

```powershell
$token = "PASTE_FRESH_TOKEN_HERE"   # must NOT be the operator's token — throttle skips operators

## Confirm it's a tenant_user before testing
$payload = $token.Split('.')[1]
$pad = $payload + ('=' * ((4 - ($payload.Length % 4)) % 4))
[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($pad.Replace('-','+').Replace('_','/')))

## Fire 700 requests (Free plan = 600/min cap → first 600 = 200, rest = 429)
$results = @{}
$i = 0
1..700 | ForEach-Object {
    $code = curl.exe -s -o NUL -w "%{http_code}" -H "Authorization: Bearer $token" "https://ouohmmpi31.execute-api.us-east-1.amazonaws.com/patients?pageSize=1"
    if (-not $results.ContainsKey($code)) { $results[$code] = 0 }
    $results[$code]++
    $i++
    if ($i % 100 -eq 0) { Write-Host "Done $i / 700"; $results }
}
$results
```

Expected output for Free-plan tenant: ~600 × `200` + ~100 × `429`.
If you see `401` instead → token expired, log in again.

#### Step 2d-4 — Per-row tenant enforcement (big domain Lambdas) — DONE
- ✅ 2d-4.1 — Shared `_shared/tenant-guard.js` helper + `sync-shared-helpers.js` rewrite (per-helper target lists).
- ✅ 2d-4.2 — `akwadona-bloodbank` — every read guarded, every write conditioned, every Put stamped.
- ✅ 2d-4.3 — `akwadona-pharmacy` — including cross-domain reads (PATIENT / EXAM / MED).
- ✅ 2d-4.4 — `akwadona-examinations` — fixed latent `tenantId` undefined bug while wiring.
- ✅ 2d-4.5 — `akwadona-calendar` — calendar + events + cascade delete.
- ✅ 2d-4.6 — `akwadona-scribe` — fixed latent `getTenant` discarded return value.
- ✅ 2d-4.7 — `akwadona-document-manager` — closed S3 cross-tenant listing leak by adding `tenantId` segment to every S3 key (legacy keys still admin-readable until migration).
- ✅ 2d-4.8 — Runbook + test plan at `AKW-SSP-05-System-Security-Plan.md`.
- 🔲 2d-4.9 — Migration script to rewrite legacy S3 keys (`folder/<userId>/...` → `folder/<tenantId>/<userId>/...`) so the legacy admin-only branch can be removed.
- 🔲 2d-4.10 — Cross-tenant probe automated test (CI). Seed 2 tenants, try every guessed-id read, expect 404 every time.

#### Step 8 — AWS resource rename `tiryaq-*` → `akwadona-*` (COMPLETE)
- ✅ Phase A — All 39 CDK-managed Lambdas renamed.
- ✅ Phase B — Full rename via teardown + rebuild on 2026-06-30. New `AkwadonaCdkStack` deployed fresh. Old `TiryaqCdkStack` destroyed; one `tiryaq-audit-*` bucket survives under COMPLIANCE Object Lock until ~2033. New audit bucket uses suffix `akwadona-audit-v2-*` to avoid the v1 name conflict.
- ✅ Stack name, S3 buckets, KMS aliases, API Gateway, Cognito user pool, CloudFront aliases — all renamed to `akwadona-*` / `AkwadonaCdkStack`.
- ✅ Custom Cognito domain `auth.akwadona.com` re-attached to new pool.
- ✅ Frontend redeployed with new pool/client/API IDs.

#### (Old Step 8 plan — kept for reference)
- Rename: Lambda functions, S3 buckets, CloudFront distribution alias, CDK stack name, log groups, IAM roles.
- DynamoDB table `Hospital` stays (no rename needed).
- KMS keys keep their UUIDs; only aliases rename.
- Migration order: blue-green (new names provisioned alongside, traffic cut over, old names destroyed).
- Update Angular `Config` + OIDC + docs to the new names.

#### Admin — Change User Email endpoint
- New `PATCH /admin/users/{userId}/email` for hospital admins.
- Updates Cognito attribute + the `emailHash` (HMAC) row in DynamoDB.
- Sends verification email to the new address before flipping.
- Audit row written with `before`/`after` (encrypted).
- UI in Admin Panel for the existing Users tab.

#### Multi-language support (i18n) — Phase 1 DONE
- ✅ `@ngx-translate/core` + http-loader installed.
- ✅ `I18nService` owns active language; persists in localStorage; auto-toggles `<html dir="rtl">` for Arabic.
- ✅ 6 translation JSON files in `src/assets/i18n/` (en, ar, fr, es, de, nl).
- ✅ Top-bar language switcher (flag + code, dropdown with native names).
- ✅ Operator console + sidebar menu translated.
- ✅ Runbook: `AKW-FS-03-Functional-Specification.md`.
- 🔲 Phase 2 — translate dashboard, patient management, appointments, blood bank, pharmacy (incremental — each component imports TranslatePipe + keys added to JSONs).
- ✅ Phase 3 — login / forgot-password / first-login-challenge pages are translated. They are custom Angular components (Hosted UI was replaced), so they use the same `ngx-translate` pipeline as the rest of the app.

#### SES production-access approval (PENDING)
- ✅ SES domain identity verified, DKIM signed, MAIL-FROM subdomain configured, Cognito wired to send via `noreply@akwadona.com`.
- 🔲 Submit / chase the `put-account-details --production-access-enabled` request — currently sandboxed (200 emails / 24h cap, recipients must be verified). Required before non-verified recipients can receive password-reset codes.

#### (Old i18n plan — kept for reference)
- Languages: **Arabic, English, French, Spanish, German, Dutch**.
- Stack: Angular `@angular/localize` + `ngx-translate` (runtime switch without rebuild).
- User picks language from a topbar dropdown; persisted in localStorage + Cognito `custom:locale` attribute (so the choice follows the user across devices).
- RTL support for Arabic — `dir="rtl"` toggled on `<html>` + PrimeNG RTL theme classes.
- Translation files: `src/assets/i18n/{ar,en,fr,es,de,nl}.json` — one JSON per language.
- Initial coverage: all visible UI strings (menus, headers, forms, error toasts, dialogs).
- Date / number / currency formatting via Angular `LOCALE_ID` and `registerLocaleData()`.
- Cognito Hosted UI language: Cognito doesn't auto-translate. Two options:
  - A — Use AWS-Managed Login (Cognito 2024 update) with custom CSS per language.
  - B — Keep Hosted UI in English-only (most B2B SaaS do this).

#### Perf — sign-in → painted dashboard in < 1 s (SaaS-grade)
- **Target:** < 1 s perceived from "sign in" click to fully rendered first view.
- **Reference systems:** Stripe Dashboard, Vercel, Linear, Notion, Athenahealth portal — all hit this bar.
- **Implementation:**
  - Skeleton screens render in < 200 ms before data arrives (PrimeNG Skeleton already imported — adopt for operator console + dashboard).
  - localStorage cache of the last-known tenant list / dashboard counts → instant first paint, then refresh from network in the background.
  - JWKS cached in IndexedDB for 24 h (Cognito rotates rarely).
  - `checkAuth()` short-circuits when sessionStorage has a valid non-expired token (parse `exp` claim).
  - Single combined endpoint `GET /operator/tenants?expand=stats,audit` so one round-trip fills the whole detail panel.
  - Prefetch the next likely action (when user clicks a tenant, prefetch its stats before they navigate).
- **Plumbing changes:** Lambda extension, OperatorService cache, new `cache.service.ts` for localStorage TTL-keyed reads.

#### NEW — "Premium Isolation" tier (opt-in Silo for enterprise customers)
- **What it is:** dedicated DynamoDB table + dedicated Lambda execution role per tenant who pays for it.
- **What huge SaaS does:** Athenahealth, Epic and Cerner all offer this as a paid upgrade on top of their standard Bridge model. Typical premium: 5–10× the standard subscription.
- **When to offer:** when a hospital's compliance team (e.g. PDPPL audit, FedRAMP-equivalent) demands hard physical isolation, OR an enterprise contract requires it.
- **Implementation sketch:**
  - New tenant plan: `enterprise-isolated`.
  - Per-tenant DynamoDB table named `Hospital-<slug>`; per-tenant Lambda alias with a dedicated execution role.
  - Routing layer (pre-token Lambda or a tiny dispatcher Lambda) reads `plan` from the tenant profile and routes to either the shared or dedicated stack.
  - Per-tenant KMS keys (already done) cover the encryption side — no change.
  - Operator console shows an "Isolation: dedicated" badge on the tenant detail page.
- **Not built now.** Stay on Bridge as the default. This sits in the backlog for the day a customer asks.

#### Full IaC kill-switch (`teardown.ps1` + `recover.ps1`) — DONE
- ✅ `scripts/teardown.ps1` — empties S3 buckets, runs `cdk destroy`, schedules KMS key deletion (7-day pending window), deletes DynamoDB table. Safety-gated with `-ConfirmDestroyData`. Cost after: ~$0.
- ✅ `scripts/recover.ps1` — cancels pending KMS key deletions, runs `cdk deploy`, re-seeds tenant profile rows, prints frontend deploy + operator-group-restore steps.
- ✅ Runbook: `AKW-OPS-08-Operations-Runbook.md`.

#### (Original plan — kept for reference)
- **Goal:** one command that destroys EVERY AWS resource Akwadona uses → bill goes to $0.
- **Why:** today `npx cdk destroy` leaves KMS keys, DynamoDB table, and non-empty S3 buckets behind (retention defaults). That keeps the bill small but non-zero. For dev / pause-and-resume scenarios we want a real "off button".
- **Plan:**
  - `scripts/teardown.ps1` — runs in order:
    1. Empty the documents S3 bucket (`aws s3 rm s3://… --recursive`).
    2. Empty the frontend S3 bucket.
    3. `npx cdk destroy --force` — removes API Gateway, Lambdas, CloudFront, Cognito, IAM roles.
    4. Schedule KMS key deletion (7-day waiting period — AWS minimum) on each per-tenant key.
    5. Delete the DynamoDB table (`aws dynamodb delete-table`).
    6. Optionally cancel the ACM cert + Route 53 records (if we want truly zero footprint).
  - `scripts/recover.ps1` — opposite direction:
    1. `npx cdk deploy --require-approval never` — provisions everything fresh.
    2. Cancel any pending KMS key deletions (only works in the 7-day window).
    3. Run the seed scripts to repopulate tenant profile rows.
  - **Caveat:** if data exists in DynamoDB / S3 when teardown runs, it's gone forever. Add a `--confirm-destroy-data` flag to require explicit confirmation.
- **What huge SaaS does:** they don't need this for production, but every serious infra team has a "dev environment teardown" script. Stripe, Vercel, AWS itself all ship one.
- **Cost when down:** $0 (except a few cents for Route 53 hosted zone + ACM cert if kept). Bill resumes when `recover.ps1` runs.

#### Customer data migration — DONE
- ✅ `AKW-ADR-11-Architecture-Decision-Log.md` — operator + customer runbook.
- ✅ `scripts/import-tenant-data.js` — CSV → validate → encrypt PHI → HMAC search fields → DynamoDB → JSON report. Dry-run by default; `--apply` to commit.
- ✅ `scripts/migration-templates/{patients,doctors,appointments}.csv` + README.

#### (Original plan — kept for reference)
- **Goal:** when a new hospital wants to onboard with their existing patient + doctor records (probably exported from another EMR), we have a documented import path.
- **Why:** today, the only way to add data is manual UI clicks. A 50,000-patient hospital can't do that.
- **What huge SaaS does:**
  - **Athenahealth / Epic on AWS:** offer a "migration kit" — a CSV / FHIR template the source EMR fills, plus a one-time bulk-import Lambda.
  - **Stripe Connect:** customers upload CSV → import Lambda creates accounts + records.
  - **Box / Dropbox:** dedicated migration tool (rclone-like) for bulk uploads.
- **Plan — `AKW-ADR-11-Architecture-Decision-Log.md`:**
  - Step 1 — operator creates the tenant (slug + KMS keys + Cognito users).
  - Step 2 — customer downloads CSV / FHIR templates from a public docs page.
  - Step 3 — customer fills the templates (patients.csv, doctors.csv, appointments.csv, …).
  - Step 4 — customer uploads via a secure transfer (signed S3 URL).
  - Step 5 — we run `scripts/import-tenant-data.js <slug> <s3-key>` — encrypts PHI with the tenant's KMS key, HMACs the search fields, writes to DynamoDB.
  - Step 6 — verification report: counts of imported rows + any rows that failed validation.
  - Step 7 — customer signs off → migration complete.
- **Encryption guarantees during migration:**
  - Source CSV stays in S3 only as long as the import takes; deleted after.
  - PHI is encrypted with the tenant's KMS key BEFORE first DynamoDB write.
  - HMACs for searchable fields (email, phone, QID) generated under the tenant's HMAC key.
  - Migration audit row written for every imported entity (HIPAA).

#### Step 7 follow-ups (optional polish)
- Hardened operator Lambda role with explicit DENY on `kms:Decrypt` for all `T_*` tenant keys (defense-in-depth).
- Tenant onboarding wizard inside the operator console (today: manual via DDB seed script + KMS console).
- CloudFront BytesDownloaded per-tenant (requires field-level CloudFront real-time logs piped to per-tenant metric publisher).
- Cost Explorer per-tenant tagging + display in the Usage card.

### Reference SaaS patterns we're following

- **Athenahealth** — single auth domain, generic role groups, tenant in JWT claim.
- **Stripe Connect** — `auth.stripe.com` single login URL, organization-id in JWT, no tenant in URL.
- **Vercel Teams** — one auth surface, team-id claim, generic permissions.
- **Auth0 Organizations** — same model formalized as a product feature.
- **Particle Health / Redox** — interop platforms; vendor sees query counts, never patient payloads.

### Constraints (do not violate)

- Operator console **never** shows patient / doctor / appointment data — only platform admin metrics.
- All PHI is envelope-encrypted with per-tenant KMS CMKs (Step 3).
- HMAC search fields use per-tenant KMS HMAC keys (Step 4).
- Compliance: HIPAA, PDPPL (Qatar), GDPR — see `AKW-CCM-06.md`.
- Conversation rule: step-by-step, brief, easy English, points list.

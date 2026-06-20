# Akwadona — Open Backlog

Tracks pending work after Step 7 (Operator Console) shipped.

## Decision principle (always)

**Every solution must match the bar set by huge professional SaaS systems.**

When the user asks "which approach", the answer is the one that:
- Matches what Athenahealth / Epic / Cerner do for healthcare SaaS.
- Matches what Stripe / Vercel / Linear / Notion do for B2B SaaS UX.
- Matches what AWS / Auth0 / Okta do for identity at scale.

Anything below that bar is wrong by default. The conversation rule "act as a senior AWS architect experienced in government-verified hospital systems" stays in force. Always state in the answer "this is what huge SaaS does because …" so the reasoning is visible.

## Pending tasks

### Step 2g — Per-tenant API throttling (DONE)
- ✅ 2g.1 — Plan defaults + DynamoDB counter schema (see `tiryaq-cdk/lambda/lib/plan-defaults.js`, `docs/08-throttling.md`).
- ✅ 2g.2 — Shared throttle module `tiryaq-cdk/lambda/lib/throttle.js`.
- ✅ 2g.3 — Wired into 7 high-traffic Lambdas: getAllPatients, tiryaq-pharmacy, tiryaq-appointments, tiryaq-bloodbank, tiryaq-document-manager, tiryaq-calendar, tiryaq-examinations.
- ✅ 2g.4 — Wired into all 23 remaining tenant Lambdas via batch script (createPatientSurgery removed earlier — not applicable).
- ✅ 2g.5 — Per-tenant 429 count published as CloudWatch metric `Akwadona/Throttle/Hits` and surfaced on the operator Usage card with amber highlight when > 0.
- 🔲 2g.6 — Load test verifying the limits clamp at the configured numbers. Optional verification.

#### Throttle test snippet (run AFTER a fresh tenant-user login)

Cognito tokens expire after 1 hour. Sign in fresh, copy a NEW token from `sessionStorage.getItem('accessToken')` in the browser DevTools console, then run:

```powershell
$token = "PASTE_FRESH_TOKEN_HERE"   # must NOT be the operator's token — throttle skips operators

# Confirm it's a tenant_user before testing
$payload = $token.Split('.')[1]
$pad = $payload + ('=' * ((4 - ($payload.Length % 4)) % 4))
[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($pad.Replace('-','+').Replace('_','/')))

# Fire 700 requests (Free plan = 600/min cap → first 600 = 200, rest = 429)
$results = @{}
$i = 0
1..700 | ForEach-Object {
    $code = curl.exe -s -o NUL -w "%{http_code}" -H "Authorization: Bearer $token" "https://jxz59jh15f.execute-api.us-east-1.amazonaws.com/patients?pageSize=1"
    if (-not $results.ContainsKey($code)) { $results[$code] = 0 }
    $results[$code]++
    $i++
    if ($i % 100 -eq 0) { Write-Host "Done $i / 700"; $results }
}
$results
```

Expected output for Free-plan tenant: ~600 × `200` + ~100 × `429`.
If you see `401` instead → token expired, log in again.

### Step 2d-4 — Per-row tenant enforcement (big domain Lambdas)
- Apply `tenantId` partition check on every read/write in:
  - `tiryaq-pharmacy`
  - `tiryaq-bloodbank`
  - `tiryaq-scribe`
  - `tiryaq-calendar`
  - `tiryaq-document-manager`
- Reject (403) if `claim.tenantId !== row.tenantId`.
- Add unit tests that try cross-tenant reads with two seeded tenants.

### Step 8 — AWS resource rename `tiryaq-*` → `akwadona-*` (Phase A DONE)
- ✅ Phase A — All 39 CDK-managed Lambdas now `akwadona-*` (10 originally prefixed + 27 camelCase + 2 patient ones from initial test). Runbook at `docs/09-rename-runbook.md`.
- ✅ All renames completed without downtime (in-place rename, API Gateway routes auto-updated by CloudFormation).
- 🔲 Phase B — stack rename, S3 bucket renames, API Gateway display name, Cognito User Pool display name. Requires planned maintenance window. Deferred.
- 🔲 Cleanup — `tiryaq-seed`, `tiryaq-create-users` (manually-created utilities) + `cognito-pre-token-generation` (left alone to avoid breaking the trigger). Low priority.

### (Old Step 8 plan — kept for reference)
- Rename: Lambda functions, S3 buckets, CloudFront distribution alias, CDK stack name, log groups, IAM roles.
- DynamoDB table `Hospital` stays (no rename needed).
- KMS keys keep their UUIDs; only aliases rename.
- Migration order: blue-green (new names provisioned alongside, traffic cut over, old names destroyed).
- Update Angular `Config` + OIDC + docs to the new names.

### Admin — Change User Email endpoint
- New `PATCH /admin/users/{userId}/email` for hospital admins.
- Updates Cognito attribute + the `emailHash` (HMAC) row in DynamoDB.
- Sends verification email to the new address before flipping.
- Audit row written with `before`/`after` (encrypted).
- UI in Admin Panel for the existing Users tab.

### NEW — Multi-language support (i18n)
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

### Perf — sign-in → painted dashboard in < 1 s (SaaS-grade)
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

### NEW — "Premium Isolation" tier (opt-in Silo for enterprise customers)
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

### NEW — Full IaC kill-switch (`teardown.ps1`)
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

### NEW — Customer data migration guide
- **Goal:** when a new hospital wants to onboard with their existing patient + doctor records (probably exported from another EMR), we have a documented import path.
- **Why:** today, the only way to add data is manual UI clicks. A 50,000-patient hospital can't do that.
- **What huge SaaS does:**
  - **Athenahealth / Epic on AWS:** offer a "migration kit" — a CSV / FHIR template the source EMR fills, plus a one-time bulk-import Lambda.
  - **Stripe Connect:** customers upload CSV → import Lambda creates accounts + records.
  - **Box / Dropbox:** dedicated migration tool (rclone-like) for bulk uploads.
- **Plan — `docs/11-customer-migration-guide.md`:**
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

### Step 7 follow-ups (optional polish)
- Hardened operator Lambda role with explicit DENY on `kms:Decrypt` for all `T_*` tenant keys (defense-in-depth).
- Tenant onboarding wizard inside the operator console (today: manual via DDB seed script + KMS console).
- CloudFront BytesDownloaded per-tenant (requires field-level CloudFront real-time logs piped to per-tenant metric publisher).
- Cost Explorer per-tenant tagging + display in the Usage card.

## Reference SaaS patterns we're following

- **Athenahealth** — single auth domain, generic role groups, tenant in JWT claim.
- **Stripe Connect** — `auth.stripe.com` single login URL, organization-id in JWT, no tenant in URL.
- **Vercel Teams** — one auth surface, team-id claim, generic permissions.
- **Auth0 Organizations** — same model formalized as a product feature.
- **Particle Health / Redox** — interop platforms; vendor sees query counts, never patient payloads.

## Constraints (do not violate)

- Operator console **never** shows patient / doctor / appointment data — only platform admin metrics.
- All PHI is envelope-encrypted with per-tenant KMS CMKs (Step 3).
- HMAC search fields use per-tenant KMS HMAC keys (Step 4).
- Compliance: HIPAA, PDPPL (Qatar), GDPR — see `docs/05*.md`.
- Conversation rule: step-by-step, brief, easy English, points list.

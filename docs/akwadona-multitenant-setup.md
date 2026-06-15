# Akwadona Multi-Tenant Setup — akwadona.com

Goal: One Akwadona platform serves many hospital customers ("tenants"). Each customer gets its own subdomain and sees only its own data. The platform is **PHI-blind** — Akwadona staff cannot read patient data even if they wanted to (Step 3 KMS work, separate doc).

This document covers what is **currently in production**.

> **Naming conventions used in this doc**
> - **Tenant / Customer:** same thing — a hospital that uses Akwadona.
> - **Slug:** human-readable URL piece. `tiryaq` in `tiryaq.akwadona.com`.
> - **tenantId:** opaque ID stored in DynamoDB, e.g. `T_2572fc71`. Never visible to users. Stable across slug changes.

---

## Live tenants

| Slug | tenantId | Display name | Status |
|------|----------|--------------|--------|
| `tiryaq` | `T_2572fc71` | Tiryaq Hospital | Active |
| `alshifaa` | `T_a4b8aef9` | Alshifaa Hospital | Active |

Both IDs are deterministic: `T_` + first 8 hex chars of `SHA-256("AKWADONA_TENANT_" + slug)`. The same script run on any machine produces the same IDs, so backfills are idempotent.

---

## Infrastructure references

- CloudFront distribution: `E1Z1ZKYM74LVA7` → `d6i7iwknkj0bg.cloudfront.net`
- AWS account: `483176634665`
- Cognito user pool: `tiryaq-user-pool` (region `us-east-1`) — single pool serves all tenants
- App client: `Tiryaq` (`2nfjfipi8hri262pjohtpgl45q`)
- DynamoDB table: `Hospital` (region `us-east-1`)
- ACM wildcard cert: `*.akwadona.com` in `us-east-1`
- Domain registrar: GoDaddy

---

## DNS, certificate, CloudFront (Phase 1)

Done in earlier work — verified live.

- [x] DNS CNAMEs `tiryaq` and `alshifaa` → CloudFront distribution
- [x] Wildcard ACM cert `*.akwadona.com` issued + validated
- [x] CloudFront alternate domain names include both subdomains
- [x] Cognito callback + sign-out URLs include both subdomains (with and without trailing slash)

To add a future tenant subdomain (e.g. `newhospital.akwadona.com`):

1. GoDaddy → add CNAME `newhospital` → `d6i7iwknkj0bg.cloudfront.net`.
2. CloudFront `E1Z1ZKYM74LVA7` → Alternate domain names → add `newhospital.akwadona.com` → save.
3. Cognito → app client `Tiryaq` → callback + sign-out URLs → add the new subdomain (both with and without trailing slash) → save.
4. DNS propagation: 5–60 min.

---

## Identifier design

- **tenantId is the source of truth.** Stored on every row in DynamoDB. Returned in every Cognito JWT. Backend Lambdas read it from the signed JWT — never from request bodies.
- **Slug is for humans only.** Subdomain (`tiryaq`) and the UI badge ("Tiryaq Hospital") use it. If a customer rebrands, change the slug; all data rows stay valid because they reference the opaque tenantId.
- **Map lives in two places (kept in sync):**
  - Backend: `scripts/lib/tenant-ids.js` (deterministic SHA-256 generator).
  - Frontend: `src/app/services/tenant.service.ts` (static map of known tenants).

---

## Cognito — `custom:tenantId`

- Added as a custom attribute on `tiryaq-user-pool` (Step 2a, CDK).
- Every user has exactly one tenantId. Users not yet assigned default to `UNASSIGNED` (rejected by every Lambda).
- Pre-token-generation Lambda (`cognito-pre-token-generation`) injects the attribute into both the **access token** and the **ID token** as a `tenantId` claim, so backend Lambdas and the frontend both read it directly.

**Onboarding a new user to a tenant (operator action):**

Via Console: Cognito → User Pools → `tiryaq-user-pool` → Users → click user → edit attributes → set `custom:tenantId` → save.

Via CLI:

```powershell
aws cognito-idp admin-update-user-attributes `
    --user-pool-id us-east-1_RACghntmS `
    --username <username> `
    --user-attributes Name=custom:tenantId,Value=T_<id> `
    --region us-east-1
```

---

## DynamoDB — `tenant-entityType-index` GSI

Added in Step 2a:

```
indexName:     tenant-entityType-index
partitionKey:  tenantId (S)
sortKey:       EntityType (S)
projection:    ALL
```

Every data row written by a Lambda carries `tenantId`. A tenant query becomes:

```
Query
  IndexName: tenant-entityType-index
  KeyConditionExpression: tenantId = :tid AND EntityType = :et
```

DynamoDB returns only that tenant's rows for the requested entity. No FilterExpression scan, no risk of accidentally seeing another tenant's data.

**Per-tenant counters** replaced the global ones:

- `COUNTER#PATIENTS#<tenantId>` SK=`TOTAL`
- `COUNTER#DOCTORS#<tenantId>` SK=`TOTAL`
- `COUNTER#APPOINTMENTS#<tenantId>` SK=`TOTAL`

Legacy global counters (`COUNTER#PATIENTS` etc.) remain on disk but are no longer incremented.

---

## Lambda enforcement — 3 layers of defence

Every PHI-touching Lambda implements all three layers. The pattern is documented in `tiryaq-cdk/lambda/_shared/tenant.js` (reference copy) and inlined into each Lambda's `index.js`.

**Layer 1 — Entry guard.** First line of the handler reads `tenantId` from the JWT. If the user has no tenant (claim is missing or `UNASSIGNED`), return 403 before touching the database.

**Layer 2 — Database condition.** Every Query uses `tenant-entityType-index` scoped to the caller's tenantId. Every Update / Delete carries `ConditionExpression tenantId = :tid` so DynamoDB itself refuses the write if the row belongs to another tenant. A `ConditionalCheckFailedException` is returned to the user as **404** (not 403) so existence of cross-tenant rows is never disclosed.

**Layer 3 — Post-query filter.** After reading rows back, the Lambda runs `.filter(item => item.tenantId === caller.tenantId)` in JavaScript. Catches any row whose tenantId is missing or wrong even if layers 1 and 2 fail.

**Coverage status (June 2026):**

- Full 3-layer enforcement: `createPatient`, `getAllPatients`, `getPatientByID`, `updatePatient`, `deletePatient`, `getPatientsDataByFilters`, `createDoctor`, `getAllDoctors`, `getDoctorByID`, `getDoctorByEmail`, `updateDoctor`, `deleteDoctor`, `tiryaq-appointments`, `createPatientPayment`, `getAllPaymentsForPatient`, `listAllPaymentsForPatientByID`, `getPaymentByID`, `updatePatientPayment`, `deletePayment`, `getSurgeryByID`, `listAllSurgeriesForPatientByID`, `getAllInvoices`, `tiryaq-audit`, `tiryaq-admin-panel`.
- Entry guard only (per-row enforcement queued as task #74): `tiryaq-bloodbank`, `tiryaq-calendar`, `tiryaq-document-manager`, `tiryaq-examinations`, `tiryaq-pharmacy`, `tiryaq-scribe`. Safe today (Tiryaq is the only customer with data); must be completed before any second tenant goes active.

---

## Cross-tenant disclosure prevention

Things that are explicitly designed **not** to leak across tenants:

- **404 vs 403:** wrong tenant → 404 (looks identical to "doesn't exist").
- **QID / phone / email locks:** when a uniqueness check collides with another tenant's row, the error message is generic ("Failed to create"), never the specific field value.
- **Cognito user list (admin panel):** `ListUsers` returns the whole pool, but the Lambda filters to users matching the caller's tenantId before returning the list.
- **Audit log:** every audit row carries tenantId; queries are scoped before return.
- **Counters:** per-tenant only — admin dashboard cannot see other tenants' totals.

---

## Frontend — TenantService

`src/app/services/tenant.service.ts` exposes:

- `slug` — from subdomain (`tiryaq.akwadona.com` → `tiryaq`). Dev fallback: `localhost` → `tiryaq`.
- `displayName` — friendly UI label ("Tiryaq Hospital").
- `tenantIdFromUrl` — slug → opaque ID via the static map.
- `tenantIdFromJwt` — parsed from the current access token (authoritative).
- `subdomainMatchesJwt()` — `true` only when both sides agree.

**Top bar** (`app.topbar.ts`) shows the brand text **Akwadona** plus a green pill with the tenant's display name on tenant subdomains. Hidden on `www.akwadona.com` (reserved for the future operator console).

**Auth guard** (`src/app/guards/auth.guard.ts`) runs after every successful sign-in: if `tenantIdFromUrl !== tenantIdFromJwt`, the user is signed out and redirected to their correct subdomain. Prevents users from ever rendering another tenant's branded UI even if their backend reads would be rejected.

---

## Backfill — what's been done

Run scripts in `scripts/` to bootstrap tenant state. All idempotent.

```powershell
cd "C:\Users\Sami Toufic Taha\Desktop\aws apps\hospital\scripts"
node backfill-create-tenants.js          # creates TENANT#tiryaq + TENANT#alshifaa profile rows
node backfill-dynamodb-tenant.js         # stamps tenantId on existing data rows (1.6M-row backfill done)
node backfill-cognito-tenant.js          # sets custom:tenantId on every existing Cognito user
```

Re-runs are safe — already-tagged rows / users are skipped.

---

## Testing — verify isolation works

1. Sign in to `https://tiryaq.akwadona.com` as `admin1` (Tiryaq tenant). Note the patient list and appointment counts.
2. Sign out.
3. Sign in to `https://alshifaa.akwadona.com` as `admin2` (Alshifaa tenant, set via `aws cognito-idp admin-update-user-attributes` after the rename).
4. Expect: 0 patients, 0 doctors, 0 appointments. Alshifaa cannot see Tiryaq's data.
5. (Optional) try to fetch a Tiryaq patient ID directly by URL while signed in as Alshifaa — Lambda returns 404.
6. JWT check: open DevTools → Application → sessionStorage → decode `accessToken` → confirm `tenantId` claim equals the expected `T_*` value.

---

## Open follow-ups

- **Task #74** — finish per-row tenant enforcement on `tiryaq-bloodbank`, `tiryaq-calendar`, `tiryaq-document-manager`, `tiryaq-examinations`, `tiryaq-pharmacy`, `tiryaq-scribe`.
- **Task #73** — software per-tenant API throttling (operator-editable in Step 7).
- **Task #75** — rename `tiryaq-*` AWS resources → `akwadona-*` (Cognito hosted domain, CDK stack, Lambdas, S3 buckets) in a planned coordinated migration after Step 6.
- **Step 3 (next)** — per-tenant KMS keys + envelope encryption so Akwadona literally cannot decrypt customer PHI.
- **Step 7** — operator console at `www.akwadona.com`.

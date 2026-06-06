# Tiryaq — Code Review (June 2026)

Scope: a top-to-bottom walk-through of the codebase to (1) build a robust mental model of the system, (2) surface security vulnerabilities, (3) flag bugs / footguns. Findings are ranked by severity. Numbers reference files and line ranges as of this review.

---

## 1. System overview — business + technical

### 1.1 Business

Tiryaq ("akwadona.com") is a multi-role hospital management web app for the Qatar / GCC market. Roles:

| Role | Cognito group | Primary capabilities |
| --- | --- | --- |
| **Admin** | `Admin` | Full app — patients, doctors, appointments, invoices, documents, admin panel, blood bank. |
| **Developer** | `Developers` | Same as Admin + voice scribe; intended for support staff. |
| **Doctor** | `Doctors` | Own appointments + check-in + consultations + voice scribe + blood requests + documents. |
| **Pharmacist** | `Pharmacists` | Pharmacy (medications/inventory/prescription queue/POs), blood bank inventory/donations/cross-match/issue. |
| **Patient** | `Patients` | (Defined in code, not yet exposed in UI.) |

Top-level domains: **Patients · Doctors · Appointments · Consultations (examinations) · Voice Scribe · Pharmacy · Blood Bank · Documents · Invoices · Calendar · Admin panel**.

Compliance posture: **PDPPL** (Qatar privacy law) + **MOPH** (Ministry of Public Health) — all clinical rows tagged `dataClass=PHI`, encryption at rest via customer-managed KMS CMK, OAC on S3, security-headers policy on CloudFront, every mutating Lambda writes an `AUDIT#<date>` row, soft-delete only.

### 1.2 Technical stack

```
┌──────────────────────────────────────┐
│  Browser (Angular 20 + PrimeNG 20)   │
│  • OIDC (Cognito hosted UI)          │
│  • Service Worker (Phase A/B)        │
│  • IndexedDB offline queue (Phase C) │
│  • Idempotency cid header (Phase D)  │
│  • Topbar offline pill   (Phase E)   │
│  • Temp-id FK rewrite    (Phase F)   │
└────────────┬─────────────────────────┘
             │ HTTPS via CloudFront → S3 (static)
             │ HTTPS via API Gateway HTTP API v2 (JWT auth)
             ▼
┌──────────────────────────────────────────────────────────┐
│  Lambdas (Node 20 / 24) — one per domain or per CRUD     │
│  • 41 functions, ~9 k LOC, single DynamoDB single-table  │
│  • Idempotency cache:  IDEMP#<cid> (24 h TTL)            │
│  • Audit trail:        AUDIT#YYYY-MM-DD#<entity>#<id>    │
└────────────┬─────────────────────────────────────────────┘
             │ AWS SDK v3 (DynamoDBDocumentClient / S3 / Bedrock)
             ▼
┌──────────────────────────────────────────────────────────┐
│  DynamoDB single table `Hospital` (PK / SK + 7 GSIs)     │
│  Encryption: customer-managed KMS CMK + bucket-key on S3 │
└──────────────────────────────────────────────────────────┘
```

Single-table key shapes (subset):

```
Patient:     PK = PATIENT#<id>             SK = PROFILE
Doctor:      PK = DOCTOR#<id>              SK = PROFILE
Appointment: PK = APPOINTMENT#<id>         SK = PROFILE
Examination: PK = EXAM#<id>                SK = PROFILE
Calendar:    PK = CALENDAR#<calId>         SK = PROFILE
CalendarEvt: PK = CALENDAR#<calId>         SK = EVENT#<eventId>
BBDonor:     PK = DONOR#<donorId>          SK = PROFILE
BBUnit:      PK = BBUNIT#<unitId>          SK = PROFILE
BBRequest:   PK = BBREQ#<requestId>        SK = PROFILE
QID lock:    PK = QID#<qid>                SK = LOCK     (uniqueness)
Phone lock:  PK = PHONE#<phone>            SK = LOCK     (uniqueness)
Counter:     PK = COUNTER#PATIENTS         SK = TOTAL
Idempotency: PK = IDEMP#<cid>              SK = PROFILE  (24 h TTL)
Audit:       PK = AUDIT#YYYY-MM-DD         SK = AUDIT#<entity>#<id>#<ts>
```

GSIs: `EntityType-index`, `doctorEmail-createdAt-index`, `dataClass-index`, `email-index`, `qid-index`, plus a couple more on patients/payments. The `dataClass-index` requires `updatedAt` to always be a non-null String — a recurring source of bugs (callouts later).

### 1.3 Frontend — moving parts

- **Routing**: `provideRouter(appRoutes, withEnabledBlockingInitialNavigation, withPreloading(PreloadAllModules))`.
- **Auth**: `angular-auth-oidc-client` v19. Tokens in `sessionStorage` (never localStorage). Only `returnUrl` (a path string, not a credential) lives in localStorage.
- **`authGuard`**: runs `oidc.checkAuth()` once per app boot (`checkAuthDone` module flag) then trusts the `sessionStorage` token.
- **`roleGuard(allowed[])`**: factory returning a `CanActivateFn` keyed off `auth.current.role`.
- **`authInterceptor`**: catches 401 on same-origin **and** the API host, kicks `oidc.authorize()`.
- **`offlineQueueInterceptor`** + **`OfflineService`**: queue + replay + temp-id FK rewrite.
- **`HelpersService`**: toast helper that suppresses duplicate "saved offline" toasts.

### 1.4 Backend — moving parts

Mutating Lambdas all implement **Phase D idempotency** at the top of each route:

```js
const cid = getClientRequestId(event);
const cached = await checkIdempotency(cid);
if (cached) return cached;
// … work …
const response = res(…);
await storeIdempotency(cid, response);
return response;
```

Auditable Lambdas write a row to the audit table (`tiryaq-appointments`, `tiryaq-examinations`, `tiryaq-pharmacy`, `tiryaq-bloodbank` — others rely on CloudTrail).

---

## 2. Vulnerabilities (security findings)

Severity scale: **🔴 High · 🟠 Medium · 🟡 Low**.

### 2.1 🔴 Missing role authorization in several Lambdas (horizontal + vertical privilege escalation)

The frontend hides buttons; the backend often does **not** verify the caller's group. A signed-in user can craft direct API calls to forbidden actions.

| Lambda | Path | Missing check |
| --- | --- | --- |
| `deletePatient` | `DELETE /patients/{id}` | No `isAdmin*` check. Any authenticated user can soft-delete any patient. |
| `updatePatient` | `PATCH /patients/{id}` | Only the `/restore` sub-path enforces admin. Plain PATCH lets a pharmacist edit clinical fields. |
| `tiryaq-examinations` | `POST /examinations`, `PATCH /examinations/{id}/sections`, `POST /examinations/{id}/signoff` | No verification the caller IS the doctor named in `body.doctorEmail` — a different doctor (or a pharmacist) can write into someone else's chart. |
| `tiryaq-document-manager` | All routes | API Gateway JWT auth is the only gate. A pharmacist can `POST /documents/upload-url` for `folder = doctors-documents` and write into that folder. Download URL likewise has no per-resource ACL. |
| `tiryaq-appointments` (POST) | `POST /appointments` | Only `caller.isAdmin` gates creation, but `body.doctorEmail` / `body.doctorId` are trusted; an admin can be socially engineered into accepting a doctor identifier the caller shouldn't legitimately bind to. (Lower risk; admin-only.) |
| `createPatient` / `createDoctor` / `createPatientPayment` / reference-data Lambdas | All POST | No group check. Same horizontal class. |

**Recommendation:** add a single shared helper (e.g. `_shared/auth.js`) that exports `requireGroup(event, ['Admin', 'Developers'])` and call it at the top of every mutating Lambda. Specifically:
- examinations → require `Doctors|Admin|Developers` AND check `body.doctorEmail.toLowerCase() === caller.email` when the caller is a Doctor.
- document-manager → enforce: doctors can read `doctors-documents` / `patients-documents` / `lab-results` / `radiology-images`; pharmacists `prescriptions` / `pharmacy-approvals`; admins everything. Download URL must check the key's prefix matches an allowed folder for the caller.
- delete/update Patient → require Admin/Developer (and optionally the patient's assigned doctor).

### 2.2 🔴 Document-manager — predictable S3 keys + no resource-level ACL

`folder/<userId>/<timestamp>_<fileName>`. The S3 key embeds the uploader's Cognito `sub`. To download, a caller passes the key back to `/documents/download-url`; the Lambda only validates the folder prefix. So any authenticated user can guess (or list, via `/documents/list`) keys for another user and retrieve their files via the presigned URL.

**Recommendation:** download-url must (a) compare the key's `<userId>` segment to the caller's `sub` OR (b) consult an ACL table (`DOC_ACL#<key>` → allowed groups / users). The list endpoint should likewise filter by allowed prefixes for the caller's groups.

### 2.3 🟠 No rate limiting / WAF at the edge

`tiryaq-cdk-stack.ts` line 986 — WAF is commented out ("temporarily disabled to stop charges"). API Gateway has no per-method throttle (no `throttle.rateLimit` / `burstLimit` set). A caller with a valid JWT can hit the Cognito-pre-token-generation, login, and audit endpoints as fast as they want.

**Recommendation:** re-enable the edge stack (`tiryaq-edge-stack.ts`) — it already has a rate-based statement of 2000 req/5min/IP — and set a default throttle on the HTTP API (`throttle: { rateLimit: 50, burstLimit: 100 }`). Compliance-relevant: PDPPL Article 13 expects "reasonable safeguards".

### 2.4 🟠 `tiryaq-document-manager` accepts a forged `userId` proxy

The Lambda uses `claims.sub || claims['cognito:username'] || 'anonymous'` (line 88). If the JWT lacks `sub` and `cognito:username` for any reason (e.g. machine-to-machine token), the uploader becomes "anonymous" and the S3 key becomes `<folder>/anonymous/<ts>_<name>` — discoverable by anyone via `/documents/list`.

**Recommendation:** reject the request if neither claim is present (`return err(401)` rather than silently bucket the upload as "anonymous").

### 2.5 🟠 `authInterceptor` redirect-loop guard relies on host substring

`OIDC_HOSTS` contains `'cognito-idp.'`, `'auth.us-east-1.amazoncognito.com'`, `'amazoncognito.com'`. A future API host that happens to contain any of these substrings would be excluded from the 401-redirect path. Low likelihood, low blast radius, easy to misconfigure.

**Recommendation:** match by exact origin (`new URL(req.url).host`) and a list of allowed hostnames.

### 2.6 🟠 Frontend `auth.service.parseRole` returns a single role

`parseRole` returns the FIRST matching group in this precedence order: `developer > admin > doctor > pharmacist > patient`. A user who is BOTH `Doctors` and `Admin` (e.g. a hospital director) will be flagged as `developer` if also a developer, but more importantly: the `roleGuard` allow-list check (`allowedRoles.includes(auth.current.role)`) means a pharmacist also added to `Doctors` would only show as `pharmacist` (because the dev/admin/doctor groups aren't theirs). The mismatch is mild today but **`isPharmacist`** is implemented inconsistently (reads `_groups` directly while `isAdmin`/`isDoctor` read `current.role`).

**Recommendation:** rewrite `AuthService` around an `isInGroup(group)` primitive backed by `_groups: Set<string>`. Derive `isAdmin`, `isDoctor`, … from that. Same for `roleGuard` — `allowedRoles.some(r => groupsForRole(r).some(g => groups.has(g)))`.

### 2.7 🟡 OIDC token parsing in the frontend is unauthenticated

`AuthService.current` base64-decodes the access token's payload to extract `cognito:groups`. The signature is **not** verified client-side (you'd need the JWKS). This is normal for an OIDC client — the server re-validates — but a tampered token in localStorage would mislead the UI into showing admin views. Damage is limited to UI (every backend call still checks claims), but it's a confusing surface for support: a user could "appear" to have access they don't.

**Recommendation:** keep server-side as the source of truth (already true). For belt-and-braces, parse the ID token only after `oidc.checkAuth()` resolves successfully (the library already validates signatures).

### 2.8 🟡 `createPatient` leaks internal error details via substring match on errors

```js
const isValidation =
  error.message.includes('required') ||
  error.message.includes('must be') ||
  error.message.includes('valid') ||
  error.message.includes('already exists');
return { statusCode: isValidation ? 400 : 500, … message: error.message }
```

Any thrown error's message is echoed verbatim to the client (status 500 path). A DDB exception text or stack trace could surface.

**Recommendation:** funnel through a tiny error class — `class HttpError extends Error { constructor(status, code, msg) }` — and never echo `error.message` from a catch-all 500 branch (return `'Internal error'`).

### 2.9 🟡 Service Worker caches API responses with personal data

The `freshness` strategy on `api-reads` (ngsw-config) keeps every `GET` for 1 day per browser. A shared device used by two doctors will let the second doctor see (briefly) the first doctor's cached patient list when offline.

**Recommendation:** scope the cache by user — append `Authorization`-derived key prefix in a custom SW, or simply downgrade the `dataGroups` to a 5-minute `maxAge` and explicitly clear the IDB + caches on logout (`OidcSecurityService.logoffLocal()` already wipes session storage; expand `helpers-service.logout` to also `caches.keys().then(forEachDelete)`).

### 2.10 🟡 CORS allow-list contains the apex but not `www`

Backend `corsPreflight.allowOrigins` lists `https://akwadona.com` and the CloudFront default URL. After adding `www.akwadona.com` to CloudFront, the API also needs to accept that origin or browser-side preflight will fail.

**Recommendation:** add `'https://www.akwadona.com'` to `allowedOrigins` in `tiryaq-cdk-stack.ts`, redeploy.

### 2.11 🟡 Idempotency cache stores entire response — sensitive responses persisted 24 h

The `IDEMP#<cid>/PROFILE` row contains a JSON dump of the full response (which may include PHI). It lives in the same encrypted table, but its `dataClass` is `SYSTEM`, meaning it would not be picked up by future `dataClass = PHI` filters used for data-subject-access or right-to-erasure requests.

**Recommendation:** if the response contains PHI, mirror its `dataClass` onto the cache row (or always set `dataClass=PHI` for safety) so it's swept by the same erasure pipeline.

---

## 3. Bugs / footguns

### 3.1 🔴 `tiryaq-appointments` doctor-overlap query has a stale-cancelled mismatch

`findDoctorOverlap` filters `#status <> :cancelled` — but never excludes appointments that are already `completed` from the past. That's fine (those rows have `date < today`). HOWEVER, on `PATCH` we re-run the check with `body.doctorId || appt.doctorId`. If a request only changes `notes`, we still re-query because `body.startTime` / `body.endTime` / `body.date` may also be present. Low impact, but redundant.

### 3.2 🟠 `tiryaq-appointments` paginated list returns 0–N rows per "page" under heavy filters

`MAX_UPSTREAM_PAGES = 10`. If a `doctorId` filter is highly selective (e.g. a tiny doctor on a 1 M dataset), the loop hits the cap before the page fills and returns fewer than `pageSize` rows with `hasMore=true`. The UI's "Showing X of Y" line will be misleading (`Y` is the table-total).

**Recommendation:** when adding the date-bucketed GSI later (planned in the production-scale section of the offline-mode doc), make the `doctorId` path use `doctorEmail-createdAt-index` directly (already exists) so we can drop the FilterExpression for that case.

### 3.3 🟠 `examinations` POST uses `body.doctorId || id` (the new examId)

`tiryaq-cdk/lambda/tiryaq-examinations/index.js` line 261:

```js
doctorId: body.doctorId || id,
```

If the client forgets `doctorId`, the examination's `doctorId` becomes the **examination's own UUID** — definitely not a doctor. Downstream queries by doctorId would silently return zero results.

**Recommendation:** reject the request when `body.doctorId` is missing (already required for the appointment link). Apply the same fix to `doctorName`.

### 3.4 🟠 `tiryaq-appointments` `validateAppointment` requires all four name/email fields, but the create flow doesn't reconcile them with the patient/doctor tables

The Lambda accepts `patientName`, `doctorName`, `doctorEmail` from the request body and stores them on the appointment row. If the user has been renamed (or the email lower-casing differs by 1 char), the appointment row holds stale data. Subsequent queries by `doctorEmail` GSI may match wrongly.

**Recommendation:** look up the patient + doctor server-side from their IDs, ignore the names/email from the body.

### 3.5 🟠 `tiryaq-examinations` PATCH section ignores the auth context

The PATCH `/examinations/{id}/sections` handler accepts any field but never verifies the caller. Pair with finding 2.1: any doctor can rewrite any other doctor's notes.

### 3.6 🟡 Counter rows can drift on partial transaction failures

`createPatient` increments `COUNTER#PATIENTS` in a **second**, non-transactional `UpdateCommand` after the patient transaction. If the patient transaction succeeds but the Lambda crashes (timeout/cold-start) before the counter bump, the counter is now off-by-one. Same pattern in deletePatient / createDoctor.

**Recommendation:** add the counter increment INSIDE the `TransactWriteCommand`. DDB supports up to 100 items per transaction, and counter writes are atomic.

### 3.7 🟡 `seed-appointments.js` bypasses the counter row

Direct BatchWriteItem doesn't increment `COUNTER#APPOINTMENTS`, so the table's total is wrong after a seed. The `sync-appointments-counter.js` script we just wrote is the workaround — but make it part of the seed script (have it call sync on completion) so the operator can't forget.

### 3.8 🟡 `tiryaq-appointments` paginated list — `decodeNextToken` accepts malformed input silently

`try { return JSON.parse(Buffer.from(t,'base64').toString('utf8')); } catch { return undefined; }`. A malformed token returns `undefined`, so the next call silently restarts at page 1. Better: return a 400 so the UI knows to reset.

### 3.9 🟡 Offline replay does FilterExpression by name match — fragile

`OfflineService.findRealIdInResponse` walks a list of common id keys (`id`, `examinationId`, `appointmentId`…). If a Lambda's response uses an unusual key (e.g. `requestId`), the mapping is silently lost and later replays still reference the temp id.

**Recommendation:** require every create endpoint to echo a canonical `id` field in addition to its domain-specific id; the offline service reads that and we never miss.

### 3.10 🟡 `app.config.ts` — Cognito client ID + authority hard-coded

`AppTopbar.logout` and `app.config.ts` both hard-code `2nfjfipi8hri262pjohtpgl45q` and the authority URL. Any rotation requires a frontend redeploy (no env var). Same for the API base URL in `Config.tiryaqUrl`.

**Recommendation:** load from a runtime `assets/runtime-config.json` baked at deploy time by the deploy script (already done for many Angular apps).

### 3.11 🟡 `app.menu.ts` — Voice Scribe still listed under "developerItems"

Sprint 31 removed it for admin, but the developer menu still shows it. If "developer" is intentional, that's fine; if it was meant to be doctor-only, this is a leftover.

### 3.12 🟡 Long-conversation toast key inconsistency

`HelpersService.notifySuccess` short-circuits via `wasOfflineEnqueueRecent()`, but `notifyError` / `notifyInfo` don't. Some flows surface "Save failed" toast on top of the offline-queue's "Saved offline" toast.

---

## 4. Architectural recommendations (longer-term)

1. **Add a `_shared/auth.js` helper** packaged with each Lambda (CDK `Code.fromAsset` per-folder rule prevents `require('../_shared')`, so inline the helper into each Lambda or use Lambda layers). Standardise: `requireGroup`, `requireOwner`, `getCaller`.
2. **Move all role checks server-side first, frontend second.** The frontend guard is a UX nicety; the Lambda is the security boundary.
3. **Move from `EntityType-index` for hot reads to a per-domain GSI** (e.g. `date-startTime-index` on appointments). At 1 M+ rows the post-read FilterExpression burns RCUs and slows pages with selective filters.
4. **Re-enable WAF + API Gateway throttling.** The 2-line comment-out-for-cost is a vulnerability if the cost was the only reason.
5. **One-time cleanup** of the comments-as-code at the top of `Patients Management/new-patient.ts` and `edit-patient.ts` (lines 1–500 are an obsolete duplicate). Reviewers waste time scrolling.
6. **Adopt branded types for IDs.** `PatientId`, `DoctorId`, `AppointmentId` as TS opaque types prevent the `body.doctorId = id (examId)` class of bug in 3.3.
7. **Centralise CORS allow-list** in a single CDK constant so future domains don't have to update two files.
8. **Add automated tests** — there are no unit/integration tests in the repo today. Even a minimal Cypress smoke test (`login → create patient → create appointment`) would catch finding 2.1 in CI.

---

## 5. Quick wins (do this week)

1. Add the missing role checks (2.1) — Lambdas: `deletePatient`, `updatePatient` (non-restore), `createPatient`, `createDoctor`, `tiryaq-examinations` (all routes), `tiryaq-document-manager` (all routes).
2. Add owner-of-key check in `document-manager` download-url + list (2.2).
3. Re-enable WAF + add API Gateway throttle (2.3).
4. Make `examinations.doctorId` required (3.3).
5. Add `https://www.akwadona.com` to the API CORS allow-list (2.10).

---

## 6. Inventory — Lambdas by trust level

Already enforces role checks:

- `tiryaq-appointments` (admin gates POST; doctor-self gates PATCH/DELETE)
- `tiryaq-pharmacy` (Pharmacist/Admin)
- `tiryaq-calendar` (canWrite gates writes)
- `tiryaq-admin-panel` (admin-only at handler top)
- `tiryaq-scribe` (Doctors|Admin)
- `tiryaq-bloodbank` (canRead / canManageInventory / canRequestBlood / canIssueBlood)
- `updatePatient` `/restore`

Currently un-gated (or partial) — see 2.1:

- `createPatient`, `updatePatient` (non-restore), `deletePatient`
- `createDoctor`, `updateDoctor`, `deleteDoctor`
- `tiryaq-examinations` (all routes)
- `tiryaq-document-manager` (all routes)
- Reference-data Lambdas (`createNewDepartment`, etc.)
- `createPatientPayment`, `updatePatientPayment`, `deletePayment`

---

## 7. Inventory — schema risks

- **`dataClass-index` GSI** requires `updatedAt` to be a non-null String. Several places have safely-defaulted to `nowIso()`; one slip historically broke the donor stats bump (fixed). Add a runtime guard: write a small Lambda layer helper `writeRowWithCompliance(item)` that enforces the invariant before sending.
- **`email-index` GSI** rejects `null`. Donor's email field would have broken creation; fixed by omitting the attribute. Same pattern needed if you ever add a `gender-index` (no GSI today, but worth flagging).
- **`COUNTER#APPOINTMENTS`** newly added — only incremented by the Lambda. Direct DDB writes (bulk seed) bypass it. Pair with sync script in 3.7.

---

## 8. End

This is a working sprint snapshot — most criticisms are fixable in hours, not days. The biggest single risk is **finding 2.1** (missing server-side role checks). Everything else is medium-or-below and can be triaged.

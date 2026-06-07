# Tiryaq — Application & Testing Documentation

User-facing reference for the Tiryaq web app (akwadona.com): frontend architecture, per-role user manuals, and the end-to-end test workflow.

---

## Table of contents

1. [What the app does](#1-what-the-app-does)
2. [How to sign in](#2-how-to-sign-in)
3. [Frontend architecture](#3-frontend-architecture)
4. [Role-by-role user manual](#4-role-by-role-user-manual)
5. [Offline mode](#5-offline-mode)
6. [End-to-end test workflow](#6-end-to-end-test-workflow)
7. [Frontend code-review register](#7-frontend-code-review-register)
8. [Troubleshooting](#8-troubleshooting)
9. [Glossary](#9-glossary)

---

## 1. What the app does

Tiryaq is a hospital management web app for the Qatar / GCC market. It runs four user roles:

- **Admin** — full control: patients, doctors, appointments, invoices, documents, admin panel, blood bank.
- **Developer** — same as admin + Voice Scribe; used by support staff.
- **Doctor** — own appointments + check-in + consultations + Voice Scribe + blood requests + documents.
- **Pharmacist** — pharmacy (medications, inventory, prescription queue, purchase orders) + blood bank inventory/donations/cross-match/issue.

Top-level modules: **Patients · Doctors · Appointments · Consultations · Voice Scribe · Pharmacy · Blood Bank · Documents · Invoices · Calendar · Admin panel · Dashboard**.

---

## 2. How to sign in

1. Visit `https://akwadona.com` (or `https://www.akwadona.com`).
2. You'll be redirected to the Cognito hosted login page.
3. Enter username (email) + password.
4. After login the app lands on the dashboard.
5. Session lives in `sessionStorage` (lasts until the tab closes). Tokens refresh automatically.

**Sign out** — click your avatar in the top right → **Sign Out**.

**Forgot your password** — click the link on the login page; Cognito sends a reset code.

---

## 3. Frontend architecture

Stack: **Angular 20** + **PrimeNG 20** + **Tailwind CSS** + **angular-auth-oidc-client v19**.

```
src/
├── app.config.ts            ← bootstrap: routing, interceptors, OIDC, service worker
├── app.routes.ts            ← all routes + role guards
├── app/
│   ├── components/          ← one folder per page (patients, appointments, ...)
│   ├── services/            ← typed HTTP wrappers (one per backend domain)
│   ├── guards/              ← authGuard, roleGuard
│   ├── interceptors/        ← authInterceptor (401 redirect), offline-queue
│   ├── layout/              ← topbar + side menu + tabs
│   └── shared/              ← form-constants (PHONE_MASK, GENDER_OPTIONS, ...)
```

**Key building blocks**

- **`appRoutes`** — every route is lazy-loaded and gated by `roleGuard([...])`.
- **`authGuard`** — runs `oidc.checkAuth()` once per app boot; subsequent navs read `sessionStorage.accessToken` directly. Saves `returnUrl` in `localStorage` so deep-links survive the Cognito round-trip.
- **`authInterceptor`** — catches 401 from same-origin **and** the API host; saves returnUrl, drops the stale token, calls `oidc.authorize()` once (a global flag prevents redirect storms).
- **`offlineQueueInterceptor`** — runs before `authInterceptor`. On every mutating call it stamps `X-Client-Request-Id`. When offline, the request is persisted to IndexedDB and a synthetic 202 is returned.
- **`OfflineService`** — replays the queue on `window.online`. Rewrites temp ids in URLs and bodies once the real id is known from a successful create.
- **Service Worker (`ngsw`)** — prefetches the app shell + lazy chunks + fonts. Caches API GET responses (`freshness` strategy, 3 s timeout, 1-day maxAge).
- **`HelpersService.notifyXxx`** — single source for toasts; deduplicates the offline-save toast.
- **`shared/form-constants.ts`** — `PHONE_MASK`, `QID_MASK`, `GENDER_OPTIONS`, `BLOOD_TYPE_OPTIONS`, `isValidPhone`, `isValidEmail`, `isValidQid`. Every form imports from here.

---

## 4. Role-by-role user manual

Each role section: what you see, what you can do, common tasks step-by-step.

### 4.1 Admin / Developer

**Side menu** — Dashboard · Calendar · Appointments · Invoices · Notifications · Patients · Doctors Management · Blood Bank · Documents · Administration.

**Add a patient**
1. Side menu → Patients Management → **New Patient**.
2. Fill name (≥3 chars), DOB, gender, phone (`+999 9999 9999`), QID (11 digits), insurance, blood group.
3. **Save** → patient row appears.

**Import many patients from Excel**
1. Side menu → Patients Management → **Download Template** (Excel template).
2. Fill rows in the template. Required: name, dob, gender, phone, qid.
3. Click **Import Patient(s)** → pick the file.
4. Loader shows "Reading & validating file…".
5. If any row is missing a required field, the **Import issues** dialog opens listing the bad rows. Choose **Import N valid only** or **Cancel**.

**Add a doctor**
- Same flow as patient. Extra fields: department, specialization, license, duty days (multi-select), duty hours.

**Create an appointment**
1. Side menu → Appointments → **New Appointment**.
2. Pick doctor + patient + date + start time + end time.
3. **Book**. Errors you may see:
   - "Doctor is not on duty on …" → date is outside the doctor's duty days.
   - "Doctor already has an appointment at …" → overlap.
   - "This patient already has an appointment at …" → patient overlap.
   - "The selected date/time has already passed."

**Browse 1 M+ appointments**
- The Appointments table is paginated server-side. Use the tabs **Upcoming / Past / All**, the search box (debounced 300 ms), column filters (status / priority / type are multi-select check-boxes), and the date-range filter.
- Footer shows "Showing 25 of 1,000,905 records" (total from the counter row).

**Manage users**
- Side menu → **Administration** → Users tab.
- Disable / enable a user; set a temporary password.

### 4.2 Doctor

**Side menu** — Dashboard · Calendar · Appointments · Invoices · Notifications · Patients · Voice Scribe · Blood Bank · Documents.

**See your day**
- Dashboard "Today's Appointments" card and the list below it.

**Check in a patient**
- On the appointment row in **Appointments**, click the green check-in icon.
- Status flips to `checked-in`.

**Start a consultation**
- Same row → click the play icon → consultation form opens.
- Fill SOAP sections (Subjective / Objective / Assessment / Plan).
- Add diagnoses (at least one with `type = primary`), prescriptions, lab orders, radiology orders.
- Each section auto-saves on blur.
- Click **Sign off**. The exam becomes read-only and the linked appointment is marked `completed`.

**Voice Scribe**
- Side menu → Voice Scribe → New session.
- Paste / dictate the transcript. Click **Generate SOAP** → Bedrock returns a SOAP draft.
- Edit, then **Approve** to save.

**Request blood**
- Side menu → Blood Bank → Requests → **New request**.
- Select patient, blood type, product type, units, urgency.
- Pharmacist takes it from here.

### 4.3 Pharmacist

**Side menu** — Dashboard · Calendar · Appointments · Invoices · Notifications · Pharmacy · Blood Bank.

**Add a medication**
- Side menu → Pharmacy → Medications tab → **New medication**.

**Dispense a prescription**
- Pharmacy → Prescription queue → click a row → enter quantity → upload doctor approval PDF (optional) → **Dispense**. Stock decrements.

**Manage blood inventory**
- Side menu → Blood Bank → Donors → **New donor** (needs at least phone OR Qatar ID).
- Green **+** on the donor row → Record donation → produces N `BB_UNIT` rows in inventory.

**Cross-match + issue**
- Blood Bank → Requests → open a request.
- Pick a unit → **Cross-match**. ABO/Rh check is automatic. Unit is reserved for 2 h.
- Multi-select compatible cross-matched units → **Issue**. Unit status flips to `issued`.

### 4.4 Developer (special role)

- Sees everything the admin sees **plus** Voice Scribe.
- Used by support staff during incidents.
- Lambdas treat `Developers` exactly like `Admin` for authorization.

---

## 5. Offline mode

### 5.1 What works offline

- App shell + cached pages still render.
- Cached GETs (patients, doctors, appointments lists) shown read-only.
- Mutations are queued in IndexedDB; a toast says **"Saved offline — will sync when connection is back."**
- Topbar shows a red **Offline** pill with a counter of pending items.

### 5.2 What happens on reconnect

- Toast: **"Synced N pending action(s)."**
- Pending count drops to 0.
- Refresh shows the rows the server created from the queued mutations.

### 5.3 Limitations

- File uploads (S3 PUT) need a live connection.
- Hard refresh (Ctrl+F5) bypasses the SW — expected browser behaviour.
- Conflict policy: last-write-wins at the row level.

---

## 6. End-to-end test workflow

One continuous walk-through. Follow top to bottom on a fresh login. Expected result in **bold**.

### 6.1 Prerequisites

- Four Cognito users seeded: `admin1`, `doctor1`, `pharmacist1`, `developer1`.
- DevTools open (F12), Application → Service Workers → uncheck "Update on reload".

### 6.2 Sign in & shell

1. Visit `https://akwadona.com`, log in as **admin1**.
2. **Expect** dashboard cards (Today's / Upcoming / Total / Pending / Revenue) populated; side menu shows all admin items.
3. New tab → paste `https://akwadona.com/appointments`.
4. **Expect** lands on Appointments after Cognito round-trip.

### 6.3 Reference data

1. Administration → Departments → add **Cardiology**, **Surgery**.
2. Specializations → add **General Surgery**, **Cardiology**.
3. Users tab → disable then enable `developer1`.
4. **Expect** toast after each.

### 6.4 Doctors

1. Doctors Management → **New Doctor** → fill, save.
2. **Import Doctor(s)** with a file containing one bad row → **Import issues** dialog opens listing the bad row → **Import N valid only**.
3. Edit a doctor → remove a duty day → save.
4. **Expect** doctor row updated.

### 6.5 Patients

1. Patients Management → **New Patient** → save.
2. Bulk import with a row missing gender → **Import issues** dialog → import only valid.
3. Open a patient profile → tabs render.

### 6.6 Appointments

1. New Appointment → doctor + patient + today 10:00–10:30 → Book.
2. New Appointment → same doctor + 10:15 (overlap) → **Expect** error "Doctor already has an appointment…".
3. New Appointment → same doctor + 11:00–11:30 → **Expect** OK (multi per day allowed).
4. New Appointment → same patient + different doctor at 10:10 → **Expect** patient-overlap error.
5. New Appointment outside duty days → **Expect** "Doctor is not on duty on …".
6. List shows soonest-first; column filters for status/priority/type are checkbox multi-select.
7. Edit a past or cancelled appointment → **Expect** edit/cancel icons hidden.
8. Doctor1 (log out / in) → sees only own appointments; can check-in + edit own.

### 6.7 Consultations

1. As doctor1, check-in a today appointment → Start consultation.
2. Fill SOAP, add 1 primary diagnosis + 1 prescription.
3. Sign off → **Expect** appointment becomes `completed`, exam becomes read-only.
4. Reload mid-edit → **Expect** consultation resumes, no duplicate row.

### 6.8 Voice Scribe (doctor1)

1. Voice Scribe → new session → paste transcript → Generate SOAP.
2. **Expect** SOAP draft.
3. Approve → session moves to approved.

### 6.9 Pharmacy (pharmacist1)

1. Medications → new med.
2. Inventory → adjust stock.
3. Prescription queue → process the one from §6.7 → dispense → upload PDF.
4. Purchase orders → draft → submitted → received.

### 6.10 Blood Bank

1. As pharmacist1 → Donors → new donor (phone OR QID).
2. Record donation (2 units) → **Expect** 2 `BB_UNIT` rows in Inventory; donor's count = 1.
3. As doctor1 → Blood Bank → new request (matching blood type).
4. As pharmacist1 → open request → Cross-match a unit → **Expect** unit reserved, request `crossmatched`.
5. Multi-select unit → Issue → **Expect** unit `issued`, request `issued`.

### 6.11 Documents

1. Documents → patients-documents → upload a small PDF.
2. Download it.
3. Delete it.
4. **Expect** all three work.

### 6.12 Calendar

1. Calendar → pick a doctor → see duty shifts + appointment events on **one** calendar (unified).
2. Click empty slot → create a manual event.
3. Drag to another day → **Expect** PATCH succeeds.

### 6.13 Notifications + Dashboard

1. Bell → recent notifications.
2. Dashboard cards show live counts (1,654,692 total appointments with the seed).

### 6.14 Backend idempotency (Phase D)

1. DevTools → Network → copy any POST as fetch → run it again in Console.
2. **Expect** identical response (cached idempotency).
3. DynamoDB → filter `EntityType = IDEMPOTENCY` → row with `expiresAt` ≈ now + 24h.

### 6.15 Offline (Phases A–F)

1. DevTools → Network → **Offline** → red Offline pill in topbar.
2. Create 2 appointments + 1 patient → each toasts "Saved offline".
3. Network → **Online** → toast "Synced N pending action(s)."
4. Refresh → rows are real with real ids.

### 6.16 Security / role enforcement

1. As doctor1, manually visit `/admin-panel` → **Expect** redirect to dashboard or 403.
2. As pharmacist1, manually visit `/doctors-management` → **Expect** blocked.
3. DevTools → Application → **sessionStorage** has tokens, **localStorage** only has `returnUrl` + `userData`.
4. Right-click side menu link → Open in new tab → **Expect** lands on the same page after sign-in.

### 6.17 Done

If every step passed, the system is healthy. If anything fails, capture: screenshot + URL + the failing request from DevTools → Network.

---

## 7. Frontend code-review register

Findings from the comprehensive review of June 2026.

### 7.1 Security

| # | Sev | Finding |
| --- | --- | --- |
| F-1 | 🟡 | Tokens correctly stored in `sessionStorage`; only `returnUrl` + `userData` in localStorage. ✅ no XSS surface increase. |
| F-2 | 🟡 | `auth.service.parseRole` returns the first matching group only. A doctor who is also in Admin gets the "admin" role label. Works in practice; the next refactor should use `isInGroup(group)` everywhere. |
| F-3 | 🟡 | The Service Worker caches API GETs (including patient lists) for 1 day. On a shared device, the next signed-in user briefly sees stale cached data when offline. Logout should clear `caches` and IndexedDB. |

### 7.2 Bugs

| # | Sev | Finding |
| --- | --- | --- |
| F-4 | 🟡 | `OfflineService.findRealIdInResponse` matches by id-key name list. New endpoints with custom id field names would silently break the temp-id rewrite. Convention: every create endpoint must echo an `id` field. |
| F-5 | 🟡 | The appointments cursor stack only supports forward/backward 1 page at a time. Jumping to page 100 in one click walks 100 forwards. Acceptable for now. |

### 7.3 Clean code / naming

- **Dead commented-out code** at the top of `new-patient.ts`, `edit-patient.ts` (~400 lines each) — earlier component versions left commented in. Delete on next touch.
- **`@HostBinding` on dashboard** uses 12-col Tailwind grid but the stat cards now use a nested 5-col grid. Mixed but readable.
- **Hard-coded config** (`Config.tiryaqUrl`, Cognito client id, distribution id) baked into source. Move to a runtime `assets/runtime-config.json` to support multi-env later.
- **`HelpersService.notifySuccess/notifyInfo/notifyError`** — three near-duplicate methods; only `notifySuccess` short-circuits via `wasOfflineEnqueueRecent`. Other two should too.

### 7.4 Style

- Five-card dashboard stat row uses a nested grid (xl:grid-cols-5) instead of trying to fit into the 12-col outer grid — cleaner result, but worth documenting so future authors don't refactor it back.
- All forms reference `@/shared/form-constants` — the only correct source for phone mask, gender list, etc. Don't redefine.

---

## 8. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Sign-in spinner for >30 s | First-of-the-day cold start of Cognito discovery + pre-token Lambda | Acceptable on first user of the day; the 5-min warmer keeps it warm during business hours. |
| Dashboard shows "100 of 50 records" | `COUNTER#APPOINTMENTS` is stale (bulk seed bypassed it) | Run `node scripts/sync-appointments-counter.js`. |
| Doctors page empty / 500 | Stale SW serving an old `/doctors` response | Clear site data (cache + service workers + IndexedDB; **keep** localStorage + sessionStorage). |
| Appointments toolbar shows an extra pager | Old SW bundle | Same as above + redeploy frontend. |
| "Doctor already has an appointment …" on first try | Genuine overlap with another row | Pick a different time. |
| "email already exists" on doctor create | Orphan EMAIL/QID/PHONE lock from a previous failed attempt | `node scripts/cleanup-doctor-locks.js`. |
| New tab opens akwadona.com root instead of the deep link | Cognito hosted UI strips deep links | Already handled — `authGuard` saves `returnUrl` in localStorage and the AppComponent fallback navigates to it after sign-in. |
| Login from `www.akwadona.com` fails with S3 `AccessDenied` | DNS for `www` was pointed at S3 not CloudFront | Now fixed — `www` CNAME to `d6i7iwknkj0bg.cloudfront.net`. |

---

## 9. Glossary

| Term | Meaning |
| --- | --- |
| SPA | Single-Page Application — the Angular front-end. |
| Service Worker (SW) | Browser background script that caches static assets + API responses, enables offline. |
| ngsw | Angular's Service Worker (`@angular/service-worker`) configured via `ngsw-config.json`. |
| IndexedDB | Browser-side database per origin. Holds the offline mutation queue + temp-id map. |
| Idempotency | Same action twice = same effect as once. Backed by an `X-Client-Request-Id` header + a server-side cache row. |
| Phase A–F | The offline-mode rollout phases: A=PWA shell, B=cache GETs, C=queue mutations, D=backend idempotency, E=offline pill, F=temp-id FK rewrite. |
| OIDC | OpenID Connect — the auth protocol Cognito speaks. |
| Cognito | AWS service that runs the sign-in page and issues JWTs. |
| JWT | JSON Web Token — proves who the user is. |
| `returnUrl` | The path the user was trying to reach before sign-in; saved in localStorage so deep-links survive. |
| Splash screen | The animated logo in `src/index.html` shown while the JS bundle loads. |
| Toast | The small notification that pops in the top-right (PrimeNG `MessageService`). |
| ABO/Rh | The standard blood compatibility check the blood bank module performs automatically. |
| SOAP note | Subjective / Objective / Assessment / Plan — clinical note structure. |
| PHI | Protected Health Information. |
| Last-write-wins | Conflict policy: whichever update reached the server last is kept. |
| Tab (Appointments) | The Upcoming / Past / All filter buttons in the appointments toolbar. |
| Multi-select column filter | The funnel icon on Type / Priority / Status columns opens a checkbox list of allowed values. |

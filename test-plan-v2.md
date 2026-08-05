# Akwadona Platform — Full Test Plan

**Document version:** 2.1
**Last updated:** 2026-05-13 (post-ScribeFirst, post-pharmacy-route-alignment, post-CORS-cleanup)

**Before starting:**

- Clean DynamoDB test data — delete all `PATIENT#`, `DOCTOR#`, `PAYMENT#`, `EXAM#`, `APPOINTMENT#`, `DISPENSE#`, `PO#`, `SCRIBE#` records.
- **Keep** `DEPARTMENT#`, `SPECIALIZATION#`, `COUNTER#`, `MED#` (and `INVENTORY` SKs), and all `AUDIT#YYYY-MM-DD` rows (PDPPL retention; do not delete audit history).
- After cleanup, reset counters manually: set `COUNTER#PATIENTS / TOTAL.total = 0` and `COUNTER#DOCTORS / TOTAL.total = 0`. The seed Lambda no longer auto-resets these on `cdk deploy`.
- Use Chrome or Edge (Voice Scribe needs the Web Speech API).

## 0. Auth flow (custom Angular login)

The Cognito Hosted UI is no longer used. The Akwadona Angular app serves its own `/login`, `/forgot-password`, and `/change-password` (first-login challenge) pages. All flows call Cognito over REST.

| # | Action | Expected |
|---|---|---|
| 0.1 | Open `tiryaq.akwadona.com` (or any tenant subdomain) | Lands on the Akwadona-branded login page. Language picker visible. Remember-me checkbox visible. NO redirect to `auth.akwadona.com`. |
| 0.2 | Sign in with valid credentials | `InitiateAuth` succeeds, JWTs stored in `sessionStorage` (plus `localStorage` if Remember-me ticked), routed to dashboard. |
| 0.3 | Sign in with wrong password | Inline error on the login form (localized). |
| 0.4 | Sign in as a fresh user (Status `FORCE_CHANGE_PASSWORD`) | In-app "Change Password" screen completes the `NEW_PASSWORD_REQUIRED` challenge, then dashboard. |
| 0.5 | Click "Forgot password?" → enter username | Email with 6-digit code from `noreply@akwadona.com` (DKIM-signed); enter code + new password → routed back to login. |
| 0.6 | Click avatar → Sign Out | Tokens cleared, routed to `/login`. |
| 0.7 | While signed-in, change language in topbar | UI re-renders in the chosen language (including the login page on next sign-out). |

---

## DB Record Count Rules

### Table: `Hospital`

| Record Type | Count Rule |
|-------------|------------|
| `DOCTOR#` | 1 per doctor created |
| `PATIENT#` | 1 per patient created |
| `PAYMENT#` | 1 per invoice created |
| `EXAM#` | 1 per consultation (signed or draft) |
| `APPOINTMENT#` | 1 per appointment (Hospital table only — no external copy) |
| `CALENDAR#<id>` / `PROFILE` | 1 per hospital calendar (e.g., one per doctor's duty calendar) |
| `CALENDAR#<id>` / `EVENT#<id>` | 1 per calendar event (duty shifts + manual events) |
| `MED#` / `PROFILE` | 1 per medication in catalog |
| `MED#` / `INVENTORY` | 1 per medication that has stock tracking |
| `DISPENSE#` | 1 per dispense event |
| `PO#` | 1 per purchase order |
| `SCRIBE#` / `SESSION` | 1 per voice-scribe session |
| `SCRIBE#` / `AUDIT#<iso>` | 1 per scribe approval (append-only) |
| `AUDIT#YYYY-MM-DD` / `AUDIT#<iso>#<uuid>` | 1 per audited action that day (append-only) |
| `QID#` | 1 per doctor + 1 per patient (unique QID lock) |
| `PHONE#` | 1 per doctor + 1 per patient (unique phone lock) |
| `EMAIL#` | 1 per doctor (if email lock exists) |
| `DOCTOR#<email>` / `PATIENT#<id>` | 1 per doctor-patient relationship (drives doctor-scoped patient list) |
| `COUNTER#DOCTORS / TOTAL` | Always exactly 1 record, value increments |
| `COUNTER#PATIENTS / TOTAL` | Always exactly 1 record, value increments |

> **Calendar migration note (2026-05-18):** Hospital calendar data now lives in the Hospital table (CALENDAR#/EVENT#). The previous external `CalendarPlatform` SaaS API has been retired for PDPPL data residency + clinical privacy. Old test plan revisions that referenced `TENANT#akwadona-hospital-001` PartiQL queries are no longer applicable.

---

## Step 1 — Login ✅

- Login as admin → dashboard loads

**Verify DB:** Nothing to check yet.

---

## Step 2 — Create Doctors ✅

- Created Omar Rashidi: duty days `mon, tue` — `10:15–11:15`
- Created Dr. Layla Hassan: duty days `mon, wed, fri` — `09:00–17:00`

**Verify DB — Table: `Hospital` (PartiQL):**
```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'DOCTOR#')
```
Expected: 2 records with `EntityType = 'DOCTOR'`

Also verify locks:
```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'QID#')
SELECT * FROM "Hospital" WHERE begins_with(PK, 'PHONE#')
```
Expected: 2 QID locks + 2 phone locks

---

## Step 3 — Hospital Calendar ✅

- Both doctor calendars auto-created
- Duty shifts generated from 1st of month
- Re-sync works: no 404, no duplicates

**Verify DB — Table: `Hospital` (PartiQL):**
```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'CALENDAR#') AND SK = 'PROFILE'
```
Expected: 2 records with `EntityType = 'CALENDAR'`, one per doctor name, `dataClass = 'PHI'`

```sql
SELECT * FROM "Hospital" WHERE PK = 'CALENDAR#<calendarId>' AND begins_with(SK, 'EVENT#')
```
Expected: duty shift events with `description = 'DUTY_SHIFT'`, `color = '#10B981'`, `EntityType = 'CALENDAR_EVENT'`

**Verify in DevTools Network tab:** calendar calls now hit `https://a2s6jk35d9.execute-api.us-east-1.amazonaws.com/calendars` (the Akwadona API) with an `Authorization: Bearer ...` header — NOT the old `od8gx8kld8…` endpoint with an `x-api-key` header.

---

## Step 4 — Create Patient ✅

- Patient created with required fields

**Verify DB — Table: `Hospital`:**
```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'PATIENT#')
```
Expected: 1 record with `EntityType = 'PATIENT'`, `timestamp` set, `updatedAt = null`

Also verify locks:
```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'QID#')
SELECT * FROM "Hospital" WHERE begins_with(PK, 'PHONE#')
```
Expected: now 3 QID locks + 3 phone locks (2 doctors + 1 patient)

---

## Step 5 — Create Appointment for Today

- Navigate to Appointments → New Appointment
- Select the doctor and patient you just created
- Set date to **today**, fill start/end time, type, status = `scheduled`
- Save

**Verify DB — Table: `Hospital`:**
```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'APPOINTMENT#') AND SK = 'PROFILE'
```
Expected: 1 record with today's date, correct `doctorEmail`, `patientId`, `status = 'scheduled'`, `EntityType = 'APPOINTMENT'`. Appointments live in the Hospital table only — no second copy anywhere.

**Also verify:** Dashboard → "Today's Appointments" shows this appointment

---

## Step 6 — Create Invoice

- Navigate to Invoices → New Invoice
- Select the patient from Step 4
- Add at least one item, set amount, status = `pending`
- Save

**Verify DB — Table: `Hospital`:**
```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'PAYMENT#')
```
Expected: 1 record with correct `patientId`, `status = 'pending'`, `invoiceNumber` auto-generated

**Also verify:** Dashboard → Invoice Summary shows 1 pending

---

## Step 7 — Notifications

- Click the bell icon in the topbar → today's appointment should appear
- Navigate to full Notifications page

**Verify:** No DB check needed — derived from live API queries. Confirm on screen:
- Today's appointment appears under "Today's Appointments"
- If any patient has status `critical` → appears under Critical Patients

---

## Step 8 — Patient Profile

- Navigate to Patients Management → click eye icon on the patient from Step 4

**Verify on screen:**
- Personal info tab shows correct data
- Appointments tab shows the appointment from Step 5
- Invoices tab shows the invoice from Step 6

**Verify DB — Table: `Hospital` (before edit):**
```sql
SELECT * FROM "Hospital"
WHERE PK = 'PATIENT#<patient-uuid>'
AND SK = 'PROFILE'
```
Expected: `timestamp` is set, `updatedAt = null`

Then edit the patient → change one field → save, then re-run:
```sql
SELECT * FROM "Hospital"
WHERE PK = 'PATIENT#<patient-uuid>'
AND SK = 'PROFILE'
```
Expected: `updatedAt` is now set, `timestamp` unchanged

---

## Step 9 — Dashboard

- Navigate to Dashboard

**Verify on screen:**
- Today's Appointments: 1
- Upcoming (7 Days): 0 (appointment is today, not future)
- Pending Invoices: 1
- Total Revenue: 0 (nothing paid yet)
- Quick Overview: 2 doctors, 1 patient, 1 appointment this month

**Verify DB — Table: `Hospital`:**
```sql
SELECT * FROM "Hospital"
WHERE PK = 'COUNTER#DOCTORS' AND SK = 'TOTAL'

SELECT * FROM "Hospital"
WHERE PK = 'COUNTER#PATIENTS' AND SK = 'TOTAL'
```
Expected: `total = 2` for doctors, `total = 1` for patients

---

## Step 10 — Doctor Role

- Log in as Omar Rashidi's Cognito account

**Verify menu shows:** Dashboard, Calendar, Appointments, Invoices, Notifications, Patients, Voice Scribe *(no Doctors Management, no Pharmacy, no Admin)*

**Verify per module:**
- Dashboard shows only Omar's appointments and invoices
- Calendar shows only Omar's calendar — no dropdown, no Re-sync button
- Appointments list filtered to Omar only
- Invoices list filtered to Omar only
- Patients list shows only Omar's patients (scoped via `DOCTOR#<email>` relationship rows)

**Verify in Network tab:** API calls for appointments and invoices include `?doctorEmail=<omar's email>` query param

**Verify DB — Table: `Hospital`:**
```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'APPOINTMENT#')
```
Filter results by `doctorEmail` field to confirm only Omar's appointment is the one the UI showed him. (Doctor-scoping is enforced by the Lambda — admins/devs see all rows when querying the table directly.)

---

## Step 11 — Soft Delete + Restore (admin-gated)

- Log back in as admin
- Patients Management → soft-delete the patient from Step 4
- Verify the patient now shows under "Deleted" filter only

**Verify DB — Table: `Hospital`:**
```sql
SELECT * FROM "Hospital"
WHERE PK = 'PATIENT#<patient-uuid>' AND SK = 'PROFILE'
```
Expected: `deletedAt` is now an ISO timestamp string (not null/empty)

Also verify counter decremented:
```sql
SELECT * FROM "Hospital"
WHERE PK = 'COUNTER#PATIENTS' AND SK = 'TOTAL'
```
Expected: `total` decreased by 1

### 11a — Restore as admin ✅ allowed

- Click Restore on the soft-deleted patient
- Expected: success toast, patient returns to active list

```sql
SELECT * FROM "Hospital"
WHERE PK = 'PATIENT#<patient-uuid>' AND SK = 'PROFILE'
```
Expected: `deletedAt` attribute is removed entirely, counter back to original value

### 11b — Restore as doctor ❌ denied

- Soft-delete the patient again as admin (so a restore action exists)
- Log in as Omar (Doctor role)
- DevTools → Network → manually issue `PATCH /patients/{id}/restore` against the API (e.g., via Console fetch using the JWT in sessionStorage), OR have the UI surface a Restore button if exposed
- Expected: **HTTP 403** with body `{"message":"Access denied: restoring a deleted patient is admin-only"}`
- Patient stays soft-deleted

---

## Step 12 — Pharmacy Module

> Pharmacist test users: `pharmacist1`, `pharmacist2`. Routes deployed via CDK now match the Lambda router (`/pharmacy/medications`, `/pharmacy/dispense`, `/pharmacy/inventory/{medId}`).

### 12a — Catalog (Admin)

- Log in as admin → Pharmacy → Catalog
- Add a medication (Brand: `Amoxicillin`, Generic: `Amoxicillin`, Category: `Antibiotic`, Form: `Capsule`, Strength: `500mg`, Reorder point: `10`)
- Verify the row appears in the list

**Verify DB — Table: `Hospital`:**
```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'MED#') AND SK = 'PROFILE'
```
Expected: 1 record with `EntityType = 'MEDICATION'`, `requiresPrescription` set, `reorderPoint = 10`

### 12b — Inventory

- Add stock for the new medication (qty: `50`, batch: `B001`, expiry: 1 year out)

```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'MED#') AND SK = 'INVENTORY'
```
Expected: 1 inventory record with `stockQty = 50`, batch + expiry set

### 12c — Prescriptions + Dispense

- As a doctor, create a consultation for the patient from Step 4
- Inside the consultation, add a prescription line linking the medication from 12a
- Sign off the consultation
- Log in as `pharmacist1`
- Pharmacy → Prescriptions (status=ordered) → the prescription appears
- Open it → Dispense (qty: `30`) → confirm

```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'DISPENSE#') AND SK = 'PROFILE'
```
Expected: 1 dispense record with `quantityDispensed = 30`, actor = pharmacist1's email

```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'MED#') AND SK = 'INVENTORY'
```
Expected: `stockQty = 20`, `adjustments` array contains a `dispensed` entry with `delta = -30`

### 12d — Allergy guardrail

- Edit the patient (Step 4) → add `Amoxicillin` to allergies → save
- Try to dispense Amoxicillin again
- Expected: warning surfaces; dispense allowed only if `allergyOverrideConfirmed = true` is passed

### 12e — Alerts

- Lower the inventory below the reorder point (or set a near expiry on a batch)
- Pharmacy → Alerts
- Expected: alert row appears with severity `critical` (expired) or `warning` (low stock / expiring soon)

### 12f — Purchase Orders

- Pharmacy → Purchase Orders → New PO → add the medication → submit

```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'PO#') AND SK = 'PROFILE'
```
Expected: 1 PO record with `status = 'draft'` or `'submitted'`

Receive the PO. Expected: inventory `stockQty` increases by received quantity; `adjustments` gains a `received` entry.

---

## Step 13 — Consultation / Examination

- Log in as Omar (Doctor)
- Open the patient → click "New Consultation"
- Fill: Chief complaint, vital signs (BP, HR, temp), physical exam notes, diagnosis (ICD-10 lookup), plan
- Add a prescription line (for Step 12c)
- Click "Save & Sign-off"

**Verify DB — Table: `Hospital`:**
```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'EXAM#') AND SK = 'PROFILE'
```
Expected: 1 record with `EntityType = 'EXAMINATION'`, `patientId`, `doctorEmail = omar`, `signedOff = true`

**Verify audit row:**
```sql
SELECT * FROM "Hospital" WHERE PK = 'AUDIT#<today>' AND begins_with(SK, 'AUDIT#')
```
Expected: at least one row with `entityType = 'EXAMINATION'`, `action = 'CREATE'` or `'SIGNOFF'`

---

## Step 14 — Voice Scribe (ScribeFirst Phase 1)

> Browser: must be Chrome or Edge (Web Speech API).

- Log in as Omar → Voice Scribe
- Tick the consent checkbox → "Start Session" → expect toast "Session ready"
- Click Start Recording → allow mic permission
- Speak ~3 sentences: subjective + objective + plan
- Click Stop Recording → "Generate SOAP"
- Wait for Bedrock response (~3–8 sec)
- Expected: SOAP fields auto-fill (Subjective, Objective, Assessment, Plan)
- Edit if needed → click Approve

**Verify DB — Table: `Hospital`:**
```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'SCRIBE#') AND SK = 'SESSION'
```
Expected: 1 session row with `status = 'APPROVED'`, `dataClass = 'PHI'`, `transcriptSha256` set, `finalSoap` populated

```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'SCRIBE#') AND begins_with(SK, 'AUDIT#')
```
Expected: 1 audit row with `action = 'SCRIBE_APPROVED'`, `dataClass = 'AUDIT'`

### 14a — Authorization gate

- Log in as `pharmacist1` → try to navigate to `/voice-scribe`
- Expected: redirected to `/notfound` (role guard)
- Try direct API call `POST /scribe/sessions` with pharmacist's JWT
- Expected: **HTTP 403** "only doctors and admins can use the scribe"

---

## Step 15 — Documents Module

- Log in as admin → Documents
- Open folder `patients-documents` → Upload a small PDF
- Verify upload completes, file appears in the list

**Verify in S3 Console:**
- Bucket: `akwadona-documents` → `patients-documents/` → uploaded file is present

- Click Download → file opens correctly
- Click Delete → file disappears from list and from S3

### 15a — Folder allow-list

- DevTools → manually request a pre-signed URL for folder `random-folder` (POST `/documents/upload-url` with body `{"folder":"random-folder","fileName":"x.pdf","contentType":"application/pdf"}`)
- Expected: **HTTP 400** "Invalid folder"

---

## Step 16 — Admin Panel

- Log in as admin → Administration
- **Stats tab:** verify counts (Patients, Doctors, Exams, Invoices) match what the DB has
- **Users tab:** verify all Cognito users listed with their group, status, last sign-in
  - Disable a test pharmacist user → log out → try to sign in as that user → expect failure
  - Re-enable → sign in works
  - Set password → log in with the temp password → forced to change on first login
- **Audit tab:** verify recent actions appear (the disable/enable above should show up)

**Verify DB — Table: `Hospital`:**
```sql
SELECT * FROM "Hospital" WHERE PK = 'AUDIT#<today>' AND begins_with(SK, 'AUDIT#')
```
Expected: rows with the actor email matching the admin who performed the change

### 16a — Authorization gate

- Log in as Omar (Doctor) → try `GET /admin/stats` via DevTools fetch with his JWT
- Expected: **HTTP 403** "Access denied: admin only"

---

## Step 17 — CORS regression (post-deploy verification)

> Verifies the wildcard-CORS cleanup on the 5 Lambdas didn't break anything for the legit origins, and that disallowed origins are now blocked.

### 17a — Legitimate origin still works

- Open DevTools → Network tab
- Hit each of these from `https://www.akwadona.com`:
  - `GET /pharmacy/alerts` (akwadona-pharmacy)
  - `GET /examinations` (akwadona-examinations)
  - `GET /appointments` (akwadona-appointments)
  - `GET /admin/audit` (akwadona-admin-panel)
  - `GET /documents/folders` (akwadona-document-manager)
- All 5 should return 200 with no CORS error in console
- Response headers should include `Access-Control-Allow-Origin: https://www.akwadona.com` (added by API Gateway, not the Lambda)

### 17b — Disallowed origin is blocked

- In a separate browser tab, run from DevTools console (anywhere outside the allow-list):

```js
fetch('https://a2s6jk35d9.execute-api.us-east-1.amazonaws.com/pharmacy/alerts', {
  method: 'OPTIONS',
  headers: { 'Origin': 'https://evil.example', 'Access-Control-Request-Method': 'GET' }
}).then(r => console.log('status', r.status, 'allow-origin', r.headers.get('access-control-allow-origin')));
```

- Expected: response has **no** `Access-Control-Allow-Origin` header (or it omits `evil.example`). Browser would reject this cross-origin request from a real page.

### 17c — Pharmacy route alignment (CDK ↔ Lambda)

- Confirm in DevTools that pharmacy module loads with NO 404s
- All these should return 200: `/pharmacy/medications`, `/pharmacy/inventory`, `/pharmacy/dispense`, `/pharmacy/prescriptions`, `/pharmacy/purchase-orders`, `/pharmacy/alerts`

---

## Step 18 — Compliance regression check (MFA + WAF)

> Both are intentionally OFF in dev (see `docs/compliance/updates/2026-05-02-regression-01-waf-and-mfa-disabled.md`). This step is here so the test plan documents that the regression is the **expected** state.

- Sign in: should NOT prompt for MFA enrolment or TOTP code
- Visit any path in the app → response headers should NOT include `x-amzn-waf-` blocking signals
- Confirm this matches the documented regression

---

## Step 19 — Final teardown (optional)

- Hard-delete test data via Admin Panel → Doctors / Patients → Hard Delete All

```sql
SELECT COUNT(*) FROM "Hospital" WHERE begins_with(PK, 'PATIENT#')
SELECT COUNT(*) FROM "Hospital" WHERE begins_with(PK, 'DOCTOR#')
SELECT COUNT(*) FROM "Hospital" WHERE begins_with(PK, 'QID#')
SELECT COUNT(*) FROM "Hospital" WHERE begins_with(PK, 'PHONE#')
SELECT COUNT(*) FROM "Hospital" WHERE begins_with(PK, 'EMAIL#')
```
Expected: all return 0. Counter rows remain (decremented to 0).

# Lambda Functions — Technical + Business Documentation

One section per Lambda. Each section answers the same four questions:

- **Business purpose** — what the user feature is.
- **Routes / triggers** — how it is called.
- **What it does** — step-by-step.
- **Side effects** — anything else that happens (counters, audit, calendar, etc.).

Read **§Glossary** at the bottom for any abbreviation or AWS / domain term you don't recognise.

---

## 1. Patient management

### 1.1 `createPatient`

**Business purpose**

- Lets an admin add a new patient to the hospital, one at a time or many at once (bulk import from Excel).

**Routes**

- `POST /patients` — single patient.
- `POST /patients` with `{ "patients": [...] }` — bulk import.

**What it does**

- Rejects the call if the caller is not in the `Admin` or `Developers` group.
- Validates required fields: `name`, `dob`, `gender`, `phone`, `qid`.
- Refuses the create if another patient already has the same QID or phone number (uniqueness locks).
- Writes the patient row + a QID lock + a phone lock as one DynamoDB transaction so partial failure is impossible.
- Bumps the `COUNTER#PATIENTS` row so dashboards know the live total.

**Side effects**

- Returns the same response for replays of the same request (Phase D idempotency).

---

### 1.2 `updatePatient`

**Business purpose**

- Lets an admin edit a patient's profile or restore a previously soft-deleted patient.

**Routes**

- `PATCH /patients/{patientID}` — normal edit.
- `PATCH /patients/{patientID}/restore` — restore a soft-deleted patient.

**What it does**

- Both routes require `Admin` or `Developers`.
- Edit: writes only the allowed fields (PK / SK / EntityType are protected).
- Restore: removes `deletedAt` and bumps `COUNTER#PATIENTS` back up.

**Side effects**

- Stores the response in the idempotency cache for 24 h.

---

### 1.3 `deletePatient`

**Business purpose**

- Soft-deletes a patient (marks them as deleted; never actually removes data).

**Routes**

- `DELETE /patients/{patientID}`.

**What it does**

- Requires `Admin` or `Developers`.
- Sets `deletedAt = now` only if the patient is not already deleted.
- Decrements `COUNTER#PATIENTS` in the same transaction so the dashboard count stays correct.

---

### 1.4 `getAllPatients`

**Business purpose**

- Lists patients with sorting, filtering, paging, search.

**Routes**

- `GET /patients` with optional `pageSize`, `lastKey`, `sortField`, `sortOrder`, `search`, `name`, `gender`, `insurance`, `status`, `dobFrom`, `dobTo`, `showDeleted`.

**What it does**

- Returns one page of patient rows, plus a `lastKey` cursor for the next page.
- Total count comes from the maintained `COUNTER#PATIENTS` row (fast). Filtered counts fall back to a Scan with Select=COUNT.

---

### 1.5 `getPatientByID`

**Business purpose**

- Fetch one patient by ID.

**Routes**

- `GET /patients/{patientID}`.

**What it does**

- Single DynamoDB `GetItem` on `PATIENT#<id>` / `PROFILE`.
- Returns 404 if missing or soft-deleted.

---

### 1.6 `getPatientsDataByFilters`

**Business purpose**

- Bulk-fetch a subset of patient rows for reporting screens.

**Routes**

- `POST /patients/filter` — payload contains the filter set.

**What it does**

- Scans the patient partition with the user-supplied filters.
- Designed for backend tools, not the patient list page.

---

## 2. Doctor management

### 2.1 `createDoctor`

**Business purpose**

- Adds a new doctor.

**Routes**

- `POST /doctors` (single or bulk like patients).

**What it does**

- Admin / Developer only.
- Validates required fields and writes the doctor row + email lock.
- Bumps `COUNTER#DOCTORS`.

---

### 2.2 `updateDoctor`

**Business purpose**

- Edits a doctor's profile.

**Routes**

- `PATCH /doctors/{doctorID}`.

**What it does**

- Admin / Developer only.
- Writes allowed fields, refreshes `updatedAt` and `updatedBy`.

---

### 2.3 `deleteDoctor`

**Business purpose**

- Soft-deletes a doctor.

**Routes**

- `DELETE /doctors/{doctorID}`.

**What it does**

- Admin / Developer only.
- Sets `deletedAt = now`.
- Decrements `COUNTER#DOCTORS`.

---

### 2.4 `getAllDoctors`

**Business purpose**

- Lists doctors with filters, search, paging — used by appointments, calendar, admin panel.

**Routes**

- `GET /doctors`.

**What it does**

- Queries the `EntityType-index` GSI (fast at 1 M+ rows; the previous Scan version timed out).
- Returns the page + a stable `lastKey`.
- Total count comes from `COUNTER#DOCTORS` (counter row maintained by create/delete).

---

### 2.5 `getDoctorByID`

**Business purpose**

- Fetch one doctor by ID.

**Routes**

- `GET /doctors/{doctorID}`.

**What it does**

- `GetItem` on `DOCTOR#<id>` / `PROFILE`.

---

### 2.6 `getDoctorByEmail`

**Business purpose**

- Look up the doctor record for the currently signed-in doctor user.

**Routes**

- `GET /doctors/by-email/{email}`.

**What it does**

- Queries the `email-index` GSI.

---

## 3. Appointments

### 3.1 `tiryaq-appointments`

**Business purpose**

- The whole appointment lifecycle — create, list, edit, cancel, delete.

**Routes**

- `POST   /appointments`
- `GET    /appointments` (paginated with filters)
- `GET    /appointments/{apptId}`
- `PATCH  /appointments/{apptId}`
- `DELETE /appointments/{apptId}`

**What it does**

- Create:
  - Admin / Developer only.
  - Rejects bookings outside the doctor's duty days.
  - Rejects bookings whose end time has already passed.
  - Rejects overlapping appointments for the same doctor (multiple per day allowed, just no overlap).
  - Writes the appointment row and a calendar event on the doctor's calendar.
  - Bumps `COUNTER#APPOINTMENTS`.
- List (paginated):
  - Tabs `upcoming` / `past` / `all`; filters by `dateFrom/dateTo`, `status` (multi), `priority` (multi), `visitType` (multi), `doctorId`, `patientId`, free-text `q`.
  - Returns 25 rows per page (max 100) with an opaque `nextToken` cursor and total record count.
- Patch:
  - Admin / Developer can edit any.
  - Doctor can edit/cancel only their own future appointments.
  - Blocks edits that introduce a time conflict for the doctor.
- Delete:
  - Admin only; decrements the counter.

**Side effects**

- Writes an audit row for every create / update / delete.
- Stores the response in the idempotency cache for 24 h.

---

## 4. Examinations (consultations)

### 4.1 `tiryaq-examinations`

**Business purpose**

- The doctor's consultation form — SOAP sections, diagnosis, prescriptions, lab orders, sign-off.

**Routes**

- `POST   /examinations` — start a new exam.
- `PATCH  /examinations/{examId}/sections` — save one section.
- `POST   /examinations/{examId}/signoff` — finalise.
- `DELETE /examinations/{examId}` — discard a draft.

**What it does**

- Only `Doctors`, `Admin`, or `Developers` may use this Lambda.
- A doctor can only write into an exam where `doctorEmail` matches their own email.
- Sign-off requires at least one primary diagnosis and a chief complaint.
- When the exam is signed off, the linked appointment is automatically marked `completed` (and `checkedOutAt` is stamped).

**Side effects**

- Phase D idempotency.
- Updates the linked appointment row on sign-off.

---

## 5. Pharmacy

### 5.1 `tiryaq-pharmacy`

**Business purpose**

- The full pharmacy workspace — medications, inventory, prescription queue, dispense, purchase orders, alerts.

**Routes**

- `GET/POST/PATCH/DELETE /pharmacy/medications`
- `GET/PATCH /pharmacy/inventory/{medId}`
- `GET /pharmacy/prescriptions` (queue) / `POST /pharmacy/dispense`
- `GET/POST/PATCH /pharmacy/purchase-orders`
- `GET /pharmacy/alerts` — low-stock and near-expiry warnings.

**What it does**

- Pharmacist / Admin / Developer only.
- Tracks stock-on-hand and reserved quantity.
- Dispensing decrements stock and writes a `DISPENSE` history row; an attached document URL captures the doctor approval if uploaded.
- Purchase orders walk `draft → submitted → ordered → partially_received → received`.

**Side effects**

- Phase D idempotency.
- Counter rows for medications + low-stock alerts.

---

## 6. Blood Bank

### 6.1 `tiryaq-bloodbank`

**Business purpose**

- Donor registry, donation log, blood-unit inventory, transfusion requests with cross-match and issue.

**Routes**

- Donors:        `/bloodbank/donors`        (GET/POST), `/bloodbank/donors/{donorId}` (GET/PATCH/DELETE).
- Donations:     `/bloodbank/donations`     (GET), `/bloodbank/donors/{donorId}/donations` (GET/POST).
- Units:         `/bloodbank/units`         (GET/PATCH/DELETE).
- Stock summary: `/bloodbank/stock`.
- Requests:      `/bloodbank/requests`, `/bloodbank/requests/{requestId}` (GET/PATCH/DELETE).
- Cross-match:   `POST /bloodbank/requests/{requestId}/crossmatch`.
- Issue:         `POST /bloodbank/requests/{requestId}/issue`.

**What it does**

- Doctor → can create blood requests for a patient.
- Pharmacist → manages donors, donations, inventory, runs cross-match, issues units.
- Cross-match step checks ABO/Rh compatibility automatically and reserves the unit for two hours.
- Issue step requires every unit in the issue list to have a compatible cross-match on file.

**Side effects**

- Donation creates the donation row + N `BB_UNIT` rows (one per unit produced).
- Cancelling a request frees any units it had reserved.
- Phase D idempotency on every mutation.

---

## 7. Calendar

### 7.1 `tiryaq-calendar`

**Business purpose**

- The hospital calendar — doctor duty shifts and appointment events on one calendar per doctor.

**Routes**

- `GET/POST /calendars`
- `DELETE /calendars/{calendarId}` (cascades event delete)
- `GET/POST /calendars/{calendarId}/events`
- `PATCH/DELETE /calendars/{calendarId}/events/{eventId}`

**What it does**

- Reads open to any signed-in user.
- Writes restricted to Admin / Doctors / Developers.
- Appointment events are written by the appointments Lambda, not directly by users.

---

## 8. Documents

### 8.1 `tiryaq-document-manager`

**Business purpose**

- Secure document upload / download via S3 presigned URLs.

**Routes**

- `POST /documents/upload-url`   — get a presigned PUT URL.
- `POST /documents/download-url` — get a presigned GET URL.
- `GET  /documents/list`         — list files in a folder.
- `GET  /documents/folders`      — list folders the caller can access.
- `DELETE /documents/delete`     — delete a file.

**What it does**

- Caller must be in a group allowed for that folder (e.g. only `Doctors`, `Admin` for `doctors-documents`).
- For non-admin, file keys must start with the caller's own Cognito sub — you can't see another user's files.

**Side effects**

- All uploads land in `tiryaq-documents-<acct>-<region>` (KMS-encrypted).
- Phase D idempotency on upload-url + delete.

---

## 9. Admin panel

### 9.1 `tiryaq-admin-panel`

**Business purpose**

- The admin user-management screen.

**Routes**

- `GET   /admin/stats`                        — totals for the dashboard.
- `GET   /admin/users`                        — list Cognito users with groups.
- `POST  /admin/users/{username}/disable`     — disable a user.
- `POST  /admin/users/{username}/enable`      — enable a user.
- `POST  /admin/users/{username}/set-password`— reset a password.
- `GET   /admin/audit`                        — query the audit log by date / entity / actor.

**What it does**

- Admin or Developer only.
- Wraps `AdminDisableUser`, `AdminEnableUser`, `AdminSetUserPassword` from the Cognito SDK.
- The audit query reads the `AUDIT#YYYY-MM-DD` partition of the same DynamoDB table.

---

## 10. Voice Scribe (SOAP from voice)

### 10.1 `tiryaq-scribe`

**Business purpose**

- Lets the doctor dictate a consultation; an LLM splits the transcript into S/O/A/P sections.

**Routes**

- `POST /scribe/sessions`
- `GET  /scribe/sessions/{id}`
- `POST /scribe/sessions/{id}/soap`
- `POST /scribe/sessions/{id}/approve`

**What it does**

- Doctor or Admin only.
- Calls Bedrock (Claude Haiku) to convert the transcript into SOAP JSON.
- Stores the session + transcript + SOAP output in DynamoDB.

---

## 11. Audit

### 11.1 `tiryaq-audit`

**Business purpose**

- Read the audit log for compliance / forensic queries.

**Routes**

- `GET /audit?date=…&entityType=…&entityId=…&action=…&actor=…`.

**What it does**

- Queries `AUDIT#YYYY-MM-DD` partition by date and an optional filter set.

---

## 12. Reference data (departments, specializations)

### 12.1 `createNewDepartment` / `bulkCreateDepartments` / `deleteAllDepartments`

**Business purpose**

- Manages the department catalogue shown in dropdowns.

**Routes**

- `POST /departments` (single) — `createNewDepartment`.
- `POST /departments/bulk`     — `bulkCreateDepartments`.
- `DELETE /departments`        — `deleteAllDepartments` (wipes the catalogue, admin only).

**What it does**

- Admin / Developer only.
- Single insert + idempotency cache.
- Bulk uses DynamoDB `BatchWriteItem` in chunks of 25 with retry for unprocessed items.

### 12.2 `createNewSpecialization` / `bulkCreateSpecializations` / `deleteAllSpecializations`

- Same shape as departments but for the specialization catalogue.

### 12.3 `getAllDepartments` / `getAllSpecializations`

**Business purpose**

- Read the catalogues — used by the new-doctor and new-appointment forms.

**Routes**

- `GET /departments`, `GET /specializations`.

**What it does**

- Reads all rows of that EntityType via the `EntityType-index` GSI.

---

## 13. Patient payments / invoices

### 13.1 `createPatientPayment`

**Business purpose**

- Create an invoice for a patient (after a consultation or surgery).

**Routes**

- `POST /patients/{patientID}/payments`.

**What it does**

- Writes a PAYMENT row tied to the patient + audit actor.
- Idempotency: replays return the same response.

### 13.2 `updatePatientPayment`

**Business purpose**

- Edit an existing invoice (status, notes, amount).

**Routes**

- `PATCH /patients/{patientID}/payments/{paymentID}`.

**What it does**

- Allows only safe fields to change (PK / SK / EntityType protected).
- 404 if the invoice doesn't exist.

### 13.3 `deletePayment`

**Business purpose**

- Soft-delete an invoice.

**Routes**

- `DELETE /patients/{patientID}/payments/{paymentID}`.

**What it does**

- Sets `deletedAt = now`.

### 13.4 `getPaymentByID` / `getAllPaymentsForPatient` / `listAllPaymentsForPatientByID`

**Business purpose**

- Fetch invoices — one by ID, or all for a given patient.

**Routes**

- `GET /payments/{paymentID}`
- `GET /patients/{patientID}/payments`
- `GET /patients/{patientID}/payments/list` (paginated)

**What it does**

- Single get or paginated list under the patient's partition.

### 13.5 `getAllInvoices`

**Business purpose**

- Admin invoice list across all patients.

**Routes**

- `GET /invoices`.

**What it does**

- Admin: queries `EntityType-index` for `EntityType = 'PAYMENT'`, returns a page + cursor.
- Doctor: forced to `doctorEmail = self`, scoped via `doctorEmail-createdAt-index`.
- Replaces an older Scan-based version that timed out on large tables.

---

## 14. Surgeries

### 14.1 `createPatientSurgery` / `getSurgeryByID` / `listAllSurgeriesForPatientByID`

**Business purpose**

- Records a surgery performed on a patient.

**Routes**

- `POST /patients/{patientID}/surgeries`
- `GET  /surgeries/{surgeryID}`
- `GET  /patients/{patientID}/surgeries`

**What it does**

- Create currently a placeholder Lambda (TODO marker in the code).
- List + get are standard DynamoDB reads.

---

## 15. Cognito hooks

### 15.1 `cognito-pre-token-generation`

**Business purpose**

- Adds extra claims (`email`, `name`) to the access token before Cognito issues it, so the frontend doesn't need a second call to learn who the user is.

**Trigger**

- Invoked by Cognito User Pool on every sign-in.

**What it does**

- Returns one tiny event object; finishes in ~5 ms once warm.
- Short-circuits on the warmer ping (`_warmup` flag) so the EventBridge keep-alive ping is free.

---

## Cross-cutting features

These apply to every mutating Lambda in the table above:

- **Idempotency (Phase D)** — every POST/PATCH/DELETE reads `X-Client-Request-Id` from the request header. If we've seen that id before, we return the cached response (stored in DynamoDB under `IDEMP#<cid>` with a 24 h TTL). Lets the offline queue replay safely.
- **Audit log** — sensitive Lambdas (appointments, examinations, pharmacy, blood bank) write an `AUDIT#YYYY-MM-DD` row per change. Read via `tiryaq-audit`.
- **Counters** — patient, doctor, appointments counts are maintained atomically so the dashboard total is constant-time to read.
- **Warmer** — an EventBridge rule pings the auth-critical Lambdas every 5 minutes with `{ _warmup: true }`; they short-circuit immediately, keeping a warm execution environment around so real user calls don't pay cold-start latency.

---

## Glossary

| Term | Meaning |
| --- | --- |
| **Lambda** | A small server-less program on AWS. Runs only when called, scales automatically, no servers to manage. |
| **DynamoDB** | AWS's key-value database. Reads and writes are sub-10 ms when designed with the right keys. |
| **PK / SK** | Partition key / sort key — the two halves of a DynamoDB primary key. Together they uniquely identify a row. |
| **GSI** | Global Secondary Index — a second access path on a DynamoDB table (e.g. `EntityType-index`). Lets us query the table by a different attribute. |
| **EntityType-index** | The GSI keyed on the `EntityType` field. Used everywhere we want "give me all rows of a given type". |
| **doctorEmail-createdAt-index** | GSI used to fetch a doctor's own appointments / invoices quickly. |
| **API Gateway HTTP API** | The public URL surface. Receives HTTPS calls and forwards them to the right Lambda. |
| **JWT** | JSON Web Token — the signed string that proves who the caller is. Issued by Cognito. |
| **Cognito** | AWS's user authentication service. Hosts the sign-in page and issues JWTs. |
| **Cognito groups** | Logical buckets users belong to. We use `Admin`, `Developers`, `Doctors`, `Pharmacists`. |
| **OIDC** | OpenID Connect — the auth protocol Cognito speaks. |
| **CORS** | Cross-Origin Resource Sharing — browser security check. API Gateway adds CORS headers so the frontend can call it. |
| **CMK / KMS** | Customer Master Key / Key Management Service — AWS's encryption keys. The Hospital table + S3 buckets are encrypted at rest with our own CMK. |
| **TTL** | Time-to-live — DynamoDB auto-deletes rows whose `expiresAt` epoch time has passed. Used by the idempotency cache. |
| **Idempotency** | A property where running the same action twice has the same effect as running it once. We use a 24 h `IDEMP#<cid>` cache to enforce it. |
| **CID / `X-Client-Request-Id`** | UUID the frontend generates per mutation. Sent on every mutating call so the backend can dedupe replays. |
| **Phase D** | The label for the backend-idempotency rollout in this codebase. |
| **PHI** | Protected Health Information — clinical data (consultations, prescriptions, etc.). All such rows have `dataClass = PHI`. |
| **Audit log** | A separate table partition (`AUDIT#YYYY-MM-DD`) where every mutation is recorded with actor, before/after, IP. |
| **Soft delete** | Setting a `deletedAt` timestamp instead of actually removing the row. Required by compliance — we never lose data. |
| **Counter row** | A DynamoDB row like `COUNTER#PATIENTS / TOTAL` whose `total` attribute is incremented/decremented on create/delete so dashboards can read counts in O(1). |
| **Idempotency cache row** | A DynamoDB row with PK `IDEMP#<cid>` storing the cached response. Auto-deleted after 24 h. |
| **Cold start** | First invocation of a Lambda after a quiet period — extra delay (~1–2 s) while AWS spins up an execution environment. Mitigated by the warmer ping. |
| **Warmer** | The EventBridge schedule that pings critical Lambdas every 5 min so they stay warm. |
| **EventBridge** | AWS's scheduled-event service — we use it to fire the warmer pings. |
| **Bedrock** | AWS's managed LLM service. The scribe Lambda uses Claude Haiku via Bedrock to split a transcript into SOAP. |
| **SOAP** | Subjective, Objective, Assessment, Plan — the standard four-part structure of a clinical note. |
| **QID** | Qatar ID — 11-digit national identity number. Required for patients. |
| **Presigned URL** | A short-lived URL signed by AWS that lets a browser PUT/GET an S3 object directly without going through our backend. |
| **S3** | AWS object storage. Frontend static files + uploaded documents live here. |
| **OAC** | Origin Access Control — CloudFront's way of authenticating itself to a private S3 bucket. |
| **CloudFront** | AWS's CDN. Serves the SPA bundle from edge locations near the user. |
| **SPA** | Single-Page Application — the Angular front-end. |
| **CDK** | Cloud Development Kit — the TypeScript infrastructure-as-code we deploy with. |
| **OPTIONS preflight** | The HTTP request a browser sends before a non-GET cross-origin request to ask the server if it's allowed. API Gateway answers automatically. |
| **BatchWriteItem** | DynamoDB API that writes up to 25 rows per request. Used by bulk imports + the seed scripts. |
| **TransactWriteItems** | DynamoDB API that writes multiple rows atomically — all succeed or all fail. We use it for create + counter, create + locks, soft-delete + counter. |
| **GSI key validation** | DynamoDB rejects writes where a GSI key attribute is `null`. That's why some fields are omitted instead of set to `null`. |
| **`dataClass-index`** | GSI used by compliance tooling to scan all PHI rows. Requires `updatedAt` to always be a non-null String. |
| **`_warmup` flag** | A field on warmer events. Every Lambda checks it first and returns immediately so the ping is free. |

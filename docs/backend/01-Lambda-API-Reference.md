# Tiryaq — Backend Lambda & API Reference

**Document version:** 1.0
**Date:** 2026-05-25
**Owner:** Sami Taha
**Scope:** All API Lambdas, derived from `tiryaq-cdk/lambda/*` and the route table in `tiryaq-cdk/lib/tiryaq-cdk-stack.ts`.

This is the canonical backend reference. Per-function notes call out request/response shape, authorization, and the business rules that are easy to miss. For infrastructure (GSIs, Cognito, deploy), see `docs/infrastructure/01-AWS-CDK-Reference.md`.

---

## 1. Conventions shared by all Lambdas

**Single table.** Everything lives in the DynamoDB `Hospital` table (PK/SK + 7 GSIs). Items carry an `EntityType` (e.g. `PATIENT`, `DOCTOR`, `APPOINTMENT`, `PAYMENT`, `DISPENSE`, `EXAMINATION`, `AUDIT`).

**Caller identity from the JWT.** The pre-token-generation Lambda injects `email` and `name` into the access token. Lambdas read identity and role from the authorizer claims:

```js
const claims = event.requestContext?.authorizer?.jwt?.claims || {};
const groups = claims['cognito:groups']; // may arrive as "[Admin, Developers]" string OR array
```

`cognito:groups` can arrive as a bracketed string (`"[Pharmacists]"`) or an array. Every Lambda strips brackets and splits before matching — do not assume one shape.

**Roles.** `Admin` and `Developers` are treated as administrators. `Doctors` and `Pharmacists` are scoped roles.

**`updatedAt` rule (GSI-safe writes).** `dataClass-index` sorts on `updatedAt`, so **no Lambda writes `updatedAt: null`** and **no update SETs a GSI key attribute to NULL**. Creates stamp `createdAt` + `updatedAt` with a timestamp; updates skip empty fields and always stamp `updatedAt` (and, where audited, `updatedBy = caller email`).

**Error shape.** Lambdas return `{ message, error }` (or at least `message`) on failure with an appropriate status (`400` validation, `403` authz, `404` not found, `409` conflict, `500` server). The frontend surfaces `message`, so messages are written to be user-readable (e.g. "…already exists").

**CORS.** Allowed origins are enforced by the API Gateway HTTP API allow-list. Newer Lambdas (appointments, pharmacy) intentionally do **not** echo wildcard CORS headers so they cannot override the allow-list; some older Lambdas still echo `Access-Control-Allow-Origin: *` (harmless but inconsistent).

---

## 2. Appointments — `tiryaq-appointments`

Routes: `GET/POST /appointments`, `GET/PATCH/DELETE /appointments/{apptId}`.
Item key: `PK = APPOINTMENT#<id>`, `SK = PROFILE`, `EntityType = APPOINTMENT`.

### Authorization
- **Create (POST):** Admin/Developer only.
- **List (GET):** Doctors see only their own appointments (queried via `doctorEmail-createdAt-index`); Admin/Developer see all (via `EntityType-index`). Optional `?date=` and `?status=` filters.
- **Update (PATCH):** Admin/Developer can update any field; a Doctor may update only their own appointment and only `status, checkedInAt, checkedOutAt, notes, cancelReason, encounterId`.
- **Delete (DELETE):** Admin only. (The UI no longer exposes delete — see Cancel below — but the route still exists for administrative cleanup.)

### Key business rules
- **Duty-day enforcement (#2).** On create, and on any update that changes `date` or `doctorId`, the Lambda loads the doctor's `dutyDays` and rejects (`400`) a date whose weekday is not a duty day. Weekday is computed from `YYYY-MM-DDT00:00:00Z` (UTC-midnight) so it never drifts by timezone. If the doctor has no `dutyDays` set, there is no restriction.
- **Audit stamping (#3).** Every write sets `createdBy`/`updatedBy` to the caller email and `createdAt`/`updatedAt` to a timestamp.
- **Check-in (#6).** A PATCH to `status: 'checked-in'` is accepted and the Lambda auto-sets `checkedInAt` (first time only). `status: 'completed'` auto-sets `checkedOutAt`.
- **Cancellation (#7).** A PATCH to `status: 'cancelled'` **requires** `cancelReason` (else `400`) and the Lambda auto-sets `cancelledAt` (preserving the first cancel time) and `cancelledBy` = caller email. This replaces hard-delete in the UI.
- **Doctor↔patient relationship.** Creating an appointment (or changing its doctor) writes an idempotent `DOCTOR#<email> / PATIENT#<id>` row used elsewhere for data scoping.
- **Audit trail.** Create/update/delete also write an `AUDIT#<date>` row capturing actor, IP, before/after.

### Item fields (selected)
`appointmentId, patientId, patientName, doctorId, doctorName, doctorEmail, department, specialization, date (YYYY-MM-DD), startTime, endTime (HH:mm), duration, visitType, priority, status, referredBy/Name, encounterId, checkedInAt, checkedOutAt, cancelReason, cancelledAt, cancelledBy, notes, chiefComplaint, createdBy, createdByName, createdAt, updatedAt, updatedBy`.

Valid `status`: `scheduled, checked-in, in-progress, completed, cancelled, no-show`. Valid `visitType`: `walk-in, scheduled, emergency, referral, follow-up, check-up`. Valid `priority`: `routine, urgent, emergency`.

---

## 3. Pharmacy — `tiryaq-pharmacy`

Routes: medications, inventory, prescriptions, dispense, purchase-orders, alerts (see route table).
Entities: `MED#<id>/PROFILE` (MEDICATION), `MED#<id>/INVENTORY` (INVENTORY), `DISPENSE#<id>/PROFILE` (DISPENSE), `PO#<id>/PROFILE` (PURCHASE_ORDER).

### Authorization (#5 — pharmacist only)
The whole module is gated: `if (!canAccessPharmacy(event)) return 403 'Access denied: pharmacy staff only'`, where `canAccessPharmacy` returns **true only for the `Pharmacists` group**. Admins/Developers do **not** have pharmacy API access. (Catalog-write handlers contain an `isAdmin || isPharmacist` check, but it is unreachable for non-pharmacists because of the top-level guard.)

### Dispense flow — `POST /pharmacy/dispense`
Request: `{ examId, prescriptionId, medId, quantityDispensed, notes?, allergyOverrideConfirmed?, approvalDocumentKey?, approvalDocumentName? }`.

1. Validate the prescription exists and is not already `dispensed`/`cancelled`; validate inventory stock is sufficient.
2. Check the patient's `allergies` against the medication.
3. **Allergy gate.** If there is an allergy match and `allergyOverrideConfirmed` is not true → return `200 { requiresAllergyConfirmation: true, allergyWarnings, message }` (no dispense yet).
4. **Override requires a document (#4/#9).** If overriding (`allergyOverrideConfirmed: true`) **and** no `approvalDocumentKey` → return `400 'A doctor-approved document is required to override the allergy and dispense.'`
5. On success: write the `DISPENSE` record (including `allergyOverridden`, `approvalDocumentKey`, `approvalDocumentName`, `dispensedBy`, `dispensedAt`), deduct stock with an `adjustments` audit entry, and set the prescription's status to `dispensed` on the exam.

The approval document itself is uploaded by the frontend via the document-manager (`pharmacy-approvals/` prefix) before this call; only its S3 key + filename are sent here.

### Other pharmacy routes (summary)
- **Medications:** `GET/POST /pharmacy/medications`, `PATCH/DELETE /pharmacy/medications/{medId}` (delete only when stock is 0).
- **Inventory:** `GET /pharmacy/inventory` returns items enriched with `isLowStock`, `isExpiringSoon`, `isExpired`, `daysToExpiry`. `PATCH /pharmacy/inventory/{medId}` applies a stock adjustment (`received, returned, expired, damaged, correction, dispensed`) with reason + actor, appended to `adjustments`.
- **Prescriptions:** `GET /pharmacy/prescriptions?status=ordered|dispensed|cancelled` pulls prescriptions from exams and attaches `allergyWarnings` + `hasAllergyAlert`.
- **Purchase orders:** lifecycle `draft → submitted → ordered → partially_received → received` (or `cancelled`); marking `received` auto-adds quantities to inventory.
- **Alerts:** `GET /pharmacy/alerts` returns `out_of_stock`/`expired` (critical) and `low_stock`/`expiring_soon` (warning).

---

## 4. Payments & invoices

Entities: `PK = PATIENT#<id>`, `SK = PAYMENT#<uuid>`, `EntityType = PAYMENT`.

| Route | Lambda | Notes |
|-------|--------|-------|
| `POST /patients/{patientID}/payments` | createPatientPayment | Stamps `createdBy` + `updatedBy` = caller email, `createdAt` + `updatedAt`. Fields: invoiceNumber, patientName, doctorId/Name/Email, appointmentId, items[], amount, insurance*, patientOwes, status, paymentType, dueDate, notes |
| `GET /patients/{patientID}/payments` | getAllPaymentsForPatient | All payments for one patient |
| `GET/PATCH/DELETE /patients/{patientID}/payments/{paymentID}` | getPaymentByID / updatePatientPayment / deletePayment | **Update (#3)** stamps `updatedBy` = caller email + `updatedAt`, skips null fields |
| `GET /payments` | listAllPaymentsForPatientByID | Lists payments |
| `GET /invoices` | getAllInvoices | **JWT-scoped (#)**: a Doctor is forced to their own `doctorEmail` (client filter ignored) and queried via `doctorEmail-createdAt-index`; Admin/Developer may pass optional `?doctorEmail=` else see all (Scan). Paginated: `{ data, count, lastKey, hasMore }`, `?pageSize=` (1–500), `?lastKey=` |

---

## 5. Patients — create/update/delete

| Route | Lambda | Notes |
|-------|--------|-------|
| `POST /patients` | createPatient | Transactional create with QID + phone uniqueness locks. Returns user-readable errors that the frontend surfaces, e.g. *"Failed to create patient, QID already exists: …"* (`400` for validation/conflict). Stamps `createdAt` + `updatedAt` (never null) (#11/#12) |
| `GET /patients` | getAllPatients | Paginated list; role-scoped |
| `GET /patients/{patientID}` | getPatientByID | Single patient |
| `PATCH /patients/{patientID}` | updatePatient | Skips null/undefined fields so it never SETs a GSI key to NULL (#11); stamps `updatedAt`; `ConditionExpression` guards existence (`404` if missing) |
| `PATCH /patients/{patientID}/restore` | updatePatient | Admin/Developer only; clears `deletedAt` and increments the patient counter (soft-delete restore) |
| `DELETE /patients/{patientID}` | deletePatient | Soft delete (sets `deletedAt`) — hard delete was removed for compliance |
| `GET /patients/search` | getPatientsDataByFilters | Filter query |

### Counters
`COUNTER#PATIENTS` / `COUNTER#DOCTORS` track totals; used by the dashboard and `/admin/stats`. Seeded once and never reset on redeploy.

---

## 6. Doctors — create/update/delete

| Route | Lambda | Notes |
|-------|--------|-------|
| `POST /doctors` | createDoctor | Stamps `createdAt` + `updatedAt` (never null); returns user-readable conflict messages (email/QID already exists) |
| `GET /doctors` | getAllDoctors | Paginated list (see `docs/backend/lambda functions/getAllDoctors-documentation.md`) |
| `GET /doctors/{doctorID}` | getDoctorByID | Single doctor |
| `GET /doctors/email/{email}` | getDoctorByEmail | Lookup by email |
| `PATCH /doctors/{doctorID}` | updateDoctor | Skips null fields (#11); stamps `updatedAt`; supports field aliases (`specialty→specialization`, `qatarID/QatarID→qid`); preserves the `dutyDays` array used by appointment duty-day checks |
| `DELETE /doctors/{doctorID}` | deleteDoctor | Soft delete |

`dutyDays` (array of weekday names) on the doctor PROFILE is the source of truth for appointment duty-day validation (§2).

---

## 7. Clinical — examinations / consultations — `tiryaq-examinations`

Routes: `GET/POST /examinations`, `GET/PATCH/DELETE /examinations/{examId}`, `POST /examinations/{examId}/signoff`.

- Stores consultation/SOAP records (`EXAMINATION` entity) including the `prescriptions[]` array the pharmacy module dispenses against.
- Sign-off (`/signoff`) sets `status: completed` + `signedOffAt`.
- Creates/updates stamp `updatedAt` with a timestamp (never null) and skip GSI-key nulls (#11).

---

## 8. Hospital calendar — `tiryaq-calendar`

Routes: `GET/POST /calendars`, `DELETE /calendars/{calendarId}`, `GET/POST /calendars/{calendarId}/events`, `PATCH/DELETE /calendars/{calendarId}/events/{eventId}`.

- Tiryaq-local calendar (replaced the former external CalendarPlatform SaaS) so all calendar data stays in the `Hospital` table for data-residency.
- Writes stamp `updatedAt` + `lastModifiedBy` (actor email).

---

## 9. ScribeFirst — `tiryaq-scribe`

Routes: `POST /scribe/sessions`, `GET /scribe/sessions/{id}`, `POST /scribe/sessions/{id}/soap`, `POST /scribe/sessions/{id}/approve`.

- Sends a consultation transcript to **Amazon Bedrock** to structure it into SOAP, then writes session + audit rows.
- Model: **Claude Haiku 4.5** via the **US cross-region inference profile** `us.anthropic.claude-haiku-4-5-20251001-v1:0` (env `BEDROCK_MODEL_ID`, `BEDROCK_REGION=us-east-1`). The profile may route to us-east-1/-east-2/-west-2; IAM grants `bedrock:InvokeModel` on the profile ARN **and** the underlying model ARNs in all three regions.
- Cross-border transfer of PHI is documented under compliance control #19 (`docs/compliance/01-Qatar-GCC-Compliance-Master.md`). See also `docs/scribefirst/01-ScribeFirst-Design.md`.

---

## 10. Documents — `tiryaq-document-manager`

Routes: `GET/POST /documents`, `GET/DELETE /documents/{documentId}`, `GET /documents/{documentId}/presign`.

- Issues S3 **pre-signed URLs** for upload/download so files never transit the Lambda. The Angular `DocumentService` requests an upload URL, PUTs the file straight to S3, and receives back the object `key`.
- Used by the general Documents module **and** by the pharmacy allergy-override flow (the doctor-approved document is uploaded under the `pharmacy-approvals/` prefix and its key is passed to `/pharmacy/dispense`).

---

## 11. Admin panel — `tiryaq-admin-panel`

All routes are **admin/developer only** (`403 'Access denied: admin only'` otherwise).

| Route | Returns / does |
|-------|----------------|
| `GET /admin/stats` | `{ totalPatients, totalDoctors, totalExams, totalInvoices }` (counters + EntityType counts) |
| `GET /admin/users` | Cognito users with their group memberships; `?limit=`, `?nextToken=`, `?filter=` |
| `POST /admin/users/{username}/disable` | `AdminDisableUser` |
| `POST /admin/users/{username}/enable` | `AdminEnableUser` |
| `POST /admin/users/{username}/set-password` | Sets a **temporary** password (`Permanent: false`, min 8 chars) — user must change at next login |
| `GET /admin/audit` | Queries `AUDIT#<date>` rows; filters `?date=`, `?entityType=`, `?entityId=`, `?action=`, `?actor=`, `?limit=` |

---

## 12. Audit — `tiryaq-audit`

Routes: `GET/POST /audit`. Reads/writes `AUDIT#<date>` entities (actor, action, entity, before/after, IP, timestamp). Feature Lambdas (appointments, etc.) also write audit rows directly on mutating operations.

---

## 13. Reference data & surgeries

| Route(s) | Lambda(s) | Notes |
|----------|-----------|-------|
| `/departments` GET/POST/DELETE, `/departments/bulk` POST | getAllDepartments, createNewDepartment, deleteAllDepartments, bulkCreateDepartments | 28 seeded departments |
| `/specializations` GET/POST/DELETE, `/specializations/bulk` POST | get/create/deleteAll/bulkCreate Specializations | 47 seeded specializations |
| `/patients/{patientID}/surgeries` GET/POST, `/surgeries/{surgeryID}` GET | listAllSurgeriesForPatientByID, createPatientSurgery, getSurgeryByID | Patient surgical records |

---

## 14. Recent backend changes (2026-05 batch)

These behaviours are now in the code and reflected above:

1. **Duty-day enforcement** on appointment create/update (§2).
2. **`updatedBy` = caller email** on appointment and invoice writes (§2, §4).
3. **Pharmacist dispense requires a doctor-approved document** when overriding an allergy (§3).
4. **Pharmacy API is pharmacist-only** at the Lambda level (§3).
5. **Check-in sets status + `checkedInAt`**; **cancel sets `cancelReason`/`cancelledAt`/`cancelledBy`** and replaces delete (§2).
6. **`updatedAt`/GSI null scrub** across all create/update Lambdas (§1, §5, §6, §7).
7. **User-readable error messages** surfaced to the frontend (§1, §5).

---

## 15. Document control

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | 2026-05-25 | Sami Taha | First consolidated backend reference, derived from current Lambda code |

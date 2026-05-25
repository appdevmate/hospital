# Tiryaq — Batch Test Plan (12 fixes/features)

Date: 2026-05-24
Covers: #1, #2, #3, #4/#9, #5, #6, #7, #8, #10, #11, #12

---

## 0. Deploy

Backend (Lambdas + IAM):

```powershell
cd "C:\Users\Sami Toufic Taha\Desktop\aws apps\hospital\tiryaq-cdk"
npx cdk deploy --require-approval never
```

Frontend (after backend finishes):

```powershell
cd "C:\Users\Sami Toufic Taha\Desktop\aws apps\hospital"
Remove-Item -Recurse -Force .angular\cache -ErrorAction SilentlyContinue
ng build --configuration production
aws s3 sync "dist\verona-ng\browser" s3://tiryaqcdkstack-tiryaqfrontendbucket18b23106-jsz6deto6hub --delete
aws cloudfront create-invalidation --distribution-id E1Z1ZKYM74LVA7 --paths "/*"
```

Wait for the invalidation to reach `Completed`, then hard-refresh.

---

## 1. Pharmacy = pharmacist only (#5)

1. Log in as a **doctor** (or admin/developer) → confirm **no "Pharmacy"** item in the left menu.
2. Manually visit `/pharmacy` → you are redirected to **/notfound**.
3. (Backend) In the browser console / Network, a direct `GET /pharmacy/medications` with a non-pharmacist token returns **403** "Access denied: pharmacy staff only".
4. Log in as a **pharmacist** → Pharmacy menu visible and all tabs load.

Pass = only pharmacist can reach pharmacy (UI + API).

---

## 2. updatedAt:null GSI scrub (#11)

1. Edit a **patient**: clear an optional field (e.g. notes) and save → **saves OK, no 500**.
2. Edit a **doctor**: save with some fields blank → **saves OK**.
3. Edit a **payment/invoice** → **saves OK**.

Pass = updates never crash with a GSI "Type mismatch … NULL" error.

---

## 3. Backend error surfacing (#12)

1. Create a **doctor** using an email that already exists → toast shows the real message, e.g. **"Failed to create doctor, email already exists: …"** (not a generic message).
2. Repeat with a duplicate **QID/phone** → specific message shown.

Pass = the backend's actual error text reaches the toast.

---

## 4. Check-in changes status (#6)

1. Appointments → find a **scheduled** appointment → click **Check In**.
2. The row's **Status flips to "Checked In" immediately** (no refresh needed); the green check-in icon is replaced by "Start Consultation".
3. Bonus: column sort, filter, and global search now work on the table.

Verify (DynamoDB):

```sql
SELECT PK, SK, status, checkedInAt FROM "Hospital" WHERE begins_with(PK, 'APPOINTMENT#')
```

Pass = status `checked-in` + `checkedInAt` set, and the table reflects it live.

---

## 5. Cancel replaces delete (#7)

1. Appointments → confirm there is **no Delete** action (row menu and detail dialog).
2. Click **Cancel** on a scheduled appointment → dialog opens.
3. Try confirming with an **empty reason** → blocked ("Reason required").
4. Enter a reason → **Confirm Cancellation** → status → **Cancelled**.

Verify (DynamoDB):

```sql
SELECT PK, SK, status, cancelReason, cancelledAt, cancelledBy FROM "Hospital" WHERE begins_with(PK, 'APPOINTMENT#')
```

Pass = `status=cancelled`, `cancelReason`, `cancelledAt`, and `cancelledBy` (your email) all set.

---

## 6. updatedBy on appointment + invoice (#3)

1. Edit any appointment → save.
2. Create and then edit an invoice/payment.

Verify (DynamoDB):

```sql
SELECT PK, SK, updatedBy FROM "Hospital" WHERE begins_with(PK, 'APPOINTMENT#')
SELECT PK, SK, createdBy, updatedBy FROM "Hospital" WHERE begins_with(SK, 'PAYMENT#')
```

Pass = appointment has `updatedBy` (email); invoice has `createdBy` + `updatedBy` (email).

---

## 7. Appointment date must match doctor duty days (#2)

Setup: ensure a doctor has **dutyDays** set (e.g. Mon/Tue/Wed) in Doctors Management.

1. New Appointment → pick that doctor → choose a date on a **non-duty day** (e.g. a Friday) → **Book** → blocked with: "*… is on duty on: Monday, Tuesday, Wednesday. Friday is not a duty day.*"
2. Choose a date **on** a duty day → books successfully.
3. (Backend) Even if the UI is bypassed, `POST /appointments` with a non-duty date returns **400**.

Pass = booking only allowed on the doctor's duty days (UI + API).

---

## 8. Dashboard total-appointments card (#1)

1. Log in as **admin** → Dashboard → a **"Total Appointments"** stat card appears, showing the count of all appointments in the system.
2. (Doctor dashboard already shows its own Total Appointments card.)

Pass = card present with correct total.

---

## 9. Pharmacist dispense document upload (#4/#9)

1. As **pharmacist**, dispense a prescription that triggers an **allergy alert** (e.g. Amoxicillin for the allergic patient).
2. The override panel now shows a **"Doctor-approved document *"** file picker.
3. With **no file attached**, the "Override & Dispense" button is **disabled**.
4. Attach a PDF/image → button enables → **Override & Dispense** → uploads, then dispenses.
5. (Negative/backend) A dispense with `allergyOverrideConfirmed=true` but no document returns **400** "A doctor-approved document is required…".

Verify (DynamoDB):

```sql
SELECT PK, SK, allergyOverridden, approvalDocumentKey, approvalDocumentName FROM "Hospital" WHERE begins_with(PK, 'DISPENSE#')
```

Pass = dispense row has `approvalDocumentKey` + `approvalDocumentName`; the file is in S3 under `pharmacy-approvals/…`.

---

## 10. Pending invoices in notifications (#10)

1. Ensure at least one invoice has status **pending** or **overdue**.
2. Open **Notifications** (and the bell) → a **"Pending Invoices"** entry appears with the count and total QAR, linking to `/invoices`.
3. As a **doctor**, only that doctor's pending invoices are counted.

Pass = pending/overdue invoices surface as a notification.

---

## 11. Compliance note — cross-region inference profile (#8)

1. Open `docs/compliance/01-Qatar-GCC-Compliance-Master.md`.
2. Under the control register (control #19) there is a **"documented cross-border transfer (ScribeFirst SOAP)"** note recording Claude Haiku 4.5, the `us.` inference profile, the us-east-1/-east-2/-west-2 regions, the approval basis, and IAM scoping.

Pass = note present and accurate.

---

## Quick DynamoDB roll-up (optional)

```sql
SELECT PK, SK, status, checkedInAt, cancelledAt, cancelledBy, updatedBy FROM "Hospital" WHERE begins_with(PK, 'APPOINTMENT#')
SELECT PK, SK, createdBy, updatedBy, status FROM "Hospital" WHERE begins_with(SK, 'PAYMENT#')
SELECT PK, SK, approvalDocumentKey, allergyOverridden FROM "Hospital" WHERE begins_with(PK, 'DISPENSE#')
```

# Tiryaq — End-to-End Test Workflow

One continuous walk-through that exercises every module + feature in the system. Follow it from top to bottom in one sitting on a fresh login. Expected result of each step is in **bold**.

---

## 0. Prerequisites

- 4 Cognito users seeded — one per group: `admin1` (Admin), `doctor1` (Doctors), `pharmacist1` (Pharmacists), `developer1` (Developers).
- Browser: Edge or Chrome, DevTools open, **Application → Service Workers → "Update on reload" off** so caching is realistic.
- Deployment is current (`cdk deploy` + `aws s3 sync` + invalidation done).

---

## 1. Sign in & shell

1. Go to `https://akwadona.com` → log in as **admin1**.
2. **Expect:** dashboard loads, side menu has Dashboard / Calendar / Appointments / Invoices / Notifications / Patients / Doctors Management / Blood Bank / Documents / Administration.
3. Top bar shows your name + email. Click the palette icon → theme sidebar opens → close.
4. Open a new tab → paste `https://akwadona.com/appointments` → **Expect:** lands on Appointments (return-url preserved through Cognito if not logged in).

---

## 2. Reference data

1. Side menu → **Administration**.
2. Departments tab → add **Cardiology** and **Surgery**. **Expect:** rows appear immediately.
3. Specializations tab → add **General Surgery**, **Cardiology**. **Expect:** rows appear.
4. Users tab → confirm the four users; click **Disable** then **Enable** on developer1 → **Expect:** toast for each action.

---

## 3. Doctors module

1. Side menu → **Doctors Management** → **New Doctor** → fill name, email (`drtest@tiryaq.com`), phone (mask `+999 9999 9999`), QID (11 digits), gender dropdown, department, specialization, duty days (e.g. Sun/Mon/Tue/Wed/Thu), duty hours 09:00–17:00 → Save. **Expect:** doctor in the table.
2. Click **Download Template** → open the file → add 2 rows; leave one row without name → save.
3. Click **Import Doctor(s)** → pick the file. **Expect:** loader **"Reading & validating file…"**, then the **Import issues** dialog opens with the bad row + missing field. Click **Import N valid only**. **Expect:** loader **"Importing doctors…"**, then table updates.
4. Edit the test doctor → remove one duty day → Save.

---

## 4. Patients module

1. Side menu → **Patients Management** → **New Patient** → fill name, dob, gender, phone, QID, insurance, blood group. Save.
2. **Import Patient(s)** → pick a file where one row is missing gender. **Expect:** issues dialog lists the bad row; **Import N valid only** brings only the clean rows in.
3. Filter cycle button → "Active" / "All" / "Inactive". **Expect:** rows update.
4. Open a patient profile → tabs render (overview, consultations, payments, documents).

---

## 5. Appointments module — multi-rule check

1. Side menu → **Appointments** → **New Appointment**.
2. Open the **Doctor** dropdown → **Expect:** the doctors you created are listed. (If empty, close + reopen — the dialog auto-refreshes empty lookup lists.)
3. Pick doctor, patient, date (today/future), start 10:00, end 10:30 → Book. **Expect:** row appears, day column shows weekday, type/priority tags have severity colors, status `scheduled`.
4. Re-open New Appointment → same doctor + same date + start 10:15 (overlap). **Expect:** error **"Doctor already has an appointment at 10:00-10:30…"**.
5. New Appointment → same doctor + same date + start 11:00, end 11:30. **Expect:** booked OK (multiple per day allowed when no overlap).
6. New Appointment → same patient + different doctor + same date + 10:10–10:25. **Expect:** error **"This patient already has an appointment at 10:00-10:30…"**.
7. New Appointment outside the doctor's duty days. **Expect:** error **"Doctor is not on duty on …"**.
8. List is sorted **nearest date first**, past at bottom.
9. Edit an existing appointment → change start time to overlap another → **Expect:** same conflict error on save.
10. On a past or cancelled appointment → **Expect:** edit + cancel icons hidden.
11. Log out, log in as **doctor1** → Appointments → **Expect:** see only your own; edit + cancel allowed on your own future ones.
12. Still as doctor1 → Calendar → **Expect:** appointments appear on the SAME calendar as your duty shifts (one calendar per doctor).

---

## 6. Consultations (examinations)

1. Log in as **doctor1**. On the appointments list, **check-in** a today appointment.
2. Click **Start consultation** → form opens.
3. Fill SOAP sections (Subjective / Objective / Assessment / Plan / Diagnosis / Prescriptions / Lab orders / Radiology orders). Save each. **Expect:** auto-save toast.
4. Click **Sign off**. **Expect:** consultation read-only; parent appointment status `completed`.
5. Reload mid-consultation → **Expect:** resumed in edit mode, no duplicate row.

---

## 7. Voice Scribe (Doctor / Developer only)

1. As **doctor1** → side menu → **Voice Scribe** → start session → paste a transcript → request SOAP.
2. **Expect:** Bedrock-generated SOAP split into S/O/A/P.
3. **Approve** → session moves to approved. Admin must NOT see this menu item.

---

## 8. Pharmacy (as pharmacist1)

1. Side menu → **Pharmacy**.
2. Medications tab → New medication → fill → Save.
3. Inventory tab → add stock → adjust qty → **Expect:** alerts widget updates if reorder point breached.
4. Prescription queue → process the prescription from Step 6.3 → dispense quantity → upload a doctor-approval PDF. **Expect:** doc uploaded; dispense record created.
5. Purchase orders → draft → submit → mark received.

---

## 9. Blood Bank (pharmacist1, then doctor1)

1. As **pharmacist1** → **Blood Bank** → Donors → **New donor** → name, blood type, gender dropdown, phone OR QID (at least one). Save.
2. Green **+** on donor row → **Record donation** → product type, units 2, volume 450, today → Save. **Expect:** 2 BB_UNITs in Inventory; donor row shows **Last donation = today**, **Count = 1**.
3. Inventory tab → filter `available` + the donor's blood type → **Expect:** units listed.
4. Stock tab → **Expect:** counts per blood type × product.
5. Log out → as **doctor1** → Blood Bank → **New request** → patient + blood type matching inventory + units 1 + urgency `urgent` → Submit.
6. Log out → as **pharmacist1** → Blood Bank → Requests → open request → cross-match dropdown → pick unit → **Cross-match**. **Expect:** unit reserved, request `crossmatched`.
7. In dialog → multi-select cross-matched unit → **Issue**. **Expect:** unit `issued`, request `issued`.

---

## 10. Documents (Admin / Doctor)

1. As **admin1** → **Documents** → 6 folders shown.
2. Open **patients-documents** → Upload a small PDF → **Expect:** appears in list. Download → file opens.
3. Delete the uploaded doc → confirm → gone.

---

## 11. Invoices

1. **Invoices** (as admin1) → **Expect:** invoices generated by consultation/dispense flows listed. Open one → status `pending`.
2. Mark paid → **Expect:** status flips, dashboard badge updates.

---

## 12. Calendar

1. **Calendar** → admin sees a doctor dropdown.
2. Pick a doctor → **Expect:** duty shifts + appointments + manual events on a single calendar.
3. Click empty slot → **New event** dialog → fill → Save. **Expect:** event appears.
4. Drag the event to another day → **Expect:** PATCH succeeds.
5. Click **Re-sync Duty Schedule** → **Expect:** new doctors get a calendar created; orphans deleted.

---

## 13. Notifications + Dashboard

1. Bell in topbar → list of recent notifications.
2. **Dashboard** → cards for Patients / Doctors / Exams / Invoices reflect live counts. Click a card → routes correctly.
3. Click any individual notification → routes correctly.

---

## 14. Phase D — backend idempotency

1. Network tab → pick a recent POST (e.g. `POST /appointments`) → right-click → **Copy as fetch** → paste into Console → run again.
2. **Expect:** identical response (same `appointmentId`, same body) — cached idempotency row hit.
3. DynamoDB Studio → filter `EntityType = IDEMPOTENCY` → see `IDEMP#<cid>` rows with `expiresAt` ≈ now + 24h.

---

## 15. Offline mode (Phases A–F)

1. DevTools → Network → **Offline**. Topbar pill flips to red **"Offline"**.
2. Create an appointment, a patient, a donor, a pharmacy stock adjust, a blood request — each toasts **"Saved offline — will sync when connection is back."** Badge counts up.
3. Navigate between pages while offline — page shell loads (Phase A), cached GETs render (Phase B).
4. Network → **Online**. **Expect:** toast **"Synced N pending action(s)."** Pill disappears.
5. Reload → **Expect:** all offline-created rows are real with real IDs (Phase F temp-id rewrite).
6. DynamoDB → confirm no duplicates from any earlier replay (idempotency working).

---

## 16. Security / role enforcement

1. As **doctor1** → manually try `/admin-panel` → **Expect:** guard blocks, redirects to dashboard.
2. As **pharmacist1** → try `/doctors-management` → **Expect:** blocked.
3. DevTools → Application → Session Storage → **Expect:** OIDC tokens here, NOT in localStorage. LocalStorage only has `returnUrl` + `userData`.
4. Right-click any side menu link → **Open in new tab** → **Expect:** new tab lands on the same page after sign-in, not the dashboard.
5. Log out → URL goes to Cognito hosted UI, then back to `/`.

---

## 17. Compliance smoke

1. AWS Console:
   - DynamoDB `Hospital` encryption shows **Customer-managed CMK**.
   - S3 buckets: **KMS** + **Block public access ON** + **Versioning ON**.
   - CloudFront: **OAC** + **security-headers** response policy.
   - Cognito User Pool: MFA per current decision, Advanced security = audit.

---

## 18. Done

If every step passed, the system end-to-end works for the current sprint.

If anything failed, capture: screenshot + URL + the failing request from DevTools → Network, and file under the failing module name.

# Tiryaq Hospital — Full Test Plan

**Before starting:** Clean DynamoDB — delete all `PATIENT#`, `DOCTOR#`, `PAYMENT#` records. Keep `DEPARTMENT#`, `SPECIALIZATION#`, `COUNTER#`.

---

## Step 1 — Login ✅

- Login as admin → dashboard loads

**Verify DB:** Nothing to check yet.

---

## Step 2 — Create Doctors ✅

- Created Omar Rashidi: duty days `mon, tue` — `10:15–11:15`
- Created Dr. Layla Hassan: duty days `mon, wed, fri` — `09:00–17:00`

**Verify DB (PartiQL):**
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

**Verify DB (SaaS Calendar API):**
```
GET /calendars  →  x-api-key: tiryaq-hospital-001
```
Expected: 2 calendars named after the doctors

```
GET /calendars/{calendarId}/events
```
Expected: duty shift events with `description: DUTY_SHIFT`, color `#10B981`

---

## Step 4 — Create Patient ✅

- Patient created with required fields

**Verify DB:**
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

**Verify DB:**
```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'APPOINTMENT#')
```
Expected: 1 record with today's date, correct doctorEmail, patientId, status = `scheduled`

**Also verify:** Dashboard → "Today's Appointments" shows this appointment

---

## Step 6 — Create Invoice

- Navigate to Invoices → New Invoice
- Select the patient from Step 4
- Add at least one item, set amount, status = `pending`
- Save

**Verify DB:**
```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'PAYMENT#')
```
Expected: 1 record with correct patientId, status = `pending`, `invoiceNumber` auto-generated

**Also verify:** Dashboard → Invoice Summary shows 1 pending

---

## Step 7 — Notifications

- Click the bell icon in the topbar
- Should show today's appointment under "Today's Appointments"
- Navigate to full Notifications page

**Verify:** No DB check needed — notifications are derived from appointments and patients query results. Confirm:
- Today's appointment appears
- If any patient has status `critical` → appears under Critical Patients

---

## Step 8 — Patient Profile

- Navigate to Patients Management
- Click the eye icon on the patient from Step 4

**Verify on screen:**
- Personal info tab shows correct data
- Appointments tab shows the appointment from Step 5
- Invoices tab shows the invoice from Step 6

**Verify DB:**
```sql
SELECT * FROM "Hospital" WHERE PK = 'PATIENT#<patient-uuid>'
```
Expected: `timestamp` is set (creation date), `updatedAt = null` (not edited yet)

Then edit the patient → change one field → save:
```sql
SELECT * FROM "Hospital" WHERE PK = 'PATIENT#<patient-uuid>'
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

**Verify DB:**
```sql
SELECT * FROM "Hospital" WHERE PK = 'COUNTER#DOCTORS' AND SK = 'TOTAL'
SELECT * FROM "Hospital" WHERE PK = 'COUNTER#PATIENTS' AND SK = 'TOTAL'
```
Expected: `total = 2` for doctors, `total = 1` for patients

---

## Step 10 — Doctor Role

- Log in as Omar Rashidi's Cognito account

**Verify menu shows:** Dashboard, Calendar, Appointments, Invoices, Notifications *(no Management section)*

**Verify per module:**
- Dashboard shows only Omar's appointments and invoices
- Calendar shows only Omar's calendar — no dropdown, no Re-sync button
- Appointments list shows only Omar's appointments
- Invoices list shows only Omar's invoices

**Verify DB:** No additional DB check needed — all filtering is by `doctorEmail`.  
Confirm in Network tab that API calls for appointments and invoices include the `doctorEmail` query param.
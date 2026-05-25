# Tiryaq User Manual — Administrator

**Document version:** 2.0
**Date:** 2026-05-25
**Audience:** Users in the **Admin** Cognito group
**Tone:** Step-by-step, screen-by-screen.

> **What changed in 2.0:** Added **Appointments management** (book, edit, cancel-with-reason — delete has been removed), the **Dashboard** overview, and **notifications**. Admin-panel actions corrected (temporary **set-password**, no password-reset-email, no GDPR tab). Sign-in corrected — **MFA is currently switched off**.

---

## 1. Who you are

You are an Administrator on Tiryaq. You manage users, monitor activity, control access, manage doctors/patients, book appointments, and oversee billing. You do not see patient clinical detail (SOAP notes) unless you also belong to a clinical group.

---

## 2. First-time login

1. Open **https://d6i7iwknkj0bg.cloudfront.net** (or your production URL) and click **Sign in**.
2. Enter your username (e.g. `admin1`) and your temporary password (provided by your deploy team via Secrets Manager under `/tiryaq/seed-users/<username>`).
3. Cognito prompts you to set a new password — minimum 12 characters with at least one uppercase, lowercase, digit, and symbol.
4. You're in. Sessions last 1 hour.

> MFA is **currently disabled** on the platform (a cost regression — see the compliance notes). When re-enabled, first login will require enrolling an authenticator app (TOTP) and entering a 6-digit code each sign-in.

---

## 3. The Dashboard

As an Admin/Developer the dashboard shows:

- **Stat cards:** Today's Appointments, Upcoming (7 Days), **Total Appointments**, Pending Invoices, Total Revenue.
- **Today's Appointments** and **Upcoming (7 Days)** lists.
- **Invoice Summary** (paid / pending / overdue counts) and recent invoices.
- **Quick Overview:** total doctors, total patients, appointments this month, total revenue.

Notifications (bell) include today's/tomorrow's appointments, consultations in progress, critical patients, pharmacy alerts, pending prescriptions, and **pending invoices** (count + total QAR).

---

## 4. Appointments

Open **Appointments**. As an Admin you manage every appointment.

- **New Appointment** — choose doctor, patient, date, start/end time, type, priority. Two rules are enforced:
  - The chosen **date must fall on one of the doctor's duty days** (set in Doctors Management). A non-duty day is blocked with a clear message.
  - A patient can't be double-booked on the same date.
- **Edit** — change details; duty-day rules re-apply if you change the date or doctor.
- **Cancel** — the **delete action has been removed**. To cancel, click the **Cancel** (ban) icon, enter a **reason** (required), and confirm. The appointment moves to **Cancelled** and the system records who cancelled it and when (`cancelledBy`, `cancelledAt`).
- **Check In / Start Consultation** — also available to you, same as doctors.

Every create/edit/cancel stamps the acting user's email (`updatedBy`) and is written to the audit log.

---

## 5. The Admin Panel

Navigate to **Admin Panel** (Administration in the sidebar). Three tabs:

### 5.1 Overview (Stats)
Total patients, doctors, examinations, and invoices — a quick daily read.

### 5.2 Users
List of all Cognito users with group, status, and enabled flag. Actions:
- **Disable user** — instantly blocks sign-in (e.g. a leaver).
- **Enable user** — restores access.
- **Set password** — issues a new **temporary** password; the user must change it on next login. You cannot see anyone's actual password.

> There is no "send reset email" button and no GDPR tab in the current build. Patient soft-delete/restore is handled in the **Patients** module.

### 5.3 Audit
Chronological feed of significant actions: timestamp, actor email, action, entity, and before/after snapshots. Filter by date, entity type, entity ID, action, or actor. Read-only by design — audit rows cannot be edited or deleted.

---

## 6. Managing doctors & patients

- **Doctors Management** — create/edit doctor profiles, including each doctor's **duty days** (which gate appointment booking). 
- **Patients** — create/edit patients; QID and phone are unique (duplicate attempts return a clear message). Deleting a patient is a **soft delete** (recoverable via restore), not a physical delete.

---

## 7. Daily routine

| Task | How |
|------|-----|
| Read platform health | Admin Panel → Overview |
| Onboard a doctor | Create the Cognito user (add to `Doctors` group) + create the doctor profile in Doctors Management; set duty days |
| Offboard a leaver | Admin Panel → Users → Disable |
| Book / fix an appointment | Appointments → New / Edit / Cancel |
| Investigate "I can't see X" | Admin Panel → Audit → filter by their email |
| Review who accessed a record | Audit → filter by entity ID or actor |

---

## 8. What you cannot do (by design)

- View patient clinical content unless you're also in `Doctors`.
- Edit or delete audit rows.
- Permanently delete patients (soft delete only).
- Export the entire database — there is no "export everything" button (PDPPL safeguard).

---

## 9. Security expectations

- Each Admin has their own account; never share credentials.
- Don't access records you have no need to see — every read is audited.
- On suspected compromise: change your password immediately and notify the development lead.

---

## 10. Common error messages

| Message | Likely cause | Fix |
|---------|-------------|-----|
| "Force change password" | Temp password never changed | Sign in again and follow the prompt |
| "Outside duty days" when booking | Date isn't one of the doctor's duty days | Pick a duty day, or update the doctor's duty days |
| "…already exists" creating a patient | Duplicate QID or phone | Check for an existing record |
| "Access denied" | Wrong Cognito group | Adjust group membership |
| "CORS error" in console | Frontend URL not in the API allow-list | Development team updates CDK + redeploys |

---

## 11. Where to get help

- Application bugs → development team.
- Security concerns → development lead immediately.
- Compliance questions → `docs/compliance/01-Qatar-GCC-Compliance-Master.md`.

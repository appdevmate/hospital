# Tiryaq User Manual — Doctor

**Document version:** 2.0
**Date:** 2026-05-25
**Audience:** Users in the **Doctors** Cognito group
**Tone:** Plain, task-focused. No jargon.

> **What changed in 2.0:** Added the **Appointments** workflow (check-in, start consultation), the **Total Appointments** and **Pending Invoices** dashboard cards, and **invoice notifications**. Sign-in steps corrected — **MFA is currently switched off**, so you sign in with username + password only.

---

## 1. Welcome

Tiryaq is your daily clinical workspace. You'll use it to:

- See your appointments and patient list
- Check patients in and start consultations
- Document the visit (SOAP note)
- Order labs, imaging, and prescriptions
- Track your invoices
- Sign off the visit

Once ScribeFirst is enabled, you can **speak the consultation instead of typing it** — Tiryaq drafts the SOAP note for you to review.

---

## 2. Sign in

1. Open **https://d6i7iwknkj0bg.cloudfront.net** (or your clinic's URL).
2. Sign in with your username (e.g. `doctor1`) and password.
3. First time only: change the temporary password — minimum 12 characters with at least one uppercase, lowercase, digit, and symbol.
4. Your session lasts 1 hour; after that you sign in again.

> Multi-factor authentication (MFA) is **currently disabled** on the platform. If your clinic re-enables it, you'll be asked to enrol an authenticator app on first login and enter a 6-digit code each time.

---

## 3. Your dashboard

After signing in you land on the **Dashboard**. As a doctor you see:

- **Today's Appointments** — count and list of patients scheduled with you today.
- **Upcoming (7 Days)** — your scheduled appointments for the week.
- **Total Appointments** — the total number of your appointments in the system.
- **Pending Invoices** — your invoices that are still pending or overdue.

The bell/notifications also surface today's and tomorrow's appointments, consultations in progress, critical patients on your list, and your pending invoices.

---

## 4. Appointments

Open **Appointments** in the sidebar. You see **your own** appointments (scoped to your account automatically).

What you can do as a doctor:

- **Check In** — on a *scheduled* appointment, click the green check-in icon. The status changes to **Checked In** immediately (the system also records the check-in time). The icon then becomes **Start Consultation**.
- **Start Consultation** — on a *checked-in* appointment, click play to move it to **In Progress** and begin documenting.
- **View** — open the appointment detail.

What you cannot do: doctors do not create, edit, or cancel appointments — that's an Admin task. (If a patient's appointment is wrong, ask an Admin to fix or cancel it.)

> Appointments can only be booked on a doctor's **duty days**. If your duty days are set (in Doctors Management), an Admin cannot book you on a non-duty weekday.

---

## 5. Finding a patient

Use **Patients → Search**.

- Search by name, QID (Qatari ID), phone, or patient ID.
- Click a result to open the **Patient Profile**.

Patient Profile tabs: Overview (name, QID, age, allergies, chronic conditions), Consultations, Prescriptions, Lab orders, Surgeries, Documents, Payments.

---

## 6. Doing a consultation

### 6.1 Start

- From **Appointments**, check the patient in, then click **Start Consultation**; or
- From a patient profile, click **New Consultation**.

### 6.2 SOAP note (manual mode)

Fill the four sections: **Subjective** (what the patient told you), **Objective** (vitals, exam findings), **Assessment** (diagnosis/impression), **Plan** (medication, referral, follow-up).

### 6.3 SOAP note (voice mode — ScribeFirst)

> Available once ScribeFirst is deployed.

1. Tick the consent checkbox: "Patient has consented to AI-assisted documentation."
2. Click **Start Recording**. The transcript appears live.
3. Click **Stop**. Tiryaq auto-fills the four SOAP sections (highlighted yellow).
4. Review and edit each section, then **Save & Sign-off**.

### 6.4 Adding orders

In the consultation form: **Prescriptions** (search the catalog → set dose, frequency, duration), **Lab orders**, **Imaging orders**, **Referral** (free text + specialty). Prescriptions you write here are what the pharmacist dispenses.

### 6.5 Sign-off

Click **Save & Sign-off**. The consultation is locked; later edits create a correction visible in the audit trail.

---

## 7. Invoices

Open **Invoices** to see billing tied to your patients (scoped to your account). Pending/overdue invoices also appear on your dashboard and in notifications.

---

## 8. What you cannot do

- Delete patient records or signed consultations (corrections are appended, not replaced).
- Create, edit, or cancel appointments (Admin only).
- Dispense medications (Pharmacist only) — you write the prescription; the pharmacist dispenses.
- View full audit-log detail (Admins only).

---

## 9. Privacy and consent

- Every patient interaction is logged with your email, a timestamp, and the action.
- For ScribeFirst voice scribing, the patient must consent before each session; the consent flag is stored on the consultation.

---

## 10. Common situations

| Situation | What to do |
|-----------|-----------|
| A patient I should see isn't in my appointments | Ask an Admin — the appointment may not be booked, or may be on a different date. |
| I can't check in an appointment | Check-in only works on a *scheduled* appointment. If it's already checked in, use **Start Consultation**. |
| I get logged out | Sessions expire after 1 hour. Sign in again. |
| The system is slow | Check your internet first; if fine, contact the development team. |
| I made a mistake on a signed consultation | Open it; the Edit button creates a correction note. The original stays visible. |

---

## 11. Where to get help

- Clinical workflow questions → your clinic's medical director.
- App problems / account problems → your Admin or the development team.

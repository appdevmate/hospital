# Tiryaq User Manual — Doctor

**Document version:** 1.0
**Date:** 2026-04-30
**Audience:** Users in the **Doctors** Cognito group
**Tone:** Plain, task-focused. No jargon.

---

## 1. Welcome

Tiryaq is your daily clinical workspace. You'll use it to:

- See your patient list
- Open or create a consultation
- Document the visit (SOAP note)
- Order labs, imaging, and prescriptions
- Sign off the visit

Once ScribeFirst Phase 1 is enabled, you'll also be able to **speak the consultation instead of typing it** — Tiryaq will draft the SOAP note for you to review.

---

## 2. Sign in

1. Open **https://d6i7iwknkj0bg.cloudfront.net** (or your clinic's URL).
2. Sign in with your username (e.g. `doctor1`) and password.
3. First time only: change the temporary password and enrol your phone for MFA. Use Google Authenticator, Microsoft Authenticator, or 1Password.
4. From then on, every sign-in asks for your password and a 6-digit code from your authenticator app.

---

## 3. Your dashboard

After signing in, you land on the **Dashboard**:

- **Today's appointments** — patients on your schedule today.
- **Recent patients** — the last 10 you saw.
- **Pending sign-offs** — consultations you started but didn't finalise. Anything older than 24 hours is highlighted.
- **Lab/imaging results inbox** — ordered tests with results back.

---

## 4. Finding a patient

Use **Patients → Search** in the sidebar.

- Search by name, QID (Qatari ID), phone, or patient ID.
- Click a result to open the **Patient Profile**.

The Patient Profile has tabs:

| Tab | Shows |
|-----|-------|
| Overview | Name, QID, age, allergies, chronic conditions |
| Consultations | Every visit you or any doctor has done with this patient |
| Prescriptions | Active and historic medications |
| Lab orders | Tests ordered and results |
| Surgeries | Past surgical history |
| Documents | Uploaded files (PDFs, scans) |
| Payments | Billing history |

---

## 5. Doing a consultation

### 5.1 Start

- From your dashboard, click the appointment row → "Start Consultation."
- Or, from a patient profile, click "New Consultation."
- The consultation form opens with the patient pre-loaded.

### 5.2 SOAP note (manual mode — today)

Four sections. Fill in what's relevant:

- **Subjective** — what the patient told you (chief complaint, history)
- **Objective** — what you observed and measured (vitals, exam findings)
- **Assessment** — your diagnosis or impression
- **Plan** — what you'll do next (medication, referral, follow-up)

### 5.3 SOAP note (voice mode — ScribeFirst Phase 1)

> Available once ScribeFirst is deployed.

1. Tick the consent checkbox: "Patient has consented to AI-assisted documentation."
2. Click the green **Start Recording** mic button.
3. Talk normally with the patient. The transcript appears live on screen.
4. When done, click **Stop**.
5. Tiryaq auto-fills the four SOAP sections from the transcript. Each filled field is highlighted yellow.
6. Read each section. Edit anything wrong.
7. Click **Save & Sign-off** when you're satisfied.

You can switch between voice and manual freely — they're the same form.

### 5.4 Adding orders

In the consultation form, scroll down to:

- **Prescriptions** → click "Add" → search the medication catalog → set dose, frequency, duration → save
- **Lab orders** → similar pattern
- **Imaging orders** → similar pattern
- **Referral** → free text + selected specialty

### 5.5 Sign-off

- Click **Save & Sign-off** at the bottom.
- The consultation is now locked. Edits after sign-off require a formal correction (visible in the audit trail).

---

## 6. Tips

- Drafts auto-save every 30 seconds while you're editing.
- If you accidentally close the browser, reopen the consultation — your draft is there.
- The audit log shows when you opened, edited, and signed any consultation. Every action you take with a patient record is recorded.

---

## 7. What you cannot do

- You cannot delete patient records or signed consultations. Corrections are appended, not replaced.
- You cannot view audit log details (only Admins can).
- You cannot dispense medications — that's the Pharmacist's role. You write the prescription; the pharmacist dispenses.

---

## 8. Privacy and consent

- Every patient interaction is logged: timestamp, the doctor's email (your account), and the action.
- If the patient asks "who has accessed my record?" — you can request the report from your Admin.
- If you use ScribeFirst voice scribing, the patient must give explicit consent before each session. The consent flag is stored on the consultation row.

---

## 9. Common situations

| Situation | What to do |
|-----------|-----------|
| A patient I just saw isn't in my list | Refresh the dashboard (Ctrl-R). If still missing, the appointment may not have been booked through Tiryaq. |
| The system is slow | Check your internet first. If the network is fine, contact the development team — there may be a backend issue. |
| I made a mistake on a signed consultation | Open the consultation. The Edit button creates a correction note. The original remains visible. |
| I get logged out unexpectedly | Sessions expire after 1 hour. Sign in again. If it happens often, check that your browser allows cookies for the Tiryaq domain. |
| I lost my MFA device | Contact your Admin — they can reset the MFA enrolment after verifying your identity in person. |

---

## 10. Where to get help

- Clinical workflow questions → your clinic's medical director.
- App problems → contact your Admin or the development team.
- Account problems (password, MFA) → your Admin.

# Tiryaq User Manual — Pharmacist

**Document version:** 2.0
**Date:** 2026-05-25
**Audience:** Users in the **Pharmacists** Cognito group
**Tone:** Plain, task-focused.

> **What changed in 2.0:** Pharmacy is now **pharmacist-only** (other roles can't see or open it). Overriding an allergy now **requires uploading a doctor-approved document** before you can dispense. Dispense steps corrected. Sign-in corrected — **MFA is currently switched off**.

---

## 1. Welcome

Tiryaq is your pharmacy workspace. You'll use it to:

- View prescriptions written by doctors
- Dispense medication to patients (with an allergy-safety check)
- Manage the medication catalog
- Track inventory levels
- Raise purchase orders
- Monitor low-stock and expiry alerts

The Pharmacy module is visible and accessible **only to pharmacists**. Admins, doctors, and developers cannot open it.

---

## 2. Sign in

1. Open **https://d6i7iwknkj0bg.cloudfront.net** (or your clinic's URL).
2. Sign in with your username (e.g. `pharmacist1`) and password.
3. First time only: change the temporary password — minimum 12 characters with upper, lower, digit, and symbol.
4. Sessions last 1 hour.

> MFA is **currently disabled**. If your clinic re-enables it, you'll enrol an authenticator app on first login and enter a 6-digit code each sign-in.

---

## 3. The Pharmacy module

Tabs across the top:

| Tab | Content |
|-----|---------|
| Dashboard | Stat cards + active alerts grouped by severity |
| Catalog | Medication master list (add / edit / delete) |
| Inventory | Stock levels with low-stock and expiry highlights |
| Prescriptions | Pending prescriptions from doctors → dispense |
| History | Your dispense records (allergy overrides flagged) |
| Purchase Orders | Create and track POs |

Notifications (bell) surface critical/warning pharmacy alerts and the count of prescriptions waiting to be dispensed.

---

## 4. Dispensing a prescription

### 4.1 Open
From **Prescriptions**, pick a pending (ordered) prescription. You'll see the patient, prescribing doctor, medication, dose, frequency, and duration.

### 4.2 Dispense
1. Click **Dispense**.
2. Select the **inventory medication** to dispense from (this links the dispense to a specific stock item, batch, and expiry).
3. Enter the **quantity** and any **notes** (e.g. counselling given).
4. Click **Dispense**.

The system deducts stock, records the dispense with your name and timestamp, and marks the prescription **Dispensed**.

### 4.3 Allergy alert and override (important)
If the patient has a recorded allergy that matches the medication, the system **stops** and shows a red **Allergy Override** banner instead of dispensing.

To proceed you must:
1. Read the allergy warning(s).
2. **Attach the doctor-approved document** confirming the medicine is approved for this patient (PDF or image). The **"Override & Dispense"** button stays **disabled until a file is attached**.
3. Click **Override & Dispense**. The document uploads, then the medicine is dispensed.

The dispense record stores that the allergy was overridden, plus the approval document, for the audit trail. **You cannot override an allergy without the document** — the server rejects it.

---

## 5. Catalog management

**Pharmacy → Catalog.** View the master list (name, generic name, strength, form, unit, manufacturer, reorder point). **Add** newly stocked items; **Edit** price/supplier/status. Delete is only allowed when stock is 0.

---

## 6. Inventory

**Pharmacy → Inventory.** Each row shows stock on hand, batch, expiry, and alert flags (low stock, expiring soon, expired). Use **Adjust stock** for received / returned / expired / damaged / correction — always with a reason (it's audited). Dispensing automatically logs a `dispensed` adjustment.

---

## 7. Purchase orders

**Pharmacy → Purchase Orders.** Create a PO (supplier + items + quantities). Lifecycle: `draft → submitted → ordered → partially_received → received` (or `cancelled`). Marking a PO **received** automatically adds the quantities to inventory.

---

## 8. Alerts

| Alert | Severity | Action |
|-------|----------|--------|
| Out of stock | Critical | Raise a PO |
| Expired | Critical | Quarantine and write off — never dispense |
| Low stock | Warning | Raise a PO |
| Expiring soon (≤30 days) | Warning | Use first; consider returning to supplier |

---

## 9. What you cannot do

- Create or modify prescriptions — that's the doctor's role.
- Delete dispense records — correct errors with an inventory adjustment, not deletion.
- Override an allergy without a doctor-approved document.
- View a patient's clinical notes (SOAP) — you see the prescription, the linked diagnosis, and patient identity only.
- Edit the audit log.

---

## 10. Common situations

| Situation | What to do |
|-----------|-----------|
| Override & Dispense button is greyed out | Attach the doctor-approved document — the button enables once a file is selected. |
| Prescription is for something we don't stock | Notify the doctor; it can't be dispensed. |
| Stock count doesn't match the shelf | Run an adjustment with reason "physical count" and investigate. |
| The system is slow | Check internet first; if fine, contact the development team. |

---

## 11. Where to get help

- Clinical/medication questions → the prescribing doctor.
- App or account problems → your Admin or the development team.

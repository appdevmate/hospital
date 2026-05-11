# Tiryaq User Manual — Pharmacist

**Document version:** 1.0
**Date:** 2026-04-30
**Audience:** Users in the **Pharmacists** Cognito group
**Tone:** Plain, task-focused.

---

## 1. Welcome

Tiryaq is your pharmacy workspace. You'll use it to:

- View prescriptions written by doctors
- Dispense medication to patients
- Manage the pharmacy catalog (item master)
- Track inventory levels
- Raise purchase orders
- Monitor low-stock and expiry alerts

---

## 2. Sign in

1. Open **https://d6i7iwknkj0bg.cloudfront.net** (or your clinic's URL).
2. Sign in with your username (e.g. `pharmacist1`) and password.
3. First time only: change the temporary password and enrol MFA on your phone (Google Authenticator, Microsoft Authenticator, or 1Password).
4. Every sign-in afterwards asks for your password and a 6-digit code from the authenticator app.

---

## 3. Your dashboard

The Pharmacy module landing page shows:

- **Pending dispensing** — prescriptions waiting for you.
- **Low-stock alerts** — items below the reorder threshold.
- **Expiring-soon alerts** — items near or past their expiry date.
- **Today's dispensing summary** — count, total value.

---

## 4. Dispensing a prescription

### 4.1 Open the prescription

- From the Pending list, click the patient's name.
- The prescription detail shows: patient name and QID, doctor who prescribed, medication, dose, frequency, duration, instructions.

### 4.2 Verify

- Confirm the patient identity (name + QID — match against their ID card).
- Confirm the medication is in stock and not expired.
- If a generic substitution is needed, the doctor's free-text note will indicate whether substitutions are allowed.

### 4.3 Dispense

- Click **Dispense**.
- Enter the actual quantity dispensed and the batch / lot number.
- Click **Confirm**.
- The system:
  - Decrements the inventory.
  - Records the dispense event with your name and timestamp.
  - Updates the prescription status to "Dispensed."

### 4.4 Counsel the patient

Verbal counselling is your professional duty — the system does not script it for you. Use the free-text **Counselling notes** field on the dispense screen to record what was discussed (allergies, interactions, advice).

---

## 5. Catalog management

Navigate to **Pharmacy → Catalog**.

- View the master list of all medications stocked.
- Each item has: name, generic name, strength, form (tablet, capsule, syrup), unit price, supplier, regulatory class.
- **Add new item** — for items being newly stocked. Required fields: name, generic name, strength, form, unit price.
- **Edit item** — adjust price, supplier, or status. Cannot edit drug name fields after creation; deactivate the item and create a new one instead.

---

## 6. Inventory

Navigate to **Pharmacy → Inventory**.

- Each row is a stock batch: item, batch number, quantity on hand, expiry date, location.
- **Receive stock** — when a delivery arrives, click the item → "Receive batch" → enter batch number, quantity, expiry, and supplier reference.
- **Adjust stock** — for damaged stock, returns, or counts. Always include a reason; this is audited.
- **Stock alerts** — items below their reorder point appear in red.

---

## 7. Purchase orders

Navigate to **Pharmacy → Purchase Orders**.

- See open and historic POs.
- **Create PO** — select supplier → add items + quantities → submit.
- **Mark received** — when the goods arrive, mark the PO line as received and create the matching inventory batch in one step.

---

## 8. Alerts

Navigate to **Pharmacy → Alerts**.

| Alert | Meaning | Action |
|-------|---------|--------|
| LOW_STOCK | Item below reorder threshold | Raise PO |
| EXPIRING_SOON | Batch within 30 days of expiry | Use first; consider returning to supplier |
| EXPIRED | Batch past expiry | Quarantine and write off — never dispense |
| MAX_STOCK | Item significantly over the maximum threshold | Investigate over-ordering |

---

## 9. What you cannot do

- You cannot create or modify prescriptions — that's the Doctor's role.
- You cannot delete dispense records. Errors are corrected by adding an adjustment line, not by deleting.
- You cannot view a patient's clinical notes (SOAP). You only see the prescription, the diagnosis the prescription is linked to, and patient identity fields.
- You cannot edit the audit log.

---

## 10. Audit and accountability

- Every dispense action records your account and a timestamp.
- Every catalog change is logged.
- Every inventory adjustment requires a reason and is logged.
- Admins can review your dispensing activity if needed (e.g. for controlled substance reconciliation).

---

## 11. Common situations

| Situation | What to do |
|-----------|-----------|
| Prescription is for a medication we don't stock | Mark as "Cannot dispense — not in catalog." Notify the doctor. |
| Patient says they didn't get this prescription | Check the dispense log — your name + timestamp will be there. If a colleague dispensed, ask them. |
| The system shows a stock count that doesn't match the shelf | Run an inventory adjustment with reason "physical count" — investigate the difference. |
| I lost my MFA device | Contact your Admin — they can reset MFA after verifying your identity in person. |
| The system is slow | Check internet first. If the network is fine, contact the development team. |

---

## 12. Where to get help

- Clinical/medication questions → ask the prescribing doctor.
- App problems → contact your Admin or the development team.
- Account / login problems → your Admin.

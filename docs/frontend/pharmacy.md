# Pharmacy Module — Technical Documentation

**Document version:** 2.0
**Date:** 2026-05-25
**Scope:** Frontend (Angular) + the `tiryaq-pharmacy` Lambda contract it consumes.

> **What changed in 2.0:** Access is now **Pharmacists only** (previously open to Admin/Developers/Pharmacists). The dispense flow now requires a **doctor-approved document upload** when a pharmacist overrides an allergy. Both are reflected below.

---

## 1. Architecture

| Component | Detail |
|-----------|--------|
| Lambda | `tiryaq-pharmacy` — Node.js 24.x |
| API base | from `src/app/services/config.ts` (`Config.buildUrl(...)`) — not hardcoded |
| Database | DynamoDB `Hospital` table (single-table design) |
| Auth | Cognito JWT via the API Gateway authorizer |
| Access | **Pharmacists group only** (UI route guard, menu, and Lambda all enforce this) |

---

## 2. Access control (Pharmacists only)

Three layers enforce the same rule:

1. **Route guard** — `app.routes.ts`: `{ path: 'pharmacy', canActivate: [roleGuard(PHARMACY_ROLES)], component: PharmacyComponent }` where `PHARMACY_ROLES = ['pharmacist']`. Other roles are redirected to `/notfound`.
2. **Menu** — `app.menu.ts` adds the Pharmacy item only when `isPharmacist`. Admins, doctors, and developers do not see it.
3. **Lambda** — `canAccessPharmacy(event)` returns true only for the `Pharmacists` group; every other caller gets `403 'Access denied: pharmacy staff only'`.

| Group | Pharmacy access |
|-------|-----------------|
| Pharmacists | Full access |
| Admin | None |
| Developers | None |
| Doctors | None |

> Edge case: a user who is in *both* `Developers` and `Pharmacists` Cognito groups resolves to role `developer` (precedence in `AuthService.parseRole`), so the route guard would deny `/pharmacy` even though the menu's group-based `isPharmacist` would still show the link. Keep seeded users in a single group.

---

## 3. DynamoDB entity types

All pharmacy data lives in the `Hospital` table via distinct `EntityType` values and key prefixes.

| Entity | PK | SK | EntityType |
|--------|----|----|------------|
| Medication | `MED#<uuid>` | `PROFILE` | `MEDICATION` |
| Inventory | `MED#<uuid>` | `INVENTORY` | `INVENTORY` |
| Dispense record | `DISPENSE#<uuid>` | `PROFILE` | `DISPENSE` |
| Purchase order | `PO#<uuid>` | `PROFILE` | `PURCHASE_ORDER` |

### Dispense record (current fields)

| Attribute | Type | Description |
|-----------|------|-------------|
| `dispenseId` | String | UUID |
| `examId` | String | Examination the prescription belongs to |
| `prescriptionId` | String | The specific prescription item UUID |
| `patientId` / `patientName` | String | Patient |
| `doctorName` | String | Prescribing doctor |
| `medId` / `medName` | String | Inventory medication |
| `quantityDispensed` | Number | Units dispensed |
| `unit` / `packUnit` / `batchNumber` / `expiryDate` | — | Pulled from the inventory item |
| `notes` | String | Counselling / dispense notes |
| `allergyWarnings` | List | Allergy matches found at dispense time |
| `allergyOverridden` | Boolean | True if an allergy warning was overridden |
| **`approvalDocumentKey`** | String\|null | **S3 key of the doctor-approved document (override only)** |
| **`approvalDocumentName`** | String\|null | **Original filename of that document** |
| `dispensedBy` / `dispensedByName` | String | Pharmacist identity |
| `dispensedAt` | String | ISO timestamp |

Stock-adjustment types on the inventory `adjustments[]` log: `received, returned, expired, damaged, correction, dispensed`.

---

## 4. API routes (consumed by `pharmacy.service.ts`)

| Method | Route | Description |
|--------|-------|-------------|
| GET / POST | `/pharmacy/medications` | List / add catalog medications |
| PATCH / DELETE | `/pharmacy/medications/{medId}` | Update / delete (delete only if stock 0) |
| GET / POST | `/pharmacy/inventory` | Inventory with alert flags / create |
| PATCH | `/pharmacy/inventory/{medId}` | Stock adjustment (reason + actor logged) |
| GET / POST | `/pharmacy/prescriptions` | Prescriptions from exams (+ allergy flags) |
| GET / PATCH | `/pharmacy/prescriptions/{rxId}` | Prescription detail / update |
| GET / POST | `/pharmacy/dispense` | Dispense history / dispense |
| GET / POST | `/pharmacy/purchase-orders` | List / create PO |
| GET / PATCH | `/pharmacy/purchase-orders/{poId}` | PO detail / status update |
| GET | `/pharmacy/alerts` | Active stock & expiry alerts |

---

## 5. Dispense + allergy-override flow (the important one)

### Request — `POST /pharmacy/dispense`

```json
{
  "examId": "exam-uuid",
  "prescriptionId": "rx-uuid",
  "medId": "med-uuid",
  "quantityDispensed": 14,
  "notes": "Counselled on side effects",
  "allergyOverrideConfirmed": false,
  "approvalDocumentKey": null,
  "approvalDocumentName": null
}
```

### Step-by-step

1. Pharmacist clicks **Dispense**, selects the inventory medication (`medId`) and quantity.
2. The Lambda checks the patient's `allergies` against the medication.
3. **No allergy** → dispense proceeds; stock is deducted; the prescription is marked `dispensed`.
4. **Allergy found, not yet confirmed** → Lambda returns `{ requiresAllergyConfirmation: true, allergyWarnings, message }`. The dialog shows a red **Allergy Override** banner and a **"Doctor-approved document *"** file picker.
5. The **"Override & Dispense"** button is **disabled until a file is attached** (`[disabled]="!approvalFile"`).
6. On confirm, `confirmAllergyOverride()` uploads the file via `DocumentService.uploadFile(file, 'pharmacy-approvals')`, gets back an S3 `key`, then re-calls dispense with `allergyOverrideConfirmed: true`, `approvalDocumentKey: <key>`, `approvalDocumentName: <file.name>`.
7. Server guard: if `allergyOverrideConfirmed` is true but `approvalDocumentKey` is missing, the Lambda returns `400 'A doctor-approved document is required to override the allergy and dispense.'`
8. The dispense record stores `allergyOverridden: true` plus the approval document key/name for audit.

### Allergy warning response

```json
{
  "requiresAllergyConfirmation": true,
  "allergyWarnings": ["Patient has known allergy to: Penicillin"],
  "message": "Allergy alert — confirm override to proceed"
}
```

---

## 6. Frontend files

| File | Location |
|------|----------|
| Component | `src/app/components/pharmacy/pharmacy.ts` |
| Template | `src/app/components/pharmacy/pharmacy.html` |
| Styles | `src/app/components/pharmacy/pharmacy.scss` |
| Service | `src/app/services/pharmacy.service.ts` |
| Upload helper | `src/app/services/document.service.ts` (`uploadFile` → pre-signed S3 PUT) |

### Tabs

| Tab | Content |
|-----|---------|
| Dashboard | Stat cards + active alerts grouped by severity |
| Catalog | Medication master list — add/edit/delete |
| Inventory | Stock table with low-stock/expiry highlights + adjust dialog |
| Prescriptions | Pending prescriptions from exams + dispense dialog (with allergy override) |
| History | Dispense records, with an "Allergy Override" tag where applicable |
| Purchase Orders | PO list with lifecycle actions + create/edit dialog |

### Error handling

Failed calls go through `HelpersService.notifyApiError(...)`, which surfaces the backend `message` (e.g. the override-document requirement) and redirects to login on `401`.

---

## 7. AuthService — `isPharmacist`

```typescript
get isPharmacist(): boolean {
    void this.current;            // ensures _groups is populated
    return this._groups.includes('Pharmacists');
}
```

`_groups` is parsed from the `cognito:groups` claim on the access token. Note `parseRole` precedence (developer → admin → doctor → pharmacist), which is why a pure pharmacist resolves to role `pharmacist` and passes the route guard.

---

## 8. Document control

| Version | Date | Change |
|---------|------|--------|
| 1.0 | — | Initial pharmacy module documentation |
| 2.0 | 2026-05-25 | Pharmacist-only access (route/menu/Lambda); dispense allergy-override now requires a doctor-approved document upload; corrected service path and dispense record fields |

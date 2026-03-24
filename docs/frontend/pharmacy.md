# Pharmacy Module — Technical Documentation

## Overview

The Pharmacy module manages the full medication lifecycle — from catalog and inventory to prescription dispensing and purchase orders. It is accessible to users in the **Admin**, **Developers**, or **Pharmacists** Cognito groups.

---

## 1. Architecture

| Component | Detail |
|-----------|--------|
| Lambda | `tiryaq-pharmacy` — Node.js 20.x |
| API Base | `https://xy829e3qw2.execute-api.us-east-1.amazonaws.com` |
| Database | DynamoDB — `Hospital` table (single-table design) |
| Auth | Cognito JWT via API Gateway authorizer |
| Access | Admin, Developers, Pharmacists groups |

---

## 2. Cognito Groups

| Group | Access |
|-------|--------|
| Admin | Full access including catalog management |
| Developers | Full access including catalog management |
| Pharmacists | Full access including catalog management |
| Doctors | No access to Pharmacy module |

---

## 3. DynamoDB Entity Types

All pharmacy data is stored in the same `Hospital` DynamoDB table using distinct `EntityType` values and key prefixes.

| Entity | PK | SK | EntityType |
|--------|----|----|------------|
| Medication | `MED#<uuid>` | `PROFILE` | `MEDICATION` |
| Inventory | `MED#<uuid>` | `INVENTORY` | `INVENTORY` |
| Dispense Record | `DISPENSE#<uuid>` | `PROFILE` | `DISPENSE` |
| Purchase Order | `PO#<uuid>` | `PROFILE` | `PURCHASE_ORDER` |

### Medication Record

| Attribute | Type | Description |
|-----------|------|-------------|
| `medId` | String | UUID |
| `name` | String | Brand name e.g. Amoxicillin |
| `genericName` | String | Generic/chemical name |
| `category` | String | e.g. Antibiotic, Analgesic |
| `form` | String | Tablet, Capsule, Injection, Syrup, etc. |
| `strength` | String | e.g. 500mg |
| `unit` | String | e.g. mg, ml, tablet |
| `manufacturer` | String | Manufacturer name |
| `requiresPrescription` | Boolean | Whether a prescription is required |
| `reorderPoint` | Number | Minimum stock level before alert triggers |

### Inventory Record

| Attribute | Type | Description |
|-----------|------|-------------|
| `medId` | String | Links to medication record |
| `medName` | String | Denormalized medication name |
| `stockQty` | Number | Current stock quantity |
| `unit` | String | Unit of measurement |
| `location` | String | Physical storage location e.g. Shelf A-3 |
| `batchNumber` | String | Current batch/lot number |
| `expiryDate` | String | YYYY-MM-DD format |
| `adjustments` | List | Full log of every stock change |

### Stock Adjustment Types

| Type | Effect | When to use |
|------|--------|-------------|
| `received` | Adds stock | New delivery received |
| `returned` | Adds stock | Patient returned unused medication |
| `expired` | Deducts stock | Disposing expired stock |
| `damaged` | Deducts stock | Disposing damaged stock |
| `correction` | Sets directly | Manual correction after stock count |
| `dispensed` | Deducts stock | Auto-recorded when dispensing |

### Dispense Record

| Attribute | Type | Description |
|-----------|------|-------------|
| `dispenseId` | String | UUID |
| `examId` | String | Examination this prescription belongs to |
| `prescriptionId` | String | The specific prescription item UUID |
| `patientId` | String | Patient UUID |
| `medId` | String | Inventory medication UUID |
| `medName` | String | Medication name at time of dispense |
| `quantityDispensed` | Number | How many units were dispensed |
| `batchNumber` | String | Batch dispensed from |
| `expiryDate` | String | Expiry of batch dispensed |
| `allergyWarnings` | List | Allergy matches found at time of dispense |
| `allergyOverridden` | Boolean | True if pharmacist overrode an allergy warning |
| `dispensedBy` | String | Pharmacist email |
| `dispensedAt` | String | ISO timestamp |

### Purchase Order Record

| Attribute | Type | Description |
|-----------|------|-------------|
| `poId` | String | UUID |
| `poNumber` | String | Auto-generated e.g. `PO-1742813400000` |
| `status` | String | See lifecycle below |
| `supplier` | String | Supplier name |
| `items` | List | Array of PO line items |
| `totalCost` | Number | Sum of all item costs |
| `currency` | String | Default QAR |
| `expectedDate` | String | Expected delivery date |

**Purchase Order Lifecycle:**

```
draft → submitted → ordered → partially_received → received
                 ↘ cancelled (from any status)
```

When status changes to `received`, the Lambda automatically adds received quantities to inventory stock for each line item.

---

## 4. API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/pharmacy/medications` | List all medications in catalog |
| POST | `/pharmacy/medications` | Add new medication to catalog |
| PATCH | `/pharmacy/medications/{medId}` | Update medication details |
| DELETE | `/pharmacy/medications/{medId}` | Delete medication (only if stock is 0) |
| GET | `/pharmacy/inventory` | Full inventory with stock levels and alerts |
| PATCH | `/pharmacy/inventory/{medId}` | Adjust stock |
| GET | `/pharmacy/prescriptions` | List prescriptions from examinations |
| POST | `/pharmacy/dispense` | Dispense a prescription |
| GET | `/pharmacy/dispense` | Dispense history |
| GET | `/pharmacy/purchase-orders` | List all purchase orders |
| POST | `/pharmacy/purchase-orders` | Create new purchase order |
| PATCH | `/pharmacy/purchase-orders/{poId}` | Update PO status or details |
| GET | `/pharmacy/alerts` | Active stock and expiry alerts |

---

## 5. Route Details

### GET /pharmacy/inventory

Returns all inventory items enriched with alert flags.

**Response includes per item:**
- `isLowStock` — true if `stockQty <= reorderPoint`
- `isExpiringSoon` — true if expiry is within 30 days
- `isExpired` — true if expiry date has passed
- `daysToExpiry` — number of days until expiry (negative if expired)

---

### PATCH /pharmacy/inventory/{medId}

Adjusts stock for a medication.

**Request body:**
```json
{
  "adjustmentType": "received",
  "quantity": 100,
  "reason": "Monthly delivery from Qatar Pharma",
  "batchNumber": "LOT-2026-001",
  "expiryDate": "2027-06-30",
  "location": "Shelf A-3"
}
```

Every adjustment is appended to the `adjustments` array with actor identity and timestamp for full traceability.

---

### GET /pharmacy/prescriptions?status=ordered

Fetches all prescriptions from examination records matching the given status.

**Status values:** `ordered` (pending), `dispensed`, `cancelled`

For each prescription, the Lambda also fetches the patient's allergy list and checks for matches against the medication name, returning:
- `allergyWarnings` — list of matching allergy strings
- `hasAllergyAlert` — boolean flag for quick filtering

---

### POST /pharmacy/dispense

Dispenses a prescription. This route:
1. Validates the prescription exists and is not already dispensed
2. Checks inventory stock is sufficient
3. Checks patient allergies against the medication name
4. If allergy found and `allergyOverrideConfirmed` is not true — returns a warning response instead of dispensing
5. If proceeding — deducts stock, creates dispense record, updates prescription status on the exam to `dispensed`

**Request body:**
```json
{
  "examId": "exam-uuid",
  "prescriptionId": "rx-uuid",
  "medId": "med-uuid",
  "quantityDispensed": 14,
  "notes": "Patient counselled on side effects",
  "allergyOverrideConfirmed": false
}
```

**Allergy warning response (when override needed):**
```json
{
  "requiresAllergyConfirmation": true,
  "allergyWarnings": ["Patient has known allergy to: Penicillin"],
  "message": "Allergy alert — confirm override to proceed"
}
```

To proceed after the warning, resend with `allergyOverrideConfirmed: true`. The dispense record will store `allergyOverridden: true` for audit purposes.

---

### GET /pharmacy/alerts

Returns all active alerts sorted by severity (critical first).

**Alert types:**

| Type | Severity | Condition |
|------|----------|-----------|
| `out_of_stock` | critical | `stockQty === 0` |
| `expired` | critical | Expiry date has passed |
| `low_stock` | warning | `stockQty <= reorderPoint` and > 0 |
| `expiring_soon` | warning | Expiry within 30 days |

---

### PATCH /pharmacy/purchase-orders/{poId}

Updates PO status or details. Valid status transitions:

| From | To (allowed) |
|------|-------------|
| `draft` | `submitted`, `cancelled` |
| `submitted` | `ordered`, `cancelled` |
| `ordered` | `partially_received`, `received`, `cancelled` |
| `partially_received` | `received`, `cancelled` |

When status is set to `received`, include `received` quantity and `batchNumber`/`expiryDate` per item in the `items` array — the Lambda will automatically update inventory stock for each item.

---

## 6. Frontend

### Files

| File | Location |
|------|----------|
| `pharmacy.ts` | `src/app/components/pharmacy/pharmacy.ts` |
| `pharmacy.html` | `src/app/components/pharmacy/pharmacy.html` |
| `pharmacy.scss` | `src/app/components/pharmacy/pharmacy.scss` |
| `pharmacy.service.ts` | `src/app/pages/service/pharmacy.service.ts` |

### Route

```typescript
{ path: 'pharmacy', component: PharmacyComponent }
```

### Menu

Visible to all roles (Admin, Developers, Doctors, Pharmacists) in `app.menu.ts` shared items.

### Tabs

| Tab | Content |
|-----|---------|
| Dashboard | 5 stat cards + all active alerts grouped by severity |
| Catalog | Medication master list — add/edit/delete for Admin and Pharmacists |
| Inventory | Stock table with low stock and expiry highlights + adjust stock dialog |
| Prescriptions | Pending prescriptions from examination module + dispense dialog |
| History | All dispense records with allergy override indicator |
| Purchase Orders | PO list with status lifecycle actions + create/edit dialog |

### Allergy Check Flow

1. Pharmacist clicks **Dispense** on a prescription
2. Lambda checks patient's `allergies` field against the medication name
3. If a match is found → Lambda returns `requiresAllergyConfirmation: true`
4. Angular shows a red allergy override banner in the dispense dialog
5. Pharmacist clicks **Override & Dispense** to confirm with clinical judgment
6. Second request sent with `allergyOverrideConfirmed: true`
7. Dispense record stored with `allergyOverridden: true` for audit trail

---

## 7. AuthService — isPharmacist

```typescript
get isPharmacist(): boolean {
    void this.current; // ensures _groups is populated
    return this._groups.includes('Pharmacists');
}
```

The `_groups` array is populated when `current` is first accessed by parsing the `cognito:groups` claim from the access token JWT.

---

## 8. Known Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| `Access denied: pharmacy staff only` for Pharmacist user | `cognito:groups` arrives as `"[Pharmacists]"` string with square brackets, `split(',')` returned `["[Pharmacists]"]` which did not match `"Pharmacists"` | Strip `[` and `]` before splitting: `.replace(/^\[/, '').replace(/\]$/, '')` |
| Arrow function in `@if` template causing build error | Angular template parser does not support arrow functions in binding expressions | Moved `inventory.some(i => ...)` to a `get hasInventoryAlerts()` getter in the component class |
| `Partial<POItem>` type error on `savePo()` | `POItem.medId` and other fields were typed as required `string` but `poForm.items` uses `Partial<POItem>[]` | Made all `POItem` fields optional with `?` |
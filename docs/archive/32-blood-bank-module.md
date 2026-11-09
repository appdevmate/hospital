# 32 — Blood Bank Module

> **Status:** Live. Last audited: 2026-10-02.
> **Audience:** Engineers extending the module, clinicians using it, auditors verifying donor consent.
> **Backend:** `akwadona-cdk/lambda/akwadona-bloodbank/` (Node 20).
> **Frontend:** `src/app/components/blood-bank/` and `src/app/services/bloodbank.service.ts`.

## 1. TL;DR
- End-to-end blood bank workflow: donors → donations → units → requests → crossmatch → issue.
- Reuses the single-table `Hospital` DynamoDB design with new `EntityType`s.
- Role gate `BLOODBANK_ROLES = ['admin', 'developer', 'doctor', 'pharmacist']`.

## 2. What this is

**What it is** — a module that tracks donor consent, donation events, blood unit inventory with ABO/Rh typing, cross-hospital transfusion requests, pre-transfusion crossmatch, and unit issue to a patient.

**Why it exists** — hospitals must trace every unit of blood from donor arm to patient arm. Regulators (MOPH, PDPPL on health data) and clinical safety both demand it. Spreadsheet-based tracking is error-prone and non-auditable.

**Real-life example** — a donor arrives at Tiryaq's blood bank, completes consent, has a unit drawn, that unit is labeled with batch + expiry + ABO/Rh, stored in inventory. A doctor orders a transfusion for a surgical patient; the request includes required ABO/Rh and quantity. The blood bank performs crossmatch on a specific unit, issues it, and the audit chain is complete.

**How Akwadona uses it** — all data lives in the `Hospital` table scoped by `tenantId`. The `akwadona-bloodbank` Lambda dispatches internally by `event.rawPath`. The frontend `blood-bank.ts` component orchestrates the UI across tabs (Donors, Donations, Inventory, Requests, Crossmatch, Issue).

## 3. Data model (DynamoDB `Hospital` table)

| Entity | PK | SK | EntityType | Key attributes |
|---|---|---|---|---|
| Donor | `BLOOD_DONOR#<uuid>` | `PROFILE` | `BLOOD_DONOR` | name (encrypted), qid (encrypted + hashed), phone (enc + hash), bloodGroup, rhFactor, lastDonationDate, consentGiven, consentDate |
| Donation event | `BLOOD_DONATION#<uuid>` | `PROFILE` | `BLOOD_DONATION` | donorId, date, volumeMl, screening results (HIV/HBV/HCV/syphilis), passedScreening |
| Blood unit | `BLOOD_UNIT#<uuid>` | `PROFILE` | `BLOOD_UNIT` | donationId, batchNumber, bloodGroup, rhFactor, componentType (whole/RBC/plasma/platelets), collectedAt, expiresAt, location, status (`available` / `reserved` / `issued` / `expired` / `discarded`) |
| Request | `BLOOD_REQUEST#<uuid>` | `PROFILE` | `BLOOD_REQUEST` | patientId, doctorId, requiredBloodGroup, requiredRhFactor, componentType, quantity, urgency (routine/urgent/stat), status |
| Crossmatch | `BLOOD_REQUEST#<uuid>` | `CROSSMATCH#<unitId>` | `BLOOD_CROSSMATCH` | result (`compatible` / `incompatible`), performedBy, performedAt |
| Issue | `BLOOD_REQUEST#<uuid>` | `ISSUE#<unitId>` | `BLOOD_ISSUE` | issuedTo (patient), issuedBy, issuedAt, delivered |

All rows carry `tenantId`, `dataClass`, `createdAt`, `updatedAt`. PHI fields (donor name, QID, phone) are envelope-encrypted per [`03-encryption-and-zero-knowledge.md`](03-encryption-and-zero-knowledge.md); `qidHash` + `phoneHash` support lookup.

## 4. Routes (see [`20-api-reference.md`](20-api-reference.md) §3.14)

| Method | Path | Purpose |
|---|---|---|
| GET / POST | `/bloodbank/donors` | List + create donors |
| GET / PATCH / DELETE | `/bloodbank/donors/{donorId}` | CRUD on one donor |
| GET / POST | `/bloodbank/donors/{donorId}/donations` | List + create donation events |
| GET | `/bloodbank/donations` | List all donations (tenant-scoped) |
| GET | `/bloodbank/units` | List inventory |
| PATCH / DELETE | `/bloodbank/units/{unitId}` | Update status / soft-delete |
| GET | `/bloodbank/stock` | Aggregated counts by bloodGroup + componentType |
| GET / POST | `/bloodbank/requests` | List + create transfusion requests |
| GET / PATCH / DELETE | `/bloodbank/requests/{requestId}` | CRUD on request |
| POST | `/bloodbank/requests/{requestId}/crossmatch` | Perform crossmatch of one unit against the request |
| POST | `/bloodbank/requests/{requestId}/issue` | Issue a compatible unit to the request |

## 5. Workflows

### 5.1 Register donor
1. Blood bank staff opens `/blood-bank` → Donors tab → New Donor.
2. Fill name, QID, phone, bloodGroup, Rh factor, date of birth, consent.
3. Submit → `POST /bloodbank/donors` → 201 with donor UUID.
4. Audit row written (`EntityType = AUDIT`, action = `CREATE_BLOOD_DONOR`).

### 5.2 Record donation
1. Donations tab → New Donation → select donor.
2. Record volume, pre-screen vitals, screening results (HIV / HBV / HCV / syphilis / malaria).
3. If `passedScreening = true`, Lambda auto-creates one `BLOOD_UNIT` with `status = available`, computed expiry (RBC = 42 d, plasma = 1 y, platelets = 5 d).
4. If `passedScreening = false`, unit is created with `status = discarded` + reason.

### 5.3 Transfusion request
1. Doctor in a consultation adds a transfusion order → `POST /bloodbank/requests`.
2. Request appears in blood bank's Requests tab, status `pending`.
3. Blood bank tech reviews required bloodGroup/Rh/component/quantity.

### 5.4 Crossmatch
1. Tech selects a candidate unit from matching inventory.
2. `POST /bloodbank/requests/{requestId}/crossmatch` with `unitId` + result.
3. Compatible units are reserved against the request. Incompatible units stay available.

### 5.5 Issue
1. Once crossmatch passes, tech issues the unit → `POST /bloodbank/requests/{requestId}/issue`.
2. Unit status → `issued`. Request status → `fulfilled` (or `partially_fulfilled`).
3. Audit row records the chain: donor → donation → unit → crossmatch → issue → patient.

## 6. Clinical safety guardrails

- **Expired unit guard:** `issue` route rejects any unit with `expiresAt < now`.
- **ABO/Rh guard:** `crossmatch` route rejects pairs that violate blood-type compatibility (e.g., O- universal donor can go to any; AB+ receives any; others per the standard matrix).
- **Screening guard:** `issue` requires `donation.passedScreening = true`.
- **Audit trail:** every state transition writes an audit row.

## 7. UI (frontend)

`src/app/components/blood-bank/blood-bank.ts` is a tabbed component:
- **Dashboard** — stock by bloodGroup × componentType.
- **Donors** — list, add, edit, deactivate.
- **Donations** — list, add (auto-generates unit).
- **Inventory** — list, filter by bloodGroup / expiry / status.
- **Requests** — list, add, view detail (patient info, crossmatch history).
- **Alerts** — expiring soon (< 7 days), low stock per bloodGroup.

Role-gated at `/blood-bank` by `BLOODBANK_ROLES`.

## 8. Known foot-guns

- Platelet units expire in 5 days — alert at 2 days; discard automatically on expiry (TODO: scheduled Lambda).
- Reserved status is time-limited — if a crossmatched unit isn't issued within 24h, auto-revert to `available` (TODO).
- The `BLOOD_REQUEST` row carries sub-rows (CROSSMATCH, ISSUE) under the same PK — Query by PK to assemble the full history.

## 9. Compliance surface
- HIPAA §164.312(c)(1) — integrity (audit chain of custody).
- PDPPL Art. 9 — audit trail on donor PHI.
- Clinical safety: MOPH blood transfusion guidelines (require full traceability).

## 10. Open questions / future work
- Barcode / RFID integration for unit scanning in inventory.
- Donor eligibility rules (minimum donation interval, age, weight) — currently manual.
- SMS reminder to donors eligible for repeat donation.
- Cross-tenant unit transfer (hospital group with central blood bank).
- Scheduled Lambda to expire units + release reservations.

## 11. References
- `akwadona-cdk/lambda/akwadona-bloodbank/index.js`
- `src/app/components/blood-bank/`
- `src/app/services/bloodbank.service.ts`
- [`20-api-reference.md`](20-api-reference.md) §3.14
- [`03-encryption-and-zero-knowledge.md`](03-encryption-and-zero-knowledge.md)

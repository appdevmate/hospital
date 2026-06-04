# Blood Bank Module

End-to-end blood bank for the Tiryaq hospital app — inventory by blood type, donor registry, donations log, transfusion requests, cross-match, issue. Full clinical workflow.

---

## 1. Roles

- **Admin / Developer** — full access.
- **Pharmacist** — manages inventory, donors, donations, cross-match, issue.
- **Doctor** — submits blood requests, views inventory + own requests.
- **Other authenticated** — read only.

Enforced at API Gateway (JWT auth) and again inside the Lambda router based on `cognito:groups`.

---

## 2. Data model (DynamoDB single-table `Hospital`)

| Entity | PK | SK | EntityType |
| --- | --- | --- | --- |
| Donor | `DONOR#<donorId>` | `PROFILE` | `BB_DONOR` |
| Donation | `DONOR#<donorId>` | `DONATION#<donationId>` | `BB_DONATION` |
| Unit | `BBUNIT#<unitId>` | `PROFILE` | `BB_UNIT` |
| Request | `BBREQ#<requestId>` | `PROFILE` | `BB_REQUEST` |
| Crossmatch | `BBREQ#<requestId>` | `XMATCH#<unitId>` | `BB_CROSSMATCH` |
| Issue | `BBREQ#<requestId>` | `ISSUE#<issueId>` | `BB_ISSUE` |
| Idempotency | `IDEMP#<cid>` | `PROFILE` | `IDEMPOTENCY` |

`dataClass = PHI` on every clinical row. Lookups by status / blood type use `EntityType-index` (filter expression).

Unit lifecycle: `available → reserved → issued → used` plus terminal `discarded` / `expired` / `quarantined`. Reservations expire after ~2 h; the GET /units endpoint lazily flips expired availables and stale reservations.

Request lifecycle: `pending → approved → crossmatched → issued`, with side branches `cancelled` and `rejected`. Issue requires a compatible cross-match on file for every unit.

---

## 3. API routes (`/bloodbank/*`)

```
GET    /bloodbank/donors
POST   /bloodbank/donors                                       (pharm/admin)
GET    /bloodbank/donors/{donorId}
PATCH  /bloodbank/donors/{donorId}                             (pharm/admin)
DELETE /bloodbank/donors/{donorId}                             (pharm/admin)

GET    /bloodbank/donations
GET    /bloodbank/donors/{donorId}/donations
POST   /bloodbank/donors/{donorId}/donations                   (pharm/admin) → creates N BB_UNIT rows

GET    /bloodbank/units?status&bloodType&productType&expiringIn=days
PATCH  /bloodbank/units/{unitId}                               (pharm/admin)
DELETE /bloodbank/units/{unitId}                               (pharm/admin)
GET    /bloodbank/stock                                        per-bloodType+product summary

GET    /bloodbank/requests?status&urgency&patientId
POST   /bloodbank/requests                                     (doctor/admin)
GET    /bloodbank/requests/{requestId}                         (with crossmatches + issues)
PATCH  /bloodbank/requests/{requestId}
DELETE /bloodbank/requests/{requestId}                         frees any reserved units

POST   /bloodbank/requests/{requestId}/crossmatch              (pharm/admin)
POST   /bloodbank/requests/{requestId}/issue                   (pharm/admin)
```

Every mutating call uses Phase D idempotency (`X-Client-Request-Id` → 24 h DynamoDB cache row at `IDEMP#<cid>`).

---

## 4. Compatibility matrix (server-side ABO/Rh check for packed RBC)

```
O-  → O-
O+  → O-, O+
A-  → O-, A-
A+  → O-, O+, A-, A+
B-  → O-, B-
B+  → O-, O+, B-, B+
AB- → O-, A-, B-, AB-
AB+ → universal recipient
```

When a tech adds a cross-match without specifying `compatible`, the server uses this table to set it. The lab can still override (`compatible: false` for incompatibility found despite ABO match — e.g. antibody screen). `aboRhCompatible` is stored alongside `compatible` for audit.

---

## 5. Clinical workflow

1. **Donor signs up** → `POST /bloodbank/donors`.
2. **Pharmacist records donation** → `POST /bloodbank/donors/{id}/donations` with `units` count → N `BB_UNIT` rows created with auto-calculated `expiryDate` (`whole`=35d, `packed-rbc`=42d, `plasma`/`cryo`=365d, `platelets`=5d). Donor stats updated (`lastDonation`, `donationCount`).
3. **Doctor requests blood** → `POST /bloodbank/requests` with patient + blood type + product + units + urgency.
4. **Pharmacist cross-matches** → `POST /bloodbank/requests/{rid}/crossmatch` per candidate unit. Compatible units get `status=reserved`, `reservedUntil=now+2h`, request flips to `crossmatched`.
5. **Pharmacist issues** → `POST /bloodbank/requests/{rid}/issue` with `unitIds[]`. Server verifies every unit has a compatible crossmatch on this request; units flip to `issued`; request flips to `issued`; one `BB_ISSUE` row recorded.
6. **Cancel** at any time → reservations freed, request marked cancelled.

Expiry sweep is lazy — every `GET /units` flips `available` past expiry → `expired` and frees stale reservations.

---

## 6. Frontend

```
src/app/services/bloodbank.service.ts                   typed HTTP client
src/app/components/blood-bank/blood-bank.{ts,html,scss} 4-tab UI:
    1) Stock summary (bloodType × product matrix)
    2) Inventory (units with filters + discard)
    3) Donors (CRUD + record donation)
    4) Requests (CRUD + open detail → cross-match + issue)
```

Route: `/blood-bank`. Guard `BLOODBANK_ROLES = ['admin','developer','doctor','pharmacist']`. Menu entry added for admin/developer/doctor/pharmacist.

Doctors see the "New request" button; only admin/pharmacist see donor + inventory mutations + the cross-match / issue actions inside the detail dialog.

---

## 7. Backend file

`tiryaq-cdk/lambda/tiryaq-bloodbank/index.js` — single Lambda, runtime `nodejs20.x`. Wired in `tiryaq-cdk-stack.ts` (and mirrored to `.js`) as `bloodbankFn`. Granted DynamoDB read/write on `Hospital` and KMS encrypt/decrypt on the data key via the shared `allFunctions` loop.

---

## 8. Idempotency / offline

The full Phase D pattern is inlined at the top of every mutating route:

```js
const cid = getClientRequestId(event);
const cached = await checkIdempotency(cid);
if (cached) return cached;
// ...
await storeIdempotency(cid, response);
return response;
```

This means the Blood Bank module participates in the global offline queue (Phase C) and the temp-id rewrite (Phase F) for free — for example, a doctor can submit a blood request offline, and the queue's replay will dedup against a prior partial submission via the cached idempotency row.

# Akwadona — HMAC-Hashed Search Fields

This document is the canonical reference for **Step 4**: making PHI fields searchable again after Step 3 encrypted them. Equality lookups by QID, email, and phone are restored without ever putting plaintext into DynamoDB partition keys.

---

## The problem Step 4 solves

Step 3 encrypted PHI fields with per-row DEKs and AES-256-GCM. Every encryption uses a fresh IV, so the same plaintext produces different ciphertext each time:

```
"qid": "12345678901"  →  write 1  →  "AQICAHj8Ks..."
                          write 2  →  "AQICAHj8Pl..."
                          write 3  →  "AQICAHj8Qr..."
```

Two side-effects:

- **Equality lookups break.** `WHERE email = 'doctor1@tiryaq.com'` matches nothing because the row stores ciphertext that doesn't match the query string. Doctor login (`getDoctorByEmail`), "find patient by QID", phone uniqueness — all broken.
- **Lock partition keys still leaked PHI.** Pre-Step-4, uniqueness locks were `PK = QID#<plaintext-qid>`. Anyone with DynamoDB read access could enumerate QIDs from the partition key index even without decrypting any row.

Step 4 fixes both with **deterministic per-tenant HMACs** stored alongside the ciphertext.

---

## Architecture

### Per-tenant KMS HMAC keys

Each tenant has a dedicated KMS key of type `HMAC_256`:

| Tenant slug | HMAC key alias | Purpose |
|---|---|---|
| `tiryaq` | `alias/akwadona-tenant-tiryaq-hmac` | Compute HMAC-SHA256 for Tiryaq's lookups |
| `alshifaa` | `alias/akwadona-tenant-alshifaa-hmac` | Compute HMAC-SHA256 for Alshifaa's lookups |

Both keys live in the Akwadona AWS account (`483176634665`), region `us-east-1`. Key spec: `HMAC_256`. Key usage: `Generate and verify MAC`.

### How the MAC is computed

The Lambda never sees the HMAC key. It calls `kms.GenerateMac()`:

```
GenerateMac(KeyId=tenant-hmac-key, MacAlgorithm='HMAC_SHA_256', Message='12345678901')
  → returns 32-byte MAC inside the FIPS-validated HSM
```

The Lambda gets back the MAC (base64 in our code) but never touches the key material. The same input + same KMS key always produces the same MAC, so equality lookups become:

```
emailHash = computeHmac(input_email, callerTenantId)
DDB Query  emailHash-EntityType-index  PK=emailHash  SK=EntityType
```

### What gets hashed

| Entity | Source fields | Stored as |
|---|---|---|
| Patient | qid, email, phone | qidHash, emailHash, phoneHash |
| Doctor | qid, email, phone | qidHash, emailHash, phoneHash |

The encrypted ciphertext (qid, email, phone) stays on the row. The hash fields are added alongside. Hashes are plaintext base64 because they're one-way (can't reverse).

### What changed about locks

| Lock | Before Step 4 | After Step 4 |
|---|---|---|
| QID | `PK = QID#12345678901` | `PK = QID#<HMAC_base64>` |
| Phone | `PK = PHONE#+97455123456` | `PK = PHONE#<HMAC_base64>` |
| Email (doctor) | `PK = EMAIL#doctor1@tiryaq.com` | `PK = EMAIL#<HMAC_base64>` |

Same row content, but the lookup key is the tenant-scoped HMAC. Two consequences:

- **No plaintext PHI in partition keys** — even reading DynamoDB metadata reveals nothing.
- **Tenant-scoped uniqueness** — the same QID can be a patient at Tiryaq AND a (different) patient at Alshifaa simultaneously, because their hashes differ. This matches real-world Qatar healthcare flow where a patient transfers between hospitals.

---

## New GSI

```
indexName:     emailHash-EntityType-index
partitionKey:  emailHash  (S)
sortKey:       EntityType (S)
projection:    ALL
```

Used by `getDoctorByEmail` (and any future "find by email" endpoint). Empty until rows have `emailHash` set.

The legacy `email-index` is now dead — it indexes ciphertext which doesn't match any plaintext lookup. We keep it in CDK for now because removing a GSI requires a CDK redeploy with data migration; it'll be removed in a future cleanup.

---

## Where the security comes from

| Threat | Defence |
|---|---|
| Attacker reads DynamoDB partition keys | All keys are HMACs or opaque IDs — no PHI visible. |
| Attacker reads encrypted PHI columns | They're AES-256-GCM ciphertext, useless without the per-row DEK. |
| Attacker has DynamoDB access AND wants to compute HMACs to brute-force lookups | They need `kms:GenerateMac` on the tenant HMAC key. Key policy whitelists only Lambda execution roles. Human IAM users — including the deploy user — get nothing. |
| Attacker tries dictionary attack on hashes (try all 11-digit QIDs) | They'd need ~100B KMS calls per tenant. At KMS rate limits + $0.03/10K calls = $300K + months of compute, all logged to CloudTrail with the calling principal. Detected immediately. |
| Tiryaq tries to discover if a known QID is registered at Alshifaa | Tiryaq's HMAC of "12345" ≠ Alshifaa's HMAC of "12345" (different keys). Tiryaq cannot generate Alshifaa's hash → cannot probe. |

The hash key cannot be exfiltrated. KMS HMAC keys do not expose key material via any API — only the MAC output ever returns. Even if a Lambda is fully compromised, dropping its IAM role into a different account cannot resurrect the HMAC capability — the key policy's PrincipalArn condition stops working outside the original IAM context.

---

## Item shape after Step 4

```json
{
  "PK":            "DOCTOR#abc-123",
  "SK":            "PROFILE",
  "EntityType":    "DOCTOR",
  "tenantId":      "T_2572fc71",

  "name":          "AQICAH...",        ← Step 3 ciphertext
  "qid":           "AQICAH...",
  "phone":         "AQICAH...",
  "email":         "AQICAH...",
  "licenseNumber": "AQICAH...",

  "qidHash":       "C5KqMz...",        ← Step 4 HMAC, plaintext base64
  "emailHash":     "P3jLw7...",
  "phoneHash":     "fT9xRn...",

  "_kms_dek":      "AQECAH...",        ← Step 3 wrapped DEK
  "_kms_v":        1,

  "createdAt":     "2026-06-15T...",
  "updatedAt":     "2026-06-15T..."
}
```

And the associated locks:

```
PK = "QID#C5KqMz...",       SK = "LOCK",  doctorPK = DOCTOR#abc-123, tenantId = T_2572fc71
PK = "PHONE#fT9xRn...",     SK = "LOCK",  doctorPK = DOCTOR#abc-123, tenantId = T_2572fc71
PK = "EMAIL#P3jLw7...",     SK = "LOCK",  doctorPK = DOCTOR#abc-123, tenantId = T_2572fc71
```

---

## What still uses plaintext lookup

Some lookups remain by plaintext partition key because the field isn't PHI:

- **`tenantId`** — opaque ID, not PHI.
- **`PATIENT#<uuid>`, `DOCTOR#<uuid>`, `APPOINTMENT#<uuid>`** — random UUIDs, not derivable from the patient.
- **`AUDIT#YYYY-MM-DD`** — date partition, not PHI.
- **`COUNTER#PATIENTS#<tenantId>`** — counter row keyed by tenantId.
- **`TENANT#<slug>`** — tenant profile row keyed by slug.

These are operational identifiers, not patient identifiers. Anyone who reads them learns the row exists; they learn nothing about who the patient is.

---

## Cost

| Item | Monthly cost |
|---|---|
| 2 HMAC CMKs × $1 / month | $2 |
| KMS GenerateMac calls at ~1000 req/day | < $1 |
| New GSI storage + write capacity | < $0.50 |
| **Step 4 additional cost** | **~$3 / month for 2 tenants** |

Same scaling as Step 3 — linear per tenant.

---

## Performance

- Each lookup-by-email: + ~10 ms (one KMS GenerateMac call).
- Each create / update of a Patient or Doctor: + ~30 ms (3 GenerateMac calls — QID, email, phone). Parallelisable but currently serial because the hashes are independent.
- LRU cache in `_shared/crypto.js` caps at 5000 entries — repeated lookups for the same value (e.g. the same doctor logging in repeatedly) cost 0 KMS calls.

---

## Compliance mapping

| Standard | Requirement | How Step 4 satisfies it |
|---|---|---|
| **HIPAA** § 164.514(d)(2)(i) | De-identification: removing or obscuring direct identifiers | QID, email, phone never appear in plaintext outside encrypted columns or HMAC hashes. |
| **PDPPL** Art. 8 | Data minimisation | Hash values cannot be reversed; queryability is preserved without storing the plaintext in additional places. |
| **GDPR** Art. 4(5) / Recital 26 | Pseudonymisation | HMAC with a tenant-controlled key meets the EU's "pseudonymised personal data" standard. |
| **NIST 800-66** § 4.7.2 | Audit controls | Every GenerateMac call is logged in CloudTrail with the calling principal. |

---

## Operations

### Adding a new tenant

For every new tenant onboarding (in addition to the Step 2 + Step 3 steps):

1. KMS Console → Create key → **HMAC**, key spec **HMAC_256**, usage **Generate and verify MAC**.
2. Alias: `akwadona-tenant-<slug>-hmac`.
3. Tags: `Product=Akwadona`, `Tenant=<slug>`, `TenantId=T_<id>`, `Purpose=HmacSearchFields`.
4. Apply the standard HMAC key policy (root admin + deploy user management + Lambda role usage).
5. Add the new tenantId → HMAC key ARN to `tenantHmacKeys` in `tiryaq-cdk-stack.ts`.
6. Add the same entry to `scripts/backfill-hash-search-fields.js` `TENANT_HMAC_KEYS`.
7. `cd tiryaq-cdk && npx cdk deploy --require-approval never`.

### Backfilling existing rows

When migrating data created before Step 4:

1. Add temporary `kms:Decrypt` (data keys) and `kms:GenerateMac` (HMAC keys) statements to both key policies for `hospital-deploy-user`.
2. `cd scripts && node backfill-hash-search-fields.js --dry-run`
3. If counts look right: `node backfill-hash-search-fields.js`
4. Remove the temporary policy statements.

The script is self-contained, handles missing-DEK / missing-tenant edge cases, and migrates locks atomically.

### Adding a new searchable field

E.g. you want to add `nationalIdHash` for a non-Qatar passport number:

1. Update `_shared/crypto.js`'s `PATIENT_HASH_FIELDS` and `DOCTOR_HASH_FIELDS`.
2. `node scripts/sync-shared-helpers.js`.
3. (Optional) Add a new GSI in CDK for fast lookup.
4. Re-deploy CDK.
5. Run a focused backfill for that field.

---

## What's NOT searchable

Fields that don't have a hash counterpart cannot be looked up by equality:

- `name` — partial matches don't work with hashing. Free-text search needs a different solution (Elasticsearch, OpenSearch). Out of scope.
- `medicalHistory`, `notes`, `diagnosis` — long-form text, never searchable via hash.
- `dob` — could be hashed if needed (low cardinality risk, but still possible).

For full-text PHI search (e.g. "find all patients with diabetes in their medicalHistory"), the recommended path is a separate **encrypted search index** with a CSE (client-side encryption) library on OpenSearch — out of scope for Step 4.

---

## Verification checklist

1. **DynamoDB Explore items** → query the `emailHash-EntityType-index` with a known emailHash → expect to find the doctor's row. Same query with a random base64 string → expect zero rows.
2. **Add a new doctor in the app** → DDB → confirm `qidHash`, `emailHash`, `phoneHash` are present. Confirm lock rows exist with `PK = QID#<base64>`, no plaintext PHI in any partition key.
3. **Sign out, sign back in as the new doctor** → confirm login works → confirms `getDoctorByEmail` hash lookup is wired.
4. **As `hospital-deploy-user` from CLI:** `aws kms generate-mac --key-id arn:aws:kms:us-east-1:483176634665:key/601f8aab-... --mac-algorithm HMAC_SHA_256 --message "test" --region us-east-1` → expect `AccessDeniedException`. Save the output as Exhibit B in the compliance binder (next to the Step 3 GenerateDataKey denial as Exhibit A).
5. **CloudTrail** → every GenerateMac call is logged with the calling principal. Cross-reference: only Lambda execution role ARNs appear; no human IAM user shows up.

---

## Open follow-ups

- **Backfill scribe / pharmacy / bloodbank PHI hashes** when those Lambdas get full encryption (Task #74).
- **Replace `email-index`** with `emailHash-EntityType-index` everywhere it's still referenced, then drop the legacy index in a coordinated CDK + backfill migration.
- **Step 5** — compliance docs (HIPAA / PDPPL / GDPR + BAA + DPA templates).
- **Step 6** — scalability proof under encryption + HMAC overhead.
- **Future: range-searchable encryption** (e.g. for DOB ranges) — current design only supports equality. Use an ORE library if needed.

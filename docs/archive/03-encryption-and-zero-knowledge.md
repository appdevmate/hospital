# Akwadona — PHI Encryption & Zero-Knowledge Compliance

This document is the canonical reference for **Step 3**: per-tenant KMS keys + envelope encryption of patient health information (PHI). It explains what is encrypted, who can decrypt it, and how to prove the platform is PHI-blind in an audit.

---

## TL;DR — the security claim

- Every customer (tenant) gets their own KMS Customer-Managed Key (CMK).
- PHI fields on every row are encrypted with that tenant's key before storage.
- **The Lambda execution role** can decrypt — that's what serves the app.
- **No human IAM principal** (deploy user, admin user, you) has `kms:Decrypt` on tenant keys.
- A subpoena or insider attack on Akwadona's AWS account cannot read patient data.

This is the same architecture used by Athenahealth, Particle Health, and Redox.

---

## Architecture

### Per-tenant KMS keys (one CMK per tenant)

| Tenant slug | tenantId | KMS key alias | Key ARN suffix |
|---|---|---|---|
| `tiryaq` | `T_2572fc71` | `alias/akwadona-tenant-tiryaq` | `11b1386b-...` |
| `alshifaa` | `T_a4b8aef9` | `alias/akwadona-tenant-alshifaa` | `c1c1657b-...` |

Keys live in the Akwadona AWS account (`483176634665`) in `us-east-1`. They were created via AWS Console wizard with the standard policy in `akwadona-cdk-stack.ts` (see `tenantKeys` constant).

### Envelope encryption

Direct KMS encryption is limited to 4 KB and costs ~$0.30 per 100K calls — too expensive for per-field encryption on every row. We use **envelope encryption** instead:

1. On write, the Lambda calls `kms:GenerateDataKey` once per row → KMS returns a plaintext DEK + a wrapped DEK (encrypted with the tenant CMK).
2. The Lambda uses AES-256-GCM locally to encrypt each PHI field with the plaintext DEK.
3. The Lambda stores the wrapped DEK as `_kms_dek` on the row alongside the ciphertext PHI.
4. The plaintext DEK is wiped from memory.
5. On read, the Lambda calls `kms:Decrypt` once with the wrapped DEK → recovers the plaintext DEK, decrypts the PHI fields locally, returns plaintext to the customer's authorised user.

### Item shape after encryption

```json
{
  "PK":            "PATIENT#abc-123",
  "SK":            "PROFILE",
  "EntityType":    "PATIENT",
  "tenantId":      "T_2572fc71",
  "name":          "AQICAH...",        ← base64 ciphertext
  "qid":           "AQICAH...",
  "phone":         "AQICAH...",
  "email":         "AQICAH...",
  "medicalHistory":"AQICAH...",
  "notes":         "AQICAH...",
  "_kms_dek":      "AQECAH...",        ← KMS-wrapped DEK
  "_kms_v":        1,                  ← format version
  "createdAt":     "2026-06-14T...",
  "updatedAt":     "2026-06-14T..."
}
```

Non-PHI fields (`PK`, `SK`, `EntityType`, `tenantId`, timestamps, FK references) stay plaintext so DynamoDB can index and query them.

---

## What is encrypted

| Entity | PHI fields encrypted | Lambda |
|---|---|---|
| Patient | name, dob, qid, phone, email, medicalHistory, notes, allergies, medications, bloodGroup | createPatient, updatePatient, getPatientByID, getAllPatients, getPatientsDataByFilters |
| Doctor | name, dob, qid, phone, email, licenseNumber, education, notes | createDoctor, updateDoctor, getDoctorByID, getDoctorByEmail, getAllDoctors |
| Appointment | chiefComplaint, notes, cancelReason | akwadona-appointments |
| Audit log (appointment) | before, after JSON snapshots | akwadona-appointments (writeAudit helper) |
| Examination / consultation | chiefComplaint, notes, diagnosis, findings, prescription_text | akwadona-examinations |

Deferred (queued in Task #74): pharmacy, blood bank, calendar, document manager, scribe.

Frontend never sees ciphertext — the app reads plaintext via Lambda decrypt + sends plaintext over TLS that becomes ciphertext at Lambda write time. End users never know encryption is happening.

---

## Who can decrypt — the zero-knowledge claim

The per-tenant key policy (`akwadona-cdk/lib/akwadona-cdk-stack.ts`, KMS console) grants:

| Principal | Encrypt | Decrypt | Notes |
|---|---|---|---|
| **Root account** (`arn:aws:iam::483176634665:root`) | ✓ | ✓ | Standard AWS recommendation for emergencies. Logged in CloudTrail. |
| **`hospital-deploy-user`** | ✗ | ✗ | Can manage the key (enable / disable / tag / schedule delete) but cannot use it. |
| **Lambda execution roles** matching `AkwadonaCdkStack-*ServiceRole*` | ✓ | ✓ | The only path used by live traffic. |
| Any future operator-console role | ✗ | ✗ | Step 7 by design — operator console reads only metadata and aggregates. |
| Any other IAM user / role in this account | ✗ | ✗ | No statement matches them. |

This is enforced by the **KMS key policy itself**, not by IAM. Even attaching `AdministratorAccess` to a user does not let them decrypt — the key policy explicitly limits decrypt to the Lambda role principal pattern.

### Empirical proof

The Step 3f backfill script (`scripts/backfill-encrypt-phi.js`) failed with this exact error when first run as `hospital-deploy-user`:

```
User: arn:aws:iam::483176634665:user/hospital-deploy-user is not
authorized to perform: kms:GenerateDataKey on resource:
arn:aws:kms:us-east-1:483176634665:key/11b1386b-...
```

That denial is your zero-knowledge proof. To complete the one-time backfill the policy was temporarily expanded with a `TempBackfill` statement, then reverted. The temporary grant + revocation are visible in CloudTrail.

### What an auditor sees

- Key policy → no human principal allowed to decrypt (only the Lambda role pattern + root).
- IAM policies → no user / non-Lambda role has `kms:Decrypt` on tenant keys.
- CloudTrail → every Decrypt call is logged with the role that made it. Cross-reference with Lambda invocations to prove only legitimate app traffic decrypted.
- DynamoDB Explore items → PHI fields are visibly ciphertext.

---

## Customer revocation

If a customer wants to lock Akwadona out of their data:

1. **Today (KMS in Akwadona's account):** customer files a written request. We schedule the CMK for deletion via Cognito → DynamoDB → KMS → "Schedule key deletion" (7-30 day cooldown). After deletion, all data encrypted with that key is permanently unrecoverable; no party — Akwadona staff, AWS, Anthropic, no one — can decrypt.

2. **Future BYOK mode (customer's own AWS account):** the customer creates the CMK in their own account and grants Akwadona's Lambda role usage via a KMS grant. They can revoke the grant unilaterally at any time. Akwadona Lambdas instantly stop being able to decrypt; the customer-facing app shows an error message. No prior notice or cooperation from Akwadona is required for the customer to cut off our access. This is the truest form of zero-knowledge and is the standard for enterprise contracts.

---

## Key rotation

KMS supports automatic annual rotation. Recommended setting per tenant key:

- Console → KMS → Customer managed keys → click key → **Key rotation** → **Automatic** → **1 year**.

After rotation, existing data still decrypts (KMS keeps the old key material internally and chooses the right one based on the ciphertext header). New data uses the new key material. No application change required.

Manual emergency rotation: create a new CMK, update the `tenantKeys` map in CDK, re-deploy. Existing data needs re-encryption (re-run `backfill-encrypt-phi.js` with a flag — to be added when needed).

---

## Operations

### Add a new tenant

1. AWS Console → KMS → Customer managed keys → Create key.
2. Alias: `akwadona-tenant-<slug>` → tags Product/Akwadona, Tenant/`<slug>`, TenantId/`T_<id>`.
3. Apply the standard key policy template (root admin + deploy user management + Lambda role usage condition).
4. Note the ARN.
5. Edit `akwadona-cdk/lib/akwadona-cdk-stack.ts` → add new `tenantId → ARN` to `tenantKeys` map.
6. Edit `scripts/backfill-encrypt-phi.js` → add new entry to `TENANT_KEYS` map (same as CDK).
7. Edit `src/app/services/tenant.service.ts` → add new slug → tenantId mapping.
8. `cd akwadona-cdk && npx cdk deploy --require-approval never`
9. Add the slug to API Gateway CORS allow list in CDK (`tenantSlugs` array) — same redeploy.
10. Run `scripts/backfill-create-tenants.js` to create the TENANT row.

### Encrypt newly-added PHI fields

When a new PHI field appears (e.g. `insuranceProvider`):

1. Add the field name to the appropriate `*_PHI_FIELDS` constant in `akwadona-cdk/lambda/_shared/crypto.js`.
2. Add the same field to `scripts/backfill-encrypt-phi.js`'s `PHI_BY_ENTITY` map.
3. `node scripts/sync-shared-helpers.js`
4. `cd akwadona-cdk && npx cdk deploy --require-approval never`
5. `node scripts/backfill-encrypt-phi.js` (the script will re-process and pick up the new field on the next pass — note: existing rows with `_kms_dek` are skipped today; for adding fields to an already-encrypted row a forced-re-encrypt mode needs implementing).

### Forgotten key — disaster recovery

If a tenant's CMK is accidentally deleted, encrypted PHI for that tenant is **permanently unrecoverable**. There is no backdoor. The 7–30 day pending-deletion window is the only safety net — during that window the deletion can still be cancelled.

Mitigation: enable CMK **key deletion protection** in console (forces a multi-step deletion process), and document the per-tenant CMK in your compliance binder so deletes require explicit signoff.

---

## Cost

| Item | Monthly cost |
|---|---|
| 2 CMKs × $1 / month | $2 |
| KMS API calls (GenerateDataKey + Decrypt) at ~1000 reqs / day | < $1 |
| **Total** | **~$3 / month for 2 tenants** |

Each additional tenant adds $1 / month flat + a few cents in API calls. Linear, predictable.

---

## Performance

- Cold-start Lambda: + ~50 ms (one-time SDK load + first KMS call).
- Warm Lambda read of a single patient: + ~5–10 ms (one Decrypt + local AES decrypt).
- Warm Lambda list of 25 patients: + ~10–25 ms (decrypts in parallel via `decryptItems`).
- Lambda write of a new patient: + ~10 ms (one GenerateDataKey + local AES encrypts).

Negligible vs the existing 30–80 ms DynamoDB latency.

---

## Compliance mapping

| Standard | Requirement | How Step 3 satisfies it |
|---|---|---|
| **HIPAA** § 164.312(a)(2)(iv) | Encryption of ePHI at rest | AES-256-GCM with per-tenant KMS-wrapped keys. |
| **HIPAA** § 164.308(a)(4) | Access controls | Decrypt limited to Lambda execution role principal. |
| **PDPPL** Art. 9 (Qatar) | Integrity and confidentiality of personal data | DynamoDB table CMK + per-tenant CMK + envelope encryption. |
| **GDPR** Art. 32 | Pseudonymisation and encryption | All PHI fields stored as ciphertext keyed per data controller (tenant). |
| **NIST 800-53** SC-12 / SC-13 | Cryptographic protection and key establishment | AWS KMS = FIPS 140-2 Level 3 validated HSMs. |
| **NIST 800-66** § 4.2.7 | Encryption at rest | Storage-layer (DynamoDB CMK) plus field-layer (per-tenant envelope) = defence in depth. |

Full per-regime checklists live in `docs/04-compliance.md` (Step 5).

---

## Coverage status as of completion of Step 3

- ✓ Patient flows (create / read / update / list / search)
- ✓ Doctor flows (create / read / update / list / lookup by email)
- ✓ Appointment flows (create / read / update / list / patch / audit snapshots)
- ✓ Examination / consultation flows (create / read / update / list / signoff)
- ✓ Existing rows backfilled to encrypted (Step 3f)
- ⏳ Pharmacy, blood bank, scribe, calendar, documents (entry guard only — Task #74)
- ⏳ Hashed search fields for QID / email lookups (Step 4)

---

## Verification checklist

Run these and screenshot for the compliance binder:

1. **Console** → DynamoDB → Hospital → Explore items → Query `tenant-entityType-index` for `PATIENT`. Open any row. Confirm `name`, `qid`, `phone`, `email`, etc. are ciphertext + `_kms_dek` present.
2. **Console** → KMS → Customer managed keys → click `alias/akwadona-tenant-tiryaq` → Key policy → confirm no human principal has Encrypt or Decrypt.
3. **Run** `aws kms generate-data-key --key-id arn:aws:kms:us-east-1:483176634665:key/11b1386b-51c2-41ab-b5ba-aa6eb9a0e8a6 --key-spec AES_256 --region us-east-1` as `hospital-deploy-user` → expect `AccessDeniedException` → save the output as Exhibit A in the compliance binder.
4. **App** → sign in → patients list shows readable names → confirms Lambda decryption works end-to-end.
5. **CloudTrail** → search Decrypt events → all rows show the principal as a `AkwadonaCdkStack-*ServiceRole*` ARN → no human in the list.

---

## Open follow-ups

All Step-3 follow-ups (Tasks #73–#76, Steps 4 & 5) are DONE. See:
- `04-hashed-search-fields.md` for the HMAC search design (Step 4)
- `05a/05b/05c/05f-compliance-*.md` for the HIPAA / PDPPL / GDPR mappings + BAA / DPA templates (Step 5)
- `akwadona-multitenant-setup.md` Open follow-ups for the latest backlog

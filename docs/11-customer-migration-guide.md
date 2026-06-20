# Customer Data Migration Guide

How a brand-new hospital (let's call them "City Hospital") brings their existing patient + doctor + appointment data into Akwadona. The same path used by Athenahealth, Epic on AWS, and Cerner's cloud onboarding kits.

## When this is needed

- A hospital signs up that already has records in another system (paper, Excel, an old EMR, a competitor SaaS).
- Without migration, they'd have to retype everything by hand. With migration, they upload a CSV, we import it once, they're live.

## What this guide covers

- Operator side (you): provision the tenant, run the import script, hand back a report.
- Customer side (the hospital): fill the templates, upload securely.

## High-level flow (5 steps)

1. **Operator provisions tenant.** Slug + per-tenant KMS data key + HMAC key + Cognito users for admin / doctors. ~30 minutes.
2. **Customer downloads templates.** Three CSVs: patients, doctors, appointments. Plain English column headers.
3. **Customer fills + uploads.** They upload to a one-time signed S3 URL we email them. No FTP, no email attachments.
4. **Operator runs the import script.** `scripts/import-tenant-data.js <slug> <s3-key>`. PHI is encrypted with the tenant's KMS key before the first DynamoDB write. Search fields (email, QID, phone) are HMAC'd.
5. **Operator emails a report.** Imported counts + any rows that failed validation. Customer signs off → migration done.

## Step 1 — Operator provisions the tenant

What huge SaaS does: Athenahealth has a 1-day "tenant provisioning" SLA. We're at ~30 minutes of manual work today.

1. AWS Console → KMS → create two new symmetric keys: one for data encryption, one for HMAC. Tag them `tenant=<slug>`.
2. Update `tiryaq-cdk/lib/tiryaq-cdk-stack.ts`:
   - Add the new tenant ID + KMS ARN to `tenantKeys`.
   - Add the new tenant ID + HMAC ARN to `tenantHmacKeys`.
3. Run `scripts/seed-tenants.ps1` (or extend it to take a new slug as parameter).
4. AWS Console → Cognito → User Pool → create admin user with `custom:tenantId` = `T_xxxxx`. Add to `Admin` Cognito group.
5. CloudFront alternate domain: register `<slug>.akwadona.com` and add a CNAME in GoDaddy DNS.
6. `npx cdk deploy --require-approval never`.

## Step 2 — Customer downloads templates

Templates live at `scripts/migration-templates/`:

- `patients.csv` — one row per patient.
- `doctors.csv` — one row per doctor.
- `appointments.csv` — one row per existing appointment (future or recent past).

Each template has column headers in plain English (no codes, no jargon) and a comment line explaining the format.

## Step 3 — Customer uploads via signed S3 URL

We generate a one-time, time-limited signed URL with `aws s3 presign`:

```powershell
aws s3 presign s3://akwadona-migration-uploads/<slug>/patients.csv --expires-in 3600
```

We email that URL to the customer. They use it once to upload (no AWS account, no FTP). URL expires in 1 hour.

The customer can re-request if they need more time.

## Step 4 — Operator runs the import

```powershell
cd "C:\Users\Sami Toufic Taha\Desktop\aws apps\hospital"
node scripts/import-tenant-data.js <slug> patients   --apply
node scripts/import-tenant-data.js <slug> doctors    --apply
node scripts/import-tenant-data.js <slug> appointments --apply
```

What the script does for each row (in order):
1. Validate required fields. Skip + log row to error list if invalid.
2. For PHI fields (name, DOB, address, diagnosis, notes): encrypt with the tenant's KMS data key (envelope encryption — Step 3 pattern).
3. For searchable fields (email, QID, phone): HMAC with the tenant's KMS HMAC key (Step 4 pattern).
4. Write the row to DynamoDB with the right `PK`, `SK`, `EntityType`, `tenantId`.
5. For doctors: also create a Cognito user invitation (optional, can be deferred).
6. Print progress every 100 rows.

Run without `--apply` first for a dry-run that validates the CSV and reports issues without writing anything.

## Step 5 — Operator emails the report

The script writes `migration-report-<slug>-<timestamp>.json`:

```json
{
  "tenant": "city-hospital",
  "tenantId": "T_abcdef12",
  "startedAt": "2026-07-01T10:00:00Z",
  "finishedAt": "2026-07-01T10:08:43Z",
  "patients":     { "imported": 4287, "skipped": 12 },
  "doctors":      { "imported":   65, "skipped":  0 },
  "appointments": { "imported": 1903, "skipped":  4 },
  "errors": [
    { "file": "patients.csv", "row": 91,   "error": "missing required field: dateOfBirth" },
    { "file": "patients.csv", "row": 1108, "error": "invalid email format: ahmed@@gmail.com" }
  ]
}
```

Email this to the customer's admin. They fix any error rows in the source CSV → we re-run only the failed rows.

## Security guarantees during migration

- **In transit:** customer uploads via HTTPS (S3 signed URL). No FTP, no email attachments.
- **At rest in S3:** the upload bucket has SSE-KMS encryption with `akwadona-migration-key`. Only the import Lambda can read.
- **After import:** the source CSV in S3 is deleted by the script after a successful run. Optional: we can keep it 30 days as customer evidence.
- **At rest in DynamoDB:** PHI is envelope-encrypted with the tenant's KMS data key. Search fields are HMAC'd with the tenant's HMAC key.
- **Audit:** every imported row writes a `MIGRATION_IMPORT` audit row with the actor (operator email) and the source row number. HIPAA-compliant.
- **What we (Akwadona staff) can see during the import:** the CSV row text (briefly, in Lambda memory) only. After the row is encrypted + written, we can no longer read it.

## Customer Q&A

| Question | Answer |
|---|---|
| What format? | CSV (Excel can export to it). FHIR / HL7 JSON support — future. |
| Where do I upload? | The signed S3 URL we email you. One-click upload, no AWS account needed. |
| What about photos / scans? | After migration of records, you upload documents through the normal Documents page in the app. |
| Can we test first? | Yes — we run a dry-run that validates everything and gives you a report. No data is written until you say go. |
| How long does it take? | A few minutes per 10,000 rows (DynamoDB write throughput is the limit). 100k patients ≈ 30 min. |
| What if a row fails? | The report tells you exactly which row + why. Fix in the source CSV, we re-run only that row. |
| Can we cancel? | Until we run `--apply`, nothing has been written. After: we can soft-delete imported rows up to 24 h later. |

## Template — `patients.csv`

```csv
patientId,name,dateOfBirth,gender,qid,email,phone,address,emergencyContact,emergencyPhone,insurance,bloodType,allergies,chronicConditions
P-001,Ahmed Al-Khalifa,1985-03-15,male,28503151234567,ahmed@example.com,+97455123456,"Doha, Al Sadd",Fatima Al-Khalifa,+97455123457,Hamad,O+,Penicillin,Diabetes II
```

Notes:
- `patientId` is your internal ID — we keep it as `legacyPatientId` for reference but generate a new Akwadona `PK`.
- `dateOfBirth` format: `YYYY-MM-DD`.
- `gender`: `male`, `female`, `other`.
- `qid` (Qatar ID): 11 digits.
- `allergies` + `chronicConditions`: comma-separated within the cell (quote the cell).

## Template — `doctors.csv`

```csv
legacyDoctorId,name,email,phone,specialization,department,licenseNumber
D-001,Dr Layla Hassan,layla.hassan@example.com,+97455999111,Cardiology,Cardiology,QA-12345
```

Notes:
- `email` becomes the Cognito username (we send them an invite email).
- `specialization` + `department` must match values that already exist in the tenant's lookup tables. If not, the script logs them as "new" and you confirm before creating.

## Template — `appointments.csv`

```csv
legacyAppointmentId,legacyPatientId,legacyDoctorId,date,startTime,endTime,visitType,priority,status,notes
A-001,P-001,D-001,2026-07-10,09:00,09:30,scheduled,routine,scheduled,"Follow-up for diabetes review"
```

Notes:
- We resolve `legacyPatientId` and `legacyDoctorId` to the Akwadona UUIDs via the lookup the script builds during the patient + doctor imports.
- `date` format: `YYYY-MM-DD`. Times: `HH:mm` (24 h).
- `visitType`: `walk-in` / `scheduled` / `emergency` / `referral` / `follow-up` / `check-up`.
- `priority`: `routine` / `urgent` / `emergency`.

## What huge SaaS does (precedent)

- **Athenahealth:** offers a self-service CSV import + a paid "white-glove" migration service for hospitals with >100k records.
- **Epic on AWS:** has a dedicated migration team for every new hospital — they accept CSV, HL7, FHIR, or direct database access. Pricing: separate line item on the contract.
- **Cerner Cloud:** uses a standardized FHIR-based migration protocol they call "Cerner Bridge".
- **Stripe Connect** (different vertical, same pattern): customers upload CSV → import Lambda creates Stripe accounts + records → email confirmation.

Akwadona's path matches the standard: CSV first, FHIR / HL7 later when a customer needs it.

## Done criteria

Migration is complete when:
1. Every row from the customer's CSVs is either imported or in the error list.
2. The customer signs off on the report.
3. The audit log contains a `MIGRATION_COMPLETE` row for the tenant.
4. Customer logs in to Akwadona and sees their data.

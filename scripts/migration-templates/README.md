# Akwadona Migration Templates

Three CSV templates the customer hospital fills out before we import their existing data into Akwadona.

## Files in this folder

- `patients.csv` — one row per patient.
- `doctors.csv` — one row per doctor.
- `appointments.csv` — one row per existing appointment.

## How to use

1. Open each file in Excel or any spreadsheet.
2. Replace the example rows with your real data.
3. Save each file as CSV (UTF-8 encoded).
4. Upload via the secure S3 link Akwadona emails you.

## Order matters

When the operator imports, the order is:
1. `patients.csv` — creates patient records and a `legacyPatientId → newPatientId` map.
2. `doctors.csv` — creates doctor records and a `legacyDoctorId → newDoctorId` map.
3. `appointments.csv` — uses the two maps above to link each appointment to the right patient + doctor.

So make sure your `legacyPatientId` / `legacyDoctorId` values in `appointments.csv` exactly match the IDs you used in the patient + doctor files.

## Format rules

- **Encoding:** UTF-8 (Excel: "Save As" → "CSV UTF-8").
- **Comments:** lines starting with `#` are ignored by the importer. Use them for notes.
- **Quoting:** if a cell contains a comma or a newline, wrap it in double quotes. Example: `"Doha, Al Sadd"`.
- **Dates:** `YYYY-MM-DD` (e.g. `2026-07-10`).
- **Times:** `HH:mm` 24-hour (e.g. `14:30`).
- **Empty cells:** leave blank, do not type "null" or "N/A".

## How to test before going live

The operator runs `import-tenant-data.js` WITHOUT the `--apply` flag first. That's a dry-run: it validates every row and prints a report of what would happen. Nothing is written. You get a chance to fix any issues, then we run with `--apply`.

## What happens to the CSV after import

- The CSV is held temporarily in an encrypted S3 bucket (`akwadona-migration-uploads`).
- After a successful import, the operator deletes the original CSV from S3.
- The data lives in Akwadona's DynamoDB, encrypted with **your hospital's dedicated KMS key**.

See `docs/11-customer-migration-guide.md` for the full operator runbook.

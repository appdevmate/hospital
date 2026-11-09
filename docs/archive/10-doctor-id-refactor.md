# Step C — Doctor ID Refactor (`doctorEmail` → `doctorId`)

## Why we are doing this

- Today, doctors are referenced in several places by their **email address**. If a doctor changes email (marriage, typo at signup, job change), every row that links to the old email becomes orphaned.
- What huge SaaS does: **email is a mutable attribute, never a primary or foreign key.** Stripe uses `cus_xxx` IDs everywhere. Vercel uses `usr_xxx` IDs. GitHub uses immutable user IDs. Email is only ever used for display + search.
- We already have an immutable application UUID for each doctor (`doctorId`), created at signup time. We just need to USE it consistently instead of email.

## What we are changing (and what we are NOT)

| Area | Today | After refactor | Reason |
|---|---|---|---|
| Doctor profile rows | `PK = DOCTOR#<doctorId>` | unchanged | Already correct. |
| Doctor-Patient link rows | `PK = DOCTOR#<email>` | `PK = DOCTOR#<doctorId>` | Email is mutable; UUID is forever. |
| Appointment rows | field `doctorEmail` | field `doctorId` | Same reason. |
| Examination rows | field `doctorEmail` | field `doctorId` | Same reason. |
| `getAllPatients` doctor-scoped query | `DOCTOR#<email>` | `DOCTOR#<doctorId>` | Same reason. |
| Patient HMAC email index (`emailHash`) | HMAC of email | unchanged | This is for "search patients by email" — looking up, not identifying. Stays. |
| Audit log `actorEmail` | email string | unchanged | HIPAA requires audit logs to be UNCHANGED for 6 years. We add a new audit row when email changes, but old rows keep the historical email. |
| Cognito user attribute `email` | the user's email | the user's email | Cognito IS the source of truth for an email address. We mirror it onto the doctor profile row in DynamoDB. |
| Cognito immutable `sub` | available but rarely used | stored on each doctor profile when the doctor is also a Cognito user | Lets us connect Cognito-tied doctors back to their app records. |

## The new identity model in one paragraph

Every doctor has an immutable **`doctorId` (UUID)** generated at create time. That's the foreign key used everywhere inside Akwadona — appointments, examinations, doctor-patient links, etc. If the doctor is also a Cognito user, their Cognito **`sub` (UUID)** is stored as a field on the doctor profile so we can map JWT → doctor record. **Email is just an attribute** — display label, login identifier, search target — never a key.

This matches what Stripe, Vercel, GitHub, Salesforce, and Athenahealth do.

## Migration plan

There is almost no production data yet (per Sami), so the migration is small. The plan still handles all real cases:

### Phase C.2.a — Map old → new for every doctor

1. Scan `Hospital` table for rows where `PK` starts with `DOCTOR#` and `SK = PROFILE`. Each row has `doctorId` (UUID-based PK) and a `email` field.
2. Build a map: `email → doctorId` for every doctor.

### Phase C.2.b — Rewrite the doctor-patient link rows

1. Scan rows where `PK` starts with `DOCTOR#` and `SK` starts with `PATIENT#`.
2. For each row whose PK is `DOCTOR#<email>` (recognisable because it does NOT start with `DOCTOR#<UUID-format>`):
   - Look up the `doctorId` for that email.
   - Write a NEW row at `PK = DOCTOR#<doctorId>`, same SK + attributes.
   - Delete the OLD row.
3. If a row's PK already starts with a UUID, leave it alone.

### Phase C.2.c — Rewrite appointment + examination foreign keys

1. Scan rows where `EntityType IN ('APPOINTMENT', 'EXAMINATION')`.
2. For each row that has a `doctorEmail` field (and no `doctorId` field yet):
   - Look up the `doctorId` for that email.
   - Add `doctorId` to the row. Keep `doctorEmail` for one release cycle as a back-compat field.
3. After Step C.3 (code update), drop the `doctorEmail` field from new writes; old rows are read-only with both fields.

### Phase C.2.d — Verification

- Re-scan to confirm zero rows with `PK = DOCTOR#<email>` (only `DOCTOR#<UUID>` remain).
- Re-scan to confirm every appointment + examination has a `doctorId`.

## Code change list (Phase C.3)

| Lambda | What changes |
|---|---|
| `akwadona-get-all-patients` | Doctor path: query by `DOCTOR#<doctorId>` (resolved from JWT). |
| `akwadona-create-patient` | Doctor-Patient link row: PK = `DOCTOR#<doctorId>`. |
| `akwadona-appointments` | Write `doctorId` field instead of `doctorEmail`. Reads use `doctorId`. |
| `akwadona-examinations` | Same as appointments. |
| `akwadona-admin-panel` | New `PATCH /admin/users/{userId}/email` endpoint (Step C.5). |
| (All others) | No change. |

## Frontend change list (Phase C.4)

- `appointments.service.ts` — send `doctorId` not `doctorEmail` when creating appointments.
- `consultation.service.ts` — same.
- `appointment` UI / `consultation` UI — pass `doctorId` from the doctor list rather than email.
- Doctor profile view stays unchanged (still shows email as a display field).

## Change-Email endpoint (Phase C.5) — what it does after the refactor

Now trivial because no row references email as a key:

1. **Auth check** — only Admin can change emails for users in their own tenant.
2. **Update Cognito** — `AdminUpdateUserAttributes` with new email + `email_verified=true` (admin-confirmed).
3. **Update DynamoDB** — `UPDATE` the doctor profile row's `email` field.
4. **Update `emailHash`** — HMAC the new email with the tenant's HMAC key, write to the search index.
5. **Audit row** — `OPERATOR_CHANGE_USER_EMAIL` with encrypted `before` and `after`.
6. Cognito sends a verification email to the new address by default (configurable).

## Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Some doctor rows have no `doctorId` field at all (legacy) | Low | The migration script must skip them OR generate a new ID — log + alert. |
| Cognito sub vs doctor profile mismatch (doctor exists in Cognito but not in profile rows) | Low | Add a reconciliation report in operator console (future). |
| Appointment / examination rows have `doctorEmail` but no matching doctor profile | Low | Migration script reports orphans; manual cleanup. |
| Frontend uses `doctorEmail` heavily in components | Medium | Phase C.4 does a sweep; build will fail if any caller still passes wrong field. |

## Acceptance criteria

- ✅ Zero DynamoDB rows with `PK` matching `DOCTOR#<anything-not-UUID>`.
- ✅ Every appointment + examination row has a `doctorId` field.
- ✅ Change-Email endpoint changes a doctor's email end-to-end with one POST, no other rows touched (except the audit row).
- ✅ Sign in as a doctor whose email was recently changed → still see only their own patients.

## Order of operations (deploy sequence)

1. **C.2** — Migrate data (idempotent script; safe to re-run).
2. **C.3** — Deploy backend updates. Backend now accepts BOTH `doctorEmail` and `doctorId` for one release (back-compat).
3. **C.4** — Deploy frontend updates. Frontend now sends `doctorId` only.
4. After 7 days — remove back-compat `doctorEmail` read paths in backend.
5. **C.5** — Ship change-email endpoint.

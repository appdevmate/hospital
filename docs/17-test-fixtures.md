# Test fixtures — reusable values for manual testing

Purpose: keep test data identical across teardown/rebuild cycles so we can
compare screenshots + AWS resource names against past runs without confusion.

## Operator user (already seeded)

- Username: `sami`
- Password: `Apps@1234567`
- Email: `sami.t.taha98@gmail.com`
- Name: `Sami`
- `custom:tenantId`: `OPERATOR`
- Cognito group: `Operator`

## Tenant #1 — Tiryaq Hospital (primary demo tenant)

Onboarding wizard values:

Step 1 — Hospital
- Display name: `Tiryaq Hospital`
- URL slug: `tiryaq`
- Country (ISO-2): `QA`
- Contact email: `ops@akwadona.com`

Step 2 — Plan
- Plan tier: `Free` (10 req/s, 100k req/day — matches "testing, not real
  customers" rule; no bill surprises)
- Available options in wizard: `Free`, `Standard` (100 req/s, 1M req/day),
  `Enterprise` (500 req/s, 10M req/day)

Step 3 — Admin (wizard only asks two fields — no explicit username)
- Admin full name: `Tiryaq Admin`
- Admin email:     `sami.t.taha98+tiryaq@gmail.com`
  - Plus-alias so it (a) reaches your Gmail and (b) doesn't collide with the
    operator `sami` email (Cognito enforces email uniqueness across a pool
    when `AliasAttributes` includes email).
- Cognito username: wizard derives it as `admin-<slug>` (e.g. `admin-tiryaq`).
- Password: after onboarding, reset the wizard's random temp password to the
  standard test password `Apps@1234567`:
    `aws cognito-idp admin-set-user-password --user-pool-id <pool> --username admin-tiryaq --password 'Apps@1234567' --permanent`
- Temp password: shown ONCE on the success screen — copy it immediately.
  No email is sent; the operator forwards credentials over a trusted channel
  (standard SaaS practice). If lost, reset via operator console or
  `admin-set-user-password`.
- Sign-in URL shown by wizard: `https://<slug>.akwadona.com/` (fixed — used
  to wrongly show `app.akwadona.com`).

Step 4 — Review
- Verify slug becomes `tiryaq.akwadona.com`
- Verify KMS alias will be `alias/akwadona-tenant-tiryaq`
- Verify DDB rows will use `TENANT#tiryaq` partition
- Click Create

Post-create checks:
- Wizard shows green ticks on: DDB row, KMS CMK, Cognito user, seed row
- `alias/akwadona-tenant-tiryaq` exists in KMS
- Cognito user `admin` created with `custom:tenantId=tiryaq`, status
  `FORCE_CHANGE_PASSWORD`
- First-login email hits sami.t.taha98@gmail.com from
  `noreply@akwadona.com`

## Tenant #2 — Al Shifaa Hospital (secondary tenant, for cross-tenant isolation testing)

Only onboard when specifically testing cross-tenant isolation.

Step 1 — Hospital
- Display name: `Al Shifaa Hospital`
- URL slug: `alshifaa`
- Country (ISO-2): `QA`
- Contact email: `ops@akwadona.com`

Step 3 — Admin
- Admin username: `admin2`
- Admin email: `sami.t.taha98+alshifaa@gmail.com` (Gmail plus-alias, same
  inbox, avoids Cognito email-alias uniqueness collision with Tiryaq admin)
- Admin full name: `Al Shifaa Admin`

## Doctor + Receptionist + Pharmacist test users (per tenant)

Created inside a tenant by the tenant admin (after first-login).

Standard set:
- Doctor:       `doctor1`  / `Apps@1234567` / `sami.t.taha98+doc@gmail.com`
- Receptionist: `recep1`   / `Apps@1234567` / `sami.t.taha98+rec@gmail.com`
- Pharmacist:   `pharma1`  / `Apps@1234567` / `sami.t.taha98+pha@gmail.com`

All plus-aliased so the first-login emails arrive at your Gmail without
collision.

## Sample patient (per tenant, entered by receptionist)

- First name: `Ali`
- Last name: `Hassan`
- National ID: `28812345678` (11 digits, Qatar-style)
- DOB: `1988-05-14`
- Phone: `+974 5555 1234`
- Gender: `Male`
- Address: `Doha, Qatar`

## Sample appointment

- Patient: Ali Hassan
- Doctor: doctor1
- Date: today + 1 day
- Slot: `10:00 - 10:30`
- Reason: `Routine checkup`

## Blood-bank sample bag

- Blood type: `O+`
- Units: `1`
- Collection date: today
- Expiry: today + 42 days
- Donor ID: `DONOR-001`

## Prescription sample (for pharmacy test)

- Drug: `Paracetamol 500 mg`
- Dose: `1 tab`
- Frequency: `TID` (three times per day)
- Duration: `5 days`

---

Notes:
- All values are safe fake data — no real patient identifiers.
- Keep passwords the same across teardown cycles so muscle memory works.
- If Cognito complains about duplicate email during retry, either delete the
  half-created user (`aws cognito-idp admin-delete-user ...`) or use a
  plus-alias like `sami.t.taha98+retry@gmail.com`.

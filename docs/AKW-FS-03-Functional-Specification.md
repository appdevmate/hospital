# Akwadona Hospital Platform — Functional Specification (System of Record)

| Document control | |
|---|---|
| **Document ID** | AKW-FS-03 |
| **Document type** | Functional Specification Document (FSD) — the system of record for what the platform does |
| **Version** | 1.1 |
| **Status** | Approved |
| **Classification** | Confidential — Internal |
| **Owner** | Product |
| **Approver** | Founder |
| **Effective date** | 2026-10-30 |
| **Review cycle** | **Every pull request that changes behaviour must update this document** (rule in `../skills/akwadona-code-standards/SKILL.md`). Full review quarterly. |
| **Supersedes** | `archive/07-operator-console.md`, `archive/15-tenant-onboarding-wizard.md`, `archive/32-blood-bank-module.md`, `archive/13-i18n.md`, `archive/user-roles.md`, `archive/SaaS-Calendar-Guide.md`, `archive/10-doctor-id-refactor.md` (behavioural parts); the five never-written module docs (pharmacy, ScribeFirst, documents, appointments, consultations) |
| **Related documents** | AKW-SAD-02 (how it is built), AKW-ICD-04 (exact API payloads), AKW-SSP-05 (security controls), AKW-EH-10 (how to change it) |

| Revision history | | | |
|---|---|---|---|
| **Version** | **Date** | **Author** | **Change** |
| 1.0 | 2026-10-30 | Platform team | First complete feature inventory, extracted from the Lambda handlers and Angular routes as of the 2026-10-29 change set |
| 1.1 | 2026-10-31 | Platform team | Added "This document answers" and "Abbreviations used in this document" blocks after document control |

## This document answers

1. What does the system do when a user does X — for every module, without reading the code?
2. Which roles exist, which screens can each role open, and what does the server check on top of that?
3. What are the exact business rules: required fields, uniqueness, vital-sign ranges, allergy override, blood compatibility, appointment conflicts, document folders and limits?
4. Which API route performs each operation, and who may call it?
5. What are all the tunable constants (token lifetimes, rate limits, expiry windows, file sizes, shelf lives) and where is each set?
6. What is not built yet (so nobody describes it as present)?
7. How is this document kept current when behaviour changes?

## Abbreviations used in this document

> **Why this table exists.** Every short form that appears anywhere in this document is listed here with (1) what the letters stand for and (2) what it means in plain words. If a term is not here and is not obvious, that is a documentation bug — add it. The complete glossary with examples and console links is AKW-SO-01 Appendix A.

| Abbreviation | Stands for | What it means |
|---|---|---|
| **ABO** | ABO blood group system | The A, B, AB, O blood types. |
| **AES** | Advanced Encryption Standard | The standard symmetric encryption algorithm. "AES-256" uses a 256-bit key. |
| **AI** | Artificial Intelligence | Software that performs tasks that normally need human judgement — here, turning a transcript into a clinical note. |
| **API** | Application Programming Interface | The set of URLs one program calls to use another program's features. Ours is a REST API. |
| **ARN** | Amazon Resource Name | The unique ID string of any AWS resource. |
| **AWS** | Amazon Web Services | Amazon's cloud-computing platform. Everything Akwadona runs on it. |
| **BAA** | Business Associate Agreement | A contract required by the US health-privacy law HIPAA between a hospital and any company (like Akwadona) that handles patient data for it. It says how the data will be protected. |
| **CDK** | Cloud Development Kit | AWS's tool for describing infrastructure in a programming language (we use TypeScript). It compiles to CloudFormation. |
| **CMK** | Customer Managed Key | A KMS encryption key that we create and control (as opposed to one AWS manages for us). |
| **CNAME** | Canonical Name record | A DNS record that says "this name is an alias of that name". |
| **CORS** | Cross-Origin Resource Sharing | The browser rule that decides which websites may call our API. We allow only our own domains. |
| **CRUD** | Create, Read, Update, Delete | The four basic data operations. |
| **CSS** | Cascading Style Sheets | The language that styles web pages. |
| **DDB** | DynamoDB | Short form of DynamoDB, AWS's NoSQL database. |
| **DEK** | Data Encryption Key | The key that actually encrypts a row's fields. A fresh one per row. |
| **DICOM** | Digital Imaging and Communications in Medicine | The standard file format for medical images (X-ray, CT, MRI). |
| **DNS** | Domain Name System | The internet's phone book — turns akwadona.com into a server address. Ours is in Route 53; GoDaddy only holds the registration. |
| **DOB** | Date of Birth | The date a person was born. |
| **EH** | Engineering Handbook | The document-type code for the engineering handbook (AKW-EH-10). |
| **FS** | Functional Specification | The document that describes what the system does — every feature, rule, and setting — without describing how it is built. |
| **FSD** | Functional Specification Document | Same as FS. |
| **GIF** | Graphics Interchange Format | An older image format. |
| **HMAC** | Hash-based Message Authentication Code | A fingerprint of a value computed with a secret key. Same value + same key = same fingerprint; different keys give different fingerprints. We use it to search encrypted fields. |
| **HTTP** | Hypertext Transfer Protocol | The protocol the web uses to move pages and data. |
| **i18n** | internationalisation | Building software so it can show different languages (18 letters between i and n). |
| **IAM** | Identity and Access Management | AWS's permission system: which user or service may do which action on which resource. |
| **ICD** | Interface Control Document / International Classification of Diseases | ICD the document: the exact contract for how one system talks to another (our API). ICD the medical code: a worldwide numbering of diagnoses, e.g. ICD-10. |
| **ISO** | International Organization for Standardization | The body that publishes international standards; ISO 27001 is the information-security one. |
| **IT** | Information Technology | Computers, networks, and software — and the department that runs them. |
| **JPEG** | Joint Photographic Experts Group | A common photo image format. |
| **JSON** | JavaScript Object Notation | The text format our API uses for data. |
| **JWT** | JSON Web Token | A signed digital ID card the browser sends with every request. It names the user, their hospital, and their role. |
| **KMS** | Key Management Service | AWS's vault for encryption keys. Keys never leave it; it encrypts and decrypts on request. |
| **LOINC** | Logical Observation Identifiers Names and Codes | A worldwide code set for lab tests and clinical measurements. |
| **MFA** | Multi-Factor Authentication | Needing two proofs to sign in — a password plus a code from a phone app. |
| **PDF** | Portable Document Format | A fixed-layout document file. |
| **PDPPL** | Personal Data Privacy Protection Law | Qatar's national privacy law (Law No. 13 of 2016). Qatar's equivalent of GDPR. |
| **PHI** | Protected Health Information | Any information that identifies a patient and relates to their health: name, ID number, diagnosis, medication, phone, date of birth. |
| **PITR** | Point-In-Time Recovery | DynamoDB's continuous backup — restore the table to any second in the last 35 days. |
| **PK** | Partition Key | The main lookup key of a DynamoDB row — the "drawer". |
| **PNG** | Portable Network Graphics | A common lossless image format. |
| **PWA** | Progressive Web App | A web app that can be installed like a phone app and work offline. |
| **QA** | Quality Assurance | Testing. |
| **QID** | Qatari ID | The national identity number of a Qatar resident (11 digits). |
| **Rh** | Rhesus factor | The + or − part of a blood type. |
| **RPO** | Recovery Point Objective | How much recent data we may lose in a disaster. Ours: 15 minutes. |
| **RR** | Risk Register | A list of every known risk with a score, an owner, and a plan. |
| **RTL** | Right-to-Left | Text direction for Arabic, Hebrew, Urdu. Our layout flips for these languages. |
| **S3** | Simple Storage Service | AWS file storage — a bucket holds files of any size. |
| **SAD** | Solution Architecture Document | The master technical design document: how the whole system is built, from infrastructure to data to security. |
| **SAML** | Security Assertion Markup Language | An older standard for single sign-on between organisations. On the roadmap for hospitals with their own identity systems. |
| **SES** | Simple Email Service | AWS's service for sending e-mail. |
| **SHA** | Secure Hash Algorithm | A family of one-way hash functions. SHA-256 is the one we use. |
| **SK** | Sort Key | The second part of a DynamoDB key — the "folder inside the drawer". |
| **SMS** | Short Message Service | A text message to a phone. Cognito can send login codes by SMS; we use authenticator apps instead. |
| **SOAP** | Subjective, Objective, Assessment, Plan | The standard four-part structure of a clinical note: what the patient says, what the doctor observes, the diagnosis, and the treatment plan. |
| **SSP** | System Security Plan | The document that lists every security control the system has, how it is implemented, and its status. A NIST-defined document type. |
| **TLS** | Transport Layer Security | The encryption that protects data travelling over the internet — the "S" in HTTPS. |
| **TOTP** | Time-based One-Time Password | The six-digit code from an authenticator app that changes every 30 seconds. |
| **TTL** | Time To Live | A "delete me after this time" marker on a database row. DynamoDB removes expired rows for free. |
| **UI** | User Interface | The screens a person uses. |
| **URL** | Uniform Resource Locator | A web address. |
| **UUID** | Universally Unique Identifier | A random 36-character ID that will never collide. |

**How to use this document.** Every module has the same shape: *Purpose · Who can use it · Screens · Operations · Business rules · Data · Open items.* The **Business rules** tables are the authoritative statement of behaviour — they were read from the code, with the source file named, so a question about "what does the system do when…" is answered here without opening the code. Section 18 is a register of every tunable constant. Section 19 is the maintenance rule.

---

## 1. Introduction

### 1.1 Purpose
To describe, completely and in one place, what the Akwadona platform does: every module, every role, every screen, every operation, every business rule, every setting. This is the document to consult before reading code.

### 1.2 Scope
The production platform as of the 2026-10-29 change set. Behaviour that exists only on the roadmap is listed under **Open items** per module and in AKW-RR-12, never described as present.

### 1.3 Conventions
- **Route** = HTTP method + path on the API (`AKW-ICD-04` has payloads). All routes require a valid JWT; "Roles" column is the additional gate inside the Lambda.
- **Role names** are the Cognito groups: `Admin`, `Developers`, `Doctors`, `Pharmacists`, `Operator`. The Angular app maps them to `admin`, `developer`, `doctor`, `pharmacist`, `operator`.
- **Tenant** = one hospital. Every operation below is implicitly scoped to the caller's tenant; cross-tenant access returns **404**.
- **PHI** (Protected Health Information) fields are encrypted at rest; they are named per module.

---

## 2. Roles and permissions

### 2.1 Role catalogue

| Role | Cognito group | JWT `role` claim | Tenant-scoped? | Typical user |
|---|---|---|---|---|
| Platform operator | `Operator` | `operator` | No — sees all tenants' metadata, **no PHI** | Akwadona staff |
| Hospital administrator | `Admin` | `tenant_user` | Yes | Hospital IT / practice manager |
| Developer | `Developers` | `tenant_user` | Yes | Hospital technical power user |
| Doctor | `Doctors` | `tenant_user` + `doctorId` | Yes — further scoped to own patients | Clinician |
| Pharmacist | `Pharmacists` | `tenant_user` | Yes | Pharmacy staff |
| (no group) | — | `tenant_user` | Yes | Lands on dashboard, no module access — guardrail |

### 2.2 Screen access matrix (from `src/app.routes.ts`)

| Screen (route) | Admin | Developers | Doctors | Pharmacists | Operator |
|---|---|---|---|---|---|
| Dashboard `/` | ✓ | ✓ | ✓ | ✓ | — |
| Patients `/patients-management`, `/patient-profile/:id` | ✓ | ✓ | ✓ (own patients) | — | — |
| Consultation `/consultation/:id`, `/view` | ✓ | ✓ | ✓ | — | — |
| Doctors `/doctors-management` | ✓ | ✓ | — | — | — |
| Appointments `/appointments` | ✓ | ✓ | ✓ | ✓ | — |
| Calendar `/calendar` | ✓ | ✓ | ✓ | ✓ | — |
| Invoices `/invoices` | ✓ | ✓ | ✓ | ✓ | — |
| Pharmacy `/pharmacy` | — | — | — | ✓ | — |
| Blood bank `/blood-bank` | ✓ | ✓ | ✓ | ✓ | — |
| ScribeFirst `/voice-scribe` | — | ✓ | ✓ | — | — |
| Documents `/documents` | ✓ | ✓ | ✓ | — (API: prescriptions + pharmacy-approvals folders) | — |
| Notifications `/notifications`, Profile `/user-profile` | ✓ | ✓ | ✓ | ✓ | — |
| Admin panel `/admin-panel` | ✓ | ✓ | — | — | — |
| Operator console `/operator`, `/operator/onboard` | — | — | — | — | ✓ |

Guard order: `authGuard` (token present, not expired) → `roleGuard(set)` → `operatorGuard`. The back end re-checks every gate; the front end is convenience, not security.

### 2.3 Server-side gates (what the Lambda checks beyond "valid JWT")

| Gate | Where | Passes when |
|---|---|---|
| Tenant assigned | every Lambda `getTenant()` | `tenantId` claim present and ≠ `UNASSIGNED` → else 403 |
| Plan throttle | every Lambda `throttle.precheck()` | under per-minute and daily quota → else 429 |
| Admin | admin-panel, examinations (create), appointments (create) | group ∈ {`Admin`, `Developers`} |
| Admin or operator | 6 reference-data mutations | group ∈ {`Admin`, `Developers`} or `role === 'operator'` |
| Operator | all `/operator/*` | `role === 'operator'` → else 403 |
| Doctor-or-admin | examinations | group ∈ {`Doctors`, `Admin`, `Developers`} |
| Folder access | documents | group ∈ `FOLDER_ACCESS[folder]` (§12) |
| Own-patient scope | patients list for doctors | rows linked via `DOCTOR#<doctorId>` / `PATIENT#…` only |

---

## 3. Authentication and session

**Purpose.** Sign users in against the hospital's own branded screen; carry hospital, role, and doctor identity in a signed token.

**Screens.** `/login`, `/forgot-password` (public). Six languages; RTL for Arabic.

**Operations.**

| Step | Mechanism | Rule |
|---|---|---|
| Sign in | Cognito `InitiateAuth` `USER_PASSWORD_AUTH` from the browser | Username or e-mail; password policy 12+ chars, upper/lower/digit/symbol |
| First login | `NEW_PASSWORD_REQUIRED` challenge | Temporary passwords expire after 3 days |
| MFA | `SOFTWARE_TOKEN_MFA` challenge if the user enrolled an authenticator app | Pool is `OPTIONAL` — nobody is forced (AKW-RR-12 R-03) |
| Forgot password | Cognito `ForgotPassword` → e-mail code via SES from `noreply@akwadona.com` | Only for users who have signed in at least once (`CONFIRMED`); never reveals whether a username exists |
| Token claims | Pre-token Lambda adds `email`, `name`, `tenantId`, `role`, `tenantSlug`, `doctorId` (doctors only) to access **and** ID tokens | Access/ID valid 1 h; refresh 30 d |
| Storage | `accessToken` in `sessionStorage` (tab) and `localStorage` (survive close) | Sent only to the API host and Cognito hosts (`auth.interceptor.ts`) |
| Wrong hospital URL | `tenant.service.ts` compares subdomain to `tenantSlug` claim | User is redirected to their own subdomain |
| Sign out | Tokens cleared client-side | Cognito sessions are not globally revoked on sign-out (operator can `admin-user-global-sign-out`) |

**Business rules (source: `cognito-pre-token-generation/index.js`, `cognito-auth.service.ts`).**

| # | Rule |
|---|---|
| AUTH-1 | A user with no `custom:tenantId` gets `tenantId = UNASSIGNED` and is rejected by every Lambda with 403 — login succeeds, nothing works. Operators have `tenantId = OPERATOR`. |
| AUTH-2 | `doctorId` is resolved by HMAC-hashing the user's e-mail with the tenant key and querying `emailHash-EntityType-index`; falls back to the legacy plaintext `email-index` for doctors created before encryption. If neither matches, no `doctorId` claim → the doctor sees an empty patient list. |
| AUTH-3 | Raw Cognito exception names are never shown; the UI maps a fixed set to translation keys and everything else to "unknown". |
| AUTH-4 | The pre-token Lambda is warmed every 5 minutes; Cognito aborts the trigger at 5 s, which would surface as a 504 on login. |

**Open items.** MFA REQUIRED for Operator/Admin (R-03); SAML federation with hospital identity providers (roadmap).

---

## 4. Patients

**Purpose.** Register and manage patients; the anchor entity for consultations, appointments, prescriptions, documents, payments, and blood requests.

**Who.** Admin, Developers (all patients in the tenant); Doctors (only patients linked to them).

**Screens.** Patients Management (list with search, filters, sort, pagination, soft-deleted view, restore); Patient Profile (demographics, history, allergies, medications, consultations, documents, payments, surgeries).

**Operations.**

| Route | Roles | Behaviour |
|---|---|---|
| `GET /patients` | Admin/Dev: all; Doctor: own | Paginated list. Fast path (no sort, no name/DOB/search filter): DynamoDB cursor. Full path (sort or encrypted-field filter): loads the tenant's patients, decrypts, filters, sorts, offset-slices; `totalCount` exact. |
| `GET /patients/search` | same | Filter-driven search (`getPatientsDataByFilters`) |
| `POST /patients` | Admin/Dev (Doctors on some stacks) | Create with uniqueness locks |
| `GET /patients/{id}` | same | Single profile, decrypted; 404 if another tenant's |
| `PATCH /patients/{id}` | same | Update; re-encrypts with the row's existing DEK |
| `DELETE /patients/{id}` | Admin/Dev | **Soft delete** — sets `deletedAt`; row stays |
| `PATCH /patients/{id}/restore` | Admin/Dev | Clears `deletedAt` |

**Business rules (source: `createPatient/index.js`, `getAllPatients/index.js`, `updatePatient/index.js`).**

| # | Rule |
|---|---|
| PAT-1 | Required on create: `name` (≥ 3 chars), `dob`, `gender`, `phone`, `qid` (exactly 11 digits). |
| PAT-2 | **Uniqueness:** Qatari ID and phone are unique **within the tenant**. Enforced by `QID_LOCK#<HMAC>` and `PHONE_LOCK#<HMAC>` rows written in the same transaction as the profile; a second registration fails with 409. Locks use the HMAC so the plaintext ID never appears in a key and two hospitals can register the same person. |
| PAT-3 | Encrypted fields: `name, dob, qid, phone, email, medicalHistory, notes, allergies, medications, bloodGroup`. Hashed for lookup: `qidHash, emailHash, phoneHash`. |
| PAT-4 | Name search, name filter, DOB range, and free-text search run **after decryption** (these fields are ciphertext in the table). Gender, insurance, status, and deleted-state filters run in DynamoDB. |
| PAT-5 | Allowed sort fields: `name, gender, insurance, status, dob, timestamp`. Unknown sort field is ignored. `pageSize` clamps to 1–100, default 25. |
| PAT-6 | A doctor's list is the set of `DOCTOR#<doctorId>` → `PATIENT#…` link rows, batch-fetched, filtered to the caller's tenant, soft-deleted rows removed, sorted by name. |
| PAT-7 | Soft-deleted patients are hidden by default; `showDeleted=true` lists only deleted ones. Hard delete is operator-assisted (audit retention). |
| PAT-8 | Per-tenant counter `COUNTER#PATIENTS#<tenantId>` gives `totalCount` in O(1) when no filters are set. |
| PAT-9 | Every create/update/delete writes an `AUDIT#` row (actor e-mail, action, timestamp, encrypted before/after). |

**Data.** `PATIENT#<uuid>` / `PROFILE`; lock rows; `DOCTOR#…`/`PATIENT#…` links; `COUNTER#PATIENTS#<tenant>`.

**Open items.** Patient merge; family / guardian links; insurance verification integration.

---

## 5. Doctors and reference data

**Purpose.** Maintain clinician profiles, their departments and specialisations, duty schedule, and the doctor-to-patient assignment used for scoping.

**Who.** Admin, Developers.

**Screens.** Doctors Management (list, filters, sort, create with inline new department/specialisation, edit, delete).

**Operations.**

| Route | Roles | Behaviour |
|---|---|---|
| `GET /doctors`, `GET /doctors/{id}` | tenant | List (same fast/full split as patients) and single |
| `POST /doctors` | Admin/Dev | Create with three uniqueness locks (e-mail, QID, phone) |
| `PATCH /doctors/{id}`, `DELETE /doctors/{id}` | Admin/Dev | Update; soft delete |
| `GET /doctors/email/{email}` | tenant | Lookup via HMAC on `emailHash-EntityType-index` |
| `GET /departments`, `GET /specializations` | tenant | Global reference lists (seeded: 28 departments, 47 specialisations) |
| `POST /departments`, `POST /departments/bulk`, `DELETE /departments` (all) | **Admin / Developers / operator only** (gate added 2026-10-29) | Mutate the **global** list shared by every tenant |
| `POST /specializations`, `POST /specializations/bulk`, `DELETE /specializations` | same | same |

**Business rules (source: `createDoctor/index.js`, `getAllDoctors/index.js`, reference-data Lambdas).**

| # | Rule |
|---|---|
| DOC-1 | Required: name, e-mail, QID (11 digits), phone, department, specialisation. E-mail, QID, phone unique within the tenant (`EMAIL_LOCK`, `QID_LOCK`, `PHONE_LOCK` HMAC rows in one transaction). |
| DOC-2 | Encrypted: `name, dob, qid, phone, email, licenseNumber, education, notes`. Plaintext (filterable in DynamoDB): `gender, insurance, status, department, specialization, experienceYears, experienceMonths, dutyDays, dutyStart, dutyEnd, bloodGroup, hiringDate`. |
| DOC-3 | `dutyDays` (array of weekday names) + `dutyStart`/`dutyEnd` drive appointment validation (APPT-3). |
| DOC-4 | Departments and specialisations are **global** (not per tenant). Deleting all removes them for every hospital — hence the Admin/operator gate. |
| DOC-5 | Creating a doctor also creates the Cognito user in the `Doctors` group (admin-panel path) so the e-mail → `doctorId` link resolves at login. |
| DOC-6 | Sort fields allowed: `name, gender, insurance, department, specialization, status, dob, hiringDate, timestamp, experienceYears, experienceMonths, education, dutyDays, dutyStart, dutyEnd, notes, bloodGroup`. |

**Open items.** Per-tenant departments; doctor leave calendar; licence expiry reminders.

---

## 6. Appointments

**Purpose.** Book and track patient visits against a doctor's duty schedule.

**Who.** Create: Admin/Developers. View/update: all tenant roles. Doctors see their own.

**Screens.** Appointments (list by date/doctor/status, create, status transitions, cancel with reason).

**Operations.** `GET/POST /appointments`, `GET/PATCH/DELETE /appointments/{apptId}`.

**Business rules (source: `akwadona-appointments/index.js`).**

| # | Rule |
|---|---|
| APPT-1 | Statuses: `scheduled → checked-in → in-progress → completed`, or `cancelled`, or `no-show`. `cancelReason` is required when cancelling. |
| APPT-2 | Only administrators (Admin/Developers) can create appointments (403 otherwise). |
| APPT-3 | The doctor must be on duty on that weekday (`dutyDays`), else 400 naming the duty days. |
| APPT-4 | The slot end must be in the future (400 "already passed"). |
| APPT-5 | A doctor may have many appointments per day but **no overlapping intervals**; an overlap returns 409 naming the clashing slot. |
| APPT-6 | `duration` defaults to `endTime − startTime` in minutes, or 30 if not derivable. |
| APPT-7 | Encrypted: `chiefComplaint, notes, cancelReason`. |
| APPT-8 | Idempotent create: `X-Client-Request-Id` is remembered 24 h (`IDEMP#` row) so an offline-queue replay never double-books. |

**Open items.** Patient self-booking; SMS reminders; recurring appointments.

---

## 7. Hospital calendar

**Purpose.** Named calendars (ward, theatre, department) with events, replacing an earlier external calendar SaaS so data stays in-tenant.

**Who.** All tenant roles.

**Operations.** `GET/POST /calendars`, `DELETE /calendars/{id}`, `GET/POST /calendars/{id}/events`, `PATCH/DELETE /calendars/{id}/events/{eventId}`.

**Business rules (source: `akwadona-calendar/index.js`).**

| # | Rule |
|---|---|
| CAL-1 | A calendar needs a `name`. Deleting a calendar is conditional on it existing in the caller's tenant (404 otherwise). |
| CAL-2 | An event needs `name`, `startDate`, `endDate`; optional `recurrence` (stored as given; expansion is client-side). |
| CAL-3 | Events are children of the calendar row (`CALENDAR#<id>` / `EVENT#<id>`), so deleting a calendar orphans none — the Lambda deletes events first. |

---

## 8. Consultations (examinations, SOAP)

**Purpose.** The clinical record of a visit, built section by section and locked on sign-off.

**Who.** Doctors, Admin, Developers (403 for others).

**Screens.** Consultation form (`/consultation/:id`) with tabs: chief complaint, vital signs, diagnosis (ICD lookup), prescriptions, lab tests, radiology, treatment plan, sign-off; read-only view (`/view`).

**Operations.** `GET/POST /examinations`, `GET/PATCH/DELETE /examinations/{examId}`, `POST /examinations/{examId}/signoff`. PATCH carries a `section` name and that section's payload.

**Business rules (source: `akwadona-examinations/index.js` `validateSection`).**

| # | Rule |
|---|---|
| EXAM-1 | Create requires `patientId`, `patientName`, `doctorEmail`. |
| EXAM-2 | A signed-off (`status = completed`) examination is **read-only**; any PATCH returns the error "signed off and is read-only". |
| EXAM-3 | Chief complaint text ≥ 3 characters. |
| EXAM-4 | Vital-sign ranges (reject outside): systolic 50–300 mmHg; diastolic 30–200; heart rate 20–300 bpm; temperature 30–45 °C; weight 0.5–500 kg; height 30–250 cm; SpO₂ 50–100 %; respiratory rate 4–60; pain 0–10. |
| EXAM-5 | Diagnosis requires a chief complaint first; at least one entry; at least one `type = primary`; each needs `icdCode` and `icdDescription`; type ∈ {primary, secondary, differential}. |
| EXAM-6 | Prescriptions, lab tests, radiology, and treatment plan each require at least one diagnosis first. Each prescription needs `medication` and `dose`. |
| EXAM-7 | Sign-off requires at least one diagnosis and one primary diagnosis; sets `status = completed`. |
| EXAM-8 | Prescriptions written here are what the pharmacy dispenses (§10); dispensing sets that prescription's status to `dispensed` on the examination row. |

**Open items.** LOINC-coded lab orders with result ingestion; structured allergy coding; templates per specialty.

---

## 9. ScribeFirst (AI clinical documentation)

**Purpose.** The doctor dictates; the transcript becomes a draft SOAP note (Subjective, Objective, Assessment, Plan) that the doctor reviews and approves.

**Who.** Doctors, Developers.

**Screens.** Voice Scribe (`/voice-scribe`): record → transcript → generate SOAP → edit → approve.

**Operations.** `POST /scribe/sessions`, `GET /scribe/sessions/{id}`, `POST /scribe/sessions/{id}/soap`, `POST /scribe/sessions/{id}/approve`.

**Business rules (source: `akwadona-scribe/index.js`).**

| # | Rule |
|---|---|
| SCR-1 | Speech-to-text happens in the browser; only text reaches the back end. |
| SCR-2 | Transcript must be ≥ 20 characters (400 otherwise). |
| SCR-3 | The model is Claude Haiku 4.5 on Bedrock via the `us.` inference profile, `max_tokens` 2000, with a system prompt that forbids inventing facts and returns empty strings for absent sections. Non-JSON output is an error, never shown as a note. |
| SCR-4 | Session statuses: `CREATED → SOAP_GENERATED → APPROVED`. Approval writes an audit row; nothing is auto-filed into the examination without the doctor's approval. |
| SCR-5 | Patient data sent to Bedrock stays inside AWS; the BAA no-training clause applies. |

**Open items.** Phases 2–4 (ICD suggestions, draft prescriptions wired to pharmacy, patient instructions / referral letters) — designed, not built.

---

## 10. Pharmacy

**Purpose.** Medication catalogue, stock, dispensing against prescriptions with clinical-safety checks, purchase orders, alerts.

**Who.** Pharmacists (screen); API also admits Admin/Developers.

**Screens.** Pharmacy (`/pharmacy`) tabs: Medications, Inventory, Prescriptions, Dispense, Purchase Orders, Alerts.

**Operations.**

| Route | Behaviour |
|---|---|
| `GET/POST /pharmacy/medications`, `PATCH/DELETE /pharmacy/medications/{medId}` | Catalogue CRUD |
| `GET /pharmacy/inventory`, `PATCH /pharmacy/inventory/{medId}` | Stock view with low-stock and expiry flags; stock adjustments |
| `GET/POST /pharmacy/prescriptions`, `GET/PATCH /pharmacy/prescriptions/{rxId}` | Prescriptions awaiting dispense (with allergy warnings pre-computed) |
| `GET/POST /pharmacy/dispense` | Dispense a prescription |
| `GET/POST /pharmacy/purchase-orders`, `GET/PATCH /pharmacy/purchase-orders/{poId}` | Purchase order lifecycle |
| `GET /pharmacy/alerts` | Low stock + expiring |

**Business rules (source: `akwadona-pharmacy/index.js`).**

| # | Rule |
|---|---|
| PH-1 | Medication editable fields: `name, genericName, category, form, strength, unit, packUnit, manufacturer, description, requiresPrescription, reorderPoint` (default reorder point 10). |
| PH-2 | A medication **cannot be deleted while stock > 0** (409 "adjust stock to 0 first"). |
| PH-3 | Stock adjustment types: `received`, `returned` (add); `expired`, `damaged` (subtract); `correction` (signed delta). Stock never goes below 0. Every adjustment is appended to an `adjustments` history on the inventory row; optional `expiryDate` and batch. |
| PH-4 | `isLowStock` = stock ≤ reorder point. Expiry flags computed from `expiryDate` (days until). |
| PH-5 | **Allergy guardrail:** at dispense, the medication name and generic name are matched (case-insensitive substring) against the patient's `allergies`. If any match: (a) first call returns `requiresAllergyConfirmation: true` with the warnings and dispenses nothing; (b) a second call with `allergyOverrideConfirmed: true` **must** include `approvalDocumentKey` — a doctor-approved document uploaded to the `pharmacy-approvals` folder — or it is rejected with 400. The dispense record stores `allergyOverridden: true` and the warnings. |
| PH-6 | Dispense rejects: prescription already `dispensed` (409), `cancelled` (409), insufficient stock (409 naming available vs requested). |
| PH-7 | Successful dispense: decrements stock, writes a `DISPENSE#` row, marks the prescription `dispensed` with `dispensedAt` and `dispenseId` on the examination, and returns `newStock`. |
| PH-8 | Purchase order: `items[]` each with `medId, medName, quantity, unitCost`; status lifecycle `draft → submitted → ordered → partially_received → received`, or `cancelled`. |
| PH-9 | Prescription list pre-computes `allergyWarnings` / `hasAllergyAlert` per row so the UI can flag before the pharmacist clicks dispense. |

**Open items.** Controlled-substance register; barcode scanning; supplier catalogue; automatic reorder.

---

## 11. Blood bank

**Purpose.** Chain of custody from donor to patient: donors, donations with screening, unit inventory, transfusion requests, crossmatch, issue.

**Who.** Admin, Developers, Doctors, Pharmacists.

**Screens.** Blood Bank (`/blood-bank`) tabs: Dashboard (stock by group × product), Donors, Donations, Inventory, Requests, Alerts.

**Operations.**

| Route | Behaviour |
|---|---|
| `GET/POST /bloodbank/donors`, `GET/PATCH/DELETE /bloodbank/donors/{donorId}` | Donor CRUD (consent recorded) |
| `GET/POST /bloodbank/donors/{donorId}/donations`, `GET /bloodbank/donations` | Record a donation; list |
| `GET /bloodbank/units`, `PATCH/DELETE /bloodbank/units/{unitId}`, `GET /bloodbank/stock` | Inventory; status changes; aggregated stock |
| `GET/POST /bloodbank/requests`, `GET/PATCH/DELETE /bloodbank/requests/{requestId}` | Transfusion requests |
| `POST /bloodbank/requests/{requestId}/crossmatch` | Test one unit against the request |
| `POST /bloodbank/requests/{requestId}/issue` | Issue compatible unit(s) |

**Business rules (source: `akwadona-bloodbank/index.js`).**

| # | Rule |
|---|---|
| BB-1 | Product types: `whole, packed-rbc, plasma, platelets, cryo`. |
| BB-2 | Shelf life (days) from collection date: whole 35, packed-rbc 42, plasma 365, platelets 5, cryo 365. `expiryDate = collectionDate + shelf`. |
| BB-3 | A donation that fails screening does not produce an available unit. |
| BB-4 | **ABO/Rh compatibility for red cells** (recipient → acceptable donors): O− ← O−; O+ ← O−,O+; A− ← O−,A−; A+ ← O−,O+,A−,A+; B− ← O−,B−; B+ ← O−,O+,B−,B+; AB− ← O−,A−,B−,AB−; AB+ ← any. Plasma/platelets use the inverse rule in code. |
| BB-5 | Crossmatch records the computed compatibility; the technician may declare the lab result (`compatible: true/false`) which overrides the computed value, and the record keeps both. |
| BB-6 | A compatible crossmatch **reserves** the unit for ~2 hours and moves the request to `crossmatched`; an expired reservation returns the unit to `available`. |
| BB-7 | Issue rejects units that are expired, not `available`/`reserved` for this request, or from a donation that failed screening. Issue sets the unit `issued`, the request `fulfilled` (or `partially_fulfilled`), and writes the custody chain to the audit log. |
| BB-8 | Donor PHI (`name, qid, phone`) is encrypted; `qidHash`/`phoneHash` support lookup. |

**Open items.** Barcode/RFID; donor eligibility interval; scheduled expiry sweep; cross-tenant unit transfer for hospital groups.

---

## 12. Documents

**Purpose.** Secure upload/download of clinical files to the hospital's own area of the documents bucket.

**Who.** Per-folder (table below).

**Screens.** Documents (`/documents`): folder picker, upload, list, download, delete. Also embedded in Patient Profile and Pharmacy (approval upload).

**Operations.** `POST /documents/upload-url`, `POST /documents/download-url`, `GET /documents/list`, `GET /documents/folders`, `DELETE /documents/delete`. Actual bytes go browser ↔ S3 via pre-signed URLs.

**Business rules (source: `akwadona-document-manager/index.js`).**

| # | Rule |
|---|---|
| DOCS-1 | Folders and who may use them: `doctors-documents`, `patients-documents`, `lab-results`, `radiology-images` → Admin, Developers, Doctors; `prescriptions`, `pharmacy-approvals` → those plus Pharmacists. Anything else → 400. |
| DOCS-2 | Allowed types: PDF; JPEG, PNG, GIF, WebP; DICOM (`image/dicom`, `application/dicom`); Word (.doc/.docx); Excel (.xls/.xlsx); plain text. Others → 400. |
| DOCS-3 | Maximum size 50 MB (checked on the declared `fileSize`; S3 enforces on PUT). |
| DOCS-4 | Pre-signed URLs expire in **5 minutes** and are bound to one key; changing the key invalidates the signature. |
| DOCS-5 | Key layout `folder/<tenantId>/<userId>/<timestamp>_<fileName>`. List, download, and delete verify the tenant segment equals the caller's tenant; legacy keys without a tenant segment are admin-only. |
| DOCS-6 | Objects are encrypted with the platform KMS data key (bucket default, since 2026-10-29). |

**Open items.** Virus scanning on upload; document tagging to patient/encounter; retention policies per folder.

---

## 13. Payments and invoices

**Purpose.** Record patient payments and surface invoices.

**Who.** All tenant roles (screens); writes by Admin/Developers.

**Operations.** `GET/POST /patients/{id}/payments`, `GET/PATCH/DELETE /patients/{id}/payments/{paymentId}`, `GET /payments`, `GET /invoices` (per doctor via `doctorEmail-createdAt-index`, or per tenant), `GET /patients/{id}/surgeries`, `GET /surgeries/{id}` (read-only; surgery creation route removed).

**Business rules.** Payments hang off the patient (`PatientID-index`); invoices are derived from payments; all tenant-filtered. No tax, no multi-currency, no gateway integration.

**Open items.** Card/online payment gateway; insurance claims; receipts e-mail.

---

## 14. Dashboard, notifications, user profile

- **Dashboard** — counters (patients, doctors, today's appointments), recent activity. Signals-based, OnPush.
- **Notifications** — in-app list (no push/SMS yet).
- **User profile** — view own claims, change language, change password (Cognito).

---

## 15. Administration panel (tenant admin)

**Purpose.** Hospital-level user and audit management.

**Who.** Admin, Developers (`isAdmin()` in the Lambda).

**Operations (all under `/admin/{proxy+}`).**

| Route | Behaviour |
|---|---|
| `GET /admin/stats` | Tenant counters and activity |
| `GET /admin/users` | Cognito users in this tenant (ListUsers filtered by `custom:tenantId`) |
| `POST /admin/users` | Create a user in a group (also creates the DOCTOR profile when group = Doctors) |
| `POST /admin/users/{username}/disable` · `/enable` | AdminDisableUser / AdminEnableUser |
| `POST /admin/users/{username}/set-password` | AdminSetUserPassword (temporary or permanent) |
| `PATCH /admin/users/{username}/email` | AdminUpdateUserAttributes + refresh of the doctor's `emailHash` (needs `kms:GenerateMac`) |
| `GET /admin/audit` | Tenant audit rows |

**Business rules.** Admins only see and act on users whose `custom:tenantId` equals their own; cross-tenant usernames return 404. Password resets issue a temporary password (3-day validity).

---

## 16. Operator console and tenant onboarding

**Purpose.** Akwadona's own back-office: tenants, plans, usage, users — with no access to clinical data by construction.

**Who.** `Operator` group (`role === 'operator'`). Lives at `www.akwadona.com/operator`.

**Design promise.** PHI-blind and business-data-blind: the Lambda never imports `crypto.js`, has an IAM DENY on every tenant key, and strips PHI-adjacent counters from responses.

### API endpoints (all require `role: operator`)

| Method | Path | Returns |
|--------|------|---------|
| GET | `/operator/tenants` | List of tenants (metadata only). |
| GET | `/operator/tenants/{slug}` | Single tenant profile. |
| GET | `/operator/tenants/{slug}/stats` | Counts: patients, doctors, appointments. |
| GET | `/operator/tenants/{slug}/audit` | Last N audit events (metadata only — PHI snapshots stripped). |
| PATCH | `/operator/tenants/{slug}` | Update name, status, plan, limits, notes. |

Allowed PATCH fields:
- `status` — `active` / `trial` / `suspended`.
- `plan` — `free` / `standard` / `enterprise`.
- `name` — display name.
- `contractStart` — contract start date.
- `notes` — internal operator-only notes.
- `limits.rps` — request rate cap.
- `limits.dailyQuota` — daily request budget.
- `limits.storageGB` — storage cap.
- `limits.maxUploadMB` — single-upload size cap.

Anything else in the request body is silently ignored (allow-list).

### Subdomain routing rules

| User type | Subdomain | Result |
|-----------|-----------|--------|
| Operator | `www.akwadona.com` | Sees Operator Console. |
| Operator | `tiryaq.akwadona.com` | Auto-redirected to `www.akwadona.com/operator`. |
| Tenant user (Tiryaq) | `tiryaq.akwadona.com` | Sees Tiryaq app. |
| Tenant user (Tiryaq) | `alshifaa.akwadona.com` | Signed out + redirected to `tiryaq.akwadona.com`. |
| Tenant user | `www.akwadona.com` | Auto-redirected to their tenant subdomain. |


### 16.1 Tenant onboarding wizard (`/operator/onboard`)

### What gets provisioned per tenant

In one round-trip the backend creates:

1. **KMS data CMK** (`alias/akwadona-tenant-<slug>-data`) — symmetric AES-256, used for PHI envelope encryption.
2. **KMS HMAC CMK** (`alias/akwadona-tenant-<slug>-hmac`) — HMAC_256, used for searchable hashed fields.
3. **TENANT profile row** in DynamoDB (`PK = TENANT#<slug>, SK = PROFILE`) — carries plan, status, contact info, **and the two KMS key ARNs**.
4. **Initial Cognito admin user** with `custom:tenantId = T_<id>`, added to the `Admin` group, permanent temp password.
5. **Audit log entry** (`OPERATOR_CREATE_TENANT`) so the action is forensically traceable.

If any step fails, the partial state is rolled back automatically:

- Cognito user → deleted
- DDB row → marked `status = rolledback` (slug stays reserved until KMS keys finish their 7-day deletion window)
- Both KMS keys → scheduled for deletion (7-day pending window)

### How the operator uses it — step by step

1. Open the operator console at https://www.akwadona.com/operator.
2. Sign in with an account in the `Operator` Cognito group (role claim `operator`).
3. In the **Tenants** panel, click the **+ Onboard** button.
4. The wizard opens at `/operator/onboard`.
5. **Step 1 — Hospital**. Enter:
   - Display name (e.g. "Nabd Hospital")
   - URL slug (auto-formats lowercase, e.g. `nabd`)
   - Country ISO-2 (optional, e.g. `QA`)
   - Contact email (optional, billing/ops contact)
6. **Step 2 — Plan**. Click one of the three plan cards:
   - **Free** — 10 req/s, 100k req/day
   - **Standard** — 100 req/s, 1M req/day
   - **Enterprise** — 500 req/s, 10M req/day
7. **Step 3 — Admin**. The first admin user the customer will sign in as:
   - Full name
   - Email address (becomes the Cognito email alias)
8. **Step 4 — Review**. Confirm the summary and click **Create tenant**.
9. After ~5 seconds you see the green **Tenant created** card showing:
   - Slug and tenantId
   - Both KMS key IDs
   - Admin username (`admin-<slug>`)
   - Admin email
   - **Temporary password** (16 chars)
   - Sign-in URL
10. Click the copy icon next to the temp password.
11. Forward the credentials to the customer **over a trusted channel** — encrypted email, password manager share, or in-person. Not plain chat or SMS.

### How rollback works on partial failure

The wizard provisions in a strict order so the rollback path is deterministic:

```
1. Create data CMK   ──→ fail? nothing to clean
2. Create alias       ──→ fail? schedule data key for deletion
3. Create HMAC CMK    ──→ fail? schedule data key
4. Create alias       ──→ fail? schedule both keys
5. Write TENANT row   ──→ fail? schedule both keys
6. Create Cognito     ──→ fail? mark row rolledback + schedule both keys
7. Set password       ──→ fail? delete Cognito user + mark row rolledback + schedule both keys
8. Add to group       ──→ fail? same as above
9. Audit log          ──→ fail? warn only, do not roll back
```

After rollback, the slug remains "reserved" in DDB with `status = rolledback`. This prevents an instant retry from creating a duplicate key under the same alias while the previous one is in its 7-day pending window. Operator just picks a different slug for the retry.


**Business rules (source: `akwadona-operator-console/index.js`).**

| # | Rule |
|---|---|
| OP-1 | Tenant slug → `tenantId` is deterministic (`T_` + SHA-256 prefix); the wizard refuses a slug that already exists. |
| OP-2 | The wizard creates two KMS keys per tenant tagged `akwadona:tenantId` and `akwadona:purpose` (`data` / `hmac`), with a key policy that admits `AkwadonaCdkStack-*ServiceRole*` and excludes `*Operator*`. ARNs are written to the `TENANT#<slug>` row; Lambdas resolve them at runtime (no redeploy). |
| OP-3 | Rollback on partial failure deletes only what this run created; `ScheduleKeyDeletion` is allowed only on keys carrying the `akwadona:tenantId` tag and is explicitly denied for the live tenants (`T_2572fc71`, `T_a4b8aef9`). |
| OP-4 | Plan (`free` / `standard` / `enterprise` / `enterprise-isolated`) and per-tenant `limits` overrides are set on the TENANT row and take effect within 60 s (throttle profile cache). |
| OP-5 | After onboarding, one manual step remains (DNS is a Route 53 wildcard, no change needed): adding the slug to `tenantSlugs[]` + Cognito callback URLs in the CDK (CORS). |
| OP-6 | Operator user management (list / create / update group / reset password / disable / enable / delete) acts on the shared pool; every action writes an operator audit row. |

**Open items.** Automated DNS (Route 53); per-tenant branding (logo/colours); billing integration; status page.

---

## 17. Cross-cutting behaviour

### 17.1 Internationalisation

### Languages supported today

| Code | Language   | RTL? |
|------|------------|------|
| en   | English    | no  |
| ar   | Arabic     | YES |
| fr   | French     | no  |
| es   | Spanish    | no  |
| de   | German     | no  |
| nl   | Dutch      | no  |

### How a user switches language

Top bar dropdown next to the offline pill. Flag + 2-letter code shown when collapsed. Dropdown reveals all 6 with flag + native name.

Choice persists in `localStorage` (`akw:lang`). Browser reload keeps the same language. RTL toggle (`<html dir="rtl">`) fires automatically for Arabic.

### How the code works

- **`src/assets/i18n/{lang}.json`** — translation files. Hot-loaded by ngx-translate the first time the language is selected.
- **`src/app/services/i18n.service.ts`** — owns the active language. Reactive signal `current()` so components can subscribe.
- **`@ngx-translate/core`** — provides the `| translate` pipe + `TranslateService.instant()` for non-template contexts (menus, toasts).
- **`<html dir="rtl">`** — set by `I18nService` when the active language has `rtl: true`. PrimeNG respects this natively (icons, calendars, table direction).

### How to add a new translation key

1. Open ALL 6 files in `src/assets/i18n/` — `en.json`, `ar.json`, `fr.json`, `es.json`, `de.json`, `nl.json`.
2. Add the same key in each, with the translated value.
3. In the template: `{{ 'your.key.path' | translate }}`.
4. In TypeScript: `this.t.instant('your.key.path')` where `t = inject(TranslateService)`.
5. If a translation is missing in any file, ngx-translate falls back to English silently.

### How to add a new language

1. Pick the ISO 639-1 code (e.g. `pt` for Portuguese, `tr` for Turkish).
2. Copy `src/assets/i18n/en.json` to `src/assets/i18n/<code>.json` and translate.
3. Add the entry to `SUPPORTED_LANGS` in `src/app/services/i18n.service.ts`:
   ```ts
   { code: 'pt', label: 'Português', rtl: false, flag: '🇵🇹' }
   ```
4. Rebuild the frontend and ship.

That's it — the dropdown picks it up automatically, the loader fetches the JSON on demand.

### What's NOT translated today (deliberate)

- Backend error messages — translated client-side via the message key, when we add that pattern.
- Audit log entries — kept in English for regulator readability.

(The login page IS translated — it's a custom Angular component, not the Cognito Hosted UI. The language picker is visible on the login screen itself.)

### RTL specifics for Arabic

- PrimeNG components handle RTL natively via `<html dir="rtl">`.
- Custom CSS uses `:host-context([dir="rtl"])` to flip margins / icons where needed (see topbar `lang-select`).
- Dates / numbers stay in Western digits (1234), not Eastern Arabic digits (١٢٣٤), to match Qatar government standards (PDPPL). Override via `LOCALE_ID` when needed.


### 17.2 Offline and PWA
- The app shell is cached by the Angular service worker; second visits load instantly.
- While offline, mutating requests are queued in IndexedDB (`offline-queue.interceptor.ts`) and replayed on reconnect with the original `X-Client-Request-Id`, so the server's 24-hour idempotency memory prevents duplicates.
- Reads while offline return the last cached response where one exists.

### 17.3 Rate limiting
Two layers: API Gateway stage throttle (200 r/s sustained, 500 burst, all tenants) and the per-tenant plan throttle (§8.2 of AKW-SAD-02). A breach returns 429 with `Retry-After`; the UI shows a translated "slow down" message.

### 17.4 Audit
Every create/update/delete in every module writes an `AUDIT#` row (actor, action, entity, timestamp, encrypted before/after). The admin panel shows the tenant's rows; the operator console shows metadata only. CloudTrail records every AWS-level call independently.

### 17.5 Idempotency
Mutating calls carry `X-Client-Request-Id` (UUID). The Lambda stores the response under `IDEMP#<id>` for 24 h and returns the cached result on a repeat — so a retry, a double-click, or an offline replay never creates twice.

### 17.6 Soft delete
Patients, doctors, units, and most module rows carry `deletedAt`. Lists hide deleted rows by default; restore is a PATCH. Hard deletion is operator-assisted to respect audit retention.

---

## 18. Configuration and constants register

| Setting | Value | Where | Change impact |
|---|---|---|---|
| Access / ID token validity | 1 h | CDK `appClient` | Re-login frequency |
| Refresh token validity | 30 d | CDK `appClient` | "Stay signed in" window |
| Temporary password validity | 3 d | CDK `userPool.passwordPolicy` | Onboarding e-mails |
| Password policy | ≥ 12 chars, upper, lower, digit, symbol | CDK | — |
| MFA | OPTIONAL (TOTP) | CDK `mfa` | R-03 |
| Pre-token warm interval | 5 min | CDK `PreTokenWarmerRule` | Login 504 risk |
| API stage throttle | 200 r/s, 500 burst | CDK `defaultRouteSettings` | Platform-wide ceiling |
| Plan limits | free 10 r/s · standard 100 · enterprise 500; daily 100k · 1M · 10M | `_shared/plan-defaults.js` | Per-tenant 429s |
| Throttle profile cache | 60 s | `_shared/throttle.js` | Plan-change latency |
| Idempotency memory | 24 h | module Lambdas (`IDEMP#`, `expiresAt`) | Replay safety |
| DEK cache | 5 min, 2,000 entries, 32 parallel decrypts | `_shared/crypto.js` | KMS cost vs memory |
| HMAC cache | in-memory, bounded | `_shared/crypto.js` | — |
| Page size | default 25, max 100 | list Lambdas | — |
| Full-load ceiling (sorted/searched lists) | 20,000 rows | `getAllPatients`, `getAllDoctors` | Large-tenant safety valve |
| Document URL expiry | 5 min | `akwadona-document-manager` | — |
| Document max size | 50 MB | same | — |
| Allowed document folders / types | §12 | same | — |
| Medication default reorder point | 10 | `akwadona-pharmacy` | Low-stock alerts |
| Blood shelf life | whole 35 d · packed-rbc 42 · plasma 365 · platelets 5 · cryo 365 | `akwadona-bloodbank` | Expiry flags |
| Crossmatch reservation | ~2 h | `akwadona-bloodbank` | Unit availability |
| Appointment default duration | 30 min | `akwadona-appointments` | — |
| Bedrock model / max tokens | `us.anthropic.claude-haiku-4-5-20251001-v1:0` / 2000 | CDK env `BEDROCK_MODEL_ID`, scribe Lambda | SOAP length |
| Scribe minimum transcript | 20 chars | scribe Lambda | — |
| Lambda memory / timeout | 512 MB / 30 s (seed & users: 5 min; pre-token: 10 s) | CDK `fn()` | Cold start vs cost |
| DynamoDB TTL attribute | `expiresAt` (epoch s) | CDK | Counters, idempotency |
| PITR | 35 d | CDK | RPO |
| Audit retention | 7 y Object Lock | CDK | Compliance |
| Frontend non-current versions | 180 d | CDK | Rollback window |
| CloudFront TLS floor | TLS 1.2 (2021) | CDK | Old clients |
| Languages | en, ar, fr, es, hi, ur | `src/assets/i18n/` | — |
| Seed reference data | 28 departments, 47 specialisations, 8 users | CDK `DEPARTMENTS`, `SPECIALIZATIONS`, `SEED_USERS` | — |

---

## 19. Maintenance rule

This document is the system of record. **A pull request that changes any behaviour listed here is not complete until the matching row is updated**, including the "source" file name if it moved. Reviewers check this before approval (`../skills/akwadona-code-standards/SKILL.md`). When a module is added, copy the section template (Purpose · Who · Screens · Operations · Business rules · Data · Open items) and register its constants in §18.

Last full verification against code: **2026-10-30**.

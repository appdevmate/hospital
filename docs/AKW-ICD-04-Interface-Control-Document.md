# Akwadona Hospital Platform — Interface Control Document (API Specification)

| Document control | |
|---|---|
| **Document ID** | AKW-ICD-04 |
| **Document type** | Interface Control Document (ICD) — REST API contract |
| **Version** | 1.1 |
| **Status** | Approved |
| **Classification** | Confidential — Internal; shareable with integration partners under NDA |
| **Owner** | Lead Engineer |
| **Approver** | Founder / CTO |
| **Effective date** | 2026-10-30 |
| **Review cycle** | On every route or payload change |
| **Supersedes** | `archive/20-api-reference.md` |
| **Related documents** | AKW-SAD-02 §7 (integration architecture), AKW-FS-03 (behaviour behind each route), AKW-SSP-05 (auth), scripts/security-tests/ (contract tests) |

| Revision history | | | |
|---|---|---|---|
| **Version** | **Date** | **Author** | **Change** |
| 1.0 | 2026-10-30 | Platform team | Consolidated into the enterprise document set; identifiers and control statements verified against the 2026-10-29 code |
| 1.1 | 2026-10-31 | Platform team | Added "This document answers" and "Abbreviations used in this document" blocks after document control |

## This document answers

1. What is the API base URL, and how do I authenticate a call?
2. Which routes exist, with which methods, and what does each expect and return?
3. What status codes can come back, and what does each mean?
4. How do pagination, idempotency, rate limiting, and CORS work at the API level?
5. Which front-end service calls which route?

## Abbreviations used in this document

> **Why this table exists.** Every short form that appears anywhere in this document is listed here with (1) what the letters stand for and (2) what it means in plain words. If a term is not here and is not obvious, that is a documentation bug — add it. The complete glossary with examples and console links is AKW-SO-01 Appendix A.

| Abbreviation | Stands for | What it means |
|---|---|---|
| **API** | Application Programming Interface | The set of URLs one program calls to use another program's features. Ours is a REST API. |
| **CDK** | Cloud Development Kit | AWS's tool for describing infrastructure in a programming language (we use TypeScript). It compiles to CloudFormation. |
| **CMK** | Customer Managed Key | A KMS encryption key that we create and control (as opposed to one AWS manages for us). |
| **CORS** | Cross-Origin Resource Sharing | The browser rule that decides which websites may call our API. We allow only our own domains. |
| **CRUD** | Create, Read, Update, Delete | The four basic data operations. |
| **CTO** | Chief Technology Officer | The head of technology. |
| **DR** | Disaster Recovery / Document Register | Disaster Recovery: how we restore the system after a major failure. Document Register (AKW-DR-00): the master index of this documentation set. |
| **FS** | Functional Specification | The document that describes what the system does — every feature, rule, and setting — without describing how it is built. |
| **GDPR** | General Data Protection Regulation | The European Union's privacy law (2018). It gives people rights over their data and sets duties on companies that process it. |
| **HIPAA** | Health Insurance Portability and Accountability Act | The US law that sets rules for protecting patients' health information. Its "Security Rule" lists the technical safeguards we must have. |
| **HTTP** | Hypertext Transfer Protocol | The protocol the web uses to move pages and data. |
| **ICD** | Interface Control Document / International Classification of Diseases | ICD the document: the exact contract for how one system talks to another (our API). ICD the medical code: a worldwide numbering of diagnoses, e.g. ICD-10. |
| **IP** | Internet Protocol address | The numeric address of a machine on the internet. |
| **ISO** | International Organization for Standardization | The body that publishes international standards; ISO 27001 is the information-security one. |
| **JSON** | JavaScript Object Notation | The text format our API uses for data. |
| **JWT** | JSON Web Token | A signed digital ID card the browser sends with every request. It names the user, their hospital, and their role. |
| **NDA** | Non-Disclosure Agreement | A contract where the receiving party promises to keep information confidential. |
| **PDPPL** | Personal Data Privacy Protection Law | Qatar's national privacy law (Law No. 13 of 2016). Qatar's equivalent of GDPR. |
| **PK** | Partition Key | The main lookup key of a DynamoDB row — the "drawer". |
| **REST** | Representational State Transfer | A style of API built on standard web verbs (GET, POST, PATCH, DELETE) and resource URLs. |
| **S3** | Simple Storage Service | AWS file storage — a bucket holds files of any size. |
| **SAD** | Solution Architecture Document | The master technical design document: how the whole system is built, from infrastructure to data to security. |
| **SSP** | System Security Plan | The document that lists every security control the system has, how it is implemented, and its status. A NIST-defined document type. |
| **TL;DR** | Too long; did not read | A short summary placed at the top of a section. |
| **TLS** | Transport Layer Security | The encryption that protects data travelling over the internet — the "S" in HTTPS. |
| **URL** | Uniform Resource Locator | A web address. |

**Contract summary.** Base URL `https://ouohmmpi31.execute-api.us-east-1.amazonaws.com`. Every route requires `Authorization: Bearer <Cognito access token>`; API Gateway rejects anything else with 401 before any code runs. JSON in, JSON out. Tenant scope is implicit from the token; a resource belonging to another tenant is **404**. Mutating calls should carry `X-Client-Request-Id` (UUID) for 24-hour idempotency. Rate limits: stage 200 r/s / 500 burst; per-tenant plan (AKW-SAD-02 §8.2) → 429 with `Retry-After`. CORS: allow-listed origins only (`localhost:4200`, the raw CloudFront domain, `akwadona.com`, `www`, each tenant subdomain); Lambdas never emit CORS headers.

---

## 1. TL;DR
- 70+ routes across 10 aggregate Lambdas + 29 per-entity CRUD Lambdas.
- Admin + Operator use catch-all `/admin/{proxy+}` and `/operator/{proxy+}`.
- All responses are JSON. Errors use `{ error, message }`.

## 2. Conventions

### Headers
- `Authorization: Bearer <jwt>` — required on every call.
- `Content-Type: application/json` — required on POST/PATCH.
- `X-Client-Request-Id` — optional, echoed in CloudWatch logs for debugging.

### Status codes
| Code | Meaning |
|---|---|
| 200 | Success (GET, PATCH) |
| 201 | Created (POST) |
| 204 | No content (DELETE) |
| 400 | Validation error (`{ error, message }`) |
| 401 | Missing/invalid JWT |
| 403 | JWT valid but role / tenant forbids this operation |
| 404 | Not found OR other-tenant resource (don't leak existence) |
| 429 | Throttle hit (per-tenant limit — see [`AKW-SAD-02-Solution-Architecture-Document.md`](AKW-SAD-02-Solution-Architecture-Document.md)) |
| 500 | Internal — check CloudWatch logs for the specific Lambda |

### Pagination
Routes that return lists accept `?pageSize=<N>&lastKey=<base64>` and return `{ data, count, lastKey, hasMore }`.

### Soft vs hard delete
`DELETE` is **soft** — sets `deletedAt` ISO timestamp. Hard delete is only possible via operator wizard rollback.

## 3. Routes by module

### 3.1 Patients
| Method | Path | Lambda | Role |
|---|---|---|---|
| GET | `/patients` | `akwadona-get-all-patients` | PATIENTS |
| POST | `/patients` | `akwadona-create-patient` | PATIENTS |
| GET | `/patients/{patientID}` | `akwadona-get-patient-by-id` | PATIENTS |
| PATCH | `/patients/{patientID}` | `akwadona-update-patient` | PATIENTS |
| DELETE | `/patients/{patientID}` | `akwadona-delete-patient` | admin / developer |
| PATCH | `/patients/{patientID}/restore` | `akwadona-update-patient` | admin / developer |
| GET | `/patients/search` | `akwadona-get-patients-by-filters` | PATIENTS |

### 3.2 Doctors
| Method | Path | Lambda | Role |
|---|---|---|---|
| GET | `/doctors` | `akwadona-get-all-doctors` | authenticated |
| POST | `/doctors` | `akwadona-create-doctor` | admin / developer |
| GET | `/doctors/{doctorID}` | `akwadona-get-doctor-by-id` | authenticated |
| PATCH | `/doctors/{doctorID}` | `akwadona-update-doctor` | admin / developer |
| DELETE | `/doctors/{doctorID}` | `akwadona-delete-doctor` | admin / developer |
| GET | `/doctors/email/{email}` | `akwadona-get-doctor-by-email` | authenticated |

### 3.3 Payments / invoices
| Method | Path | Lambda | Role |
|---|---|---|---|
| GET | `/patients/{patientID}/payments` | `akwadona-get-payments-for-patient` | PATIENTS |
| POST | `/patients/{patientID}/payments` | `akwadona-create-payment` | admin / developer |
| GET | `/patients/{patientID}/payments/{paymentID}` | `akwadona-get-payment-by-id` | PATIENTS |
| PATCH | `/patients/{patientID}/payments/{paymentID}` | `akwadona-update-payment` | admin / developer |
| DELETE | `/patients/{patientID}/payments/{paymentID}` | `akwadona-delete-payment` | admin / developer |
| GET | `/payments` | `akwadona-list-payments-by-patient` | PATIENTS |
| GET | `/invoices` | `akwadona-get-all-invoices` | authenticated (doctor sees own only) |

### 3.4 Surgeries
| Method | Path | Lambda | Role |
|---|---|---|---|
| GET | `/patients/{patientID}/surgeries` | `akwadona-list-surgeries-by-patient` | PATIENTS |
| GET | `/surgeries/{surgeryID}` | `akwadona-get-surgery-by-id` | PATIENTS |

### 3.5 Reference data (departments + specializations)
| Method | Path | Lambda | Role |
|---|---|---|---|
| GET | `/departments` | `akwadona-get-all-departments` | authenticated |
| POST | `/departments` | `akwadona-create-department` | admin |
| POST | `/departments/bulk` | `akwadona-bulk-create-departments` | admin |
| DELETE | `/departments` | `akwadona-delete-all-departments` | admin |
| GET | `/specializations` | `akwadona-get-all-specializations` | authenticated |
| POST | `/specializations` | `akwadona-create-specialization` | admin |
| POST | `/specializations/bulk` | `akwadona-bulk-create-specializations` | admin |
| DELETE | `/specializations` | `akwadona-delete-all-specializations` | admin |

### 3.6 Admin panel (catch-all → `akwadona-admin-panel`)
| Method | Path (examples) | Role |
|---|---|---|
| ANY | `/admin/stats` | admin |
| ANY | `/admin/users` | admin |
| ANY | `/admin/users/{username}/disable` | admin |
| ANY | `/admin/users/{username}/enable` | admin |
| ANY | `/admin/users/{username}/set-password` | admin |
| ANY | `/admin/users/{username}/update-email` | admin |
| ANY | `/admin/audit` | admin |

Routed internally by the Lambda via `event.rawPath`.

### 3.7 Operator console (catch-all → `akwadona-operator-console`)
| Method | Path (examples) | Role |
|---|---|---|
| GET | `/operator/tenants` | operator |
| POST | `/operator/tenants` | operator (onboarding wizard) |
| GET | `/operator/tenants/{slug}` | operator |
| PATCH | `/operator/tenants/{slug}` | operator |
| DELETE | `/operator/tenants/{slug}` | operator (rollback) |
| GET | `/operator/metrics/api` | operator |
| GET | `/operator/metrics/users` | operator |
| GET | `/operator/audit/sanitized` | operator |

Operator Lambda has explicit DENY on tenant CMK operations — see [`AKW-FS-03-Functional-Specification.md`](AKW-FS-03-Functional-Specification.md) + [`AKW-SSP-05-System-Security-Plan.md`](AKW-SSP-05-System-Security-Plan.md).

### 3.8 Examinations / consultations (→ `akwadona-examinations`)
| Method | Path | Role |
|---|---|---|
| GET | `/examinations` | PATIENTS |
| POST | `/examinations` | PATIENTS |
| GET | `/examinations/{examId}` | PATIENTS |
| PATCH | `/examinations/{examId}` | PATIENTS |
| DELETE | `/examinations/{examId}` | admin |
| POST | `/examinations/{examId}/signoff` | doctor |

### 3.9 Pharmacy (→ `akwadona-pharmacy`)
| Method | Path | Role |
|---|---|---|
| GET / POST | `/pharmacy/medications` | PHARMACY |
| PATCH / DELETE | `/pharmacy/medications/{medId}` | PHARMACY |
| GET / POST | `/pharmacy/inventory` | PHARMACY |
| PATCH | `/pharmacy/inventory/{medId}` | PHARMACY |
| GET / POST | `/pharmacy/prescriptions` | PHARMACY |
| GET / PATCH | `/pharmacy/prescriptions/{rxId}` | PHARMACY |
| GET / POST | `/pharmacy/dispense` | PHARMACY |
| GET / POST | `/pharmacy/purchase-orders` | PHARMACY |
| GET / PATCH | `/pharmacy/purchase-orders/{poId}` | PHARMACY |
| GET | `/pharmacy/alerts` | PHARMACY |

Details in [`AKW-FS-03-Functional-Specification.md`](AKW-FS-03-Functional-Specification.md).

### 3.10 Documents (→ `akwadona-document-manager`)
| Method | Path | Role |
|---|---|---|
| POST | `/documents/upload-url` | DOCS |
| POST | `/documents/download-url` | DOCS |
| GET | `/documents/list` | DOCS |
| GET | `/documents/folders` | DOCS |
| DELETE | `/documents/delete` | admin |

Flow: client requests a pre-signed URL, uploads directly to S3 (`akwadona-documents-483176634665-us-east-1`). Lambda never proxies bytes.

### 3.11 Audit (→ `akwadona-audit`)
| Method | Path | Role |
|---|---|---|
| GET | `/audit` | admin |
| POST | `/audit` | admin (manual audit entry) |

### 3.12 Appointments (→ `akwadona-appointments`)
| Method | Path | Role |
|---|---|---|
| GET / POST | `/appointments` | authenticated |
| GET / PATCH / DELETE | `/appointments/{apptId}` | authenticated |

### 3.13 Calendar (→ `akwadona-calendar`)
| Method | Path | Role |
|---|---|---|
| GET / POST | `/calendars` | authenticated |
| DELETE | `/calendars/{calendarId}` | admin |
| GET / POST | `/calendars/{calendarId}/events` | authenticated |
| PATCH / DELETE | `/calendars/{calendarId}/events/{eventId}` | authenticated |

### 3.14 Blood Bank (→ `akwadona-bloodbank`)
| Method | Path | Role |
|---|---|---|
| GET / POST | `/bloodbank/donors` | BLOODBANK |
| GET / PATCH / DELETE | `/bloodbank/donors/{donorId}` | BLOODBANK |
| GET / POST | `/bloodbank/donors/{donorId}/donations` | BLOODBANK |
| GET | `/bloodbank/donations` | BLOODBANK |
| GET | `/bloodbank/units` | BLOODBANK |
| PATCH / DELETE | `/bloodbank/units/{unitId}` | BLOODBANK |
| GET | `/bloodbank/stock` | BLOODBANK |
| GET / POST | `/bloodbank/requests` | BLOODBANK |
| GET / PATCH / DELETE | `/bloodbank/requests/{requestId}` | BLOODBANK |
| POST | `/bloodbank/requests/{requestId}/crossmatch` | BLOODBANK |
| POST | `/bloodbank/requests/{requestId}/issue` | BLOODBANK |

Details in [`AKW-FS-03-Functional-Specification.md`](AKW-FS-03-Functional-Specification.md).

### 3.15 ScribeFirst (→ `akwadona-scribe`)
| Method | Path | Role |
|---|---|---|
| POST | `/scribe/sessions` | doctor |
| GET | `/scribe/sessions/{id}` | doctor (owner) |
| POST | `/scribe/sessions/{id}/soap` | doctor (owner) |
| POST | `/scribe/sessions/{id}/approve` | doctor (owner) |

Details in [`AKW-FS-03-Functional-Specification.md`](AKW-FS-03-Functional-Specification.md).

## 4. Payload shapes (representative)

### 4.1 Create patient
```http
POST /patients
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "name":       "Khalid Ibrahim",
  "dob":        "1990-01-01",
  "gender":     "male",
  "phone":      "+97455123456",
  "qid":        "12345678901",
  "insurance":  "Daman",
  "bloodGroup": "O+"
}
```
Response: `201 Created` with the created item (with PK = `PATIENT#<uuid>`), decrypted for the caller.

### 4.2 Create appointment
```http
POST /appointments

{
  "patientId":   "PATIENT#<uuid>",
  "patientName": "khalid ibrahim",
  "doctorId":    "DOCTOR#<uuid>",
  "doctorName":  "dr. omar rashidi",
  "doctorEmail": "doctor1@tiryaq.com",
  "department":  "general medicine",
  "date":        "2026-10-02",
  "startTime":   "10:00",
  "endTime":     "10:30",
  "visitType":   "scheduled",
  "priority":    "routine",
  "status":      "scheduled"
}
```

### 4.3 ScribeFirst approve
```http
POST /scribe/sessions/{id}/approve

{
  "soap": {
    "subjective": "...",
    "objective":  "...",
    "assessment": "...",
    "plan":       "..."
  }
}
```

### 4.4 Pharmacy dispense (with allergy override)
```http
POST /pharmacy/dispense

{
  "examId":                   "EXAM#<uuid>",
  "prescriptionId":           "RX#<uuid>",
  "medId":                    "MED#<uuid>",
  "quantityDispensed":        30,
  "allergyOverrideConfirmed": true,
  "notes":                    "Patient counselled on side effects"
}
```

## 5. Frontend → backend route mapping

Mapping from Angular route to the backend endpoints the component fetches:

| Angular route | Fetches |
|---|---|
| `/` (Dashboard) | `/appointments?date=today`, `/invoices?status=pending`, `/patients?pageSize=200` |
| `/patients-management` | `/patients`, `/departments`, `/specializations` |
| `/patient-profile/:id` | `/patients/{id}`, `/patients/{id}/payments`, `/patients/{id}/surgeries`, `/examinations?patientId={id}` |
| `/consultation/:consultationId` | GET/PATCH `/examinations/{examId}`, POST `/examinations/{examId}/signoff` |
| `/pharmacy` | `/pharmacy/medications`, `/pharmacy/inventory`, `/pharmacy/prescriptions`, `/pharmacy/dispense`, `/pharmacy/alerts`, `/pharmacy/purchase-orders` |
| `/blood-bank` | `/bloodbank/*` |
| `/voice-scribe` | `/scribe/sessions*` |
| `/documents` | `/documents/folders`, `/documents/list`, `/documents/upload-url`, `/documents/download-url` |
| `/calendar` | `/calendars*` |
| `/appointments` | `/appointments` |
| `/invoices` | `/invoices` |
| `/notifications` | aggregates: `/appointments`, `/patients?status=critical`, `/pharmacy/alerts`, `/pharmacy/prescriptions?status=ordered` |
| `/admin-panel` | `/admin/*` |
| `/operator` | `/operator/*` |

## 6. Common pitfalls

- **401 unexpectedly** — JWT expired (default 1 h). The frontend `authInterceptor` auto-redirects to sign-in; if testing with curl, refresh the token.
- **404 on a resource the user "knows exists"** — likely cross-tenant; the user is signed into tenant A but requesting B's resource. Confirm `tenantId` claim.
- **500 on CREATE** — most common cause historically is `updatedAt: null` on new items. See `../skills/akwadona-security-review/SKILL.md` §8.
- **429** — per-tenant throttle hit. See [`AKW-SAD-02-Solution-Architecture-Document.md`](AKW-SAD-02-Solution-Architecture-Document.md).
- **CORS error** — new subdomain not in `tenantSlugs[]`. Add to CDK + `tenant.service.ts`.

## 7. Compliance surface
- HIPAA §164.312(a)(1): JWT authorizer enforces access control on every route.
- HIPAA §164.312(b): every mutation writes an audit row.
- PDPPL Art. 9: TLS 1.2+ enforced, encryption at rest, access controls, audit trail.
- GDPR Art. 32: see audit log retention + security of processing.

## 8. Open questions / future work
- API versioning (currently unversioned). Add `/v1/*` prefix before the first breaking change.
- OpenAPI / Swagger generation. The HTTP API has structured routes; CDK can emit OpenAPI via `addRoutes` metadata.
- GraphQL layer for the frontend dashboard aggregation calls (currently 4 fetches on load).
- Rate limiting beyond the per-tenant throttle — IP-level + user-level.

## 9. References
- `lib/akwadona-cdk-stack.ts:1178-1300` — route table source
- `lib/akwadona-cdk-stack.ts:1217-1247` — admin + operator catch-alls
- [`AKW-SAD-02-Solution-Architecture-Document.md`](AKW-SAD-02-Solution-Architecture-Document.md)
- [`AKW-SAD-02-Solution-Architecture-Document.md`](AKW-SAD-02-Solution-Architecture-Document.md)
- `../skills/akwadona-code-standards/SKILL.md`

# Lambda Functions (Index)

Quick list of all Lambdas, their routes, and purpose. Runtime: Node.js 18/20/24. Detailed contracts → `docs/backend/01-Lambda-API-Reference.md`.

## Patients

| Lambda | Route | Purpose |
|--------|-------|---------|
| getAllPatients | `GET /patients` | List patients |
| getPatientByID | `GET /patients/{id}` | One patient |
| createPatient | `POST /patients` | Create (QID/phone unique) |
| updatePatient | `PATCH /patients/{id}` · `/restore` | Update / restore |
| deletePatient | `DELETE /patients/{id}` | Soft delete |
| getPatientsDataByFilters | `GET /patients/search` | Filtered search |

## Doctors

| Lambda | Route | Purpose |
|--------|-------|---------|
| getAllDoctors | `GET /doctors` | List doctors |
| getDoctorByID | `GET /doctors/{id}` | One doctor |
| getDoctorByEmail | `GET /doctors/email/{email}` | Lookup by email |
| createDoctor | `POST /doctors` | Create |
| updateDoctor | `PATCH /doctors/{id}` | Update (incl. duty days) |
| deleteDoctor | `DELETE /doctors/{id}` | Soft delete |

## Payments & invoices

| Lambda | Route | Purpose |
|--------|-------|---------|
| createPatientPayment | `POST /patients/{id}/payments` | Create invoice |
| getAllPaymentsForPatient | `GET /patients/{id}/payments` | Patient invoices |
| getPaymentByID | `GET …/payments/{pid}` | One invoice |
| updatePatientPayment | `PATCH …/payments/{pid}` | Update (stamps updatedBy) |
| deletePayment | `DELETE …/payments/{pid}` | Delete |
| listAllPaymentsForPatientByID | `GET /payments` | List payments |
| getAllInvoices | `GET /invoices` | All invoices (JWT-scoped) |

## Surgeries

| Lambda | Route | Purpose |
|--------|-------|---------|
| createPatientSurgery | `POST /patients/{id}/surgeries` | Add surgery |
| listAllSurgeriesForPatientByID | `GET /patients/{id}/surgeries` | List |
| getSurgeryByID | `GET /surgeries/{id}` | One surgery |

## Reference data

| Lambda | Route | Purpose |
|--------|-------|---------|
| getAllDepartments | `GET /departments` | List |
| createNewDepartment | `POST /departments` | Add |
| bulkCreateDepartments | `POST /departments/bulk` | Bulk add |
| deleteAllDepartments | `DELETE /departments` | Clear |
| getAllSpecializations | `GET /specializations` | List |
| createNewSpecialization | `POST /specializations` | Add |
| bulkCreateSpecializations | `POST /specializations/bulk` | Bulk add |
| deleteAllSpecializations | `DELETE /specializations` | Clear |

## Routers (one Lambda, many routes)

| Lambda | Routes | Purpose |
|--------|--------|---------|
| tiryaq-appointments | `/appointments`, `/{id}` | Book, check-in, cancel; duty-day rules |
| tiryaq-examinations | `/examinations`, `/{id}`, `/signoff` | Consultations / SOAP; closes appointment |
| tiryaq-pharmacy | `/pharmacy/*` | Catalog, inventory, dispense, POs, alerts (pharmacist only) |
| tiryaq-document-manager | `/documents/*` | Pre-signed S3 upload/download/list/delete |
| tiryaq-admin-panel | `/admin/*` | Stats, users, audit (admin only) |
| tiryaq-audit | `/audit` | Read/write audit rows |
| tiryaq-calendar | `/calendars/*` | Hospital calendar + events |
| tiryaq-scribe | `/scribe/*` | Bedrock SOAP generation |

## Infra / setup (not API)

| Lambda | Trigger | Purpose |
|--------|---------|---------|
| cognito-pre-token-generation | Cognito | Inject email + name claims |
| tiryaq-seed | CDK custom resource | Seed departments, specializations, counters |
| tiryaq-create-users | CDK custom resource | Seed users + Secrets Manager passwords |

## Shared rules

- Auth: Cognito JWT; role from `cognito:groups`
- Never write `updatedAt: null` (GSI sort key)
- Audited writes stamp `updatedBy` = caller email
- Errors return `{ message }` → surfaced in the UI

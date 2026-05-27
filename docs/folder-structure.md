# Folder Structure

High-level layout of the Tiryaq repo.

## Top level

```
hospital/
├── src/              # Angular 20 + PrimeNG 20 frontend
├── public/           # Static assets (images, demo data)
├── tiryaq-cdk/       # AWS CDK (backend infra + Lambdas)
├── docs/             # Documentation
├── dist/             # Build output (generated)
├── angular.json      # Angular config
├── package.json      # Frontend deps + scripts
├── deploy.ps1        # Backend+frontend deploy script
└── cors.json         # Reference S3 CORS config
```

## Frontend — `src/`

```
src/
├── main.ts           # Bootstrap
├── index.html
├── app.routes.ts     # Routes + role guards
├── app.config.ts     # Cognito / app config
├── app.component.ts
├── assets/styles.scss
└── app/
    ├── components/   # Feature modules (UI)
    ├── services/     # API clients + auth + helpers
    ├── guards/       # auth.guard, role.guard
    ├── interceptors/ # auth.interceptor (JWT)
    ├── interfaces/   # shared types
    └── layout/       # shell: menu, topbar, sidebar
```

### `app/components/` (key)

- `dashboard/` — stat cards + overview
- `appointments/` — booking, check-in, cancel
- `Patients Management/`, `patient-profile/`
- `Doctors Management/`
- `consultation/` — SOAP form, list, detail
- `pharmacy/` — catalog, inventory, dispense, POs
- `invoices/`, `notifications/`
- `documents/document-manager/` — file upload/download
- `hospital-calendar/`, `voice-scribe/`, `admin-panel/`
- `generic-table/` — reusable table

### `app/services/` (key)

- `auth.service.ts` — role/JWT
- `appointments`, `doctors`, `patients`, `payments`
- `pharmacy`, `consultation`, `document`, `notifications`
- `admin-panel`, `hospital-calendar`, `scribe`
- `helpers-service.ts`, `config.ts`

## Backend — `tiryaq-cdk/`

```
tiryaq-cdk/
├── bin/tiryaq-cdk.ts        # CDK app entry (TiryaqCdkStack)
├── lib/tiryaq-cdk-stack.ts  # All infra: DynamoDB, Cognito,
│                            # API Gateway, Lambdas, S3, CloudFront
├── lambda/                  # ~38 Lambda function folders
│   ├── _shared/             # compliance.js helper
│   ├── tiryaq-appointments/
│   ├── tiryaq-pharmacy/
│   ├── tiryaq-examinations/
│   ├── tiryaq-document-manager/
│   ├── createPatient/  updatePatient/  ...
│   └── ...
├── cdk.json
└── package.json
```

## Docs — `docs/`

```
docs/
├── deployment/       # CDK + frontend deploy guides
├── infrastructure/   # AWS/CDK reference
├── backend/          # Lambda API reference + functions list
├── frontend/         # module docs (pharmacy, admin-panel)
├── user-manuals/     # admin, doctor, pharmacist, developer
├── compliance/       # PDPPL/MOPH/NCSA
└── scribefirst/      # voice scribe design
```

## Notes

- One DynamoDB table: `Hospital` (single-table design)
- Each Lambda = one API concern, built via `Code.fromAsset`
- Frontend = standalone components + signals

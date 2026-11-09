# Akwadona — Documentation Index

> **Status:** Live. Last audited: 2026-10-29 (full code-vs-docs reconciliation; see `45-system-design-for-developers.md` §11).
> **Audience:** Everyone — read §"Where to start" for your role.
> **House writing style:** `../skills/akwadona-easy-english/SKILL.md` — short sentences, real-life example per concept, every abbreviation expanded on first use.

Every doc in this folder owns one specific question. Use this index to navigate; do not re-read the whole folder every time.

## Where to start by role

| You are... | Read in this order |
|---|---|
| **Learning the system (Sami or new hire)** | **[`44-akwadona-learning-path.md`](44-akwadona-learning-path.md)** — the six-week guided tour. Start here. |
| **New engineer, Day 1** | `00-akwadona-explained.md` → `02-aws-services-reference.md` → **`45-system-design-for-developers.md`** → `19-ui-architecture.md` → `20-api-reference.md` |
| **Security engineer / DPO** | `03-encryption-and-zero-knowledge.md` → `04-hashed-search-fields.md` → `05a-05f` compliance set → `14-tenant-row-enforcement.md` |
| **DevOps / on-call** | `18-deploy-and-operations.md` → `12-teardown-and-recover.md` → `08-throttling.md` → `25-monitoring-and-observability.md` → `26-incident-response.md` |
| **Operator (platform admin)** | `07-operator-console.md` → `15-tenant-onboarding-wizard.md` → `30-admin-user-guide.md` → `31-operator-user-guide.md` |
| **Product / sales / RFP response** | `00-akwadona-explained.md` → `05f-compliance-overview.md` → `06-scalability-report.md` → `40-sales-handbook.md` |
| **Auditor** | `05f-compliance-overview.md` → `05a / 05b / 05c` → `03-encryption-and-zero-knowledge.md` → `akwadona-multitenant-setup.md` |

## Full doc index

### 00 — Overview
- [`00-akwadona-explained.md`](00-akwadona-explained.md) — **Plain-English overview, read-first.**

### 01–02 — Platform primers
- [`01-lambda-and-infrastructure.md`](01-lambda-and-infrastructure.md) — All 42 Lambdas (39 API + 3 support), API Gateway routes, CDK stack layout, S3 buckets, Cognito pool, KMS CMKs.
- [`02-aws-services-reference.md`](02-aws-services-reference.md) — **Every AWS service used in Akwadona except DynamoDB, S3, Lambda, API Gateway**, in plain English, with one real-life analogy per service. Cognito, KMS, CloudFront, ACM, WAF, IAM, CloudWatch, CloudTrail, EventBridge, SES, Bedrock, CloudFormation, CDK, STS.
- [`02-application-and-testing.md`](02-application-and-testing.md) — Angular app bootstrap, build, test harness.

### 03–04 — Security architecture
- [`03-encryption-and-zero-knowledge.md`](03-encryption-and-zero-knowledge.md) — Per-tenant KMS CMKs, envelope encryption, operator DENY policy. The core compliance claim.
- [`04-hashed-search-fields.md`](04-hashed-search-fields.md) — HMAC-SHA256 lookup over encrypted fields (`emailHash`, `qidHash`, `phoneHash`).

### 05 — Compliance
- [`05a-hipaa-security-rule-mapping.md`](05a-hipaa-security-rule-mapping.md) — HIPAA Security Rule → Akwadona controls.
- [`05b-pdppl-qatar-compliance.md`](05b-pdppl-qatar-compliance.md) — Qatar PDPPL → Akwadona controls.
- [`05c-gdpr-compliance-and-dpia.md`](05c-gdpr-compliance-and-dpia.md) — GDPR + Data Protection Impact Assessment template.
- [`05d-baa-template.md`](05d-baa-template.md) — Business Associate Agreement (HIPAA).
- [`05e-dpa-template.md`](05e-dpa-template.md) — Data Processing Agreement (GDPR).
- [`05f-compliance-overview.md`](05f-compliance-overview.md) — Compliance posture one-pager.

### 06–08 — Non-functional
- [`06-scalability-report.md`](06-scalability-report.md) — Capacity plan + load-test proof.
- [`07-operator-console.md`](07-operator-console.md) — `www.akwadona.com/operator` platform surface.
- [`08-throttling.md`](08-throttling.md) — Per-tenant API rate limiting.

### 09–17 — Numbered Steps (feature history)
- [`09-rename-runbook.md`](09-rename-runbook.md) — Historical: `tiryaq-*` → `akwadona-*` (2026-06-30 teardown + rebuild).
- [`10-doctor-id-refactor.md`](10-doctor-id-refactor.md) — JWT `doctorId` claim refactor.
- [`11-customer-migration-guide.md`](11-customer-migration-guide.md) — Importing data for a new tenant.
- [`12-teardown-and-recover.md`](12-teardown-and-recover.md) — Full-stack teardown + two-phase recovery runbook.
- [`13-i18n.md`](13-i18n.md) — ngx-translate, 6-language setup.
- [`14-tenant-row-enforcement.md`](14-tenant-row-enforcement.md) — Per-row `tenantId` enforcement in all big-domain Lambdas.
- [`15-tenant-onboarding-wizard.md`](15-tenant-onboarding-wizard.md) — Operator wizard that provisions a new tenant in 5 seconds.
- [`16-ses-setup.md`](16-ses-setup.md) — SES + Cognito email sender (`noreply@akwadona.com`).
- [`17-test-fixtures.md`](17-test-fixtures.md) — Reusable values for manual testing.

### 18–24 — UI + application internals (new in this audit)
- [`18-deploy-and-operations.md`](18-deploy-and-operations.md) — Current, non-stale deploy playbook. Replaces the broken `deploy.ps1` + `deploy-push-commands.txt`.
- [`19-ui-architecture.md`](19-ui-architecture.md) — Angular 20 SPA, PWA, offline queue, i18n, PrimeNG, Tailwind, custom Cognito auth, interceptors.
- [`20-api-reference.md`](20-api-reference.md) — Every API Gateway route, method, auth, request/response shape.
- [`21-authentication-flow.md`](21-authentication-flow.md) — Custom Angular login → Cognito → JWT claims → tenant resolution. End-to-end.
- [`22-data-model.md`](22-data-model.md) — DynamoDB `Hospital` single-table design, 9 GSIs, entity prefixes, access patterns.

### 25–30 — Observability + ops
- [`25-monitoring-and-observability.md`](25-monitoring-and-observability.md) — CloudWatch metrics, alarms, dashboards, log retention.
- [`26-incident-response.md`](26-incident-response.md) — SEV classification, ten-minute drill, communication cadence, post-mortem template.
- [`27-backup-and-disaster-recovery.md`](27-backup-and-disaster-recovery.md) — Backup strategy, RTO/RPO, multi-region plan.

### 31–39 — Modules (new in this audit)
- [`31-pharmacy-module.md`](31-pharmacy-module.md) — Catalog, inventory, prescriptions, dispense, allergy guardrail, purchase orders.
- [`32-blood-bank-module.md`](32-blood-bank-module.md) — Donors, donations, units, requests, crossmatch, issue.
- [`33-scribefirst-module.md`](33-scribefirst-module.md) — Voice → Bedrock Claude Haiku 4.5 → SOAP note.
- [`34-documents-module.md`](34-documents-module.md) — Pre-signed S3 URLs, allowed folders, DICOM.
- [`35-appointments-and-calendar.md`](35-appointments-and-calendar.md) — Appointment lifecycle + hospital calendar.
- [`36-consultations-and-soap.md`](36-consultations-and-soap.md) — Examination/consultation flow, ICD-10/LOINC lookup, sign-off.

### 40–49 — Developer + product
- [`40-sales-handbook.md`](40-sales-handbook.md) — Competitive positioning, differentiators, objection handling.
- [`41-developer-onboarding.md`](41-developer-onboarding.md) — Day 1 setup, local run, first commit, deploy to dev.
- [`42-local-development.md`](42-local-development.md) — `ng serve`, mock backend, running Lambdas locally with SAM.
- [`43-testing-strategy.md`](43-testing-strategy.md) — Unit, integration, load, cross-tenant security probe.
- [`44-akwadona-learning-path.md`](44-akwadona-learning-path.md) — **Six-week step-by-step guided tour to understand infrastructure, design, and code.** Start here when learning the system.
- [`45-system-design-for-developers.md`](45-system-design-for-developers.md) — **The engineer's reference: infrastructure map, request + login lifecycles, data model, encryption design, code map, design decisions + debts, change checklists, and the 2026-10-29 fix table.** Read before changing anything.

### Un-numbered
- [`akwadona-multitenant-setup.md`](akwadona-multitenant-setup.md) — Live tenants + current IDs. **Single source of truth for infra identifiers.**
- [`backlog.md`](backlog.md) — Open work.

## How to add a new doc

Use `skills/akwadona-doc-writer/SKILL.md` as the guide. Numbering reservations:

- 00–08: Overview, platform primers, security, non-functional (full).
- 09–17: Historical feature "Steps" (full).
- 18–24: UI + application internals.
- 25–30: Observability + ops.
- 31–39: Per-module docs.
- 40–49: Developer + product + sales.
- 50+: Future.

## Doc audit checklist (quarterly)

- Any ID / ARN / endpoint referenced in docs that no longer exists? Grep for the dead ones — `tiryaqcdkstack`, `E1Z1ZKYM74LVA7`, `jxz59jh15f`, `a2s6jk35d9`, `d6i7iwknkj0bg`, `us-east-1_RACghntmS`, `us-east-1_KkINt5vOF`, `5i94ivu752m12uivl62v99pu4`, `2nfjfipi8hri262pjohtpgl45q`, `akwadonaStack` — and replace with the live set: API `vbsex10bd6`, CloudFront `EMIDMHCZ9PRK4` / `d37kqu4c91mlc4`, pool `us-east-1_bpipvSdQi`, client `4r9fcr8f54pmubmmbnuldi9fqc`, stack `AkwadonaCdkStack`.
- Any control the docs claim that the CDK does not implement? Check the status banners in `02-aws-services-reference.md` (WAF, MFA, alarms, scheduled probe) against `lib/akwadona-cdk-stack.ts` and `bin/akwadona-cdk.ts`.
- Any "Status: Draft" that should be "Live" or vice versa?
- Any closed backlog items still appearing in `backlog.md`?
- Any new Lambda / route / module that doesn't have a corresponding doc?

## Known gaps as of 2026-10-04

Written in the 2026-10-02 → 2026-10-29 audit cycles: `02-aws-services-reference`, `18`, `19`, `20`, `25`, `26`, `32`, `40`, `41`, `44`, `45`. Still planned:

1. `21-authentication-flow.md` — Custom Angular login → Cognito → JWT claims → tenant resolution. End-to-end.
2. `22-data-model.md` — DynamoDB `Hospital` single-table design, 9 GSIs, entity prefixes, access patterns (depends on content currently in `tiryaq_dynamodb_model.md` memory file).
3. `27-backup-and-disaster-recovery.md` — Backup strategy, RTO/RPO, multi-region plan.
4. `31-pharmacy-module.md` — Catalog, inventory, prescriptions, dispense, allergy guardrail, purchase orders.
5. `33-scribefirst-module.md` — Voice → Bedrock Claude Haiku 4.5 → SOAP note.
6. `34-documents-module.md` — Pre-signed S3 URLs, allowed folders, DICOM.
7. `35-appointments-and-calendar.md` — Appointment lifecycle + hospital calendar.
8. `36-consultations-and-soap.md` — Examination/consultation flow, ICD-10/LOINC lookup, sign-off.
9. `42-local-development.md` — `ng serve`, mock backend, running Lambdas locally with SAM.
10. `43-testing-strategy.md` — Unit, integration, load, cross-tenant security probe.

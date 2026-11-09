# Akwadona Hospital Platform — Solution Architecture Document (SAD)

| Document control | |
|---|---|
| **Document ID** | AKW-SAD-02 |
| **Document type** | Solution Architecture Document — covers High-Level Design (HLD) and Low-Level Design (LLD) |
| **Version** | 1.1 |
| **Status** | Approved |
| **Classification** | Confidential — Internal |
| **Owner** | Solution Architect |
| **Approver** | Founder / CTO |
| **Effective date** | 2026-10-30 |
| **Review cycle** | On every infrastructure change; full review quarterly |
| **Supersedes** | `archive/45-system-design-for-developers.md`, `archive/01-lambda-and-infrastructure.md`, `archive/02-aws-services-reference.md`, `archive/06-scalability-report.md`, `archive/08-throttling.md`, `archive/akwadona-multitenant-setup.md` |
| **Related documents** | AKW-SO-01 (overview), AKW-FS-03 (features), AKW-ICD-04 (API), AKW-SSP-05 (security), AKW-OPS-08 (operations), AKW-ADR-11 (decisions), AKW-RR-12 (risks) |

| Revision history | | | |
|---|---|---|---|
| **Version** | **Date** | **Author** | **Change** |
| 1.0 | 2026-10-30 | Platform team | Consolidated six source documents into one SAD; verified every statement against `akwadona-cdk/lib/akwadona-cdk-stack.ts` and the Lambda sources as of the 2026-10-29 change set |
| 1.1 | 2026-10-31 | Platform team | Added "This document answers" and "Abbreviations used in this document" blocks after document control |

## This document answers

1. What are the architecture principles and the hard constraints (the 500-resource ceiling, copied shared code, encrypted fields)?
2. Which AWS resources exist, what is each for, and what is its name in the CDK code?
3. What exactly happens — hop by hop, with timing — when the browser calls the API, and when a user logs in?
4. How is the data organised: the single table, the nine indexes, which fields are plaintext, encrypted, or hashed?
5. How does encryption work, and what makes "zero-knowledge" true rather than a promise?
6. What does the system integrate with, and how does each integration fail?
7. How fast, how available, how scalable, and how expensive is it — and how is each target met?
8. Why was each major design decision made, and what did it cost us?
9. What is every live identifier (API, CloudFront, Cognito pool, buckets) and which old ones are dead?

## Abbreviations used in this document

> **Why this table exists.** Every short form that appears anywhere in this document is listed here with (1) what the letters stand for and (2) what it means in plain words. If a term is not here and is not obvious, that is a documentation bug — add it. The complete glossary with examples and console links is AKW-SO-01 Appendix A.

| Abbreviation | Stands for | What it means |
|---|---|---|
| **ABO** | ABO blood group system | The A, B, AB, O blood types. |
| **ACM** | AWS Certificate Manager | Issues and renews the certificates that make a site show the HTTPS padlock. Free. |
| **ADR** | Architecture Decision Record | A short note that records one design decision: the situation, the choice made, and what it costs. Written once, never edited; a later record can replace it. |
| **AES** | Advanced Encryption Standard | The standard symmetric encryption algorithm. "AES-256" uses a 256-bit key. |
| **AI** | Artificial Intelligence | Software that performs tasks that normally need human judgement — here, turning a transcript into a clinical note. |
| **API** | Application Programming Interface | The set of URLs one program calls to use another program's features. Ours is a REST API. |
| **ARN** | Amazon Resource Name | The unique ID string of any AWS resource. |
| **AWS** | Amazon Web Services | Amazon's cloud-computing platform. Everything Akwadona runs on it. |
| **AZ** | Availability Zone | One independent data centre inside an AWS region. A region has several, so one failing does not take the service down. |
| **BAA** | Business Associate Agreement | A contract required by the US health-privacy law HIPAA between a hospital and any company (like Akwadona) that handles patient data for it. It says how the data will be protected. |
| **BYOK** | Bring Your Own Key | Letting a customer supply their own encryption key. Related to our per-hospital keys. |
| **CAD** | Computer-Aided Design | Design software — used here as an analogy for CDK. |
| **CCM** | Compliance Controls Matrix | A table that maps each rule in a law or standard to the specific thing we do to satisfy it, and the evidence an auditor can check. |
| **CCTV** | Closed-Circuit Television | Security cameras — used here as an analogy for audit logging. |
| **CDK** | Cloud Development Kit | AWS's tool for describing infrastructure in a programming language (we use TypeScript). It compiles to CloudFormation. |
| **CDN** | Content Delivery Network | A worldwide network of cache servers so a website loads from a city near the user. AWS CloudFront is ours. |
| **CFN** | CloudFormation | AWS's service that builds and updates infrastructure from a text template. One "stack" = one template; a stack may hold at most 500 resources. |
| **CFO** | Chief Financial Officer | The head of finance. |
| **CIO** | Chief Information Officer | The head of IT. |
| **CLI** | Command-Line Interface | A text-based tool run from a terminal, e.g. the AWS CLI. |
| **CMK** | Customer Managed Key | A KMS encryption key that we create and control (as opposed to one AWS manages for us). |
| **CMM** | Caching Cryptographic Materials Manager | A component of the AWS Encryption SDK that caches data keys — the model our DEK cache follows. |
| **CMO** | Chief Medical Officer | The senior doctor in charge of clinical practice. |
| **CNAME** | Canonical Name record | A DNS record that says "this name is an alias of that name". |
| **CORS** | Cross-Origin Resource Sharing | The browser rule that decides which websites may call our API. We allow only our own domains. |
| **CPU** | Central Processing Unit | The processor. |
| **CSP** | Content Security Policy | A response header that limits where a page may load scripts and styles from, to reduce XSS risk. Planned. |
| **CSS** | Cascading Style Sheets | The language that styles web pages. |
| **CTO** | Chief Technology Officer | The head of technology. |
| **DAX** | DynamoDB Accelerator | An in-memory cache for DynamoDB. Not used. |
| **DEK** | Data Encryption Key | The key that actually encrypts a row's fields. A fresh one per row. |
| **DKIM** | DomainKeys Identified Mail | A cryptographic signature on outgoing e-mail proving it really came from the domain. |
| **DNS** | Domain Name System | The internet's phone book — turns akwadona.com into a server address. Ours is in Route 53; GoDaddy only holds the registration. |
| **DPO** | Data Protection Officer | The named person responsible for privacy compliance; required by GDPR for organisations that process health data at scale. |
| **DR** | Disaster Recovery / Document Register | Disaster Recovery: how we restore the system after a major failure. Document Register (AKW-DR-00): the master index of this documentation set. |
| **EC2** | Elastic Compute Cloud | AWS virtual servers. We do not use them (serverless only). |
| **ECS** | Elastic Container Service | AWS container hosting. Not used. |
| **EH** | Engineering Handbook | The document-type code for the engineering handbook (AKW-EH-10). |
| **EKS** | Elastic Kubernetes Service | AWS managed Kubernetes. Not used. |
| **EU** | European Union | The political and economic union of 27 European countries. |
| **FHIR** | Fast Healthcare Interoperability Resources | The modern standard for exchanging health data between systems. On our roadmap. |
| **FIPS** | Federal Information Processing Standard | US government standards for computer security. "FIPS 140-2 Level 3" is the certification level of the hardware that holds our encryption keys. |
| **FS** | Functional Specification | The document that describes what the system does — every feature, rule, and setting — without describing how it is built. |
| **GCC** | Gulf Cooperation Council | The six Gulf states: Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, Oman. |
| **GDPR** | General Data Protection Regulation | The European Union's privacy law (2018). It gives people rights over their data and sets duties on companies that process it. |
| **GSI** | Global Secondary Index | A second way to look up rows in a DynamoDB table, by a different attribute. We have nine. |
| **HIPAA** | Health Insurance Portability and Accountability Act | The US law that sets rules for protecting patients' health information. Its "Security Rule" lists the technical safeguards we must have. |
| **HLD** | High-Level Design | The "big picture" design of a system: the main parts and how they connect, without implementation detail. |
| **HMAC** | Hash-based Message Authentication Code | A fingerprint of a value computed with a secret key. Same value + same key = same fingerprint; different keys give different fingerprints. We use it to search encrypted fields. |
| **HSM** | Hardware Security Module | A tamper-proof physical device that holds encryption keys. KMS keys live in one. |
| **HTML** | Hypertext Markup Language | The language of web pages. |
| **HTTP** | Hypertext Transfer Protocol | The protocol the web uses to move pages and data. |
| **HTTPS** | HTTP Secure | HTTP wrapped in TLS encryption — the padlock. |
| **i18n** | internationalisation | Building software so it can show different languages (18 letters between i and n). |
| **IAM** | Identity and Access Management | AWS's permission system: which user or service may do which action on which resource. |
| **ICD** | Interface Control Document / International Classification of Diseases | ICD the document: the exact contract for how one system talks to another (our API). ICD the medical code: a worldwide numbering of diagnoses, e.g. ICD-10. |
| **IDE** | Integrated Development Environment | A code editor with tools built in, e.g. Visual Studio Code. |
| **IDP** | Identity Provider | The system that holds user accounts and performs login. Cognito is ours. |
| **IP** | Internet Protocol address | The numeric address of a machine on the internet. |
| **IT** | Information Technology | Computers, networks, and software — and the department that runs them. |
| **IV** | Initialisation Vector | A random value mixed into each encryption so identical inputs produce different ciphertext. |
| **JSON** | JavaScript Object Notation | The text format our API uses for data. |
| **JWT** | JSON Web Token | A signed digital ID card the browser sends with every request. It names the user, their hospital, and their role. |
| **KMS** | Key Management Service | AWS's vault for encryption keys. Keys never leave it; it encrypts and decrypts on request. |
| **LLD** | Low-Level Design | The detailed design: exact components, data structures, and interfaces. |
| **LRU** | Least Recently Used | A cache-eviction rule: when full, drop the item unused for longest. |
| **MAC** | Message Authentication Code | A tamper-detection tag; HMAC is the hash-based kind. |
| **MAU** | Monthly Active Users | The number of distinct users who sign in during a month. Cognito charges per MAU above a free allowance. |
| **MFA** | Multi-Factor Authentication | Needing two proofs to sign in — a password plus a code from a phone app. |
| **MX** | Mail Exchange record | A DNS record that says which server receives e-mail for a domain. |
| **NFR** | Non-Functional Requirement | A requirement about how well the system works (speed, uptime, security, cost) rather than what it does. |
| **OAC** | Origin Access Control | The CloudFront setting that lets only CloudFront read our S3 bucket — nobody can bypass it. |
| **OPS** | Operations | Running the system day to day: deploying, monitoring, backing up, recovering. |
| **PA** | Public Address system | Loudspeaker announcements — used here as an analogy for EventBridge. |
| **PACS** | Picture Archiving and Communication System | The hospital system that stores and displays medical images. |
| **PDPPL** | Personal Data Privacy Protection Law | Qatar's national privacy law (Law No. 13 of 2016). Qatar's equivalent of GDPR. |
| **PHI** | Protected Health Information | Any information that identifies a patient and relates to their health: name, ID number, diagnosis, medication, phone, date of birth. |
| **PII** | Personally Identifiable Information | Any data that identifies a person, medical or not — a staff member's home address, for example. |
| **PITR** | Point-In-Time Recovery | DynamoDB's continuous backup — restore the table to any second in the last 35 days. |
| **PK** | Partition Key | The main lookup key of a DynamoDB row — the "drawer". |
| **PWA** | Progressive Web App | A web app that can be installed like a phone app and work offline. |
| **QID** | Qatari ID | The national identity number of a Qatar resident (11 digits). |
| **RCU** | Read Capacity Unit | DynamoDB's unit for charging reads (one unit ≈ one 4 KB read per second). |
| **RDS** | Relational Database Service | AWS managed SQL databases. Not used (we use DynamoDB). |
| **REST** | Representational State Transfer | A style of API built on standard web verbs (GET, POST, PATCH, DELETE) and resource URLs. |
| **RFP** | Request for Proposal | A formal document a buyer sends to vendors asking them to propose a solution and a price. |
| **Rh** | Rhesus factor | The + or − part of a blood type. |
| **RPO** | Recovery Point Objective | How much recent data we may lose in a disaster. Ours: 15 minutes. |
| **RR** | Risk Register | A list of every known risk with a score, an owner, and a plan. |
| **RTL** | Right-to-Left | Text direction for Arabic, Hebrew, Urdu. Our layout flips for these languages. |
| **RTO** | Recovery Time Objective | How long the system may be down after a disaster before it must be back. Ours: 4 hours. |
| **S3** | Simple Storage Service | AWS file storage — a bucket holds files of any size. |
| **SAD** | Solution Architecture Document | The master technical design document: how the whole system is built, from infrastructure to data to security. |
| **SDK** | Software Development Kit | A library a vendor provides to call its services from code. |
| **SES** | Simple Email Service | AWS's service for sending e-mail. |
| **SHA** | Secure Hash Algorithm | A family of one-way hash functions. SHA-256 is the one we use. |
| **SK** | Sort Key | The second part of a DynamoDB key — the "folder inside the drawer". |
| **SLA** | Service Level Agreement | A promise about service quality, usually uptime — e.g. "99.9 % per month". |
| **SMS** | Short Message Service | A text message to a phone. Cognito can send login codes by SMS; we use authenticator apps instead. |
| **SMTP** | Simple Mail Transfer Protocol | The protocol for sending e-mail. |
| **SNS** | Simple Notification Service | AWS's service for sending alerts (e-mail, SMS, to other services). |
| **SO** | Solution Overview | The executive summary of the platform in plain language. |
| **SOAP** | Subjective, Objective, Assessment, Plan | The standard four-part structure of a clinical note: what the patient says, what the doctor observes, the diagnosis, and the treatment plan. |
| **SPA** | Single-Page Application | A web app that loads once and then updates the page without full reloads. Ours is built with Angular. |
| **SPF** | Sender Policy Framework | A DNS record listing which servers may send e-mail for a domain. |
| **SQL** | Structured Query Language | The language of relational databases. We use DynamoDB, which has no SQL, but "injection" attacks are still tested. |
| **SQS** | Simple Queue Service | AWS's message queue service. Not used today. |
| **SRP** | Secure Remote Password | A login method where the password never travels over the network. One of the flows Cognito supports. |
| **SSE** | Server-Side Encryption | Encryption done by the storage service itself. "SSE-S3" uses an Amazon-managed key; "SSE-KMS" uses our own key. |
| **SSP** | System Security Plan | The document that lists every security control the system has, how it is implemented, and its status. A NIST-defined document type. |
| **STS** | Security Token Service | AWS's service that issues short-lived credentials. |
| **TL;DR** | Too long; did not read | A short summary placed at the top of a section. |
| **TLS** | Transport Layer Security | The encryption that protects data travelling over the internet — the "S" in HTTPS. |
| **TOTP** | Time-based One-Time Password | The six-digit code from an authenticator app that changes every 30 seconds. |
| **TTL** | Time To Live | A "delete me after this time" marker on a database row. DynamoDB removes expired rows for free. |
| **TXT** | Text record | A DNS record holding arbitrary text — used for SPF and DMARC. |
| **UI** | User Interface | The screens a person uses. |
| **URL** | Uniform Resource Locator | A web address. |
| **US** | United States | The United States of America. |
| **WAF** | Web Application Firewall | A filter in front of a website that blocks known-bad traffic. Ours is defined but currently switched off. |
| **WCU** | Write Capacity Unit | DynamoDB's unit for charging writes (one unit ≈ one 1 KB write per second). |
| **XSS** | Cross-Site Scripting | An attack that injects a malicious script into a web page. |
| **YAML** | YAML Ain't Markup Language | A human-friendly configuration file format. |

**Source of truth.** Where this document and the code disagree, the code wins and this document is wrong — raise it. The infrastructure is `akwadona-cdk/lib/akwadona-cdk-stack.ts`; the CDK symbol for each resource is given so you can search for it.

---

## 1. Introduction

### 1.1 Purpose
This document is the single architectural reference for the Akwadona platform. It describes the business context, the logical and physical architecture, the data and security architecture, integration points, non-functional characteristics, and the design decisions behind them. It is the document an engineer reads before changing anything, and the document an auditor reads to understand how controls are implemented.

### 1.2 Scope
In scope: the production platform as deployed in AWS account `483176634665`, region `us-east-1` — infrastructure, back end, front end, data, identity, and operations tooling. Out of scope: the detailed feature behaviour (AKW-FS-03), the API contract (AKW-ICD-04), the control-by-control security plan (AKW-SSP-05), and operating procedures (AKW-OPS-08).

### 1.3 Audience
Solution architects, engineers, security reviewers, auditors, and technical evaluators at prospective customers.

### 1.4 Assumptions and constraints

| # | Constraint | Consequence |
|---|---|---|
| C1 | Single CloudFormation stack; AWS hard limit of 500 resources per stack | Stack is at 496. Catch-all routes and shared managed policies are used to stay under; alarms were deferred for a year because of it. Split planned (AKW-ADR-11 ADR-013). |
| C2 | Lambda packaging zips one folder per function | Shared code is copied into each folder; `require('../_shared')` fails at runtime. |
| C3 | PHI fields are encrypted at the application layer | DynamoDB cannot filter or sort on them; those operations run in memory after decryption. |
| C4 | Cognito pre-token trigger has a hard 5-second cap | The pre-token Lambda is the only warmed function and must never Scan. |
| C5 | DNS is in Route 53 (zone Z07074793TXLIBMDZZY3I); GoDaddy holds only the registration | New subdomains are a manual CNAME; the CloudFront wildcard alias means no infra change is needed. |
| C6 | Production region `us-east-1`; data-residency region `me-south-1` not yet available for Bedrock | Bedrock is called in `us-east-1` via a cross-region inference profile. |

### 1.5 Architecture principles

1. **Zero-knowledge by construction.** Platform staff cannot read customer PHI because IAM forbids it, not because a policy document says so.
2. **Pooled multi-tenancy with cryptographic isolation.** One deployment, one table, one pool — every row carries `tenantId`, every hospital has its own keys.
3. **Serverless only.** No servers to patch; pay per request; scale is AWS's problem up to ~5,000 concurrent users per region.
4. **The JWT is the only authority.** Tenant, role, and doctor identity come from verified token claims, never from request bodies or query strings.
5. **404, never 403, for foreign resources.** No existence oracle across tenants.
6. **Infrastructure as code, one stack, reviewed in Git.**
7. **Plain-English documentation** with console links, so the system can be understood without reading code.

---

## 2. Business context

### 2.1 Drivers
Small and mid-sized hospitals and polyclinics in Qatar and the GCC need an electronic medical record they can adopt in days, in Arabic, at SaaS prices, with a regulator-defensible answer to "who can read our patients' data". Incumbent systems are priced and sized for 500-bed academic centres.

### 2.2 Stakeholders

| Stakeholder | Concern | Where addressed |
|---|---|---|
| Hospital CMO | Documentation burden, clinical safety | AKW-FS-03 (ScribeFirst, allergy guardrail, crossmatch) |
| Hospital CIO / DPO | Data confidentiality, residency, audit | §6, §7, AKW-SSP-05, AKW-CCM-06 |
| Hospital CFO | Capex vs opex, exit cost | AKW-SO-01 §5, cryptographic erasure §6.4 |
| Akwadona operations | Onboarding speed, blast radius, cost | §4.6, §9, AKW-OPS-08 |
| Auditor | Evidence of controls | AKW-CCM-06, CloudTrail (§4.1) |

### 2.3 Tenants in production

| Slug | `tenantId` | Display name | Subdomain |
|---|---|---|---|
| `tiryaq` | `T_2572fc71` | Tiryaq Hospital | `tiryaq.akwadona.com` |
| `alshifaa` | `T_a4b8aef9` | Alshifaa Hospital | `alshifaa.akwadona.com` |

`tenantId` = `T_` + first 8 hex of SHA-256(`AKWADONA_TENANT_` + slug). Deterministic, so backfills are idempotent. The slug is for humans and URLs; the opaque ID is on every row and in every token.

---

## 3. Architecture overview

### 3.1 Conceptual view

```
┌──────────────────────────── Edge ────────────────────────────┐
│  GoDaddy DNS → CloudFront (TLS 1.2+, security headers, SPA)   │
│                      ↓ origin                                 │
│                 S3 frontend bucket (KMS)                      │
└───────────────────────────────────────────────────────────────┘
                 │ Authorization: Bearer <JWT>
┌──────────────────────────── API ─────────────────────────────┐
│  API Gateway HTTP API  — JWT authorizer, CORS allow-list,     │
│  stage throttle 200 r/s / 500 burst                           │
│         ↓ 1 route → 1 Lambda (two {proxy+} catch-alls)        │
│  39 Lambdas (Node 20/24, 512 MB) — tenant guard, plan         │
│  throttle, role gate, encrypt/decrypt, audit                  │
└───────────────────────────────────────────────────────────────┘
          │                 │                    │
┌───── Identity ─────┐ ┌─── Data ────┐ ┌──── Keys & audit ─────┐
│ Cognito pool       │ │ DynamoDB    │ │ KMS: platform data +  │
│ 5 groups           │ │ `Hospital`  │ │ audit keys; 2 per     │
│ pre-token Lambda   │ │ 9 GSIs      │ │ tenant (data + HMAC)  │
│ (warmed)           │ │ PITR, TTL   │ │ CloudTrail → S3       │
└────────────────────┘ │ S3 documents│ │ Object Lock 7 y       │
                       └─────────────┘ └───────────────────────┘
          │
┌──── External ─────┐
│ Bedrock (Claude)  │  SES (e-mail)  │  CloudWatch + SNS (alarms)
└───────────────────┘
```

### 3.2 The system in one paragraph
A doctor opens `tiryaq.akwadona.com`. CloudFront serves the Angular app from S3. The app shows its own login screen and calls Cognito's `InitiateAuth` directly. Cognito runs the pre-token Lambda, which adds `tenantId`, `role`, `tenantSlug`, and (for doctors) `doctorId` to the JWT. The app sends the token on every call to the HTTP API. API Gateway verifies the signature and rejects anything else before any code runs. The Lambda reads `tenantId` from the verified claims, checks the per-tenant rate limit, works against the `Hospital` table through `tenant-entityType-index` so it physically cannot read another hospital's rows, encrypts or decrypts PHI with that hospital's key, writes an audit row, and returns JSON. CloudTrail records every AWS API call — including every `kms:Decrypt` — into a bucket with Object Lock.

### 3.3 Where the system is fragile (read before changing anything)

1. **496 of 500 CloudFormation resources.** A new route, alarm, or Lambda can fail the deploy. Check the count after every `cdk synth` (AKW-OPS-08 §3).
2. **Per-row data keys.** Listing N rows costs N KMS calls on a cold container. The DEK cache hides this for repeat reads; it does not make first reads free.
3. **Copied shared code.** `_shared/crypto.js` lives in 17 folders, `_shared/throttle.js` in 40. Change one, copy to all, verify with a hash.
4. **Ciphertext fields.** A DynamoDB filter on `name`, `dob`, `email`, `qid`, `phone`, `notes`, `education`, `licenseNumber` silently matches nothing.

---

## 4. Logical and physical architecture

### 4.1 Infrastructure map (every resource, with its CDK symbol)

Everything below is defined in `akwadona-cdk/lib/akwadona-cdk-stack.ts` unless noted. The CDK symbol is the variable name in that file — search for it.

#### 4.1.1 Keys and audit (the foundation)

| Resource | CDK symbol | Purpose | Notes |
|---|---|---|---|
| KMS key `alias/akwadona/data` | `akwadonaDataKey` | Encrypts the DynamoDB table, the frontend bucket, the documents bucket, and the seed-user secrets | Annual rotation. Every Lambda gets `grantEncryptDecrypt` because DynamoDB `CUSTOMER_MANAGED` encryption requires the caller to hold key access. |
| KMS key `alias/akwadona/audit` | `akwadonaAuditKey` | Encrypts the audit bucket + CloudTrail | Separate from the data key on purpose: a data-key compromise cannot touch the audit chain. |
| KMS keys `alias/akwadona-tenant-<slug>` and `-hmac` | **not in CDK** | Per-hospital PHI key + per-hospital HMAC key | Created by the operator wizard (`akwadona-operator-console/index.js`, search `CreateKeyCommand`). Tagged `akwadona:tenantId`. ARNs stored on the hospital's `TENANT#<slug>` row. |
| S3 `akwadona-access-logs-…` | `accessLogsBucket` | S3 + CloudFront service logs | SSE-S3 because those AWS services refuse KMS destinations. 7-year lifecycle. |
| S3 `akwadona-audit-v7-…` | `auditBucket` | CloudTrail + exported app audit | KMS (audit key), **Object Lock compliance mode, 7 years** — nobody, including root, can delete within the window. |
| CloudTrail `akwadona-cloudtrail` | `trail` | Every control-plane call, multi-region, log-file validation | Also mirrored to CloudWatch Logs (1-year retention). |

#### 4.1.2 Data

| Resource | CDK symbol | Purpose |
|---|---|---|
| DynamoDB table `Hospital` | `table` | The only table. PK/SK strings, pay-per-request, PITR (Point-In-Time Recovery) on, deletion protection on, TTL attribute **`expiresAt`**, encrypted with the data key. |
| 9 GSIs (Global Secondary Indexes) | `table.addGlobalSecondaryIndex` × 9 | See §6.3. Adding a GSI to a live table is one-per-deploy. |

#### 4.1.3 Identity

| Resource | CDK symbol | Purpose | Notes |
|---|---|---|---|
| Cognito pool `akwadona-user-pool` (`us-east-1_YibFfEdDD`) | `userPool` | Every user of every hospital + platform staff | 12-char password policy, 3-day temp passwords, `preventUserExistenceErrors`, Advanced Security `FULL_FUNCTION`, device tracking, **MFA = OPTIONAL (TOTP)** since 2026-10-29 (was OFF). Custom attribute `custom:tenantId`. |
| App client `Akwadona` (`6ndnfufmo100mq1rrmte7pqmhg`) | `appClient` | What the Angular app authenticates against | No secret. `USER_PASSWORD_AUTH` + SRP + custom flows. Access/ID tokens 1 h, refresh 30 d. |
| Groups `Admin`, `Developers`, `Doctors`, `Pharmacists`, `Operator` | `CfnUserPoolGroup` × 5 | Role source | `cognito:groups` claim. The frontend maps these to lowercase role names. |
| Lambda `cognito-pre-token-generation` | `preTokenFn` | Stamps `tenantId`, `role`, `tenantSlug`, `doctorId` into the JWT | V3_0 trigger. Read-only on the table + `kms:GenerateMac` on tenant HMAC keys (to find a doctor by encrypted email). Kept warm by `PreTokenWarmerRule` every 5 min because Cognito kills triggers at 5 s. |
| Cognito domain `akwadona-hospital` + custom `auth.akwadona.com` | `userPool.addDomain` (prefix only; custom domain was added by CLI, see `AKW-ADR-11 B.2`) | Token refresh endpoint | The user never sees a Cognito-hosted page. |

#### 4.1.4 Compute and API

| Resource | CDK symbol | Purpose |
|---|---|---|
| 39 API Lambdas | `fn(...)` factory, `readOnlyFunctions` + `readWriteFunctions` | One folder each under `akwadona-cdk/lambda/`. 512 MB, 30 s, Node 20 default (24 for the aggregate modules). Env: `TABLE_NAME`, `USER_POOL_ID`, `TENANT_KEYS`/`TENANT_HMAC_KEYS` (both `{}` — the wizard model made them obsolete). |
| 2 support Lambdas | `seedFn`, `usersFn` | Run once at deploy via CloudFormation custom resources: seed departments/specializations/counters; create 8 seed users with random temp passwords stored in Secrets Manager `/akwadona/seed-users/*`. |
| HTTP API `akwadona-api` | `api` | Single JWT authorizer (`HttpJwtAuthorizer` → the pool). CORS allow-list = localhost, raw CloudFront domain, `akwadona.com`, `www`, and each `tenantSlugs[]` subdomain. **Stage throttle 200 r/s sustained / 500 burst** (2026-10-29). |
| ~70 routes | `route(...)` + two `{proxy+}` catch-alls | Every route carries the authorizer. `/admin/{proxy+}` and `/operator/{proxy+}` fan out inside one Lambda each to save resources. |

#### 4.1.5 Edge

| Resource | CDK symbol | Purpose | Notes |
|---|---|---|---|
| S3 frontend bucket (`akwadonacdkstack-akwadonafrontendbucket…`) | `siteBucket` | Angular build output | KMS, versioned, access-logged, OAC-only (no public access). |
| CloudFront `E1YOKWKHQNSPQW` (`d378t54x9p802t.cloudfront.net`) | `distribution` | Serves the SPA on `akwadona.com` + `*.akwadona.com` | TLS 1.2 (2021) floor, redirect HTTP→HTTPS, managed `SECURITY_HEADERS` response policy, 403/404 → `index.html` for SPA routing, logs to the access-logs bucket. **No WAF attached** (edge stack disabled for cost). |
| ACM wildcard cert | `siteCert` (imported by ARN, created by CLI) | `*.akwadona.com` + apex | Lives in `us-east-1` by CloudFront rule; outside CDK so teardown keeps it. |
| S3 documents bucket (`akwadona-documents-…`) | `documentsBucket` | Patient uploads via pre-signed URLs | **KMS (data key) since 2026-10-29**, was SSE-S3. CORS to the same allow-list. Only `documentManagerFn` has access. |
| DNS | GoDaddy, not Route 53 | CNAMEs `www`, `tiryaq`, `alshifaa`, `auth` | See `AKW-OPS-08 §7` §3 for the GoDaddy workflow. |

#### 4.1.6 Operations

| Resource | CDK symbol | Purpose |
|---|---|---|
| SNS topic `akwadona-alarms` | `alarmTopic` | Alarm fan-out. Subscribe your e-mail once after deploy (see `AKW-OPS-08` §5). |
| Alarm `akwadona-api-5xx` | `api5xxAlarm` | ≥1 API 5xx in 5 min |
| Alarm `akwadona-lambda-errors` | `lambdaErrorsAlarm` | ≥1 Lambda error in 5 min, any function |
| Managed policy `akwadona-throttle-metrics` | `throttleMetricsPolicy` | One shared `cloudwatch:PutMetricData` policy (namespace `Akwadona/Throttle`) instead of 39 inline ones — saves 38 CFN resources. |
| EventBridge `PreTokenWarmerRule` | — | The only schedule. 5-minute warm-up ping to the pre-token Lambda. |

#### 4.1.7 Not deployed (but in the repo)

`akwadona-cdk/lib/akwadona-edge-stack.ts` — `AkwadonaEdgeStack`, a CloudFront-scoped WAFv2 WebACL (AWS managed Core + Known-Bad-Inputs rule sets + per-IP rate limit). Commented out in `bin/akwadona-cdk.ts` "to stop charges". Re-enable = uncomment two blocks + redeploy with `--all`. Cost ≈ $10/month.

---


### 4.2 Request lifecycle — `POST /patients`, hop by hop

Think of this as a parcel going through a sorting office. Each station checks something and either stamps it through or sends it back.

```
Browser (tiryaq.akwadona.com)
  │  patients.service.ts → Config.buildUrl('patients')
  │  offline-queue.interceptor: online? send : queue in IndexedDB
  │  auth.interceptor: add Authorization: Bearer <accessToken>   (only for API + Cognito hosts)
  ▼
API Gateway  ouohmmpi31                                    ~5 ms
  │  stage throttle: 200 r/s / 500 burst  → 429 if exceeded
  │  CORS: Origin in allow-list?          → no ACAO header if not
  │  HttpJwtAuthorizer: signature, issuer, audience, expiry → 401 if any fail
  │  route match: POST /patients → createPatientFn
  ▼
Lambda akwadona-create-patient                             cold ~400 ms / warm ~20 ms
  │  _warmup short-circuit
  │  getTenant(event): claims.tenantId, reject UNASSIGNED → 403
  │  throttle.precheck(): read TENANT profile (cached 60 s), UpdateItem THROTTLE#<tenant>/<minute> + /<day> → 429 if over plan
  │  validate body (required fields, shapes)
  │  stampHashes(): qidHash / emailHash / phoneHash via kms:GenerateMac on the tenant HMAC key   ~15 ms each, cached
  │  encryptItem(): kms:GenerateDataKey → DEK; AES-256-GCM each PHI field; store wrapped DEK on the row   ~15 ms
  │  TransactWriteCommand: PATIENT#<uuid>/PROFILE + QID_LOCK#<hash> + PHONE_LOCK#<hash> (all-or-nothing uniqueness)   ~15 ms
  │  PutCommand AUDIT#… row (who, what, when; before/after encrypted)
  │  return 201 { patientId }   (no CORS headers — API Gateway adds them)
  ▼
API Gateway adds Access-Control-Allow-Origin for the matching origin
  ▼
Browser: interceptors unwrap → component → signal update → UI re-renders
```

Timing budget for a warm call: ~80–120 ms end to end. Cold: add ~400 ms. The pre-token Lambda has the tightest budget (5 s, enforced by Cognito) — that is why it is the only warmed function.

**Where each defence lives:**

| Threat | Stopped at | By |
|---|---|---|
| No / forged / expired token | API Gateway | `HttpJwtAuthorizer` — no Lambda runs |
| Cross-site request from a strange origin | API Gateway | `corsPreflight` allow-list |
| Flood | API Gateway, then Lambda | Stage throttle, then `throttle.js` per-tenant plan |
| Reading another hospital's row | Lambda | `tenant-entityType-index` key condition + `tenantId` check on single-item reads → **404** (never 403: no existence oracle) |
| Operator reading PHI | IAM | Explicit `DENY kms:Decrypt` on the operator role for `alias/akwadona-tenant-*` + key-policy exclusion |
| Read-only Lambda writing | IAM | `grantReadData` + scoped `UpdateItem` on `THROTTLE#*` only (2026-10-29) |
| Stolen DynamoDB backup | Crypto | Rows hold ciphertext + a DEK wrapped by a key that never leaves KMS |
| Tampered audit history | S3 | Object Lock compliance mode, 7 years |

---


### 4.3 Login lifecycle

```
Angular login page (custom, 6 languages)
  │ cognito-auth.service.ts → POST cognito-idp.us-east-1.amazonaws.com  InitiateAuth USER_PASSWORD_AUTH
  ▼
Cognito
  │ password check; NEW_PASSWORD_REQUIRED / SOFTWARE_TOKEN_MFA challenges round-trip to the UI
  │ V3_0 pre-token trigger → cognito-pre-token-generation
  │     tenantId   ← custom:tenantId attribute (or "UNASSIGNED")
  │     role       ← "operator" if in Operator group else "tenant_user"
  │     tenantSlug ← Query tenant-entityType-index (tenantId, TENANT)          [was a table Scan]
  │     doctorId   ← if in Doctors group: HMAC(email, tenant) → Query emailHash-EntityType-index
  │                  fallback: Query email-index (legacy plaintext rows)         [was a table Scan on plaintext email — never matched encrypted doctors]
  │ issues access + id + refresh tokens with those claims in BOTH tokens
  ▼
Angular
  │ stores accessToken in sessionStorage (this tab) and localStorage (survive browser close)
  │ auth.guard reads it; role.guard maps cognito:groups → ['admin'|'developer'|'doctor'|'pharmacist']; operator.guard checks role === 'operator'
  │ tenant.service compares URL subdomain to tenantSlug claim → redirect if the user is on the wrong hospital's URL
```

Why a custom login and not Cognito's Hosted UI: branding, six languages, RTL (right-to-left) layout, and the hosted page cannot show the tenant's logo. The trade-off is that the app handles the challenge states itself (`cognito-auth.service.ts` already does, including `SOFTWARE_TOKEN_MFA`, which is why flipping MFA to OPTIONAL needed no UI change).

---


### 4.4 Code map

#### 4.4.1 Repository

```
hospital/
├── akwadona-cdk/
│   ├── bin/akwadona-cdk.ts            stack wiring; edge stack commented out
│   ├── lib/akwadona-cdk-stack.ts      THE infrastructure (1,500 lines)
│   ├── lib/akwadona-edge-stack.ts     WAF (not deployed)
│   └── lambda/
│       ├── _shared/                   REFERENCE copies: crypto.js, throttle.js, tenant.js, tenant-guard.js, compliance.js, plan-defaults.js
│       ├── lib/                       older reference copies (throttle.js with usage header)
│       ├── <one folder per Lambda>/   index.js + copies of whichever _shared files it needs
│       └── cognito-pre-token-generation/  index.js + crypto.js (since 2026-10-29)
├── src/
│   ├── app.routes.ts                  lazy routes + role sets
│   ├── app.config.ts                  providers, interceptors order
│   └── app/
│       ├── components/<21 features>/  standalone components, signals, OnPush
│       ├── services/<24>/             one HTTP client per domain + tenant/auth/config/cache
│       ├── guards/                    auth.guard, role.guard, operator.guard
│       └── interceptors/              offline-queue (first), auth (second)
├── scripts/
│   ├── cross-tenant-probe.js          A creates → B must 404 (manual)
│   ├── security-tests/                safe/ + destructive/ attack suite (manual)
│   ├── purge-throttle-counters.js     one-time cleanup after the ttl→expiresAt fix
│   ├── backfill-*.js, migrate-*.js    historical migrations
│   └── *.ps1                          deploy / recover / teardown
└── docs/                              you are here
```

#### 4.4.2 A Lambda folder, and why it looks like that

```
createPatient/
├── index.js          the handler
├── crypto.js         copied from _shared — envelope, HMAC, field lists
├── throttle.js       copied from _shared — per-tenant rate limit
├── plan-defaults.js  copied from _shared — plan → limits
└── function.zip      build artefact (gitignored)
```

`lambda.Code.fromAsset('lambda/<folder>')` zips **that folder only**. A `require('../_shared/x')` resolves at build time on your laptop and fails at runtime in Lambda. So shared code is copied. The cost is 16 copies of `crypto.js`; the benefit is zero Lambda Layer resources (each layer version would be a CFN resource) and no cross-folder coupling at deploy. Keep the copies identical — `md5sum` them (see `AKW-OPS-08` §6).

Every handler has the same spine:

```js
exports.handler = async (event) => {
  if (event._warmup) return { ok: true };                          // warmer short-circuit
  let tenantId; try { tenantId = getTenant(event); } catch (e) { return err(403) }   // JWT claim, reject UNASSIGNED
  const limit = await throttle.precheck(event, { tenantId, role }); if (limit) return limit;   // 429
  // ... role gate if the route is privileged (isAdmin / role === 'operator' / requireAdminOrOperator)
  // ... validate, work (Query the tenant GSI, never Scan), encrypt/decrypt, audit row
  return ok(body);                                                 // no CORS headers
};
```

#### 4.4.3 The Angular layers

| Layer | Files | Rule |
|---|---|---|
| Routes | `src/app.routes.ts` | Every feature is `loadComponent` (lazy). Role sets are constants at the top (`ADMIN_ROLES`, `PATIENTS_ROLES`, …). |
| Guards | `guards/` | `authGuard` (token present + not expired) → `roleGuard(set)` (group ∈ set) → `operatorGuard` (`role === 'operator'`). Order matters. |
| Interceptors | `interceptors/` | `offlineQueueInterceptor` runs first (queue or pass), `authInterceptor` second (adds the bearer only for the API host and Cognito hosts — never to third parties). |
| Services | `services/` | One per backend domain, all through `Config.buildUrl()`. `tenant.service.ts` reads the subdomain and the `tenantSlug` claim; `cognito-auth.service.ts` owns login/challenges/refresh. |
| Components | `components/` | Standalone, `ChangeDetectionStrategy.OnPush`, state in signals, PrimeNG widgets, Tailwind utilities. |
| PWA | `ngsw-config.json`, `offline-queue.interceptor.ts` | App shell cached; writes queued in IndexedDB while offline and drained on reconnect. |

No `innerHTML`, no `bypassSecurityTrust*`, no `eval` anywhere in `src/app` (checked 2026-10-29). Tokens are never logged.

---



### 4.5 Environments

| Environment | Exists? | Notes |
|---|---|---|
| Production | Yes — `AkwadonaCdkStack` in `483176634665` / `us-east-1` | The only deployed stack. Both tenants live here. |
| Development / staging | **No** | Destructive security tests and the cross-tenant probe should run against a second stack in a separate account. Deploying one is `cdk deploy` with `CDK_DEPLOY_ACCOUNT` set (AKW-OPS-08 §3); the two-phase alias deploy is not needed because no aliases are attached (`-c skipAliases=1`). Listed as a risk in AKW-RR-12. |
| Local | `ng serve` against the production API | Use test accounts only (AKW-EH-10 §6). |

---

## 5. Data architecture

### 5.1 Data model

#### 5.1.1 One table, many shapes

Think of one filing cabinet with coloured labels. The label is `EntityType`; the drawer is `PK`; the folder inside the drawer is `SK`.

| EntityType | PK | SK | What |
|---|---|---|---|
| `TENANT` | `TENANT#<slug>` | `PROFILE` | One per hospital: `tenantId`, plan, `kmsKeyArn`, `kmsHmacKeyArn`, display name |
| `PATIENT` | `PATIENT#<uuid>` | `PROFILE` | PHI encrypted; `qidHash` / `emailHash` / `phoneHash` for lookup |
| `QID_LOCK` / `PHONE_LOCK` / `EMAIL_LOCK` | `<KIND>_LOCK#<hmac>` | `LOCK` | Uniqueness guard written in the same transaction as the profile |
| `DOCTOR` | `DOCTOR#<uuid>` | `PROFILE` | PHI encrypted (incl. email); same lock pattern |
| doctor↔patient link | `DOCTOR#<uuid>` | `PATIENT#<uuid>` | Which doctor can see which patient |
| `APPOINTMENT`, `EXAM`, `MED`, `DISPENSE`, `PO`, `CALENDAR`, `DONOR`, `BBUNIT`, `BBREQ`, `SCRIBE` | `<PREFIX>#<uuid>` | `PROFILE` or sub-rows | Module rows; see each module doc |
| `AUDIT` | `AUDIT#<date>` | `<timestamp>#<uuid>` | Who did what; before/after JSON encrypted |
| `COUNTER` | `COUNTER#PATIENTS#<tenantId>` | `TOTAL` | O(1) totals for list pages |
| `THROTTLE_COUNTER` | `THROTTLE#<tenantId>` | `<minute>` / `<day>` | Rate-limit windows; `expiresAt` set (fixed 2026-10-29) |
| `IDEMP` | `IDEMP#<clientRequestId>` | … | 24 h idempotency memory for mutating calls |

Every row also carries `tenantId`, `dataClass` (`PHI` / `PII` / `PUBLIC` / `AUDIT` / `SYSTEM`), `createdAt`, `updatedAt` (string, never null — `dataClass-index` needs it).

#### 5.1.2 Three kinds of field

| Kind | Examples | Stored as | Can filter in DynamoDB? | Can search? |
|---|---|---|---|---|
| Plaintext | `gender`, `insurance`, `status`, `department`, `specialization`, `bloodGroup`, `dutyDays`, `hiringDate`, `createdAt` | the value | **Yes** | Yes (FilterExpression) |
| Encrypted | `name`, `dob`, `qid`, `phone`, `email`, `medicalHistory`, `notes`, `allergies`, `medications`, `licenseNumber`, `education` | base64 `iv‖tag‖ct` per field + one `_kms_dek` per row | **No — silently matches nothing** | Only after `decryptItems()` in memory |
| Hashed | `qidHash`, `emailHash`, `phoneHash` | HMAC-SHA256 hex via the tenant's KMS HMAC key | Equality only, via a GSI | Exact match ("find by QID") |

The list in `crypto.js` (`PATIENT_PHI_FIELDS`, `DOCTOR_PHI_FIELDS`, `APPOINTMENT_PHI_FIELDS`, …) is the law. If you add a field, decide which kind it is there first.

#### 5.1.3 The nine GSIs

| Index | Keys | Use it for | Don't |
|---|---|---|---|
| `tenant-entityType-index` | `tenantId` / `EntityType` | **Every per-tenant list.** The workhorse. | — |
| `EntityType-index` | `EntityType` | Global rows: `TENANT` list, departments, specializations | per-tenant lists (no tenant bound) |
| `emailHash-EntityType-index` | `emailHash` / `EntityType` | Find PATIENT or DOCTOR by email (after HMAC) | — |
| `email-index` | `email` / `EntityType` | Legacy: DOCTOR rows that pre-date encryption | anything new — `email` is ciphertext now |
| `PatientID-index` | `patientId` / `SK` | Rows that hang off a patient (payments, surgeries) | — |
| `doctorEmail-createdAt-index` | `doctorEmail` / `createdAt` | Invoices per doctor by date | — |
| `dataClass-index` | `dataClass` / `updatedAt` (KEYS_ONLY) | Forensics: "every PHI row touched between t1 and t2" | — |
| `GSI1` | `GSI1PK` / `GSI1SK` | Generic adjacency (modules) | — |
| `GSI2` | `name_prefix` / `name_lower` | **Unused** — `name` is encrypted, nothing writes these keys | name search (do it in memory) |

---



### 5.2 Data lifecycle and retention

| Data | Retention | Mechanism |
|---|---|---|
| Clinical rows (PATIENT, EXAM, …) | Indefinite; soft-delete via `deletedAt`, hard delete operator-assisted | HIPAA 6-year minimum; PDPPL purpose limitation |
| Application audit rows (`AUDIT#`) | Indefinite in table; exported to the audit bucket | 7-year Object Lock on export |
| CloudTrail | 7 years | S3 Object Lock compliance mode |
| Throttle counters, idempotency keys | Minutes to 24 h | DynamoDB TTL on `expiresAt` |
| Uploaded documents | Indefinite; versioned | S3 versioning; 180-day non-current expiry on the frontend bucket only |
| Backups | 35 days continuous | DynamoDB Point-In-Time Recovery |

### 5.3 Tenant erasure
Schedule deletion of the tenant's two KMS keys (7–30 day pending window). Every `_kms_dek` on every row becomes unwrappable; the ciphertext stays but is permanently unreadable — including by Akwadona. This satisfies GDPR Art. 17 at the tenant level without touching rows. Row-level erasure within a live tenant is a soft-delete plus audit-log scrub (operator-assisted).

---

## 6. Security architecture (summary — full control set in AKW-SSP-05)

### 6.1 Encryption design

#### 6.1.1 Envelope per row

```
write:  DEK = kms:GenerateDataKey(tenant data key)        → plaintext + wrapped
        field = AES-256-GCM(field, DEK, fresh IV)          per PHI field
        row._kms_dek = wrapped DEK                          stored with the row
        DEK plaintext wiped from memory (cached copy kept 5 min — §7.3)

read:   DEK = cache hit ? cached : kms:Decrypt(row._kms_dek)
        field = AES-256-GCM⁻¹(field, DEK)
```

Analogy: each row is a locked box; the box's key is itself locked in a hospital-owned safe (the KMS key). Melting the safe key (`ScheduleKeyDeletion`) makes every box permanently unopenable — that is cryptographic erasure, and it is how "right to be forgotten" works at the hospital level.

#### 6.1.2 Zero-knowledge — three independent layers

1. **Identity policy:** the operator Lambda role carries `DENY kms:Decrypt|Encrypt|GenerateDataKey*|GenerateMac|VerifyMac|ReEncrypt*` on any key whose alias matches `alias/akwadona-tenant-*`. Explicit DENY beats any ALLOW anywhere.
2. **Resource policy:** each tenant key's policy grants use only to principals matching `AkwadonaCdkStack-*ServiceRole*` and excludes `*Operator*`.
3. **Code:** `akwadona-operator-console/index.js` never imports `crypto.js`.

Since 2026-10-29 a fourth guard protects the keys themselves: the operator may `ScheduleKeyDeletion` only on keys tagged `akwadona:tenantId` (so never the platform data/audit keys or anything hand-made), and is explicitly DENIED on the live tenants' tags (`T_2572fc71`, `T_a4b8aef9`). Add new tenant IDs to `PROTECTED_TENANT_IDS` after onboarding is confirmed.

#### 6.1.3 DEK cache (2026-10-29)

`_shared/crypto.js` keeps a `Map<wrappedDekBase64, plaintextDek>` with a 5-minute TTL (Time To Live) and 2,000-entry cap, wipe-on-evict. Repeat reads of the same rows within a container's life cost zero KMS calls. `decryptItems()` also caps parallel KMS calls at 32 so a big page cannot trip the account-wide KMS quota.

Security note: plaintext DEKs in Lambda memory for ≤5 min is the same model the AWS Encryption SDK's caching CMM uses. The operator Lambda cannot reach this path at all (layer 1 above).

#### 6.1.4 HMAC search

`computeHmac(value, tenantId)` → `kms:GenerateMac` on the tenant's HMAC key → hex. Same plaintext + same tenant = same hash; different tenant = different hash. So `john@gmail.com` at Tiryaq and at Alshifaa produce unrelated fingerprints, and a stolen table cannot be joined across hospitals. The secret never leaves the HSM (Hardware Security Module).

---



### 6.2 Defence in depth — where each threat is stopped

| Threat | Stopped at | By |
|---|---|---|
| No / forged / expired token | API Gateway | `HttpJwtAuthorizer` — no Lambda runs |
| Cross-site request from a strange origin | API Gateway | `corsPreflight` allow-list; Lambdas never echo CORS headers |
| Flood | API Gateway, then Lambda | Stage throttle 200 r/s / 500 burst, then `throttle.js` per-tenant plan |
| Reading another hospital's row | Lambda | GSI key condition on `tenantId` + `tenantId` check on single-item reads → 404 |
| Privileged write by a low-privilege user | Lambda | Role gates (`isAdmin`, `role === 'operator'`, `requireAdminOrOperator`) |
| Operator reading PHI | IAM | Explicit `DENY kms:Decrypt…` on the operator role for `alias/akwadona-tenant-*` + key-policy exclusion |
| Operator destroying a live tenant's key | IAM | `ScheduleKeyDeletion` allowed only on wizard-tagged keys + explicit DENY on live tenant tags |
| Read-only Lambda writing | IAM | `grantReadData` + `UpdateItem` scoped to `THROTTLE#*` |
| Stolen DynamoDB backup or S3 object | Cryptography | Ciphertext + wrapped DEK; keys never leave KMS |
| Tampered audit history | S3 | Object Lock compliance mode, 7 years |
| Enumeration via Cognito | Cognito | `preventUserExistenceErrors: true` |
| Weak passwords | Cognito | 12 chars, all classes, 3-day temp validity, Advanced Security |

### 6.3 Identity and access summary

| Principal | Can | Cannot |
|---|---|---|
| Tenant Lambda role (`AkwadonaCdkStack-*ServiceRole*`) | Read/write (or read-only) the table; use the platform data key; use any tenant key the key policy admits | Touch keys of other AWS accounts; call Cognito admin APIs (except admin-panel / operator roles) |
| Operator Lambda role | List tenants, usage, audit metadata; create/tag keys for new tenants; manage Cognito users | Decrypt / encrypt / MAC with any tenant key; schedule deletion of live tenants' keys |
| Pre-token Lambda role | Read the table; `GenerateMac` on tenant HMAC keys | Decrypt anything |
| Deploy user | Update the stack | Read patient data |
| Human engineer (read-only profile) | View everything in the console | Change anything |

---

## 7. Integration architecture

| Integration | Direction | Protocol | Contract | Failure mode |
|---|---|---|---|---|
| Angular app ↔ API Gateway | Out | HTTPS/JSON, `Authorization: Bearer` | AKW-ICD-04 | Offline queue in IndexedDB; replayed with `X-Client-Request-Id` idempotency |
| Angular app ↔ Cognito | Out | `InitiateAuth`, `ForgotPassword`, `RespondToAuthChallenge` (JSON over HTTPS) | AWS Cognito IDP API | User-friendly error mapping; raw exception names never shown |
| Angular app ↔ S3 documents | Out | Pre-signed PUT/GET, 5-minute expiry | Key format `folder/<tenantId>/<userId>/<ts>_<file>` | 403 from S3 on any tampering |
| Lambda ↔ Bedrock | Out | `InvokeModel`, Anthropic messages format | Inference profile `us.anthropic.claude-haiku-4-5-20251001-v1:0`, `max_tokens` 2000 | Non-JSON output → 502 to the user; transcript < 20 chars → 400 |
| Cognito ↔ SES | Out | Cognito `DEVELOPER` e-mail sending through SES identity `akwadona.com` | DKIM-signed, `noreply@akwadona.com` | Sandbox cap 200/day until production access |
| CloudWatch ↔ SNS | Out | Alarm actions | Topic `akwadona-alarms` | Subscription must be confirmed by e-mail |
| GoDaddy DNS → CloudFront | In | CNAME | `<slug>` → `d378t54x9p802t.cloudfront.net` | Manual; wildcard alias on CloudFront covers any slug |
| External labs / PACS / FHIR | — | **Not implemented** | Roadmap (AKW-RR-12) | — |

---

## 8. Non-functional requirements and how they are met

| NFR | Target | Mechanism | Evidence |
|---|---|---|---|
| Availability | 99.9 % monthly | All managed, multi-AZ services (each ≥ 99.99 %); no single server | AWS SLAs; CloudFront + API Gateway + Lambda + DynamoDB |
| Latency | p95 < 300 ms warm API call; first paint < 1 s | 512 MB Lambdas (cold ~400 ms), CloudFront edge cache, GSI queries, DEK cache | AKW-SAD-02 §4.2 timing budget |
| Login | < 5 s hard cap (Cognito) | Pre-token Lambda warmed every 5 min; GSI queries only | `PreTokenWarmerRule` |
| Scalability | ~5,000 concurrent users / region without re-architecture | Serverless auto-scale; limits table in §8.1 | Appendix C (scalability report) |
| Recovery | RPO 15 min (PITR continuous), RTO 4 h (full rebuild) | DynamoDB PITR 35 d; stack rebuild runbook | AKW-OPS-08 §6 |
| Security | See AKW-SSP-05 | — | — |
| Cost | ~$15–30 / month at 2 tenants; linear per tenant | Pay-per-request everywhere; fixed costs are 6 KMS keys + Cognito Advanced Security | Appendix B §17 |
| Observability | Any 5xx or Lambda error alarms within 5 min | 2 alarms → SNS; CloudWatch Logs per function; custom `Akwadona/Throttle` metric | AKW-OPS-08 §4 |
| Accessibility / i18n | 6 languages, RTL | ngx-translate; PrimeNG RTL | AKW-FS-03 §12 |

### 8.1 Scaling limits per component

| Component | Scaling model | Hard limit | Action when approached |
|---|---|---|---|
| CloudFront | Global edge | Effectively unlimited | — |
| API Gateway HTTP API | Regional | 10,000 r/s per account | Support ticket |
| Lambda | Concurrency | 1,000 concurrent per region (default) | Raise to 10k via ticket; reserve concurrency for pre-token |
| DynamoDB on-demand | Per table | 40k RCU / 40k WCU, instant | Split hot partitions (unlikely at tenant scale) |
| KMS Decrypt / GenerateDataKey | Per account | 10,000 r/s shared | DEK cache (done); per-tenant DEK (planned) |
| KMS GenerateMac | Per key | 1,500 r/s | HMAC cache (done); one key per tenant isolates load |
| Cognito sign-ins | Per pool | 80 r/s default | Ticket |
| S3 | Per prefix | 3,500 PUT / 5,500 GET r/s | Tenant-prefixed keys already spread load |

### 8.2 Per-tenant rate plans (application-level throttle)

| Plan | Requests / second | Requests / minute | Daily quota |
|---|---|---|---|
| `free` | 10 | 600 | 100,000 |
| `standard` | 100 | 6,000 | 1,000,000 |
| `enterprise` | 500 | 30,000 | 10,000,000 |
| `enterprise-isolated` | 500 | 30,000 | 10,000,000 (own table + Lambdas — roadmap) |

Per-tenant overrides live on the `TENANT` row (`limits.rps`, `limits.dailyQuota`). Operator role is exempt. Breach returns 429 with `Retry-After` and publishes `Akwadona/Throttle`. Source: `_shared/plan-defaults.js`, `_shared/throttle.js`.

---

## 9. Technology stack

| Layer | Technology | Version / notes |
|---|---|---|
| Front end | Angular, standalone components, signals, `OnPush` | 20 |
| UI kit | PrimeNG + Tailwind CSS | PrimeNG (RTL-capable), Tailwind v4 |
| i18n | ngx-translate | en, ar, fr, es, hi, ur |
| PWA | Angular service worker (`ngsw`) + IndexedDB offline queue | — |
| API | AWS API Gateway HTTP API v2 + JWT authorizer | — |
| Compute | AWS Lambda, Node.js | 20 default; 24 for aggregate modules |
| SDK | `@aws-sdk/*` v3 (runtime-provided) | — |
| Data | DynamoDB single-table, 9 GSIs, PITR, TTL | — |
| Storage | S3 (frontend, documents, access logs, audit) | — |
| Identity | Cognito user pool + custom Angular login | — |
| Keys | KMS symmetric CMKs + HMAC_256 CMKs | — |
| AI | Amazon Bedrock, Claude Haiku 4.5, cross-region inference profile | — |
| E-mail | Amazon SES (DKIM, custom MAIL FROM) | — |
| Edge | CloudFront + ACM wildcard certificate; WAFv2 defined but not deployed | — |
| IaC | AWS CDK v2 (TypeScript) → CloudFormation | `aws-cdk-lib` 2.244.0 |
| Observability | CloudWatch Logs/Metrics/Alarms, CloudTrail, SNS | — |
| Source control | GitHub `appdevmate/hospital`, branch `development` | — |

---

## 10. Design decisions (summary — full records in AKW-ADR-11)

| # | Decision | Why | Cost today | Plan |
|---|---|---|---|---|
| 1 | **One CloudFormation stack** | Simplest deploy; one `cdk deploy` | **496/500 resources.** Each new route/alarm/Lambda risks a failed deploy. Alarms were skipped for a year because of this. | Split into `AkwadonaCoreStack` (table, keys, Cognito), `AkwadonaApiStack` (Lambdas + routes), `AkwadonaMonitoringStack` (alarms, probes). Cross-stack refs via `cdk.Fn.importValue`. Highest-value refactor on the board. |
| 2 | **Per-row DEK** | Per-row rotation + fine-grained erasure | Listing N rows = N KMS calls cold. Sorted lists must load the whole tenant set. | Per-tenant DEK (one `GenerateDataKey` per tenant per container) with per-field IV. Needs a `_kms_v: 2` format and a backfill. Makes lists O(page). |
| 3 | **Encrypt `name` and `dob`** | They are PHI | Cannot sort/filter server-side; done in memory after decrypt (2026-10-29). Fine to ~10k rows/tenant. | Either (a) per-tenant DEK above, or (b) a deterministic `nameSortKey` = HMAC of the lower-cased first 3 chars (leaks only bucket membership) for server-side ordering. |
| 4 | **Pooled multi-tenancy, one table** | 100 hospitals ≠ 100 stacks; cheapest to run | Blast radius: a bug in a tenant filter is cross-tenant. Mitigated by the GSI key condition + 404 rule + probe. | Silo tier (own table + own Lambda set) is the premium offering; the code already resolves keys per tenant so it is mostly CDK. |
| 5 | **Copy, don't import, shared code** | No Layer resources, no runtime surprise | 16 copies to keep identical | A `scripts/sync-shared.ps1` that copies + verifies md5; a pre-commit check. |
| 6 | **Custom login, not Hosted UI** | Branding, i18n, RTL | App owns challenge flows | Done; MFA challenge already handled. |
| 7 | **WAF disabled** | ~$10/month | No managed-rule filtering at the edge; stage throttle is the stand-in | Re-enable when a third tenant signs. Two uncomments. |
| 8 | **MFA OPTIONAL** | Was OFF; REQUIRED would lock out un-enrolled users | Phishable passwords for Operator/Admin | Enrol every Operator/Admin, then flip `Mfa.REQUIRED`. Product decision. |
| 9 | **Probes run by hand** | No spare CFN resources for an EventBridge rule + Lambda | Sales claim "nightly" was false — now reworded | GitHub Actions cron on `run-safe.js` (zero AWS resources) **this week**; EventBridge after the stack split. |
| 10 | **No CSP (Content-Security-Policy) header** | PrimeNG/Tailwind inline styles need `'unsafe-inline'` for styles | XSS blast radius is larger than it could be | Custom `ResponseHeadersPolicy` (+1 CFN resource) with `default-src 'self'; connect-src <api> <cognito>; style-src 'self' 'unsafe-inline'`. After the split. |
| 11 | **Tokens in localStorage** | SPA with no cookie-setting backend | XSS = token theft (mitigated by no `innerHTML`, strict interceptor host list, 1 h expiry) | Move to httpOnly cookie via a tiny token-exchange Lambda — only if a CSP cannot be shipped. |
| 12 | **Secrets in env vars** | Nothing third-party yet | Fine today | Secrets Manager when the first external integration (lab, PACS) arrives. |

---


---

## 11. Change procedures (summary — step-by-step in AKW-EH-10 §5)

**Add a Lambda**
1. Copy an existing folder of the same shape (read-only → `getPatientByID`; mutating → `createPatient`; module → `akwadona-pharmacy`).
2. Keep the handler spine (§8.2). `getTenant` → `throttle.precheck` → role gate if needed.
3. Copy `crypto.js` / `throttle.js` / `plan-defaults.js` from `_shared/`, never `require('../_shared')`.
4. In the CDK: `fn(...)` with `functionName: 'akwadona-<kebab>'`; add to `readOnlyFunctions` **or** `readWriteFunctions`; add routes with `route(...)` (each route = 1 resource — prefer a `{proxy+}` if the Lambda has >3 paths).
5. `cdk synth` and check the resource count: `python -c "import json;print(len(json.load(open('cdk.out/AkwadonaCdkStack.template.json'))['Resources']))"` must be ≤ 500.
6. Add a line to `scripts/security-tests/safe/02-unauthenticated.js` `ROUTES` and, if it has tenant data, to `destructive/10-cross-tenant-crud.js`.

**Add a field to PATIENT / DOCTOR**
1. Decide: plaintext, encrypted, or hashed (§6.2). PHI → encrypted (+ hashed only if you must look it up by equality).
2. Encrypted → add to `PATIENT_PHI_FIELDS` in `_shared/crypto.js` → copy to 16 folders. Hashed → add to `PATIENT_HASH_FIELDS` too.
3. Never reference an encrypted field in a `FilterExpression` or `KeyConditionExpression`. In `getAllPatients`, encrypted filters go in `applyEncryptedFilters`, plaintext in `buildPlaintextFilter`.
4. `normalizePatient()` in every list/get Lambda.
5. `AKW-SAD-02-Solution-Architecture-Document.md` (when written) and the Angular model.

**Onboard a tenant**
1. Operator wizard (`AKW-FS-03 §16.1`). It creates the two KMS keys (tagged), the TENANT row, the admin user.
2. Add the slug to `tenantSlugs[]` in the CDK (CORS) and to `callbackUrls`/`logoutUrls`; redeploy.
3. GoDaddy CNAME `<slug>` → `d378t54x9p802t.cloudfront.net` (wildcard alias on CloudFront already covers it).
4. After the first successful week, add the new `tenantId` to `PROTECTED_TENANT_IDS` in the CDK so its keys can never be scheduled for deletion by the operator role.

**Add a GSI**
One per `cdk deploy`. DynamoDB refuses two in one update. Projection `KEYS_ONLY` unless you need attributes — each projected attribute is storage you pay for twice.

**Deploy**
`AKW-OPS-08-Operations-Runbook.md`. Short version: `cdk synth` (type-check + resource count) → `cdk deploy` → Lambda-only changes via `update-function-code` → frontend `ng build` → `aws s3 sync` → CloudFront invalidation → run `scripts/security-tests/run-safe.js` → run `scripts/cross-tenant-probe.js` against a dev stack.

---


---

## Appendix A — AWS service reference (every service except DynamoDB, S3, Lambda, API Gateway)

Each service: what it is, a real-life example, what Akwadona uses it for, where to find it in the AWS console, where to find it in the code, and why it was chosen. Status banners mark anything currently disabled.

### 1. Amazon Cognito — the user register

#### 1.1 What it is
Cognito is AWS's user-register service. It stores accounts, checks passwords, and hands out short-lived passes.

#### 1.2 Real-life example
Think of the guest register at a hotel chain. When you arrive, the front desk checks your passport, writes you into the book, and gives you a plastic room-card. The room-card lets you open the lobby, the lift, your floor, and your room — but it stops working at check-out. Cognito is that register. The room-card is the **JWT** (JSON Web Token).

#### 1.3 What Akwadona uses it for
- Stores one user record for every doctor, nurse, pharmacist, admin, and platform operator across every hospital.
- Checks the password (or an SMS code) at sign-in.
- Issues a JWT that lives for ~1 hour and names three things about the user: who they are, which hospital they belong to (`tenantId`), and which role they have (doctor / nurse / admin / operator).
- Supports "Forgot password?" and admin password resets.

Our pool holds every tenant's users together. The `tenantId` on the token tells the backend which hospital this user belongs to.

#### 1.4 Where in AWS Console
`https://us-east-1.console.aws.amazon.com/cognito/v2/idp/user-pools/us-east-1_YibFfEdDD/users`

The pool ID is `us-east-1_YibFfEdDD` as of 2026-10-04. If the stack was torn down, look it up again with `aws cognito-idp list-user-pools --max-results 10`.

#### 1.5 Where in our code
- CDK (Cloud Development Kit) stack: `akwadona-cdk/lib/akwadona-cdk-stack.ts` — search for `new cognito.UserPool`. Note `mfa: cognito.Mfa.OPTIONAL` (was OFF until 2026-10-29) and `standardThreatProtectionMode: FULL_FUNCTION` (Advanced Security, billed per active user).
- Pre-token Lambda (the receptionist that stamps the pass): `akwadona-cdk/lambda/akwadona-pretoken/index.js` — adds `tenantId`, `doctorId`, `roles` to the JWT.
- Angular login page: `src/app/components/auth/login.component.ts` — calls Cognito directly from the browser.
- Angular guards and interceptors: `src/app/services/auth.service.ts` + `src/app/interceptors/auth.interceptor.ts`.

#### 1.6 Why Cognito, not something else
Cognito is deeply integrated with API Gateway. API Gateway can check a Cognito JWT without any code of ours. Auth0 or Okta would mean building our own JWT verifier and paying per user. Cognito's free tier covers our current scale.

---

### 2. AWS KMS (Key Management Service) — the hotel-room safe

#### 2.1 What it is
**KMS** (Key Management Service) is AWS's key vault. It generates, stores, and uses encryption keys without ever letting anyone (including Amazon staff) copy the raw key out.

#### 2.2 Real-life example
Each hotel room has its own in-room safe. You put your passport in, lock it, and only you have the combination. The hotel staff can see the safe exists, can even replace it, but cannot open it. KMS keys work the same way — they live inside an AWS **HSM** (Hardware Security Module), and even Amazon engineers cannot export them.

#### 2.3 What Akwadona uses it for
Three jobs:

**Job 1 — Encrypt patient data (per-tenant data CMK).**
- Each hospital gets its own key, named `alias/akwadona-tenant-<slug>` (for example `alias/akwadona-tenant-tiryaq`).
- Before we save a patient's name to the database, we encrypt it with that hospital's key.
- The platform operator role has an explicit "deny" on `kms:Decrypt` for every tenant key. So even the person running the servers cannot read the patient data. This is the zero-knowledge promise.

**Job 2 — Searchable fingerprints (per-tenant HMAC CMK).**
- A separate key per hospital, used to compute **HMAC** (Hash-based Message Authentication Code) fingerprints.
- When a doctor searches by Qatari ID, we don't unlock the data. We ask KMS to compute the fingerprint of the ID the doctor typed, then look up any row with the same fingerprint.
- The analogy: giving the hotel reception a fingerprint scanner instead of asking them to open every safe.

**Job 3 — Encrypt the storage layer (platform CMKs).**
- `alias/akwadona/data` encrypts the DynamoDB table, the frontend S3 bucket, and (since 2026-10-29) the patient-documents S3 bucket. `alias/akwadona/audit` encrypts the CloudTrail/audit bucket, kept separate so a data-key compromise cannot touch the audit chain. This protects the raw storage media; it does not substitute for Job 1.

#### 2.4 Where in AWS Console
`https://us-east-1.console.aws.amazon.com/kms/home?region=us-east-1#/kms/keys`

Filter by alias prefix `akwadona-`.

#### 2.5 Where in our code
- CDK key creation: `akwadona-cdk/lib/akwadona-cdk-stack.ts` — search for `new kms.Key`.
- Tenant key setup (two per hospital, created by the onboarding wizard): inside `akwadona-cdk/lambda/akwadona-operator-console/index.js` — search for `CreateKeyCommand`. The wizard tags each key `akwadona:tenantId` + `akwadona:purpose` (`data` | `hmac`) and writes both ARNs to the hospital's `TENANT#<slug>` row; `crypto.js` reads them from there at runtime.
- Encrypt/decrypt helpers inlined into every Lambda that touches patient data: see `akwadona-cdk/lambda/akwadona-create-patient/index.js` for the canonical pattern.
- The operator deny policy: `akwadona-cdk/lib/akwadona-cdk-stack.ts` — search for `addToPolicy.*Deny.*kms`.

#### 2.6 Why KMS, not our own encryption
Rolling your own key management is the fastest way to lose keys and lose data. KMS has FIPS 140-2 Level 3 HSMs, audit trails on every use, and 99.999% availability. The per-use cost is $0.03 per 10,000 operations — cheap for our volume.

---

### 3. Amazon CloudFront — the corner shop near your home

#### 3.1 What it is
CloudFront is AWS's **CDN** (Content Delivery Network). It caches our website at hundreds of locations around the world so visitors load pages from a server near them.

#### 3.2 Real-life example
Imagine the main warehouse of a bookshop is in London. If a reader in Doha wants a book, shipping takes a week. So the shop opens a tiny branch in Doha that stocks the top 100 titles. The reader walks in, gets the book instantly. CloudFront is that tiny branch, repeated in 400+ cities. Our main warehouse is the S3 bucket in `us-east-1` (Virginia); the Doha branch is a CloudFront "edge location".

#### 3.3 What Akwadona uses it for
- Serves our Angular website — `index.html`, JavaScript bundles, images, fonts — from the edge location nearest the visitor.
- Caches static files for 1 year (we rename them on every build to force a fresh fetch).
- Caches `index.html` for 0 seconds (so a fresh deploy appears instantly).
- Terminates **TLS** (Transport Layer Security — the "s" in `https`) with our ACM certificate.
- Routes traffic for every tenant subdomain (`tiryaq.akwadona.com`, `alshifaa.akwadona.com`, `www.akwadona.com`) to the same bucket. The frontend reads the hostname to decide which hospital's logo to show.

#### 3.4 Where in AWS Console
`https://us-east-1.console.aws.amazon.com/cloudfront/v4/home#/distributions/E1YOKWKHQNSPQW`

Our distribution ID is `E1YOKWKHQNSPQW`; its raw domain is `d378t54x9p802t.cloudfront.net` (GoDaddy CNAMEs point here). `d6i7iwknkj0bg.cloudfront.net` was the Tiryaq-era distribution destroyed in the 2026-06-30 teardown — it was still in the CORS allow-list and Cognito callback URLs until the 2026-10-29 cleanup.

#### 3.5 Where in our code
- CDK distribution: `akwadona-cdk/lib/akwadona-cdk-stack.ts` — search for `new cloudfront.Distribution`.
- Angular build output pointed at CloudFront: `angular.json` + `src/environments/environment.prod.ts`.
- Cache invalidation command (run after every frontend deploy): `scripts/deploy-frontend.ps1` — see also [`AKW-OPS-08-Operations-Runbook.md`](AKW-OPS-08-Operations-Runbook.md) §4.

#### 3.6 Why CloudFront, not just serve S3 directly
S3 is a warehouse — one physical location, slow for visitors on other continents. CloudFront is the corner-shop network on top. It also gives us TLS termination, custom domains, HTTP/2, and WAF integration — none of which S3 does on its own.

---

### 4. AWS Certificate Manager (ACM) — the free, auto-renewing padlock

#### 4.1 What it is
**ACM** (AWS Certificate Manager) issues and renews TLS certificates for free. A TLS certificate is what makes a URL start with `https` instead of `http`, and what makes the padlock icon show in the browser.

#### 4.2 Real-life example
Think of a notary who stamps a document to prove it is really yours. The browser sees the stamp when it loads your site and tells the user "yes, this is really akwadona.com, not an imposter". The stamp expires every year. ACM is the notary — and it re-stamps the document automatically before it expires.

#### 4.3 What Akwadona uses it for
- One wildcard certificate for `*.akwadona.com` + `akwadona.com` — covers `www`, `tiryaq`, `alshifaa`, and any future tenant subdomain in one certificate.
- One certificate for `auth.akwadona.com` — the custom Cognito domain.
- ACM renews both certificates automatically, no action needed from us.

Wildcard means: the asterisk `*` matches any single subdomain. So `*.akwadona.com` covers `anything.akwadona.com`, but not `foo.bar.akwadona.com` (two levels deep).

#### 4.4 Where in AWS Console
`https://us-east-1.console.aws.amazon.com/acm/home?region=us-east-1#/certificates/list`

CloudFront requires the certificate to be in `us-east-1` even if the rest of the stack is in another region.

#### 4.5 Where in our code
- CDK certificate lookup: `akwadona-cdk/lib/akwadona-cdk-stack.ts` — search for `acm.Certificate.fromCertificateArn`.
- The certificate was created once by hand via `aws acm request-certificate` — not via CDK — so that teardown of the stack does not destroy the certificate.

#### 4.6 Why ACM, not Let's Encrypt or GoDaddy
Both work, but ACM is free, auto-renewing, and plugs directly into CloudFront with no server to patch. Let's Encrypt would need a cron job we have to maintain. GoDaddy charges $100+/year per certificate.

---

### 5. AWS WAF (Web Application Firewall) — the bouncer at the door

> **Status: DISABLED as of 2026-10-29.** The edge stack that owns the WebACL is commented out in `akwadona-cdk/bin/akwadona-cdk.ts` ("temporarily disabled to stop charges") and `webAclId` is commented out on the distribution. The CloudFront distribution currently has **no WAF attached**. The section below describes what it does when re-enabled; the 2026-10-29 API Gateway stage throttle is the interim first-line defence. Re-enabling is a one-line change in `bin/akwadona-cdk.ts` + `lib/akwadona-cdk-stack.ts` and ~$10/month.

#### 5.1 What it is
**WAF** (Web Application Firewall) sits in front of our site and blocks known-bad traffic before it reaches us.

#### 5.2 Real-life example
Picture a nightclub. The bouncer at the door turns away people who are too drunk, carrying weapons, or on the banned-persons list — before they get inside and cause trouble. WAF is that bouncer. The "banned-persons list" is a set of patterns like "known **SQL** (Structured Query Language) injection strings", "requests from IPs that attacked us last week", or "more than 100 requests per minute from one address".

#### 5.3 What Akwadona uses it for (when enabled)
- AWS "Managed Rules — Core rule set" (common exploits).
- AWS "Known Bad Inputs" ruleset.
- Per-source-IP rate limit.
- Attached to the CloudFront distribution — so it filters ALL traffic before it reaches our website. (The API is called directly on its execute-api domain, so WAF-on-CloudFront does not cover API calls; that is what the stage throttle is for.)

#### 5.4 Where in AWS Console
`https://us-east-1.console.aws.amazon.com/wafv2/homev2/web-acls?region=global`

When deployed, the WebACL is named `akwadona-edge-acl`, scope `CLOUDFRONT` (global, must live in `us-east-1`).

#### 5.5 Where in our code
- CDK WAF: `akwadona-cdk/lib/akwadona-edge-stack.ts` (`AkwadonaEdgeStack`, `new wafv2.CfnWebACL`). Wired into the main stack through `props.webAclArn` — both currently commented out.

#### 5.6 Why WAF, not just rate-limit in Lambda
Lambda runs AFTER the request has already arrived. WAF blocks before. That saves money (we don't pay for Lambda invocations we don't want), reduces attack surface, and absorbs volume we could never scale through.

---

### 6. AWS IAM (Identity and Access Management) — visitor badges with permission lists

#### 6.1 What it is
**IAM** (Identity and Access Management) is how AWS decides which service can do which action on which resource.

#### 6.2 Real-life example
In a large office building, every visitor gets a badge. Some badges open only the lobby. Some open the lobby plus floor 3. Some open everything except the server room. The badge is checked at every door automatically. IAM is the badge system. The badge's permission list is called an "IAM policy". The person or service wearing the badge is an "IAM role".

#### 6.3 What Akwadona uses it for
- Every Lambda runs under an IAM role. The role decides which DynamoDB table it can read, which KMS key it can use, which S3 bucket it can write to.
- The deploy user has a role that lets it update the CDK stack but NOT read any patient data.
- The operator Lambda has an **explicit deny** on `kms:Decrypt` for every tenant key — this is what makes "zero-knowledge" structurally enforced.
- The read-only developer role has `arn:aws:iam::aws:policy/ReadOnlyAccess` — can look at everything but change nothing.

Explicit deny beats explicit allow in IAM. So even if someone accidentally adds an "allow decrypt" policy, the deny wins. That is the belt-and-braces that makes operator access provably safe.

#### 6.4 Where in AWS Console
`https://us-east-1.console.aws.amazon.com/iamv2/home#/roles`

Filter by `akwadona-`.

#### 6.5 Where in our code
- CDK role definitions: `akwadona-cdk/lib/akwadona-cdk-stack.ts` — search for `new iam.Role` and `new iam.ManagedPolicy`.
- The operator deny policy: `akwadona-cdk/lib/akwadona-cdk-stack.ts` — search for the comment `OPERATOR_DENY_KMS`.
- Each Lambda's role is created inside its factory call — see §4 of [`AKW-EH-10-Engineering-Handbook.md`](AKW-EH-10-Engineering-Handbook.md)-style patterns, applied in `lib/akwadona-cdk-stack.ts`.

#### 6.6 Why IAM, not application-level checks
IAM is enforced by AWS itself, before our code runs. If our code has a bug and tries to read another hospital's data, IAM blocks the API call and returns `AccessDenied`. Our bug does not become a data breach.

---

### 7. Amazon CloudWatch — the dashboard and the alarm panel

#### 7.1 What it is
CloudWatch collects three things: text logs that services write, numeric metrics that services measure, and alarms that go off when a metric crosses a line.

#### 7.2 Real-life example
Think of a car dashboard. The speedometer and fuel gauge are metrics. The dashcam recording is the log. The "fuel low" light is the alarm. CloudWatch is all three for every AWS service we run.

#### 7.3 What Akwadona uses it for
- **Logs:** every Lambda writes its `console.log` output to CloudWatch Logs. One log group per Lambda, named `/aws/lambda/akwadona-<function>`.
- **Metrics (free):** AWS auto-publishes Lambda invocation count, duration, errors, DynamoDB request count, API Gateway 4xx/5xx counts.
- **Metrics (custom):** we publish `Akwadona/Throttle` when a user hits our rate limit, so we can see which tenant is being hammered.
- **Alarms:** two exist as of 2026-10-29 — `akwadona-api-5xx` (any 5xx in 5 min) and `akwadona-lambda-errors` (any Lambda error in 5 min), both routed to SNS topic `akwadona-alarms`. There were **none** before that date. [`AKW-OPS-08-Operations-Runbook.md`](AKW-OPS-08-Operations-Runbook.md) §4 lists the further alarms to add once the stack is split (the 500-resource ceiling is why only two were added).

#### 7.4 Where in AWS Console
- Logs: `https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups`
- Metrics: `https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#metricsV2:`
- Alarms: `https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#alarmsV2:`

#### 7.5 Where in our code
- Alarm definitions: `akwadona-cdk/lib/akwadona-cdk-stack.ts` — search for `new cloudwatch.Alarm`.
- Custom metric publishing: `akwadona-cdk/lambda/_shared/throttle.js` (copied into every Lambda folder) — `PutMetricData` to namespace `Akwadona/Throttle` on each 429.
- Pre-written log queries: [`AKW-OPS-08-Operations-Runbook.md`](AKW-OPS-08-Operations-Runbook.md) §5.

#### 7.6 Why CloudWatch, not Datadog or New Relic
Datadog and New Relic are better products with better dashboards. They cost $15–$30 per host per month. For a founder-run startup, CloudWatch's free tier (10 custom metrics, 5GB of logs ingested) is enough. We can swap in Datadog later by shipping logs via a Kinesis Firehose stream.

---

### 8. AWS CloudTrail — the CCTV tape of the AWS account

#### 8.1 What it is
CloudTrail records every API call made against our AWS account. Every click in the console, every CLI command, every SDK call from a Lambda — all recorded with who, what, when, from which IP.

#### 8.2 Real-life example
Think of CCTV cameras pointed at every door of the office. If a safe is opened, the tape shows which badge opened it, at what time, from inside the building or remotely. CloudTrail is that tape, replayable for 90 days (and archived forever to our audit S3 bucket).

#### 8.3 What Akwadona uses it for
- Compliance: PDPPL and HIPAA both require an immutable audit log of administrative actions on the system.
- Incident response: if an alarm fires, we query CloudTrail to see who did what in the window before.
- Zero-knowledge proof: we can show auditors that the operator role has never successfully called `kms:Decrypt` on a tenant key.
- The audit S3 bucket uses Object Lock (write-once, read-many) with a 7-year retention — so even an attacker with full admin cannot delete the tape.

#### 8.4 Where in AWS Console
- Event history: `https://us-east-1.console.aws.amazon.com/cloudtrail/home?region=us-east-1#/events`
- Our trail (multi-region, log file validation on): `https://us-east-1.console.aws.amazon.com/cloudtrail/home?region=us-east-1#/trails`

#### 8.5 Where in our code
- CDK trail: `akwadona-cdk/lib/akwadona-cdk-stack.ts` — search for `new cloudtrail.Trail`.
- Query example commands: [`AKW-OPS-08-Operations-Runbook.md`](AKW-OPS-08-Operations-Runbook.md) §6.

#### 8.6 Why CloudTrail, not just application logs
Application logs capture what OUR code did. CloudTrail captures what the AWS account did — including console clicks, CLI commands, and actions taken by other AWS services on our behalf. Both are needed. CloudTrail is the one auditors ask for first.

---

### 9. Amazon EventBridge — the office PA system

#### 9.1 What it is
EventBridge is AWS's event bus. Services emit events ("a user logged in", "a file was uploaded", "it's 6am"). EventBridge routes those events to one or more targets (Lambda, SNS topic, SQS queue).

#### 9.2 Real-life example
Think of the PA (Public Address) system in an airport. When a flight is boarding, the announcer calls it on the PA, and the people who need to hear (passengers for that gate) react. Other people ignore it. EventBridge is the PA; the announcement is the event; the people reacting are the targets.

#### 9.3 What Akwadona uses it for
Two main patterns right now:

**Pattern 1 — Scheduled jobs (the cron announcer).**
- One rule exists: `PreTokenWarmerRule` — "every 5 minutes, invoke `cognito-pre-token-generation` with `{"_warmup": true}`" — keeps it hot so Cognito's 5-second trigger cap is not hit on the first login of the morning.
- There is **no** scheduled cross-tenant probe. `scripts/cross-tenant-probe.js` and `scripts/security-tests/run-safe.js` are run by hand (or by an external scheduler); wiring them to EventBridge needs ~5 CFN resources the stack does not have spare — see `AKW-SAD-02` §9.

**Pattern 2 — Future wiring (not yet live).**
- When a tenant admin is created, emit `akwadona.tenant.admin-created`, so email-sending Lambda can send the welcome mail without being wired directly into the admin-create Lambda.

#### 9.4 Where in AWS Console
`https://us-east-1.console.aws.amazon.com/events/home?region=us-east-1#/rules`

#### 9.5 Where in our code
- CDK scheduled rules: `akwadona-cdk/lib/akwadona-cdk-stack.ts` — search for `new events.Rule`.
- Lambda targets: same file, search for `eventsTargets.LambdaFunction`.

#### 9.6 Why EventBridge, not direct Lambda invocation
Direct invocation couples two Lambdas: Lambda A has to know Lambda B's name and have permission to invoke it. EventBridge decouples — Lambda A emits an event, and we add listeners later without touching Lambda A.

---

### 10. Amazon SES (Simple Email Service) — our outbound mail room

#### 10.1 What it is
**SES** (Simple Email Service) is AWS's email-sending service. It handles the plumbing: SMTP, bounce handling, reputation, DKIM signing.

#### 10.2 Real-life example
Think of the mail room in a company. Someone drops a letter in the tray; the mail room puts the right stamp on it, hands it to the post office, and keeps a log of what was sent. SES is that mail room. The stamp is **DKIM** (DomainKeys Identified Mail) — a cryptographic signature that tells the receiving mail server "yes, this email really came from akwadona.com".

#### 10.3 What Akwadona uses it for
- All email sent by Cognito (password reset, invite email, verification code) is routed through SES as `noreply@akwadona.com`.
- Without SES, Cognito's default sender is `no-reply@verificationemail.com` — which Gmail flags as spam.
- Setup is documented in [`AKW-OPS-08-Operations-Runbook.md`](AKW-OPS-08-Operations-Runbook.md).

#### 10.4 Where in AWS Console
`https://us-east-1.console.aws.amazon.com/ses/home?region=us-east-1#/account`

Identities: `https://us-east-1.console.aws.amazon.com/ses/home?region=us-east-1#/verified-identities`

#### 10.5 Where in our code
- Cognito's email configuration points at the SES identity ARN — set by `aws cognito-idp update-user-pool`, not by CDK (see [`AKW-OPS-08-Operations-Runbook.md`](AKW-OPS-08-Operations-Runbook.md) §6).
- DNS records (DKIM, MAIL FROM MX, SPF TXT) are hand-added at GoDaddy — see [`AKW-OPS-08-Operations-Runbook.md`](AKW-OPS-08-Operations-Runbook.md) §3.

#### 10.6 Why SES, not SendGrid or Mailgun
SendGrid and Mailgun are easier at first, but both cost ~$15/month minimum. SES is $0.10 per 1,000 emails. For our volume (hundreds/month) that is pennies.

---

### 11. AWS Bedrock — the AI model marketplace

#### 11.1 What it is
Bedrock is AWS's managed way to call large language models (like Anthropic's Claude) without running the servers yourself.

#### 11.2 Real-life example
Think of a shopping mall food court. The mall owns the building, provides power and water. Each stall is a different cuisine. You order at the counter, the stall cooks it, you pay the mall at the end. Bedrock is the food court. Each model (Claude, Llama, Titan) is a stall. You pay AWS per token, not per server.

#### 11.3 What Akwadona uses it for
**ScribeFirst** — the doctor-dictation feature. The doctor speaks into the microphone; the recorded audio is transcribed in the browser; the text is sent to a Bedrock Lambda which calls Claude Haiku 4.5 to extract a structured **SOAP** (Subjective / Objective / Assessment / Plan) note. See AKW-FS-03 §9.

Model ID: `us.anthropic.claude-haiku-4-5-20251001-v1:0`. The `us.` prefix means we're calling via a **cross-region inference profile** — AWS routes the request to whichever US region has capacity. This matters because the raw model ID without `us.` only works in one region at a time.

#### 11.4 Where in AWS Console
`https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/overview`

Model access must be enabled per account per model: `https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess`

#### 11.5 Where in our code
- Bedrock-calling Lambda: `akwadona-cdk/lambda/akwadona-scribe/index.js`.
- IAM permissions: the scribe Lambda's role has `bedrock:InvokeModel` scoped to the specific inference profile ARN.
- Model ID set via environment variable `BEDROCK_MODEL_ID`.

#### 11.6 Why Bedrock, not calling Anthropic's API directly
Calling Anthropic directly means our PHI leaves AWS. Bedrock keeps the data inside our AWS account and provides a signed path that satisfies our BAA. Also: one bill, one IAM policy, one audit trail.

---

### 12. AWS CloudFormation (CFN) — the IKEA instructions for our infrastructure

#### 12.1 What it is
**CloudFormation** (CFN) is AWS's "infrastructure-as-text" engine. You write a YAML or JSON file that lists every resource you want (buckets, Lambdas, tables, keys, roles). You hand the file to CloudFormation. It creates or updates every resource in the right order, and rolls back if anything fails.

#### 12.2 Real-life example
Think of an IKEA flat-pack. The instruction sheet lists every screw, bolt, and plank, and the order to assemble them. If you follow it, you get the same bookshelf every time. If one screw is missing, IKEA tells you to stop. CloudFormation is that instruction sheet, applied automatically.

#### 12.3 What Akwadona uses it for
Everything in AWS. Every Lambda, bucket, table, role, key, alarm — defined in text, applied by CloudFormation.

We don't write CloudFormation JSON by hand. We write TypeScript with the CDK (next section), and CDK compiles our TypeScript into CloudFormation JSON.

**Important ceiling:** a single CloudFormation stack can hold at most 500 resources. We are near this limit. To stay under it we use catch-all API routes (`/foo/{proxy+}`) that fan out inside one Lambda rather than creating one Lambda per endpoint, and we share one IAM `ManagedPolicy` across many Lambdas instead of inlining per-Lambda policies.

#### 12.4 Where in AWS Console
`https://us-east-1.console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks`

Our stack is named `AkwadonaCdkStack` (a second stack, `AkwadonaEdgeStack`, holds the WAF and is currently not deployed).

#### 12.5 Where in our code
- The compiled CloudFormation JSON lives in `akwadona-cdk/cdk.out/AkwadonaCdkStack.template.json` after each `cdk synth`.
- We never edit this file directly — it is overwritten by CDK on every build.

#### 12.6 Why CloudFormation, not Terraform
Terraform works too. CloudFormation is already enabled on every AWS account at no cost, is tightly integrated with AWS services (newer services get CFN support on day one), and its rollback is reliable. Terraform's state file is one more thing to manage.

---

### 13. AWS CDK (Cloud Development Kit) — the IKEA designer's drawing tool

#### 13.1 What it is
**CDK** (Cloud Development Kit) is a framework for writing CloudFormation stacks in TypeScript (or Python / Java / etc.). You write classes like `new Lambda.Function(...)` and CDK compiles that into CloudFormation JSON.

#### 13.2 Real-life example
If CloudFormation is the IKEA instruction sheet, CDK is the designer's CAD drawing. The designer draws the bookshelf once in CAD; the CAD software produces the IKEA instructions automatically. The CAD drawing is shorter, easier to read, and reusable — a chair and a bookshelf can share a "leg" component.

#### 13.3 What Akwadona uses it for
- One file (`akwadona-cdk/lib/akwadona-cdk-stack.ts`) defines the entire backend.
- Reusable patterns live inside helper functions in that file (for example, `createLambda(name, path, env)` creates a Lambda with our standard runtime, memory, timeout, and IAM role in one line).
- Versioned in Git — every change to infrastructure is a reviewable commit.

#### 13.4 Where in AWS Console
CDK itself does not have a console presence. It compiles to CloudFormation; look at the CloudFormation stack (§12.4) instead.

#### 13.5 Where in our code
- Stack definition: `akwadona-cdk/lib/akwadona-cdk-stack.ts`.
- Entry point: `akwadona-cdk/bin/akwadona-cdk.ts`.
- Lambda source: `akwadona-cdk/lambda/<name>/index.js` — one folder per Lambda, each folder bundles its own `node_modules` and `_shared` helpers inlined (see `akwadona-code-standards` skill for the pattern).

#### 13.6 Why CDK, not raw CloudFormation
Raw CloudFormation is 5–10x more text and much easier to get wrong. CDK gives us Type-checking, IDE autocomplete, and loop/conditional expressions in TypeScript — things CloudFormation's YAML can only clumsily approximate.

---

### 14. AWS STS (Security Token Service) — the temporary pass for API calls

#### 14.1 What it is
**STS** (Security Token Service) hands out short-lived AWS credentials.

#### 14.2 Real-life example
Think of a day pass to a gym. The receptionist checks your membership, hands you a wristband that works for exactly today. Tomorrow you need a new wristband. STS wristbands typically expire in 1–12 hours.

#### 14.3 What Akwadona uses it for
- When you run `aws sts get-caller-identity` to verify your dev credentials, you are calling STS.
- When one AWS service "assumes" an IAM role to do a job on behalf of another, STS issues the short-lived credentials for that role.
- When our deploy user assumes the CDK deployment role, STS is the handoff.

STS is background plumbing. We rarely call it directly from app code; the AWS SDK calls it for us.

#### 14.4 Where in AWS Console
STS actions are visible in CloudTrail event history (filter by `EventSource = sts.amazonaws.com`).

#### 14.5 Where in our code
- No direct STS calls in Lambda code — handled by the SDK.
- Local dev credential verification: in `scripts/*.ps1` wherever `aws sts get-caller-identity` appears.

#### 14.6 Why STS, not long-lived keys
Long-lived AWS access keys are the #1 cause of real-world AWS breaches (committed to Git, pasted in Slack). Short-lived STS credentials limit the blast radius if they do leak.

---

### 15. Route 53 — intentionally NOT used (DNS lives at GoDaddy)

Route 53 is AWS's DNS service. We **do not use it**.

- The domain `akwadona.com` is registered at **GoDaddy**, and its DNS records are managed in GoDaddy's web console.
- Any new subdomain (e.g., a new tenant like `clinicx.akwadona.com`) needs a CNAME added at GoDaddy pointing to the CloudFront distribution domain.
- See [`AKW-OPS-08-Operations-Runbook.md`](AKW-OPS-08-Operations-Runbook.md) §3.1 for the GoDaddy DNS workflow (DKIM, MAIL FROM, SPF records).

**Future option:** we may migrate DNS to Route 53 if we add many tenants, to automate the CNAME creation via CDK. Today, manual GoDaddy edits are simpler.

---

### 16. Services we **do not** use (and why)

| Service | Why not |
|---|---|
| **EC2** (Elastic Compute Cloud — virtual servers) | We are serverless. No servers to patch. |
| **ECS / EKS** (container orchestration) | Same — serverless Lambda is enough for our scale. |
| **RDS / Aurora** (SQL databases) | We are DynamoDB-only for access patterns + cost. |
| **ElastiCache / Redis** | Not needed yet; Lambda cold-starts are our scaling pain, not database latency. |
| **SQS** (queues) | Not needed yet; direct Lambda invocation is enough. (SNS **is** used — one topic, `akwadona-alarms`, for CloudWatch alarm delivery.) |
| **AppSync** (managed GraphQL) | We use REST via API Gateway; GraphQL would add a layer without benefit. |
| **Secrets Manager** | Used for one thing: the seed users' temporary passwords, written by `akwadona-create-users` to `/akwadona/seed-users/<username>` (encrypted with the data CMK). Application secrets are otherwise Lambda environment variables. |
| **Systems Manager Parameter Store** | Same as above. |
| **Route 53** | DNS is at GoDaddy; see §15. |

---


### 17. The AWS bill, in one page

Approximate monthly cost at current traffic (2 tenants, under 100 users total, under 10,000 API calls/day):

| Service | ~$/month |
|---|---|
| Lambda (invocations + duration) | $0 (free tier) |
| DynamoDB (pay-per-request) | $1–2 |
| API Gateway (HTTP API) | $1 |
| CloudFront (data + requests) | $1 |
| S3 (storage + requests) | <$1 |
| Cognito (first 50,000 MAU free) | $0 |
| KMS (per-key $1 + usage) | ~$10 (we have 10+ keys across tenants) |
| ACM | $0 |
| WAF | $0 (disabled; ~$10 when re-enabled) |
| CloudWatch (logs + metrics) | $2–5 |
| CloudTrail (first trail free) | $0 |
| SES | <$1 |
| Bedrock (ScribeFirst) | $1–5 depending on usage |
| Cognito Advanced Security | ~$5 (per active user) |
| **Rough total** | **$15–30 / month** |

This scales roughly linearly with real doctor use — each new tenant adds ~$2–5/month at idle, more if the hospital is active.

---


---

## Appendix B — Lambda function inventory

### 4. Lambda functions

Each section below: **Business purpose → Routes → What it does → Side effects**. All mutating Lambdas implement Phase D idempotency (see §5).

#### 4.1 Patient management

##### `createPatient`
- **Purpose** — admin adds a new patient (single or bulk import).
- **Routes** — `POST /patients` (single or `{patients:[]}` for bulk).
- **What it does**
  - Rejects callers not in `Admin` or `Developers`.
  - Required fields: name, dob, gender, phone, qid.
  - Refuses duplicates via QID + phone uniqueness locks.
  - Writes patient + locks atomically (TransactWrite).
  - Bumps `COUNTER#PATIENTS / TOTAL`.

##### `updatePatient`
- **Purpose** — edit a patient or restore a soft-deleted one.
- **Routes** — `PATCH /patients/{patientID}` and `PATCH /patients/{patientID}/restore`.
- **What it does** — admin/developer only; writes allowed fields; refreshes `updatedAt`+`updatedBy`.

##### `deletePatient`
- **Purpose** — soft-delete a patient.
- **Routes** — `DELETE /patients/{patientID}`.
- **What it does** — admin/developer only; sets `deletedAt`; decrements counter.

##### `getAllPatients`
- **Purpose** — paginated list with filters/search/sort.
- **Routes** — `GET /patients?pageSize&lastKey&sortField&sortOrder&search&...`.
- **What it does** — uses `COUNTER#PATIENTS` for fast unfiltered counts; falls back to Scan with `Select=COUNT` for filtered counts.

##### `getPatientByID`
- **Purpose** — fetch one patient.
- **Routes** — `GET /patients/{patientID}`.
- **What it does** — single GetItem; 404 if soft-deleted.

##### `getPatientsDataByFilters`
- **Purpose** — bulk filtered read used by reporting tools.
- **Routes** — `POST /patients/filter`.

#### 4.2 Doctor management

##### `createDoctor`
- **Purpose** — add a new doctor (single or bulk).
- **Routes** — `POST /doctors`.
- **What it does** — admin/developer only; required fields + email/QID/phone locks; bumps `COUNTER#DOCTORS`.

##### `updateDoctor`
- **Purpose** — edit a doctor profile.
- **Routes** — `PATCH /doctors/{doctorID}`.
- **What it does** — currently allows any authenticated user (review register §9.1 flags this).

##### `deleteDoctor`
- **Purpose** — soft-delete a doctor.
- **Routes** — `DELETE /doctors/{doctorID}`.
- **What it does** — same — no server-side role check today (§9.1).

##### `getAllDoctors`
- **Purpose** — paginated doctor list.
- **Routes** — `GET /doctors`.
- **What it does** — queries `EntityType-index` (the Scan-based version timed out at 1 M-row scale); total comes from `COUNTER#DOCTORS`.

##### `getDoctorByID` / `getDoctorByEmail`
- Single GetItem and `email-index` lookup respectively.

#### 4.3 Appointments

##### `akwadona-appointments`
- **Purpose** — the whole appointment lifecycle.
- **Routes** — `POST/GET/PATCH/DELETE /appointments[/{apptId}]`.
- **What it does**
  - **Create** — admin/dev only; enforces duty days, blocks past-time bookings, blocks overlapping appointments for the same doctor or same patient.
  - **List** — paginated with tab (upcoming/past/all), date range, status[], priority[], visitType[], doctorId, patientId, free-text q. Returns 25 rows by default, cursor in `nextToken`, total via `COUNTER#APPOINTMENTS`.
  - **Patch** — admin/dev edit any; doctors edit/cancel only their own future ones; re-runs overlap check on date/time changes.
  - **Delete** — admin only; decrements counter.
- **Side effects** — writes a calendar event on the doctor's calendar; writes an audit row; idempotency cache.

#### 4.4 Examinations (consultations)

##### `akwadona-examinations`
- **Purpose** — doctor's SOAP form (sections, diagnosis, prescriptions, lab/radiology orders, sign-off).
- **Routes** — `POST /examinations`, `PATCH /examinations/{id}/sections`, `POST /examinations/{id}/signoff`, `DELETE /examinations/{id}`.
- **What it does** — Doctor/Admin/Dev only; doctor can only write into an exam where `doctorEmail` matches their own; sign-off requires at least one primary diagnosis + chief complaint; on sign-off the linked appointment is marked `completed`.

#### 4.5 Pharmacy

##### `akwadona-pharmacy`
- **Purpose** — medications, inventory, prescription queue, dispense, purchase orders, alerts.
- **Routes** — `/pharmacy/medications`, `/pharmacy/inventory`, `/pharmacy/prescriptions`, `/pharmacy/dispense`, `/pharmacy/purchase-orders`, `/pharmacy/alerts`.
- **What it does** — Pharmacist/Admin/Dev only; dispense decrements stock and writes a history row; POs walk `draft → submitted → ordered → partially_received → received`.

#### 4.6 Blood Bank

##### `akwadona-bloodbank`
- **Purpose** — donors, donations, unit inventory, transfusion requests with cross-match + issue.
- **Routes** — see `docs/blood-bank.md` (now folded into §4.6).

```
Donors:        /bloodbank/donors          (GET/POST), /bloodbank/donors/{donorId}      (GET/PATCH/DELETE)
Donations:     /bloodbank/donations       (GET),     /bloodbank/donors/{donorId}/donations (GET/POST)
Units:         /bloodbank/units           (GET/PATCH/DELETE)
Stock summary: /bloodbank/stock           (GET)
Requests:      /bloodbank/requests        (GET/POST), /bloodbank/requests/{requestId}  (GET/PATCH/DELETE)
Cross-match:   POST /bloodbank/requests/{requestId}/crossmatch
Issue:         POST /bloodbank/requests/{requestId}/issue
```

- ABO/Rh compatibility checked automatically on cross-match.
- Compatible units reserved for two hours.
- Issue requires every unit to have a compatible cross-match on file.

#### 4.7 Calendar

##### `akwadona-calendar`
- **Purpose** — one calendar per doctor; holds duty shifts + auto-created appointment events.
- **Routes** — `GET/POST /calendars`, `DELETE /calendars/{id}`, `GET/POST /calendars/{id}/events`, `PATCH/DELETE /calendars/{id}/events/{eventId}`.

#### 4.8 Documents

##### `akwadona-document-manager`
- **Purpose** — upload/download/list/delete documents via S3 presigned URLs.
- **Routes** — `POST /documents/upload-url`, `POST /documents/download-url`, `GET /documents/list`, `GET /documents/folders`, `DELETE /documents/delete`.
- **What it does**
  - Folder allow-list: `doctors-documents`, `patients-documents`, `lab-results`, `radiology-images` (Admin/Doctor only); `prescriptions`, `pharmacy-approvals` (Pharm/Doctor/Admin).
  - Per-key owner check: non-admin can only see/delete keys uploaded under their own Cognito sub.
  - Rejects requests where the JWT lacks a `sub` claim.

#### 4.9 Admin panel

##### `akwadona-admin-panel`
- **Purpose** — admin user management.
- **Routes** — `GET /admin/stats`, `GET /admin/users`, `POST /admin/users/{u}/disable`, `POST /admin/users/{u}/enable`, `POST /admin/users/{u}/set-password`, `GET /admin/audit`.
- **What it does** — admin/developer only; wraps Cognito Admin APIs; audit endpoint queries `AUDIT#YYYY-MM-DD` partition.

#### 4.10 Voice Scribe

##### `akwadona-scribe`
- **Purpose** — turn dictation into SOAP via Bedrock Claude Haiku.
- **Routes** — `POST /scribe/sessions`, `GET /scribe/sessions/{id}`, `POST /scribe/sessions/{id}/soap`, `POST /scribe/sessions/{id}/approve`.
- **What it does** — Doctor/Admin only; stores session + transcript + SOAP output.

#### 4.11 Audit

##### `akwadona-audit`
- **Purpose** — compliance forensic queries.
- **Routes** — `GET /audit?date=&entityType=&entityId=&action=&actor=`.

#### 4.12 Reference data

| Lambda | Routes | Purpose |
| --- | --- | --- |
| `createNewDepartment` | `POST /departments` | Add one department |
| `bulkCreateDepartments` | `POST /departments/bulk` | Add many (BatchWrite chunks of 25) |
| `deleteAllDepartments` | `DELETE /departments` | Wipe the catalogue |
| `getAllDepartments` | `GET /departments` | Read |
| same trio for `Specializations` | `/specializations` | |

#### 4.13 Patient payments / invoices

| Lambda | Routes | Purpose |
| --- | --- | --- |
| `createPatientPayment` | `POST /patients/{id}/payments` | Create invoice |
| `updatePatientPayment` | `PATCH /patients/{id}/payments/{paymentID}` | Edit invoice |
| `deletePayment` | `DELETE /patients/{id}/payments/{paymentID}` | Soft-delete invoice |
| `getAllPaymentsForPatient` | `GET /patients/{id}/payments` | List per patient |
| `listAllPaymentsForPatientByID` | `GET /patients/{id}/payments/list` | Paginated list |
| `getPaymentByID` | `GET /payments/{paymentID}` | One invoice |
| `getAllInvoices` | `GET /invoices` | Admin: all invoices via `EntityType-index`; doctors: own via `doctorEmail-createdAt-index` |

#### 4.14 Surgeries

`createPatientSurgery` is a placeholder; `getSurgeryByID` and `listAllSurgeriesForPatientByID` are standard reads.

#### 4.15 Cognito hooks

##### `cognito-pre-token-generation`
- Fires on every sign-in.
- Adds `email` + `name` to the access token claims.
- Short-circuits the warmer ping.

---


---

## Appendix C — Scalability report

## Akwadona — Scalability Proof + Capacity Plan

This document proves Akwadona scales. It identifies every resource limit, calculates the headroom, and tells the operator exactly what to do at each milestone (1K → 10K → 100K → 1M monthly active users).

**Status:** Architecture designed for serverless auto-scale. No fixed-size servers. No manual scaling required up to ~5,000 concurrent users per region.

---

### TL;DR — the scalability claim

| Scale | Concurrent users | Hospital customers (tenants) | Recommended action |
|---|---|---|---|
| Today | 1–100 | 1–10 | No change needed. Pay-per-use AWS auto-scales. |
| Year 1 | 100–1,000 | 10–50 | Bump Lambda reserved concurrency. Add reserved KMS HMAC keys if any tenant exceeds 1.5K rps lookups. |
| Year 2 | 1,000–5,000 | 50–200 | Add `me-south-1` (Bahrain) region for data residency + lower latency for GCC customers. Move CloudFront PoPs accordingly. |
| Year 3+ | 5,000+ | 200+ | Multi-region active-active. DynamoDB Global Tables. Per-tenant cache layer. |

No single resource hits its limit before ~5,000 concurrent users per region. Past that, the next move is horizontal — duplicate the stack in another region.

---

### 1. Architecture review — what scales how

| Component | Scaling model | Auto-scales? | Hard limit |
|---|---|---|---|
| CloudFront (CDN) | Globally distributed edge, per-PoP | Yes, automatically | Effectively unlimited |
| API Gateway HTTP API | Regional auto-scale | Yes | 10,000 rps per AWS account (raise via support ticket) |
| Lambda | Concurrent execution count | Yes | 1,000 concurrent per region (default, raise to 10K+ via ticket) |
| DynamoDB | On-demand mode | Yes | 40,000 RCU + 40,000 WCU per table (auto-scale instantly) |
| KMS encrypt/decrypt | Per-key rate | No (need request) | 10,000 rps per region across all keys |
| KMS HMAC | Per-key rate | No (need request) | 1,500 rps per HMAC key |
| Cognito | Per pool | Yes | Sign-ins: 80 rps default (raise via ticket); user pool: 40M users |
| S3 | Per bucket | Yes | 3,500 PUT rps + 5,500 GET rps per prefix |
| CloudWatch Logs | Per log group | Yes | 5 GB/hour ingestion (raise via ticket) |

**Reading the table:** anything "auto-scales: Yes" handles itself up to the hard limit. Anything else needs a request to AWS Support before you hit it.

---

### 2. Per-request cost in resources

Let's trace one realistic request — `GET /patients?pageSize=25` from a doctor signed in to Akwadona — through every resource:

| Step | Resource | Cost per request |
|---|---|---|
| TLS termination | CloudFront edge → API Gateway | 0 (CloudFront) + 0 (API GW request) |
| JWT validation | API Gateway JWT authorizer | 0 (free) |
| Lambda invocation | getAllPatients | 1 Lambda execution |
| DynamoDB Query | `tenant-entityType-index` | ~25 RCU (1 RCU = 4KB consistent read) |
| KMS Decrypt | One DEK decrypt per matched row | ~25 KMS calls |
| AES decrypt | Local to Lambda | 0 (negligible CPU) |
| Response → client | API Gateway → CloudFront → user | 0 |

**Total per read of 25 patients:** 1 Lambda + 25 RCU + 25 KMS calls.

For a **write** (create patient):

- 1 Lambda execution
- 3 DynamoDB writes (patient, qid lock, phone lock) in a transaction = ~6 WCU
- 1 KMS GenerateDataKey (one per row write)
- 3 KMS GenerateMac (qidHash, emailHash, phoneHash)
- 1 audit row write (with its own encrypt) = +1 KMS + ~3 WCU
- Per-tenant counter update = ~1 WCU

**Total per patient create:** 1 Lambda + ~10 WCU + 5 KMS calls.

---

### 3. Capacity calculations at each tier

#### Tier 1 — 1,000 concurrent users (year 1)

Assume each user issues 5 requests per minute average. Total:

```
5,000 req/min ÷ 60 = ~83 rps
```

| Resource | Usage | Limit | Headroom |
|---|---|---|---|
| API Gateway | 83 rps | 10,000 rps | 99% |
| Lambda concurrent | ~80 (200ms avg) | 1,000 | 92% |
| DynamoDB on-demand | ~2,000 RCU+WCU/sec | 40,000 each | 95% |
| KMS Decrypt | ~2,000 rps (mostly reads) | 10,000 rps | 80% |
| KMS GenerateMac per HMAC key | ~10 rps per tenant | 1,500 rps | 99% |

**Verdict:** comfortably within all limits. No action needed.

#### Tier 2 — 5,000 concurrent users (year 2)

```
25,000 req/min = ~415 rps
```

| Resource | Usage | Limit | Headroom |
|---|---|---|---|
| API Gateway | 415 rps | 10,000 rps | 96% |
| Lambda concurrent | ~400 | 1,000 | 60% |
| DynamoDB | ~10,000 RCU+WCU/sec | 40,000 each | 75% |
| KMS Decrypt | ~10,000 rps | 10,000 rps | 0% ← ⚠ ceiling |
| KMS GenerateMac per HMAC key | ~50 rps per tenant | 1,500 rps | 97% |

**Verdict:** KMS Decrypt is the first wall.

**Mitigation A — DEK cache in Lambda memory.** Each row has the same wrapped DEK across its lifecycle. After first decrypt, cache the DEK in Lambda memory keyed by the wrapped-DEK base64. Subsequent reads of the same row inside the same Lambda instance reuse the cached DEK. **Reduces KMS Decrypt by ~70% for read-heavy workloads.** Already designed for; needs adding to `_shared/crypto.js`.

**Mitigation B — Raise the KMS limit.** AWS will raise to 25K rps on request, free of charge.

After both mitigations: ~3,000 rps Decrypt = 12% of new 25K ceiling. Headroom restored.

#### Tier 3 — 20,000 concurrent users (year 3)

```
100,000 req/min = ~1,667 rps
```

| Resource | Usage | Limit | Headroom |
|---|---|---|---|
| API Gateway | 1,667 rps | 10,000 rps | 83% |
| Lambda concurrent | ~1,600 | 1,000 ← ⚠ | 0% |
| DynamoDB | ~40,000 RCU+WCU/sec | 40,000 each | 0% ← ⚠ |
| KMS Decrypt (with cache) | ~12,000 rps | 25,000 rps (raised) | 52% |

**Verdict:** Lambda concurrency + DynamoDB throughput are the next walls.

**Mitigation A — Lambda concurrency increase.** AWS will raise to 10,000+ via support ticket for production use. Free.

**Mitigation B — DynamoDB partition strategy.** Either:
- Switch the hottest table partitions to provisioned mode + auto-scaling (predictable cost).
- Or shard hot tenants across multiple sub-partitions (rarely needed).

**Mitigation C — Multi-region deployment.** Once Lambda concurrency in one region nears 5,000 sustained, deploy a second region (`me-south-1` for GCC, `eu-central-1` for EU). DNS-based routing (Route 53 latency-based) sends each customer to the nearest region.

#### Tier 4 — 100,000+ concurrent users

Beyond a single region. The architecture supports this but needs:

- DynamoDB Global Tables (multi-region active-active replication).
- Cognito user-pool federation across regions (or one-pool-per-region with claim-based mapping).
- CloudFront geo-routing.
- Per-region KMS keys (regional KMS does not replicate; for BYOK this aligns naturally with per-customer regional deployment).
- Cross-region observability — CloudWatch metric aggregation, single-pane dashboards.

This is a future architecture decision, not a today problem.

---

### 4. Cost model

At each tier, the **AWS infrastructure cost** (excluding salaries, support, etc.):

| Tier | Users | Lambda | DynamoDB | KMS | API Gateway | CloudFront | Total / month |
|---|---|---|---|---|---|---|---|
| Today | 1–100 | $5 | $5 | $5 | $1 | $1 | **~$20** |
| Year 1 | 1,000 | $50 | $50 | $30 | $5 | $10 | **~$150** |
| Year 2 | 5,000 | $250 | $250 | $100 | $25 | $50 | **~$700** |
| Year 3 | 20,000 | $1,000 | $1,000 | $300 | $100 | $200 | **~$2,600** |

Per-customer cost is **highly favourable** — ~$3.50/month/hospital at year 2 scale, declining further as volume grows.

For comparison, **competitive on-premise hospital systems** cost $50–500K/year per hospital in licensing + hardware + IT staff.

---

### 5. Bottleneck identification

If load tests (or real production) hit a wall, here's the lookup table:

| Symptom | First place to look |
|---|---|
| Latency p95 spikes above 1s | Lambda cold-starts. Check init duration in CloudWatch. Raise reserved concurrency. |
| 504 Gateway Timeout | Lambda timing out (30s). Likely a KMS call hanging on permission. Check CloudTrail for `AccessDenied`. |
| 429 from KMS | GenerateDataKey or GenerateMac rate limit. Implement DEK cache; raise KMS account limit via ticket. |
| DynamoDB ProvisionedThroughputExceeded | Hot partition. Verify the load isn't hitting one partition key (unlikely with tenant-scoped GSI). |
| Cognito throttle | Sign-in spike. Cognito's 80 rps default is the most common bottleneck in product launches. Raise via ticket before launch. |
| API Gateway 429 | Per-account rate. Raise via ticket. |
| CloudWatch Logs delay | Log ingestion >5GB/hour. Throttle Lambda log verbosity or raise ingestion limit. |

---

### 6. Scalability test results

This section is the **measured** data. Run the load test in `scripts/loadtest/` and paste the summary here.

#### Test 1 — [Date]

| Phase | Requested rps | Achieved rps | p50 (ms) | p95 (ms) | p99 (ms) | Error rate |
|---|---|---|---|---|---|---|
| Warmup | 5 | — | — | — | — | — |
| Sustained | 50 | — | — | — | — | — |
| Peak | 200 | — | — | — | — | — |

Notes:
- _Fill in after run._
- _Compare against the calculated tier-1 targets._

#### Test 2 — [Date] (after first bottleneck fix)

| ... | | | | | | |

---

### 7. Mitigations on the roadmap

In priority order:

1. **DEK cache in Lambda memory** — biggest single throughput win for read-heavy workloads. Estimated 1 day of work. Reduces KMS Decrypt by ~70% in steady state.
2. **Reserved Lambda concurrency per critical function** — protects `akwadona-appointments` and `getAllPatients` from starvation by other functions. CDK change.
3. **DynamoDB DAX or in-Lambda LRU for tenant TENANT#<slug> profile rows** — read-mostly, small dataset, cache forever.
4. **Per-tenant API Gateway throttling** — already designed (Task #73). Prevents one customer from starving others.
5. **CloudFront caching for static reference data** (departments, specializations).
6. **Multi-region active-active** — when business case warrants.

---

### 8. Failure modes + graceful degradation

What happens when each layer fails:

| Failure | User impact | Recovery |
|---|---|---|
| KMS unavailable | Read/write of PHI fails | PHI inaccessible until KMS restored. Operational metadata (appointment times etc.) still readable. Cognito sign-in still works. |
| DynamoDB regional outage | Whole app down | Failover to backup region (manual until Global Tables enabled). PITR available for data recovery. |
| Lambda timeout | One request fails | API Gateway returns 504. Frontend offline mode queues the request and retries when service returns. |
| CloudFront edge fails | Slow page load (DNS routes elsewhere) | Self-healing — other PoPs absorb. |
| Cognito sign-in throttled | New users can't sign in for a few seconds | Existing JWT-holders unaffected. Retry succeeds. |
| KMS HMAC key over rate limit | Searches by QID/email return slow or 503 | DEK + MAC cache in Lambda memory amortises. Raise limit via ticket. |
| One Lambda crashes | Specific feature unavailable | Other Lambdas continue. Frontend shows error, offline queue captures writes. |

Offline mode (Phase F) is the **client-side** safety net — even if the whole API goes down, doctors can keep charting and the queue replays on reconnect.

---

### 9. Verification plan for the binder

1. Run `scripts/loadtest/akwadona-load-test.yml` against the production API.
2. Save the HTML report into the compliance binder.
3. Confirm p95 < 1s and error rate < 1% per the `ensure` block.
4. Add the result to Section 6 of this document.
5. Schedule annual re-run.

The load test is **part of the compliance evidence**. Some hospital RFPs ask for "evidence of scalability testing"; this is what we hand them.

---

### 10. Open follow-ups (Task #73 + new items)

- **Task #73** — Software per-tenant throttling (operator-editable rate limits). Needed once we have a paying second customer; safe to defer until then.
- **DEK cache in Lambda** — code change in `_shared/crypto.js`. Add to next sprint.
- **DAX or in-Lambda cache for tenant profile rows** — small change, big win at scale.
- **Auto-warmer for KMS-using Lambdas** — there's already an EventBridge warmer for cold starts; consider extending to KMS-initialised functions.
- **Multi-region playbook** — design document for when scale crosses ~5K concurrent users.
- **Per-tenant SLOs** — set 99.5% availability target; track via CloudWatch dashboard.

---

### 11. Bottom line for sales / customer conversations

When a hospital asks "can this handle our volume?":

- Day 1: yes, infrastructure is pre-built to handle 100x your day-1 load.
- Year 1: yes, AWS auto-scales every layer; we'll monitor and raise limits proactively.
- Year 2: yes, with one architectural addition (multi-region) that's already in the roadmap.
- Year 3+: yes, the pattern is well-established globally and we have the migration plan.

The cost grows linearly with usage. At 5,000 concurrent users (year 2 target), AWS infrastructure cost is ~$700/month — about $0.14 per concurrent user per month. Compare to legacy systems where per-seat licensing alone is $10-100/month.

This is the spreadsheet-friendly answer for procurement teams.

---

## Appendix D — Live identifiers (verify before use — AKW-OPS-08 §2 has the commands)

| Item | Value |
|---|---|
| AWS account | `483176634665` |
| Region | `us-east-1` |
| CloudFormation stack | `AkwadonaCdkStack` |
| HTTP API | `ouohmmpi31` → `https://ouohmmpi31.execute-api.us-east-1.amazonaws.com` |
| CloudFront distribution | `E1YOKWKHQNSPQW` → `d378t54x9p802t.cloudfront.net` |
| Cognito user pool | `us-east-1_YibFfEdDD` (`akwadona-user-pool`) |
| Cognito app client | `6ndnfufmo100mq1rrmte7pqmhg` |
| DynamoDB table | `Hospital` |
| Documents bucket | `akwadona-documents-483176634665-us-east-1` |
| Audit bucket | `akwadona-audit-v7-483176634665-us-east-1` |
| ACM certificate | `arn:aws:acm:us-east-1:483176634665:certificate/c03903c3-12c3-46dd-9d63-4e40a72bb2be` |
| Alarm topic | `akwadona-alarms` (ARN in stack output `AlarmTopicArn`) |
| Dead identifiers (do not use) | `jxz59jh15f`, `a2s6jk35d9` (old APIs); `d6i7iwknkj0bg`, `E1Z1ZKYM74LVA7` (old CloudFront); `us-east-1_RACghntmS`, `us-east-1_KkINt5vOF` (old pools); `5i94ivu752m12uivl62v99pu4`, `2nfjfipi8hri262pjohtpgl45q` (old clients) |

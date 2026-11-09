# Akwadona Hospital Platform — Solution Overview

| Document control | |
|---|---|
| **Document ID** | AKW-SO-01 |
| **Document type** | Solution Overview (Executive Summary + Glossary) |
| **Version** | 1.1 |
| **Status** | Approved |
| **Classification** | Internal — shareable with prospects under NDA |
| **Owner** | Founder / Product |
| **Approver** | Founder |
| **Effective date** | 2026-10-30 |
| **Review cycle** | Quarterly, and on any architecture change |
| **Supersedes** | `archive/00-akwadona-explained.md` §1–2, §6–8, §10; `archive/44-akwadona-learning-path.md` Appendix A–B |
| **Related documents** | AKW-SAD-02 (architecture), AKW-FS-03 (features), AKW-SEP-13 (sales), AKW-EH-10 §2 (learning path) |

| Revision history | | | |
|---|---|---|---|
| **Version** | **Date** | **Author** | **Change** |
| 1.0 | 2026-10-30 | Platform team | Consolidated from the plain-English guide and the learning-path appendices into the enterprise document set |
| 1.1 | 2026-10-31 | Platform team | Added "This document answers" and "Abbreviations used in this document" blocks after document control |

## This document answers

1. What is Akwadona, in two minutes, for a board member or a hospital director?
2. What does the platform actually do for a hospital, module by module?
3. Who uses it, and what does each kind of user see?
4. What happens, step by step, when a doctor clicks "Add patient"?
5. Where does it run, what does it cost, and which laws does it meet?
6. What does every technical term, AWS service, abbreviation, and law mean — and where can I see each one in the AWS console? (Appendix A)
7. What are the honest answers to the questions customers always ask?

## Abbreviations used in this document

> **Why this table exists.** Every short form that appears anywhere in this document is listed here with (1) what the letters stand for and (2) what it means in plain words. If a term is not here and is not obvious, that is a documentation bug — add it. The complete glossary with examples and console links is AKW-SO-01 Appendix A.

| Abbreviation | Stands for | What it means |
|---|---|---|
| **ABO** | ABO blood group system | The A, B, AB, O blood types. |
| **ACM** | AWS Certificate Manager | Issues and renews the certificates that make a site show the HTTPS padlock. Free. |
| **AES** | Advanced Encryption Standard | The standard symmetric encryption algorithm. "AES-256" uses a 256-bit key. |
| **AI** | Artificial Intelligence | Software that performs tasks that normally need human judgement — here, turning a transcript into a clinical note. |
| **API** | Application Programming Interface | The set of URLs one program calls to use another program's features. Ours is a REST API. |
| **ATM** | Automated Teller Machine | A cash machine — used here as an analogy for two-factor login. |
| **AWS** | Amazon Web Services | Amazon's cloud-computing platform. Everything Akwadona runs on it. |
| **AZ** | Availability Zone | One independent data centre inside an AWS region. A region has several, so one failing does not take the service down. |
| **B2B** | Business-to-Business | Selling to companies (we sell to hospitals). |
| **B2C** | Business-to-Consumer | Selling to individual people. |
| **BAA** | Business Associate Agreement | A contract required by the US health-privacy law HIPAA between a hospital and any company (like Akwadona) that handles patient data for it. It says how the data will be protected. |
| **CCM** | Compliance Controls Matrix | A table that maps each rule in a law or standard to the specific thing we do to satisfy it, and the evidence an auditor can check. |
| **CDK** | Cloud Development Kit | AWS's tool for describing infrastructure in a programming language (we use TypeScript). It compiles to CloudFormation. |
| **CDN** | Content Delivery Network | A worldwide network of cache servers so a website loads from a city near the user. AWS CloudFront is ours. |
| **CI** | Continuous Integration | Automatically building and testing code on every change. |
| **CI/CD** | Continuous Integration / Continuous Deployment | The automated pipeline from code change to release. We do not have one yet. |
| **CLI** | Command-Line Interface | A text-based tool run from a terminal, e.g. the AWS CLI. |
| **CNAME** | Canonical Name record | A DNS record that says "this name is an alias of that name". |
| **CORS** | Cross-Origin Resource Sharing | The browser rule that decides which websites may call our API. We allow only our own domains. |
| **CSS** | Cascading Style Sheets | The language that styles web pages. |
| **CSV** | Comma-Separated Values | A plain-text spreadsheet format. |
| **DB** | Database | Where data is stored. |
| **DEK** | Data Encryption Key | The key that actually encrypts a row's fields. A fresh one per row. |
| **DICOM** | Digital Imaging and Communications in Medicine | The standard file format for medical images (X-ray, CT, MRI). |
| **DNS** | Domain Name System | The internet's phone book — turns akwadona.com into a server address. Ours is in Route 53; GoDaddy only holds the registration. |
| **DOB** | Date of Birth | The date a person was born. |
| **DPA** | Data Processing Agreement | A contract required by the EU privacy law GDPR between a data controller (the hospital) and a data processor (Akwadona). It says what the processor may do with personal data. |
| **DPIA** | Data Protection Impact Assessment | A formal written risk review, required by GDPR, that a company does before processing personal data in a new way. |
| **EC2** | Elastic Compute Cloud | AWS virtual servers. We do not use them (serverless only). |
| **EH** | Engineering Handbook | The document-type code for the engineering handbook (AKW-EH-10). |
| **ePHI** | electronic Protected Health Information | PHI in digital form. Everything Akwadona stores is ePHI. |
| **EU** | European Union | The political and economic union of 27 European countries. |
| **FHIR** | Fast Healthcare Interoperability Resources | The modern standard for exchanging health data between systems. On our roadmap. |
| **FS** | Functional Specification | The document that describes what the system does — every feature, rule, and setting — without describing how it is built. |
| **GCM** | Galois/Counter Mode | A way of running AES that also detects tampering. We use AES-256-GCM. |
| **GDPR** | General Data Protection Regulation | The European Union's privacy law (2018). It gives people rights over their data and sets duties on companies that process it. |
| **GSI** | Global Secondary Index | A second way to look up rows in a DynamoDB table, by a different attribute. We have nine. |
| **HIPAA** | Health Insurance Portability and Accountability Act | The US law that sets rules for protecting patients' health information. Its "Security Rule" lists the technical safeguards we must have. |
| **HMAC** | Hash-based Message Authentication Code | A fingerprint of a value computed with a secret key. Same value + same key = same fingerprint; different keys give different fingerprints. We use it to search encrypted fields. |
| **HR** | Human Resources | The department that manages staff. |
| **HTML** | Hypertext Markup Language | The language of web pages. |
| **HTTP** | Hypertext Transfer Protocol | The protocol the web uses to move pages and data. |
| **HTTPS** | HTTP Secure | HTTP wrapped in TLS encryption — the padlock. |
| **IAM** | Identity and Access Management | AWS's permission system: which user or service may do which action on which resource. |
| **ICD** | Interface Control Document / International Classification of Diseases | ICD the document: the exact contract for how one system talks to another (our API). ICD the medical code: a worldwide numbering of diagnoses, e.g. ICD-10. |
| **IdP** | Identity Provider | The system that holds user accounts and performs login. Cognito is ours. |
| **IP** | Internet Protocol address | The numeric address of a machine on the internet. |
| **IT** | Information Technology | Computers, networks, and software — and the department that runs them. |
| **JSON** | JavaScript Object Notation | The text format our API uses for data. |
| **JWKS** | JSON Web Key Set | The public keys a server publishes so others can verify its JWT signatures. |
| **JWT** | JSON Web Token | A signed digital ID card the browser sends with every request. It names the user, their hospital, and their role. |
| **KEK** | Key Encryption Key | The key that encrypts the DEK — the hospital's KMS key. |
| **KMS** | Key Management Service | AWS's vault for encryption keys. Keys never leave it; it encrypts and decrypts on request. |
| **LCP** | Largest Contentful Paint | A web-speed measure: how long until the biggest visible element appears. |
| **LGL** | Legal | The document-type code for the legal agreement templates (AKW-LGL-07). |
| **MFA** | Multi-Factor Authentication | Needing two proofs to sign in — a password plus a code from a phone app. |
| **NDA** | Non-Disclosure Agreement | A contract where the receiving party promises to keep information confidential. |
| **NoSQL** | Not only SQL | Databases that do not use tables-and-joins; DynamoDB is one. |
| **OAuth** | Open Authorization | The standard underneath OIDC for granting an app limited access without sharing a password. |
| **OIDC** | OpenID Connect | A standard protocol for logging in via a central identity service. |
| **PDF** | Portable Document Format | A fixed-layout document file. |
| **PDPPL** | Personal Data Privacy Protection Law | Qatar's national privacy law (Law No. 13 of 2016). Qatar's equivalent of GDPR. |
| **PHI** | Protected Health Information | Any information that identifies a patient and relates to their health: name, ID number, diagnosis, medication, phone, date of birth. |
| **PII** | Personally Identifiable Information | Any data that identifies a person, medical or not — a staff member's home address, for example. |
| **PIN** | Personal Identification Number | A short numeric secret. |
| **PK** | Partition Key | The main lookup key of a DynamoDB row — the "drawer". |
| **PKCE** | Proof Key for Code Exchange | An extra safety step in the OAuth login flow for apps that cannot keep a secret (like a browser app). |
| **PWA** | Progressive Web App | A web app that can be installed like a phone app and work offline. |
| **REST** | Representational State Transfer | A style of API built on standard web verbs (GET, POST, PATCH, DELETE) and resource URLs. |
| **Rh** | Rhesus factor | The + or − part of a blood type. |
| **RR** | Risk Register | A list of every known risk with a score, an owner, and a plan. |
| **RSA** | Rivest–Shamir–Adleman | A public-key encryption algorithm, used for signing our login tokens. |
| **RTL** | Right-to-Left | Text direction for Arabic, Hebrew, Urdu. Our layout flips for these languages. |
| **RUM** | Real User Monitoring | Measuring page speed as real users experience it. Not enabled. |
| **S3** | Simple Storage Service | AWS file storage — a bucket holds files of any size. |
| **SAD** | Solution Architecture Document | The master technical design document: how the whole system is built, from infrastructure to data to security. |
| **SAML** | Security Assertion Markup Language | An older standard for single sign-on between organisations. On the roadmap for hospitals with their own identity systems. |
| **SDK** | Software Development Kit | A library a vendor provides to call its services from code. |
| **SEO** | Search Engine Optimisation | Making a site rank well in search engines. |
| **SEP** | Sales Enablement Playbook | The document that gives sales staff the approved facts, answers, and scripts. |
| **SMS** | Short Message Service | A text message to a phone. Cognito can send login codes by SMS; we use authenticator apps instead. |
| **SNS** | Simple Notification Service | AWS's service for sending alerts (e-mail, SMS, to other services). |
| **SO** | Solution Overview | The executive summary of the platform in plain language. |
| **SOAP** | Subjective, Objective, Assessment, Plan | The standard four-part structure of a clinical note: what the patient says, what the doctor observes, the diagnosis, and the treatment plan. |
| **SPA** | Single-Page Application | A web app that loads once and then updates the page without full reloads. Ours is built with Angular. |
| **SQL** | Structured Query Language | The language of relational databases. We use DynamoDB, which has no SQL, but "injection" attacks are still tested. |
| **SSL** | Secure Sockets Layer | The older name for TLS. |
| **SSO** | Single Sign-On | Sign in once, use several systems. |
| **SSP** | System Security Plan | The document that lists every security control the system has, how it is implemented, and its status. A NIST-defined document type. |
| **TLS** | Transport Layer Security | The encryption that protects data travelling over the internet — the "S" in HTTPS. |
| **TOTP** | Time-based One-Time Password | The six-digit code from an authenticator app that changes every 30 seconds. |
| **TTL** | Time To Live | A "delete me after this time" marker on a database row. DynamoDB removes expired rows for free. |
| **URL** | Uniform Resource Locator | A web address. |
| **US** | United States | The United States of America. |
| **USA** | United States of America | The United States. |
| **UUID** | Universally Unique Identifier | A random 36-character ID that will never collide. |
| **WAF** | Web Application Firewall | A filter in front of a website that blocks known-bad traffic. Ours is defined but currently switched off. |

**Reading guide.** Sections 1–6 are for everyone — a board member, a hospital CIO, a new hire. Appendix A is the glossary: every AWS resource, concept, abbreviation, and law, each explained in four parts (what it is, why it exists, a real-life example, how Akwadona uses it) with a direct link to where it lives in the AWS console. Written to the house style in `../skills/akwadona-easy-english/SKILL.md`.

---

## 1. Executive summary

Akwadona is a cloud-hosted hospital management platform that hospitals **rent** rather than buy. A hospital opens a browser at its own address — `tiryaq.akwadona.com`, for example — signs in, and runs patients, doctors, appointments, consultations, pharmacy, blood bank, documents, invoicing, and AI-assisted clinical notes from one screen. Akwadona hosts everything on Amazon Web Services (AWS); the hospital installs nothing and pays monthly.

Three things set it apart:

1. **Zero-knowledge.** Every hospital's patient data is encrypted with a key that belongs to that hospital. Akwadona's own staff cannot read it — not by policy, but because the platform's operator role is explicitly forbidden by AWS from using the key. This is provable to an auditor in the AWS console.
2. **One platform, many hospitals.** A single, serverless deployment serves every customer. Onboarding a new hospital takes minutes through a wizard, not a project.
3. **Built for the Gulf.** Six languages including Arabic with right-to-left layout, mapped to Qatar's PDPPL (Personal Data Protection Law) as well as HIPAA and GDPR, with a data-residency path to the Bahrain AWS region.

Two hospitals are live today: Tiryaq and Alshifaa.

## 2. What the platform does

| Capability | What a hospital gets |
|---|---|
| Patient management | Registration with Qatari-ID / phone uniqueness, profile, history, soft-delete and restore, search and filter |
| Doctor management | Profiles, departments, specialisations, duty days and hours, doctor-to-patient assignment |
| Appointments and calendar | Slot booking with duty-day and overlap checks, status lifecycle, a hospital calendar with recurring events |
| Consultations (SOAP) | Structured examination: chief complaint, vital signs with clinical ranges, ICD-coded diagnoses, prescriptions, lab and radiology orders, treatment plan, sign-off that locks the record |
| ScribeFirst (AI) | The doctor dictates; the transcript is split into a SOAP note by Claude on AWS Bedrock; the doctor reviews and approves |
| Pharmacy | Medication catalogue, inventory with reorder points and expiry tracking, prescription dispensing with an allergy guardrail that requires a doctor-approved document to override, purchase orders |
| Blood bank | Donors, donations with screening, unit inventory with product-specific shelf life, transfusion requests, ABO/Rh crossmatch, issue with full chain of custody |
| Documents | Pre-signed, tenant-isolated upload and download of lab results, radiology (including DICOM), prescriptions, approvals; 50 MB limit; folder-level role access |
| Invoicing and payments | Per-patient payments and invoices |
| Administration | Tenant admin panel for users, passwords, audit; platform operator console for tenants, plans, usage, and onboarding |
| Offline | The app keeps working when the network drops and syncs when it returns |

Full detail, every rule and every setting: **AKW-FS-03 Functional Specification**.

## 3. Who uses it

| Role | Cognito group | What they see |
|---|---|---|
| Hospital administrator | `Admin` | Everything in their hospital: patients, doctors, appointments, documents, admin panel |
| Developer (hospital IT) | `Developers` | Same as administrator plus ScribeFirst |
| Doctor | `Doctors` | Their own patients, consultations, appointments, documents, ScribeFirst, blood bank |
| Pharmacist | `Pharmacists` | Pharmacy, blood bank, prescription and approval documents |
| Platform operator (Akwadona staff) | `Operator` | The operator console only — tenants, plans, usage, users. **Never patient data.** |

## 4. How it works, in one picture

```
Doctor's browser  ──HTTPS──►  CloudFront (edge cache, TLS)  ──►  S3 (the Angular app)
       │
       │  Authorization: Bearer <JWT from Cognito>
       ▼
API Gateway (verifies the token, rate-limits)  ──►  Lambda (one function per job)
                                                        │
                                                        ├──► KMS   — the hospital's own key encrypts / decrypts PHI
                                                        ├──► DynamoDB — one table, every row tagged with the hospital
                                                        ├──► S3    — uploaded documents
                                                        └──► CloudWatch + CloudTrail — logs, metrics, immutable audit
```

What happens when a doctor clicks **Add patient**:

1. The browser loads the app from CloudFront (served from the nearest city).
2. Cognito has already signed the doctor in; the browser holds a JWT (JSON Web Token) — a signed digital ID card that names the doctor, their hospital, and their role.
3. The browser POSTs the new patient to API Gateway with that token.
4. API Gateway checks the signature and forwards the request to the `create-patient` Lambda.
5. The Lambda reads the hospital ID from the token (never from the request), encrypts the patient's name, Qatari ID, phone, and date of birth with **that hospital's** KMS key, and writes the row to DynamoDB in a transaction that also reserves the Qatari ID and phone number so they cannot be registered twice.
6. The Lambda writes an audit row and returns "OK". Total time: ~100 ms.

At no point does the patient's name exist in plain text anywhere Akwadona staff can read it.

## 5. Where it runs

| Item | Value |
|---|---|
| Cloud | AWS, account `483176634665`, region `us-east-1` (N. Virginia); Bahrain `me-south-1` planned for the data-residency tier |
| Domain | `akwadona.com` (registered at GoDaddy) — `www` for the operator console, `<slug>.akwadona.com` per hospital |
| Infrastructure as code | One CloudFormation stack, `AkwadonaCdkStack`, written in AWS CDK (TypeScript) |
| Front end | Angular 20, PrimeNG, Tailwind, PWA (installable, works offline) |
| Back end | 42 Node.js 20 Lambda functions behind one HTTP API |
| Database | One DynamoDB table (`Hospital`) with 9 indexes |
| Identity | One Cognito user pool, five groups |
| AI | Claude Haiku 4.5 on AWS Bedrock (data never leaves AWS) |
| Monthly run cost at today's scale | ~$15–30 |

## 6. Compliance posture

| Framework | Status | Evidence |
|---|---|---|
| HIPAA Security Rule | Mapped control by control | AKW-CCM-06 §2; Business Associate Agreement template AKW-LGL-07 Part A |
| Qatar PDPPL | Mapped | AKW-CCM-06 §3 |
| GDPR + DPIA | Mapped; DPIA template | AKW-CCM-06 §4–5; Data Processing Agreement template AKW-LGL-07 Part B |
| Audit trail | 7-year immutable (S3 Object Lock, compliance mode) | AKW-SAD-02 §4.1 |
| Encryption | At rest: AES-256-GCM with per-hospital keys; in transit: TLS 1.2+ | AKW-SSP-05 §3 |

Open items that affect the posture statement (honest as of this version): multi-factor authentication is **optional**, not required; the web application firewall is **disabled** for cost; the isolation probe is **run by hand**, not scheduled. Each has an owner and a date in AKW-RR-12.

## 7. Common customer questions

| Question | Honest answer |
|---|---|
| Is our data encrypted? | Yes — AES-256 at rest with your hospital's own KMS key, TLS 1.2+ in transit. |
| Can Akwadona staff see our patients? | No. The operator role has an explicit AWS deny on your key. The console shows subscription, usage, and audit metadata — never names, IDs, or clinical data. |
| Can we have our own database? | Today: shared table, isolated by hospital ID and by key. Dedicated-table tier is on the roadmap. |
| Do you sign a BAA / DPA? | Yes — templates in AKW-LGL-07. |
| Where is the login page? | Your own subdomain, branded, in six languages — never an AWS page. |
| What if your platform is hacked? | Attackers stealing our storage get ciphertext. We notify you within 24 hours regardless. |
| What if we leave? | Export of all your data (CSV / JSON / FHIR on roadmap), then we destroy your key — your data becomes unreadable to everyone, including us. |
| Uptime? | 99.9% monthly target on AWS managed services that each carry 99.99%. |
| Do you train AI on our data? | No. ScribeFirst runs on Bedrock under a no-training clause. |
| Languages? | English, Arabic (RTL), French, Spanish, Hindi, Urdu. |

---

## Appendix A — Glossary (every term, four parts, with console links)

Each entry has: **What it is** → **Why it exists** → **Real-life example** → **How Akwadona uses it** → **See in AWS Console** (a direct link; for pure concepts, where the concept actually lives). Diagrams for the encryption entries are in `images/`.

### A.1 AWS resources (Lambda, API Gateway, DynamoDB, S3, CloudFront, Cognito, KMS, IAM, CloudWatch, CDK, ACM)

#### 3.1 Lambda

- **What it is:** A piece of code that runs only when a request arrives, then disappears. AWS spins up a fresh "container" for each invocation.
- **Why it exists (objective):** to remove the cost and operational burden of running servers 24/7. You pay per millisecond of execution instead of paying for an idle machine.
- **Real-life example:** A food truck that only opens when a customer arrives, serves them, and shuts down. No rent on an idle restaurant.
- **How Akwadona uses it:** 42 Lambda functions — 39 serve API routes (`akwadona-get-all-patients`, `akwadona-create-doctor`, `akwadona-operator-console`, …) plus 3 support functions (`cognito-pre-token-generation`, `akwadona-seed`, `akwadona-create-users`). CDK adds 2 more of its own for custom-resource plumbing, so the CloudFormation template shows 44.

#### 3.2 API Gateway

- **What it is:** The single public HTTPS endpoint in front of all our Lambdas. It routes incoming HTTP requests to the right Lambda.
- **Why it exists (objective):** to enforce shared concerns once (CORS, JWT validation, rate limiting, logging, TLS termination) instead of each Lambda re-implementing them.
- **Real-life example:** A hotel reception desk. Every visitor passes through reception, gets verified, then is sent to the right floor.
- **How Akwadona uses it:** one HTTP API (`ouohmmpi31.execute-api.us-east-1.amazonaws.com`, name `akwadona-api`) with a JWT authorizer attached to every route — there are no unauthenticated routes. Since 2026-10-29 the `$default` stage also enforces a 200 req/s sustained / 500 burst throttle before any Lambda runs.

#### 3.3 DynamoDB

- **What it is:** Amazon's NoSQL database. Stores rows ("items"). Every read/write completes in milliseconds at any data size.
- **Why it exists (objective):** to give SaaS-scale applications a database that doesn't slow down as it grows from 100 rows to 1 billion. Traditional SQL databases (MySQL, Postgres) need careful tuning at scale; DynamoDB doesn't.
- **Real-life example:** A giant smart filing cabinet. You hand it a label ("patient #123") and it returns the file instantly. Same speed at 100 files as at 100 million.
- **How Akwadona uses it:** one table called `Hospital`. Every row has a `PK` (partition key) starting with the tenant ID, so all Tiryaq data lives in `PATIENT#T_2572fc71#…` rows, Alshifaa in `PATIENT#T_a4b8aef9#…`. Same cabinet, different drawers.

#### 3.4 S3 — Simple Storage Service

- **What it is:** Amazon's file storage. You upload files, you can download them later. Unlimited size, very cheap.
- **Why it exists (objective):** to store files (images, PDFs, lab reports) that are too big or wrong-shaped for a database. DynamoDB has a 400 KB row limit; S3 has no practical limit.
- **Real-life example:** A giant warehouse with unlimited shelves. You give a box, get a receipt, retrieve it later by receipt number.
- **How Akwadona uses it:** two buckets — one holds the Angular app's static files (HTML/CSS/JS), one (`akwadona-documents-…`) holds uploaded patient documents and lab reports.

#### 3.5 CloudFront — CDN (Content Delivery Network)

- **What it is:** Amazon's network of "edge servers" spread across hundreds of cities. Copies of our files live at every edge.
- **Why it exists (objective):** to make web pages load fast for users no matter where they are in the world. Without CloudFront, every doctor in Qatar would download our JS files from Virginia → slow.
- **Real-life example:** Instead of shipping pizza from Italy to every customer worldwide, Domino's opens a branch in every major city. The customer picks up locally.
- **How Akwadona uses it:** one CloudFront distribution (`E1YOKWKHQNSPQW`) caches the Angular app. A doctor in Doha gets the app from the Bahrain or Mumbai edge in milliseconds.

#### 3.6 Cognito

- **What it is:** Amazon's user-management and login service.
- **Why it exists (objective):** so we don't have to build our own login system (which is hard to do safely). Cognito handles password storage, password resets, multi-factor auth, social login, and OAuth2/OIDC.
- **Real-life example:** A passport office. Every user gets an account once. To enter the country, they show their passport (JWT) which the passport office issued.
- **How Akwadona uses it:** one User Pool (`us-east-1_YibFfEdDD`, name `akwadona-user-pool`). All hospital users + Akwadona staff live in it. Five groups decide the role: `Admin`, `Developers`, `Doctors`, `Pharmacists`, `Operator`. The login page is the app's own screen at `<tenant>.akwadona.com/login` (custom Angular login calling Cognito's InitiateAuth API); `auth.akwadona.com` is the Cognito custom domain used for token refresh. Password policy: 12+ chars, all classes; temp passwords expire in 3 days; Advanced Security (threat protection) is on.

#### 3.7 KMS — Key Management Service

- **What it is:** Amazon's vault that holds encryption keys. The keys never leave the vault — KMS does the encryption/decryption on your behalf when you have permission.
- **Why it exists (objective):** to make it impossible to steal an encryption key. If the key never leaves the vault, an attacker who breaches our app server can't grab it.
- **Real-life example:** A bank vault that holds safe-deposit-box keys. You can't take the key out; you ask the bank to open the box for you. They check your ID first.
- **How Akwadona uses it:** **two KMS keys per hospital**.
  - **Data key** (e.g. Tiryaq's `11b1386b-…`) — encrypts patient records.
  - **HMAC key** (e.g. Tiryaq's `601f8aab-…`) — fingerprints searchable fields like email.
  - Tiryaq's keys cannot open Alshifaa's data and vice versa. **This is what proves we cannot read patient data.**

#### 3.8 IAM — Identity and Access Management

- **What it is:** Amazon's permission system. Every action (read DB, decrypt key, send email) is allowed or denied based on IAM rules.
- **Why it exists (objective):** to follow the "principle of least privilege" — every actor (user, Lambda, etc.) should have exactly the permissions they need and no more. Limits the damage if any one piece is compromised.
- **Real-life example:** A hotel's rule book. The cleaning lady can enter empty rooms. The manager can enter any room. The guest can only enter their own room. Each role has a list of allowed actions.
- **How Akwadona uses it:** every Lambda has its own IAM "role" listing what it can do. Since 2026-10-29 the 14 read-only Lambdas (`get*`, `list*`) have read-only table access (plus one scoped `UpdateItem` on `THROTTLE#*` counter rows); only the 25 mutating Lambdas can write. The operator console Lambda has an explicit DENY on `kms:Decrypt` for every tenant key, and can only schedule deletion of keys it created itself (tagged `akwadona:tenantId`), never the live Tiryaq / Alshifaa keys.

#### 3.9 CloudWatch

- **What it is:** Amazon's monitoring service. Stores logs, metrics, and triggers alarms.
- **Why it exists (objective):** so we can investigate problems and prove what happened (auditors require this). Without CloudWatch, when something breaks, you have no record.
- **Real-life example:** A building's security camera + receipt-drawer combo. Every action is recorded. Every error is captured. Look back at any moment.
- **How Akwadona uses it:** every Lambda writes logs to a log group named `/aws/lambda/<function-name>`. We also publish the custom metric namespace `Akwadona/Throttle` (per-tenant 429 hits, from `throttle.js`). Two alarms exist (added 2026-10-29): `akwadona-api-5xx` and `akwadona-lambda-errors`, both routed to the SNS topic `akwadona-alarms` — subscribe your e-mail once after deploy.

#### 3.10 CDK — Cloud Development Kit

- **What it is:** A way to describe AWS infrastructure as code (TypeScript). You write code, run `cdk deploy`, AWS builds the matching infrastructure.
- **Why it exists (objective):** to make infrastructure repeatable, reviewable, and recoverable. Without CDK, you build things by clicking around the AWS Console — and if your account is wiped, you can't rebuild from memory.
- **Real-life example:** Architectural blueprints. Workers build a building from the blueprint. If the building burns down, you rebuild from the same blueprint.
- **How Akwadona uses it:** the file `akwadona-cdk/lib/akwadona-cdk-stack.ts` describes our whole AWS setup as one CloudFormation stack named `AkwadonaCdkStack`. `npx cdk deploy` brings up the entire system from scratch in ~5 minutes. The stack is at 496 of CloudFormation's 500-resource ceiling — see `AKW-SAD-02-Solution-Architecture-Document.md` §9 for the split plan.

#### 3.11 ACM — AWS Certificate Manager

- **What it is:** Amazon's service for issuing SSL/TLS certificates (the cryptographic proof that `akwadona.com` is really us).
- **Why it exists (objective):** every web service needs HTTPS. Without a valid certificate, browsers show "Not Secure" warnings. ACM issues these for free and auto-renews them.
- **Real-life example:** A notarized business license. The notary (ACM) confirms "this person is who they claim to be". The browser checks the notary's seal.
- **How Akwadona uses it:** we have ACM certs for `akwadona.com`, `www.akwadona.com`, the tenant subdomains, and `auth.akwadona.com`. CloudFront and Cognito use them for HTTPS.

---


### A.2 Concepts and abbreviations

> Each entry ends with **See in AWS Console** — a direct link where you can see the real thing in the account. For pure concepts (PHI, SaaS, …) there is no AWS page, so the line names where the concept actually lives.

#### 4.1 JWT — JSON Web Token

- **What it is:** A long string carrying claims about a user ("I am Dr. Ahmed at Tiryaq, role Doctor, expires at 5pm"). Cryptographically signed by Cognito.
- **Why it exists (objective):** to let the backend trust a request's identity claims without calling Cognito on every single API call. The signature proves the claims are real.
- **Real-life example:** A passport with a tamper-evident hologram. The border officer doesn't call your home country every time — the hologram alone is proof.
- **How Akwadona uses it:** Cognito issues a JWT after sign-in. The browser sends it on every API request in the `Authorization: Bearer …` header. API Gateway verifies the signature; the Lambda reads the claims.
- **See in AWS Console:** [Cognito user pool `us-east-1_YibFfEdDD` → App integration → Token customization](https://us-east-1.console.aws.amazon.com/cognito/v2/idp/user-pools/us-east-1_YibFfEdDD/app-integration?region=us-east-1). The pre-token Lambda that stamps `tenantId` + `doctorId` into the JWT is linked from the "Pre token generation" trigger panel on that same page.

#### 4.2 PHI — Protected Health Information

- **What it is:** A legal term for any data that identifies a patient: name, DOB, ID number, address, phone, diagnosis, medications, etc.
- **Why it exists (objective):** to set a clear list of what's regulated by HIPAA. If something is on this list, it must be encrypted, audited, and access-controlled.
- **Real-life example:** A medical envelope marked "Confidential — Patient Records". Even the cleaning staff knows not to open it.
- **How Akwadona uses it:** every PHI field is encrypted in DynamoDB. Search-able PHI (email) is replaced with an HMAC fingerprint. The operator console **never** displays PHI.
- **See in AWS Console:** no page — PHI is a legal category, not an AWS resource. Where it actually lives: [DynamoDB `Hospital` table items with PK `PATIENT#…`](https://us-east-1.console.aws.amazon.com/dynamodbv2/home?region=us-east-1#item-explorer?table=Hospital), encrypted with the per-tenant KMS key (see 4.4).

#### 4.3 PII — Personally Identifiable Information

- **What it is:** Broader than PHI. Any data that identifies a person — even non-medical (e.g. a doctor's home address).
- **Why it exists (objective):** GDPR and PDPPL apply to PII (not just PHI). So we treat staff data, billing data, etc. with care too.
- **Real-life example:** An office HR file with someone's home address — not medical, but still confidential.
- **How Akwadona uses it:** same encryption rules as PHI apply to staff PII (email, phone, address).
- **See in AWS Console:** no page — PII is a legal category. In practice: [DynamoDB `Hospital` table items with PK `DOCTOR#…` / `NURSE#…` / `ADMIN#…`](https://us-east-1.console.aws.amazon.com/dynamodbv2/home?region=us-east-1#item-explorer?table=Hospital), same encryption rules as 4.2.

#### 4.4 Encryption (at rest, in transit)

- **What it is:** Scrambling data so only someone with the key can unscramble it.
- **Why it exists (objective):** to keep data safe if it's stolen. If an attacker grabs our DynamoDB backups, all they see is gibberish.
- **Real-life example:** Locking documents in a safe. Even if someone steals the safe, they need the combination to read what's inside.
- **How Akwadona uses it:**
  - **At rest** (stored data): AES-256-GCM via per-tenant KMS keys.
  - **In transit** (data moving over the network): TLS 1.2+ enforced everywhere.
- **Diagram:** at-rest is drawn in [`images/4.4-at-rest-and-4.8-envelope-encryption.svg`](images/4.4-at-rest-and-4.8-envelope-encryption.svg); in-transit is drawn in [`images/4.4-in-transit-and-4.5-tls-https.svg`](images/4.4-in-transit-and-4.5-tls-https.svg).
- **See in AWS Console:** [KMS → Customer managed keys](https://us-east-1.console.aws.amazon.com/kms/home?region=us-east-1#/kms/keys) — filter by alias prefix `akwadona-tenant-` to see every hospital's data key. Click any key and open the "Key policy" tab to see the operator DENY line.

#### 4.5 TLS / HTTPS

- **What it is:** TLS = Transport Layer Security. HTTPS = HTTP carried inside TLS. The "padlock" in the browser bar.
- **Why it exists (objective):** to encrypt every byte that travels between the browser and the server, so eavesdroppers on the network can't read it.
- **Real-life example:** Sending a letter in a sealed armored car instead of an open postcard.
- **How Akwadona uses it:** every URL is HTTPS. The certificate is issued by ACM. CloudFront and API Gateway enforce TLS 1.2 minimum.
- **Diagram:** [`images/4.4-in-transit-and-4.5-tls-https.svg`](images/4.4-in-transit-and-4.5-tls-https.svg) — the full TLS handshake, step by step.
- **See in AWS Console:** [ACM → Certificates (us-east-1)](https://us-east-1.console.aws.amazon.com/acm/home?region=us-east-1#/certificates/list) — look for `*.akwadona.com` wildcard. Enforcement lives on the [CloudFront distribution `E1YOKWKHQNSPQW` → Behaviors → "Viewer protocol policy"](https://us-east-1.console.aws.amazon.com/cloudfront/v4/home#/distributions/E1YOKWKHQNSPQW) ("Redirect HTTP to HTTPS", "Minimum TLS 1.2").

#### 4.6 Hashing

- **What it is:** A one-way mathematical crusher. Input "John" → output `5d40f3…`. You cannot reverse it.
- **Why it exists (objective):** to store sensitive data we only need to compare, not retrieve — like passwords. The server stores the hash; on login, it hashes the input and compares.
- **Real-life example:** A blender. Apple goes in, apple sauce comes out. You cannot un-blend.
- **How Akwadona uses it:** passwords are hashed by Cognito (we never see them). Some non-searchable identifiers are also hashed.
- **Diagram:** [`images/4.6-hashing-and-4.7-hmac.svg`](images/4.6-hashing-and-4.7-hmac.svg) — hashing is the LEFT half of the diagram.
- **See in AWS Console:** [Cognito user pool `us-east-1_YibFfEdDD` → Sign-in](https://us-east-1.console.aws.amazon.com/cognito/v2/idp/user-pools/us-east-1_YibFfEdDD/sign-in?region=us-east-1). The hashing happens inside Cognito — there is no raw-password view by design.

#### 4.7 HMAC — Hash-based Message Authentication Code

- **What it is:** A hash with a secret key mixed in. Same input + same key always gives the same fingerprint; different keys give different fingerprints.
- **Why it exists (objective):** to make searchable fingerprints that are still tenant-isolated. Plain hashing would give the same fingerprint to "john@gmail.com" across all hospitals — an attacker could cross-reference. HMAC with a per-tenant key makes the fingerprints unique to each hospital.
- **Real-life example:** A rubber stamp where part of the design is hidden inside the stamp body. Two companies might own identical stamps from outside, but the hidden part differs — so prints from each company are distinguishable.
- **How Akwadona uses it:** patient/staff emails are HMAC'd with the tenant's HMAC key. To search "find email=`x@y.com`" we HMAC the input the same way and look up the fingerprint in DynamoDB.
- **Diagram:** [`images/4.6-hashing-and-4.7-hmac.svg`](images/4.6-hashing-and-4.7-hmac.svg) — HMAC is the RIGHT half of the diagram, with the cross-tenant isolation example at the bottom.
- **See in AWS Console:** [KMS → Customer managed keys](https://us-east-1.console.aws.amazon.com/kms/home?region=us-east-1#/kms/keys) — filter by alias suffix `-hmac` (e.g. `alias/akwadona-tenant-tiryaq-hmac`). Each tenant has one. Key spec is `HMAC_256`.

#### 4.8 Envelope Encryption — KEK + DEK

- **What it is:** A pattern where each row is encrypted with a unique key (DEK = Data Encryption Key), and the DEK itself is encrypted with a master key (KEK = Key Encryption Key). Both are stored together.
- **Why it exists (objective):** to make per-row key rotation cheap and to enable cryptographic erasure. If we ever need to "delete all of Hospital X's data" we just destroy the KEK — every DEK becomes un-openable instantly.
- **Real-life example:** A locked box (DEK) inside a locked vault (KEK). To destroy everything inside, you melt the vault key. The boxes still exist but no key can open them ever again.
- **How Akwadona uses it:** KEK = the per-tenant KMS data key. DEK = a random AES key generated per row. Both go into each DynamoDB item.
- **Diagram:** [`images/4.4-at-rest-and-4.8-envelope-encryption.svg`](images/4.4-at-rest-and-4.8-envelope-encryption.svg) — write path, read path, what a row looks like, and the five moving parts.
- **See in AWS Console:** The KEK is the [KMS data key `alias/akwadona-tenant-<slug>`](https://us-east-1.console.aws.amazon.com/kms/home?region=us-east-1#/kms/keys). The DEK is stored inside each DynamoDB row — view it on an encrypted field in [DynamoDB `Hospital` table items](https://us-east-1.console.aws.amazon.com/dynamodbv2/home?region=us-east-1#item-explorer?table=Hospital) (fields like `nameEnc`, `qidEnc`).

#### 4.9 Tenant / Multi-tenant

- **What it is:** A "tenant" is one customer hospital. "Multi-tenant" means our system serves many tenants from the same software.
- **Why it exists (objective):** so we can scale to 100 hospitals without running 100 separate apps. One codebase, one deploy, one operations team.
- **Real-life example:** An apartment building (multi-tenant) versus 100 separate houses (single-tenant). The building is cheaper to maintain.
- **How Akwadona uses it:** every DynamoDB row has a `tenantId`. Every Lambda reads the `tenantId` from the JWT and only touches rows that match.
- **See in AWS Console:** [DynamoDB `Hospital` table → Explore items](https://us-east-1.console.aws.amazon.com/dynamodbv2/home?region=us-east-1#item-explorer?table=Hospital) — filter `PK begins_with TENANT#` to see every tenant row (one per hospital). Every other row carries a `tenantId` attribute matching one of these.

#### 4.10 Pool / Bridge / Silo (three multi-tenant models)

- **Pool:** every tenant shares everything (one DB, one Lambda set, one KMS key).
- **Bridge:** shared compute (Lambdas, DB) but per-tenant KMS keys + per-row tenant ID isolation. **What Akwadona is today.**
- **Silo:** every tenant gets their own dedicated DB + Lambdas. Strongest isolation, most expensive. Future "Premium Isolation" tier.
- **Why it exists (objective):** different customers need different levels of isolation. Bridge is the sweet spot — strong enough for HIPAA/PDPPL/GDPR, cheap enough to be profitable.
- **Real-life example:** Pool = shared dorm room. Bridge = apartment building with private apartments + private safes. Silo = separate houses.
- **How Akwadona uses it:** Bridge today (per-tenant KMS keys, shared infra). Silo as a paid upgrade later.
- **See in AWS Console:** no single page — the Bridge model is enforced across two services together. See the per-tenant keys in [KMS](https://us-east-1.console.aws.amazon.com/kms/home?region=us-east-1#/kms/keys) and the per-row `tenantId` attribute in [DynamoDB `Hospital` items](https://us-east-1.console.aws.amazon.com/dynamodbv2/home?region=us-east-1#item-explorer?table=Hospital).

#### 4.11 Zero-knowledge

- **What it is:** A design where the platform provider (us) provably cannot see the customer's data.
- **Why it exists (objective):** the strongest possible privacy promise. "Trust us" is weak; "we mathematically cannot read your data" is strong. Hospitals need this for regulators.
- **Real-life example:** A bank vault to which only the customer has the key. The bank manages the vault but cannot open it.
- **How Akwadona uses it:** per-tenant KMS keys + no human IAM permission to use them + operator console code that never calls Decrypt.
- **See in AWS Console:** two places together. [IAM → Roles](https://us-east-1.console.aws.amazon.com/iamv2/home#/roles) — search `akwadona-operator`; open its "Permissions" tab and find the explicit DENY on `kms:Decrypt`. Then [KMS keys](https://us-east-1.console.aws.amazon.com/kms/home?region=us-east-1#/kms/keys) — open any `akwadona-tenant-*` key's "Key policy" to see the operator principal is excluded.

#### 4.12 OIDC — OpenID Connect

- **What it is:** A standard protocol on top of OAuth2 for "logging in via a third party".
- **Why it exists (objective):** to give a single, widely-implemented way for apps to use a central login provider. Reuse standardized libraries instead of inventing custom auth.
- **Real-life example:** An international visa standard. Every country reads the same kind of visa stamp. No country invents their own format.
- **How Akwadona uses it:** Cognito speaks OIDC. The Angular app uses an OIDC library (`angular-auth-oidc-client`) to talk to it.
- **See in AWS Console:** [Cognito user pool `us-east-1_YibFfEdDD` → App integration → App clients](https://us-east-1.console.aws.amazon.com/cognito/v2/idp/user-pools/us-east-1_YibFfEdDD/app-integration?region=us-east-1). The app client "OpenID Connect scopes" row lists the scopes we request (`openid`, `profile`, `email`).

#### 4.13 OAuth2

- **What it is:** The older parent standard of OIDC. Originally about "let App A access my data in App B without sharing my password".
- **Why it exists (objective):** to delegate access without sharing credentials. Example: "Let Calendly read my Google Calendar" — Calendly never sees your Google password.
- **Real-life example:** Hotel valet key — a special car key that can park your car but cannot open the trunk or glovebox.
- **How Akwadona uses it:** as the protocol underneath OIDC. We use the "Authorization Code with PKCE" flow.
- **See in AWS Console:** same page as 4.12 — [Cognito → App integration → App clients](https://us-east-1.console.aws.amazon.com/cognito/v2/idp/user-pools/us-east-1_YibFfEdDD/app-integration?region=us-east-1). The "OAuth 2.0 grant types" checkboxes (we check "Authorization code grant") and the "Allowed callback URLs" live on the client's detail page.

#### 4.14 SSO — Single Sign-On

- **What it is:** Signing in once gives you access to multiple apps.
- **Why it exists (objective):** so users don't have 10 passwords for 10 internal apps.
- **Real-life example:** A corporate badge that opens every door in the building.
- **How Akwadona uses it:** today, the same Cognito sign-in covers the tenant app, the admin panel, and the operator console. Future: SAML federation with hospital IdPs.
- **See in AWS Console:** [Cognito user pool `us-east-1_YibFfEdDD` → Users](https://us-east-1.console.aws.amazon.com/cognito/v2/idp/user-pools/us-east-1_YibFfEdDD/users?region=us-east-1) — one record per human, used across every Akwadona surface. The "Identity providers" tab is where a hospital's SAML IdP would be added (none configured yet).

#### 4.15 MFA — Multi-Factor Authentication

- **What it is:** Requiring two or more proofs of identity (something you know + something you have).
- **Why it exists (objective):** passwords get phished. A second factor (SMS code, authenticator app) blocks attackers who steal passwords.
- **Real-life example:** ATM withdrawal needs both the card AND the PIN.
- **How Akwadona uses it:** Cognito supports TOTP (authenticator-app) MFA. **Current state:** MFA was switched OFF in a prior step and is set to OPTIONAL as of the 2026-10-29 change — any user can enrol an authenticator app, nobody is forced yet. Making it REQUIRED for the Operator and Admin groups is the open product decision (see `AKW-SAD-02` §9).
- **See in AWS Console:** [Cognito user pool `us-east-1_YibFfEdDD` → Sign-in experience → Multi-factor authentication](https://us-east-1.console.aws.amazon.com/cognito/v2/idp/user-pools/us-east-1_YibFfEdDD/sign-in?region=us-east-1). Shows which MFA methods are allowed and whether MFA is Optional / Required.

#### 4.16 CORS — Cross-Origin Resource Sharing

- **What it is:** A browser security rule. By default, a page from `akwadona.com` cannot call an API at `amazonaws.com` unless that API explicitly allows it.
- **Why it exists (objective):** to stop a malicious website you visit from secretly calling your bank's API on your behalf.
- **Real-life example:** A border check between two countries. By default you can't drive through; the destination country must publish a list of allowed source countries.
- **How Akwadona uses it:** API Gateway is configured to allow our domains (`akwadona.com`, `www.akwadona.com`, `tiryaq.akwadona.com`, etc.).
- **See in AWS Console:** [API Gateway → APIs](https://us-east-1.console.aws.amazon.com/apigateway/main/apis?region=us-east-1) — open our HTTP API (search `akwadona`), then the "CORS" tab. The "Access-Control-Allow-Origin" list is where tenant domains are added.

#### 4.17 Throttling / Rate Limiting

- **What it is:** Capping how many requests one user can make per second/minute/day.
- **Why it exists (objective):** to stop one runaway customer (bug or attack) from eating all the platform's capacity.
- **Real-life example:** A restaurant accepting only N orders per hour from each table to keep the kitchen fair.
- **How Akwadona uses it:** plan-based tiers — Free 10 req/s, Standard 100, Enterprise 500. 429 returned on breach. See Step 2g.
- **See in AWS Console:** two places. [API Gateway → our HTTP API → Throttling](https://us-east-1.console.aws.amazon.com/apigateway/main/apis?region=us-east-1) for the account-level burst/rate limit. [CloudWatch → Metrics → Custom namespace `Akwadona/Throttle`](https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#metricsV2?namespace=Akwadona/Throttle) for per-tenant hits.

#### 4.18 Idempotency

- **What it is:** A property where doing the same operation twice gives the same result as doing it once.
- **Why it exists (objective):** networks fail. The user clicks "Submit", the response is lost in transit. They click again. Without idempotency, you create duplicates.
- **Real-life example:** An elevator button. Pressing it twice doesn't make the elevator come twice — the second press is ignored if the first is queued.
- **How Akwadona uses it:** every mutating request sends an `X-Client-Request-Id` UUID. The backend remembers it for 24 hours; second hit returns the cached result of the first.
- **See in AWS Console:** [DynamoDB `Hospital` table → Explore items](https://us-east-1.console.aws.amazon.com/dynamodbv2/home?region=us-east-1#item-explorer?table=Hospital) — filter `PK begins_with IDEMPOTENCY#`. Each row has a TTL (see 4.21) so Dynamo sweeps it after 24 h.

#### 4.19 Audit Log

- **What it is:** A tamper-evident record of every action: who, what, when, before-and-after.
- **Why it exists (objective):** HIPAA, PDPPL, and GDPR require it. Regulators will ask "show me every access to patient #123 in 2025" and you must answer.
- **Real-life example:** A safe-deposit-box log book at a bank. Every entry has signature + date + which box was opened.
- **How Akwadona uses it:** every create/update/delete writes an `AUDIT#…` row in DynamoDB with the actor's email, timestamp, action, and encrypted before/after JSON.
- **See in AWS Console:** two places. App-level audit: [DynamoDB `Hospital` table](https://us-east-1.console.aws.amazon.com/dynamodbv2/home?region=us-east-1#item-explorer?table=Hospital) → filter `PK begins_with AUDIT#`. AWS-account-level audit: [CloudTrail → Event history](https://us-east-1.console.aws.amazon.com/cloudtrail/home?region=us-east-1#/events) — every console click, CLI call, and SDK call against the AWS account.

#### 4.20 GSI — Global Secondary Index

- **What it is:** A DynamoDB feature: a second way to look up data in the same table.
- **Why it exists (objective):** the main key (`PK`) is one specific lookup path. We often need to look up by email, by date, by tenant. GSIs add more paths.
- **Real-life example:** A library catalog by author AND another by title. Same books, two ways to find them.
- **How Akwadona uses it:** 9 GSIs. `tenant-entityType-index` lists all rows of one type for one tenant (the workhorse). `emailHash-EntityType-index` finds a patient or doctor by the HMAC fingerprint of their email. `EntityType-index` lists global rows (TENANT, departments). `GSI2` (`name_prefix`/`name_lower`) is **not** populated — `name` has been encrypted since Step 3, so name search runs in memory after decryption instead.
- **See in AWS Console:** [DynamoDB `Hospital` table → Indexes tab](https://us-east-1.console.aws.amazon.com/dynamodbv2/home?region=us-east-1#table?name=Hospital&tab=indexes) — lists all 9 GSIs with their partition/sort keys.

#### 4.21 TTL — Time To Live

- **What it is:** A "delete me after this date" marker on a DynamoDB row. DynamoDB sweeps these for free.
- **Why it exists (objective):** to delete temporary data (rate-limit counters, idempotency keys, session records) without writing a cron job.
- **Real-life example:** A library book with a return date. After the date, it's automatically marked overdue and goes back on the shelf.
- **How Akwadona uses it:** the table's TTL attribute is **`expiresAt`** (epoch seconds). Throttle counters expire after the minute/day window; idempotency keys after 24 hours. (Until 2026-10-29 `throttle.js` wrote the expiry to a field called `ttl` by mistake, so no counter was ever swept — fixed, and `scripts/purge-throttle-counters.js` removes the backlog.)
- **See in AWS Console:** [DynamoDB `Hospital` table → Additional settings → Time to Live](https://us-east-1.console.aws.amazon.com/dynamodbv2/home?region=us-east-1#table?name=Hospital&tab=overview). Shows that `expiresAt` is the TTL attribute and whether TTL sweep is enabled.

#### 4.22 API — Application Programming Interface

- **What it is:** A documented set of endpoints (URLs) that one program calls to use another program's features.
- **Why it exists (objective):** so programs can talk without humans in the middle. The browser calls our API to add a patient; no human types in the database.
- **Real-life example:** A restaurant menu. The diner orders by number; the kitchen knows what to make. The menu is the contract.
- **How Akwadona uses it:** we expose ~70 route+method pairs under `ouohmmpi31.execute-api.us-east-1.amazonaws.com/*` (see `AKW-ICD-04-Interface-Control-Document.md`).
- **See in AWS Console:** [API Gateway → APIs (us-east-1)](https://us-east-1.console.aws.amazon.com/apigateway/main/apis?region=us-east-1) — look for the HTTP API named with `akwadona` in it; open "Routes" to see every endpoint.

#### 4.23 REST

- **What it is:** A style of designing APIs around resources (patients, doctors) and standard HTTP verbs (GET, POST, PATCH, DELETE).
- **Why it exists (objective):** to make APIs predictable. If you know how to use one REST API, you know the shape of all of them.
- **Real-life example:** A standard form factor for restaurant menus. Appetizer → Main → Dessert. Every restaurant uses the same layout.
- **How Akwadona uses it:** `GET /patients`, `POST /patients`, `PATCH /patients/{id}`, `DELETE /patients/{id}`. Same shape across all entities.
- **See in AWS Console:** [API Gateway → our HTTP API → Routes tab](https://us-east-1.console.aws.amazon.com/apigateway/main/apis?region=us-east-1). You can see every method+path and which Lambda handles it.

#### 4.24 HTTP / HTTPS

- **What it is:** HTTP = the protocol the web uses. HTTPS = HTTP wrapped in TLS encryption.
- **Why it exists (objective):** HTTP gives a standard way for browsers and servers to exchange data. HTTPS adds encryption.
- **Real-life example:** HTTP = postcard. HTTPS = sealed armored envelope.
- **How Akwadona uses it:** only HTTPS. HTTP redirects to HTTPS at the CloudFront layer.
- **See in AWS Console:** [CloudFront distribution `E1YOKWKHQNSPQW` → Behaviors](https://us-east-1.console.aws.amazon.com/cloudfront/v4/home#/distributions/E1YOKWKHQNSPQW) — the "Viewer protocol policy" column shows "Redirect HTTP to HTTPS" on every behavior.

#### 4.25 DNS / CNAME

- **What it is:** DNS = the system that turns `akwadona.com` into an IP address. A CNAME is one type of DNS record — "this name is an alias for that name".
- **Why it exists (objective):** humans remember names; computers need numeric IPs. DNS translates between them.
- **Real-life example:** A phone book — you look up "Pizza Hut" and find the phone number.
- **How Akwadona uses it:** GoDaddy hosts our DNS. CNAMEs route `auth.akwadona.com` → Cognito's CloudFront, `www.akwadona.com` → our CloudFront.
- **See in AWS Console:** no page — DNS lives at **GoDaddy** (`https://dcc.godaddy.com/domains/manage/akwadona.com/dns`). The AWS side is only the target: the CloudFront distribution [`E1YOKWKHQNSPQW`](https://us-east-1.console.aws.amazon.com/cloudfront/v4/home#/distributions/E1YOKWKHQNSPQW) ("Alternate domain names" lists the CNAMEs GoDaddy must point here).

#### 4.26 CDN — Content Delivery Network

- **What it is:** A network of cache servers worldwide. Pages load from the nearest cache, not the origin.
- **Why it exists (objective):** to cut latency. Visiting Italy on vacation but loading a US website would be slow without a CDN.
- **Real-life example:** Domino's branches in every city, instead of one pizza shop in Italy.
- **How Akwadona uses it:** CloudFront is our CDN.
- **See in AWS Console:** [CloudFront distribution `E1YOKWKHQNSPQW`](https://us-east-1.console.aws.amazon.com/cloudfront/v4/home#/distributions/E1YOKWKHQNSPQW) — the "Origins" tab shows what it caches from, "Behaviors" shows the cache policies.

#### 4.27 SPA — Single-Page Application

- **What it is:** A web app that loads once and then updates the page via JavaScript instead of full page reloads.
- **Why it exists (objective):** to feel as snappy as a desktop app. Server-rendered apps reload the whole page on every click — slow.
- **Real-life example:** A pop-up children's book where pages fold up instead of being torn out and replaced.
- **How Akwadona uses it:** Angular powers our SPA. After the initial load, navigation between tabs is instant.
- **See in AWS Console:** the SPA's static files live in an [S3 bucket (us-east-1)](https://us-east-1.console.aws.amazon.com/s3/buckets?region=us-east-1) — filter by `akwadonacdkstack-` to find the frontend bucket. CloudFront fronts it (see 4.26).

#### 4.28 PWA — Progressive Web App + Service Worker

- **What it is:** A web app that behaves like an installed app: works offline, gets cached, can be added to the home screen.
- **Why it exists (objective):** to give the convenience of mobile apps without going through app stores. The "service worker" is the background script that caches files and intercepts network calls.
- **Real-life example:** Google Docs offline — you can keep editing without internet, syncs back when online.
- **How Akwadona uses it:** the Angular Service Worker (`ngsw`) caches the app shell so it loads fast on second visit. Offline mode lets doctors keep creating consultations during network outages.
- **See in AWS Console:** no page — the service worker runs inside the user's browser. The files it caches come from [CloudFront `E1YOKWKHQNSPQW`](https://us-east-1.console.aws.amazon.com/cloudfront/v4/home#/distributions/E1YOKWKHQNSPQW); the offline queue is in the browser's IndexedDB.

#### 4.29 Bearer Token / Access Token / Refresh Token / ID Token

- **What it is:** Three different tokens issued by Cognito.
  - **Access token:** proves you can call APIs. Short-lived (1 h).
  - **ID token:** carries who you are (claims). Used by the frontend.
  - **Refresh token:** used to get new access tokens without re-logging-in. Long-lived (30 d).
  - "Bearer token" just means "whoever holds this token gets in" — like cash.
- **Why it exists (objective):** short-lived access tokens limit damage if stolen; refresh tokens let users stay logged in for weeks.
- **Real-life example:** Access token = day pass for an amusement park. ID token = your name written on the pass. Refresh token = a season ticket that lets you renew the day pass each morning without re-buying.
- **How Akwadona uses it:** browser stores all three in localStorage + sessionStorage. Access token goes on every API call.
- **See in AWS Console:** [Cognito user pool `us-east-1_YibFfEdDD` → App integration → App clients](https://us-east-1.console.aws.amazon.com/cognito/v2/idp/user-pools/us-east-1_YibFfEdDD/app-integration?region=us-east-1). Open our app client → "Token expiration" section shows Access (60 min), ID (60 min), Refresh (30 days) lifetimes.

#### 4.30 Session / Cookie / localStorage / sessionStorage

- **What it is:** Four ways to remember state in a browser.
  - **Cookie:** small string sent on every request to the same domain.
  - **localStorage:** persistent key/value store; survives browser close.
  - **sessionStorage:** key/value store; wiped when tab closes.
  - **Session:** general term for "the user's logged-in state".
- **Why it exists (objective):** HTTP itself is stateless. Without one of these, every page reload would log the user out.
- **Real-life example:** A coat-check ticket (cookie). A locker in the gym (localStorage — your stuff stays after you leave the building). A locker that resets when the room empties (sessionStorage).
- **How Akwadona uses it:** access tokens live in BOTH sessionStorage (for the current tab) and localStorage (for browser-close survival). Cache data lives in localStorage with a TTL.
- **See in AWS Console:** no page — these are browser-side stores. Open Chrome DevTools → Application → Storage on `www.akwadona.com` to see what the app writes there.

#### 4.31 LCP — Largest Contentful Paint (and other perf metrics)

- **What it is:** The time from page load start until the largest visible element (image, headline) is painted. Google's headline performance metric.
- **Why it exists (objective):** to score real user perception of speed, not just raw HTTP timings.
- **Real-life example:** A restaurant's "time to first bite". Not just "menu arrived" or "kitchen started cooking" — when the food is actually in front of you.
- **How Akwadona uses it:** target is < 1 s LCP on the operator dashboard. Measured with Lighthouse.
- **See in AWS Console:** no page — LCP is measured in the browser. [CloudWatch RUM (Real User Monitoring)](https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#rum:) would surface it per-user; we have not enabled RUM yet.

#### 4.32 Lighthouse

- **What it is:** Google's free Chrome tool that scores a web page on performance, accessibility, SEO, best practices.
- **Why it exists (objective):** to give developers an objective speedometer.
- **Real-life example:** A car's dashboard — speedometer, fuel gauge, oil pressure all in one view.
- **How Akwadona uses it:** we use it to verify perf targets (< 1 s LCP, etc.).
- **See in AWS Console:** no page — Lighthouse is a Chrome DevTools tab (open DevTools → Lighthouse → "Analyze page load").

#### 4.33 CI/CD — Continuous Integration / Continuous Deployment

- **What it is:** Automation that builds, tests, and deploys code every time someone commits to git.
- **Why it exists (objective):** to deploy small changes fast and safely. Without CI/CD, deploys are weekly and risky.
- **Real-life example:** A factory assembly line — every part flows automatically from station to station instead of being hand-carried.
- **How Akwadona uses it:** today: manual `npm run build` + S3 sync. Future: GitHub Actions on push to `main`.
- **See in AWS Console:** no page today — CI/CD is manual from a laptop. If we add AWS CodePipeline later: [CodePipeline (us-east-1)](https://us-east-1.console.aws.amazon.com/codesuite/codepipeline/pipelines?region=us-east-1).

#### 4.34 Git / Branch

- **What it is:** Git is the version-control system. A branch is a named line of changes you can work on independently.
- **Why it exists (objective):** to keep a complete history of every change and let multiple people work without stepping on each other.
- **Real-life example:** A Google Doc's version history. You can roll back to last Tuesday's version.
- **How Akwadona uses it:** repo `github.com/appdevmate/hospital`. Branch `development` is where we push every change.
- **See in AWS Console:** no page — the repo is on GitHub (`https://github.com/appdevmate/hospital`), not AWS CodeCommit.

#### 4.35 IaC — Infrastructure as Code

- **What it is:** Describing servers, databases, networks in code instead of clicking around the AWS Console.
- **Why it exists (objective):** to make infrastructure reviewable (in git), repeatable, and recoverable.
- **Real-life example:** The recipe in a cookbook — anyone with the recipe can reproduce the dish.
- **How Akwadona uses it:** CDK is our IaC tool. The `akwadona-cdk/` folder is our infrastructure recipe.
- **See in AWS Console:** [CloudFormation → Stacks](https://us-east-1.console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks) — look for `AkwadonaCdkStack`. "Resources" tab lists every AWS resource CDK created; "Events" shows the deploy history.

#### 4.36 Region / Availability Zone (AZ)

- **What it is:** AWS divides the world into Regions (e.g. `us-east-1` Virginia, `me-south-1` Bahrain). Each region has multiple AZs — independent data centers within the same city.
- **Why it exists (objective):** to give customers control over data location (compliance) and resilience (one AZ outage doesn't take you down).
- **Real-life example:** A bank has branches across countries (regions) and several offices in each city (AZs). If one office floods, the others keep running.
- **How Akwadona uses it:** we run in `us-east-1`. Multi-AZ is automatic for Lambda, DynamoDB, S3. Future: replicate to `me-south-1` for Qatar data-residency Premium tier.
- **See in AWS Console:** use the region picker in the top-right of any AWS Console page (shows `US East (N. Virginia) us-east-1` for us). The [AWS Health Dashboard](https://health.aws.amazon.com/health/home) shows per-AZ status.

#### 4.37 Free tier

- **What it is:** AWS gives every account some free monthly usage (1M Lambda calls, 25 GB DynamoDB, 5 GB S3, 1 TB CloudFront, etc.).
- **Why it exists (objective):** to let startups build for free until they have real traffic.
- **Real-life example:** A free coffee on every coffee card after 9 paid coffees — gets you in the door.
- **How Akwadona uses it:** compute and storage sit inside the free tier. The fixed costs are KMS keys (6 today: 2 platform + 2 per tenant, $1 each per month) and Cognito Advanced Security (per active user). Realistic bill at today's scale: ~$15–30/month. WAF is currently disabled to save its ~$10 fixed fee.
- **See in AWS Console:** [Billing → Free tier](https://us-east-1.console.aws.amazon.com/billing/home#/freetier). Shows per-service usage vs the free-tier allowance for the current month.

#### 4.38 SaaS / PaaS / IaaS / B2B / B2C

- **What it is:** Layers of "as a service" offerings.
  - **IaaS** — raw infrastructure (e.g. EC2 servers).
  - **PaaS** — platforms (e.g. Lambda — you don't manage the server).
  - **SaaS** — finished software (e.g. Akwadona — the user just opens the browser).
  - **B2B** — Business to Business (we sell to hospitals).
  - **B2C** — Business to Consumer (e.g. Netflix sells to people).
- **Why it exists (objective):** to describe the value-add level. Higher up = less work for the buyer.
- **Real-life example:** IaaS = raw flour. PaaS = bread dough. SaaS = a sandwich.
- **How Akwadona uses it:** Akwadona is a B2B SaaS built on AWS PaaS services.
- **See in AWS Console:** no page — these are service-model categories, not resources. The PaaS services we actually consume are Lambda, DynamoDB, S3, Cognito, KMS, CloudFront, API Gateway — see §3 above and `AKW-SAD-02-Solution-Architecture-Document.md`.

#### 4.39 AES-256 / RSA / Public-Key Cryptography

- **What it is:** Encryption algorithms.
  - **AES-256:** fast symmetric encryption (same key locks & unlocks). What we use for PHI.
  - **RSA:** slower asymmetric encryption (two keys — public + private). Used for signing tokens, TLS handshakes.
- **Why it exists (objective):** different problems need different tools. AES for bulk data, RSA for trust + signatures.
- **Real-life example:** AES = a normal house lock (same key opens and closes). RSA = a mailbox slot (anyone can drop letters in via the public slot; only the owner with the private key can take them out).
- **How Akwadona uses it:** AES-256-GCM for envelope encryption. RSA-256 for Cognito's JWT signatures.
- **See in AWS Console:** AES: open any [KMS data key `alias/akwadona-tenant-*`](https://us-east-1.console.aws.amazon.com/kms/home?region=us-east-1#/kms/keys) — "Key spec" field reads `SYMMETRIC_DEFAULT` (AES-256-GCM). RSA for JWTs: no direct page — Cognito manages the signing keys internally; the public JWKS is served at `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_YibFfEdDD/.well-known/jwks.json`.

---


### A.3 Laws and agreements

#### 5.1 HIPAA — Health Insurance Portability and Accountability Act (USA)

- **What it is:** US healthcare privacy law.
- **Why it exists (objective):** to prevent unauthorized disclosure of patient health data.
- **Real-life example:** Doctor-patient confidentiality, codified for the digital age.
- **How Akwadona uses it:** every Akwadona feature is reviewed against HIPAA's Security Rule. Mapping in `AKW-CCM-06-Compliance-Controls-Matrix.md`. We sign a **BAA** with each customer.

#### 5.2 PDPPL — Personal Data Privacy Protection Law (Qatar)

- **What it is:** Qatar's national privacy law (2016).
- **Why it exists (objective):** to govern how Qatari residents' data is collected, processed, and shared.
- **Real-life example:** Qatar's equivalent of GDPR.
- **How Akwadona uses it:** all customer data lives in our system per PDPPL principles. Mapping in `AKW-CCM-06-Compliance-Controls-Matrix.md`.

#### 5.3 GDPR — General Data Protection Regulation (EU)

- **What it is:** EU privacy law, 2018.
- **Why it exists (objective):** to give EU residents control over their personal data — right to access, right to be forgotten, right to portability.
- **Real-life example:** The "delete my account and all my data" button is a GDPR right.
- **How Akwadona uses it:** mapping in `AKW-CCM-06-Compliance-Controls-Matrix.md`. We sign a **DPA** with EU-customer hospitals.

#### 5.4 BAA / DPA / DPIA

- **BAA — Business Associate Agreement** (HIPAA). A contract where we (the vendor) promise to handle PHI per HIPAA rules. Required by US-style customers.
- **DPA — Data Processing Agreement** (GDPR). The equivalent for EU.
- **DPIA — Data Protection Impact Assessment** (GDPR). A formal risk analysis we do once per new feature that processes personal data.
- **Why they exist (objective):** to put compliance obligations in writing, so if anything goes wrong, the legal trail is clear.
- **How Akwadona uses it:** templates in `AKW-LGL-07-Legal-Agreement-Templates.md`, `AKW-LGL-07-Legal-Agreement-Templates.md`. DPIA per feature.

#### 5.5 ePHI

- **What it is:** "Electronic PHI" — PHI in digital form. The HIPAA Security Rule specifically governs ePHI.
- **Why it exists (objective):** to clarify that digital records have the same protection as paper.
- **How Akwadona uses it:** every data point we handle IS ePHI by definition.

---


---

## Appendix B — If you remember five things

1. **Akwadona is a SaaS** — hospitals rent it, they don't buy it.
2. **Each hospital is a tenant** — they share the platform but never see each other's data.
3. **Per-hospital KMS keys** mean even we cannot read patient data — the key sales point, and provable.
4. **Lambda + DynamoDB + S3 + Cognito** are the workhorses; CloudFront and API Gateway are the front desks.
5. **The operator console at `www.akwadona.com/operator`** is where Akwadona monitors subscriptions and usage — without ever touching clinical data.

## Appendix C — The one-hour read

1. This document, §1–§7 (15 min)
2. AKW-SAD-02 §1–§3 (20 min)
3. AKW-SSP-05 §3 (15 min)
4. AKW-FS-03 §2 (10 min)

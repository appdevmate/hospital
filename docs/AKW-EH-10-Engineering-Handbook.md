# Akwadona Hospital Platform — Engineering Handbook

| Document control | |
|---|---|
| **Document ID** | AKW-EH-10 |
| **Document type** | Engineering Handbook / Developer Playbook — onboarding, learning path, coding standards, front-end architecture, change checklists, test strategy and test plan |
| **Version** | 1.1 |
| **Status** | Approved |
| **Classification** | Internal |
| **Owner** | Lead Engineer |
| **Approver** | Founder / CTO |
| **Effective date** | 2026-10-30 |
| **Review cycle** | Quarterly; standards section on every convention change |
| **Supersedes** | `archive/41-developer-onboarding.md`, `archive/44-akwadona-learning-path.md`, `archive/19-ui-architecture.md`, `archive/02-application-and-testing.md`, `archive/test-plan.md`, `archive/test-plan-v2.md` |
| **Related documents** | AKW-SAD-02 (architecture), AKW-FS-03 (behaviour), AKW-OPS-08 (deploy), the eight `../skills/` (machine-readable versions of §4) |

| Revision history | | | |
|---|---|---|---|
| **Version** | **Date** | **Author** | **Change** |
| 1.0 | 2026-10-30 | Platform team | Consolidated into the enterprise document set |
| 1.1 | 2026-10-31 | Platform team | Added "This document answers" and "Abbreviations used in this document" blocks after document control |

## This document answers

1. What do I install and read on day one, and what should I be able to do by day thirty?
2. How do I learn the whole system in six weeks, week by week?
3. How is the Angular front end structured — routes, guards, interceptors, state, offline?
4. What coding rules will a reviewer enforce on my pull request?
5. What is the checklist for adding a Lambda, a field, a tenant, or an index?
6. What is the test strategy, and what is the manual test plan I run before a release?
7. How do I build and test the application locally?

## Abbreviations used in this document

> **Why this table exists.** Every short form that appears anywhere in this document is listed here with (1) what the letters stand for and (2) what it means in plain words. If a term is not here and is not obvious, that is a documentation bug — add it. The complete glossary with examples and console links is AKW-SO-01 Appendix A.

| Abbreviation | Stands for | What it means |
|---|---|---|
| **ABO** | ABO blood group system | The A, B, AB, O blood types. |
| **ACL** | Access Control List | A list of who may access something. "Web ACL" is the WAF rule set. |
| **ACM** | AWS Certificate Manager | Issues and renews the certificates that make a site show the HTTPS padlock. Free. |
| **API** | Application Programming Interface | The set of URLs one program calls to use another program's features. Ours is a REST API. |
| **ARN** | Amazon Resource Name | The unique ID string of any AWS resource. |
| **AWS** | Amazon Web Services | Amazon's cloud-computing platform. Everything Akwadona runs on it. |
| **BAA** | Business Associate Agreement | A contract required by the US health-privacy law HIPAA between a hospital and any company (like Akwadona) that handles patient data for it. It says how the data will be protected. |
| **BP** | Blood Pressure | The pressure of blood in the arteries, written as two numbers. |
| **CCM** | Compliance Controls Matrix | A table that maps each rule in a law or standard to the specific thing we do to satisfy it, and the evidence an auditor can check. |
| **CDK** | Cloud Development Kit | AWS's tool for describing infrastructure in a programming language (we use TypeScript). It compiles to CloudFormation. |
| **CDN** | Content Delivery Network | A worldwide network of cache servers so a website loads from a city near the user. AWS CloudFront is ours. |
| **CFN** | CloudFormation | AWS's service that builds and updates infrastructure from a text template. One "stack" = one template; a stack may hold at most 500 resources. |
| **CLI** | Command-Line Interface | A text-based tool run from a terminal, e.g. the AWS CLI. |
| **CMK** | Customer Managed Key | A KMS encryption key that we create and control (as opposed to one AWS manages for us). |
| **CNAME** | Canonical Name record | A DNS record that says "this name is an alias of that name". |
| **CORS** | Cross-Origin Resource Sharing | The browser rule that decides which websites may call our API. We allow only our own domains. |
| **CRUD** | Create, Read, Update, Delete | The four basic data operations. |
| **CSS** | Cascading Style Sheets | The language that styles web pages. |
| **CTO** | Chief Technology Officer | The head of technology. |
| **DB** | Database | Where data is stored. |
| **DKIM** | DomainKeys Identified Mail | A cryptographic signature on outgoing e-mail proving it really came from the domain. |
| **DNS** | Domain Name System | The internet's phone book — turns akwadona.com into a server address. Ours is in Route 53; GoDaddy only holds the registration. |
| **DOB** | Date of Birth | The date a person was born. |
| **DR** | Disaster Recovery / Document Register | Disaster Recovery: how we restore the system after a major failure. Document Register (AKW-DR-00): the master index of this documentation set. |
| **EH** | Engineering Handbook | The document-type code for the engineering handbook (AKW-EH-10). |
| **FK** | Foreign Key | A field in one record that points to another record. |
| **FS** | Functional Specification | The document that describes what the system does — every feature, rule, and setting — without describing how it is built. |
| **GCC** | Gulf Cooperation Council | The six Gulf states: Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, Oman. |
| **GDPR** | General Data Protection Regulation | The European Union's privacy law (2018). It gives people rights over their data and sets duties on companies that process it. |
| **GSI** | Global Secondary Index | A second way to look up rows in a DynamoDB table, by a different attribute. We have nine. |
| **HIPAA** | Health Insurance Portability and Accountability Act | The US law that sets rules for protecting patients' health information. Its "Security Rule" lists the technical safeguards we must have. |
| **HMAC** | Hash-based Message Authentication Code | A fingerprint of a value computed with a secret key. Same value + same key = same fingerprint; different keys give different fingerprints. We use it to search encrypted fields. |
| **HR** | Human Resources | The department that manages staff. |
| **HTML** | Hypertext Markup Language | The language of web pages. |
| **HTTP** | Hypertext Transfer Protocol | The protocol the web uses to move pages and data. |
| **i18n** | internationalisation | Building software so it can show different languages (18 letters between i and n). |
| **IAM** | Identity and Access Management | AWS's permission system: which user or service may do which action on which resource. |
| **ICD** | Interface Control Document / International Classification of Diseases | ICD the document: the exact contract for how one system talks to another (our API). ICD the medical code: a worldwide numbering of diagnoses, e.g. ICD-10. |
| **IDOR** | Insecure Direct Object Reference | An attack where changing an ID in a request reveals someone else's record. Our 404-for-foreign-rows rule stops it. |
| **IRP** | Incident Response Plan | The step-by-step plan for what to do when something goes wrong — an outage or a suspected data breach. |
| **ISO** | International Organization for Standardization | The body that publishes international standards; ISO 27001 is the information-security one. |
| **JSON** | JavaScript Object Notation | The text format our API uses for data. |
| **JWT** | JSON Web Token | A signed digital ID card the browser sends with every request. It names the user, their hospital, and their role. |
| **KMS** | Key Management Service | AWS's vault for encryption keys. Keys never leave it; it encrypts and decrypts on request. |
| **LGL** | Legal | The document-type code for the legal agreement templates (AKW-LGL-07). |
| **LTS** | Long-Term Support | A software version that receives security fixes for several years. |
| **MFA** | Multi-Factor Authentication | Needing two proofs to sign in — a password plus a code from a phone app. |
| **OAuth** | Open Authorization | The standard underneath OIDC for granting an app limited access without sharing a password. |
| **OIDC** | OpenID Connect | A standard protocol for logging in via a central identity service. |
| **OPS** | Operations | Running the system day to day: deploying, monitoring, backing up, recovering. |
| **PDF** | Portable Document Format | A fixed-layout document file. |
| **PDPPL** | Personal Data Privacy Protection Law | Qatar's national privacy law (Law No. 13 of 2016). Qatar's equivalent of GDPR. |
| **PHI** | Protected Health Information | Any information that identifies a patient and relates to their health: name, ID number, diagnosis, medication, phone, date of birth. |
| **PK** | Partition Key | The main lookup key of a DynamoDB row — the "drawer". |
| **PR** | Pull Request | A proposed code change submitted for review before merging. |
| **PWA** | Progressive Web App | A web app that can be installed like a phone app and work offline. |
| **QID** | Qatari ID | The national identity number of a Qatar resident (11 digits). |
| **REST** | Representational State Transfer | A style of API built on standard web verbs (GET, POST, PATCH, DELETE) and resource URLs. |
| **Rh** | Rhesus factor | The + or − part of a blood type. |
| **RR** | Risk Register | A list of every known risk with a score, an owner, and a plan. |
| **RTL** | Right-to-Left | Text direction for Arabic, Hebrew, Urdu. Our layout flips for these languages. |
| **S3** | Simple Storage Service | AWS file storage — a bucket holds files of any size. |
| **SAD** | Solution Architecture Document | The master technical design document: how the whole system is built, from infrastructure to data to security. |
| **SEP** | Sales Enablement Playbook | The document that gives sales staff the approved facts, answers, and scripts. |
| **SES** | Simple Email Service | AWS's service for sending e-mail. |
| **SK** | Sort Key | The second part of a DynamoDB key — the "folder inside the drawer". |
| **SO** | Solution Overview | The executive summary of the platform in plain language. |
| **SOAP** | Subjective, Objective, Assessment, Plan | The standard four-part structure of a clinical note: what the patient says, what the doctor observes, the diagnosis, and the treatment plan. |
| **SPA** | Single-Page Application | A web app that loads once and then updates the page without full reloads. Ours is built with Angular. |
| **SSP** | System Security Plan | The document that lists every security control the system has, how it is implemented, and its status. A NIST-defined document type. |
| **TOTP** | Time-based One-Time Password | The six-digit code from an authenticator app that changes every 30 seconds. |
| **TTL** | Time To Live | A "delete me after this time" marker on a database row. DynamoDB removes expired rows for free. |
| **UI** | User Interface | The screens a person uses. |
| **URL** | Uniform Resource Locator | A web address. |
| **UX** | User Experience | How it feels to use the system. |
| **WAF** | Web Application Firewall | A filter in front of a website that blocks known-bad traffic. Ours is defined but currently switched off. |
| **XSS** | Cross-Site Scripting | An attack that injects a malicious script into a web page. |

**How this handbook is organised.** §1 gets you running on day one. §2 is the six-week learning path. §3 is the front-end architecture. §4 is the coding standard (the rules reviewers enforce). §5 is the change checklist per kind of change. §6 is the test strategy and the manual test plan. §7 is the application build/test harness reference.

---

## 1. Onboarding — Day 1 to Day 30

### 3. Day 1 — environment setup

#### 3.1 Prerequisites
Install on Windows 11 (project primary platform):
- [Node.js 20 LTS](https://nodejs.org) — confirm with `node -v`.
- Angular CLI: `npm install -g @angular/cli@20`.
- AWS CLI v2: `winget install Amazon.AWSCLI` or [installer](https://awscli.amazonaws.com/AWSCLIV2.msi). Confirm with `aws --version`.
- PowerShell 7 (built into Windows 11 Terminal).
- Git for Windows.
- Visual Studio Code + Angular Language Service extension.

#### 3.2 Clone + install
```powershell
cd "C:\Users\<you>\Desktop\aws apps"
git clone <repo-url> hospital
cd hospital
npm install                 # frontend deps
cd akwadona-cdk; npm install; cd ..   # CDK deps
```

#### 3.3 Must-read docs (in order)
1. [`AKW-SO-01-Solution-Overview.md`](AKW-SO-01-Solution-Overview.md) — platform overview.
2. [`AKW-SAD-02-Solution-Architecture-Document.md`](AKW-SAD-02-Solution-Architecture-Document.md) — the AWS shape.
3. [`AKW-EH-10-Engineering-Handbook.md`](AKW-EH-10-Engineering-Handbook.md) — the frontend shape.
4. [`AKW-SSP-05-System-Security-Plan.md`](AKW-SSP-05-System-Security-Plan.md) — the key compliance claim.
5. [`AKW-SSP-05-System-Security-Plan.md`](AKW-SSP-05-System-Security-Plan.md) — the key correctness claim.

#### 3.4 Verify AWS access
Ask the Security Officer for:
- An IAM user in the Akwadona AWS account (`483176634665`).
- Read-only access to start (`arn:aws:iam::aws:policy/ReadOnlyAccess`). Elevate later.

Set up a profile:
```powershell
aws configure --profile akwadona-dev
## AWS Access Key ID, Secret, Default region us-east-1, Default output json
aws sts get-caller-identity --profile akwadona-dev
```

#### 3.5 Run the app locally
```powershell
ng serve
```
Opens on `http://localhost:4200`. Sign in with a Cognito test user if provisioned (ask Security Officer). The app connects to the live dev API by default — don't create real data; use the `AKW-EH-10-Engineering-Handbook.md` test accounts.

#### 3.6 First commit
Pick a one-line doc typo. Fix it. Commit, push, open a PR.
```powershell
git checkout -b yourname/doc-typo
## Edit the typo.
git add docs/<file>.md
git commit -m "docs: fix typo in <file>"
git push -u origin yourname/doc-typo
```

### 4. Day 2–7 — understanding the architecture

#### 4.1 Read these in week 1
In order:
- [`AKW-ICD-04-Interface-Control-Document.md`](AKW-ICD-04-Interface-Control-Document.md)
- [`AKW-SAD-02-Solution-Architecture-Document.md`](AKW-SAD-02-Solution-Architecture-Document.md)
- [`AKW-SSP-05-System-Security-Plan.md`](AKW-SSP-05-System-Security-Plan.md)
- [`AKW-FS-03-Functional-Specification.md`](AKW-FS-03-Functional-Specification.md)
- [`AKW-SAD-02-Solution-Architecture-Document.md`](AKW-SAD-02-Solution-Architecture-Document.md)
- [`AKW-FS-03-Functional-Specification.md`](AKW-FS-03-Functional-Specification.md)
- [`AKW-FS-03-Functional-Specification.md`](AKW-FS-03-Functional-Specification.md)
- [`AKW-OPS-08-Operations-Runbook.md`](AKW-OPS-08-Operations-Runbook.md)
- [`AKW-OPS-08-Operations-Runbook.md`](AKW-OPS-08-Operations-Runbook.md)
- [`AKW-IRP-09-Incident-Response-Plan.md`](AKW-IRP-09-Incident-Response-Plan.md)
- `../skills/*/SKILL.md` (all eight)

#### 4.2 Run the test plan
Walk through [`AKW-EH-10-Engineering-Handbook.md`](AKW-EH-10-Engineering-Handbook.md) end-to-end. You'll:
- Create doctors and patients.
- Make an appointment, consultation, prescription, dispense.
- Observe allergy guardrail, operator read-only view; run `node scripts/cross-tenant-probe.js` and `node scripts/security-tests/run-safe.js` yourself (neither is scheduled yet).

Don't skip. Half the "weird gotchas" in this codebase are things you'll only see by walking the flow.

#### 4.3 Trace one request end-to-end
Pick POST `/patients`. Trace it:
1. Browser → `patients.service.ts` → `Config.buildUrl('patients')`.
2. HTTP request → `offlineQueueInterceptor` → `authInterceptor` → network.
3. CloudFront → API Gateway JWT authorizer → Cognito-signed JWT verified.
4. `akwadona-create-patient` Lambda handler.
5. Lambda extracts `tenantId` from claims, encrypts PHI, computes HMAC hashes.
6. `TransactWriteCommand` writes: patient profile + unique-lock rows (QID, phone).
7. Audit row written.
8. Response → interceptors → component → UI.

If you can't explain each hop, re-read the referenced doc.

### 5. Day 8–30 — making real changes

#### 5.1 First real change
Pick a backlog item from [`AKW-RR-12-Risk-and-Debt-Register.md`](AKW-RR-12-Risk-and-Debt-Register.md) that touches ONE Lambda. Pair with the owner. Before writing code, invoke:
- `akwadona-security-review` skill — pre-flight checklist.
- `akwadona-code-standards` skill — pattern you'll follow.
- `akwadona-doc-writer` skill — doc you'll update.

#### 5.2 PR template (what reviewers expect)
```markdown
### What
<one-paragraph description>

### Why
<forcing function>

### How
<approach, trade-offs>

### Test
- [ ] Manual test from `AKW-EH-10-Engineering-Handbook.md` step X
- [ ] `scripts/cross-tenant-probe.js` → exit 0
- [ ] CloudWatch logs show tenant-scoped behavior

### Doc
<which docs/*.md updated>

### Security surface
<skill: akwadona-security-review verdict summary>
```

#### 5.3 Deploy to dev
Follow [`AKW-OPS-08-Operations-Runbook.md`](AKW-OPS-08-Operations-Runbook.md) step by step. Shadow a senior engineer on your first real deploy.

### 6. Day 30 — reaching autonomy

By end of month 1, you can:
- Design a small feature using the `akwadona-solution-architect` skill format.
- Run an incident drill using the `akwadona-incident-response` skill.
- Add a new tenant through the operator wizard end-to-end.
- Give a 10-minute walkthrough of the zero-knowledge claim to a non-technical reviewer.

### 7. Common new-engineer mistakes (don't take them personally)

| Mistake | Correction |
|---|---|
| "I'll just scan the DynamoDB table to find patients" | Query the `tenant-entityType-index` with `PK = tenantId`. |
| Returning 403 for an other-tenant resource | Return 404. Don't leak existence. |
| `require('../_shared/compliance')` | Inline the helper. CDK packages one folder. |
| Hardcoding tenant slug or ARN | Read from the TENANT profile row via `crypto.js`. |
| Logging the JWT or Authorization header | Never. Log actor email + tenantId + action only. |
| Running `.\deploy.ps1` without updating the IDs | They're stale. Use [`AKW-OPS-08-Operations-Runbook.md`](AKW-OPS-08-Operations-Runbook.md). |
| Filtering or sorting on `name` / `dob` / `email` inside a DynamoDB FilterExpression | Those fields are ciphertext. Filter after `decryptItems()`; see `getAllPatients/index.js` header. |
| Writing `ttl` for expiry | The TTL attribute is `expiresAt`. |
| `grantReadWriteData` on a Lambda that only reads | Use `grantReadData` + the scoped `THROTTLE#*` UpdateItem (see the CDK `readOnlyFunctions` block). |
| Testing with real-looking PHI | Use `AKW-OPS-08-Operations-Runbook.md` values. |
| Committing `function.zip`, `node_modules/`, `dist/`, or `.angular/` | They're in `.gitignore`. If they appear in `git status`, something's wrong. |

### 8. Getting help

- `akwadona-code-standards` + `akwadona-security-review` skills — before asking a human.
- `AKW-DR-00` navigator.
- `AKW-RR-12-Risk-and-Debt-Register.md` + git log — what's happening right now.
- A senior engineer — on specific trade-offs.

### 9. Security onboarding (one-time, before first PHI-touching commit)

- Read HIPAA Privacy Rule overview (external).
- Sign the project's internal confidentiality agreement.
- Complete the BAA training (per [`AKW-LGL-07-Legal-Agreement-Templates.md`](AKW-LGL-07-Legal-Agreement-Templates.md)) — Security Officer walks you through.
- Enable MFA on your AWS console + GitHub account.
- Verify your workstation is encrypted at rest (BitLocker on Windows).


---

## 2. Learning path — six weeks, read / look / draw / self-check

### 0. How to use this path

Six weeks, five sessions per week, 30–60 minutes each session.

Each session has the same shape:
1. **Read** — the exact docs and files to read, in order.
2. **Look** — the exact places to click in the AWS console or the repo (read-only; do not change anything).
3. **Draw** — a picture to sketch on paper. Drawing by hand forces understanding.
4. **Self-check** — two or three questions. If you cannot answer, re-read.

**Do not skip ahead** — later weeks assume earlier concepts. **Do not take notes in the code** — take notes in a notebook or a scratch markdown file, not in the real files.

Everything in this path is **read-only**. We are learning, not changing. If you spot a bug, write it in `AKW-RR-12-Risk-and-Debt-Register.md` and keep walking.

---

### Week 1 — The big picture (what, why, who)

**Goal:** by the end of this week, you can explain Akwadona in two minutes to a non-engineer.

#### Day 1 — What is Akwadona
- **Read:** [`AKW-SO-01-Solution-Overview.md`](AKW-SO-01-Solution-Overview.md).
- **Look:** open `https://www.akwadona.com` in a browser; sign in as a test user; click around the landing dashboard.
- **Draw:** one circle "Akwadona" with three arrows out of it labelled "hospital", "doctor", "patient". Add a word next to each arrow for the main thing each gets.
- **Self-check:**
  - Who pays Akwadona?
  - Who logs in?
  - What is the one thing Akwadona does that paper could not?

#### Day 2 — Why multi-tenant
- **Read:** [`AKW-SAD-02-Solution-Architecture-Document.md`](AKW-SAD-02-Solution-Architecture-Document.md).
- **Look:** sign in to `https://tiryaq.akwadona.com` then to `https://alshifaa.akwadona.com`. Note the different logos; note the different users; note that the URL path pattern is identical.
- **Draw:** a block of flats — one building, many flats. Label the plumbing (shared), the front door (shared), each flat's lock (one per flat), and each flat's safe (one per flat).
- **Self-check:**
  - What is shared between tenants?
  - What is not shared?
  - Why not just one database per hospital?

#### Day 3 — What zero-knowledge means
- **Read:** [`AKW-SSP-05-System-Security-Plan.md`](AKW-SSP-05-System-Security-Plan.md). Read it twice.
- **Look:** in the AWS console, go to KMS → Customer managed keys → filter by `alias/akwadona-tenant-`. Count how many keys there are. Click one; look at the "Key policy" tab and read it.
- **Draw:** a courier carrying a locked box. The courier is Akwadona. The box is the patient data. The key is in the hospital's safe. The courier can carry, store, move the box — but cannot open it.
- **Self-check:**
  - What does "zero-knowledge" promise?
  - What enforces it structurally (two things)?
  - If an engineer at Akwadona wanted to read a patient's name, what would they have to do, and why would it fail?

#### Day 4 — The AWS services at a glance
- **Read:** [`AKW-SAD-02-Solution-Architecture-Document.md`](AKW-SAD-02-Solution-Architecture-Document.md) sections 0, 1, 2, 3, 6. Just those for today.
- **Look:** in the AWS console, open each of Cognito, KMS, CloudFront, IAM in a tab. Just look at the main page; do not click anything that changes.
- **Draw:** a simple architecture doodle. In the middle: "AkwadonaCdkStack". Four arrows out of it to boxes labelled "Cognito (user register)", "KMS (safes)", "CloudFront (CDN)", "IAM (badges)".
- **Self-check:**
  - What does Cognito store?
  - What is in a JWT (JSON Web Token)?
  - Why does CloudFront make the site faster?

#### Day 5 — The business shape
- **Read:** [`AKW-SEP-13-Sales-Enablement-Playbook.md`](AKW-SEP-13-Sales-Enablement-Playbook.md). Pay attention to §3 (who we sell to) and §4 (ten differentiators).
- **Look:** open the live operator console at `https://www.akwadona.com/operator`. Note how little information is shown. Count the tabs.
- **Draw:** a two-column list. Left: the ten differentiators. Right: for each one, write "proof: <file>" using the proof column of the sales doc.
- **Self-check:**
  - Why would a Qatari hospital pick us over Epic?
  - Which three of the ten differentiators are structural and cannot be copied in six months?
  - Which two are table-stakes that any competitor can match?

**End of Week 1 reward:** write a two-paragraph email to an imaginary potential customer explaining what Akwadona is. Keep it under 200 words. If you cannot do it without jargon, re-read Day 1.

---

### Week 2 — The AWS infrastructure

**Goal:** by the end of this week, you can draw every AWS box in Akwadona and the arrows between them.

#### Day 1 — The front door (CloudFront + ACM + WAF)
- **Read:** [`AKW-SAD-02-Solution-Architecture-Document.md`](AKW-SAD-02-Solution-Architecture-Document.md) §3, §4, §5.
- **Look:** in the AWS console, go to CloudFront → `E1YOKWKHQNSPQW`. Click "Behaviors". Count how many. Click "Origins". Note which S3 bucket is the origin. Click "General" — note that **no WAF (Web Application Firewall) web ACL is attached** (it is disabled to save cost; see `AKW-SAD-02-Solution-Architecture-Document.md` §5 banner). Then open API Gateway → `akwadona-api` → Stages → `$default` → "Default route throttling" to see the 200 r/s / 500 burst limit that stands in for it.
- **Draw:** a visitor's laptop on the left. An arrow to a box "CloudFront". Inside the box write "cached static files". Arrows from CloudFront to two boxes: "S3 bucket (origin)" and "API Gateway (origin)". Above CloudFront write "WAF filters here".
- **Self-check:**
  - What does CloudFront serve from S3?
  - What does CloudFront serve from API Gateway?
  - What does WAF block before it reaches us?

#### Day 2 — The user register (Cognito)
- **Read:** [`AKW-SAD-02-Solution-Architecture-Document.md`](AKW-SAD-02-Solution-Architecture-Document.md) §1. Then [`akwadona-cdk/lambda/akwadona-pretoken/index.js`](../akwadona-cdk/lambda/akwadona-pretoken/index.js) — read the whole file.
- **Look:** AWS console → Cognito → `us-east-1_YibFfEdDD`. Look at "Users" (count them). Look at "Groups" (count them, note the names). Look at "App integration" → "App clients" (note the IDs). Look at "Sign-in" → "Pre token generation" (note which Lambda is attached).
- **Draw:** a sign-in flow: browser → Cognito (checks password) → Pre-token Lambda (adds tenantId + role) → browser gets JWT.
- **Self-check:**
  - What claims are in a JWT after login?
  - What does the Pre-token Lambda add that Cognito does not add by itself?
  - What happens if the Pre-token Lambda is slow (above 5 seconds)?

#### Day 3 — The vault (KMS)
- **Read:** [`AKW-SSP-05-System-Security-Plan.md`](AKW-SSP-05-System-Security-Plan.md) again. [`AKW-SSP-05-System-Security-Plan.md`](AKW-SSP-05-System-Security-Plan.md).
- **Look:** AWS console → KMS → Customer managed keys. Count the `akwadona-tenant-*` keys. For one tenant, note there is a data key AND an HMAC (Hash-based Message Authentication Code) key. Click the data key; "Key policy"; find the operator deny line.
- **Draw:** two safes next to each hospital name. Label one "data CMK (Customer Managed Key) — unlocks patient fields", label the other "HMAC CMK — computes fingerprints for search". Add a red "X" through the operator's badge for the data CMK.
- **Self-check:**
  - Why does each tenant have TWO keys and not one?
  - What is a fingerprint for, and why don't we store the plain Qatari ID?
  - Why is the operator's "deny" in IAM policy enough to make zero-knowledge true?

#### Day 4 — The badges (IAM) + the camera (CloudTrail)
- **Read:** [`AKW-SAD-02-Solution-Architecture-Document.md`](AKW-SAD-02-Solution-Architecture-Document.md) §6 and §8.
- **Look:** AWS console → IAM → Roles → filter `akwadona-`. Count. Pick one Lambda role. Read its "Permissions" tab. Then IAM → Roles → `akwadona-operator-*` → read the "Deny statements". Then CloudTrail → Event history → filter EventName = `Decrypt` for the last 24 hours. Note what you see.
- **Draw:** three visitor badges. Label one "doctor Lambda — can read patient rows for its tenantId". One "operator Lambda — can read everything except tenant CMKs". One "deploy user — can create resources but not read patient data".
- **Self-check:**
  - What is the difference between an IAM policy that is "allow" vs one that is "deny"?
  - Which beats which?
  - What would CloudTrail show if someone had bypassed the operator deny?

#### Day 5 — Everything else at the perimeter (ACM, SES, EventBridge, Bedrock)
- **Read:** [`AKW-SAD-02-Solution-Architecture-Document.md`](AKW-SAD-02-Solution-Architecture-Document.md) §4, §9, §10, §11.
- **Look:**
  - ACM: AWS console → Certificate Manager (us-east-1) → list the certificates. Confirm `*.akwadona.com` wildcard exists.
  - SES: AWS console → SES → Verified identities → confirm `akwadona.com` has DKIM status "SUCCESS".
  - EventBridge: AWS console → EventBridge → Rules → list. Note the cron rules.
  - Bedrock: AWS console → Bedrock → Model access → confirm Claude Haiku 4.5 is enabled.
- **Draw:** take your Day 1 doodle. Add ACM (padlock on CloudFront), SES (envelope out of Cognito), EventBridge (clock pointing at a scheduled Lambda), Bedrock (brain in a cloud, called by scribe Lambda).
- **Self-check:**
  - If ACM expired, what would happen to the site?
  - If SES's DKIM broke, what would happen to password-reset emails?
  - Why is the Bedrock model ID prefixed with `us.`?

**End of Week 2 reward:** draw ONE architecture diagram on a single sheet of paper that includes every AWS service we use. If you have to flip the paper over, it's too detailed — simplify.

---

### Week 3 — The database (DynamoDB)

**Goal:** by the end of this week, you can look at any DynamoDB row and say which entity it is, which tenant it belongs to, and which GSI (Global Secondary Index) retrieves it.

#### Day 1 — Why single-table
- **Read:** [`AKW-ICD-04-Interface-Control-Document.md`](AKW-ICD-04-Interface-Control-Document.md) sections 1 and 2. Also AKW-SAD-02 §5.1.
- **Look:** AWS console → DynamoDB → Tables → `Hospital` → Items. Scroll through 20–30 rows. Note the mix of EntityTypes.
- **Draw:** a filing cabinet with coloured labels. Label each colour an EntityType ("PATIENT", "DOCTOR", "APPOINTMENT", "AUDIT", ...). Add a note on each: "all under one cabinet, filtered by colour".
- **Self-check:**
  - What is the partition key (PK)?
  - What is the sort key (SK)?
  - What is the EntityType attribute for?

#### Day 2 — The GSIs (Global Secondary Indexes)
- **Read:** AKW-SAD-02 §5.1.3 — the nine GSIs.
- **Look:** AWS console → DynamoDB → Hospital → Indexes. Count them. Click one and read its "Partition key / Sort key".
- **Draw:** for each GSI, a line: "<GSI name>: PK=<x>, SK=<y>, used when: <query shape>". Nine lines total.
- **Self-check:**
  - What is the difference between `tenant-entityType-index` and `dataClass-index`?
  - Which GSI answers "all patients for tenant T"?
  - Why does `updatedAt: null` on a new row break `dataClass-index`?

#### Day 3 — Encrypted fields vs hashed fields
- **Read:** [`AKW-SSP-05-System-Security-Plan.md`](AKW-SSP-05-System-Security-Plan.md). Then [`akwadona-cdk/lambda/akwadona-create-patient/index.js`](../akwadona-cdk/lambda/akwadona-create-patient/index.js) — in full. It is the canonical PHI-write example.
- **Look:** AWS console → DynamoDB → Items → pick one PATIENT row. Note which fields are long base64-looking strings (encrypted) and which are hex strings (hashes).
- **Draw:** a PATIENT row with 10 attributes. For each one, label it "plaintext", "encrypted", or "hashed". Think about why each choice was made.
- **Self-check:**
  - What goes in `qid` vs `qidHash`?
  - What goes in `name` vs `nameHash` (if it exists)?
  - Why is `createdAt` plaintext?

#### Day 4 — The unique-lock pattern
- **Read:** `akwadona-create-patient/index.js` again, this time focus on the `TransactWriteCommand` block.
- **Look:** in a PATIENT create, two or three rows are written atomically. Pick a QID in DynamoDB and search for `QID_LOCK#<its-hash>`. Note that the lock row shares the hash.
- **Draw:** a transaction write: `PATIENT#<uuid>` + `QID_LOCK#<qidHash>` + `PHONE_LOCK#<phoneHash>` — all three succeed or all three fail.
- **Self-check:**
  - What goes wrong if two doctors create a patient with the same QID at the same moment, without the lock row?
  - Why do we store the lock row with the HASH, not the raw QID?
  - Which error code does Dynamo return if the lock is already held?

#### Day 5 — The audit trail inside the table
- **Read:** search `grep -r "EntityType.*AUDIT" akwadona-cdk/lambda/` — list every Lambda that writes AUDIT rows.
- **Look:** AWS console → DynamoDB → scan with filter `EntityType = AUDIT` → look at 10 recent rows. Note what fields appear.
- **Draw:** a timeline: a doctor's shift from 8am to 5pm, with little marks for every AUDIT row generated. Label each mark with the action (CREATE_PATIENT, UPDATE_PRESCRIPTION, VIEW_PATIENT, ...).
- **Self-check:**
  - Which actions MUST produce an audit row?
  - Which fields are always in an audit row?
  - How long are audit rows kept in Dynamo vs CloudTrail?

**End of Week 3 reward:** pick one patient row and trace it: how was it inserted, what GSIs will find it, which fields are encrypted, which Lambda deletes it, how is the deletion logged.

---

### Week 4 — The backend code (Lambda)

**Goal:** by the end of this week, you can trace any API request end-to-end and read any Lambda in under 10 minutes.

#### Day 1 — The shape of every Lambda
- **Read:** `../skills/akwadona-code-standards/SKILL.md` — the whole skill, especially §3 (handler skeleton).
- **Look:** `akwadona-cdk/lambda/akwadona-create-patient/index.js` — the top 60 lines. Then `akwadona-cdk/lambda/akwadona-list-patients/index.js` — the top 60 lines. Compare them.
- **Draw:** the lifecycle of one Lambda invocation: event in → extract claims → validate → do work (DynamoDB / KMS / SES) → write audit → return response.
- **Self-check:**
  - What's inlined vs required from a shared folder, and why?
  - Where does the Lambda get `tenantId` from — the request body, or the JWT?
  - Why that choice?

#### Day 2 — The Lambda factory
- **Read:** `akwadona-cdk/lib/akwadona-cdk-stack.ts` — find the `createLambda(...)` helper function. Read it in full.
- **Look:** count the uses of `createLambda` in the stack. Note the arguments passed each time. Note how memory size and timeout differ.
- **Draw:** a factory conveyor belt. In goes `name + path + env`. Out comes `{Lambda function, IAM role, log group, API Gateway integration}`.
- **Self-check:**
  - What's the default memory size and timeout?
  - When do we override them?
  - What stops us creating 500 Lambdas (hint: CFN resource ceiling)?

#### Day 3 — The 42 Lambdas, grouped
- **Read:** AKW-SAD-02 Appendix B — the full Lambda inventory.
- **Look:** `ls akwadona-cdk/lambda/` — count the folders. For each one, open the `index.js` and read the first 20 lines (the comment header + the `rawPath` dispatch, if any).
- **Draw:** a table with columns: group (Patients / Doctors / Payments / Pharmacy / Blood Bank / Admin / Operator / Scribe / Audit / Other), Lambdas in that group, main entities touched.
- **Self-check:**
  - Which Lambdas are "catch-all" (one Lambda handling many routes via rawPath)?
  - Which ones are single-route?
  - Why do we mix the two patterns?

#### Day 4 — One end-to-end trace
- **Read:** [`AKW-EH-10-Engineering-Handbook.md`](AKW-EH-10-Engineering-Handbook.md) §4.3 — the end-to-end trace of `POST /patients`.
- **Look:** open the browser dev tools on `www.akwadona.com`. Create a test patient. Watch the Network tab. Note the request URL, the headers, the response.
- **Draw:** a swimlane: browser → interceptors → CloudFront → API Gateway (JWT check) → Lambda → KMS (encrypt) → DynamoDB (transact write) → back out. Add timing (approximately): CloudFront ~1ms, API Gateway ~5ms, Lambda cold start ~400ms warm ~20ms, KMS ~15ms, Dynamo transact ~15ms.
- **Self-check:**
  - What is the slowest step?
  - If the Lambda cold-starts, where does the latency go?
  - What breaks the trace if the JWT is expired?

#### Day 5 — The known foot-guns
- **Read:** `../skills/akwadona-security-review/SKILL.md` and `../skills/akwadona-code-standards/SKILL.md` — look specifically at the "known landmines" sections.
- **Look:** `grep -n "updatedAt: null" akwadona-cdk/lambda/` — do any files have this? If yes, that's a bug — add to `AKW-RR-12-Risk-and-Debt-Register.md` with a note.
- **Draw:** a "wall of shame" list: `updatedAt: null`, `require('../_shared/...')`, missing tenantId filter, wildcard CORS, cross-tenant 403 instead of 404.
- **Self-check:**
  - Why does `updatedAt: null` break the `dataClass-index` GSI?
  - What is wrong with `require('../_shared/compliance')` in a Lambda?
  - If a user asks for another tenant's resource, do we return 403 or 404? Why?

**End of Week 4 reward:** pick ONE Lambda (not create-patient) and rewrite its comment header to match the easy-English skill. Do NOT change behaviour. Open a tiny PR.

---

### Week 5 — The frontend code (Angular)

**Goal:** by the end of this week, you can navigate the Angular app, know where every page lives, and read any service file in under 5 minutes.

#### Day 1 — The Angular shape
- **Read:** [`AKW-EH-10-Engineering-Handbook.md`](AKW-EH-10-Engineering-Handbook.md) sections 1–4.
- **Look:** `src/app/` tree. `ls src/app/components/`. `ls src/app/services/`. Note the folder-per-feature pattern.
- **Draw:** the folder tree, one level deep, with a one-word description beside each folder.
- **Self-check:**
  - What is a "standalone component" in Angular 20?
  - What does the Angular signal API replace from older Angular?
  - What is PrimeNG vs Tailwind — which does what?

#### Day 2 — Routing + guards
- **Read:** [`AKW-EH-10-Engineering-Handbook.md`](AKW-EH-10-Engineering-Handbook.md) §3 and §5.
- **Look:** `src/app/app.routes.ts`. Trace a path: a user clicks "Patients" → which route → which component → which guard runs.
- **Draw:** the route tree with role-set labels on each node (`admin`, `doctor`, `nurse`, `pharmacist`, `operator`).
- **Self-check:**
  - What is the difference between an AuthGuard and a RoleGuard?
  - Why do we need both?
  - What happens if a user with wrong role tries to visit a protected route?

#### Day 3 — Interceptors and services
- **Read:** [`AKW-EH-10-Engineering-Handbook.md`](AKW-EH-10-Engineering-Handbook.md) §6 and §7. Also `src/app/services/auth.service.ts` and `src/app/services/patient.service.ts`.
- **Look:** `src/app/interceptors/`. Open each interceptor and read it. Note the order they run in.
- **Draw:** the HTTP request pipeline: component → service → offline queue interceptor → auth interceptor → error interceptor → network.
- **Self-check:**
  - What does the offline queue interceptor do when the network is down?
  - What does the auth interceptor add to every request?
  - What does the error interceptor do with a 401 response?

#### Day 4 — State, signals, and change detection
- **Read:** [`AKW-EH-10-Engineering-Handbook.md`](AKW-EH-10-Engineering-Handbook.md) §8. Then look at `src/app/services/tenant.service.ts` — it uses signals.
- **Look:** `src/app/components/dashboard/dashboard.component.ts` — look for `signal(...)` and `computed(...)`. Note how templates read signals with `()`.
- **Draw:** a signal graph: `rawPatients` (signal) → `filteredPatients` (computed) → `template rendering`.
- **Self-check:**
  - Why do we prefer signals over observables for component state?
  - What triggers change detection in a signal-based component?
  - What is `ChangeDetectionStrategy.OnPush`, and when should every new component use it?

#### Day 5 — PWA, offline, i18n
- **Read:** [`AKW-EH-10-Engineering-Handbook.md`](AKW-EH-10-Engineering-Handbook.md) §9, §10. [`AKW-FS-03-Functional-Specification.md`](AKW-FS-03-Functional-Specification.md).
- **Look:** DevTools → Application → Service Workers (should show `ngsw-worker.js` active). Application → IndexedDB → check for the offline queue store. Then switch languages in the app and note the RTL (Right-to-Left) layout for Arabic.
- **Draw:** the offline write flow: user types → component writes to local IndexedDB queue → service worker intercepts → when online, drains queue to backend → success / retry.
- **Self-check:**
  - What happens to a POST while offline?
  - Which actions are safe to queue, and which are not?
  - How does the i18n service switch languages — compile-time or runtime?

**End of Week 5 reward:** take any component, read it top to bottom, and write a one-paragraph summary in a notebook.

---

### Week 6 — Operations (deploy, monitor, incident)

**Goal:** by the end of this week, you can deploy, monitor, and recover from an incident on your own.

#### Day 1 — The deploy flow
- **Read:** [`AKW-OPS-08-Operations-Runbook.md`](AKW-OPS-08-Operations-Runbook.md) in full. Also `../skills/akwadona-deploy-safety/SKILL.md`.
- **Look:** `scripts/` — list every `.ps1` file. Open `scripts/deploy-frontend.ps1` and read it. Then open `scripts/deploy-lambda.ps1`. Note the pre-flight checks.
- **Draw:** three parallel ladders: "frontend-only", "Lambda-only", "backend (CDK)". For each, write the exact commands in order.
- **Self-check:**
  - What is the two-phase alias deploy, and when is it needed?
  - What happens if you run `aws s3 sync` without KMS Encrypt in IAM?
  - What happens if you forget to invalidate CloudFront after a frontend deploy?

#### Day 2 — CloudWatch monitoring
- **Read:** [`AKW-OPS-08-Operations-Runbook.md`](AKW-OPS-08-Operations-Runbook.md) in full.
- **Look:** AWS console → CloudWatch → Alarms → list all. Read what each one triggers on. Then CloudWatch → Logs Insights → run the query `fields @timestamp, @message | filter @message like /ERROR/ | limit 20`.
- **Draw:** a dashboard sketch: 6 widgets you'd put on the wall if you were monitoring Akwadona (invocations, errors, p99 latency, DynamoDB throttles, 5xx rate, auth failures).
- **Self-check:**
  - Which three alarms would wake someone at 3am?
  - Which three alarms are "look at tomorrow"?
  - What is a "custom metric" and when do we add one?

#### Day 3 — Incident response drill
- **Read:** [`AKW-IRP-09-Incident-Response-Plan.md`](AKW-IRP-09-Incident-Response-Plan.md). Also `../skills/akwadona-incident-response/SKILL.md`.
- **Look:** run `node scripts/cross-tenant-probe.js` locally. Note what it checks. Then look at the latest audit S3 object: `aws s3 ls s3://akwadona-audit-logs/ --recursive | tail -3`.
- **Draw:** a decision tree for a 3am page: "symptom → severity → first action → next action". Make three branches: "all tenants down", "one tenant down", "possible PHI exposure".
- **Self-check:**
  - What is the regulatory clock for a PDPPL breach notification?
  - For HIPAA?
  - For GDPR?

#### Day 4 — Rollback and recovery
- **Read:** [`AKW-OPS-08-Operations-Runbook.md`](AKW-OPS-08-Operations-Runbook.md) §7 (rollback). [`AKW-OPS-08-Operations-Runbook.md`](AKW-OPS-08-Operations-Runbook.md).
- **Look:** `scripts/recover.ps1` and `scripts/teardown.ps1`. Read them. Note the ID placeholders.
- **Draw:** a rollback flow for the three deploy types from Week 6 Day 1. Add: how long does each take; what does the user see during the rollback.
- **Self-check:**
  - If a frontend deploy breaks login, what is the fastest rollback?
  - If a CDK stack update is in progress and fails halfway, what does CloudFormation do automatically?
  - What is the one post-teardown mistake you must avoid?

#### Day 5 — The whole system, one more time
- **Read:** go back to [`AKW-SO-01-Solution-Overview.md`](AKW-SO-01-Solution-Overview.md). Read it again, slowly.
- **Look:** sign in as every role (admin, doctor, nurse, pharmacist, operator) and click through the main workflow for each.
- **Draw:** your final one-page architecture. Compare with the diagram you drew at the end of Week 2 — note what you'd add now.
- **Self-check:**
  - What would you change about the architecture if you were starting over?
  - What is the single biggest technical risk right now?
  - What is the single biggest business risk right now?

**End of Week 6 reward:** write a one-page document called "Akwadona in 2026-10 — what it is and where it's going". Save it outside the repository (it is personal, not a controlled document) and keep editing it as you learn more.

---


---

## 3. Front-end architecture (Angular)

### 3. Technology stack

| Layer | Choice | File / version |
|---|---|---|
| Framework | Angular 20 (standalone components, signals, `@if`/`@for`) | `package.json` → `@angular/core@^20` |
| UI kit | PrimeNG 20 + Tailwind CSS v4 (via PostCSS) | `tailwind.config.js`, `src/assets/styles.scss` |
| Theme | PrimeUIX Aura preset | `src/app.config.ts` → `providePrimeNG` |
| Icons | PrimeIcons | `src/assets/styles.scss` |
| Charts | Chart.js | `package.json` |
| Calendar | FullCalendar 6 (daygrid + timegrid + interaction) | `src/app/components/hospital-calendar/` |
| Rich text | Quill 2 | `package.json` |
| Spreadsheet export | SheetJS (xlsx) | `package.json` |
| Auth | angular-auth-oidc-client v19 | `src/app.config.ts` → `provideAuth` |
| i18n | ngx-translate v16+ | `src/app.config.ts` → `TranslateModule.forRoot` |
| PWA | Angular Service Worker (`ngsw-worker.js`) | `src/app.config.ts` → `provideServiceWorker` + `ngsw-config.json` |

### 4. Routing (`src/app.routes.ts`)

All authenticated routes are children of `AppLayout` under `canActivate: [authGuard]`.

#### 4.1 Role sets
```ts
const PATIENTS_ROLES  = ['admin', 'developer', 'doctor'];
const ADMIN_ROLES     = ['admin', 'developer'];
const PHARMACY_ROLES  = ['pharmacist'];
const SCRIBE_ROLES    = ['developer', 'doctor'];
const DOCS_ROLES      = ['admin', 'developer', 'doctor'];
const BLOODBANK_ROLES = ['admin', 'developer', 'doctor', 'pharmacist'];
```

#### 4.2 Route table

See [`AKW-ICD-04-Interface-Control-Document.md`](AKW-ICD-04-Interface-Control-Document.md) §5 for the full matching table of frontend route → backend endpoint.

| Path | Guard | Component (lazy) |
|---|---|---|
| `/` | authGuard | dashboard |
| `/doctors-management` | authGuard + roleGuard(ADMIN) | Doctors Management |
| `/patients-management` | authGuard + roleGuard(PATIENTS) | Patients Management |
| `/patient-profile/:id` | authGuard + roleGuard(PATIENTS) | PatientProfile |
| `/consultation/:consultationId` | authGuard + roleGuard(PATIENTS) | ConsultationForm |
| `/consultation/:consultationId/view` | authGuard + roleGuard(PATIENTS) | ConsultationDetail |
| `/pharmacy` | authGuard + roleGuard(PHARMACY) | Pharmacy |
| `/blood-bank` | authGuard + roleGuard(BLOODBANK) | BloodBank |
| `/voice-scribe` | authGuard + roleGuard(SCRIBE) | VoiceScribe |
| `/admin-panel` | authGuard + roleGuard(ADMIN) | AdminPanel |
| `/documents` | authGuard + roleGuard(DOCS) | DocumentManager |
| `/calendar` | authGuard | HospitalCalendar |
| `/appointments` | authGuard | Appointments |
| `/invoices` | authGuard | Invoices |
| `/notifications` | authGuard | Notifications |
| `/user-profile` | authGuard | UserProfile |
| `/operator` | authGuard + operatorGuard | OperatorConsole |
| `/operator/onboard` | authGuard + operatorGuard | TenantOnboardingWizard |

Breadcrumbs use translation keys (`'pages.doctors.title'`), not literal English — resolved by ngx-translate so they switch on language change.

### 5. Services (`src/app/services/`)

| Service | Responsibility |
|---|---|
| `auth.service.ts` | Reads `cognito:groups`, `role`, `tenantId`, `doctorId` from access token. Exposes `UserRole` and `CurrentUser`. |
| `tenant.service.ts` | Resolves tenant from subdomain + JWT; detects mismatches. |
| `cognito-auth.service.ts` | Custom Cognito calls for the new login page (sign-in, forgot password, reset). |
| `operator.service.ts` | API client for `/operator/*` endpoints. |
| `patients.service.ts`, `doctors.service.ts`, `appointments.service.ts`, `consultation.service.ts`, `pharmacy.service.ts`, `bloodbank.service.ts`, `payments.service.ts`, `admin-panel.service.ts`, `document.service.ts`, `notifications.service.ts`, `hospital-calendar.service.ts`, `scribe.service.ts` | Per-domain API clients. |
| `cache.service.ts` | In-memory + localStorage cache for lookup data (departments, specializations). |
| `offline.service.ts` + `offline-db.ts` | Offline state + IndexedDB queue (writes queued when offline, drained on reconnect). |
| `refresh-scheduler.service.ts` | Background OIDC token refresh scheduling. |
| `i18n.service.ts` | Language switch + persistence; subscribes to ngx-translate. |
| `config.ts` | Single-source `apiBaseUrl`. |
| `helpers-service.ts` | Toast notifications, login redirect, utility formatters. |
| `icon.service.ts` | Icon registry + lookup. |

### 6. Guards + interceptors

#### Guards
- `auth.guard.ts` — redirects to Cognito login if no valid session. Calls `OidcSecurityService.checkAuth()`.
- `role.guard.ts` — `roleGuard(allowedRoles: UserRole[])` factory. Returns 404 route tree on mismatch.
- `operator.guard.ts` — allows only JWT `role === 'operator'`.

#### Interceptors (`src/app.config.ts` → `withInterceptors([offlineQueueInterceptor, authInterceptor])`)

Order matters:
1. **`offlineQueueInterceptor`** — intercepts mutating requests (POST/PATCH/DELETE). If `navigator.onLine === false`, enqueues the request body + URL in IndexedDB and returns a stub response. Drains on `window.ononline`.
2. **`authInterceptor`** — only for same-origin requests. Catches 401 → saves `returnUrl` → `oidc.authorize()` → sign-in redirect.

Both skip cross-origin requests to Cognito / Bedrock / SES endpoints.

### 7. State management

Signals-based (`signal()`, `computed()`, `effect()`), no RxJS `BehaviorSubject` proliferation. Example from a recent component:

```ts
export class VoiceScribeComponent {
  consentGiven = signal(false);
  sessionId = signal<string | null>(null);
  status = signal<Status>('idle');
  isRecording = computed(() => this.status() === 'recording');
}
```

Change-detection strategy: `OnPush` on all new components. Call `cdr.markForCheck()` from async callbacks.

### 8. PWA / offline

#### 8.1 Service worker
`provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000' })` in `src/app.config.ts`.

- Enabled only in production builds (avoids dev-mode flakiness).
- Registers 30 s after app becomes stable so it doesn't compete with initial render.
- Caches app shell (HTML, JS, CSS, fonts, images) per `ngsw-config.json`.

#### 8.2 Offline write queue
`offline-db.ts` wraps IndexedDB; `offline.service.ts` exposes `isOnline()`, `queueSize()`, `drain()`.

Flow:
1. `offlineQueueInterceptor` sees POST/PATCH/DELETE and `navigator.onLine === false`.
2. Writes `{ url, method, body, headers, tsEnqueued }` to IndexedDB.
3. Returns a `201 Accepted` stub to the component (UI shows "queued" badge).
4. `window.addEventListener('online', drain)` → replays requests oldest-first.
5. Audit: every drained request writes a client-side audit entry for the server to reconcile.

### 9. i18n (see [`AKW-FS-03-Functional-Specification.md`](AKW-FS-03-Functional-Specification.md))

- Loader: `TranslateHttpLoader` fetches `/i18n/{lang}.json` from `public/i18n/*.json`.
- Default: `en`.
- Supported: English, Arabic, French, Spanish, Hindi, Urdu (6 languages per the "translate across 6 languages" commit).
- RTL support: `dir="rtl"` toggled when `lang` ∈ `['ar', 'ur']`.
- Flag emojis removed — avoided ambiguity across jurisdictions (per `cfe25cb` commit).

### 10. Auth architecture (see [`AKW-FS-03-Functional-Specification.md`](AKW-FS-03-Functional-Specification.md))

- Custom Angular `/login` page replaces Cognito Hosted UI (Phase 1 Arabic + Phase 4 polish).
- OIDC authority = `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_YibFfEdDD` (JWT issuer).
- OAuth endpoints overridden to `https://auth.akwadona.com/oauth2/*` (branded URL bar — Stripe/Vercel pattern).
- `skipUserInfo` + `renewUserInfoAfterTokenRenew: false` — JWT carries everything, no round-trip.
- "Remember me" + silent refresh + language toggle on forgot-password page.

### 11. Build + bundling

- `ng build --configuration production` outputs to `dist/verona-ng/browser/`.
- Hashed chunk names (`chunk-ABCD.js`).
- Lazy routes → separate chunks (loaded on navigation).
- Budgets: initial 1 MB warning / 5 MB error; component style 2 KB warning / 8 KB error (`angular.json`).
- No preload strategy by default — pay the lazy-chunk download only when the user navigates.


---

## 4. Coding standard (reviewers enforce these)

### 4.1 Back end (Lambda)

| # | Rule | Why |
|---|---|---|
| BE-1 | Handler spine: `_warmup` → `getTenant()` → `throttle.precheck()` → role gate → work → audit → `ok()` | Every Lambda looks the same; reviewers never re-decide fundamentals |
| BE-2 | `tenantId`, `role`, `doctorId` come **only** from `event.requestContext.authorizer.jwt.claims` | Body/query values are attacker-controlled |
| BE-3 | **Never Scan.** `tenant-entityType-index` for tenant rows; `EntityType-index` for global rows | Cost and isolation; a `ScanCommand` import is a review blocker |
| BE-4 | **Never filter or sort on an encrypted field in a DynamoDB expression** (`name, dob, qid, phone, email, notes, education, licenseNumber, medicalHistory, allergies, medications`). Query with plaintext predicates → `decryptItems()` → filter/sort in memory. Reference: `getAllPatients/index.js` | Ciphertext never matches |
| BE-5 | Foreign-tenant resource → **404**, never 403 | No existence oracle |
| BE-6 | Copy `_shared/*.js` into the folder; never `require('../_shared')`; hash-check before deploy | Lambda zips one folder |
| BE-7 | `updatedAt` is always an ISO string, never `null`; TTL attribute is `expiresAt` (epoch seconds), never `ttl` | GSI type errors; TTL sweep |
| BE-8 | **No CORS headers from Lambda** | API Gateway allow-list is the only source |
| BE-9 | New Lambda → `readOnlyFunctions` or `readWriteFunctions` in the CDK; default runtime `NODEJS_20_X`; `functionName: 'akwadona-<kebab>'` | Least privilege; no Node 18 |
| BE-10 | Prefer `{proxy+}` catch-alls for Lambdas with > 3 paths | 500-resource ceiling |
| BE-11 | Mutations: write an `AUDIT#` row; honour `X-Client-Request-Id` idempotency | Compliance; offline replay |
| BE-12 | Never log tokens, claims blobs, or PHI; log actor e-mail + tenantId + action | — |
| BE-13 | Errors to the client: generic message; details to CloudWatch only | No stack-trace leak |

### 4.2 Front end (Angular)

| # | Rule |
|---|---|
| FE-1 | Standalone components, `ChangeDetectionStrategy.OnPush`, state in signals |
| FE-2 | Every feature is `loadComponent` (lazy); role sets are the constants at the top of `app.routes.ts` |
| FE-3 | All HTTP through a service and `Config.buildUrl()`; never a literal API URL in a component |
| FE-4 | Never `innerHTML`, `bypassSecurityTrust*`, `eval` |
| FE-5 | Every user-visible string through ngx-translate; add the key to all six language files |
| FE-6 | Mutations send `X-Client-Request-Id` (the interceptor does it) |
| FE-7 | Clear `.angular/cache` before a production build (stale Tailwind utilities) |

### 4.3 Infrastructure (CDK)

| # | Rule |
|---|---|
| IaC-1 | `cdk synth` → resource count ≤ 500 → `cdk diff` reviewed → `cdk deploy` |
| IaC-2 | One GSI per deploy |
| IaC-3 | Stateful resources are `RETAIN`; never remove `deletionProtection` |
| IaC-4 | New tenant slug → `tenantSlugs[]`, callback URLs, `PROTECTED_TENANT_IDS` after onboarding is confirmed |
| IaC-5 | Never hard-code an identifier that CloudFormation generates — read it live (AKW-OPS-08 §2) |

### 4.4 Documentation

| # | Rule |
|---|---|
| DOC-1 | A behaviour change updates AKW-FS-03 in the same PR; an infrastructure change updates AKW-SAD-02; a control change updates AKW-SSP-05 and AKW-CCM-06 |
| DOC-2 | House style: `../skills/akwadona-easy-english/SKILL.md` (short sentences, one analogy per new concept, abbreviations expanded on first use); audit-voice sections in AKW-CCM-06 are exempt |
| DOC-3 | Document-control block + revision history on every document; bump the version |

### 4.5 Pull-request template

```markdown
## What / Why / How
## Test
- [ ] Manual test (AKW-EH-10 §6) step …
- [ ] node scripts/security-tests/run-safe.js → exit 0
- [ ] node scripts/cross-tenant-probe.js (dev stack) → exit 0
## Docs updated
- [ ] AKW-FS-03 row(s): …   - [ ] AKW-SAD-02   - [ ] AKW-SSP-05 / CCM-06   - [ ] AKW-ICD-04
## Security review
<akwadona-security-review skill verdict>
```

---

## 5. Change checklists

**Add a Lambda**
1. Copy an existing folder of the same shape (read-only → `getPatientByID`; mutating → `createPatient`; module → `akwadona-pharmacy`).
2. Keep the handler spine (BE-1). Copy `crypto.js` / `throttle.js` / `plan-defaults.js` from `_shared/`.
3. CDK: `fn(...)` with `functionName`; add to `readOnlyFunctions` **or** `readWriteFunctions`; add routes with `route(...)` or a `{proxy+}`.
4. `cdk synth`; resource count ≤ 500.
5. Add the route to `scripts/security-tests/safe/02-unauthenticated.js` `ROUTES`; if it has tenant data, to `destructive/10-cross-tenant-crud.js`.
6. AKW-FS-03: new operations row(s) + business rules; AKW-ICD-04: payloads; AKW-SAD-02 Appendix B: inventory row.

**Add a field to PATIENT / DOCTOR**
1. Decide plaintext / encrypted / hashed (AKW-SAD-02 §5.1.2). PHI → encrypted.
2. Encrypted → `PATIENT_PHI_FIELDS` in `_shared/crypto.js` → copy to 17 folders. Hashed → `PATIENT_HASH_FIELDS` too.
3. Never reference an encrypted field in a DynamoDB expression (BE-4).
4. `normalizePatient()` in every list/get Lambda; Angular model; AKW-FS-03 §4 rules; AKW-ICD-04.

**Onboard a tenant**
1. Operator wizard (AKW-FS-03 §16.1).
2. CDK: `tenantSlugs[]`, `callbackUrls`/`logoutUrls`; redeploy.
3. DNS: nothing — the Route 53 wildcard `*.akwadona.com` CNAME already points at CloudFront.
4. After the first healthy week: add the `tenantId` to `PROTECTED_TENANT_IDS`; redeploy.

**Add a GSI** — one per deploy; `KEYS_ONLY` unless attributes are needed.

**Deploy** — AKW-OPS-08 §3.

---

## 6. Test strategy and manual test plan

### 6.1 Strategy

| Layer | What | Tool | When |
|---|---|---|---|
| Static | Syntax of every Lambda; CDK transpile | `node --check`, `cdk synth` | Every PR |
| Security (read-only) | Transport, auth bypass, CORS, enumeration, injection, method/path | `scripts/security-tests/run-safe.js` | Every PR against prod; nightly (R-06) |
| Security (destructive) | IDOR, role escalation, rate limit, payload/traversal | `scripts/security-tests/run-all.js` | Before release, dev stack |
| Isolation | Cross-tenant CRUD | `scripts/cross-tenant-probe.js` | Before release |
| Functional | Manual walkthrough below | Browser | Before release; full plan quarterly |
| Load | Capacity | `scripts/loadtest/` | Before a new tenant or plan tier |
| Unit | — | **None yet** (R-14) | — |

### 6.2 Manual test plan

**Document version:** 2.1
**Last updated:** 2026-05-13 (post-ScribeFirst, post-pharmacy-route-alignment, post-CORS-cleanup)

**Before starting:**

- Clean DynamoDB test data — delete all `PATIENT#`, `DOCTOR#`, `PAYMENT#`, `EXAM#`, `APPOINTMENT#`, `DISPENSE#`, `PO#`, `SCRIBE#` records.
- **Keep** `DEPARTMENT#`, `SPECIALIZATION#`, `COUNTER#`, `MED#` (and `INVENTORY` SKs), and all `AUDIT#YYYY-MM-DD` rows (PDPPL retention; do not delete audit history).
- After cleanup, reset counters manually: set `COUNTER#PATIENTS / TOTAL.total = 0` and `COUNTER#DOCTORS / TOTAL.total = 0`. The seed Lambda no longer auto-resets these on `cdk deploy`.
- Use Chrome or Edge (Voice Scribe needs the Web Speech API).

### 0. Auth flow (custom Angular login)

The Cognito Hosted UI is no longer used. The Akwadona Angular app serves its own `/login`, `/forgot-password`, and `/change-password` (first-login challenge) pages. All flows call Cognito over REST.

| # | Action | Expected |
|---|---|---|
| 0.1 | Open `tiryaq.akwadona.com` (or any tenant subdomain) | Lands on the Akwadona-branded login page. Language picker visible. Remember-me checkbox visible. NO redirect to `auth.akwadona.com`. |
| 0.2 | Sign in with valid credentials | `InitiateAuth` succeeds, JWTs stored in `sessionStorage` (plus `localStorage` if Remember-me ticked), routed to dashboard. |
| 0.3 | Sign in with wrong password | Inline error on the login form (localized). |
| 0.4 | Sign in as a fresh user (Status `FORCE_CHANGE_PASSWORD`) | In-app "Change Password" screen completes the `NEW_PASSWORD_REQUIRED` challenge, then dashboard. |
| 0.5 | Click "Forgot password?" → enter username | Email with 6-digit code from `noreply@akwadona.com` (DKIM-signed); enter code + new password → routed back to login. |
| 0.6 | Click avatar → Sign Out | Tokens cleared, routed to `/login`. |
| 0.7 | While signed-in, change language in topbar | UI re-renders in the chosen language (including the login page on next sign-out). |

---

### DB Record Count Rules

#### Table: `Hospital`

| Record Type | Count Rule |
|-------------|------------|
| `DOCTOR#` | 1 per doctor created |
| `PATIENT#` | 1 per patient created |
| `PAYMENT#` | 1 per invoice created |
| `EXAM#` | 1 per consultation (signed or draft) |
| `APPOINTMENT#` | 1 per appointment (Hospital table only — no external copy) |
| `CALENDAR#<id>` / `PROFILE` | 1 per hospital calendar (e.g., one per doctor's duty calendar) |
| `CALENDAR#<id>` / `EVENT#<id>` | 1 per calendar event (duty shifts + manual events) |
| `MED#` / `PROFILE` | 1 per medication in catalog |
| `MED#` / `INVENTORY` | 1 per medication that has stock tracking |
| `DISPENSE#` | 1 per dispense event |
| `PO#` | 1 per purchase order |
| `SCRIBE#` / `SESSION` | 1 per voice-scribe session |
| `SCRIBE#` / `AUDIT#<iso>` | 1 per scribe approval (append-only) |
| `AUDIT#YYYY-MM-DD` / `AUDIT#<iso>#<uuid>` | 1 per audited action that day (append-only) |
| `QID#` | 1 per doctor + 1 per patient (unique QID lock) |
| `PHONE#` | 1 per doctor + 1 per patient (unique phone lock) |
| `EMAIL#` | 1 per doctor (if email lock exists) |
| `DOCTOR#<email>` / `PATIENT#<id>` | 1 per doctor-patient relationship (drives doctor-scoped patient list) |
| `COUNTER#DOCTORS / TOTAL` | Always exactly 1 record, value increments |
| `COUNTER#PATIENTS / TOTAL` | Always exactly 1 record, value increments |

> **Calendar migration note (2026-05-18):** Hospital calendar data now lives in the Hospital table (CALENDAR#/EVENT#). The previous external `CalendarPlatform` SaaS API has been retired for PDPPL data residency + clinical privacy. Old test plan revisions that referenced `TENANT#akwadona-hospital-001` PartiQL queries are no longer applicable.

---

### Step 1 — Login ✅

- Login as admin → dashboard loads

**Verify DB:** Nothing to check yet.

---

### Step 2 — Create Doctors ✅

- Created Omar Rashidi: duty days `mon, tue` — `10:15–11:15`
- Created Dr. Layla Hassan: duty days `mon, wed, fri` — `09:00–17:00`

**Verify DB — Table: `Hospital` (PartiQL):**
```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'DOCTOR#')
```
Expected: 2 records with `EntityType = 'DOCTOR'`

Also verify locks:
```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'QID#')
SELECT * FROM "Hospital" WHERE begins_with(PK, 'PHONE#')
```
Expected: 2 QID locks + 2 phone locks

---

### Step 3 — Hospital Calendar ✅

- Both doctor calendars auto-created
- Duty shifts generated from 1st of month
- Re-sync works: no 404, no duplicates

**Verify DB — Table: `Hospital` (PartiQL):**
```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'CALENDAR#') AND SK = 'PROFILE'
```
Expected: 2 records with `EntityType = 'CALENDAR'`, one per doctor name, `dataClass = 'PHI'`

```sql
SELECT * FROM "Hospital" WHERE PK = 'CALENDAR#<calendarId>' AND begins_with(SK, 'EVENT#')
```
Expected: duty shift events with `description = 'DUTY_SHIFT'`, `color = '#10B981'`, `EntityType = 'CALENDAR_EVENT'`

**Verify in DevTools Network tab:** calendar calls now hit `https://ouohmmpi31.execute-api.us-east-1.amazonaws.com/calendars` (the Akwadona API) with an `Authorization: Bearer ...` header — NOT the old `od8gx8kld8…` endpoint with an `x-api-key` header.

---

### Step 4 — Create Patient ✅

- Patient created with required fields

**Verify DB — Table: `Hospital`:**
```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'PATIENT#')
```
Expected: 1 record with `EntityType = 'PATIENT'`, `timestamp` set, `updatedAt = null`

Also verify locks:
```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'QID#')
SELECT * FROM "Hospital" WHERE begins_with(PK, 'PHONE#')
```
Expected: now 3 QID locks + 3 phone locks (2 doctors + 1 patient)

---

### Step 5 — Create Appointment for Today

- Navigate to Appointments → New Appointment
- Select the doctor and patient you just created
- Set date to **today**, fill start/end time, type, status = `scheduled`
- Save

**Verify DB — Table: `Hospital`:**
```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'APPOINTMENT#') AND SK = 'PROFILE'
```
Expected: 1 record with today's date, correct `doctorEmail`, `patientId`, `status = 'scheduled'`, `EntityType = 'APPOINTMENT'`. Appointments live in the Hospital table only — no second copy anywhere.

**Also verify:** Dashboard → "Today's Appointments" shows this appointment

---

### Step 6 — Create Invoice

- Navigate to Invoices → New Invoice
- Select the patient from Step 4
- Add at least one item, set amount, status = `pending`
- Save

**Verify DB — Table: `Hospital`:**
```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'PAYMENT#')
```
Expected: 1 record with correct `patientId`, `status = 'pending'`, `invoiceNumber` auto-generated

**Also verify:** Dashboard → Invoice Summary shows 1 pending

---

### Step 7 — Notifications

- Click the bell icon in the topbar → today's appointment should appear
- Navigate to full Notifications page

**Verify:** No DB check needed — derived from live API queries. Confirm on screen:
- Today's appointment appears under "Today's Appointments"
- If any patient has status `critical` → appears under Critical Patients

---

### Step 8 — Patient Profile

- Navigate to Patients Management → click eye icon on the patient from Step 4

**Verify on screen:**
- Personal info tab shows correct data
- Appointments tab shows the appointment from Step 5
- Invoices tab shows the invoice from Step 6

**Verify DB — Table: `Hospital` (before edit):**
```sql
SELECT * FROM "Hospital"
WHERE PK = 'PATIENT#<patient-uuid>'
AND SK = 'PROFILE'
```
Expected: `timestamp` is set, `updatedAt = null`

Then edit the patient → change one field → save, then re-run:
```sql
SELECT * FROM "Hospital"
WHERE PK = 'PATIENT#<patient-uuid>'
AND SK = 'PROFILE'
```
Expected: `updatedAt` is now set, `timestamp` unchanged

---

### Step 9 — Dashboard

- Navigate to Dashboard

**Verify on screen:**
- Today's Appointments: 1
- Upcoming (7 Days): 0 (appointment is today, not future)
- Pending Invoices: 1
- Total Revenue: 0 (nothing paid yet)
- Quick Overview: 2 doctors, 1 patient, 1 appointment this month

**Verify DB — Table: `Hospital`:**
```sql
SELECT * FROM "Hospital"
WHERE PK = 'COUNTER#DOCTORS' AND SK = 'TOTAL'

SELECT * FROM "Hospital"
WHERE PK = 'COUNTER#PATIENTS' AND SK = 'TOTAL'
```
Expected: `total = 2` for doctors, `total = 1` for patients

---

### Step 10 — Doctor Role

- Log in as Omar Rashidi's Cognito account

**Verify menu shows:** Dashboard, Calendar, Appointments, Invoices, Notifications, Patients, Voice Scribe *(no Doctors Management, no Pharmacy, no Admin)*

**Verify per module:**
- Dashboard shows only Omar's appointments and invoices
- Calendar shows only Omar's calendar — no dropdown, no Re-sync button
- Appointments list filtered to Omar only
- Invoices list filtered to Omar only
- Patients list shows only Omar's patients (scoped via `DOCTOR#<email>` relationship rows)

**Verify in Network tab:** API calls for appointments and invoices include `?doctorEmail=<omar's email>` query param

**Verify DB — Table: `Hospital`:**
```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'APPOINTMENT#')
```
Filter results by `doctorEmail` field to confirm only Omar's appointment is the one the UI showed him. (Doctor-scoping is enforced by the Lambda — admins/devs see all rows when querying the table directly.)

---

### Step 11 — Soft Delete + Restore (admin-gated)

- Log back in as admin
- Patients Management → soft-delete the patient from Step 4
- Verify the patient now shows under "Deleted" filter only

**Verify DB — Table: `Hospital`:**
```sql
SELECT * FROM "Hospital"
WHERE PK = 'PATIENT#<patient-uuid>' AND SK = 'PROFILE'
```
Expected: `deletedAt` is now an ISO timestamp string (not null/empty)

Also verify counter decremented:
```sql
SELECT * FROM "Hospital"
WHERE PK = 'COUNTER#PATIENTS' AND SK = 'TOTAL'
```
Expected: `total` decreased by 1

#### 11a — Restore as admin ✅ allowed

- Click Restore on the soft-deleted patient
- Expected: success toast, patient returns to active list

```sql
SELECT * FROM "Hospital"
WHERE PK = 'PATIENT#<patient-uuid>' AND SK = 'PROFILE'
```
Expected: `deletedAt` attribute is removed entirely, counter back to original value

#### 11b — Restore as doctor ❌ denied

- Soft-delete the patient again as admin (so a restore action exists)
- Log in as Omar (Doctor role)
- DevTools → Network → manually issue `PATCH /patients/{id}/restore` against the API (e.g., via Console fetch using the JWT in sessionStorage), OR have the UI surface a Restore button if exposed
- Expected: **HTTP 403** with body `{"message":"Access denied: restoring a deleted patient is admin-only"}`
- Patient stays soft-deleted

---

### Step 12 — Pharmacy Module

> Pharmacist test users: `pharmacist1`, `pharmacist2`. Routes deployed via CDK now match the Lambda router (`/pharmacy/medications`, `/pharmacy/dispense`, `/pharmacy/inventory/{medId}`).

#### 12a — Catalog (Admin)

- Log in as admin → Pharmacy → Catalog
- Add a medication (Brand: `Amoxicillin`, Generic: `Amoxicillin`, Category: `Antibiotic`, Form: `Capsule`, Strength: `500mg`, Reorder point: `10`)
- Verify the row appears in the list

**Verify DB — Table: `Hospital`:**
```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'MED#') AND SK = 'PROFILE'
```
Expected: 1 record with `EntityType = 'MEDICATION'`, `requiresPrescription` set, `reorderPoint = 10`

#### 12b — Inventory

- Add stock for the new medication (qty: `50`, batch: `B001`, expiry: 1 year out)

```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'MED#') AND SK = 'INVENTORY'
```
Expected: 1 inventory record with `stockQty = 50`, batch + expiry set

#### 12c — Prescriptions + Dispense

- As a doctor, create a consultation for the patient from Step 4
- Inside the consultation, add a prescription line linking the medication from 12a
- Sign off the consultation
- Log in as `pharmacist1`
- Pharmacy → Prescriptions (status=ordered) → the prescription appears
- Open it → Dispense (qty: `30`) → confirm

```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'DISPENSE#') AND SK = 'PROFILE'
```
Expected: 1 dispense record with `quantityDispensed = 30`, actor = pharmacist1's email

```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'MED#') AND SK = 'INVENTORY'
```
Expected: `stockQty = 20`, `adjustments` array contains a `dispensed` entry with `delta = -30`

#### 12d — Allergy guardrail

- Edit the patient (Step 4) → add `Amoxicillin` to allergies → save
- Try to dispense Amoxicillin again
- Expected: warning surfaces; dispense allowed only if `allergyOverrideConfirmed = true` is passed

#### 12e — Alerts

- Lower the inventory below the reorder point (or set a near expiry on a batch)
- Pharmacy → Alerts
- Expected: alert row appears with severity `critical` (expired) or `warning` (low stock / expiring soon)

#### 12f — Purchase Orders

- Pharmacy → Purchase Orders → New PO → add the medication → submit

```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'PO#') AND SK = 'PROFILE'
```
Expected: 1 PO record with `status = 'draft'` or `'submitted'`

Receive the PO. Expected: inventory `stockQty` increases by received quantity; `adjustments` gains a `received` entry.

---

### Step 13 — Consultation / Examination

- Log in as Omar (Doctor)
- Open the patient → click "New Consultation"
- Fill: Chief complaint, vital signs (BP, HR, temp), physical exam notes, diagnosis (ICD-10 lookup), plan
- Add a prescription line (for Step 12c)
- Click "Save & Sign-off"

**Verify DB — Table: `Hospital`:**
```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'EXAM#') AND SK = 'PROFILE'
```
Expected: 1 record with `EntityType = 'EXAMINATION'`, `patientId`, `doctorEmail = omar`, `signedOff = true`

**Verify audit row:**
```sql
SELECT * FROM "Hospital" WHERE PK = 'AUDIT#<today>' AND begins_with(SK, 'AUDIT#')
```
Expected: at least one row with `entityType = 'EXAMINATION'`, `action = 'CREATE'` or `'SIGNOFF'`

---

### Step 14 — Voice Scribe (ScribeFirst Phase 1)

> Browser: must be Chrome or Edge (Web Speech API).

- Log in as Omar → Voice Scribe
- Tick the consent checkbox → "Start Session" → expect toast "Session ready"
- Click Start Recording → allow mic permission
- Speak ~3 sentences: subjective + objective + plan
- Click Stop Recording → "Generate SOAP"
- Wait for Bedrock response (~3–8 sec)
- Expected: SOAP fields auto-fill (Subjective, Objective, Assessment, Plan)
- Edit if needed → click Approve

**Verify DB — Table: `Hospital`:**
```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'SCRIBE#') AND SK = 'SESSION'
```
Expected: 1 session row with `status = 'APPROVED'`, `dataClass = 'PHI'`, `transcriptSha256` set, `finalSoap` populated

```sql
SELECT * FROM "Hospital" WHERE begins_with(PK, 'SCRIBE#') AND begins_with(SK, 'AUDIT#')
```
Expected: 1 audit row with `action = 'SCRIBE_APPROVED'`, `dataClass = 'AUDIT'`

#### 14a — Authorization gate

- Log in as `pharmacist1` → try to navigate to `/voice-scribe`
- Expected: redirected to `/notfound` (role guard)
- Try direct API call `POST /scribe/sessions` with pharmacist's JWT
- Expected: **HTTP 403** "only doctors and admins can use the scribe"

---

### Step 15 — Documents Module

- Log in as admin → Documents
- Open folder `patients-documents` → Upload a small PDF
- Verify upload completes, file appears in the list

**Verify in S3 Console:**
- Bucket: `akwadona-documents` → `patients-documents/` → uploaded file is present

- Click Download → file opens correctly
- Click Delete → file disappears from list and from S3

#### 15a — Folder allow-list

- DevTools → manually request a pre-signed URL for folder `random-folder` (POST `/documents/upload-url` with body `{"folder":"random-folder","fileName":"x.pdf","contentType":"application/pdf"}`)
- Expected: **HTTP 400** "Invalid folder"

---

### Step 16 — Admin Panel

- Log in as admin → Administration
- **Stats tab:** verify counts (Patients, Doctors, Exams, Invoices) match what the DB has
- **Users tab:** verify all Cognito users listed with their group, status, last sign-in
  - Disable a test pharmacist user → log out → try to sign in as that user → expect failure
  - Re-enable → sign in works
  - Set password → log in with the temp password → forced to change on first login
- **Audit tab:** verify recent actions appear (the disable/enable above should show up)

**Verify DB — Table: `Hospital`:**
```sql
SELECT * FROM "Hospital" WHERE PK = 'AUDIT#<today>' AND begins_with(SK, 'AUDIT#')
```
Expected: rows with the actor email matching the admin who performed the change

#### 16a — Authorization gate

- Log in as Omar (Doctor) → try `GET /admin/stats` via DevTools fetch with his JWT
- Expected: **HTTP 403** "Access denied: admin only"

---

### Step 17 — CORS regression (post-deploy verification)

> Verifies the wildcard-CORS cleanup on the 5 Lambdas didn't break anything for the legit origins, and that disallowed origins are now blocked.

#### 17a — Legitimate origin still works

- Open DevTools → Network tab
- Hit each of these from `https://www.akwadona.com`:
  - `GET /pharmacy/alerts` (akwadona-pharmacy)
  - `GET /examinations` (akwadona-examinations)
  - `GET /appointments` (akwadona-appointments)
  - `GET /admin/audit` (akwadona-admin-panel)
  - `GET /documents/folders` (akwadona-document-manager)
- All 5 should return 200 with no CORS error in console
- Response headers should include `Access-Control-Allow-Origin: https://www.akwadona.com` (added by API Gateway, not the Lambda)

#### 17b — Disallowed origin is blocked

- In a separate browser tab, run from DevTools console (anywhere outside the allow-list):

```js
fetch('https://ouohmmpi31.execute-api.us-east-1.amazonaws.com/pharmacy/alerts', {
  method: 'OPTIONS',
  headers: { 'Origin': 'https://evil.example', 'Access-Control-Request-Method': 'GET' }
}).then(r => console.log('status', r.status, 'allow-origin', r.headers.get('access-control-allow-origin')));
```

- Expected: response has **no** `Access-Control-Allow-Origin` header (or it omits `evil.example`). Browser would reject this cross-origin request from a real page.

#### 17c — Pharmacy route alignment (CDK ↔ Lambda)

- Confirm in DevTools that pharmacy module loads with NO 404s
- All these should return 200: `/pharmacy/medications`, `/pharmacy/inventory`, `/pharmacy/dispense`, `/pharmacy/prescriptions`, `/pharmacy/purchase-orders`, `/pharmacy/alerts`

---

### Step 18 — Compliance regression check (MFA + WAF)

> Both are intentionally OFF in dev (WAF disabled, MFA now OPTIONAL — see AKW-RR-12 R-03 / R-05). This step is here so the test plan documents that the regression is the **expected** state.

- Sign in: should NOT prompt for MFA enrolment or TOTP code
- Visit any path in the app → response headers should NOT include `x-amzn-waf-` blocking signals
- Confirm this matches the documented regression

---

### Step 19 — Final teardown (optional)

- Hard-delete test data via Admin Panel → Doctors / Patients → Hard Delete All

```sql
SELECT COUNT(*) FROM "Hospital" WHERE begins_with(PK, 'PATIENT#')
SELECT COUNT(*) FROM "Hospital" WHERE begins_with(PK, 'DOCTOR#')
SELECT COUNT(*) FROM "Hospital" WHERE begins_with(PK, 'QID#')
SELECT COUNT(*) FROM "Hospital" WHERE begins_with(PK, 'PHONE#')
SELECT COUNT(*) FROM "Hospital" WHERE begins_with(PK, 'EMAIL#')
```
Expected: all return 0. Counter rows remain (decremented to 0).

---

## 7. Application build and test harness reference

User-facing reference for the Akwadona web app (akwadona.com): frontend architecture, per-role user manuals, and the end-to-end test workflow.

---

### Table of contents

1. [What the app does](#1-what-the-app-does)
2. [How to sign in](#2-how-to-sign-in)
3. [Frontend architecture](#3-frontend-architecture)
4. [Role-by-role user manual](#4-role-by-role-user-manual)
5. [Offline mode](#5-offline-mode)
6. [End-to-end test workflow](#6-end-to-end-test-workflow)
7. [Frontend code-review register](#7-frontend-code-review-register)
8. [Troubleshooting](#8-troubleshooting)
9. [Glossary](#9-glossary)

---

### 1. What the app does

Akwadona is a hospital management web app for the Qatar / GCC market. Each hospital customer (e.g. Tiryaq, Alshifaa) gets its own subdomain and sees only its own data. The platform runs four user roles:

- **Admin** — full control: patients, doctors, appointments, invoices, documents, admin panel, blood bank.
- **Developer** — same as admin + Voice Scribe; used by support staff.
- **Doctor** — own appointments + check-in + consultations + Voice Scribe + blood requests + documents.
- **Pharmacist** — pharmacy (medications, inventory, prescription queue, purchase orders) + blood bank inventory/donations/cross-match/issue.

Top-level modules: **Patients · Doctors · Appointments · Consultations · Voice Scribe · Pharmacy · Blood Bank · Documents · Invoices · Calendar · Admin panel · Dashboard**.

---

### 2. How to sign in

1. Visit `https://akwadona.com` (or `https://www.akwadona.com`) — or your tenant's subdomain like `https://tiryaq.akwadona.com`.
2. The Akwadona-branded login page is served by the Angular app itself (no Cognito Hosted UI). Username + password fields, language picker, Remember-me checkbox.
3. Behind the scenes the app calls Cognito `InitiateAuth` via REST (`USER_PASSWORD_AUTH` flow). On success it stores the JWTs and routes the user to the dashboard.
4. Session lives in `sessionStorage` by default. Tick **Remember me** to also persist tokens in `localStorage` so the session survives a browser restart.
5. First-time users land on a **Change Password** screen (handled in-app by responding to Cognito's `NEW_PASSWORD_REQUIRED` challenge).
6. Tokens refresh automatically via the refresh-token flow, also called over REST.

**Sign out** — click your avatar in the top right → **Sign Out**. Clears both storages and routes back to `/login`.

**Forgot your password** — click the link on the login page. The custom Angular flow calls Cognito `ForgotPassword`, which emails a 6-digit code via SES from `noreply@akwadona.com` (DKIM-signed). Enter code + new password on the same page to reset.

**Why custom, not Hosted UI** — full control over branding, i18n (6 languages), and UX consistency. The Cognito Hosted UI is English-only and unbranded.

---

### 3. Frontend architecture

Stack: **Angular 20** + **PrimeNG 20** + **Tailwind CSS** + **angular-auth-oidc-client v19**.

```
src/
├── app.config.ts            ← bootstrap: routing, interceptors, OIDC, service worker
├── app.routes.ts            ← all routes + role guards
├── app/
│   ├── components/          ← one folder per page (patients, appointments, ...)
│   ├── services/            ← typed HTTP wrappers (one per backend domain)
│   ├── guards/              ← authGuard, roleGuard
│   ├── interceptors/        ← authInterceptor (401 redirect), offline-queue
│   ├── layout/              ← topbar + side menu + tabs
│   └── shared/              ← form-constants (PHONE_MASK, GENDER_OPTIONS, ...)
```

**Key building blocks**

- **`appRoutes`** — every route is lazy-loaded and gated by `roleGuard([...])`.
- **`authGuard`** — runs `oidc.checkAuth()` once per app boot; subsequent navs read `sessionStorage.accessToken` directly. Saves `returnUrl` in `localStorage` so deep-links survive the Cognito round-trip.
- **`authInterceptor`** — catches 401 from same-origin **and** the API host; saves returnUrl, drops the stale token, calls `oidc.authorize()` once (a global flag prevents redirect storms).
- **`offlineQueueInterceptor`** — runs before `authInterceptor`. On every mutating call it stamps `X-Client-Request-Id`. When offline, the request is persisted to IndexedDB and a synthetic 202 is returned.
- **`OfflineService`** — replays the queue on `window.online`. Rewrites temp ids in URLs and bodies once the real id is known from a successful create.
- **Service Worker (`ngsw`)** — prefetches the app shell + lazy chunks + fonts. Caches API GET responses (`freshness` strategy, 3 s timeout, 1-day maxAge).
- **`HelpersService.notifyXxx`** — single source for toasts; deduplicates the offline-save toast.
- **`shared/form-constants.ts`** — `PHONE_MASK`, `QID_MASK`, `GENDER_OPTIONS`, `BLOOD_TYPE_OPTIONS`, `isValidPhone`, `isValidEmail`, `isValidQid`. Every form imports from here.

---

### 4. Role-by-role user manual

Each role section: what you see, what you can do, common tasks step-by-step.

#### 4.1 Admin / Developer

**Side menu** — Dashboard · Calendar · Appointments · Invoices · Notifications · Patients · Doctors Management · Blood Bank · Documents · Administration.

**Add a patient**
1. Side menu → Patients Management → **New Patient**.
2. Fill name (≥3 chars), DOB, gender, phone (`+999 9999 9999`), QID (11 digits), insurance, blood group.
3. **Save** → patient row appears.

**Import many patients from Excel**
1. Side menu → Patients Management → **Download Template** (Excel template).
2. Fill rows in the template. Required: name, dob, gender, phone, qid.
3. Click **Import Patient(s)** → pick the file.
4. Loader shows "Reading & validating file…".
5. If any row is missing a required field, the **Import issues** dialog opens listing the bad rows. Choose **Import N valid only** or **Cancel**.

**Add a doctor**
- Same flow as patient. Extra fields: department, specialization, license, duty days (multi-select), duty hours.

**Create an appointment**
1. Side menu → Appointments → **New Appointment**.
2. Pick doctor + patient + date + start time + end time.
3. **Book**. Errors you may see:
   - "Doctor is not on duty on …" → date is outside the doctor's duty days.
   - "Doctor already has an appointment at …" → overlap.
   - "This patient already has an appointment at …" → patient overlap.
   - "The selected date/time has already passed."

**Browse 1 M+ appointments**
- The Appointments table is paginated server-side. Use the tabs **Upcoming / Past / All**, the search box (debounced 300 ms), column filters (status / priority / type are multi-select check-boxes), and the date-range filter.
- Footer shows "Showing 25 of 1,000,905 records" (total from the counter row).

**Manage users**
- Side menu → **Administration** → Users tab.
- Disable / enable a user; set a temporary password.

#### 4.2 Doctor

**Side menu** — Dashboard · Calendar · Appointments · Invoices · Notifications · Patients · Voice Scribe · Blood Bank · Documents.

**See your day**
- Dashboard "Today's Appointments" card and the list below it.

**Check in a patient**
- On the appointment row in **Appointments**, click the green check-in icon.
- Status flips to `checked-in`.

**Start a consultation**
- Same row → click the play icon → consultation form opens.
- Fill SOAP sections (Subjective / Objective / Assessment / Plan).
- Add diagnoses (at least one with `type = primary`), prescriptions, lab orders, radiology orders.
- Each section auto-saves on blur.
- Click **Sign off**. The exam becomes read-only and the linked appointment is marked `completed`.

**Voice Scribe**
- Side menu → Voice Scribe → New session.
- Paste / dictate the transcript. Click **Generate SOAP** → Bedrock returns a SOAP draft.
- Edit, then **Approve** to save.

**Request blood**
- Side menu → Blood Bank → Requests → **New request**.
- Select patient, blood type, product type, units, urgency.
- Pharmacist takes it from here.

#### 4.3 Pharmacist

**Side menu** — Dashboard · Calendar · Appointments · Invoices · Notifications · Pharmacy · Blood Bank.

**Add a medication**
- Side menu → Pharmacy → Medications tab → **New medication**.

**Dispense a prescription**
- Pharmacy → Prescription queue → click a row → enter quantity → upload doctor approval PDF (optional) → **Dispense**. Stock decrements.

**Manage blood inventory**
- Side menu → Blood Bank → Donors → **New donor** (needs at least phone OR Qatar ID).
- Green **+** on the donor row → Record donation → produces N `BB_UNIT` rows in inventory.

**Cross-match + issue**
- Blood Bank → Requests → open a request.
- Pick a unit → **Cross-match**. ABO/Rh check is automatic. Unit is reserved for 2 h.
- Multi-select compatible cross-matched units → **Issue**. Unit status flips to `issued`.

#### 4.4 Developer (special role)

- Sees everything the admin sees **plus** Voice Scribe.
- Used by support staff during incidents.
- Lambdas treat `Developers` exactly like `Admin` for authorization.

---

### 5. Offline mode

#### 5.1 What works offline

- App shell + cached pages still render.
- Cached GETs (patients, doctors, appointments lists) shown read-only.
- Mutations are queued in IndexedDB; a toast says **"Saved offline — will sync when connection is back."**
- Topbar shows a red **Offline** pill with a counter of pending items.

#### 5.2 What happens on reconnect

- Toast: **"Synced N pending action(s)."**
- Pending count drops to 0.
- Refresh shows the rows the server created from the queued mutations.

#### 5.3 Limitations

- File uploads (S3 PUT) need a live connection.
- Hard refresh (Ctrl+F5) bypasses the SW — expected browser behaviour.
- Conflict policy: last-write-wins at the row level.

---

### 6. End-to-end test workflow

One continuous walk-through. Follow top to bottom on a fresh login. Expected result in **bold**.

#### 6.1 Prerequisites

- Four Cognito users seeded: `admin1`, `doctor1`, `pharmacist1`, `developer1`.
- DevTools open (F12), Application → Service Workers → uncheck "Update on reload".

#### 6.2 Sign in & shell

1. Visit `https://akwadona.com`, log in as **admin1**.
2. **Expect** dashboard cards (Today's / Upcoming / Total / Pending / Revenue) populated; side menu shows all admin items.
3. New tab → paste `https://akwadona.com/appointments`.
4. **Expect** lands on Appointments after Cognito round-trip.

#### 6.3 Reference data

1. Administration → Departments → add **Cardiology**, **Surgery**.
2. Specializations → add **General Surgery**, **Cardiology**.
3. Users tab → disable then enable `developer1`.
4. **Expect** toast after each.

#### 6.4 Doctors

1. Doctors Management → **New Doctor** → fill, save.
2. **Import Doctor(s)** with a file containing one bad row → **Import issues** dialog opens listing the bad row → **Import N valid only**.
3. Edit a doctor → remove a duty day → save.
4. **Expect** doctor row updated.

#### 6.5 Patients

1. Patients Management → **New Patient** → save.
2. Bulk import with a row missing gender → **Import issues** dialog → import only valid.
3. Open a patient profile → tabs render.

#### 6.6 Appointments

1. New Appointment → doctor + patient + today 10:00–10:30 → Book.
2. New Appointment → same doctor + 10:15 (overlap) → **Expect** error "Doctor already has an appointment…".
3. New Appointment → same doctor + 11:00–11:30 → **Expect** OK (multi per day allowed).
4. New Appointment → same patient + different doctor at 10:10 → **Expect** patient-overlap error.
5. New Appointment outside duty days → **Expect** "Doctor is not on duty on …".
6. List shows soonest-first; column filters for status/priority/type are checkbox multi-select.
7. Edit a past or cancelled appointment → **Expect** edit/cancel icons hidden.
8. Doctor1 (log out / in) → sees only own appointments; can check-in + edit own.

#### 6.7 Consultations

1. As doctor1, check-in a today appointment → Start consultation.
2. Fill SOAP, add 1 primary diagnosis + 1 prescription.
3. Sign off → **Expect** appointment becomes `completed`, exam becomes read-only.
4. Reload mid-edit → **Expect** consultation resumes, no duplicate row.

#### 6.8 Voice Scribe (doctor1)

1. Voice Scribe → new session → paste transcript → Generate SOAP.
2. **Expect** SOAP draft.
3. Approve → session moves to approved.

#### 6.9 Pharmacy (pharmacist1)

1. Medications → new med.
2. Inventory → adjust stock.
3. Prescription queue → process the one from §6.7 → dispense → upload PDF.
4. Purchase orders → draft → submitted → received.

#### 6.10 Blood Bank

1. As pharmacist1 → Donors → new donor (phone OR QID).
2. Record donation (2 units) → **Expect** 2 `BB_UNIT` rows in Inventory; donor's count = 1.
3. As doctor1 → Blood Bank → new request (matching blood type).
4. As pharmacist1 → open request → Cross-match a unit → **Expect** unit reserved, request `crossmatched`.
5. Multi-select unit → Issue → **Expect** unit `issued`, request `issued`.

#### 6.11 Documents

1. Documents → patients-documents → upload a small PDF.
2. Download it.
3. Delete it.
4. **Expect** all three work.

#### 6.12 Calendar

1. Calendar → pick a doctor → see duty shifts + appointment events on **one** calendar (unified).
2. Click empty slot → create a manual event.
3. Drag to another day → **Expect** PATCH succeeds.

#### 6.13 Notifications + Dashboard

1. Bell → recent notifications.
2. Dashboard cards show live counts (1,654,692 total appointments with the seed).

#### 6.14 Backend idempotency (Phase D)

1. DevTools → Network → copy any POST as fetch → run it again in Console.
2. **Expect** identical response (cached idempotency).
3. DynamoDB → filter `EntityType = IDEMPOTENCY` → row with `expiresAt` ≈ now + 24h.

#### 6.15 Offline (Phases A–F)

1. DevTools → Network → **Offline** → red Offline pill in topbar.
2. Create 2 appointments + 1 patient → each toasts "Saved offline".
3. Network → **Online** → toast "Synced N pending action(s)."
4. Refresh → rows are real with real ids.

#### 6.16 Security / role enforcement

1. As doctor1, manually visit `/admin-panel` → **Expect** redirect to dashboard or 403.
2. As pharmacist1, manually visit `/doctors-management` → **Expect** blocked.
3. DevTools → Application → **sessionStorage** has tokens, **localStorage** only has `returnUrl` + `userData`.
4. Right-click side menu link → Open in new tab → **Expect** lands on the same page after sign-in.

#### 6.17 Done

If every step passed, the system is healthy. If anything fails, capture: screenshot + URL + the failing request from DevTools → Network.

---

### 7. Frontend code-review register

Findings from the comprehensive review of June 2026.

#### 7.1 Security

| # | Sev | Finding |
| --- | --- | --- |
| F-1 | 🟡 | Tokens correctly stored in `sessionStorage`; only `returnUrl` + `userData` in localStorage. ✅ no XSS surface increase. |
| F-2 | 🟡 | `auth.service.parseRole` returns the first matching group only. A doctor who is also in Admin gets the "admin" role label. Works in practice; the next refactor should use `isInGroup(group)` everywhere. |
| F-3 | 🟡 | The Service Worker caches API GETs (including patient lists) for 1 day. On a shared device, the next signed-in user briefly sees stale cached data when offline. Logout should clear `caches` and IndexedDB. |

#### 7.2 Bugs

| # | Sev | Finding |
| --- | --- | --- |
| F-4 | 🟡 | `OfflineService.findRealIdInResponse` matches by id-key name list. New endpoints with custom id field names would silently break the temp-id rewrite. Convention: every create endpoint must echo an `id` field. |
| F-5 | 🟡 | The appointments cursor stack only supports forward/backward 1 page at a time. Jumping to page 100 in one click walks 100 forwards. Acceptable for now. |

#### 7.3 Clean code / naming

- **Dead commented-out code** at the top of `new-patient.ts`, `edit-patient.ts` (~400 lines each) — earlier component versions left commented in. Delete on next touch.
- **`@HostBinding` on dashboard** uses 12-col Tailwind grid but the stat cards now use a nested 5-col grid. Mixed but readable.
- **Hard-coded config** (`Config.apiBaseUrl`, Cognito client id, distribution id) baked into source. Move to a runtime `assets/runtime-config.json` to support multi-env later.
- **`HelpersService.notifySuccess/notifyInfo/notifyError`** — three near-duplicate methods; only `notifySuccess` short-circuits via `wasOfflineEnqueueRecent`. Other two should too.

#### 7.4 Style

- Five-card dashboard stat row uses a nested grid (xl:grid-cols-5) instead of trying to fit into the 12-col outer grid — cleaner result, but worth documenting so future authors don't refactor it back.
- All forms reference `@/shared/form-constants` — the only correct source for phone mask, gender list, etc. Don't redefine.

---

### 8. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Sign-in spinner for >30 s | First-of-the-day cold start of Cognito discovery + pre-token Lambda | Acceptable on first user of the day; the 5-min warmer keeps it warm during business hours. |
| Dashboard shows "100 of 50 records" | `COUNTER#APPOINTMENTS` is stale (bulk seed bypassed it) | Run `node scripts/sync-appointments-counter.js`. |
| Doctors page empty / 500 | Stale SW serving an old `/doctors` response | Clear site data (cache + service workers + IndexedDB; **keep** localStorage + sessionStorage). |
| Appointments toolbar shows an extra pager | Old SW bundle | Same as above + redeploy frontend. |
| "Doctor already has an appointment …" on first try | Genuine overlap with another row | Pick a different time. |
| "email already exists" on doctor create | Orphan EMAIL/QID/PHONE lock from a previous failed attempt | `node scripts/cleanup-doctor-locks.js`. |
| New tab opens akwadona.com root instead of the deep link | Cognito hosted UI strips deep links | Already handled — `authGuard` saves `returnUrl` in localStorage and the AppComponent fallback navigates to it after sign-in. |
| Login from `www.akwadona.com` fails with S3 `AccessDenied` | DNS for `www` was pointed at S3 not CloudFront | Now fixed — `www` CNAME to `d378t54x9p802t.cloudfront.net`. |

---

### 9. Glossary

| Term | Meaning |
| --- | --- |
| SPA | Single-Page Application — the Angular front-end. |
| Service Worker (SW) | Browser background script that caches static assets + API responses, enables offline. |
| ngsw | Angular's Service Worker (`@angular/service-worker`) configured via `ngsw-config.json`. |
| IndexedDB | Browser-side database per origin. Holds the offline mutation queue + temp-id map. |
| Idempotency | Same action twice = same effect as once. Backed by an `X-Client-Request-Id` header + a server-side cache row. |
| Phase A–F | The offline-mode rollout phases: A=PWA shell, B=cache GETs, C=queue mutations, D=backend idempotency, E=offline pill, F=temp-id FK rewrite. |
| OIDC | OpenID Connect — the auth protocol Cognito speaks. |
| Cognito | AWS service that runs the sign-in page and issues JWTs. |
| JWT | JSON Web Token — proves who the user is. |
| `returnUrl` | The path the user was trying to reach before sign-in; saved in localStorage so deep-links survive. |
| Splash screen | The animated logo in `src/index.html` shown while the JS bundle loads. |
| Toast | The small notification that pops in the top-right (PrimeNG `MessageService`). |
| ABO/Rh | The standard blood compatibility check the blood bank module performs automatically. |
| SOAP note | Subjective / Objective / Assessment / Plan — clinical note structure. |
| PHI | Protected Health Information. |
| Last-write-wins | Conflict policy: whichever update reached the server last is kept. |
| Tab (Appointments) | The Upcoming / Past / All filter buttons in the appointments toolbar. |
| Multi-select column filter | The funnel icon on Type / Priority / Status columns opens a checkbox list of allowed values. |

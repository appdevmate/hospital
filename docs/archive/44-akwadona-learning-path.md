# 44 — Akwadona Learning Path (step-by-step guided tour)

> **Status:** Live. Last audited: 2026-10-04.
> **Audience:** Sami (the founder) re-learning his own system; a new senior engineer getting up to speed.
> **Goal:** by the end of this path, you can look at any part of Akwadona and say what it does, why it is shaped that way, and where in the code to find it.
> **Written using:** `../skills/akwadona-easy-english/SKILL.md` — short sentences, one analogy per concept, every short form expanded.

## 0. How to use this path

Six weeks, five sessions per week, 30–60 minutes each session.

Each session has the same shape:
1. **Read** — the exact docs and files to read, in order.
2. **Look** — the exact places to click in the AWS console or the repo (read-only; do not change anything).
3. **Draw** — a picture to sketch on paper. Drawing by hand forces understanding.
4. **Self-check** — two or three questions. If you cannot answer, re-read.

**Do not skip ahead** — later weeks assume earlier concepts. **Do not take notes in the code** — take notes in a notebook or a scratch markdown file, not in the real files.

Everything in this path is **read-only**. We are learning, not changing. If you spot a bug, write it in `backlog.md` and keep walking.

---

## Week 1 — The big picture (what, why, who)

**Goal:** by the end of this week, you can explain Akwadona in two minutes to a non-engineer.

### Day 1 — What is Akwadona
- **Read:** [`00-akwadona-explained.md`](00-akwadona-explained.md).
- **Look:** open `https://www.akwadona.com` in a browser; sign in as a test user; click around the landing dashboard.
- **Draw:** one circle "Akwadona" with three arrows out of it labelled "hospital", "doctor", "patient". Add a word next to each arrow for the main thing each gets.
- **Self-check:**
  - Who pays Akwadona?
  - Who logs in?
  - What is the one thing Akwadona does that paper could not?

### Day 2 — Why multi-tenant
- **Read:** [`akwadona-multitenant-setup.md`](akwadona-multitenant-setup.md) and the memory file [`tiryaq_multitenant.md`](tiryaq_multitenant.md) (via `memory_read`).
- **Look:** sign in to `https://tiryaq.akwadona.com` then to `https://alshifaa.akwadona.com`. Note the different logos; note the different users; note that the URL path pattern is identical.
- **Draw:** a block of flats — one building, many flats. Label the plumbing (shared), the front door (shared), each flat's lock (one per flat), and each flat's safe (one per flat).
- **Self-check:**
  - What is shared between tenants?
  - What is not shared?
  - Why not just one database per hospital?

### Day 3 — What zero-knowledge means
- **Read:** [`03-encryption-and-zero-knowledge.md`](03-encryption-and-zero-knowledge.md). Read it twice.
- **Look:** in the AWS console, go to KMS → Customer managed keys → filter by `alias/akwadona-tenant-`. Count how many keys there are. Click one; look at the "Key policy" tab and read it.
- **Draw:** a courier carrying a locked box. The courier is Akwadona. The box is the patient data. The key is in the hospital's safe. The courier can carry, store, move the box — but cannot open it.
- **Self-check:**
  - What does "zero-knowledge" promise?
  - What enforces it structurally (two things)?
  - If an engineer at Akwadona wanted to read a patient's name, what would they have to do, and why would it fail?

### Day 4 — The AWS services at a glance
- **Read:** [`02-aws-services-reference.md`](02-aws-services-reference.md) sections 0, 1, 2, 3, 6. Just those for today.
- **Look:** in the AWS console, open each of Cognito, KMS, CloudFront, IAM in a tab. Just look at the main page; do not click anything that changes.
- **Draw:** a simple architecture doodle. In the middle: "AkwadonaCdkStack". Four arrows out of it to boxes labelled "Cognito (user register)", "KMS (safes)", "CloudFront (CDN)", "IAM (badges)".
- **Self-check:**
  - What does Cognito store?
  - What is in a JWT (JSON Web Token)?
  - Why does CloudFront make the site faster?

### Day 5 — The business shape
- **Read:** [`40-sales-handbook.md`](40-sales-handbook.md). Pay attention to §3 (who we sell to) and §4 (ten differentiators).
- **Look:** open the live operator console at `https://www.akwadona.com/operator`. Note how little information is shown. Count the tabs.
- **Draw:** a two-column list. Left: the ten differentiators. Right: for each one, write "proof: <file>" using the proof column of the sales doc.
- **Self-check:**
  - Why would a Qatari hospital pick us over Epic?
  - Which three of the ten differentiators are structural and cannot be copied in six months?
  - Which two are table-stakes that any competitor can match?

**End of Week 1 reward:** write a two-paragraph email to an imaginary potential customer explaining what Akwadona is. Keep it under 200 words. If you cannot do it without jargon, re-read Day 1.

---

## Week 2 — The AWS infrastructure

**Goal:** by the end of this week, you can draw every AWS box in Akwadona and the arrows between them.

### Day 1 — The front door (CloudFront + ACM + WAF)
- **Read:** [`02-aws-services-reference.md`](02-aws-services-reference.md) §3, §4, §5.
- **Look:** in the AWS console, go to CloudFront → `EMIDMHCZ9PRK4`. Click "Behaviors". Count how many. Click "Origins". Note which S3 bucket is the origin. Click "General" — note that **no WAF (Web Application Firewall) web ACL is attached** (it is disabled to save cost; see `02-aws-services-reference.md` §5 banner). Then open API Gateway → `akwadona-api` → Stages → `$default` → "Default route throttling" to see the 200 r/s / 500 burst limit that stands in for it.
- **Draw:** a visitor's laptop on the left. An arrow to a box "CloudFront". Inside the box write "cached static files". Arrows from CloudFront to two boxes: "S3 bucket (origin)" and "API Gateway (origin)". Above CloudFront write "WAF filters here".
- **Self-check:**
  - What does CloudFront serve from S3?
  - What does CloudFront serve from API Gateway?
  - What does WAF block before it reaches us?

### Day 2 — The user register (Cognito)
- **Read:** [`02-aws-services-reference.md`](02-aws-services-reference.md) §1. Then [`akwadona-cdk/lambda/akwadona-pretoken/index.js`](../akwadona-cdk/lambda/akwadona-pretoken/index.js) — read the whole file.
- **Look:** AWS console → Cognito → `us-east-1_bpipvSdQi`. Look at "Users" (count them). Look at "Groups" (count them, note the names). Look at "App integration" → "App clients" (note the IDs). Look at "Sign-in" → "Pre token generation" (note which Lambda is attached).
- **Draw:** a sign-in flow: browser → Cognito (checks password) → Pre-token Lambda (adds tenantId + role) → browser gets JWT.
- **Self-check:**
  - What claims are in a JWT after login?
  - What does the Pre-token Lambda add that Cognito does not add by itself?
  - What happens if the Pre-token Lambda is slow (above 5 seconds)?

### Day 3 — The vault (KMS)
- **Read:** [`03-encryption-and-zero-knowledge.md`](03-encryption-and-zero-knowledge.md) again. [`04-hashed-search-fields.md`](04-hashed-search-fields.md).
- **Look:** AWS console → KMS → Customer managed keys. Count the `akwadona-tenant-*` keys. For one tenant, note there is a data key AND an HMAC (Hash-based Message Authentication Code) key. Click the data key; "Key policy"; find the operator deny line.
- **Draw:** two safes next to each hospital name. Label one "data CMK (Customer Managed Key) — unlocks patient fields", label the other "HMAC CMK — computes fingerprints for search". Add a red "X" through the operator's badge for the data CMK.
- **Self-check:**
  - Why does each tenant have TWO keys and not one?
  - What is a fingerprint for, and why don't we store the plain Qatari ID?
  - Why is the operator's "deny" in IAM policy enough to make zero-knowledge true?

### Day 4 — The badges (IAM) + the camera (CloudTrail)
- **Read:** [`02-aws-services-reference.md`](02-aws-services-reference.md) §6 and §8.
- **Look:** AWS console → IAM → Roles → filter `akwadona-`. Count. Pick one Lambda role. Read its "Permissions" tab. Then IAM → Roles → `akwadona-operator-*` → read the "Deny statements". Then CloudTrail → Event history → filter EventName = `Decrypt` for the last 24 hours. Note what you see.
- **Draw:** three visitor badges. Label one "doctor Lambda — can read patient rows for its tenantId". One "operator Lambda — can read everything except tenant CMKs". One "deploy user — can create resources but not read patient data".
- **Self-check:**
  - What is the difference between an IAM policy that is "allow" vs one that is "deny"?
  - Which beats which?
  - What would CloudTrail show if someone had bypassed the operator deny?

### Day 5 — Everything else at the perimeter (ACM, SES, EventBridge, Bedrock)
- **Read:** [`02-aws-services-reference.md`](02-aws-services-reference.md) §4, §9, §10, §11.
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

## Week 3 — The database (DynamoDB)

**Goal:** by the end of this week, you can look at any DynamoDB row and say which entity it is, which tenant it belongs to, and which GSI (Global Secondary Index) retrieves it.

### Day 1 — Why single-table
- **Read:** [`20-api-reference.md`](20-api-reference.md) sections 1 and 2. Also search the memory for `tiryaq_dynamodb_model.md` and read it.
- **Look:** AWS console → DynamoDB → Tables → `Hospital` → Items. Scroll through 20–30 rows. Note the mix of EntityTypes.
- **Draw:** a filing cabinet with coloured labels. Label each colour an EntityType ("PATIENT", "DOCTOR", "APPOINTMENT", "AUDIT", ...). Add a note on each: "all under one cabinet, filtered by colour".
- **Self-check:**
  - What is the partition key (PK)?
  - What is the sort key (SK)?
  - What is the EntityType attribute for?

### Day 2 — The GSIs (Global Secondary Indexes)
- **Read:** `tiryaq_dynamodb_model.md` in memory — the section on the 9 GSIs.
- **Look:** AWS console → DynamoDB → Hospital → Indexes. Count them. Click one and read its "Partition key / Sort key".
- **Draw:** for each GSI, a line: "<GSI name>: PK=<x>, SK=<y>, used when: <query shape>". Nine lines total.
- **Self-check:**
  - What is the difference between `tenant-entityType-index` and `dataClass-index`?
  - Which GSI answers "all patients for tenant T"?
  - Why does `updatedAt: null` on a new row break `dataClass-index`?

### Day 3 — Encrypted fields vs hashed fields
- **Read:** [`04-hashed-search-fields.md`](04-hashed-search-fields.md). Then [`akwadona-cdk/lambda/akwadona-create-patient/index.js`](../akwadona-cdk/lambda/akwadona-create-patient/index.js) — in full. It is the canonical PHI-write example.
- **Look:** AWS console → DynamoDB → Items → pick one PATIENT row. Note which fields are long base64-looking strings (encrypted) and which are hex strings (hashes).
- **Draw:** a PATIENT row with 10 attributes. For each one, label it "plaintext", "encrypted", or "hashed". Think about why each choice was made.
- **Self-check:**
  - What goes in `qid` vs `qidHash`?
  - What goes in `name` vs `nameHash` (if it exists)?
  - Why is `createdAt` plaintext?

### Day 4 — The unique-lock pattern
- **Read:** `akwadona-create-patient/index.js` again, this time focus on the `TransactWriteCommand` block.
- **Look:** in a PATIENT create, two or three rows are written atomically. Pick a QID in DynamoDB and search for `QID_LOCK#<its-hash>`. Note that the lock row shares the hash.
- **Draw:** a transaction write: `PATIENT#<uuid>` + `QID_LOCK#<qidHash>` + `PHONE_LOCK#<phoneHash>` — all three succeed or all three fail.
- **Self-check:**
  - What goes wrong if two doctors create a patient with the same QID at the same moment, without the lock row?
  - Why do we store the lock row with the HASH, not the raw QID?
  - Which error code does Dynamo return if the lock is already held?

### Day 5 — The audit trail inside the table
- **Read:** search `grep -r "EntityType.*AUDIT" akwadona-cdk/lambda/` — list every Lambda that writes AUDIT rows.
- **Look:** AWS console → DynamoDB → scan with filter `EntityType = AUDIT` → look at 10 recent rows. Note what fields appear.
- **Draw:** a timeline: a doctor's shift from 8am to 5pm, with little marks for every AUDIT row generated. Label each mark with the action (CREATE_PATIENT, UPDATE_PRESCRIPTION, VIEW_PATIENT, ...).
- **Self-check:**
  - Which actions MUST produce an audit row?
  - Which fields are always in an audit row?
  - How long are audit rows kept in Dynamo vs CloudTrail?

**End of Week 3 reward:** pick one patient row and trace it: how was it inserted, what GSIs will find it, which fields are encrypted, which Lambda deletes it, how is the deletion logged.

---

## Week 4 — The backend code (Lambda)

**Goal:** by the end of this week, you can trace any API request end-to-end and read any Lambda in under 10 minutes.

### Day 1 — The shape of every Lambda
- **Read:** `../skills/akwadona-code-standards/SKILL.md` — the whole skill, especially §3 (handler skeleton).
- **Look:** `akwadona-cdk/lambda/akwadona-create-patient/index.js` — the top 60 lines. Then `akwadona-cdk/lambda/akwadona-list-patients/index.js` — the top 60 lines. Compare them.
- **Draw:** the lifecycle of one Lambda invocation: event in → extract claims → validate → do work (DynamoDB / KMS / SES) → write audit → return response.
- **Self-check:**
  - What's inlined vs required from a shared folder, and why?
  - Where does the Lambda get `tenantId` from — the request body, or the JWT?
  - Why that choice?

### Day 2 — The Lambda factory
- **Read:** `akwadona-cdk/lib/akwadona-cdk-stack.ts` — find the `createLambda(...)` helper function. Read it in full.
- **Look:** count the uses of `createLambda` in the stack. Note the arguments passed each time. Note how memory size and timeout differ.
- **Draw:** a factory conveyor belt. In goes `name + path + env`. Out comes `{Lambda function, IAM role, log group, API Gateway integration}`.
- **Self-check:**
  - What's the default memory size and timeout?
  - When do we override them?
  - What stops us creating 500 Lambdas (hint: CFN resource ceiling)?

### Day 3 — The 42 Lambdas, grouped
- **Read:** memory file `tiryaq_backend_lambdas.md` — the full list.
- **Look:** `ls akwadona-cdk/lambda/` — count the folders. For each one, open the `index.js` and read the first 20 lines (the comment header + the `rawPath` dispatch, if any).
- **Draw:** a table with columns: group (Patients / Doctors / Payments / Pharmacy / Blood Bank / Admin / Operator / Scribe / Audit / Other), Lambdas in that group, main entities touched.
- **Self-check:**
  - Which Lambdas are "catch-all" (one Lambda handling many routes via rawPath)?
  - Which ones are single-route?
  - Why do we mix the two patterns?

### Day 4 — One end-to-end trace
- **Read:** [`41-developer-onboarding.md`](41-developer-onboarding.md) §4.3 — the end-to-end trace of `POST /patients`.
- **Look:** open the browser dev tools on `www.akwadona.com`. Create a test patient. Watch the Network tab. Note the request URL, the headers, the response.
- **Draw:** a swimlane: browser → interceptors → CloudFront → API Gateway (JWT check) → Lambda → KMS (encrypt) → DynamoDB (transact write) → back out. Add timing (approximately): CloudFront ~1ms, API Gateway ~5ms, Lambda cold start ~400ms warm ~20ms, KMS ~15ms, Dynamo transact ~15ms.
- **Self-check:**
  - What is the slowest step?
  - If the Lambda cold-starts, where does the latency go?
  - What breaks the trace if the JWT is expired?

### Day 5 — The known foot-guns
- **Read:** `../skills/akwadona-security-review/SKILL.md` and `../skills/akwadona-code-standards/SKILL.md` — look specifically at the "known landmines" sections.
- **Look:** `grep -n "updatedAt: null" akwadona-cdk/lambda/` — do any files have this? If yes, that's a bug — add to `backlog.md` with a note.
- **Draw:** a "wall of shame" list: `updatedAt: null`, `require('../_shared/...')`, missing tenantId filter, wildcard CORS, cross-tenant 403 instead of 404.
- **Self-check:**
  - Why does `updatedAt: null` break the `dataClass-index` GSI?
  - What is wrong with `require('../_shared/compliance')` in a Lambda?
  - If a user asks for another tenant's resource, do we return 403 or 404? Why?

**End of Week 4 reward:** pick ONE Lambda (not create-patient) and rewrite its comment header to match the easy-English skill. Do NOT change behaviour. Open a tiny PR.

---

## Week 5 — The frontend code (Angular)

**Goal:** by the end of this week, you can navigate the Angular app, know where every page lives, and read any service file in under 5 minutes.

### Day 1 — The Angular shape
- **Read:** [`19-ui-architecture.md`](19-ui-architecture.md) sections 1–4.
- **Look:** `src/app/` tree. `ls src/app/components/`. `ls src/app/services/`. Note the folder-per-feature pattern.
- **Draw:** the folder tree, one level deep, with a one-word description beside each folder.
- **Self-check:**
  - What is a "standalone component" in Angular 20?
  - What does the Angular signal API replace from older Angular?
  - What is PrimeNG vs Tailwind — which does what?

### Day 2 — Routing + guards
- **Read:** [`19-ui-architecture.md`](19-ui-architecture.md) §3 and §5.
- **Look:** `src/app/app.routes.ts`. Trace a path: a user clicks "Patients" → which route → which component → which guard runs.
- **Draw:** the route tree with role-set labels on each node (`admin`, `doctor`, `nurse`, `pharmacist`, `operator`).
- **Self-check:**
  - What is the difference between an AuthGuard and a RoleGuard?
  - Why do we need both?
  - What happens if a user with wrong role tries to visit a protected route?

### Day 3 — Interceptors and services
- **Read:** [`19-ui-architecture.md`](19-ui-architecture.md) §6 and §7. Also `src/app/services/auth.service.ts` and `src/app/services/patient.service.ts`.
- **Look:** `src/app/interceptors/`. Open each interceptor and read it. Note the order they run in.
- **Draw:** the HTTP request pipeline: component → service → offline queue interceptor → auth interceptor → error interceptor → network.
- **Self-check:**
  - What does the offline queue interceptor do when the network is down?
  - What does the auth interceptor add to every request?
  - What does the error interceptor do with a 401 response?

### Day 4 — State, signals, and change detection
- **Read:** [`19-ui-architecture.md`](19-ui-architecture.md) §8. Then look at `src/app/services/tenant.service.ts` — it uses signals.
- **Look:** `src/app/components/dashboard/dashboard.component.ts` — look for `signal(...)` and `computed(...)`. Note how templates read signals with `()`.
- **Draw:** a signal graph: `rawPatients` (signal) → `filteredPatients` (computed) → `template rendering`.
- **Self-check:**
  - Why do we prefer signals over observables for component state?
  - What triggers change detection in a signal-based component?
  - What is `ChangeDetectionStrategy.OnPush`, and when should every new component use it?

### Day 5 — PWA, offline, i18n
- **Read:** [`19-ui-architecture.md`](19-ui-architecture.md) §9, §10. [`13-i18n.md`](13-i18n.md).
- **Look:** DevTools → Application → Service Workers (should show `ngsw-worker.js` active). Application → IndexedDB → check for the offline queue store. Then switch languages in the app and note the RTL (Right-to-Left) layout for Arabic.
- **Draw:** the offline write flow: user types → component writes to local IndexedDB queue → service worker intercepts → when online, drains queue to backend → success / retry.
- **Self-check:**
  - What happens to a POST while offline?
  - Which actions are safe to queue, and which are not?
  - How does the i18n service switch languages — compile-time or runtime?

**End of Week 5 reward:** take any component, read it top to bottom, and write a one-paragraph summary in a notebook.

---

## Week 6 — Operations (deploy, monitor, incident)

**Goal:** by the end of this week, you can deploy, monitor, and recover from an incident on your own.

### Day 1 — The deploy flow
- **Read:** [`18-deploy-and-operations.md`](18-deploy-and-operations.md) in full. Also `../skills/akwadona-deploy-safety/SKILL.md`.
- **Look:** `scripts/` — list every `.ps1` file. Open `scripts/deploy-frontend.ps1` and read it. Then open `scripts/deploy-lambda.ps1`. Note the pre-flight checks.
- **Draw:** three parallel ladders: "frontend-only", "Lambda-only", "backend (CDK)". For each, write the exact commands in order.
- **Self-check:**
  - What is the two-phase alias deploy, and when is it needed?
  - What happens if you run `aws s3 sync` without KMS Encrypt in IAM?
  - What happens if you forget to invalidate CloudFront after a frontend deploy?

### Day 2 — CloudWatch monitoring
- **Read:** [`25-monitoring-and-observability.md`](25-monitoring-and-observability.md) in full.
- **Look:** AWS console → CloudWatch → Alarms → list all. Read what each one triggers on. Then CloudWatch → Logs Insights → run the query `fields @timestamp, @message | filter @message like /ERROR/ | limit 20`.
- **Draw:** a dashboard sketch: 6 widgets you'd put on the wall if you were monitoring Akwadona (invocations, errors, p99 latency, DynamoDB throttles, 5xx rate, auth failures).
- **Self-check:**
  - Which three alarms would wake someone at 3am?
  - Which three alarms are "look at tomorrow"?
  - What is a "custom metric" and when do we add one?

### Day 3 — Incident response drill
- **Read:** [`26-incident-response.md`](26-incident-response.md). Also `../skills/akwadona-incident-response/SKILL.md`.
- **Look:** run `node scripts/cross-tenant-probe.js` locally. Note what it checks. Then look at the latest audit S3 object: `aws s3 ls s3://akwadona-audit-logs/ --recursive | tail -3`.
- **Draw:** a decision tree for a 3am page: "symptom → severity → first action → next action". Make three branches: "all tenants down", "one tenant down", "possible PHI exposure".
- **Self-check:**
  - What is the regulatory clock for a PDPPL breach notification?
  - For HIPAA?
  - For GDPR?

### Day 4 — Rollback and recovery
- **Read:** [`18-deploy-and-operations.md`](18-deploy-and-operations.md) §7 (rollback). [`12-teardown-and-recover.md`](12-teardown-and-recover.md).
- **Look:** `scripts/recover.ps1` and `scripts/teardown.ps1`. Read them. Note the ID placeholders.
- **Draw:** a rollback flow for the three deploy types from Week 6 Day 1. Add: how long does each take; what does the user see during the rollback.
- **Self-check:**
  - If a frontend deploy breaks login, what is the fastest rollback?
  - If a CDK stack update is in progress and fails halfway, what does CloudFormation do automatically?
  - What is the one post-teardown mistake you must avoid?

### Day 5 — The whole system, one more time
- **Read:** go back to [`00-akwadona-explained.md`](00-akwadona-explained.md). Read it again, slowly.
- **Look:** sign in as every role (admin, doctor, nurse, pharmacist, operator) and click through the main workflow for each.
- **Draw:** your final one-page architecture. Compare with the diagram you drew at the end of Week 2 — note what you'd add now.
- **Self-check:**
  - What would you change about the architecture if you were starting over?
  - What is the single biggest technical risk right now?
  - What is the single biggest business risk right now?

**End of Week 6 reward:** write a one-page document called "Akwadona in 2026-10 — what it is and where it's going". Save it as `docs/00-personal-notes.md` (not committed) and keep editing it as you learn more.

---

## Appendix A — The cheat-sheet (one page you can print)

**The ten things to remember:**

1. One stack, many hospitals. Shared DynamoDB table, one Cognito pool, per-tenant KMS keys.
2. The `tenantId` on the JWT is the only authority on who owns which data.
3. PHI is encrypted at write-time with the tenant's data CMK. Nothing in the row shows the plaintext.
4. Fingerprints (HMAC) are used for equality search on encrypted fields.
5. The operator Lambda has an explicit `kms:Decrypt` DENY on every tenant key. That is the structural zero-knowledge guarantee.
6. Every Lambda inlines its `_shared` helpers. `require('../_shared/foo')` fails because CDK packages one folder per Lambda.
7. `updatedAt` must be `now.toISOString()` on every write, never `null`, because `dataClass-index` uses it.
8. Cross-tenant resource access returns 404, not 403, so we don't leak existence.
9. CFN has a 500-resource ceiling per stack. We use catch-all routes and shared ManagedPolicies to stay under it.
10. The two-phase alias deploy (`-c skipAliases=1` then no flag) is the only way to recover from a teardown without a DNS race.

**The six commands you'll use most:**
```powershell
# Who am I?
aws sts get-caller-identity --profile akwadona-dev

# What's deployed?
aws cloudformation describe-stacks --stack-name AkwadonaCdkStack --query "Stacks[0].StackStatus"

# Any 5xx in the last hour?
aws logs filter-log-events --log-group-name /aws/lambda/akwadona-create-patient --filter-pattern "ERROR" --start-time $(([DateTimeOffset](Get-Date).AddHours(-1)).ToUnixTimeMilliseconds())

# Cross-tenant isolation OK?
node scripts/cross-tenant-probe.js

# Who tried to decrypt tenant keys today?
aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=Decrypt --max-items 20

# Invalidate CloudFront after frontend deploy
aws cloudfront create-invalidation --distribution-id EMIDMHCZ9PRK4 --paths "/*"
```

---

## Appendix B — If you only have one hour

Read, in order:
1. [`00-akwadona-explained.md`](00-akwadona-explained.md) (15 min)
2. [`02-aws-services-reference.md`](02-aws-services-reference.md) sections 0–7 (20 min)
3. [`03-encryption-and-zero-knowledge.md`](03-encryption-and-zero-knowledge.md) (15 min)
4. [`14-tenant-row-enforcement.md`](14-tenant-row-enforcement.md) (10 min)

You will have the headline understanding of the platform.

---

## Appendix C — The reading order, as a single ordered list

If you want to just blast through everything, here is the full order:

1. `00-akwadona-explained.md`
2. `01-lambda-and-infrastructure.md`
3. `02-aws-services-reference.md` (this doc's companion)
4. `03-encryption-and-zero-knowledge.md`
5. `04-hashed-search-fields.md`
6. `05a-hipaa-security-rule-mapping.md`
7. `05b-pdppl-qatar-compliance.md`
8. `05c-gdpr-compliance-and-dpia.md`
9. `05d-baa-template.md`
10. `05e-dpa-template.md`
11. `05f-compliance-overview.md`
12. `06-scalability-report.md`
13. `07-operator-console.md`
14. `08-throttling.md`
15. `09-rename-runbook.md` (historical; skip on first pass)
16. `10-cognito-custom-domain.md`
17. `11-customer-migration-guide.md`
18. `12-teardown-and-recover.md`
19. `13-i18n.md`
20. `14-tenant-row-enforcement.md`
21. `15-tenant-onboarding-wizard.md`
22. `16-ses-setup.md`
23. `17-test-fixtures.md`
24. `18-deploy-and-operations.md`
25. `19-ui-architecture.md`
26. `20-api-reference.md`
27. `25-monitoring-and-observability.md`
28. `26-incident-response.md`
29. `32-blood-bank-module.md`
30. `40-sales-handbook.md`
31. `41-developer-onboarding.md`
32. `44-akwadona-learning-path.md` (this doc — review at the end)

Then every SKILL.md in `../skills/`.

---

## References
- All of `docs/`.
- All of `../skills/`.
- Memory files under `/projects/019c84fd-84ef-7341-ae18-6c51a1a48c78/tiryaq_*.md`.

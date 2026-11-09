: # 02 — AWS Services Reference (every service except DynamoDB, S3, Lambda, API Gateway)

> **Status:** Live. Last audited: 2026-10-04.
> **Audience:** Anyone who wants to understand what every AWS service in Akwadona does, in plain English, with a real-life picture of each one.
> **Written using:** `../skills/akwadona-easy-english/SKILL.md` — short sentences, one analogy per concept, every short form expanded on first use.
> **Excludes (covered elsewhere):**
> - **DynamoDB** (the database) → [`20-api-reference.md`](20-api-reference.md) and future `22-data-model.md`.
> - **S3** (file storage) → [`01-lambda-and-infrastructure.md`](01-lambda-and-infrastructure.md).
> - **Lambda** (the compute) → [`01-lambda-and-infrastructure.md`](01-lambda-and-infrastructure.md).
> - **API Gateway** (the HTTP front door) → [`20-api-reference.md`](20-api-reference.md).

## 0. How to read this doc

Each service gets the same six-section shape:

1. **What it is** — one plain sentence.
2. **Real-life example** — one everyday picture.
3. **What Akwadona uses it for** — the specific job in our platform.
4. **Where to find it in AWS Console** — the exact URL path.
5. **Where to find it in our code** — the file(s) + roughly which lines.
6. **Why we chose it over alternatives** — the trade-off in one line.

AWS is the short form of **AWS** (Amazon Web Services) — Amazon's cloud platform. Everything below is part of AWS.

---

## 1. Amazon Cognito — the user register

### 1.1 What it is
Cognito is AWS's user-register service. It stores accounts, checks passwords, and hands out short-lived passes.

### 1.2 Real-life example
Think of the guest register at a hotel chain. When you arrive, the front desk checks your passport, writes you into the book, and gives you a plastic room-card. The room-card lets you open the lobby, the lift, your floor, and your room — but it stops working at check-out. Cognito is that register. The room-card is the **JWT** (JSON Web Token).

### 1.3 What Akwadona uses it for
- Stores one user record for every doctor, nurse, pharmacist, admin, and platform operator across every hospital.
- Checks the password (or an SMS code) at sign-in.
- Issues a JWT that lives for ~1 hour and names three things about the user: who they are, which hospital they belong to (`tenantId`), and which role they have (doctor / nurse / admin / operator).
- Supports "Forgot password?" and admin password resets.

Our pool holds every tenant's users together. The `tenantId` on the token tells the backend which hospital this user belongs to.

### 1.4 Where in AWS Console
`https://us-east-1.console.aws.amazon.com/cognito/v2/idp/user-pools/us-east-1_bpipvSdQi/users`

The pool ID is `us-east-1_bpipvSdQi` as of 2026-10-04. If the stack was torn down, look it up again with `aws cognito-idp list-user-pools --max-results 10`.

### 1.5 Where in our code
- CDK (Cloud Development Kit) stack: `akwadona-cdk/lib/akwadona-cdk-stack.ts` — search for `new cognito.UserPool`. Note `mfa: cognito.Mfa.OPTIONAL` (was OFF until 2026-10-29) and `standardThreatProtectionMode: FULL_FUNCTION` (Advanced Security, billed per active user).
- Pre-token Lambda (the receptionist that stamps the pass): `akwadona-cdk/lambda/akwadona-pretoken/index.js` — adds `tenantId`, `doctorId`, `roles` to the JWT.
- Angular login page: `src/app/components/auth/login.component.ts` — calls Cognito directly from the browser.
- Angular guards and interceptors: `src/app/services/auth.service.ts` + `src/app/interceptors/auth.interceptor.ts`.

### 1.6 Why Cognito, not something else
Cognito is deeply integrated with API Gateway. API Gateway can check a Cognito JWT without any code of ours. Auth0 or Okta would mean building our own JWT verifier and paying per user. Cognito's free tier covers our current scale.

---

## 2. AWS KMS (Key Management Service) — the hotel-room safe

### 2.1 What it is
**KMS** (Key Management Service) is AWS's key vault. It generates, stores, and uses encryption keys without ever letting anyone (including Amazon staff) copy the raw key out.

### 2.2 Real-life example
Each hotel room has its own in-room safe. You put your passport in, lock it, and only you have the combination. The hotel staff can see the safe exists, can even replace it, but cannot open it. KMS keys work the same way — they live inside an AWS **HSM** (Hardware Security Module), and even Amazon engineers cannot export them.

### 2.3 What Akwadona uses it for
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

### 2.4 Where in AWS Console
`https://us-east-1.console.aws.amazon.com/kms/home?region=us-east-1#/kms/keys`

Filter by alias prefix `akwadona-`.

### 2.5 Where in our code
- CDK key creation: `akwadona-cdk/lib/akwadona-cdk-stack.ts` — search for `new kms.Key`.
- Tenant key setup (two per hospital, created by the onboarding wizard): inside `akwadona-cdk/lambda/akwadona-operator-console/index.js` — search for `CreateKeyCommand`. The wizard tags each key `akwadona:tenantId` + `akwadona:purpose` (`data` | `hmac`) and writes both ARNs to the hospital's `TENANT#<slug>` row; `crypto.js` reads them from there at runtime.
- Encrypt/decrypt helpers inlined into every Lambda that touches patient data: see `akwadona-cdk/lambda/akwadona-create-patient/index.js` for the canonical pattern.
- The operator deny policy: `akwadona-cdk/lib/akwadona-cdk-stack.ts` — search for `addToPolicy.*Deny.*kms`.

### 2.6 Why KMS, not our own encryption
Rolling your own key management is the fastest way to lose keys and lose data. KMS has FIPS 140-2 Level 3 HSMs, audit trails on every use, and 99.999% availability. The per-use cost is $0.03 per 10,000 operations — cheap for our volume.

---

## 3. Amazon CloudFront — the corner shop near your home

### 3.1 What it is
CloudFront is AWS's **CDN** (Content Delivery Network). It caches our website at hundreds of locations around the world so visitors load pages from a server near them.

### 3.2 Real-life example
Imagine the main warehouse of a bookshop is in London. If a reader in Doha wants a book, shipping takes a week. So the shop opens a tiny branch in Doha that stocks the top 100 titles. The reader walks in, gets the book instantly. CloudFront is that tiny branch, repeated in 400+ cities. Our main warehouse is the S3 bucket in `us-east-1` (Virginia); the Doha branch is a CloudFront "edge location".

### 3.3 What Akwadona uses it for
- Serves our Angular website — `index.html`, JavaScript bundles, images, fonts — from the edge location nearest the visitor.
- Caches static files for 1 year (we rename them on every build to force a fresh fetch).
- Caches `index.html` for 0 seconds (so a fresh deploy appears instantly).
- Terminates **TLS** (Transport Layer Security — the "s" in `https`) with our ACM certificate.
- Routes traffic for every tenant subdomain (`tiryaq.akwadona.com`, `alshifaa.akwadona.com`, `www.akwadona.com`) to the same bucket. The frontend reads the hostname to decide which hospital's logo to show.

### 3.4 Where in AWS Console
`https://us-east-1.console.aws.amazon.com/cloudfront/v4/home#/distributions/EMIDMHCZ9PRK4`

Our distribution ID is `EMIDMHCZ9PRK4`; its raw domain is `d37kqu4c91mlc4.cloudfront.net` (GoDaddy CNAMEs point here). `d6i7iwknkj0bg.cloudfront.net` was the Tiryaq-era distribution destroyed in the 2026-06-30 teardown — it was still in the CORS allow-list and Cognito callback URLs until the 2026-10-29 cleanup.

### 3.5 Where in our code
- CDK distribution: `akwadona-cdk/lib/akwadona-cdk-stack.ts` — search for `new cloudfront.Distribution`.
- Angular build output pointed at CloudFront: `angular.json` + `src/environments/environment.prod.ts`.
- Cache invalidation command (run after every frontend deploy): `scripts/deploy-frontend.ps1` — see also [`18-deploy-and-operations.md`](18-deploy-and-operations.md) §4.

### 3.6 Why CloudFront, not just serve S3 directly
S3 is a warehouse — one physical location, slow for visitors on other continents. CloudFront is the corner-shop network on top. It also gives us TLS termination, custom domains, HTTP/2, and WAF integration — none of which S3 does on its own.

---

## 4. AWS Certificate Manager (ACM) — the free, auto-renewing padlock

### 4.1 What it is
**ACM** (AWS Certificate Manager) issues and renews TLS certificates for free. A TLS certificate is what makes a URL start with `https` instead of `http`, and what makes the padlock icon show in the browser.

### 4.2 Real-life example
Think of a notary who stamps a document to prove it is really yours. The browser sees the stamp when it loads your site and tells the user "yes, this is really akwadona.com, not an imposter". The stamp expires every year. ACM is the notary — and it re-stamps the document automatically before it expires.

### 4.3 What Akwadona uses it for
- One wildcard certificate for `*.akwadona.com` + `akwadona.com` — covers `www`, `tiryaq`, `alshifaa`, and any future tenant subdomain in one certificate.
- One certificate for `auth.akwadona.com` — the custom Cognito domain.
- ACM renews both certificates automatically, no action needed from us.

Wildcard means: the asterisk `*` matches any single subdomain. So `*.akwadona.com` covers `anything.akwadona.com`, but not `foo.bar.akwadona.com` (two levels deep).

### 4.4 Where in AWS Console
`https://us-east-1.console.aws.amazon.com/acm/home?region=us-east-1#/certificates/list`

CloudFront requires the certificate to be in `us-east-1` even if the rest of the stack is in another region.

### 4.5 Where in our code
- CDK certificate lookup: `akwadona-cdk/lib/akwadona-cdk-stack.ts` — search for `acm.Certificate.fromCertificateArn`.
- The certificate was created once by hand via `aws acm request-certificate` — not via CDK — so that teardown of the stack does not destroy the certificate.

### 4.6 Why ACM, not Let's Encrypt or GoDaddy
Both work, but ACM is free, auto-renewing, and plugs directly into CloudFront with no server to patch. Let's Encrypt would need a cron job we have to maintain. GoDaddy charges $100+/year per certificate.

---

## 5. AWS WAF (Web Application Firewall) — the bouncer at the door

> **Status: DISABLED as of 2026-10-29.** The edge stack that owns the WebACL is commented out in `akwadona-cdk/bin/akwadona-cdk.ts` ("temporarily disabled to stop charges") and `webAclId` is commented out on the distribution. The CloudFront distribution currently has **no WAF attached**. The section below describes what it does when re-enabled; the 2026-10-29 API Gateway stage throttle is the interim first-line defence. Re-enabling is a one-line change in `bin/akwadona-cdk.ts` + `lib/akwadona-cdk-stack.ts` and ~$10/month.

### 5.1 What it is
**WAF** (Web Application Firewall) sits in front of our site and blocks known-bad traffic before it reaches us.

### 5.2 Real-life example
Picture a nightclub. The bouncer at the door turns away people who are too drunk, carrying weapons, or on the banned-persons list — before they get inside and cause trouble. WAF is that bouncer. The "banned-persons list" is a set of patterns like "known **SQL** (Structured Query Language) injection strings", "requests from IPs that attacked us last week", or "more than 100 requests per minute from one address".

### 5.3 What Akwadona uses it for (when enabled)
- AWS "Managed Rules — Core rule set" (common exploits).
- AWS "Known Bad Inputs" ruleset.
- Per-source-IP rate limit.
- Attached to the CloudFront distribution — so it filters ALL traffic before it reaches our website. (The API is called directly on its execute-api domain, so WAF-on-CloudFront does not cover API calls; that is what the stage throttle is for.)

### 5.4 Where in AWS Console
`https://us-east-1.console.aws.amazon.com/wafv2/homev2/web-acls?region=global`

When deployed, the WebACL is named `akwadona-edge-acl`, scope `CLOUDFRONT` (global, must live in `us-east-1`).

### 5.5 Where in our code
- CDK WAF: `akwadona-cdk/lib/akwadona-edge-stack.ts` (`AkwadonaEdgeStack`, `new wafv2.CfnWebACL`). Wired into the main stack through `props.webAclArn` — both currently commented out.

### 5.6 Why WAF, not just rate-limit in Lambda
Lambda runs AFTER the request has already arrived. WAF blocks before. That saves money (we don't pay for Lambda invocations we don't want), reduces attack surface, and absorbs volume we could never scale through.

---

## 6. AWS IAM (Identity and Access Management) — visitor badges with permission lists

### 6.1 What it is
**IAM** (Identity and Access Management) is how AWS decides which service can do which action on which resource.

### 6.2 Real-life example
In a large office building, every visitor gets a badge. Some badges open only the lobby. Some open the lobby plus floor 3. Some open everything except the server room. The badge is checked at every door automatically. IAM is the badge system. The badge's permission list is called an "IAM policy". The person or service wearing the badge is an "IAM role".

### 6.3 What Akwadona uses it for
- Every Lambda runs under an IAM role. The role decides which DynamoDB table it can read, which KMS key it can use, which S3 bucket it can write to.
- The deploy user has a role that lets it update the CDK stack but NOT read any patient data.
- The operator Lambda has an **explicit deny** on `kms:Decrypt` for every tenant key — this is what makes "zero-knowledge" structurally enforced.
- The read-only developer role has `arn:aws:iam::aws:policy/ReadOnlyAccess` — can look at everything but change nothing.

Explicit deny beats explicit allow in IAM. So even if someone accidentally adds an "allow decrypt" policy, the deny wins. That is the belt-and-braces that makes operator access provably safe.

### 6.4 Where in AWS Console
`https://us-east-1.console.aws.amazon.com/iamv2/home#/roles`

Filter by `akwadona-`.

### 6.5 Where in our code
- CDK role definitions: `akwadona-cdk/lib/akwadona-cdk-stack.ts` — search for `new iam.Role` and `new iam.ManagedPolicy`.
- The operator deny policy: `akwadona-cdk/lib/akwadona-cdk-stack.ts` — search for the comment `OPERATOR_DENY_KMS`.
- Each Lambda's role is created inside its factory call — see §4 of [`19-ui-architecture.md`](19-ui-architecture.md)-style patterns, applied in `lib/akwadona-cdk-stack.ts`.

### 6.6 Why IAM, not application-level checks
IAM is enforced by AWS itself, before our code runs. If our code has a bug and tries to read another hospital's data, IAM blocks the API call and returns `AccessDenied`. Our bug does not become a data breach.

---

## 7. Amazon CloudWatch — the dashboard and the alarm panel

### 7.1 What it is
CloudWatch collects three things: text logs that services write, numeric metrics that services measure, and alarms that go off when a metric crosses a line.

### 7.2 Real-life example
Think of a car dashboard. The speedometer and fuel gauge are metrics. The dashcam recording is the log. The "fuel low" light is the alarm. CloudWatch is all three for every AWS service we run.

### 7.3 What Akwadona uses it for
- **Logs:** every Lambda writes its `console.log` output to CloudWatch Logs. One log group per Lambda, named `/aws/lambda/akwadona-<function>`.
- **Metrics (free):** AWS auto-publishes Lambda invocation count, duration, errors, DynamoDB request count, API Gateway 4xx/5xx counts.
- **Metrics (custom):** we publish `Akwadona/Throttle` when a user hits our rate limit, so we can see which tenant is being hammered.
- **Alarms:** two exist as of 2026-10-29 — `akwadona-api-5xx` (any 5xx in 5 min) and `akwadona-lambda-errors` (any Lambda error in 5 min), both routed to SNS topic `akwadona-alarms`. There were **none** before that date. [`25-monitoring-and-observability.md`](25-monitoring-and-observability.md) §4 lists the further alarms to add once the stack is split (the 500-resource ceiling is why only two were added).

### 7.4 Where in AWS Console
- Logs: `https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups`
- Metrics: `https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#metricsV2:`
- Alarms: `https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#alarmsV2:`

### 7.5 Where in our code
- Alarm definitions: `akwadona-cdk/lib/akwadona-cdk-stack.ts` — search for `new cloudwatch.Alarm`.
- Custom metric publishing: `akwadona-cdk/lambda/_shared/throttle.js` (copied into every Lambda folder) — `PutMetricData` to namespace `Akwadona/Throttle` on each 429.
- Pre-written log queries: [`25-monitoring-and-observability.md`](25-monitoring-and-observability.md) §5.

### 7.6 Why CloudWatch, not Datadog or New Relic
Datadog and New Relic are better products with better dashboards. They cost $15–$30 per host per month. For a founder-run startup, CloudWatch's free tier (10 custom metrics, 5GB of logs ingested) is enough. We can swap in Datadog later by shipping logs via a Kinesis Firehose stream.

---

## 8. AWS CloudTrail — the CCTV tape of the AWS account

### 8.1 What it is
CloudTrail records every API call made against our AWS account. Every click in the console, every CLI command, every SDK call from a Lambda — all recorded with who, what, when, from which IP.

### 8.2 Real-life example
Think of CCTV cameras pointed at every door of the office. If a safe is opened, the tape shows which badge opened it, at what time, from inside the building or remotely. CloudTrail is that tape, replayable for 90 days (and archived forever to our audit S3 bucket).

### 8.3 What Akwadona uses it for
- Compliance: PDPPL and HIPAA both require an immutable audit log of administrative actions on the system.
- Incident response: if an alarm fires, we query CloudTrail to see who did what in the window before.
- Zero-knowledge proof: we can show auditors that the operator role has never successfully called `kms:Decrypt` on a tenant key.
- The audit S3 bucket uses Object Lock (write-once, read-many) with a 7-year retention — so even an attacker with full admin cannot delete the tape.

### 8.4 Where in AWS Console
- Event history: `https://us-east-1.console.aws.amazon.com/cloudtrail/home?region=us-east-1#/events`
- Our trail (multi-region, log file validation on): `https://us-east-1.console.aws.amazon.com/cloudtrail/home?region=us-east-1#/trails`

### 8.5 Where in our code
- CDK trail: `akwadona-cdk/lib/akwadona-cdk-stack.ts` — search for `new cloudtrail.Trail`.
- Query example commands: [`25-monitoring-and-observability.md`](25-monitoring-and-observability.md) §6.

### 8.6 Why CloudTrail, not just application logs
Application logs capture what OUR code did. CloudTrail captures what the AWS account did — including console clicks, CLI commands, and actions taken by other AWS services on our behalf. Both are needed. CloudTrail is the one auditors ask for first.

---

## 9. Amazon EventBridge — the office PA system

### 9.1 What it is
EventBridge is AWS's event bus. Services emit events ("a user logged in", "a file was uploaded", "it's 6am"). EventBridge routes those events to one or more targets (Lambda, SNS topic, SQS queue).

### 9.2 Real-life example
Think of the PA (Public Address) system in an airport. When a flight is boarding, the announcer calls it on the PA, and the people who need to hear (passengers for that gate) react. Other people ignore it. EventBridge is the PA; the announcement is the event; the people reacting are the targets.

### 9.3 What Akwadona uses it for
Two main patterns right now:

**Pattern 1 — Scheduled jobs (the cron announcer).**
- One rule exists: `PreTokenWarmerRule` — "every 5 minutes, invoke `cognito-pre-token-generation` with `{"_warmup": true}`" — keeps it hot so Cognito's 5-second trigger cap is not hit on the first login of the morning.
- There is **no** scheduled cross-tenant probe. `scripts/cross-tenant-probe.js` and `scripts/security-tests/run-safe.js` are run by hand (or by an external scheduler); wiring them to EventBridge needs ~5 CFN resources the stack does not have spare — see `docs/45` §9.

**Pattern 2 — Future wiring (not yet live).**
- When a tenant admin is created, emit `akwadona.tenant.admin-created`, so email-sending Lambda can send the welcome mail without being wired directly into the admin-create Lambda.

### 9.4 Where in AWS Console
`https://us-east-1.console.aws.amazon.com/events/home?region=us-east-1#/rules`

### 9.5 Where in our code
- CDK scheduled rules: `akwadona-cdk/lib/akwadona-cdk-stack.ts` — search for `new events.Rule`.
- Lambda targets: same file, search for `eventsTargets.LambdaFunction`.

### 9.6 Why EventBridge, not direct Lambda invocation
Direct invocation couples two Lambdas: Lambda A has to know Lambda B's name and have permission to invoke it. EventBridge decouples — Lambda A emits an event, and we add listeners later without touching Lambda A.

---

## 10. Amazon SES (Simple Email Service) — our outbound mail room

### 10.1 What it is
**SES** (Simple Email Service) is AWS's email-sending service. It handles the plumbing: SMTP, bounce handling, reputation, DKIM signing.

### 10.2 Real-life example
Think of the mail room in a company. Someone drops a letter in the tray; the mail room puts the right stamp on it, hands it to the post office, and keeps a log of what was sent. SES is that mail room. The stamp is **DKIM** (DomainKeys Identified Mail) — a cryptographic signature that tells the receiving mail server "yes, this email really came from akwadona.com".

### 10.3 What Akwadona uses it for
- All email sent by Cognito (password reset, invite email, verification code) is routed through SES as `noreply@akwadona.com`.
- Without SES, Cognito's default sender is `no-reply@verificationemail.com` — which Gmail flags as spam.
- Setup is documented in [`16-ses-setup.md`](16-ses-setup.md).

### 10.4 Where in AWS Console
`https://us-east-1.console.aws.amazon.com/ses/home?region=us-east-1#/account`

Identities: `https://us-east-1.console.aws.amazon.com/ses/home?region=us-east-1#/verified-identities`

### 10.5 Where in our code
- Cognito's email configuration points at the SES identity ARN — set by `aws cognito-idp update-user-pool`, not by CDK (see [`16-ses-setup.md`](16-ses-setup.md) §6).
- DNS records (DKIM, MAIL FROM MX, SPF TXT) are hand-added at GoDaddy — see [`16-ses-setup.md`](16-ses-setup.md) §3.

### 10.6 Why SES, not SendGrid or Mailgun
SendGrid and Mailgun are easier at first, but both cost ~$15/month minimum. SES is $0.10 per 1,000 emails. For our volume (hundreds/month) that is pennies.

---

## 11. AWS Bedrock — the AI model marketplace

### 11.1 What it is
Bedrock is AWS's managed way to call large language models (like Anthropic's Claude) without running the servers yourself.

### 11.2 Real-life example
Think of a shopping mall food court. The mall owns the building, provides power and water. Each stall is a different cuisine. You order at the counter, the stall cooks it, you pay the mall at the end. Bedrock is the food court. Each model (Claude, Llama, Titan) is a stall. You pay AWS per token, not per server.

### 11.3 What Akwadona uses it for
**ScribeFirst** — the doctor-dictation feature. The doctor speaks into the microphone; the recorded audio is transcribed in the browser; the text is sent to a Bedrock Lambda which calls Claude Haiku 4.5 to extract a structured **SOAP** (Subjective / Objective / Assessment / Plan) note. See [`tiryaq_scribefirst.md`](https://not-yet-written-33-scribefirst-module.md) → coming in `33-scribefirst-module.md`.

Model ID: `us.anthropic.claude-haiku-4-5-20251001-v1:0`. The `us.` prefix means we're calling via a **cross-region inference profile** — AWS routes the request to whichever US region has capacity. This matters because the raw model ID without `us.` only works in one region at a time.

### 11.4 Where in AWS Console
`https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/overview`

Model access must be enabled per account per model: `https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess`

### 11.5 Where in our code
- Bedrock-calling Lambda: `akwadona-cdk/lambda/akwadona-scribe/index.js`.
- IAM permissions: the scribe Lambda's role has `bedrock:InvokeModel` scoped to the specific inference profile ARN.
- Model ID set via environment variable `BEDROCK_MODEL_ID`.

### 11.6 Why Bedrock, not calling Anthropic's API directly
Calling Anthropic directly means our PHI leaves AWS. Bedrock keeps the data inside our AWS account and provides a signed path that satisfies our BAA. Also: one bill, one IAM policy, one audit trail.

---

## 12. AWS CloudFormation (CFN) — the IKEA instructions for our infrastructure

### 12.1 What it is
**CloudFormation** (CFN) is AWS's "infrastructure-as-text" engine. You write a YAML or JSON file that lists every resource you want (buckets, Lambdas, tables, keys, roles). You hand the file to CloudFormation. It creates or updates every resource in the right order, and rolls back if anything fails.

### 12.2 Real-life example
Think of an IKEA flat-pack. The instruction sheet lists every screw, bolt, and plank, and the order to assemble them. If you follow it, you get the same bookshelf every time. If one screw is missing, IKEA tells you to stop. CloudFormation is that instruction sheet, applied automatically.

### 12.3 What Akwadona uses it for
Everything in AWS. Every Lambda, bucket, table, role, key, alarm — defined in text, applied by CloudFormation.

We don't write CloudFormation JSON by hand. We write TypeScript with the CDK (next section), and CDK compiles our TypeScript into CloudFormation JSON.

**Important ceiling:** a single CloudFormation stack can hold at most 500 resources. We are near this limit. To stay under it we use catch-all API routes (`/foo/{proxy+}`) that fan out inside one Lambda rather than creating one Lambda per endpoint, and we share one IAM `ManagedPolicy` across many Lambdas instead of inlining per-Lambda policies.

### 12.4 Where in AWS Console
`https://us-east-1.console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks`

Our stack is named `AkwadonaCdkStack` (a second stack, `AkwadonaEdgeStack`, holds the WAF and is currently not deployed).

### 12.5 Where in our code
- The compiled CloudFormation JSON lives in `akwadona-cdk/cdk.out/AkwadonaCdkStack.template.json` after each `cdk synth`.
- We never edit this file directly — it is overwritten by CDK on every build.

### 12.6 Why CloudFormation, not Terraform
Terraform works too. CloudFormation is already enabled on every AWS account at no cost, is tightly integrated with AWS services (newer services get CFN support on day one), and its rollback is reliable. Terraform's state file is one more thing to manage.

---

## 13. AWS CDK (Cloud Development Kit) — the IKEA designer's drawing tool

### 13.1 What it is
**CDK** (Cloud Development Kit) is a framework for writing CloudFormation stacks in TypeScript (or Python / Java / etc.). You write classes like `new Lambda.Function(...)` and CDK compiles that into CloudFormation JSON.

### 13.2 Real-life example
If CloudFormation is the IKEA instruction sheet, CDK is the designer's CAD drawing. The designer draws the bookshelf once in CAD; the CAD software produces the IKEA instructions automatically. The CAD drawing is shorter, easier to read, and reusable — a chair and a bookshelf can share a "leg" component.

### 13.3 What Akwadona uses it for
- One file (`akwadona-cdk/lib/akwadona-cdk-stack.ts`) defines the entire backend.
- Reusable patterns live inside helper functions in that file (for example, `createLambda(name, path, env)` creates a Lambda with our standard runtime, memory, timeout, and IAM role in one line).
- Versioned in Git — every change to infrastructure is a reviewable commit.

### 13.4 Where in AWS Console
CDK itself does not have a console presence. It compiles to CloudFormation; look at the CloudFormation stack (§12.4) instead.

### 13.5 Where in our code
- Stack definition: `akwadona-cdk/lib/akwadona-cdk-stack.ts`.
- Entry point: `akwadona-cdk/bin/akwadona-cdk.ts`.
- Lambda source: `akwadona-cdk/lambda/<name>/index.js` — one folder per Lambda, each folder bundles its own `node_modules` and `_shared` helpers inlined (see `akwadona-code-standards` skill for the pattern).

### 13.6 Why CDK, not raw CloudFormation
Raw CloudFormation is 5–10x more text and much easier to get wrong. CDK gives us Type-checking, IDE autocomplete, and loop/conditional expressions in TypeScript — things CloudFormation's YAML can only clumsily approximate.

---

## 14. AWS STS (Security Token Service) — the temporary pass for API calls

### 14.1 What it is
**STS** (Security Token Service) hands out short-lived AWS credentials.

### 14.2 Real-life example
Think of a day pass to a gym. The receptionist checks your membership, hands you a wristband that works for exactly today. Tomorrow you need a new wristband. STS wristbands typically expire in 1–12 hours.

### 14.3 What Akwadona uses it for
- When you run `aws sts get-caller-identity` to verify your dev credentials, you are calling STS.
- When one AWS service "assumes" an IAM role to do a job on behalf of another, STS issues the short-lived credentials for that role.
- When our deploy user assumes the CDK deployment role, STS is the handoff.

STS is background plumbing. We rarely call it directly from app code; the AWS SDK calls it for us.

### 14.4 Where in AWS Console
STS actions are visible in CloudTrail event history (filter by `EventSource = sts.amazonaws.com`).

### 14.5 Where in our code
- No direct STS calls in Lambda code — handled by the SDK.
- Local dev credential verification: in `scripts/*.ps1` wherever `aws sts get-caller-identity` appears.

### 14.6 Why STS, not long-lived keys
Long-lived AWS access keys are the #1 cause of real-world AWS breaches (committed to Git, pasted in Slack). Short-lived STS credentials limit the blast radius if they do leak.

---

## 15. Route 53 — intentionally NOT used (DNS lives at GoDaddy)

Route 53 is AWS's DNS service. We **do not use it**.

- The domain `akwadona.com` is registered at **GoDaddy**, and its DNS records are managed in GoDaddy's web console.
- Any new subdomain (e.g., a new tenant like `clinicx.akwadona.com`) needs a CNAME added at GoDaddy pointing to the CloudFront distribution domain.
- See [`16-ses-setup.md`](16-ses-setup.md) §3.1 for the GoDaddy DNS workflow (DKIM, MAIL FROM, SPF records).

**Future option:** we may migrate DNS to Route 53 if we add many tenants, to automate the CNAME creation via CDK. Today, manual GoDaddy edits are simpler.

---

## 16. Services we **do not** use (and why)

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

## 17. The AWS bill, in one page

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

## 18. Compliance surface

Every service above has a BAA (HIPAA Business Associate Agreement) in place via Amazon's blanket BAA covering all our services, signed when we accepted the AWS BAA in the Artifact portal. See [`05d-baa-template.md`](05d-baa-template.md) for our side's agreement with each hospital.

---

## 19. Open questions / future work

- Add Route 53 for DNS automation once we exceed 10 tenants.
- Move secrets (SES SMTP creds, future third-party integrations) to Secrets Manager.
- Enable AWS Config for continuous compliance posture checks.
- Enable GuardDuty for threat detection — free trial, then ~$5/month at our size.
- Enable Security Hub to consolidate findings across GuardDuty, Config, and Inspector.

---

## 20. References

- [`00-akwadona-explained.md`](00-akwadona-explained.md) — the overall platform.
- [`01-lambda-and-infrastructure.md`](01-lambda-and-infrastructure.md) — Lambda, S3, DynamoDB (not covered here).
- [`03-encryption-and-zero-knowledge.md`](03-encryption-and-zero-knowledge.md) — how KMS plus IAM gives us zero-knowledge.
- [`16-ses-setup.md`](16-ses-setup.md) — SES setup walk-through.
- [`18-deploy-and-operations.md`](18-deploy-and-operations.md) — CDK + CloudFormation deploy flow.
- [`25-monitoring-and-observability.md`](25-monitoring-and-observability.md) — CloudWatch + CloudTrail queries + alarms.
- [`44-akwadona-learning-path.md`](44-akwadona-learning-path.md) — the guided tour that USES this doc.
- `../skills/akwadona-easy-english/SKILL.md` — the writing rules this doc follows.

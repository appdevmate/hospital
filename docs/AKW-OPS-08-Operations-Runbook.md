# Akwadona Hospital Platform — Operations Runbook

| Document control | |
|---|---|
| **Document ID** | AKW-OPS-08 |
| **Document type** | Operations Runbook / Standard Operating Procedures (SOP) — deployment, release management, monitoring, backup and disaster recovery, environment setup |
| **Version** | 1.1 |
| **Status** | Approved |
| **Classification** | Confidential — Internal |
| **Owner** | Operations / On-call |
| **Approver** | Founder / CTO |
| **Effective date** | 2026-10-30 |
| **Review cycle** | On every deployment-procedure change; full review quarterly |
| **Supersedes** | `archive/18-deploy-and-operations.md`, `archive/25-monitoring-and-observability.md`, `archive/12-teardown-and-recover.md`, `archive/16-ses-setup.md`, `archive/17-test-fixtures.md` |
| **Related documents** | AKW-SAD-02 Appendix D (identifiers), AKW-IRP-09 (incidents), AKW-EH-10 (change checklists), `../skills/akwadona-deploy-safety/SKILL.md` |

| Revision history | | | |
|---|---|---|---|
| **Version** | **Date** | **Author** | **Change** |
| 1.0 | 2026-10-30 | Platform team | Consolidated into the enterprise document set; live identifiers verified |
| 1.1 | 2026-10-31 | Platform team | Added "This document answers" and "Abbreviations used in this document" blocks after document control |

## This document answers

1. What are the current live identifiers, and how do I read them from AWS instead of trusting a script?
2. How do I deploy the back end, the front end, or a single Lambda — and how do I roll back?
3. What exactly must I do, step by step, to deploy the pending 2026-10-29 change set?
4. What is monitored, what alarms exist, and how do I query logs and metrics?
5. How do I verify a release is healthy?
6. How do I recover from a disaster or rebuild the whole stack after a teardown?
7. How is outgoing e-mail configured, and which test accounts and fixtures exist?

## Abbreviations used in this document

> **Why this table exists.** Every short form that appears anywhere in this document is listed here with (1) what the letters stand for and (2) what it means in plain words. If a term is not here and is not obvious, that is a documentation bug — add it. The complete glossary with examples and console links is AKW-SO-01 Appendix A.

| Abbreviation | Stands for | What it means |
|---|---|---|
| **ACM** | AWS Certificate Manager | Issues and renews the certificates that make a site show the HTTPS padlock. Free. |
| **API** | Application Programming Interface | The set of URLs one program calls to use another program's features. Ours is a REST API. |
| **ARN** | Amazon Resource Name | The unique ID string of any AWS resource. |
| **AWS** | Amazon Web Services | Amazon's cloud-computing platform. Everything Akwadona runs on it. |
| **CDK** | Cloud Development Kit | AWS's tool for describing infrastructure in a programming language (we use TypeScript). It compiles to CloudFormation. |
| **CFN** | CloudFormation | AWS's service that builds and updates infrastructure from a text template. One "stack" = one template; a stack may hold at most 500 resources. |
| **CLI** | Command-Line Interface | A text-based tool run from a terminal, e.g. the AWS CLI. |
| **CMK** | Customer Managed Key | A KMS encryption key that we create and control (as opposed to one AWS manages for us). |
| **CNAME** | Canonical Name record | A DNS record that says "this name is an alias of that name". |
| **CORS** | Cross-Origin Resource Sharing | The browser rule that decides which websites may call our API. We allow only our own domains. |
| **CSS** | Cascading Style Sheets | The language that styles web pages. |
| **CTO** | Chief Technology Officer | The head of technology. |
| **DDB** | DynamoDB | Short form of DynamoDB, AWS's NoSQL database. |
| **DEK** | Data Encryption Key | The key that actually encrypts a row's fields. A fresh one per row. |
| **DKIM** | DomainKeys Identified Mail | A cryptographic signature on outgoing e-mail proving it really came from the domain. |
| **DMARC** | Domain-based Message Authentication, Reporting and Conformance | A DNS policy telling receivers what to do if SPF/DKIM fail. |
| **DNS** | Domain Name System | The internet's phone book — turns akwadona.com into a server address. Ours is in Route 53; GoDaddy only holds the registration. |
| **DOB** | Date of Birth | The date a person was born. |
| **DR** | Disaster Recovery / Document Register | Disaster Recovery: how we restore the system after a major failure. Document Register (AKW-DR-00): the master index of this documentation set. |
| **EH** | Engineering Handbook | The document-type code for the engineering handbook (AKW-EH-10). |
| **FS** | Functional Specification | The document that describes what the system does — every feature, rule, and setting — without describing how it is built. |
| **GDPR** | General Data Protection Regulation | The European Union's privacy law (2018). It gives people rights over their data and sets duties on companies that process it. |
| **HIPAA** | Health Insurance Portability and Accountability Act | The US law that sets rules for protecting patients' health information. Its "Security Rule" lists the technical safeguards we must have. |
| **HMAC** | Hash-based Message Authentication Code | A fingerprint of a value computed with a secret key. Same value + same key = same fingerprint; different keys give different fingerprints. We use it to search encrypted fields. |
| **HTTP** | Hypertext Transfer Protocol | The protocol the web uses to move pages and data. |
| **IAM** | Identity and Access Management | AWS's permission system: which user or service may do which action on which resource. |
| **IRP** | Incident Response Plan | The step-by-step plan for what to do when something goes wrong — an outage or a suspected data breach. |
| **ISO** | International Organization for Standardization | The body that publishes international standards; ISO 27001 is the information-security one. |
| **JSON** | JavaScript Object Notation | The text format our API uses for data. |
| **KMS** | Key Management Service | AWS's vault for encryption keys. Keys never leave it; it encrypts and decrypts on request. |
| **MFA** | Multi-Factor Authentication | Needing two proofs to sign in — a password plus a code from a phone app. |
| **MX** | Mail Exchange record | A DNS record that says which server receives e-mail for a domain. |
| **OPS** | Operations | Running the system day to day: deploying, monitoring, backing up, recovering. |
| **PHI** | Protected Health Information | Any information that identifies a patient and relates to their health: name, ID number, diagnosis, medication, phone, date of birth. |
| **PITR** | Point-In-Time Recovery | DynamoDB's continuous backup — restore the table to any second in the last 35 days. |
| **PK** | Partition Key | The main lookup key of a DynamoDB row — the "drawer". |
| **PR** | Pull Request | A proposed code change submitted for review before merging. |
| **QA** | Quality Assurance | Testing. |
| **QID** | Qatari ID | The national identity number of a Qatar resident (11 digits). |
| **RCU** | Read Capacity Unit | DynamoDB's unit for charging reads (one unit ≈ one 4 KB read per second). |
| **RPO** | Recovery Point Objective | How much recent data we may lose in a disaster. Ours: 15 minutes. |
| **RTO** | Recovery Time Objective | How long the system may be down after a disaster before it must be back. Ours: 4 hours. |
| **S3** | Simple Storage Service | AWS file storage — a bucket holds files of any size. |
| **SAD** | Solution Architecture Document | The master technical design document: how the whole system is built, from infrastructure to data to security. |
| **SES** | Simple Email Service | AWS's service for sending e-mail. |
| **SHA** | Secure Hash Algorithm | A family of one-way hash functions. SHA-256 is the one we use. |
| **SK** | Sort Key | The second part of a DynamoDB key — the "folder inside the drawer". |
| **SNS** | Simple Notification Service | AWS's service for sending alerts (e-mail, SMS, to other services). |
| **SOP** | Standard Operating Procedure | A written, repeatable procedure for a routine task. |
| **SPF** | Sender Policy Framework | A DNS record listing which servers may send e-mail for a domain. |
| **SSP** | System Security Plan | The document that lists every security control the system has, how it is implemented, and its status. A NIST-defined document type. |
| **TOTP** | Time-based One-Time Password | The six-digit code from an authenticator app that changes every 30 seconds. |
| **TTL** | Time To Live | A "delete me after this time" marker on a database row. DynamoDB removes expired rows for free. |
| **TXT** | Text record | A DNS record holding arbitrary text — used for SPF and DMARC. |
| **URL** | Uniform Resource Locator | A web address. |
| **WAF** | Web Application Firewall | A filter in front of a website that blocks known-bad traffic. Ours is defined but currently switched off. |
| **WCU** | Write Capacity Unit | DynamoDB's unit for charging writes (one unit ≈ one 1 KB write per second). |
| **WORM** | Write Once, Read Many | Storage that cannot be changed after writing. Our audit bucket is WORM via Object Lock. |

**Standing rules.** (1) Never trust an identifier in a script or doc — read it live first (§2). (2) `cdk synth` and count resources before every deploy; the stack is at 496 of 500. (3) Shared Lambda helpers are copied, not imported — hash-check them. (4) After any frontend deploy, invalidate CloudFront. (5) Run `scripts/security-tests/run-safe.js` after every release.

---

## 1. Operating model

| Activity | Frequency | Procedure |
|---|---|---|
| Backend / infrastructure release | As needed | §3 |
| Frontend release | As needed | §3.4 |
| Lambda hot patch | As needed (single handler) | §3.5 |
| Monitoring review | Daily glance; alarms are push | §4 |
| Security suite + isolation probe | After every release; nightly once scheduled (R-06) | §5 |
| Backup verification / DR drill | Quarterly (R-11) | §6 |
| Throttle-counter purge | Once, after the 2026-10-29 release | §3.7 step 7 |
| Access review (IAM users, Cognito operators) | Quarterly | AKW-SSP-05 AC-7 |
| Document review | Quarterly | AKW-DR-00 |

## 2. Live identifiers and how to read them

### 3. Live identifiers (2026-10-02)

Always re-verify before use. The frontend bucket name is CloudFormation-generated and changes on every teardown-rebuild.

| Resource | Current value | How to verify |
|---|---|---|
| CloudFormation stack | `AkwadonaCdkStack` | `aws cloudformation describe-stacks --stack-name AkwadonaCdkStack --query "Stacks[].StackStatus"` |
| Frontend S3 bucket | `akwadonacdkstack-akwadonafrontendbucket*` (random suffix) | `aws s3 ls \| Select-String akwadonacdkstack-akwadonafrontendbucket` |
| Documents S3 bucket | `akwadona-documents-483176634665-us-east-1` | fixed name — see CDK |
| CloudFront distribution | `E1YOKWKHQNSPQW` → `d378t54x9p802t.cloudfront.net` | `aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items[?@=='akwadona.com']].Id"` |
| API Gateway | `https://ouohmmpi31.execute-api.us-east-1.amazonaws.com` (name `akwadona-api`) | `aws apigatewayv2 get-apis --query "Items[?Name=='akwadona-api'].ApiEndpoint"` |
| Cognito pool | `us-east-1_YibFfEdDD` | `aws cognito-idp list-user-pools --max-results 10` |
| App client | `6ndnfufmo100mq1rrmte7pqmhg` | matches `src/app.config.ts` |
| Account | `483176634665` | `aws sts get-caller-identity` |
| Region | `us-east-1` | `aws configure get region` |

### 4. IAM profiles (least-privilege model)

| Profile name | Scope | Used for |
|---|---|---|
| `tiryaq-cdk` | `sts:AssumeRole` on CDK bootstrap roles (`cdk-hnb659fds-*`). No other perms. | `cdk deploy`, `cdk diff`, `cdk synth`. |
| `hospital-deploy-user` | S3 PutObject/DeleteObject on frontend bucket + `kms:Encrypt` + `kms:GenerateDataKey` on data CMK + CloudFront CreateInvalidation on `E1YOKWKHQNSPQW` + `lambda:UpdateFunctionCode` on `akwadona-*`. | Frontend sync, invalidation, Lambda hot-patch. |
| (admin) | Root or AdministratorAccess. | Cognito user admin, KMS key creation, break-glass. |

Verify current profile: `aws sts get-caller-identity --profile <name>`.

### 5. Backend deploy — full stack

#### 5.1 Pre-flight
```powershell
cd akwadona-cdk
npm install
npm run build
npx cdk diff AkwadonaCdkStack --profile tiryaq-cdk
```

Read every line of the diff. Flag any:
- `[-]` destroys on routes or Lambdas (removing a feature? intentional?).
- `[~]` on `SeedData` CustomResource (safe — see §10.1).
- Resource count delta pushing over 500 (hard CFN cap).

#### 5.2 Deploy
```powershell
npx cdk deploy AkwadonaCdkStack --require-approval never --profile tiryaq-cdk
```

Typical time: 2–8 minutes depending on changes.

#### 5.3 Post-flight
- Check CloudFormation Events for any `UPDATE_FAILED` / `ROLLBACK_IN_PROGRESS`.
- Run `scripts/cross-tenant-probe.js` → exit 0.
- Smoke-test one API call per aggregate Lambda.

### 6. Frontend deploy — hot path

#### 6.1 Build
```powershell
cd "C:\Users\Sami Toufic Taha\Desktop\aws apps\hospital"
Remove-Item -Recurse -Force .angular\cache -ErrorAction SilentlyContinue
ng build --configuration production
```

The cache clear is **not optional**. Stale Angular v20 + Tailwind v4 cache has emitted incomplete CSS before (dashboard grid collapses to one column). Takes ~5 s to clear, saves ~45 min of debugging.

#### 6.2 Verify bucket name
```powershell
$bucket = (aws s3 ls | Select-String 'akwadonacdkstack-akwadonafrontendbucket' | ForEach-Object { ($_ -split '\s+')[2] })
Write-Host "Target bucket: $bucket"
```

If `$bucket` is empty, the stack was rebuilt and the suffix changed. STOP and investigate before continuing.

#### 6.3 Sync + invalidate
```powershell
aws s3 sync "dist\verona-ng\browser" "s3://$bucket" --delete --profile hospital-deploy-user
aws cloudfront create-invalidation --distribution-id E1YOKWKHQNSPQW --paths "/*" --profile hospital-deploy-user
```

#### 6.4 Wait for invalidation + smoke test
```powershell
$inv = (aws cloudfront list-invalidations --distribution-id E1YOKWKHQNSPQW --query "InvalidationList.Items[0].Id" --output text)
while ((aws cloudfront get-invalidation --distribution-id E1YOKWKHQNSPQW --id $inv --query "Invalidation.Status" --output text) -eq "InProgress") {
    Start-Sleep -Seconds 10
    Write-Host "Still invalidating…"
}
Write-Host "Invalidation complete. Hard-refresh https://www.akwadona.com"
```

### 7. Lambda-only hot patch (fastest iteration)

For handler-code tweaks that don't change IAM / env / routes:

```powershell
$fn = "akwadona-pharmacy"   # replace with target
cd "akwadona-cdk\lambda\$fn"
Compress-Archive -Path *.js -DestinationPath function.zip -Force
aws lambda update-function-code --function-name $fn --zip-file fileb://function.zip --region us-east-1 --profile hospital-deploy-user
```

Follow with a smoke call to verify.

### 8. Post-teardown recovery (two-phase alias deploy)

After `scripts/teardown.ps1`, Route 53 records still point at the destroyed CloudFront. The fresh distribution refuses to attach aliases ("DNS record points to another distribution").

Use `scripts/recover.ps1` — it automates:
1. Phase 1 — `cdk deploy -c skipAliases=1`.
2. Repoint DNS to new `d*.cloudfront.net`.
3. Phase 2 — `cdk deploy` (normal) attaches aliases.

Expect ~30 min end-to-end + DNS propagation.

### 9. Rollback

| Scenario | Action |
|---|---|
| Bad Lambda deploy | `git checkout <prev-commit> -- akwadona-cdk/lambda/<folder>/`, repeat §7. |
| Bad CFN deploy mid-change | CloudFormation auto-rolls-back. If stuck: `aws cloudformation continue-update-rollback --stack-name AkwadonaCdkStack`. |
| Bad frontend deploy | Checkout previous commit, rebuild, repeat §6. |
| Entire account unrecoverable | `scripts/teardown.ps1` → `scripts/recover.ps1`. |

### 10. Known foot-guns + how to avoid them

#### 10.1 SeedData CustomResource "may be replaced" every deploy
Historical note: the SeedData CustomResource used to use `properties: { timestamp: Date.now() }`, which caused it to re-run on every CFN update and reset the patient / doctor counters. Fixed in May 2026 by:
- Switching to a stable `seedVersion` property.
- Making the seed Lambda idempotent via `putIfAbsent`.
- Short-circuiting on `event.RequestType !== 'Create'`.

If you see `SeedData may be replaced` in the diff, verify the Lambda source still has the `!== 'Create'` short-circuit before deploying.

#### 10.2 `aws s3 sync` prints "upload" but S3 is empty
Missing KMS perms on the deploy user. The frontend bucket is encrypted with the data CMK; `PutObject` fails silently without `kms:Encrypt` + `kms:GenerateDataKey` on the alias.

Fix: attach a scoped KMS statement to the `hospital-deploy-user` policy:
```json
{
  "Effect": "Allow",
  "Action": ["kms:Encrypt", "kms:Decrypt", "kms:GenerateDataKey", "kms:DescribeKey"],
  "Resource": "arn:aws:kms:us-east-1:483176634665:key/*",
  "Condition": {
    "ForAnyValue:StringEquals": {
      "kms:ResourceAliases": "alias/akwadona/data"
    }
  }
}
```

#### 10.3 Pre-token Lambda cold-start times out login
Cognito hard-caps pre-token-generation at 5 seconds. A cold Node.js container + DDB lookups can exceed that.

Fix on-demand: `aws lambda invoke --function-name cognito-pre-token-generation --payload '{"_warmup":true}' --cli-binary-format raw-in-base64-out /tmp/out.json`.

Permanent fix: re-add the EventBridge warmer rule (`events.Schedule.rate(5 min)` → `_warmup: true` payload). Removed in Step 7 cleanup to save CFN resources but may need to come back if first-login timeouts recur.

#### 10.4 Dashboard cards stack vertically after deploy
Stale `.angular/cache` has emitted incomplete Tailwind CSS multiple times. **Always** clear it before `ng build` in production. See §6.1.

#### 10.5 `cdk diff` shows unexpected deletes
Someone deployed a side-branch recently that removed resources. Compare `git log origin/development` vs your branch. Do NOT force-apply.

### 11. Monitoring during deploy

Watch three things:
- CloudWatch Logs → `/aws/lambda/akwadona-*` → scroll new invocations.
- CloudFormation Events → updates in real time.
- Browser DevTools on `https://www.akwadona.com` → Network tab after invalidation completes.


## 3a. The 2026-10-29 change set — deploy checklist (pending)

### 12a. The 2026-10-29 change set — deploy checklist

This is one coordinated release: a CDK change plus 47 Lambda folders plus three scripts. Deploy it in this order. Each step says what to verify before the next. Total wall-clock ≈ 25 minutes; the user-visible window is the CloudFormation update in step 4 (Lambdas update in place, no downtime; the Cognito MFA change does not affect signed-in users).

**What is in the set** — see [`AKW-SAD-02-Solution-Architecture-Document.md`](AKW-SAD-02-Solution-Architecture-Document.md) §11 for the full table. In one line: KMS-deletion guard, least-privilege IAM, MFA OPTIONAL, documents-bucket KMS, API throttle, Node 20, two alarms + SNS, six auth gates, no-Scan rewrites of `getAllPatients` / `getAllDoctors` / pre-token / throttle / operator, DEK cache, `ttl`→`expiresAt`, CORS cleanup.

#### Step 0 — read the diff (10 min)

```powershell
cd "C:\Users\Sami Toufic Taha\Desktop\aws apps\hospital"
git status --short | Measure-Object -Line          # expect ~70 changed/new files
git diff akwadona-cdk/lib/akwadona-cdk-stack.ts     # the infra change — read every hunk
git diff akwadona-cdk/lambda/_shared/               # crypto.js + throttle.js — the shared changes
```

The 16 `crypto.js` and 40 `throttle.js` copies must be byte-identical to `_shared/`:

```powershell
Get-ChildItem akwadona-cdk/lambda -Recurse -Filter crypto.js  | Get-FileHash | Group-Object Hash | Measure-Object | Select Count   # expect 1
Get-ChildItem akwadona-cdk/lambda -Recurse -Filter throttle.js | Where-Object FullName -notmatch '\\lib\\' | Get-FileHash | Group-Object Hash | Measure-Object | Select Count   # expect 1
```

#### Step 1 — type-check and count resources (3 min)

```powershell
cd akwadona-cdk
npx cdk synth 2>&1 | Select-Object -Last 5           # must end without "error TS"
python -c "import json;print(len(json.load(open('cdk.out/AkwadonaCdkStack.template.json'))['Resources']))"   # expect 496
```

If the count is > 500, stop: something else was added since this change set. If `synth` reports a TypeScript error, the only new APIs used are `aws-cloudwatch`, `aws-cloudwatch-actions`, `aws-sns`, `CfnStage.defaultRouteSettings`, `Mfa.OPTIONAL`, `mfaSecondFactor` — all present in `aws-cdk-lib@2.244.0`.

#### Step 2 — preview the IAM diff (2 min)

```powershell
npx cdk diff 2>&1 | Select-String -Pattern "IAM|Policy|Mfa|Runtime|Throttl|Alarm|Topic|Encryption" | Select-Object -First 60
```

Expect to see: 14 roles losing `dynamodb:PutItem/DeleteItem/BatchWriteItem` and gaining a conditional `UpdateItem`; the operator role's `ScheduleKeyDeletion` statement gaining a `Null` condition and a new DENY; 27 functions changing `Runtime: nodejs18.x → nodejs20.x`; `MfaConfiguration: OFF → OPTIONAL`; the documents bucket gaining `ServerSideEncryptionConfiguration` with `aws:kms`; one `AWS::SNS::Topic` and two `AWS::CloudWatch::Alarm` added; `DefaultRouteSettings` on the stage. If you see a **replacement** (not update) of the table, the pool, or a bucket — stop.

#### Step 3 — Lambda code first, infra second? No — infra first

The new pre-token Lambda needs `kms:GenerateMac`, and the read-only Lambdas' new code still works under the old (broader) policy. So deploy the **CDK stack first** (it ships the Lambda code too — `Code.fromAsset` re-zips every changed folder).

```powershell
npx cdk deploy AkwadonaCdkStack --require-approval never 2>&1 | Tee-Object -FilePath ..\deploy-2026-10-29.log
```

Watch for `UPDATE_COMPLETE`. Typical duration 6–9 minutes. If it rolls back, the log names the resource; the likeliest culprit is the IAM `Null` condition syntax or a Lambda asset upload — neither affects live traffic because CloudFormation rolls back atomically.

#### Step 4 — verify (5 min)

```powershell
## 4a. Alarms + topic exist; subscribe yourself
$topic = aws cloudformation describe-stacks --stack-name AkwadonaCdkStack --query "Stacks[0].Outputs[?OutputKey=='AlarmTopicArn'].OutputValue" --output text
aws sns subscribe --topic-arn $topic --protocol email --notification-endpoint <your e-mail>
## → click the confirmation link AWS sends

## 4b. Pre-token Lambda is the new one and healthy
aws lambda get-function-configuration --function-name cognito-pre-token-generation --query "{Runtime:Runtime,LastModified:LastModified}"
aws lambda invoke --function-name cognito-pre-token-generation --payload '{"_warmup":true}' out.json; Get-Content out.json   # {"ok":true,"warmed":true}

## 4c. Runtime sweep — no Node 18 left
aws lambda list-functions --query "Functions[?starts_with(FunctionName,'akwadona-')].[FunctionName,Runtime]" --output text | Select-String "nodejs18"   # expect no output

## 4d. MFA state
aws cognito-idp describe-user-pool --user-pool-id us-east-1_YibFfEdDD --query "UserPool.MfaConfiguration"   # "OPTIONAL"

## 4e. Documents bucket encryption
aws s3api get-bucket-encryption --bucket akwadona-documents-483176634665-us-east-1 --query "ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm"   # "aws:kms"

## 4f. Stage throttle
aws apigatewayv2 get-stage --api-id ouohmmpi31 --stage-name '$default' --query "DefaultRouteSettings"
```

#### Step 5 — functional smoke (5 min, in the browser)

1. Sign in as a **doctor** on `tiryaq.akwadona.com` → the patient list is populated (proves the HMAC `doctorId` lookup). If it is empty, see the "Doctor sees no patients" row in `AKW-IRP-09` §8.
2. Sign in as **admin1** → Patients → type a name in the search box → results appear (proves post-decrypt filtering). Sort by name → ordered. Filter by date of birth → filtered.
3. Admin → Doctors → same three checks.
4. Operator console → tenant list loads.
5. As the doctor, open DevTools and call `DELETE /departments` with the doctor's token → **403**.

#### Step 6 — security suite + probe (3 min)

```powershell
cd ..
node scripts\security-tests\run-safe.js                     # exit 0
$env:TIRYAQ_USERNAME='admin1'; $env:TIRYAQ_PASSWORD='…'; $env:ALSHIFAA_USERNAME='…'; $env:ALSHIFAA_PASSWORD='…'
node scripts\cross-tenant-probe.js                           # exit 0 (writes + deletes probe rows — run against prod only off-hours, or point API_BASE at a dev stack)
```

#### Step 7 — one-time cleanup (2 min)

```powershell
node scripts\purge-throttle-counters.js            # dry run: prints the count of stale rows
node scripts\purge-throttle-counters.js --apply    # deletes them
```

#### Step 8 — frontend (no change in this set)

Nothing in `src/` changed. Skip the frontend deploy.

#### Rollback

- **Whole set:** `git revert` the commit → `npx cdk deploy`. CloudFormation puts every resource back (runtime, IAM, MFA, bucket encryption are all in-place updates). Objects uploaded to the documents bucket while KMS was on stay KMS-encrypted and remain readable — `documentManagerFn` keeps its key grant.
- **One Lambda:** `git checkout HEAD~1 -- akwadona-cdk/lambda/<folder>` then the §7 hot-patch. Do **not** roll back the pre-token Lambda alone to the pre-change version while leaving the CDK change — it would be fine, but it reintroduces the two Scans.
- **MFA only:** change `Mfa.OPTIONAL` → `Mfa.OFF` and redeploy. (Cognito allows OPTIONAL→OFF directly.)

#### After this set lands — the next three

1. GitHub Actions cron for `run-safe.js` (nightly, zero AWS resources) → the sales handbook's "automated" claim becomes true.
2. Enrol every Operator/Admin in TOTP → flip `Mfa.REQUIRED`.
3. Stack split (`AKW-SAD-02` §9 #1) → re-enable WAF, add the remaining alarms, schedule the cross-tenant probe in EventBridge.


## 4. Monitoring and observability

### 3. CloudWatch Logs

#### 3.1 Log groups
Every Lambda has `/aws/lambda/<functionName>`. Retention is **not** set in CDK → defaults to **Never Expire**. **Action: set a 90-day retention in CDK** to control cost + comply with log-minimization.

```ts
// Suggested addition to lib/akwadona-cdk-stack.ts
import * as logs from 'aws-cdk-lib/aws-logs';
new logs.LogRetention(this, `${id}LogRetention`, {
  logGroupName: `/aws/lambda/${f.functionName}`,
  retention: logs.RetentionDays.THREE_MONTHS
});
```

#### 3.2 Log hygiene (per `akwadona-security-review` skill §9)
- Never log PHI (patient name, QID, encrypted bodies).
- Log the actor email, tenantId, action, outcome, latency.
- Prefix log lines with the request-id for correlation: `console.log('[req=XYZ]', 'created patient', { id })`.

#### 3.3 Finding logs fast
```powershell
aws logs tail /aws/lambda/akwadona-pharmacy --follow --since 10m
aws logs filter-log-events --log-group-name /aws/lambda/akwadona-examinations --filter-pattern "ERROR" --start-time (([DateTimeOffset](Get-Date).AddHours(-1)).ToUnixTimeMilliseconds())
```

### 4. CloudWatch metrics

#### 4.1 AWS-provided
- `AWS/Lambda` → `Invocations`, `Errors`, `Duration`, `Throttles`, `ConcurrentExecutions` per function.
- `AWS/ApiGateway` → `Count`, `4XXError`, `5XXError`, `Latency` (p50/p99) per API.
- `AWS/CloudFront` → `Requests`, `BytesDownloaded`, `TotalErrorRate` per distribution.
- `AWS/DynamoDB` → `ConsumedReadCapacityUnits`, `ConsumedWriteCapacityUnits`, `ThrottledRequests`, `SystemErrors`.
- `AWS/Cognito` → `SignInSuccesses`, `SignInThrottles`, `TokenRefreshSuccesses`.

#### 4.2 Custom metric: `Akwadona/Throttle`
Emitted by every tenant Lambda when a per-tenant rate limit is hit — see [`AKW-SAD-02-Solution-Architecture-Document.md`](AKW-SAD-02-Solution-Architecture-Document.md).

Dimensions: `TenantId`, `Lambda`, `Route`.

Query:
```powershell
aws cloudwatch get-metric-statistics `
  --namespace "Akwadona/Throttle" `
  --metric-name "ThrottleCount" `
  --dimensions "Name=TenantId,Value=T_2572fc71" `
  --start-time (([DateTimeOffset](Get-Date).AddHours(-24)).ToString('o')) `
  --end-time (Get-Date).ToString('o') `
  --period 300 --statistics Sum
```

### 5. Alarms

**Live as of 2026-10-29 (in `lib/akwadona-cdk-stack.ts`):** `akwadona-api-5xx` (any API Gateway 5xx in 5 min) and `akwadona-lambda-errors` (any Lambda error in 5 min), both → SNS topic `akwadona-alarms`. Subscribe once after deploy:

```powershell
aws sns subscribe --topic-arn (aws cloudformation describe-stacks --stack-name AkwadonaCdkStack --query "Stacks[0].Outputs[?OutputKey=='AlarmTopicArn'].OutputValue" --output text) --protocol email --notification-endpoint you@example.com
```

Only two were added because the stack sits at 496/500 CloudFormation resources. The rest of the baseline below goes into a separate `AkwadonaMonitoringStack` once the split in `AKW-SAD-02` §9 is done:

| Alarm | Metric | Threshold | Action |
|---|---|---|---|
| Lambda error rate | `AWS/Lambda Errors / Invocations` > 5% | 2 of 5 periods, 5-min | SNS → on-call email |
| Lambda duration p99 | `AWS/Lambda Duration` p99 > 10s | 3 of 5 periods | SNS |
| API Gateway 5xx | `AWS/ApiGateway 5XXError` > 1% | 2 of 5 periods | SNS → immediate |
| API Gateway latency p99 | `AWS/ApiGateway Latency` p99 > 3s | 3 of 5 periods | SNS |
| CloudFront error rate | `AWS/CloudFront TotalErrorRate` > 2% | 2 of 5 periods | SNS |
| DynamoDB throttles | `AWS/DynamoDB ThrottledRequests` > 0 | 1 period | SNS |
| Cognito sign-in failures | `AWS/Cognito SignInThrottles` > 10/min | 2 periods | SNS → security |
| Per-tenant throttle | `Akwadona/Throttle ThrottleCount` > 100/5min | 1 period | SNS → operator |
| Audit bucket writes | `AWS/S3 BucketPutRequests` on audit bucket | drop to 0 for 1 hr | SNS (silent audit = broken audit) |
| CloudTrail health | CloudTrail "IsLogging" transitions to false | 1 period | SNS → security critical |

### 6. CloudTrail

- **Multi-region trail** `akwadona-cloudtrail` (per `lib/akwadona-cdk-stack.ts`).
- Delivered to `AkwadonaAuditBucket` (Object Lock compliance mode, 7-year retention).
- Log file validation ON — tamper detection via SHA-256 digests.
- CloudWatch Logs integration ON (1-year retention).
- Captures: every AWS API call (management plane) + S3 data events on the frontend bucket (PHI download path through pre-signed URLs).

#### Querying CloudTrail
```powershell
## All operator-role actions in the last 24h
aws cloudtrail lookup-events `
  --lookup-attributes AttributeKey=Username,AttributeValue=<operator-user> `
  --max-items 100

## Any KMS Decrypt call on a tenant key (should NEVER appear from operator)
aws cloudtrail lookup-events `
  --lookup-attributes AttributeKey=EventName,AttributeValue=Decrypt `
  --max-items 1000 `
  --query "Events[?CloudTrailEvent | contains(@, 'akwadona-tenant')]"
```

### 7. Application audit log

Separate from CloudTrail — this is **business** audit:

- DynamoDB rows at `PK=AUDIT#YYYY-MM-DD, SK=AUDIT#<iso>#<uuid>`.
- Written by every PHI-touching mutation (patient create/update, examination sign-off, dispense, etc.).
- Includes `tenantId`, `actorEmail`, `actorName`, `entityType`, `entityId`, `action`, `before`/`after` JSON strings, `changeSummary`.
- Queryable via `GET /audit?date=YYYY-MM-DD`.
- Operator sees only sanitized metadata (coarse category, no IDs) — see [`AKW-FS-03-Functional-Specification.md`](AKW-FS-03-Functional-Specification.md).

### 8. Nightly security probes

- `scripts/cross-tenant-probe.js` — attempts cross-tenant reads from each tenant; must return 404 for all attempts.
- Schedule: nightly via EventBridge → Lambda (TODO: not yet wired; run manually post-deploy).
- Expand coverage as new modules land (last expansion: `8a90688` — scribe + calendar).

### 9. Dashboards

CloudWatch dashboard JSON lives in `scripts/dashboards/` (TODO: create). Suggested panels:

- Per-aggregate-Lambda error rate (10 Lambdas, 1 row per).
- Per-tenant throttle count (1 row, filtered by TenantId).
- API Gateway 5xx + latency p99 (2 rows).
- DynamoDB RCU/WCU + throttles.
- Active Cognito users (per tenant, from operator metrics).
- Pre-token Lambda cold-start rate.


## 5. Release verification

After every deploy, in this order:
1. `node scripts/security-tests/run-safe.js` — exit 0 (read-only; safe on production).
2. Functional smoke (AKW-EH-10 §6 — the test plan's "release" subset).
3. `node scripts/cross-tenant-probe.js` — against a dev stack, or production off-hours with the probe accounts (it writes and deletes probe rows).
4. Check the two alarms are `OK` in CloudWatch and the SNS subscription is confirmed.

## 6. Backup, disaster recovery, and full rebuild

**Objectives.** RPO 15 minutes (DynamoDB PITR is continuous; 35-day window). RTO 4 hours (full stack rebuild below). Not yet drilled — R-11.

**Backups.** DynamoDB PITR (restore to any second in the last 35 days to a *new* table name, then repoint `TABLE_NAME` or copy back). S3 versioning on every bucket. KMS keys are `RETAIN` and survive stack deletion; the audit bucket is Object-Locked.

**Full rebuild (teardown + recover):**

Two PowerShell scripts that flip Akwadona between "live in AWS" and "$0 / not running". What huge SaaS dev teams call a "kill switch + revive" pair (AWS internal ops, Stripe staging environments, Vercel preview teardowns).

### When to use

| Situation | Run |
|---|---|
| Pausing work for a while (vacation, holding off on demo) | `teardown.ps1` |
| Bringing it back | `recover.ps1` |
| Customer demo prep — fresh start | both in sequence |
| Disaster recovery (account wiped, region outage) | `recover.ps1` (after re-bootstrapping CDK in the new region) |
| You're done with the project for good | `teardown.ps1`, then let the GoDaddy registration lapse and delete the Route 53 zone |

### What goes away with `teardown.ps1`

| Resource | After teardown |
|---|---|
| Lambdas (39) | Deleted |
| API Gateway HTTP API | Deleted |
| CloudFront distribution | Deleted |
| Cognito User Pool + groups + custom domain | Deleted |
| S3 buckets (frontend + documents) | Emptied, then deleted by CDK |
| DynamoDB `Hospital` table | Deleted (CDK retains by default; this script overrides) |
| IAM roles + policies + log groups | Deleted |
| KMS keys (4 per-tenant) | Scheduled for deletion in 7 days |
| ACM certificate `auth.akwadona.com` | **Stays** (free; survives for next deploy) |
| Route 53 hosted zone (if any) | **Stays** (~$0.50/month) |
| GoDaddy domain | **Stays** (not AWS) |
| Audit bucket (`akwadona-audit-v2-*`) | **Stays** — COMPLIANCE Object Lock, 7-year retention (HIPAA WORM). Cannot be deleted until retention expires (~2033). On next deploy, increment the version suffix in CDK if the existing audit bucket blocks. |

**Expected monthly bill after teardown:** roughly $0. Maybe $0.50 if you keep a Route 53 zone.

### How to run the teardown

```powershell
cd "C:\Users\Sami Toufic Taha\Desktop\aws apps\hospital"
.\scripts\teardown.ps1 -ConfirmDestroyData
```

Without the `-ConfirmDestroyData` flag the script refuses to run (safety gate).

Takes ~3–5 minutes.

### How to bring it back with `recover.ps1`

```powershell
cd "C:\Users\Sami Toufic Taha\Desktop\aws apps\hospital"
.\scripts\recover.ps1
```

What it does (in order):

1. Looks at each per-tenant KMS key. If still in the 7-day pending-deletion window, cancels deletion and re-enables. If already destroyed (window passed), warns you'll need to update the CDK `tenantKeys` / `tenantHmacKeys` maps with the new key ARNs.
2. `npx cdk deploy --require-approval never` — recreates Lambdas, API Gateway, CloudFront, Cognito, IAM, log groups, custom resources.
3. Runs `scripts/seed-tenants.ps1` to repopulate Tiryaq + Alshifaa profile rows.
4. Prints the **manual** next steps you need to do:
   - Build + sync the Angular frontend.
   - Re-create the operator user. Cognito username is `sami` (not the email). Email attribute `sami.t.taha98@gmail.com`. Add to the `Operator` group. See `AKW-FS-03-Functional-Specification.md` for the operator-user CLI snippet.

Takes ~5–8 minutes.

### What happens if I wait > 7 days before running recover?

- The KMS keys are gone forever. AWS cannot recover them.
- The DynamoDB table is gone (the script already deleted it on teardown).
- If there was customer data in DynamoDB before teardown, it stays mathematically unreadable even if someone restored a backup — the keys that decrypt it no longer exist. This is the "cryptographic erasure" we use for GDPR right-to-be-forgotten.
- Recovery still works — CDK creates NEW keys with NEW ARNs. You must update the CDK `tenantKeys` + `tenantHmacKeys` maps to point at the new ARNs (the script prints a warning when this happens).

### Costs broken down

| State | Monthly cost |
|---|---|
| Live (current) | ~$5–10 (mostly the 4 KMS keys × $1 each) |
| Teardown in progress | Same as live until the 7-day KMS window passes |
| 7 days after teardown | ~$0.50 (Route 53 only, if used) |
| Forever after teardown | ~$0.50 + GoDaddy domain renewal (not AWS) |

### What huge SaaS does (precedent)

- **AWS internal ops** ship a "cleanup-all" script for every customer-facing service so dev environments can be wiped on demand.
- **Stripe** rebuilds their staging cluster every weekend via Terraform `destroy` + `apply` — same pattern.
- **Vercel** preview environments are torn down 24h after the PR closes.

Akwadona inherits the same hygiene. The cost saving is small (a hospital SaaS at our scale costs <$50/month live), but the operational discipline is what matters.

## 7. E-mail (SES) configuration

### The 4 components

1. **SES domain identity** — proves to AWS we own `akwadona.com` so SES will send mail with that From address.
2. **DKIM** — three CNAME records on `akwadona.com` DNS that let SES sign every outgoing email with our domain's cryptographic key. Receivers (Gmail, Outlook) verify the signature and trust the mail.
3. **MAIL FROM subdomain** — a separate envelope-from like `mail.akwadona.com` with its own MX + SPF TXT records. Aligns SPF with the From domain → DMARC compatibility, fewer bounces.
4. **SES identity policy** — grants `cognito-idp.amazonaws.com` permission to call `ses:SendEmail` on our SES identity (Cognito → SES bridge).
5. **Cognito user pool email config** — switched from `EmailSendingAccount: COGNITO_DEFAULT` to `DEVELOPER` with our SES SourceArn as the sender.

### Setup — step by step (PowerShell)

Run these as one script. Replace `akwadona.com` and the account/region values if you fork this for another tenant.

```powershell
$Region    = 'us-east-1'
$Domain    = 'akwadona.com'
$AccountId = '483176634665'

## 1. SES domain identity + DKIM
aws sesv2 create-email-identity --email-identity $Domain --region $Region | Out-Null

## 2. Pull DKIM tokens
$identity = aws sesv2 get-email-identity --email-identity $Domain --region $Region | ConvertFrom-Json
$tokens   = $identity.DkimAttributes.Tokens
Write-Host "DKIM tokens: $($tokens -join ', ')"

## 3. MAIL FROM subdomain
aws sesv2 put-email-identity-mail-from-attributes `
  --email-identity $Domain `
  --mail-from-domain "mail.$Domain" `
  --behavior-on-mx-failure USE_DEFAULT_VALUE `
  --region $Region | Out-Null
```

#### DNS records to add (the manual step)

If `akwadona.com` is in **Route 53 same account**, you can `aws route53 change-resource-record-sets` directly.

For Akwadona it's **registered at GoDaddy**, so we add via the GoDaddy DNS web console:

| # | Type | Host / Name | Value | Priority | TTL |
|---|---|---|---|---|---|
| 1 | CNAME | `<token1>._domainkey` | `<token1>.dkim.amazonses.com` | — | 1 hour |
| 2 | CNAME | `<token2>._domainkey` | `<token2>.dkim.amazonses.com` | — | 1 hour |
| 3 | CNAME | `<token3>._domainkey` | `<token3>.dkim.amazonses.com` | — | 1 hour |
| 4 | MX | `mail` | `feedback-smtp.us-east-1.amazonses.com` | `10` | 1 hour |
| 5 | TXT | `mail` | `v=spf1 include:amazonses.com ~all` | — | 1 hour |

GoDaddy quirks:
- The **Host** field takes only the subdomain part — GoDaddy appends `.akwadona.com` automatically.
- MX **Priority** is a separate field from the Value (just the hostname, no leading number).
- TXT values: paste **without** the surrounding quotes — GoDaddy wraps them.

#### Verify DKIM (wait 5–15 min after saving DNS records)

```powershell
aws sesv2 get-email-identity --email-identity $Domain --region $Region `
  --query "{ Verified: VerifiedForSendingStatus, DkimStatus: DkimAttributes.Status }" --output table
```

Wait until `DkimStatus: SUCCESS` and `Verified: True`.

#### SES identity policy — let Cognito send via this identity

```powershell
aws sesv2 create-email-identity-policy `
  --email-identity $Domain `
  --policy-name CognitoSend `
  --policy '{"Version":"2008-10-17","Statement":[{"Sid":"AllowCognitoSend","Effect":"Allow","Principal":{"Service":"cognito-idp.amazonaws.com"},"Action":["ses:SendEmail","ses:SendRawEmail"],"Resource":"arn:aws:ses:us-east-1:483176634665:identity/akwadona.com","Condition":{"StringEquals":{"aws:SourceAccount":"483176634665"}}}]}' `
  --region $Region
```

If you see `AlreadyExistsException` the policy is in place — that's fine.

#### Switch Cognito to SES

```powershell
## NOTE: the pool ID below is the CURRENT user pool as of 2026-10-02.
## The June 2026 teardown + rebuild changed it from `us-east-1_RACghntmS` (Tiryaq era).
## If the stack is torn down again, re-read the current value from
## `aws cognito-idp list-user-pools --max-results 10` before running this script.
$poolId      = 'us-east-1_YibFfEdDD'
$emailConfig = '{"EmailSendingAccount":"DEVELOPER","From":"Akwadona <noreply@akwadona.com>","SourceArn":"arn:aws:ses:us-east-1:483176634665:identity/akwadona.com","ReplyToEmailAddress":"noreply@akwadona.com"}'

aws cognito-idp update-user-pool --user-pool-id $poolId --email-configuration $emailConfig
aws cognito-idp describe-user-pool --user-pool-id $poolId --query "UserPool.EmailConfiguration" --output table
```

You should see `EmailSendingAccount: DEVELOPER` and `From: Akwadona <noreply@akwadona.com>`.

### Sandbox vs production

Right after setup, SES is in **sandbox mode**:
- Cap: 200 emails / 24h, 1 / sec
- Can only deliver to verified recipient addresses
- Suitable for smoke testing only

Request production access (1–24h approval, free):

```powershell
aws sesv2 put-account-details `
  --production-access-enabled `
  --mail-type TRANSACTIONAL `
  --website-url "https://www.akwadona.com" `
  --use-case-description "Akwadona is a multi-tenant hospital management SaaS on AWS. We send transactional emails only: Cognito password-reset codes, first-login welcomes, and tenant-admin invitation emails. No marketing. Volume: under 1000/month initially. Recipients are hospital staff (signed BAA per tenant). Bounce/complaint handling will be auto-suppression via SES default." `
  --contact-language EN `
  --additional-contact-email-addresses "sami.t.taha98@gmail.com" `
  --region us-east-1
```

Check status:

```powershell
aws sesv2 get-account --region us-east-1 --query "{ Production: ProductionAccessEnabled }" --output table
```

For sandbox-only smoke testing, verify each recipient one at a time:

```powershell
aws sesv2 create-email-identity --email-identity recipient@example.com --region us-east-1
## AWS emails a verification link to that address; click it.
aws sesv2 get-email-identity --email-identity recipient@example.com --region us-east-1 --query "VerifiedForSendingStatus" --output text
```

### Smoke test — does forgot-password work?

1. Have a Cognito user whose email is a verified SES recipient (sandbox) or any address (production).
2. Make sure the user's `Status` is `CONFIRMED` (not `FORCE_CHANGE_PASSWORD`) — Cognito refuses to send reset emails to never-signed-in users.
3. In the app, click **Forgot password?** and enter the username.
4. Within ~10 sec the email should arrive in the inbox from `noreply@akwadona.com`.

If nothing arrives, run:

```powershell
aws sesv2 get-account --region us-east-1 --query "SendQuota" --output table
```

If `SentLast24Hours` went up by 1, SES delivered — check Gmail spam, "All Mail", filters.
If it stayed flat, Cognito didn't hand it off — check the troubleshooting section.

### Troubleshooting

- **`DkimStatus: PENDING` for >1 hour** — DNS not propagated. Verify each CNAME resolves: `nslookup -type=CNAME <token>._domainkey.akwadona.com`. Should return `<token>.dkim.amazonses.com`.
- **`MessageRejected: Email address is not verified`** — still in sandbox + recipient not verified. Either verify the recipient or wait for production access.
- **`cognito-idp.amazonaws.com is not authorized to perform: ses:SendEmail`** — SES identity policy missing. Re-run `create-email-identity-policy` from above.
- **Cognito accepts the API call but no email arrives + `SentLast24Hours` stays flat** — the Cognito user is in `FORCE_CHANGE_PASSWORD`. Cognito silently drops the request to prevent enumeration. Fix: `aws cognito-idp admin-set-user-password --permanent ...` to flip them to `CONFIRMED`.
- **Email arrives but lands in spam** — DKIM verification failed silently. Re-check `DkimStatus`. Add a DMARC record for extra trust: TXT `_dmarc` value `"v=DMARC1; p=none; rua=mailto:dmarc@akwadona.com"`.


## 8. Test fixtures and accounts

Purpose: keep test data identical across teardown/rebuild cycles so we can
compare screenshots + AWS resource names against past runs without confusion.

### Operator user (already seeded)

- Username: `sami`
- Password: `Apps@1234567`
- Email: `sami.t.taha98@gmail.com`
- Name: `Sami`
- `custom:tenantId`: `OPERATOR`
- Cognito group: `Operator`

### Tenant #1 — Tiryaq Hospital (primary demo tenant)

Onboarding wizard values:

Step 1 — Hospital
- Display name: `Tiryaq Hospital`
- URL slug: `tiryaq`
- Country (ISO-2): `QA`
- Contact email: `ops@akwadona.com`

Step 2 — Plan
- Plan tier: `Free` (10 req/s, 100k req/day — matches "testing, not real
  customers" rule; no bill surprises)
- Available options in wizard: `Free`, `Standard` (100 req/s, 1M req/day),
  `Enterprise` (500 req/s, 10M req/day)

Step 3 — Admin (wizard only asks two fields — no explicit username)
- Admin full name: `Tiryaq Admin`
- Admin email:     `sami.t.taha98+tiryaq@gmail.com`
  - Plus-alias so it (a) reaches your Gmail and (b) doesn't collide with the
    operator `sami` email (Cognito enforces email uniqueness across a pool
    when `AliasAttributes` includes email).
- Cognito username: wizard derives it as `admin-<slug>` (e.g. `admin-tiryaq`).
- Password: after onboarding, reset the wizard's random temp password to the
  standard test password `Apps@1234567`:
    `aws cognito-idp admin-set-user-password --user-pool-id <pool> --username admin-tiryaq --password 'Apps@1234567' --permanent`
- Temp password: shown ONCE on the success screen — copy it immediately.
  No email is sent; the operator forwards credentials over a trusted channel
  (standard SaaS practice). If lost, reset via operator console or
  `admin-set-user-password`.
- Sign-in URL shown by wizard: `https://<slug>.akwadona.com/` (fixed — used
  to wrongly show `app.akwadona.com`).

Step 4 — Review
- Verify slug becomes `tiryaq.akwadona.com`
- Verify KMS alias will be `alias/akwadona-tenant-tiryaq`
- Verify DDB rows will use `TENANT#tiryaq` partition
- Click Create

Post-create checks:
- Wizard shows green ticks on: DDB row, KMS CMK, Cognito user, seed row
- `alias/akwadona-tenant-tiryaq` exists in KMS
- Cognito user `admin` created with `custom:tenantId=tiryaq`, status
  `FORCE_CHANGE_PASSWORD`
- First-login email hits sami.t.taha98@gmail.com from
  `noreply@akwadona.com`

### Tenant #2 — Al Shifaa Hospital (secondary tenant, for cross-tenant isolation testing)

Only onboard when specifically testing cross-tenant isolation.

Step 1 — Hospital
- Display name: `Al Shifaa Hospital`
- URL slug: `alshifaa`
- Country (ISO-2): `QA`
- Contact email: `ops@akwadona.com`

Step 3 — Admin
- Admin username: `admin2`
- Admin email: `sami.t.taha98+alshifaa@gmail.com` (Gmail plus-alias, same
  inbox, avoids Cognito email-alias uniqueness collision with Tiryaq admin)
- Admin full name: `Al Shifaa Admin`

### Doctor + Receptionist + Pharmacist test users (per tenant)

Created inside a tenant by the tenant admin (after first-login).

Standard set:
- Doctor:       `doctor1`  / `Apps@1234567` / `sami.t.taha98+doc@gmail.com`
- Receptionist: `recep1`   / `Apps@1234567` / `sami.t.taha98+rec@gmail.com`
- Pharmacist:   `pharma1`  / `Apps@1234567` / `sami.t.taha98+pha@gmail.com`

All plus-aliased so the first-login emails arrive at your Gmail without
collision.

### Sample patient (per tenant, entered by receptionist)

- First name: `Ali`
- Last name: `Hassan`
- National ID: `28812345678` (11 digits, Qatar-style)
- DOB: `1988-05-14`
- Phone: `+974 5555 1234`
- Gender: `Male`
- Address: `Doha, Qatar`

### Sample appointment

- Patient: Ali Hassan
- Doctor: doctor1
- Date: today + 1 day
- Slot: `10:00 - 10:30`
- Reason: `Routine checkup`

### Blood-bank sample bag

- Blood type: `O+`
- Units: `1`
- Collection date: today
- Expiry: today + 42 days
- Donor ID: `DONOR-001`

### Prescription sample (for pharmacy test)

- Drug: `Paracetamol 500 mg`
- Dose: `1 tab`
- Frequency: `TID` (three times per day)
- Duration: `5 days`

---

Notes:
- All values are safe fake data — no real patient identifiers.
- Keep passwords the same across teardown cycles so muscle memory works.
- If Cognito complains about duplicate email during retry, either delete the
  half-created user (`aws cognito-idp admin-delete-user ...`) or use a
  plus-alias like `sami.t.taha98+retry@gmail.com`.

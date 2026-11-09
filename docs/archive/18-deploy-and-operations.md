# 18 — Deploy & Operations Playbook

> **Status:** Live. Last audited: 2026-10-02.
> **Audience:** Any engineer running a deploy or on-call rotation.
> **Replaces:** `deploy.ps1` and `deploy-push-commands.txt`, both of which still reference the dead Tiryaq-era bucket + distribution + CDK folder as of this writing. Follow this doc, not those files.

## 1. TL;DR
- Backend: `cd akwadona-cdk && npx cdk deploy --require-approval never --profile tiryaq-cdk`
- Frontend: clean cache → `ng build` → `aws s3 sync` → CloudFront invalidate.
- **Always verify live IDs before running** — committed scripts are stale.

## 2. What this is

**What it is** — the canonical deploy playbook for Akwadona's backend and frontend.

**Why it exists** — the committed `deploy.ps1` script points at infra that was torn down and rebuilt in June 2026, and the smaller `deploy-push-commands.txt` has the same issue. Running them unmodified fails. We needed one place with the current values and the pre-flight checks.

**Real-life example** — on 2026-10-01 the user ran `.\deploy.ps1 -FrontendOnly` after a weekend. The script spent 90 seconds building Angular, then errored on `aws s3 sync` because the target bucket no longer exists. This doc + the `akwadona-deploy-safety` skill prevent that.

**How Akwadona uses it** — this doc is the first stop before any deploy. The `akwadona-deploy-safety` skill (in `skills/`) programmatically applies this playbook when invoked.

## 3. Live identifiers (2026-10-02)

Always re-verify before use. The frontend bucket name is CloudFormation-generated and changes on every teardown-rebuild.

| Resource | Current value | How to verify |
|---|---|---|
| CloudFormation stack | `AkwadonaCdkStack` | `aws cloudformation describe-stacks --stack-name AkwadonaCdkStack --query "Stacks[].StackStatus"` |
| Frontend S3 bucket | `akwadonacdkstack-akwadonafrontendbucket*` (random suffix) | `aws s3 ls \| Select-String akwadonacdkstack-akwadonafrontendbucket` |
| Documents S3 bucket | `akwadona-documents-483176634665-us-east-1` | fixed name — see CDK |
| CloudFront distribution | `EMIDMHCZ9PRK4` → `d37kqu4c91mlc4.cloudfront.net` | `aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items[?@=='akwadona.com']].Id"` |
| API Gateway | `https://vbsex10bd6.execute-api.us-east-1.amazonaws.com` (name `akwadona-api`) | `aws apigatewayv2 get-apis --query "Items[?Name=='akwadona-api'].ApiEndpoint"` |
| Cognito pool | `us-east-1_bpipvSdQi` | `aws cognito-idp list-user-pools --max-results 10` |
| App client | `4r9fcr8f54pmubmmbnuldi9fqc` | matches `src/app.config.ts` |
| Account | `483176634665` | `aws sts get-caller-identity` |
| Region | `us-east-1` | `aws configure get region` |

## 4. IAM profiles (least-privilege model)

| Profile name | Scope | Used for |
|---|---|---|
| `tiryaq-cdk` | `sts:AssumeRole` on CDK bootstrap roles (`cdk-hnb659fds-*`). No other perms. | `cdk deploy`, `cdk diff`, `cdk synth`. |
| `hospital-deploy-user` | S3 PutObject/DeleteObject on frontend bucket + `kms:Encrypt` + `kms:GenerateDataKey` on data CMK + CloudFront CreateInvalidation on `EMIDMHCZ9PRK4` + `lambda:UpdateFunctionCode` on `akwadona-*`. | Frontend sync, invalidation, Lambda hot-patch. |
| (admin) | Root or AdministratorAccess. | Cognito user admin, KMS key creation, break-glass. |

Verify current profile: `aws sts get-caller-identity --profile <name>`.

## 5. Backend deploy — full stack

### 5.1 Pre-flight
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

### 5.2 Deploy
```powershell
npx cdk deploy AkwadonaCdkStack --require-approval never --profile tiryaq-cdk
```

Typical time: 2–8 minutes depending on changes.

### 5.3 Post-flight
- Check CloudFormation Events for any `UPDATE_FAILED` / `ROLLBACK_IN_PROGRESS`.
- Run `scripts/cross-tenant-probe.js` → exit 0.
- Smoke-test one API call per aggregate Lambda.

## 6. Frontend deploy — hot path

### 6.1 Build
```powershell
cd "C:\Users\Sami Toufic Taha\Desktop\aws apps\hospital"
Remove-Item -Recurse -Force .angular\cache -ErrorAction SilentlyContinue
ng build --configuration production
```

The cache clear is **not optional**. Stale Angular v20 + Tailwind v4 cache has emitted incomplete CSS before (dashboard grid collapses to one column). Takes ~5 s to clear, saves ~45 min of debugging.

### 6.2 Verify bucket name
```powershell
$bucket = (aws s3 ls | Select-String 'akwadonacdkstack-akwadonafrontendbucket' | ForEach-Object { ($_ -split '\s+')[2] })
Write-Host "Target bucket: $bucket"
```

If `$bucket` is empty, the stack was rebuilt and the suffix changed. STOP and investigate before continuing.

### 6.3 Sync + invalidate
```powershell
aws s3 sync "dist\verona-ng\browser" "s3://$bucket" --delete --profile hospital-deploy-user
aws cloudfront create-invalidation --distribution-id EMIDMHCZ9PRK4 --paths "/*" --profile hospital-deploy-user
```

### 6.4 Wait for invalidation + smoke test
```powershell
$inv = (aws cloudfront list-invalidations --distribution-id EMIDMHCZ9PRK4 --query "InvalidationList.Items[0].Id" --output text)
while ((aws cloudfront get-invalidation --distribution-id EMIDMHCZ9PRK4 --id $inv --query "Invalidation.Status" --output text) -eq "InProgress") {
    Start-Sleep -Seconds 10
    Write-Host "Still invalidating…"
}
Write-Host "Invalidation complete. Hard-refresh https://www.akwadona.com"
```

## 7. Lambda-only hot patch (fastest iteration)

For handler-code tweaks that don't change IAM / env / routes:

```powershell
$fn = "akwadona-pharmacy"   # replace with target
cd "akwadona-cdk\lambda\$fn"
Compress-Archive -Path *.js -DestinationPath function.zip -Force
aws lambda update-function-code --function-name $fn --zip-file fileb://function.zip --region us-east-1 --profile hospital-deploy-user
```

Follow with a smoke call to verify.

## 8. Post-teardown recovery (two-phase alias deploy)

After `scripts/teardown.ps1`, GoDaddy / Route 53 CNAMEs still point at the destroyed CloudFront. The fresh distribution refuses to attach aliases ("DNS record points to another distribution").

Use `scripts/recover.ps1` — it automates:
1. Phase 1 — `cdk deploy -c skipAliases=1`.
2. Repoint DNS to new `d*.cloudfront.net`.
3. Phase 2 — `cdk deploy` (normal) attaches aliases.

Expect ~30 min end-to-end + DNS propagation.

## 9. Rollback

| Scenario | Action |
|---|---|
| Bad Lambda deploy | `git checkout <prev-commit> -- akwadona-cdk/lambda/<folder>/`, repeat §7. |
| Bad CFN deploy mid-change | CloudFormation auto-rolls-back. If stuck: `aws cloudformation continue-update-rollback --stack-name AkwadonaCdkStack`. |
| Bad frontend deploy | Checkout previous commit, rebuild, repeat §6. |
| Entire account unrecoverable | `scripts/teardown.ps1` → `scripts/recover.ps1`. |

## 10. Known foot-guns + how to avoid them

### 10.1 SeedData CustomResource "may be replaced" every deploy
Historical note: the SeedData CustomResource used to use `properties: { timestamp: Date.now() }`, which caused it to re-run on every CFN update and reset the patient / doctor counters. Fixed in May 2026 by:
- Switching to a stable `seedVersion` property.
- Making the seed Lambda idempotent via `putIfAbsent`.
- Short-circuiting on `event.RequestType !== 'Create'`.

If you see `SeedData may be replaced` in the diff, verify the Lambda source still has the `!== 'Create'` short-circuit before deploying.

### 10.2 `aws s3 sync` prints "upload" but S3 is empty
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

### 10.3 Pre-token Lambda cold-start times out login
Cognito hard-caps pre-token-generation at 5 seconds. A cold Node.js container + DDB lookups can exceed that.

Fix on-demand: `aws lambda invoke --function-name cognito-pre-token-generation --payload '{"_warmup":true}' --cli-binary-format raw-in-base64-out /tmp/out.json`.

Permanent fix: re-add the EventBridge warmer rule (`events.Schedule.rate(5 min)` → `_warmup: true` payload). Removed in Step 7 cleanup to save CFN resources but may need to come back if first-login timeouts recur.

### 10.4 Dashboard cards stack vertically after deploy
Stale `.angular/cache` has emitted incomplete Tailwind CSS multiple times. **Always** clear it before `ng build` in production. See §6.1.

### 10.5 `cdk diff` shows unexpected deletes
Someone deployed a side-branch recently that removed resources. Compare `git log origin/development` vs your branch. Do NOT force-apply.

## 11. Monitoring during deploy

Watch three things:
- CloudWatch Logs → `/aws/lambda/akwadona-*` → scroll new invocations.
- CloudFormation Events → updates in real time.
- Browser DevTools on `https://www.akwadona.com` → Network tab after invalidation completes.

## 12. Compliance surface

- PDPPL Art. 9 (integrity & confidentiality) — deploy process does not weaken encryption at rest or in transit.
- HIPAA §164.312(a)(1) (access control) — IAM profiles separate deploy actors from data-plane actors.
- GDPR Art. 32 — change control is auditable via CloudTrail + git log.

## 12a. The 2026-10-29 change set — deploy checklist

This is one coordinated release: a CDK change plus 47 Lambda folders plus three scripts. Deploy it in this order. Each step says what to verify before the next. Total wall-clock ≈ 25 minutes; the user-visible window is the CloudFormation update in step 4 (Lambdas update in place, no downtime; the Cognito MFA change does not affect signed-in users).

**What is in the set** — see [`45-system-design-for-developers.md`](45-system-design-for-developers.md) §11 for the full table. In one line: KMS-deletion guard, least-privilege IAM, MFA OPTIONAL, documents-bucket KMS, API throttle, Node 20, two alarms + SNS, six auth gates, no-Scan rewrites of `getAllPatients` / `getAllDoctors` / pre-token / throttle / operator, DEK cache, `ttl`→`expiresAt`, CORS cleanup.

### Step 0 — read the diff (10 min)

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

### Step 1 — type-check and count resources (3 min)

```powershell
cd akwadona-cdk
npx cdk synth 2>&1 | Select-Object -Last 5           # must end without "error TS"
python -c "import json;print(len(json.load(open('cdk.out/AkwadonaCdkStack.template.json'))['Resources']))"   # expect 496
```

If the count is > 500, stop: something else was added since this change set. If `synth` reports a TypeScript error, the only new APIs used are `aws-cloudwatch`, `aws-cloudwatch-actions`, `aws-sns`, `CfnStage.defaultRouteSettings`, `Mfa.OPTIONAL`, `mfaSecondFactor` — all present in `aws-cdk-lib@2.244.0`.

### Step 2 — preview the IAM diff (2 min)

```powershell
npx cdk diff 2>&1 | Select-String -Pattern "IAM|Policy|Mfa|Runtime|Throttl|Alarm|Topic|Encryption" | Select-Object -First 60
```

Expect to see: 14 roles losing `dynamodb:PutItem/DeleteItem/BatchWriteItem` and gaining a conditional `UpdateItem`; the operator role's `ScheduleKeyDeletion` statement gaining a `Null` condition and a new DENY; 27 functions changing `Runtime: nodejs18.x → nodejs20.x`; `MfaConfiguration: OFF → OPTIONAL`; the documents bucket gaining `ServerSideEncryptionConfiguration` with `aws:kms`; one `AWS::SNS::Topic` and two `AWS::CloudWatch::Alarm` added; `DefaultRouteSettings` on the stage. If you see a **replacement** (not update) of the table, the pool, or a bucket — stop.

### Step 3 — Lambda code first, infra second? No — infra first

The new pre-token Lambda needs `kms:GenerateMac`, and the read-only Lambdas' new code still works under the old (broader) policy. So deploy the **CDK stack first** (it ships the Lambda code too — `Code.fromAsset` re-zips every changed folder).

```powershell
npx cdk deploy AkwadonaCdkStack --require-approval never 2>&1 | Tee-Object -FilePath ..\deploy-2026-10-29.log
```

Watch for `UPDATE_COMPLETE`. Typical duration 6–9 minutes. If it rolls back, the log names the resource; the likeliest culprit is the IAM `Null` condition syntax or a Lambda asset upload — neither affects live traffic because CloudFormation rolls back atomically.

### Step 4 — verify (5 min)

```powershell
# 4a. Alarms + topic exist; subscribe yourself
$topic = aws cloudformation describe-stacks --stack-name AkwadonaCdkStack --query "Stacks[0].Outputs[?OutputKey=='AlarmTopicArn'].OutputValue" --output text
aws sns subscribe --topic-arn $topic --protocol email --notification-endpoint <your e-mail>
# → click the confirmation link AWS sends

# 4b. Pre-token Lambda is the new one and healthy
aws lambda get-function-configuration --function-name cognito-pre-token-generation --query "{Runtime:Runtime,LastModified:LastModified}"
aws lambda invoke --function-name cognito-pre-token-generation --payload '{"_warmup":true}' out.json; Get-Content out.json   # {"ok":true,"warmed":true}

# 4c. Runtime sweep — no Node 18 left
aws lambda list-functions --query "Functions[?starts_with(FunctionName,'akwadona-')].[FunctionName,Runtime]" --output text | Select-String "nodejs18"   # expect no output

# 4d. MFA state
aws cognito-idp describe-user-pool --user-pool-id us-east-1_bpipvSdQi --query "UserPool.MfaConfiguration"   # "OPTIONAL"

# 4e. Documents bucket encryption
aws s3api get-bucket-encryption --bucket akwadona-documents-483176634665-us-east-1 --query "ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm"   # "aws:kms"

# 4f. Stage throttle
aws apigatewayv2 get-stage --api-id vbsex10bd6 --stage-name '$default' --query "DefaultRouteSettings"
```

### Step 5 — functional smoke (5 min, in the browser)

1. Sign in as a **doctor** on `tiryaq.akwadona.com` → the patient list is populated (proves the HMAC `doctorId` lookup). If it is empty, see the "Doctor sees no patients" row in `docs/26` §8.
2. Sign in as **admin1** → Patients → type a name in the search box → results appear (proves post-decrypt filtering). Sort by name → ordered. Filter by date of birth → filtered.
3. Admin → Doctors → same three checks.
4. Operator console → tenant list loads.
5. As the doctor, open DevTools and call `DELETE /departments` with the doctor's token → **403**.

### Step 6 — security suite + probe (3 min)

```powershell
cd ..
node scripts\security-tests\run-safe.js                     # exit 0
$env:TIRYAQ_USERNAME='admin1'; $env:TIRYAQ_PASSWORD='…'; $env:ALSHIFAA_USERNAME='…'; $env:ALSHIFAA_PASSWORD='…'
node scripts\cross-tenant-probe.js                           # exit 0 (writes + deletes probe rows — run against prod only off-hours, or point API_BASE at a dev stack)
```

### Step 7 — one-time cleanup (2 min)

```powershell
node scripts\purge-throttle-counters.js            # dry run: prints the count of stale rows
node scripts\purge-throttle-counters.js --apply    # deletes them
```

### Step 8 — frontend (no change in this set)

Nothing in `src/` changed. Skip the frontend deploy.

### Rollback

- **Whole set:** `git revert` the commit → `npx cdk deploy`. CloudFormation puts every resource back (runtime, IAM, MFA, bucket encryption are all in-place updates). Objects uploaded to the documents bucket while KMS was on stay KMS-encrypted and remain readable — `documentManagerFn` keeps its key grant.
- **One Lambda:** `git checkout HEAD~1 -- akwadona-cdk/lambda/<folder>` then the §7 hot-patch. Do **not** roll back the pre-token Lambda alone to the pre-change version while leaving the CDK change — it would be fine, but it reintroduces the two Scans.
- **MFA only:** change `Mfa.OPTIONAL` → `Mfa.OFF` and redeploy. (Cognito allows OPTIONAL→OFF directly.)

### After this set lands — the next three

1. GitHub Actions cron for `run-safe.js` (nightly, zero AWS resources) → the sales handbook's "automated" claim becomes true.
2. Enrol every Operator/Admin in TOTP → flip `Mfa.REQUIRED`.
3. Stack split (`docs/45` §9 #1) → re-enable WAF, add the remaining alarms, schedule the cross-tenant probe in EventBridge.

## 13. Open questions / future work

- Automate `aws s3 ls | Select-String` into a `recover-live-ids.ps1` helper that other scripts source.
- Replace committed `deploy.ps1` with a script that reads live IDs at runtime (don't hardcode).
- CD pipeline (GitHub Actions) — currently all deploys are manual.
- Blue/green frontend via CloudFront multi-origin + weighted alias.

## 14. References

- [`00-akwadona-explained.md`](00-akwadona-explained.md)
- [`01-lambda-and-infrastructure.md`](01-lambda-and-infrastructure.md)
- [`12-teardown-and-recover.md`](12-teardown-and-recover.md)
- [`akwadona-multitenant-setup.md`](akwadona-multitenant-setup.md)
- `../skills/akwadona-deploy-safety/SKILL.md`

---
name: akwadona-deploy-safety
description: Trigger before any deployment, release, infra change, or when the user says "deploy", "push to prod", "cdk deploy", "rollback", "ship it", "release", or "update the frontend". Prevents the recurring Akwadona deploy failures — stale deploy script IDs, two-phase alias race after teardown, KMS missing on S3 sync, stale Angular cache, CFN resource ceiling, cross-tenant probe before green-light, bucket name verification, invalidation path mistakes.
---

# Akwadona Deploy Safety

Deploys fail for the same five reasons on repeat. This skill makes you walk the pre-flight checklist out loud before pressing any button.

## 1. Pre-flight checklist (walk through every item, do not skip)

### 1.1 Identify what is being deployed
- Backend only (`cdk deploy`)?
- Frontend only (`ng build` + S3 sync + CloudFront invalidate)?
- Both?
- Full stack rebuild from scratch (post-teardown)?

Each has a different checklist.

### 1.2 Verify the target identifiers (never trust the committed script)

Both `deploy.ps1` and `deploy-push-commands.txt` are **stale** as of 2026-10. Confirm live values before using them:

```powershell
# Current frontend bucket (CFN-generated name — changes after every teardown)
aws s3 ls | Select-String -Pattern 'akwadonacdkstack-akwadonafrontendbucket'

# Current CloudFront distribution
aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items[?contains(@,'akwadona.com')]].{Id:Id,Domain:DomainName,Aliases:Aliases.Items}" --output table

# Current API Gateway endpoint
aws apigatewayv2 get-apis --query "Items[?Name=='akwadona-api'].{Id:ApiId,Endpoint:ApiEndpoint}" --output table
```

Expected (as of last known state):
- Distribution: `E1YOKWKHQNSPQW` → `d378t54x9p802t.cloudfront.net`
- API: `https://ouohmmpi31.execute-api.us-east-1.amazonaws.com`
- Cognito pool: `us-east-1_YibFfEdDD`

If any live value differs, STOP and update the deploy script before running.

### 1.3 Verify IAM profile has the right scope

| Operation | Required profile | Why |
|---|---|---|
| `cdk deploy` | A user with `sts:AssumeRole` on CDK bootstrap roles (`cdk-hnb659fds-*`). Default: `tiryaq-cdk` profile. | CDK uses bootstrap roles for all CFN work. Avoids granting the deploy user direct AdministratorAccess. |
| `aws s3 sync` to frontend bucket | A user with S3 PutObject + DeleteObject on the frontend bucket, **AND** `kms:Encrypt` + `kms:GenerateDataKey` on `alias/tiryaq/data` (or current data CMK). | Frontend bucket is KMS-encrypted. S3 PUT silently uploads 0 bytes without KMS perm. |
| `aws cloudfront create-invalidation` | `cloudfront:CreateInvalidation` on the specific distribution. | Scoped by ARN. |
| `aws lambda update-function-code` | `lambda:UpdateFunctionCode` on each function ARN. | Scoped by ARN. |

Verify: `aws sts get-caller-identity --profile <profile>`.

### 1.4 Pre-build hygiene

```powershell
# Clean Angular cache — stale Tailwind-v4 cache has produced incomplete CSS before
Remove-Item -Recurse -Force .angular\cache -ErrorAction SilentlyContinue

# Confirm no uncommitted "function.zip" or local experiments pollute the artifact
git status --porcelain | Select-String -NotMatch '\.(svg|png|jpg|woff2?|ico|css|json)$'
```

### 1.5 CDK diff before deploy — read every line

```powershell
cd akwadona-cdk
npm run build
npx cdk diff AkwadonaCdkStack --profile tiryaq-cdk
```

Flags to confirm:
- Any `Resources` section additions keep the total **below 500** (count current with `npx cdk synth AkwadonaCdkStack --profile tiryaq-cdk | grep 'Type: AWS' | wc -l`).
- `SeedData` / seed-user `CustomResource` deltas — if they appear "may be replaced", the inline Lambda source changed; verify re-run safety.
- Any `[~] AWS::Lambda::Function` changes without accompanying code change = CDK re-packaging. Harmless, but check the asset hash.
- `destroy` on routes/integrations is expected only when intentionally removing an endpoint.

### 1.6 Cross-tenant probe (nightly, but also pre-release)

```powershell
node scripts/cross-tenant-probe.js
```

Must exit 0 before any release that touches tenant-domain Lambdas (patients, doctors, appointments, examinations, pharmacy, documents, calendar, bloodbank, scribe).

### 1.7 Pre-token Lambda warmup

If the pre-token Lambda went cold (common after a teardown + rebuild), the FIRST login attempt times out at Cognito's 5s trigger cap. Pre-warm:

```powershell
aws lambda invoke --function-name cognito-pre-token-generation --payload '{"_warmup":true}' --cli-binary-format raw-in-base64-out /tmp/out.json
```

## 2. The two-phase alias deploy (post-teardown only)

After `scripts/teardown.ps1`, GoDaddy's cached CNAMEs still point at the destroyed CloudFront. The fresh distribution refuses to attach the aliases because the DNS record is "claimed" by the dead one.

### Phase 1 — deploy WITHOUT aliases
```powershell
cd akwadona-cdk
npx cdk deploy AkwadonaCdkStack -c skipAliases=1 --require-approval never --profile tiryaq-cdk
```

### Phase 2 — repoint DNS
Update Route 53 / GoDaddy CNAMEs for `akwadona.com` + `www.akwadona.com` + `*.akwadona.com` + `auth.akwadona.com` to the new `d*.cloudfront.net` domain.

### Phase 3 — deploy WITH aliases
```powershell
npx cdk deploy AkwadonaCdkStack --require-approval never --profile tiryaq-cdk
```

`scripts/recover.ps1` automates all three. Prefer it to running phases by hand.

## 3. Frontend-only deploy (hot path — safe to run often)

```powershell
cd "C:\Users\Sami Toufic Taha\Desktop\aws apps\hospital"
Remove-Item -Recurse -Force .angular\cache -ErrorAction SilentlyContinue
ng build --configuration production
# Confirm the bucket from §1.2 before running the next line:
aws s3 sync "dist\verona-ng\browser" "s3://<CURRENT_BUCKET>" --delete --profile hospital-deploy-user
aws cloudfront create-invalidation --distribution-id E1YOKWKHQNSPQW --paths "/*" --profile hospital-deploy-user
```

Wait for `aws cloudfront get-invalidation --distribution-id E1YOKWKHQNSPQW --id <id> --query "Invalidation.Status"` → `Completed` (30–60s), then hard-refresh (Ctrl+Shift+R) and sanity-check:
- Dashboard cards render in a row (not stacked — that's the cached-cache regression).
- Browser requests go to the current API endpoint.
- `cognito:groups` + `tenantId` are in the JWT (DevTools → Application → Storage → sessionStorage → accessToken → decode).

## 4. Lambda-only update (fastest iteration path)

For handler-code tweaks that don't change IAM / env / routes:

```powershell
cd akwadona-cdk\lambda\<folder>
Compress-Archive -Path *.js -DestinationPath function.zip -Force
aws lambda update-function-code --function-name akwadona-<kebab-case> --zip-file fileb://function.zip --region us-east-1 --profile hospital-deploy-user
```

Follow with a smoke call via DevTools or `curl` to verify.

## 5. Rollback

| Scenario | Recovery |
|---|---|
| Bad Lambda deploy | Previous zip is in CFN asset store; redeploy old asset via `aws lambda update-function-code --s3-bucket <cdk-assets> --s3-key <old-hash>.zip`. Or roll back the git commit and redeploy. |
| Bad CFN deploy mid-change | CloudFormation auto-rolls-back on failure. If it stalls, `aws cloudformation continue-update-rollback`. |
| Bad frontend deploy | `aws s3 sync` the previous `dist/` from a git checkout of the last good commit. CloudFront invalidate. |
| Entire account unrecoverable | `scripts/teardown.ps1` → `scripts/recover.ps1`. Expect ~30 min + DNS propagation. |

## 6. Post-deploy verification

Run through this checklist after every production deploy:

- [ ] Hit `https://www.akwadona.com` → operator sign-in page loads (custom Angular).
- [ ] Hit `https://tiryaq.akwadona.com` → tenant sign-in loads.
- [ ] Sign in as a known doctor → calendar renders (no 500, no 401 after ~2 min).
- [ ] Spot-check one API call in DevTools → 2xx with current `apiBaseUrl`.
- [ ] `aws cognito-idp list-users-in-group --user-pool-id us-east-1_YibFfEdDD --group-name Operator --query "Users[].Username"` — operator accounts still present.
- [ ] CloudWatch → Lambda errors in last 15 min = 0 (or expected).
- [ ] `scripts/cross-tenant-probe.js` → exit 0.

## 7. Response format when applying this skill

Before the user runs any deploy command, produce:

1. **Classification** — frontend / backend / Lambda-only / full rebuild.
2. **Live-ID verification commands** (section 1.2 above).
3. **The exact commands to run** (never paste the stale deploy script verbatim; substitute live IDs).
4. **Post-deploy checklist** (section 6).
5. **Rollback plan one-liner** (section 5).

If any live ID verification shows unexpected values, STOP and ask the user to confirm before proceeding.

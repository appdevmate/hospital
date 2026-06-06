# CDK Stack Deployment (Backend)

Deploys the backend: Lambdas, API Gateway, DynamoDB, Cognito, S3, CloudFront.

## What gets deployed

- One stack → `TiryaqCdkStack`
- Defined in → `tiryaq-cdk/lib/tiryaq-cdk-stack.ts`
- App entry → `tiryaq-cdk/bin/tiryaq-cdk.ts`
- Each Lambda is packaged from `tiryaq-cdk/lambda/<folder>` on every deploy

## Prerequisites

- Node.js + npm installed
- AWS CLI configured (a profile that can run CDK)
- CDK bootstrapped in the account/region
- Account / region → `483176634665` / `us-east-1`

## Step 1 — set environment (PowerShell)

```powershell
$env:CDK_DEPLOY_ACCOUNT = "483176634665"
$env:CDK_DEPLOY_REGION  = "us-east-1"
```

- `bin/tiryaq-cdk.ts` reads these to pick the deploy account + region
- If not set → falls back to default profile / `us-east-1`

## Step 2 — install deps

```powershell
cd "C:\Users\Sami Toufic Taha\Desktop\aws apps\hospital\tiryaq-cdk"
npm install
```

- Installs CDK + AWS SDK packages used by the stack

## Step 3 — deploy

```powershell
npx cdk deploy --require-approval never
```

- `npx cdk` → runs the local CDK CLI
- `deploy` → builds + pushes the stack to CloudFormation
- `--require-approval never` → skips the "approve IAM changes?" prompt
- `--all` is NOT needed (the WAF/edge stack is disabled)

## How a deploy operates (flow)

1. CDK **synth** → turns `tiryaq-cdk-stack.ts` into a CloudFormation template
2. **Asset publish** → zips each `lambda/<folder>` + uploads to the CDK assets bucket
3. CDK **assumes** the bootstrap roles (so your user needs only `sts:AssumeRole`)
4. **CloudFormation** creates/updates resources to match the template
5. On any resource failure → the whole change **rolls back**

## Read the output

- `✅ TiryaqCdkStack` → deployed
- `✅ no changes` → already matches your code
- `❌ … failed` → check the last `CREATE_FAILED` / `UPDATE_FAILED` line

## Stack outputs (printed after deploy)

| Output | Meaning |
|--------|---------|
| `ApiUrl` | API Gateway base URL |
| `UserPoolId` | Cognito user pool id |
| `AppClientId` | Cognito app client id |
| `CognitoAuthority` | Cognito issuer URL |
| `CloudFrontUrl` | Frontend URL |
| `S3BucketName` | Frontend bucket (sync target) |
| `DistributionId` | CloudFront (invalidation) |
| `DocumentsBucketName` | Uploads bucket |

Re-print them anytime:
```powershell
aws cloudformation describe-stacks --stack-name TiryaqCdkStack --region us-east-1 --query "Stacks[0].StackStatus" --output text
```

## Where to put the values (frontend config)

After deploy, copy outputs into these files, then redeploy the frontend.

| Output | File | What to set |
|--------|------|-------------|
| `ApiUrl` | `src/app/services/config.ts` | `tiryaqUrl` (line ~2) |
| `CognitoAuthority` (or `UserPoolId`) | `src/app.config.ts` | `authority` (in `provideAuth`) |
| `AppClientId` | `src/app.config.ts` | `clientId` (in `provideAuth`) |

Current values:

```ts
// src/app/services/config.ts
private static readonly tiryaqUrl = 'https://jxz59jh15f.execute-api.us-east-1.amazonaws.com';
```

```ts
// src/app.config.ts → provideAuth({ config: { ... } })
authority: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_RACghntmS',
clientId:  '2nfjfipi8hri262pjohtpgl45q',
```

Notes:
- API calls are built with `Config.buildUrl('path')` → `${tiryaqUrl}/path`
- `authority` = `https://cognito-idp.<region>.amazonaws.com/<UserPoolId>`
- Bucket name + distribution id for the frontend deploy → see `02-frontend-deployment.md`

## Useful commands

```powershell
npx cdk diff     # preview what will change
npx cdk synth    # validate the template locally
```

## Notes

- DynamoDB, Cognito, KMS, buckets = RETAIN (kept on destroy)
- Config values in `config.ts` / `app.config.ts` are **public** (bundled in the browser) — safe to commit (IDs/URLs only, no secrets)

## Full reference

- `docs/infrastructure/01-AWS-CDK-Reference.md`


## Sync Counter Appointments
```powershell
cd "C:\Users\Sami Toufic Taha\Desktop\aws apps\hospital\scripts"
node sync-appointments-counter.js
```
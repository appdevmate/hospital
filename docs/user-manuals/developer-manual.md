# Tiryaq User Manual — Developer

**Document version:** 1.0
**Date:** 2026-04-30
**Audience:** Users in the **Developers** Cognito group
**Tone:** Technical, code-aware, assumes AWS literacy.

---

## 1. Who you are

You build and operate Tiryaq. You write CDK, Lambda, and Angular code. You deploy. You debug production. You have read access to most of the application's data for diagnostic purposes, but you should not browse PHI casually — every read is audited.

---

## 2. Repository layout

```
hospital/
├── src/                      # Angular 21 + PrimeNG frontend
│   ├── app/
│   │   ├── components/       # Domain modules
│   │   ├── services/         # API clients, auth
│   │   ├── interceptors/     # JWT injection
│   │   └── guards/           # Route protection by role
│   ├── app.config.ts         # Cognito wiring (authority, clientId)
│   └── ...
├── tiryaq-cdk/               # AWS CDK (TypeScript)
│   ├── bin/                  # CDK app entry
│   ├── lib/                  # Stacks
│   └── lambda/               # Node.js Lambda functions (CommonJS)
├── docs/
│   ├── compliance/           # PDPPL/MOPH/NCSA documentation
│   ├── infrastructure/       # AWS + CDK reference
│   ├── scribefirst/          # ScribeFirst feature docs
│   └── user-manuals/         # This folder
└── ...
```

---

## 3. Local development

### 3.1 Frontend

```powershell
cd hospital
npm install
npm start          # ng serve on http://localhost:4200
```

`localhost:4200` is whitelisted in Cognito callback URLs and API Gateway CORS. Sign in with any test user.

### 3.2 CDK

```powershell
cd hospital\tiryaq-cdk
npm install
npx cdk synth      # validate the stack templates locally
npx cdk diff       # see what would change vs. the live stack
```

### 3.3 Lambda development loop

Lambdas are deployed via `cdk deploy`. **CDK deploy is currently bypassed** for fast iteration — use the existing `Compress-Archive` + `update-function-code` pattern documented in CLAUDE.md.

```powershell
cd tiryaq-cdk\lambda\createPatient
Compress-Archive -Path *.js -DestinationPath function.zip -Force
aws lambda update-function-code `
    --function-name createPatient `
    --zip-file fileb://function.zip `
    --region us-east-1
```

This skips CDK and CloudFormation. Use it for iterating on a single function. Use full `cdk deploy` when CDK metadata changes (new IAM, new env vars).

---

## 4. Conventions you must follow

### 4.1 DynamoDB single-table design

- One table: `Hospital`.
- Every item has `PK`, `SK`, `EntityType`, plus domain-specific attributes.
- Always wrap writes with `withCompliance` from `tiryaq-cdk/lambda/_shared/compliance.js` to ensure `dataClass`, `createdAt`, `updatedAt` are stamped.

### 4.2 Cognito groups arrive bracket-wrapped

```js
// JWT claim "cognito:groups" comes as: ["[Doctors]"]
// Always strip:
const groups = (claims['cognito:groups'] || [])
    .map(g => g.replace(/^\[|\]$/g, ''));
```

### 4.3 Transactional writes for uniqueness locks

When creating users / patients with unique fields (email, QID, phone), use DynamoDB `TransactWriteItems` with conditional `attribute_not_exists(PK)` on lock items. Examples in `createPatient` and `createDoctor`.

### 4.4 No hardcoded secrets

- Never commit credentials, API keys, or production endpoints.
- Use Secrets Manager for runtime secrets.
- Use CDK environment variables for configuration values.

---

## 5. Deployment workflow

### 5.1 Standard release

1. Branch from `main`.
2. Code + commit.
3. `npx cdk diff` — review the proposed AWS changes.
4. `npx cdk deploy --all --require-approval never` from your machine, OR via CI.
5. `ng build --configuration production` → `aws s3 sync` → CloudFront invalidation.

### 5.2 The "DynamoDB only allows ONE GSI per update" rule

Documented in the CDK comments. If you add a new GSI, deploy it alone — do not bundle multiple new GSIs in one PR.

### 5.3 Region-pinning (CRITICAL for production)

- `bin/tiryaq-cdk.ts` defaults to `us-east-1` (dev). For production it MUST be `me-south-1`.
- Override with `$env:CDK_DEPLOY_REGION` only with a documented MOPH approval reason.

---

## 6. Debugging in production

### 6.1 Check Lambda logs

```powershell
aws logs tail "/aws/lambda/createPatient" --region us-east-1 --since 10m --follow
```

### 6.2 Trace a specific request

- Find the request ID in the API Gateway access log or the user's browser network tab.
- Search CloudWatch Logs Insights:

```
fields @timestamp, @message
| filter @message like /<request-id>/
| sort @timestamp asc
```

### 6.3 Check CloudTrail for "who did what"

```powershell
aws cloudtrail lookup-events --region us-east-1 `
    --lookup-attributes AttributeKey=Username,AttributeValue=admin1 `
    --max-results 50
```

### 6.4 Inspect DynamoDB

The console works, but for queries use the AWS CLI:

```powershell
aws dynamodb query --table-name Hospital --region us-east-1 `
    --key-condition-expression "PK = :pk" `
    --expression-attribute-values '{ \":pk\": { \"S\": \"PATIENT#abc-123\" } }'
```

---

## 7. Code quality expectations

- Production-grade, specific, no clever shortcuts.
- ESLint + Prettier on commit.
- Lambda functions have a single responsibility — no domain mixing.
- Angular services are typed; no `any` outside type-narrowing helpers.
- Pull requests must include a manual test note describing what you verified.

---

## 8. What you should NOT do

- Don't browse patient records out of curiosity. Every DynamoDB read on `PATIENT#*` is audited via CloudTrail data events (when enabled) and via the application audit Lambda.
- Don't disable MFA, even temporarily, for "testing convenience."
- Don't expose Lambda logs publicly.
- Don't commit AWS credentials.
- Don't make a production deploy from a dev machine without signed-off ticket reference.

---

## 9. Useful AWS Console links (us-east-1 dev)

- CloudFormation stacks: https://us-east-1.console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks
- DynamoDB: https://us-east-1.console.aws.amazon.com/dynamodbv2/home?region=us-east-1#tables
- Cognito: https://us-east-1.console.aws.amazon.com/cognito/v2/idp/user-pools?region=us-east-1
- CloudFront: https://us-east-1.console.aws.amazon.com/cloudfront/v4/home
- WAF: https://us-east-1.console.aws.amazon.com/wafv2/homev2/web-acls

---

## 10. Where to find more docs

- `docs/compliance/` — regulatory framework, status, updates
- `docs/infrastructure/01-AWS-CDK-Reference.md` — services + costs + deploy runbook
- `docs/scribefirst/01-ScribeFirst-Design.md` — voice-scribe feature
- `CLAUDE.md` — project conventions & rules

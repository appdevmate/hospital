# Tiryaq — AWS Services, Costs, and CDK Stack Reference

**Document version:** 1.0
**Date:** 2026-04-30
**Owner:** Sami Taha
**Scope:** Infrastructure only. No application logic, no user manuals.

---

## 1. Purpose

This document is the operations-and-architecture reference. It answers three questions:

1. Which AWS services does Tiryaq use, and why?
2. What does each one cost per month?
3. How is the CDK stack organised, and how do you deploy it?

---

## 2. Architecture at a glance

```
                        ┌────────────────────────────┐
                        │  TiryaqEdgeStack           │
                        │  (us-east-1 — global)      │
                        │  ┌──────────────────────┐  │
                        │  │ AWS WAFv2 WebACL     │  │
                        │  │ (managed rules + RL) │  │
                        │  └──────────────────────┘  │
                        └─────────────┬──────────────┘
                                      │ webAclId
                                      ▼
┌────────────────────────────────────────────────────────────────┐
│  TiryaqCdkStack  (us-east-1 dev / me-south-1 production)        │
│                                                                  │
│  ┌────────────┐    ┌──────────────┐    ┌──────────────────┐    │
│  │ CloudFront │───▶│ S3 (CMK)     │    │ S3 audit (CMK +  │    │
│  │            │    │ Angular SPA  │    │  Object Lock 7y) │    │
│  └─────┬──────┘    └──────────────┘    └──────────────────┘    │
│        │                                                         │
│        │ /api/*                ┌──────────────────────────┐     │
│        └─────────────────────▶ │ API Gateway HTTP API      │    │
│                                │ + JWT authoriser           │    │
│                                └─────────┬──────────────────┘    │
│                                          │                        │
│                            38× ┌─────────▼──────────┐             │
│                            ┌─▶ │ Lambda (Node 20/24)│             │
│                            │   └─────────┬──────────┘             │
│                            │             │                         │
│       ┌────────────────────┘             ▼                         │
│       │                          ┌────────────────┐                │
│  ┌────▼──────┐   pre-token      │  DynamoDB       │                │
│  │ Cognito   │  ─────────────▶  │  Hospital       │                │
│  │ User Pool │                  │  (CMK + PITR)   │                │
│  │ + MFA     │                  │  7 GSIs         │                │
│  └───────────┘                  └────────────────┘                 │
│                                                                    │
│  ┌────────────┐    ┌─────────────┐    ┌──────────────────┐        │
│  │ KMS data   │    │ KMS audit   │    │ Secrets Manager  │        │
│  │ CMK        │    │ CMK         │    │ /tiryaq/seed-... │        │
│  └────────────┘    └─────────────┘    └──────────────────┘        │
│                                                                    │
│  ┌────────────────────────────────────┐                           │
│  │ CloudTrail (multi-region)          │                           │
│  │ + S3 access logs bucket            │                           │
│  │ + CloudFront access logs           │                           │
│  └────────────────────────────────────┘                           │
└────────────────────────────────────────────────────────────────────┘
```

---

## 3. AWS services in use

### 3.1 Compute

| Service | Role | Resources |
|---------|------|-----------|
| **AWS Lambda** | Application logic — every API endpoint is a Lambda | 38 functions. Node.js 18, 20, or 24. CommonJS. 30-second timeout. |

### 3.2 Networking & delivery

| Service | Role | Resources |
|---------|------|-----------|
| **Amazon CloudFront** | Global CDN + TLS termination + WAF integration | 1 distribution, OAC binding to S3, security headers policy, TLS 1.2+ |
| **AWS WAFv2** | OWASP / SQLi / rate-limit filtering at the edge | 1 WebACL in us-east-1 with managed rules + 2,000 req/5-min per-IP rate limit |
| **Amazon API Gateway (HTTP API v2)** | REST entry point for all Lambdas | 1 API, ~70 routes, JWT authoriser bound to Cognito |
| **AWS Shield Standard** | DDoS protection (auto-enabled on CloudFront) | Free, no config |

### 3.3 Identity

| Service | Role | Resources |
|---------|------|-----------|
| **Amazon Cognito** | Authentication, MFA, RBAC | 1 User Pool, 1 App Client, 4 groups (Admin, Developers, Doctors, Pharmacists), pre-token Lambda, advanced threat protection |

### 3.4 Storage

| Service | Role | Resources |
|---------|------|-----------|
| **Amazon DynamoDB** | Primary database, single-table design | `Hospital` table, 7 GSIs, PITR ON, CMK encryption, deletion protection, TTL on `expiresAt` |
| **Amazon S3 — frontend** | Hosts the Angular SPA build | KMS-encrypted, versioned, OAC-only, server access logs |
| **Amazon S3 — audit** | CloudTrail logs + future audit exports | Object Lock compliance mode, 7-year retention, KMS audit key |
| **Amazon S3 — access-logs** | S3 + CloudFront service logs | SSE-S3 (required by S3 logging), versioned, lifecycle to Glacier |

### 3.5 Security & secrets

| Service | Role | Resources |
|---------|------|-----------|
| **AWS KMS** | Customer-managed encryption keys | 2 CMKs: `alias/tiryaq/data`, `alias/tiryaq/audit`. Annual rotation. |
| **AWS Secrets Manager** | Stores temp seed-user passwords | 8 secrets under `/tiryaq/seed-users/*`, encrypted with data CMK |
| **AWS CloudTrail** | Infra-level audit | Multi-region trail, log file validation, CloudWatch Logs forward, audit S3 destination |
| **AWS IAM** | All execution roles, least-privilege scoped | ~50 roles auto-managed by CDK |

### 3.6 Operations

| Service | Role | Resources |
|---------|------|-----------|
| **CloudWatch Logs** | Lambda + CloudTrail log destination | 1-year retention on the trail, default on Lambdas |
| **AWS CloudFormation** | Underlying deployment engine for CDK | 2 stacks: `TiryaqEdgeStack`, `TiryaqCdkStack` |

---

## 4. Per-service monthly cost estimate

Assumptions: 10 doctors active, 200 patient visits/day, modest read traffic, dev region us-east-1.

| Service | Driver | Estimated $/month |
|---------|--------|-------------------|
| DynamoDB (PAY_PER_REQUEST) | ~5 M reads + ~500 K writes | $5–$15 |
| DynamoDB PITR | Storage × 10% premium | $2 |
| Lambda | ~3 M invocations, avg 200 ms | $5–$10 |
| API Gateway HTTP API | ~3 M requests | $3 |
| Cognito | First 50 K MAUs free; advanced security $0.05/MAU | < $5 |
| CloudFront | ~50 GB egress + 5 M req | $5–$10 |
| S3 frontend | < 1 GB stored | $0.05 |
| S3 audit (CMK + Object Lock) | ~5 GB CloudTrail/month | $0.20 + KMS calls $1 |
| S3 access-logs | ~2 GB | $0.05 |
| KMS (2 CMKs) | $1/key + per-request | $3–$5 |
| Secrets Manager | 8 secrets × $0.40 | $3.20 |
| CloudTrail (management events) | First trail free | $0 |
| CloudTrail data events (off) | — | $0 |
| WAFv2 | $5 base + $1/managed group × 3 + $0.60/M req | $13 |
| CloudWatch Logs | Trail + Lambdas | $5 |
| **Total Tiryaq core** | — | **~$50–$80 / month** |

**ScribeFirst additional cost** (when enabled — see ScribeFirst design doc): ~$497/doctor/month from Transcribe Medical streaming.

**Free tier note.** Several services (Lambda, DynamoDB, CloudFront, Cognito MAU) have generous free tiers that absorb early-stage usage. Real bills tend to start around $40 even at very low traffic, due to KMS + Secrets Manager + WAF baseline charges.

---

## 5. CDK stack layout

### 5.1 Files

```
tiryaq-cdk/
├── bin/
│   └── tiryaq-cdk.ts          # CDK app entry; instantiates both stacks
├── lib/
│   ├── tiryaq-cdk-stack.ts    # Main stack (data plane region)
│   └── tiryaq-edge-stack.ts   # Edge stack (us-east-1 only — WAF)
├── lambda/
│   ├── _shared/
│   │   └── compliance.js       # withCompliance helper (PHI/PII/AUDIT tagging)
│   ├── createPatient/
│   ├── tiryaq-pharmacy/
│   ├── tiryaq-examinations/
│   └── …                       # ~38 function folders
├── cdk.json
└── package.json
```

### 5.2 Stack responsibilities

| Stack | Region | What it owns |
|-------|--------|--------------|
| `TiryaqEdgeStack` | us-east-1 (always) | WAFv2 WebACL only — CloudFront WAFs are global resources, AWS only exposes the API in us-east-1 |
| `TiryaqCdkStack` | me-south-1 prod / us-east-1 dev | Everything else: KMS keys, S3 buckets, CloudTrail, DynamoDB, Cognito, all Lambdas, API Gateway, CloudFront distribution |

Cross-region wiring: `crossRegionReferences: true` on both stacks; the WebACL ARN is exported from the edge stack and consumed by the main stack.

### 5.3 Naming & tagging

- Resources are **not** prefixed with `tiryaq` consistently (CDK auto-naming) — the stack itself is the namespace.
- Tagging is **not enforced yet** — see deferred items list.

---

## 6. How to deploy (runbook)

### 6.1 First-time setup

```powershell
# Confirm AWS credentials are loaded
aws sts get-caller-identity

# Set deploy environment
$env:CDK_DEPLOY_ACCOUNT = "<your-account-id>"
$env:CDK_DEPLOY_REGION  = "us-east-1"   # or me-south-1 for production

cd tiryaq-cdk
npm install

# Bootstrap both regions (us-east-1 is needed for the edge stack regardless of main region)
npx cdk bootstrap "aws://$env:CDK_DEPLOY_ACCOUNT/us-east-1"
npx cdk bootstrap "aws://$env:CDK_DEPLOY_ACCOUNT/me-south-1"   # if main is me-south-1
```

### 6.2 Deploy

```powershell
npx cdk deploy --all --require-approval never
```

This deploys both stacks. The `--all` flag is required — the main stack depends on the edge stack's WAF ARN.

### 6.3 Capture outputs (7 values you need afterwards)

```powershell
aws cloudformation describe-stacks --stack-name TiryaqCdkStack `
    --region $env:CDK_DEPLOY_REGION `
    --query "Stacks[0].Outputs"
```

Outputs:

| Output | Used in |
|--------|---------|
| `ApiUrl` | `src/app/services/config.ts` (`tiryaqUrl`) |
| `UserPoolId` | `src/app.config.ts` (`authority`) |
| `AppClientId` | `src/app.config.ts` (`clientId`) |
| `CognitoAuthority` | reference only |
| `CloudFrontUrl` | open in a browser; also paste back into the CDK callback URLs and re-deploy |
| `S3BucketName` | `aws s3 sync` target |
| `DistributionId` | `aws cloudfront create-invalidation` |

### 6.4 Build and publish the Angular app

```powershell
cd ..
npm install
npx ng build --configuration production
aws s3 sync dist\verona-ng\browser\ s3://<S3BucketName>/ --region $env:CDK_DEPLOY_REGION --delete
aws cloudfront create-invalidation --distribution-id <DistributionId> --paths "/*"
```

### 6.5 Tear down

```powershell
# Empty buckets first
aws s3 rm s3://<frontend-bucket> --recursive
aws s3 rm s3://<access-logs-bucket> --recursive
# Audit bucket has Object Lock — cannot be emptied. Leave it.

# Destroy stacks
npx cdk destroy --all --force

# Manually delete RETAIN resources (Cognito, DynamoDB, KMS keys are RETAIN by design)
```

---

## 7. CloudFormation resource counts

| Stack | Resources | Notes |
|-------|-----------|-------|
| `TiryaqEdgeStack` | ~3 | Trivial — just the WebACL + metadata |
| `TiryaqCdkStack` | ~408 | Approaching the CFN per-stack soft limit of 500. Future modules should consider a separate stack to avoid exhausting headroom. |

---

## 8. Compliance posture (summary)

This is the "what does AWS give us out of the box" view. The full compliance treatment is in `docs/compliance/01-Qatar-GCC-Compliance-Master.md`.

| Control | Service used |
|---------|-------------|
| Encryption at rest | DynamoDB CMK, S3 KMS, Secrets Manager KMS |
| Encryption in transit | CloudFront TLS 1.2+, API Gateway HTTPS |
| Auth + MFA | Cognito (mandatory MFA, 12-char password, advanced threat protection) |
| Application audit | `tiryaq-audit` Lambda + DynamoDB AUDIT entities |
| Infrastructure audit | CloudTrail multi-region, log file validation, immutable S3 |
| WAF / OWASP defence | WAFv2 managed rules + rate limit |
| DDoS | Shield Standard (free, automatic) |
| Backup / recovery | DynamoDB PITR (35-day window) |
| Secret management | Secrets Manager (no hardcoded credentials) |

---

## 9. Document control

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | 2026-04-30 | Sami Taha | Initial issuance |

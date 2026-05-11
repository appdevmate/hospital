# Compliance Update 04 — WAF, CloudTrail, audit log buckets, security headers

**Date:** 2026-04-29
**Author:** Sami Taha
**Severity addressed:** 🟠 High
**Obligations closed:** Matrix rows 7 (infra audit), 15 (WAF), 16 (DDoS via Shield), and partial 6/8 (audit retention)
**Gaps closed from status doc:** B.6, B.7, B.8, plus partial uplift to B.12 (S3 versioning)

---

## What was fixed

### 1. CloudFront protected by WAFv2

- New file `tiryaq-cdk/lib/tiryaq-edge-stack.ts` defines a CloudFront-scoped WAFv2 WebACL in `us-east-1` (AWS limitation — CloudFront WAFs are global resources only exposed via that region).
- `bin/tiryaq-cdk.ts` now deploys two stacks: `TiryaqEdgeStack` (us-east-1) and `TiryaqCdkStack` (me-south-1), with `crossRegionReferences: true` to pass the WebACL ARN.
- WAF rule set:
  - `AWSManagedRulesCommonRuleSet` — OWASP Top-10 baseline.
  - `AWSManagedRulesKnownBadInputsRuleSet` — known exploit signatures.
  - `AWSManagedRulesSQLiRuleSet` — SQL injection.
  - Per-IP rate limit: 2,000 requests / 5 minutes.

### 2. CloudFront security headers

- Added `responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS` — adds HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy automatically.
- `minimumProtocolVersion: TLS_V1_2_2021` — explicit TLS floor (matches PDPPL Art. 9 expectations).

---

## What was added

### 3. CloudTrail multi-region trail

- Captures every AWS API call across all regions.
- `enableFileValidation: true` — every log file gets a SHA-256 digest, enabling tamper detection.
- Forwards to CloudWatch Logs (1-year retention) for real-time alerting.
- Encrypted with `tiryaqAuditKey` (separate CMK from the data key).

### 4. Two new S3 buckets

| Bucket | Purpose | Encryption | Object Lock | Retention |
|--------|---------|------------|-------------|-----------|
| `tiryaq-audit-{acct}-{region}` | CloudTrail logs, future audit exports | KMS CMK (audit key) | **Compliance mode** | 7 years (immutable) |
| `tiryaq-access-logs-{acct}-{region}` | S3 server access logs, CloudFront access logs | SSE-S3 (AWS limitation: KMS not supported as destination) | none | 7 years lifecycle (IA → Glacier → expire) |

The split is deliberate: audit-grade evidence is immutable in `auditBucket`; AWS service logs go to `accessLogsBucket` because S3 server access logs and CloudFront standard logs cannot target a KMS-CMK bucket.

### 5. S3 frontend bucket — versioning + access logs

- `versioned: true` — every object overwrite preserves the previous version.
- `serverAccessLogsBucket` points at `accessLogsBucket` with prefix `s3-access/frontend/`.
- Lifecycle rule expires noncurrent versions after 180 days.

### 6. CloudFront access logs

- `enableLogging: true` with `logBucket: accessLogsBucket` and prefix `cloudfront/`.
- Records every viewer request — required for forensic investigation under PDPPL Art. 14.

### 7. Audit-key resource policy

- KMS audit key now grants `kms:GenerateDataKey*` and `kms:DescribeKey` to the CloudTrail service principal scoped to this account — required for CloudTrail to write encrypted log files.

---

## What was NOT touched in this update

- Hardcoded passwords (Update 05).
- Data classification, TTL, dataClass GSI (Update 06).
- Multi-tenancy refactor (deferred).
- Breach notification SNS pipeline (deferred to Phase 2).
- AWS Backup vault for long-term DynamoDB archive (deferred to Phase 2).

---

## Operational impact

- **Two stacks now.** Deploy command is now:
  ```bash
  npx cdk deploy --all
  # or explicitly:
  npx cdk deploy TiryaqEdgeStack TiryaqCdkStack
  ```
- **WAF cost:** ~$5/month base + $1 per managed rule group + per-request charges. Expected ~$15/month at current scale.
- **CloudTrail cost:** $2 per 100k management events. Data events on the frontend bucket can be added later if PHI access tracking via pre-signed URLs is in scope.
- **Bucket bootstrap:** First deploy will create three S3 buckets (frontend already exists, plus 2 new). Object Lock cannot be enabled on an existing bucket — for re-deploys against a pre-existing audit bucket, you must drop and recreate.
- **Cross-region references** require both stacks to be deployed by the same CDK CLI invocation; they cannot be deployed independently.

---

## How to verify

```bash
# 1. WAF attached to CloudFront
aws cloudfront get-distribution --id <dist-id> --query "Distribution.DistributionConfig.WebACLId"

# 2. CloudTrail running
aws cloudtrail get-trail-status --name tiryaq-cloudtrail --region me-south-1
# expect: IsLogging=true

# 3. Audit bucket has Object Lock
aws s3api get-object-lock-configuration --bucket tiryaq-audit-<acct>-me-south-1
# expect: ObjectLockEnabled=Enabled, Mode=COMPLIANCE, Days=2555

# 4. Frontend bucket versioning
aws s3api get-bucket-versioning --bucket <frontend-bucket>
# expect: Status=Enabled
```

---

## Rollback

- `cdk destroy TiryaqEdgeStack` removes the WAF; CloudFront silently stops filtering.
- `cdk destroy` will NOT delete the audit bucket (RETAIN) or KMS keys (RETAIN). This is intentional — destroying audit storage breaks the chain of custody.
- Manual cleanup of audit bucket requires waiting out the 7-year Object Lock retention or contacting AWS Support for an exception (rarely granted).

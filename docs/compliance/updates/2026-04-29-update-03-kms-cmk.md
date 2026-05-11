# Compliance Update 03 — Customer-managed KMS keys for data and audit

**Date:** 2026-04-29
**Author:** Sami Taha
**Severity addressed:** 🟠 High
**Obligations closed:** Matrix row 2 (encryption at rest with customer control)
**Gaps closed from status doc:** B.5 (data plane); B.8 audit-key portion (audit bucket itself comes in Update 04)

---

## What was fixed

### 1. DynamoDB now uses a customer-managed KMS key

- `encryption: CUSTOMER_MANAGED` plus `encryptionKey: tiryaqDataKey`.
- Replaces AWS-owned default key. Tiryaq controls rotation, policy, and revocation.
- `deletionProtection: true` added — guards against accidental table drop.

### 2. S3 frontend bucket upgraded to KMS

- `encryption: BucketEncryption.KMS`, `encryptionKey: tiryaqDataKey`.
- `bucketKeyEnabled: true` — uses S3 Bucket Keys to reduce KMS API cost ~99%.
- `enforceSSL: true` — bucket policy now denies any non-TLS request.

---

## What was added

### 3. Two new CMKs

| Key alias | Purpose | Why segregated |
|-----------|---------|----------------|
| `alias/tiryaq/data` | Encrypts DynamoDB and frontend bucket | Data-plane control |
| `alias/tiryaq/audit` | Will encrypt audit bucket + CloudTrail (Update 04) | If the data key is ever compromised, the audit chain remains independently encrypted and verifiable |

Both keys:
- `enableKeyRotation: true` — annual automatic rotation by AWS.
- `removalPolicy: RETAIN` — survives `cdk destroy` to avoid losing access to encrypted data.
- `pendingWindow: 30 days` — scheduled-deletion grace period before a key is permanently destroyed.

### 4. Lambda execution roles granted KMS access

- All 37 application Lambdas plus the `seedFn` are explicitly granted `Encrypt` / `Decrypt` / `GenerateDataKey` on `tiryaqDataKey`.
- DynamoDB with CMK requires the calling principal to have key access — without this, every read/write would fail with `AccessDeniedException`.

---

## What was NOT touched in this update

- Audit log bucket itself (separate bucket with Object Lock) — Update 04.
- CloudTrail and CloudFront WAF — Update 04.
- Lambda environment variable encryption — deferred (rarely contains secrets in Tiryaq).

---

## Operational impact

- **First deploy after this change** will fail if AWS-managed key is the current encryption setting on the existing table — DynamoDB does not support live encryption type change via CloudFormation. Mitigation:
  1. On a fresh account/stack: no impact (default deploy path in CLAUDE.md).
  2. On an existing table: backup → drop table → redeploy → restore. Document this before applying to a clinic-customer environment.
- KMS costs: ~$1/month per CMK + per-request charges. With S3 Bucket Keys enabled, expected total ~$5/month at current Tiryaq scale.

---

## How to verify

```bash
aws dynamodb describe-table --table-name Hospital --region me-south-1 \
  --query "Table.SSEDescription"
# expect: SSEType=KMS, KMSMasterKeyArn=alias/tiryaq/data

aws s3api get-bucket-encryption --bucket <frontend-bucket> \
  --query "ServerSideEncryptionConfiguration.Rules[0]"
# expect: ApplyServerSideEncryptionByDefault.SSEAlgorithm=aws:kms with our KMS key

aws kms list-aliases --region me-south-1 \
  --query "Aliases[?starts_with(AliasName,'alias/tiryaq/')]"
# expect: 2 aliases — alias/tiryaq/data and alias/tiryaq/audit
```

---

## Rollback

CMKs are RETAIN — rolling back the CDK won't delete them. Re-apply prior CDK and rebuild encryption settings only if you have already migrated the data off CMK; otherwise leave keys in place.

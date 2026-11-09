# 25 — Monitoring & Observability

> **Status:** Live (baseline). Last audited: 2026-10-02.
> **Audience:** On-call engineers, SRE, DevOps.
> **Read first:** [`18-deploy-and-operations.md`](18-deploy-and-operations.md).

## 1. TL;DR
- CloudWatch Logs for every Lambda (`/aws/lambda/akwadona-*`).
- Custom metric namespace `Akwadona/Throttle` for per-tenant 429s.
- CloudTrail multi-region, log file validation on, delivered to `AkwadonaAuditBucket` (Object Lock 7y).
- No PagerDuty yet; alarms wire through SNS → email (TODO).

## 2. What this is

**What it is** — the observability layer that tells us the platform is healthy or sick.

**Why it exists** — compliance (CloudTrail), performance (Lambda metrics), security (cross-tenant probe), customer-facing SLA.

**Real-life example** — at 02:15 UTC, a surge in Pharmacy 500s triggers an alarm. The on-call engineer opens the dashboard, sees `updatedAt: null` errors in `/aws/lambda/akwadona-pharmacy`, reverts the latest Lambda deploy, mitigation in 7 min.

**How Akwadona uses it** — a shared dashboard aggregates per-Lambda errors, latency, and the custom throttle metric. Alarms fire on error-rate spikes and infrastructure state changes.

## 3. CloudWatch Logs

### 3.1 Log groups
Every Lambda has `/aws/lambda/<functionName>`. Retention is **not** set in CDK → defaults to **Never Expire**. **Action: set a 90-day retention in CDK** to control cost + comply with log-minimization.

```ts
// Suggested addition to lib/akwadona-cdk-stack.ts
import * as logs from 'aws-cdk-lib/aws-logs';
new logs.LogRetention(this, `${id}LogRetention`, {
  logGroupName: `/aws/lambda/${f.functionName}`,
  retention: logs.RetentionDays.THREE_MONTHS
});
```

### 3.2 Log hygiene (per `akwadona-security-review` skill §9)
- Never log PHI (patient name, QID, encrypted bodies).
- Log the actor email, tenantId, action, outcome, latency.
- Prefix log lines with the request-id for correlation: `console.log('[req=XYZ]', 'created patient', { id })`.

### 3.3 Finding logs fast
```powershell
aws logs tail /aws/lambda/akwadona-pharmacy --follow --since 10m
aws logs filter-log-events --log-group-name /aws/lambda/akwadona-examinations --filter-pattern "ERROR" --start-time (([DateTimeOffset](Get-Date).AddHours(-1)).ToUnixTimeMilliseconds())
```

## 4. CloudWatch metrics

### 4.1 AWS-provided
- `AWS/Lambda` → `Invocations`, `Errors`, `Duration`, `Throttles`, `ConcurrentExecutions` per function.
- `AWS/ApiGateway` → `Count`, `4XXError`, `5XXError`, `Latency` (p50/p99) per API.
- `AWS/CloudFront` → `Requests`, `BytesDownloaded`, `TotalErrorRate` per distribution.
- `AWS/DynamoDB` → `ConsumedReadCapacityUnits`, `ConsumedWriteCapacityUnits`, `ThrottledRequests`, `SystemErrors`.
- `AWS/Cognito` → `SignInSuccesses`, `SignInThrottles`, `TokenRefreshSuccesses`.

### 4.2 Custom metric: `Akwadona/Throttle`
Emitted by every tenant Lambda when a per-tenant rate limit is hit — see [`08-throttling.md`](08-throttling.md).

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

## 5. Alarms

**Live as of 2026-10-29 (in `lib/akwadona-cdk-stack.ts`):** `akwadona-api-5xx` (any API Gateway 5xx in 5 min) and `akwadona-lambda-errors` (any Lambda error in 5 min), both → SNS topic `akwadona-alarms`. Subscribe once after deploy:

```powershell
aws sns subscribe --topic-arn (aws cloudformation describe-stacks --stack-name AkwadonaCdkStack --query "Stacks[0].Outputs[?OutputKey=='AlarmTopicArn'].OutputValue" --output text) --protocol email --notification-endpoint you@example.com
```

Only two were added because the stack sits at 496/500 CloudFormation resources. The rest of the baseline below goes into a separate `AkwadonaMonitoringStack` once the split in `docs/45` §9 is done:

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

## 6. CloudTrail

- **Multi-region trail** `akwadona-cloudtrail` (per `lib/akwadona-cdk-stack.ts`).
- Delivered to `AkwadonaAuditBucket` (Object Lock compliance mode, 7-year retention).
- Log file validation ON — tamper detection via SHA-256 digests.
- CloudWatch Logs integration ON (1-year retention).
- Captures: every AWS API call (management plane) + S3 data events on the frontend bucket (PHI download path through pre-signed URLs).

### Querying CloudTrail
```powershell
# All operator-role actions in the last 24h
aws cloudtrail lookup-events `
  --lookup-attributes AttributeKey=Username,AttributeValue=<operator-user> `
  --max-items 100

# Any KMS Decrypt call on a tenant key (should NEVER appear from operator)
aws cloudtrail lookup-events `
  --lookup-attributes AttributeKey=EventName,AttributeValue=Decrypt `
  --max-items 1000 `
  --query "Events[?CloudTrailEvent | contains(@, 'akwadona-tenant')]"
```

## 7. Application audit log

Separate from CloudTrail — this is **business** audit:

- DynamoDB rows at `PK=AUDIT#YYYY-MM-DD, SK=AUDIT#<iso>#<uuid>`.
- Written by every PHI-touching mutation (patient create/update, examination sign-off, dispense, etc.).
- Includes `tenantId`, `actorEmail`, `actorName`, `entityType`, `entityId`, `action`, `before`/`after` JSON strings, `changeSummary`.
- Queryable via `GET /audit?date=YYYY-MM-DD`.
- Operator sees only sanitized metadata (coarse category, no IDs) — see [`07-operator-console.md`](07-operator-console.md).

## 8. Nightly security probes

- `scripts/cross-tenant-probe.js` — attempts cross-tenant reads from each tenant; must return 404 for all attempts.
- Schedule: nightly via EventBridge → Lambda (TODO: not yet wired; run manually post-deploy).
- Expand coverage as new modules land (last expansion: `8a90688` — scribe + calendar).

## 9. Dashboards

CloudWatch dashboard JSON lives in `scripts/dashboards/` (TODO: create). Suggested panels:

- Per-aggregate-Lambda error rate (10 Lambdas, 1 row per).
- Per-tenant throttle count (1 row, filtered by TenantId).
- API Gateway 5xx + latency p99 (2 rows).
- DynamoDB RCU/WCU + throttles.
- Active Cognito users (per tenant, from operator metrics).
- Pre-token Lambda cold-start rate.

## 10. Cost observability

- AWS Budgets alert at $500/month account-wide (TODO: not yet set).
- Cost allocation tags on every stack resource: `Project=Akwadona`, `Environment=production`.
- Per-tenant cost attribution: use CloudWatch Logs Insights to count Lambda invocations per `tenantId` field.

```
# Logs Insights query
fields @timestamp, @message
| filter @message like /tenantId/
| parse @message /"tenantId":"(?<tenant>T_[a-f0-9]+)"/
| stats count() by tenant
```

## 11. Known gaps (fix in follow-up PRs)

- Only 2 of the baseline alarms are in CDK (section 5) — the rest wait for the stack split.
- Log retention defaults to Never — set to 90 days.
- Cross-tenant probe not yet scheduled via EventBridge.
- No PagerDuty / Opsgenie integration — alarms go to a single email.
- No synthetic canary (CloudWatch Synthetics) hitting the sign-in flow + a tenant subdomain every 5 min.
- No X-Ray tracing on Lambdas (would help debug Bedrock + DDB latency).

## 12. Compliance surface

- HIPAA §164.308(a)(1)(ii)(D) — information system activity review → CloudTrail + app audit together satisfy this.
- HIPAA §164.312(b) — audit controls → application audit rows + Object Lock.
- PDPPL Art. 9 — audit trail → CloudTrail log file validation + Object Lock 7y.
- GDPR Art. 30 — records of processing activities → operator-sanitized audit metadata view.

## 13. References
- `lib/akwadona-cdk-stack.ts` (CloudTrail block)
- [`08-throttling.md`](08-throttling.md)
- [`14-tenant-row-enforcement.md`](14-tenant-row-enforcement.md)
- [`26-incident-response.md`](26-incident-response.md)
- `../skills/akwadona-incident-response/SKILL.md`

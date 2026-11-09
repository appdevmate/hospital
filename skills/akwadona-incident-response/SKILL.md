---
name: akwadona-incident-response
description: Trigger when the user says "the site is down", "customers are complaining", "we have an outage", "something is 500ing", "I see a security alert", "a tenant can't log in", "data looks wrong", "the audit log shows X", "page the on-call", or when CloudWatch alarms are mentioned. Produces a structured, calm, auditable incident response — classify severity, acknowledge, contain, communicate, root-cause, write up the post-mortem. Specific to Akwadona's architecture (multi-tenant blast radius, PHI exposure escalation, Cognito outage patterns, CloudFront + DNS).
---

# Akwadona Incident Response

An incident is any event that degrades service, risks data, or triggers a compliance obligation. Panic is a bug. Walk the process.

## 1. Severity classification (first minute)

| Severity | Definition | Response time | Who to page |
|---|---|---|---|
| **SEV-1** | PHI potentially exposed to unauthorized party. Cross-tenant leak. Operator-role decrypted tenant data. | Acknowledge < 5 min, contain < 1 hr | On-call engineer + Security Officer (per `AKW-LGL-07-Legal-Agreement-Templates.md`) + DPO |
| **SEV-2** | Entire platform unavailable (API Gateway down, Cognito down, CloudFront down). All tenants affected. | Ack < 15 min, resolve < 4 hr | On-call engineer |
| **SEV-3** | Single tenant unavailable or one module (pharmacy, documents) broken for all tenants. | Ack < 30 min, resolve < 24 hr | On-call engineer |
| **SEV-4** | Degraded UX (slow, cosmetic, one user), no data risk. | Next business day | Normal queue |

## 2. The ten-minute drill (SEV-1 / SEV-2)

```
0:00  Acknowledge — post "I'm on it" in the agreed channel (Slack/Teams).
0:05  Classify severity (table above).
0:10  Open a running log — timestamp every observation + action.
```

Then move to Containment (§3).

## 3. Containment-first, root-cause-later

If PHI exposure is suspected, **stop the bleed before investigating**:

### 3.1 Suspected cross-tenant leak
```powershell
# Freeze the suspected Lambda — set reserved concurrency to 0
aws lambda put-function-concurrency --function-name akwadona-<suspected> --reserved-concurrent-executions 0

# Confirm nightly cross-tenant probe
node scripts/cross-tenant-probe.js

# Export the audit rows for the window
aws dynamodb execute-statement --statement "SELECT * FROM Hospital WHERE PK = 'AUDIT#<today>'" > audit-$(date +%s).json
```

### 3.2 Suspected operator-role decrypt
```powershell
# Pull CloudTrail events for the operator role
aws cloudtrail lookup-events --lookup-attributes AttributeKey=Username,AttributeValue=<operator-user> --max-items 100
# Look for kms:Decrypt / kms:GenerateDataKey calls on akwadona-tenant-* keys — those should ALWAYS deny.
```

### 3.3 Compromised credentials
```powershell
# Disable the Cognito user
aws cognito-idp admin-disable-user --user-pool-id us-east-1_YibFfEdDD --username <username>

# Revoke all active tokens for the user (next refresh fails)
aws cognito-idp admin-user-global-sign-out --user-pool-id us-east-1_YibFfEdDD --username <username>
```

### 3.4 Full platform down
```powershell
# Quick health probe
curl -I https://www.akwadona.com   # 200?
curl -I https://ouohmmpi31.execute-api.us-east-1.amazonaws.com/departments  # 200/401 (any response = API up)
# CloudFront?
aws cloudfront get-distribution --id E1YOKWKHQNSPQW --query "Distribution.Status"
# Cognito?
aws cognito-idp describe-user-pool --user-pool-id us-east-1_YibFfEdDD --query "UserPool.Status"
```

If API Gateway returns 403/5xx across all routes: suspect WAF (shouldn't be on in dev), authorizer config drift, or a bad Lambda deploy. Roll back the latest deploy (§5 in `akwadona-deploy-safety`).

## 4. Communication during the incident

### 4.1 Internal (every 30 min for SEV-1/2)
```
INCIDENT UPDATE — <severity> — <HH:MM UTC>
Status: Investigating / Identified / Contained / Resolved
Impact: <who is affected, how>
Current theory: <best guess, honest confidence>
Next check-in: <HH:MM UTC>
```

### 4.2 Customer-facing (tenant admins)
Only after containment is complete OR impact is severe enough that silence is worse. Use the operator-console broadcast banner (if the console is up) or email through SES.

Template:
> "Between <start> and <end> UTC on <date>, <X> service may have been unavailable. We identified the cause as <plain-English root cause>. The issue is resolved and we have put <concrete control> in place to prevent recurrence. If this affected a specific workflow for you, please contact support with the time of the affected action — we have audit logs covering the window."

### 4.3 Regulatory (SEV-1 only — PHI exposure)
Per `AKW-CCM-06-Compliance-Controls-Matrix.md` and HIPAA `164.410`:
- **PDPPL**: notify Qatar's Communications Regulatory Authority within 72 hours of becoming aware (if real risk of harm). Use the template in `AKW-CCM-06-Compliance-Controls-Matrix.md`.
- **HIPAA**: notify affected individuals within 60 days (BAA Section 7). Notify HHS within 60 days if ≥ 500 individuals affected.
- **GDPR**: 72 hours to the supervisory authority (Art. 33).

DO NOT notify until the Security Officer + DPO + legal counsel have signed off on the facts.

## 5. Root-cause analysis format

Once contained, before closing the incident:

```markdown
# Incident Post-Mortem — <YYYY-MM-DD> — <short title>

## 1. Summary
3 sentences: what happened, impact, resolution.

## 2. Timeline (UTC)
HH:MM — observation / action / handoff.

## 3. Root cause
The single technical fault, with code references. Not "we were busy" — a specific thing in the system.

## 4. Why our safety nets didn't catch it
Cross-tenant probe missed? Alarm not configured? Code review skipped? Test coverage gap?

## 5. Blast radius
Which tenants, how many users, how many records, how long.

## 6. What we're doing to prevent recurrence
Code change + process change + alarm addition. Each one with an owner and a date.

## 7. Follow-up items
Linked to the backlog (`AKW-RR-12-Risk-and-Debt-Register.md`).
```

Blameless. The question is "how did the system allow this?", not "who typed the bug?".

## 6. Known failure modes + their canonical responses

| Symptom | Likely cause | Fix |
|---|---|---|
| Every API call 500s on `createDoctor` / `createPatient` | `updatedAt: null` on new item fails `dataClass-index` GSI | Grep for `updatedAt: null`, replace with `now.toISOString()`, redeploy Lambda |
| First login after a quiet night times out | Pre-token Lambda cold-started past Cognito's 5s cap | `aws lambda invoke --payload '{"_warmup":true}'` to warm it; add EventBridge warmer if frequent |
| `aws s3 sync` prints uploads but S3 shows old files | IAM user missing KMS Encrypt on frontend data CMK | Add `kms:Encrypt` + `kms:GenerateDataKey` on the data key alias to the deploy user |
| CloudFront returns 403 for everything | OAC misconfigured OR bucket policy drift | Compare `aws s3api get-bucket-policy` vs CDK stack expected value |
| Operator sees a "tenantId" claim they didn't request | Pre-token Lambda injected it wrong | Check the Lambda logs; the operator should get `tenantId=OPERATOR` + `role=operator` |
| Tenant subdomain gives "DNS record points to another CloudFront distribution" error | Post-teardown alias race | Use `-c skipAliases=1` two-phase deploy (`akwadona-deploy-safety` skill §2) |
| CORS error from new subdomain | Not in `tenantSlugs[]` | Add to both `lib/akwadona-cdk-stack.ts` and `src/app/services/tenant.service.ts` |
| Dashboard cards stack vertically (should be 4-across) | Stale `.angular/cache` dropped Tailwind utilities | `Remove-Item -Recurse -Force .angular\cache` → rebuild → redeploy |

## 7. On-call runbook essentials

Have these in a tab before taking the pager:
- AWS Console → CloudWatch Dashboards (per-tenant throttle metrics, API Gateway 5xx, Lambda errors).
- CloudTrail Lookup Events.
- `scripts/recover.ps1` + `scripts/teardown.ps1` paths.
- Operator Console at `https://www.akwadona.com/operator`.
- Phone number of Security Officer + DPO.
- This skill, open.

## 8. Response format when applying this skill

When the user signals an incident:

1. **Classify severity** — SEV-1/2/3/4 (section 1).
2. **Confirm the acknowledgment** — "I'm on it" posted?
3. **Walk the ten-minute drill** — timestamp observations.
4. **Containment commands** — produce them, don't just describe.
5. **Communication cadence** — remind the user of the update interval.
6. **Post-mortem template** — once contained, hand this over.

Never guess a root cause before the containment is done. Honesty > speed.

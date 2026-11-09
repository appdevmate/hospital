# 26 — Incident Response Runbook

> **Status:** Live. Last audited: 2026-10-02.
> **Audience:** On-call engineers + Security Officer + DPO.
> **Companion skill:** `../skills/akwadona-incident-response/SKILL.md` (programmatic version).

## 1. TL;DR
- Classify severity → acknowledge → **contain first**, root-cause after.
- SEV-1 = PHI exposure risk. Notify DPO + Security Officer within 1 hour.
- Regulatory clocks: PDPPL 72 h, HIPAA 60 d (patients) / 60 d (HHS), GDPR 72 h.
- Blameless post-mortem required for any SEV ≤ 2.

## 2. What this is

**What it is** — the step-by-step playbook for responding to an outage, security event, or data concern.

**Why it exists** — regulations (HIPAA, PDPPL, GDPR) impose notification clocks measured in hours. Deciding what to do mid-incident guarantees we miss them.

**Real-life example** — on 2026-05-19 a `TransactionCanceledException` with `updatedAt: null` on `dataClass-index` caused every doctor create to fail. The team diagnosed, patched, and redeployed within 20 min. No PHI leaked; no regulatory notification needed. A SEV-3 post-mortem followed to prevent recurrence.

**How Akwadona uses it** — this doc + the `akwadona-incident-response` skill = the on-call's lap belt.

## 3. Severity classification

| Severity | Definition | Response time | Who to page |
|---|---|---|---|
| **SEV-1** | PHI potentially exposed to unauthorized party. Cross-tenant leak. Operator-role decrypted tenant data. | Acknowledge < 5 min, contain < 1 hr | On-call engineer + Security Officer (per `docs/05d-baa-template.md`) + DPO |
| **SEV-2** | Entire platform unavailable (API Gateway down, Cognito down, CloudFront down). All tenants affected. | Ack < 15 min, resolve < 4 hr | On-call engineer |
| **SEV-3** | Single tenant unavailable or one module (pharmacy, documents) broken for all tenants. | Ack < 30 min, resolve < 24 hr | On-call engineer |
| **SEV-4** | Degraded UX (slow, cosmetic, one user), no data risk. | Next business day | Normal queue |

## 4. The ten-minute drill (SEV-1 / SEV-2)

```
0:00  Acknowledge — "I'm on it" in the agreed channel.
0:05  Classify severity.
0:10  Open a running log — timestamp every observation + action.
0:15  Begin containment (section 5).
```

## 5. Containment-first commands

### 5.1 Suspected cross-tenant leak
```powershell
# Freeze the suspected Lambda
aws lambda put-function-concurrency `
  --function-name akwadona-<suspected> `
  --reserved-concurrent-executions 0

# Confirm cross-tenant probe
node scripts/cross-tenant-probe.js

# Export audit rows for the window
aws dynamodb execute-statement `
  --statement "SELECT * FROM Hospital WHERE PK = 'AUDIT#$(Get-Date -Format yyyy-MM-dd)'" `
  > "audit-$(Get-Date -Format yyyyMMdd-HHmmss).json"
```

### 5.2 Suspected operator-role decrypt
```powershell
aws cloudtrail lookup-events `
  --lookup-attributes AttributeKey=Username,AttributeValue=<operator-user> `
  --max-items 500 `
  --query "Events[?EventName=='Decrypt' || EventName=='GenerateDataKey']"
```
Any hit on a `akwadona-tenant-*` key = SEV-1. The IAM DENY should have blocked it; if it didn't, the key policy drifted.

### 5.3 Compromised credentials
```powershell
aws cognito-idp admin-disable-user --user-pool-id us-east-1_bpipvSdQi --username <username>
aws cognito-idp admin-user-global-sign-out --user-pool-id us-east-1_bpipvSdQi --username <username>
```

### 5.4 Full platform down
```powershell
curl -I https://www.akwadona.com
curl -I https://vbsex10bd6.execute-api.us-east-1.amazonaws.com/departments
aws cloudfront get-distribution --id EMIDMHCZ9PRK4 --query "Distribution.Status"
aws cognito-idp describe-user-pool --user-pool-id us-east-1_bpipvSdQi --query "UserPool.Status"
```

## 6. Communication during the incident

### 6.1 Internal update template (every 30 min for SEV-1/2)
```
INCIDENT UPDATE — <severity> — <HH:MM UTC>
Status: Investigating / Identified / Contained / Resolved
Impact: <who is affected, how>
Current theory: <best guess, honest confidence>
Next check-in: <HH:MM UTC>
```

### 6.2 Customer-facing (tenant admins)
Only after containment is complete OR impact is severe enough that silence is worse. Broadcast via operator-console banner OR SES email.

Template:
> "Between <start> and <end> UTC on <date>, <X> service may have been unavailable. We identified the cause as <plain-English root cause>. The issue is resolved and we have put <concrete control> in place to prevent recurrence. If this affected a specific workflow for you, please contact support with the time of the affected action — our audit logs cover the window."

### 6.3 Regulatory (SEV-1 only — real PHI exposure)
- **PDPPL** (Qatar): notify the Communications Regulatory Authority within **72 hours** of becoming aware if there is real risk of harm. Template in [`05b-pdppl-qatar-compliance.md`](05b-pdppl-qatar-compliance.md).
- **HIPAA**: notify affected individuals within **60 days** (BAA §7). Notify HHS within **60 days** if ≥ 500 individuals affected (sooner if < 500, in an annual roll-up).
- **GDPR**: notify the lead supervisory authority within **72 hours** (Art. 33).

DO NOT notify until the Security Officer + DPO + legal counsel have signed off on the facts.

## 7. Root-cause post-mortem format

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
Linked to the backlog (`docs/backlog.md`).
```

Blameless. The question is "how did the system allow this?", not "who typed the bug?".

## 8. Known failure modes catalog

| Symptom | Likely cause | Fix |
|---|---|---|
| Every API call 500s on `createDoctor` / `createPatient` | `updatedAt: null` on new item fails `dataClass-index` GSI | Grep for `updatedAt: null`, replace with `now.toISOString()`, redeploy Lambda |
| First login after a quiet night times out | Pre-token Lambda cold-started past Cognito's 5s cap | Invoke with `{"_warmup":true}` to warm it; consider re-adding EventBridge warmer |
| `aws s3 sync` prints uploads but S3 shows old files | IAM user missing KMS Encrypt on frontend data CMK | Add `kms:Encrypt` + `kms:GenerateDataKey` on the data key alias |
| CloudFront returns 403 for everything | OAC misconfigured OR bucket policy drift | Compare `aws s3api get-bucket-policy` vs CDK stack expected |
| Operator claims they can decrypt tenant data | Explicit DENY was removed from operator Lambda role | Restore the DENY block in `lib/akwadona-cdk-stack.ts` (search `Wildcard DENY for any current + future wizard-created tenant CMKs`) and redeploy |
| Patient name search returns nothing | Filter is running on ciphertext (pre-2026-10-29 code) | Ensure `getAllPatients`/`getAllDoctors` are the post-2026-10-29 versions (header says "2026-10-29 rewrite") |
| First login of the day is a 504 | Pre-token Lambda > 5 s (cold start + table Scan on old code) | Confirm the EventBridge warmer rule exists and the pre-token Lambda is the GSI-Query version |
| Doctor sees no patients after being created | Doctor row's email is encrypted; old pre-token looked it up by plaintext | Deploy the 2026-10-29 pre-token Lambda (HMAC lookup) — needs the `kms:GenerateMac` grant from the same CDK change |
| Tenant subdomain gives "DNS record points to another CloudFront distribution" error | Post-teardown alias race | Use `-c skipAliases=1` two-phase deploy ([`12-teardown-and-recover.md`](12-teardown-and-recover.md)) |
| CORS error from new subdomain | Not in `tenantSlugs[]` | Add to both `lib/akwadona-cdk-stack.ts` and `src/app/services/tenant.service.ts` |
| Dashboard cards stack vertically (should be 4-across) | Stale `.angular/cache` dropped Tailwind utilities | `Remove-Item -Recurse -Force .angular\cache` → rebuild → redeploy |
| Doctor cannot see any patients | Pre-token Lambda didn't inject `doctorId`; or Cognito user missing from `Doctors` group | Check group membership + `doctorId` claim in access token |
| Scribe returns `AccessDenied` on Bedrock | Model ID is bare FM instead of inference profile | Confirm `BEDROCK_MODEL_ID=us.anthropic.claude-haiku-4-5-...` and the IAM allows the profile ARN |

## 9. On-call runbook essentials

Before taking the pager:
- AWS Console open to CloudWatch Dashboards + CloudTrail Lookup.
- `scripts/recover.ps1` + `scripts/teardown.ps1` paths bookmarked.
- Operator Console `https://www.akwadona.com/operator` open in another tab.
- Phone number of Security Officer + DPO saved.
- Both this doc AND `akwadona-incident-response` skill accessible.

## 10. Compliance surface
- HIPAA §164.308(a)(6) — security incident procedures.
- HIPAA §164.410 — notification by business associates.
- PDPPL — breach notification obligations.
- GDPR Art. 33 (notification to authority) + Art. 34 (notification to data subjects).

## 11. Open questions / future work
- PagerDuty / Opsgenie integration.
- Automated status page (`status.akwadona.com`) wired to CloudWatch alarms.
- Runbook drills — quarterly simulated SEV-1.
- Playbook for each module (currently generic).

## 12. References
- [`05a-hipaa-security-rule-mapping.md`](05a-hipaa-security-rule-mapping.md)
- [`05b-pdppl-qatar-compliance.md`](05b-pdppl-qatar-compliance.md)
- [`05c-gdpr-compliance-and-dpia.md`](05c-gdpr-compliance-and-dpia.md)
- [`05d-baa-template.md`](05d-baa-template.md)
- [`25-monitoring-and-observability.md`](25-monitoring-and-observability.md)
- `../skills/akwadona-incident-response/SKILL.md`

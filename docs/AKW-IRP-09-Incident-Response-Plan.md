# Akwadona Hospital Platform — Incident Response Plan

| Document control | |
|---|---|
| **Document ID** | AKW-IRP-09 |
| **Document type** | Incident Response Plan (IRP) — ITIL incident management + HIPAA §164.308(a)(6) / PDPPL / GDPR Art. 33–34 breach procedure |
| **Version** | 1.1 |
| **Status** | Approved |
| **Classification** | Confidential — Internal; on-call must have offline access |
| **Owner** | Security Officer |
| **Approver** | Founder / CTO |
| **Effective date** | 2026-10-30 |
| **Review cycle** | Semi-annually, after every SEV-1/SEV-2, and after each drill |
| **Supersedes** | `archive/26-incident-response.md` |
| **Related documents** | AKW-SSP-05 (controls), AKW-OPS-08 (runbooks, identifiers), AKW-CCM-06 (notification obligations), AKW-LGL-07 (contractual notice clauses), `../skills/akwadona-incident-response/SKILL.md` |

| Revision history | | | |
|---|---|---|---|
| **Version** | **Date** | **Author** | **Change** |
| 1.0 | 2026-10-30 | Platform team | Consolidated into the enterprise document set; live identifiers verified |
| 1.1 | 2026-10-31 | Platform team | Added "This document answers" and "Abbreviations used in this document" blocks after document control |

## This document answers

1. Who does what during an incident?
2. How do I classify severity, and how fast must I respond at each level?
3. What are the first ten minutes?
4. Which commands contain a cross-tenant leak, a suspected operator decrypt, compromised credentials, or a full outage?
5. What do I tell the team, the hospitals, and the regulators — and by when?
6. How is the post-mortem written, and what are the known failure modes and their fixes?

## Abbreviations used in this document

> **Why this table exists.** Every short form that appears anywhere in this document is listed here with (1) what the letters stand for and (2) what it means in plain words. If a term is not here and is not obvious, that is a documentation bug — add it. The complete glossary with examples and console links is AKW-SO-01 Appendix A.

| Abbreviation | Stands for | What it means |
|---|---|---|
| **API** | Application Programming Interface | The set of URLs one program calls to use another program's features. Ours is a REST API. |
| **ARN** | Amazon Resource Name | The unique ID string of any AWS resource. |
| **AWS** | Amazon Web Services | Amazon's cloud-computing platform. Everything Akwadona runs on it. |
| **BAA** | Business Associate Agreement | A contract required by the US health-privacy law HIPAA between a hospital and any company (like Akwadona) that handles patient data for it. It says how the data will be protected. |
| **CCM** | Compliance Controls Matrix | A table that maps each rule in a law or standard to the specific thing we do to satisfy it, and the evidence an auditor can check. |
| **CDK** | Cloud Development Kit | AWS's tool for describing infrastructure in a programming language (we use TypeScript). It compiles to CloudFormation. |
| **CMK** | Customer Managed Key | A KMS encryption key that we create and control (as opposed to one AWS manages for us). |
| **CORS** | Cross-Origin Resource Sharing | The browser rule that decides which websites may call our API. We allow only our own domains. |
| **CTO** | Chief Technology Officer | The head of technology. |
| **DNS** | Domain Name System | The internet's phone book — turns akwadona.com into a server address. Ours is in Route 53; GoDaddy only holds the registration. |
| **DPO** | Data Protection Officer | The named person responsible for privacy compliance; required by GDPR for organisations that process health data at scale. |
| **GDPR** | General Data Protection Regulation | The European Union's privacy law (2018). It gives people rights over their data and sets duties on companies that process it. |
| **GSI** | Global Secondary Index | A second way to look up rows in a DynamoDB table, by a different attribute. We have nine. |
| **HHS** | US Department of Health and Human Services | The US government department that enforces HIPAA. |
| **HIPAA** | Health Insurance Portability and Accountability Act | The US law that sets rules for protecting patients' health information. Its "Security Rule" lists the technical safeguards we must have. |
| **HMAC** | Hash-based Message Authentication Code | A fingerprint of a value computed with a secret key. Same value + same key = same fingerprint; different keys give different fingerprints. We use it to search encrypted fields. |
| **IAM** | Identity and Access Management | AWS's permission system: which user or service may do which action on which resource. |
| **IRP** | Incident Response Plan | The step-by-step plan for what to do when something goes wrong — an outage or a suspected data breach. |
| **ITIL** | Information Technology Infrastructure Library | A widely used set of best practices for running IT services (how to handle incidents, changes, releases). Large companies organise their operations documents around it. |
| **KMS** | Key Management Service | AWS's vault for encryption keys. Keys never leave it; it encrypts and decrypts on request. |
| **LGL** | Legal | The document-type code for the legal agreement templates (AKW-LGL-07). |
| **OAC** | Origin Access Control | The CloudFront setting that lets only CloudFront read our S3 bucket — nobody can bypass it. |
| **OPS** | Operations | Running the system day to day: deploying, monitoring, backing up, recovering. |
| **PDPPL** | Personal Data Privacy Protection Law | Qatar's national privacy law (Law No. 13 of 2016). Qatar's equivalent of GDPR. |
| **PHI** | Protected Health Information | Any information that identifies a patient and relates to their health: name, ID number, diagnosis, medication, phone, date of birth. |
| **S3** | Simple Storage Service | AWS file storage — a bucket holds files of any size. |
| **SES** | Simple Email Service | AWS's service for sending e-mail. |
| **SEV** | Severity | Incident severity level: SEV-1 is the worst. |
| **SSP** | System Security Plan | The document that lists every security control the system has, how it is implemented, and its status. A NIST-defined document type. |
| **UTC** | Coordinated Universal Time | The global reference time zone; all our timestamps use it. |
| **UX** | User Experience | How it feels to use the system. |

**One-line summary.** Classify → acknowledge → **contain first** → communicate → root-cause → post-mortem. SEV-1 means possible PHI exposure: Security Officer and DPO within one hour; regulatory clocks start at *awareness* (PDPPL 72 h, GDPR 72 h, HIPAA 60 d).

## 1. Roles

| Role | Who (today) | Responsibility |
|---|---|---|
| Incident Commander | On-call engineer | Runs the drill, owns the timeline, decides containment |
| Security Officer | Founder (interim) | Signs off on facts before any external notification |
| Data Protection Officer | Founder (interim) | Regulatory notifications; customer DPO liaison |
| Communications | Founder | Tenant admin messages |

## 2. Lifecycle

```
Detect (alarm / user report / probe failure)
  → Triage & classify (§3)             ≤ 5 min SEV-1
  → Acknowledge + open timeline log
  → Contain (§5)                        ≤ 1 h SEV-1
  → Communicate (§6)                    every 30 min SEV-1/2
  → Eradicate & recover
  → Regulatory notification if PHI exposed (§6.3)
  → Post-mortem (§7)                    ≤ 5 business days
  → Actions tracked in AKW-RR-12
```

## 3. Severity classification

| Severity | Definition | Response time | Who to page |
|---|---|---|---|
| **SEV-1** | PHI potentially exposed to unauthorized party. Cross-tenant leak. Operator-role decrypted tenant data. | Acknowledge < 5 min, contain < 1 hr | On-call engineer + Security Officer (per `AKW-LGL-07-Legal-Agreement-Templates.md`) + DPO |
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
aws cognito-idp admin-disable-user --user-pool-id us-east-1_YibFfEdDD --username <username>
aws cognito-idp admin-user-global-sign-out --user-pool-id us-east-1_YibFfEdDD --username <username>
```

### 5.4 Full platform down
```powershell
curl -I https://www.akwadona.com
curl -I https://ouohmmpi31.execute-api.us-east-1.amazonaws.com/departments
aws cloudfront get-distribution --id E1YOKWKHQNSPQW --query "Distribution.Status"
aws cognito-idp describe-user-pool --user-pool-id us-east-1_YibFfEdDD --query "UserPool.Status"
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
- **PDPPL** (Qatar): notify the Communications Regulatory Authority within **72 hours** of becoming aware if there is real risk of harm. Template in [`AKW-CCM-06-Compliance-Controls-Matrix.md`](AKW-CCM-06-Compliance-Controls-Matrix.md).
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
Linked to the backlog (`AKW-RR-12-Risk-and-Debt-Register.md`).
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
| Tenant subdomain gives "DNS record points to another CloudFront distribution" error | Post-teardown alias race | Use `-c skipAliases=1` two-phase deploy ([`AKW-OPS-08-Operations-Runbook.md`](AKW-OPS-08-Operations-Runbook.md)) |
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


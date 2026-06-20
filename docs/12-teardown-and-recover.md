# Teardown & Recover Runbook

Two PowerShell scripts that flip Akwadona between "live in AWS" and "$0 / not running". What huge SaaS dev teams call a "kill switch + revive" pair (AWS internal ops, Stripe staging environments, Vercel preview teardowns).

## When to use

| Situation | Run |
|---|---|
| Pausing work for a while (vacation, holding off on demo) | `teardown.ps1` |
| Bringing it back | `recover.ps1` |
| Customer demo prep — fresh start | both in sequence |
| Disaster recovery (account wiped, region outage) | `recover.ps1` (after re-bootstrapping CDK in the new region) |
| You're done with the project for good | `teardown.ps1`, then cancel the GoDaddy domain manually |

## What goes away with `teardown.ps1`

| Resource | After teardown |
|---|---|
| Lambdas (39) | Deleted |
| API Gateway HTTP API | Deleted |
| CloudFront distribution | Deleted |
| Cognito User Pool + groups + custom domain | Deleted |
| S3 buckets (frontend + documents) | Emptied, then deleted by CDK |
| DynamoDB `Hospital` table | Deleted (CDK retains by default; this script overrides) |
| IAM roles + policies + log groups | Deleted |
| KMS keys (4 per-tenant) | Scheduled for deletion in 7 days |
| ACM certificate `auth.akwadona.com` | **Stays** (free; survives for next deploy) |
| Route 53 hosted zone (if any) | **Stays** (~$0.50/month) |
| GoDaddy domain | **Stays** (not AWS) |

**Expected monthly bill after teardown:** roughly $0. Maybe $0.50 if you keep a Route 53 zone.

## How to run the teardown

```powershell
cd "C:\Users\Sami Toufic Taha\Desktop\aws apps\hospital"
.\scripts\teardown.ps1 -ConfirmDestroyData
```

Without the `-ConfirmDestroyData` flag the script refuses to run (safety gate).

Takes ~3–5 minutes.

## How to bring it back with `recover.ps1`

```powershell
cd "C:\Users\Sami Toufic Taha\Desktop\aws apps\hospital"
.\scripts\recover.ps1
```

What it does (in order):

1. Looks at each per-tenant KMS key. If still in the 7-day pending-deletion window, cancels deletion and re-enables. If already destroyed (window passed), warns you'll need to update the CDK `tenantKeys` / `tenantHmacKeys` maps with the new key ARNs.
2. `npx cdk deploy --require-approval never` — recreates Lambdas, API Gateway, CloudFront, Cognito, IAM, log groups, custom resources.
3. Runs `scripts/seed-tenants.ps1` to repopulate Tiryaq + Alshifaa profile rows.
4. Prints the **manual** next steps you need to do:
   - Build + sync the Angular frontend.
   - Re-add `sami@akwadona.com` to the `Operator` Cognito group (Console → Cognito → User Pool → Groups → Operator → Add Users).

Takes ~5–8 minutes.

## What happens if I wait > 7 days before running recover?

- The KMS keys are gone forever. AWS cannot recover them.
- The DynamoDB table is gone (the script already deleted it on teardown).
- If there was customer data in DynamoDB before teardown, it stays mathematically unreadable even if someone restored a backup — the keys that decrypt it no longer exist. This is the "cryptographic erasure" we use for GDPR right-to-be-forgotten.
- Recovery still works — CDK creates NEW keys with NEW ARNs. You must update the CDK `tenantKeys` + `tenantHmacKeys` maps to point at the new ARNs (the script prints a warning when this happens).

## Costs broken down

| State | Monthly cost |
|---|---|
| Live (current) | ~$5–10 (mostly the 4 KMS keys × $1 each) |
| Teardown in progress | Same as live until the 7-day KMS window passes |
| 7 days after teardown | ~$0.50 (Route 53 only, if used) |
| Forever after teardown | ~$0.50 + GoDaddy domain renewal (not AWS) |

## What huge SaaS does (precedent)

- **AWS internal ops** ship a "cleanup-all" script for every customer-facing service so dev environments can be wiped on demand.
- **Stripe** rebuilds their staging cluster every weekend via Terraform `destroy` + `apply` — same pattern.
- **Vercel** preview environments are torn down 24h after the PR closes.

Akwadona inherits the same hygiene. The cost saving is small (a hospital SaaS at our scale costs <$50/month live), but the operational discipline is what matters.

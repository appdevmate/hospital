# Step 8 — AWS Resource Rename Runbook (`tiryaq-*` → `akwadona-*`)

> **STATUS: COMPLETE (HISTORICAL).** The rename was executed on 2026-06-30 via the **teardown + rebuild** approach — not the blue-green pattern originally drafted below. The whole `TiryaqCdkStack` was destroyed (`cdk destroy --force`) and a fresh `AkwadonaCdkStack` was deployed with all resources using the new naming convention. One legacy bucket (`tiryaq-audit-*`) survives under COMPLIANCE Object Lock until ~2033 and cannot be deleted. See `12-teardown-and-recover.md` for the equivalent procedure going forward.
>
> The original draft below is kept for historical context only. The same-name "Old name / New name" placeholders are leftover from the in-place rename plan that was never used.

## Why

- The product is called **Akwadona**. The original infrastructure was named after the first hospital we built it for, **Tiryaq**.
- Customers, auditors, and AWS support all see resource names. Mixed names look unprofessional and confuse account boundaries.
- What huge SaaS does: rename early. Stripe migrated `/dev/payments` resources to `stripe-*` in their first year. Vercel did the same when they renamed from Zeit.

## Scope — what changes, what stays

| Category | Action | Reason |
|---|---|---|
| **30 Lambda functions** | rename `tiryaq-*` → `akwadona-*` | Customer-visible in CloudWatch logs, billing. |
| **CDK stack** | rename `AkwadonaCdkStack` → `AkwadonaCdkStack` | Affects ALL nested resource logical IDs. |
| **S3 buckets** | rename `akwadona-documents-*` → `akwadona-documents-*` | Bucket names are global; renaming = create new + copy + delete. |
| **API Gateway** | rename `akwadona-api` → `akwadona-api` | Internal label only; URL stays (`a2s6jk35d9.execute-api.…`). |
| **Cognito User Pool** | rename label `akwadona-user-pool` → `akwadona-user-pool` | Pool ID `us-east-1_KkINt5vOF` is **immutable** — only the display name changes. |
| **CloudFront distribution** | tag `akwadona-frontend` | ID `EMIDMHCZ9PRK4` stays. |
| **IAM roles** | renamed automatically by stack rename | CloudFormation gives them new names. |
| **CloudWatch log groups** | renamed automatically when Lambda renames | New logs go to `/aws/lambda/akwadona-*`. |
| **KMS key aliases** | `alias/tiryaq-tenant-…` → `alias/akwadona-tenant-…` | Key UUIDs stay — only friendly aliases rename. |
| **DynamoDB table** | **STAYS** `Hospital` | Renaming = full data migration. Massive risk, zero value. |
| **KMS key UUIDs** | **STAY** | Same reason as DynamoDB. Customer data is encrypted with these specific UUIDs. |
| **Cognito User IDs / groups** | **STAY** | Same pool, same users, same groups. |
| **Repo folder `tiryaq-cdk/`** | optionally rename to `akwadona-cdk/` | Pure cosmetic; do in a separate git commit. |

## Critical risks

### Risk 1 — Lambda rename causes brief downtime

- CloudFormation deletes the old Lambda and creates a new one in one operation. In-flight requests during the swap get a 5xx error.
- **Mitigation — Blue-green cutover (the professional pattern):**
  1. Add the new `akwadona-*` Lambda alongside the existing `tiryaq-*` Lambda. Both exist, both work.
  2. Repoint API Gateway routes to the new Lambda.
  3. Wait 24 hours (soak period) — confirm no errors.
  4. Delete the old `tiryaq-*` Lambda.
- This adds ~6 days total (deploy → 1 day soak per stage) but causes **zero downtime**.

### Risk 2 — S3 bucket rename = full re-upload

- S3 bucket names are immutable. To rename, you create a new bucket and copy every object.
- For the **documents bucket** (`akwadona-documents-…`): tenants' uploaded files. Hundreds of MB → GB. Use `aws s3 sync` (resumable, parallel).
- For the **frontend bucket** (`tiryaqcdkstack-tiryaqfrontendbucket…`): just static assets, easy to rebuild from `npm run build`.
- **Mitigation:** new bucket up, copy data, repoint Lambdas, delete old bucket after soak.

### Risk 3 — CDK stack rename = ALL CloudFormation resources recreated

- This is the BIG one. CloudFormation tracks resources by `<StackName>-<LogicalID>-<random>`. Rename the stack and every single resource gets a new physical ID.
- For Lambdas: that's the same as risk 1 × 30.
- **Mitigation — phased migration:**
  - **Phase A** (this runbook 8.2–8.4): Rename the LAMBDAS while keeping stack name = `AkwadonaCdkStack`. Use CDK's `functionName` override.
  - **Phase B** (later, optional): Rename the STACK. Requires either a full teardown + rebuild OR a CloudFormation import — both invasive. Defer until v2 platform refresh.

### Risk 4 — DynamoDB table name is hardcoded everywhere

- Every Lambda has `const TABLE_NAME = 'Hospital';`.
- We are **not** renaming the table — so no code change needed for this part.
- Future: move to `process.env.TABLE_NAME` (env-driven) so the table name isn't baked in.

## Cutover sequence (the actual plan)

### Phase A — Lambdas only (this runbook covers 8.2 → 8.4)

| Step | Action | Downtime | Rollback |
|---|---|---|---|
| 8.2 | Add new `akwadona-*` Lambdas alongside the `tiryaq-*` ones. Same code, same env, new name. Deploy via CDK. | None | Just delete the new ones. |
| 8.3a | Update CDK so API Gateway routes point to the new `akwadona-*` Lambdas. Deploy. | None (API Gateway routes update atomically). | Edit CDK back, redeploy. |
| 8.3b | Soak period — 24 hours. Watch CloudWatch error rate. | None | Same as 8.3a. |
| 8.4 | Remove the old `tiryaq-*` Lambdas from CDK. Deploy. | None — they get no more invocations. | Restore from git history, redeploy. |

### Phase B — Stack, buckets, API name (deferred to a v2 refresh)

- Stack rename requires either:
  - **Teardown + rebuild** (controlled downtime window, ~30 min) — only realistic on a Sunday at 2 AM with comms to all hospitals.
  - **CloudFormation Import** (zero downtime but multi-day operation requiring AWS support coordination).
- **Recommendation: defer Phase B** until the next major version of the platform when we'd be doing a major change anyway.

## What customers see during Phase A

- **Tenant users (doctors at Tiryaq / Alshifaa):** **Nothing.** The URL stays the same. The login flow stays the same. Lambdas are renamed but routing is updated atomically.
- **You (operator):** CloudWatch shows two parallel sets of Lambdas during the soak window. Then the old ones disappear.

## Rollback plan

If after 8.3 we see elevated error rates:

1. Edit `akwadona-cdk-stack.ts` to point routes back to the old Lambdas.
2. `npx cdk deploy --require-approval never`.
3. Investigate the failure in CloudWatch.
4. Re-attempt after fix.

The old Lambdas stay alive until 8.4 specifically so rollback is one CDK deploy away.

## Naming map

Auto-generated from a `tiryaq-` → `akwadona-` rule. Exceptions noted.

| Old name | New name |
|---|---|
| `akwadona-pharmacy` | `akwadona-pharmacy` |
| `akwadona-bloodbank` | `akwadona-bloodbank` |
| `akwadona-appointments` | `akwadona-appointments` |
| `akwadona-examinations` | `akwadona-examinations` |
| `akwadona-calendar` | `akwadona-calendar` |
| `akwadona-document-manager` | `akwadona-document-manager` |
| `akwadona-scribe` | `akwadona-scribe` |
| `akwadona-admin-panel` | `akwadona-admin-panel` |
| `akwadona-audit` | `akwadona-audit` |
| `akwadona-operator-console` | `akwadona-operator-console` |
| `getAllPatients`, `createDoctor`, … (camelCase) | unchanged at this phase — camelCase names don't carry the "tiryaq" prefix |
| `akwadona-documents-483176634665-us-east-1` (S3) | stays for now (Phase B) |
| `akwadona-user-pool` (Cognito display name) | `akwadona-user-pool` (display label only) |
| `akwadona-api` (API Gateway display) | `akwadona-api` |

**Decision: only rename the 10 Lambdas with the `tiryaq-` prefix.** The camelCase ones (`getAllPatients` etc.) don't carry the brand — leave them alone to minimize blast radius.

## Done criteria

Phase A is complete when:

- ✅ 10 new `akwadona-*` Lambdas exist and serve all API routes.
- ✅ Old `tiryaq-*` Lambdas are deleted.
- ✅ 24 h of CloudWatch logs show zero unexpected 5xx errors.
- ✅ Operator console + tenant apps still work end-to-end.

Phase B is deferred to a future task with its own runbook.

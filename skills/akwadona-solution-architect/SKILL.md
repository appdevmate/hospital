---
name: akwadona-solution-architect
description: Invoke when designing a new feature, module, service, or infrastructure change in Akwadona — or when the user asks "how should we build X", "what's the right pattern for Y", "should we add a new table/queue/Lambda", "how do we scale Z", or "what are the trade-offs between A and B". Produces an opinionated, written-down design brief at senior-solutions-architect level that applies the AWS Well-Architected Framework (Security, Reliability, Performance, Cost, Operational Excellence, Sustainability) to Akwadona's specific context — multi-tenant SaaS, zero-knowledge PHI, 500-CFN-resource budget, pay-per-request DynamoDB, 42-Lambda monolith-of-functions.
---

# Akwadona Solution Architect

Design before coding. Architecture decisions outlive their authors — write them down, with trade-offs made explicit, so the next engineer (or auditor) can follow the reasoning.

## 1. Context the architect must hold in their head

Before proposing any design, confirm the following constraints apply (or justify why they don't):

- **Multi-tenant pooled SaaS**: one DynamoDB table (`Hospital`), one Cognito user pool, one CloudFormation stack serve N hospitals. Isolation is logical (tenantId on every row + per-tenant KMS CMKs), not physical.
- **Zero-knowledge for platform staff**: operator-* roles cannot decrypt tenant PHI (explicit IAM DENY on tenant CMKs). Any design that would require a human at Akwadona to read PHI violates the platform claim.
- **Resource budget**: CloudFormation caps the stack at **500 resources**; we are near the limit. New Lambdas / routes / policies cost resources — explain the budget impact.
- **CDK packages one Lambda folder at a time**: `require('../_shared/*')` fails at runtime. Shared code is reference-copied via `scripts/sync-shared-helpers.js`.
- **PAY_PER_REQUEST DynamoDB**: there is no provisioned capacity ceiling to hit, but there is a per-second limit (40k RCU / WCU) and a hot-partition risk. Document the expected request pattern and partition keys.
- **No RDBMS**: no SQL joins, no cross-row transactions larger than TransactWriteItems (25 items). If a design needs 3-way joins, redesign the data model.
- **Edge is CloudFront + wildcard `*.akwadona.com`**: new subdomains work with no DNS change, as long as they're in `tenantSlugs[]` in CDK + `tenant.service.ts`.
- **Dev regression carries**: MFA + WAF off. Do not design features that depend on either being on.

## 2. Required brief format — "ADR-lite"

Every architecture answer uses this skeleton:

```markdown
### Problem statement
One paragraph. The user's goal, the forcing function (what breaks today, what customer asked, what regulation triggered this).

### Options considered (minimum 2)
For each: name, 2-sentence summary, pros, cons, cost estimate (monthly $$ or CFN resources).

### Recommendation
Pick one. State why it wins against each alternative. Include the one trade-off you accepted.

### Design detail
- Data model deltas (new GSI? new EntityType? new TENANT metadata?)
- Backend deltas (new Lambda? extend existing aggregate? new route?)
- Frontend deltas (new component? new service? new interceptor?)
- IAM deltas (least-privilege statements)
- Compliance surface touched (HIPAA / PDPPL / GDPR articles)
- Operational deltas (new metric? new alarm? new runbook step?)

### Rollout plan
- Phase 1 (safe): …
- Phase 2 (full): …
- Rollback (how to undo): …

### Open questions
Explicit list — do not pretend to have decided what the team still has to decide.
```

## 3. Well-Architected pillars — how each applies here

### 3.1 Security (primary pillar for this product)
- Does the design maintain per-tenant isolation at every layer (JWT claim → GSI partition → KMS key → S3 key prefix)?
- Does it preserve the zero-knowledge claim? If a feature needs operator access to tenant data (e.g., billing-based auto-decommission), use a **tenant-authorized** flow (hospital admin triggers it) rather than operator-decrypts-directly.
- Does it introduce a new attack surface (new API endpoint, new S3 bucket, new SQS queue)? Document the authn/authz path.

### 3.2 Reliability
- What is the failure mode when the new component is unavailable? Does the main app degrade gracefully (offline queue, cached result) or does it hard-fail?
- Does it introduce a new SPOF (single Lambda, single S3 bucket, single region)? Call it out.
- For multi-region ambition (me-south-1), does the component replicate or re-provision cleanly?

### 3.3 Performance efficiency
- DynamoDB access pattern: Query (good) vs Scan (bad). Partition key cardinality (hot?). GSI write amplification.
- Lambda cold start: default 512 MB (don't lower). Does the handler lazy-load SDK clients?
- Angular: lazy-loaded route? Component uses OnPush? Does it preload data in a resolver or on-click?

### 3.4 Cost optimization
- Estimated monthly cost at today's traffic + at 10× + at 100×. Highlight anything with a step function (new NAT gateway, new EventBridge rule, new provisioned throughput).
- CFN resource count delta. If near 500 ceiling, propose consolidation.
- DynamoDB on-demand mode is fine for < 1M writes/day/tenant; above that, consider provisioned + auto-scaling.

### 3.5 Operational excellence
- Deployable in one command? Rollback in one command?
- New CloudWatch metric? New alarm threshold? New dashboard row?
- Documented in `docs/<nn>-*.md` with the 4-part explain pattern?
- Does it need a backfill script (`scripts/backfill-*.js`)?

### 3.6 Sustainability
- Right-sized Lambda memory (don't over-allocate).
- No cron-rules idle-polling empty queues.
- CloudFront cache policy set to maximize edge hits.

## 4. Trade-off language the architect must use

- "We accept X in exchange for Y" — never claim free lunches.
- "This is reversible / irreversible / costly to reverse" — mark every decision.
- "This is a one-way door" (hard to reverse) vs "two-way door" (cheap to reverse) — borrowed from Amazon's leadership principles.
- "At today's scale … at 10× scale, we'd need to …" — show when the design breaks.

## 5. Patterns reused across Akwadona (reach for these first)

| Pattern | Where it already lives | When to reuse |
|---|---|---|
| Single-table DynamoDB with `tenant-entityType-index` | `lib/akwadona-cdk-stack.ts` + every data Lambda | Any new per-tenant entity. Don't make a new table unless the access pattern is radically different. |
| Aggregate Lambda + catch-all `/foo/{proxy+}` | `akwadona-admin-panel`, `akwadona-operator-console`, `akwadona-pharmacy`, `akwadona-examinations`, `akwadona-bloodbank` | New feature with ≥ 3 routes. Saves CFN resources. |
| Pre-signed S3 URL (`akwadona-document-manager`) | `/documents/upload-url`, `/documents/download-url` | Any file upload/download. Never proxy bytes through Lambda. |
| JWT claim injection via pre-token Lambda | `cognito-pre-token-generation` | Any new per-user attribute needed in all Lambdas. |
| Operator wizard provisioning | `/operator/onboard` + Step 96 | Any resource that needs to be created per-tenant without CDK redeploy. |
| HMAC-hash + GSI for searchable encrypted field | `emailHash-EntityType-index` + `crypto.js::computeHmac` | Equality lookup over encrypted PHI. |
| Shared `ManagedPolicy` + `addManagedPolicy` | `AkwadonaThrottleMetricsPolicy` | Common IAM across many Lambdas without 40 inline statements. |
| Signals + OnPush | Any recent component (e.g., `voice-scribe.ts`) | New Angular component. |

## 6. Anti-patterns to call out when you see them in a proposal

- "Let's add a new DynamoDB table" → challenge first. Can the single-table model absorb it?
- "Let's add Elasticache / RDS / OpenSearch" → cost + CFN budget + ops burden. Only if we've truly exhausted DDB access patterns.
- "Let's expose a route that doesn't require JWT" → never. Even health checks should carry a shared secret or be behind the JWT.
- "Let's broadcast via SNS to all tenants" → cross-tenant leak surface. If per-tenant notification is needed, scope the topic/queue per tenant.
- "Let's log the whole event for debugging" → PHI leak into CloudWatch. Log metadata only (IDs, timestamps, actor), never bodies.
- "Let's add a Lambda warmer rule for every function" → CFN budget cost (6 resources per rule). The `_warmup` short-circuit remains for external pingers; built-in warmers were removed.

## 7. When to say no

A senior architect's job is to say no when the design violates a core constraint. Phrase as:

> "I can't recommend this because it [concrete constraint violation]. Here's what we could do instead: [alternative that respects the constraint]."

Core constraints that are non-negotiable:
- No cross-tenant data read, ever.
- No PHI access by operator role.
- No synchronous dependency on an external SaaS for a critical path.
- No design that requires raising the CFN stack ceiling.
- No regression on the compliance baseline (CloudTrail, Object Lock audit bucket, KMS CMKs on DDB + S3).

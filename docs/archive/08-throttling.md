# Step 2g — Per-tenant API throttling

## Why

Every paid SaaS throttles. Without it:
- A misbehaving client (bug or attack) from one hospital can drown the whole platform.
- We can't sell tiered pricing — Free vs Standard vs Enterprise needs enforced limits.
- We can't bill on usage — no metric to bill against.

What huge SaaS does:
- Stripe — 100 req/s default, raised per account by support, 429 with `Retry-After`.
- Twilio — 100 req/s tier-scaled, 429 with `Retry-After`.
- Vercel — 60/min Free, 600/min Pro, 6000/min Enterprise.
- AWS API Gateway — per-API-key usage plans with throttle + quota.

Akwadona uses the same pattern: per-tenant token bucket, plan-default limits, operator-overridable.

## Plan defaults (Step 2g.1)

Source of truth: `akwadona-cdk/lambda/lib/plan-defaults.js`.

| Plan                   | `rps` (per-second soft cap) | `dailyQuota` (UTC day) | Effective req / min |
|------------------------|---------------------------:|------------------------:|--------------------:|
| `free`                 | 10                         | 100,000                 | 600                 |
| `standard`             | 100                        | 1,000,000               | 6,000               |
| `enterprise`           | 500                        | 10,000,000              | 30,000              |
| `enterprise-isolated`  | 500                        | 10,000,000              | 30,000              |

Per-tenant override: the operator can set `limits.rps` / `limits.dailyQuota` on the tenant profile (`PATCH /operator/tenants/{slug}`). Overrides win over plan defaults.

## DynamoDB schema (counter rows live in the existing `Hospital` table)

Two counter rows per tenant. Both use the `ttl` attribute so DynamoDB auto-cleans expired buckets.

### Per-minute window counter

| Attribute   | Value                                 | Notes |
|-------------|---------------------------------------|-------|
| `PK`        | `THROTTLE#<tenantId>`                 | Partition key. |
| `SK`        | `MIN#<YYYY-MM-DDTHH:MM>`              | UTC minute bucket. |
| `count`     | integer                               | Incremented atomically per request. |
| `ttl`       | unix-seconds 120 s after window end   | DynamoDB sweeps after expiry. |
| `EntityType`| `"THROTTLE_MIN"`                      | Aids ops querying. |

### Per-day quota counter

| Attribute   | Value                                 | Notes |
|-------------|---------------------------------------|-------|
| `PK`        | `THROTTLE#<tenantId>`                 | Partition key. |
| `SK`        | `DAY#<YYYY-MM-DD>`                    | UTC day bucket. |
| `count`     | integer                               | Incremented atomically per request. |
| `ttl`       | unix-seconds 25 h after day end       | DynamoDB sweeps after expiry. |
| `EntityType`| `"THROTTLE_DAY"`                      | Aids ops querying. |

No new GSIs needed. Rows are isolated from tenant data by the `THROTTLE#` PK prefix.

## Behavior on breach

- HTTP **429 Too Many Requests** is returned.
- Response header `Retry-After: <seconds-until-window-resets>`.
- Response body: `{ "error": "rate_limited", "message": "Per-minute limit exceeded", "retryAfter": 42 }` (or `"Daily quota exceeded"`).
- The Lambda increments a CloudWatch custom metric `Akwadona/Throttle/Hits` with dimension `tenantId` so the operator console can surface it.

## Skip list

The throttle check is **skipped** for:
- `role: 'operator'` JWTs — platform staff, not tenant traffic.
- Warm-up invocations (`event._warmup === true`).
- `OPTIONS` preflights — no body, no work.

## Future (not in 2g)

- Distributed rate limit using DynamoDB streams to publish current usage live to the operator console.
- Pre-emptive client-side throttling — the SDK reads `X-RateLimit-Remaining` (we'll add the header on success) and slows itself down before hitting 429.

# Compliance Update 01 — Region pinning and CORS lockdown

**Date:** 2026-04-29
**Author:** Sami Taha
**Severity addressed:** 🔴 Blocker
**Obligations closed:** Matrix row 1 (data residency), Matrix row 5 (access control — CORS)
**Gaps closed from status doc:** B.1, B.2

---

## What was fixed

### 1. Stack region pinned to `me-south-1`

- The stack now requires an explicit AWS region at synth time.
- Default region is `me-south-1` (Bahrain), the closest PDPPL-aligned AWS region for Qatar workloads.
- Override is possible only by setting `CDK_DEPLOY_REGION` — intentional, documented, requires MOPH approval if used.
- Account ID must be supplied via env (no more "environment-agnostic" template).
- File touched: `tiryaq-cdk/bin/tiryaq-cdk.ts`.

### 2. CORS allow-list replaces wildcard

- `allowOrigins` changed from `['*']` to an explicit list:
  - `http://localhost:4200` (development)
  - `https://dlh976jc3xp7c.cloudfront.net` (production CloudFront)
- HTTP methods restricted to the methods Tiryaq actually uses (GET, POST, PATCH, DELETE, OPTIONS) instead of `ANY`.
- `allowCredentials: false` and `maxAge: 10 min` added explicitly.
- File touched: `tiryaq-cdk/lib/tiryaq-cdk-stack.ts` (CORS block).

---

## What was added

Nothing new beyond the two changes above. No new resources are deployed by this update.

---

## What was NOT touched in this update

- Cognito password policy and MFA — Update 02.
- KMS CMKs — Update 03.
- WAF / CloudTrail / audit bucket — Update 04.
- Hardcoded seed passwords — Update 05.
- Data classification / TTL / S3 versioning — Update 06.

---

## How to verify

```bash
# from tiryaq-cdk/
export CDK_DEPLOY_ACCOUNT=<your-account-id>
npx cdk synth | head -5
# expect: Region: me-south-1 in the synthesised template
```

For CORS, after deploy:

```bash
curl -I -X OPTIONS https://<api-id>.execute-api.me-south-1.amazonaws.com/patients \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: GET"
# expect: no access-control-allow-origin header for example.com
```

---

## Rollback

`git revert` the two files above. No data migration. No state change.

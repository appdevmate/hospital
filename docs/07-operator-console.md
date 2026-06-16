# Step 7 — Akwadona Operator Console (www.akwadona.com)

## Purpose

- Akwadona is the SaaS we sell to hospitals.
- The operator console is **our internal tool** to monitor customer tenants.
- It lives at `www.akwadona.com`.
- Each customer hospital lives at its own subdomain (e.g. `tiryaq.akwadona.com`).

## Big design promise — "PHI-blind + business-data-blind" (Step 7g)

- The operator console can **never** read patient data.
- The operator console can **never** read tenant business volumes (patient / doctor / appointment counts) either — those are the customer's data, not the platform's.
- It only shows:
  - **Subscription:** plan, status, contract start, MRR.
  - **Platform usage:** API calls (24 h), bandwidth (30 d), active Cognito users (count only), storage GB, est. monthly cost.
  - **Compliance:** BAA signed Y/N, DPA signed Y/N, last audit date.
  - **Encryption:** per-tenant KMS data key + HMAC key identifiers (just IDs, cannot decrypt).
  - **Audit:** sanitized metadata — timestamp, actor, IP, **coarsened category** (AUTH / DATA_READ / DATA_WRITE / DATA_DELETE / OPERATOR_ACTION). Entity ids stripped.
- Encrypted PHI snapshots in audit rows never leave the Lambda.
- Reference model: Athenahealth / Stripe Connect / Vercel Teams — the platform vendor sees billable usage, not the customer's domain data.
- This is HIPAA / PDPPL / GDPR **"minimum necessary access"** — applied to both patient PHI AND tenant business data.

## How it works (data flow)

1. Operator (you) signs in at `www.akwadona.com` with `sami@akwadona.com`.
2. Cognito issues a JWT with claim `role: operator`.
3. Frontend `OperatorConsoleComponent` calls `/operator/*` endpoints with `Authorization: Bearer <jwt>`.
4. API Gateway verifies the JWT signature.
5. The `tiryaq-operator-console` Lambda re-checks `claims.role === 'operator'` (defense-in-depth).
6. Lambda reads only metadata rows (tenant profile, counters, stripped audit).
7. Frontend renders the dashboard.

## Auth roles

- All users live in a single Cognito User Pool (`tiryaq-user-pool`).
- The `Operator` group marks platform staff.
- Pre-token-generation Lambda inspects the user's groups:
  - In `Operator` group → JWT gets `role: operator` (no `tenantId`).
  - Otherwise → JWT gets `role: tenant_user` + the user's `tenantId`.

## Files (Step 7)

### Backend
- `tiryaq-cdk/lambda/tiryaq-operator-console/index.js` — operator Lambda.
- `tiryaq-cdk/lib/tiryaq-cdk-stack.ts` — wires the Lambda + `/operator/{proxy+}` route.
- `tiryaq-cdk/lambda/cognito-pre-token-generation/index.js` — injects `role` claim.

### Frontend
- `src/app/services/operator.service.ts` — typed HTTP client.
- `src/app/components/operator-console/operator-console.ts` — UI.
- `src/app/guards/operator.guard.ts` — route guard (only `role === 'operator'`).
- `src/app/services/tenant.service.ts` — added `isOperator` + `isOperatorSubdomain`.
- `src/app/guards/auth.guard.ts` — bounces operators to `www`, bounces tenant users off `www`.
- `src/app/layout/components/app.topbar.ts` — shows purple "Operator" badge instead of tenant pill.
- `src/app.routes.ts` — `/operator` route with `operatorGuard`.

## API endpoints (all require `role: operator`)

| Method | Path | Returns |
|--------|------|---------|
| GET | `/operator/tenants` | List of tenants (metadata only). |
| GET | `/operator/tenants/{slug}` | Single tenant profile. |
| GET | `/operator/tenants/{slug}/stats` | Counts: patients, doctors, appointments. |
| GET | `/operator/tenants/{slug}/audit` | Last N audit events (metadata only — PHI snapshots stripped). |
| PATCH | `/operator/tenants/{slug}` | Update name, status, plan, limits, notes. |

Allowed PATCH fields:
- `status` — `active` / `trial` / `suspended`.
- `plan` — `free` / `standard` / `enterprise`.
- `name` — display name.
- `contractStart` — contract start date.
- `notes` — internal operator-only notes.
- `limits.rps` — request rate cap.
- `limits.dailyQuota` — daily request budget.
- `limits.storageGB` — storage cap.
- `limits.maxUploadMB` — single-upload size cap.

Anything else in the request body is silently ignored (allow-list).

## Why this Lambda **cannot** see PHI

- The route map above is **exhaustive** — no patient / consultation / pharmacy / blood-bank endpoint reachable from this Lambda.
- The Lambda's code never calls `kms:Decrypt`. It reads metadata-only DynamoDB rows.
- Audit rows have `before` + `after` encrypted JSON blobs — the Lambda intentionally drops those fields before returning.
- Even if the IAM role technically permits `Decrypt`, no code path calls it.

### Hardening track (future)

- Create a **separate** Lambda execution role for `tiryaq-operator-console`.
- Attach an explicit **DENY** statement on `kms:Decrypt` for all `T_*` tenant keys.
- That way the IAM layer itself blocks accidental PHI access — not just the code.
- Tracked under the per-tenant-throttling / hardening task list.

## Subdomain routing rules

| User type | Subdomain | Result |
|-----------|-----------|--------|
| Operator | `www.akwadona.com` | Sees Operator Console. |
| Operator | `tiryaq.akwadona.com` | Auto-redirected to `www.akwadona.com/operator`. |
| Tenant user (Tiryaq) | `tiryaq.akwadona.com` | Sees Tiryaq app. |
| Tenant user (Tiryaq) | `alshifaa.akwadona.com` | Signed out + redirected to `tiryaq.akwadona.com`. |
| Tenant user | `www.akwadona.com` | Auto-redirected to their tenant subdomain. |

## How to onboard a new operator

1. AWS Console → Cognito → User Pools → `tiryaq-user-pool` → Users.
2. Create the user (`new.operator@akwadona.com`) and confirm.
3. Add them to the **Operator** group.
4. They get a JWT with `role: operator` on next login.
5. They visit `www.akwadona.com` and see the console.

## How to onboard a new tenant hospital

(Not handled by the console UI yet — manual for now.)

1. Add the slug → tenantId mapping to:
   - `tiryaq-cdk/lib/tiryaq-cdk-stack.ts` (`tenantKeys` + `tenantHmacKeys`).
   - `src/app/services/tenant.service.ts` (`TENANTS` map).
   - `scripts/lib/tenant-ids.js`.
2. Create a per-tenant KMS CMK + HMAC key in the AWS Console.
3. Run `cdk deploy` to push the new key ARNs into Lambda env vars.
4. Run `scripts/seed-tenant.js <slug> <displayName>` to create the `TENANT#<slug>#PROFILE` row.
5. Add a CloudFront alternate domain for `<slug>.akwadona.com`.
6. (Future: automate via an operator console "Add tenant" wizard.)

## Manual UAT checklist

- [ ] `sami@akwadona.com` signs in at `www.akwadona.com` → Operator Console loads.
- [ ] Topbar shows purple **Operator** badge (no tenant pill).
- [ ] Tenant list shows Tiryaq + Alshifaa.
- [ ] Clicking a tenant shows its counts (patients, doctors, appointments).
- [ ] Audit table shows recent metadata — no `before` / `after` fields visible.
- [ ] **Edit** dialog updates plan + limits → audit row written with `actorEmail=sami@akwadona.com`.
- [ ] An operator visiting `tiryaq.akwadona.com` gets redirected to `www.akwadona.com/operator`.
- [ ] A tenant user (any non-operator) visiting `www.akwadona.com` gets bounced to their tenant subdomain.

## What's intentionally NOT here yet

- Payments — tracked manually for now. (You said: "Payments tracked manually for now.")
- CloudWatch storage / API-call charts — placeholder `null` returned by the Lambda; future enhancement.
- Tenant onboarding wizard — manual today.
- Hardened IAM DENY policy on `kms:Decrypt` for the operator Lambda — tracked as future hardening.

## Compliance mapping (Step 5 cross-reference)

- HIPAA §164.312(a)(1) — access control: operator role is a separate principal, no PHI access.
- PDPPL Article 11 — data minimization: operator console returns counts + metadata only.
- GDPR Article 32 — appropriate technical measures: per-row encryption stays opaque to operator.
- BAA template — operator console is the basis for the "minimum necessary administrative access" clause.

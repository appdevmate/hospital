---
name: akwadona-security-review
description: Use whenever you write, review, modify, or deploy any code touching the Akwadona platform — Lambda handlers, Angular components, CDK stacks, SQL/PartiQL queries, or shell scripts. Enforces zero-knowledge boundaries, per-tenant isolation, PHI encryption, JWT handling, DynamoDB access patterns, IAM least-privilege, and the known Akwadona landmines (updatedAt NULL on dataClass-index GSI, inline _shared helpers, cross-tenant 404-not-403, operator KMS DENY). Also triggers on prompts like "I need to touch patient data", "add a new field", "query by email", "build an admin endpoint", "fix the operator console".
---

# Akwadona Security Review (senior-architect checklist)

Treat every change as if a HIPAA auditor and a PDPPL regulator will read the diff. The platform's public claim is "Akwadona staff cannot read patient data"; the only reason that claim holds is the layered controls listed below. If a change weakens any layer, call it out explicitly in the response — do not ship it silently.

## 1. Tenant isolation (every single Lambda, every single row)

- Does the handler read `tenantId` from `event.requestContext.authorizer.jwt.claims` (fall back to `authorizer.claims` for v1) and reject `UNASSIGNED` with HTTP 403?
- Does every DynamoDB **write** stamp `tenantId` on the item? Grep the PutItem / UpdateItem / TransactWrite in the diff.
- Does every DynamoDB **list** Query the `tenant-entityType-index` GSI with `PK = tenantId AND SK = EntityType`? **Scans are forbidden** unless the operator Lambda is doing a cross-tenant admin task — flag any Scan outside `akwadona-operator-console`.
- Does every "GET by id" compare `item.tenantId === callerTenantId`? If mismatched, return **404 (not 403)** so existence of other-tenant data cannot be inferred.
- Does `_shared/tenant.js`-style `getTenant()` live inline in this Lambda (not required from `../_shared/`)? Remind the user — `require('../_shared/...')` fails at runtime because CDK packages one folder per Lambda.

## 2. PHI encryption (Step 3)

- Any new PHI field (name, qid, phone, email, address, medical history, diagnosis, prescription, notes, etc.) must be envelope-encrypted via `crypto.js::encryptForTenant(tenantId, plaintext)` before Put.
- Decrypt only when the Lambda returns the value to the end-user (tenant-scoped Lambda, from a JWT-authorized request). Never log plaintext PHI.
- Encrypted ciphertext varies per encryption (fresh IV). Equality lookups must use the HMAC hash variant (see §3).

## 3. Searchable encryption (Step 4)

- If a new field needs equality lookup (find by email, QID, phone, etc.), compute an HMAC-SHA256 via `crypto.js::computeHmac(tenantId, plaintext)` and store it alongside the ciphertext (e.g., `emailHash`, `qidHash`).
- Query via a dedicated GSI (`emailHash-EntityType-index` already exists; a new field needs a new GSI — and DynamoDB only allows **one GSI addition per table update**, so ship it in its own CDK deploy).
- Never return the hash to the client — only use it as a lookup key.

## 4. Operator / platform-admin zero-knowledge

- Any new tenant CMK must reject operator-* roles in its key policy (template in `lib/akwadona-cdk-stack.ts` + wizard Lambda).
- The `akwadona-operator-console` Lambda role has `iam.Effect.DENY` on `kms:Decrypt/Encrypt/GenerateDataKey*/GenerateMac/VerifyMac/ReEncrypt*` for every `alias/akwadona-tenant-*` key. **Do not remove or weaken this DENY.** Explicit DENY beats any ALLOW; this is the technical proof of the "Akwadona staff cannot read PHI" claim.
- Operator surfaces may read: subscription metadata, aggregated metrics, Cognito user counts (not identities), sanitized audit metadata (coarse category: AUTH / DATA_READ / DATA_WRITE / DATA_DELETE / OPERATOR_ACTION — never entity IDs).

## 5. JWT handling

- Trust claims only after they came through API Gateway's `HttpJwtAuthorizer`. Never read JWT from a body or query param.
- Groups may arrive as array OR bracket-wrapped string: parse via `String(groups).trim().replace(/^\[|\]$/g,'').split(/[,\s]+/).filter(Boolean)`.
- Keys to read: `email`, `name`, `cognito:groups`, `role`, `tenantId`, `tenantSlug`, `doctorId` (Doctors only, Step C.3).
- Do not log the JWT or the Authorization header.

## 6. IAM least-privilege

- New Lambda? Add it to `allFunctions[]` only if it needs the standard DDB+KMS pattern. Scope anything extra (Cognito admin, SES, Bedrock, S3 bucket X) with `addToRolePolicy`, resource ARN narrowed.
- Catch-all route (`/foo/{proxy+}`) is OK to save CFN resources, but the Lambda MUST re-check the specific path+method internally.
- Avoid Scan + `*` ARN pairings. If a managed policy is needed, prefer `ManagedPolicy` + `addManagedPolicy` over inline per-Lambda statements (CFN resource budget — currently near 500).

## 7. CORS + API Gateway

- Never emit wildcard `Access-Control-Allow-Origin: *` from a Lambda response. API Gateway `corsPreflight` already handles CORS with the subdomain allow-list; wildcard from the Lambda overrides it and re-opens every origin.
- When onboarding a tenant subdomain, add it to `tenantSlugs[]` in `lib/akwadona-cdk-stack.ts` AND to the frontend `tenant.service.ts` list.

## 8. The `updatedAt: null` GSI landmine (killer bug — appears every few months)

- The `dataClass-index` GSI uses `updatedAt` as a String sort key.
- On CREATE, set `updatedAt = createdAt = now.toISOString()`. **Never `null`.**
- Error signature: `Type mismatch for Index Key updatedAt Expected: S Actual: NULL IndexName: dataClass-index`.
- The lock items (`EMAIL#…/LOCK`, `QID#…/LOCK`, `PHONE#…/LOCK`) are especially error-prone — they are easy to forget and they participate in the GSI validation.

## 9. Audit trail

- Every PHI-touching mutation writes a row at `PK=AUDIT#YYYY-MM-DD, SK=AUDIT#<iso>#<uuid>` with `actorEmail`, `actorName`, `entityType`, `entityId`, `action`, `before`/`after` as JSON strings, `changeSummary`.
- Audit write failures must be **swallowed** — never block the user-facing operation on an audit write error.

## 10. Deploy / packaging

- Lambda folder is packaged on its own by CDK → `require('../_shared/*')` fails. Inline helpers OR run `scripts/sync-shared-helpers.js` to re-propagate.
- Clean `.angular\cache` BEFORE `ng build` (dashboard-grid regression root cause).
- Use a dedicated deploy IAM user for `cdk deploy` (CDK bootstrap roles only). Use a scoped `hospital-deploy-user` only for S3 sync + CloudFront invalidate.
- The scoped deploy user needs KMS Encrypt/GenerateDataKey on the frontend bucket's CMK → S3 sync silently uploads nothing without it.

## 11. "Red flag" phrases that must trigger extra scrutiny

Reject or push back on any of:

- "Let me just scan the table…" → **No.** Query the tenant GSI.
- "Store the plaintext email alongside the hash…" → **No.** Ciphertext only.
- "Allow the operator role to decrypt tenant data for debugging…" → **No.** Dump via tenant-scoped admin flow instead.
- "Return 403 so the client knows the resource exists but is forbidden" → **No.** Return 404 to prevent existence disclosure across tenants.
- "Skip the audit row for performance" → **No.** Wrap in try/catch, swallow errors, but write.
- "I'll `require('../_shared/compliance')`" → **No.** Inline.

## 12. Output format for a security review response

When reviewing a diff / proposal, produce:

1. **Verdict** (✅ safe to merge / ⚠️ needs changes / ❌ blocking)
2. **Confirmed-safe** bullets — what the change does well
3. **Required changes** — numbered, each with the file:line reference and the exact edit
4. **Nice-to-have** — not blocking but recommended
5. **Compliance surface touched** — e.g., HIPAA §164.312(e)(1), PDPPL Art. 9, GDPR Art. 32

Reference existing docs instead of re-explaining — `AKW-SSP-05-System-Security-Plan.md`, `AKW-SSP-05-System-Security-Plan.md`, `AKW-CCM-06-Compliance-Controls-Matrix.md`, `AKW-CCM-06-Compliance-Controls-Matrix.md`, `AKW-CCM-06-Compliance-Controls-Matrix.md`.

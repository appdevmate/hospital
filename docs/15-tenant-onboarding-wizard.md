# Step 96 — Tenant Onboarding Wizard

## What this is — easy English

- Akwadona signs up new hospitals every week. Before this wizard, onboarding meant a developer ran 5+ AWS Console workflows over half a day (KMS keys, key policies, DynamoDB rows, Cognito users, CDK redeploy).
- The wizard replaces that with a 4-step form in the operator console. The operator clicks **Onboard**, fills in the hospital name, plan, and first admin, then the platform provisions everything in ~5 seconds.
- No developer involvement. No CDK redeploy. No KMS Console clicking.
- Same model as Stripe Connect, Twilio sub-accounts, and Particle Health partner orgs.

## What gets provisioned per tenant

In one round-trip the backend creates:

1. **KMS data CMK** (`alias/akwadona-tenant-<slug>-data`) — symmetric AES-256, used for PHI envelope encryption.
2. **KMS HMAC CMK** (`alias/akwadona-tenant-<slug>-hmac`) — HMAC_256, used for searchable hashed fields.
3. **TENANT profile row** in DynamoDB (`PK = TENANT#<slug>, SK = PROFILE`) — carries plan, status, contact info, **and the two KMS key ARNs**.
4. **Initial Cognito admin user** with `custom:tenantId = T_<id>`, added to the `Admin` group, permanent temp password.
5. **Audit log entry** (`OPERATOR_CREATE_TENANT`) so the action is forensically traceable.

If any step fails, the partial state is rolled back automatically:

- Cognito user → deleted
- DDB row → marked `status = rolledback` (slug stays reserved until KMS keys finish their 7-day deletion window)
- Both KMS keys → scheduled for deletion (7-day pending window)

## How the operator uses it — step by step

1. Open the operator console at https://www.akwadona.com/operator.
2. Sign in with an account in the `Operator` Cognito group (role claim `operator`).
3. In the **Tenants** panel, click the **+ Onboard** button.
4. The wizard opens at `/operator/onboard`.
5. **Step 1 — Hospital**. Enter:
   - Display name (e.g. "Nabd Hospital")
   - URL slug (auto-formats lowercase, e.g. `nabd`)
   - Country ISO-2 (optional, e.g. `QA`)
   - Contact email (optional, billing/ops contact)
6. **Step 2 — Plan**. Click one of the three plan cards:
   - **Free** — 10 req/s, 100k req/day
   - **Standard** — 100 req/s, 1M req/day
   - **Enterprise** — 500 req/s, 10M req/day
7. **Step 3 — Admin**. The first admin user the customer will sign in as:
   - Full name
   - Email address (becomes the Cognito email alias)
8. **Step 4 — Review**. Confirm the summary and click **Create tenant**.
9. After ~5 seconds you see the green **Tenant created** card showing:
   - Slug and tenantId
   - Both KMS key IDs
   - Admin username (`admin-<slug>`)
   - Admin email
   - **Temporary password** (16 chars)
   - Sign-in URL
10. Click the copy icon next to the temp password.
11. Forward the credentials to the customer **over a trusted channel** — encrypted email, password manager share, or in-person. Not plain chat or SMS.

## How the new admin signs in for the first time

1. Open the sign-in URL the operator sent (https://app.akwadona.com/).
2. Enter the username (`admin-<slug>`) and the temp password.
3. The admin lands directly in the app — no force-change-password step because the operator already set the password as `Permanent: true`.
4. As soon as possible, the admin should:
   - Change the password (account menu → security)
   - Add their real users (Admin / Doctors / Pharmacists / Developers) via the admin panel
   - Sign the BAA and DPA (the operator marks these `signed` in the operator console afterwards)

## How the new tenant's PHI Lambdas find the new KMS keys (no CDK redeploy)

Pre-wizard: `tenantKeys` and `tenantHmacKeys` were `Record<string, string>` maps in the CDK stack — every new tenant required a code edit and `cdk deploy`. That stops scaling at customer #3.

Post-wizard: every PHI Lambda's `_shared/crypto.js` resolves keys in this order:

1. **Env-var map** — fast path. Tiryaq + Alshifaa stay here for the hot path.
2. **DynamoDB TENANT row** — fallback. The wizard writes `kmsKeyArn` and `kmsHmacKeyArn` onto the row, the Lambda reads them on first cache miss.

Cache TTL is 60 seconds per Lambda container. After warmup, the DDB lookup costs nothing.

## How rollback works on partial failure

The wizard provisions in a strict order so the rollback path is deterministic:

```
1. Create data CMK   ──→ fail? nothing to clean
2. Create alias       ──→ fail? schedule data key for deletion
3. Create HMAC CMK    ──→ fail? schedule data key
4. Create alias       ──→ fail? schedule both keys
5. Write TENANT row   ──→ fail? schedule both keys
6. Create Cognito     ──→ fail? mark row rolledback + schedule both keys
7. Set password       ──→ fail? delete Cognito user + mark row rolledback + schedule both keys
8. Add to group       ──→ fail? same as above
9. Audit log          ──→ fail? warn only, do not roll back
```

After rollback, the slug remains "reserved" in DDB with `status = rolledback`. This prevents an instant retry from creating a duplicate key under the same alias while the previous one is in its 7-day pending window. Operator just picks a different slug for the retry.

## KMS key lifecycle

- **Creation** — Wizard creates with `BypassPolicyLockoutSafetyCheck: true` because the operator role is deliberately excluded from the key policy. Only the AWS root account retains `kms:*`.
- **Active life** — Indefinite. Tenant Lambdas use the keys via the `aws:PrincipalArn` `ArnLike TiryaqCdkStack-*ServiceRole*` condition.
- **Deletion** — Minimum 7-day pending window (operator may extend up to 30 days). During pending window, data encrypted with the key cannot be decrypted. Used as a safety net before permanent deletion.
- **Rotation** — Not enabled by default for new tenants. To enable, an operator/root user can call `kms:EnableKeyRotation` on the data CMK (HMAC keys do not support rotation).

## How to delete a tenant manually

For a tenant you onboarded by mistake or a customer that churned, run this from the repo root (PowerShell):

```powershell
$slug      = 'PASTE_SLUG'
$kmsKeyId  = 'PASTE_KMS_KEY_ID'
$hmacKeyId = 'PASTE_HMAC_KEY_ID'
$username  = 'admin-' + $slug

# 1. Schedule both KMS keys for deletion (7-day minimum)
aws kms schedule-key-deletion --key-id $kmsKeyId  --pending-window-in-days 7
aws kms schedule-key-deletion --key-id $hmacKeyId --pending-window-in-days 7

# 2. Delete the admin Cognito user
aws cognito-idp admin-delete-user --user-pool-id us-east-1_RACghntmS --username $username

# 3. Delete the TENANT row
$key = @"
{"PK":{"S":"TENANT#$slug"},"SK":{"S":"PROFILE"}}
"@
aws dynamodb delete-item --table-name Hospital --key $key
```

Data rows (patients, doctors, appointments, etc.) for the deleted tenant remain in DynamoDB until KMS deletion completes — at which point they become permanently undecryptable. For a faster purge, scan-and-delete rows tagged `tenantId = T_<id>` before deleting the keys.

## Security model — zero-knowledge for new tenants too

Every new tenant gets the same defense-in-depth guarantee as Tiryaq and Alshifaa:

- **Key policy** whitelists `arn:aws:iam::<account>:role/TiryaqCdkStack-*ServiceRole*` **AND** excludes `*Operator*` via `StringNotLike`. The operator role can never decrypt the new tenant's data, even though it created the key.
- **Identity policy** (operator role) — the existing explicit DENY on `kms:Decrypt`/`Encrypt`/`GenerateDataKey*`/`GenerateMac` already covers the original 4 tenant CMKs. New tenant CMKs are protected by the key-policy `ArnNotLike` layer (the IAM DENY list does not auto-grow to include them, by design — IAM doesn't allow Lambda principals to modify their own role policy).
- **Audit log** records every `OPERATOR_CREATE_TENANT`. The clinical entity ids inside the audit are stripped before returning to the operator console (no `entityType` or `entityId`).

## IAM grants the operator console needs (CDK)

Already wired in `tiryaq-cdk/lib/tiryaq-cdk-stack.ts`:

```ts
operatorConsoleFn.addToRolePolicy({
    actions: ['kms:CreateKey', 'kms:CreateAlias'],
    resources: ['*']
});
operatorConsoleFn.addToRolePolicy({
    actions: ['kms:TagResource', 'kms:ScheduleKeyDeletion', 'kms:DescribeKey'],
    resources: ['*']
});
operatorConsoleFn.addToRolePolicy({
    effect: DENY,
    actions: ['kms:ScheduleKeyDeletion', 'kms:DeleteAlias'],
    resources: allTenantCmkArns   // Tiryaq + Alshifaa data + HMAC
});
operatorConsoleFn.addToRolePolicy({
    actions: ['cognito-idp:AdminCreateUser', 'AdminSetUserPassword',
              'AdminAddUserToGroup', 'AdminDeleteUser'],
    resources: [userPool.userPoolArn]
});
```

The DENY ensures the operator can never accidentally delete an existing tenant's CMKs — only the new ones it just created.

## Troubleshooting

- **HTTP 409 "Tenant slug already exists"** — Pick a different slug. The previous slug may be in `status = rolledback` waiting on its KMS keys.
- **HTTP 400 "slug must be lowercase, 3-32 chars"** — Slug regex is `^[a-z][a-z0-9-]{1,30}[a-z0-9]$`. Must start with a letter, end with alphanumeric, hyphens allowed in the middle only.
- **HTTP 500 "Username cannot be of email format"** — Bug in older wizard code; admin username is now `admin-<slug>` not `admin@<slug>`. Pull latest and redeploy.
- **HTTP 500 "Tenant onboarding failed: The new key policy will not allow you to update the key policy"** — KMS lockout safety check fired. Wizard sets `BypassPolicyLockoutSafetyCheck: true` so this should not happen; if it does, the Lambda code drifted. Verify `tiryaq-operator-console/index.js` still has the flag set.
- **New admin can't sign in** — Confirm the username is `admin-<slug>` (not the email). The user pool uses email as an alias, not as the primary username.
- **New tenant Lambda gets `No KMS key configured for tenant T_<id>` error** — The DDB fallback isn't finding the row. Check `aws dynamodb get-item --key {"PK":{"S":"TENANT#<slug>"},"SK":{"S":"PROFILE"}}` returns a row with both `kmsKeyArn` and `kmsHmacKeyArn` populated.

## File map

```
tiryaq-cdk/lambda/_shared/crypto.js                   ← async key resolution + DDB fallback (Phase 1)
tiryaq-cdk/lambda/tiryaq-operator-console/index.js    ← POST /operator/tenants handler   (Phase 2)
tiryaq-cdk/lib/tiryaq-cdk-stack.ts                    ← IAM grants for KMS + Cognito     (Phase 3)
src/app/services/operator.service.ts                  ← createTenant() API method        (Phase 4)
src/app/components/operator-console/
    tenant-onboarding-wizard.ts                       ← 4-step Angular form               (Phase 4)
src/app.routes.ts                                     ← /operator/onboard route           (Phase 4)
docs/15-tenant-onboarding-wizard.md                   ← this doc                          (Phase 5)
```

## Industry comparison

| Vendor                | Onboarding model                  | Time |
|-----------------------|-----------------------------------|------|
| **Akwadona**          | Operator wizard at /operator/onboard | ~5 s |
| Stripe Connect        | API call to /v1/accounts          | ~3 s |
| Twilio Sub-accounts   | API call to /Accounts.json        | ~2 s |
| Particle Health       | Partner portal form               | ~10 s |
| Salesforce Trust Layer| Partner sandbox provisioning      | ~minutes |

## Verified end-to-end (production)

- **2026-06-23** — `probe-co-c86853` (T_fd6b1de5) provisioned via API. New admin signed in, created and read back a PHI row (blood donor). DDB fallback resolved the new tenant's KMS key without CDK redeploy. Cross-tenant probe still 14/14 PASS for existing tenants. Probe tenant cleaned up afterwards.
- **2026-06-23** — `nabd` (T_567e806a) provisioned via the UI wizard end-to-end. Enterprise plan. Admin user `admin-nabd` created. Visible in operator console immediately.

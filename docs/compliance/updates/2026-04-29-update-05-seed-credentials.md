# Compliance Update 05 — Eliminate hardcoded passwords; force change on first login

**Date:** 2026-04-29
**Author:** Sami Taha
**Severity addressed:** 🔴 Blocker
**Obligations closed:** Matrix rows 4 (strong auth), 18 (no hardcoded secrets)
**Gaps closed from status doc:** B.9

---

## What was fixed

### 1. Removed `Admin@1234` shared password

- The eight seed users no longer share a single, plain-text, version-controlled password.
- The `AdminSetUserPasswordCommand` with `Permanent: true` call was removed entirely.

### 2. Per-user random temporary passwords

- Each seed user now receives a 20-character cryptographically random password generated with Node's `crypto.randomInt`.
- The generator guarantees password-policy compliance: at least one uppercase, one lowercase, one digit, one symbol, length ≥ 12 (we use 20).
- Confusable characters (`O`, `0`, `I`, `l`, `1`) excluded from the pool to reduce help-desk friction.

### 3. Force change on first login

- `AdminCreateUserCommand` is now called WITHOUT a follow-up `AdminSetUserPasswordCommand`.
- This leaves Cognito's default `UserStatus = FORCE_CHANGE_PASSWORD` in place.
- Every seeded user will be required to set their own password (and enrol MFA per Update 02) on first sign-in.

---

## What was added

### 4. Temporary passwords stored in AWS Secrets Manager

- Each user's temporary password is written to `/tiryaq/seed-users/<username>` in Secrets Manager.
- Encrypted with `tiryaqDataKey` (the data CMK from Update 03).
- Secret value is JSON: `{ username, temporaryPassword, mustChange: true }`.
- Secret is updated (`PutSecretValue`) if it already exists; never deleted on stack delete.

### 5. Scoped IAM additions for the seed Lambda

- Removed: `cognito-idp:AdminSetUserPassword` (no longer needed; the dangerous "make it permanent" call is gone).
- Added: `secretsmanager:CreateSecret`, `PutSecretValue`, `DescribeSecret` scoped to `/tiryaq/seed-users/*` only.
- Added: KMS Encrypt/Decrypt on the data key for the Lambda's role.

### 6. Re-run safety

- If a user already exists (`UsernameExistsException`), the seed Lambda **skips** them silently — it does NOT reset their chosen password or rewrite the secret. This prevents a CDK redeploy from accidentally locking real users out.

---

## What was NOT touched in this update

- The 8 seeded usernames and group memberships are unchanged.
- The data classification + TTL changes — Update 06.

---

## Operational impact

- **First login flow:** an admin retrieves the temp password from Secrets Manager (or hands it to the user via a secure channel), the user signs in once, is forced to set a strong password, and enrols MFA.
- **Existing dev environments:** if you redeploy against an already-seeded pool, the eight users keep their current `Admin@1234` until they are deleted manually. To rotate them: delete the users in Cognito console, then redeploy — the Lambda will recreate them with random temp passwords.
- **Cost:** Secrets Manager is $0.40/secret/month. Eight secrets = $3.20/month.

---

## How to verify

```bash
# 1. Confirm seed users have FORCE_CHANGE_PASSWORD status
aws cognito-idp admin-get-user --user-pool-id <pool-id> --username admin1 \
  --query "UserStatus"
# expect: "FORCE_CHANGE_PASSWORD"

# 2. Confirm secrets exist and are encrypted with the right CMK
aws secretsmanager list-secrets --region me-south-1 \
  --query "SecretList[?starts_with(Name, '/tiryaq/seed-users/')].{Name:Name, KMS:KmsKeyId}"

# 3. Retrieve a temp password (admin-only)
aws secretsmanager get-secret-value --region me-south-1 \
  --secret-id /tiryaq/seed-users/admin1 \
  --query SecretString --output text
```

---

## Rollback

- Reverting the CDK file restores the old hardcoded-password Lambda.
- Already-created random-password users remain valid Cognito users — they will still need to complete the FORCE_CHANGE_PASSWORD flow before signing in. Do not roll back unless you have rotated to known credentials first.

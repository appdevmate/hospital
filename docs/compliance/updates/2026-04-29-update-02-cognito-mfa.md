# Compliance Update 02 — Cognito password policy + MFA enforcement

**Date:** 2026-04-29
**Author:** Sami Taha
**Severity addressed:** 🟠 High
**Obligations closed:** Matrix row 4 (strong authentication)
**Gaps closed from status doc:** B.3, B.4

---

## What was fixed

### 1. Password policy strengthened (B.3)

| Setting | Before | After |
|---------|--------|-------|
| `minLength` | 8 | 12 |
| `requireLowercase` | true | true |
| `requireUppercase` | true | true |
| `requireDigits` | true | true |
| `requireSymbols` | **false** | **true** |
| `tempPasswordValidity` | (default 7d) | 3 days |

Aligns with NCSA NIA password guidance and MOPH expectations for clinical access.

### 2. MFA enforced (B.4)

- `mfa: cognito.Mfa.REQUIRED` — every user must enrol a second factor.
- `mfaSecondFactor: { sms: true, otp: true }` — TOTP (preferred) and SMS supported.
- A leaked password no longer grants clinical-system access on its own.

---

## What was added

### 3. Cognito Advanced Security Mode (threat protection)

- `advancedSecurityMode: ENFORCED` — Cognito monitors for compromised credentials, suspicious sign-ins, and impossible travel; blocks risky attempts.
- Adds adaptive risk scoring at the login event itself.

### 4. Device tracking with new-device challenge

- `challengeRequiredOnNewDevice: true` — sign-in from an unrecognized device requires MFA even if "remember this device" was used previously.
- `deviceOnlyRememberedOnUserPrompt: true` — device trust only granted when user explicitly opts in.

---

## What was NOT touched in this update

- Existing seeded users still have `Admin@1234`. They will be forced to set a strong password and enrol MFA on first login because of this update, but the seed Lambda itself is rewritten in **Update 05**.
- KMS — Update 03.

---

## Operational impact

- Every user (including the 8 seeded test accounts) will be prompted to enrol MFA on next sign-in.
- Front-end Angular client must already handle the `MFA_SETUP` and `SOFTWARE_TOKEN_MFA` Cognito challenge responses. If not, the Angular auth service needs the matching handler. Verify `auth.service.ts`.
- SMS MFA requires the user pool to have an SNS role and number budget. Check Cognito console after deploy.

---

## How to verify

```bash
aws cognito-idp describe-user-pool --user-pool-id <pool-id> \
  --region me-south-1 \
  --query "UserPool.{MFA:MfaConfiguration,PolicyMin:Policies.PasswordPolicy.MinimumLength,Symbols:Policies.PasswordPolicy.RequireSymbols,Risk:UserPoolAddOns.AdvancedSecurityMode}"
```

Expected output:

```json
{
  "MFA": "ON",
  "PolicyMin": 12,
  "Symbols": true,
  "Risk": "ENFORCED"
}
```

---

## Rollback

Revert the password policy and MFA blocks in `tiryaq-cdk-stack.ts`. **Note:** Cognito does not allow MFA to be downgraded from `REQUIRED` to `OFF` once users have enrolled tokens. Plan accordingly before deploying to production.

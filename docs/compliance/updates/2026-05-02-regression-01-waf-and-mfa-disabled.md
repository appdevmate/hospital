# Compliance REGRESSION 01 — WAF disabled and MFA downgraded

**Date:** 2026-05-02
**Author:** Sami Taha
**Type:** Intentional regression — temporary
**Severity reopened:** 🟠 High (B.4 MFA, B.6 WAF)
**Reason:** Cost saving (WAF) and dev-friendliness (MFA) during early development.

---

## What was changed

### 1. WAF detached from CloudFront (B.6 reopened)

- `tiryaq-cdk-stack.ts` — `webAclId` line commented out on the CloudFront distribution.
- `bin/tiryaq-cdk.ts` — `TiryaqEdgeStack` removed from the CDK app entry; edge stack will be destroyed.
- Cost saved: ~$13/month base + per-request WAF charges.
- **Risk:** Edge requests no longer filtered for OWASP Top-10, SQLi, or rate-limit abuse. Compensating control: API Gateway throttling defaults still apply (10 000 RPS account-wide, 5 000 burst).

### 2. MFA fully disabled (B.4 reopened)

- Two-step path:
  1. CDK changed REQUIRED → OPTIONAL (Cognito will not accept REQUIRED → OFF on a live pool).
  2. Cognito console used to take OPTIONAL → OFF.
- CDK code now reflects `mfa: cognito.Mfa.OFF` so `cdk deploy` will not revert.
- New users will not be prompted for MFA at all.
- Existing users with TOTP enrolled had their MFA preferences cleared via `admin-set-user-mfa-preference`.
- **Risk:** A leaked password is now sufficient to access clinical data. This is unacceptable for production with real patient PHI.

---

## What was NOT changed

- KMS CMK encryption — still on.
- CloudTrail audit — still on.
- Audit log bucket Object Lock — still on.
- Cognito password policy (12 chars + symbol) — still enforced.
- Strong threat-protection mode — still enforced.
- Region pin, CORS lockdown, hardcoded-password removal, data classification — all still in place.

---

## How to re-enable for production

1. Restore `webAclId: props?.webAclArn` in `tiryaq-cdk-stack.ts`.
2. Restore the `TiryaqEdgeStack` import + instantiation + `crossRegionReferences` + `webAclArn` prop in `bin/tiryaq-cdk.ts`.
3. Restore `mfa: cognito.Mfa.REQUIRED` in `tiryaq-cdk-stack.ts`.
4. `npx cdk deploy --all`.
5. (Optional) For each existing user, force MFA enrolment by clearing any device tracking; new login will request a fresh enrolment.

---

## Required action: reset MFA on any user already enrolled

```powershell
aws cognito-idp admin-set-user-mfa-preference `
    --user-pool-id us-east-1_RACghntmS `
    --username doctor1 `
    --software-token-mfa-settings Enabled=false,PreferredMfa=false `
    --sms-mfa-settings Enabled=false,PreferredMfa=false `
    --region us-east-1
```

Repeat for each user who already enrolled an authenticator. (admin1, admin2, doctor1, etc.)

---

## Compliance status update

The following matrix rows are now **partially failing** until restored:

| Row | Obligation | Status |
|-----|------------|--------|
| 4 | Strong authentication | ⚠️ Password still strong, MFA optional |
| 15 | WAF protection | ❌ Disabled |

Update `02-Tiryaq-Compliance-Status.md` Section B with these regressions before any MOPH submission.

---

## Document control

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | 2026-05-02 | Sami Taha | Initial issuance |

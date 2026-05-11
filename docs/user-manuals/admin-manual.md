# Tiryaq User Manual — Administrator

**Document version:** 1.0
**Date:** 2026-04-30
**Audience:** Users in the **Admin** Cognito group
**Tone:** Step-by-step, screen-by-screen.

---

## 1. Who you are

You are an Administrator on Tiryaq. You manage users, monitor activity, control access, and oversee the platform. You do not see patient clinical detail unless you also belong to a clinical group.

---

## 2. First-time login

1. Open **https://d6i7iwknkj0bg.cloudfront.net** (or your production URL).
2. Click **Sign in**.
3. Enter your username (e.g. `admin1`) and your temporary password (provided by your deploy team via Secrets Manager).
4. Cognito will prompt you to set a new password — minimum 12 characters with at least one uppercase, lowercase, digit, and symbol.
5. You will be required to enrol multi-factor authentication (MFA):
   - Recommended: **TOTP** with Google Authenticator, Microsoft Authenticator, or 1Password.
   - Alternative: **SMS** to your registered phone number.
6. You're in.

---

## 3. The Admin Panel

Navigate to **Admin Panel** in the left sidebar. You'll see four tabs:

### 3.1 Stats

- Total patients, doctors, pharmacy items, recent activity counts.
- Use this for a daily quick read of platform health.

### 3.2 Users

- List of all Cognito users with their group, status (Enabled / Disabled / Force-change-password), and last sign-in.
- Actions you can take:
  - **Disable user** — instantly blocks sign-in. Useful when a doctor leaves the clinic.
  - **Enable user** — restores access.
  - **Set password** — issues a new temporary password (the user must change it on next login).
- You **cannot** see another user's actual password. Cognito doesn't store reversible passwords.

### 3.3 Audit

- Chronological feed of every significant action across the system.
- Each row shows: timestamp, actor email, action type, target entity ID.
- Filter by date range or actor.
- This is read-only. You cannot delete audit rows — by design.

### 3.4 (Future) System health

- Reserved for future operations dashboards.

---

## 4. Daily routine

| Task | How |
|------|-----|
| Check overnight failed logins | Audit tab → filter `LOGIN_FAILED` last 24h |
| Onboard a new doctor | Cognito console (separate, AWS-side) → create user → add to `Doctors` group → user gets temp password |
| Offboard a leaver | Admin Panel → Users → click Disable on their row |
| Investigate "I can't see X" complaint | Audit tab → filter by their email → check what they last did |
| Audit data access | Audit tab → filter by patient ID or doctor email |

---

## 5. What you cannot do (by design)

- View patient clinical content (diagnoses, prescriptions) unless you also belong to the `Doctors` group.
- Edit or delete audit log rows.
- Bypass MFA for yourself or others.
- Export the full database — there is no "export everything" button. This is a PDPPL safeguard. If you need a data subject access request, raise a ticket with the development team.

---

## 6. Security expectations of you

- Treat your password and TOTP device like a hospital key.
- Never share credentials. Each Admin must have their own account.
- Do not investigate patients you don't have a need to access — the audit log records every read.
- If you suspect a compromise: change your password immediately, then notify the development team to rotate the relevant Cognito tokens.

---

## 7. Common error messages

| Message | Likely cause | Fix |
|---------|-------------|-----|
| "Force change password" | Temp password expired or never changed | Sign out, sign in again, follow the prompt |
| "MFA setup required" | First login or MFA was reset | Scan the QR code with an authenticator app |
| "Access denied" on a resource | You're not in the right Cognito group | Contact development team to adjust group membership |
| "CORS error" in browser console | Frontend URL doesn't match the Cognito callback URL | Development team needs to update CDK + redeploy |

---

## 8. Where to get help

- Application bugs → development team via internal issue tracker.
- Security concerns → notify the development lead immediately.
- Compliance questions → see `docs/compliance/01-Qatar-GCC-Compliance-Master.md`.

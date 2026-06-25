# Step 107 — SES + Cognito Email Sender Setup

## What this is — easy English

- By default Cognito sends emails from `no-reply@verificationemail.com`. Gmail and most corporate mail gateways treat that as suspicious → password-reset emails land in spam, invite emails get filtered, customers complain.
- We replaced the default sender with `noreply@akwadona.com`, served through Amazon SES with DKIM signing.
- Result: reset codes and invite emails arrive in the customer's inbox, not spam.
- Same model used by Stripe (`receipts@stripe.com`), Vercel (`no-reply@vercel.com`), Twilio.

## The 4 components

1. **SES domain identity** — proves to AWS we own `akwadona.com` so SES will send mail with that From address.
2. **DKIM** — three CNAME records on `akwadona.com` DNS that let SES sign every outgoing email with our domain's cryptographic key. Receivers (Gmail, Outlook) verify the signature and trust the mail.
3. **MAIL FROM subdomain** — a separate envelope-from like `mail.akwadona.com` with its own MX + SPF TXT records. Aligns SPF with the From domain → DMARC compatibility, fewer bounces.
4. **SES identity policy** — grants `cognito-idp.amazonaws.com` permission to call `ses:SendEmail` on our SES identity (Cognito → SES bridge).
5. **Cognito user pool email config** — switched from `EmailSendingAccount: COGNITO_DEFAULT` to `DEVELOPER` with our SES SourceArn as the sender.

## Setup — step by step (PowerShell)

Run these as one script. Replace `akwadona.com` and the account/region values if you fork this for another tenant.

```powershell
$Region    = 'us-east-1'
$Domain    = 'akwadona.com'
$AccountId = '483176634665'

# 1. SES domain identity + DKIM
aws sesv2 create-email-identity --email-identity $Domain --region $Region | Out-Null

# 2. Pull DKIM tokens
$identity = aws sesv2 get-email-identity --email-identity $Domain --region $Region | ConvertFrom-Json
$tokens   = $identity.DkimAttributes.Tokens
Write-Host "DKIM tokens: $($tokens -join ', ')"

# 3. MAIL FROM subdomain
aws sesv2 put-email-identity-mail-from-attributes `
  --email-identity $Domain `
  --mail-from-domain "mail.$Domain" `
  --behavior-on-mx-failure USE_DEFAULT_VALUE `
  --region $Region | Out-Null
```

### DNS records to add (the manual step)

If `akwadona.com` is in **Route 53 same account**, you can `aws route53 change-resource-record-sets` directly.

For Akwadona it's **registered at GoDaddy**, so we add via the GoDaddy DNS web console:

| # | Type | Host / Name | Value | Priority | TTL |
|---|---|---|---|---|---|
| 1 | CNAME | `<token1>._domainkey` | `<token1>.dkim.amazonses.com` | — | 1 hour |
| 2 | CNAME | `<token2>._domainkey` | `<token2>.dkim.amazonses.com` | — | 1 hour |
| 3 | CNAME | `<token3>._domainkey` | `<token3>.dkim.amazonses.com` | — | 1 hour |
| 4 | MX | `mail` | `feedback-smtp.us-east-1.amazonses.com` | `10` | 1 hour |
| 5 | TXT | `mail` | `v=spf1 include:amazonses.com ~all` | — | 1 hour |

GoDaddy quirks:
- The **Host** field takes only the subdomain part — GoDaddy appends `.akwadona.com` automatically.
- MX **Priority** is a separate field from the Value (just the hostname, no leading number).
- TXT values: paste **without** the surrounding quotes — GoDaddy wraps them.

### Verify DKIM (wait 5–15 min after saving DNS records)

```powershell
aws sesv2 get-email-identity --email-identity $Domain --region $Region `
  --query "{ Verified: VerifiedForSendingStatus, DkimStatus: DkimAttributes.Status }" --output table
```

Wait until `DkimStatus: SUCCESS` and `Verified: True`.

### SES identity policy — let Cognito send via this identity

```powershell
aws sesv2 create-email-identity-policy `
  --email-identity $Domain `
  --policy-name CognitoSend `
  --policy '{"Version":"2008-10-17","Statement":[{"Sid":"AllowCognitoSend","Effect":"Allow","Principal":{"Service":"cognito-idp.amazonaws.com"},"Action":["ses:SendEmail","ses:SendRawEmail"],"Resource":"arn:aws:ses:us-east-1:483176634665:identity/akwadona.com","Condition":{"StringEquals":{"aws:SourceAccount":"483176634665"}}}]}' `
  --region $Region
```

If you see `AlreadyExistsException` the policy is in place — that's fine.

### Switch Cognito to SES

```powershell
$poolId      = 'us-east-1_RACghntmS'
$emailConfig = '{"EmailSendingAccount":"DEVELOPER","From":"Akwadona <noreply@akwadona.com>","SourceArn":"arn:aws:ses:us-east-1:483176634665:identity/akwadona.com","ReplyToEmailAddress":"noreply@akwadona.com"}'

aws cognito-idp update-user-pool --user-pool-id $poolId --email-configuration $emailConfig
aws cognito-idp describe-user-pool --user-pool-id $poolId --query "UserPool.EmailConfiguration" --output table
```

You should see `EmailSendingAccount: DEVELOPER` and `From: Akwadona <noreply@akwadona.com>`.

## Sandbox vs production

Right after setup, SES is in **sandbox mode**:
- Cap: 200 emails / 24h, 1 / sec
- Can only deliver to verified recipient addresses
- Suitable for smoke testing only

Request production access (1–24h approval, free):

```powershell
aws sesv2 put-account-details `
  --production-access-enabled `
  --mail-type TRANSACTIONAL `
  --website-url "https://www.akwadona.com" `
  --use-case-description "Akwadona is a multi-tenant hospital management SaaS on AWS. We send transactional emails only: Cognito password-reset codes, first-login welcomes, and tenant-admin invitation emails. No marketing. Volume: under 1000/month initially. Recipients are hospital staff (signed BAA per tenant). Bounce/complaint handling will be auto-suppression via SES default." `
  --contact-language EN `
  --additional-contact-email-addresses "sami.t.taha98@gmail.com" `
  --region us-east-1
```

Check status:

```powershell
aws sesv2 get-account --region us-east-1 --query "{ Production: ProductionAccessEnabled }" --output table
```

For sandbox-only smoke testing, verify each recipient one at a time:

```powershell
aws sesv2 create-email-identity --email-identity recipient@example.com --region us-east-1
# AWS emails a verification link to that address; click it.
aws sesv2 get-email-identity --email-identity recipient@example.com --region us-east-1 --query "VerifiedForSendingStatus" --output text
```

## Smoke test — does forgot-password work?

1. Have a Cognito user whose email is a verified SES recipient (sandbox) or any address (production).
2. Make sure the user's `Status` is `CONFIRMED` (not `FORCE_CHANGE_PASSWORD`) — Cognito refuses to send reset emails to never-signed-in users.
3. In the app, click **Forgot password?** and enter the username.
4. Within ~10 sec the email should arrive in the inbox from `noreply@akwadona.com`.

If nothing arrives, run:

```powershell
aws sesv2 get-account --region us-east-1 --query "SendQuota" --output table
```

If `SentLast24Hours` went up by 1, SES delivered — check Gmail spam, "All Mail", filters.
If it stayed flat, Cognito didn't hand it off — check the troubleshooting section.

## Troubleshooting

- **`DkimStatus: PENDING` for >1 hour** — DNS not propagated. Verify each CNAME resolves: `nslookup -type=CNAME <token>._domainkey.akwadona.com`. Should return `<token>.dkim.amazonses.com`.
- **`MessageRejected: Email address is not verified`** — still in sandbox + recipient not verified. Either verify the recipient or wait for production access.
- **`cognito-idp.amazonaws.com is not authorized to perform: ses:SendEmail`** — SES identity policy missing. Re-run `create-email-identity-policy` from above.
- **Cognito accepts the API call but no email arrives + `SentLast24Hours` stays flat** — the Cognito user is in `FORCE_CHANGE_PASSWORD`. Cognito silently drops the request to prevent enumeration. Fix: `aws cognito-idp admin-set-user-password --permanent ...` to flip them to `CONFIRMED`.
- **Email arrives but lands in spam** — DKIM verification failed silently. Re-check `DkimStatus`. Add a DMARC record for extra trust: TXT `_dmarc` value `"v=DMARC1; p=none; rua=mailto:dmarc@akwadona.com"`.

## Industry comparison

| Vendor                | Sender domain        | DKIM | DMARC |
|-----------------------|---------------------|------|-------|
| **Akwadona**          | noreply@akwadona.com | ✓    | optional |
| Stripe                | noreply@stripe.com   | ✓    | ✓     |
| Vercel                | no-reply@vercel.com  | ✓    | ✓     |
| Twilio                | no-reply@twilio.com  | ✓    | ✓     |
| GitHub                | noreply@github.com   | ✓    | ✓     |
| Cognito default       | no-reply@verificationemail.com | ✗ | ✗ |

## File map

```
docs/16-ses-setup.md                  ← this doc
```

No code changes — everything is AWS-side configuration applied via CLI.

## Verified end-to-end (production)

- **2026-06-25** — Verified DKIM in ~15 min via GoDaddy DNS. Switched Cognito user pool `us-east-1_RACghntmS` to SES with `noreply@akwadona.com`. Smoke-tested forgot-password from `https://www.akwadona.com/login` with the verified recipient `sami.t.taha98@gmail.com` — email arrived in Gmail **inbox** (not spam), DKIM-signed, code worked to reset password.
- Sandbox status: 200/day cap, awaiting production-access approval (submitted same day).

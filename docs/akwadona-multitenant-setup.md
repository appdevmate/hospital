# Akwadona Multi-Tenant Subdomain Setup — akwadona.com

Goal: One Akwadona platform serves multiple hospital customers, each on their own subdomain, each seeing only their own data.

- **Customer 1:** `tiryaq.akwadona.com`
- **Customer 2:** `alshifaa.akwadona.com`

Infrastructure references:
- CloudFront distribution: `E1Z1ZKYM74LVA7` → `d6i7iwknkj0bg.cloudfront.net`
- AWS account: `483176634665`
- Cognito user pool: `tiryaq-user-pool` (region `us-east-1`)
- App client: `Tiryaq` (`2nfjfipi8hri262pjohtpgl45q`)
- Domain registrar: GoDaddy

---

## Step 1 — DNS (GoDaddy)

Added two CNAME records pointing each subdomain to the CloudFront distribution.

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | `tiryaq` | `d6i7iwknkj0bg.cloudfront.net` | 1 Hour |
| CNAME | `alshifaa` | `d6i7iwknkj0bg.cloudfront.net` | 1 Hour |

Notes:
- Name = subdomain label only (GoDaddy appends `.akwadona.com`).
- Value = CloudFront domain, no `https://`, no trailing dot.
- Existing `@` / `www` records were left untouched.

---

## Step 2 — ACM Certificate (us-east-1)

Requested a public wildcard certificate. **Must** be in `us-east-1` for CloudFront to use it.

- Region: **N. Virginia (us-east-1)**
- Domains on cert:
  - `*.akwadona.com`
  - `akwadona.com`
- Validation method: **DNS**
- Key algorithm: RSA 2048

The wildcard `*.akwadona.com` covers `tiryaq`, `alshifaa`, and any future customer subdomain.

---

## Step 3 — Validate Certificate (GoDaddy CNAME)

Both cert domains shared the **same** validation CNAME, so only one record was added in GoDaddy.

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | `_5b57b07e8727b637d30966dadf337675` | `_c0d2cff685c910d00bdbab13d9d797bb.jkddzztszm.acm-validations.aws` | 1 Hour |

Notes:
- Stripped `.akwadona.com` from the Name (GoDaddy appends it).
- Dropped trailing dots from Name and Value.
- Waited until ACM status changed to **Issued / Success** for both domains.

---

## Step 4 — CloudFront Distribution

Edited the Tiryaq distribution (`E1Z1ZKYM74LVA7`).

- **Alternate domain names (CNAMEs)** added:
  - `tiryaq.akwadona.com`
  - `alshifaa.akwadona.com`
  - (existing: `akwadona.com`, `www.akwadona.com`)
- **Custom SSL certificate:** selected the `*.akwadona.com` ACM cert.
- Saved and waited for redeploy (status back to **Enabled / Deployed**).

---

## Step 5 — Verify in Browser

Opened both subdomains:
- `https://tiryaq.akwadona.com`
- `https://alshifaa.akwadona.com`

Result: App loaded and redirected to the Cognito hosted/managed login — confirming DNS, cert, and CloudFront all work. A `redirect_mismatch` error appeared because the new subdomains were not yet registered as Cognito callback URLs (expected at this stage).

---

## Step 6 — Cognito Callback & Sign-out URLs

Path: Cognito → `tiryaq-user-pool` → App clients → `Tiryaq` → Managed login pages configuration → Edit.

Added the new subdomains to **both** the **Allowed callback URLs** and **Allowed sign-out URLs**, including trailing-slash variants (Cognito requires an exact match to whatever the app sends):

- `https://tiryaq.akwadona.com`
- `https://tiryaq.akwadona.com/`
- `https://alshifaa.akwadona.com`
- `https://alshifaa.akwadona.com/`

Saved changes.

Note: keep callback URL formatting consistent. The redirect_uri sent by the Angular app must match an entry **exactly**, including the trailing slash.

---

## Status

- [x] DNS records created
- [x] Wildcard ACM cert issued
- [x] Cert validated
- [x] CloudFront alternate domains + cert attached
- [x] Subdomains resolve and reach Cognito login
- [x] Cognito callback/sign-out URLs updated

## Next Steps (not yet done)

1. **Confirm login works** end-to-end on both subdomains after the Cognito save.
2. **SPA routing:** verify CloudFront custom error pages (403/404 → `/index.html`, response code 200) so deep links work.
3. **Tenant identity in Cognito:** add `custom:tenantId` attribute; assign each user a tenant.
4. **Tenant detection in Angular:** read subdomain from `window.location.hostname` for branding; rely on JWT `custom:tenantId` for enforcement.
5. **Data isolation in DynamoDB:** prefix partition keys with `TENANT#<tenantId>`.
6. **Enforcement in Lambda:** read `custom:tenantId` from the verified JWT claims (never from the request body) and scope every query.

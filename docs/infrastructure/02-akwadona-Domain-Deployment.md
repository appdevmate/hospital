# Tiryaq — Custom Domain Deployment on `akwadona.com`

**Document version:** 1.0
**Date:** 2026-05-03
**Owner:** Sami Taha
**Scope:** Documents the exact deployment we performed to serve Tiryaq from `https://www.akwadona.com` (and forward `https://akwadona.com` to it). Other deployment paths are intentionally excluded.

---

## 1. Architecture summary

```
   Visitor browser
         │
         ▼
   GoDaddy DNS
   ├── A     akwadona.com  →  GoDaddy forwarding service (parking IPs)
   │         (forwarder 301-redirects to https://www.akwadona.com)
   │
   └── CNAME www.akwadona.com  →  d6i7iwknkj0bg.cloudfront.net
                                  │
                                  ▼
                         CloudFront distribution E1Z1ZKYM74LVA7
                         (alternate domains: akwadona.com, www.akwadona.com)
                         (custom SSL cert from ACM)
                                  │
                                  ▼
                         S3 bucket (frontend) — Angular SPA
                                  │
                                  ▼
                         Browser fetches API from
                         jxz59jh15f.execute-api.us-east-1.amazonaws.com
                         (CORS allow-list includes akwadona.com)
                                  │
                                  ▼
                         Cognito user pool us-east-1_RACghntmS
                         (callback / logout URLs include akwadona.com)
```

- Domain registrar: **GoDaddy** (`akwadona.com`).
- Frontend hosting: **Amazon CloudFront + S3** (existing CDK-managed distribution and bucket).
- TLS certificate: **AWS Certificate Manager** in `us-east-1` for `akwadona.com` + `*.akwadona.com`.
- API: **API Gateway HTTP API** (existing CDK).
- Auth: **Amazon Cognito** (existing CDK).

---

## 2. What was already in place before this deployment

These were created earlier by CDK or AWS Console and required **no** new work:

| Resource | Identifier |
|---|---|
| CloudFront distribution | `E1Z1ZKYM74LVA7` |
| CloudFront origin domain | `d6i7iwknkj0bg.cloudfront.net` |
| S3 bucket (frontend) | `tiryaqcdkstack-tiryaqfrontendbucket18b23106-jsz6deto6hub` |
| API Gateway | `https://jxz59jh15f.execute-api.us-east-1.amazonaws.com` |
| Cognito user pool | `us-east-1_RACghntmS` |
| Cognito app client | `2nfjfipi8hri262pjohtpgl45q` |
| Account ID | `483176634665` |
| Region | `us-east-1` |

---

## 3. Step-by-step — what we actually did

### 3.1 ACM — request the public certificate

1. Opened ACM console in **us-east-1** (CloudFront only accepts certificates from this region).
2. Requested a **public certificate** for two names:
   - `akwadona.com`
   - `*.akwadona.com`
3. Chose **DNS validation**.
4. ACM produced two CNAME validation records, both with the same target (`_c0d2cff685c910d00bdbab13d9d797bb.jkddzztszm.acm-validations.aws.`).
5. Added the validation CNAME(s) in GoDaddy DNS.
6. Waited for ACM status to become **Issued** (~5 minutes).
7. Final certificate ARN:
   `arn:aws:acm:us-east-1:483176634665:certificate/c03903c3-12c3-46dd-9d63-4e40a72bb2be`

### 3.2 CloudFront — attach the certificate and add alternate domains

In the CloudFront distribution `E1Z1ZKYM74LVA7`:

- **Alternate domain names (CNAMEs):** `akwadona.com`, `www.akwadona.com`.
- **Custom SSL certificate:** the ACM cert from step 3.1.
- **Security policy:** `TLSv1.2_2021`.
- All other behaviours unchanged (default behaviour serves `index.html`, OAC binds to the S3 frontend bucket).

### 3.3 Cognito — extend the app client URLs

In the `tiryaq-user-pool` user pool, app client `Tiryaq`:

**Allowed callback URLs:**
- `http://localhost:4200/`
- `https://d6i7iwknkj0bg.cloudfront.net/`
- `https://akwadona.com`
- `https://akwadona.com/`
- `https://www.akwadona.com`
- `https://www.akwadona.com/`

**Allowed sign-out URLs:** same list.

### 3.4 GoDaddy DNS — final state

| Type | Name | Value | TTL | Purpose |
|---|---|---|---|---|
| A | `@` | `15.197.225.128` | 1 hr | GoDaddy forwarding service (apex) |
| A | `@` | `3.33.251.168`   | 1 hr | GoDaddy forwarding service (apex) |
| CNAME | `www` | `d6i7iwknkj0bg.cloudfront.net` | 1 hr | **Apex/www points to CloudFront** |
| CNAME | `_5b57b07e8727b637d30966dadf337675` | `_c0d2cff685c910d00bdbab13d9d797bb.jkddzztszm.acm-validations.aws.` | 1 hr | ACM certificate validation (must remain) |
| NS | `@` | `ns43.domaincontrol.com` / `ns44.domaincontrol.com` | 1 hr | GoDaddy nameservers |
| SOA | `@` | `ns43.domaincontrol.com` | 1 hr | (default) |
| (others) | various | Microsoft 365 / Outlook records | — | Pre-existing email DNS, untouched |

### 3.5 GoDaddy domain forwarding — apex to www

Because DNS doesn't allow a CNAME on the apex (`akwadona.com`), we use GoDaddy's HTTP-level forwarding:

- **From:** `akwadona.com`
- **To:** `https://www.akwadona.com`  (HTTPS — important: we changed it from HTTP to HTTPS to avoid SSL warnings)
- **Type:** Permanent (301)

Result: hitting `https://akwadona.com` issues a 301 to `https://www.akwadona.com` which is served by CloudFront.

### 3.6 CDK — extend API CORS allow-list

The API Gateway HTTP API has an explicit CORS allow-list (no wildcards). We added the two new origins.

`tiryaq-cdk/lib/tiryaq-cdk-stack.ts`:

```ts
const allowedOrigins = [
    'http://localhost:4200',
    'https://d6i7iwknkj0bg.cloudfront.net',
    'https://akwadona.com',
    'https://www.akwadona.com'
];
```

Then deployed:

```powershell
cd "C:\Users\samit\Desktop\aws apps\hospital\tiryaq-cdk"
$env:CDK_DEPLOY_ACCOUNT = "483176634665"
$env:CDK_DEPLOY_REGION  = "us-east-1"
npx cdk deploy TiryaqCdkStack --require-approval never
```

Without this redeploy, the browser would refuse API responses with a CORS error from the new domain even though the page loads.

### 3.7 Angular — no code changes needed

The verona-ng template is fully standalone, no `environment.ts` files. Configuration lives in:

- `src/app/services/config.ts` — API URL (unchanged).
- `src/app.config.ts` — Cognito authority + clientId; redirect URLs use `window.location.origin` so they auto-adapt to whichever domain the user hits.
- `src/app/layout/components/app.topbar.ts` — Cognito clientId for logout (unchanged).

Result: the same compiled bundle works from `localhost:4200`, `d6i7iwknkj0bg.cloudfront.net`, and `www.akwadona.com` — no rebuild required when adding a new domain (only a CDK deploy + DNS).

### 3.8 Frontend deploy — build, sync, invalidate

```powershell
cd "C:\Users\samit\Desktop\aws apps\hospital"

ng build --configuration=production

aws s3 sync dist/verona-ng/browser s3://tiryaqcdkstack-tiryaqfrontendbucket18b23106-jsz6deto6hub --delete --region us-east-1

aws cloudfront create-invalidation --distribution-id E1Z1ZKYM74LVA7 --paths "/*"
```

Notes:

- The Angular project is named `verona-ng` (per `angular.json`), so the build output is `dist/verona-ng/browser`. Earlier runs used `dist/tiryaq/browser` which was wrong and produced an empty deploy.
- The S3 bucket is the CDK-managed frontend bucket — same one CloudFront serves from. There is **no separate `tiryaq-bucket`** in this deployment.

### 3.9 Verification

After DNS propagation (~5–15 minutes):

```powershell
# DNS resolves to CloudFront
nslookup www.akwadona.com
# Expected: alias to d6i7iwknkj0bg.cloudfront.net

# HTTPS works on www
curl -I https://www.akwadona.com
# Expected: HTTP/2 200, server CloudFront

# Apex 301-redirects to www
curl -I https://akwadona.com
# Expected: HTTP/1.1 301 Moved Permanently, Location: https://www.akwadona.com/
```

In the browser:

1. Open `https://www.akwadona.com` — Tiryaq SPA loads.
2. Click sign in — Cognito hosted login renders with managed-login branding.
3. After sign-in, the app calls the API. No CORS errors (network tab → 200 responses).

---

## 4. Why each step exists (one-liner per step)

| Step | Why it's needed |
|---|---|
| 3.1 ACM cert | CloudFront can only present a certificate it owns; ACM in us-east-1 is the only source it accepts. |
| 3.2 CloudFront alt-domains + cert | Tells CloudFront "you also answer to akwadona.com" and which cert to serve there. |
| 3.3 Cognito callback URLs | OIDC will reject the redirect from a domain that's not whitelisted. |
| 3.4 GoDaddy DNS CNAME `www` | Maps the customer-facing hostname to the CloudFront distribution. |
| 3.5 GoDaddy forwarding apex → www | DNS apex can't be a CNAME; HTTP forwarding closes the gap with a 301 redirect. |
| 3.6 CDK CORS update | Browsers refuse cross-origin API responses unless the API explicitly allows the calling origin. |
| 3.7 Angular code | No edits needed — runtime origin handles multi-domain automatically. |
| 3.8 Build + sync + invalidate | Build new bundle, push to S3, then bust CloudFront cache so users see the new files immediately. |

---

## 5. Operational notes

- The ACM validation CNAME (`_5b57b07e...`) must remain in GoDaddy DNS. ACM uses it for automatic renewal; deleting it will break the certificate at the next renewal cycle.
- GoDaddy's "Forwarding over HTTPS" automatically provisions a Let's Encrypt cert for the apex redirect — that's why the apex 301 works on HTTPS.
- The CloudFront distribution is shared between the original `d6i7iwknkj0bg.cloudfront.net` URL and `akwadona.com`. A single S3 sync + invalidation updates all of them.
- DNS TTL is 1 hour. Allow 5–15 minutes for changes to propagate; up to 1 hour in pathological caches.

---

## 6. Document control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-05-03 | Sami Taha | Initial issuance — documents the working `akwadona.com` deployment exactly as performed |

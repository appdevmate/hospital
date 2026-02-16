# Deploy Angular on AWS S3 + CloudFront: Complete Beginner Guide

This guide walks you through deploying an Angular application to the internet using AWS S3 and CloudFront — from creating your AWS account to visiting your live site. Every concept is explained in plain language. No custom domain or SSL certificate purchase is needed.

By the end, your Angular app will be live at a URL like `https://d342qui64t7xt0.cloudfront.net`, served from **300+ locations worldwide** with free HTTPS.

---

## Understanding What We're Building

Before touching any AWS service, here's what each piece does:

```
┌──────────────────────────────────────────────────┐
│                 USER (Browser)                    │
│       visits https://xyz.cloudfront.net           │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│             CLOUDFRONT (CDN)                      │
│  • Serves files from nearest server worldwide    │
│  • Provides free HTTPS (padlock in browser)      │
│  • Caches files for speed                        │
│  • Handles Angular routing (404 → index.html)    │
└──────────────────┬───────────────────────────────┘
                   │ uses OAC key
                   ▼
┌──────────────────────────────────────────────────┐
│             S3 BUCKET (Storage)                   │
│  • Stores your HTML, JS, CSS, images             │
│  • Completely private / locked                   │
│  • Only CloudFront can read from it              │
│  • Bucket Policy = rules for who can access      │
└──────────────────────────────────────────────────┘
```

**Amazon S3** is like an infinite hard drive in the cloud. You create a **bucket** (a named container) and put your website files inside it. Your bucket stays completely private.

**Amazon CloudFront** is a Content Delivery Network (CDN). It keeps copies of your files at **edge locations** — over 300 small data centers around the world. When someone visits your site, they get files from the nearest edge location instead of fetching from the S3 bucket directly. This makes your site load much faster.

**Origin Access Control (OAC)** is the security mechanism connecting them. It's like giving CloudFront a special key to your locked S3 warehouse. Nobody else has this key.

**Bucket Policy** is a JSON document attached to your S3 bucket that says "only this specific CloudFront distribution is allowed to read my files."

---

## Step 1: Create an AWS Account

If you already have an AWS account, skip to Step 2.

1. Go to **https://aws.amazon.com** and click **Create an AWS Account**.
2. Enter your email address, choose a password, and pick an account name.
3. Enter a credit card (AWS has a generous free tier — you won't be charged for this project).
4. Verify your phone number.
5. Choose the **Basic Support — Free** plan.
6. Sign in to the AWS Console at **https://console.aws.amazon.com**.

After account creation, you're signed in as the **root user**. The root user has unlimited power over your entire account — like a master key that opens every door. For security, you should create a separate IAM user for day-to-day work, which is Step 2.

---

## Step 2: Create an IAM User Called "devOps"

**What is IAM?** IAM stands for Identity and Access Management. Think of your AWS account as a building. The root user holds the master key that opens every door. IAM lets you create individual keycards (users) that only open specific doors (permissions). You'll create a user called "devOps" that has permission to manage S3 and CloudFront.

### Create the user

1. In the AWS Console, type **IAM** in the top search bar and click **IAM**.
2. In the left sidebar under "Access management", click **Users**.
3. Click **Create user** (top-right corner).
4. **User name:** type `devOps`.
5. Click **Next**.
6. Select **Attach policies directly**.
7. In the search box, type `AdministratorAccess` and check the box next to it.
   - This gives full access to all AWS services — fine for learning. You can tighten permissions later.
8. Click **Next** → review → **Create user**.

### Create access keys (so the CLI can authenticate)

Access keys are like a username/password pair that the AWS CLI uses to talk to AWS on your behalf.

9. Click on **devOps** in the Users list to open the user detail page.
10. Click the **Security credentials** tab.
11. Scroll down to **Access keys** and click **Create access key**.
12. Select **Command Line Interface (CLI)**.
13. Check the acknowledgment box ("I understand the above recommendation...") and click **Next**.
14. Optionally add a description tag like `devOps CLI access`. Click **Create access key**.
15. **IMPORTANT: Copy both the Access Key ID and Secret Access Key immediately** — the secret key is only shown once. You can also click **Download .csv file** as a backup.
16. Click **Done**.

---

## Step 3: Install the AWS CLI on Windows

The AWS CLI lets you control AWS services by typing commands in PowerShell instead of clicking through the web console. Think of it as a remote control for AWS.

1. Download the installer: **https://awscli.amazonaws.com/AWSCLIV2.msi**
2. Double-click the downloaded file and click through the setup wizard: **Next → Accept license → Next → Install → Finish**.
3. Open a **new** PowerShell window (it must be new so it picks up the updated system PATH).
4. Verify the installation:

```powershell
aws --version
```

You should see output like `aws-cli/2.x.x Python/3.x.x Windows/10`. If you get "aws is not recognized", close ALL PowerShell windows and open a completely fresh one.

---

## Step 4: Configure the AWS CLI

Tell the CLI who you are by providing the access keys from Step 2.

```powershell
aws configure
```

Enter the four values when prompted:

| Prompt | What to enter | What it means |
|--------|--------------|---------------|
| AWS Access Key ID | Your key from Step 2 (starts with `AKIA...`) | The "username" for API access |
| AWS Secret Access Key | Your secret from Step 2 | The "password" for API access — keep it secret, never share it |
| Default region name | `us-east-1` | The AWS data center region. US East (N. Virginia) is the standard default |
| Default output format | `json` | How CLI responses are formatted |

Verify it works:

```powershell
aws sts get-caller-identity
```

You should see output with your account ID, user ARN (like `arn:aws:iam::075134876036:user/devOps`), and user ID. If this works, your CLI is properly connected to AWS.

Your credentials are stored locally at `C:\Users\YourUsername\.aws\credentials`. Never share this file.

---

## Step 5: Create the S3 Bucket

### Via the AWS Console

1. Type **S3** in the top search bar and click **S3**.
2. Click **Create bucket**.
3. **Bucket name:** `tiryaq-bucket` (must be globally unique across ALL AWS accounts, lowercase only).
4. **AWS Region:** Select **US East (N. Virginia) us-east-1**.
5. **Block Public Access:** Leave **all four checkboxes checked** (Block all public access = ON). This is the default.
6. Leave everything else as default.
7. Click **Create bucket**.

### Via the CLI (alternative)

```powershell
aws s3api create-bucket --bucket tiryaq-bucket --region us-east-1
```

Verify it was created:

```powershell
aws s3 ls
```

You should see `tiryaq-bucket` in the list.

**Why is the bucket completely private?** Because it's a locked warehouse. Nobody on the internet should access S3 directly. Only CloudFront (with its special OAC key) is allowed in. This is the most secure approach — it prevents anyone from bypassing CloudFront to access your files.

---

## Step 6: Create the CloudFront Distribution (New 5-Step Wizard)

AWS completely redesigned the CloudFront console in mid-2025. Creating a distribution is now a guided **5-step wizard** that automatically creates OAC, updates your S3 bucket policy, and configures recommended settings — all without touching JSON files.

Open **https://console.aws.amazon.com/cloudfront/v4/home** and click **Create distribution**.

---

### Wizard Step 1 of 5: Choose a Plan

AWS now offers **flat-rate pricing plans** for CloudFront. You'll see several plan cards with different prices:

| Plan | Price | What's included |
|------|-------|-----------------|
| **Free** | **$0/month** | CloudFront CDN, basic DDoS protection, TLS certificate, S3 storage credits |
| Higher tiers | $10+/month | More data transfer, AWS WAF, bot management, Route 53, CloudWatch logs, etc. |

**Select the Free $0/month plan.** This is more than enough for your Angular app. You can upgrade anytime later.

Click **Next**.

---

### Wizard Step 2 of 5: Get Started

This page asks you to name your distribution and choose its type.

| Field | What to enter | Explanation |
|-------|--------------|-------------|
| **Distribution name** | `tiryaq-hospital` | A human-readable label for your distribution. Stored as a tag. You can change it anytime. |
| **Description** *(optional)* | `Hospital management Angular app` | A short note for yourself. Optional but helpful. |
| **Distribution type** | **Single website or app** ✅ | Select this. It means one website with its own configuration. The "Multi-tenant architecture" option is for SaaS providers serving many customer domains — you don't need that. |
| **Route 53 managed domain** *(optional)* | **Leave blank** | You don't have a custom domain. Skip this entirely. If you buy a domain later, you can add it without recreating the distribution. |
| **Tags** *(optional)* | Skip | Tags are key-value labels for organizing resources (like `Project: Hospital`). Not needed now. |

Click **Next**.

---

### Wizard Step 3 of 5: Specify Origin

This is the most important page — you tell CloudFront where your website files live.

**Origin type** — You'll see a list of options. Select:

> **Amazon S3** ✅
>
> *"Deliver static assets like files and images, statically generated websites or single page applications (SPA)."*

This is exactly right — your Angular app is a SPA with static files (HTML, JS, CSS, images).

**Origin:**

| Field | What to do | Explanation |
|-------|-----------|-------------|
| **S3 origin** | Click **Browse S3** → select **tiryaq-bucket** | This tells CloudFront which bucket has your files. Make sure you pick the correct bucket — the wrong bucket is a common cause of "NotFound" errors. |
| **Origin path** *(optional)* | **Leave blank** | Only needed if your files are in a subdirectory. You'll upload files to the bucket root. |

**Settings:**

**☑ Allow private S3 bucket access to CloudFront** *(Recommended — checked by default)*

> **Leave this checked!** This is the most important setting on this page. When checked, it automatically:
> 1. **Creates an OAC (Origin Access Control)** — the special key that lets CloudFront read from your private bucket
> 2. **Updates your S3 bucket policy** — adds a JSON rule saying "only this CloudFront distribution can read my files"
>
> In the old CloudFront console, you had to create OAC manually AND write/apply the bucket policy by hand. The new wizard does both automatically with this one checkbox.

**Origin settings:**

> **Use recommended origin settings** ✅ — Configures how CloudFront connects to S3 (HTTPS, timeouts, retries) using AWS best practices. No reason to customize.

**Cache settings:**

> **Use recommended cache settings tailored to serving S3 content** ✅ — Applies the AWS-managed **CachingOptimized** policy. This enables gzip and Brotli compression (making JS/CSS files ~70% smaller during transfer) and respects the Cache-Control headers you set during upload.

Click **Next**.

---

### Wizard Step 4 of 5: Enable Security

This page asks about **AWS WAF (Web Application Firewall)** — a service that inspects incoming requests and blocks malicious traffic like SQL injection, XSS attacks, and bots.

| Option | Select? | Why |
|--------|---------|-----|
| **Do not enable security protections** / Skip | ✅ **Select this** | WAF adds extra cost. For a learning project or internal tool, you don't need it. Your app is already protected by HTTPS (encrypted connection), OAC (private bucket), and AWS Shield Standard (free DDoS protection). |
| Enable security protections | ❌ Skip for now | You can always enable WAF later from the distribution settings. |

Click **Next**.

---

### Wizard Step 5 of 5: Review and Create

This page shows a summary of everything you configured. Review it:

| Setting | Expected value |
|---------|---------------|
| Plan | Free ($0/month) |
| Distribution name | tiryaq-hospital |
| Type | Single website or app |
| Domain | None (default CloudFront URL) |
| Origin | tiryaq-bucket (Amazon S3) |
| S3 bucket access | Private (OAC — auto-created) |
| Origin settings | Recommended |
| Cache settings | Recommended (CachingOptimized) |
| Security (WAF) | Not enabled |
| TLS | Default CloudFront certificate |

If everything looks correct, click **Create distribution**.

---

### What happens automatically after creation

CloudFront does several things for you behind the scenes:

| What CloudFront auto-creates | How to verify |
|------------------------------|--------------|
| **OAC (Origin Access Control)** | Go to **CloudFront → Security → Origin access** in the left sidebar |
| **S3 bucket policy** | Go to **S3 → tiryaq-bucket → Permissions tab → Bucket policy** |
| **Default root object = index.html** | Configured automatically |
| **HTTP → HTTPS redirect** | All HTTP traffic is redirected to HTTPS automatically |
| **Gzip/Brotli compression** | JS and CSS files are compressed for faster delivery |

### Save these two values from the distribution details page:

| Value | Where to find it | Example | What you need it for |
|-------|------------------|---------|---------------------|
| **Distribution ID** | Distribution details page | `E3J3D3EMIOIACT` | Cache invalidation commands |
| **Distribution domain name** | Distribution details page | `d342qui64t7xt0.cloudfront.net` | Your website URL |

Wait **5–15 minutes** for the status to change from "Deploying" to a date/time. Your distribution is then live.

---

## Step 7: Add Custom Error Responses for Angular SPA Routing

**The CloudFront wizard does NOT configure this**, and **your Angular app will break without it.**

**The problem:** When a user is on `/patients/123` and hits refresh, the browser asks CloudFront for the file `/patients/123`. That file doesn't exist in S3 — it's an Angular route handled by JavaScript, not a real file. S3 returns a 403 error, and the user sees an ugly "Access Denied" XML page.

**The fix:** Tell CloudFront "whenever S3 returns a 403 or 404, serve `/index.html` instead with a 200 OK status." Angular's router then reads the URL, sees `/patients/123`, and renders the correct page.

### How to add them:

1. Open your distribution in the CloudFront console.
2. Click the **Error pages** tab (in the top navigation bar of the distribution detail page).
3. Click **Create custom error response**.

**First error response (for 403):**

| Field | Value | Why |
|-------|-------|-----|
| HTTP error code | `403: Forbidden` | This is what S3 returns when a file doesn't exist in a private bucket |
| Customize error response | **Yes** | Tells CloudFront to serve a different page instead of the error |
| Response page path | `/index.html` | Serve your Angular app's entry point |
| HTTP response code | `200: OK` | Return success so the browser processes it normally |
| Error caching minimum TTL | `0` | Don't cache error responses |

4. Click **Create custom error response**.

**Second error response (for 404):**

5. Click **Create custom error response** again.

| Field | Value | Why |
|-------|-------|-----|
| HTTP error code | `404: Not Found` | Covers cases where S3 explicitly says the file is missing |
| Customize error response | **Yes** | Same as above |
| Response page path | `/index.html` | Same — serve Angular's entry point |
| HTTP response code | `200: OK` | Same — return success |
| Error caching minimum TTL | `0` | Same — don't cache |

6. Click **Create custom error response**.

Now Angular routing works correctly on page refresh and direct URL access.

---

## Step 8: Build Your Angular App

Open PowerShell, navigate to your Angular project directory, and run:

```powershell
ng build
```

Angular 20 uses the production configuration by default. The build compiles your TypeScript into optimized, minified JavaScript bundles. The output goes to:

```
dist/verona-ng/browser/
```

Inside you'll find:

| File | What it is |
|------|-----------|
| `index.html` | The entry point. References all JS/CSS bundles. **Its name never changes.** |
| `main-[hash].js` | Your compiled app code. The `[hash]` changes when code changes. |
| `polyfills-[hash].js` | Browser compatibility code |
| `styles-[hash].css` | Your compiled and minified CSS |
| `chunk-[hash].js` | Lazy-loaded module chunks (one per lazy route) |
| `media/` | Images, fonts, SVGs |
| `demo/`, `layout/` | Additional static asset folders |

**What are the hashes?** The `[hash]` part (e.g., `main-TXE5BFDI.js`) is a content hash — a short string generated from the file's contents. When your code changes, Angular generates a new hash, creating a new filename. This forces browsers to download the fresh file instead of using a cached old version. This is called **cache busting**.

Verify the build output:

```powershell
dir dist\verona-ng\browser
```

You should see `index.html` and many `.js`, `.css` files.

---

## Step 9: Upload Files to S3

You upload in three parts because of different **caching strategies**.

**What is caching?** When someone visits your site, CloudFront (and the browser) save copies of your files. Next time, the saved copy is served instantly — much faster. But you need `index.html` to always be fresh because it contains links to the latest hashed files.

### Part A: Upload JS, CSS, images, fonts (cache for 1 year)

These files have hash characters in their names (like `main-TXE5BFDI.js`). When you change your code, Angular generates a NEW filename with a different hash. So it's perfectly safe to cache them for a very long time — the old cached file will never be requested again.

```powershell
aws s3 sync dist/verona-ng/browser/ s3://tiryaq-bucket --delete --cache-control "public,max-age=31536000,immutable" --exclude "index.html" --exclude "*.json"
```

| Flag | What it does |
|------|-------------|
| `s3 sync` | Uploads all files and folders recursively, only uploading new or changed files |
| `--delete` | Removes files from S3 that no longer exist locally (cleans up old hashed bundles) |
| `--cache-control "public,max-age=31536000,immutable"` | Cache for 1 year (31,536,000 seconds). `immutable` means this file will never change at this URL. |
| `--exclude "index.html"` | Skip index.html — it gets different cache settings |
| `--exclude "*.json"` | Skip JSON config files — they also need no-cache |

### Part B: Upload index.html (never cache)

`index.html` is special — it's the entry point that contains `<script>` and `<link>` tags pointing to the hashed JS/CSS files. If a user has a cached OLD `index.html`, it would point to old filenames that may no longer exist in S3.

```powershell
aws s3 cp dist/verona-ng/browser/index.html s3://tiryaq-bucket/index.html --cache-control "no-cache,no-store,must-revalidate" --content-type "text/html"
```

| Flag | What it does |
|------|-------------|
| `s3 cp` | Copies a single file (more reliable than sync for the critical index.html) |
| `--cache-control "no-cache,no-store,must-revalidate"` | Never cache — always fetch fresh from S3 |
| `--content-type "text/html"` | Explicitly sets the correct MIME type |

### Part C: Upload JSON files (never cache)

JSON config files (like Angular's `ngsw.json` or app configs) should also be fresh:

```powershell
aws s3 sync dist/verona-ng/browser/ s3://tiryaq-bucket --cache-control "no-cache,no-store,must-revalidate" --exclude "*" --include "*.json"
```

---

## Step 10: Invalidate the CloudFront Cache

Even after uploading new files to S3, CloudFront's 300+ edge locations may still serve old cached copies. **Invalidation** tells all edge locations: "Forget everything you cached and fetch fresh files from S3."

```powershell
aws cloudfront create-invalidation --distribution-id E3J3D3EMIOIACT --paths "/*"
```

| Detail | Value |
|--------|-------|
| `"/*"` | Invalidate all files. Counts as 1 path. |
| Free tier | First 1,000 invalidation paths per month are free |
| Time | Takes **1–2 minutes** to complete globally |

---

## Step 11: Visit Your Site! 🎉

Open your browser and go to:

```
https://d342qui64t7xt0.cloudfront.net
```

**Test these scenarios:**

1. ✅ The root URL loads your app's home page
2. ✅ Navigate to different routes within the app (click links to go to `/patients`, `/dashboard`, etc.)
3. ✅ **Refresh the page** on a sub-route — it should reload correctly (confirms custom error responses work)
4. ✅ The browser shows a **padlock icon** (confirms HTTPS is working)

---

## Redeployment: The Commands You'll Run Every Time

Every time you update your Angular code and want to deploy:

```powershell
# 1. Build
ng build

# 2. Upload hashed assets (JS, CSS, images) — cached 1 year
aws s3 sync dist/verona-ng/browser/ s3://tiryaq-bucket --delete --cache-control "public,max-age=31536000,immutable" --exclude "index.html" --exclude "*.json"

# 3. Upload index.html — never cached
aws s3 cp dist/verona-ng/browser/index.html s3://tiryaq-bucket/index.html --cache-control "no-cache,no-store,must-revalidate" --content-type "text/html"

# 4. Upload JSON files — never cached
aws s3 sync dist/verona-ng/browser/ s3://tiryaq-bucket --cache-control "no-cache,no-store,must-revalidate" --exclude "*" --include "*.json"

# 5. Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id E3J3D3EMIOIACT --paths "/*"
```

---

## Troubleshooting: Common Problems and How to Fix Them

### Problem 1: "NotFound" — XML error page saying "The resource you requested does not exist"

**Cause A: Default root object is not set.**
CloudFront doesn't know to serve `index.html` when someone visits the root URL.

Check:
```powershell
aws cloudfront get-distribution-config --id E3J3D3EMIOIACT --query "DistributionConfig.DefaultRootObject"
```

If it returns `""` (empty), fix it:
1. Go to CloudFront → your distribution → **General** tab → **Settings** → **Edit**
2. Set **Default root object** to `index.html`
3. Click **Save changes**

**Cause B: CloudFront origin points to wrong bucket or wrong region.**
This was the most common issue we encountered. The distribution might point to a bucket that doesn't exist or is in a different region.

Check:
```powershell
aws cloudfront get-distribution-config --id E3J3D3EMIOIACT --query "DistributionConfig.Origins.Items[0].DomainName"
```

It should show `tiryaq-bucket.s3.us-east-1.amazonaws.com`. If it shows a different bucket name or region, fix it:
1. Go to CloudFront → your distribution → **Origins** tab
2. Select the origin → click **Edit**
3. Change the origin domain to `tiryaq-bucket.s3.us-east-1.amazonaws.com` (or use Browse S3)
4. Click **Save changes**

---

### Problem 2: "Access Denied" — XML error page saying "AccessDenied"

**Cause: The S3 bucket policy is missing or has the wrong distribution ID.**

Check:
```powershell
aws s3api get-bucket-policy --bucket tiryaq-bucket
```

If it says "The bucket policy does not exist" or the distribution ID in the policy doesn't match yours, re-apply it.

Create a file called `bucket-policy.json`:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowCloudFrontServicePrincipalReadOnly",
            "Effect": "Allow",
            "Principal": {
                "Service": "cloudfront.amazonaws.com"
            },
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::tiryaq-bucket/*",
            "Condition": {
                "StringEquals": {
                    "AWS:SourceArn": "arn:aws:cloudfront::075134876036:distribution/E3J3D3EMIOIACT"
                }
            }
        }
    ]
}
```

Apply it:
```powershell
aws s3api put-bucket-policy --bucket tiryaq-bucket --policy file://bucket-policy.json
```

---

### Problem 3: 403 or 404 error when refreshing on an Angular route (e.g., /patients)

**Cause: Custom error responses are not configured in CloudFront.**

The root URL works but navigating to `/patients` and hitting refresh shows an error.

Fix:
1. Go to CloudFront → your distribution → **Error pages** tab
2. Add two custom error responses:
   - 403 → `/index.html` with 200 status, TTL = 0
   - 404 → `/index.html` with 200 status, TTL = 0
3. Full instructions in Step 7 of this guide.

---

### Problem 4: Users still see old content after deployment

**Cause A: Forgot to run cache invalidation.**
```powershell
aws cloudfront create-invalidation --distribution-id E3J3D3EMIOIACT --paths "/*"
```
Wait 1–2 minutes and refresh.

**Cause B: Browser has cached `index.html` locally.**
Try a hard refresh: `Ctrl+Shift+R` or open an **incognito window**.

**Cause C: `index.html` was uploaded with wrong cache headers.**
Check:
```powershell
aws s3api head-object --bucket tiryaq-bucket --key index.html --query "CacheControl"
```
It should show `no-cache,no-store,must-revalidate`. If it shows something else (like `max-age=31536000`), re-upload:
```powershell
aws s3 cp dist/verona-ng/browser/index.html s3://tiryaq-bucket/index.html --cache-control "no-cache,no-store,must-revalidate" --content-type "text/html"
```

---

### Problem 5: Distribution stuck on "Deploying"

New distributions take **5–15 minutes** to deploy globally. If it's been over 30 minutes, check the CloudFront console for any error banners. Also verify the origin domain is correct (see Problem 1, Cause B).

---

### Problem 6: "InvalidAccessKeyId" or "SignatureDoesNotMatch" in CLI

**Cause: AWS CLI credentials are wrong or expired.**

Re-run:
```powershell
aws configure
```
Enter the correct Access Key ID and Secret Access Key from your IAM user. Verify:
```powershell
aws sts get-caller-identity
```

---

### Problem 7: "AccessDenied" when running CLI commands (e.g., creating bucket)

**Cause: Your IAM user doesn't have the required permissions.**

Fix: Go to **IAM → Users → devOps → Permissions → Add permissions** and attach the `AdministratorAccess` policy. Or if you prefer granular permissions, attach these individual policies:
- `AmazonS3FullAccess`
- `CloudFrontFullAccess`

---

### Problem 8: Files are in S3 but site shows blank page or wrong content

**Cause: Files are inside a subfolder instead of at the bucket root.**

Check:
```powershell
aws s3 ls s3://tiryaq-bucket/
```

You should see `index.html` directly in the output — NOT inside a subfolder like `browser/` or `verona-ng/`. If files are nested, the `s3 sync` command path was wrong. The source path must point to the folder that **directly contains** `index.html`.

Correct: `dist/verona-ng/browser/` (this folder contains `index.html`)
Wrong: `dist/verona-ng/` (this contains the `browser/` folder, not `index.html` directly)
Wrong: `dist/` (too high up)

---

### Problem 9: PowerShell encoding errors when updating CloudFront config via CLI

**Cause: PowerShell's `>` redirect saves files in UTF-16 encoding, which AWS CLI can't parse.**

The error looks like: `Expected: '=', received: 'ÿ'` or `Expected: '=', received: 'ï'`

Fix: Use `Out-File -Encoding utf8` instead of `>`, or better yet — make changes through the AWS Console instead of CLI for distribution config updates.

---

### Problem 10: WAF charges appearing unexpectedly

**Cause: The CloudFront wizard may have created a WAF Web ACL even if you thought you skipped it, or it was enabled during a previous distribution creation.**

Check your distribution config:
```powershell
aws cloudfront get-distribution-config --id E3J3D3EMIOIACT --query "DistributionConfig.WebACLId"
```

If it returns an ARN (like `arn:aws:wafv2:...`), a WAF is attached. To remove it:
1. Go to CloudFront → your distribution → **General** tab → **Settings** → **Edit**
2. Under WAF, select **Do not enable security protections** / remove the Web ACL
3. Click **Save changes**
4. Then go to **AWS WAF console** and delete the Web ACL to stop charges.

---

## Cost Summary

| Component | Monthly cost |
|-----------|-------------|
| CloudFront (Free plan) | $0.00 |
| S3 storage (small Angular app ~10MB) | ~$0.01 |
| S3 requests | ~$0.01 |
| **Total** | **~$0.02/month** |

---

## Complete Step Summary

| Step | What | How |
|------|------|-----|
| 1 | Create AWS account | aws.amazon.com |
| 2 | Create IAM user "devOps" | AWS Console → IAM |
| 3 | Install AWS CLI | Download AWSCLIV2.msi |
| 4 | Configure CLI | `aws configure` |
| 5 | Create S3 bucket | Console or `aws s3api create-bucket` |
| 6 | Create CloudFront distribution | 5-step wizard (auto-creates OAC + bucket policy) |
| 7 | Add SPA error responses | CloudFront → Error pages tab (manual) |
| 8 | Build Angular app | `ng build` |
| 9 | Upload to S3 | `aws s3 sync` + `aws s3 cp` |
| 10 | Invalidate cache | `aws cloudfront create-invalidation` |
| 11 | Visit your site | `https://d342qui64t7xt0.cloudfront.net` |

# Akwadona — The Plain-English Guide

A beginner-friendly reference. Every AWS resource, every concept, every abbreviation is explained in four parts:

> **What it is** → **Why it exists (the objective)** → **Real-life example** → **How Akwadona uses it**

Read once and you'll be able to explain the whole system to a customer.

---

## 1. What is Akwadona?

**Akwadona is software hospitals rent from us instead of buying their own.**

- Traditional model: a hospital buys a giant server, installs software on it, hires IT staff to maintain it, pays for upgrades forever.
- Akwadona model: the hospital opens a browser, types `tiryaq.akwadona.com`, signs in. Done. We host everything. They pay monthly.
- This rent-instead-of-buy idea is called **SaaS — Software as a Service**. Same shape as Netflix (renting movies) or Spotify (renting music).

Each hospital we serve is called a **tenant** — like an apartment tenant: they share the building but have their own private apartment.

---

## 2. The Big Picture — What Happens When a Doctor Clicks "Add Patient"

1. **Doctor's browser** loads the Akwadona app from CloudFront (delivered from the closest city for speed).
2. **Cognito** has already signed them in. The browser holds their digital ID card called a **JWT**.
3. Doctor clicks "Add Patient". Browser POSTs the data to **API Gateway**.
4. API Gateway checks the JWT is valid, then forwards the request to a **Lambda function**.
5. The Lambda encrypts the patient name + ID with **Tiryaq's own KMS key** (Alshifaa cannot open it).
6. The Lambda saves the encrypted row into **DynamoDB**.
7. The Lambda writes an audit entry to **CloudWatch Logs**.
8. The Lambda returns "OK". The browser shows "Patient added".

**Total time:** ~100–300 ms. **Critically:** the patient's real name and ID never appear in plain-text anywhere our staff can read.

---

## 3. AWS Resources — Glossary (every term has Objective + Example + How Akwadona uses it)

### 3.1 Lambda

- **What it is:** A piece of code that runs only when a request arrives, then disappears. AWS spins up a fresh "container" for each invocation.
- **Why it exists (objective):** to remove the cost and operational burden of running servers 24/7. You pay per millisecond of execution instead of paying for an idle machine.
- **Real-life example:** A food truck that only opens when a customer arrives, serves them, and shuts down. No rent on an idle restaurant.
- **How Akwadona uses it:** ~30 Lambda functions, one per backend task: `tiryaq-getAllPatients`, `tiryaq-createDoctor`, `tiryaq-operator-console`, etc.

### 3.2 API Gateway

- **What it is:** The single public HTTPS endpoint in front of all our Lambdas. It routes incoming HTTP requests to the right Lambda.
- **Why it exists (objective):** to enforce shared concerns once (CORS, JWT validation, rate limiting, logging, TLS termination) instead of each Lambda re-implementing them.
- **Real-life example:** A hotel reception desk. Every visitor passes through reception, gets verified, then is sent to the right floor.
- **How Akwadona uses it:** one HTTP API (`jxz59jh15f.execute-api.us-east-1.amazonaws.com`) with a JWT authorizer attached to every protected route.

### 3.3 DynamoDB

- **What it is:** Amazon's NoSQL database. Stores rows ("items"). Every read/write completes in milliseconds at any data size.
- **Why it exists (objective):** to give SaaS-scale applications a database that doesn't slow down as it grows from 100 rows to 1 billion. Traditional SQL databases (MySQL, Postgres) need careful tuning at scale; DynamoDB doesn't.
- **Real-life example:** A giant smart filing cabinet. You hand it a label ("patient #123") and it returns the file instantly. Same speed at 100 files as at 100 million.
- **How Akwadona uses it:** one table called `Hospital`. Every row has a `PK` (partition key) starting with the tenant ID, so all Tiryaq data lives in `PATIENT#T_2572fc71#…` rows, Alshifaa in `PATIENT#T_a4b8aef9#…`. Same cabinet, different drawers.

### 3.4 S3 — Simple Storage Service

- **What it is:** Amazon's file storage. You upload files, you can download them later. Unlimited size, very cheap.
- **Why it exists (objective):** to store files (images, PDFs, lab reports) that are too big or wrong-shaped for a database. DynamoDB has a 400 KB row limit; S3 has no practical limit.
- **Real-life example:** A giant warehouse with unlimited shelves. You give a box, get a receipt, retrieve it later by receipt number.
- **How Akwadona uses it:** two buckets — one holds the Angular app's static files (HTML/CSS/JS), one (`tiryaq-documents-…`) holds uploaded patient documents and lab reports.

### 3.5 CloudFront — CDN (Content Delivery Network)

- **What it is:** Amazon's network of "edge servers" spread across hundreds of cities. Copies of our files live at every edge.
- **Why it exists (objective):** to make web pages load fast for users no matter where they are in the world. Without CloudFront, every doctor in Qatar would download our JS files from Virginia → slow.
- **Real-life example:** Instead of shipping pizza from Italy to every customer worldwide, Domino's opens a branch in every major city. The customer picks up locally.
- **How Akwadona uses it:** one CloudFront distribution (`E1Z1ZKYM74LVA7`) caches the Angular app. A doctor in Doha gets the app from the Bahrain or Mumbai edge in milliseconds.

### 3.6 Cognito

- **What it is:** Amazon's user-management and login service.
- **Why it exists (objective):** so we don't have to build our own login system (which is hard to do safely). Cognito handles password storage, password resets, multi-factor auth, social login, and OAuth2/OIDC.
- **Real-life example:** A passport office. Every user gets an account once. To enter the country, they show their passport (JWT) which the passport office issued.
- **How Akwadona uses it:** one User Pool (`us-east-1_RACghntmS`). All hospital users + Akwadona staff live in it. Groups (`Admin`, `Doctor`, `Pharmacist`, `Operator`) decide what role they have. Login page is at `auth.akwadona.com`.

### 3.7 KMS — Key Management Service

- **What it is:** Amazon's vault that holds encryption keys. The keys never leave the vault — KMS does the encryption/decryption on your behalf when you have permission.
- **Why it exists (objective):** to make it impossible to steal an encryption key. If the key never leaves the vault, an attacker who breaches our app server can't grab it.
- **Real-life example:** A bank vault that holds safe-deposit-box keys. You can't take the key out; you ask the bank to open the box for you. They check your ID first.
- **How Akwadona uses it:** **two KMS keys per hospital**.
  - **Data key** (e.g. Tiryaq's `11b1386b-…`) — encrypts patient records.
  - **HMAC key** (e.g. Tiryaq's `601f8aab-…`) — fingerprints searchable fields like email.
  - Tiryaq's keys cannot open Alshifaa's data and vice versa. **This is what proves we cannot read patient data.**

### 3.8 IAM — Identity and Access Management

- **What it is:** Amazon's permission system. Every action (read DB, decrypt key, send email) is allowed or denied based on IAM rules.
- **Why it exists (objective):** to follow the "principle of least privilege" — every actor (user, Lambda, etc.) should have exactly the permissions they need and no more. Limits the damage if any one piece is compromised.
- **Real-life example:** A hotel's rule book. The cleaning lady can enter empty rooms. The manager can enter any room. The guest can only enter their own room. Each role has a list of allowed actions.
- **How Akwadona uses it:** every Lambda has its own IAM "role" listing what it can do. The operator console Lambda is allowed to read tenant profile rows but not to decrypt PHI. The patient Lambda is allowed to decrypt for its own tenant only.

### 3.9 CloudWatch

- **What it is:** Amazon's monitoring service. Stores logs, metrics, and triggers alarms.
- **Why it exists (objective):** so we can investigate problems and prove what happened (auditors require this). Without CloudWatch, when something breaks, you have no record.
- **Real-life example:** A building's security camera + receipt-drawer combo. Every action is recorded. Every error is captured. Look back at any moment.
- **How Akwadona uses it:** every Lambda writes logs to a log group named `/aws/lambda/<function-name>`. We also publish custom metrics like `Akwadona/Throttle/Hits` per tenant.

### 3.10 CDK — Cloud Development Kit

- **What it is:** A way to describe AWS infrastructure as code (TypeScript). You write code, run `cdk deploy`, AWS builds the matching infrastructure.
- **Why it exists (objective):** to make infrastructure repeatable, reviewable, and recoverable. Without CDK, you build things by clicking around the AWS Console — and if your account is wiped, you can't rebuild from memory.
- **Real-life example:** Architectural blueprints. Workers build a building from the blueprint. If the building burns down, you rebuild from the same blueprint.
- **How Akwadona uses it:** the file `tiryaq-cdk/lib/tiryaq-cdk-stack.ts` describes our whole AWS setup. `npx cdk deploy` brings up the entire system from scratch in ~5 minutes.

### 3.11 ACM — AWS Certificate Manager

- **What it is:** Amazon's service for issuing SSL/TLS certificates (the cryptographic proof that `akwadona.com` is really us).
- **Why it exists (objective):** every web service needs HTTPS. Without a valid certificate, browsers show "Not Secure" warnings. ACM issues these for free and auto-renews them.
- **Real-life example:** A notarized business license. The notary (ACM) confirms "this person is who they claim to be". The browser checks the notary's seal.
- **How Akwadona uses it:** we have ACM certs for `akwadona.com`, `www.akwadona.com`, the tenant subdomains, and `auth.akwadona.com`. CloudFront and Cognito use them for HTTPS.

---

## 4. Concepts & Abbreviations — Glossary (every term has Objective + Example + How Akwadona uses it)

### 4.1 JWT — JSON Web Token

- **What it is:** A long string carrying claims about a user ("I am Dr. Ahmed at Tiryaq, role Doctor, expires at 5pm"). Cryptographically signed by Cognito.
- **Why it exists (objective):** to let the backend trust a request's identity claims without calling Cognito on every single API call. The signature proves the claims are real.
- **Real-life example:** A passport with a tamper-evident hologram. The border officer doesn't call your home country every time — the hologram alone is proof.
- **How Akwadona uses it:** Cognito issues a JWT after sign-in. The browser sends it on every API request in the `Authorization: Bearer …` header. API Gateway verifies the signature; the Lambda reads the claims.

### 4.2 PHI — Protected Health Information

- **What it is:** A legal term for any data that identifies a patient: name, DOB, ID number, address, phone, diagnosis, medications, etc.
- **Why it exists (objective):** to set a clear list of what's regulated by HIPAA. If something is on this list, it must be encrypted, audited, and access-controlled.
- **Real-life example:** A medical envelope marked "Confidential — Patient Records". Even the cleaning staff knows not to open it.
- **How Akwadona uses it:** every PHI field is encrypted in DynamoDB. Search-able PHI (email) is replaced with an HMAC fingerprint. The operator console **never** displays PHI.

### 4.3 PII — Personally Identifiable Information

- **What it is:** Broader than PHI. Any data that identifies a person — even non-medical (e.g. a doctor's home address).
- **Why it exists (objective):** GDPR and PDPPL apply to PII (not just PHI). So we treat staff data, billing data, etc. with care too.
- **Real-life example:** An office HR file with someone's home address — not medical, but still confidential.
- **How Akwadona uses it:** same encryption rules as PHI apply to staff PII (email, phone, address).

### 4.4 Encryption (at rest, in transit)

- **What it is:** Scrambling data so only someone with the key can unscramble it.
- **Why it exists (objective):** to keep data safe if it's stolen. If an attacker grabs our DynamoDB backups, all they see is gibberish.
- **Real-life example:** Locking documents in a safe. Even if someone steals the safe, they need the combination to read what's inside.
- **How Akwadona uses it:**
  - **At rest** (stored data): AES-256-GCM via per-tenant KMS keys.
  - **In transit** (data moving over the network): TLS 1.2+ enforced everywhere.

### 4.5 TLS / HTTPS

- **What it is:** TLS = Transport Layer Security. HTTPS = HTTP carried inside TLS. The "padlock" in the browser bar.
- **Why it exists (objective):** to encrypt every byte that travels between the browser and the server, so eavesdroppers on the network can't read it.
- **Real-life example:** Sending a letter in a sealed armored car instead of an open postcard.
- **How Akwadona uses it:** every URL is HTTPS. The certificate is issued by ACM. CloudFront and API Gateway enforce TLS 1.2 minimum.

### 4.6 Hashing

- **What it is:** A one-way mathematical crusher. Input "John" → output `5d40f3…`. You cannot reverse it.
- **Why it exists (objective):** to store sensitive data we only need to compare, not retrieve — like passwords. The server stores the hash; on login, it hashes the input and compares.
- **Real-life example:** A blender. Apple goes in, apple sauce comes out. You cannot un-blend.
- **How Akwadona uses it:** passwords are hashed by Cognito (we never see them). Some non-searchable identifiers are also hashed.

### 4.7 HMAC — Hash-based Message Authentication Code

- **What it is:** A hash with a secret key mixed in. Same input + same key always gives the same fingerprint; different keys give different fingerprints.
- **Why it exists (objective):** to make searchable fingerprints that are still tenant-isolated. Plain hashing would give the same fingerprint to "john@gmail.com" across all hospitals — an attacker could cross-reference. HMAC with a per-tenant key makes the fingerprints unique to each hospital.
- **Real-life example:** A rubber stamp where part of the design is hidden inside the stamp body. Two companies might own identical stamps from outside, but the hidden part differs — so prints from each company are distinguishable.
- **How Akwadona uses it:** patient/staff emails are HMAC'd with the tenant's HMAC key. To search "find email=`x@y.com`" we HMAC the input the same way and look up the fingerprint in DynamoDB.

### 4.8 Envelope Encryption — KEK + DEK

- **What it is:** A pattern where each row is encrypted with a unique key (DEK = Data Encryption Key), and the DEK itself is encrypted with a master key (KEK = Key Encryption Key). Both are stored together.
- **Why it exists (objective):** to make per-row key rotation cheap and to enable cryptographic erasure. If we ever need to "delete all of Hospital X's data" we just destroy the KEK — every DEK becomes un-openable instantly.
- **Real-life example:** A locked box (DEK) inside a locked vault (KEK). To destroy everything inside, you melt the vault key. The boxes still exist but no key can open them ever again.
- **How Akwadona uses it:** KEK = the per-tenant KMS data key. DEK = a random AES key generated per row. Both go into each DynamoDB item.

### 4.9 Tenant / Multi-tenant

- **What it is:** A "tenant" is one customer hospital. "Multi-tenant" means our system serves many tenants from the same software.
- **Why it exists (objective):** so we can scale to 100 hospitals without running 100 separate apps. One codebase, one deploy, one operations team.
- **Real-life example:** An apartment building (multi-tenant) versus 100 separate houses (single-tenant). The building is cheaper to maintain.
- **How Akwadona uses it:** every DynamoDB row has a `tenantId`. Every Lambda reads the `tenantId` from the JWT and only touches rows that match.

### 4.10 Pool / Bridge / Silo (three multi-tenant models)

- **Pool:** every tenant shares everything (one DB, one Lambda set, one KMS key).
- **Bridge:** shared compute (Lambdas, DB) but per-tenant KMS keys + per-row tenant ID isolation. **What Akwadona is today.**
- **Silo:** every tenant gets their own dedicated DB + Lambdas. Strongest isolation, most expensive. Future "Premium Isolation" tier.
- **Why it exists (objective):** different customers need different levels of isolation. Bridge is the sweet spot — strong enough for HIPAA/PDPPL/GDPR, cheap enough to be profitable.
- **Real-life example:** Pool = shared dorm room. Bridge = apartment building with private apartments + private safes. Silo = separate houses.
- **How Akwadona uses it:** Bridge today (per-tenant KMS keys, shared infra). Silo as a paid upgrade later.

### 4.11 Zero-knowledge

- **What it is:** A design where the platform provider (us) provably cannot see the customer's data.
- **Why it exists (objective):** the strongest possible privacy promise. "Trust us" is weak; "we mathematically cannot read your data" is strong. Hospitals need this for regulators.
- **Real-life example:** A bank vault to which only the customer has the key. The bank manages the vault but cannot open it.
- **How Akwadona uses it:** per-tenant KMS keys + no human IAM permission to use them + operator console code that never calls Decrypt.

### 4.12 OIDC — OpenID Connect

- **What it is:** A standard protocol on top of OAuth2 for "logging in via a third party".
- **Why it exists (objective):** to give a single, widely-implemented way for apps to use a central login provider. Reuse standardized libraries instead of inventing custom auth.
- **Real-life example:** An international visa standard. Every country reads the same kind of visa stamp. No country invents their own format.
- **How Akwadona uses it:** Cognito speaks OIDC. The Angular app uses an OIDC library (`angular-auth-oidc-client`) to talk to it.

### 4.13 OAuth2

- **What it is:** The older parent standard of OIDC. Originally about "let App A access my data in App B without sharing my password".
- **Why it exists (objective):** to delegate access without sharing credentials. Example: "Let Calendly read my Google Calendar" — Calendly never sees your Google password.
- **Real-life example:** Hotel valet key — a special car key that can park your car but cannot open the trunk or glovebox.
- **How Akwadona uses it:** as the protocol underneath OIDC. We use the "Authorization Code with PKCE" flow.

### 4.14 SSO — Single Sign-On

- **What it is:** Signing in once gives you access to multiple apps.
- **Why it exists (objective):** so users don't have 10 passwords for 10 internal apps.
- **Real-life example:** A corporate badge that opens every door in the building.
- **How Akwadona uses it:** today, the same Cognito sign-in covers the tenant app, the admin panel, and the operator console. Future: SAML federation with hospital IdPs.

### 4.15 MFA — Multi-Factor Authentication

- **What it is:** Requiring two or more proofs of identity (something you know + something you have).
- **Why it exists (objective):** passwords get phished. A second factor (SMS code, authenticator app) blocks attackers who steal passwords.
- **Real-life example:** ATM withdrawal needs both the card AND the PIN.
- **How Akwadona uses it:** Cognito supports SMS-based and TOTP-based MFA. We enable it for the Operator group (platform staff) by policy.

### 4.16 CORS — Cross-Origin Resource Sharing

- **What it is:** A browser security rule. By default, a page from `akwadona.com` cannot call an API at `amazonaws.com` unless that API explicitly allows it.
- **Why it exists (objective):** to stop a malicious website you visit from secretly calling your bank's API on your behalf.
- **Real-life example:** A border check between two countries. By default you can't drive through; the destination country must publish a list of allowed source countries.
- **How Akwadona uses it:** API Gateway is configured to allow our domains (`akwadona.com`, `www.akwadona.com`, `tiryaq.akwadona.com`, etc.).

### 4.17 Throttling / Rate Limiting

- **What it is:** Capping how many requests one user can make per second/minute/day.
- **Why it exists (objective):** to stop one runaway customer (bug or attack) from eating all the platform's capacity.
- **Real-life example:** A restaurant accepting only N orders per hour from each table to keep the kitchen fair.
- **How Akwadona uses it:** plan-based tiers — Free 10 req/s, Standard 100, Enterprise 500. 429 returned on breach. See Step 2g.

### 4.18 Idempotency

- **What it is:** A property where doing the same operation twice gives the same result as doing it once.
- **Why it exists (objective):** networks fail. The user clicks "Submit", the response is lost in transit. They click again. Without idempotency, you create duplicates.
- **Real-life example:** An elevator button. Pressing it twice doesn't make the elevator come twice — the second press is ignored if the first is queued.
- **How Akwadona uses it:** every mutating request sends an `X-Client-Request-Id` UUID. The backend remembers it for 24 hours; second hit returns the cached result of the first.

### 4.19 Audit Log

- **What it is:** A tamper-evident record of every action: who, what, when, before-and-after.
- **Why it exists (objective):** HIPAA, PDPPL, and GDPR require it. Regulators will ask "show me every access to patient #123 in 2025" and you must answer.
- **Real-life example:** A safe-deposit-box log book at a bank. Every entry has signature + date + which box was opened.
- **How Akwadona uses it:** every create/update/delete writes an `AUDIT#…` row in DynamoDB with the actor's email, timestamp, action, and encrypted before/after JSON.

### 4.20 GSI — Global Secondary Index

- **What it is:** A DynamoDB feature: a second way to look up data in the same table.
- **Why it exists (objective):** the main key (`PK`) is one specific lookup path. We often need to look up by email, by date, by tenant. GSIs add more paths.
- **Real-life example:** A library catalog by author AND another by title. Same books, two ways to find them.
- **How Akwadona uses it:** `tenant-entityType-index` lets us list all patients for a tenant. `emailHash-EntityType-index` lets us look up a patient by their email HMAC fingerprint.

### 4.21 TTL — Time To Live

- **What it is:** A "delete me after this date" marker on a DynamoDB row. DynamoDB sweeps these for free.
- **Why it exists (objective):** to delete temporary data (rate-limit counters, idempotency keys, session records) without writing a cron job.
- **Real-life example:** A library book with a return date. After the date, it's automatically marked overdue and goes back on the shelf.
- **How Akwadona uses it:** throttle counters expire after the minute/day window. Idempotency keys expire after 24 hours.

### 4.22 API — Application Programming Interface

- **What it is:** A documented set of endpoints (URLs) that one program calls to use another program's features.
- **Why it exists (objective):** so programs can talk without humans in the middle. The browser calls our API to add a patient; no human types in the database.
- **Real-life example:** A restaurant menu. The diner orders by number; the kitchen knows what to make. The menu is the contract.
- **How Akwadona uses it:** we expose ~50 API endpoints under `jxz59jh15f.execute-api.us-east-1.amazonaws.com/*`.

### 4.23 REST

- **What it is:** A style of designing APIs around resources (patients, doctors) and standard HTTP verbs (GET, POST, PATCH, DELETE).
- **Why it exists (objective):** to make APIs predictable. If you know how to use one REST API, you know the shape of all of them.
- **Real-life example:** A standard form factor for restaurant menus. Appetizer → Main → Dessert. Every restaurant uses the same layout.
- **How Akwadona uses it:** `GET /patients`, `POST /patients`, `PATCH /patients/{id}`, `DELETE /patients/{id}`. Same shape across all entities.

### 4.24 HTTP / HTTPS

- **What it is:** HTTP = the protocol the web uses. HTTPS = HTTP wrapped in TLS encryption.
- **Why it exists (objective):** HTTP gives a standard way for browsers and servers to exchange data. HTTPS adds encryption.
- **Real-life example:** HTTP = postcard. HTTPS = sealed armored envelope.
- **How Akwadona uses it:** only HTTPS. HTTP redirects to HTTPS at the CloudFront layer.

### 4.25 DNS / CNAME

- **What it is:** DNS = the system that turns `akwadona.com` into an IP address. A CNAME is one type of DNS record — "this name is an alias for that name".
- **Why it exists (objective):** humans remember names; computers need numeric IPs. DNS translates between them.
- **Real-life example:** A phone book — you look up "Pizza Hut" and find the phone number.
- **How Akwadona uses it:** GoDaddy hosts our DNS. CNAMEs route `auth.akwadona.com` → Cognito's CloudFront, `www.akwadona.com` → our CloudFront.

### 4.26 CDN — Content Delivery Network

- **What it is:** A network of cache servers worldwide. Pages load from the nearest cache, not the origin.
- **Why it exists (objective):** to cut latency. Visiting Italy on vacation but loading a US website would be slow without a CDN.
- **Real-life example:** Domino's branches in every city, instead of one pizza shop in Italy.
- **How Akwadona uses it:** CloudFront is our CDN.

### 4.27 SPA — Single-Page Application

- **What it is:** A web app that loads once and then updates the page via JavaScript instead of full page reloads.
- **Why it exists (objective):** to feel as snappy as a desktop app. Server-rendered apps reload the whole page on every click — slow.
- **Real-life example:** A pop-up children's book where pages fold up instead of being torn out and replaced.
- **How Akwadona uses it:** Angular powers our SPA. After the initial load, navigation between tabs is instant.

### 4.28 PWA — Progressive Web App + Service Worker

- **What it is:** A web app that behaves like an installed app: works offline, gets cached, can be added to the home screen.
- **Why it exists (objective):** to give the convenience of mobile apps without going through app stores. The "service worker" is the background script that caches files and intercepts network calls.
- **Real-life example:** Google Docs offline — you can keep editing without internet, syncs back when online.
- **How Akwadona uses it:** the Angular Service Worker (`ngsw`) caches the app shell so it loads fast on second visit. Offline mode lets doctors keep creating consultations during network outages.

### 4.29 Bearer Token / Access Token / Refresh Token / ID Token

- **What it is:** Three different tokens issued by Cognito.
  - **Access token:** proves you can call APIs. Short-lived (1 h).
  - **ID token:** carries who you are (claims). Used by the frontend.
  - **Refresh token:** used to get new access tokens without re-logging-in. Long-lived (30 d).
  - "Bearer token" just means "whoever holds this token gets in" — like cash.
- **Why it exists (objective):** short-lived access tokens limit damage if stolen; refresh tokens let users stay logged in for weeks.
- **Real-life example:** Access token = day pass for an amusement park. ID token = your name written on the pass. Refresh token = a season ticket that lets you renew the day pass each morning without re-buying.
- **How Akwadona uses it:** browser stores all three in localStorage + sessionStorage. Access token goes on every API call.

### 4.30 Session / Cookie / localStorage / sessionStorage

- **What it is:** Four ways to remember state in a browser.
  - **Cookie:** small string sent on every request to the same domain.
  - **localStorage:** persistent key/value store; survives browser close.
  - **sessionStorage:** key/value store; wiped when tab closes.
  - **Session:** general term for "the user's logged-in state".
- **Why it exists (objective):** HTTP itself is stateless. Without one of these, every page reload would log the user out.
- **Real-life example:** A coat-check ticket (cookie). A locker in the gym (localStorage — your stuff stays after you leave the building). A locker that resets when the room empties (sessionStorage).
- **How Akwadona uses it:** access tokens live in BOTH sessionStorage (for the current tab) and localStorage (for browser-close survival). Cache data lives in localStorage with a TTL.

### 4.31 LCP — Largest Contentful Paint (and other perf metrics)

- **What it is:** The time from page load start until the largest visible element (image, headline) is painted. Google's headline performance metric.
- **Why it exists (objective):** to score real user perception of speed, not just raw HTTP timings.
- **Real-life example:** A restaurant's "time to first bite". Not just "menu arrived" or "kitchen started cooking" — when the food is actually in front of you.
- **How Akwadona uses it:** target is < 1 s LCP on the operator dashboard. Measured with Lighthouse.

### 4.32 Lighthouse

- **What it is:** Google's free Chrome tool that scores a web page on performance, accessibility, SEO, best practices.
- **Why it exists (objective):** to give developers an objective speedometer.
- **Real-life example:** A car's dashboard — speedometer, fuel gauge, oil pressure all in one view.
- **How Akwadona uses it:** we use it to verify perf targets (< 1 s LCP, etc.).

### 4.33 CI/CD — Continuous Integration / Continuous Deployment

- **What it is:** Automation that builds, tests, and deploys code every time someone commits to git.
- **Why it exists (objective):** to deploy small changes fast and safely. Without CI/CD, deploys are weekly and risky.
- **Real-life example:** A factory assembly line — every part flows automatically from station to station instead of being hand-carried.
- **How Akwadona uses it:** today: manual `npm run build` + S3 sync. Future: GitHub Actions on push to `main`.

### 4.34 Git / Branch

- **What it is:** Git is the version-control system. A branch is a named line of changes you can work on independently.
- **Why it exists (objective):** to keep a complete history of every change and let multiple people work without stepping on each other.
- **Real-life example:** A Google Doc's version history. You can roll back to last Tuesday's version.
- **How Akwadona uses it:** repo `github.com/appdevmate/hospital`. Branch `development` is where we push every change.

### 4.35 IaC — Infrastructure as Code

- **What it is:** Describing servers, databases, networks in code instead of clicking around the AWS Console.
- **Why it exists (objective):** to make infrastructure reviewable (in git), repeatable, and recoverable.
- **Real-life example:** The recipe in a cookbook — anyone with the recipe can reproduce the dish.
- **How Akwadona uses it:** CDK is our IaC tool. The `tiryaq-cdk/` folder is our infrastructure recipe.

### 4.36 Region / Availability Zone (AZ)

- **What it is:** AWS divides the world into Regions (e.g. `us-east-1` Virginia, `me-south-1` Bahrain). Each region has multiple AZs — independent data centers within the same city.
- **Why it exists (objective):** to give customers control over data location (compliance) and resilience (one AZ outage doesn't take you down).
- **Real-life example:** A bank has branches across countries (regions) and several offices in each city (AZs). If one office floods, the others keep running.
- **How Akwadona uses it:** we run in `us-east-1`. Multi-AZ is automatic for Lambda, DynamoDB, S3. Future: replicate to `me-south-1` for Qatar data-residency Premium tier.

### 4.37 Free tier

- **What it is:** AWS gives every account some free monthly usage (1M Lambda calls, 25 GB DynamoDB, 5 GB S3, 1 TB CloudFront, etc.).
- **Why it exists (objective):** to let startups build for free until they have real traffic.
- **Real-life example:** A free coffee on every coffee card after 9 paid coffees — gets you in the door.
- **How Akwadona uses it:** Akwadona today fits inside the free tier almost entirely. Monthly bill is ~$5–10, mostly KMS keys ($1 each per month).

### 4.38 SaaS / PaaS / IaaS / B2B / B2C

- **What it is:** Layers of "as a service" offerings.
  - **IaaS** — raw infrastructure (e.g. EC2 servers).
  - **PaaS** — platforms (e.g. Lambda — you don't manage the server).
  - **SaaS** — finished software (e.g. Akwadona — the user just opens the browser).
  - **B2B** — Business to Business (we sell to hospitals).
  - **B2C** — Business to Consumer (e.g. Netflix sells to people).
- **Why it exists (objective):** to describe the value-add level. Higher up = less work for the buyer.
- **Real-life example:** IaaS = raw flour. PaaS = bread dough. SaaS = a sandwich.
- **How Akwadona uses it:** Akwadona is a B2B SaaS built on AWS PaaS services.

### 4.39 AES-256 / RSA / Public-Key Cryptography

- **What it is:** Encryption algorithms.
  - **AES-256:** fast symmetric encryption (same key locks & unlocks). What we use for PHI.
  - **RSA:** slower asymmetric encryption (two keys — public + private). Used for signing tokens, TLS handshakes.
- **Why it exists (objective):** different problems need different tools. AES for bulk data, RSA for trust + signatures.
- **Real-life example:** AES = a normal house lock (same key opens and closes). RSA = a mailbox slot (anyone can drop letters in via the public slot; only the owner with the private key can take them out).
- **How Akwadona uses it:** AES-256-GCM for envelope encryption. RSA-256 for Cognito's JWT signatures.

---

## 5. Laws We Comply With

### 5.1 HIPAA — Health Insurance Portability and Accountability Act (USA)

- **What it is:** US healthcare privacy law.
- **Why it exists (objective):** to prevent unauthorized disclosure of patient health data.
- **Real-life example:** Doctor-patient confidentiality, codified for the digital age.
- **How Akwadona uses it:** every Akwadona feature is reviewed against HIPAA's Security Rule. Mapping in `docs/05a-hipaa-security-rule-mapping.md`. We sign a **BAA** with each customer.

### 5.2 PDPPL — Personal Data Privacy Protection Law (Qatar)

- **What it is:** Qatar's national privacy law (2016).
- **Why it exists (objective):** to govern how Qatari residents' data is collected, processed, and shared.
- **Real-life example:** Qatar's equivalent of GDPR.
- **How Akwadona uses it:** all customer data lives in our system per PDPPL principles. Mapping in `docs/05b-pdppl-qatar-compliance.md`.

### 5.3 GDPR — General Data Protection Regulation (EU)

- **What it is:** EU privacy law, 2018.
- **Why it exists (objective):** to give EU residents control over their personal data — right to access, right to be forgotten, right to portability.
- **Real-life example:** The "delete my account and all my data" button is a GDPR right.
- **How Akwadona uses it:** mapping in `docs/05c-gdpr-compliance-and-dpia.md`. We sign a **DPA** with EU-customer hospitals.

### 5.4 BAA / DPA / DPIA

- **BAA — Business Associate Agreement** (HIPAA). A contract where we (the vendor) promise to handle PHI per HIPAA rules. Required by US-style customers.
- **DPA — Data Processing Agreement** (GDPR). The equivalent for EU.
- **DPIA — Data Protection Impact Assessment** (GDPR). A formal risk analysis we do once per new feature that processes personal data.
- **Why they exist (objective):** to put compliance obligations in writing, so if anything goes wrong, the legal trail is clear.
- **How Akwadona uses it:** templates in `docs/05d-baa-template.md`, `docs/05e-dpa-template.md`. DPIA per feature.

### 5.5 ePHI

- **What it is:** "Electronic PHI" — PHI in digital form. The HIPAA Security Rule specifically governs ePHI.
- **Why it exists (objective):** to clarify that digital records have the same protection as paper.
- **How Akwadona uses it:** every data point we handle IS ePHI by definition.

---

## 6. The Akwadona Architecture in One Picture (still words, but ordered)

```
[Doctor's browser at tiryaq.akwadona.com]
        |
        | HTTPS (TLS 1.2+)
        v
[CloudFront edge in Doha]
        |
        | Cached app delivered
        v
[S3 bucket: serves Angular app's static files]
[API Gateway HTTP API]   ← every backend call goes here
        |
        | JWT validated by API Gateway
        v
[Lambda functions]
        |
        +--> [KMS data key]   ← encrypt/decrypt PHI
        +--> [KMS HMAC key]   ← fingerprint searchable fields
        +--> [DynamoDB Hospital table]    ← rows
        +--> [S3 documents bucket]        ← uploaded files
        +--> [CloudWatch Logs + Metrics]  ← audit + debug
        |
[Cognito User Pool]  ← issues JWTs at auth.akwadona.com (custom domain via ACM cert)
```

Operator console at `www.akwadona.com/operator` hits the same API Gateway but only routes that don't touch PHI.

---

## 7. The Sales Pitch (what to tell a hospital buyer)

### 7.1 Why pick Akwadona over Athenahealth / Epic / Cerner?

- **Built for your region** — Qatar PDPPL ready, GCC data residency option, Arabic UI (coming).
- **Zero-knowledge by design** — even Akwadona staff cannot read your patient data. Per-hospital encryption keys, auditable.
- **Stripe-grade UX** — sub-second sign-in, sub-second dashboard.
- **Lower cost** — pay-as-you-grow, no big upfront server purchase.
- **All standards covered** — HIPAA, PDPPL, GDPR. Signed BAA + DPA available on request.

### 7.2 Where is our data stored?

- AWS data centers in **us-east-1 (Virginia)** today. Optional **me-south-1 (Bahrain)** for Qatar data-residency on the Premium Isolation tier.
- Encrypted at rest with **your hospital's dedicated AWS KMS key** — no other hospital and no Akwadona employee can use it.

### 7.3 Can Akwadona staff see our patients?

- **No.** Our operator console shows your subscription, usage metrics, and audit metadata (who logged in when) — never patient names, IDs, diagnoses, or any clinical data.
- Audit logs are encrypted with your key. We see "Dr Ahmed updated something at 14:32" but not WHAT or for WHICH patient.

### 7.4 What happens if we leave?

- We export all your encrypted data + your KMS key to a format you choose (CSV / JSON / FHIR).
- After 30 days, we destroy your KMS key. Data becomes mathematically unrecoverable — even by us. This is **cryptographic erasure**, accepted by GDPR's "right to be forgotten".

### 7.5 What's your uptime guarantee?

- 99.9% monthly SLA (same as Stripe / Vercel).
- Built on AWS managed services (Lambda, DynamoDB, CloudFront) — each has 99.99% individual SLA.

### 7.6 How fast does it grow?

- Tested to 100 concurrent users per hospital, 1,000+ writes per minute. Auto-scales without our intervention. See `docs/06-scalability-report.md`.

---

## 8. Common Customer Questions — Cheat Sheet

| Question | Honest answer |
|---|---|
| Is our data encrypted? | Yes — AES-256 at rest, TLS 1.2+ in transit, per-hospital KMS keys. |
| Can we have our own database? | Today: no (shared DynamoDB, isolated by `tenantId`). Premium Isolation tier (planned): yes — dedicated DDB + IAM role. |
| Do you sign a BAA? | Yes — see `docs/05d-baa-template.md`. |
| Where's the login page? | `auth.akwadona.com` — our branded domain. Never an AWS-default URL. |
| What if your platform is hacked? | Patient data is encrypted with YOUR key. Attackers stealing our DB get random bytes. We notify you within 24 h regardless. |
| Can our admin reset a doctor's password? | Yes — Admin Panel → Users → Reset Password. Cognito handles the new-password flow. |
| Can we white-label the UI? | Tenant pill shows your hospital name. Logo/colors: planned. |
| Arabic / French / other languages? | Planned — see `docs/backlog.md` i18n task. |
| Price? | Tiered: Free (10 req/s, dev only), Standard (100 req/s), Enterprise (500 req/s, + Premium Isolation option). |
| Onboarding time? | Today: a few hours (manual). After Step 8 + wizard: < 30 minutes self-serve. |
| What if AWS goes down? | Multi-AZ design makes single-data-center failure invisible. Full-region outage (rare) → cross-region backup restore within 4 h. |
| Can you delete a patient permanently? | Yes. Soft delete instant. Hard delete + audit-log scrub is operator-assisted (HIPAA requires 6-year audit retention). |
| Do you train AI on our data? | **No.** Patient data is never used for AI/ML training. Voice Scribe uses AWS Bedrock under a contractual no-train clause. |

---

## 9. The Code Layout

```
hospital/
├── docs/                         # All written documentation
│   ├── 00-akwadona-explained.md  # YOU ARE HERE
│   ├── 05a-…05f-                 # Compliance (HIPAA, PDPPL, GDPR, BAA, DPA)
│   ├── 06-scalability-report.md
│   ├── 07-operator-console.md
│   ├── 08-throttling.md
│   └── backlog.md                # Open work items + principles
├── src/                          # The Angular app (frontend)
│   ├── app/
│   │   ├── components/           # UI screens (dashboard, patients, operator-console, …)
│   │   ├── services/             # API clients + cache + tenant + auth helpers
│   │   ├── guards/               # Route protection (authGuard, operatorGuard)
│   │   ├── interceptors/         # HTTP middleware (JWT, retry, offline queue)
│   │   └── layout/               # Topbar, sidebar, menu
│   └── index.html                # Entry HTML + auth-check shim
├── tiryaq-cdk/                   # Infrastructure (backend blueprint)
│   ├── bin/                      # CDK entry point
│   ├── lib/
│   │   └── tiryaq-cdk-stack.ts   # Whole AWS architecture in one file
│   └── lambda/                   # Each subfolder = one Lambda function
│       ├── tiryaq-operator-console/
│       ├── tiryaq-pharmacy/
│       ├── …                     # ~30 Lambdas
│       └── lib/                  # Shared modules (plan-defaults, future throttle)
└── scripts/                      # Helpers (seed data, load tests, deploy ps1)
```

---

## 10. If You Remember Five Things

1. **Akwadona is a SaaS** — hospitals rent it, they don't buy it.
2. **Each hospital is a "tenant"** — they share the platform but never see each other's data.
3. **Per-hospital KMS keys** mean even WE cannot read patient data — the key sales pitch.
4. **AWS Lambda + DynamoDB + S3 + Cognito** are the workhorses; CloudFront and API Gateway are the front desks.
5. **Operator Console at `www.akwadona.com/operator`** is where YOU monitor your customers' subscriptions, usage, and billing — without ever touching their clinical data.

When a customer asks a question and you're stuck: open this file. It covers the 95% case.



aws cloudfront list-invalidations --distribution-id E1Z1ZKYM74LVA7 --max-items 1
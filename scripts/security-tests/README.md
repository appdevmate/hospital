# Akwadona security test suite

Attack-style regression tests for the live API and site. Plain Node 18+, no
dependencies. Two sets:

| Set | Runs against | Side effects | Command |
|---|---|---|---|
| **safe/** | Production is fine | None — GET / OPTIONS / unauthenticated POST (rejected by API Gateway before any Lambda runs) | `node scripts/security-tests/run-safe.js` |
| **destructive/** | **Dev stack only** | Creates + deletes rows, floods the API, attempts privileged writes | `node scripts/security-tests/run-all.js --i-understand-this-mutates-data` |

`run-all.js` refuses to start unless `API_BASE` is set to a non-production API
and the acknowledgement flag is passed.

## What each file attacks

| File | Attack class | Proves |
|---|---|---|
| `safe/01-tls-and-headers.js` | Transport | HTTP→HTTPS redirect; HSTS, nosniff, X-Frame-Options, Referrer-Policy; TLS 1.0/1.1 rejected on site and API; no server banner leak |
| `safe/02-unauthenticated.js` | Auth bypass | 45 routes × no token → 401; forged signature, expired, `alg=none`, token-in-query, token-in-cookie all → 401; junk Authorization never 5xx |
| `safe/03-cors.js` | Cross-origin | Allow-list echoes exact origin (never `*`); six look-alike origins get nothing; credentials off; unknown request header rejected; documents bucket CORS |
| `safe/04-enumeration.js` | Enumeration | 11 non-existent IDs → 404 not 403; foreign-tenant-shaped id → 404; Cognito ForgotPassword/InitiateAuth do not reveal user existence |
| `safe/05-injection-readonly.js` | Injection | 19 payloads × 14 GET endpoints (266 combos): zero 5xx, no DynamoDB/stack internals leaked, no foreign-tenant row returned; unknown sortField ignored; pageSize clamped |
| `safe/06-method-and-path.js` | Protocol | PUT/TRACE/HEAD/CONNECT/PROPFIND → 4xx; 16 KB query string → 4xx; five path-traversal shapes → 401/404; XML / empty / malformed JSON body → 4xx |
| `destructive/10-cross-tenant-crud.js` | IDOR | Tenant A creates patient / appointment / donor; tenant B GET/PATCH/DELETE → 404; B's list excludes it; A's row unchanged; A cleans up |
| `destructive/11-role-escalation.js` | Privilege | Doctor cannot POST/DELETE departments or specializations (403); cannot reach `/admin/*` or `/operator/*`; body-smuggled `tenantId`/`role` ignored; `?doctorEmail=` ignored |
| `destructive/12-rate-limit.js` | DoS | 400 parallel GETs → some 429 with `Retry-After`, no 5xx |
| `destructive/13-payload-and-documents.js` | Resource abuse / traversal | 7 MB body → 413; 5,000-deep JSON → 4xx; upload-url refuses traversal / foreign prefix / NUL / 2 KB names; download-url for foreign key → 404; pre-signed URL cannot be re-pointed |

## Credentials

Set as environment variables only — never commit them.

```powershell
# Read-only checks that need a login (04, 05, part of 06):
$env:AKWADONA_USERNAME = 'admin1'
$env:AKWADONA_PASSWORD = '<from Secrets Manager /akwadona/seed-users/admin1>'

# Destructive set additionally needs a user in a DIFFERENT tenant and a Doctors-group user:
$env:AKWADONA_B_USERNAME = '...'      ; $env:AKWADONA_B_PASSWORD = '...'
$env:AKWADONA_DOCTOR_USERNAME = '...' ; $env:AKWADONA_DOCTOR_PASSWORD = '...'
```

Use the accounts from `AKW-EH-10-Engineering-Handbook.md`. Do not use a real clinician's account.

## Reading the output

```
── 02 Unauthenticated access ──
[  ok  ] All 45 routes return 401 with no token
[  ok  ] Forged JWT (bad signature) → 401
[ FAIL ] alg=none JWT → 401  — status=200      ← this would be a critical finding
   6 passed, 1 failed, 0 skipped
```

Exit code 0 = everything passed. Any `FAIL` is a real finding — open an
incident per `AKW-IRP-09-Incident-Response-Plan.md` if it is on production.

## Adding a test

Each file exports `async function run(ctx) → Report`. `ctx` carries
`apiBase`, `siteBase`, `documentsBucketUrl`, and `sessions.{a,b,doctor}`
(each `{ accessToken, idToken, claims }` or `null`). Use `r.expect(name,
condition, detail)`; use `r.skip(...)` when a precondition (like a session)
is missing rather than failing.

Keep a test in `safe/` only if it is **provably read-only against production**.
If in doubt it goes in `destructive/`.

## Schedule it

Running `run-safe.js` nightly (GitHub Actions, a Windows Task Scheduler job,
or an EventBridge-triggered Lambda once the stack is split — see
`AKW-SAD-02-Solution-Architecture-Document.md` §9) turns this from a one-off audit
into the "automated nightly isolation probe" the sales handbook promises.

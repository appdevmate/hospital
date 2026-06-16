# Akwadona — Load Test Runbook

This folder contains the Artillery-based load test for Akwadona's API.

## What it tests

Four realistic scenarios at three phases of load:

| Phase | Duration | Rate | Goal |
|---|---|---|---|
| Warmup | 60s | 5 rps | Hit cold-start path, confirm KMS connections initialize |
| Sustained | 300s | 50 rps | Prove steady-state throughput at production-like volume |
| Peak | 60s | 200 rps | Stress test; finds the first bottleneck |

The scenarios mix reads (70%) and writes (30%) like a real hospital workload.

## Setup (one-time)

```powershell
npm install -g artillery
cd "C:\Users\Sami Toufic Taha\Desktop\aws apps\hospital\scripts\loadtest"
```

## Get a JWT for auth

Artillery doesn't handle OAuth flows. Sign in manually first:

1. Open `https://tiryaq.akwadona.com` in a browser.
2. Sign in as `admin1`.
3. F12 → Application → Session storage → copy the `accessToken` value.
4. Set as env var:

```powershell
$env:AKWADONA_JWT = "eyJraWQiOi..."   # paste here
$env:AKWADONA_API_URL = "https://jxz59jh15f.execute-api.us-east-1.amazonaws.com"
```

JWT expires after 1 hour — re-fetch if test takes longer.

## Run the test

```powershell
artillery run akwadona-load-test.yml --output report.json
artillery report report.json --output report.html
start report.html
```

Total duration: ~7 minutes. Cost: roughly $1–3 (KMS calls + Lambda invocations + DynamoDB on-demand). Hard ceiling under $10.

## What to look for in the report

- **p95 latency** — must stay under 1 second per the `ensure` block. If it climbs above that during the Peak phase, Lambda concurrency or KMS rate limits are biting.
- **Error rate** — must stay under 1%. Most expected errors are 400 (synthetic data) and 409 (duplicate), both acceptable.
- **Throughput** — actual requests per second the system serves. Artillery shows this vs. the requested rate.
- **Per-scenario latency** — Doctor dashboard should be fastest (just reads). Appointment create should be slowest (KMS GenerateDataKey + DynamoDB write + audit + DOCTOR_PATIENT relation).

## Capacity baselines (theoretical)

See `docs/06-scalability-report.md` for the calculated limits + interpretation.

| Resource | Limit |
|---|---|
| API Gateway HTTP API | 10,000 rps per account |
| Lambda concurrent executions | 1,000 (default, can raise) |
| DynamoDB on-demand | 40,000 RCU + 40,000 WCU per table (auto-scale) |
| KMS GenerateDataKey | 10,000 rps per region |
| KMS GenerateMac | 1,500 rps per HMAC key |

Akwadona's design is built to scale to roughly **5,000 active concurrent users per region** before hitting one of these. Past that, multi-region replication is the next move.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| 401 on every request | JWT expired or wrong env var | Re-fetch token, set `$env:AKWADONA_JWT` again |
| 504 Gateway Timeout spike during Peak | Lambda cold-start throttle | Increase reserved concurrency; warmer rule re-tune |
| 429 from KMS | GenerateMac per-key rate | Increase the HMAC cache window in `_shared/crypto.js` or split high-traffic tenants to additional keys |
| CORS error in browser DevTools while testing | Origin not in CORS allow list | Already fixed — re-confirm CDK CORS block |

'use strict';

/**
 * Akwadona — Shared per-tenant throttle module (Step 2g.2).
 *
 * Why: every paid SaaS rate-limits per customer. Without it, one runaway
 * client from one hospital can starve everyone else. Stripe / Twilio /
 * Vercel all do this exactly the same way:
 *   - Read the tenant's plan limits.
 *   - Atomically increment a per-minute counter in a fast store.
 *   - Return 429 with `Retry-After` when the cap is hit.
 *   - Auto-clean expired counters via TTL (no cron job).
 *
 * Usage from a tenant Lambda:
 *
 *   const throttle = require('./lib/throttle');           // path may vary
 *
 *   exports.handler = async (event) => {
 *       // … decode JWT, resolve tenantId / role …
 *
 *       const limit = await throttle.precheck(event, { tenantId, role });
 *       if (limit) return limit;                          // 429 response
 *
 *       // proceed with the real request
 *   };
 *
 * The module:
 *   - SKIPS the check when role === 'operator' (platform staff).
 *   - SKIPS the check on warm-up invocations (_warmup === true).
 *   - SKIPS the check on OPTIONS preflights.
 *   - Caches the tenant profile in module scope for 60s to avoid one DB
 *     read per request (huge perf win for hot tenants).
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');
const { resolveLimits } = require('./plan-defaults');

const REGION     = 'us-east-1';
const TABLE_NAME = process.env.TABLE_NAME || 'Hospital';
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const cw  = new CloudWatchClient({ region: REGION });

// Step 2g.5 — publish a CloudWatch metric on every 429 so the operator
// console can surface "how often is this tenant being rate-limited?".
// Fire-and-forget: failures here must never break a request.
function publishThrottleHit(tenantId, reason) {
    cw.send(new PutMetricDataCommand({
        Namespace: 'Akwadona/Throttle',
        MetricData: [{
            MetricName: 'Hits',
            Dimensions: [
                { Name: 'tenantId', Value: tenantId },
                { Name: 'reason',   Value: reason }    // 'minute' or 'day'
            ],
            Value: 1,
            Unit:  'Count'
        }]
    })).catch(() => { /* swallow */ });
}

// ── Profile cache ───────────────────────────────────────────────────────────
// Stripe/Vercel pattern: cache the plan + limits per tenant for 60s in
// module scope. Hot Lambda containers share this cache across requests.
const PROFILE_CACHE_MS = 60_000;
const profileCache = new Map(); // tenantId → { fetchedAt, profile }

async function getProfile(tenantId) {
    const cached = profileCache.get(tenantId);
    if (cached && Date.now() - cached.fetchedAt < PROFILE_CACHE_MS) {
        return cached.profile;
    }
    // Profile rows are PK = TENANT#<slug>, SK = PROFILE. We have tenantId
    // but not slug. The tenant set is tiny (handful of hospitals) so a
    // filtered Scan is fine — and we cache the WHOLE map for 60s so the
    // next request for any tenant is also a free in-process lookup.
    try {
        const r = await ddb.send(new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: '#et = :t',
            ExpressionAttributeNames: { '#et': 'EntityType' },
            ExpressionAttributeValues: { ':t': 'TENANT' }
        }));
        const now = Date.now();
        for (const item of (r.Items || [])) {
            if (item.tenantId) {
                profileCache.set(item.tenantId, { fetchedAt: now, profile: item });
            }
        }
    } catch (_) { /* fall through to default */ }

    const fresh = profileCache.get(tenantId);
    if (fresh) return fresh.profile;

    // Unknown tenant — safe default (free tier limits, no overrides).
    const fallback = { plan: 'free' };
    profileCache.set(tenantId, { fetchedAt: Date.now(), profile: fallback });
    return fallback;
}

// ── Window helpers ──────────────────────────────────────────────────────────
function minuteKey(date) {
    // YYYY-MM-DDTHH:MM (UTC)
    return date.toISOString().slice(0, 16);
}
function dayKey(date) {
    return date.toISOString().slice(0, 10);
}
function secondsToNextMinute(date) {
    return 60 - date.getUTCSeconds();
}
function secondsToNextUtcMidnight(date) {
    const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1, 0, 0, 0));
    return Math.max(1, Math.floor((next.getTime() - date.getTime()) / 1000));
}

// ── 429 builder ─────────────────────────────────────────────────────────────
function tooManyRequests(retryAfterSec, message, headers = {}) {
    return {
        statusCode: 429,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Retry-After': String(retryAfterSec),
            ...headers
        },
        body: JSON.stringify({
            error: 'rate_limited',
            message,
            retryAfter: retryAfterSec
        })
    };
}

// ── Atomic counter increment ────────────────────────────────────────────────
async function incrementWindow(pk, sk, ttlSec) {
    const r = await ddb.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: pk, SK: sk },
        UpdateExpression: 'ADD #c :one SET #t = :ttl, #et = :et',
        ExpressionAttributeNames: {
            '#c': 'count',
            '#t': 'ttl',
            '#et': 'EntityType'
        },
        ExpressionAttributeValues: {
            ':one': 1,
            ':ttl': ttlSec,
            ':et': 'THROTTLE_COUNTER'
        },
        ReturnValues: 'UPDATED_NEW'
    }));
    return r.Attributes?.count ?? 0;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Pre-check the rate limit. Returns:
 *   - null  → request is allowed, caller proceeds.
 *   - { statusCode: 429, ... }  → caller MUST return this response immediately.
 *
 * @param event    The Lambda event (used to detect warmup + OPTIONS).
 * @param ctx      { tenantId, role, profile? }
 *                 If `profile` is passed, we skip the DB lookup (recommended).
 */
async function precheck(event, ctx) {
    // Skips
    if (event && event._warmup) return null;
    const method = event?.requestContext?.http?.method || event?.httpMethod;
    if (method === 'OPTIONS') return null;
    if (!ctx || !ctx.tenantId) return null;          // unauth/operator — caller decides
    if (ctx.role === 'operator') return null;        // platform staff bypass

    // Resolve plan + per-tenant overrides
    const profile = ctx.profile || (await getProfile(ctx.tenantId));
    const limits  = resolveLimits(profile);
    const now     = new Date();

    // ── Per-minute window ───────────────────────────────────────────────────
    const minPk  = `THROTTLE#${ctx.tenantId}`;
    const minSk  = `MIN#${minuteKey(now)}`;
    const minTtl = Math.floor(now.getTime() / 1000) + 120;
    const minuteCount = await incrementWindow(minPk, minSk, minTtl);
    if (minuteCount > limits.rpm) {
        publishThrottleHit(ctx.tenantId, 'minute');
        return tooManyRequests(
            secondsToNextMinute(now),
            `Per-minute limit exceeded (${limits.rpm} req/min for plan '${profile.plan || 'free'}')`,
            {
                'X-RateLimit-Limit-Minute':     String(limits.rpm),
                'X-RateLimit-Remaining-Minute': '0'
            }
        );
    }

    // ── Per-day quota window ────────────────────────────────────────────────
    const dayPk  = `THROTTLE#${ctx.tenantId}`;
    const daySk  = `DAY#${dayKey(now)}`;
    const dayTtl = Math.floor(now.getTime() / 1000) + 25 * 3600;
    const dayCount = await incrementWindow(dayPk, daySk, dayTtl);
    if (dayCount > limits.dailyQuota) {
        publishThrottleHit(ctx.tenantId, 'day');
        return tooManyRequests(
            secondsToNextUtcMidnight(now),
            `Daily quota exceeded (${limits.dailyQuota} req/day for plan '${profile.plan || 'free'}')`,
            {
                'X-RateLimit-Limit-Day':     String(limits.dailyQuota),
                'X-RateLimit-Remaining-Day': '0'
            }
        );
    }

    // Inform the client how much room is left (best-effort header surface).
    // Lambdas can choose to copy these onto their own success response.
    return null;
}

module.exports = { precheck, _internal: { incrementWindow, getProfile, resolveLimits } };

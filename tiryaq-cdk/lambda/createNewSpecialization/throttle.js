'use strict';

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');
const { resolveLimits } = require('./plan-defaults');

const REGION     = 'us-east-1';
const TABLE_NAME = process.env.TABLE_NAME || 'Hospital';
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const cw  = new CloudWatchClient({ region: REGION });

function publishThrottleHit(tenantId, reason) {
    cw.send(new PutMetricDataCommand({
        Namespace: 'Akwadona/Throttle',
        MetricData: [{
            MetricName: 'Hits',
            Dimensions: [
                { Name: 'tenantId', Value: tenantId },
                { Name: 'reason',   Value: reason }
            ],
            Value: 1,
            Unit:  'Count'
        }]
    })).catch(function () { });
}

const PROFILE_CACHE_MS = 60000;
const profileCache = new Map();

async function getProfile(tenantId) {
    const cached = profileCache.get(tenantId);
    if (cached && Date.now() - cached.fetchedAt < PROFILE_CACHE_MS) {
        return cached.profile;
    }
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
    } catch (_) {}
    const fresh = profileCache.get(tenantId);
    if (fresh) return fresh.profile;
    const fallback = { plan: 'free' };
    profileCache.set(tenantId, { fetchedAt: Date.now(), profile: fallback });
    return fallback;
}

function minuteKey(date) { return date.toISOString().slice(0, 16); }
function dayKey(date)    { return date.toISOString().slice(0, 10); }
function secondsToNextMinute(date) { return 60 - date.getUTCSeconds(); }
function secondsToNextUtcMidnight(date) {
    const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1, 0, 0, 0));
    return Math.max(1, Math.floor((next.getTime() - date.getTime()) / 1000));
}

function tooManyRequests(retryAfterSec, message, headers) {
    return {
        statusCode: 429,
        headers: Object.assign({
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Retry-After': String(retryAfterSec)
        }, headers || {}),
        body: JSON.stringify({ error: 'rate_limited', message: message, retryAfter: retryAfterSec })
    };
}

async function incrementWindow(pk, sk, ttlSec) {
    const r = await ddb.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: pk, SK: sk },
        UpdateExpression: 'ADD #c :one SET #t = :ttl, #et = :et',
        ExpressionAttributeNames: { '#c': 'count', '#t': 'ttl', '#et': 'EntityType' },
        ExpressionAttributeValues: { ':one': 1, ':ttl': ttlSec, ':et': 'THROTTLE_COUNTER' },
        ReturnValues: 'UPDATED_NEW'
    }));
    return (r.Attributes && r.Attributes.count) || 0;
}

async function precheck(event, ctx) {
    if (event && event._warmup) return null;
    const method = (event && event.requestContext && event.requestContext.http && event.requestContext.http.method) || (event && event.httpMethod);
    if (method === 'OPTIONS') return null;
    if (!ctx || !ctx.tenantId) return null;
    if (ctx.role === 'operator') return null;

    let profile = ctx.profile;
    if (!profile) {
        try { profile = await getProfile(ctx.tenantId); }
        catch (_) { profile = { plan: 'free' }; }
    }
    const limits = resolveLimits(profile);
    const now    = new Date();

    try {
        const minPk  = 'THROTTLE#' + ctx.tenantId;
        const minSk  = 'MIN#' + minuteKey(now);
        const minTtl = Math.floor(now.getTime() / 1000) + 120;
        const minuteCount = await incrementWindow(minPk, minSk, minTtl);
        if (minuteCount > limits.rpm) {
            publishThrottleHit(ctx.tenantId, 'minute');
            return tooManyRequests(secondsToNextMinute(now),
                'Per-minute limit exceeded (' + limits.rpm + ' req/min)',
                { 'X-RateLimit-Limit-Minute': String(limits.rpm), 'X-RateLimit-Remaining-Minute': '0' });
        }
    } catch (_) {}

    try {
        const dayPk  = 'THROTTLE#' + ctx.tenantId;
        const daySk  = 'DAY#' + dayKey(now);
        const dayTtl = Math.floor(now.getTime() / 1000) + secondsToNextUtcMidnight(now) + 60;
        const dayCount = await incrementWindow(dayPk, daySk, dayTtl);
        if (dayCount > limits.dailyQuota) {
            publishThrottleHit(ctx.tenantId, 'day');
            return tooManyRequests(secondsToNextUtcMidnight(now),
                'Daily quota exceeded (' + limits.dailyQuota + ' req/day)',
                { 'X-RateLimit-Limit-Day': String(limits.dailyQuota), 'X-RateLimit-Remaining-Day': '0' });
        }
    } catch (_) {}

    return null;
}

module.exports = { precheck };

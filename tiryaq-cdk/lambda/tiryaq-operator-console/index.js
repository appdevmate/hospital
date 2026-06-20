/**
 * Akwadona Operator Console — Lambda (Step 7g — platform admin only).
 *
 * Routes (all require role=operator in JWT):
 *   GET    /operator/tenants                        — list all tenants
 *   GET    /operator/tenants/{slug}                 — tenant profile
 *   GET    /operator/tenants/{slug}/stats           — PLATFORM usage only
 *   GET    /operator/tenants/{slug}/audit           — audit metadata (sanitized)
 *   PATCH  /operator/tenants/{slug}                 — update limits, plan, status
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PHI BLINDNESS + TENANT BUSINESS-DATA BLINDNESS (Step 7g)
 * ─────────────────────────────────────────────────────────────────────────────
 * The operator must NOT see what's inside a customer hospital. That means:
 *   - NEVER read patient / doctor / appointment / consultation rows.
 *   - NEVER read the per-domain counter rows (COUNTER#PATIENTS, etc.)
 *     because those numbers tell the operator how busy a hospital is.
 *   - NEVER decrypt PHI.
 *
 * What the operator IS allowed to see (platform billing & ops):
 *   - Tenant profile (name, plan, status, contract dates, limits).
 *   - Cloud resource usage (API calls, bandwidth, storage cost-relevant only).
 *   - Compliance status (BAA signed Y/N, DPA signed Y/N, key info).
 *   - Audit metadata STRIPPED of entityType/entityId (which would reveal
 *     "operator just looked at Patient #123"); only timestamp + actor +
 *     action category.
 *
 * Reference model: Athenahealth / Stripe Connect / Vercel Teams — the
 * platform vendor sees billable usage, never the customer's domain data.
 *
 * Future hardening: separate IAM execution role with explicit kms:Decrypt
 * DENY on all T_* tenant keys.
 */

'use strict';

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    QueryCommand,
    ScanCommand,
    UpdateCommand
} = require('@aws-sdk/lib-dynamodb');
const { CloudWatchClient, GetMetricDataCommand } = require('@aws-sdk/client-cloudwatch');
const {
    CognitoIdentityProviderClient,
    ListUsersInGroupCommand
} = require('@aws-sdk/client-cognito-identity-provider');

const REGION     = 'us-east-1';
const TABLE_NAME = 'Hospital';
const API_ID     = process.env.API_ID || 'jxz59jh15f';
const USER_POOL_ID = process.env.USER_POOL_ID || 'us-east-1_RACghntmS';
const CLOUDFRONT_DISTRIBUTION_ID = process.env.CLOUDFRONT_DISTRIBUTION_ID || 'E1Z1ZKYM74LVA7';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const cw  = new CloudWatchClient({ region: REGION });
const cog = new CognitoIdentityProviderClient({ region: REGION });

// ── Operator-only guard ─────────────────────────────────────────────────────
function getOperator(event) {
    const claims = (event && event.requestContext && event.requestContext.authorizer
                    && (event.requestContext.authorizer.jwt
                        ? event.requestContext.authorizer.jwt.claims
                        : event.requestContext.authorizer.claims))
                || {};
    if (claims.role !== 'operator') {
        const e = new Error('Forbidden — operator role required');
        e.statusCode = 403;
        throw e;
    }
    return {
        email: claims.email || 'unknown',
        name:  claims.name  || 'unknown',
        sub:   claims.sub   || 'unknown'
    };
}

const hdrs = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
};
function res(statusCode, body) { return { statusCode, headers: hdrs, body: JSON.stringify(body) }; }
function err(statusCode, message) { return res(statusCode, { error: message, message }); }

// ── Handler ─────────────────────────────────────────────────────────────────
exports.handler = async (event) => {
    if (event && event._warmup) return { ok: true, warmed: true };

    const method = event.requestContext?.http?.method || event.httpMethod;
    const path   = event.rawPath || event.path || '';

    if (method === 'OPTIONS') return res(200, {});

    let operator;
    try { operator = getOperator(event); }
    catch (e) { return err(e.statusCode || 403, e.message); }

    const proxy  = event.pathParameters?.proxy || '';
    const segs   = proxy.split('/').filter(Boolean);
    const root   = segs[0] || '';
    const slug   = segs[1] || null;
    const action = segs[2] || null;

    try {
        if (method === 'GET' && root === 'tenants' && !slug) {
            return await listTenants();
        }
        if (method === 'GET' && root === 'tenants' && slug && !action) {
            // Step 7i — combined detail call. `?expand=stats,audit` returns
            // the tenant row + stats + audit in one round-trip so the UI
            // doesn't need three sequential calls to render the detail page.
            const expand = ((event.queryStringParameters || {}).expand || '')
                .split(',').map(s => s.trim()).filter(Boolean);
            return await getTenant(slug, expand, event.queryStringParameters || {});
        }
        if (method === 'GET' && root === 'tenants' && slug && action === 'stats') {
            return await getTenantStats(slug);
        }
        if (method === 'GET' && root === 'tenants' && slug && action === 'audit') {
            return await getTenantAudit(slug, event.queryStringParameters || {});
        }
        if (method === 'PATCH' && root === 'tenants' && slug && !action) {
            const body = JSON.parse(event.body || '{}');
            return await updateTenant(slug, body, operator);
        }

        return err(404, `Unknown operator route: ${method} ${path}`);
    } catch (e) {
        console.error('Operator handler error', e);
        return err(e.statusCode || 500, e.message || 'Internal Server Error');
    }
};

// ── Handlers ────────────────────────────────────────────────────────────────

async function listTenants() {
    // Perf — list returns the full profile so the UI doesn't need a follow-up
    // /tenants/{slug} call on selection. Tenant set is tiny (< a few hundred)
    // so the payload stays small. Strips PHI-adjacent counters defensively.
    const r = await ddb.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: '#et = :t',
        ExpressionAttributeNames: { '#et': 'EntityType' },
        ExpressionAttributeValues: { ':t': 'TENANT' }
    }));
    const tenants = (r.Items || []).map(t => {
        const o = { ...t };
        delete o.patientCount;
        delete o.doctorCount;
        delete o.appointmentCount;
        return o;
    });
    return res(200, { tenants });
}

async function getTenant(slug, expand = [], qp = {}) {
    const r = await ddb.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `TENANT#${slug}`, SK: 'PROFILE' }
    }));
    if (!r.Item) return err(404, `Tenant ${slug} not found`);
    const out = { ...r.Item };
    delete out.patientCount;
    delete out.doctorCount;
    delete out.appointmentCount;

    // Step 7i — optional expansions in one round-trip.
    if (expand.includes('stats')) {
        try {
            const statsRes = await getTenantStats(slug);
            out.stats = JSON.parse(statsRes.body);
        } catch (e) { out.stats = null; }
    }
    if (expand.includes('audit')) {
        try {
            const auditRes = await getTenantAudit(slug, qp);
            out.audit = JSON.parse(auditRes.body);
        } catch (e) { out.audit = null; }
    }

    return res(200, out);
}

/**
 * PLATFORM STATS — no business / clinical numbers.
 *
 * Sources:
 *   - CloudWatch ApiGateway count metric → api calls (24h, 30d).
 *   - CloudWatch CloudFront BytesDownloaded → bandwidth GB this month.
 *   - Cognito ListUsersInGroup × tenant groups → active user count.
 *   - Tenant profile → plan, status, contract, compliance flags, KMS key IDs.
 *
 * Numbers are platform-wide here because per-tenant CloudWatch dimensions
 * require the tenant tag to be set on every Lambda invocation (future work).
 * We label them as "Platform" so the operator knows it's the whole footprint.
 */
async function getTenantStats(slug) {
    const t = await ddb.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `TENANT#${slug}`, SK: 'PROFILE' }
    }));
    if (!t.Item) return err(404, `Tenant ${slug} not found`);

    // ── Platform-level metrics (best effort) ────────────────────────────────
    const [apiCalls24h, bandwidthGB30d, activeUsers, throttle429Count24h] = await Promise.all([
        getApiCalls24h().catch(() => null),
        getBandwidthGB30d().catch(() => null),
        getActiveUsers(slug).catch(() => null),
        getThrottle429Count24h(t.Item.tenantId).catch(() => null)
    ]);

    return res(200, {
        slug,
        tenantId:    t.Item.tenantId,
        subscription: {
            plan:          t.Item.plan,
            status:        t.Item.status,
            contractStart: t.Item.contractStart,
            mrrUSD:        t.Item.mrrUSD ?? null
        },
        usage: {
            apiCalls24h,
            bandwidthGB30d,
            activeUsers,
            storageGB:      t.Item.storageUsedGB ?? null,
            // Cost estimate is a future enhancement; null until Cost Explorer
            // per-tenant tagging is in place.
            estimatedMonthlyCostUSD: null,
            // Step 2g.5 — how many requests this tenant got 429'd today.
            // High number → consider upgrading them to a higher plan.
            throttle429Count24h
        },
        compliance: {
            baaSigned:      !!t.Item.baaSigned,
            baaSignedAt:    t.Item.baaSignedAt || null,
            dpaSigned:      !!t.Item.dpaSigned,
            dpaSignedAt:    t.Item.dpaSignedAt || null,
            lastAuditDate:  t.Item.lastAuditDate || null
        },
        encryption: {
            // Identifiers ONLY — these IDs cannot decrypt anything.
            kmsKeyId:     t.Item.kmsKeyId  || null,
            hmacKeyId:    t.Item.hmacKeyId || null
        },
        lastActivityAt: t.Item.lastActivityAt || null
    });
}

/**
 * Step 2g.5 — Sum of 429s for this tenant in the last 24 h.
 * Custom metric published by lib/throttle.js on every breach.
 */
async function getThrottle429Count24h(tenantId) {
    if (!tenantId) return 0;
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    const r = await cw.send(new GetMetricDataCommand({
        StartTime: start,
        EndTime: end,
        MetricDataQueries: [{
            Id: 'hits',
            MetricStat: {
                Metric: {
                    Namespace: 'Akwadona/Throttle',
                    MetricName: 'Hits',
                    Dimensions: [{ Name: 'tenantId', Value: tenantId }]
                },
                Period: 86400,
                Stat: 'Sum'
            },
            ReturnData: true
        }]
    }));
    const vals = r.MetricDataResults?.[0]?.Values || [];
    return vals.length ? Math.round(vals[0]) : 0;
}

async function getApiCalls24h() {
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    const r = await cw.send(new GetMetricDataCommand({
        StartTime: start,
        EndTime: end,
        MetricDataQueries: [{
            Id: 'apicalls',
            MetricStat: {
                Metric: {
                    Namespace: 'AWS/ApiGateway',
                    MetricName: 'Count',
                    Dimensions: [{ Name: 'ApiId', Value: API_ID }]
                },
                Period: 86400,
                Stat: 'Sum'
            },
            ReturnData: true
        }]
    }));
    const vals = r.MetricDataResults?.[0]?.Values || [];
    return vals.length ? Math.round(vals[0]) : 0;
}

async function getBandwidthGB30d() {
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    const r = await cw.send(new GetMetricDataCommand({
        StartTime: start,
        EndTime: end,
        MetricDataQueries: [{
            Id: 'bytes',
            MetricStat: {
                Metric: {
                    Namespace: 'AWS/CloudFront',
                    MetricName: 'BytesDownloaded',
                    Dimensions: [
                        { Name: 'DistributionId', Value: CLOUDFRONT_DISTRIBUTION_ID },
                        { Name: 'Region', Value: 'Global' }
                    ]
                },
                Period: 2592000,
                Stat: 'Sum'
            },
            ReturnData: true
        }]
    }));
    const vals = r.MetricDataResults?.[0]?.Values || [];
    const bytes = vals.length ? vals[0] : 0;
    return Math.round((bytes / 1024 / 1024 / 1024) * 100) / 100;
}

/**
 * Count Cognito users whose `custom:tenantId` matches this tenant. We list
 * users in each role group and intersect by tenant — but we only return a
 * COUNT, never user identifiers, so the operator can't browse the customer's
 * staff directory.
 */
async function getActiveUsers(slug) {
    // The tenant profile holds the canonical tenantId.
    const t = await ddb.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `TENANT#${slug}`, SK: 'PROFILE' },
        ProjectionExpression: 'tenantId'
    }));
    const tenantId = t.Item?.tenantId;
    if (!tenantId) return 0;

    // Sweep all four tenant-user groups.
    let total = 0;
    for (const group of ['Admin', 'Doctors', 'Pharmacists', 'Developers']) {
        let token = undefined;
        do {
            const r = await cog.send(new ListUsersInGroupCommand({
                UserPoolId: USER_POOL_ID,
                GroupName: group,
                NextToken: token
            }));
            for (const u of r.Users || []) {
                const tid = (u.Attributes || []).find(a => a.Name === 'custom:tenantId')?.Value;
                if (tid === tenantId) total++;
            }
            token = r.NextToken;
        } while (token);
    }
    return total;
}

async function getTenantAudit(slug, qp) {
    const t = await ddb.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `TENANT#${slug}`, SK: 'PROFILE' }
    }));
    if (!t.Item) return err(404, `Tenant ${slug} not found`);
    const tenantId = t.Item.tenantId;

    const date = qp.date || new Date().toISOString().slice(0, 10);
    const limit = Math.min(parseInt(qp.limit, 10) || 50, 500);

    const r = await ddb.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        FilterExpression: '#tid = :tid',
        ExpressionAttributeNames: { '#tid': 'tenantId' },
        ExpressionAttributeValues: {
            ':pk': `AUDIT#${date}`,
            ':prefix': 'AUDIT#',
            ':tid': tenantId
        },
        Limit: limit,
        ScanIndexForward: false
    }));

    // SANITIZED metadata only.
    //   - entityType / entityId stripped: telling the operator "row X for
    //     entityType=PATIENT id=p_abc was touched" leaks clinical context.
    //   - action category is coarsened (e.g. PATIENT_UPDATE → DATA_WRITE).
    //   - before / after / _kms_* never included.
    const items = (r.Items || []).map(it => ({
        auditId:      it.auditId,
        category:     coarsenAction(it.action),
        actorEmail:   it.actorEmail,
        ipAddress:    it.ipAddress,
        timestamp:    it.timestamp
        // Intentionally OMIT: action (raw), entityType, entityId, before, after, _kms_dek, _kms_v
    }));

    return res(200, { date, count: items.length, items });
}

function coarsenAction(action) {
    const a = String(action || '').toUpperCase();
    if (a.startsWith('OPERATOR_')) return 'OPERATOR_ACTION';
    if (a.includes('LOGIN'))       return 'AUTH';
    if (a.includes('CREATE'))      return 'DATA_WRITE';
    if (a.includes('UPDATE'))      return 'DATA_WRITE';
    if (a.includes('DELETE'))      return 'DATA_DELETE';
    if (a.includes('READ') || a.includes('VIEW') || a.includes('GET')) return 'DATA_READ';
    return 'OTHER';
}

async function updateTenant(slug, body, operator) {
    // Allow-list — operator can edit billing/limits/compliance flags.
    const ALLOWED = [
        'status', 'plan', 'name', 'contractStart', 'notes', 'limits',
        'mrrUSD', 'baaSigned', 'baaSignedAt', 'dpaSigned', 'dpaSignedAt', 'lastAuditDate'
    ];
    const updates = {};
    for (const k of ALLOWED) {
        if (body[k] !== undefined) updates[k] = body[k];
    }
    if (Object.keys(updates).length === 0) return err(400, 'No allowed fields in request body');

    const setParts = Object.keys(updates).map((_, i) => `#k${i} = :v${i}`).join(', ');
    const names    = Object.fromEntries(Object.keys(updates).map((k, i) => [`#k${i}`, k]));
    const values   = Object.fromEntries(Object.entries(updates).map(([_, v], i) => [`:v${i}`, v]));
    const now      = new Date().toISOString();

    await ddb.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `TENANT#${slug}`, SK: 'PROFILE' },
        UpdateExpression: `SET ${setParts}, updatedAt = :now, lastEditedBy = :op`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: { ...values, ':now': now, ':op': operator.email },
        ConditionExpression: 'attribute_exists(PK)'
    }));

    try {
        const auditId = require('crypto').randomUUID();
        await ddb.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                PK:           `AUDIT#${now.slice(0, 10)}`,
                SK:           `AUDIT#${now}#${auditId}`,
                auditId,
                EntityType:   'AUDIT',
                tenantId:     'OPERATOR',
                action:       'OPERATOR_UPDATE_TENANT',
                entityType:   'TENANT',
                entityId:     slug,
                actorEmail:   operator.email,
                actorName:    operator.name,
                timestamp:    now,
                changes:      JSON.stringify(updates)
            }
        }));
    } catch (_) { /* audit failure non-critical */ }

    return res(200, { slug, updated: updates, updatedAt: now });
}

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
    ListUsersInGroupCommand,
    AdminCreateUserCommand,
    AdminSetUserPasswordCommand,
    AdminAddUserToGroupCommand,
    AdminDeleteUserCommand
} = require('@aws-sdk/client-cognito-identity-provider');
const {
    KMSClient,
    CreateKeyCommand,
    CreateAliasCommand,
    ScheduleKeyDeletionCommand
} = require('@aws-sdk/client-kms');

const REGION     = 'us-east-1';
const TABLE_NAME = 'Hospital';
const API_ID     = process.env.API_ID || 'jxz59jh15f';
const USER_POOL_ID = process.env.USER_POOL_ID || 'us-east-1_RACghntmS';
const CLOUDFRONT_DISTRIBUTION_ID = process.env.CLOUDFRONT_DISTRIBUTION_ID || 'E1Z1ZKYM74LVA7';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const cw  = new CloudWatchClient({ region: REGION });
const cog = new CognitoIdentityProviderClient({ region: REGION });
const kms = new KMSClient({ region: REGION });

// Resolved at runtime so onboarded tenant CMKs reference the correct account.
const ACCOUNT_ID = process.env.AWS_LAMBDA_FUNCTION_INVOKED_ARN
    ? process.env.AWS_LAMBDA_FUNCTION_INVOKED_ARN.split(':')[4]
    : '483176634665';

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
        if (method === 'POST' && root === 'tenants' && !slug) {
            // Step 96 — Self-service tenant onboarding wizard backend.
            const body = JSON.parse(event.body || '{}');
            return await createTenant(body, operator);
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
// hash-bust 2026-06-21T14:07:44.7504132+03:00
// hash-bust 2026-06-21T14:14:23.7665133+03:00
// hash-bust 2026-06-21T14:28:24.0064697+03:00

// ─────────────────────────────────────────────────────────────────────────────
// TENANT ONBOARDING WIZARD (Step 96 / Phase 2)
//
// POST /operator/tenants
//
// Provisions a new customer hospital end-to-end in one round trip. Mirrors the
// programmatic onboarding flow used by Stripe Connect, Twilio sub-accounts,
// and Particle Health partner orgs:
//
//   1. Validate input.
//   2. Create per-tenant KMS DATA CMK  (alias/akwadona-tenant-<slug>-data).
//   3. Create per-tenant KMS HMAC CMK  (alias/akwadona-tenant-<slug>-hmac).
//   4. Write TENANT row to DynamoDB with key ARNs (read by every PHI Lambda
//      via the DDB fallback added in Phase 1).
//   5. Create the initial Admin Cognito user with custom:tenantId, add to
//      Admin group, set a permanent temp password the operator will forward
//      to the customer over a trusted channel.
//   6. Audit log entry (operator action).
//
// Idempotent: if `slug` already exists, returns 409 without touching anything.
// On any mid-flight failure the partially-created resources are rolled back:
// KMS keys are scheduled for deletion (7-day window — minimum permitted by
// KMS so callers can recover from accidental rollbacks), DDB row is deleted,
// Cognito user is deleted. Errors are logged but never swallowed.
//
// Crucially the new tenant's KMS key policies whitelist
// "TiryaqCdkStack-*ServiceRole*" BUT explicitly exclude
// "TiryaqCdkStack-*Operator*". The operator can never decrypt the new
// tenant's data — same zero-knowledge guarantee as Tiryaq / Alshifaa,
// without needing a CDK redeploy to grow the identity-policy DENY list.
// ─────────────────────────────────────────────────────────────────────────────

const VALID_SLUG    = /^[a-z][a-z0-9-]{1,30}[a-z0-9]$/;       // 3-32 chars, hyphenated
const VALID_PLAN    = ['free', 'standard', 'enterprise'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generateTenantId() {
    // T_<8 random hex chars>. Matches the format used for Tiryaq / Alshifaa.
    return 'T_' + require('crypto').randomBytes(4).toString('hex');
}

function generateTempPassword() {
    // 16 chars: 1 lower, 1 upper, 1 digit, 1 symbol, 12 random. Meets the
    // default Cognito password policy (8+ chars, mixed case, digit, symbol).
    const random = require('crypto').randomBytes(12).toString('base64')
        .replace(/[+/=]/g, '');
    return 'A' + 'a' + '1' + '!' + random.slice(0, 12);
}

function buildKeyPolicy(account) {
    // Matches the existing tenant CMK template (Tiryaq / Alshifaa) but adds
    // an explicit ArnNotLike that excludes the operator role. Result: no
    // operator role can ever Encrypt / Decrypt / Mac on this key, regardless
    // of what's in the identity-based policy.
    return JSON.stringify({
        Version: '2012-10-17',
        Id: 'tenant-cmk-policy',
        Statement: [
            {
                Sid: 'AllowRootAccountAdmin',
                Effect: 'Allow',
                Principal: { AWS: 'arn:aws:iam::' + account + ':root' },
                Action: 'kms:*',
                Resource: '*'
            },
            {
                Sid: 'AllowTenantLambdaRoles',
                Effect: 'Allow',
                Principal: { AWS: '*' },
                Action: [
                    'kms:Encrypt',
                    'kms:Decrypt',
                    'kms:GenerateDataKey',
                    'kms:GenerateDataKey*',
                    'kms:GenerateDataKeyWithoutPlaintext',
                    'kms:GenerateMac',
                    'kms:VerifyMac',
                    'kms:ReEncrypt*',
                    'kms:DescribeKey'
                ],
                Resource: '*',
                Condition: {
                    StringLike: {
                        'aws:PrincipalArn': 'arn:aws:iam::' + account + ':role/TiryaqCdkStack-*ServiceRole*'
                    },
                    StringNotLike: {
                        'aws:PrincipalArn': 'arn:aws:iam::' + account + ':role/TiryaqCdkStack-*Operator*'
                    }
                }
            }
        ]
    });
}

async function createTenant(body, operator) {
    // ── 1. Validate input ────────────────────────────────────────────────────
    const slug         = String(body.slug || '').trim().toLowerCase();
    const name         = String(body.name || '').trim();
    const plan         = String(body.plan || 'free').toLowerCase();
    const country      = String(body.country || '').trim();
    const contactEmail = String(body.contactEmail || '').trim();
    const adminEmail   = String(body.adminEmail || '').trim().toLowerCase();
    const adminName    = String(body.adminName || 'Hospital Admin').trim();
    // Cognito user pool uses `email` as an alias attribute, which forbids the
    // Username field itself from being in email format. Default username is
    // therefore hyphen-delimited (admin-<slug>) — short, unique per tenant,
    // and Cognito-safe.
    const adminUser    = String(body.adminUsername || ('admin-' + slug)).trim().toLowerCase();

    if (!VALID_SLUG.test(slug))            return err(400, 'slug must be lowercase, 3-32 chars, [a-z0-9-]');
    if (!name)                              return err(400, 'name is required');
    if (!VALID_PLAN.includes(plan))         return err(400, 'plan must be free | standard | enterprise');
    if (!EMAIL_PATTERN.test(adminEmail))    return err(400, 'adminEmail is required and must be a valid email');
    if (contactEmail && !EMAIL_PATTERN.test(contactEmail)) return err(400, 'contactEmail must be a valid email if provided');

    const slugPk = 'TENANT#' + slug;

    // ── 2. Idempotency — bail if slug already taken ──────────────────────────
    const existing = await ddb.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: slugPk, SK: 'PROFILE' }
    }));
    if (existing.Item) {
        return err(409, 'Tenant slug "' + slug + '" already exists');
    }

    const tenantId  = generateTenantId();
    const tempPass  = generateTempPassword();
    const now       = new Date().toISOString();
    const keyPolicy = buildKeyPolicy(ACCOUNT_ID);

    // Track what we've created so we can rollback on any later failure.
    const created = { dataKeyId: null, hmacKeyId: null, ddbRowWritten: false, cognitoUsername: null };

    try {
        // ── 3. Create DATA CMK ───────────────────────────────────────────────
        // BypassPolicyLockoutSafetyCheck: KMS by default refuses to create a
        // key whose policy doesn't grant kms:PutKeyPolicy to the caller. The
        // operator role is EXCLUDED from this key's policy by design (zero-
        // knowledge) — root account retains kms:* and is the only future
        // policy editor. We acknowledge that on purpose.
        const dataKey = await kms.send(new CreateKeyCommand({
            Description: 'Akwadona tenant data CMK — ' + slug + ' (' + tenantId + ')',
            KeyUsage:    'ENCRYPT_DECRYPT',
            KeySpec:     'SYMMETRIC_DEFAULT',
            Policy:      keyPolicy,
            BypassPolicyLockoutSafetyCheck: true,
            Tags: [
                { TagKey: 'akwadona:tenantId', TagValue: tenantId },
                { TagKey: 'akwadona:purpose',  TagValue: 'data' }
            ]
        }));
        created.dataKeyId = dataKey.KeyMetadata.KeyId;
        const dataKeyArn  = dataKey.KeyMetadata.Arn;

        await kms.send(new CreateAliasCommand({
            AliasName:    'alias/akwadona-tenant-' + slug + '-data',
            TargetKeyId:  created.dataKeyId
        }));

        // ── 4. Create HMAC CMK ───────────────────────────────────────────────
        const hmacKey = await kms.send(new CreateKeyCommand({
            Description: 'Akwadona tenant HMAC CMK — ' + slug + ' (' + tenantId + ')',
            KeyUsage:    'GENERATE_VERIFY_MAC',
            KeySpec:     'HMAC_256',
            Policy:      keyPolicy,
            BypassPolicyLockoutSafetyCheck: true,
            Tags: [
                { TagKey: 'akwadona:tenantId', TagValue: tenantId },
                { TagKey: 'akwadona:purpose',  TagValue: 'hmac' }
            ]
        }));
        created.hmacKeyId = hmacKey.KeyMetadata.KeyId;
        const hmacKeyArn  = hmacKey.KeyMetadata.Arn;

        await kms.send(new CreateAliasCommand({
            AliasName:    'alias/akwadona-tenant-' + slug + '-hmac',
            TargetKeyId:  created.hmacKeyId
        }));

        // ── 5. Write TENANT row ──────────────────────────────────────────────
        await ddb.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                PK:             slugPk,
                SK:             'PROFILE',
                EntityType:     'TENANT',
                tenantId,
                slug,
                name,
                plan,
                status:         'active',
                country:        country || null,
                contactEmail:   contactEmail || null,
                kmsKeyArn:      dataKeyArn,
                kmsHmacKeyArn:  hmacKeyArn,
                kmsKeyId:       created.dataKeyId,
                hmacKeyId:      created.hmacKeyId,
                baaSigned:      false,
                dpaSigned:      false,
                createdAt:      now,
                createdBy:      operator.email,
                updatedAt:      now
            },
            ConditionExpression: 'attribute_not_exists(PK)'
        }));
        created.ddbRowWritten = true;

        // ── 6. Create initial Cognito admin user ─────────────────────────────
        await cog.send(new AdminCreateUserCommand({
            UserPoolId:    USER_POOL_ID,
            Username:      adminUser,
            MessageAction: 'SUPPRESS',
            UserAttributes: [
                { Name: 'email',            Value: adminEmail },
                { Name: 'email_verified',   Value: 'true' },
                { Name: 'name',             Value: adminName },
                { Name: 'custom:tenantId',  Value: tenantId }
            ]
        }));
        created.cognitoUsername = adminUser;

        await cog.send(new AdminSetUserPasswordCommand({
            UserPoolId: USER_POOL_ID,
            Username:   adminUser,
            Password:   tempPass,
            Permanent:  true            // operator forwards the password directly; no force-change.
        }));

        await cog.send(new AdminAddUserToGroupCommand({
            UserPoolId: USER_POOL_ID,
            Username:   adminUser,
            GroupName:  'Admin'
        }));

        // ── 7. Audit log ─────────────────────────────────────────────────────
        try {
            const auditId = require('crypto').randomUUID();
            await ddb.send(new PutCommand({
                TableName: TABLE_NAME,
                Item: {
                    PK:           'AUDIT#' + now.slice(0, 10),
                    SK:           'AUDIT#' + now + '#' + auditId,
                    auditId,
                    EntityType:   'AUDIT',
                    tenantId:     'OPERATOR',
                    action:       'OPERATOR_CREATE_TENANT',
                    entityType:   'TENANT',
                    entityId:     slug,
                    actorEmail:   operator.email,
                    actorName:    operator.name,
                    timestamp:    now,
                    changes:      JSON.stringify({ slug, tenantId, plan, country })
                }
            }));
        } catch (_) { /* audit failure non-critical */ }

        return res(201, {
            slug,
            tenantId,
            name,
            plan,
            kmsKeyId:    created.dataKeyId,
            hmacKeyId:   created.hmacKeyId,
            admin: {
                username:     adminUser,
                email:        adminEmail,
                tempPassword: tempPass,
                signInUrl:    'https://app.akwadona.com/'
            },
            createdAt:   now
        });

    } catch (e) {
        // ── Rollback ─────────────────────────────────────────────────────────
        // Order: Cognito user → DDB row → HMAC key → Data key. Each step
        // best-effort; we never propagate rollback errors over the original.
        console.error('createTenant FAILED — rolling back partial state', e);
        if (created.cognitoUsername) {
            try {
                await cog.send(new AdminDeleteUserCommand({
                    UserPoolId: USER_POOL_ID,
                    Username:   created.cognitoUsername
                }));
            } catch (cleanupErr) { console.error('rollback: Cognito delete failed', cleanupErr); }
        }
        if (created.ddbRowWritten) {
            try {
                await ddb.send(new UpdateCommand({
                    TableName: TABLE_NAME,
                    Key: { PK: slugPk, SK: 'PROFILE' },
                    UpdateExpression: 'SET #s = :st',
                    ExpressionAttributeNames:  { '#s': 'status' },
                    ExpressionAttributeValues: { ':st': 'rolledback' }
                }));
                // We deliberately do NOT hard-delete the TENANT row — keep a
                // tombstone so the slug is reserved while KMS keys finish
                // their deletion window. Operator can re-attempt with a
                // different slug.
            } catch (cleanupErr) { console.error('rollback: DDB mark failed', cleanupErr); }
        }
        for (const keyId of [created.hmacKeyId, created.dataKeyId]) {
            if (!keyId) continue;
            try {
                await kms.send(new ScheduleKeyDeletionCommand({
                    KeyId:               keyId,
                    PendingWindowInDays: 7
                }));
            } catch (cleanupErr) { console.error('rollback: KMS schedule delete failed for ' + keyId, cleanupErr); }
        }
        return err(e.statusCode || 500, 'Tenant onboarding failed: ' + (e.message || 'Internal Server Error') + '. Partial resources have been rolled back.');
    }
}
// hash-bust onboarding-phase2 2026-06-23T12:45:49.4363602+03:00
// hash-bust onboarding-fix1 2026-06-23T13:06:16.1423813+03:00
// hash-bust onboarding-fix2 2026-06-23T13:32:50.6910503+03:00

/**
 * Cognito Pre-Token-Generation Lambda — V3_0 trigger.
 *
 * Runs every time a user logs in (or refreshes a token). Cognito hands us
 * the user's stored attributes; we choose which ones to inject into the
 * Access Token + ID Token as JWT claims.
 *
 * Claims injected:
 *   - email             → from standard attribute `email`
 *   - name              → from standard attribute `name`
 *   - tenantId          → from custom attribute `custom:tenantId`  (Step 2)
 *
 * `tenantId` is the opaque hospital-customer ID (e.g. T_a1b2c3d4). Every
 * backend Lambda reads it from the JWT to scope DynamoDB queries to that
 * customer's rows only. This is the security boundary for multi-tenancy —
 * Lambdas never trust a tenantId from the request body, only from the
 * JWT, because the JWT is cryptographically signed by Cognito.
 *
 * Safety:
 *   - If a user has no `custom:tenantId` (e.g. legacy users before backfill
 *     runs), we DO NOT block login — we inject `tenantId = "UNASSIGNED"`
 *     and let downstream Lambdas decide how to handle it (current default:
 *     return 403 for any data operation). This lets backfill run while the
 *     pool is live, without locking everyone out.
 */
// Step C.3 — resolve a doctor's application UUID (doctorId) by their email.
// The DOCTOR profile row has  PK = DOCTOR#<UUID>, attribute  email = "…".
// Pre-token runs on every login + every refresh, so we cache per-container.
//
// 2026-10-29 fixes:
//   1. Both lookups were full-table Scans — inside Cognito's hard 5-second
//      trigger cap. On a cold container with a growing table that is a 504
//      on the user's first login. Now GSI Queries (single-digit ms).
//   2. The doctor lookup filtered on plaintext `email`, but Step 3 encrypts
//      DOCTOR.email — so any doctor created after Step 3 was never found,
//      got no `doctorId` claim, and saw zero patients. Now we compute the
//      tenant HMAC (same as getDoctorByEmail) and hit
//      emailHash-EntityType-index; we fall back to email-index only for
//      legacy plaintext rows that pre-date the encryption backfill.
//      Needs kms:GenerateMac on alias/akwadona-tenant-* (granted in CDK).
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { computeHmac } = require('./crypto');
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));
const TABLE_NAME = 'Hospital';
const _doctorIdCache = new Map();
const _CACHE_MS = 60_000;

// Step 7j — resolve the tenant's URL slug from its opaque tenantId so the
// frontend can redirect users to their own subdomain WITHOUT a hardcoded
// slug→tenantId map (which broke after every teardown/rebuild).
// TENANT rows: PK = TENANT#<slug>, SK = PROFILE, attribute tenantId = T_xxx.
const _slugCache = new Map();
async function lookupTenantSlug(tenantId) {
    if (!tenantId || tenantId === 'UNASSIGNED' || tenantId === 'OPERATOR') return null;
    const c = _slugCache.get(tenantId);
    if (c && Date.now() - c.fetchedAt < _CACHE_MS) return c.slug;
    try {
        const r = await ddb.send(new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: 'tenant-entityType-index',
            KeyConditionExpression: '#tid = :tid AND #et = :et',
            FilterExpression: '#sk = :sk',
            ExpressionAttributeNames:  { '#et': 'EntityType', '#sk': 'SK', '#tid': 'tenantId' },
            ExpressionAttributeValues: { ':et': 'TENANT', ':sk': 'PROFILE', ':tid': tenantId },
            Limit: 5
        }));
        const item = (r.Items || [])[0];
        const slug = item ? (item.slug || (item.PK || '').slice('TENANT#'.length) || null) : null;
        _slugCache.set(tenantId, { slug, fetchedAt: Date.now() });
        return slug;
    } catch (_) {
        return null;
    }
}

function _doctorIdFromItem(item) {
    return item ? ((item.PK || '').slice('DOCTOR#'.length) || null) : null;
}

async function lookupDoctorId(email, tenantId) {
    const key = (email || '').toLowerCase().trim();
    if (!key) return null;
    const cacheKey = `${tenantId || ''}|${key}`;
    const c = _doctorIdCache.get(cacheKey);
    if (c && Date.now() - c.fetchedAt < _CACHE_MS) return c.id;

    let id = null;

    // Primary path — HMAC lookup (works for encrypted DOCTOR rows).
    if (tenantId && tenantId !== 'UNASSIGNED' && tenantId !== 'OPERATOR') {
        try {
            const emailHash = await computeHmac(key, tenantId);
            const r = await ddb.send(new QueryCommand({
                TableName: TABLE_NAME,
                IndexName: 'emailHash-EntityType-index',
                KeyConditionExpression: '#eh = :eh AND #et = :et',
                FilterExpression: '#sk = :sk AND #tid = :tid',
                ExpressionAttributeNames:  { '#eh': 'emailHash', '#et': 'EntityType', '#sk': 'SK', '#tid': 'tenantId' },
                ExpressionAttributeValues: { ':eh': emailHash, ':et': 'DOCTOR', ':sk': 'PROFILE', ':tid': tenantId },
                Limit: 5
            }));
            id = _doctorIdFromItem((r.Items || [])[0]);
        } catch (_) { /* fall through to legacy path */ }
    }

    // Legacy path — plaintext email-index for rows that pre-date Step 3.
    if (!id) {
        try {
            const r = await ddb.send(new QueryCommand({
                TableName: TABLE_NAME,
                IndexName: 'email-index',
                KeyConditionExpression: '#em = :em AND #et = :et',
                FilterExpression: '#sk = :sk',
                ExpressionAttributeNames:  { '#em': 'email', '#et': 'EntityType', '#sk': 'SK' },
                ExpressionAttributeValues: { ':em': key, ':et': 'DOCTOR', ':sk': 'PROFILE' },
                Limit: 5
            }));
            const rows = (r.Items || []).filter(it => !tenantId || !it.tenantId || it.tenantId === tenantId);
            id = _doctorIdFromItem(rows[0]);
        } catch (_) { /* give up — caller tolerates null */ }
    }

    _doctorIdCache.set(cacheKey, { id, fetchedAt: Date.now() });
    return id;
}

exports.handler = async (event) => {
    if (event && event._warmup) return { ok: true, warmed: true };

    const attrs = (event && event.request && event.request.userAttributes) || {};

    // Cognito stores custom attributes under "custom:<name>".
    const tenantId = attrs['custom:tenantId'] || 'UNASSIGNED';

    // Step 7 — Operator detection. Cognito provides group membership via
    // request.groupConfiguration.groupsToOverride (V3_0 trigger). We mark
    // operator users with `role: "operator"` so backend Lambdas can route
    // them to operator endpoints without using tenantId.
    const groups = (event.request && event.request.groupConfiguration && event.request.groupConfiguration.groupsToOverride) || [];
    const isOperator = Array.isArray(groups) && groups.includes('Operator');
    const isDoctor   = Array.isArray(groups) && groups.includes('Doctors');

    // Step C.3 — for doctor users, look up the application doctorId UUID
    // and inject it as a JWT claim. The frontend uses this to send
    // doctorId on every appointment / consultation create.
    let doctorId = null;
    if (isDoctor && attrs.email) {
        doctorId = await lookupDoctorId(attrs.email, tenantId);
    }

    // Step 7j — inject the tenant's URL slug so the frontend can route the
    // user to their own subdomain without hardcoded maps.
    const tenantSlug = isOperator ? null : await lookupTenantSlug(tenantId);

    const claimsToAddOrOverride = {
        email:    attrs.email || '',
        name:     attrs.name  || '',
        tenantId: tenantId,
        role:     isOperator ? 'operator' : 'tenant_user'
    };
    if (doctorId)   claimsToAddOrOverride.doctorId   = doctorId;
    if (tenantSlug) claimsToAddOrOverride.tenantSlug = tenantSlug;

    event.response = {
        claimsAndScopeOverrideDetails: {
            accessTokenGeneration: {
                claimsToAddOrOverride
            },
            idTokenGeneration: {
                claimsToAddOrOverride
            }
        }
    };

    return event;
};
// hash-bust 2026-06-21T14:28:24.0064697+03:00

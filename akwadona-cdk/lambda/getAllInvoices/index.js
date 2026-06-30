const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
// Step 2g — per-tenant rate limit.
const throttle = require('./throttle');

const client = new DynamoDBClient({ region: 'us-east-1' });
const ddb = DynamoDBDocumentClient.from(client);

const TABLE = 'Hospital';
const GSI   = 'doctorEmail-createdAt-index';

// ── Tenant enforcement (Step 2d) ─────────────────────────────────────────────
function getTenant(event) {
  const claims = (event && event.requestContext && event.requestContext.authorizer
                  && (event.requestContext.authorizer.jwt
                      ? event.requestContext.authorizer.jwt.claims
                      : event.requestContext.authorizer.claims))
              || {};
  const tenantId = claims.tenantId || claims['custom:tenantId'];
  if (!tenantId || tenantId === 'UNASSIGNED') {
    const e = new Error('Tenant not assigned for this user');
    e.statusCode = 403;
    throw e;
  }
  return tenantId;
}

const encodeLEK = (obj) => obj ? Buffer.from(JSON.stringify(obj)).toString('base64') : null;
const decodeLEK = (s)   => s   ? JSON.parse(Buffer.from(s, 'base64').toString('utf8')) : undefined;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// Identify the caller from the JWT so invoice scoping is enforced server-side
// (never trust the client to pass its own doctorEmail filter).
function getCaller(event) {
    const claims = event.requestContext?.authorizer?.jwt?.claims
                || event.requestContext?.authorizer?.claims || {};
    const groupsRaw = claims['cognito:groups'] || '';
    const groups = Array.isArray(groupsRaw)
        ? groupsRaw
        : String(groupsRaw).trim().replace(/^\[/, '').replace(/\]$/, '').split(/[,\s]+/).filter(Boolean);
    return {
        email:    (claims['email'] || claims['username'] || '').toLowerCase().trim(),
        isAdmin:  groups.some(g => ['Admin', 'admin', 'Developers', 'Developer', 'developer'].includes(g.trim())),
        isDoctor: groups.some(g => ['Doctors', 'Doctor', 'doctor'].includes(g.trim()))
    };
}

exports.handler = async (event) => {
    if (event && event._warmup) return { ok: true, warmed: true };

    let tenantId;
    try { tenantId = getTenant(event); }
    catch (e) { return { statusCode: e.statusCode || 403, body: JSON.stringify({ message: e.message }) }; }
  // Step 2g — per-tenant throttle.
  {
    const __role = (event.requestContext?.authorizer?.jwt?.claims || {}).role || 'tenant_user';
    const __tid = (typeof tenantId !== 'undefined') ? tenantId : (event.requestContext?.authorizer?.jwt?.claims || {}).tenantId;
    const __limitResponse = await throttle.precheck(event, { tenantId: __tid, role: __role });
    if (__limitResponse) return __limitResponse;
  }


    try {
        const q        = event.queryStringParameters || {};
        const caller   = getCaller(event);
        const pageSize = clamp(parseInt(q.pageSize, 10) || 100, 1, 500);
        const lastKey  = decodeLEK(q.lastKey || null);

        // Scoping rule:
        //   Doctor (not admin/dev) → FORCE doctorEmail to the caller's own email,
        //                            ignoring any client-supplied value.
        //   Admin / Developer      → optional ?doctorEmail= filter, else see all.
        let doctorEmail;
        if (caller.isDoctor && !caller.isAdmin) {
            doctorEmail = caller.email;
        } else {
            doctorEmail = q.doctorEmail ? q.doctorEmail.toLowerCase().trim() : null;
        }

        let items = [];
        let lastEvaluatedKey;

        if (doctorEmail) {
            // ── Doctor role: query GSI by doctorEmail + tenant filter ──
            const result = await ddb.send(new QueryCommand({
                TableName:                 TABLE,
                IndexName:                 GSI,
                KeyConditionExpression:    'doctorEmail = :email',
                FilterExpression:          'EntityType = :type AND #__tid = :__tid',
                ExpressionAttributeNames:  { '#__tid': 'tenantId' },
                ExpressionAttributeValues: { ':email': doctorEmail, ':type': 'PAYMENT', ':__tid': tenantId },
                ExclusiveStartKey:         lastKey,
                ScanIndexForward:          false
            }));
            items            = result.Items || [];
            lastEvaluatedKey = result.LastEvaluatedKey;

        } else {
            // ── Admin role: per-tenant GSI scoped to tenantId + PAYMENT ──
            const result = await ddb.send(new QueryCommand({
                TableName:                 TABLE,
                IndexName:                 'tenant-entityType-index',
                KeyConditionExpression:    'tenantId = :tid AND EntityType = :type',
                ExpressionAttributeValues: { ':tid': tenantId, ':type': 'PAYMENT' },
                Limit:                     pageSize,
                ExclusiveStartKey:         lastKey,
                ScanIndexForward:          false
            }));
            items            = result.Items || [];
            lastEvaluatedKey = result.LastEvaluatedKey;
        }

        // Defence-in-depth — drop any row missing tenantId or mismatched.
        items = items.filter(i => i.tenantId === tenantId);

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data:    items,
                count:   items.length,
                lastKey: encodeLEK(lastEvaluatedKey),
                hasMore: !!lastEvaluatedKey
            })
        };

    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to fetch invoices.', error: err.message })
        };
    }
};// hash-bust 2026-06-21T14:28:24.0064697+03:00

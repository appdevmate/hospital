const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

// Step 3 — PHI envelope decryption. ./crypto.js synced from _shared/.
const { decryptItem, DOCTOR_PHI_FIELDS } = require('./crypto');
// Step 2g — per-tenant rate limit.
const throttle = require('./throttle');

const REGION = 'us-east-1';
const TABLE = 'Hospital';
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

const hdrs = { 'access-control-allow-origin': '*', 'access-control-allow-credentials': 'true' };

// ── Tenant enforcement (Step 2d) — inlined from _shared/tenant.js ──
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

function extractId(raw) {
  if (!raw) return '';
  const s = decodeURIComponent(String(raw)).trim();
  const i = s.indexOf('#');
  return i >= 0 ? s.slice(i + 1) : s;
}

function isSoftDeleted(item) {
  const d = item?.deletedAt;
  return !(d === undefined || d === null || d === '' || d === 'null');
}

exports.handler = async (event) => {
  if (event && event._warmup) return { ok: true, warmed: true };

  let tenantId;
  try { tenantId = getTenant(event); }
  catch (e) { return { statusCode: e.statusCode || 403, headers: hdrs, body: JSON.stringify({ message: e.message }) }; }
  // Step 2g — per-tenant throttle.
  {
    const __role = (event.requestContext?.authorizer?.jwt?.claims || {}).role || 'tenant_user';
    const __tid = (typeof tenantId !== 'undefined') ? tenantId : (event.requestContext?.authorizer?.jwt?.claims || {}).tenantId;
    const __limitResponse = await throttle.precheck(event, { tenantId: __tid, role: __role });
    if (__limitResponse) return __limitResponse;
  }


  try {
    const id = extractId(
      event?.pathParameters?.doctorID ??
      event?.pathParameters?.doctorId ??
      event?.pathParameters?.id
    );
    if (!id) return { statusCode: 400, headers: hdrs, body: JSON.stringify({ message: 'Missing doctor id' }) };

    const { Item } = await ddb.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `DOCTOR#${id}`, SK: 'PROFILE' }
    }));

    // Step 2d: cross-tenant → 404, never disclose existence.
    if (!Item || Item.EntityType !== 'DOCTOR' || Item.tenantId !== tenantId || isSoftDeleted(Item)) {
      return { statusCode: 404, headers: hdrs, body: JSON.stringify({ message: 'Doctor not found' }) };
    }

    // Step 3 — decrypt PHI fields before returning.
    await decryptItem(Item, DOCTOR_PHI_FIELDS, tenantId);

    const { PK, SK, EntityType, ...attrs } = Item;

    return {
      statusCode: 200,
      headers: hdrs,
      body: JSON.stringify({
        message: 'Doctor retrieved',
        data: { id, ...attrs }
      })
    };
  } catch (err) {
    if (err?.name === 'AccessDeniedException') {
      return { statusCode: 500, headers: hdrs, body: JSON.stringify({ message: 'Access denied (GetItem)' }) };
    }
    if (err?.name === 'ResourceNotFoundException') {
      return { statusCode: 500, headers: hdrs, body: JSON.stringify({ message: 'Table not found' }) };
    }
    return { statusCode: 500, headers: hdrs, body: JSON.stringify({ message: 'Internal Server Error' }) };
  }
};
// hash-bust 2026-06-21T14:28:24.0064697+03:00

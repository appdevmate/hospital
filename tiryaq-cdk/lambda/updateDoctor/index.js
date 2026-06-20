const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

// Step 3 — PHI envelope encryption. ./crypto.js synced from _shared/.
// Step 4 — also import stampHashes + DOCTOR_HASH_FIELDS to refresh
// qidHash / emailHash / phoneHash whenever the source field changes.
const { encryptItem, decryptItem, stampHashes, DOCTOR_PHI_FIELDS, DOCTOR_HASH_FIELDS } = require('./crypto');
// Step 2g — per-tenant rate limit.
const throttle = require('./throttle');

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));
const TABLE = 'Hospital';
const toLower = (v) => (typeof v === 'string' ? v.toLowerCase() : v ?? null);

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

// ── Idempotency (Phase D) ────────────────────────────────────────────────────
function getClientRequestId(event) {
  const h = event.headers || {};
  return h['x-client-request-id'] || h['X-Client-Request-Id'] || null;
}
async function checkIdempotency(cid) {
  if (!cid) return null;
  try {
    const r = await dynamo.send(new GetCommand({ TableName: TABLE, Key: { PK: `IDEMP#${cid}`, SK: 'PROFILE' } }));
    if (r.Item && r.Item.response) return JSON.parse(r.Item.response);
  } catch (_) {}
  return null;
}
async function storeIdempotency(cid, response) {
  if (!cid) return;
  try {
    await dynamo.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `IDEMP#${cid}`, SK: 'PROFILE', EntityType: 'IDEMPOTENCY',
        clientRequestId: cid, response: JSON.stringify(response),
        dataClass: 'SYSTEM',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: Math.floor(Date.now() / 1000) + 86400
      }
    }));
  } catch (_) {}
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


  const cid = getClientRequestId(event);
  const cached = await checkIdempotency(cid);
  if (cached) return cached;

  try {
    const doctorID = decodeURIComponent(event.pathParameters.doctorID);
    const body = JSON.parse(event.body || '{}');

    if (!Object.keys(body).length) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Request body cannot be empty.' }) };
    }

    // Step 3 — refactored to Get→Decrypt→Merge→Re-encrypt→Put. PHI fields
    // are now ciphertext at rest and cannot be merged at the DDB level.
    const existing = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `DOCTOR#${doctorID}`, SK: 'PROFILE' }
    }));
    if (!existing.Item || existing.Item.tenantId !== tenantId) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Doctor not found' }) };
    }
    await decryptItem(existing.Item, DOCTOR_PHI_FIELDS, tenantId);

    const protectedFields = new Set(['PK', 'SK', 'EntityType', 'tenantId', '_kms_dek', '_kms_v']);
    const alias = { specialty: 'specialization', qatarID: 'qid', QatarID: 'qid' };

    const merged = { ...existing.Item };
    for (const [k, v] of Object.entries(body)) {
      const key = alias[k] || k;
      if (protectedFields.has(key)) continue;
      if (v === null || v === undefined) continue;
      merged[key] = toLower(v);
    }
    merged.updatedAt = new Date().toISOString();

    // Fresh DEK on every update.
    delete merged._kms_dek;
    delete merged._kms_v;

    // Step 4 — re-stamp hashes BEFORE encryption.
    await stampHashes(merged, DOCTOR_HASH_FIELDS, tenantId);

    await encryptItem(merged, DOCTOR_PHI_FIELDS, tenantId);

    await dynamo.send(new PutCommand({
      TableName: TABLE,
      Item: merged,
      // Step 2d — tenant boundary enforced at the DB level.
      ConditionExpression: 'attribute_exists(PK) AND tenantId = :tid',
      ExpressionAttributeValues: { ':tid': tenantId }
    }));

    // Decrypt before returning so the API response is plaintext.
    await decryptItem(merged, DOCTOR_PHI_FIELDS, tenantId);
    const result = { Attributes: merged };

    const response = {
      statusCode: 200,
      body: JSON.stringify({ message: 'Doctor updated successfully', doctorID, updatedData: result.Attributes })
    };
    await storeIdempotency(cid, response);
    return response;
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      return { statusCode: 404, body: JSON.stringify({ message: 'Doctor not found' }) };
    }
    return { statusCode: 500, body: JSON.stringify({ message: 'Failed to update doctor', error: error.message }) };
  }
};

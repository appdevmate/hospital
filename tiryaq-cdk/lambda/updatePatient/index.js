const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, TransactWriteCommand, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

// Step 3 — PHI envelope encryption. ./crypto.js synced from _shared/.
// Step 4 — also import stampHashes + PATIENT_HASH_FIELDS to refresh
// qidHash / emailHash / phoneHash whenever the source field changes.
const { encryptItem, decryptItem, stampHashes, PATIENT_PHI_FIELDS, PATIENT_HASH_FIELDS } = require('./crypto');

const dynamo  = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));
const TABLE   = 'Hospital';

// ── Tenant enforcement (Step 2d) ─────────────────────────────────────────────
// Every write carries a ConditionExpression `tenantId = :tid`. If the
// caller's tenant doesn't own the row, the conditional check fails and
// DynamoDB returns ConditionalCheckFailedException — we then return 404
// (not 403) so cross-tenant existence is not disclosed.
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
const toLower = (v) => (typeof v === 'string' ? v.toLowerCase() : v ?? null);

const hdrs = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS'
};

const ok  = (body)          => ({ statusCode: 200, headers: hdrs, body: JSON.stringify(body) });
const err = (code, message) => ({ statusCode: code, headers: hdrs, body: JSON.stringify({ message }) });

// ── Extract Cognito groups from the JWT claims (bracket-stripped) ─────
// API Gateway JWT authorizer sends `cognito:groups` as a string like
// "[Admin]" or "[Admin, Developers]", or sometimes as an array — handle both.
const getGroups = (event) => {
  const claims = event.requestContext?.authorizer?.jwt?.claims
              || event.requestContext?.authorizer?.claims || {};
  const raw = claims['cognito:groups'] || '';
  if (Array.isArray(raw)) return raw.map((g) => String(g).trim());
  return String(raw)
    .trim()
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split(/[,\s]+/)
    .filter(Boolean);
};

const isAdminOrDeveloper = (event) => {
  const groups = getGroups(event);
  return groups.some((g) => ['Admin', 'admin', 'Developers', 'Developer', 'developer'].includes(g));
};

exports.handler = async (event) => {
  if (event && event._warmup) return { ok: true, warmed: true };

  // ── Tenant enforcement (Step 2d) ──
  let tenantId;
  try { tenantId = getTenant(event); }
  catch (e) { return err(e.statusCode || 403, e.message); }

  // Idempotency (Phase D)
  const cid = getClientRequestId(event);
  const cached = await checkIdempotency(cid);
  if (cached) return cached;

  try {
    const method = event.requestContext?.http?.method || event.httpMethod || '';
    const path   = event.rawPath || event.path || '';

    if (method === 'OPTIONS') return ok({});

    // Code review finding 2.1 — patient mutations are admin/developer-only.
    // Doctors can read; only admins/devs alter patient profile or restore.
    if (!isAdminOrDeveloper(event)) {
      return err(403, 'Access denied: only admin/developer can update patients');
    }

    const patientID = decodeURIComponent(
      event.pathParameters?.patientID || event.pathParameters?.id || ''
    );
    if (!patientID) return err(400, 'Missing patient id');

    // ── PATCH /patients/{id}/restore ─────────────────────────────────────
    // Clears deletedAt and increments the patient counter back by 1.
    // Restore is admin/developer only — doctors can edit their patients but
    // must not undo a soft-delete decision made by an admin.
    if (path.includes('/restore')) {
      if (!isAdminOrDeveloper(event)) {
        return err(403, 'Access denied: restoring a deleted patient is admin-only');
      }
      await dynamo.send(new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: TABLE,
              Key: { PK: `PATIENT#${patientID}`, SK: 'PROFILE' },
              UpdateExpression: 'REMOVE #deletedAt',
              // Step 2d: Tenant boundary enforced at the DB level.
              ConditionExpression: 'attribute_exists(PK) AND attribute_exists(SK) AND tenantId = :tid',
              ExpressionAttributeNames: { '#deletedAt': 'deletedAt' },
              ExpressionAttributeValues: { ':tid': tenantId }
            }
          },
          {
            Update: {
              TableName: TABLE,
              Key: { PK: `COUNTER#PATIENTS#${tenantId}`, SK: 'TOTAL' },
              UpdateExpression: 'SET #total = if_not_exists(#total, :zero) + :inc, tenantId = :tid, EntityType = :et',
              ExpressionAttributeNames: { '#total': 'total' },
              ExpressionAttributeValues: { ':zero': 0, ':inc': 1, ':tid': tenantId, ':et': 'COUNTER' }
            }
          }
        ]
      }));

      const restoreRes = ok({ message: 'Patient restored successfully', patientId: patientID });
      await storeIdempotency(cid, restoreRes);
      return restoreRes;
    }

    // ── PATCH /patients/{id} — standard update ───────────────────────────
    // Step 3: refactored from in-place UpdateExpression to Get→Decrypt→Merge
    // →Re-encrypt→Put. This is needed because PHI fields are now ciphertext
    // and can't be merged at the DynamoDB level — we have to decrypt, apply
    // the update in memory, and re-encrypt with a fresh DEK.
    const body = JSON.parse(event.body || '{}');

    if (!Object.keys(body).length) {
      return err(400, 'Request body cannot be empty.');
    }

    // Load the existing row (verifies tenant ownership: 404 on cross-tenant).
    const existing = await dynamo.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `PATIENT#${patientID}`, SK: 'PROFILE' }
    }));
    if (!existing.Item || existing.Item.tenantId !== tenantId) {
      return err(404, 'Patient not found');
    }

    // Decrypt PHI so we can merge user-supplied plaintext with it.
    await decryptItem(existing.Item, PATIENT_PHI_FIELDS, tenantId);

    // Build the updated item. Protected fields are never overwritten by
    // the client body (PK/SK/EntityType/deletedAt/tenantId). Empty values
    // are skipped so we don't blank out fields by accident.
    const protectedFields = new Set(['PK', 'SK', 'EntityType', 'deletedAt', 'tenantId', '_kms_dek', '_kms_v']);
    const merged = { ...existing.Item };
    for (const [k, v] of Object.entries(body)) {
      if (protectedFields.has(k)) continue;
      if (v === null || v === undefined) continue;
      merged[k] = toLower(v);
    }
    merged.updatedAt = new Date().toISOString();

    // Force a fresh DEK on every update (defence: limits exposure if any
    // single DEK is ever compromised).
    delete merged._kms_dek;
    delete merged._kms_v;

    // Step 4 — re-stamp hashes from the (possibly updated) plaintext values
    // BEFORE encryption. If the user changed phone, the phoneHash refreshes;
    // if not, stampHashes recomputes the same value (idempotent via cache).
    await stampHashes(merged, PATIENT_HASH_FIELDS, tenantId);

    await encryptItem(merged, PATIENT_PHI_FIELDS, tenantId);

    // Step 2d: tenant boundary still enforced at the DB level via Condition.
    await dynamo.send(new PutCommand({
      TableName: TABLE,
      Item: merged,
      ConditionExpression: 'attribute_exists(PK) AND tenantId = :tid',
      ExpressionAttributeValues: { ':tid': tenantId }
    }));

    // Decrypt before returning so the API response is plaintext for the
    // caller (who is the same tenant — authorised).
    await decryptItem(merged, PATIENT_PHI_FIELDS, tenantId);
    const result = { Attributes: merged };

    const updateRes = ok({ message: 'Patient updated successfully', patientID, updatedData: result.Attributes });
    await storeIdempotency(cid, updateRes);
    return updateRes;

  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      return err(404, 'Patient not found');
    }
    return err(500, error.message || 'Failed to update patient');
  }
};
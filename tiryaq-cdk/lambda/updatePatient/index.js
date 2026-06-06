const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, TransactWriteCommand, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const dynamo  = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));
const TABLE   = 'Hospital';

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
              ConditionExpression: 'attribute_exists(PK) AND attribute_exists(SK)',
              ExpressionAttributeNames: { '#deletedAt': 'deletedAt' }
            }
          },
          {
            Update: {
              TableName: TABLE,
              Key: { PK: 'COUNTER#PATIENTS', SK: 'TOTAL' },
              UpdateExpression: 'SET #total = if_not_exists(#total, :zero) + :inc',
              ExpressionAttributeNames: { '#total': 'total' },
              ExpressionAttributeValues: { ':zero': 0, ':inc': 1 }
            }
          }
        ]
      }));

      const restoreRes = ok({ message: 'Patient restored successfully', patientId: patientID });
      await storeIdempotency(cid, restoreRes);
      return restoreRes;
    }

    // ── PATCH /patients/{id} — standard update ───────────────────────────
    const body = JSON.parse(event.body || '{}');

    if (!Object.keys(body).length) {
      return err(400, 'Request body cannot be empty.');
    }

    const protectedFields = ['PK', 'SK', 'EntityType', 'deletedAt'];
    const updateFields = Object.fromEntries(
      Object.entries(body)
        .filter(([k]) => !protectedFields.includes(k))
        .map(([k, v]) => [k, toLower(v)])
        // Never SET a GSI key attribute (email, dataClass, updatedAt, …) to NULL —
        // DynamoDB rejects the write. Skip empty fields instead of nulling them.
        .filter(([, v]) => v !== null && v !== undefined)
    );
    updateFields.updatedAt = new Date().toISOString();

    const keys = Object.keys(updateFields);
    if (!keys.length) return err(400, 'No valid fields to update.');

    const updateExpression         = 'SET ' + keys.map((_, i) => `#k${i} = :v${i}`).join(', ');
    const ExpressionAttributeNames  = Object.fromEntries(keys.map((k, i) => [`#k${i}`, k]));
    const ExpressionAttributeValues = Object.fromEntries(keys.map((k, i) => [`:v${i}`, updateFields[k]]));

    const result = await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `PATIENT#${patientID}`, SK: 'PROFILE' },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ReturnValues: 'ALL_NEW',
      ConditionExpression: 'attribute_exists(PK) AND attribute_exists(SK)'
    }));

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
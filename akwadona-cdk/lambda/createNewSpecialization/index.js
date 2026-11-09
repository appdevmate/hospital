const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

const client = new DynamoDBClient({ region: 'eu-north-1' });
const dynamo = DynamoDBDocumentClient.from(client);
const TABLE = 'Hospital';

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


// ─────────────────────────────────────────────────────────────────────────────
// 2026-10-29 security fix — authorization gate.
// Departments / specializations are GLOBAL reference data shared by every
// tenant. This handler previously ran for ANY valid JWT, so a doctor or
// pharmacist from any hospital could mutate or wipe the list for all
// hospitals. Mutations now require the Admin or Developers Cognito group,
// or the platform operator role. Reads (getAll*) are unchanged.
// ─────────────────────────────────────────────────────────────────────────────
function requireAdminOrOperator(event) {
  const claims = (event && event.requestContext && event.requestContext.authorizer
    && event.requestContext.authorizer.jwt && event.requestContext.authorizer.jwt.claims) || {};
  if (claims.role === 'operator') return null;
  const groups = claims['cognito:groups'] || '';
  const arr = Array.isArray(groups) ? groups
    : String(groups).trim().replace(/^\[/, '').replace(/\]$/, '').split(/[,\s]+/).filter(Boolean);
  const ok = arr.some(g => ['Admin', 'Developers'].includes(String(g).trim()));
  if (ok) return null;
  return {
    statusCode: 403,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Forbidden: reference data can only be changed by an Admin or Developer' })
  };
}

exports.handler = async (event) => {
  const __authDenied = requireAdminOrOperator(event);
  if (__authDenied) return __authDenied;
  const cid = getClientRequestId(event);
  const cached = await checkIdempotency(cid);
  if (cached) return cached;

  try {
    const body = JSON.parse(event.body || '{}');
    const name = String(body.name || '').trim();
    const code = body.code ? String(body.code).trim() : undefined;
    if (!name) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Missing required field: name' }) };
    }

    const specializationID = `SPECIALIZATION#${randomUUID()}`;
    const timestamp = new Date().toISOString();

    const params = {
      TableName: 'Hospital',
      Item: {
        PK: specializationID,
        SK: 'SPECIALIZATION',
        EntityType: 'SPECIALIZATION',
        name,
        ...(code ? { code } : {}),
        timestamp
      },
      ConditionExpression: 'attribute_not_exists(PK)'
    };

    await dynamo.send(new PutCommand(params));

    const response = {
      statusCode: 201,
      body: JSON.stringify({ message: 'Specialization created successfully', specializationID })
    };
    await storeIdempotency(cid, response);
    return response;
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ message: 'Failed to create specialization', error: error.message }) };
  }
};
// hash-bust 2026-06-21T14:28:24.0064697+03:00

// deleteAllDepartments.js
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

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

const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

async function batchWriteAll(requestItems) {
  let unprocessed = requestItems;
  let attempts = 0;
  while (Object.keys(unprocessed).length) {
    const res = await dynamo.send(new BatchWriteCommand({ RequestItems: unprocessed }));
    unprocessed = res.UnprocessedItems || {};
    if (!Object.keys(unprocessed).length) break;
    attempts++;
    if (attempts > 6) break;                 // stop after a few retries
    await new Promise(r => setTimeout(r, Math.min(200 * 2 ** attempts, 2000)));
  }
  return unprocessed;
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

exports.handler = async (event = {}) => {
  const __authDenied = requireAdminOrOperator(event);
  if (__authDenied) return __authDenied;
  const cid = getClientRequestId(event);
  const cached = await checkIdempotency(cid);
  if (cached) return cached;

  try {
    // 1) Scan all department keys
    const scanBase = {
      TableName: TABLE,
      ProjectionExpression: 'PK, SK',
      FilterExpression: '#t = :t',
      ExpressionAttributeNames: { '#t': 'EntityType' },
      ExpressionAttributeValues: { ':t': 'DEPARTMENT' }
    };

    const keys = [];
    let ExclusiveStartKey;
    do {
      const res = await dynamo.send(new ScanCommand({ ...scanBase, ExclusiveStartKey }));
      for (const it of res.Items || []) keys.push({ PK: it.PK, SK: it.SK });
      ExclusiveStartKey = res.LastEvaluatedKey;
    } while (ExclusiveStartKey);

    if (!keys.length) {
      const r0 = { statusCode: 200, body: JSON.stringify({ message: 'No departments found', deleted: 0 }) };
      await storeIdempotency(cid, r0);
      return r0;
    }

    // 2) Batch delete in chunks of 25
    const batches = chunk(keys.map(Key => ({ DeleteRequest: { Key } })), 25);
    let deleted = 0;
    for (const b of batches) {
      const unprocessed = await batchWriteAll({ [TABLE]: b });
      const unprocessedCount = unprocessed?.[TABLE]?.length || 0;
      deleted += b.length - unprocessedCount;
      if (unprocessedCount) {
        const r207 = {
          statusCode: 207,
          body: JSON.stringify({
            message: 'Partial delete',
            deleted,
            unprocessed: unprocessed[TABLE]
          })
        };
        await storeIdempotency(cid, r207);
        return r207;
      }
    }

    const response = { statusCode: 200, body: JSON.stringify({ message: 'All departments deleted', deleted }) };
    await storeIdempotency(cid, response);
    return response;
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ message: 'Failed to delete departments', error: err.message }) };
  }
};
// hash-bust 2026-06-21T14:28:24.0064697+03:00

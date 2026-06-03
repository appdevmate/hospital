// bulkCreateSpecializations.js
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, BatchWriteCommand, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

const client = new DynamoDBClient({ region: 'us-east-1' });
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
  while (Object.keys(unprocessed).length && attempts < 6) {
    const res = await dynamo.send(new BatchWriteCommand({ RequestItems: unprocessed }));
    unprocessed = res.UnprocessedItems || {};
    if (Object.keys(unprocessed).length) {
      await new Promise(r => setTimeout(r, Math.min(200 * 2 ** attempts, 2000)));
      attempts++;
    }
  }
  return unprocessed;
}

exports.handler = async (event) => {
  const cid = getClientRequestId(event);
  const cached = await checkIdempotency(cid);
  if (cached) return cached;

  try {
    const body = JSON.parse(event.body || '{}');
    const input = Array.isArray(body.items) ? body.items : Array.isArray(body.specializations) ? body.specializations : [];
    if (!input.length) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Provide items[] with {name, code?}' }) };
    }

    const now = new Date().toISOString();
    const valid = [];
    const skipped = [];

    for (const raw of input) {
      const name = String(raw?.name || '').trim();
      const code = raw?.code ? String(raw.code).trim() : undefined;
      if (!name) { skipped.push({ ...raw, reason: 'name required' }); continue; }
      const id = `SPECIALIZATION#${randomUUID()}`;
      valid.push({
        PutRequest: {
          Item: {
            PK: id,
            SK: 'SPECIALIZATION',
            EntityType: 'SPECIALIZATION',
            id,                 // optional convenience attribute
            name,
            ...(code ? { code } : {}),
            timestamp: now
          }
        }
      });
    }

    if (!valid.length) {
      return { statusCode: 400, body: JSON.stringify({ message: 'No valid items to write', skipped }) };
    }

    const batches = chunk(valid, 25);
    for (const b of batches) {
      const unprocessed = await batchWriteAll({ [TABLE]: b });
      if (unprocessed && Object.keys(unprocessed).length) {
        const r207 = { statusCode: 207, body: JSON.stringify({ message: 'Partial success', skipped, unprocessed }) };
        await storeIdempotency(cid, r207);
        return r207;
      }
    }

    const response = {
      statusCode: 201,
      body: JSON.stringify({
        message: 'Specializations created',
        count: valid.length,
        skipped
      })
    };
    await storeIdempotency(cid, response);
    return response;
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ message: 'Failed to create specializations', error: err.message }) };
  }
};

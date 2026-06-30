const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
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

exports.handler = async (event) => {
  const cid = getClientRequestId(event);
  const cached = await checkIdempotency(cid);
  if (cached) return cached;

  try {
    const body = JSON.parse(event.body || '{}');
    const name = String(body.name || '').trim();
    const code = String(body.code || '').trim();

    if (!name || !code) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing required fields: name, code' })
      };
    }

    const departmentID = `DEPARTMENT#${randomUUID()}`;
    const timestamp = new Date().toISOString();

    const params = {
      TableName: 'Hospital',
      Item: {
        PK: departmentID,
        SK: 'DEPARTMENT',
        EntityType: 'DEPARTMENT',
        name,
        code,
        timestamp
      },
      // Optional: prevent overwriting if the same PK somehow re-used
      ConditionExpression: 'attribute_not_exists(PK)'
    };

    await dynamo.send(new PutCommand(params));

    const response = {
      statusCode: 201,
      body: JSON.stringify({
        message: 'Department created successfully',
        departmentID
      })
    };
    await storeIdempotency(cid, response);
    return response;
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to create department',
        error: error.message
      })
    };
  }
};
// hash-bust 2026-06-21T14:28:24.0064697+03:00

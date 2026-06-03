const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));
const TABLE = 'Hospital';
const toLower = (v) => (typeof v === 'string' ? v.toLowerCase() : v ?? null);

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
    const doctorID = decodeURIComponent(event.pathParameters.doctorID);
    const body = JSON.parse(event.body || '{}');

    if (!Object.keys(body).length) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Request body cannot be empty.' }) };
    }

    const protectedFields = ['PK', 'SK', 'EntityType'];
    const alias = { specialty: 'specialization', qatarID: 'qid', QatarID: 'qid' };

    const updateFields = Object.fromEntries(
      Object.entries(body)
        .filter(([k]) => !protectedFields.includes(k))
        .map(([k, v]) => [alias[k] || k, toLower(v)])
        // Never SET a GSI key attribute (email, dataClass, updatedAt, …) to NULL —
        // DynamoDB rejects the write. Skip empty fields instead of nulling them.
        .filter(([, v]) => v !== null && v !== undefined)
    );
    updateFields.updatedAt = new Date().toISOString();

    const keys = Object.keys(updateFields);
    if (!keys.length) {
      return { statusCode: 400, body: JSON.stringify({ message: 'No valid fields to update.' }) };
    }

    const UpdateExpression = 'SET ' + keys.map((_, i) => `#k${i} = :v${i}`).join(', ');
    const ExpressionAttributeNames = Object.fromEntries(keys.map((k, i) => [`#k${i}`, k]));
    const ExpressionAttributeValues = Object.fromEntries(keys.map((k, i) => [`:v${i}`, updateFields[k]]));

    const result = await dynamo.send(new UpdateCommand({
      TableName: 'Hospital',
      Key: { PK: `DOCTOR#${doctorID}`, SK: 'PROFILE' },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ReturnValues: 'ALL_NEW',
      ConditionExpression: 'attribute_exists(PK) AND attribute_exists(SK)'
    }));

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

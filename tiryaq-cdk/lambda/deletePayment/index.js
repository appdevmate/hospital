const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

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

exports.handler = async (event) => {
    const cid = getClientRequestId(event);
    const cached = await checkIdempotency(cid);
    if (cached) return cached;

    try {
        const encodedPatientID = event.pathParameters.patientID;
        const encodedPaymentID = event.pathParameters.paymentID;

        const patientID = decodeURIComponent(encodedPatientID);
        const paymentID = decodeURIComponent(encodedPaymentID);

        const deletedAt = new Date().toISOString(); // current timestamp

        const params = {
            TableName: 'Hospital',
            Key: {
                PK: `PATIENT#${patientID}`,
                SK: `PAYMENT#${paymentID}`
            },
            UpdateExpression: 'SET deletedAt = :deletedAt',
            ExpressionAttributeValues: {
                ':deletedAt': deletedAt
            }
        };

        await dynamo.send(new UpdateCommand(params));

        const response = {
            statusCode: 200,
            body: JSON.stringify({
                message: `Payment ${paymentID} for patient ${patientID} soft-deleted.`,
                deletedAt
            })
        };
        await storeIdempotency(cid, response);
        return response;
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Failed to soft-delete payment",
                error: error.message
            })
        };
    }
};

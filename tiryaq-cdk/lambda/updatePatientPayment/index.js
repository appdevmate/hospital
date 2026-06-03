const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

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

// Actor email from the JWT (audit: who updated the invoice).
function getActorEmail(event) {
    const claims = event.requestContext?.authorizer?.jwt?.claims
        || event.requestContext?.authorizer?.claims || {};
    return (claims.email || claims.username || 'unknown').toLowerCase().trim();
}

exports.handler = async (event) => {
    const cid = getClientRequestId(event);
    const cached = await checkIdempotency(cid);
    if (cached) return cached;

    try {
        const patientID = decodeURIComponent(event.pathParameters.patientID);
        const paymentID = decodeURIComponent(event.pathParameters.paymentID);
        const body = JSON.parse(event.body);

        if (!body || Object.keys(body).length === 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Request body cannot be empty." })
            };
        }

        // Fields to protect
        const protectedFields = ['PK', 'SK', 'EntityType'];

        // Filter allowed update fields
        const updateFields = {};
        for (const [key, value] of Object.entries(body)) {
            if (protectedFields.includes(key)) {
                continue;
            }
            // Never SET a GSI key attribute to NULL — DynamoDB rejects the write.
            if (value === null || value === undefined) {
                continue;
            }
            updateFields[key] = value;
        }

        // Add update timestamp + actor (audit: who updated the invoice).
        updateFields.updatedAt = new Date().toISOString();
        updateFields.updatedBy = getActorEmail(event);

        if (Object.keys(updateFields).length === 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "No valid fields to update." })
            };
        }

        // Build update expression
        let updateExpression = "SET ";
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};

        Object.keys(updateFields).forEach((key, idx) => {
            updateExpression += `#field${idx} = :value${idx}, `;
            expressionAttributeNames[`#field${idx}`] = key;
            expressionAttributeValues[`:value${idx}`] = updateFields[key];
        });

        updateExpression = updateExpression.slice(0, -2);

        const params = {
            TableName: 'Hospital',
            Key: {
                PK: `PATIENT#${patientID}`,
                SK: `PAYMENT#${paymentID}`
            },
            UpdateExpression: updateExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: "ALL_NEW",
            ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)"
        };

        const result = await dynamo.send(new UpdateCommand(params));

        const response = {
            statusCode: 200,
            body: JSON.stringify({
                message: "Payment updated successfully",
                patientID,
                paymentID,
                updatedData: result.Attributes
            })
        };
        await storeIdempotency(cid, response);
        return response;

    } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: "Payment record not found",
                    patientID: event.pathParameters?.patientID,
                    paymentID: event.pathParameters?.paymentID
                })
            };
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Failed to update payment",
                error: error.message
            })
        };
    }
};

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamo = DynamoDBDocumentClient.from(client);

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

exports.handler = async (event) => {
    if (event && event._warmup) return { ok: true, warmed: true };

    let tenantId;
    try { tenantId = getTenant(event); }
    catch (e) { return { statusCode: e.statusCode || 403, body: JSON.stringify({ message: e.message }) }; }

    try {
        const patientID = decodeURIComponent(event.pathParameters.patientID);
        const paymentID = decodeURIComponent(event.pathParameters.paymentID);

        const result = await dynamo.send(new GetCommand({
            TableName: 'Hospital',
            Key: { PK: `PATIENT#${patientID}`, SK: `PAYMENT#${paymentID}` }
        }));

        // Step 2d — cross-tenant → 404 (no existence disclosure).
        if (!result.Item || result.Item.tenantId !== tenantId) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: `Payment with ID ${paymentID} for patient ${patientID} not found.`
                })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Payment retrieved successfully.',
                data: result.Item
            })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Failed to retrieve payment.',
                error: error.message
            })
        };
    }
};

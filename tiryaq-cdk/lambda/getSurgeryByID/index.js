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
        const surgeryID = decodeURIComponent(event.pathParameters.surgeryID);

        const result = await dynamo.send(new GetCommand({
            TableName: 'Hospital',
            Key: { PK: `PATIENT#${patientID}`, SK: `SURGERY#${surgeryID}` }
        }));

        // Step 2d — cross-tenant → 404.
        if (!result.Item || result.Item.tenantId !== tenantId) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: `Surgery with ID ${surgeryID} for patient ${patientID} not found.`
                })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Surgery retrieved successfully.',
                data: result.Item
            })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Failed to retrieve surgery.',
                error: error.message
            })
        };
    }
};

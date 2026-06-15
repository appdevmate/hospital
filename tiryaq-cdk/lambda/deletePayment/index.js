const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamo = DynamoDBDocumentClient.from(client);
const TABLE = 'Hospital';

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
    if (event && event._warmup) return { ok: true, warmed: true };

    let tenantId;
    try { tenantId = getTenant(event); }
    catch (e) { return { statusCode: e.statusCode || 403, body: JSON.stringify({ message: e.message }) }; }

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
            ExpressionAttributeNames: { '#__tid': 'tenantId' },
            ExpressionAttributeValues: {
                ':deletedAt': deletedAt,
                ':__tid': tenantId
            },
            // Step 2d — tenant boundary enforced at the DB level.
            ConditionExpression: 'attribute_exists(PK) AND #__tid = :__tid'
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

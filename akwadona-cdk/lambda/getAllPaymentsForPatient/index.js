const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
// Step 2g — per-tenant rate limit.
const throttle = require('./throttle');

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));
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

exports.handler = async (event) => {
    if (event && event._warmup) return { ok: true, warmed: true };

    let tenantId;
    try { tenantId = getTenant(event); }
    catch (e) { return { statusCode: e.statusCode || 403, body: JSON.stringify({ message: e.message }) }; }
  // Step 2g — per-tenant throttle.
  {
    const __role = (event.requestContext?.authorizer?.jwt?.claims || {}).role || 'tenant_user';
    const __tid = (typeof tenantId !== 'undefined') ? tenantId : (event.requestContext?.authorizer?.jwt?.claims || {}).tenantId;
    const __limitResponse = await throttle.precheck(event, { tenantId: __tid, role: __role });
    if (__limitResponse) return __limitResponse;
  }


    try {
        const patientID = event.pathParameters?.patientID;
        if (!patientID) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Missing patientID in path parameters.' })
            };
        }

        // Step 2d — verify the parent patient belongs to caller's tenant.
        const parent = await dynamo.send(new GetCommand({
            TableName: TABLE, Key: { PK: `PATIENT#${patientID}`, SK: 'PROFILE' }
        }));
        if (!parent.Item || parent.Item.tenantId !== tenantId) {
            return { statusCode: 404, body: JSON.stringify({ message: 'Patient not found' }) };
        }

        const doctorEmail = event.queryStringParameters?.doctorEmail;

        let filterExp = 'attribute_not_exists(deletedAt) AND tenantId = :tid';
        const expValues = {
            ':pk': `PATIENT#${patientID}`,
            ':skPrefix': 'PAYMENT#',
            ':tid': tenantId
        };
        const expNames = {};

        if (doctorEmail) {
            filterExp += ' AND #doctorEmail = :doctorEmail';
            expNames['#doctorEmail'] = 'doctorEmail';
            expValues[':doctorEmail'] = doctorEmail.toLowerCase().trim();
        }

        const result = await dynamo.send(new QueryCommand({
            TableName: TABLE,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
            FilterExpression: filterExp,
            ExpressionAttributeValues: expValues,
            ...(Object.keys(expNames).length > 0 && { ExpressionAttributeNames: expNames })
        }));

        // Defence-in-depth — drop any row missing tenantId or mismatched.
        const items = (result.Items || []).filter(i => i.tenantId === tenantId);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Payments retrieved successfully',
                count: items.length,
                data: items
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to retrieve payments', error: error.message })
        };
    }
};
// hash-bust 2026-06-21T14:28:24.0064697+03:00

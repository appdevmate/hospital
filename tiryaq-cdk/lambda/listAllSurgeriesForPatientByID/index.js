// GET /patients/{patientID}/surgeries?pageSize&lastKey
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const ddb = DynamoDBDocumentClient.from(client);

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

const encodeLEK = (obj) => obj ? Buffer.from(JSON.stringify(obj)).toString('base64') : null;
const decodeLEK = (s) => s ? JSON.parse(Buffer.from(s, 'base64').toString('utf8')) : undefined;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

exports.handler = async (event) => {
  if (event && event._warmup) return { ok: true, warmed: true };

  let tenantId;
  try { tenantId = getTenant(event); }
  catch (e) { return { statusCode: e.statusCode || 403, body: JSON.stringify({ message: e.message }) }; }

  try {
    const patientID = decodeURIComponent(event.pathParameters.patientID);
    const q = event.queryStringParameters || {};
    const pageSize = clamp(parseInt(q.pageSize, 10) || 50, 1, 200);
    const lastKey = decodeLEK(q.lastKey || null);

    // Step 2d — verify the parent patient belongs to caller's tenant.
    const parent = await ddb.send(new GetCommand({
        TableName: 'Hospital', Key: { PK: `PATIENT#${patientID}`, SK: 'PROFILE' }
    }));
    if (!parent.Item || parent.Item.tenantId !== tenantId) {
        return { statusCode: 404, body: JSON.stringify({ message: 'Patient not found' }) };
    }

    const input = {
      TableName: 'Hospital',
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: '#__tid = :__tid',
      ExpressionAttributeNames: { '#__tid': 'tenantId' },
      ExpressionAttributeValues: { ':pk': `PATIENT#${patientID}`, ':sk': 'SURGERY#', ':__tid': tenantId },
      Limit: pageSize,
      ExclusiveStartKey: lastKey,
      ScanIndexForward: false
    };

    const { Items = [], LastEvaluatedKey } = await ddb.send(new QueryCommand(input));
    const items = Items.filter(i => i.tenantId === tenantId);

    return {
      statusCode: 200,
      body: JSON.stringify({ items, lastKey: encodeLEK(LastEvaluatedKey) })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ message: 'Failed to list surgeries.' }) };
  }
};

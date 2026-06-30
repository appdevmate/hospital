const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
// Step 2g — per-tenant rate limit.
const throttle = require('./throttle');

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
  // Step 2g — per-tenant throttle.
  {
    const __role = (event.requestContext?.authorizer?.jwt?.claims || {}).role || 'tenant_user';
    const __tid = (typeof tenantId !== 'undefined') ? tenantId : (event.requestContext?.authorizer?.jwt?.claims || {}).tenantId;
    const __limitResponse = await throttle.precheck(event, { tenantId: __tid, role: __role });
    if (__limitResponse) return __limitResponse;
  }


  try {
    const patientID = decodeURIComponent(event.pathParameters.patientID);
    const q = event.queryStringParameters || {};
    const pageSize = clamp(parseInt(q.pageSize, 10) || 50, 1, 200);
    const lastKey = decodeLEK(q.lastKey || null);
    const doctorEmail = q.doctorEmail ? q.doctorEmail.toLowerCase().trim() : null;

    // Step 2d — verify the parent patient belongs to caller's tenant.
    const parent = await ddb.send(new GetCommand({
        TableName: 'Hospital', Key: { PK: `PATIENT#${patientID}`, SK: 'PROFILE' }
    }));
    if (!parent.Item || parent.Item.tenantId !== tenantId) {
        return { statusCode: 404, body: JSON.stringify({ message: 'Patient not found' }) };
    }

    const expValues = { ':pk': `PATIENT#${patientID}`, ':sk': 'PAYMENT#', ':__tid': tenantId };
    const expNames = { '#__tid': 'tenantId' };
    let filterExp = '#__tid = :__tid';

    if (doctorEmail) {
      filterExp += ' AND #doctorEmail = :doctorEmail';
      expNames['#doctorEmail'] = 'doctorEmail';
      expValues[':doctorEmail'] = doctorEmail;
    }

    const input = {
      TableName: 'Hospital',
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: expValues,
      FilterExpression: filterExp,
      ExpressionAttributeNames: expNames,
      Limit: pageSize,
      ExclusiveStartKey: lastKey,
      ScanIndexForward: false
    };

    const { Items = [], LastEvaluatedKey } = await ddb.send(new QueryCommand(input));

    // Defence-in-depth — drop any row missing tenantId or mismatched.
    const items = Items.filter(i => i.tenantId === tenantId);

    return {
      statusCode: 200,
      body: JSON.stringify({
        items,
        lastKey: encodeLEK(LastEvaluatedKey)
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ message: 'Failed to list payments.' }) };
  }
};// hash-bust 2026-06-21T14:28:24.0064697+03:00

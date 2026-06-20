// GET /patients?pageSize&lastKey&namePrefix&sortField&sortOrder&gender&insurance&dobFrom&dobTo
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');

// Step 3 — PHI decryption. ./crypto.js synced from _shared/.
const { decryptItems, PATIENT_PHI_FIELDS } = require('./crypto');
// Step 2g — per-tenant rate limit.
const throttle = require('./throttle');

const client = new DynamoDBClient({ region: 'us-east-1' });
const ddb = DynamoDBDocumentClient.from(client);

const TABLE = process.env.HOSPITAL_TABLE || 'Hospital';
const GSI1 = process.env.GSI_PATIENTS_BY_CREATED || 'GSI1'; // (GSI1PK, GSI1SK)
const GSI2 = process.env.GSI_PATIENTS_BY_NAME || 'GSI2';    // (GSI2PK, GSI2SK)

const encodeLEK = (obj) => obj ? Buffer.from(JSON.stringify(obj)).toString('base64') : null;
const decodeLEK = (s) => s ? JSON.parse(Buffer.from(s, 'base64').toString('utf8')) : undefined;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

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
  catch (e) {
    return {
      statusCode: e.statusCode || 403,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: e.message })
    };
  }
  // Step 2g — per-tenant throttle.
  {
    const __role = (event.requestContext?.authorizer?.jwt?.claims || {}).role || 'tenant_user';
    const __tid = (typeof tenantId !== 'undefined') ? tenantId : (event.requestContext?.authorizer?.jwt?.claims || {}).tenantId;
    const __limitResponse = await throttle.precheck(event, { tenantId: __tid, role: __role });
    if (__limitResponse) return __limitResponse;
  }


  try {
    const q = event.queryStringParameters || {};
    const pageSize = clamp(parseInt(q.pageSize, 10) || 50, 1, 200);
    const lastKey = decodeLEK(q.lastKey || null);

    const namePrefix = (q.namePrefix || '').trim().toLowerCase();
    const sortField = (q.sortField || 'createdAt').toLowerCase();
    const sortOrder = (q.sortOrder || 'desc').toLowerCase(); // 'asc' | 'desc'

    // Optional filters (be careful: FilterExpression still reads matched page)
    const gender = (q.gender || '').trim();
    const insurance = (q.insurance || '').trim();
    const dobFrom = q.dobFrom;
    const dobTo = q.dobTo;

    const input = {
      TableName: TABLE,
      Limit: pageSize,
      ExclusiveStartKey: lastKey,
      ScanIndexForward: sortOrder === 'asc'
    };

    if (namePrefix) {
      // Query name index for prefix search
      input.IndexName = GSI2;
      input.KeyConditionExpression = 'GSI2PK = :pk AND begins_with(GSI2SK, :sk)';
      input.ExpressionAttributeValues = {
        ':pk': 'PATIENT',
        ':sk': `NAME#${namePrefix}`
      };
    } else {
      // Default: list by created timestamp
      input.IndexName = GSI1;
      input.KeyConditionExpression = 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)';
      input.ExpressionAttributeValues = {
        ':pk': 'PATIENT',
        ':sk': 'CREATED#'
      };
    }

    // Light filters (optional). For heavy filters, add dedicated GSIs.
    const names = {};
    const values = {};
    const filters = [];

    if (gender) { names['#gender'] = 'gender'; values[':gender'] = gender; filters.push('#gender = :gender'); }
    if (insurance) { names['#insurance'] = 'insurance'; values[':insurance'] = insurance; filters.push('#insurance = :insurance'); }
    if (dobFrom) { names['#dob'] = 'dob'; values[':dobFrom'] = dobFrom; filters.push('#dob >= :dobFrom'); }
    if (dobTo) { names['#dob'] = 'dob'; values[':dobTo'] = dobTo; filters.push('#dob <= :dobTo'); }

    // Step 2d — always scope to caller's tenant. GSI1/GSI2 are not
    // partitioned by tenantId, so we use FilterExpression. The post-query
    // .filter() below is defence-in-depth.
    names['#__tid'] = 'tenantId';
    values[':__tid'] = tenantId;
    filters.push('#__tid = :__tid');

    input.FilterExpression = filters.join(' AND ');
    input.ExpressionAttributeNames = { ...(input.ExpressionAttributeNames || {}), ...names };
    input.ExpressionAttributeValues = { ...(input.ExpressionAttributeValues || {}), ...values };

    const { Items = [], LastEvaluatedKey } = await ddb.send(new QueryCommand(input));

    // Step 3 — bulk-decrypt matching items before shaping the response.
    const matched = Items.filter(it => it.tenantId === tenantId);
    await decryptItems(matched, PATIENT_PHI_FIELDS, tenantId);

    const out = matched.map(it => ({
      PK: it.PK,
      name: it.name,
      gender: it.gender,
      insurance: it.insurance,
      dob: it.dob,
      timestamp: it.createdAt || it.timestamp
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: out,
        lastKey: encodeLEK(LastEvaluatedKey)
        // total: use a counter table if you need exact totals
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ message: 'Failed to list patients.' }) };
  }
};

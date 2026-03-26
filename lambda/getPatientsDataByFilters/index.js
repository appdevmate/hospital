// GET /patients?pageSize&lastKey&namePrefix&sortField&sortOrder&gender&insurance&dobFrom&dobTo
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const ddb = DynamoDBDocumentClient.from(client);

const TABLE = process.env.HOSPITAL_TABLE || 'Hospital';
const GSI1 = process.env.GSI_PATIENTS_BY_CREATED || 'GSI1'; // (GSI1PK, GSI1SK)
const GSI2 = process.env.GSI_PATIENTS_BY_NAME || 'GSI2';    // (GSI2PK, GSI2SK)

const encodeLEK = (obj) => obj ? Buffer.from(JSON.stringify(obj)).toString('base64') : null;
const decodeLEK = (s) => s ? JSON.parse(Buffer.from(s, 'base64').toString('utf8')) : undefined;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

exports.handler = async (event) => {
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

    if (filters.length) {
      input.FilterExpression = filters.join(' AND ');
      input.ExpressionAttributeNames = { ...(input.ExpressionAttributeNames || {}), ...names };
      input.ExpressionAttributeValues = { ...(input.ExpressionAttributeValues || {}), ...values };
    }

    const { Items = [], LastEvaluatedKey } = await ddb.send(new QueryCommand(input));

    // Return only the profile fields you render (optional ProjectionExpression above)
    const out = Items.map(it => ({
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
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ message: 'Failed to list patients.' }) };
  }
};

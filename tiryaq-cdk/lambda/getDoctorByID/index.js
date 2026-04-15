const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const REGION = 'us-east-1';
const TABLE = 'Hospital';
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

const hdrs = { 'access-control-allow-origin': '*', 'access-control-allow-credentials': 'true' };

function extractId(raw) {
  if (!raw) return '';
  const s = decodeURIComponent(String(raw)).trim();
  const i = s.indexOf('#');
  return i >= 0 ? s.slice(i + 1) : s; // supports "DOCTOR#<id>" or "<id>"
}

function isSoftDeleted(item) {
  const d = item?.deletedAt;
  return !(d === undefined || d === null || d === '' || d === 'null');
}

exports.handler = async (event) => {
  try {
    const id = extractId(
      event?.pathParameters?.doctorID ??
      event?.pathParameters?.doctorId ??
      event?.pathParameters?.id
    );
    if (!id) return { statusCode: 400, headers: hdrs, body: JSON.stringify({ message: 'Missing doctor id' }) };

    const { Item } = await ddb.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `DOCTOR#${id}`, SK: 'PROFILE' }
    }));

    if (!Item || Item.EntityType !== 'DOCTOR' || isSoftDeleted(Item)) {
      return { statusCode: 404, headers: hdrs, body: JSON.stringify({ message: 'Doctor not found' }) };
    }

    // Strip keys and return all doctor attributes
    const { PK, SK, EntityType, ...attrs } = Item;

    return {
      statusCode: 200,
      headers: hdrs,
      body: JSON.stringify({
        message: 'Doctor retrieved',
        data: { id, ...attrs } // includes name, gender, insurance, department, specialization, phone, qid, dob, timestamp, status, hiringDate, etc.
      })
    };
  } catch (err) {
    if (err?.name === 'AccessDeniedException') {
      return { statusCode: 500, headers: hdrs, body: JSON.stringify({ message: 'Access denied (GetItem)' }) };
    }
    if (err?.name === 'ResourceNotFoundException') {
      return { statusCode: 500, headers: hdrs, body: JSON.stringify({ message: 'Table not found' }) };
    }
    return { statusCode: 500, headers: hdrs, body: JSON.stringify({ message: 'Internal Server Error' }) };
  }
};

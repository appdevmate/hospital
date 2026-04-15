const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, TransactWriteCommand } = require('@aws-sdk/lib-dynamodb');

const REGION = 'us-east-1';
const TABLE = 'Hospital';
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

const hdrs = { 'access-control-allow-origin': '*', 'access-control-allow-credentials': 'true' };

function extractId(raw) {
  if (!raw) return '';
  const s = decodeURIComponent(String(raw)).trim();
  const i = s.indexOf('#');
  return i >= 0 ? s.slice(i + 1) : s;
}

exports.handler = async (event) => {
  try {
    const id = extractId(event?.pathParameters?.patientID ?? event?.pathParameters?.id);
    if (!id) return { statusCode: 400, headers: hdrs, body: JSON.stringify({ message: 'Missing patient id' }) };

    const now = new Date().toISOString();

    // Txn 1) soft-delete patient only if not already deleted
    // Txn 2) decrement COUNTER#PATIENTS TOTAL by 1
    const tx = new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: TABLE,
            Key: { PK: `PATIENT#${id}`, SK: 'PROFILE' },
            UpdateExpression: 'SET #deletedAt = :now',
            ConditionExpression:
              'attribute_exists(PK) AND attribute_exists(SK) AND #type = :t AND ' +
              '(attribute_not_exists(#deletedAt) OR attribute_type(#deletedAt, :nullType) OR #deletedAt = :empty OR #deletedAt = :nullStr)',
            ExpressionAttributeNames: {
              '#type': 'EntityType',
              '#deletedAt': 'deletedAt'
            },
            ExpressionAttributeValues: {
              ':t': 'PATIENT',
              ':now': now,
              ':nullType': 'NULL',
              ':empty': '',
              ':nullStr': 'null'
            }
          }        
        },
        {
          Update: {
            TableName: TABLE,
            Key: { PK: 'COUNTER#PATIENTS', SK: 'TOTAL' },
            // prevent negative drift if attribute missing: init to 0 then add -1
            UpdateExpression: 'SET #total = if_not_exists(#total, :zero) + :dec',
            ExpressionAttributeNames: { '#total': 'total' },
            ExpressionAttributeValues: { ':zero': 0, ':dec': -1 }
          }
        }
      ]
    });

    await ddb.send(tx);

    return { statusCode: 200, headers: hdrs, body: JSON.stringify({ message: `Patient ${id} soft-deleted.` }) };
  } catch (err) {
    if (err?.name === 'ConditionalCheckFailedException') {
      // not found, wrong EntityType, or already soft-deleted
      return { statusCode: 404, headers: hdrs, body: JSON.stringify({ message: 'Patient not found or already deleted' }) };
    }
    if (err?.name === 'AccessDeniedException') {
      return { statusCode: 500, headers: hdrs, body: JSON.stringify({ message: 'Access denied (TransactWriteItems)' }) };
    }
    if (err?.name === 'ResourceNotFoundException') {
      return { statusCode: 500, headers: hdrs, body: JSON.stringify({ message: 'Table not found' }) };
    }
    return { statusCode: 500, headers: hdrs, body: JSON.stringify({ message: 'Internal Server Error' }) };
  }
};

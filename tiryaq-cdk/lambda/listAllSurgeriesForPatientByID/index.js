// GET /patients/{patientID}/payments?pageSize&lastKey
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const ddb = DynamoDBDocumentClient.from(client);

const encodeLEK = (obj) => obj ? Buffer.from(JSON.stringify(obj)).toString('base64') : null;
const decodeLEK = (s) => s ? JSON.parse(Buffer.from(s, 'base64').toString('utf8')) : undefined;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

exports.handler = async (event) => {
  try {
    const patientID = decodeURIComponent(event.pathParameters.patientID);
    const q = event.queryStringParameters || {};
    const pageSize = clamp(parseInt(q.pageSize, 10) || 50, 1, 200);
    const lastKey = decodeLEK(q.lastKey || null);

    const input = {
      TableName: 'Hospital',
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `PATIENT#${patientID}`, ':sk': 'SURGERY#' },
      Limit: pageSize,
      ExclusiveStartKey: lastKey,
      ScanIndexForward: false // newest first if SK encodes time; adjust as needed
    };

    const { Items = [], LastEvaluatedKey } = await ddb.send(new QueryCommand(input));

    return {
      statusCode: 200,
      body: JSON.stringify({
        items: Items,
        lastKey: encodeLEK(LastEvaluatedKey)
      })
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ message: 'Failed to list payments.' }) };
  }
};

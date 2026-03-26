// listDepartments.js
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamo = DynamoDBDocumentClient.from(client);
const TABLE = 'Hospital';

exports.handler = async (event) => {
  console.log('Incoming event:', JSON.stringify(event));
  try {
    const qs = event.queryStringParameters || {};
    const q = String(qs.search || '').trim().toLowerCase();

    const scanBase = {
      TableName: TABLE,
      FilterExpression: '#t = :t',
      ExpressionAttributeNames: { '#t': 'EntityType' },
      ExpressionAttributeValues: { ':t': 'DEPARTMENT' }
    };

    const all = [];
    let ExclusiveStartKey;
    do {
      const res = await dynamo.send(new ScanCommand({ ...scanBase, ExclusiveStartKey }));
      for (const it of res.Items || []) {
        all.push({
          id: it.PK,
          name: it.name,
          code: it.code,
          timestamp: it.timestamp
        });
      }
      ExclusiveStartKey = res.LastEvaluatedKey;
    } while (ExclusiveStartKey);

    const items = q
      ? all.filter(it =>
          (it.name || '').toLowerCase().includes(q) ||
          (it.code || '').toLowerCase().includes(q)
        )
      : all;

    return {
      statusCode: 200,
      body: JSON.stringify({ items, count: items.length, lastKey: null })
    };
  } catch (error) {
    console.error('Error listing departments:', error);
    return { statusCode: 500, body: JSON.stringify({ message: 'Failed to list departments', error: error.message }) };
  }
};
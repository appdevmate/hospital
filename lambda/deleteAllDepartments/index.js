// deleteAllDepartments.js
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'eu-north-1' });
const dynamo = DynamoDBDocumentClient.from(client);
const TABLE = 'Hospital';

const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

async function batchWriteAll(requestItems) {
  let unprocessed = requestItems;
  let attempts = 0;
  while (Object.keys(unprocessed).length) {
    const res = await dynamo.send(new BatchWriteCommand({ RequestItems: unprocessed }));
    unprocessed = res.UnprocessedItems || {};
    if (!Object.keys(unprocessed).length) break;
    attempts++;
    if (attempts > 6) break;                 // stop after a few retries
    await new Promise(r => setTimeout(r, Math.min(200 * 2 ** attempts, 2000)));
  }
  return unprocessed;
}

exports.handler = async () => {
  try {
    // 1) Scan all department keys
    const scanBase = {
      TableName: TABLE,
      ProjectionExpression: 'PK, SK',
      FilterExpression: '#t = :t',
      ExpressionAttributeNames: { '#t': 'EntityType' },
      ExpressionAttributeValues: { ':t': 'DEPARTMENT' }
    };

    const keys = [];
    let ExclusiveStartKey;
    do {
      const res = await dynamo.send(new ScanCommand({ ...scanBase, ExclusiveStartKey }));
      for (const it of res.Items || []) keys.push({ PK: it.PK, SK: it.SK });
      ExclusiveStartKey = res.LastEvaluatedKey;
    } while (ExclusiveStartKey);

    if (!keys.length) {
      return { statusCode: 200, body: JSON.stringify({ message: 'No departments found', deleted: 0 }) };
    }

    // 2) Batch delete in chunks of 25
    const batches = chunk(keys.map(Key => ({ DeleteRequest: { Key } })), 25);
    let deleted = 0;
    for (const b of batches) {
      const unprocessed = await batchWriteAll({ [TABLE]: b });
      const unprocessedCount = unprocessed?.[TABLE]?.length || 0;
      deleted += b.length - unprocessedCount;
      if (unprocessedCount) {
        return {
          statusCode: 207,
          body: JSON.stringify({
            message: 'Partial delete',
            deleted,
            unprocessed: unprocessed[TABLE]
          })
        };
      }
    }

    return { statusCode: 200, body: JSON.stringify({ message: 'All departments deleted', deleted }) };
  } catch (err) {
    console.error('deleteAllDepartments error:', err);
    return { statusCode: 500, body: JSON.stringify({ message: 'Failed to delete departments', error: err.message }) };
  }
};

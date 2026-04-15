const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

const client = new DynamoDBClient({ region: 'eu-north-1' });
const dynamo = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const name = String(body.name || '').trim();
    const code = body.code ? String(body.code).trim() : undefined;
    if (!name) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Missing required field: name' }) };
    }

    const specializationID = `SPECIALIZATION#${randomUUID()}`;
    const timestamp = new Date().toISOString();

    const params = {
      TableName: 'Hospital',
      Item: {
        PK: specializationID,
        SK: 'SPECIALIZATION',
        EntityType: 'SPECIALIZATION',
        name,
        ...(code ? { code } : {}),
        timestamp
      },
      ConditionExpression: 'attribute_not_exists(PK)'
    };

    await dynamo.send(new PutCommand(params));

    return {
      statusCode: 201,
      body: JSON.stringify({ message: 'Specialization created successfully', specializationID })
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ message: 'Failed to create specialization', error: error.message }) };
  }
};

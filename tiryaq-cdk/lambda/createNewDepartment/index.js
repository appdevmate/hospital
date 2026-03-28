const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamo = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  console.log('Incoming event:', JSON.stringify(event));

  try {
    const body = JSON.parse(event.body || '{}');
    const name = String(body.name || '').trim();
    const code = String(body.code || '').trim();

    if (!name || !code) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing required fields: name, code' })
      };
    }

    const departmentID = `DEPARTMENT#${randomUUID()}`;
    const timestamp = new Date().toISOString();

    const params = {
      TableName: 'Hospital',
      Item: {
        PK: departmentID,
        SK: 'DEPARTMENT',
        EntityType: 'DEPARTMENT',
        name,
        code,
        timestamp
      },
      // Optional: prevent overwriting if the same PK somehow re-used
      ConditionExpression: 'attribute_not_exists(PK)'
    };

    await dynamo.send(new PutCommand(params));
    console.log('✅ Department record inserted');

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: 'Department created successfully',
        departmentID
      })
    };
  } catch (error) {
    console.error('❌ Error creating department:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to create department',
        error: error.message
      })
    };
  }
};

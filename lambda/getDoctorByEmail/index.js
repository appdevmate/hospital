const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const REGION = 'us-east-1';
const TABLE = 'Hospital';
const GSI_NAME = 'email-index';

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION })
);

const hdrs = {
  'access-control-allow-origin': '*',
  'access-control-allow-credentials': 'true'
};

// Normalize returned item to a common structure
function normalizeUser(item) {
  const { PK, SK, EntityType, ...attrs } = item;
  return {
    id: PK?.split('#')[1] || '',
    entityType: EntityType,
    ...attrs
  };
}

exports.handler = async (event) => {
  try {
    let email = null;
    let entityType = null; // 'DOCTOR', 'PATIENT', 'NURSE', 'ADMIN'

    // 1️⃣ From query string (?email=...&type=...)
    if (event?.queryStringParameters) {
      if (event.queryStringParameters.email) {
        email = String(event.queryStringParameters.email).trim().toLowerCase();
      }
      if (event.queryStringParameters.type) {
        entityType = String(event.queryStringParameters.type).trim().toUpperCase();
      }
    }

    // 2️⃣ From JSON body { "email": "...", "type": "..." }
    if (event?.body) {
      try {
        const body = JSON.parse(event.body);
        if (!email && body?.email) {
          email = String(body.email).trim().toLowerCase();
          console.log("EMAIL:::",email);
        }
        if (!entityType && body?.type) {
          entityType = String(body.type).trim().toUpperCase();
          console.log("ENTITY TYPE:::",entityType);
          
        }
      } catch {
        // ignore invalid JSON
      }
    }

    if (!email || !entityType) {
      return {
        statusCode: 400,
        headers: hdrs,
        body: JSON.stringify({ message: 'Missing email or entity type' })
      };
    }

    // DynamoDB Query using GSI
    const params = {
      TableName: TABLE,
      IndexName: GSI_NAME,
      KeyConditionExpression: 'email = :email AND EntityType = :type',
      ExpressionAttributeValues: {
        ':email': email,
        ':type': entityType
      },
      Limit: 1
    };

    const { Items } = await ddb.send(new QueryCommand(params));

    if (!Items || Items.length === 0) {
      return {
        statusCode: 404,
        headers: hdrs,
        body: JSON.stringify({ message: `${entityType} not found with email ${email}` })
      };
    }

    const userItem = Items[0];

    // Exclude soft-deleted users
    if (userItem.deletedAt !== undefined && userItem.deletedAt !== null && userItem.deletedAt !== '') {
      return {
        statusCode: 404,
        headers: hdrs,
        body: JSON.stringify({ message: `${entityType} not found with email ${email}` })
      };
    }

    const user = normalizeUser(userItem);

    return {
      statusCode: 200,
      headers: hdrs,
      body: JSON.stringify({
        message: `${entityType} retrieved successfully`,
        data: user
      })
    };

  } catch (err) {
    console.error('Get user by email error:', err?.name, err?.message);

    return {
      statusCode: 500,
      headers: hdrs,
      body: JSON.stringify({ message: 'Internal Server Error' })
    };
  }
};
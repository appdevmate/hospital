const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));
const toLower = (v) => (typeof v === 'string' ? v.toLowerCase() : v ?? null);

exports.handler = async (event) => {
  try {
    const doctorID = decodeURIComponent(event.pathParameters.doctorID);
    const body = JSON.parse(event.body || '{}');

    if (!Object.keys(body).length) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Request body cannot be empty.' }) };
    }

    const protectedFields = ['PK', 'SK', 'EntityType'];
    const alias = { specialty: 'specialization', qatarID: 'qid', QatarID: 'qid' };

    const updateFields = Object.fromEntries(
      Object.entries(body)
        .filter(([k]) => !protectedFields.includes(k))
        .map(([k, v]) => [alias[k] || k, toLower(v)])
        // Never SET a GSI key attribute (email, dataClass, updatedAt, …) to NULL —
        // DynamoDB rejects the write. Skip empty fields instead of nulling them.
        .filter(([, v]) => v !== null && v !== undefined)
    );
    updateFields.updatedAt = new Date().toISOString();

    const keys = Object.keys(updateFields);
    if (!keys.length) {
      return { statusCode: 400, body: JSON.stringify({ message: 'No valid fields to update.' }) };
    }

    const UpdateExpression = 'SET ' + keys.map((_, i) => `#k${i} = :v${i}`).join(', ');
    const ExpressionAttributeNames = Object.fromEntries(keys.map((k, i) => [`#k${i}`, k]));
    const ExpressionAttributeValues = Object.fromEntries(keys.map((k, i) => [`:v${i}`, updateFields[k]]));

    const result = await dynamo.send(new UpdateCommand({
      TableName: 'Hospital',
      Key: { PK: `DOCTOR#${doctorID}`, SK: 'PROFILE' },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ReturnValues: 'ALL_NEW',
      ConditionExpression: 'attribute_exists(PK) AND attribute_exists(SK)'
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Doctor updated successfully', doctorID, updatedData: result.Attributes })
    };
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      return { statusCode: 404, body: JSON.stringify({ message: 'Doctor not found' }) };
    }
    return { statusCode: 500, body: JSON.stringify({ message: 'Failed to update doctor', error: error.message }) };
  }
};

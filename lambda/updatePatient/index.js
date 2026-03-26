const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, TransactWriteCommand } = require('@aws-sdk/lib-dynamodb');

const dynamo  = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));
const TABLE   = 'Hospital';
const toLower = (v) => (typeof v === 'string' ? v.toLowerCase() : v ?? null);

const hdrs = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS'
};

const ok  = (body)          => ({ statusCode: 200, headers: hdrs, body: JSON.stringify(body) });
const err = (code, message) => ({ statusCode: code, headers: hdrs, body: JSON.stringify({ message }) });

exports.handler = async (event) => {
  try {
    const method = event.requestContext?.http?.method || event.httpMethod || '';
    const path   = event.rawPath || event.path || '';

    if (method === 'OPTIONS') return ok({});

    const patientID = decodeURIComponent(
      event.pathParameters?.patientID || event.pathParameters?.id || ''
    );
    if (!patientID) return err(400, 'Missing patient id');

    // ── PATCH /patients/{id}/restore ─────────────────────────────────────
    // Clears deletedAt and increments the patient counter back by 1
    if (path.includes('/restore')) {
      await dynamo.send(new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: TABLE,
              Key: { PK: `PATIENT#${patientID}`, SK: 'PROFILE' },
              UpdateExpression: 'REMOVE #deletedAt',
              ConditionExpression: 'attribute_exists(PK) AND attribute_exists(SK)',
              ExpressionAttributeNames: { '#deletedAt': 'deletedAt' }
            }
          },
          {
            Update: {
              TableName: TABLE,
              Key: { PK: 'COUNTER#PATIENTS', SK: 'TOTAL' },
              UpdateExpression: 'SET #total = if_not_exists(#total, :zero) + :inc',
              ExpressionAttributeNames: { '#total': 'total' },
              ExpressionAttributeValues: { ':zero': 0, ':inc': 1 }
            }
          }
        ]
      }));

      return ok({ message: 'Patient restored successfully', patientId: patientID });
    }

    // ── PATCH /patients/{id} — standard update ───────────────────────────
    const body = JSON.parse(event.body || '{}');

    if (!Object.keys(body).length) {
      return err(400, 'Request body cannot be empty.');
    }

    const protectedFields = ['PK', 'SK', 'EntityType', 'deletedAt'];
    const updateFields = Object.fromEntries(
      Object.entries(body)
        .filter(([k]) => !protectedFields.includes(k))
        .map(([k, v]) => [k, toLower(v)])
    );
    updateFields.updatedAt = new Date().toISOString();

    const keys = Object.keys(updateFields);
    if (!keys.length) return err(400, 'No valid fields to update.');

    const updateExpression         = 'SET ' + keys.map((_, i) => `#k${i} = :v${i}`).join(', ');
    const ExpressionAttributeNames  = Object.fromEntries(keys.map((k, i) => [`#k${i}`, k]));
    const ExpressionAttributeValues = Object.fromEntries(keys.map((k, i) => [`:v${i}`, updateFields[k]]));

    const result = await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `PATIENT#${patientID}`, SK: 'PROFILE' },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ReturnValues: 'ALL_NEW',
      ConditionExpression: 'attribute_exists(PK) AND attribute_exists(SK)'
    }));

    return ok({ message: 'Patient updated successfully', patientID, updatedData: result.Attributes });

  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      return err(404, 'Patient not found');
    }
    return err(500, error.message || 'Failed to update patient');
  }
};
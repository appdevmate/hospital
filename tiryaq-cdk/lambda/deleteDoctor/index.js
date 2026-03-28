const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  TransactWriteCommand
} = require('@aws-sdk/lib-dynamodb');

const REGION = 'us-east-1';
const TABLE = 'Hospital';
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

const HDRS = {
  'content-type': 'application/json',
  'access-control-allow-origin': '*',
  'access-control-allow-credentials': 'true'
};

const extractId = (raw) => {
  if (!raw) return '';
  const s = decodeURIComponent(String(raw)).trim();
  const i = s.indexOf('#');
  return i >= 0 ? s.slice(i + 1) : s;
};

exports.handler = async (event, context) => {
  try {
    const id = extractId(event?.pathParameters?.doctorID ?? event?.pathParameters?.id);
    if (!id) {
      return { statusCode: 400, headers: HDRS, body: JSON.stringify({ message: 'Missing doctor id' }) };
    }

    const now = new Date().toISOString();
    const by = event?.requestContext?.authorizer?.principalId || 'system';
    const reason = (event?.queryStringParameters?.reason || '').toString().slice(0, 200);

    const tx = new TransactWriteCommand({
      ClientRequestToken: context?.awsRequestId,               // idempotency
      ReturnCancellationReasons: true,                          // debug clarity
      TransactItems: [
        {
          Update: {
            TableName: TABLE,
            Key: { PK: `DOCTOR#${id}`, SK: 'PROFILE' },
            UpdateExpression: 'SET #deletedAt = :now, #deletedBy = :by, #deletedReason = :reason',
            ConditionExpression:
              'attribute_exists(PK) AND attribute_exists(SK) AND #type = :t AND ' +
              '(attribute_not_exists(#deletedAt) OR attribute_type(#deletedAt, :nullType) OR #deletedAt = :empty OR #deletedAt = :nullStr)',


            ExpressionAttributeNames: {
              '#type': 'EntityType',
              '#deletedAt': 'deletedAt',
              '#deletedBy': 'deletedBy',
              '#deletedReason': 'deletedReason'
            },
            ExpressionAttributeValues: {
              ':t': 'DOCTOR',
              ':now': now,
              ':by': by,
              ':reason': reason,
              ':nullType': 'NULL',   // <-- key fix
              ':empty': '',
              ':nullStr': 'null'
            },
            ReturnValuesOnConditionCheckFailure: 'ALL_OLD'
          }
        },
        {
          Update: {
            TableName: TABLE,
            Key: { PK: 'COUNTER#DOCTORS', SK: 'TOTAL' },
            UpdateExpression: 'SET #total = if_not_exists(#total, :zero) + :dec',
            ExpressionAttributeNames: { '#total': 'total' },
            ExpressionAttributeValues: { ':zero': 0, ':dec': -1 }
          }
        }
      ]
    });

    await ddb.send(tx);

    return {
      statusCode: 200,
      headers: HDRS,
      body: JSON.stringify({ message: `Doctor ${id} soft-deleted.`, deletedAt: now })
    };

  } catch (err) {
    // Try to distinguish “already deleted” vs “not found”
    if (err?.name === 'TransactionCanceledException' && Array.isArray(err?.CancellationReasons)) {
      const r0 = err.CancellationReasons[0] || {};
      // If the item exists but condition failed, likely already deleted
      if (r0.Code === 'ConditionalCheckFailed' && r0.Item) {
        return {
          statusCode: 409,
          headers: HDRS,
          body: JSON.stringify({ message: 'Doctor already deleted' })
        };
      }
    }

    if (err?.name === 'ConditionalCheckFailedException' || err?.name === 'TransactionCanceledException') {
      // Not found, wrong type, or already deleted without details
      return { statusCode: 404, headers: HDRS, body: JSON.stringify({ message: 'Doctor not found or already deleted' }) };
    }
    if (err?.name === 'AccessDeniedException') {
      return { statusCode: 500, headers: HDRS, body: JSON.stringify({ message: 'Access denied (TransactWriteItems)' }) };
    }
    if (err?.name === 'ResourceNotFoundException') {
      return { statusCode: 500, headers: HDRS, body: JSON.stringify({ message: 'Table not found' }) };
    }

    console.error('Tx delete error:', err?.name, err?.message);
    return { statusCode: 500, headers: HDRS, body: JSON.stringify({ message: 'Internal Server Error' }) };
  }
};

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  TransactWriteCommand,
  GetCommand,
  PutCommand
} = require('@aws-sdk/lib-dynamodb');
// Step 2g — per-tenant rate limit.
const throttle = require('./throttle');

const REGION = 'us-east-1';
const TABLE = 'Hospital';
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

// ── Tenant enforcement (Step 2d) ─────────────────────────────────────────────
function getTenant(event) {
  const claims = (event && event.requestContext && event.requestContext.authorizer
                  && (event.requestContext.authorizer.jwt
                      ? event.requestContext.authorizer.jwt.claims
                      : event.requestContext.authorizer.claims))
              || {};
  const tenantId = claims.tenantId || claims['custom:tenantId'];
  if (!tenantId || tenantId === 'UNASSIGNED') {
    const e = new Error('Tenant not assigned for this user');
    e.statusCode = 403;
    throw e;
  }
  return tenantId;
}

// ── Idempotency (Phase D) ────────────────────────────────────────────────────
function getClientRequestId(event) {
  const h = event.headers || {};
  return h['x-client-request-id'] || h['X-Client-Request-Id'] || null;
}
async function checkIdempotency(cid) {
  if (!cid) return null;
  try {
    const r = await ddb.send(new GetCommand({ TableName: TABLE, Key: { PK: `IDEMP#${cid}`, SK: 'PROFILE' } }));
    if (r.Item && r.Item.response) return JSON.parse(r.Item.response);
  } catch (_) {}
  return null;
}
async function storeIdempotency(cid, response) {
  if (!cid) return;
  try {
    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `IDEMP#${cid}`, SK: 'PROFILE', EntityType: 'IDEMPOTENCY',
        clientRequestId: cid, response: JSON.stringify(response),
        dataClass: 'SYSTEM',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: Math.floor(Date.now() / 1000) + 86400
      }
    }));
  } catch (_) {}
}

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
  if (event && event._warmup) return { ok: true, warmed: true };

  let tenantId;
  try { tenantId = getTenant(event); }
  catch (e) { return { statusCode: e.statusCode || 403, headers: HDRS, body: JSON.stringify({ message: e.message }) }; }
  // Step 2g — per-tenant throttle.
  {
    const __role = (event.requestContext?.authorizer?.jwt?.claims || {}).role || 'tenant_user';
    const __tid = (typeof tenantId !== 'undefined') ? tenantId : (event.requestContext?.authorizer?.jwt?.claims || {}).tenantId;
    const __limitResponse = await throttle.precheck(event, { tenantId: __tid, role: __role });
    if (__limitResponse) return __limitResponse;
  }


  const cid = getClientRequestId(event);
  const cached = await checkIdempotency(cid);
  if (cached) return cached;

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
              'attribute_exists(PK) AND attribute_exists(SK) AND #type = :t AND #tid = :tid AND ' +
              '(attribute_not_exists(#deletedAt) OR attribute_type(#deletedAt, :nullType) OR #deletedAt = :empty OR #deletedAt = :nullStr)',


            ExpressionAttributeNames: {
              '#type': 'EntityType',
              '#deletedAt': 'deletedAt',
              '#deletedBy': 'deletedBy',
              '#deletedReason': 'deletedReason',
              '#tid': 'tenantId'
            },
            ExpressionAttributeValues: {
              ':t': 'DOCTOR',
              ':now': now,
              ':by': by,
              ':reason': reason,
              ':tid': tenantId,
              ':nullType': 'NULL',
              ':empty': '',
              ':nullStr': 'null'
            },
            ReturnValuesOnConditionCheckFailure: 'ALL_OLD'
          }
        },
        {
          Update: {
            TableName: TABLE,
            Key: { PK: `COUNTER#DOCTORS#${tenantId}`, SK: 'TOTAL' },
            UpdateExpression: 'SET #total = if_not_exists(#total, :zero) + :dec, tenantId = :tid, EntityType = :et',
            ExpressionAttributeNames: { '#total': 'total' },
            ExpressionAttributeValues: { ':zero': 0, ':dec': -1, ':tid': tenantId, ':et': 'COUNTER' }
          }
        }
      ]
    });

    await ddb.send(tx);

    const response = {
      statusCode: 200,
      headers: HDRS,
      body: JSON.stringify({ message: `Doctor ${id} soft-deleted.`, deletedAt: now })
    };
    await storeIdempotency(cid, response);
    return response;

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

    return { statusCode: 500, headers: HDRS, body: JSON.stringify({ message: 'Internal Server Error' }) };
  }
};
// hash-bust 2026-06-21T14:28:24.0064697+03:00

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');

// Step 3 — PHI envelope decryption. ./crypto.js synced from _shared/.
// Step 4 — rewritten to look up via emailHash-EntityType-index.
// Plaintext email is now ciphertext on the row, so the legacy email-index
// no longer works. We HMAC the input email with the tenant's KMS HMAC key
// and Query the new index by emailHash.
const { decryptItem, computeHmac, DOCTOR_PHI_FIELDS, PATIENT_PHI_FIELDS } = require('./crypto');
// Step 2g — per-tenant rate limit.
const throttle = require('./throttle');

const REGION = 'us-east-1';
const TABLE = 'Hospital';
const GSI_NAME = 'emailHash-EntityType-index';

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION })
);

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
  if (event && event._warmup) return { ok: true, warmed: true };

  let tenantId;
  try { tenantId = getTenant(event); }
  catch (e) { return { statusCode: e.statusCode || 403, headers: hdrs, body: JSON.stringify({ message: e.message }) }; }
  // Step 2g — per-tenant throttle.
  {
    const __role = (event.requestContext?.authorizer?.jwt?.claims || {}).role || 'tenant_user';
    const __tid = (typeof tenantId !== 'undefined') ? tenantId : (event.requestContext?.authorizer?.jwt?.claims || {}).tenantId;
    const __limitResponse = await throttle.precheck(event, { tenantId: __tid, role: __role });
    if (__limitResponse) return __limitResponse;
  }


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
        }
        if (!entityType && body?.type) {
          entityType = String(body.type).trim().toUpperCase();
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

    // Step 4 — hash the input email with the tenant's KMS HMAC key, then
    // Query the emailHash-EntityType-index. Same plaintext + same tenant
    // always produces the same hash, so equality lookups work despite
    // ciphertext storage of the actual email.
    const emailHash = await computeHmac(email, tenantId);

    const params = {
      TableName: TABLE,
      IndexName: GSI_NAME,
      KeyConditionExpression: 'emailHash = :h AND EntityType = :type',
      ExpressionAttributeValues: {
        ':h': emailHash,
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

    // Step 2d — cross-tenant → 404 (no existence disclosure).
    if (userItem.tenantId !== tenantId) {
      return {
        statusCode: 404,
        headers: hdrs,
        body: JSON.stringify({ message: `${entityType} not found with email ${email}` })
      };
    }

    // Exclude soft-deleted users
    if (userItem.deletedAt !== undefined && userItem.deletedAt !== null && userItem.deletedAt !== '') {
      return {
        statusCode: 404,
        headers: hdrs,
        body: JSON.stringify({ message: `${entityType} not found with email ${email}` })
      };
    }

    // Step 3 — decrypt PHI fields before returning. Choose field list by entity.
    const phiFields = entityType === 'DOCTOR' ? DOCTOR_PHI_FIELDS : PATIENT_PHI_FIELDS;
    await decryptItem(userItem, phiFields, tenantId);

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
    return {
      statusCode: 500,
      headers: hdrs,
      body: JSON.stringify({ message: 'Internal Server Error' })
    };
  }
};
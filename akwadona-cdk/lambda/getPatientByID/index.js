const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

// Step 3 — PHI envelope decryption. See ./crypto.js (sibling, synced from
// _shared/crypto.js by scripts/sync-shared-helpers.js).
const { decryptItem, PATIENT_PHI_FIELDS } = require('./crypto');
// Step 2g — per-tenant rate limit.
const throttle = require('./throttle');

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamo = DynamoDBDocumentClient.from(client);

// ── Tenant enforcement (Step 2d) ─────────────────────────────────────────────
// Inlined from _shared/tenant.js. tenantId from the signed JWT — clients
// cannot forge it. If the patient belongs to another tenant we return 404,
// not 403, so existence of cross-tenant records is not disclosed.
function getTenant(event) {
    const claims = (event && event.requestContext && event.requestContext.authorizer
                    && (event.requestContext.authorizer.jwt
                        ? event.requestContext.authorizer.jwt.claims
                        : event.requestContext.authorizer.claims))
                || {};
    const tenantId = claims.tenantId || claims['custom:tenantId'];
    if (!tenantId || tenantId === 'UNASSIGNED') {
        const err = new Error('Tenant not assigned for this user');
        err.statusCode = 403;
        throw err;
    }
    return tenantId;
}

exports.handler = async (event) => {
    if (event && event._warmup) return { ok: true, warmed: true };

    let tenantId;
    try { tenantId = getTenant(event); }
    catch (e) {
        return {
            statusCode: e.statusCode || 403,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ message: e.message })
        };
    }
  // Step 2g — per-tenant throttle.
  {
    const __role = (event.requestContext?.authorizer?.jwt?.claims || {}).role || 'tenant_user';
    const __tid = (typeof tenantId !== 'undefined') ? tenantId : (event.requestContext?.authorizer?.jwt?.claims || {}).tenantId;
    const __limitResponse = await throttle.precheck(event, { tenantId: __tid, role: __role });
    if (__limitResponse) return __limitResponse;
  }


    try {
        const encodedID = event.pathParameters.patientID;
        const patientID = decodeURIComponent(encodedID);

        const params = {
            TableName: 'Hospital',
            Key: {
                PK: `PATIENT#${patientID}`,
                SK: 'PROFILE'
            }
        };

        const result = await dynamo.send(new GetCommand(params));

        // Treat "not found" and "wrong tenant" identically — never leak
        // that a record exists in another hospital's account.
        if (!result.Item || result.Item.tenantId !== tenantId) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: `Patient with ID ${patientID} not found.`
                })
            };
        }

        // Step 3 — decrypt PHI fields before returning. If the row is a
        // legacy plaintext row (no _kms_dek), decryptItem is a no-op so
        // the response is identical to pre-Step-3 behaviour. Backfill in
        // 3f will convert all legacy rows.
        await decryptItem(result.Item, PATIENT_PHI_FIELDS, tenantId);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Patient retrieved successfully.',
                data: result.Item
            })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Failed to retrieve patient.',
                error: error.message
            })
        };
    }
};
// hash-bust 2026-06-21T14:28:24.0064697+03:00

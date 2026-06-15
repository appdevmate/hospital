const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamo = DynamoDBDocumentClient.from(client);
const TABLE = 'Hospital';

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
    const r = await dynamo.send(new GetCommand({ TableName: TABLE, Key: { PK: `IDEMP#${cid}`, SK: 'PROFILE' } }));
    if (r.Item && r.Item.response) return JSON.parse(r.Item.response);
  } catch (_) {}
  return null;
}
async function storeIdempotency(cid, response) {
  if (!cid) return;
  try {
    await dynamo.send(new PutCommand({
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

// Actor email from the JWT (audit: who created/updated the invoice).
function getActorEmail(event) {
    const claims = event.requestContext?.authorizer?.jwt?.claims
        || event.requestContext?.authorizer?.claims || {};
    return (claims.email || claims.username || 'unknown').toLowerCase().trim();
}

exports.handler = async (event) => {
    if (event && event._warmup) return { ok: true, warmed: true };

    let tenantId;
    try { tenantId = getTenant(event); }
    catch (e) { return { statusCode: e.statusCode || 403, body: JSON.stringify({ message: e.message }) }; }

    const cid = getClientRequestId(event);
    const cached = await checkIdempotency(cid);
    if (cached) return cached;

    try {
        const patientID = decodeURIComponent(event.pathParameters.patientID);
        const body = JSON.parse(event.body);
        const actorEmail = getActorEmail(event);

        // Step 2d — verify the parent patient belongs to caller's tenant
        // before attaching a payment row to it.
        const parent = await dynamo.send(new GetCommand({
            TableName: TABLE, Key: { PK: `PATIENT#${patientID}`, SK: 'PROFILE' }
        }));
        if (!parent.Item || parent.Item.tenantId !== tenantId) {
            return { statusCode: 404, body: JSON.stringify({ message: 'Patient not found' }) };
        }

        if (!body.amount || !body.status) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Missing required fields: amount, status' })
            };
        }

        const paymentUUID = randomUUID();
        const timestamp = new Date().toISOString();

        const item = {
            PK: `PATIENT#${patientID}`,
            SK: `PAYMENT#${paymentUUID}`,
            EntityType: 'PAYMENT',
            tenantId,
            paymentId: paymentUUID,
            patientId: patientID,
            invoiceNumber: body.invoiceNumber || `INV-${Date.now()}`,
            patientName: body.patientName || null,
            doctorId: body.doctorId || null,
            doctorName: body.doctorName || null,
            doctorEmail: body.doctorEmail || null,
            appointmentId: body.appointmentId || null,
            items: body.items || [],
            amount: body.amount,
            insuranceProvider: body.insuranceProvider || null,
            insuranceCoverage: body.insuranceCoverage || 0,
            insuranceAmount: body.insuranceAmount || 0,
            patientOwes: body.patientOwes ?? body.amount,
            status: body.status,
            paymentType: body.paymentType || null,
            dueDate: body.dueDate || null,
            notes: body.notes || null,
            createdBy: actorEmail,
            updatedBy: actorEmail,
            createdAt: timestamp,
            updatedAt: timestamp
        };

        await dynamo.send(new PutCommand({ TableName: 'Hospital', Item: item }));

        const response = {
            statusCode: 201,
            body: JSON.stringify({ message: 'Payment created successfully', data: item })
        };
        await storeIdempotency(cid, response);
        return response;
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to create payment', error: error.message })
        };
    }
};
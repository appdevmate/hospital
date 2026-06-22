const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  TransactWriteCommand,
  UpdateCommand,
  GetCommand,
  PutCommand
} = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

// Step 3 — PHI envelope encryption. ./crypto.js is a copy of
// _shared/crypto.js synced by scripts/sync-shared-helpers.js. Do not
// edit this sibling — edit the master and re-sync.
// Step 4 — also import stampHashes + the patient hash-field map so we
// can write qidHash / emailHash / phoneHash for searchable lookups, and
// computeHmac so we can build hashed lock PKs that are tenant-scoped.
const { encryptItem, stampHashes, computeHmac, PATIENT_PHI_FIELDS, PATIENT_HASH_FIELDS } = require('./crypto');
// Step 2g — per-tenant rate limit.
const throttle = require('./throttle');

const REGION     = 'us-east-1';
const TABLE_NAME = 'Hospital';
const COUNTER_PK = 'COUNTER#PATIENTS';
const COUNTER_SK = 'TOTAL';

const client = new DynamoDBClient({ region: REGION });
const dynamo = DynamoDBDocumentClient.from(client);

// ── Tenant enforcement (Step 2d) ─────────────────────────────────────────────
// Inlined from _shared/tenant.js — see that file for full docs.
// Reads tenantId from the JWT claims (signed by Cognito), so a malicious
// client cannot forge it. Rejects "UNASSIGNED" so users not yet backfilled
// can sign in but can never create patient rows.
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

// ── Idempotency (Phase D) ────────────────────────────────────────────────────
function getClientRequestId(event) {
  const h = event.headers || {};
  return h['x-client-request-id'] || h['X-Client-Request-Id'] || null;
}
async function checkIdempotency(cid) {
  if (!cid) return null;
  try {
    const r = await dynamo.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: `IDEMP#${cid}`, SK: 'PROFILE' } }));
    if (r.Item && r.Item.response) return JSON.parse(r.Item.response);
  } catch (_) {}
  return null;
}
async function storeIdempotency(cid, response) {
  if (!cid) return;
  try {
    await dynamo.send(new PutCommand({
      TableName: TABLE_NAME,
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

/* =========================
   Helpers
========================= */

const toLower = (v) => (typeof v === 'string' ? v.toLowerCase() : v ?? null);

const normalizeString = (v) => {
  if (typeof v !== 'string') return v ?? null;
  return v.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim().toLowerCase();
};

const cleanPhone = (v) => {
  if (v == null) return null;
  let s = String(v).trim();
  let sign = '';
  if (s.startsWith('+')) { sign = '+'; s = s.slice(1); }
  const digits = s.replace(/\D+/g, '');
  return digits ? sign + digits : null;
};

const validateQID = (qid) => {
  if (!qid) return false;
  const cleaned = String(qid).replace(/\D+/g, '');
  return /^\d{11}$/.test(cleaned);
};

/* =========================
   Validation
========================= */

const validatePatient = (patient, index = null) => {
  const errors = [];
  const prefix = index !== null ? `Patient at index ${index}: ` : '';

  if (!patient.name || patient.name.trim().length < 3)
    errors.push(`${prefix}name is required and must be at least 3 characters`);

  if (!patient.dob)
    errors.push(`${prefix}dob is required`);

  if (!patient.gender)
    errors.push(`${prefix}gender is required`);

  // insurance is optional — imported rows may not have it.

  if (!patient.phone)
    errors.push(`${prefix}phone is required`);

  if (!patient.qid || !validateQID(patient.qid))
    errors.push(`${prefix}qid is required and must be exactly 11 digits`);

  return errors;
};

/* =========================
   Item Builder
========================= */

const createPatientItem = (patient, tenantId) => {
  const patientID = `PATIENT#${randomUUID()}`;
  const timestamp = new Date().toISOString();

  return {
    PK: patientID,
    SK: 'PROFILE',
    EntityType: 'PATIENT',
    tenantId,
    // required fields
    name: toLower(patient.name),
    dob: patient.dob,
    gender: toLower(patient.gender),         // may be null — no GSI on gender, so safe
    phone: cleanPhone(patient.phone),
    qid: toLower(patient.qid),
    insurance: toLower(patient.insurance),   // may be null
    // optional string fields
    email: normalizeString(patient.email),
    job: toLower(patient.job),
    specialization: toLower(patient.specialization),
    department: toLower(patient.department),
    status: toLower(patient.status),
    ward: toLower(patient.ward),
    medicalHistory: patient.medicalHistory || null,
    notes: patient.notes || null,
    allergies: patient.allergies || null,
    medications: patient.medications || null,
    // optional fields kept as-is
    admissionDate: patient.admissionDate || null,
    bedNumber: patient.bedNumber || null,
    bloodGroup: patient.bloodGroup || null,
    // audit fields
    // Don't write updatedAt or deletedAt as NULL — the dataClass-index GSI
    // (compliance Update 06) requires updatedAt to be a String when present.
    // Leave them undefined until an actual update / soft-delete happens.
    timestamp,
    createdAt: timestamp,
    updatedAt: timestamp
  };
};

/* =========================
   Single Create
========================= */

const createSinglePatient = async (patient, tenantId, index = null) => {
  const errors = validatePatient(patient, index);
  if (errors.length > 0) throw new Error(errors.join('; '));

  const patientItem     = createPatientItem(patient, tenantId);
  const normalizedQID   = patientItem.qid;
  const normalizedPhone = patientItem.phone;

  // ── Step 4 — Hashed lock PKs ──────────────────────────────────────────
  // Old design: QID#<plaintext-qid> as the lock key. Two problems:
  //   1. Plaintext QID stored in a partition key → PHI leak to anyone
  //      with DynamoDB read access.
  //   2. Cross-tenant collisions — Tiryaq registering QID 123 blocks
  //      Alshifaa from registering the same person.
  // New design: QID#<HMAC(tenantKey, qid)>. Different tenants produce
  // different hashes for the same input, so locks are tenant-scoped.
  // The plaintext QID never appears in a partition key.
  const qidLockHash   = await computeHmac(normalizedQID, tenantId);
  const phoneLockHash = await computeHmac(normalizedPhone, tenantId);
  const qidLockPK     = `QID#${qidLockHash}`;
  const phoneLockPK   = `PHONE#${phoneLockHash}`;

  // ── Check QID lock — same-tenant duplicate detection ──
  const existingQIDLock = await dynamo.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: qidLockPK, SK: 'LOCK' }
  }));
  if (existingQIDLock.Item) {
    throw new Error(`Failed to create patient, QID already exists: ${normalizedQID}`);
  }

  // ── Check phone lock — same-tenant duplicate detection ──
  const existingPhoneLock = await dynamo.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: phoneLockPK, SK: 'LOCK' }
  }));
  if (existingPhoneLock.Item) {
    throw new Error(`Failed to create patient, phone number already exists: ${normalizedPhone}`);
  }

  // ── No locks — create patient + QID lock + phone lock atomically ──
  // Locks carry tenantId so the cross-tenant disclosure check above
  // works on every future read. EntityType=*_LOCK rows are still system
  // rows (no per-tenant Query needed), they just identify the owner.
  const qidLockItem = {
    PK: qidLockPK,
    SK: 'LOCK',
    EntityType: 'QID_LOCK',
    patientPK: patientItem.PK,
    tenantId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const phoneLockItem = {
    PK: phoneLockPK,
    SK: 'LOCK',
    EntityType: 'PHONE_LOCK',
    patientPK: patientItem.PK,
    tenantId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // ── Step 4 — stamp HMAC hashes of QID / email / phone BEFORE encryption ──
  // The crypto helper hashes the plaintext, so it must run before
  // encryptItem() turns those fields into ciphertext. Output fields:
  //   qidHash, emailHash, phoneHash — stay plaintext, indexed by
  //   emailHash-EntityType-index for fast lookups.
  await stampHashes(patientItem, PATIENT_HASH_FIELDS, tenantId);

  // ── Step 3 — PHI envelope encryption ─────────────────────────────────────
  // Locks were built BEFORE this step on purpose: QID/phone lock PKs use
  // plaintext values so cross-tenant uniqueness still works. Inside the
  // patient row itself, the PHI fields (name, dob, qid, phone, email,
  // medicalHistory, notes, allergies, medications, bloodGroup) become
  // base64 ciphertext, and a wrapped DEK is added at `_kms_dek`.
  await encryptItem(patientItem, PATIENT_PHI_FIELDS, tenantId);

  try {
    await dynamo.send(new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: TABLE_NAME,
            Item: patientItem,
            ConditionExpression: 'attribute_not_exists(PK)'
          }
        },
        {
          Put: {
            TableName: TABLE_NAME,
            Item: qidLockItem,
            ConditionExpression: 'attribute_not_exists(PK)'
          }
        },
        {
          Put: {
            TableName: TABLE_NAME,
            Item: phoneLockItem,
            ConditionExpression: 'attribute_not_exists(PK)'
          }
        }
      ]
    }));
  } catch (err) {
    if (err.name === 'TransactionCanceledException') {
      throw new Error('Failed to create patient, QID or phone number already exists');
    }
    throw err;
  }

  // ── Increment per-tenant counter (Step 2d) ─────────────────────────────────
  // Old `COUNTER#PATIENTS` row is left in place as a legacy total but is no
  // longer incremented — counters are per-tenant now so the operator console
  // can show each customer their own counts without scanning the table.
  await dynamo.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: `${COUNTER_PK}#${tenantId}`, SK: COUNTER_SK },
    UpdateExpression: 'SET #t = if_not_exists(#t, :zero) + :one, tenantId = :tid, EntityType = :et',
    ExpressionAttributeNames: { '#t': 'total' },
    ExpressionAttributeValues: { ':one': 1, ':zero': 0, ':tid': tenantId, ':et': 'COUNTER' }
  }));

  return patientItem.PK;
};

/* =========================
   Bulk Create
========================= */

const createBulkPatients = async (patients, tenantId) => {
  const results = { created: [], failed: [] };

  for (let i = 0; i < patients.length; i++) {
    try {
      const patientID = await createSinglePatient(patients[i], tenantId, i);
      results.created.push({ index: i, patientID, name: patients[i].name });
    } catch (err) {
      results.failed.push({ index: i, name: patients[i]?.name || null, reason: err.message });
    }
  }

  return results;
};

/* =========================
   Handler
========================= */

function isAdminOrDeveloper(event) {
  const claims = event.requestContext?.authorizer?.jwt?.claims
              || event.requestContext?.authorizer?.claims || {};
  const raw = claims['cognito:groups'] || '';
  const groups = Array.isArray(raw)
      ? raw
      : String(raw).trim().replace(/^\[/, '').replace(/\]$/, '').split(/[, ]+/).filter(Boolean);
  return groups.some(g => ['Admin','admin','Developers','Developer','developer'].includes(g.trim()));
}

exports.handler = async (event) => {
  if (event && event._warmup) return { ok: true, warmed: true };
  if (!isAdminOrDeveloper(event)) {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: 'Access denied: creating patients is admin-only' })
    };
  }

  // ── Tenant enforcement (Step 2d) ──
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


  // Idempotency (Phase D) — return the cached response if we've seen this id.
  const cid = getClientRequestId(event);
  const cached = await checkIdempotency(cid);
  if (cached) return cached;

  try {
    const body   = JSON.parse(event.body || '{}');
    const isBulk = Array.isArray(body) || Array.isArray(body.patients);

    if (isBulk) {
      const patients = Array.isArray(body) ? body : body.patients;

      if (patients.length === 0) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ message: 'patients array is empty' })
        };
      }

      const results    = await createBulkPatients(patients, tenantId);
      const statusCode = results.created.length === 0 ? 400
                       : results.failed.length  > 0   ? 207
                       : 201;

      return {
        statusCode,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({
          message: results.failed.length > 0
            ? `Created ${results.created.length} patient(s), ${results.failed.length} failed`
            : `Successfully created ${results.created.length} patient(s)`,
          totalRequested: patients.length,
          createdCount: results.created.length,
          failedCount:  results.failed.length,
          created: results.created,
          failed:  results.failed
        })
      };
    }

    // ── Single ──
    const patientID = await createSinglePatient(body, tenantId);

    const response = {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        message: 'Patient created successfully',
        patientID
      })
    };
    await storeIdempotency(cid, response);
    return response;

  } catch (error) {
    const isValidation =
      error.message.includes('required') ||
      error.message.includes('must be') ||
      error.message.includes('valid') ||
      error.message.includes('already exists');

    return {
      statusCode: isValidation ? 400 : 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        message: error.message,
        error: error.message
      })
    };
  }
};// hash-bust 2026-06-21T14:28:24.0064697+03:00

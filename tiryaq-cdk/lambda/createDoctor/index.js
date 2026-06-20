const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  TransactWriteCommand,
  UpdateCommand,
  GetCommand,
  PutCommand
} = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

// Step 3 — PHI envelope encryption. ./crypto.js synced from _shared/.
// Step 4 — stampHashes + computeHmac. Doctor has THREE uniqueness locks
// (email, QID, phone) so we need all three hashes for lock PKs.
const { encryptItem, stampHashes, computeHmac, DOCTOR_PHI_FIELDS, DOCTOR_HASH_FIELDS } = require('./crypto');
// Step 2g — per-tenant rate limit.
const throttle = require('./throttle');

const REGION     = 'us-east-1';
const TABLE_NAME = 'Hospital';
const COUNTER_PK = 'COUNTER#DOCTORS';
const COUNTER_SK = 'TOTAL';

const client = new DynamoDBClient({ region: REGION });
const dynamo = DynamoDBDocumentClient.from(client);

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

const validateEmail = (email) => {
  if (!email) return false;
  const cleaned = normalizeString(email);
  // Step 1 — multi-tenant: removed `@tiryaq.com` lock-in. Standard RFC-style email.
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i.test(cleaned);
};

/* =========================
   Validation
========================= */

const validateDoctor = (doctor, index = null) => {
  const errors = [];
  const prefix = index !== null ? `Doctor at index ${index}: ` : '';

  if (!doctor.name || doctor.name.trim().length < 3)
    errors.push(`${prefix}name is required and must be at least 3 characters`);

  if (!doctor.email || !validateEmail(doctor.email))
    errors.push(`${prefix}valid email is required`);

  if (!doctor.dob)
    errors.push(`${prefix}dob is required`);

  if (!doctor.phone)
    errors.push(`${prefix}phone is required`);

  if (!doctor.qid || !validateQID(doctor.qid))
    errors.push(`${prefix}qid is required and must be exactly 11 digits`);

  return errors;
};

/* =========================
   Item Builder
========================= */

const createDoctorItem = (doctor) => {
  const doctorID  = `DOCTOR#${randomUUID()}`;
  const timestamp = new Date().toISOString();

  return {
    PK: doctorID,
    SK: 'PROFILE',
    EntityType: 'DOCTOR',
    tenantId: doctor.__tenantId,  // Step 2d — caller's tenant from JWT
    name: toLower(doctor.name),
    email: normalizeString(doctor.email),
    dob: doctor.dob,
    phone: cleanPhone(doctor.phone),
    qid: toLower(doctor.qid),
    gender: toLower(doctor.gender),
    job: toLower(doctor.job),
    insurance: toLower(doctor.insurance),
    department: toLower(doctor.department),
    specialization: toLower(doctor.specialization),
    status: toLower(doctor.status),
    licenseNumber: toLower(doctor.licenseNumber),
    hiringDate: doctor.hiringDate || null,
    experienceYears: doctor.experienceYears ?? 0,
    experienceMonths: doctor.experienceMonths ?? 0,
    notes: doctor.notes || null,
    education: doctor.education || null,
    dutyDays: doctor.dutyDays || [],
    dutyStart: doctor.dutyStart || null,
    dutyEnd: doctor.dutyEnd || null,
    bloodGroup: doctor.bloodGroup || null,
    timestamp,
    // Don't write updatedAt or deletedAt as NULL — the dataClass-index GSI
    // (compliance Update 06) requires updatedAt to be a String when present.
    // Leave them undefined until an actual update / soft-delete happens.
    createdAt: timestamp,
    updatedAt: timestamp
  };
};

/* =========================
   Single Create
========================= */

const createSingleDoctor = async (doctor, tenantId, index = null) => {
  const errors = validateDoctor(doctor, index);
  if (errors.length > 0) throw new Error(errors.join('; '));

  doctor.__tenantId = tenantId;
  const doctorItem      = createDoctorItem(doctor);
  const normalizedEmail = doctorItem.email;
  const normalizedQID   = doctorItem.qid;
  const normalizedPhone = doctorItem.phone;
  // Step 4 — hashed, tenant-scoped lock PKs (see createPatient for rationale).
  const emailLockHash = await computeHmac(normalizedEmail, tenantId);
  const qidLockHash   = await computeHmac(normalizedQID, tenantId);
  const phoneLockHash = await computeHmac(normalizedPhone, tenantId);
  const emailLockPK   = `EMAIL#${emailLockHash}`;
  const qidLockPK     = `QID#${qidLockHash}`;
  const phoneLockPK   = `PHONE#${phoneLockHash}`;

  // ── Check email lock — same-tenant duplicate detection ──
  const existingEmailLock = await dynamo.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: emailLockPK, SK: 'LOCK' }
  }));
  if (existingEmailLock.Item) {
    throw new Error(`Failed to create doctor, email already exists: ${normalizedEmail}`);
  }

  // ── Check QID lock — same-tenant duplicate detection ──
  const existingQIDLock = await dynamo.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: qidLockPK, SK: 'LOCK' }
  }));
  if (existingQIDLock.Item) {
    throw new Error(`Failed to create doctor, QID already exists: ${normalizedQID}`);
  }

  // ── Check phone lock — same-tenant duplicate detection ──
  const existingPhoneLock = await dynamo.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: phoneLockPK, SK: 'LOCK' }
  }));
  if (existingPhoneLock.Item) {
    throw new Error(`Failed to create doctor, phone number already exists: ${normalizedPhone}`);
  }

  // ── No locks — create doctor + all locks atomically ──
  const emailLockItem = {
    PK: emailLockPK,
    SK: 'LOCK',
    EntityType: 'EMAIL_LOCK',
    doctorPK:  doctorItem.PK,
    tenantId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const qidLockItem = {
    PK: qidLockPK,
    SK: 'LOCK',
    EntityType: 'QID_LOCK',
    doctorPK:  doctorItem.PK,
    tenantId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const phoneLockItem = {
    PK: phoneLockPK,
    SK: 'LOCK',
    EntityType: 'PHONE_LOCK',
    doctorPK:  doctorItem.PK,
    tenantId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Step 4 — stamp HMAC hashes (qidHash, emailHash, phoneHash) BEFORE
  // encryption so we can index/lookup later.
  await stampHashes(doctorItem, DOCTOR_HASH_FIELDS, tenantId);

  // Step 3 — encrypt doctor PHI before the TransactWrite. Lock PKs were
  // built from plaintext above so cross-tenant uniqueness checks still work.
  await encryptItem(doctorItem, DOCTOR_PHI_FIELDS, tenantId);

  try {
    await dynamo.send(new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: TABLE_NAME,
            Item: doctorItem,
            ConditionExpression: 'attribute_not_exists(PK)'
          }
        },
        {
          Put: {
            TableName: TABLE_NAME,
            Item: emailLockItem,
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
    // Log everything so CloudWatch shows the real failure cause.
    console.error('createDoctor TransactWrite failed:', {
      name: err.name,
      message: err.message,
      cancellationReasons: err.CancellationReasons,
      doctorPK: doctorItem.PK,
      emailLockPK,
      qidLockPK,
      phoneLockPK,
      doctorInput: {
        email: normalizedEmail,
        qid: normalizedQID,
        phone: normalizedPhone,
        name: doctorItem.name
      }
    });
    if (err.name === 'TransactionCanceledException') {
      // CancellationReasons is an array aligned with TransactItems order:
      // [doctorPK, emailLock, qidLock, phoneLock]. Each entry has Code like
      // "ConditionalCheckFailed" or "None" (passed).
      const reasons = err.CancellationReasons || [];
      const labels = ['doctor profile', 'email', 'QID', 'phone'];
      const failed = reasons
        .map((r, i) => (r.Code && r.Code !== 'None') ? labels[i] : null)
        .filter(Boolean);
      const detail = failed.length
        ? `${failed.join(', ')} already exists`
        : 'email, QID, or phone number already exists';
      throw new Error(`Failed to create doctor, ${detail}`);
    }
    throw err;
  }

  // ── Per-tenant counter (Step 2d) ──
  await dynamo.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: `${COUNTER_PK}#${tenantId}`, SK: COUNTER_SK },
    UpdateExpression: 'SET #t = if_not_exists(#t, :zero) + :one, tenantId = :tid, EntityType = :et',
    ExpressionAttributeNames: { '#t': 'total' },
    ExpressionAttributeValues: { ':one': 1, ':zero': 0, ':tid': tenantId, ':et': 'COUNTER' }
  }));

  return doctorItem.PK;
};

/* =========================
   Bulk Create
========================= */

const createBulkDoctors = async (doctors, tenantId) => {
  const results = { created: [], failed: [] };

  for (let i = 0; i < doctors.length; i++) {
    try {
      const doctorID = await createSingleDoctor(doctors[i], tenantId, i);
      results.created.push({ index: i, doctorID, name: doctors[i].name });
    } catch (err) {
      results.failed.push({ index: i, name: doctors[i]?.name || null, reason: err.message });
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
      body: JSON.stringify({ message: 'Access denied: creating doctors is admin-only' })
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


  const cid = getClientRequestId(event);
  const cached = await checkIdempotency(cid);
  if (cached) return cached;

  try {
    const body   = JSON.parse(event.body || '{}');
    const isBulk = Array.isArray(body) || Array.isArray(body.doctors);

    if (isBulk) {
      const doctors = Array.isArray(body) ? body : body.doctors;

      if (doctors.length === 0) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ message: 'doctors array is empty' })
        };
      }

      const results    = await createBulkDoctors(doctors, tenantId);
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
            ? `Created ${results.created.length} doctor(s), ${results.failed.length} failed`
            : `Successfully created ${results.created.length} doctor(s)`,
          totalRequested: doctors.length,
          createdCount: results.created.length,
          failedCount:  results.failed.length,
          created: results.created,
          failed:  results.failed
        })
      };
    }

    // ── Single ──
    const doctorID = await createSingleDoctor(body, tenantId);

    const response = {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        message: 'Doctor created successfully',
        doctorID
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
};
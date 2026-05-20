const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  TransactWriteCommand,
  UpdateCommand,
  GetCommand
} = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

const REGION     = 'us-east-1';
const TABLE_NAME = 'Hospital';
const COUNTER_PK = 'COUNTER#DOCTORS';
const COUNTER_SK = 'TOTAL';

const client = new DynamoDBClient({ region: REGION });
const dynamo = DynamoDBDocumentClient.from(client);

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
  return /^[a-zA-Z0-9._-]+@tiryaq\.com$/i.test(cleaned);
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

const createSingleDoctor = async (doctor, index = null) => {
  const errors = validateDoctor(doctor, index);
  if (errors.length > 0) throw new Error(errors.join('; '));

  const doctorItem      = createDoctorItem(doctor);
  const normalizedEmail = doctorItem.email;
  const normalizedQID   = doctorItem.qid;
  const normalizedPhone = doctorItem.phone;
  const emailLockPK     = `EMAIL#${normalizedEmail}`;
  const qidLockPK       = `QID#${normalizedQID}`;
  const phoneLockPK     = `PHONE#${normalizedPhone}`;

  // ── Check email lock ──
  const existingEmailLock = await dynamo.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: emailLockPK, SK: 'LOCK' }
  }));
  if (existingEmailLock.Item) {
    throw new Error(`Failed to create doctor, email already exists: ${normalizedEmail}`);
  }

  // ── Check QID lock ──
  const existingQIDLock = await dynamo.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: qidLockPK, SK: 'LOCK' }
  }));
  if (existingQIDLock.Item) {
    throw new Error(`Failed to create doctor, QID already exists: ${normalizedQID}`);
  }

  // ── Check phone lock ──
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
    // Avoid updatedAt: null — fails dataClass-index GSI validation (S required).
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const qidLockItem = {
    PK: qidLockPK,
    SK: 'LOCK',
    EntityType: 'QID_LOCK',
    doctorPK:  doctorItem.PK,
    // Avoid updatedAt: null — fails dataClass-index GSI validation (S required).
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const phoneLockItem = {
    PK: phoneLockPK,
    SK: 'LOCK',
    EntityType: 'PHONE_LOCK',
    doctorPK:  doctorItem.PK,
    // Avoid updatedAt: null — fails dataClass-index GSI validation (S required).
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

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

  // ── Increment counter ──
  await dynamo.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: COUNTER_PK, SK: COUNTER_SK },
    UpdateExpression: 'SET #t = if_not_exists(#t, :zero) + :one',
    ExpressionAttributeNames: { '#t': 'total' },
    ExpressionAttributeValues: { ':one': 1, ':zero': 0 }
  }));

  return doctorItem.PK;
};

/* =========================
   Bulk Create
========================= */

const createBulkDoctors = async (doctors) => {
  const results = { created: [], failed: [] };

  for (let i = 0; i < doctors.length; i++) {
    try {
      const doctorID = await createSingleDoctor(doctors[i], i);
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

exports.handler = async (event) => {

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

      const results    = await createBulkDoctors(doctors);
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
    const doctorID = await createSingleDoctor(body);

    return {
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
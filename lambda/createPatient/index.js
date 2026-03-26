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
const COUNTER_PK = 'COUNTER#PATIENTS';
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

  if (!patient.phone)
    errors.push(`${prefix}phone is required`);

  if (!patient.qid || !validateQID(patient.qid))
    errors.push(`${prefix}qid is required and must be exactly 11 digits`);

  if (!patient.insurance)
    errors.push(`${prefix}insurance is required`);

  return errors;
};

/* =========================
   Item Builder
========================= */

const createPatientItem = (patient) => {
  const patientID = `PATIENT#${randomUUID()}`;
  const timestamp = new Date().toISOString();

  return {
    PK: patientID,
    SK: 'PROFILE',
    EntityType: 'PATIENT',
    // required fields
    name: toLower(patient.name),
    dob: patient.dob,
    gender: toLower(patient.gender),
    phone: cleanPhone(patient.phone),
    qid: toLower(patient.qid),
    insurance: toLower(patient.insurance),
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
    timestamp,
    updatedAt: null,
    deletedAt: null
  };
};

/* =========================
   Single Create
========================= */

const createSinglePatient = async (patient, index = null) => {
  const errors = validatePatient(patient, index);
  if (errors.length > 0) throw new Error(errors.join('; '));

  const patientItem     = createPatientItem(patient);
  const normalizedQID   = patientItem.qid;
  const normalizedPhone = patientItem.phone;
  const qidLockPK       = `QID#${normalizedQID}`;
  const phoneLockPK     = `PHONE#${normalizedPhone}`;

  // ── Check QID lock ──
  const existingQIDLock = await dynamo.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: qidLockPK, SK: 'LOCK' }
  }));
  if (existingQIDLock.Item) {
    throw new Error(`Failed to create patient, QID already exists: ${normalizedQID}`);
  }

  // ── Check phone lock ──
  const existingPhoneLock = await dynamo.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: phoneLockPK, SK: 'LOCK' }
  }));
  if (existingPhoneLock.Item) {
    throw new Error(`Failed to create patient, phone number already exists: ${normalizedPhone}`);
  }

  // ── No locks — create patient + QID lock + phone lock atomically ──
  const qidLockItem = {
    PK: qidLockPK,
    SK: 'LOCK',
    EntityType: 'QID_LOCK',
    patientPK: patientItem.PK,
    createdAt: new Date().toISOString(),
    updatedAt: null
  };

  const phoneLockItem = {
    PK: phoneLockPK,
    SK: 'LOCK',
    EntityType: 'PHONE_LOCK',
    patientPK: patientItem.PK,
    createdAt: new Date().toISOString(),
    updatedAt: null
  };

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

  // ── Increment counter ──
  await dynamo.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: COUNTER_PK, SK: COUNTER_SK },
    UpdateExpression: 'SET #t = if_not_exists(#t, :zero) + :one',
    ExpressionAttributeNames: { '#t': 'total' },
    ExpressionAttributeValues: { ':one': 1, ':zero': 0 }
  }));

  return patientItem.PK;
};

/* =========================
   Bulk Create
========================= */

const createBulkPatients = async (patients) => {
  const results = { created: [], failed: [] };

  for (let i = 0; i < patients.length; i++) {
    try {
      const patientID = await createSinglePatient(patients[i], i);
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

exports.handler = async (event) => {
  console.log('Incoming event:', JSON.stringify(event));

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

      const results    = await createBulkPatients(patients);
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
    const patientID = await createSinglePatient(body);

    return {
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

  } catch (error) {
    console.error('Create patient error:', error);

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
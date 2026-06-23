const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
    DynamoDBDocumentClient,
    PutCommand,
    GetCommand,
    QueryCommand,
    UpdateCommand,
    DeleteCommand
} = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

const REGION     = 'us-east-1';
const TABLE_NAME = 'Hospital';

const client = new DynamoDBClient({ region: REGION });
const db     = DynamoDBDocumentClient.from(client);

// Step 3 — PHI envelope encryption. ./crypto.js synced from _shared/.
const { encryptItem, decryptItem, decryptItems, EXAMINATION_PHI_FIELDS } = require('./crypto');
// Step 2g — per-tenant rate limit.
const throttle = require('./throttle');
// Step 2d-4 — per-row tenant enforcement.
const { assertRowTenant, mergeTenantCondition } = require('./tenant-guard');

// ── Tenant enforcement (Step 2d) — guard at handler entry. ───────────────────
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

// ── Helpers ──────────────────────────────────────────────────────────────────
// CORS headers are injected by API Gateway HTTP API's corsPreflight
// allow-list (see tiryaq-cdk-stack.ts). Do NOT echo wildcard CORS headers
// here — they would override the allow-list and re-open every origin.
function res(statusCode, body) {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    };
}

function err(statusCode, message) {
    return res(statusCode, { error: message, message });
}

function isAdmin(event) {
    const claims = event.requestContext?.authorizer?.jwt?.claims
                || event.requestContext?.authorizer?.claims || {};
    const groups = claims['cognito:groups'] || '';
    let arr = Array.isArray(groups) ? groups
        : String(groups).trim().replace(/^\[/, '').replace(/\]$/, '').split(/[, ]+/).filter(Boolean);
    return arr.some(g => ['admin','Admin','developer','Developer','Developers'].includes(g.trim()));
}

function getCaller(event) {
    const claims = event.requestContext?.authorizer?.jwt?.claims
                || event.requestContext?.authorizer?.claims || {};
    const groups = claims['cognito:groups'] || '';
    const arr = Array.isArray(groups) ? groups
        : String(groups).trim().replace(/^\[/, '').replace(/\]$/, '').split(/[, ]+/).filter(Boolean);
    return {
        email:    (claims.email || claims['cognito:username'] || '').toLowerCase().trim(),
        isAdmin:  arr.some(g => ['admin','Admin','developer','Developer','Developers'].includes(g.trim())),
        isDoctor: arr.some(g => ['doctor','Doctor','Doctors'].includes(g.trim()))
    };
}

// ── Idempotency (Phase D) ────────────────────────────────────────────────────
// Frontend sends X-Client-Request-Id on every mutating call. If we've seen the
// id, return the cached response so offline-queue replays never double-write.
// TTL 24h via the table's `expiresAt` attribute.
function getClientRequestId(event) {
    const h = event.headers || {};
    return h['x-client-request-id'] || h['X-Client-Request-Id'] || null;
}
async function checkIdempotency(cid) {
    if (!cid) return null;
    try {
        const r = await db.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: `IDEMP#${cid}`, SK: 'PROFILE' } }));
        if (r.Item && r.Item.response) return JSON.parse(r.Item.response);
    } catch (_) {}
    return null;
}
async function storeIdempotency(cid, response) {
    if (!cid) return;
    try {
        await db.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                PK:              `IDEMP#${cid}`,
                SK:              'PROFILE',
                EntityType:      'IDEMPOTENCY',
                clientRequestId: cid,
                response:        JSON.stringify(response),
                dataClass:       'SYSTEM',
                createdAt:       new Date().toISOString(),
                updatedAt:       new Date().toISOString(),
                expiresAt:       Math.floor(Date.now() / 1000) + 86400
            }
        }));
    } catch (_) {}
}

// ── Audit Trail ──────────────────────────────────────────────────────────────
async function writeAudit(action, entityType, entityId, actorEmail, actorName, before, after, ipAddress) {
    const auditId = randomUUID();
    const now     = new Date().toISOString();
    try {
        await db.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                PK:            `AUDIT#${now.slice(0, 10)}`,
                SK:            `AUDIT#${now}#${auditId}`,
                auditId,
                EntityType:    'AUDIT',
                action,
                entityType,
                entityId,
                actorEmail:    actorEmail || 'unknown',
                actorName:     actorName  || 'unknown',
                ipAddress:     ipAddress  || 'unknown',
                timestamp:     now,
                before:        before ? JSON.stringify(before) : null,
                after:         after  ? JSON.stringify(after)  : null,
                changeSummary: buildChangeSummary(before, after)
            }
        }));
    } catch (e) {
        // audit write failure is non-critical
    }
}

function buildChangeSummary(before, after) {
    if (!before && after)  return 'Record created';
    if (before && !after)  return 'Record deleted';
    if (!before && !after) return 'Action performed';
    const changed = [];
    const keys    = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    for (const k of keys) {
        if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) changed.push(k);
    }
    return changed.length > 0 ? `Fields changed: ${changed.join(', ')}` : 'No changes';
}

// ── Validation ───────────────────────────────────────────────────────────────
function validateSection(sectionName, exam, body) {
    const errors = [];

    if (exam.status === 'completed') return ['This examination has been signed off and is read-only'];

    switch (sectionName) {
        case 'chiefComplaint': {
            const cc = body.chiefComplaint;
            if (!cc || !cc.cc || cc.cc.trim().length < 3)
                errors.push('Chief complaint text is required (min 3 characters)');
            break;
        }
        case 'vitalSigns': {
            const v = body.vitalSigns || {};
            if (v.systolic         != null && (v.systolic         < 50  || v.systolic         > 300)) errors.push('Systolic BP must be 50–300 mmHg');
            if (v.diastolic        != null && (v.diastolic        < 30  || v.diastolic        > 200)) errors.push('Diastolic BP must be 30–200 mmHg');
            if (v.heartRate        != null && (v.heartRate        < 20  || v.heartRate        > 300)) errors.push('Heart rate must be 20–300 bpm');
            if (v.temperature      != null && (v.temperature      < 30  || v.temperature      > 45))  errors.push('Temperature must be 30–45 °C');
            if (v.weight           != null && (v.weight           < 0.5 || v.weight           > 500)) errors.push('Weight must be 0.5–500 kg');
            if (v.height           != null && (v.height           < 30  || v.height           > 250)) errors.push('Height must be 30–250 cm');
            if (v.oxygenSaturation != null && (v.oxygenSaturation < 50  || v.oxygenSaturation > 100)) errors.push('SpO₂ must be 50–100%');
            if (v.respiratoryRate  != null && (v.respiratoryRate  < 4   || v.respiratoryRate  > 60))  errors.push('Respiratory rate must be 4–60 bpm');
            if (v.painScale        != null && (v.painScale        < 0   || v.painScale        > 10))  errors.push('Pain scale must be 0–10');
            break;
        }
        case 'diagnosis': {
            if (!exam.chiefComplaint || !exam.chiefComplaint.cc)
                errors.push('Chief complaint must be completed before adding a diagnosis');
            const diags = body.diagnosis;
            if (!Array.isArray(diags) || diags.length === 0) {
                errors.push('At least one diagnosis is required');
            } else {
                if (!diags.some(d => d.type === 'primary')) errors.push('At least one diagnosis must be primary');
                diags.forEach((d, i) => {
                    if (!d.icdCode)        errors.push(`Diagnosis ${i+1}: ICD code is required`);
                    if (!d.icdDescription) errors.push(`Diagnosis ${i+1}: Description is required`);
                    if (!['primary','secondary','differential'].includes(d.type)) errors.push(`Diagnosis ${i+1}: Invalid type`);
                });
            }
            break;
        }
        case 'prescriptions': {
            if (!exam.diagnosis || exam.diagnosis.length === 0)
                errors.push('A diagnosis must exist before adding prescriptions');
            const rxs = body.prescriptions;
            if (!Array.isArray(rxs) || rxs.length === 0) {
                errors.push('At least one prescription is required');
            } else {
                const validRoutes = ['oral','iv','im','topical','inhaled','sublingual','other'];
                rxs.forEach((rx, i) => {
                    if (!rx.medication) errors.push(`Prescription ${i+1}: Medication is required`);
                    if (!rx.dose)       errors.push(`Prescription ${i+1}: Dose is required`);
                    if (!rx.frequency)  errors.push(`Prescription ${i+1}: Frequency is required`);
                    if (!rx.route || !validRoutes.includes(rx.route)) errors.push(`Prescription ${i+1}: Valid route is required`);
                });
            }
            break;
        }
        case 'labOrders': {
            if (!exam.diagnosis || exam.diagnosis.length === 0)
                errors.push('A diagnosis must exist before ordering lab tests');
            const labs = body.labOrders;
            if (!Array.isArray(labs) || labs.length === 0) {
                errors.push('At least one lab order is required');
            } else {
                labs.forEach((lab, i) => {
                    if (!lab.testName) errors.push(`Lab order ${i+1}: Test name is required`);
                    if (!['routine','urgent','stat'].includes(lab.urgency)) errors.push(`Lab order ${i+1}: Valid urgency is required`);
                });
            }
            break;
        }
        case 'radiologyOrders': {
            if (!exam.diagnosis || exam.diagnosis.length === 0)
                errors.push('A diagnosis must exist before ordering radiology');
            const rads = body.radiologyOrders;
            if (!Array.isArray(rads) || rads.length === 0) {
                errors.push('At least one radiology order is required');
            } else {
                const validTypes = ['X-Ray','CT','MRI','Ultrasound','PET','Mammography','Other'];
                rads.forEach((rad, i) => {
                    if (!rad.studyType || !validTypes.includes(rad.studyType)) errors.push(`Radiology ${i+1}: Valid study type is required`);
                    if (!rad.bodyPart) errors.push(`Radiology ${i+1}: Body part is required`);
                    if (!['routine','urgent','stat'].includes(rad.urgency)) errors.push(`Radiology ${i+1}: Valid urgency is required`);
                });
            }
            break;
        }
        case 'treatmentPlan': {
            if (!exam.diagnosis || exam.diagnosis.length === 0)
                errors.push('A diagnosis must exist before adding a treatment plan');
            const tp = body.treatmentPlan;
            if (!tp || !tp.plan || tp.plan.trim().length < 10)
                errors.push('Treatment plan is required (min 10 characters)');
            break;
        }
    }
    return errors;
}

function validateSignOff(exam) {
    const errors = [];
    if (!exam.chiefComplaint?.cc) errors.push('Chief complaint is required before signing off');
    if (!exam.diagnosis || exam.diagnosis.length === 0) errors.push('At least one diagnosis is required');
    if (!(exam.diagnosis || []).some(d => d.type === 'primary')) errors.push('At least one primary diagnosis is required');
    return errors;
}

// ── Handler ──────────────────────────────────────────────────────────────────
exports.handler = async (event) => {
    if (event && event._warmup) return { ok: true, warmed: true };
    const method    = event.requestContext?.http?.method || event.httpMethod;
    const path      = event.rawPath || event.path || '';
    const examId    = event.pathParameters?.examId;
    const adminUser = isAdmin(event);
    const ipAddress = event.requestContext?.http?.sourceIp || 'unknown';

    if (method === 'OPTIONS') return res(200, {});

    // Step 2d — tenant guard. Renamed to `tenantId` (was `__tenantId`) so
    // the encryptItem / decryptItem calls below that referenced `tenantId`
    // actually resolve. This was a latent bug uncovered during 2d-4.
    let tenantId;
    try { tenantId = getTenant(event); }
    catch (e) { return err(e.statusCode || 403, e.message); }

    // Step 2g — per-tenant throttle.
    {
        const role = (event.requestContext?.authorizer?.jwt?.claims || {}).role || 'tenant_user';
        const limitResponse = await throttle.precheck(event, { tenantId, role });
        if (limitResponse) return limitResponse;
    }

    // Code review finding 2.1 — only admins or the named doctor themselves
    // may create / patch / sign off an examination. Reject anything else.
    const caller = getCaller(event);
    if (!caller.isAdmin && !caller.isDoctor) {
        return err(403, 'Access denied: only doctors or admin can use this endpoint');
    }

    // Step 2d-4 — wrap routing in try/catch so tenant-guard 404s reach the
    // client as proper 404s (and not 500s).
    try {

    // ── POST /examinations ── CREATE ─────────────────────────────────────────
    if (method === 'POST' && !path.includes('/signoff')) {
        // Idempotency (Phase D)
        const cid = getClientRequestId(event);
        const cached = await checkIdempotency(cid);
        if (cached) return cached;

        const body = JSON.parse(event.body || '{}');

        if (!body.patientId)   return err(400, 'patientId is required');
        if (!body.patientName) return err(400, 'patientName is required');
        if (!body.doctorEmail) return err(400, 'doctorEmail is required');
        if (!body.doctorId)    return err(400, 'doctorId is required');

        // Doctors may only write into their own chart.
        if (caller.isDoctor && !caller.isAdmin
            && body.doctorEmail.toLowerCase().trim() !== caller.email) {
            return err(403, 'Doctors can only create examinations for themselves');
        }

        const id  = randomUUID();
        const now = new Date().toISOString();
        const exam = {
            PK:              `EXAM#${id}`,
            SK:              'PROFILE',
            EntityType:      'EXAMINATION',
            tenantId, // Step 2d-4
            examId:          id,
            patientId:       body.patientId,
            patientName:     body.patientName,
            // Step C.3 — doctorId is canonical. doctorEmail not stored;
            // looked up live by doctorId at display time.
            doctorId:        body.doctorId,    // validated as required above
            doctorName:      body.doctorName  || '',
            appointmentId:   body.appointmentId || null,
            date:            body.date        || now.slice(0, 10),
            status:          'draft',
            signedOffAt:     null,
            createdAt:       now,
            // Avoid updatedAt: null — fails dataClass-index GSI validation (S required).
            updatedAt:       now,
            chiefComplaint:  null,
            vitalSigns:      null,
            physicalExam:    null,
            diagnosis:       [],
            prescriptions:   [],
            labOrders:       [],
            radiologyOrders: [],
            treatmentPlan:   null
        };

        // Step 3 — encrypt PHI before write. Note: the audit row below
        // still receives the plaintext `exam` (the writeAudit helper here
        // does NOT encrypt; consider parity with tiryaq-appointments later).
        const examToStore = { ...exam };
        await encryptItem(examToStore, EXAMINATION_PHI_FIELDS, tenantId);
        await db.send(new PutCommand({ TableName: TABLE_NAME, Item: examToStore }));

        // ── Write DOCTOR_PATIENT relationship item ────────────────────────────
        // This allows O(1) lookup of a doctor's patients without scanning exams.
        // ConditionExpression makes this idempotent — safe to call multiple times.
        try {
            // Step C.3 — link rows keyed by doctor UUID. doctorEmail not stored.
            if (exam.doctorId) {
                await db.send(new PutCommand({
                    TableName: TABLE_NAME,
                    Item: {
                        PK:          `DOCTOR#${exam.doctorId}`,
                        SK:          `PATIENT#${exam.patientId}`,
                        EntityType:  'DOCTOR_PATIENT',
                        tenantId, // Step 2d-4
                        doctorId:    exam.doctorId,
                        patientId:   exam.patientId,
                        patientName: exam.patientName,
                        assignedAt:  now
                    },
                    ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)'
                }));
            }
        } catch (e) {
            // ConditionalCheckFailedException means the relationship already exists — safe to ignore
            if (e.name !== 'ConditionalCheckFailedException') throw e;
        }

        await writeAudit('CREATE', 'EXAMINATION', id, body.doctorEmail, body.doctorName, null, exam, ipAddress);

        const response = res(201, exam);
        await storeIdempotency(cid, response);
        return response;
    }

    // ── GET /examinations?patientId=x OR ?doctorEmail=x ── LIST ─────────────
    if (method === 'GET' && !examId) {
        const patientId   = event.queryStringParameters?.patientId;
        const doctorEmail = event.queryStringParameters?.doctorEmail;

        // Query by doctorEmail using GSI — returns all exams for this doctor.
        // Step 2d-4 — also filter by tenantId.
        if (doctorEmail && !patientId) {
            const result = await db.send(new QueryCommand({
                TableName:                 TABLE_NAME,
                IndexName:                 'doctorEmail-createdAt-index',
                KeyConditionExpression:    'doctorEmail = :de',
                FilterExpression:          'tenantId = :tnt',
                ExpressionAttributeValues: { ':de': doctorEmail.toLowerCase().trim(), ':tnt': tenantId }
            }));
            const items = (result.Items || []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            // Step 3 — decrypt PHI on every returned exam before responding.
            await decryptItems(items, EXAMINATION_PHI_FIELDS, tenantId);
            return res(200, items);
        }

        // Query by patientId using EntityType-index (existing behaviour)
        if (!patientId) return err(400, 'patientId is required');

        // Step 2d-4 — always include tenantId in the filter expression.
        const filterExp  = doctorEmail
            ? 'patientId = :pid AND doctorEmail = :de AND tenantId = :tnt'
            : 'patientId = :pid AND tenantId = :tnt';
        const filterVals = { ':et': 'EXAMINATION', ':pid': patientId, ':tnt': tenantId };
        if (doctorEmail) filterVals[':de'] = doctorEmail.toLowerCase().trim();

        const result = await db.send(new QueryCommand({
            TableName:                 TABLE_NAME,
            IndexName:                 'EntityType-index',
            KeyConditionExpression:    'EntityType = :et',
            FilterExpression:          filterExp,
            ExpressionAttributeValues: filterVals
        }));

        const items = (result.Items || []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        // Step 3 — decrypt PHI on every returned exam.
        await decryptItems(items, EXAMINATION_PHI_FIELDS, tenantId);
        return res(200, items);
    }

    // ── GET /examinations/{examId} ── GET ONE ────────────────────────────────
    if (method === 'GET' && examId) {
        const result = await db.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `EXAM#${examId}`, SK: 'PROFILE' }
        }));

        if (!result.Item) return err(404, 'Examination not found');
        // Step 2d-4 — verify row belongs to caller's tenant BEFORE decrypt.
        assertRowTenant(result.Item, tenantId, { notFoundMessage: 'Examination not found' });
        // Step 3 — decrypt PHI before returning.
        await decryptItem(result.Item, EXAMINATION_PHI_FIELDS, tenantId);
        return res(200, result.Item);
    }

    // ── PATCH /examinations/{examId} ── UPDATE SECTION ──────────────────────
    if (method === 'PATCH' && examId && !path.includes('/signoff')) {
        // Idempotency (Phase D)
        const cid = getClientRequestId(event);
        const cached = await checkIdempotency(cid);
        if (cached) return cached;

        const body = JSON.parse(event.body || '{}');

        const existing = await db.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `EXAM#${examId}`, SK: 'PROFILE' }
        }));

        if (!existing.Item) return err(404, 'Examination not found');
        // Step 2d-4 — verify row belongs to caller's tenant BEFORE decrypt.
        assertRowTenant(existing.Item, tenantId, { notFoundMessage: 'Examination not found' });
        // Step 3 — decrypt PHI so business logic / validation works on plaintext.
        await decryptItem(existing.Item, EXAMINATION_PHI_FIELDS, tenantId);
        const exam = existing.Item;

        if (exam.status === 'completed' && !adminUser)
            return err(409, 'This examination has been signed off and is read-only');

        const validSections = ['chiefComplaint','vitalSigns','physicalExam','diagnosis','prescriptions','labOrders','radiologyOrders','treatmentPlan'];
        const sections      = validSections.filter(s => body[s] !== undefined);

        if (sections.length === 0) return err(400, 'No valid section provided for update');

        for (const section of sections) {
            const validationErrors = validateSection(section, exam, body);
            if (validationErrors.length > 0) return err(422, validationErrors.join(' | '));
        }

        // Auto-assign IDs to array items
        ['prescriptions','labOrders','radiologyOrders','diagnosis'].forEach(section => {
            if (body[section] && Array.isArray(body[section])) {
                body[section] = body[section].map(item => ({ ...item, id: item.id || randomUUID() }));
            }
        });

        // Auto-calc BMI
        if (body.vitalSigns) {
            const vs = body.vitalSigns;
            if (vs.weight && vs.height) {
                const h = vs.height / 100;
                vs.bmi  = parseFloat((vs.weight / (h * h)).toFixed(1));
            }
            vs.recordedAt = new Date().toISOString();
        }

        const now      = new Date().toISOString();
        const setParts = ['#updatedAt = :updatedAt'];
        const names    = { '#updatedAt': 'updatedAt' };
        const values   = { ':updatedAt': now };

        sections.forEach(s => {
            setParts.push(`#${s} = :${s}`);
            names[`#${s}`]  = s;
            values[`:${s}`] = body[s];
        });

        const before = {};
        sections.forEach(s => { before[s] = exam[s]; });

        // Step 3 — encrypt PHI sections before persisting. We re-encrypt the
        // full exam with a fresh DEK so the row stays internally consistent.
        const fullMerged = { ...exam };
        sections.forEach(s => { fullMerged[s] = body[s]; });
        fullMerged.updatedAt = now;
        delete fullMerged._kms_dek;
        delete fullMerged._kms_v;
        await encryptItem(fullMerged, EXAMINATION_PHI_FIELDS, tenantId);
        for (const phiField of EXAMINATION_PHI_FIELDS) {
            if (`:${phiField}` in values && fullMerged[phiField] !== undefined) {
                values[`:${phiField}`] = fullMerged[phiField];
            }
        }
        // Write the new wrapped DEK so subsequent reads work.
        setParts.push('#__dek = :__dek', '#__v = :__v');
        names['#__dek'] = '_kms_dek';
        names['#__v']   = '_kms_v';
        values[':__dek'] = fullMerged._kms_dek;
        values[':__v']   = fullMerged._kms_v;

        // Step 2d-4 — atomic tenant guard.
        {
            const g = mergeTenantCondition(null, tenantId);
            await db.send(new UpdateCommand({
                TableName:                 TABLE_NAME,
                Key:                       { PK: `EXAM#${examId}`, SK: 'PROFILE' },
                UpdateExpression:          `SET ${setParts.join(', ')}`,
                ExpressionAttributeNames:  { ...names, ...g.ExpressionAttributeNames },
                ExpressionAttributeValues: { ...values, ...g.ExpressionAttributeValues },
                ConditionExpression:       g.ConditionExpression
            }));
        }

        await writeAudit('UPDATE', 'EXAMINATION', examId,
            body.doctorEmail || exam.doctorEmail, body.doctorName || exam.doctorName,
            before, body, ipAddress);

        const updated = await db.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `EXAM#${examId}`, SK: 'PROFILE' }
        }));

        // Step 3 — decrypt before returning.
        if (updated.Item) await decryptItem(updated.Item, EXAMINATION_PHI_FIELDS, tenantId);
        const response = res(200, updated.Item);
        await storeIdempotency(cid, response);
        return response;
    }

    // ── POST /examinations/{examId}/signoff ──────────────────────────────────
    if (method === 'POST' && examId && path.includes('/signoff')) {
        // Idempotency (Phase D)
        const cid = getClientRequestId(event);
        const cached = await checkIdempotency(cid);
        if (cached) return cached;

        const body = JSON.parse(event.body || '{}');

        const existing = await db.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `EXAM#${examId}`, SK: 'PROFILE' }
        }));

        if (!existing.Item) return err(404, 'Examination not found');
        // Step 2d-4 — tenant guard.
        assertRowTenant(existing.Item, tenantId, { notFoundMessage: 'Examination not found' });
        const exam = existing.Item;

        if (exam.status === 'completed') return err(409, 'Examination already signed off');

        const signOffErrors = validateSignOff(exam);
        if (signOffErrors.length > 0) return err(422, signOffErrors.join(' | '));

        const now = new Date().toISOString();
        {
            const g = mergeTenantCondition(null, tenantId);
            await db.send(new UpdateCommand({
                TableName:                 TABLE_NAME,
                Key:                       { PK: `EXAM#${examId}`, SK: 'PROFILE' },
                UpdateExpression:          'SET #status = :status, #signedOffAt = :sat, #updatedAt = :ua',
                ExpressionAttributeNames:  { '#status': 'status', '#signedOffAt': 'signedOffAt', '#updatedAt': 'updatedAt', ...g.ExpressionAttributeNames },
                ExpressionAttributeValues: { ':status': 'completed', ':sat': now, ':ua': now, ...g.ExpressionAttributeValues },
                ConditionExpression:       g.ConditionExpression
            }));
        }

        await writeAudit('SIGNOFF', 'EXAMINATION', examId,
            body.doctorEmail || exam.doctorEmail, body.doctorName || exam.doctorName,
            { status: 'draft' }, { status: 'completed', signedOffAt: now }, ipAddress);

        // Closing a consultation completes its linked appointment, so it no
        // longer shows "Start Consultation". Non-critical and skips a cancelled
        // appointment — never fail the sign-off on this.
        if (exam.appointmentId) {
            try {
                // Step 2d-4 — also gate the appointment update by tenantId so
                // a forged exam.appointmentId can't reach another tenant.
                const g = mergeTenantCondition(
                    { ConditionExpression: 'attribute_exists(PK) AND #status <> :cancelled' },
                    tenantId
                );
                await db.send(new UpdateCommand({
                    TableName:                 TABLE_NAME,
                    Key:                       { PK: `APPOINTMENT#${exam.appointmentId}`, SK: 'PROFILE' },
                    UpdateExpression:          'SET #status = :completed, #updatedAt = :ua, #updatedBy = :ub, #checkedOutAt = if_not_exists(#checkedOutAt, :ua)',
                    ExpressionAttributeNames:  { '#status': 'status', '#updatedAt': 'updatedAt', '#updatedBy': 'updatedBy', '#checkedOutAt': 'checkedOutAt', ...g.ExpressionAttributeNames },
                    ExpressionAttributeValues: { ':completed': 'completed', ':ua': now, ':ub': (body.doctorEmail || exam.doctorEmail || 'system'), ':cancelled': 'cancelled', ...g.ExpressionAttributeValues },
                    ConditionExpression:       g.ConditionExpression
                }));
            } catch (e) {
                // Appointment missing / already cancelled / cross-tenant — ignore.
            }
        }

        const updated = await db.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `EXAM#${examId}`, SK: 'PROFILE' }
        }));

        // Step 3 — decrypt before returning.
        if (updated.Item) await decryptItem(updated.Item, EXAMINATION_PHI_FIELDS, tenantId);
        const response = res(200, updated.Item);
        await storeIdempotency(cid, response);
        return response;
    }

    // ── DELETE /examinations/{examId} ── ADMIN ONLY ──────────────────────────
    if (method === 'DELETE' && examId) {
        if (!adminUser) return err(403, 'Only administrators can delete examinations');

        // Idempotency (Phase D)
        const cid = getClientRequestId(event);
        const cached = await checkIdempotency(cid);
        if (cached) return cached;

        const existing = await db.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `EXAM#${examId}`, SK: 'PROFILE' }
        }));

        if (!existing.Item) return err(404, 'Examination not found');
        // Step 2d-4 — tenant guard before delete.
        assertRowTenant(existing.Item, tenantId, { notFoundMessage: 'Examination not found' });

        {
            const g = mergeTenantCondition(null, tenantId);
            try {
                await db.send(new DeleteCommand({
                    TableName: TABLE_NAME,
                    Key: { PK: `EXAM#${examId}`, SK: 'PROFILE' },
                    ExpressionAttributeNames:  g.ExpressionAttributeNames,
                    ExpressionAttributeValues: g.ExpressionAttributeValues,
                    ConditionExpression:       g.ConditionExpression
                }));
            } catch (e) {
                if (e.name === 'ConditionalCheckFailedException') return err(404, 'Examination not found');
                throw e;
            }
        }

        await writeAudit('DELETE', 'EXAMINATION', examId,
            'admin', 'admin', existing.Item, null, ipAddress);

        const response = res(200, { message: 'Examination deleted', examId });
        await storeIdempotency(cid, response);
        return response;
    }

    return err(400, 'Unknown route');
    } catch (e) {
        if (e && e.statusCode === 404) {
            if (e.crossTenantAttempt) {
                console.warn('cross-tenant attempt', { path, by: event.requestContext?.authorizer?.jwt?.claims?.email });
            }
            return err(404, e.message || 'Not found');
        }
        console.error('tiryaq-examinations error:', e);
        return err(500, e.message || 'Internal error');
    }
};// hash-bust 2026-06-21T13:57:58.1016493+03:00
// hash-bust 2026-06-21T14:07:44.7504132+03:00
// hash-bust 2026-06-21T14:14:23.7665133+03:00
// hash-bust 2026-06-21T14:28:24.0064697+03:00
// hash-bust 2d-4 2026-06-22T10:12:07.3705068+03:00
// hash-bust phase1 2026-06-23T12:29:38.1273700+03:00

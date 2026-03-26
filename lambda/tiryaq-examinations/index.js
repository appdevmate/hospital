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

// ── Helpers ──────────────────────────────────────────────────────────────────
function res(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS'
        },
        body: JSON.stringify(body)
    };
}

function err(statusCode, message) {
    return res(statusCode, { error: message, message });
}

// Extract group membership from Cognito claims (passed by API GW JWT authorizer)
function getClaims(event) {
    return event.requestContext?.authorizer?.jwt?.claims
        || event.requestContext?.authorizer?.claims
        || {};
}

function isAdmin(event) {
    const claims = event.requestContext?.authorizer?.jwt?.claims
                || event.requestContext?.authorizer?.claims || {};
    const groups = claims['cognito:groups'] || '';
    let arr = Array.isArray(groups) ? groups
        : String(groups).trim().replace(/^\[/, '').replace(/\]$/, '').split(/[, ]+/).filter(Boolean);
    return arr.some(g => ['admin','Admin','developer','Developer','Developers'].includes(g.trim()));
}

// ── Audit Trail ──────────────────────────────────────────────────────────────
async function writeAudit(action, entityType, entityId, actorEmail, actorName, before, after, ipAddress) {
    const auditId = randomUUID();
    const now     = new Date().toISOString();
    try {
        await db.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                PK:           `AUDIT#${now.slice(0, 10)}`,
                SK:           `AUDIT#${now}#${auditId}`,
                auditId,
                EntityType:   'AUDIT',
                action,
                entityType,
                entityId,
                actorEmail:   actorEmail || 'unknown',
                actorName:    actorName  || 'unknown',
                ipAddress:    ipAddress  || 'unknown',
                timestamp:    now,
                before:       before ? JSON.stringify(before) : null,
                after:        after  ? JSON.stringify(after)  : null,
                changeSummary: buildChangeSummary(before, after)
            }
        }));
    } catch (e) {
        console.error('Audit write failed:', e.message);
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
            if (v.systolic    != null && (v.systolic    < 50  || v.systolic    > 300)) errors.push('Systolic BP must be 50–300 mmHg');
            if (v.diastolic   != null && (v.diastolic   < 30  || v.diastolic   > 200)) errors.push('Diastolic BP must be 30–200 mmHg');
            if (v.heartRate   != null && (v.heartRate   < 20  || v.heartRate   > 300)) errors.push('Heart rate must be 20–300 bpm');
            if (v.temperature != null && (v.temperature < 30  || v.temperature > 45))  errors.push('Temperature must be 30–45 °C');
            if (v.weight      != null && (v.weight      < 0.5 || v.weight      > 500)) errors.push('Weight must be 0.5–500 kg');
            if (v.height      != null && (v.height      < 30  || v.height      > 250)) errors.push('Height must be 30–250 cm');
            if (v.oxygenSaturation != null && (v.oxygenSaturation < 50 || v.oxygenSaturation > 100)) errors.push('SpO₂ must be 50–100%');
            if (v.respiratoryRate  != null && (v.respiratoryRate  < 4  || v.respiratoryRate  > 60))  errors.push('Respiratory rate must be 4–60 bpm');
            if (v.painScale   != null && (v.painScale   < 0   || v.painScale   > 10))  errors.push('Pain scale must be 0–10');
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
    console.log('Examinations event:', JSON.stringify(event));

    const method    = event.requestContext?.http?.method || event.httpMethod;
    const path      = event.rawPath || event.path || '';
    const examId    = event.pathParameters?.examId;
    const adminUser = isAdmin(event);
    const ipAddress = event.requestContext?.http?.sourceIp || 'unknown';

    if (method === 'OPTIONS') return res(200, {});

    // ── POST /examinations ── CREATE ─────────────────────────────────────────
    if (method === 'POST' && !path.includes('/signoff')) {
        const body = JSON.parse(event.body || '{}');

        if (!body.patientId)   return err(400, 'patientId is required');
        if (!body.patientName) return err(400, 'patientName is required');
        if (!body.doctorEmail) return err(400, 'doctorEmail is required');

        const id  = randomUUID();
        const now = new Date().toISOString();
        const exam = {
            PK:              `EXAM#${id}`,
            SK:              'PROFILE',
            EntityType:      'EXAMINATION',
            examId:          id,
            patientId:       body.patientId,
            patientName:     body.patientName,
            doctorId:        body.doctorId    || id,
            doctorName:      body.doctorName  || '',
            doctorEmail:     body.doctorEmail.toLowerCase().trim(),
            date:            body.date        || now.slice(0, 10),
            status:          'draft',
            signedOffAt:     null,
            createdAt:       now,
            updatedAt:       null,
            chiefComplaint:  null,
            vitalSigns:      null,
            physicalExam:    null,
            diagnosis:       [],
            prescriptions:   [],
            labOrders:       [],
            radiologyOrders: [],
            treatmentPlan:   null
        };

        await db.send(new PutCommand({ TableName: TABLE_NAME, Item: exam }));
        await writeAudit('CREATE', 'EXAMINATION', id, body.doctorEmail, body.doctorName, null, exam, ipAddress);

        return res(201, exam);
    }

    // ── GET /examinations?patientId=x ── LIST ────────────────────────────────
    if (method === 'GET' && !examId) {
        const patientId  = event.queryStringParameters?.patientId;
        const doctorEmail = event.queryStringParameters?.doctorEmail;
        if (!patientId) return err(400, 'patientId is required');

        const filterExp   = doctorEmail
            ? 'patientId = :pid AND doctorEmail = :de'
            : 'patientId = :pid';
        const filterVals  = { ':et': 'EXAMINATION', ':pid': patientId };
        if (doctorEmail) filterVals[':de'] = doctorEmail.toLowerCase().trim();

        const result = await db.send(new QueryCommand({
            TableName:                 TABLE_NAME,
            IndexName:                 'EntityType-index',
            KeyConditionExpression:    'EntityType = :et',
            FilterExpression:          filterExp,
            ExpressionAttributeValues: filterVals
        }));

        const items = (result.Items || []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return res(200, items);
    }

    // ── GET /examinations/{examId} ── GET ONE ────────────────────────────────
    if (method === 'GET' && examId) {
        const result = await db.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `EXAM#${examId}`, SK: 'PROFILE' }
        }));

        if (!result.Item) return err(404, 'Examination not found');
        return res(200, result.Item);
    }

    // ── PATCH /examinations/{examId} ── UPDATE SECTION ──────────────────────
    if (method === 'PATCH' && examId && !path.includes('/signoff')) {
        const body = JSON.parse(event.body || '{}');

        const existing = await db.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `EXAM#${examId}`, SK: 'PROFILE' }
        }));

        if (!existing.Item) return err(404, 'Examination not found');
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

        await db.send(new UpdateCommand({
            TableName:                 TABLE_NAME,
            Key:                       { PK: `EXAM#${examId}`, SK: 'PROFILE' },
            UpdateExpression:          `SET ${setParts.join(', ')}`,
            ExpressionAttributeNames:  names,
            ExpressionAttributeValues: values
        }));

        await writeAudit('UPDATE', 'EXAMINATION', examId,
            body.doctorEmail || exam.doctorEmail, body.doctorName || exam.doctorName,
            before, body, ipAddress);

        const updated = await db.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `EXAM#${examId}`, SK: 'PROFILE' }
        }));

        return res(200, updated.Item);
    }

    // ── POST /examinations/{examId}/signoff ──────────────────────────────────
    if (method === 'POST' && examId && path.includes('/signoff')) {
        const body = JSON.parse(event.body || '{}');

        const existing = await db.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `EXAM#${examId}`, SK: 'PROFILE' }
        }));

        if (!existing.Item) return err(404, 'Examination not found');
        const exam = existing.Item;

        if (exam.status === 'completed') return err(409, 'Examination already signed off');

        const signOffErrors = validateSignOff(exam);
        if (signOffErrors.length > 0) return err(422, signOffErrors.join(' | '));

        const now = new Date().toISOString();
        await db.send(new UpdateCommand({
            TableName:                 TABLE_NAME,
            Key:                       { PK: `EXAM#${examId}`, SK: 'PROFILE' },
            UpdateExpression:          'SET #status = :status, #signedOffAt = :sat, #updatedAt = :ua',
            ExpressionAttributeNames:  { '#status': 'status', '#signedOffAt': 'signedOffAt', '#updatedAt': 'updatedAt' },
            ExpressionAttributeValues: { ':status': 'completed', ':sat': now, ':ua': now }
        }));

        await writeAudit('SIGNOFF', 'EXAMINATION', examId,
            body.doctorEmail || exam.doctorEmail, body.doctorName || exam.doctorName,
            { status: 'draft' }, { status: 'completed', signedOffAt: now }, ipAddress);

        const updated = await db.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `EXAM#${examId}`, SK: 'PROFILE' }
        }));

        return res(200, updated.Item);
    }

    // ── DELETE /examinations/{examId} ── ADMIN ONLY ──────────────────────────
    if (method === 'DELETE' && examId) {
        if (!adminUser) return err(403, 'Only administrators can delete examinations');

        const existing = await db.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `EXAM#${examId}`, SK: 'PROFILE' }
        }));

        if (!existing.Item) return err(404, 'Examination not found');

        await db.send(new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { PK: `EXAM#${examId}`, SK: 'PROFILE' }
        }));

        await writeAudit('DELETE', 'EXAMINATION', examId,
            'admin', 'admin', existing.Item, null, ipAddress);

        return res(200, { message: 'Examination deleted', examId });
    }

    return err(400, 'Unknown route');
};
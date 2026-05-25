const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
    DynamoDBDocumentClient,
    PutCommand,
    GetCommand,
    QueryCommand,
    UpdateCommand,
    DeleteCommand,
    ScanCommand
} = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

const REGION     = 'us-east-1';
const TABLE_NAME = 'Hospital';

const client = new DynamoDBClient({ region: REGION });
const db     = DynamoDBDocumentClient.from(client);

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

// ── Extract caller identity from JWT claims ───────────────────────────────────
function getCaller(event) {
    const claims   = event.requestContext?.authorizer?.jwt?.claims
                  || event.requestContext?.authorizer?.claims || {};
    const groups   = claims['cognito:groups'] || '';
    const groupArr = Array.isArray(groups) ? groups
        : String(groups).trim().replace(/^\[/, '').replace(/\]$/, '').split(/[, ]+/).filter(Boolean);

    return {
        email:       (claims['email'] || claims['username'] || '').toLowerCase().trim(),
        name:        claims['name'] || '',
        isAdmin:     groupArr.some(g => ['Admin', 'Developers'].includes(g.trim())),
        isDoctor:    groupArr.some(g => g.trim() === 'Doctors'),
        isPharmacist:groupArr.some(g => g.trim() === 'Pharmacists')
    };
}

// ── Audit Trail ───────────────────────────────────────────────────────────────
async function writeAudit(action, entityId, actorEmail, actorName, before, after, ipAddress) {
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
                entityType:    'APPOINTMENT',
                entityId,
                actorEmail:    actorEmail || 'unknown',
                actorName:     actorName  || 'unknown',
                ipAddress:     ipAddress  || 'unknown',
                timestamp:     now,
                before:        before ? JSON.stringify(before) : null,
                after:         after  ? JSON.stringify(after)  : null
            }
        }));
    } catch (e) {
        // audit write failure is non-critical
    }
}

// ── Write DOCTOR_PATIENT relationship (idempotent) ────────────────────────────
async function writeDoctorPatientRelation(doctorEmail, patientId, patientName, now) {
    try {
        await db.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                PK:          `DOCTOR#${doctorEmail}`,
                SK:          `PATIENT#${patientId}`,
                EntityType:  'DOCTOR_PATIENT',
                doctorEmail,
                patientId,
                patientName,
                assignedAt:  now
            },
            ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)'
        }));
    } catch (e) {
        if (e.name !== 'ConditionalCheckFailedException') throw e;
        // Already exists — safe to ignore
    }
}

// ── Validation ────────────────────────────────────────────────────────────────
const VALID_VISIT_TYPES = ['walk-in', 'scheduled', 'emergency', 'referral', 'follow-up', 'check-up'];
const VALID_PRIORITIES  = ['routine', 'urgent', 'emergency'];
const VALID_STATUSES    = ['scheduled', 'checked-in', 'in-progress', 'completed', 'cancelled', 'no-show'];

function validateAppointment(body) {
    const errors = [];
    if (!body.patientId)   errors.push('patientId is required');
    if (!body.patientName) errors.push('patientName is required');
    if (!body.doctorId)    errors.push('doctorId is required');
    if (!body.doctorName)  errors.push('doctorName is required');
    if (!body.doctorEmail) errors.push('doctorEmail is required');
    if (!body.department)  errors.push('department is required');
    if (!body.date)        errors.push('date is required');
    if (!body.startTime)   errors.push('startTime is required');
    if (!body.endTime)     errors.push('endTime is required');
    if (body.visitType && !VALID_VISIT_TYPES.includes(body.visitType)) errors.push(`visitType must be one of: ${VALID_VISIT_TYPES.join(', ')}`);
    if (body.priority  && !VALID_PRIORITIES.includes(body.priority))   errors.push(`priority must be one of: ${VALID_PRIORITIES.join(', ')}`);
    if (body.status    && !VALID_STATUSES.includes(body.status))       errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
    if (body.status === 'cancelled' && !body.cancelReason)             errors.push('cancelReason is required when cancelling');
    return errors;
}

// ── Duty-day validation (#2) ────────────────────────────────────────────────
const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

async function getDoctorDutyDays(doctorId) {
    if (!doctorId) return null;
    try {
        const r = await db.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: doctorId, SK: 'PROFILE' } }));
        // Return the raw stored values so error messages can show them as-is.
        return Array.isArray(r.Item?.dutyDays) ? r.Item.dutyDays : null;
    } catch (_) {
        return null;
    }
}

// 'YYYY-MM-DD' → lowercase weekday name (UTC-safe, avoids off-by-one).
function weekdayOf(dateStr) {
    const d = new Date(`${dateStr}T00:00:00Z`);
    return isNaN(d.getTime()) ? null : DAY_NAMES[d.getUTCDay()];
}

// Normalise a weekday token to its 3-letter lowercase prefix so stored
// abbreviations ("Fri", "Mon") and full names ("Friday") compare equal.
// mon/tue/wed/thu/fri/sat/sun are all unique in their first 3 letters.
function normDay(d) {
    return String(d).toLowerCase().slice(0, 3);
}

// ── Handler ───────────────────────────────────────────────────────────────────
exports.handler = async (event) => {
    const method    = event.requestContext?.http?.method || event.httpMethod;
    const path      = event.rawPath || event.path || '';
    const apptId    = event.pathParameters?.apptId;
    const caller    = getCaller(event);
    const ipAddress = event.requestContext?.http?.sourceIp || 'unknown';

    if (method === 'OPTIONS') return res(200, {});

    // ── POST /appointments ── CREATE ─────────────────────────────────────────
    if (method === 'POST' && !apptId) {
        if (!caller.isAdmin) return err(403, 'Only administrators can create appointments');

        const body = JSON.parse(event.body || '{}');
        const validationErrors = validateAppointment(body);
        if (validationErrors.length > 0) return err(400, validationErrors.join(' | '));

        // #2 — appointment date must fall on one of the doctor's duty days.
        const dutyDays = await getDoctorDutyDays(body.doctorId);
        if (dutyDays && dutyDays.length) {
            const wd = weekdayOf(body.date);
            const allowed = dutyDays.map(normDay);
            if (wd && !allowed.includes(normDay(wd))) {
                return err(400, `Doctor is not on duty on ${wd}. Duty days: ${dutyDays.join(', ')}.`);
            }
        }

        const id  = randomUUID();
        const now = new Date().toISOString();

        // Calculate duration from start/end time if not provided
        let duration = body.duration;
        if (!duration && body.startTime && body.endTime) {
            const [sh, sm] = body.startTime.split(':').map(Number);
            const [eh, em] = body.endTime.split(':').map(Number);
            duration = (eh * 60 + em) - (sh * 60 + sm);
        }

        const appointment = {
            PK:              `APPOINTMENT#${id}`,
            SK:              'PROFILE',
            EntityType:      'APPOINTMENT',
            appointmentId:   id,
            // Patient
            patientId:       body.patientId,
            patientName:     body.patientName,
            // Doctor & Department
            doctorId:        body.doctorId,
            doctorName:      body.doctorName,
            doctorEmail:     body.doctorEmail.toLowerCase().trim(),
            department:      body.department,
            specialization:  body.specialization  || null,
            // Scheduling
            date:            body.date,
            startTime:       body.startTime,
            endTime:         body.endTime,
            duration:        duration || 30,
            // Classification
            visitType:       body.visitType  || 'scheduled',
            priority:        body.priority   || 'routine',
            status:          body.status     || 'scheduled',
            // Referral
            referredBy:      body.referredBy     || null,
            referredByName:  body.referredByName || null,
            // Clinical link
            encounterId:     null,
            // Flow tracking
            checkedInAt:     null,
            checkedOutAt:    null,
            cancelReason:    null,
            cancelledAt:     null,
            cancelledBy:     null,
            // Notes
            notes:           body.notes          || null,
            chiefComplaint:  body.chiefComplaint  || null,
            // Audit
            createdBy:       caller.email,
            createdByName:   caller.name,
            updatedBy:       caller.email,
            createdAt:       now,
            // Avoid updatedAt: null — fails dataClass-index GSI validation (S required).
            updatedAt:       now
        };

        await db.send(new PutCommand({ TableName: TABLE_NAME, Item: appointment }));

        // Write DOCTOR_PATIENT relationship — this is the assignment mechanism
        await writeDoctorPatientRelation(
            appointment.doctorEmail,
            appointment.patientId.replace('PATIENT#', ''),
            appointment.patientName,
            now
        );

        await writeAudit('CREATE', id, caller.email, caller.name, null, appointment, ipAddress);

        return res(201, appointment);
    }

    // ── GET /appointments ── LIST ────────────────────────────────────────────
    if (method === 'GET' && !apptId) {
        const qp   = event.queryStringParameters || {};
        const date = qp.date;       // optional filter by date
        const status = qp.status;   // optional filter by status

        let filterExp   = 'EntityType = :et';
        let filterVals  = { ':et': 'APPOINTMENT' };
        let filterNames = {};

        if (date) {
            filterExp += ' AND #date = :date';
            filterNames['#date'] = 'date';
            filterVals[':date']  = date;
        }
        if (status) {
            filterExp += ' AND #status = :status';
            filterNames['#status'] = 'status';
            filterVals[':status']  = status;
        }

        // Doctor — scope to own appointments using GSI
        if (caller.isDoctor && !caller.isAdmin) {
            const result = await db.send(new QueryCommand({
                TableName:                 TABLE_NAME,
                IndexName:                 'doctorEmail-createdAt-index',
                KeyConditionExpression:    'doctorEmail = :de',
                FilterExpression:          date || status ? (date && status ? '#date = :date AND #status = :status' : date ? '#date = :date' : '#status = :status') : undefined,
                ExpressionAttributeNames:  Object.keys(filterNames).length ? filterNames : undefined,
                ExpressionAttributeValues: {
                    ':de': caller.email,
                    ...(date   ? { ':date':   date   } : {}),
                    ...(status ? { ':status': status } : {})
                }
            }));

            const items = (result.Items || [])
                .filter(i => i.EntityType === 'APPOINTMENT')
                .sort((a, b) => {
                    if (a.date !== b.date) return b.date.localeCompare(a.date);
                    return b.startTime.localeCompare(a.startTime);
                });

            return res(200, items);
        }

        // Admin / Developer — get all appointments via EntityType-index
        const result = await db.send(new QueryCommand({
            TableName:                 TABLE_NAME,
            IndexName:                 'EntityType-index',
            KeyConditionExpression:    'EntityType = :et',
            FilterExpression:          (date || status) ? filterExp.replace('EntityType = :et AND ', '') || undefined : undefined,
            ExpressionAttributeNames:  Object.keys(filterNames).length ? filterNames : undefined,
            ExpressionAttributeValues: filterVals
        }));

        const items = (result.Items || []).sort((a, b) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date);
            return b.startTime.localeCompare(a.startTime);
        });

        return res(200, items);
    }

    // ── GET /appointments/{apptId} ── GET ONE ────────────────────────────────
    if (method === 'GET' && apptId) {
        const result = await db.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `APPOINTMENT#${apptId}`, SK: 'PROFILE' }
        }));
        if (!result.Item) return err(404, 'Appointment not found');
        return res(200, result.Item);
    }

    // ── PATCH /appointments/{apptId} ── UPDATE ───────────────────────────────
    if (method === 'PATCH' && apptId) {
        const body = JSON.parse(event.body || '{}');

        const existing = await db.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `APPOINTMENT#${apptId}`, SK: 'PROFILE' }
        }));
        if (!existing.Item) return err(404, 'Appointment not found');
        const appt = existing.Item;

        // Only admin can update, or doctor can update status of their own appointment
        if (!caller.isAdmin) {
            if (caller.isDoctor && appt.doctorEmail === caller.email) {
                // Doctor can only update status, checkedInAt, checkedOutAt, notes
                const allowedFields = ['status', 'checkedInAt', 'checkedOutAt', 'notes', 'cancelReason', 'encounterId'];
                const attempted = Object.keys(body).filter(k => !allowedFields.includes(k));
                if (attempted.length > 0) return err(403, `Doctors can only update: ${allowedFields.join(', ')}`);
            } else {
                return err(403, 'Unauthorized to update this appointment');
            }
        }

        // ── Block edits to cancelled or past appointments ────────────────────
        // The frontend hides the edit action; this is the server-side
        // enforcement (security boundary — never trust the client).
        //   - A cancelled appointment is terminal: no further modification.
        //   - A past-dated appointment cannot have its details edited. Pure
        //     status transitions (e.g. cancel, no-show) are still allowed.
        const todayStr    = new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD
        const isCancelled = appt.status === 'cancelled';
        const isPast      = !!appt.date && appt.date < todayStr;
        const EDIT_FIELDS = [
            'date', 'startTime', 'endTime', 'duration', 'visitType', 'priority',
            'doctorId', 'doctorName', 'doctorEmail', 'department', 'specialization',
            'patientId', 'patientName', 'referredBy', 'referredByName'
        ];
        const isEdit = EDIT_FIELDS.some((f) => body[f] !== undefined);
        if (isCancelled) {
            return err(409, 'This appointment is cancelled and can no longer be modified.');
        }
        if (isPast && isEdit) {
            return err(409, 'This appointment date has passed and can no longer be edited.');
        }

        // Validate status transition
        if (body.status && !VALID_STATUSES.includes(body.status)) {
            return err(400, `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
        }
        if (body.status === 'cancelled' && !body.cancelReason) {
            return err(400, 'cancelReason is required when cancelling');
        }

        // #2 — if date or doctor is changing, re-validate against duty days.
        if (body.date || body.doctorId) {
            const effDoctorId = body.doctorId || appt.doctorId;
            const effDate     = body.date || appt.date;
            const dutyDays    = await getDoctorDutyDays(effDoctorId);
            if (dutyDays && dutyDays.length) {
                const wd = weekdayOf(effDate);
                const allowed = dutyDays.map(normDay);
                if (wd && !allowed.includes(normDay(wd))) {
                    return err(400, `Doctor is not on duty on ${wd}. Duty days: ${dutyDays.join(', ')}.`);
                }
            }
        }

        const now      = new Date().toISOString();
        // Always stamp who/when on every update (#3 audit requirement).
        const setParts = ['#updatedAt = :updatedAt', '#updatedBy = :updatedBy'];
        const names    = { '#updatedAt': 'updatedAt', '#updatedBy': 'updatedBy' };
        const values   = { ':updatedAt': now, ':updatedBy': caller.email };

        const updatableFields = [
            'status', 'date', 'startTime', 'endTime', 'duration',
            'visitType', 'priority', 'notes', 'chiefComplaint',
            'checkedInAt', 'checkedOutAt', 'cancelReason', 'encounterId',
            'doctorId', 'doctorName', 'doctorEmail', 'department', 'specialization',
            'referredBy', 'referredByName'
        ];

        updatableFields.forEach(field => {
            if (body[field] !== undefined) {
                setParts.push(`#${field} = :${field}`);
                names[`#${field}`]  = field;
                values[`:${field}`] = body[field];
            }
        });

        // Auto-set checkedInAt when status changes to checked-in
        if (body.status === 'checked-in' && !appt.checkedInAt) {
            setParts.push('#checkedInAt = :checkedInAt');
            names['#checkedInAt']  = 'checkedInAt';
            values[':checkedInAt'] = now;
        }
        // Auto-set checkedOutAt when status changes to completed
        if (body.status === 'completed' && !appt.checkedOutAt) {
            setParts.push('#checkedOutAt = :checkedOutAt');
            names['#checkedOutAt']  = 'checkedOutAt';
            values[':checkedOutAt'] = now;
        }
        // Auto-set cancellation audit fields when status changes to cancelled (#7)
        if (body.status === 'cancelled') {
            setParts.push('#cancelledAt = :cancelledAt', '#cancelledBy = :cancelledBy');
            names['#cancelledAt']  = 'cancelledAt';
            names['#cancelledBy']  = 'cancelledBy';
            values[':cancelledAt'] = appt.cancelledAt || now; // preserve first cancel time
            values[':cancelledBy'] = caller.email;
        }

        await db.send(new UpdateCommand({
            TableName:                 TABLE_NAME,
            Key:                       { PK: `APPOINTMENT#${apptId}`, SK: 'PROFILE' },
            UpdateExpression:          `SET ${setParts.join(', ')}`,
            ExpressionAttributeNames:  names,
            ExpressionAttributeValues: values
        }));

        // If doctor changed, update DOCTOR_PATIENT relationship
        if (body.doctorEmail && body.doctorEmail !== appt.doctorEmail) {
            await writeDoctorPatientRelation(
                body.doctorEmail.toLowerCase().trim(),
                appt.patientId,
                appt.patientName,
                now
            );
        }

        await writeAudit('UPDATE', apptId, caller.email, caller.name, appt, body, ipAddress);

        const updated = await db.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `APPOINTMENT#${apptId}`, SK: 'PROFILE' }
        }));

        return res(200, updated.Item);
    }

    // ── DELETE /appointments/{apptId} ── ADMIN ONLY ──────────────────────────
    if (method === 'DELETE' && apptId) {
        if (!caller.isAdmin) return err(403, 'Only administrators can delete appointments');

        const existing = await db.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `APPOINTMENT#${apptId}`, SK: 'PROFILE' }
        }));
        if (!existing.Item) return err(404, 'Appointment not found');

        await db.send(new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { PK: `APPOINTMENT#${apptId}`, SK: 'PROFILE' }
        }));

        await writeAudit('DELETE', apptId, caller.email, caller.name, existing.Item, null, ipAddress);

        return res(200, { message: 'Appointment deleted', appointmentId: apptId });
    }

    return err(400, 'Unknown route');
};
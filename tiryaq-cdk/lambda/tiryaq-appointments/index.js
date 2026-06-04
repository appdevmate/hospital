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

// ── Idempotency (Phase D) ─────────────────────────────────────────────────────
// The frontend offline-queue interceptor sends `X-Client-Request-Id` on every
// mutating call. If we've already processed that id, return the cached response
// instead of running the write a second time. Records auto-expire in 24h via
// the table's TTL on `expiresAt`.
function getClientRequestId(event) {
    const h = event.headers || {};
    return h['x-client-request-id'] || h['X-Client-Request-Id'] || null;
}

async function checkIdempotency(cid) {
    if (!cid) return null;
    try {
        const r = await db.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `IDEMP#${cid}`, SK: 'PROFILE' }
        }));
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
                expiresAt:       Math.floor(Date.now() / 1000) + 86400 // 24h TTL
            }
        }));
    } catch (_) {}
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

// ── Doctor same-time conflict (allow many per day, block overlap) ────────────
// 'HH:mm' → minutes since 00:00. Returns NaN for missing/invalid.
function toMin(t) {
    if (!t || typeof t !== 'string') return NaN;
    const [h, m] = t.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return NaN;
    return h * 60 + m;
}
async function findDoctorOverlap({ doctorId, date, startTime, endTime, ignoreApptId }) {
    if (!doctorId || !date || !startTime) return null;
    const s = toMin(startTime);
    const e = toMin(endTime || startTime);
    if (isNaN(s)) return null;
    try {
        const out = await db.send(new QueryCommand({
            TableName:                 TABLE_NAME,
            IndexName:                 'EntityType-index',
            KeyConditionExpression:    'EntityType = :et',
            FilterExpression:          '#doctorId = :d AND #date = :date AND #status <> :cancelled',
            ExpressionAttributeNames:  { '#doctorId': 'doctorId', '#date': 'date', '#status': 'status' },
            ExpressionAttributeValues: { ':et': 'APPOINTMENT', ':d': doctorId, ':date': date, ':cancelled': 'cancelled' }
        }));
        for (const it of (out.Items || [])) {
            if (ignoreApptId && it.appointmentId === ignoreApptId) continue;
            const is = toMin(it.startTime);
            const ie = toMin(it.endTime || it.startTime);
            if (isNaN(is)) continue;
            // Overlap if s < ie AND e > is. Touching ends (e === is) is allowed.
            if (s < ie && e > is) {
                return it;
            }
        }
    } catch (_) {}
    return null;
}

// Normalise a weekday token to its 3-letter lowercase prefix so stored
// abbreviations ("Fri", "Mon") and full names ("Friday") compare equal.
// mon/tue/wed/thu/fri/sat/sun are all unique in their first 3 letters.
function normDay(d) {
    return String(d).toLowerCase().slice(0, 3);
}

// ── Calendar mirroring (#4) ────────────────────────────────────────────────
// Find the doctor's calendar (tagged with doctorEmail) or create one.
async function findOrCreateDoctorCalendar(doctorEmail, doctorName, now) {
    if (!doctorEmail && !doctorName) return null;
    // 1) Prefer an existing calendar matched by doctorEmail attribute.
    let q = await db.send(new QueryCommand({
        TableName:                 TABLE_NAME,
        IndexName:                 'EntityType-index',
        KeyConditionExpression:    'EntityType = :et',
        FilterExpression:          'doctorEmail = :de',
        ExpressionAttributeValues: { ':et': 'CALENDAR', ':de': doctorEmail || '__nope__' }
    }));
    if (q.Items && q.Items.length) return q.Items[0].calendarId;

    // 2) Fall back to the calendar created by the duty-shift system, which
    //    names calendars after the plain doctor name (no "Dr." prefix).
    //    This ensures appointment events show on the SAME calendar the doctor
    //    sees their duty shifts on.
    if (doctorName) {
        q = await db.send(new QueryCommand({
            TableName:                 TABLE_NAME,
            IndexName:                 'EntityType-index',
            KeyConditionExpression:    'EntityType = :et',
            FilterExpression:          '#n = :n',
            ExpressionAttributeNames:  { '#n': 'name' },
            ExpressionAttributeValues: { ':et': 'CALENDAR', ':n': doctorName }
        }));
        if (q.Items && q.Items.length) {
            // Backfill the doctorEmail attribute so the email-based path
            // finds it next time (saves the scan).
            if (doctorEmail && !q.Items[0].doctorEmail) {
                try {
                    await db.send(new UpdateCommand({
                        TableName: TABLE_NAME,
                        Key: { PK: q.Items[0].PK, SK: q.Items[0].SK },
                        UpdateExpression: 'SET doctorEmail = :de, updatedAt = :u',
                        ExpressionAttributeValues: { ':de': doctorEmail, ':u': now }
                    }));
                } catch (_) {}
            }
            return q.Items[0].calendarId;
        }
    }

    // 3) Nothing found — create one matching the duty-shift naming scheme.
    const calendarId = randomUUID();
    await db.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: {
            PK:          `CALENDAR#${calendarId}`,
            SK:          'PROFILE',
            EntityType:  'CALENDAR',
            calendarId,
            name:        doctorName || doctorEmail,
            description: `Calendar for ${doctorName || doctorEmail}`,
            doctorEmail: doctorEmail || null,
            dataClass:   'PHI',
            createdAt:   now,
            updatedAt:   now
        },
        ConditionExpression: 'attribute_not_exists(PK)'
    }));
    return calendarId;
}

// Create a CALENDAR_EVENT mirroring the appointment on the doctor's calendar.
async function createCalendarEventForAppointment(appt, now) {
    const calendarId = await findOrCreateDoctorCalendar(appt.doctorEmail, appt.doctorName, now);
    if (!calendarId) return;
    const eventId = randomUUID();
    await db.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: {
            PK:            `CALENDAR#${calendarId}`,
            SK:            `EVENT#${eventId}`,
            EntityType:    'CALENDAR_EVENT',
            eventId,
            calendarId,
            name:          `Appointment: ${appt.patientName}`,
            description:   `${appt.visitType || 'visit'} · ${appt.department || ''}`.trim(),
            startDate:     `${appt.date}T${appt.startTime}:00`,
            endDate:       `${appt.date}T${appt.endTime}:00`,
            color:         '#10b981',
            recurrence:    null,
            appointmentId: appt.appointmentId,
            dataClass:     'PHI',
            createdAt:     now,
            updatedAt:     now
        }
    }));
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

        // Idempotency: if this clientRequestId was processed already, return
        // the cached response so an offline-queue replay never double-creates.
        const cid = getClientRequestId(event);
        const cached = await checkIdempotency(cid);
        if (cached) return cached;

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

        // Reject appointments whose end time has already passed.
        if (body.date && body.endTime) {
            const slotEndIso = `${body.date}T${body.endTime}:00`;
            const slotEnd = Date.parse(slotEndIso);
            if (!isNaN(slotEnd) && slotEnd <= Date.now()) {
                return err(400, 'The selected date/time has already passed.');
            }
        }

        // Doctor may hold multiple appointments per day BUT not overlapping
        // time slots. Block exact same time or overlapping intervals.
        const conflict = await findDoctorOverlap({
            doctorId:  body.doctorId,
            date:      body.date,
            startTime: body.startTime,
            endTime:   body.endTime
        });
        if (conflict) {
            return err(409, `Doctor already has an appointment at ${conflict.startTime}-${conflict.endTime} on ${body.date}.`);
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

        // #4 — mirror the appointment onto the doctor's calendar (non-critical).
        try { await createCalendarEventForAppointment(appointment, now); } catch (_) {}

        const response = res(201, appointment);
        await storeIdempotency(cid, response);
        return response;
    }

    // ── GET /appointments ── LIST (paginated) ────────────────────────────────
    //
    // Query params (all optional):
    //   pageSize    : 1-100, default 25
    //   nextToken   : opaque base64 cursor from the previous response
    //   tab         : 'upcoming' (today+future) | 'past' | 'all' (default upcoming)
    //   dateFrom    : YYYY-MM-DD lower bound (inclusive)
    //   dateTo      : YYYY-MM-DD upper bound (inclusive)
    //   date        : exact date YYYY-MM-DD (overrides from/to)
    //   status      : scheduled | checked-in | in-progress | completed | cancelled | no-show
    //   priority    : routine | urgent | emergency
    //   visitType   : walk-in | scheduled | emergency | referral | follow-up | check-up
    //   doctorId    : APPOINTMENT.doctorId exact match
    //   patientId   : APPOINTMENT.patientId exact match
    //   q           : free-text — patientName / doctorName / department / chiefComplaint
    //   sortDir     : asc | desc — default depends on tab (upcoming = asc, past = desc)
    //
    // Response: { data: Appointment[], nextToken: string|null, hasMore: bool, count, pageSize }
    if (method === 'GET' && !apptId) {
        return await listAppointmentsPaged(event, caller);
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
        // Idempotency check (Phase D) — returns cached response on replay.
        const cid = getClientRequestId(event);
        const cached = await checkIdempotency(cid);
        if (cached) return cached;

        const body = JSON.parse(event.body || '{}');

        const existing = await db.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `APPOINTMENT#${apptId}`, SK: 'PROFILE' }
        }));
        if (!existing.Item) return err(404, 'Appointment not found');
        const appt = existing.Item;

        // Admins update any appointment. Doctors may edit/cancel only their OWN
        // appointment, and must not reassign it to another doctor or patient.
        if (!caller.isAdmin) {
            if (!(caller.isDoctor && appt.doctorEmail === caller.email)) {
                return err(403, 'Unauthorized to update this appointment');
            }
            if (body.doctorEmail && body.doctorEmail.toLowerCase().trim() !== caller.email) {
                return err(403, 'Doctors cannot reassign an appointment to another doctor');
            }
            if (body.patientId && body.patientId !== appt.patientId) {
                return err(403, 'Doctors cannot change the patient on an appointment');
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

        // Doctor same-time overlap check on edits (skip cancelling/no-op edits).
        if ((body.date || body.startTime || body.endTime || body.doctorId) && body.status !== 'cancelled') {
            const conflict = await findDoctorOverlap({
                doctorId:     body.doctorId  || appt.doctorId,
                date:         body.date      || appt.date,
                startTime:    body.startTime || appt.startTime,
                endTime:      body.endTime   || appt.endTime,
                ignoreApptId: appt.appointmentId
            });
            if (conflict) {
                return err(409, `Doctor already has an appointment at ${conflict.startTime}-${conflict.endTime} on ${body.date || appt.date}.`);
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

        const response = res(200, updated.Item);
        await storeIdempotency(cid, response);
        return response;
    }

    // ── DELETE /appointments/{apptId} ── ADMIN ONLY ──────────────────────────
    if (method === 'DELETE' && apptId) {
        if (!caller.isAdmin) return err(403, 'Only administrators can delete appointments');

        // Idempotency check (Phase D) — replays of the same delete are no-ops.
        const cid = getClientRequestId(event);
        const cached = await checkIdempotency(cid);
        if (cached) return cached;

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

        const response = res(200, { message: 'Appointment deleted', appointmentId: apptId });
        await storeIdempotency(cid, response);
        return response;
    }

    return err(400, 'Unknown route');
};

// ─────────────────────────────────────────────────────────────────────────────
// Paginated list — production scale (10M+ rows)
// ─────────────────────────────────────────────────────────────────────────────
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;
// Safety cap on how many pages of upstream DynamoDB results we'll burn while
// trying to fill one client page (filter expressions may discard rows after
// the read). At 1MB/page this gives ~10 MB scanned per request worst case.
const MAX_UPSTREAM_PAGES = 10;

function encodeNextToken(lek) {
    if (!lek) return null;
    return Buffer.from(JSON.stringify(lek)).toString('base64');
}
function decodeNextToken(t) {
    if (!t) return undefined;
    try { return JSON.parse(Buffer.from(t, 'base64').toString('utf8')); } catch { return undefined; }
}
function textMatch(item, q) {
    if (!q) return true;
    const fields = [item.patientName, item.doctorName, item.department, item.chiefComplaint, item.notes];
    return fields.some(v => typeof v === 'string' && v.toLowerCase().includes(q));
}

async function listAppointmentsPaged(event, caller) {
    const qp = event.queryStringParameters || {};
    const pageSize = Math.min(Math.max(parseInt(qp.pageSize, 10) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
    let startKey   = decodeNextToken(qp.nextToken);
    const tab      = (qp.tab || 'upcoming').toLowerCase();
    const today    = new Date().toISOString().slice(0, 10);
    const q        = (qp.q || '').trim().toLowerCase();

    // Build the FilterExpression once. The same shape works for both indices.
    const exprNames  = {};
    const exprValues = {};
    const parts      = [];
    if (qp.date) {
        parts.push('#d = :d'); exprNames['#d'] = 'date'; exprValues[':d'] = qp.date;
    } else {
        if (qp.dateFrom) {
            parts.push('#d >= :dFrom');
            exprNames['#d'] = 'date'; exprValues[':dFrom'] = qp.dateFrom;
        }
        if (qp.dateTo) {
            parts.push('#d <= :dTo');
            exprNames['#d'] = 'date'; exprValues[':dTo'] = qp.dateTo;
        }
        if (tab === 'upcoming') {
            parts.push('#d >= :today');
            exprNames['#d'] = 'date'; exprValues[':today'] = today;
        } else if (tab === 'past') {
            parts.push('#d < :today');
            exprNames['#d'] = 'date'; exprValues[':today'] = today;
        }
    }
    if (qp.status)    { parts.push('#s = :s');     exprNames['#s'] = 'status';    exprValues[':s'] = qp.status; }
    if (qp.priority)  { parts.push('priority = :p');                                exprValues[':p'] = qp.priority; }
    if (qp.visitType) { parts.push('visitType = :vt');                              exprValues[':vt'] = qp.visitType; }
    if (qp.doctorId)  { parts.push('doctorId = :dId');                              exprValues[':dId'] = qp.doctorId; }
    if (qp.patientId) { parts.push('patientId = :pId');                             exprValues[':pId'] = qp.patientId; }

    // Default sort: upcoming → ascending (soonest first); past → descending.
    const sortDir = (qp.sortDir || (tab === 'past' ? 'desc' : 'asc')).toLowerCase();
    const ScanIndexForward = sortDir !== 'desc';

    // Choose the index.
    const baseParams = {
        TableName:                 TABLE_NAME,
        Limit:                     pageSize,
        ScanIndexForward
    };

    if (caller.isDoctor && !caller.isAdmin) {
        // Doctor: scope to own appointments via doctorEmail-createdAt-index.
        baseParams.IndexName              = 'doctorEmail-createdAt-index';
        baseParams.KeyConditionExpression = 'doctorEmail = :de';
        baseParams.ExpressionAttributeValues = { ':de': caller.email, ...exprValues };
    } else {
        // Admin / Developer: full firehose via EntityType-index.
        baseParams.IndexName              = 'EntityType-index';
        baseParams.KeyConditionExpression = 'EntityType = :et';
        baseParams.ExpressionAttributeValues = { ':et': 'APPOINTMENT', ...exprValues };
    }
    if (parts.length) {
        baseParams.FilterExpression = parts.join(' AND ');
        baseParams.ExpressionAttributeNames = exprNames;
    }

    // FilterExpression runs AFTER DynamoDB's per-page read, so a strict filter
    // may leave us with 0 items even though `LastEvaluatedKey` is set. Loop
    // forward (bounded by MAX_UPSTREAM_PAGES) until we either fill the page or
    // exhaust the data.
    const collected = [];
    let lastKey = startKey;
    let upstreamPages = 0;

    while (collected.length < pageSize && upstreamPages < MAX_UPSTREAM_PAGES) {
        const params = { ...baseParams, ExclusiveStartKey: lastKey };
        const r = await db.send(new QueryCommand(params));
        upstreamPages++;

        for (const it of (r.Items || [])) {
            if (caller.isDoctor && it.EntityType !== 'APPOINTMENT') continue;
            if (q && !textMatch(it, q)) continue;
            collected.push(it);
            if (collected.length >= pageSize) break;
        }

        lastKey = r.LastEvaluatedKey;
        if (!lastKey) break;
    }

    return res(200, {
        data:      collected,
        nextToken: encodeNextToken(lastKey),
        hasMore:   !!lastKey,
        count:     collected.length,
        pageSize
    });
}
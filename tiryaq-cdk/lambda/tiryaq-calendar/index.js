'use strict';

// ─────────────────────────────────────────────────────────────────────
// tiryaq-calendar — hospital calendar backend
//
// Replaces the previous external "CalendarPlatform" SaaS API. All calendar
// data now lives in the Tiryaq Hospital DynamoDB table for clinical-privacy
// and PDPPL data-residency compliance.
//
// Endpoints (all behind JWT authoriser, CORS provided by API Gateway):
//   GET    /calendars                                  → list calendars
//   POST   /calendars                                  → create a calendar
//   DELETE /calendars/{calendarId}                     → delete calendar + cascade events
//   GET    /calendars/{calendarId}/events              → list events for one calendar
//   POST   /calendars/{calendarId}/events              → create event
//   PATCH  /calendars/{calendarId}/events/{eventId}    → update event
//   DELETE /calendars/{calendarId}/events/{eventId}    → delete event
//
// DynamoDB shape (Hospital table):
//   Calendar: PK = CALENDAR#<calId>, SK = PROFILE,           EntityType = CALENDAR
//   Event:    PK = CALENDAR#<calId>, SK = EVENT#<eventId>,   EntityType = CALENDAR_EVENT
// ─────────────────────────────────────────────────────────────────────

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
    DynamoDBDocumentClient,
    PutCommand,
    GetCommand,
    QueryCommand,
    UpdateCommand,
    DeleteCommand,
    BatchWriteCommand
} = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');
// Step 2g — per-tenant rate limit.
const throttle = require('./throttle');

const REGION     = process.env.AWS_REGION || 'us-east-1';
const TABLE_NAME = process.env.TABLE_NAME || 'Hospital';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

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

// Inlined compliance helpers — CDK packages this Lambda from its own folder
// only, so `require('../_shared/compliance')` would fail at runtime. Keep in
// sync with tiryaq-cdk/lambda/_shared/compliance.js.
const DATA_CLASS = Object.freeze({
    PHI:    'PHI',
    PII:    'PII',
    PUBLIC: 'PUBLIC',
    AUDIT:  'AUDIT',
    SYSTEM: 'SYSTEM'
});

function withCompliance(item, opts) {
    if (!opts || !opts.dataClass) throw new Error('withCompliance: dataClass required');
    const now = new Date().toISOString();
    const result = {
        ...item,
        dataClass: opts.dataClass,
        createdAt: item.createdAt ?? now,
        updatedAt: now
    };
    if (typeof opts.expiresAt === 'number') result.expiresAt = opts.expiresAt;
    if (opts.actor) result.lastModifiedBy = opts.actor;
    return result;
}

// ── Helpers ──────────────────────────────────────────────────────────
// CORS headers are injected by API Gateway HTTP API's corsPreflight
// allow-list. Do not echo wildcard CORS headers here.
function res(statusCode, body) {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    };
}
function err(code, message) { return res(code, { error: message, message }); }
function nowIso() { return new Date().toISOString(); }

// ── Idempotency (Phase D) ────────────────────────────────────────────────────
function getClientRequestId(event) {
    const h = event.headers || {};
    return h['x-client-request-id'] || h['X-Client-Request-Id'] || null;
}
async function checkIdempotency(cid) {
    if (!cid) return null;
    try {
        const r = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: `IDEMP#${cid}`, SK: 'PROFILE' } }));
        if (r.Item && r.Item.response) return JSON.parse(r.Item.response);
    } catch (_) {}
    return null;
}
async function storeIdempotency(cid, response) {
    if (!cid) return;
    try {
        await ddb.send(new PutCommand({
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

function getActor(event) {
    const claims = event.requestContext?.authorizer?.jwt?.claims
                || event.requestContext?.authorizer?.claims || {};
    const groupsRaw = claims['cognito:groups'] || '';
    const groups = Array.isArray(groupsRaw)
        ? groupsRaw
        : String(groupsRaw).trim().replace(/^\[/, '').replace(/\]$/, '').split(/[,\s]+/).filter(Boolean);
    return {
        email: (claims.email || claims['cognito:username'] || 'unknown').toLowerCase().trim(),
        name:  claims.name || claims.email || 'unknown',
        groups
    };
}

// Any authenticated Tiryaq user can read the hospital calendar.
// Writes are restricted to admins, developers, and doctors (clinical/ops).
function canWrite(actor) {
    return actor.groups.some(g =>
        ['Admin', 'admin', 'Developers', 'Developer', 'developer', 'Doctors', 'Doctor', 'doctor']
            .includes(g));
}

// ── Calendars ───────────────────────────────────────────────────────
async function listCalendars() {
    const out = await ddb.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'EntityType-index',
        KeyConditionExpression: 'EntityType = :et',
        ExpressionAttributeValues: { ':et': 'CALENDAR' }
    }));
    const calendars = (out.Items || []).map(it => ({
        calendarId:  it.calendarId,
        name:        it.name,
        description: it.description || '',
        createdAt:   it.createdAt
    }));
    return res(200, calendars);
}

async function createCalendar(event, actor) {
    const cid = getClientRequestId(event);
    const cached = await checkIdempotency(cid);
    if (cached) return cached;
    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch (_) { return err(400, 'Invalid JSON body'); }
    const name = (body.name || '').toString().trim();
    if (!name) return err(400, 'Calendar name is required');
    const description = (body.description || '').toString();
    const calendarId = randomUUID();
    const item = withCompliance({
        PK: `CALENDAR#${calendarId}`,
        SK: 'PROFILE',
        EntityType: 'CALENDAR',
        calendarId,
        name,
        description
    }, { dataClass: DATA_CLASS.PHI, actor: actor.email });
    await ddb.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
        ConditionExpression: 'attribute_not_exists(PK)'
    }));
    const response = res(201, {
        calendarId,
        name,
        description,
        createdAt: item.createdAt
    });
    await storeIdempotency(cid, response);
    return response;
}

async function deleteCalendar(event, actor) {
    const cid = getClientRequestId(event);
    const cached = await checkIdempotency(cid);
    if (cached) return cached;
    const calendarId = event.pathParameters?.calendarId;
    if (!calendarId) return err(400, 'Missing calendarId');

    // Cascade: query every EVENT# under this calendar, then batch-delete them.
    const evOut = await ddb.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :ev)',
        ExpressionAttributeValues: { ':pk': `CALENDAR#${calendarId}`, ':ev': 'EVENT#' },
        ProjectionExpression: 'PK, SK'
    }));
    const events = evOut.Items || [];

    // Batch-delete events 25 at a time.
    for (let i = 0; i < events.length; i += 25) {
        const batch = events.slice(i, i + 25);
        await ddb.send(new BatchWriteCommand({
            RequestItems: {
                [TABLE_NAME]: batch.map(e => ({ DeleteRequest: { Key: { PK: e.PK, SK: e.SK } } }))
            }
        }));
    }

    // Delete the calendar profile itself.
    await ddb.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { PK: `CALENDAR#${calendarId}`, SK: 'PROFILE' }
    }));

    const response = res(204, {});
    await storeIdempotency(cid, response);
    return response;
}

// ── Events ───────────────────────────────────────────────────────────
async function listEvents(event) {
    const calendarId = event.pathParameters?.calendarId;
    if (!calendarId) return err(400, 'Missing calendarId');

    const out = await ddb.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :ev)',
        ExpressionAttributeValues: { ':pk': `CALENDAR#${calendarId}`, ':ev': 'EVENT#' }
    }));
    const events = (out.Items || []).map(it => ({
        eventId:     it.eventId,
        calendarId:  it.calendarId,
        name:        it.name,
        description: it.description || '',
        startDate:   it.startDate,
        endDate:     it.endDate,
        color:       it.color || null,
        recurrence:  it.recurrence || null
    }));
    return res(200, events);
}

async function createEvent(event, actor) {
    const cid = getClientRequestId(event);
    const cached = await checkIdempotency(cid);
    if (cached) return cached;
    const calendarId = event.pathParameters?.calendarId;
    if (!calendarId) return err(400, 'Missing calendarId');

    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch (_) { return err(400, 'Invalid JSON body'); }
    if (!body.name)      return err(400, 'Event name is required');
    if (!body.startDate) return err(400, 'startDate is required');
    if (!body.endDate)   return err(400, 'endDate is required');

    // Confirm parent calendar exists.
    const parent = await ddb.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `CALENDAR#${calendarId}`, SK: 'PROFILE' }
    }));
    if (!parent.Item) return err(404, 'Calendar not found');

    const eventId = randomUUID();
    const item = withCompliance({
        PK: `CALENDAR#${calendarId}`,
        SK: `EVENT#${eventId}`,
        EntityType: 'CALENDAR_EVENT',
        eventId,
        calendarId,
        name:        String(body.name),
        description: body.description ? String(body.description) : '',
        startDate:   String(body.startDate),
        endDate:     String(body.endDate),
        color:       body.color || null,
        recurrence:  body.recurrence || null
    }, { dataClass: DATA_CLASS.PHI, actor: actor.email });

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    const response = res(201, {
        eventId,
        calendarId,
        name:        item.name,
        description: item.description,
        startDate:   item.startDate,
        endDate:     item.endDate,
        color:       item.color,
        recurrence:  item.recurrence
    });
    await storeIdempotency(cid, response);
    return response;
}

async function updateEvent(event, actor) {
    const cid = getClientRequestId(event);
    const cached = await checkIdempotency(cid);
    if (cached) return cached;
    const calendarId = event.pathParameters?.calendarId;
    const eventId    = event.pathParameters?.eventId;
    if (!calendarId || !eventId) return err(400, 'Missing calendarId or eventId');

    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch (_) { return err(400, 'Invalid JSON body'); }

    const allowed = ['name', 'description', 'startDate', 'endDate', 'color', 'recurrence'];
    const sets = [];
    const names = { '#updatedAt': 'updatedAt', '#lastModifiedBy': 'lastModifiedBy' };
    const values = { ':updatedAt': nowIso(), ':lastModifiedBy': actor.email };
    let i = 0;
    for (const k of allowed) {
        if (k in body) {
            const nk = `#k${i}`, vk = `:v${i}`;
            names[nk] = k;
            values[vk] = body[k];
            sets.push(`${nk} = ${vk}`);
            i++;
        }
    }
    sets.push('#updatedAt = :updatedAt', '#lastModifiedBy = :lastModifiedBy');

    try {
        const out = await ddb.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { PK: `CALENDAR#${calendarId}`, SK: `EVENT#${eventId}` },
            UpdateExpression: 'SET ' + sets.join(', '),
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: values,
            ConditionExpression: 'attribute_exists(PK) AND attribute_exists(SK)',
            ReturnValues: 'ALL_NEW'
        }));
        const it = out.Attributes;
        const response = res(200, {
            eventId:     it.eventId,
            calendarId:  it.calendarId,
            name:        it.name,
            description: it.description || '',
            startDate:   it.startDate,
            endDate:     it.endDate,
            color:       it.color || null,
            recurrence:  it.recurrence || null
        });
        await storeIdempotency(cid, response);
        return response;
    } catch (e) {
        if (e.name === 'ConditionalCheckFailedException') return err(404, 'Event not found');
        throw e;
    }
}

async function deleteEvent(event) {
    const cid = getClientRequestId(event);
    const cached = await checkIdempotency(cid);
    if (cached) return cached;
    const calendarId = event.pathParameters?.calendarId;
    const eventId    = event.pathParameters?.eventId;
    if (!calendarId || !eventId) return err(400, 'Missing calendarId or eventId');
    await ddb.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { PK: `CALENDAR#${calendarId}`, SK: `EVENT#${eventId}` }
    }));
    const response = res(204, {});
    await storeIdempotency(cid, response);
    return response;
}

// ── Router ───────────────────────────────────────────────────────────
exports.handler = async (event) => {
    if (event && event._warmup) return { ok: true, warmed: true };
    try {
        const method = event.requestContext?.http?.method || event.httpMethod || '';
        if (method === 'OPTIONS') return res(200, {});

        // Step 2d — tenant guard.
        let __tenantId;
        try { __tenantId = getTenant(event); }
        catch (e) { return err(e.statusCode || 403, e.message); }

        // Step 2g — per-tenant throttle.
        {
            const role = (event.requestContext?.authorizer?.jwt?.claims || {}).role || 'tenant_user';
            const limitResponse = await throttle.precheck(event, { tenantId: __tenantId, role });
            if (limitResponse) return limitResponse;
        }

        const actor = getActor(event);
        const route = event.routeKey || `${method} ${event.rawPath || event.path || ''}`;

        // Reads are open to all authenticated users.
        // Writes require admin/developer/doctor.
        const isRead = method === 'GET';
        if (!isRead && !canWrite(actor)) {
            return err(403, 'Forbidden — calendar writes are admin/doctor only');
        }

        switch (route) {
            case 'GET /calendars':                              return await listCalendars();
            case 'POST /calendars':                             return await createCalendar(event, actor);
            case 'DELETE /calendars/{calendarId}':              return await deleteCalendar(event, actor);
            case 'GET /calendars/{calendarId}/events':          return await listEvents(event);
            case 'POST /calendars/{calendarId}/events':         return await createEvent(event, actor);
            case 'PATCH /calendars/{calendarId}/events/{eventId}':  return await updateEvent(event, actor);
            case 'DELETE /calendars/{calendarId}/events/{eventId}': return await deleteEvent(event);
            default:
                return err(404, `Unknown calendar route: ${route}`);
        }
    } catch (e) {
        console.error('tiryaq-calendar error:', e);
        return err(500, e.message || 'Internal error');
    }
};

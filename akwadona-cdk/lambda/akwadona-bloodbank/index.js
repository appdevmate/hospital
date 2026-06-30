'use strict';

// ─────────────────────────────────────────────────────────────────────
// akwadona-bloodbank — hospital blood bank backend (full clinical workflow)
//
// Routes (all behind JWT auth; CORS handled by API Gateway HTTP API):
//
//   Donors
//     GET    /bloodbank/donors                                 list
//     POST   /bloodbank/donors                                 create
//     GET    /bloodbank/donors/{donorId}                       read
//     PATCH  /bloodbank/donors/{donorId}                       update
//     DELETE /bloodbank/donors/{donorId}                       soft-delete
//
//   Donations (each creates one or more BB_UNIT rows)
//     GET    /bloodbank/donations                              list all
//     GET    /bloodbank/donors/{donorId}/donations             list per donor
//     POST   /bloodbank/donors/{donorId}/donations             record donation
//
//   Inventory (units)
//     GET    /bloodbank/units                                  list (qs filters)
//     PATCH  /bloodbank/units/{unitId}                         update
//     DELETE /bloodbank/units/{unitId}                         discard
//     GET    /bloodbank/stock                                  per-type summary
//
//   Requests + cross-match + issue
//     GET    /bloodbank/requests                               list
//     POST   /bloodbank/requests                               create
//     GET    /bloodbank/requests/{requestId}                   read + crossmatches + issues
//     PATCH  /bloodbank/requests/{requestId}                   update (status etc.)
//     POST   /bloodbank/requests/{requestId}/crossmatch        add crossmatch result
//     POST   /bloodbank/requests/{requestId}/issue             issue compatible units
//     DELETE /bloodbank/requests/{requestId}                   cancel
//
// DynamoDB shape on Hospital table:
//   Donor:       PK = DONOR#<donorId>          SK = PROFILE
//   Donation:    PK = DONOR#<donorId>          SK = DONATION#<donationId>
//   Unit:        PK = BBUNIT#<unitId>          SK = PROFILE
//   Request:     PK = BBREQ#<requestId>        SK = PROFILE
//   Crossmatch:  PK = BBREQ#<requestId>        SK = XMATCH#<unitId>
//   Issue:       PK = BBREQ#<requestId>        SK = ISSUE#<issueId>
// ─────────────────────────────────────────────────────────────────────

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
// Step 2g — per-tenant rate limit.
const throttle = require('./throttle');
// Step 2d-4 — per-row tenant enforcement.
const { assertRowTenant, mergeTenantCondition } = require('./tenant-guard');

const REGION     = process.env.AWS_REGION || 'us-east-1';
const TABLE_NAME = process.env.TABLE_NAME || 'Hospital';
const ddb        = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

// ── Tenant enforcement (Step 2d) — guard at handler entry. ───────────────────
// Per-row stamping (tenantId on every item + ConditionExpression on writes)
// is applied via the follow-up 2d-4 cleanup task; for now the guard rejects
// any UNASSIGNED user from reaching any blood-bank operation.
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

// ── Helpers ──────────────────────────────────────────────────────────
function res(statusCode, body) {
    return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
function err(code, message) { return res(code, { error: message, message }); }
function nowIso() { return new Date().toISOString(); }

// ── Idempotency (Phase D) ────────────────────────────────────────────
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
                createdAt: nowIso(), updatedAt: nowIso(),
                expiresAt: Math.floor(Date.now() / 1000) + 86400
            }
        }));
    } catch (_) {}
}

function getActor(event) {
    const claims = event.requestContext?.authorizer?.jwt?.claims
                || event.requestContext?.authorizer?.claims || {};
    const raw = claims['cognito:groups'] || '';
    const groups = Array.isArray(raw)
        ? raw
        : String(raw).trim().replace(/^\[/, '').replace(/\]$/, '').split(/[,\s]+/).filter(Boolean);
    return {
        email: (claims.email || claims['cognito:username'] || 'unknown').toLowerCase().trim(),
        name:  claims.name || claims.email || 'unknown',
        groups
    };
}
function hasGroup(actor, allowed) {
    return actor.groups.some(g => allowed.includes(g));
}
function canRead(actor)         { return hasGroup(actor, ['Admin','admin','Developers','Developer','developer','Doctors','Doctor','doctor','Pharmacists','Pharmacist','pharmacist']); }
function canManageInventory(actor) { return hasGroup(actor, ['Admin','admin','Developers','Developer','developer','Pharmacists','Pharmacist','pharmacist']); }
function canRequestBlood(actor) { return hasGroup(actor, ['Admin','admin','Developers','Developer','developer','Doctors','Doctor','doctor']); }
function canIssueBlood(actor)   { return hasGroup(actor, ['Admin','admin','Developers','Developer','developer','Pharmacists','Pharmacist','pharmacist']); }

// ── Reference data ───────────────────────────────────────────────────
const VALID_BLOOD_TYPES = ['O+','O-','A+','A-','B+','B-','AB+','AB-'];
const VALID_PRODUCT_TYPES = ['whole','packed-rbc','plasma','platelets','cryo'];
const VALID_UNIT_STATUS = ['available','reserved','issued','used','discarded','expired','quarantined'];
const VALID_REQUEST_STATUS = ['pending','approved','crossmatched','issued','cancelled','rejected'];
const VALID_URGENCY = ['routine','urgent','emergency','stat'];

// ABO/Rh donor-recipient compatibility for packed RBC. Plasma/platelets follow
// different rules but we use this as the conservative default; the cross-match
// row records the lab's actual finding.
const RBC_COMPAT = {
    'O-':  ['O-'],
    'O+':  ['O-','O+'],
    'A-':  ['O-','A-'],
    'A+':  ['O-','O+','A-','A+'],
    'B-':  ['O-','B-'],
    'B+':  ['O-','O+','B-','B+'],
    'AB-': ['O-','A-','B-','AB-'],
    'AB+': ['O-','O+','A-','A+','B-','B+','AB-','AB+']
};
function isRbcCompatible(recipientType, donorType) {
    const allowed = RBC_COMPAT[recipientType];
    return Array.isArray(allowed) && allowed.includes(donorType);
}

// Default shelf life (days) per product. CollectionDate + shelf = expiry.
const SHELF_LIFE_DAYS = { whole: 35, 'packed-rbc': 42, plasma: 365, platelets: 5, cryo: 365 };
function addDays(dateStr, days) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

// ── DONORS ───────────────────────────────────────────────────────────
async function listDonors(tenantId) {
    // Step 2d-4 — scope by tenantId.
    const out = await ddb.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'EntityType-index',
        KeyConditionExpression: 'EntityType = :et',
        FilterExpression: 'attribute_not_exists(deletedAt) AND tenantId = :tnt',
        ExpressionAttributeValues: { ':et': 'BB_DONOR', ':tnt': tenantId }
    }));
    return res(200, (out.Items || []).map(stripKeys));
}
async function getDonor(event, tenantId) {
    const id = event.pathParameters?.donorId;
    if (!id) return err(400, 'donorId required');
    const r = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: `DONOR#${id}`, SK: 'PROFILE' } }));
    if (!r.Item || r.Item.deletedAt) return err(404, 'Donor not found');
    // Step 2d-4 — tenant guard.
    assertRowTenant(r.Item, tenantId, { notFoundMessage: 'Donor not found' });
    return res(200, stripKeys(r.Item));
}
async function createDonor(event, actor, tenantId) {
    const cid = getClientRequestId(event); const cached = await checkIdempotency(cid); if (cached) return cached;
    let body = {}; try { body = JSON.parse(event.body || '{}'); } catch { return err(400, 'Invalid JSON'); }
    if (!body.name) return err(400, 'name required');
    if (!VALID_BLOOD_TYPES.includes(body.bloodType)) return err(400, 'invalid bloodType');
    // At least one of phone / qid must be present. Each, if provided, must
    // be well-formed (phone ≥ 8 digits, qid exactly 11 digits).
    const phoneDigits = String(body.phone || '').replace(/\D/g, '');
    const qidDigits   = String(body.qid   || '').replace(/\D/g, '');
    const hasPhone = phoneDigits.length >= 8;
    const hasQid   = qidDigits.length === 11;
    if (!hasPhone && !hasQid) {
        return err(400, 'Provide at least one identifier — phone (min 8 digits) or qid (11 digits)');
    }
    if (body.phone && !hasPhone) return err(400, 'phone must have at least 8 digits');
    if (body.qid && !hasQid)     return err(400, 'qid must be 11 digits');
    const id = randomUUID();
    const item = {
        PK: `DONOR#${id}`, SK: 'PROFILE', EntityType: 'BB_DONOR', dataClass: 'PHI',
        tenantId, // Step 2d-4
        donorId: id,
        name:        String(body.name).trim(),
        bloodType:   body.bloodType,
        lastDonation: null,
        donationCount: 0,
        eligibilityStatus: 'eligible',
        createdAt: nowIso(), updatedAt: nowIso(),
        createdBy: actor.email
    };
    // Optional contact fields — write only what's present.
    if (hasPhone)     item.phone   = String(body.phone).trim();
    if (hasQid)       item.qid     = qidDigits;
    if (body.gender)  item.gender  = String(body.gender).trim();
    if (body.dob)     item.dob     = String(body.dob).trim();
    if (body.email)   item.email   = String(body.email).trim();
    if (body.address) item.address = String(body.address).trim();
    if (body.notes)   item.notes   = String(body.notes).trim();
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item, ConditionExpression: 'attribute_not_exists(PK)' }));
    const response = res(201, stripKeys(item));
    await storeIdempotency(cid, response);
    return response;
}
async function updateDonor(event, actor, tenantId) {
    const cid = getClientRequestId(event); const cached = await checkIdempotency(cid); if (cached) return cached;
    const id = event.pathParameters?.donorId;
    if (!id) return err(400, 'donorId required');
    let body = {}; try { body = JSON.parse(event.body || '{}'); } catch { return err(400, 'Invalid JSON'); }
    const allowed = ['name','bloodType','gender','dob','phone','email','address','notes','eligibilityStatus'];
    const names = { '#u': 'updatedAt', '#ub': 'updatedBy' };
    const values = { ':u': nowIso(), ':ub': actor.email };
    const sets = ['#u = :u', '#ub = :ub'];
    let i = 0;
    for (const k of allowed) {
        const v = body[k];
        if (v === undefined || v === null || v === '') continue;
        const nk = `#k${i}`, vk = `:v${i}`;
        names[nk] = k; values[vk] = v; sets.push(`${nk} = ${vk}`); i++;
    }
    // Step 2d-4 — merge tenant condition.
    const guarded = mergeTenantCondition(
        { ConditionExpression: 'attribute_exists(PK)' },
        tenantId
    );
    try {
        const out = await ddb.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { PK: `DONOR#${id}`, SK: 'PROFILE' },
            UpdateExpression: 'SET ' + sets.join(', '),
            ExpressionAttributeNames: { ...names, ...guarded.ExpressionAttributeNames },
            ExpressionAttributeValues: { ...values, ...guarded.ExpressionAttributeValues },
            ConditionExpression: guarded.ConditionExpression,
            ReturnValues: 'ALL_NEW'
        }));
        const response = res(200, stripKeys(out.Attributes));
        await storeIdempotency(cid, response);
        return response;
    } catch (e) {
        if (e.name === 'ConditionalCheckFailedException') return err(404, 'Donor not found');
        throw e;
    }
}
async function deleteDonor(event, actor, tenantId) {
    const cid = getClientRequestId(event); const cached = await checkIdempotency(cid); if (cached) return cached;
    const id = event.pathParameters?.donorId;
    if (!id) return err(400, 'donorId required');
    const guarded = mergeTenantCondition(
        { ConditionExpression: 'attribute_exists(PK)' },
        tenantId
    );
    try {
        await ddb.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { PK: `DONOR#${id}`, SK: 'PROFILE' },
            UpdateExpression: 'SET deletedAt = :d, updatedAt = :d, updatedBy = :ub',
            ExpressionAttributeNames: guarded.ExpressionAttributeNames,
            ExpressionAttributeValues: { ':d': nowIso(), ':ub': actor.email, ...guarded.ExpressionAttributeValues },
            ConditionExpression: guarded.ConditionExpression
        }));
    } catch (e) {
        if (e.name === 'ConditionalCheckFailedException') return err(404, 'Donor not found');
        throw e;
    }
    const response = res(204, {});
    await storeIdempotency(cid, response);
    return response;
}

// ── DONATIONS ────────────────────────────────────────────────────────
async function listAllDonations(tenantId) {
    const out = await ddb.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'EntityType-index',
        KeyConditionExpression: 'EntityType = :et',
        FilterExpression: 'tenantId = :tnt',
        ExpressionAttributeValues: { ':et': 'BB_DONATION', ':tnt': tenantId }
    }));
    return res(200, (out.Items || []).map(stripKeys));
}
async function listDonorDonations(event, tenantId) {
    const id = event.pathParameters?.donorId;
    if (!id) return err(400, 'donorId required');
    // Step 2d-4 — tenant filter on PK-scoped query too.
    const out = await ddb.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :s)',
        FilterExpression: 'tenantId = :tnt',
        ExpressionAttributeValues: { ':pk': `DONOR#${id}`, ':s': 'DONATION#', ':tnt': tenantId }
    }));
    return res(200, (out.Items || []).map(stripKeys));
}
async function createDonation(event, actor, tenantId) {
    const cid = getClientRequestId(event); const cached = await checkIdempotency(cid); if (cached) return cached;
    const donorId = event.pathParameters?.donorId;
    if (!donorId) return err(400, 'donorId required');
    let body = {}; try { body = JSON.parse(event.body || '{}'); } catch { return err(400, 'Invalid JSON'); }
    const r = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: `DONOR#${donorId}`, SK: 'PROFILE' } }));
    if (!r.Item || r.Item.deletedAt) return err(404, 'Donor not found');
    // Step 2d-4 — donor must belong to caller's tenant.
    assertRowTenant(r.Item, tenantId, { notFoundMessage: 'Donor not found' });
    const donor = r.Item;
    const collectionDate = body.collectionDate || nowIso().slice(0,10);
    const volumeMl = Number(body.volumeMl) || 450;
    const productType = body.productType || 'whole';
    if (!VALID_PRODUCT_TYPES.includes(productType)) return err(400, 'invalid productType');
    const unitsToCreate = Math.max(1, Number(body.units) || 1);
    const donationId = randomUUID();

    const donation = {
        PK: `DONOR#${donorId}`, SK: `DONATION#${donationId}`,
        EntityType: 'BB_DONATION', dataClass: 'PHI',
        tenantId, // Step 2d-4
        donationId, donorId,
        donorName:    donor.name,
        bloodType:    donor.bloodType,
        productType,
        volumeMl,
        units:        unitsToCreate,
        collectionDate,
        notes:        body.notes || null,
        createdAt: nowIso(), updatedAt: nowIso(),
        createdBy: actor.email
    };
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: donation }));

    // Create one BB_UNIT row per unit. Each unit gets its own UUID + expiry.
    const shelf = SHELF_LIFE_DAYS[productType] || 35;
    const createdUnits = [];
    for (let i = 0; i < unitsToCreate; i++) {
        const unitId = randomUUID();
        const unit = {
            PK: `BBUNIT#${unitId}`, SK: 'PROFILE',
            EntityType: 'BB_UNIT', dataClass: 'PHI',
            tenantId, // Step 2d-4
            unitId, donationId, donorId,
            donorName:      donor.name,
            bloodType:      donor.bloodType,
            productType,
            volumeMl:       Math.round(volumeMl / unitsToCreate),
            collectionDate,
            expiryDate:     addDays(collectionDate, shelf),
            status:         'available',
            currentLocation: body.location || 'main-fridge',
            reservedForRequestId: null,
            reservedUntil:        null,
            createdAt: nowIso(), updatedAt: nowIso()
        };
        await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: unit }));
        createdUnits.push(stripKeys(unit));
    }

    // Bump donor stats. Step 2d-4 — tenant condition belt-and-suspenders.
    {
        const g = mergeTenantCondition(null, tenantId);
        try {
            await ddb.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { PK: `DONOR#${donorId}`, SK: 'PROFILE' },
                UpdateExpression: 'SET lastDonation = :ld, donationCount = if_not_exists(donationCount, :z) + :one, updatedAt = :u',
                ExpressionAttributeNames: g.ExpressionAttributeNames,
                ExpressionAttributeValues: { ':ld': collectionDate, ':z': 0, ':one': 1, ':u': nowIso(), ...g.ExpressionAttributeValues },
                ConditionExpression: g.ConditionExpression
            }));
        } catch (e) {
            console.error('Failed to bump donor stats', e);
        }
    }

    const response = res(201, { donation: stripKeys(donation), units: createdUnits });
    await storeIdempotency(cid, response);
    return response;
}

// ── UNITS / INVENTORY ───────────────────────────────────────────────
async function listUnits(event, tenantId) {
    const qp = event.queryStringParameters || {};
    // Step 2d-4 — tenant filter.
    const out = await ddb.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'EntityType-index',
        KeyConditionExpression: 'EntityType = :et',
        FilterExpression: 'tenantId = :tnt',
        ExpressionAttributeValues: { ':et': 'BB_UNIT', ':tnt': tenantId }
    }));
    const today = nowIso().slice(0,10);
    let items = (out.Items || []).map(stripKeys);

    // Lazy expiry sweep + auto-unreserve
    items = items.map(u => {
        if (u.status === 'available' && u.expiryDate && u.expiryDate < today) u.status = 'expired';
        if (u.status === 'reserved' && u.reservedUntil && u.reservedUntil < nowIso()) {
            u.status = 'available';
            u.reservedForRequestId = null;
            u.reservedUntil = null;
        }
        return u;
    });

    if (qp.status)      items = items.filter(u => u.status === qp.status);
    if (qp.bloodType)   items = items.filter(u => u.bloodType === qp.bloodType);
    if (qp.productType) items = items.filter(u => u.productType === qp.productType);
    if (qp.expiringIn) {
        const days = Number(qp.expiringIn);
        if (!isNaN(days)) {
            const cutoff = addDays(today, days);
            items = items.filter(u => u.expiryDate && u.expiryDate <= cutoff);
        }
    }
    return res(200, items);
}
async function updateUnit(event, actor, tenantId) {
    const cid = getClientRequestId(event); const cached = await checkIdempotency(cid); if (cached) return cached;
    const id = event.pathParameters?.unitId;
    if (!id) return err(400, 'unitId required');
    let body = {}; try { body = JSON.parse(event.body || '{}'); } catch { return err(400, 'Invalid JSON'); }
    if (body.status && !VALID_UNIT_STATUS.includes(body.status)) return err(400, 'invalid status');
    const allowed = ['status','currentLocation','notes','reservedForRequestId','reservedUntil','expiryDate'];
    const names = { '#u': 'updatedAt', '#ub': 'updatedBy' };
    const values = { ':u': nowIso(), ':ub': actor.email };
    const sets = ['#u = :u', '#ub = :ub'];
    let i = 0;
    for (const k of allowed) {
        if (body[k] !== undefined) {
            const n = `#k${i}`, v = `:v${i}`;
            names[n] = k; values[v] = body[k]; sets.push(`${n} = ${v}`); i++;
        }
    }
    const guarded = mergeTenantCondition(
        { ConditionExpression: 'attribute_exists(PK)' },
        tenantId
    );
    try {
        const out = await ddb.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { PK: `BBUNIT#${id}`, SK: 'PROFILE' },
            UpdateExpression: 'SET ' + sets.join(', '),
            ExpressionAttributeNames: { ...names, ...guarded.ExpressionAttributeNames },
            ExpressionAttributeValues: { ...values, ...guarded.ExpressionAttributeValues },
            ConditionExpression: guarded.ConditionExpression,
            ReturnValues: 'ALL_NEW'
        }));
        const response = res(200, stripKeys(out.Attributes));
        await storeIdempotency(cid, response);
        return response;
    } catch (e) {
        if (e.name === 'ConditionalCheckFailedException') return err(404, 'Unit not found');
        throw e;
    }
}
async function discardUnit(event, actor, tenantId) {
    const cid = getClientRequestId(event); const cached = await checkIdempotency(cid); if (cached) return cached;
    const id = event.pathParameters?.unitId;
    if (!id) return err(400, 'unitId required');
    const guarded = mergeTenantCondition(
        { ConditionExpression: 'attribute_exists(PK)' },
        tenantId
    );
    try {
        await ddb.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { PK: `BBUNIT#${id}`, SK: 'PROFILE' },
            UpdateExpression: 'SET #status = :s, updatedAt = :u, updatedBy = :ub',
            ExpressionAttributeNames: { '#status': 'status', ...guarded.ExpressionAttributeNames },
            ExpressionAttributeValues: { ':s': 'discarded', ':u': nowIso(), ':ub': actor.email, ...guarded.ExpressionAttributeValues },
            ConditionExpression: guarded.ConditionExpression
        }));
    } catch (e) {
        if (e.name === 'ConditionalCheckFailedException') return err(404, 'Unit not found');
        throw e;
    }
    const response = res(204, {});
    await storeIdempotency(cid, response);
    return response;
}
async function stockSummary(tenantId) {
    const out = await ddb.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'EntityType-index',
        KeyConditionExpression: 'EntityType = :et',
        FilterExpression: 'tenantId = :tnt',
        ExpressionAttributeValues: { ':et': 'BB_UNIT', ':tnt': tenantId }
    }));
    const today = nowIso().slice(0,10);
    const stock = {};
    for (const u of (out.Items || [])) {
        const status = (u.status === 'available' && u.expiryDate && u.expiryDate < today) ? 'expired' : u.status;
        const key = `${u.bloodType}|${u.productType}`;
        if (!stock[key]) stock[key] = { bloodType: u.bloodType, productType: u.productType, total: 0 };
        stock[key].total++;
        stock[key][status] = (stock[key][status] || 0) + 1;
    }
    return res(200, Object.values(stock));
}

// ── REQUESTS ─────────────────────────────────────────────────────────
async function listRequests(event, tenantId) {
    const qp = event.queryStringParameters || {};
    const out = await ddb.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'EntityType-index',
        KeyConditionExpression: 'EntityType = :et',
        FilterExpression: 'tenantId = :tnt',
        ExpressionAttributeValues: { ':et': 'BB_REQUEST', ':tnt': tenantId }
    }));
    let items = (out.Items || []).map(stripKeys);
    if (qp.status)   items = items.filter(r => r.status === qp.status);
    if (qp.urgency)  items = items.filter(r => r.urgency === qp.urgency);
    if (qp.patientId) items = items.filter(r => r.patientId === qp.patientId);
    return res(200, items.sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
}
async function getRequest(event, tenantId) {
    const id = event.pathParameters?.requestId;
    if (!id) return err(400, 'requestId required');
    // Step 2d-4 — filter the whole sub-tree by tenant.
    const r = await ddb.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk',
        FilterExpression: 'tenantId = :tnt',
        ExpressionAttributeValues: { ':pk': `BBREQ#${id}`, ':tnt': tenantId }
    }));
    if (!r.Items || !r.Items.length) return err(404, 'Request not found');
    const profile = r.Items.find(it => it.SK === 'PROFILE');
    if (!profile) return err(404, 'Request not found');
    const crossmatches = r.Items.filter(it => it.SK && it.SK.startsWith('XMATCH#')).map(stripKeys);
    const issues       = r.Items.filter(it => it.SK && it.SK.startsWith('ISSUE#')).map(stripKeys);
    return res(200, { ...stripKeys(profile), crossmatches, issues });
}
async function createRequest(event, actor, tenantId) {
    const cid = getClientRequestId(event); const cached = await checkIdempotency(cid); if (cached) return cached;
    let body = {}; try { body = JSON.parse(event.body || '{}'); } catch { return err(400, 'Invalid JSON'); }
    if (!body.patientId)   return err(400, 'patientId required');
    if (!body.patientName) return err(400, 'patientName required');
    if (!VALID_BLOOD_TYPES.includes(body.bloodType)) return err(400, 'invalid bloodType');
    if (!VALID_PRODUCT_TYPES.includes(body.productType || 'packed-rbc')) return err(400, 'invalid productType');
    if (body.urgency && !VALID_URGENCY.includes(body.urgency)) return err(400, 'invalid urgency');
    const id = randomUUID();
    const item = {
        PK: `BBREQ#${id}`, SK: 'PROFILE', EntityType: 'BB_REQUEST', dataClass: 'PHI',
        tenantId, // Step 2d-4
        requestId: id,
        patientId:      body.patientId,
        patientName:    body.patientName,
        bloodType:      body.bloodType,
        productType:    body.productType || 'packed-rbc',
        unitsRequested: Math.max(1, Number(body.unitsRequested) || 1),
        urgency:        body.urgency || 'routine',
        clinicalReason: body.clinicalReason || null,
        notes:          body.notes || null,
        requestingDoctorId:    body.requestingDoctorId || null,
        requestingDoctorName:  body.requestingDoctorName || actor.name,
        requestingDoctorEmail: body.requestingDoctorEmail || actor.email,
        status:         'pending',
        createdAt: nowIso(), updatedAt: nowIso(),
        createdBy: actor.email
    };
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item, ConditionExpression: 'attribute_not_exists(PK)' }));
    const response = res(201, stripKeys(item));
    await storeIdempotency(cid, response);
    return response;
}
async function updateRequest(event, actor, tenantId) {
    const cid = getClientRequestId(event); const cached = await checkIdempotency(cid); if (cached) return cached;
    const id = event.pathParameters?.requestId;
    if (!id) return err(400, 'requestId required');
    let body = {}; try { body = JSON.parse(event.body || '{}'); } catch { return err(400, 'Invalid JSON'); }
    if (body.status && !VALID_REQUEST_STATUS.includes(body.status)) return err(400, 'invalid status');
    const allowed = ['status','urgency','clinicalReason','notes','unitsRequested'];
    const names = { '#u': 'updatedAt', '#ub': 'updatedBy' };
    const values = { ':u': nowIso(), ':ub': actor.email };
    const sets = ['#u = :u', '#ub = :ub'];
    let i = 0;
    for (const k of allowed) {
        if (body[k] !== undefined) {
            const n = `#k${i}`, v = `:v${i}`;
            names[n] = k; values[v] = body[k]; sets.push(`${n} = ${v}`); i++;
        }
    }
    const guarded = mergeTenantCondition(
        { ConditionExpression: 'attribute_exists(PK)' },
        tenantId
    );
    try {
        const out = await ddb.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { PK: `BBREQ#${id}`, SK: 'PROFILE' },
            UpdateExpression: 'SET ' + sets.join(', '),
            ExpressionAttributeNames: { ...names, ...guarded.ExpressionAttributeNames },
            ExpressionAttributeValues: { ...values, ...guarded.ExpressionAttributeValues },
            ConditionExpression: guarded.ConditionExpression,
            ReturnValues: 'ALL_NEW'
        }));
        const response = res(200, stripKeys(out.Attributes));
        await storeIdempotency(cid, response);
        return response;
    } catch (e) {
        if (e.name === 'ConditionalCheckFailedException') return err(404, 'Request not found');
        throw e;
    }
}
async function cancelRequest(event, actor, tenantId) {
    const cid = getClientRequestId(event); const cached = await checkIdempotency(cid); if (cached) return cached;
    const id = event.pathParameters?.requestId;
    if (!id) return err(400, 'requestId required');
    // Step 2d-4 — only THIS tenant's reserved units.
    const unitsOut = await ddb.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'EntityType-index',
        KeyConditionExpression: 'EntityType = :et',
        FilterExpression: 'reservedForRequestId = :r AND tenantId = :tnt',
        ExpressionAttributeValues: { ':et': 'BB_UNIT', ':r': id, ':tnt': tenantId }
    }));
    for (const u of (unitsOut.Items || [])) {
        const g = mergeTenantCondition(null, tenantId);
        try {
            await ddb.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { PK: u.PK, SK: u.SK },
                UpdateExpression: 'SET #status = :a, reservedForRequestId = :n, reservedUntil = :n, updatedAt = :u',
                ExpressionAttributeNames: { '#status': 'status', ...g.ExpressionAttributeNames },
                ExpressionAttributeValues: { ':a': 'available', ':n': null, ':u': nowIso(), ...g.ExpressionAttributeValues },
                ConditionExpression: g.ConditionExpression
            }));
        } catch (e) {
            if (e.name !== 'ConditionalCheckFailedException') throw e;
        }
    }
    const guarded = mergeTenantCondition(
        { ConditionExpression: 'attribute_exists(PK)' },
        tenantId
    );
    try {
        await ddb.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { PK: `BBREQ#${id}`, SK: 'PROFILE' },
            UpdateExpression: 'SET #status = :s, updatedAt = :u, updatedBy = :ub',
            ExpressionAttributeNames: { '#status': 'status', ...guarded.ExpressionAttributeNames },
            ExpressionAttributeValues: { ':s': 'cancelled', ':u': nowIso(), ':ub': actor.email, ...guarded.ExpressionAttributeValues },
            ConditionExpression: guarded.ConditionExpression
        }));
    } catch (e) {
        if (e.name === 'ConditionalCheckFailedException') return err(404, 'Request not found');
        throw e;
    }
    const response = res(204, {});
    await storeIdempotency(cid, response);
    return response;
}

// ── CROSSMATCH + ISSUE ──────────────────────────────────────────────
async function addCrossmatch(event, actor, tenantId) {
    const cid = getClientRequestId(event); const cached = await checkIdempotency(cid); if (cached) return cached;
    const reqId = event.pathParameters?.requestId;
    if (!reqId) return err(400, 'requestId required');
    let body = {}; try { body = JSON.parse(event.body || '{}'); } catch { return err(400, 'Invalid JSON'); }
    if (!body.unitId) return err(400, 'unitId required');

    const [reqRow, unitRow] = await Promise.all([
        ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: `BBREQ#${reqId}`, SK: 'PROFILE' } })),
        ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: `BBUNIT#${body.unitId}`, SK: 'PROFILE' } }))
    ]);
    if (!reqRow.Item)  return err(404, 'Request not found');
    if (!unitRow.Item) return err(404, 'Unit not found');
    // Step 2d-4 — BOTH rows must belong to caller's tenant.
    assertRowTenant(reqRow.Item,  tenantId, { notFoundMessage: 'Request not found' });
    assertRowTenant(unitRow.Item, tenantId, { notFoundMessage: 'Unit not found'    });
    if (reqRow.Item.status === 'cancelled') return err(409, 'Request is cancelled');
    if (unitRow.Item.status !== 'available' && unitRow.Item.status !== 'reserved') {
        return err(409, `Unit is ${unitRow.Item.status} — cannot crossmatch`);
    }

    // Server-side ABO/Rh sanity check.
    const compat = isRbcCompatible(reqRow.Item.bloodType, unitRow.Item.bloodType);
    const declared = body.compatible === undefined ? compat : Boolean(body.compatible);

    const item = {
        PK: `BBREQ#${reqId}`, SK: `XMATCH#${body.unitId}`,
        EntityType: 'BB_CROSSMATCH', dataClass: 'PHI',
        tenantId, // Step 2d-4
        requestId: reqId, unitId: body.unitId,
        donorBloodType: unitRow.Item.bloodType,
        recipientBloodType: reqRow.Item.bloodType,
        compatible: declared,
        aboRhCompatible: compat,
        technician: actor.email,
        method: body.method || 'serologic',
        notes: body.notes || null,
        performedAt: nowIso(),
        createdAt: nowIso(), updatedAt: nowIso(),
        createdBy: actor.email
    };
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));

    // If compatible, reserve the unit for ~2 hours and bump request status.
    if (declared) {
        const reservedUntil = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
        {
            const g = mergeTenantCondition(null, tenantId);
            await ddb.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { PK: `BBUNIT#${body.unitId}`, SK: 'PROFILE' },
                UpdateExpression: 'SET #status = :s, reservedForRequestId = :r, reservedUntil = :ru, updatedAt = :u',
                ExpressionAttributeNames: { '#status': 'status', ...g.ExpressionAttributeNames },
                ExpressionAttributeValues: { ':s': 'reserved', ':r': reqId, ':ru': reservedUntil, ':u': nowIso(), ...g.ExpressionAttributeValues },
                ConditionExpression: g.ConditionExpression
            }));
        }
        if (reqRow.Item.status === 'pending' || reqRow.Item.status === 'approved') {
            const g = mergeTenantCondition(null, tenantId);
            await ddb.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { PK: `BBREQ#${reqId}`, SK: 'PROFILE' },
                UpdateExpression: 'SET #status = :s, updatedAt = :u',
                ExpressionAttributeNames: { '#status': 'status', ...g.ExpressionAttributeNames },
                ExpressionAttributeValues: { ':s': 'crossmatched', ':u': nowIso(), ...g.ExpressionAttributeValues },
                ConditionExpression: g.ConditionExpression
            }));
        }
    }

    const response = res(201, stripKeys(item));
    await storeIdempotency(cid, response);
    return response;
}

async function issueUnits(event, actor, tenantId) {
    const cid = getClientRequestId(event); const cached = await checkIdempotency(cid); if (cached) return cached;
    const reqId = event.pathParameters?.requestId;
    if (!reqId) return err(400, 'requestId required');
    let body = {}; try { body = JSON.parse(event.body || '{}'); } catch { return err(400, 'Invalid JSON'); }
    const unitIds = Array.isArray(body.unitIds) ? body.unitIds : [];
    if (!unitIds.length) return err(400, 'unitIds[] required');

    const reqRow = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: `BBREQ#${reqId}`, SK: 'PROFILE' } }));
    if (!reqRow.Item) return err(404, 'Request not found');
    // Step 2d-4 — request must belong to caller's tenant.
    assertRowTenant(reqRow.Item, tenantId, { notFoundMessage: 'Request not found' });
    if (reqRow.Item.status === 'cancelled') return err(409, 'Request is cancelled');

    // Verify every unit has a compatible crossmatch on file for this request.
    // Step 2d-4 — filter by tenantId.
    const xmOut = await ddb.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :s)',
        FilterExpression: 'tenantId = :tnt',
        ExpressionAttributeValues: { ':pk': `BBREQ#${reqId}`, ':s': 'XMATCH#', ':tnt': tenantId }
    }));
    const xmByUnit = {};
    for (const x of (xmOut.Items || [])) xmByUnit[x.unitId] = x;

    for (const u of unitIds) {
        const xm = xmByUnit[u];
        if (!xm)              return err(409, `Unit ${u} has no crossmatch on this request`);
        if (!xm.compatible)   return err(409, `Unit ${u} crossmatch is incompatible`);
    }

    // Mark each unit issued — tenant condition prevents marking another
    // tenant's unit even if a malicious crossmatch row was forged.
    for (const u of unitIds) {
        const g = mergeTenantCondition(null, tenantId);
        try {
            await ddb.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { PK: `BBUNIT#${u}`, SK: 'PROFILE' },
                UpdateExpression: 'SET #status = :s, issuedAt = :now, updatedAt = :now',
                ExpressionAttributeNames: { '#status': 'status', ...g.ExpressionAttributeNames },
                ExpressionAttributeValues: { ':s': 'issued', ':now': nowIso(), ...g.ExpressionAttributeValues },
                ConditionExpression: g.ConditionExpression
            }));
        } catch (e) {
            if (e.name === 'ConditionalCheckFailedException') return err(404, `Unit ${u} not found`);
            throw e;
        }
    }

    // Record the issue event row.
    const issueId = randomUUID();
    const issueRow = {
        PK: `BBREQ#${reqId}`, SK: `ISSUE#${issueId}`,
        EntityType: 'BB_ISSUE', dataClass: 'PHI',
        tenantId, // Step 2d-4
        requestId: reqId, issueId,
        unitIds,
        issuedBy: actor.email,
        issuedTo: body.issuedTo || null,
        notes:    body.notes    || null,
        issuedAt: nowIso(),
        createdAt: nowIso(), updatedAt: nowIso()
    };
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: issueRow }));

    // Move request to "issued".
    {
        const g = mergeTenantCondition(null, tenantId);
        await ddb.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { PK: `BBREQ#${reqId}`, SK: 'PROFILE' },
            UpdateExpression: 'SET #status = :s, updatedAt = :u, updatedBy = :ub',
            ExpressionAttributeNames: { '#status': 'status', ...g.ExpressionAttributeNames },
            ExpressionAttributeValues: { ':s': 'issued', ':u': nowIso(), ':ub': actor.email, ...g.ExpressionAttributeValues },
            ConditionExpression: g.ConditionExpression
        }));
    }

    const response = res(201, stripKeys(issueRow));
    await storeIdempotency(cid, response);
    return response;
}

// ── util ────────────────────────────────────────────────────────────
function stripKeys(it) {
    if (!it) return it;
    const { PK, SK, ...rest } = it;
    return rest;
}

// ── Router ──────────────────────────────────────────────────────────
exports.handler = async (event) => {
    if (event && event._warmup) return { ok: true, warmed: true };
    try {
        const method = event.requestContext?.http?.method || event.httpMethod || '';
        if (method === 'OPTIONS') return res(200, {});

        // Step 2d — tenant guard.
        let tenantId;
        try { tenantId = getTenant(event); }
        catch (e) { return err(e.statusCode || 403, e.message); }

        // Step 2g — per-tenant throttle.
        {
            const role = (event.requestContext?.authorizer?.jwt?.claims || {}).role || 'tenant_user';
            const limitResponse = await throttle.precheck(event, { tenantId, role });
            if (limitResponse) return limitResponse;
        }

        const actor = getActor(event);
        if (!canRead(actor)) return err(403, 'Forbidden');
        const route = event.routeKey || `${method} ${event.rawPath || event.path || ''}`;

        // Inventory writes
        const needsInv = ['POST /bloodbank/donors',
                          'PATCH /bloodbank/donors/{donorId}',
                          'DELETE /bloodbank/donors/{donorId}',
                          'POST /bloodbank/donors/{donorId}/donations',
                          'PATCH /bloodbank/units/{unitId}',
                          'DELETE /bloodbank/units/{unitId}',
                          'POST /bloodbank/requests/{requestId}/crossmatch'];
        if (needsInv.includes(route) && !canManageInventory(actor)) {
            return err(403, 'Only admin/pharmacist can perform this action');
        }
        if (route === 'POST /bloodbank/requests' && !canRequestBlood(actor)) {
            return err(403, 'Only doctors/admin can request blood');
        }
        if (route === 'POST /bloodbank/requests/{requestId}/issue' && !canIssueBlood(actor)) {
            return err(403, 'Only admin/pharmacist can issue blood');
        }

        // Step 2d-4 — every handler receives tenantId.
        switch (route) {
            // donors
            case 'GET /bloodbank/donors':                                return await listDonors(tenantId);
            case 'POST /bloodbank/donors':                               return await createDonor(event, actor, tenantId);
            case 'GET /bloodbank/donors/{donorId}':                      return await getDonor(event, tenantId);
            case 'PATCH /bloodbank/donors/{donorId}':                    return await updateDonor(event, actor, tenantId);
            case 'DELETE /bloodbank/donors/{donorId}':                   return await deleteDonor(event, actor, tenantId);
            // donations
            case 'GET /bloodbank/donations':                             return await listAllDonations(tenantId);
            case 'GET /bloodbank/donors/{donorId}/donations':            return await listDonorDonations(event, tenantId);
            case 'POST /bloodbank/donors/{donorId}/donations':           return await createDonation(event, actor, tenantId);
            // units
            case 'GET /bloodbank/units':                                 return await listUnits(event, tenantId);
            case 'PATCH /bloodbank/units/{unitId}':                      return await updateUnit(event, actor, tenantId);
            case 'DELETE /bloodbank/units/{unitId}':                     return await discardUnit(event, actor, tenantId);
            case 'GET /bloodbank/stock':                                 return await stockSummary(tenantId);
            // requests
            case 'GET /bloodbank/requests':                              return await listRequests(event, tenantId);
            case 'POST /bloodbank/requests':                             return await createRequest(event, actor, tenantId);
            case 'GET /bloodbank/requests/{requestId}':                  return await getRequest(event, tenantId);
            case 'PATCH /bloodbank/requests/{requestId}':                return await updateRequest(event, actor, tenantId);
            case 'DELETE /bloodbank/requests/{requestId}':               return await cancelRequest(event, actor, tenantId);
            case 'POST /bloodbank/requests/{requestId}/crossmatch':      return await addCrossmatch(event, actor, tenantId);
            case 'POST /bloodbank/requests/{requestId}/issue':           return await issueUnits(event, actor, tenantId);
            default:
                return err(404, `Unknown blood-bank route: ${route}`);
        }
    } catch (e) {
        if (e && e.statusCode === 404) {
            if (e.crossTenantAttempt) {
                console.warn('cross-tenant attempt', { route: event.routeKey, by: event.requestContext?.authorizer?.jwt?.claims?.email });
            }
            return err(404, e.message || 'Not found');
        }
        console.error('akwadona-bloodbank error:', e);
        return err(500, e.message || 'Internal error');
    }
};
// hash-bust 2026-06-21T13:57:58.1016493+03:00
// hash-bust 2026-06-21T14:07:44.7504132+03:00
// hash-bust 2026-06-21T14:14:23.7665133+03:00
// hash-bust 2026-06-21T14:28:24.0064697+03:00
// hash-bust 2d-4 2026-06-22T10:12:07.3705068+03:00
// hash-bust phase1 2026-06-23T12:29:38.1273700+03:00

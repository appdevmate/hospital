const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, QueryCommand, BatchGetCommand } = require('@aws-sdk/lib-dynamodb');

// Step 3 — PHI decryption for list endpoints. ./crypto.js synced from _shared/.
const { decryptItems, computeHmac, PATIENT_PHI_FIELDS } = require('./crypto');
// Step 2g — per-tenant rate limit. ./throttle.js + ./plan-defaults.js synced from lib/.
const throttle = require('./throttle');

// ─────────────────────────────────────────────────────────────────────────────
// 2026-10-29 rewrite of the list/search path. What changed and why:
//
//   1. NO MORE FULL-TABLE SCANS. The sorted path and the filtered count both
//      Scanned the entire Hospital table (every tenant, every entity type)
//      on every page load. Everything is now a Query on
//      tenant-entityType-index, bounded by this tenant's PATIENT rows.
//
//   2. NAME / DOB / SEARCH FILTERS ACTUALLY WORK. `name` and `dob` are
//      encrypted at rest (PATIENT_PHI_FIELDS), so the old
//      `contains(#name, :v)` FilterExpression ran against ciphertext and
//      never matched. Those filters now run in memory AFTER decryption.
//      Plaintext-safe filters (gender, insurance, status, deletedAt) still
//      run server-side in the Query's FilterExpression.
//
//   3. DOCTOR PATH USES THE JWT. The pre-token Lambda already injects
//      `doctorId`; we read that first and only fall back to an HMAC lookup
//      on emailHash-EntityType-index (the old plaintext-email Scan could not
//      find any doctor created after Step 3).
//
//   4. CORS headers are no longer echoed from Lambda — API Gateway's
//      corsPreflight allow-list is the single source of truth.
//
// Two execution paths remain:
//   FAST  — no sort, no encrypted-field filter: Query with DynamoDB cursor
//           pagination exactly as before (cheapest possible).
//   FULL  — sort requested OR name/dob/search filter: load every matching
//           PATIENT row for the tenant (plaintext filters applied by Dynamo),
//           decrypt in bulk (DEK cache + bounded concurrency in crypto.js),
//           filter + sort in memory, offset-slice. totalCount is exact.
//           Cost is O(tenant patients), not O(table). See docs/45 §7 for the
//           per-tenant-DEK follow-up that will make this O(page).
// ─────────────────────────────────────────────────────────────────────────────

const REGION     = 'us-east-1';
const TABLE_NAME = 'Hospital';
const COUNTER_PK = 'COUNTER#PATIENTS';
const COUNTER_SK = 'TOTAL';
const TENANT_GSI = 'tenant-entityType-index';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

const VALID_OPERATORS     = ['contains', 'startsWith', 'endsWith', 'notContains', 'equals', 'notEquals'];
const ALLOWED_SORT_FIELDS = new Set(['name', 'gender', 'insurance', 'status', 'dob', 'timestamp']);
// Fields that are ciphertext in DynamoDB — must be filtered post-decrypt.
const ENCRYPTED_FILTER_FIELDS = new Set(['name', 'dob']);
// Hard ceiling on rows loaded in the FULL path, as a safety valve.
const FULL_LOAD_MAX_ROWS = 20_000;

// ── Tenant enforcement (Step 2d) ─────────────────────────────────────────────
// Inlined from _shared/tenant.js. Reads tenantId from the signed JWT so a
// client cannot forge it. Every Query is scoped to this tenant via the
// `tenant-entityType-index` GSI — other tenants' rows are never read.
function getTenant(event) {
  const claims = (event && event.requestContext && event.requestContext.authorizer
    && event.requestContext.authorizer.jwt && event.requestContext.authorizer.jwt.claims) || {};
  const tenantId = claims.tenantId || claims['custom:tenantId'];
  if (!tenantId || tenantId === 'UNASSIGNED') {
    const e = new Error('Forbidden: user has no tenant assignment');
    e.statusCode = 403;
    throw e;
  }
  return tenantId;
}

// ── Step C.3 — doctorId resolver ─────────────────────────────────────────────
// Preferred source is the JWT claim. Fallback (legacy users whose token was
// issued before the pre-token fix) is an HMAC lookup, cached 60 s.
const _doctorIdCache = new Map();   // `${tenantId}|${email}` → { id, fetchedAt }
const _DOCTOR_ID_CACHE_MS = 60_000;

async function resolveDoctorId(claims, tenantId) {
    if (claims.doctorId) return String(claims.doctorId);
    const email = (claims.email || claims.username || '').toLowerCase().trim();
    if (!email) return null;
    const cacheKey = `${tenantId}|${email}`;
    const cached = _doctorIdCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < _DOCTOR_ID_CACHE_MS) return cached.id;

    let id = null;
    try {
        const emailHash = await computeHmac(email, tenantId);
        const r = await ddb.send(new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: 'emailHash-EntityType-index',
            KeyConditionExpression: '#eh = :eh AND #et = :et',
            FilterExpression: '#sk = :sk AND #tid = :tid',
            ExpressionAttributeNames:  { '#eh': 'emailHash', '#et': 'EntityType', '#sk': 'SK', '#tid': 'tenantId' },
            ExpressionAttributeValues: { ':eh': emailHash, ':et': 'DOCTOR', ':sk': 'PROFILE', ':tid': tenantId },
            Limit: 5
        }));
        const item = (r.Items || [])[0];
        id = item ? ((item.PK || '').slice('DOCTOR#'.length) || null) : null;
    } catch (_) { id = null; }

    _doctorIdCache.set(cacheKey, { id, fetchedAt: Date.now() });
    return id;
}

exports.handler = async (event) => {
  if (event && event._warmup) return { ok: true, warmed: true };

  // ── Tenant enforcement (Step 2d) ─────────────────────────────────────────
  let tenantId;
  try { tenantId = getTenant(event); }
  catch (e) { return errResp(e.statusCode || 403, e.message); }

  // ── Per-tenant throttle (Step 2g) ────────────────────────────────────────
  const claims = event.requestContext?.authorizer?.jwt?.claims || {};
  const role   = claims.role || 'tenant_user';
  const limitResponse = await throttle.precheck(event, { tenantId, role });
  if (limitResponse) return limitResponse;

  try {
    const qp = event?.queryStringParameters || {};

    // ── Identify caller from JWT token ────────────────────────────────────
    const groups       = claims['cognito:groups'] || '';
    const groupArr     = Array.isArray(groups) ? groups
        : String(groups).trim().replace(/^\[/, '').replace(/\]$/, '').split(/[, ]+/).filter(Boolean);
    const isAdminOrDev = groupArr.some(g => ['Admin', 'Developers'].includes(g.trim()));
    const isDoctor     = groupArr.some(g => g.trim() === 'Doctors');

    // ── DOCTOR PATH — scoped to own patients via DOCTOR_PATIENT items ──────
    if (isDoctor && !isAdminOrDev) {
        const doctorId = await resolveDoctorId(claims, tenantId);
        if (!doctorId) {
            return ok({ message: 'Patients retrieved successfully', data: [], lastKey: null, hasMore: false, count: 0, totalCount: 0, pageSize: 25 });
        }
        // 1. Query relationship items for this doctor
        const relResult = await ddb.send(new QueryCommand({
            TableName:                 TABLE_NAME,
            KeyConditionExpression:    'PK = :pk',
            ExpressionAttributeValues: { ':pk': `DOCTOR#${doctorId}` }
        }));
        const relItems = (relResult.Items || []).filter(i => i.SK?.startsWith('PATIENT#'));
        if (relItems.length === 0) {
            return ok({ message: 'Patients retrieved successfully', data: [], lastKey: null, hasMore: false, count: 0, totalCount: 0, pageSize: 25 });
        }

        // 2. Batch get patient records — DynamoDB limit is 100 per call
        const keys = relItems.map(i => ({
            PK: i.patientId.startsWith('PATIENT#') ? i.patientId : `PATIENT#${i.patientId}`,
            SK: 'PROFILE'
        }));
        const batches = [];
        for (let i = 0; i < keys.length; i += 100) batches.push(keys.slice(i, i + 100));

        const patients = [];
        for (const batch of batches) {
            const batchResult = await ddb.send(new BatchGetCommand({
                RequestItems: { [TABLE_NAME]: { Keys: batch } }
            }));
            const items = batchResult.Responses?.[TABLE_NAME] || [];
            const matched = items
                // Defence-in-depth (Step 2d): drop any patient whose tenantId
                // doesn't match the caller's, even if a link row leaked.
                .filter(p => p.tenantId === tenantId)
                .filter(p => !isDeleted(p));
            await decryptItems(matched, PATIENT_PHI_FIELDS, tenantId);
            matched.forEach(p => patients.push(normalizePatient(p)));
        }

        patients.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        return ok({
            message:    'Patients retrieved successfully',
            data:       patients,
            lastKey:    null,
            hasMore:    false,
            count:      patients.length,
            totalCount: patients.length,
            pageSize:   patients.length
        });
    }

    // ── ADMIN / DEFAULT PATH ──────────────────────────────────────────────
    const pageSize  = clampInt(qp.pageSize, 25, 1, 100);
    const offset    = clampInt(qp.offset, 0, 0, 1_000_000);
    const sortField = sanitizeSortField(qp.sortField);
    const sortOrder = parseInt(qp.sortOrder, 10) === -1 ? -1 : 1;
    const filters   = parseFilterParameters(qp);

    const needsFullLoad = !!sortField || hasEncryptedFieldFilter(filters);

    if (!needsFullLoad) {
        // FAST path — Dynamo cursor pagination over the tenant GSI.
        const { dynamoStartKey } = parseLastKey(qp.lastKey, tenantId);
        const { filterExpression, names, values } = buildPlaintextFilter(filters);
        const result = await queryPage(tenantId, filterExpression, names, values, pageSize, dynamoStartKey, offset);
        const totalCount = await countPlaintext(tenantId, filters, filterExpression, names, values);
        return ok({
            message:    'Patients retrieved successfully',
            data:       result.patients,
            lastKey:    result.nextKey,
            hasMore:    result.hasMore,
            count:      result.patients.length,
            totalCount,
            pageSize
        });
    }

    // FULL path — load, decrypt, filter, sort, slice.
    const { filterExpression, names, values } = buildPlaintextFilter(filters);
    const all = await loadAllTenantPatients(tenantId, filterExpression, names, values);
    const filtered = applyEncryptedFilters(all, filters);
    const sorted   = sortField ? sortArray(filtered, sortField, sortOrder) : filtered;

    // Offset may arrive either as ?offset=N or inside lastKey as {offset:N}.
    const { cursorOffset } = parseLastKey(qp.lastKey, tenantId);
    const start = cursorOffset != null ? cursorOffset : offset;
    const page  = sorted.slice(start, start + pageSize);
    const hasMore = start + pageSize < sorted.length;

    return ok({
        message:    'Patients retrieved successfully',
        data:       page,
        lastKey:    hasMore ? encodeURIComponent(JSON.stringify({ offset: start + pageSize })) : null,
        hasMore,
        count:      page.length,
        totalCount: sorted.length,
        pageSize
    });

  } catch (err) {
    console.error('getAllPatients error', { message: err?.message, name: err?.name });
    return errResp(500, 'Internal Server Error');
  }
};

/* ---------------------------- parsing helpers ---------------------------- */
// Accepts three cursor shapes:
//   { PK, SK }                       — legacy table-key cursor
//   { dynamo: {...}, cursor: {...} } — legacy sorted cursor (we ignore `cursor`
//                                      and treat it as an offset-less restart)
//   { offset: N }                    — new FULL-path cursor
// A legacy table-key cursor is upgraded with the GSI keys so it can be used
// as ExclusiveStartKey on tenant-entityType-index.
function parseLastKey(raw, tenantId) {
    if (!raw) return { dynamoStartKey: undefined, cursorOffset: null };
    try {
        const obj = JSON.parse(decodeURIComponent(raw));
        if (obj && typeof obj.offset === 'number') return { dynamoStartKey: undefined, cursorOffset: Math.max(0, obj.offset) };
        const key = obj && obj.dynamo ? obj.dynamo : obj;
        if (key && key.PK && key.SK) {
            return { dynamoStartKey: { PK: key.PK, SK: key.SK, tenantId, EntityType: 'PATIENT' }, cursorOffset: null };
        }
        return { dynamoStartKey: undefined, cursorOffset: null };
    } catch {
        return { dynamoStartKey: undefined, cursorOffset: null };
    }
}

function sanitizeSortField(field) {
    const f = (field || '').trim();
    return ALLOWED_SORT_FIELDS.has(f) ? f : null;
}

function parseFilterParameters(qp) {
    const filters = { search: null, name: null, gender: null, insurance: null, status: null, dobFrom: null, dobTo: null, showDeleted: false };
    for (const key of Object.keys(qp)) {
        let value = typeof qp[key] === 'string' ? qp[key].trim() : qp[key];
        if (!value) continue;
        if (key === 'showDeleted') { filters.showDeleted = value === 'true'; continue; }
        if (key === 'doctorEmail') continue; // handled separately
        if (typeof value === 'string') value = value.toLowerCase();
        if (key === 'dobFrom') { filters.dobFrom = value; continue; }
        if (key === 'dobTo')   { filters.dobTo   = value; continue; }
        const parts = key.split('.');
        if (parts.length === 2) {
            const [field, operator] = parts;
            if (['search', 'name', 'gender', 'insurance', 'status'].includes(field)) {
                const op = VALID_OPERATORS.includes(operator) ? operator : 'contains';
                let v = value;
                if (typeof v === 'string' && v.includes(',')) {
                    v = v.split(',').map(s => s.trim().replace(/^['"]+|['"]+$/g, '')).filter(Boolean);
                }
                if (Array.isArray(v) && !['equals', 'notEquals'].includes(op)) v = v.join(',');
                filters[field] = { value: v, operator: op };
            }
            continue;
        }
        if (['search', 'name', 'gender', 'insurance', 'status'].includes(key)) {
            filters[key] = { value, operator: 'contains' };
        }
    }
    return filters;
}

function hasEncryptedFieldFilter(filters) {
    // `search` spans name (encrypted) so it always needs the FULL path.
    return !!(filters.name || filters.dobFrom || filters.dobTo || filters.search);
}

/* ------------------------- server-side filter build ------------------------ */
function buildFilterCondition(fieldName, filter, names, values, vKey) {
    if (!filter || filter.value == null || filter.value === '') return null;
    const nameKey = `#${fieldName}`; names[nameKey] = fieldName;
    const op = filter.operator || 'contains';
    if (Array.isArray(filter.value)) {
        if (op === 'equals') {
            const ks = filter.value.map((val, i) => { const k = `:${vKey}${i}`; values[k] = val; return k; });
            return `${nameKey} IN (${ks.join(', ')})`;
        }
        if (op === 'notEquals') {
            const parts = filter.value.map((val, i) => { const k = `:${vKey}${i}`; values[k] = val; return `${nameKey} <> ${k}`; });
            return parts.join(' AND ');
        }
    }
    const valueKey = `:${vKey}`; values[valueKey] = filter.value;
    switch (op) {
        case 'equals':      return `${nameKey} = ${valueKey}`;
        case 'notEquals':   return `${nameKey} <> ${valueKey}`;
        case 'contains':    return `contains(${nameKey}, ${valueKey})`;
        case 'notContains': return `NOT contains(${nameKey}, ${valueKey})`;
        case 'startsWith':  return `begins_with(${nameKey}, ${valueKey})`;
        case 'endsWith':    return `contains(${nameKey}, ${valueKey})`;
        default:            return `contains(${nameKey}, ${valueKey})`;
    }
}

// Only PLAINTEXT fields go to DynamoDB. The GSI key condition already pins
// tenantId + EntityType=PATIENT, so we do not repeat those (DynamoDB rejects
// key attributes inside a Query FilterExpression).
function buildPlaintextFilter(filters) {
    const conditions = [];
    const names  = { '#pk': 'PK', '#sk': 'SK' };
    const values = { ':pfx': 'PATIENT#', ':sk': 'PROFILE' };
    conditions.push('begins_with(#pk, :pfx) AND #sk = :sk');

    names['#deletedAt'] = 'deletedAt';
    values[':nullType']    = 'NULL';
    values[':empty']       = '';
    values[':emptyMarker'] = '<empty>';
    values[':nullStr']     = 'null';
    if (filters.showDeleted) {
        conditions.push('(attribute_exists(#deletedAt) AND NOT attribute_type(#deletedAt, :nullType) AND #deletedAt <> :empty AND #deletedAt <> :emptyMarker AND #deletedAt <> :nullStr)');
    } else {
        conditions.push('(attribute_not_exists(#deletedAt) OR attribute_type(#deletedAt, :nullType) OR #deletedAt = :empty OR #deletedAt = :emptyMarker OR #deletedAt = :nullStr)');
    }

    const fGender = buildFilterCondition('gender',    filters.gender,    names, values, 'genderF'); if (fGender) conditions.push(fGender);
    const fIns    = buildFilterCondition('insurance', filters.insurance, names, values, 'insF');    if (fIns)    conditions.push(fIns);
    const fStatus = buildFilterCondition('status',    filters.status,    names, values, 'statusF'); if (fStatus) conditions.push(fStatus);

    return { filterExpression: conditions.join(' AND '), names, values };
}

/* ------------------------- in-memory (post-decrypt) filters ---------------- */
function matchText(haystack, filter) {
    if (!filter || filter.value == null || filter.value === '') return true;
    const h  = (haystack ?? '').toString().toLowerCase();
    const op = filter.operator || 'contains';
    const vals = Array.isArray(filter.value) ? filter.value.map(v => String(v).toLowerCase()) : [String(filter.value).toLowerCase()];
    switch (op) {
        case 'equals':      return vals.includes(h);
        case 'notEquals':   return !vals.includes(h);
        case 'startsWith':  return vals.some(v => h.startsWith(v));
        case 'endsWith':    return vals.some(v => h.endsWith(v));
        case 'notContains': return !vals.some(v => h.includes(v));
        case 'contains':
        default:            return vals.some(v => h.includes(v));
    }
}

function applyEncryptedFilters(items, filters) {
    return items.filter(p => {
        if (filters.name && !matchText(p.name, filters.name)) return false;
        if (filters.dobFrom && !(p.dob && p.dob >= filters.dobFrom)) return false;
        if (filters.dobTo   && !(p.dob && p.dob <= filters.dobTo))   return false;
        if (filters.search) {
            const hit = ['name', 'gender', 'insurance', 'status'].some(f => matchText(p[f], filters.search));
            if (!hit) return false;
        }
        return true;
    });
}

/* ------------------------------ query paths ------------------------------ */
async function queryPage(tenantId, filterExpression, names, values, pageSize, startKey, offset = 0) {
    const patients = []; let currentLastKey = startKey; let lastPatientKey = null; let skipped = 0;
    const maxIterations = 50; let iterations = 0;

    while (patients.length < pageSize && iterations++ < maxIterations) {
        const params = {
            TableName: TABLE_NAME,
            IndexName: TENANT_GSI,
            KeyConditionExpression: '#tid = :tid AND #et = :et',
            FilterExpression: filterExpression,
            Limit: Math.max(pageSize * 3, 50),
            ExpressionAttributeNames:  { ...names, '#tid': 'tenantId', '#et': 'EntityType' },
            ExpressionAttributeValues: { ...values, ':tid': tenantId, ':et': 'PATIENT' }
        };
        if (currentLastKey) params.ExclusiveStartKey = currentLastKey;

        const res = await ddb.send(new QueryCommand(params));
        const items = res.Items || [];

        await decryptItems(items, PATIENT_PHI_FIELDS, tenantId);

        for (const it of items) {
            if (startKey == null && offset > 0 && skipped < offset) { skipped++; continue; }
            patients.push(normalizePatient(it));
            lastPatientKey = { PK: it.PK, SK: it.SK };
            if (patients.length >= pageSize) break;
        }
        currentLastKey = res.LastEvaluatedKey;
        if (!currentLastKey) break;
    }

    const hasMore = !!currentLastKey;
    const nextKey = hasMore && lastPatientKey ? encodeURIComponent(JSON.stringify(lastPatientKey)) : null;
    return { patients, hasMore, nextKey };
}

async function loadAllTenantPatients(tenantId, filterExpression, names, values) {
    const rows = []; let lastKey;
    do {
        const params = {
            TableName: TABLE_NAME,
            IndexName: TENANT_GSI,
            KeyConditionExpression: '#tid = :tid AND #et = :et',
            FilterExpression: filterExpression,
            ExpressionAttributeNames:  { ...names, '#tid': 'tenantId', '#et': 'EntityType' },
            ExpressionAttributeValues: { ...values, ':tid': tenantId, ':et': 'PATIENT' }
        };
        if (lastKey) params.ExclusiveStartKey = lastKey;
        const res = await ddb.send(new QueryCommand(params));
        for (const it of (res.Items || [])) rows.push(it);
        lastKey = res.LastEvaluatedKey;
    } while (lastKey && rows.length < FULL_LOAD_MAX_ROWS);

    await decryptItems(rows, PATIENT_PHI_FIELDS, tenantId);
    return rows.map(normalizePatient);
}

/* --------------------------------- count --------------------------------- */
async function countPlaintext(tenantId, filters, filterExpression, names, values) {
    const hasPlaintextFilters = filters.gender || filters.insurance || filters.status || filters.showDeleted;
    if (!hasPlaintextFilters) return await getTotalPatients(tenantId);

    let count = 0, lastKey;
    do {
        const params = {
            TableName: TABLE_NAME,
            IndexName: TENANT_GSI,
            KeyConditionExpression: '#tid = :tid AND #et = :et',
            FilterExpression: filterExpression,
            Select: 'COUNT',
            ExpressionAttributeNames:  { ...names, '#tid': 'tenantId', '#et': 'EntityType' },
            ExpressionAttributeValues: { ...values, ':tid': tenantId, ':et': 'PATIENT' }
        };
        if (lastKey) params.ExclusiveStartKey = lastKey;
        const res = await ddb.send(new QueryCommand(params));
        count += res.Count || 0;
        lastKey = res.LastEvaluatedKey;
    } while (lastKey);
    return count;
}

// Per-tenant counter (Step 2d). New layout: COUNTER#PATIENTS#<tenantId>.
async function getTotalPatients(tenantId) {
    try {
        const res = await ddb.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `${COUNTER_PK}#${tenantId}`, SK: COUNTER_SK },
            ProjectionExpression: '#t',
            ExpressionAttributeNames: { '#t': 'total' }
        }));
        return res.Item?.total ?? 0;
    } catch { return 0; }
}

/* ----------------------------- sort utilities ---------------------------- */
function sortArray(arr, field, order) { const o = order === -1 ? -1 : 1; return arr.slice().sort((a, b) => compareByField(a, b, field, o)); }
function compareByField(a, b, field, order) {
    const av = sortValueOf(a, field), bv = sortValueOf(b, field);
    const aU = av === undefined || av === null || Number.isNaN(av);
    const bU = bv === undefined || bv === null || Number.isNaN(bv);
    if (aU && bU) return tie(a, b, order);
    if (aU) return order;
    if (bU) return -order;
    if (av < bv) return -order;
    if (av > bv) return order;
    return tie(a, b, order);
}
function sortValueOf(item, field) {
    const v = item?.[field];
    if (field === 'dob' || field === 'timestamp') { const t = v ? new Date(v).getTime() : NaN; return Number.isFinite(t) ? t : NaN; }
    return (v ?? '').toString().toLowerCase();
}
function tie(a, b, order) { if (a.PK < b.PK) return -order; if (a.PK > b.PK) return order; return 0; }

/* --------------------------------- misc ---------------------------------- */
function isDeleted(p) {
    return !!(p.deletedAt && p.deletedAt !== '' && p.deletedAt !== 'null' && p.deletedAt !== '<empty>');
}

function normalizePatient(it) {
    return {
        PK:             it.PK,
        SK:             it.SK,
        name:           it.name           || '',
        email:          it.email          || '',
        gender:         it.gender         || '',
        insurance:      it.insurance      || '',
        department:     it.department     || '',
        specialization: it.specialization || '',
        phone:          it.phone          || '',
        qid:            it.qid            || '',
        dob:            it.dob            || '',
        admissionDate:  it.admissionDate  || '',
        status:         it.status         || '',
        notes:          it.notes          || '',
        medicalHistory: it.medicalHistory || '',
        allergies:      it.allergies      || '',
        medications:    it.medications    || '',
        bloodGroup:     it.bloodGroup     || '',
        bedNumber:      it.bedNumber      || '',
        ward:           it.ward           || '',
        timestamp:      it.timestamp      || it.createdAt || '',
        deletedAt:      it.deletedAt      || null,
    };
}

function clampInt(val, def, min, max) { const n = parseInt(val, 10); return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : def; }

// CORS headers intentionally omitted — API Gateway corsPreflight injects the
// matching Access-Control-Allow-Origin for allow-listed origins.
function ok(body) {
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    };
}

function errResp(status, message) {
    return {
        statusCode: status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
    };
}
// hash-bust 2026-10-29

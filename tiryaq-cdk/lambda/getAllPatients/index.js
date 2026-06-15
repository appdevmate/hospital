const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetCommand, QueryCommand, BatchGetCommand } = require('@aws-sdk/lib-dynamodb');

// Step 3 — PHI decryption for list endpoints. ./crypto.js synced from _shared/.
const { decryptItem, decryptItems, PATIENT_PHI_FIELDS } = require('./crypto');

const REGION     = 'us-east-1';
const TABLE_NAME = 'Hospital';
const COUNTER_PK = 'COUNTER#PATIENTS';
const COUNTER_SK = 'TOTAL';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

const VALID_OPERATORS    = ['contains', 'startsWith', 'endsWith', 'notContains', 'equals', 'notEquals'];
const ALLOWED_SORT_FIELDS = new Set(['name', 'gender', 'insurance', 'status', 'dob', 'timestamp']);

// ── Tenant enforcement (Step 2d) ─────────────────────────────────────────────
// Inlined from _shared/tenant.js. Reads tenantId from the signed JWT so a
// client cannot forge it. Every Query is scoped to this tenant via the
// `tenant-entityType-index` GSI — other tenants' rows are never read.
function getTenant(event) {
  const claims = (event && event.requestContext && event.requestContext.authorizer
                  && (event.requestContext.authorizer.jwt
                      ? event.requestContext.authorizer.jwt.claims
                      : event.requestContext.authorizer.claims))
              || {};
  const tenantId = claims.tenantId || claims['custom:tenantId'];
  if (!tenantId || tenantId === 'UNASSIGNED') {
    const err = new Error('Tenant not assigned for this user');
    err.statusCode = 403;
    throw err;
  }
  return tenantId;
}

exports.handler = async (event) => {
  if (event && event._warmup) return { ok: true, warmed: true };

  // ── Tenant enforcement (Step 2d) ─────────────────────────────────────────
  let tenantId;
  try { tenantId = getTenant(event); }
  catch (e) { return errResp(e.statusCode || 403, e.message); }

  try {
    const qp = event?.queryStringParameters || {};

    // ── Identify caller from JWT token ────────────────────────────────────
    const claims       = event.requestContext?.authorizer?.jwt?.claims || {};
    const groups       = claims['cognito:groups'] || '';
    const groupArr     = Array.isArray(groups) ? groups
        : String(groups).trim().replace(/^\[/, '').replace(/\]$/, '').split(/[, ]+/).filter(Boolean);
    const isAdminOrDev = groupArr.some(g => ['Admin', 'Developers'].includes(g.trim()));
    const isDoctor     = groupArr.some(g => g.trim() === 'Doctors');
    const callerEmail  = (claims['email'] || claims['username'] || '').toLowerCase().trim();
    // ── DOCTOR PATH — scoped to own patients via DOCTOR_PATIENT items ──────
    if (isDoctor && !isAdminOrDev && callerEmail) {
        const doctorEmail = callerEmail;
            // 1. Query relationship items for this doctor
            const relResult = await ddb.send(new QueryCommand({
                TableName:                 TABLE_NAME,
                KeyConditionExpression:    'PK = :pk',
                ExpressionAttributeValues: { ':pk': `DOCTOR#${doctorEmail}` }
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
                    // Defence-in-depth (Step 2d): even if a doctor↔patient
                    // relationship row leaked across tenants, drop any
                    // patient whose tenantId doesn't match the caller's.
                    .filter(p => p.tenantId === tenantId)
                    // Filter out soft-deleted patients
                    .filter(p => !p.deletedAt || p.deletedAt === '' || p.deletedAt === 'null' || p.deletedAt === '<empty>');
                // Step 3 — bulk-decrypt PHI for the matched page in parallel.
                await decryptItems(matched, PATIENT_PHI_FIELDS, tenantId);
                matched.forEach(p => patients.push(normalizePatient(p)));
            }

            patients.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            return ok({
                message:     'Patients retrieved successfully',
                data:        patients,
                lastKey:     null,
                hasMore:     false,
                count:       patients.length,
                totalCount:  patients.length,
                pageSize:    patients.length
            });
        }

        // ── ADMIN / DEFAULT PATH — full paginated scan ────────────────────────
        const pageSize  = clampInt(qp.pageSize, 25, 1, 100);
        const offset    = clampInt(qp.offset, 0, 0, 1_000_000);
        const sortField = sanitizeSortField(qp.sortField);
        const sortOrder = parseInt(qp.sortOrder, 10) === -1 ? -1 : 1;

        const { dynamoStartKey, cursor } = parseLastKey(qp.lastKey);
        const filters = parseFilterParameters(qp);
        const { filterExpression, expressionAttributeNames, expressionAttributeValues } = buildFilterExpression(filters);

        const result = !sortField
            ? await scanUnsorted(filterExpression, expressionAttributeNames, expressionAttributeValues, pageSize, dynamoStartKey, offset, tenantId)
            : await scanSorted(filterExpression, expressionAttributeNames, expressionAttributeValues, pageSize, dynamoStartKey, sortField, sortOrder, cursor, offset, tenantId);

        const totalCount = await getFilteredCount(filters, tenantId);

        return ok({
            message:    'Patients retrieved successfully',
            data:       result.patients,
            lastKey:    result.nextKey,
            hasMore:    result.hasMore,
            count:      result.patients.length,
            totalCount,
            pageSize
        });

    } catch (err) {
        return errResp(500, err?.message || 'Internal Server Error');
    }
};

/* ---------------------------- parsing helpers ---------------------------- */
function parseLastKey(raw) {
    if (!raw) return { dynamoStartKey: undefined, cursor: null };
    try {
        const obj = JSON.parse(decodeURIComponent(raw));
        if (obj && obj.PK && obj.SK) return { dynamoStartKey: obj, cursor: null };
        if (obj && ('dynamo' in obj || 'cursor' in obj)) return { dynamoStartKey: obj.dynamo || undefined, cursor: obj.cursor || null };
        return { dynamoStartKey: obj, cursor: null };
    } catch {
        return { dynamoStartKey: undefined, cursor: null };
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

/* ------------------------- filter-expression build ------------------------- */
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

function buildFilterExpression(filters) {
    const conditions = [];
    const names  = { '#pk': 'PK', '#sk': 'SK', '#entityType': 'EntityType' };
    const values = { ':pfx': 'PATIENT#', ':sk': 'PROFILE', ':entityType': 'PATIENT' };
    conditions.push('begins_with(#pk, :pfx) AND #sk = :sk AND #entityType = :entityType');

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

    if (filters.search) {
        const ors = [];
        ['name', 'gender', 'insurance', 'status'].forEach((f, i) => {
            const c = buildFilterCondition(f, filters.search, names, values, `search${i}`);
            if (c) ors.push(c);
        });
        if (ors.length) conditions.push(`(${ors.join(' OR ')})`);
    }

    const fName   = buildFilterCondition('name',      filters.name,      names, values, 'nameF');   if (fName)   conditions.push(fName);
    const fGender = buildFilterCondition('gender',    filters.gender,    names, values, 'genderF'); if (fGender) conditions.push(fGender);
    const fIns    = buildFilterCondition('insurance', filters.insurance, names, values, 'insF');    if (fIns)    conditions.push(fIns);
    const fStatus = buildFilterCondition('status',    filters.status,    names, values, 'statusF'); if (fStatus) conditions.push(fStatus);

    if (filters.dobFrom) { names['#dob'] = 'dob'; values[':dobFrom'] = filters.dobFrom; conditions.push('#dob >= :dobFrom'); }
    if (filters.dobTo)   { names['#dob'] = 'dob'; values[':dobTo']   = filters.dobTo;   conditions.push('#dob <= :dobTo'); }

    return { filterExpression: conditions.join(' AND '), expressionAttributeNames: names, expressionAttributeValues: values };
}

/* ------------------------------ scan paths ------------------------------ */
async function scanUnsorted(filterExpression, names, values, pageSize, startKey, offset = 0, tenantId) {
    // Step 2d: Query the per-tenant GSI `tenant-entityType-index` so the
    // Lambda physically never reads another tenant's rows. The legacy
    // builder may still include `#entityType = :patientType` — that
    // references the index's sort key, which DynamoDB rejects in a
    // FilterExpression on a Query; strip it (and its value) before
    // sending. Same for any stray `tenantId` predicate the builder may
    // grow in the future.
    const cleanFilter = (filterExpression || '')
        .replace(/\s*AND\s*#entityType\s*=\s*:[a-zA-Z]+\s*/i, ' ')
        .replace(/^\s*#entityType\s*=\s*:[a-zA-Z]+\s*AND\s*/i, '')
        .trim();
    const cleanValues = { ...(values || {}) };
    delete cleanValues[':entityType'];
    delete cleanValues[':patientType'];
    const cleanNames = { ...(names || {}) };
    if (!cleanFilter.includes('#entityType')) delete cleanNames['#entityType'];

    const patients = []; let currentLastKey = startKey; let lastPatientKey = null; let skipped = 0;
    const maxIterations = 50; let iterations = 0;

    while (patients.length < pageSize && iterations++ < maxIterations) {
        const params = {
            TableName: TABLE_NAME,
            IndexName: 'tenant-entityType-index',
            KeyConditionExpression: 'tenantId = :tid AND EntityType = :et',
            Limit: Math.max(pageSize * 3, 50),
            ExpressionAttributeValues: { ...cleanValues, ':tid': tenantId, ':et': 'PATIENT' }
        };
        if (Object.keys(cleanNames).length) params.ExpressionAttributeNames = cleanNames;
        if (cleanFilter) params.FilterExpression = cleanFilter;
        if (currentLastKey) params.ExclusiveStartKey = currentLastKey;

        const res = await ddb.send(new QueryCommand(params));
        const items = res.Items || [];

        // Step 3 — decrypt the page once; cheaper than per-item awaits in the loop.
        await decryptItems(
            items.filter(it => it.PK?.startsWith('PATIENT#') && it.SK === 'PROFILE'),
            PATIENT_PHI_FIELDS,
            tenantId
        );

        for (const it of items) {
            if (it.PK?.startsWith('PATIENT#') && it.SK === 'PROFILE') {
                if (startKey == null && offset > 0 && skipped < offset) { skipped++; continue; }
                patients.push(normalizePatient(it));
                lastPatientKey = { PK: it.PK, SK: it.SK };
                if (patients.length >= pageSize) break;
            }
        }
        currentLastKey = res.LastEvaluatedKey;
        if (!currentLastKey) break;
    }

    const hasMore = !!currentLastKey;
    const nextKey = hasMore && lastPatientKey ? encodeURIComponent(JSON.stringify(lastPatientKey)) : null;
    return { patients, hasMore, nextKey };
}

async function scanSorted(filterExpression, names, values, pageSize, startKey, sortField, sortOrder, cursor, offset = 0, tenantId) {
    const buffer = []; let currentLastKey = startKey;
    const maxIterations = 50; let iterations = 0;

    // Step 2d — sort path uses a raw Scan, so we add `tenantId = :tid` to
    // the FilterExpression. Defence-in-depth: even if the filter were
    // ever broken, the post-Scan loop below also drops any item whose
    // tenantId doesn't match.
    const tenantPredicate = '#__tid = :__tid';
    const augmentedNames  = { ...(names || {}), '#__tid': 'tenantId' };
    const augmentedValues = { ...(values || {}), ':__tid': tenantId };
    const augmentedFilter = filterExpression
        ? `${filterExpression} AND ${tenantPredicate}`
        : tenantPredicate;

    while (iterations++ < maxIterations) {
        const batchSize = Math.max(pageSize * 3, 50);
        const params = { TableName: TABLE_NAME, Limit: batchSize, FilterExpression: augmentedFilter, ExpressionAttributeNames: augmentedNames, ExpressionAttributeValues: augmentedValues };
        if (currentLastKey) params.ExclusiveStartKey = currentLastKey;

        const res = await ddb.send(new ScanCommand(params));
        const items = res.Items || [];
        currentLastKey = res.LastEvaluatedKey;

        // Step 3 — decrypt matching patient rows on this page before normalize.
        const matched = items.filter(it =>
            it.PK?.startsWith('PATIENT#') && it.SK === 'PROFILE'
            && it.EntityType === 'PATIENT' && it.tenantId === tenantId
        );
        await decryptItems(matched, PATIENT_PHI_FIELDS, tenantId);
        for (const it of matched) {
            buffer.push(normalizePatient(it));
        }

        let eligible = sortArray(buffer, sortField, sortOrder);
        eligible = afterCursor(eligible, cursor, sortField, sortOrder);
        if (!cursor && startKey == null && offset > 0 && eligible.length > offset) eligible = eligible.slice(offset);

        if (eligible.length >= pageSize) {
            const page = eligible.slice(0, pageSize);
            const last = page[page.length - 1];
            const nextKeyObj = { dynamo: currentLastKey || null, cursor: { sortField, sortOrder, sortValue: sortValueOf(last, sortField), pk: last.PK, sk: last.SK } };
            return { patients: page, hasMore: true, nextKey: encodeURIComponent(JSON.stringify(nextKeyObj)) };
        }
        if (!currentLastKey) break;
    }

    let eligible = sortArray(buffer, sortField, sortOrder);
    eligible = afterCursor(eligible, cursor, sortField, sortOrder);
    if (!cursor && startKey == null && offset > 0 && eligible.length > offset) eligible = eligible.slice(offset);

    const page = eligible.slice(0, pageSize);
    const last = page[page.length - 1] || null;
    const nextKeyObj = last ? { dynamo: null, cursor: { sortField, sortOrder, sortValue: sortValueOf(last, sortField), pk: last.PK, sk: last.SK } } : null;
    return { patients: page, hasMore: !!nextKeyObj, nextKey: nextKeyObj ? encodeURIComponent(JSON.stringify(nextKeyObj)) : null };
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
function afterCursor(sorted, cursor, field, order) {
    if (!cursor || cursor.sortField !== field || cursor.sortOrder !== order) return sorted;
    const curVal = cursor.sortValue, curPk = cursor.pk;
    return sorted.filter(item => {
        const v = sortValueOf(item, field);
        if (v === curVal) return item.PK > curPk;
        return order === 1 ? v > curVal : v < curVal;
    });
}

/* --------------------------------- count --------------------------------- */
async function getFilteredCount(filters, tenantId) {
    const hasFilters = filters.search || filters.name || filters.gender || filters.insurance || filters.status || filters.dobFrom || filters.dobTo || filters.showDeleted;
    if (!hasFilters) return await getTotalPatients(tenantId);

    const { filterExpression, expressionAttributeNames, expressionAttributeValues } = buildFilterExpression(filters);
    // Add tenant filter for count — same defence-in-depth as scanSorted.
    const augmentedFilter = `${filterExpression} AND #__tid = :__tid`;
    const augmentedNames  = { ...expressionAttributeNames, '#__tid': 'tenantId' };
    const augmentedValues = { ...expressionAttributeValues, ':__tid': tenantId };
    let count = 0, lastEvaluatedKey;
    do {
        const params = { TableName: TABLE_NAME, Select: 'COUNT', FilterExpression: augmentedFilter, ExpressionAttributeNames: augmentedNames, ExpressionAttributeValues: augmentedValues };
        if (lastEvaluatedKey) params.ExclusiveStartKey = lastEvaluatedKey;
        const res = await ddb.send(new ScanCommand(params));
        count += res.Count || 0;
        lastEvaluatedKey = res.LastEvaluatedKey;
    } while (lastEvaluatedKey);
    return count;
}

// Per-tenant counter (Step 2d). New layout: COUNTER#PATIENTS#<tenantId>.
// Legacy COUNTER#PATIENTS row is still there but no longer incremented.
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

/* --------------------------------- misc ---------------------------------- */
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

function ok(body) {
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET,OPTIONS' },
        body: JSON.stringify(body)
    };
}

function errResp(status, message) {
    return {
        statusCode: status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ message })
    };
}
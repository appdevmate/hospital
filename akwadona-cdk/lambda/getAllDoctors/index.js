// Step 2g — per-tenant rate limit. ./throttle.js + ./plan-defaults.js synced from lib/.
const throttle = require('./throttle');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

// Step 3 — PHI envelope decryption. ./crypto.js synced from _shared/.
const { decryptItem, decryptItems, DOCTOR_PHI_FIELDS } = require('./crypto');

// ─────────────────────────────────────────────────────────────────────────────
// 2026-10-29 rewrite — mirrors getAllPatients. See that file's header for the
// full rationale. Summary:
//   • No full-table Scans. Sorted path + filtered count were Scanning the
//     whole Hospital table; everything is now a Query on
//     tenant-entityType-index bounded to this tenant's DOCTOR rows.
//   • Filters on encrypted fields (name, email, dob, notes, education —
//     see DOCTOR_PHI_FIELDS) ran against ciphertext and never matched.
//     They now run in memory after decryption. Plaintext filters
//     (gender, insurance, status, department, specialization, experience*,
//     duty*, bloodGroup, hiringDate) stay server-side.
//   • The ~550-line commented-out legacy implementation that preceded this
//     code has been removed; it is in git history (pre-2026-10-29).
//   • No CORS headers from Lambda — API Gateway owns that.
// ─────────────────────────────────────────────────────────────────────────────

const REGION     = 'us-east-1';
const TABLE_NAME = 'Hospital';
const TENANT_GSI = 'tenant-entityType-index';
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

const VALID_OPERATORS = ['contains', 'startsWith', 'endsWith', 'notContains', 'equals', 'notEquals'];
const ALLOWED_SORT_FIELDS = new Set([
  'name','gender','insurance','department','specialization','status','dob',
  'hiringDate','timestamp','experienceYears','experienceMonths','education',
  'dutyDays','dutyStart','dutyEnd','notes','bloodGroup'
]);
// Filterable fields that are ciphertext at rest (subset of DOCTOR_PHI_FIELDS).
const ENCRYPTED_FILTERABLE = new Set(['name', 'email', 'notes', 'education']);
const PLAINTEXT_FILTERABLE = ['gender','insurance','status','department','specialization',
  'experienceYears','experienceMonths','dutyDays','dutyStart','dutyEnd','bloodGroup'];
const SEARCH_FIELDS = ['name','gender','insurance','status','department','specialization','email',
  'experienceYears','experienceMonths','notes','education','dutyDays','dutyStart','dutyEnd','bloodGroup'];
const FULL_LOAD_MAX_ROWS = 20_000;

// ── Tenant enforcement (Step 2d) ─────────────────────────────────────────────
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

exports.handler = async (event) => {
  if (event && event._warmup) return { ok: true, warmed: true };

  let tenantId;
  try { tenantId = getTenant(event); }
  catch (e) { return errResp(e.statusCode || 403, e.message); }

  // Step 2g — per-tenant throttle.
  {
    const __role = (event.requestContext?.authorizer?.jwt?.claims || {}).role || 'tenant_user';
    const __limitResponse = await throttle.precheck(event, { tenantId, role: __role });
    if (__limitResponse) return __limitResponse;
  }

  try {
    const doctorID = event?.pathParameters?.doctorID;
    if (doctorID) {
      const single = await getDoctorById(doctorID, tenantId);
      if (!single) return errResp(404, 'Doctor not found');
      return ok({ message: 'Doctor retrieved successfully', data: single });
    }

    const qp        = event?.queryStringParameters || {};
    const pageSize  = clampInt(qp.pageSize, 25, 1, 100);
    const offset    = clampInt(qp.offset, 0, 0, 1_000_000);
    const sortField = sanitizeSortField(qp.sortField);
    const sortOrder = parseInt(qp.sortOrder, 10) === -1 ? -1 : 1;
    const filters   = parseFilterParameters(qp);

    const needsFullLoad = !!sortField || hasEncryptedFieldFilter(filters);
    const { filterExpression, names, values } = buildPlaintextFilter(filters);

    if (!needsFullLoad) {
      const { dynamoStartKey } = parseLastKey(qp.lastKey, tenantId);
      const result = await queryPage(tenantId, filterExpression, names, values, pageSize, dynamoStartKey, offset);
      const totalCount = await countPlaintext(tenantId, filters, filterExpression, names, values);
      return ok({
        message: 'Doctors retrieved successfully',
        data: result.doctors,
        lastKey: result.nextKey,
        hasMore: result.hasMore,
        count: result.doctors.length,
        totalCount,
        pageSize
      });
    }

    const all      = await loadAllTenantDoctors(tenantId, filterExpression, names, values);
    const filtered = applyEncryptedFilters(all, filters);
    const sorted   = sortField ? sortArray(filtered, sortField, sortOrder) : filtered;
    const { cursorOffset } = parseLastKey(qp.lastKey, tenantId);
    const start   = cursorOffset != null ? cursorOffset : offset;
    const page    = sorted.slice(start, start + pageSize);
    const hasMore = start + pageSize < sorted.length;

    return ok({
      message: 'Doctors retrieved successfully',
      data: page,
      lastKey: hasMore ? encodeURIComponent(JSON.stringify({ offset: start + pageSize })) : null,
      hasMore,
      count: page.length,
      totalCount: sorted.length,
      pageSize
    });
  } catch (err) {
    console.error('getAllDoctors error', { message: err?.message, name: err?.name });
    return errResp(500, 'Internal Server Error');
  }
};

/* ---------------------------- single by id ---------------------------- */
async function getDoctorById(doctorPK, tenantId) {
  const res = await ddb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: doctorPK, SK: 'PROFILE' }
  }));
  const it = res.Item;
  if (!it) return null;
  // Step 2d — return null (treated as 404) if the row belongs to another tenant.
  if (it.tenantId !== tenantId) return null;
  if (isDeleted(it)) return null;
  await decryptItem(it, DOCTOR_PHI_FIELDS, tenantId);
  return normalizeDoctor(it);
}

/* ---------------------------- parsing helpers ---------------------------- */
function parseLastKey(raw, tenantId) {
  if (!raw) return { dynamoStartKey: undefined, cursorOffset: null };
  try {
    const obj = JSON.parse(decodeURIComponent(raw));
    if (obj && typeof obj.offset === 'number') return { dynamoStartKey: undefined, cursorOffset: Math.max(0, obj.offset) };
    const key = obj && obj.dynamo ? obj.dynamo : obj;
    if (key && key.PK && key.SK) {
      return { dynamoStartKey: { PK: key.PK, SK: key.SK, tenantId, EntityType: 'DOCTOR' }, cursorOffset: null };
    }
    return { dynamoStartKey: undefined, cursorOffset: null };
  } catch {
    return { dynamoStartKey: undefined, cursorOffset: null };
  }
}

function sanitizeSortField(field) { const f = (field || '').trim(); return ALLOWED_SORT_FIELDS.has(f) ? f : null; }

function parseFilterParameters(qp) {
  const filters = {
    search: null, name: null, email: null, gender: null, insurance: null, status: null,
    department: null, specialization: null, dobFrom: null, dobTo: null,
    hiringDateFrom: null, hiringDateTo: null, experienceYears: null, experienceMonths: null,
    notes: null, education: null, dutyDays: null, dutyStart: null, dutyEnd: null, bloodGroup: null,
  };
  const ALL = ['search','name','email','gender','insurance','status','department','specialization',
    'experienceYears','experienceMonths','notes','education','dutyDays','dutyStart','dutyEnd','bloodGroup'];
  for (const key of Object.keys(qp)) {
    let value = typeof qp[key] === 'string' ? qp[key].trim() : qp[key];
    if (!value) continue;
    if (typeof value === 'string') value = value.toLowerCase();
    if (key === 'dobFrom')        { filters.dobFrom = value; continue; }
    if (key === 'dobTo')          { filters.dobTo   = value; continue; }
    if (key === 'hiringDateFrom') { filters.hiringDateFrom = value; continue; }
    if (key === 'hiringDateTo')   { filters.hiringDateTo   = value; continue; }
    const parts = key.split('.');
    if (parts.length === 2) {
      const [field, operator] = parts;
      if (ALL.includes(field)) {
        const op = VALID_OPERATORS.includes(operator) ? operator : 'contains';
        let v = value;
        if (typeof v === 'string' && v.includes(',')) {
          v = v.split(',').map(s => s.trim().replace(/^['"]+|['"]+$/g, '')).filter(Boolean);
        }
        if (Array.isArray(v) && !['equals','notEquals'].includes(op)) v = v.join(',');
        filters[field] = { value: v, operator: op };
      }
      continue;
    }
    if (ALL.includes(key)) filters[key] = { value, operator: 'contains' };
  }
  return filters;
}

function hasEncryptedFieldFilter(filters) {
  if (filters.search || filters.dobFrom || filters.dobTo) return true;
  for (const f of ENCRYPTED_FILTERABLE) if (filters[f]) return true;
  return false;
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

function buildPlaintextFilter(filters) {
  const conditions = [];
  const names  = { '#pk': 'PK', '#sk': 'SK', '#deletedAt': 'deletedAt' };
  const values = { ':pkPrefix': 'DOCTOR#', ':skProfile': 'PROFILE', ':nullType': 'NULL' };
  conditions.push('begins_with(#pk, :pkPrefix)');
  conditions.push('#sk = :skProfile');
  conditions.push('(attribute_not_exists(#deletedAt) OR attribute_type(#deletedAt, :nullType))');

  PLAINTEXT_FILTERABLE.forEach((f, i) => {
    const c = buildFilterCondition(f, filters[f], names, values, `pf${i}`);
    if (c) conditions.push(c);
  });
  if (filters.hiringDateFrom) { names['#hiringDate'] = 'hiringDate'; values[':hdFrom'] = filters.hiringDateFrom; conditions.push('#hiringDate >= :hdFrom'); }
  if (filters.hiringDateTo)   { names['#hiringDate'] = 'hiringDate'; values[':hdTo']   = filters.hiringDateTo;   conditions.push('#hiringDate <= :hdTo'); }

  return { filterExpression: conditions.join(' AND '), names, values };
}

/* ------------------------- in-memory (post-decrypt) filters ---------------- */
function matchText(haystack, filter) {
  if (!filter || filter.value == null || filter.value === '') return true;
  const raw = Array.isArray(haystack) ? haystack.join(',') : haystack;
  const h  = (raw ?? '').toString().toLowerCase();
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
  return items.filter(d => {
    for (const f of ENCRYPTED_FILTERABLE) if (filters[f] && !matchText(d[f], filters[f])) return false;
    if (filters.dobFrom && !(d.dob && d.dob >= filters.dobFrom)) return false;
    if (filters.dobTo   && !(d.dob && d.dob <= filters.dobTo))   return false;
    if (filters.search && !SEARCH_FIELDS.some(f => matchText(d[f], filters.search))) return false;
    return true;
  });
}

/* ------------------------------ query paths ------------------------------ */
function gsiParams(tenantId, filterExpression, names, values) {
  return {
    TableName: TABLE_NAME,
    IndexName: TENANT_GSI,
    KeyConditionExpression: '#tid = :tid AND #et = :et',
    FilterExpression: filterExpression,
    ExpressionAttributeNames:  { ...names, '#tid': 'tenantId', '#et': 'EntityType' },
    ExpressionAttributeValues: { ...values, ':tid': tenantId, ':et': 'DOCTOR' }
  };
}

async function queryPage(tenantId, filterExpression, names, values, pageSize, startKey, offset = 0) {
  const doctors = []; let currentLastKey = startKey; let lastDoctorKey = null; let skipped = 0;
  const maxIterations = 50; let iterations = 0;
  while (doctors.length < pageSize && iterations++ < maxIterations) {
    const params = { ...gsiParams(tenantId, filterExpression, names, values), Limit: Math.max(pageSize * 3, 50) };
    if (currentLastKey) params.ExclusiveStartKey = currentLastKey;
    const res = await ddb.send(new QueryCommand(params));
    const items = res.Items || [];
    await decryptItems(items, DOCTOR_PHI_FIELDS, tenantId);
    for (const it of items) {
      if (startKey == null && offset > 0 && skipped < offset) { skipped++; continue; }
      doctors.push(normalizeDoctor(it));
      lastDoctorKey = { PK: it.PK, SK: it.SK };
      if (doctors.length >= pageSize) break;
    }
    currentLastKey = res.LastEvaluatedKey;
    if (!currentLastKey) break;
  }
  const hasMore = !!currentLastKey;
  const nextKey = hasMore && lastDoctorKey ? encodeURIComponent(JSON.stringify(lastDoctorKey)) : null;
  return { doctors, hasMore, nextKey };
}

async function loadAllTenantDoctors(tenantId, filterExpression, names, values) {
  const rows = []; let lastKey;
  do {
    const params = gsiParams(tenantId, filterExpression, names, values);
    if (lastKey) params.ExclusiveStartKey = lastKey;
    const res = await ddb.send(new QueryCommand(params));
    for (const it of (res.Items || [])) rows.push(it);
    lastKey = res.LastEvaluatedKey;
  } while (lastKey && rows.length < FULL_LOAD_MAX_ROWS);
  await decryptItems(rows, DOCTOR_PHI_FIELDS, tenantId);
  return rows.map(normalizeDoctor);
}

/* --------------------------------- count --------------------------------- */
async function countPlaintext(tenantId, filters, filterExpression, names, values) {
  const hasPlaintextFilters = PLAINTEXT_FILTERABLE.some(f => filters[f]) || filters.hiringDateFrom || filters.hiringDateTo;
  if (!hasPlaintextFilters) return await getTotalDoctors(tenantId);
  let count = 0, lastKey;
  do {
    const params = { ...gsiParams(tenantId, filterExpression, names, values), Select: 'COUNT' };
    if (lastKey) params.ExclusiveStartKey = lastKey;
    const res = await ddb.send(new QueryCommand(params));
    count += res.Count || 0; lastKey = res.LastEvaluatedKey;
  } while (lastKey);
  return count;
}

async function getTotalDoctors(tenantId) {
  // Per-tenant counter (Step 2d). Layout: COUNTER#DOCTORS#<tenantId>.
  try {
    const r = await ddb.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `COUNTER#DOCTORS#${tenantId}`, SK: 'TOTAL' }
    }));
    return r.Item?.total ?? 0;
  } catch (_) {
    return 0;
  }
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
  if (field === 'dob' || field === 'hiringDate' || field === 'timestamp') { const t = v ? new Date(v).getTime() : NaN; return Number.isFinite(t) ? t : NaN; }
  if (field === 'experienceYears' || field === 'experienceMonths') { const n = Number(v); return Number.isFinite(n) ? n : NaN; }
  if (Array.isArray(v)) return v.join(',').toLowerCase();
  return (v ?? '').toString().toLowerCase();
}
function tie(a, b, order) { if (a.PK < b.PK) return -order; if (a.PK > b.PK) return order; return 0; }

/* --------------------------------- misc ---------------------------------- */
function normalizeDoctor(it) {
  return {
    PK: it.PK,
    SK: it.SK,
    name: it.name || '',
    email: it.email || '',
    gender: it.gender || '',
    insurance: it.insurance || '',
    department: it.department || '',
    specialization: it.specialization || '',
    phone: it.phone || '',
    qid: it.qid || '',
    dob: it.dob || '',
    hiringDate: it.hiringDate || '',
    timestamp: it.timestamp || it.createdAt || '',
    status: it.status || '',
    experienceYears: it.experienceYears ?? '',
    experienceMonths: it.experienceMonths ?? '',
    notes: it.notes || '',
    education: it.education || '',
    dutyDays: it.dutyDays ?? [],
    dutyStart: it.dutyStart || '',
    dutyEnd: it.dutyEnd || '',
    bloodGroup: it.bloodGroup || '',
    licenseNumber: it.licenseNumber || '',
  };
}

function isDeleted(it) {
  const v = it?.deletedAt;
  if (v === undefined || v === null) return false;
  if (v === '' || v === '<empty>' || v === 'null') return false;
  return true;
}

function clampInt(val, def, min, max) { const n = parseInt(val, 10); return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : def; }

// CORS headers intentionally omitted — API Gateway corsPreflight owns them.
function ok(body) {
  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
function errResp(status, message) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) };
}
// hash-bust 2026-10-29

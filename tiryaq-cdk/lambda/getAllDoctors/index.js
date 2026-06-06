// // getAllDoctors (patients-like)

// // AWS SDK v3
// const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
// const { DynamoDBDocumentClient, ScanCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

// const REGION = 'us-east-1';
// const TABLE_NAME = 'Hospital';

// const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

// const VALID_OPERATORS = ['contains', 'startsWith', 'endsWith', 'notContains', 'equals', 'notEquals'];
// // Allow the common doctor columns to be sorted
// const ALLOWED_SORT_FIELDS = new Set([
//   'name','gender','insurance','department','specialization','status','dob','hiringDate','timestamp', 'experienceYears', 'experienceMonths', 'education', 'dutyDays', 'dutyStart', 'dutyEnd', 'notes'
// ]);

// exports.handler = async (event) => {
//   try {
//     // Optional: single doctor by path param (and honor deleted filter)
//     const doctorID = event?.pathParameters?.doctorID;
//     if (doctorID) {
//       const single = await getDoctorById(doctorID);
//       if (!single) return errResp(404, 'Doctor not found');
//       return ok({ message: 'Doctor retrieved successfully', data: single });
//     }

//     const qp = event?.queryStringParameters || {};
//     const pageSize = clampInt(qp.pageSize, 25, 1, 100);
//     const offset = clampInt(qp.offset, 0, 0, 1_000_000);
//     const sortField = sanitizeSortField(qp.sortField);
//     const sortOrder = parseInt(qp.sortOrder, 10) === -1 ? -1 : 1;

//     const { dynamoStartKey, cursor } = parseLastKey(qp.lastKey);

//     const filters = parseFilterParameters(qp);
//     const { filterExpression, expressionAttributeNames, expressionAttributeValues } = buildFilterExpression(filters);

//     const result = !sortField
//       ? await scanUnsorted(filterExpression, expressionAttributeNames, expressionAttributeValues, pageSize, dynamoStartKey, offset)
//       : await scanSorted(filterExpression, expressionAttributeNames, expressionAttributeValues, pageSize, dynamoStartKey, sortField, sortOrder, cursor, offset);

//     const totalCount = await getFilteredCount(filters);

//     return ok({
//       message: 'Doctors retrieved successfully',
//       data: result.doctors,
//       lastKey: result.nextKey,
//       hasMore: result.hasMore,
//       count: result.doctors.length,
//       totalCount,
//       pageSize
//     });
//   } catch (err) {
//     console.error('❌ Error:', err);
//     return errResp(500, err?.message || 'Internal Server Error');
//   }
// };

// /* ---------------------------- single by id ---------------------------- */
// async function getDoctorById(doctorPK) {
//   const res = await ddb.send(new GetCommand({
//     TableName: TABLE_NAME,
//     Key: { PK: doctorPK, SK: 'PROFILE' },
//     ProjectionExpression: '#pk,#sk,#et,#name,#gender,#insurance,#department,#specialization,#phone,#qid,#dob,#timestamp,#status,#hiringDate,#deletedAt,#experienceYears,#experienceMonths,#education,#dutyDays,#dutyStart,#dutyEnd,#notes,#email',
// ExpressionAttributeNames: {
//   '#pk':'PK',
//   '#sk':'SK',
//   '#et':'EntityType',
//   '#name':'name',
//   '#gender':'gender',
//   '#insurance':'insurance',
//   '#department':'department',
//   '#specialization':'specialization',
//   '#phone':'phone',
//   '#qid':'qid',
//   '#dob':'dob',
//   '#timestamp':'timestamp',
//   '#status':'status',
//   '#hiringDate':'hiringDate',
//   '#deletedAt':'deletedAt',
//   '#experienceYears':'experienceYears',
//   '#experienceMonths':'experienceMonths',
//   '#education':'education',
//   '#dutyDays':'dutyDays',
//   '#dutyStart':'dutyStart',
//   '#dutyEnd':'dutyEnd',
//   '#notes':'notes',
//   '#email':'email' // <-- added
// }
//   }));
//   const it = res.Item;
//   if (!it) return null;

//   // Exclude deleted (same logic as patients)
//   if (isDeleted(it)) return null;

//   return normalizeDoctor(it);
// }

// /* ---------------------------- parsing helpers ---------------------------- */

// function parseLastKey(raw) {
//   if (!raw) return { dynamoStartKey: undefined, cursor: null };
//   try {
//     const obj = JSON.parse(decodeURIComponent(raw));
//     if (obj && obj.PK && obj.SK) return { dynamoStartKey: obj, cursor: null };
//     if (obj && ('dynamo' in obj || 'cursor' in obj)) return { dynamoStartKey: obj.dynamo || undefined, cursor: obj.cursor || null };
//     return { dynamoStartKey: obj, cursor: null };
//   } catch {
//     return { dynamoStartKey: undefined, cursor: null };
//   }
// }

// function sanitizeSortField(field) { const f = (field || '').trim(); return ALLOWED_SORT_FIELDS.has(f) ? f : null; }

// function parseFilterParameters(qp) {
//   const filters = {
//     search: null,
//     name: null,
//     email: null,
//     gender: null,
//     insurance: null,
//     status: null,
//     department: null, specialization: null,
//     dobFrom: null,
//     dobTo: null,
//     hiringDateFrom: null,
//     hiringDateTo: null,
//     experienceYears:null,
//     experienceMonths:null,
//     notes:null,
//     education:null,
//     dutyDays:null,
//     dutyStart:null,
//     dutyEnd:null,
//   };

//   for (const key of Object.keys(qp)) {
//     let value = typeof qp[key] === 'string' ? qp[key].trim() : qp[key];
//     if (!value) continue;
//     if (typeof value === 'string') value = value.toLowerCase();

//     // simple ranges
//     if (key === 'dobFrom')         { filters.dobFrom = value; continue; }
//     if (key === 'dobTo')           { filters.dobTo   = value; continue; }
//     if (key === 'hiringDateFrom')  { filters.hiringDateFrom = value; continue; }
//     if (key === 'hiringDateTo')    { filters.hiringDateTo   = value; continue; }

//     const parts = key.split('.');
//     if (parts.length === 2) {
//       const [field, operator] = parts;
//       if (['search','name','gender','insurance','status','department','specialization','experienceYears',	'experienceMonths',	'notes',	'education',	'dutyDays',	'dutyStart',	'dutyEnd'].includes(field)) {
//         const op = VALID_OPERATORS.includes(operator) ? operator : 'contains';
//         let v = value;
//         if (typeof v === 'string' && v.includes(',')) {
//           v = v.split(',').map(s => s.trim().replace(/^['"]+|['"]+$/g, '')).filter(Boolean);
//         }
//         if (Array.isArray(v) && !['equals','notEquals'].includes(op)) v = v.join(',');
//         filters[field] = { value: v, operator: op };
//       }
//       continue;
//     }

//     if (['search','name','gender','insurance','status','department','specialization','email','experienceYears','experienceMonths','notes','education','dutyDays','dutyStart','dutyEnd'].includes(key)) {
//       filters[key] = { value, operator: 'contains' };
//     }
    
//   }
//   return filters;
// }

// /* ------------------------- filter-expression build ------------------------- */

// function buildFilterCondition(fieldName, filter, names, values, vKey) {
//   if (!filter || filter.value == null || filter.value === '') return null;
//   const nameKey = `#${fieldName}`; names[nameKey] = fieldName;
//   const op = filter.operator || 'contains';

//   if (Array.isArray(filter.value)) {
//     if (op === 'equals') {
//       const ks = filter.value.map((val, i) => { const k = `:${vKey}${i}`; values[k] = val; return k; });
//       return `${nameKey} IN (${ks.join(', ')})`;
//     }
//     if (op === 'notEquals') {
//       const parts = filter.value.map((val, i) => { const k = `:${vKey}${i}`; values[k] = val; return `${nameKey} <> ${k}`; });
//       return parts.join(' AND ');
//     }
//   }

//   const valueKey = `:${vKey}`; values[valueKey] = filter.value;
//   switch (op) {
//     case 'equals':      return `${nameKey} = ${valueKey}`;
//     case 'notEquals':   return `${nameKey} <> ${valueKey}`;
//     case 'contains':    return `contains(${nameKey}, ${valueKey})`;
//     case 'notContains': return `NOT contains(${nameKey}, ${valueKey})`;
//     case 'startsWith':  return `begins_with(${nameKey}, ${valueKey})`;
//     case 'endsWith':    return `contains(${nameKey}, ${valueKey})`;
//     default:            return `contains(${nameKey}, ${valueKey})`;
//   }
// }

// function buildFilterExpression(filters) {
//   const conditions = [];
//   const names = {};
//   const values = {};

//   // ------------------- filter only doctors -------------------
//   names['#pk'] = 'PK';
//   names['#sk'] = 'SK';
//   names['#entityType'] = 'EntityType';
//   names['#deletedAt'] = 'deletedAt';

//   values[':pkPrefix'] = 'DOCTOR#';
//   values[':skProfile'] = 'PROFILE';
//   values[':doctorType'] = 'DOCTOR';
//   values[':nullType'] = 'NULL';

//   conditions.push('begins_with(#pk, :pkPrefix)');
//   conditions.push('#sk = :skProfile');
//   conditions.push('#entityType = :doctorType');

//   // not deleted
//   conditions.push('(attribute_not_exists(#deletedAt) OR attribute_type(#deletedAt, :nullType))');

//   // ------------------- global search -------------------
//   if (filters.search) {
//     const ors = [];
//   ['name', 'gender', 'insurance', 'status', 'department', 'specialization', 'email', 'experienceYears','experienceMonths','notes','education','dutyDays','dutyStart','dutyEnd'].forEach((f, i) => {
//     const c = buildFilterCondition(f, filters.search, names, values, `search${i}`);
//       if (c) ors.push(c);
//     });
//     if (ors.length) conditions.push(`(${ors.join(' OR ')})`);
//   }

//   // ------------------- individual filters -------------------
//   const fName = buildFilterCondition('name', filters.name, names, values, 'nameF'); 
//   if (fName) conditions.push(fName);

//   const fEmail = buildFilterCondition('email', filters.email, names, values, 'emailF');
// if (fEmail) conditions.push(fEmail);


//   const fGender = buildFilterCondition('gender', filters.gender, names, values, 'genderF'); 
//   if (fGender) conditions.push(fGender);

//   const fIns = buildFilterCondition('insurance', filters.insurance, names, values, 'insF'); 
//   if (fIns) conditions.push(fIns);

//   const fStatus = buildFilterCondition('status', filters.status, names, values, 'statusF'); 
//   if (fStatus) conditions.push(fStatus);

//   const fDept = buildFilterCondition('department', filters.department, names, values, 'deptF'); 
//   if (fDept) conditions.push(fDept);

//   const fSpec = buildFilterCondition('specialization', filters.specialization, names, values, 'specF');
// if (fSpec) conditions.push(fSpec);

// const fExpYrs = buildFilterCondition('experienceYears', filters.experienceYears, names, values, 'expYrsF');
// if (fExpYrs) conditions.push(fExpYrs);

// const fExpMths = buildFilterCondition('experienceMonths', filters.experienceMonths, names, values, 'expMthsF');
// if (fExpMths) conditions.push(fExpMths);

// const fNotes = buildFilterCondition('notes', filters.notes, names, values, 'notesF');
// if (fNotes) conditions.push(fNotes);

// const fEducation = buildFilterCondition('education', filters.education, names, values, 'educationF');
// if (fEducation) conditions.push(fEducation);

// const fDutyDays = buildFilterCondition('dutyDays', filters.dutyDays, names, values, 'dutyDaysF');
// if (fDutyDays) conditions.push(fDutyDays);

// const fDutyStart = buildFilterCondition('dutyStart', filters.dutyStart, names, values, 'dutyStartF');
// if (fDutyStart) conditions.push(fDutyStart);

// const fDutyEnd = buildFilterCondition('dutyEnd', filters.dutyEnd, names, values, 'dutyEndF');
// if (fDutyEnd) conditions.push(fDutyEnd);


  

//   // ------------------- ranges -------------------
//   if (filters.dobFrom) {
//     names['#dob'] = 'dob';
//     values[':dobFrom'] = filters.dobFrom;
//     conditions.push('#dob >= :dobFrom');
//   }
//   if (filters.dobTo) {
//     names['#dob'] = 'dob';
//     values[':dobTo'] = filters.dobTo;
//     conditions.push('#dob <= :dobTo');
//   }
//   if (filters.hiringDateFrom) {
//     names['#hiringDate'] = 'hiringDate';
//     values[':hdFrom'] = filters.hiringDateFrom;
//     conditions.push('#hiringDate >= :hdFrom');
//   }
//   if (filters.hiringDateTo) {
//     names['#hiringDate'] = 'hiringDate';
//     values[':hdTo'] = filters.hiringDateTo;
//     conditions.push('#hiringDate <= :hdTo');
//   }

//   // ------------------- return -------------------
//   return {
//     filterExpression: conditions.join(' AND '),
//     expressionAttributeNames: names,
//     expressionAttributeValues: values
//   };
// }

// /* ------------------------------ scan paths ------------------------------ */
// async function scanUnsorted(filterExpression, names, values, pageSize, startKey, offset = 0) {
//   const doctors = []; let currentLastKey = startKey; let lastKeyOut = null; let skipped = 0; const maxIterations = 50; let iterations = 0;

//   while (doctors.length < pageSize && iterations++ < maxIterations) {
//     const batchSize = Math.max(pageSize * 3, 50);
//     const params = {
//       TableName: TABLE_NAME,
//       Limit: batchSize,
//       FilterExpression: filterExpression,
//       ExpressionAttributeNames: names,
//       ExpressionAttributeValues: values
//     };
//     if (currentLastKey) params.ExclusiveStartKey = currentLastKey;

//     const res = await ddb.send(new ScanCommand(params));
//     const items = res.Items || [];

//     for (const it of items) {
//       if (it.PK?.startsWith('DOCTOR#') && it.SK === 'PROFILE' && it.EntityType === 'DOCTOR' && !isDeleted(it)) {
//         if (startKey == null && offset > 0 && skipped < offset) { skipped++; continue; }
//         doctors.push(normalizeDoctor(it));
//         lastKeyOut = { PK: it.PK, SK: it.SK };
//         if (doctors.length >= pageSize) break;
//       }
//     }

//     currentLastKey = res.LastEvaluatedKey;
//     if (!currentLastKey) break;
//   }

//   let hasMore = false;
//   if (doctors.length === pageSize) {
//     const probe = {
//       TableName: TABLE_NAME,
//       Limit: 50,
//       FilterExpression: filterExpression,
//       ExpressionAttributeNames: names,
//       ExpressionAttributeValues: values
//     };
//     if (currentLastKey) probe.ExclusiveStartKey = currentLastKey; else if (lastKeyOut) probe.ExclusiveStartKey = lastKeyOut;
//     const nxt = await ddb.send(new ScanCommand(probe));
//     hasMore = !!(nxt.LastEvaluatedKey || (nxt.Items || []).some(x => x.PK?.startsWith('DOCTOR#') && x.SK === 'PROFILE' && x.EntityType === 'DOCTOR' && !isDeleted(x)));
//   }

//   const nextKey = hasMore && lastKeyOut ? encodeURIComponent(JSON.stringify(lastKeyOut)) : null;
//   return { doctors, hasMore, nextKey };
// }

// async function scanSorted(filterExpression, names, values, pageSize, startKey, sortField, sortOrder, cursor, offset = 0) {
//   const buffer = []; let currentLastKey = startKey; const maxIterations = 50; let iterations = 0;

//   while (iterations++ < maxIterations) {
//     const batchSize = Math.max(pageSize * 3, 50);
//     const params = {
//       TableName: TABLE_NAME,
//       Limit: batchSize,
//       FilterExpression: filterExpression,
//       ExpressionAttributeNames: names,
//       ExpressionAttributeValues: values
//     };
//     if (currentLastKey) params.ExclusiveStartKey = currentLastKey;

//     const res = await ddb.send(new ScanCommand(params));
//     const items = res.Items || [];
//     currentLastKey = res.LastEvaluatedKey;

//     for (const it of items) if (it.PK?.startsWith('DOCTOR#') && it.SK === 'PROFILE' && it.EntityType === 'DOCTOR' && !isDeleted(it)) buffer.push(normalizeDoctor(it));

//     let eligible = sortArray(buffer, sortField, sortOrder);
//     eligible = afterCursor(eligible, cursor, sortField, sortOrder);

//     if (!cursor && startKey == null && offset > 0 && eligible.length > offset) eligible = eligible.slice(offset);

//     if (eligible.length >= pageSize) {
//       const page = eligible.slice(0, pageSize);
//       const last = page[page.length - 1];
//       const nextKeyObj = {
//         dynamo: currentLastKey || null,
//         cursor: { sortField, sortOrder, sortValue: sortValueOf(last, sortField), pk: last.PK, sk: last.SK }
//       };
//       return { doctors: page, hasMore: true, nextKey: encodeURIComponent(JSON.stringify(nextKeyObj)) };
//     }
//     if (!currentLastKey) break;
//   }

//   let eligible = sortArray(buffer, sortField, sortOrder);
//   eligible = afterCursor(eligible, cursor, sortField, sortOrder);
//   if (!cursor && startKey == null && offset > 0 && eligible.length > offset) eligible = eligible.slice(offset);

//   const page = eligible.slice(0, pageSize);
//   const last = page[page.length - 1] || null;
//   const nextKeyObj = last ? { dynamo: null, cursor: { sortField, sortOrder, sortValue: sortValueOf(last, sortField), pk: last.PK, sk: last.SK } } : null;
//   return { doctors: page, hasMore: !!nextKeyObj, nextKey: nextKeyObj ? encodeURIComponent(JSON.stringify(nextKeyObj)) : null };
// }

// /* ----------------------------- sort utilities ---------------------------- */
// function sortArray(arr, field, order) { const o = order === -1 ? -1 : 1; return arr.slice().sort((a, b) => compareByField(a, b, field, o)); }
// function compareByField(a, b, field, order) {
//   const av = sortValueOf(a, field), bv = sortValueOf(b, field);
//   const aU = av === undefined || av === null || Number.isNaN(av), bU = bv === undefined || bv === null || Number.isNaN(bv);
//   if (aU && bU) return tie(a, b, order); if (aU) return order; if (bU) return -order;
//   if (av < bv) return -order; if (av > bv) return order; return tie(a, b, order);
// }
// function sortValueOf(item, field) {
//   const v = item?.[field];
//   if (field === 'dob' || field === 'timestamp' || field === 'hiringDate') {
//     const t = v ? new Date(v).getTime() : NaN; return Number.isFinite(t) ? t : NaN;
//   }
//   return (v ?? '').toString().toLowerCase();
// }
// function tie(a, b, order) { if (a.PK < b.PK) return -order; if (a.PK > b.PK) return order; return 0; }
// function afterCursor(sorted, cursor, field, order) {
//   if (!cursor || cursor.sortField !== field || cursor.sortOrder !== order) return sorted;
//   const curVal = cursor.sortValue, curPk = cursor.pk;
//   return sorted.filter(item => {
//     const v = sortValueOf(item, field);
//     if (v === curVal) return item.PK > curPk;
//     return order === 1 ? v > curVal : v < curVal;
//   });
// }

// /* --------------------------------- count --------------------------------- */
// async function getFilteredCount(filters) {
//   const hasFilters =
//   filters.search ||
//   filters.name ||
//   filters.gender ||
//   filters.insurance ||
//   filters.status ||
//   filters.department ||
//   filters.specialization ||
//   filters.dobFrom ||
//   filters.dobTo ||
//   filters.hiringDateFrom ||
//   filters.hiringDateTo ||

//   // added fields
//   filters.experienceYears ||
//   filters.experienceMonths ||
//   filters.notes ||
//   filters.education ||
//   filters.dutyDays ||
//   filters.dutyStart ||
//   filters.dutyEnd;

//   if (!hasFilters) {
//     // If you keep a counter for doctors, you can read it here; otherwise fall back to full scan COUNT
//     return await countByScan(filters);
//   }
//   const { filterExpression, expressionAttributeNames, expressionAttributeValues } = buildFilterExpression(filters);
//   let count = 0, lastEvaluatedKey;
//   do {
//     const params = {
//       TableName: TABLE_NAME,
//       Select: 'COUNT',
//       FilterExpression: filterExpression,
//       ExpressionAttributeNames: expressionAttributeNames,
//       ExpressionAttributeValues: expressionAttributeValues
//     };
//     if (lastEvaluatedKey) params.ExclusiveStartKey = lastEvaluatedKey;
//     const res = await ddb.send(new ScanCommand(params));
//     count += res.Count || 0; lastEvaluatedKey = res.LastEvaluatedKey;
//   } while (lastEvaluatedKey);
//   return count;
// }

// async function countByScan(filters) {
//   const { filterExpression, expressionAttributeNames, expressionAttributeValues } = buildFilterExpression(filters);
//   let count = 0, lastEvaluatedKey;
//   do {
//     const params = {
//       TableName: TABLE_NAME,
//       Select: 'COUNT',
//       FilterExpression: filterExpression,
//       ExpressionAttributeNames: expressionAttributeNames,
//       ExpressionAttributeValues: expressionAttributeValues
//     };
//     if (lastEvaluatedKey) params.ExclusiveStartKey = lastEvaluatedKey;
//     const res = await ddb.send(new ScanCommand(params));
//     count += res.Count || 0; lastEvaluatedKey = res.LastEvaluatedKey;
//   } while (lastEvaluatedKey);
//   return count;
// }

// /* --------------------------------- misc ---------------------------------- */
// function normalizeDoctor(it) {
//   return {
//     PK: it.PK,
//     SK: it.SK,
//     name: it.name || '',
//     email: it.email || '',
//     gender: it.gender || '',
//     insurance: it.insurance || '',
//     department: it.department || '',
//     specialization: it.specialization || '',
//     phone: it.phone || '',
//     qid: it.qid || '',
//     dob: it.dob || '',
//     hiringDate: it.hiringDate || '',
//     timestamp: it.timestamp || it.createdAt || '',
//     status: it.status || '',
//     experienceYears: it.experienceYears ?? '',
//     experienceMonths: it.experienceMonths ?? '',
//     notes: it.notes || '',
//     education: it.education || '',
//     dutyDays: it.dutyDays ?? [],
//     dutyStart: it.dutyStart || '',
//     dutyEnd: it.dutyEnd || '',
//     email: it.email || '' // <-- added
//   };
// }


// function isDeleted(it) {
//     const v = it?.deletedAt;
//     // same semantics as patients: only treat as deleted when it's a real, non-empty value
//     if (v === undefined || v === null) return false;
//     if (v === '' || v === '<empty>' || v === 'null') return false;
//     return true; // anything else means deleted
//   }  

// function clampInt(val, def, min, max) { const n = parseInt(val, 10); return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : def; }
// function ok(body) {
//   return {
//     statusCode: 200,
//     headers: {
//       'Content-Type': 'application/json',
//       'Access-Control-Allow-Origin': '*',
//       'Access-Control-Allow-Headers': 'Content-Type, Authorization',
//       'Access-Control-Allow-Methods': 'GET,OPTIONS'
//     },
//     body: JSON.stringify(body)
//   };
// }
// function errResp(status, message) {
//   return {
//     statusCode: status,
//     headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
//     body: JSON.stringify({ message })
//   };
// }
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const REGION = 'us-east-1';
const TABLE_NAME = 'Hospital';
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const VALID_OPERATORS = ['contains', 'startsWith', 'endsWith', 'notContains', 'equals', 'notEquals'];
const ALLOWED_SORT_FIELDS = new Set([
  'name','gender','insurance','department','specialization','status','dob',
  'hiringDate','timestamp','experienceYears','experienceMonths','education',
  'dutyDays','dutyStart','dutyEnd','notes','bloodGroup'
]);

exports.handler = async (event) => {
  if (event && event._warmup) return { ok: true, warmed: true };
  try {
    const doctorID = event?.pathParameters?.doctorID;
    if (doctorID) {
      const single = await getDoctorById(doctorID);
      if (!single) return errResp(404, 'Doctor not found');
      return ok({ message: 'Doctor retrieved successfully', data: single });
    }
    const qp = event?.queryStringParameters || {};
    const pageSize = clampInt(qp.pageSize, 25, 1, 100);
    const offset = clampInt(qp.offset, 0, 0, 1_000_000);
    const sortField = sanitizeSortField(qp.sortField);
    const sortOrder = parseInt(qp.sortOrder, 10) === -1 ? -1 : 1;
    const { dynamoStartKey, cursor } = parseLastKey(qp.lastKey);
    const filters = parseFilterParameters(qp);
    const { filterExpression, expressionAttributeNames, expressionAttributeValues } = buildFilterExpression(filters);
    const result = !sortField
      ? await scanUnsorted(filterExpression, expressionAttributeNames, expressionAttributeValues, pageSize, dynamoStartKey, offset)
      : await scanSorted(filterExpression, expressionAttributeNames, expressionAttributeValues, pageSize, dynamoStartKey, sortField, sortOrder, cursor, offset);
    const totalCount = await getFilteredCount(filters);
    return ok({
      message: 'Doctors retrieved successfully',
      data: result.doctors,
      lastKey: result.nextKey,
      hasMore: result.hasMore,
      count: result.doctors.length,
      totalCount,
      pageSize
    });
  } catch (err) {
    return errResp(500, err?.message || 'Internal Server Error');
  }
};

/* ---------------------------- single by id ---------------------------- */
async function getDoctorById(doctorPK) {
  const res = await ddb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: doctorPK, SK: 'PROFILE' }
    // ✅ No ProjectionExpression — returns all attributes
  }));
  const it = res.Item;
  if (!it) return null;
  if (isDeleted(it)) return null;
  return normalizeDoctor(it);
}

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

function sanitizeSortField(field) { const f = (field || '').trim(); return ALLOWED_SORT_FIELDS.has(f) ? f : null; }

function parseFilterParameters(qp) {
  const filters = {
    search: null,
    name: null,
    email: null,
    gender: null,
    insurance: null,
    status: null,
    department: null, specialization: null,
    dobFrom: null,
    dobTo: null,
    hiringDateFrom: null,
    hiringDateTo: null,
    experienceYears: null,
    experienceMonths: null,
    notes: null,
    education: null,
    dutyDays: null,
    dutyStart: null,
    dutyEnd: null,
    bloodGroup: null,
  };
  for (const key of Object.keys(qp)) {
    let value = typeof qp[key] === 'string' ? qp[key].trim() : qp[key];
    if (!value) continue;
    if (typeof value === 'string') value = value.toLowerCase();
    if (key === 'dobFrom')         { filters.dobFrom = value; continue; }
    if (key === 'dobTo')           { filters.dobTo   = value; continue; }
    if (key === 'hiringDateFrom')  { filters.hiringDateFrom = value; continue; }
    if (key === 'hiringDateTo')    { filters.hiringDateTo   = value; continue; }
    const parts = key.split('.');
    if (parts.length === 2) {
      const [field, operator] = parts;
      if (['search','name','gender','insurance','status','department','specialization',
        'experienceYears','experienceMonths','notes','education','dutyDays',
        'dutyStart','dutyEnd','bloodGroup'].includes(field)) {
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
    // In the plain key block:
if (['search','name','gender','insurance','status','department','specialization',
  'email','experienceYears','experienceMonths','notes','education','dutyDays',
  'dutyStart','dutyEnd','bloodGroup'].includes(key)) {
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
  const names = {};
  const values = {};
  names['#pk'] = 'PK';
  names['#sk'] = 'SK';
  names['#entityType'] = 'EntityType';
  names['#deletedAt'] = 'deletedAt';
  values[':pkPrefix'] = 'DOCTOR#';
  values[':skProfile'] = 'PROFILE';
  values[':doctorType'] = 'DOCTOR';
  values[':nullType'] = 'NULL';
  conditions.push('begins_with(#pk, :pkPrefix)');
  conditions.push('#sk = :skProfile');
  conditions.push('#entityType = :doctorType');
  conditions.push('(attribute_not_exists(#deletedAt) OR attribute_type(#deletedAt, :nullType))');
  if (filters.search) {
    const ors = [];
    ['name', 'gender', 'insurance', 'status', 'department', 'specialization', 'email',
      'experienceYears','experienceMonths','notes','education','dutyDays','dutyStart',
      'dutyEnd','bloodGroup']
       .forEach((f, i) => {
      const c = buildFilterCondition(f, filters.search, names, values, `search${i}`);
      if (c) ors.push(c);
    });
    if (ors.length) conditions.push(`(${ors.join(' OR ')})`);
  }
  const fName = buildFilterCondition('name', filters.name, names, values, 'nameF');
  if (fName) conditions.push(fName);
  const fEmail = buildFilterCondition('email', filters.email, names, values, 'emailF');
  if (fEmail) conditions.push(fEmail);
  const fGender = buildFilterCondition('gender', filters.gender, names, values, 'genderF');
  if (fGender) conditions.push(fGender);
  const fIns = buildFilterCondition('insurance', filters.insurance, names, values, 'insF');
  if (fIns) conditions.push(fIns);
  const fStatus = buildFilterCondition('status', filters.status, names, values, 'statusF');
  if (fStatus) conditions.push(fStatus);
  const fDept = buildFilterCondition('department', filters.department, names, values, 'deptF');
  if (fDept) conditions.push(fDept);
  const fSpec = buildFilterCondition('specialization', filters.specialization, names, values, 'specF');
  if (fSpec) conditions.push(fSpec);
  const fExpYrs = buildFilterCondition('experienceYears', filters.experienceYears, names, values, 'expYrsF');
  if (fExpYrs) conditions.push(fExpYrs);
  const fExpMths = buildFilterCondition('experienceMonths', filters.experienceMonths, names, values, 'expMthsF');
  if (fExpMths) conditions.push(fExpMths);
  const fNotes = buildFilterCondition('notes', filters.notes, names, values, 'notesF');
  if (fNotes) conditions.push(fNotes);
  const fEducation = buildFilterCondition('education', filters.education, names, values, 'educationF');
  if (fEducation) conditions.push(fEducation);
  const fDutyDays = buildFilterCondition('dutyDays', filters.dutyDays, names, values, 'dutyDaysF');
  if (fDutyDays) conditions.push(fDutyDays);
  const fDutyStart = buildFilterCondition('dutyStart', filters.dutyStart, names, values, 'dutyStartF');
  if (fDutyStart) conditions.push(fDutyStart);
  const fBloodGroup = buildFilterCondition('bloodGroup', filters.bloodGroup, names, values, 'bloodGroupF');
  if (fBloodGroup) conditions.push(fBloodGroup);
  const fDutyEnd = buildFilterCondition('dutyEnd', filters.dutyEnd, names, values, 'dutyEndF');
  if (fDutyEnd) conditions.push(fDutyEnd);
  if (filters.dobFrom) {
    names['#dob'] = 'dob';
    values[':dobFrom'] = filters.dobFrom;
    conditions.push('#dob >= :dobFrom');
  }
  if (filters.dobTo) {
    names['#dob'] = 'dob';
    values[':dobTo'] = filters.dobTo;
    conditions.push('#dob <= :dobTo');
  }
  if (filters.hiringDateFrom) {
    names['#hiringDate'] = 'hiringDate';
    values[':hdFrom'] = filters.hiringDateFrom;
    conditions.push('#hiringDate >= :hdFrom');
  }
  if (filters.hiringDateTo) {
    names['#hiringDate'] = 'hiringDate';
    values[':hdTo'] = filters.hiringDateTo;
    conditions.push('#hiringDate <= :hdTo');
  }
  return {
    filterExpression: conditions.join(' AND '),
    expressionAttributeNames: names,
    expressionAttributeValues: values
  };
}

/* ------------------------------ scan paths ------------------------------ */
async function scanUnsorted(filterExpression, names, values, pageSize, startKey, offset = 0) {
  // Query EntityType-index instead of scanning the entire table.
  // The pure-Scan version timed out at ~30 s once the table grew past a few
  // hundred thousand rows of other entity types (appointments / examinations).
  const doctors = []; let currentLastKey = startKey; let lastKeyOut = null; let skipped = 0; const maxIterations = 50; let iterations = 0;
  while (doctors.length < pageSize && iterations++ < maxIterations) {
    const params = {
      TableName: TABLE_NAME,
      IndexName: 'EntityType-index',
      KeyConditionExpression: 'EntityType = :et',
      Limit: Math.max(pageSize * 3, 50),
      ExpressionAttributeNames: { ...(names || {}) },
      ExpressionAttributeValues: { ...(values || {}), ':et': 'DOCTOR' }
    };
    if (filterExpression) params.FilterExpression = filterExpression;
    if (currentLastKey) params.ExclusiveStartKey = currentLastKey;
    const res = await ddb.send(new QueryCommand(params));
    const items = res.Items || [];
    for (const it of items) {
      if (it.PK?.startsWith('DOCTOR#') && it.SK === 'PROFILE' && !isDeleted(it)) {
        if (startKey == null && offset > 0 && skipped < offset) { skipped++; continue; }
        doctors.push(normalizeDoctor(it));
        lastKeyOut = { PK: it.PK, SK: it.SK };
        if (doctors.length >= pageSize) break;
      }
    }
    currentLastKey = res.LastEvaluatedKey;
    if (!currentLastKey) break;
  }
  const hasMore = !!currentLastKey;
  const nextKey = hasMore && lastKeyOut ? encodeURIComponent(JSON.stringify(lastKeyOut)) : null;
  return { doctors, hasMore, nextKey };
}

async function scanSorted(filterExpression, names, values, pageSize, startKey, sortField, sortOrder, cursor, offset = 0) {
  const buffer = []; let currentLastKey = startKey; const maxIterations = 50; let iterations = 0;
  while (iterations++ < maxIterations) {
    const batchSize = Math.max(pageSize * 3, 50);
    const params = {
      TableName: TABLE_NAME,
      Limit: batchSize,
      FilterExpression: filterExpression,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values
    };
    if (currentLastKey) params.ExclusiveStartKey = currentLastKey;
    const res = await ddb.send(new ScanCommand(params));
    const items = res.Items || [];
    currentLastKey = res.LastEvaluatedKey;
    for (const it of items) if (it.PK?.startsWith('DOCTOR#') && it.SK === 'PROFILE' && it.EntityType === 'DOCTOR' && !isDeleted(it)) buffer.push(normalizeDoctor(it));
    let eligible = sortArray(buffer, sortField, sortOrder);
    eligible = afterCursor(eligible, cursor, sortField, sortOrder);
    if (!cursor && startKey == null && offset > 0 && eligible.length > offset) eligible = eligible.slice(offset);
    if (eligible.length >= pageSize) {
      const page = eligible.slice(0, pageSize);
      const last = page[page.length - 1];
      const nextKeyObj = {
        dynamo: currentLastKey || null,
        cursor: { sortField, sortOrder, sortValue: sortValueOf(last, sortField), pk: last.PK, sk: last.SK }
      };
      return { doctors: page, hasMore: true, nextKey: encodeURIComponent(JSON.stringify(nextKeyObj)) };
    }
    if (!currentLastKey) break;
  }
  let eligible = sortArray(buffer, sortField, sortOrder);
  eligible = afterCursor(eligible, cursor, sortField, sortOrder);
  if (!cursor && startKey == null && offset > 0 && eligible.length > offset) eligible = eligible.slice(offset);
  const page = eligible.slice(0, pageSize);
  const last = page[page.length - 1] || null;
  const nextKeyObj = last ? { dynamo: null, cursor: { sortField, sortOrder, sortValue: sortValueOf(last, sortField), pk: last.PK, sk: last.SK } } : null;
  return { doctors: page, hasMore: !!nextKeyObj, nextKey: nextKeyObj ? encodeURIComponent(JSON.stringify(nextKeyObj)) : null };
}

/* ----------------------------- sort utilities ---------------------------- */
function sortArray(arr, field, order) { const o = order === -1 ? -1 : 1; return arr.slice().sort((a, b) => compareByField(a, b, field, o)); }
function compareByField(a, b, field, order) {
  const av = sortValueOf(a, field), bv = sortValueOf(b, field);
  const aU = av === undefined || av === null || Number.isNaN(av), bU = bv === undefined || bv === null || Number.isNaN(bv);
  if (aU && bU) return tie(a, b, order); if (aU) return order; if (bU) return -order;
  if (av < bv) return -order; if (av > bv) return order; return tie(a, b, order);
}
function sortValueOf(item, field) {
  const v = item?.[field];
  if (field === 'dob' || field === 'timestamp' || field === 'hiringDate') {
    const t = v ? new Date(v).getTime() : NaN; return Number.isFinite(t) ? t : NaN;
  }
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
async function getFilteredCount(filters) {
  const hasFilters =
  filters.search || filters.name || filters.gender || filters.insurance ||
  filters.status || filters.department || filters.specialization ||
  filters.dobFrom || filters.dobTo || filters.hiringDateFrom || filters.hiringDateTo ||
  filters.experienceYears || filters.experienceMonths || filters.notes ||
  filters.education || filters.dutyDays || filters.dutyStart || filters.dutyEnd ||
  filters.bloodGroup;
  if (!hasFilters) return await countByScan(filters);
  const { filterExpression, expressionAttributeNames, expressionAttributeValues } = buildFilterExpression(filters);
  let count = 0, lastEvaluatedKey;
  do {
    const params = {
      TableName: TABLE_NAME,
      Select: 'COUNT',
      FilterExpression: filterExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues
    };
    if (lastEvaluatedKey) params.ExclusiveStartKey = lastEvaluatedKey;
    const res = await ddb.send(new ScanCommand(params));
    count += res.Count || 0; lastEvaluatedKey = res.LastEvaluatedKey;
  } while (lastEvaluatedKey);
  return count;
}

async function countByScan(_filters) {
  // Fast path — read the maintained counter row. Create/delete handlers keep
  // it in sync. Falls back to 0 if the row doesn't exist yet (sync script).
  try {
    const r = await ddb.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: 'COUNTER#DOCTORS', SK: 'TOTAL' }
    }));
    return r.Item?.total ?? 0;
  } catch (_) {
    return 0;
  }
}

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

function ok(body) {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET,OPTIONS'
    },
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
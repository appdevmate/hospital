const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
// Step 2g — per-tenant rate limit.
const throttle = require('./throttle');

const client = new DynamoDBClient({});
const db = DynamoDBDocumentClient.from(client);
const TABLE = process.env.TABLE_NAME || "Hospital";

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

// CORS headers are injected by API Gateway HTTP API's corsPreflight
// allow-list (see akwadona-cdk-stack.ts). Do NOT echo wildcard CORS headers
// here — they would override the allow-list and re-open every origin.
function res(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function isAdmin(event) {
  const claims =
    event.requestContext?.authorizer?.jwt?.claims ||
    event.requestContext?.authorizer?.claims ||
    {};
  const groups = claims["cognito:groups"] || "";
  const arr = Array.isArray(groups) ? groups : String(groups).split(",");
  return arr.some((g) =>
    ["admin", "Admin", "developer", "Developer"].includes(g.trim()),
  );
}

exports.handler = async (event) => {
  if (event && event._warmup) return { ok: true, warmed: true };
  const method = event.requestContext?.http?.method || event.httpMethod;

  if (method === "OPTIONS") return res(200, {});

  // Audit log is admin-only
  if (!isAdmin(event)) return res(403, { error: "Access denied: admin only" });

  // ── Tenant enforcement (Step 2d) ──
  let tenantId;
  try { tenantId = getTenant(event); }
  catch (e) { return res(e.statusCode || 403, { error: e.message }); }
  // Step 2g — per-tenant throttle.
  {
    const __role = (event.requestContext?.authorizer?.jwt?.claims || {}).role || 'tenant_user';
    const __tid = (typeof tenantId !== 'undefined') ? tenantId : (event.requestContext?.authorizer?.jwt?.claims || {}).tenantId;
    const __limitResponse = await throttle.precheck(event, { tenantId: __tid, role: __role });
    if (__limitResponse) return __limitResponse;
  }


  const params = event.queryStringParameters || {};

  // Query by date (default: today)
  const date = params.date || new Date().toISOString().slice(0, 10);
  const entityType = params.entityType;
  const entityId = params.entityId;
  const action = params.action;
  const limit = parseInt(params.limit || "100", 10);

  let filterExp = "";
  const filterVals = {};
  const filterNames = {};

  if (entityType) {
    filterExp += (filterExp ? " AND " : "") + "#entityType = :et";
    filterNames["#entityType"] = "entityType";
    filterVals[":et"] = entityType;
  }
  if (entityId) {
    filterExp += (filterExp ? " AND " : "") + "#entityId = :eid";
    filterNames["#entityId"] = "entityId";
    filterVals[":eid"] = entityId;
  }
  if (action) {
    filterExp += (filterExp ? " AND " : "") + "#action = :act";
    filterNames["#action"] = "action";
    filterVals[":act"] = action;
  }

  // Step 2d — always scope to caller's tenant.
  filterExp += (filterExp ? " AND " : "") + "#__tid = :__tid";
  filterNames["#__tid"] = "tenantId";
  filterVals[":__tid"] = tenantId;

  const query = {
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
    ExpressionAttributeValues: {
      ":pk": `AUDIT#${date}`,
      ":prefix": "AUDIT#",
      ...filterVals,
    },
    Limit: limit,
    ScanIndexForward: false, // newest first
  };

  if (filterExp) {
    query.FilterExpression = filterExp;
    query.ExpressionAttributeNames = filterNames;
  }

  const result = await db.send(new QueryCommand(query));

  // Defence-in-depth — drop anything not belonging to caller's tenant.
  const items = (result.Items || []).filter(i => i.tenantId === tenantId);

  return res(200, {
    date,
    count: items.length,
    items,
  });
};
// hash-bust 2026-06-21T14:07:44.7504132+03:00
// hash-bust 2026-06-21T14:14:23.7665133+03:00
// hash-bust 2026-06-21T14:28:24.0064697+03:00

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
    DynamoDBDocumentClient,
    GetCommand,
    QueryCommand,
    UpdateCommand,
    PutCommand
} = require('@aws-sdk/lib-dynamodb');
const {
    CognitoIdentityProviderClient,
    ListUsersCommand,
    ListUsersInGroupCommand,
    AdminDisableUserCommand,
    AdminEnableUserCommand,
    AdminSetUserPasswordCommand,
    AdminUpdateUserAttributesCommand
} = require('@aws-sdk/client-cognito-identity-provider');
// Step 76 fix — emailHash recomputation now goes through the shared crypto
// helper so it works for tenants whose KMS HMAC key ARN lives in the DDB
// TENANT row (wizard-onboarded tenants), not just env-var-bound tenants.
const crypto = require('./crypto');
// Step 2g — per-tenant rate limit.
const throttle = require('./throttle');

const REGION       = 'us-east-1';
const TABLE_NAME   = process.env.TABLE_NAME || 'Hospital';
const USER_POOL_ID = process.env.USER_POOL_ID;

const db      = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const cognito = new CognitoIdentityProviderClient({ region: REGION });

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

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Idempotency (Phase D) ────────────────────────────────────────────────────
function getClientRequestId(event) {
    const h = event.headers || {};
    return h['x-client-request-id'] || h['X-Client-Request-Id'] || null;
}
async function checkIdempotency(cid) {
    if (!cid) return null;
    try {
        const r = await db.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: `IDEMP#${cid}`, SK: 'PROFILE' } }));
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

function isAdmin(event) {
    const claims = event.requestContext?.authorizer?.jwt?.claims
                || event.requestContext?.authorizer?.claims || {};
    const groups = claims['cognito:groups'] || '';
    const arr = Array.isArray(groups)
        ? groups
        : String(groups).trim().replace(/^\[/, '').replace(/\]$/, '').split(/[,\s]+/).filter(Boolean);
    return arr.some(g => ['admin', 'Admin', 'developer', 'Developer', 'Developers'].includes(g.trim()));
}

// ── Main Handler ──────────────────────────────────────────────────────────────
exports.handler = async (event) => {
    if (event && event._warmup) return { ok: true, warmed: true };

    const method = event.requestContext?.http?.method || event.httpMethod;
    const path   = event.rawPath || event.path || '';
    const qs     = event.queryStringParameters || {};
    const params = event.pathParameters || {};

    // Step 2g.5 — route consolidated under /admin/{proxy+}, so pathParameters
    // contains `proxy` instead of named params. Reconstruct `username` from
    // the proxy segments so the rest of the handler keeps working unchanged.
    if (!params.username && params.proxy) {
        const segs = params.proxy.split('/').filter(Boolean);
        // Expected shapes:
        //   stats                                  → no username
        //   users                                  → no username
        //   users/<username>/disable               → username = segs[1]
        //   users/<username>/enable                → "
        //   users/<username>/set-password          → "
        //   users/<username>/email                 → "
        //   audit                                  → no username
        if (segs[0] === 'users' && segs[1]) params.username = segs[1];
    }

    if (method === 'OPTIONS') return res(200, {});
    if (!isAdmin(event))      return err(403, 'Access denied: admin only');

    // ── Tenant enforcement (Step 2d) ──
    let tenantId;
    try { tenantId = getTenant(event); }
    catch (e) { return err(e.statusCode || 403, e.message); }
  // Step 2g — per-tenant throttle.
  {
    const __role = (event.requestContext?.authorizer?.jwt?.claims || {}).role || 'tenant_user';
    const __tid = (typeof tenantId !== 'undefined') ? tenantId : (event.requestContext?.authorizer?.jwt?.claims || {}).tenantId;
    const __limitResponse = await throttle.precheck(event, { tenantId: __tid, role: __role });
    if (__limitResponse) return __limitResponse;
  }


    // Helper: verify a Cognito user belongs to the caller's tenant.
    const verifyUserTenant = async (username) => {
        try {
            const { Users: list } = await cognito.send(new ListUsersCommand({
                UserPoolId: USER_POOL_ID,
                Filter: `username = "${username}"`,
                Limit: 1
            }));
            const u = (list || [])[0];
            if (!u) return false;
            const t = u.Attributes?.find(a => a.Name === 'custom:tenantId')?.Value;
            return t === tenantId;
        } catch (_) { return false; }
    };

    // ── GET /admin/stats — per-tenant counts (Step 2d) ────────────────────────
    if (method === 'GET' && path.endsWith('/stats')) {
        const [patients, doctors, exams, invoices] = await Promise.all([
            db.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: `COUNTER#PATIENTS#${tenantId}`, SK: 'TOTAL' } })),
            db.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: `COUNTER#DOCTORS#${tenantId}`,  SK: 'TOTAL' } })),
            db.send(new QueryCommand({
                TableName: TABLE_NAME, IndexName: 'tenant-entityType-index',
                KeyConditionExpression: 'tenantId = :tid AND EntityType = :et',
                ExpressionAttributeValues: { ':tid': tenantId, ':et': 'EXAMINATION' },
                Select: 'COUNT'
            })),
            db.send(new QueryCommand({
                TableName: TABLE_NAME, IndexName: 'tenant-entityType-index',
                KeyConditionExpression: 'tenantId = :tid AND EntityType = :et',
                ExpressionAttributeValues: { ':tid': tenantId, ':et': 'PAYMENT' },
                Select: 'COUNT'
            }))
        ]);
        return res(200, {
            totalPatients: patients.Item?.total || 0,
            totalDoctors:  doctors.Item?.total  || 0,
            totalExams:    exams.Count          || 0,
            totalInvoices: invoices.Count       || 0
        });
    }

    // ── GET /admin/users — scoped to caller's tenant (Step 2d) ────────────────
    if (method === 'GET' && path.endsWith('/users')) {
        const limit  = parseInt(qs.limit || '60', 10);
        const token  = qs.nextToken || undefined;
        const filter = qs.filter    || undefined;

        // Cognito's ListUsers Filter does not support custom attributes, so we
        // page through and drop users from other tenants client-side.
        const cmdParams = { UserPoolId: USER_POOL_ID, Limit: limit };
        if (token)  cmdParams.PaginationToken = token;
        if (filter) cmdParams.Filter          = filter;

        const result = await cognito.send(new ListUsersCommand(cmdParams));

        const users = (result.Users || [])
            .filter(u => {
                const t = u.Attributes?.find(a => a.Name === 'custom:tenantId')?.Value;
                return t === tenantId;
            })
            .map(u => {
                const attr = (name) => u.Attributes?.find(a => a.Name === name)?.Value || '';
                return {
                    username: u.Username,
                    email:    attr('email'),
                    name:     attr('name'),
                    sub:      attr('sub'),
                    status:   u.UserStatus,
                    enabled:  u.Enabled,
                    created:  u.UserCreateDate,
                    modified: u.UserLastModifiedDate,
                    groups:   []
                };
            });

        await Promise.all(users.map(async (u) => {
            try {
                const userGroups = [];
                for (const group of ['Admin', 'Developers', 'Doctors', 'Pharmacists']) {
                    const r = await cognito.send(new ListUsersInGroupCommand({
                        UserPoolId: USER_POOL_ID,
                        GroupName:  group,
                        Limit:      60
                    }));
                    if ((r.Users || []).some(gu => gu.Username === u.username)) {
                        userGroups.push(group);
                    }
                }
                u.groups = userGroups;
            } catch (_) {}
        }));

        return res(200, { users, nextToken: result.PaginationToken || null });
    }

    // ── POST /admin/users/{username}/disable ──────────────────────────────────
    if (method === 'POST' && path.includes('/disable')) {
        const cid = getClientRequestId(event);
        const cached = await checkIdempotency(cid);
        if (cached) return cached;
        const username = params.username;
        if (!username) return err(400, 'username is required');
        // Step 2d — admin can only disable users in their own tenant.
        if (!(await verifyUserTenant(username))) return err(404, 'User not found');
        await cognito.send(new AdminDisableUserCommand({ UserPoolId: USER_POOL_ID, Username: username }));
        const response = res(200, { message: `User ${username} disabled successfully` });
        await storeIdempotency(cid, response);
        return response;
    }

    // ── POST /admin/users/{username}/enable ───────────────────────────────────
    if (method === 'POST' && path.includes('/enable')) {
        const cid = getClientRequestId(event);
        const cached = await checkIdempotency(cid);
        if (cached) return cached;
        const username = params.username;
        if (!username) return err(400, 'username is required');
        if (!(await verifyUserTenant(username))) return err(404, 'User not found');
        await cognito.send(new AdminEnableUserCommand({ UserPoolId: USER_POOL_ID, Username: username }));
        const response = res(200, { message: `User ${username} enabled successfully` });
        await storeIdempotency(cid, response);
        return response;
    }

    // ── POST /admin/users/{username}/set-password ─────────────────────────────
    if (method === 'POST' && path.includes('/set-password')) {
        const cid = getClientRequestId(event);
        const cached = await checkIdempotency(cid);
        if (cached) return cached;
        const body     = JSON.parse(event.body || '{}');
        const username = params.username;
        const password = body.password;
        if (!username) return err(400, 'username is required');
        if (!password) return err(400, 'password is required');
        if (password.length < 8) return err(400, 'Password must be at least 8 characters');
        if (!(await verifyUserTenant(username))) return err(404, 'User not found');

        await cognito.send(new AdminSetUserPasswordCommand({
            UserPoolId: USER_POOL_ID,
            Username:   username,
            Password:   password,
            Permanent:  false
        }));
        const response = res(200, { message: `Temporary password set for ${username}. User must change it on next login.` });
        await storeIdempotency(cid, response);
        return response;
    }

    // ── PATCH /admin/users/{username}/email  (Step C.5) ──────────────────────
    // Change a user's email end-to-end:
    //   1. Validate caller is admin in the same tenant as the user.
    //   2. Update Cognito attribute `email` + `email_verified=true`.
    //   3. Update the doctor profile row's `email` field in DynamoDB.
    //   4. Refresh the `emailHash` (HMAC under tenant key) so the search
    //      index points to the new email.
    //   5. Write an audit row capturing the before/after email (HIPAA — the
    //      audit row keeps the OLD email as the historical record).
    //
    // Nothing else needs updating because Step C.3 made `doctorId` the
    // canonical foreign key everywhere; email is just a display attribute.
    if (method === 'PATCH' && /\/admin\/users\/[^/]+\/email$/.test(path)) {
        const cid = getClientRequestId(event);
        const cached = await checkIdempotency(cid);
        if (cached) return cached;

        const body     = JSON.parse(event.body || '{}');
        const username = params.username;
        const newEmail = (body.newEmail || '').toLowerCase().trim();

        if (!username)      return err(400, 'username is required');
        if (!newEmail)      return err(400, 'newEmail is required');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail))
                            return err(400, 'newEmail format is invalid');
        if (!(await verifyUserTenant(username))) return err(404, 'User not found');

        // ── Fetch the Cognito user to know the OLD email + sub ───────────
        const { Users } = await cognito.send(new ListUsersCommand({
            UserPoolId: USER_POOL_ID,
            Filter: `username = "${username}"`,
            Limit: 1
        }));
        const u = (Users || [])[0];
        if (!u) return err(404, 'User not found');
        const attrs   = Object.fromEntries((u.Attributes || []).map(a => [a.Name, a.Value]));
        const oldEmail = (attrs.email || '').toLowerCase().trim();
        if (oldEmail === newEmail) return res(200, { message: 'Email unchanged', email: oldEmail });

        // ── Update Cognito attribute ──────────────────────────────────────
        await cognito.send(new AdminUpdateUserAttributesCommand({
            UserPoolId: USER_POOL_ID,
            Username:   username,
            UserAttributes: [
                { Name: 'email',          Value: newEmail },
                { Name: 'email_verified', Value: 'true'   }
            ]
        }));

        // ── Update the doctor profile row (if this user is a doctor) ──────
        // Doctor rows have PK = DOCTOR#<doctorId>, attribute email = <addr>.
        // We resolve the doctor by the OLD email, then update.
        let doctorProfileUpdated = false;
        try {
            const r = await db.send(new QueryCommand({
                TableName: TABLE_NAME,
                IndexName: 'tenant-entityType-index',
                KeyConditionExpression: 'tenantId = :tid AND EntityType = :et',
                FilterExpression: '#sk = :sk AND #em = :em',
                ExpressionAttributeNames:  { '#sk': 'SK', '#em': 'email' },
                ExpressionAttributeValues: {
                    ':tid': tenantId, ':et': 'DOCTOR', ':sk': 'PROFILE', ':em': oldEmail
                }
            }));
            const doctor = (r.Items || [])[0];
            if (doctor) {
                // Recompute the emailHash with this tenant's HMAC key.
                // crypto.computeHmac resolves the key ARN from env var first
                // then falls back to the DDB TENANT row — so this works for
                // both static (Tiryaq/Alshifaa) and wizard-onboarded tenants.
                let emailHash = null;
                try { emailHash = await crypto.computeHmac(newEmail, tenantId); }
                catch (_) { /* no HMAC key for this tenant — skip hash update */ }
                await db.send(new UpdateCommand({
                    TableName: TABLE_NAME,
                    Key: { PK: doctor.PK, SK: doctor.SK },
                    UpdateExpression: emailHash
                        ? 'SET #em = :em, emailHash = :h, updatedAt = :now'
                        : 'SET #em = :em, updatedAt = :now',
                    ExpressionAttributeNames:  { '#em': 'email' },
                    ExpressionAttributeValues: emailHash
                        ? { ':em': newEmail, ':h': emailHash, ':now': new Date().toISOString() }
                        : { ':em': newEmail, ':now': new Date().toISOString() }
                }));
                doctorProfileUpdated = true;
            }
        } catch (_) { /* doctor row update is best-effort */ }

        // ── Write audit row (HIPAA — old email preserved forever) ────────
        const callerClaims = event.requestContext?.authorizer?.jwt?.claims || {};
        const actorEmail   = callerClaims.email || 'unknown';
        const actorName    = callerClaims.name  || 'unknown';
        const now          = new Date().toISOString();
        try {
            const auditId = require('crypto').randomUUID();
            await db.send(new PutCommand({
                TableName: TABLE_NAME,
                Item: {
                    PK:           `AUDIT#${now.slice(0, 10)}`,
                    SK:           `AUDIT#${now}#${auditId}`,
                    auditId,
                    EntityType:   'AUDIT',
                    tenantId,
                    action:       'ADMIN_CHANGE_USER_EMAIL',
                    entityType:   'USER',
                    entityId:     username,
                    actorEmail,
                    actorName,
                    timestamp:    now,
                    // Plain metadata — emails are NOT PHI on their own and
                    // the audit log needs both for compliance. Doctor email
                    // here is the staff identifier, not patient data.
                    before:       JSON.stringify({ email: oldEmail }),
                    after:        JSON.stringify({ email: newEmail })
                }
            }));
        } catch (_) { /* audit best-effort */ }

        const response = res(200, {
            message:              'Email updated',
            username,
            oldEmail,
            newEmail,
            doctorProfileUpdated
        });
        await storeIdempotency(cid, response);
        return response;
    }

    // ── GET /admin/audit ──────────────────────────────────────────────────────
    if (method === 'GET' && path.endsWith('/audit')) {
        const date       = qs.date       || new Date().toISOString().slice(0, 10);
        const entityType = qs.entityType || null;
        const entityId   = qs.entityId   || null;
        const action     = qs.action     || null;
        const actor      = qs.actor      || null;
        const limit      = parseInt(qs.limit || '100', 10);

        const filterParts  = [];
        const filterNames  = {};
        const filterValues = { ':pk': `AUDIT#${date}`, ':prefix': 'AUDIT#' };

        if (entityType) { filterParts.push('#entityType = :et');  filterNames['#entityType'] = 'entityType'; filterValues[':et']  = entityType; }
        if (entityId)   { filterParts.push('#entityId = :eid');   filterNames['#entityId']   = 'entityId';   filterValues[':eid'] = entityId; }
        if (action)     { filterParts.push('#action = :act');     filterNames['#action']     = 'action';     filterValues[':act'] = action; }
        if (actor)      { filterParts.push('#actorEmail = :ae');  filterNames['#actorEmail'] = 'actorEmail'; filterValues[':ae']  = actor; }
        // Step 2d — always scope to caller's tenant.
        filterParts.push('#__tid = :__tid');
        filterNames['#__tid'] = 'tenantId';
        filterValues[':__tid'] = tenantId;

        const query = {
            TableName:                 TABLE_NAME,
            KeyConditionExpression:    'PK = :pk AND begins_with(SK, :prefix)',
            ExpressionAttributeValues: filterValues,
            Limit:                     limit,
            ScanIndexForward:          false
        };
        if (filterParts.length > 0) {
            query.FilterExpression         = filterParts.join(' AND ');
            query.ExpressionAttributeNames = filterNames;
        }

        const result = await db.send(new QueryCommand(query));
        // Defence-in-depth — drop anything not belonging to caller's tenant.
        const items = (result.Items || []).filter(i => i.tenantId === tenantId);
        return res(200, { date, count: items.length, items });
    }

    return err(400, 'Unknown route');
};// hash-bust 2026-06-21T14:07:44.7504132+03:00
// hash-bust 2026-06-21T14:14:23.7665133+03:00
// hash-bust 2026-06-21T14:28:24.0064697+03:00
// hash-bust admin-email-hmac-fix 2026-06-23T18:40:57.6694186+03:00

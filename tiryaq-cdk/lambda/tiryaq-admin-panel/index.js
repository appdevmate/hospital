const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
    DynamoDBDocumentClient,
    GetCommand,
    QueryCommand,
    UpdateCommand
} = require('@aws-sdk/lib-dynamodb');
const {
    CognitoIdentityProviderClient,
    ListUsersCommand,
    ListUsersInGroupCommand,
    AdminDisableUserCommand,
    AdminEnableUserCommand,
    AdminSetUserPasswordCommand
} = require('@aws-sdk/client-cognito-identity-provider');

const REGION       = 'us-east-1';
const TABLE_NAME   = process.env.TABLE_NAME || 'Hospital';
const USER_POOL_ID = process.env.USER_POOL_ID;

const db      = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const cognito = new CognitoIdentityProviderClient({ region: REGION });

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
    const method = event.requestContext?.http?.method || event.httpMethod;
    const path   = event.rawPath || event.path || '';
    const qs     = event.queryStringParameters || {};
    const params = event.pathParameters || {};

    if (method === 'OPTIONS') return res(200, {});
    if (!isAdmin(event))      return err(403, 'Access denied: admin only');

    // ── GET /admin/stats ──────────────────────────────────────────────────────
    if (method === 'GET' && path.endsWith('/stats')) {
        const [patients, doctors, exams, invoices] = await Promise.all([
            db.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: 'COUNTER#PATIENTS', SK: 'TOTAL' } })),
            db.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: 'COUNTER#DOCTORS',  SK: 'TOTAL' } })),
            db.send(new QueryCommand({
                TableName: TABLE_NAME, IndexName: 'EntityType-index',
                KeyConditionExpression: 'EntityType = :et',
                ExpressionAttributeValues: { ':et': 'EXAMINATION' },
                Select: 'COUNT'
            })),
            db.send(new QueryCommand({
                TableName: TABLE_NAME, IndexName: 'EntityType-index',
                KeyConditionExpression: 'EntityType = :et',
                ExpressionAttributeValues: { ':et': 'PAYMENT' },
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

    // ── GET /admin/users ──────────────────────────────────────────────────────
    if (method === 'GET' && path.endsWith('/users')) {
        const limit  = parseInt(qs.limit || '60', 10);
        const token  = qs.nextToken || undefined;
        const filter = qs.filter    || undefined;

        const cmdParams = { UserPoolId: USER_POOL_ID, Limit: limit };
        if (token)  cmdParams.PaginationToken = token;
        if (filter) cmdParams.Filter          = filter;

        const result = await cognito.send(new ListUsersCommand(cmdParams));

        const users = (result.Users || []).map(u => {
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
        const username = params.username;
        if (!username) return err(400, 'username is required');
        await cognito.send(new AdminDisableUserCommand({ UserPoolId: USER_POOL_ID, Username: username }));
        return res(200, { message: `User ${username} disabled successfully` });
    }

    // ── POST /admin/users/{username}/enable ───────────────────────────────────
    if (method === 'POST' && path.includes('/enable')) {
        const username = params.username;
        if (!username) return err(400, 'username is required');
        await cognito.send(new AdminEnableUserCommand({ UserPoolId: USER_POOL_ID, Username: username }));
        return res(200, { message: `User ${username} enabled successfully` });
    }

    // ── POST /admin/users/{username}/set-password ─────────────────────────────
    if (method === 'POST' && path.includes('/set-password')) {
        const body     = JSON.parse(event.body || '{}');
        const username = params.username;
        const password = body.password;
        if (!username) return err(400, 'username is required');
        if (!password) return err(400, 'password is required');
        if (password.length < 8) return err(400, 'Password must be at least 8 characters');

        await cognito.send(new AdminSetUserPasswordCommand({
            UserPoolId: USER_POOL_ID,
            Username:   username,
            Password:   password,
            Permanent:  false
        }));
        return res(200, { message: `Temporary password set for ${username}. User must change it on next login.` });
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
        return res(200, { date, count: (result.Items || []).length, items: result.Items || [] });
    }

    return err(400, 'Unknown route');
};
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const ddb = DynamoDBDocumentClient.from(client);

const TABLE = 'Hospital';
const GSI   = 'doctorEmail-createdAt-index';

const encodeLEK = (obj) => obj ? Buffer.from(JSON.stringify(obj)).toString('base64') : null;
const decodeLEK = (s)   => s   ? JSON.parse(Buffer.from(s, 'base64').toString('utf8')) : undefined;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// Identify the caller from the JWT so invoice scoping is enforced server-side
// (never trust the client to pass its own doctorEmail filter).
function getCaller(event) {
    const claims = event.requestContext?.authorizer?.jwt?.claims
                || event.requestContext?.authorizer?.claims || {};
    const groupsRaw = claims['cognito:groups'] || '';
    const groups = Array.isArray(groupsRaw)
        ? groupsRaw
        : String(groupsRaw).trim().replace(/^\[/, '').replace(/\]$/, '').split(/[,\s]+/).filter(Boolean);
    return {
        email:    (claims['email'] || claims['username'] || '').toLowerCase().trim(),
        isAdmin:  groups.some(g => ['Admin', 'admin', 'Developers', 'Developer', 'developer'].includes(g.trim())),
        isDoctor: groups.some(g => ['Doctors', 'Doctor', 'doctor'].includes(g.trim()))
    };
}

exports.handler = async (event) => {
    if (event && event._warmup) return { ok: true, warmed: true };
    try {
        const q        = event.queryStringParameters || {};
        const caller   = getCaller(event);
        const pageSize = clamp(parseInt(q.pageSize, 10) || 100, 1, 500);
        const lastKey  = decodeLEK(q.lastKey || null);

        // Scoping rule:
        //   Doctor (not admin/dev) → FORCE doctorEmail to the caller's own email,
        //                            ignoring any client-supplied value.
        //   Admin / Developer      → optional ?doctorEmail= filter, else see all.
        let doctorEmail;
        if (caller.isDoctor && !caller.isAdmin) {
            doctorEmail = caller.email;
        } else {
            doctorEmail = q.doctorEmail ? q.doctorEmail.toLowerCase().trim() : null;
        }

        let items = [];
        let lastEvaluatedKey;

        if (doctorEmail) {
            // ── Doctor role: query GSI by doctorEmail ──────────────────
            const result = await ddb.send(new QueryCommand({
                TableName:                 TABLE,
                IndexName:                 GSI,
                KeyConditionExpression:    'doctorEmail = :email',
                FilterExpression:          'EntityType = :type',
                ExpressionAttributeValues: { ':email': doctorEmail, ':type': 'PAYMENT' },
                ExclusiveStartKey:         lastKey,
                ScanIndexForward:          false
            }));
            items            = result.Items || [];
            lastEvaluatedKey = result.LastEvaluatedKey;

        } else {
            // ── Admin role: Query EntityType-index (NOT a full table scan)
            // The previous implementation did a full DynamoDB Scan + filter,
            // which times out at ~30 s once the table holds more than a few
            // hundred thousand rows of any entity type.
            const result = await ddb.send(new QueryCommand({
                TableName:                 TABLE,
                IndexName:                 'EntityType-index',
                KeyConditionExpression:    'EntityType = :type',
                ExpressionAttributeValues: { ':type': 'PAYMENT' },
                Limit:                     pageSize,
                ExclusiveStartKey:         lastKey,
                ScanIndexForward:          false
            }));
            items            = result.Items || [];
            lastEvaluatedKey = result.LastEvaluatedKey;
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data:    items,
                count:   items.length,
                lastKey: encodeLEK(lastEvaluatedKey),
                hasMore: !!lastEvaluatedKey
            })
        };

    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to fetch invoices.', error: err.message })
        };
    }
};
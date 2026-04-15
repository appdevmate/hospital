const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const ddb = DynamoDBDocumentClient.from(client);

const TABLE = 'Hospital';
const GSI   = 'doctorEmail-createdAt-index';

const encodeLEK = (obj) => obj ? Buffer.from(JSON.stringify(obj)).toString('base64') : null;
const decodeLEK = (s)   => s   ? JSON.parse(Buffer.from(s, 'base64').toString('utf8')) : undefined;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

exports.handler = async (event) => {
    try {
        const q           = event.queryStringParameters || {};
        const doctorEmail = q.doctorEmail ? q.doctorEmail.toLowerCase().trim() : null;
        const pageSize    = clamp(parseInt(q.pageSize, 10) || 100, 1, 500);
        const lastKey     = decodeLEK(q.lastKey || null);

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
            // ── Admin role: scan all payments, collect until pageSize ───
            // We loop because Scan Limit counts scanned items not matched items
            let collected = [];
            let startKey  = lastKey;

            do {
                const result = await ddb.send(new ScanCommand({
                    TableName:                 TABLE,
                    FilterExpression:          'EntityType = :type',
                    ExpressionAttributeValues: { ':type': 'PAYMENT' },
                    Limit:                     pageSize * 3, // over-fetch to compensate for filtering
                    ExclusiveStartKey:         startKey
                }));

                collected.push(...(result.Items || []));
                startKey         = result.LastEvaluatedKey;
                lastEvaluatedKey = result.LastEvaluatedKey;

                if (collected.length >= pageSize) break;
                if (!startKey) break;

            } while (collected.length < pageSize);

            items = collected.slice(0, pageSize);
            // If we have more items than pageSize, there's definitely more
            if (collected.length > pageSize) lastEvaluatedKey = lastEvaluatedKey;
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
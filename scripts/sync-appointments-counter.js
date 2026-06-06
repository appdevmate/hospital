/* eslint-disable no-console */
/**
 * One-shot: count all APPOINTMENT rows in the Hospital table and write
 * COUNTER#APPOINTMENTS/TOTAL with the result. Run this once after any bulk
 * seed/cleanup so the appointments table shows the right total.
 *
 * Usage:
 *   node sync-appointments-counter.js
 *   node sync-appointments-counter.js --region us-east-1 --table Hospital
 */

'use strict';

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

function parseArgs(argv) {
    const out = {};
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i]; if (!a.startsWith('--')) continue;
        const k = a.slice(2), n = argv[i + 1];
        if (n === undefined || n.startsWith('--')) out[k] = true; else { out[k] = n; i++; }
    }
    return out;
}
const args   = parseArgs(process.argv.slice(2));
const REGION = args.region || process.env.AWS_REGION || 'us-east-1';
const TABLE  = args.table  || 'Hospital';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

(async () => {
    let total = 0;
    let last;
    const t0 = Date.now();
    process.stdout.write('Counting APPOINTMENT rows…');
    do {
        const r = await ddb.send(new QueryCommand({
            TableName: TABLE,
            IndexName: 'EntityType-index',
            KeyConditionExpression: 'EntityType = :et',
            ExpressionAttributeValues: { ':et': 'APPOINTMENT' },
            Select: 'COUNT',
            ExclusiveStartKey: last
        }));
        total += r.Count || 0;
        last = r.LastEvaluatedKey;
        process.stdout.write(`\rCounted ${total.toLocaleString()}…`);
    } while (last);

    console.log(`\nTotal: ${total.toLocaleString()} (${((Date.now() - t0)/1000).toFixed(1)}s)`);
    await ddb.send(new PutCommand({
        TableName: TABLE,
        Item: {
            PK: 'COUNTER#APPOINTMENTS', SK: 'TOTAL',
            EntityType: 'COUNTER',
            total,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
        }
    }));
    console.log('Counter row written.');
})().catch((e) => { console.error(e); process.exit(1); });

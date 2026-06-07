/* eslint-disable no-console */
/**
 * Delete every DOCTOR row from the Hospital table together with the matching
 * EMAIL / QID / PHONE locks so emails can be reused later.
 *
 * Usage:
 *   node delete-all-doctors.js --dry-run   # show what would delete
 *   node delete-all-doctors.js             # delete for real
 */
'use strict';
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, DeleteCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const DRY = process.argv.includes('--dry-run');
const REGION = process.env.AWS_REGION || 'us-east-1';
const TABLE  = 'Hospital';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

async function listDoctors() {
    const items = [];
    let last;
    do {
        const r = await ddb.send(new QueryCommand({
            TableName: TABLE,
            IndexName: 'EntityType-index',
            KeyConditionExpression: 'EntityType = :et',
            ExpressionAttributeValues: { ':et': 'DOCTOR' },
            ExclusiveStartKey: last
        }));
        for (const it of (r.Items || [])) items.push(it);
        last = r.LastEvaluatedKey;
    } while (last);
    return items;
}

async function del(pk, sk) {
    if (DRY) { console.log(`(dry) DELETE ${pk} / ${sk}`); return; }
    await ddb.send(new DeleteCommand({ TableName: TABLE, Key: { PK: pk, SK: sk } }));
    console.log(`DELETED ${pk} / ${sk}`);
}

(async () => {
    const doctors = await listDoctors();
    console.log(`Found ${doctors.length} doctor(s).`);

    for (const d of doctors) {
        // Profile row
        await del(d.PK, 'PROFILE');
        // Email / QID / phone locks (best-effort — ignore missing)
        if (d.email) await del(`EMAIL#${String(d.email).toLowerCase().trim()}`, 'LOCK').catch(() => {});
        if (d.qid)   await del(`QID#${String(d.qid).replace(/\D/g, '')}`, 'LOCK').catch(() => {});
        if (d.phone) await del(`PHONE#${String(d.phone).replace(/[^\d+]/g, '')}`, 'LOCK').catch(() => {});
    }

    // Reset the counter row.
    if (!DRY) {
        await ddb.send(new UpdateCommand({
            TableName: TABLE,
            Key: { PK: 'COUNTER#DOCTORS', SK: 'TOTAL' },
            UpdateExpression: 'SET #t = :z, updatedAt = :u',
            ExpressionAttributeNames: { '#t': 'total' },
            ExpressionAttributeValues: { ':z': 0, ':u': new Date().toISOString() }
        }));
        console.log('COUNTER#DOCTORS reset to 0');
    }
})().catch(e => { console.error(e); process.exit(1); });

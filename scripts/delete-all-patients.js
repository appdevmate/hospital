/* eslint-disable no-console */
/**
 * Delete every PATIENT row from the Hospital table together with the matching
 * QID / PHONE locks so values can be reused later.
 *
 * Usage:
 *   node delete-all-patients.js --dry-run   # show what would delete
 *   node delete-all-patients.js             # delete for real
 */
'use strict';
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, DeleteCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const DRY = process.argv.includes('--dry-run');
const REGION = process.env.AWS_REGION || 'us-east-1';
const TABLE  = 'Hospital';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

async function listPatients() {
    const items = [];
    let last;
    do {
        const r = await ddb.send(new QueryCommand({
            TableName: TABLE,
            IndexName: 'EntityType-index',
            KeyConditionExpression: 'EntityType = :et',
            ExpressionAttributeValues: { ':et': 'PATIENT' },
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
    const patients = await listPatients();
    console.log(`Found ${patients.length} patient(s).`);

    for (const p of patients) {
        // Profile row
        await del(p.PK, 'PROFILE');
        // Uniqueness locks (patients have QID + PHONE; no email lock).
        if (p.qid)   await del(`QID#${String(p.qid).replace(/\D/g, '')}`, 'LOCK').catch(() => {});
        if (p.phone) await del(`PHONE#${String(p.phone).replace(/[^\d+]/g, '')}`, 'LOCK').catch(() => {});
    }

    // Reset the counter row so the dashboard total goes back to zero.
    if (!DRY) {
        await ddb.send(new UpdateCommand({
            TableName: TABLE,
            Key: { PK: 'COUNTER#PATIENTS', SK: 'TOTAL' },
            UpdateExpression: 'SET #t = :z, updatedAt = :u',
            ExpressionAttributeNames: { '#t': 'total' },
            ExpressionAttributeValues: { ':z': 0, ':u': new Date().toISOString() }
        }));
        console.log('COUNTER#PATIENTS reset to 0');
    }
})().catch(e => { console.error(e); process.exit(1); });

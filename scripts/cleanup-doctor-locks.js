/* eslint-disable no-console */
/**
 * Delete EMAIL_LOCK / QID_LOCK / PHONE_LOCK rows whose pointed-at
 * DOCTOR# row no longer exists (so retries can re-use that email/qid/phone).
 *
 * Usage:
 *   node cleanup-doctor-locks.js --dry-run    # show what would delete
 *   node cleanup-doctor-locks.js              # delete for real
 */

'use strict';
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, GetCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const REGION = process.env.AWS_REGION || 'us-east-1';
const TABLE  = 'Hospital';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

async function listLocks(type) {
    const items = [];
    let last;
    do {
        const r = await ddb.send(new QueryCommand({
            TableName: TABLE,
            IndexName: 'EntityType-index',
            KeyConditionExpression: 'EntityType = :et',
            ExpressionAttributeValues: { ':et': type },
            ExclusiveStartKey: last
        }));
        for (const it of (r.Items || [])) items.push(it);
        last = r.LastEvaluatedKey;
    } while (last);
    return items;
}

async function doctorExists(pk) {
    if (!pk) return false;
    try {
        const r = await ddb.send(new GetCommand({ TableName: TABLE, Key: { PK: pk, SK: 'PROFILE' } }));
        return !!r.Item && !r.Item.deletedAt;
    } catch (_) { return false; }
}

(async () => {
    let removed = 0;
    for (const type of ['EMAIL_LOCK', 'QID_LOCK', 'PHONE_LOCK']) {
        const locks = await listLocks(type);
        for (const lock of locks) {
            const ok = await doctorExists(lock.doctorPK);
            if (ok) continue;
            console.log(`${DRY ? '(dry)' : 'DEL'} ${type}  ${lock.PK}  -> ${lock.doctorPK || '(none)'}`);
            if (!DRY) {
                await ddb.send(new DeleteCommand({ TableName: TABLE, Key: { PK: lock.PK, SK: lock.SK } }));
                removed++;
            }
        }
    }
    console.log(`\nDone. Orphan locks ${DRY ? 'found' : 'removed'}: ${removed || (DRY ? 'see above' : 0)}`);
})().catch(e => { console.error(e); process.exit(1); });

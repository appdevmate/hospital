/* eslint-disable no-console */
/**
 * Delete all appointment rows that were created by `seed-appointments.js`.
 *
 * Safe filter: only deletes rows where
 *     EntityType = 'APPOINTMENT'   AND   createdBy = 'seed-script'
 * Real appointments (created via the app / API) have createdBy = an email,
 * so they will NOT be touched.
 *
 * After this script runs, you should re-sync the COUNTER#APPOINTMENTS row:
 *     node sync-appointments-counter.js
 *
 * Usage:
 *   node delete-seeded-appointments.js                    # delete for real
 *   node delete-seeded-appointments.js --dry-run          # count only
 *   node delete-seeded-appointments.js --keep 2           # leave 2 for testing
 */

'use strict';

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
    DynamoDBDocumentClient,
    ScanCommand,
    BatchWriteCommand
} = require('@aws-sdk/lib-dynamodb');

const REGION = 'us-east-1';
const TABLE  = 'Hospital';
const SEGMENTS = 4;
const BATCH   = 25; // BatchWriteItem max

const DRY_RUN = process.argv.includes('--dry-run');
const keepIdx = process.argv.indexOf('--keep');
const KEEP   = keepIdx > -1 ? Number(process.argv[keepIdx + 1] || 0) : 0;

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

let kept = 0;

async function batchDelete(keys) {
    // Retry unprocessed items with simple backoff.
    let req = {
        RequestItems: { [TABLE]: keys.map(k => ({ DeleteRequest: { Key: k } })) }
    };
    for (let attempt = 0; attempt < 6; attempt++) {
        const r = await ddb.send(new BatchWriteCommand(req));
        const un = r.UnprocessedItems && r.UnprocessedItems[TABLE];
        if (!un || un.length === 0) return;
        req = { RequestItems: { [TABLE]: un } };
        await new Promise(res => setTimeout(res, 100 * 2 ** attempt));
    }
    throw new Error('BatchWrite: gave up after retries');
}

async function deleteSegment(segment) {
    let totalScanned = 0;
    let totalDeleted = 0;
    let lastKey;
    let buffer = [];

    do {
        const r = await ddb.send(new ScanCommand({
            TableName: TABLE,
            Segment: segment,
            TotalSegments: SEGMENTS,
            ExclusiveStartKey: lastKey,
            ProjectionExpression: 'PK, SK',
            FilterExpression: '#et = :et AND #cb = :cb',
            ExpressionAttributeNames: { '#et': 'EntityType', '#cb': 'createdBy' },
            ExpressionAttributeValues: { ':et': 'APPOINTMENT', ':cb': 'seed-script' }
        }));

        for (const item of r.Items || []) {
            totalScanned++;
            // Skip the first KEEP matches globally (cross-segment best-effort).
            if (kept < KEEP) { kept++; continue; }

            buffer.push({ PK: item.PK, SK: item.SK });

            if (buffer.length >= BATCH) {
                if (!DRY_RUN) await batchDelete(buffer);
                totalDeleted += buffer.length;
                buffer = [];
            }
        }

        if (totalScanned > 0 && Math.floor(totalScanned / 10000) !== Math.floor((totalScanned - (r.Items || []).length) / 10000)) {
            console.log(`  seg ${segment}: scanned=${totalScanned} deleted=${totalDeleted}`);
        }

        lastKey = r.LastEvaluatedKey;
    } while (lastKey);

    // Flush remaining
    if (buffer.length) {
        if (!DRY_RUN) await batchDelete(buffer);
        totalDeleted += buffer.length;
    }

    return { totalScanned, totalDeleted };
}

(async () => {
    console.log(`Deleting seeded appointments (EntityType=APPOINTMENT, createdBy=seed-script).`);
    console.log(`Segments=${SEGMENTS}  Batch=${BATCH}  DRY_RUN=${DRY_RUN}  KEEP=${KEEP}`);

    const t0 = Date.now();
    const segs = await Promise.all(
        Array.from({ length: SEGMENTS }, (_, i) => deleteSegment(i))
    );

    const totals = segs.reduce(
        (a, s) => ({ scanned: a.scanned + s.totalScanned, deleted: a.deleted + s.totalDeleted }),
        { scanned: 0, deleted: 0 }
    );

    console.log('—'.repeat(50));
    console.log(`Total scanned (seed appointments): ${totals.scanned}`);
    console.log(`Total deleted: ${totals.deleted}${DRY_RUN ? ' (DRY RUN — no writes)' : ''}`);
    console.log(`Kept (per --keep flag):  ${kept}`);
    console.log(`Elapsed: ${Math.round((Date.now() - t0) / 1000)}s`);

    if (!DRY_RUN) {
        console.log('');
        console.log('IMPORTANT: re-sync the COUNTER#APPOINTMENTS row:');
        console.log('  node sync-appointments-counter.js');
    }
})().catch(err => {
    console.error('FAILED:', err);
    process.exit(1);
});

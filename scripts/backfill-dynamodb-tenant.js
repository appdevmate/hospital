/**
 * Step 2c — Backfill `tenantId` onto every existing row that belongs to a
 * tenant (PHI rows, doctor rows, appointments, etc.).
 *
 * All current data belongs to Tiryaq Hospital (the original pilot customer)
 * so we assign every per-tenant row to `T_<tiryaq-id>`.
 *
 * Idempotent: uses `attribute_not_exists(tenantId)` filter, so rows already
 * processed are skipped on re-run.
 *
 * Skipped (system rows that belong to no tenant):
 *   - IDEMP#*       (idempotency cache)
 *   - QID#*, PHONE#*, EMAIL#*   (uniqueness locks)
 *   - COUNTER#*     (legacy global counters — replaced per-tenant in 2d)
 *   - TENANT#*      (tenant profile rows themselves)
 *   - EntityType ∈ { IDEMPOTENCY, QID_LOCK, PHONE_LOCK, EMAIL_LOCK, TENANT }
 *
 * Performance:
 *   - Uses parallel Scan with 4 segments.
 *   - Issues one UpdateItem per row (safe; doesn't trample other fields).
 *   - On a 1M-row table this takes ~5 min on PAY_PER_REQUEST.
 *
 * Usage:
 *   cd scripts
 *   node backfill-dynamodb-tenant.js
 *   node backfill-dynamodb-tenant.js --dry-run    # count only, no writes
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
    DynamoDBDocumentClient,
    ScanCommand,
    UpdateCommand
} = require('@aws-sdk/lib-dynamodb');

const { TENANT_BY_SLUG } = require('./lib/tenant-ids');

const REGION = 'us-east-1';
const TABLE_NAME = 'Hospital';
const SEGMENTS = 4;             // parallel scan segments
const DRY_RUN = process.argv.includes('--dry-run');

// Every existing row in the table belongs to Tiryaq.
const TARGET_TENANT_ID = TENANT_BY_SLUG.tiryaq;

const SKIP_PK_PREFIXES = ['IDEMP#', 'QID#', 'PHONE#', 'EMAIL#', 'COUNTER#', 'TENANT#'];
const SKIP_ENTITY_TYPES = new Set([
    'IDEMPOTENCY', 'QID_LOCK', 'PHONE_LOCK', 'EMAIL_LOCK', 'TENANT'
]);

const client = new DynamoDBClient({ region: REGION });
const dynamo = DynamoDBDocumentClient.from(client);

function isSystemRow(item) {
    const pk = item.PK || '';
    if (SKIP_PK_PREFIXES.some(p => pk.startsWith(p))) return true;
    if (SKIP_ENTITY_TYPES.has(item.EntityType)) return true;
    return false;
}

async function backfillSegment(segment) {
    let totalScanned = 0;
    let totalSkipped = 0;
    let totalUpdated = 0;
    let lastKey;

    do {
        const r = await dynamo.send(new ScanCommand({
            TableName: TABLE_NAME,
            Segment: segment,
            TotalSegments: SEGMENTS,
            ExclusiveStartKey: lastKey,
            ProjectionExpression: 'PK, SK, EntityType, tenantId',
            FilterExpression: 'attribute_not_exists(tenantId)' // already-processed rows skipped
        }));

        for (const item of r.Items || []) {
            totalScanned++;
            if (isSystemRow(item)) {
                totalSkipped++;
                continue;
            }
            if (DRY_RUN) {
                totalUpdated++; // count what we would update
                continue;
            }
            try {
                await dynamo.send(new UpdateCommand({
                    TableName: TABLE_NAME,
                    Key: { PK: item.PK, SK: item.SK },
                    UpdateExpression: 'SET tenantId = :t',
                    ConditionExpression: 'attribute_not_exists(tenantId)', // belt-and-braces
                    ExpressionAttributeValues: { ':t': TARGET_TENANT_ID }
                }));
                totalUpdated++;
            } catch (e) {
                if (e.name !== 'ConditionalCheckFailedException') {
                    console.warn(`update failed PK=${item.PK} SK=${item.SK}: ${e.message}`);
                }
            }
        }

        if (totalScanned > 0 && totalScanned % 5000 === 0) {
            console.log(`  seg ${segment}: scanned=${totalScanned} updated=${totalUpdated} skipped=${totalSkipped}`);
        }

        lastKey = r.LastEvaluatedKey;
    } while (lastKey);

    return { totalScanned, totalSkipped, totalUpdated };
}

(async () => {
    console.log(`Backfill: setting tenantId=${TARGET_TENANT_ID} on all existing per-tenant rows...`);
    console.log(`Parallel scan with ${SEGMENTS} segments. DRY_RUN=${DRY_RUN}`);

    const t0 = Date.now();
    const segs = await Promise.all(
        Array.from({ length: SEGMENTS }, (_, i) => backfillSegment(i))
    );

    const totals = segs.reduce(
        (a, s) => ({
            scanned: a.scanned + s.totalScanned,
            skipped: a.skipped + s.totalSkipped,
            updated: a.updated + s.totalUpdated
        }),
        { scanned: 0, skipped: 0, updated: 0 }
    );

    console.log('—'.repeat(50));
    console.log(`Total scanned: ${totals.scanned}`);
    console.log(`Skipped (system rows): ${totals.skipped}`);
    console.log(`Updated: ${totals.updated}${DRY_RUN ? ' (DRY RUN — no writes)' : ''}`);
    console.log(`Elapsed: ${Math.round((Date.now() - t0) / 1000)}s`);
})().catch(err => {
    console.error('FAILED:', err);
    process.exit(1);
});

#!/usr/bin/env node
/**
 * Akwadona — one-time purge of stale THROTTLE_COUNTER rows.
 *
 * Why this exists (2026-10-29):
 *   throttle.js wrote the expiry into an attribute named `ttl`, but the
 *   Hospital table's TTL attribute is `expiresAt` (see CDK
 *   `timeToLiveAttribute`). DynamoDB therefore never swept a single throttle
 *   counter: one row per tenant per MINUTE plus one per DAY accumulated for
 *   as long as the platform has been live. They are pure garbage, slow down
 *   every Scan, and cost storage.
 *
 *   The code fix (throttle.js now writes `expiresAt`) stops NEW garbage.
 *   This script removes the OLD rows once. It is safe to re-run.
 *
 * What it deletes:
 *   Every item with EntityType = THROTTLE_COUNTER whose `expiresAt` is
 *   missing OR already in the past. Rows with a future `expiresAt` are left
 *   for DynamoDB's own TTL sweeper.
 *
 * Usage:
 *   node scripts/purge-throttle-counters.js            # DRY RUN — counts only
 *   node scripts/purge-throttle-counters.js --apply    # actually delete
 *
 * Requires AWS credentials with dynamodb:Query + dynamodb:BatchWriteItem on
 * the Hospital table (the deploy profile is fine).
 */
'use strict';

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');

const REGION = process.env.AWS_REGION || 'us-east-1';
const TABLE  = process.env.TABLE_NAME || 'Hospital';
const APPLY  = process.argv.includes('--apply');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

async function* staleCounters() {
    let lastKey;
    const nowSec = Math.floor(Date.now() / 1000);
    do {
        const r = await ddb.send(new QueryCommand({
            TableName: TABLE,
            IndexName: 'EntityType-index',
            KeyConditionExpression: '#et = :et',
            // Stale = no expiresAt (legacy `ttl` rows) OR expiresAt in the past.
            FilterExpression: 'attribute_not_exists(#exp) OR #exp < :now',
            ExpressionAttributeNames: { '#et': 'EntityType', '#exp': 'expiresAt' },
            ExpressionAttributeValues: { ':et': 'THROTTLE_COUNTER', ':now': nowSec },
            ProjectionExpression: 'PK, SK',
            ExclusiveStartKey: lastKey
        }));
        for (const it of (r.Items || [])) yield { PK: it.PK, SK: it.SK };
        lastKey = r.LastEvaluatedKey;
    } while (lastKey);
}

async function deleteBatch(keys) {
    // BatchWrite max 25 per call; retry unprocessed with simple backoff.
    let pending = keys.map(Key => ({ DeleteRequest: { Key } }));
    let attempt = 0;
    while (pending.length && attempt < 8) {
        const r = await ddb.send(new BatchWriteCommand({ RequestItems: { [TABLE]: pending } }));
        pending = (r.UnprocessedItems && r.UnprocessedItems[TABLE]) || [];
        if (pending.length) await new Promise(res => setTimeout(res, 100 * 2 ** attempt++));
    }
    if (pending.length) throw new Error(`${pending.length} deletes still unprocessed after retries`);
}

(async () => {
    console.log(`[purge-throttle-counters] table=${TABLE} region=${REGION} mode=${APPLY ? 'APPLY' : 'DRY-RUN'}`);
    let seen = 0, deleted = 0, batch = [];
    for await (const key of staleCounters()) {
        seen++;
        if (!APPLY) continue;
        batch.push(key);
        if (batch.length === 25) { await deleteBatch(batch); deleted += batch.length; batch = []; if (deleted % 500 === 0) console.log(`  deleted ${deleted}…`); }
    }
    if (APPLY && batch.length) { await deleteBatch(batch); deleted += batch.length; }
    console.log(`[purge-throttle-counters] stale rows found: ${seen}${APPLY ? `, deleted: ${deleted}` : ' (re-run with --apply to delete)'}`);
})().catch(e => { console.error('[purge-throttle-counters] FAILED:', e.message); process.exit(1); });

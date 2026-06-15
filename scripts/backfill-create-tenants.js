/**
 * Step 2c — Create tenant profile rows in DynamoDB.
 *
 * One row per hospital customer:
 *   PK = TENANT#<slug>     SK = PROFILE     EntityType = TENANT
 *
 * Idempotent: re-running is safe. If the row already exists, this
 * script preserves its `createdAt` and refreshes the other fields.
 *
 * Usage:
 *   cd scripts
 *   node backfill-create-tenants.js
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
    DynamoDBDocumentClient,
    PutCommand,
    GetCommand
} = require('@aws-sdk/lib-dynamodb');

const { TENANTS } = require('./lib/tenant-ids');

const REGION = 'us-east-1';
const TABLE_NAME = 'Hospital';

const client = new DynamoDBClient({ region: REGION });
const dynamo = DynamoDBDocumentClient.from(client);

const TENANT_METADATA = {
    tiryaq: {
        name: 'Tiryaq Hospital',
        status: 'active',
        plan: 'free',
        contractStart: '2025-01-01',
        notes: 'Original Akwadona pilot customer.'
    },
    alshifaa: {
        name: 'Alshifaa Hospital',
        status: 'active',
        plan: 'free',
        contractStart: '2026-06-12',
        notes: 'Second Akwadona customer.'
    }
};

async function upsertTenant({ slug, tenantId }) {
    const meta = TENANT_METADATA[slug] || { name: slug, status: 'active', plan: 'free' };
    const now = new Date().toISOString();

    // Preserve createdAt if a row already exists.
    let createdAt = now;
    try {
        const existing = await dynamo.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `TENANT#${slug}`, SK: 'PROFILE' }
        }));
        if (existing.Item && existing.Item.createdAt) {
            createdAt = existing.Item.createdAt;
        }
    } catch (_) {}

    await dynamo.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: {
            PK: `TENANT#${slug}`,
            SK: 'PROFILE',
            EntityType: 'TENANT',
            tenantId,
            slug,
            name: meta.name,
            status: meta.status,
            plan: meta.plan,
            contractStart: meta.contractStart || null,
            notes: meta.notes || null,
            // Limits applied by 2g software throttle (operator can edit later).
            limits: {
                rps: 50,                  // Free tier: 50 requests / second
                dailyQuota: 1000,         // Free tier: 1,000 requests / day
                storageGB: 50,            // 50 GB total document storage
                maxUploadMB: 25,          // 25 MB per upload
                uploadsPerMinute: 60
            },
            dataClass: 'TENANT_METADATA', // never PHI
            createdAt,
            updatedAt: now
        }
    }));

    console.log(`Upserted TENANT#${slug.padEnd(10)} → ${tenantId}  (${meta.name})`);
}

(async () => {
    console.log('Backfill: creating tenant profile rows...');
    for (const t of TENANTS) {
        await upsertTenant(t);
    }
    console.log('Done.');
})().catch(err => {
    console.error('FAILED:', err);
    process.exit(1);
});

/* eslint-disable no-console */
/**
 * Step 4f — Backfill HMAC hash fields + recreate locks in hashed format.
 *
 * After Steps 3 and 4, NEW rows are written with qidHash / emailHash /
 * phoneHash alongside encrypted PHI, and locks use hashed PKs. EXISTING
 * rows (created before Step 4) have:
 *   - Encrypted PHI but no hash fields  → searches by email/qid don't work
 *   - Old plaintext lock items (QID#12345, PHONE#+974..., EMAIL#user@...)
 *     instead of hashed locks
 *
 * This script:
 *   1. Scans PATIENT + DOCTOR rows missing `qidHash`.
 *   2. Decrypts the PHI (needs kms:Decrypt on the data key).
 *   3. Computes HMAC hashes via KMS GenerateMac.
 *   4. UpdateItem to add qidHash / emailHash / phoneHash on the row.
 *   5. Recreates lock items at the new hashed PKs.
 *   6. Deletes the old plaintext-PK lock items (only if owned by the
 *      same patient/doctor — defence against orphan-lock deletes).
 *
 * IAM:
 *   The deploy user does NOT have kms:Decrypt or kms:GenerateMac by
 *   default — that's intentional zero-knowledge. Temporarily expand
 *   both key policies (data + HMAC) before running this. Revert after.
 *
 * Usage:
 *   cd scripts
 *   node backfill-hash-search-fields.js --dry-run
 *   node backfill-hash-search-fields.js
 *   node backfill-hash-search-fields.js --entity PATIENT
 */

'use strict';

const crypto = require('crypto');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
    DynamoDBDocumentClient,
    ScanCommand,
    UpdateCommand,
    PutCommand,
    DeleteCommand,
    GetCommand
} = require('@aws-sdk/lib-dynamodb');
const {
    KMSClient,
    DecryptCommand,
    GenerateMacCommand
} = require('@aws-sdk/client-kms');

const REGION = 'us-east-1';
const TABLE  = 'Hospital';

const DRY_RUN = process.argv.includes('--dry-run');
const entityIdx = process.argv.indexOf('--entity');
const ENTITY_FILTER = entityIdx > -1 ? process.argv[entityIdx + 1] : null;

// ── Tenant key maps (mirror of tiryaq-cdk-stack.ts) ──────────────────────────
const TENANT_KEYS = {
    'T_2572fc71': 'arn:aws:kms:us-east-1:483176634665:key/11b1386b-51c2-41ab-b5ba-aa6eb9a0e8a6',
    'T_a4b8aef9': 'arn:aws:kms:us-east-1:483176634665:key/c1c1657b-b3f9-41a9-a816-dee382e00bb1'
};
const TENANT_HMAC_KEYS = {
    'T_2572fc71': 'arn:aws:kms:us-east-1:483176634665:key/601f8aab-f37c-4786-a557-afc12cb864e8',
    'T_a4b8aef9': 'arn:aws:kms:us-east-1:483176634665:key/0a23ea33-4659-4f37-a4a2-a62366010bcd'
};

// Source PHI fields → hash field names per entity
const HASH_MAP = {
    PATIENT: { qid: 'qidHash', email: 'emailHash', phone: 'phoneHash' },
    DOCTOR:  { qid: 'qidHash', email: 'emailHash', phone: 'phoneHash' }
};

// Lock source fields + lock prefix per entity. PATIENT has 2 locks
// (qid, phone) — no email lock for patients. DOCTOR has 3.
const LOCK_MAP = {
    PATIENT: [
        { field: 'qid',   prefix: 'QID' },
        { field: 'phone', prefix: 'PHONE' }
    ],
    DOCTOR: [
        { field: 'qid',   prefix: 'QID' },
        { field: 'phone', prefix: 'PHONE' },
        { field: 'email', prefix: 'EMAIL' }
    ]
};

const TARGET_ENTITY_TYPES = ENTITY_FILTER
    ? [ENTITY_FILTER.toUpperCase()]
    : Object.keys(HASH_MAP);

const ALGORITHM = 'aes-256-gcm';

const kms = new KMSClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

// ── Crypto helpers (mirror of _shared/crypto.js) ─────────────────────────────
async function decryptDek(encryptedDekB64, tenantId) {
    const KeyId = TENANT_KEYS[tenantId];
    const r = await kms.send(new DecryptCommand({
        CiphertextBlob: Buffer.from(encryptedDekB64, 'base64'),
        KeyId
    }));
    return Buffer.from(r.Plaintext);
}

function aesDecrypt(b64, dek) {
    if (!b64) return null;
    const buf = Buffer.from(b64, 'base64');
    if (buf.length < 28) return null;
    const iv  = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ct  = buf.subarray(28);
    const decipher = crypto.createDecipheriv(ALGORITHM, dek, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

function normalizeForHash(v) {
    if (v === null || v === undefined || v === '') return null;
    return typeof v === 'string' ? v.trim().toLowerCase() : String(v);
}

async function computeHmac(value, tenantId) {
    const norm = normalizeForHash(value);
    if (!norm) return null;
    const KeyId = TENANT_HMAC_KEYS[tenantId];
    const r = await kms.send(new GenerateMacCommand({
        KeyId,
        MacAlgorithm: 'HMAC_SHA_256',
        Message: Buffer.from(norm, 'utf8')
    }));
    return Buffer.from(r.Mac).toString('base64');
}

// ── Per-item processing ─────────────────────────────────────────────────────
async function processItem(item) {
    const entityType = item.EntityType;
    if (!entityType || !HASH_MAP[entityType]) return { status: 'skip-not-target' };
    if (item.qidHash) return { status: 'skip-already-hashed' };
    if (!item.tenantId) return { status: 'skip-no-tenant' };
    if (!item._kms_dek) return { status: 'skip-not-encrypted' };

    const tenantId = item.tenantId;
    const hashFields = HASH_MAP[entityType];

    // 1) Decrypt PHI to recover plaintext for hashing.
    const dek = await decryptDek(item._kms_dek, tenantId);
    const plaintext = {};
    try {
        for (const src of Object.keys(hashFields)) {
            if (item[src]) {
                plaintext[src] = aesDecrypt(item[src], dek);
            }
        }
    } finally {
        dek.fill(0);
    }

    // 2) Compute hashes via KMS GenerateMac.
    const hashesToWrite = {};
    for (const [src, hashField] of Object.entries(hashFields)) {
        if (plaintext[src]) {
            hashesToWrite[hashField] = await computeHmac(plaintext[src], tenantId);
        }
    }

    if (Object.keys(hashesToWrite).length === 0) {
        return { status: 'skip-no-fields', entity: entityType };
    }

    if (DRY_RUN) return { status: 'would-update', entity: entityType };

    // 3) UpdateItem to add hash fields on the row.
    try {
        const setParts = Object.keys(hashesToWrite).map((_, i) => `#h${i} = :h${i}`).join(', ');
        const names = Object.fromEntries(Object.keys(hashesToWrite).map((k, i) => [`#h${i}`, k]));
        const values = Object.fromEntries(Object.entries(hashesToWrite).map(([_, v], i) => [`:h${i}`, v]));
        await ddb.send(new UpdateCommand({
            TableName: TABLE,
            Key: { PK: item.PK, SK: item.SK },
            UpdateExpression: 'SET ' + setParts,
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: values,
            ConditionExpression: 'tenantId = :__tid',
            ExpressionAttributeValues: { ...values, ':__tid': tenantId }
        }));
    } catch (e) {
        return { status: 'error', entity: entityType, message: `UpdateItem: ${e.message}` };
    }

    // 4) Recreate locks in hashed format + delete old plaintext locks.
    let locksMigrated = 0;
    for (const { field, prefix } of LOCK_MAP[entityType] || []) {
        const plain = normalizeForHash(plaintext[field]);
        if (!plain) continue;

        const oldPK = `${prefix}#${plain}`;
        const newPK = `${prefix}#${hashesToWrite[hashFields[field]]}`;
        if (oldPK === newPK) continue;

        // Confirm the old lock exists AND belongs to this row.
        const oldLock = await ddb.send(new GetCommand({
            TableName: TABLE, Key: { PK: oldPK, SK: 'LOCK' }
        }));
        if (!oldLock.Item) continue; // no plaintext lock to migrate — skip
        const ownerPK = entityType === 'PATIENT' ? oldLock.Item.patientPK : oldLock.Item.doctorPK;
        if (ownerPK !== item.PK) continue; // safety — don't touch a different row's lock

        // Check new lock doesn't already exist (e.g. from prior partial backfill).
        const newLock = await ddb.send(new GetCommand({
            TableName: TABLE, Key: { PK: newPK, SK: 'LOCK' }
        }));
        if (newLock.Item) {
            // Already migrated. Just clean up the old plaintext lock.
            await ddb.send(new DeleteCommand({
                TableName: TABLE, Key: { PK: oldPK, SK: 'LOCK' }
            }));
            locksMigrated++;
            continue;
        }

        // Put new hashed lock with the same owner reference + tenant.
        const lockBase = { ...oldLock.Item, PK: newPK, SK: 'LOCK', updatedAt: new Date().toISOString() };
        await ddb.send(new PutCommand({
            TableName: TABLE, Item: lockBase,
            ConditionExpression: 'attribute_not_exists(PK)'
        }));
        await ddb.send(new DeleteCommand({
            TableName: TABLE, Key: { PK: oldPK, SK: 'LOCK' }
        }));
        locksMigrated++;
    }

    return { status: 'updated', entity: entityType, locksMigrated };
}

(async () => {
    console.log('Step 4f — backfill HMAC hash fields + migrate locks');
    console.log(`Region: ${REGION}  Table: ${TABLE}`);
    console.log(`Entities: ${TARGET_ENTITY_TYPES.join(', ')}  DRY_RUN: ${DRY_RUN}`);
    console.log('—'.repeat(60));

    const stats = {
        scanned: 0,
        updated: 0,
        'would-update': 0,
        'skip-already-hashed': 0,
        'skip-no-tenant': 0,
        'skip-not-encrypted': 0,
        'skip-not-target': 0,
        'skip-no-fields': 0,
        error: 0,
        locksMigrated: 0
    };

    let lastKey;
    const t0 = Date.now();
    do {
        const r = await ddb.send(new ScanCommand({
            TableName: TABLE,
            ExclusiveStartKey: lastKey,
            FilterExpression: '#et IN (' + TARGET_ENTITY_TYPES.map((_, i) => `:et${i}`).join(',') + ') AND attribute_not_exists(qidHash)',
            ExpressionAttributeNames: { '#et': 'EntityType' },
            ExpressionAttributeValues: Object.fromEntries(
                TARGET_ENTITY_TYPES.map((t, i) => [`:et${i}`, t])
            )
        }));

        for (const item of (r.Items || [])) {
            stats.scanned++;
            const result = await processItem(item);
            stats[result.status] = (stats[result.status] || 0) + 1;
            if (result.locksMigrated) stats.locksMigrated += result.locksMigrated;
            if (result.status === 'error') {
                console.warn(`  ERR ${item.PK} ${item.SK}: ${result.message}`);
            }
        }
        lastKey = r.LastEvaluatedKey;
    } while (lastKey);

    console.log('—'.repeat(60));
    console.log(`Total scanned: ${stats.scanned}`);
    console.log(`Updated:       ${stats.updated}${DRY_RUN ? ` (would-update: ${stats['would-update']} — DRY RUN)` : ''}`);
    console.log(`Skipped already-hashed: ${stats['skip-already-hashed']}`);
    console.log(`Skipped no tenant:      ${stats['skip-no-tenant']}`);
    console.log(`Skipped not encrypted:  ${stats['skip-not-encrypted']}`);
    console.log(`Skipped no hash fields: ${stats['skip-no-fields']}`);
    console.log(`Errors:                 ${stats.error}`);
    console.log(`Locks migrated:         ${stats.locksMigrated}`);
    console.log(`Elapsed: ${Math.round((Date.now() - t0) / 1000)}s`);
})().catch(err => {
    console.error('FAILED:', err);
    process.exit(1);
});

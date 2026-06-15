/* eslint-disable no-console */
/**
 * Step 3f — Encrypt PHI fields on existing plaintext rows.
 *
 * Self-contained: copies the relevant crypto logic so we don't have to
 * cross-import the Lambda master copy (which lives in a different node_modules
 * scope). Update both this file and `tiryaq-cdk/lambda/_shared/crypto.js` if
 * the PHI field list or encryption envelope format changes.
 *
 * Usage:
 *   cd scripts
 *   npm install   # if not already
 *   node backfill-encrypt-phi.js --dry-run
 *   node backfill-encrypt-phi.js
 *   node backfill-encrypt-phi.js --entity PATIENT
 */

'use strict';

const crypto = require('crypto');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
    DynamoDBDocumentClient,
    ScanCommand,
    PutCommand
} = require('@aws-sdk/lib-dynamodb');
const { KMSClient, GenerateDataKeyCommand } = require('@aws-sdk/client-kms');

const REGION = 'us-east-1';
const TABLE  = 'Hospital';

const DRY_RUN = process.argv.includes('--dry-run');
const entityIdx = process.argv.indexOf('--entity');
const ENTITY_FILTER = entityIdx > -1 ? process.argv[entityIdx + 1] : null;

// ── Tenant → KMS key map (mirror of tiryaq-cdk-stack.ts) ─────────────────────
const TENANT_KEYS = {
    'T_2572fc71': 'arn:aws:kms:us-east-1:483176634665:key/11b1386b-51c2-41ab-b5ba-aa6eb9a0e8a6',
    'T_a4b8aef9': 'arn:aws:kms:us-east-1:483176634665:key/c1c1657b-b3f9-41a9-a816-dee382e00bb1'
};

// ── PHI field lists (mirror of _shared/crypto.js) ────────────────────────────
const PHI_BY_ENTITY = {
    PATIENT: [
        'name', 'dob', 'qid', 'phone', 'email',
        'medicalHistory', 'notes', 'allergies', 'medications', 'bloodGroup'
    ],
    DOCTOR: [
        'name', 'dob', 'qid', 'phone', 'email',
        'licenseNumber', 'education', 'notes'
    ],
    APPOINTMENT: [
        'chiefComplaint', 'notes', 'cancelReason'
    ],
    EXAMINATION: [
        'notes', 'diagnosis', 'findings', 'prescription_text', 'chiefComplaint'
    ]
};

const TARGET_ENTITY_TYPES = ENTITY_FILTER
    ? [ENTITY_FILTER.toUpperCase()]
    : Object.keys(PHI_BY_ENTITY);

const ALGORITHM = 'aes-256-gcm';

// ── Crypto helpers (mirror of _shared/crypto.js) ─────────────────────────────
const kms = new KMSClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

async function generateDek(tenantId) {
    const KeyId = TENANT_KEYS[tenantId];
    if (!KeyId) throw new Error(`No KMS key for tenant ${tenantId}`);
    const r = await kms.send(new GenerateDataKeyCommand({ KeyId, KeySpec: 'AES_256' }));
    return {
        plaintextDek: Buffer.from(r.Plaintext),
        encryptedDek: Buffer.from(r.CiphertextBlob)
    };
}

function aesEncrypt(plaintext, dek) {
    if (plaintext === null || plaintext === undefined || plaintext === '') return plaintext;
    const str = typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, dek, iv);
    const ct = Buffer.concat([cipher.update(str, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, ct]).toString('base64');
}

async function encryptItem(item, fieldNames, tenantId) {
    const { plaintextDek, encryptedDek } = await generateDek(tenantId);
    try {
        for (const f of fieldNames) {
            if (item[f] !== undefined && item[f] !== null && item[f] !== '') {
                item[f] = aesEncrypt(item[f], plaintextDek);
            }
        }
        item._kms_dek = encryptedDek.toString('base64');
        item._kms_v = 1;
        return item;
    } finally {
        plaintextDek.fill(0);
    }
}

// ── Per-item processing ─────────────────────────────────────────────────────
async function processItem(item) {
    if (!item || !item.EntityType) return { status: 'skip-no-entity' };
    if (!PHI_BY_ENTITY[item.EntityType]) return { status: 'skip-not-phi-entity' };
    if (item._kms_dek) return { status: 'skip-already-encrypted' };
    if (!item.tenantId) return { status: 'skip-no-tenant' };

    const phiFields = PHI_BY_ENTITY[item.EntityType];
    if (DRY_RUN) return { status: 'would-encrypt', entity: item.EntityType };

    try {
        await encryptItem(item, phiFields, item.tenantId);
        await ddb.send(new PutCommand({
            TableName: TABLE,
            Item: item,
            ConditionExpression: 'attribute_not_exists(#dek)',
            ExpressionAttributeNames: { '#dek': '_kms_dek' }
        }));
        return { status: 'encrypted', entity: item.EntityType };
    } catch (e) {
        if (e.name === 'ConditionalCheckFailedException') {
            return { status: 'skip-raced', entity: item.EntityType };
        }
        return { status: 'error', entity: item.EntityType, message: e.message };
    }
}

(async () => {
    console.log('Step 3f — encrypt existing PHI rows');
    console.log(`Region: ${REGION}  Table: ${TABLE}`);
    console.log(`Entity types: ${TARGET_ENTITY_TYPES.join(', ')}`);
    console.log(`DRY_RUN: ${DRY_RUN}`);
    console.log('—'.repeat(60));

    const stats = {
        scanned: 0,
        encrypted: 0,
        'would-encrypt': 0,
        'skip-already-encrypted': 0,
        'skip-no-tenant': 0,
        'skip-not-phi-entity': 0,
        'skip-no-entity': 0,
        'skip-raced': 0,
        error: 0
    };
    const byEntity = {};

    let lastKey;
    const t0 = Date.now();

    do {
        const r = await ddb.send(new ScanCommand({
            TableName: TABLE,
            ExclusiveStartKey: lastKey,
            FilterExpression: '#et IN (' + TARGET_ENTITY_TYPES.map((_, i) => `:et${i}`).join(',') + ') AND attribute_not_exists(#dek)',
            ExpressionAttributeNames: { '#et': 'EntityType', '#dek': '_kms_dek' },
            ExpressionAttributeValues: Object.fromEntries(
                TARGET_ENTITY_TYPES.map((t, i) => [`:et${i}`, t])
            )
        }));

        for (const item of (r.Items || [])) {
            stats.scanned++;
            const result = await processItem(item);
            stats[result.status] = (stats[result.status] || 0) + 1;
            if (result.entity) {
                byEntity[result.entity] = byEntity[result.entity] || { encrypted: 0, errors: 0 };
                if (result.status === 'encrypted' || result.status === 'would-encrypt') {
                    byEntity[result.entity].encrypted++;
                }
                if (result.status === 'error') {
                    byEntity[result.entity].errors++;
                    console.warn(`  ERR ${item.PK} ${item.SK}: ${result.message}`);
                }
            }
            if (stats.scanned % 100 === 0) {
                process.stdout.write(`  scanned=${stats.scanned} encrypted=${stats.encrypted}\r`);
            }
        }

        lastKey = r.LastEvaluatedKey;
    } while (lastKey);

    console.log('');
    console.log('—'.repeat(60));
    console.log(`Total scanned: ${stats.scanned}`);
    console.log(`Encrypted:     ${stats.encrypted}${DRY_RUN ? ` (would-encrypt: ${stats['would-encrypt']} — DRY RUN)` : ''}`);
    console.log(`Skipped already-encrypted: ${stats['skip-already-encrypted']}`);
    console.log(`Skipped no tenant:         ${stats['skip-no-tenant']}`);
    console.log(`Skipped raced:             ${stats['skip-raced']}`);
    console.log(`Errors:                    ${stats.error}`);
    console.log('');
    console.log('By entity:');
    for (const [k, v] of Object.entries(byEntity)) {
        console.log(`  ${k.padEnd(12)} encrypted=${v.encrypted} errors=${v.errors}`);
    }
    console.log(`Elapsed: ${Math.round((Date.now() - t0) / 1000)}s`);
})().catch(err => {
    console.error('FAILED:', err);
    process.exit(1);
});

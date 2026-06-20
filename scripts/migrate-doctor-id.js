#!/usr/bin/env node
/**
 * Akwadona — Doctor-ID refactor migration script (Step C.2).
 *
 * What it does:
 *   1. Scans the `Hospital` table for DOCTOR profile rows and builds the
 *      map  email  →  doctorId  (the UUID PK).
 *   2. Finds DOCTOR-PATIENT link rows whose PK uses the doctor's EMAIL,
 *      writes a new row at  PK = DOCTOR#<doctorId>, deletes the old row.
 *   3. Adds a  doctorId  field to appointment + examination rows that
 *      only carry  doctorEmail  today.
 *   4. Prints a report (counts + any orphans / unresolved emails).
 *
 * Safe to re-run — every write is idempotent. The script never deletes a
 * doctor profile, an appointment, or an examination row. It only deletes
 * the OLD email-keyed link rows after the UUID-keyed copy is in place.
 *
 * Usage:
 *   node scripts/migrate-doctor-id.js                  # DRY-RUN — read only
 *   node scripts/migrate-doctor-id.js --apply          # actually write
 *
 * Requires:
 *   - AWS credentials (env vars or shared profile) with read/write on
 *     the `Hospital` table.
 *   - Node 18+ (uses built-in fetch / AWS SDK v3).
 */

'use strict';

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
    DynamoDBDocumentClient,
    ScanCommand,
    PutCommand,
    UpdateCommand,
    DeleteCommand
} = require('@aws-sdk/lib-dynamodb');

const REGION     = process.env.AWS_REGION || 'us-east-1';
const TABLE_NAME = process.env.TABLE_NAME || 'Hospital';
const APPLY      = process.argv.includes('--apply');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

// ── Helpers ─────────────────────────────────────────────────────────────────
async function scanAll(filterExpr, exprNames, exprValues) {
    const items = [];
    let startKey = undefined;
    do {
        const r = await ddb.send(new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: filterExpr,
            ExpressionAttributeNames: exprNames,
            ExpressionAttributeValues: exprValues,
            ExclusiveStartKey: startKey
        }));
        items.push(...(r.Items || []));
        startKey = r.LastEvaluatedKey;
    } while (startKey);
    return items;
}

function isUuidLike(s) {
    return typeof s === 'string'
        && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function extractIdFromPK(pk) {
    // PK shape: "DOCTOR#<id>"
    if (!pk || !pk.startsWith('DOCTOR#')) return null;
    return pk.slice('DOCTOR#'.length);
}

async function maybeApply(label, fn) {
    if (APPLY) {
        await fn();
        return '✔ APPLIED';
    }
    return '… DRY-RUN (would apply)';
}

// ── Steps ───────────────────────────────────────────────────────────────────

/** Step 1 — Build  email → doctorId  map from doctor profile rows. */
async function buildEmailToIdMap() {
    console.log('\n── Step 1: scanning DOCTOR profile rows ──');
    const rows = await scanAll(
        '#et = :et AND #sk = :sk',
        { '#et': 'EntityType', '#sk': 'SK' },
        { ':et': 'DOCTOR', ':sk': 'PROFILE' }
    );
    const map = new Map();          // email (lowercased) → doctorId
    const idsMissingEmail = [];
    for (const it of rows) {
        const id = extractIdFromPK(it.PK);
        const email = (it.email || '').toLowerCase().trim();
        if (!id) continue;
        if (!email) { idsMissingEmail.push(id); continue; }
        map.set(email, id);
    }
    console.log(`  Doctors found:        ${rows.length}`);
    console.log(`  Unique emails mapped: ${map.size}`);
    if (idsMissingEmail.length) console.log(`  Doctors with no email field: ${idsMissingEmail.length}`);
    return map;
}

/** Step 2 — Rewrite DOCTOR-PATIENT link rows from PK=DOCTOR#<email> to PK=DOCTOR#<doctorId>. */
async function rewriteDoctorPatientLinks(emailToId) {
    console.log('\n── Step 2: scanning DOCTOR-PATIENT link rows ──');
    const rows = await scanAll(
        'begins_with(PK, :p) AND begins_with(SK, :s)',
        null,
        { ':p': 'DOCTOR#', ':s': 'PATIENT#' }
    );
    let alreadyUuid = 0, rewritten = 0, orphan = 0;
    for (const it of rows) {
        const key = extractIdFromPK(it.PK);
        if (!key) continue;
        if (isUuidLike(key)) { alreadyUuid++; continue; }
        // PK uses email — look up the doctor's UUID.
        const id = emailToId.get(key.toLowerCase().trim());
        if (!id) {
            orphan++;
            console.log(`  ORPHAN — no doctor profile for email "${key}" (link: ${it.SK})`);
            continue;
        }
        const newPK = `DOCTOR#${id}`;
        const status = await maybeApply('rewrite link', async () => {
            await ddb.send(new PutCommand({
                TableName: TABLE_NAME,
                Item: { ...it, PK: newPK }
            }));
            await ddb.send(new DeleteCommand({
                TableName: TABLE_NAME,
                Key: { PK: it.PK, SK: it.SK }
            }));
        });
        rewritten++;
        console.log(`  ${status}: ${it.PK} → ${newPK} (${it.SK})`);
    }
    console.log(`  Already UUID-keyed: ${alreadyUuid}`);
    console.log(`  Rewritten:          ${rewritten}`);
    console.log(`  Orphans:            ${orphan}`);
}

/** Step 3 — Add  doctorId  field to appointment + examination rows that
 *   only have  doctorEmail  today. */
async function backfillDoctorIdOnEntities(emailToId, entityType) {
    console.log(`\n── Step 3: backfilling doctorId on ${entityType} rows ──`);
    const rows = await scanAll(
        '#et = :et',
        { '#et': 'EntityType' },
        { ':et': entityType }
    );
    let alreadyHas = 0, backfilled = 0, orphan = 0, noEmail = 0;
    for (const it of rows) {
        if (it.doctorId) { alreadyHas++; continue; }
        const email = (it.doctorEmail || '').toLowerCase().trim();
        if (!email) { noEmail++; continue; }
        const id = emailToId.get(email);
        if (!id) {
            orphan++;
            console.log(`  ORPHAN — no doctor profile for email "${email}" (PK=${it.PK} SK=${it.SK})`);
            continue;
        }
        const status = await maybeApply('add doctorId', async () => {
            await ddb.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { PK: it.PK, SK: it.SK },
                UpdateExpression: 'SET #d = :id',
                ExpressionAttributeNames:  { '#d': 'doctorId' },
                ExpressionAttributeValues: { ':id': id }
            }));
        });
        backfilled++;
        console.log(`  ${status}: ${it.PK} / ${it.SK}  ←  doctorId=${id}`);
    }
    console.log(`  Already has doctorId: ${alreadyHas}`);
    console.log(`  Backfilled:           ${backfilled}`);
    console.log(`  No doctorEmail field: ${noEmail}`);
    console.log(`  Orphans:              ${orphan}`);
}

// ── Main ────────────────────────────────────────────────────────────────────
(async () => {
    console.log('=== Akwadona — Doctor-ID refactor migration ===');
    console.log(`Mode:       ${APPLY ? 'APPLY (writes)' : 'DRY-RUN (read only)'}`);
    console.log(`Table:      ${TABLE_NAME}`);
    console.log(`Region:     ${REGION}`);

    try {
        const map = await buildEmailToIdMap();
        await rewriteDoctorPatientLinks(map);
        await backfillDoctorIdOnEntities(map, 'APPOINTMENT');
        await backfillDoctorIdOnEntities(map, 'EXAMINATION');

        console.log('\n=== Done ===');
        if (!APPLY) console.log('Re-run with --apply to actually write the changes.');
    } catch (e) {
        console.error('ERROR:', e.message);
        process.exit(1);
    }
})();

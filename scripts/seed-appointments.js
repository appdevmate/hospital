/* eslint-disable no-console */
/**
 * Seed N synthetic appointments straight into the Hospital DynamoDB table.
 *
 * Why direct DynamoDB and not the API?
 *   - 1 M requests through API Gateway would burn 30 s timeouts, the JWT,
 *     and clog the idempotency cache. Direct BatchWriteItem at 25 rows/call
 *     finishes 1 M in roughly 5–10 minutes with 16 parallel writers.
 *   - On-demand DynamoDB billing absorbs the burst automatically; retries
 *     handle UnprocessedItems if any partial batch comes back.
 *
 * Prerequisites:
 *   1) AWS CLI configured (or run `assume-role` to load the CDK deploy role).
 *   2) The Hospital table + at least one doctor row + one patient row exist.
 *
 * Usage:
 *   node scripts/seed-appointments.js                 # default 1,000
 *   node scripts/seed-appointments.js --count 1000000 # one million
 *   node scripts/seed-appointments.js --count 100000 --concurrency 16
 *   node scripts/seed-appointments.js --dry-run       # plan only, no writes
 *
 * Options:
 *   --count        total appointments to create   (default 1000)
 *   --concurrency  parallel batch writers         (default 8, max 32)
 *   --batchSize    items per BatchWrite           (default 25, max 25)
 *   --region       AWS region                     (default us-east-1)
 *   --table        DynamoDB table name            (default Hospital)
 *   --dry-run      print plan + sample row only
 */

'use strict';

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, BatchWriteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

const args = parseArgs(process.argv.slice(2));
const REGION       = args.region      || process.env.AWS_REGION || 'us-east-1';
const TABLE        = args.table       || 'Hospital';
const TOTAL        = num(args.count,       1000);
const CONCURRENCY  = clamp(num(args.concurrency, 8), 1, 32);
const BATCH_SIZE   = clamp(num(args.batchSize,  25), 1, 25);
const DRY_RUN      = !!args['dry-run'];

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

const VISIT_TYPES = ['walk-in', 'scheduled', 'emergency', 'referral', 'follow-up', 'check-up'];
const PRIORITIES  = ['routine', 'urgent', 'emergency'];
// Skew most generated rows to 'scheduled' / 'completed' to reflect real usage.
const STATUSES    = [
    'scheduled', 'scheduled', 'scheduled', 'scheduled',
    'completed', 'completed', 'completed',
    'checked-in', 'in-progress',
    'cancelled', 'no-show'
];
const DEPARTMENTS = ['General Surgery', 'Cardiology', 'Pediatrics', 'Internal Medicine', 'Orthopedics', 'ER'];

// ── Lookup data ─────────────────────────────────────────────────────────────
async function scanByEntity(entityType) {
    const items = [];
    let last;
    do {
        const r = await ddb.send(new ScanCommand({
            TableName: TABLE,
            FilterExpression: '#et = :et AND attribute_not_exists(deletedAt)',
            ExpressionAttributeNames: { '#et': 'EntityType' },
            ExpressionAttributeValues: { ':et': entityType },
            ExclusiveStartKey: last,
            ProjectionExpression: 'PK, SK, #n, email, dutyDays',
            ExpressionAttributeNames: { '#et': 'EntityType', '#n': 'name' }
        }));
        for (const it of (r.Items || [])) items.push(it);
        last = r.LastEvaluatedKey;
    } while (last);
    return items;
}

async function loadLookups() {
    console.log('Scanning doctors + patients…');
    const [doctors, patients] = await Promise.all([
        scanByEntity('DOCTOR'),
        scanByEntity('PATIENT')
    ]);
    if (!doctors.length)  throw new Error('No doctors found. Create at least one doctor first.');
    if (!patients.length) throw new Error('No patients found. Create at least one patient first.');
    console.log(`Found ${doctors.length} doctor(s), ${patients.length} patient(s).`);
    return { doctors, patients };
}

// ── Random row factory ──────────────────────────────────────────────────────
function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
function pad2(n)  { return n < 10 ? '0' + n : '' + n; }

/** Random YYYY-MM-DD between (now - 180 days) and (now + 180 days). */
function randomDateIso() {
    const ms = Date.now() + (Math.floor(Math.random() * 360) - 180) * 86400000;
    const d = new Date(ms);
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}
/** Random HH:mm between 08:00 and 17:30 on 15-min steps. */
function randomStartTime() {
    const slot = Math.floor(Math.random() * 39);             // 0..38 → 08:00..17:30
    const mins = 8 * 60 + slot * 15;
    return `${pad2(Math.floor(mins / 60))}:${pad2(mins % 60)}`;
}
function addMinutes(hhmm, mins) {
    const [h, m] = hhmm.split(':').map(Number);
    const total = h * 60 + m + mins;
    return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}

function buildAppointment(doc, pat) {
    const id   = randomUUID();
    const date = randomDateIso();
    const start = randomStartTime();
    const duration = pick([15, 20, 30, 45, 60]);
    const end = addMinutes(start, duration);
    const now  = new Date().toISOString();
    return {
        PK:              `APPOINTMENT#${id}`,
        SK:              'PROFILE',
        EntityType:      'APPOINTMENT',
        appointmentId:   id,
        patientId:       pat.PK,
        patientName:     (pat.name || 'unknown').toLowerCase(),
        doctorId:        doc.PK,
        doctorName:      (doc.name || 'unknown').toLowerCase(),
        doctorEmail:     (doc.email || 'unknown').toLowerCase().trim(),
        department:      pick(DEPARTMENTS),
        specialization:  null,
        date,
        startTime:       start,
        endTime:         end,
        duration,
        visitType:       pick(VISIT_TYPES),
        priority:        pick(PRIORITIES),
        status:          pick(STATUSES),
        referredBy:      null,
        referredByName:  null,
        encounterId:     null,
        checkedInAt:     null,
        checkedOutAt:    null,
        cancelReason:    null,
        cancelledAt:     null,
        cancelledBy:     null,
        notes:           null,
        chiefComplaint:  null,
        createdBy:       'seed-script',
        createdByName:   'Seed Script',
        updatedBy:       'seed-script',
        createdAt:       now,
        updatedAt:       now,
        dataClass:       'PHI'
    };
}

// ── BatchWrite helpers ──────────────────────────────────────────────────────
async function writeBatch(items) {
    let requestItems = { [TABLE]: items.map(Item => ({ PutRequest: { Item } })) };
    let attempt = 0;
    while (true) {
        const r = await ddb.send(new BatchWriteCommand({ RequestItems: requestItems }));
        const unprocessed = r.UnprocessedItems && r.UnprocessedItems[TABLE];
        if (!unprocessed || !unprocessed.length) return;
        if (++attempt > 8) throw new Error(`Gave up after ${attempt} retries (${unprocessed.length} unprocessed).`);
        await sleep(Math.min(200 * 2 ** attempt, 4000));
        requestItems = { [TABLE]: unprocessed };
    }
}

async function worker(workerId, doctors, patients, queueRef, counter) {
    while (queueRef.remaining > 0) {
        const take = Math.min(BATCH_SIZE, queueRef.remaining);
        queueRef.remaining -= take;
        const items = [];
        for (let i = 0; i < take; i++) {
            items.push(buildAppointment(pick(doctors), pick(patients)));
        }
        try {
            await writeBatch(items);
            counter.done += take;
            if (counter.done % 5000 < BATCH_SIZE) {
                const elapsed = (Date.now() - counter.start) / 1000;
                const rate = Math.round(counter.done / elapsed);
                process.stdout.write(`\r  ${counter.done.toLocaleString()} / ${TOTAL.toLocaleString()}  (${rate}/s, worker=${workerId})    `);
            }
        } catch (e) {
            counter.errors += take;
            console.error(`\n[worker ${workerId}] batch failed: ${e.message}`);
        }
    }
}

// ── Main ────────────────────────────────────────────────────────────────────
(async () => {
    console.log(`Region: ${REGION}  Table: ${TABLE}  Total: ${TOTAL.toLocaleString()}  Concurrency: ${CONCURRENCY}  BatchSize: ${BATCH_SIZE}  DryRun: ${DRY_RUN}`);
    const { doctors, patients } = await loadLookups();

    const sample = buildAppointment(pick(doctors), pick(patients));
    console.log('Sample row:\n' + JSON.stringify(sample, null, 2));

    if (DRY_RUN) {
        console.log('\n--dry-run set — no writes.');
        return;
    }

    const queueRef = { remaining: TOTAL };
    const counter  = { done: 0, errors: 0, start: Date.now() };

    const workers = Array.from({ length: CONCURRENCY }, (_, i) => worker(i, doctors, patients, queueRef, counter));
    await Promise.all(workers);

    const elapsed = (Date.now() - counter.start) / 1000;
    console.log(`\nDone. Wrote ${counter.done.toLocaleString()} appointments in ${elapsed.toFixed(1)}s  (${Math.round(counter.done / elapsed)}/s).  Errors: ${counter.errors}`);
})().catch((e) => {
    console.error(e);
    process.exit(1);
});

// ── tiny utils ──────────────────────────────────────────────────────────────
function parseArgs(argv) {
    const out = {};
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (!a.startsWith('--')) continue;
        const key = a.slice(2);
        const next = argv[i + 1];
        if (next === undefined || next.startsWith('--')) out[key] = true;
        else { out[key] = next; i++; }
    }
    return out;
}
function num(v, d)        { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function sleep(ms)        { return new Promise(r => setTimeout(r, ms)); }

#!/usr/bin/env node
/**
 * Akwadona — Customer data migration script (M.2).
 *
 * Reads a customer-supplied CSV, validates each row, encrypts PHI with the
 * tenant's KMS data key (envelope encryption — same as the runtime Lambdas),
 * HMACs the searchable fields with the tenant's KMS HMAC key, and writes
 * the encrypted rows to DynamoDB.
 *
 * Defaults to DRY-RUN — nothing is written until you pass `--apply`.
 *
 * Usage:
 *   node scripts/import-tenant-data.js <slug> <entity> [--apply] [--csv <path>]
 *
 *   <slug>    tenant slug (tiryaq | alshifaa | <new-slug>)
 *   <entity>  patients | doctors | appointments
 *
 * Examples:
 *   # dry-run, default path: scripts/imports/city-hospital/patients.csv
 *   node scripts/import-tenant-data.js city-hospital patients
 *
 *   # commit the patient import
 *   node scripts/import-tenant-data.js city-hospital patients --apply
 *
 *   # use a custom CSV path
 *   node scripts/import-tenant-data.js city-hospital doctors --apply --csv ./mydocs.csv
 *
 * The script writes a JSON report at:
 *   scripts/imports/<slug>/report-<entity>-<timestamp>.json
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { randomUUID, randomBytes, createCipheriv } = require('crypto');

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { KMSClient, GenerateDataKeyCommand, GenerateMacCommand } = require('@aws-sdk/client-kms');

const REGION     = process.env.AWS_REGION || 'us-east-1';
const TABLE_NAME = process.env.TABLE_NAME || 'Hospital';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const kms = new KMSClient({ region: REGION });

// ── Tenant map (mirror of CDK tenantKeys + tenantHmacKeys) ─────────────────
const TENANTS = {
    tiryaq: {
        tenantId:    'T_2572fc71',
        dataKeyArn:  'arn:aws:kms:us-east-1:483176634665:key/11b1386b-51c2-41ab-b5ba-aa6eb9a0e8a6',
        hmacKeyArn:  'arn:aws:kms:us-east-1:483176634665:key/601f8aab-f37c-4786-a557-afc12cb864e8'
    },
    alshifaa: {
        tenantId:    'T_a4b8aef9',
        dataKeyArn:  'arn:aws:kms:us-east-1:483176634665:key/c1c1657b-b3f9-41a9-a816-dee382e00bb1',
        hmacKeyArn:  'arn:aws:kms:us-east-1:483176634665:key/0a23ea33-4659-4f37-a4a2-a62366010bcd'
    }
    // Add new tenants here as we onboard them.
};

// ── PHI field lists per entity (encrypted in DynamoDB) ─────────────────────
const PHI_FIELDS = {
    patients:     ['name', 'dateOfBirth', 'qid', 'phone', 'address',
                   'emergencyContact', 'emergencyPhone', 'allergies', 'chronicConditions'],
    doctors:      ['phone', 'licenseNumber'],
    appointments: ['notes']
};

const SEARCHABLE_FIELDS = {
    patients:     ['email', 'qid', 'phone'],
    doctors:      ['email'],
    appointments: []
};

const REQUIRED_FIELDS = {
    patients:     ['name', 'dateOfBirth', 'gender'],
    doctors:      ['name', 'email'],
    appointments: ['legacyPatientId', 'legacyDoctorId', 'date', 'startTime', 'endTime']
};

// ── CLI parsing ────────────────────────────────────────────────────────────
const args   = process.argv.slice(2);
const slug   = args[0];
const entity = args[1];
const APPLY  = args.includes('--apply');
const csvPathArg = (() => {
    const i = args.indexOf('--csv');
    return i > 0 ? args[i + 1] : null;
})();

if (!slug || !entity) {
    console.error('Usage: node scripts/import-tenant-data.js <slug> <entity> [--apply] [--csv <path>]');
    process.exit(1);
}
if (!TENANTS[slug]) {
    console.error(`Unknown tenant slug "${slug}". Known: ${Object.keys(TENANTS).join(', ')}`);
    process.exit(1);
}
if (!['patients', 'doctors', 'appointments'].includes(entity)) {
    console.error(`Unknown entity "${entity}". Must be: patients | doctors | appointments`);
    process.exit(1);
}

const tenant      = TENANTS[slug];
const defaultCsv  = path.join(__dirname, 'imports', slug, `${entity}.csv`);
const csvPath     = csvPathArg || defaultCsv;

console.log('=== Akwadona import ===');
console.log(`Tenant:   ${slug} (${tenant.tenantId})`);
console.log(`Entity:   ${entity}`);
console.log(`CSV path: ${csvPath}`);
console.log(`Mode:     ${APPLY ? 'APPLY (writes)' : 'DRY-RUN (read only)'}`);

// ── Minimal CSV parser (handles quoted fields with commas inside) ──────────
function parseCsv(text) {
    const lines = text.split(/\r?\n/).filter(l => l && !l.startsWith('#'));
    if (lines.length === 0) return { headers: [], rows: [] };
    const parseLine = (line) => {
        const out = [];
        let cur = '', inQ = false;
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (inQ) {
                if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
                else if (c === '"') inQ = false;
                else cur += c;
            } else {
                if (c === ',') { out.push(cur); cur = ''; }
                else if (c === '"') inQ = true;
                else cur += c;
            }
        }
        out.push(cur);
        return out;
    };
    const headers = parseLine(lines[0]);
    const rows = lines.slice(1).map(l => {
        const vals = parseLine(l);
        const obj = {};
        headers.forEach((h, i) => obj[h.trim()] = (vals[i] || '').trim());
        return obj;
    });
    return { headers, rows };
}

// ── Envelope encryption helpers ────────────────────────────────────────────
async function encryptFieldsForRow(row, fields) {
    // For each PHI field with a value, run AES-256-GCM under a fresh DEK
    // protected by the tenant KMS key. Same shape used by createPatient Lambda.
    if (!fields || !fields.length) return row;
    const phiPayload = {};
    for (const f of fields) {
        if (row[f] !== undefined && row[f] !== '') {
            phiPayload[f] = row[f];
            delete row[f];   // remove plaintext from the persisted item
        }
    }
    if (Object.keys(phiPayload).length === 0) return row;

    const dk = await kms.send(new GenerateDataKeyCommand({
        KeyId: tenant.dataKeyArn,
        KeySpec: 'AES_256'
    }));
    const dek = Buffer.from(dk.Plaintext);
    const iv  = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', dek, iv);
    const ct = Buffer.concat([cipher.update(JSON.stringify(phiPayload), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    row._kms_v   = 1;
    row._kms_dek = Buffer.from(dk.CiphertextBlob).toString('base64');
    row._enc_iv  = iv.toString('base64');
    row._enc_tag = tag.toString('base64');
    row._enc_ct  = ct.toString('base64');
    return row;
}

async function hmacField(value) {
    if (!value) return null;
    const mac = await kms.send(new GenerateMacCommand({
        KeyId:        tenant.hmacKeyArn,
        MacAlgorithm: 'HMAC_SHA_256',
        Message:      Buffer.from(String(value).toLowerCase().trim())
    }));
    return Buffer.from(mac.Mac).toString('base64');
}

// ── Per-entity row builders ────────────────────────────────────────────────
async function buildPatientItem(row) {
    const patientId = `p_${randomUUID().slice(0, 12)}`;
    const item = {
        PK:               `PATIENT#${patientId}`,
        SK:               'PROFILE',
        EntityType:       'PATIENT',
        tenantId:         tenant.tenantId,
        patientId,
        legacyPatientId:  row.patientId || null,
        // Non-PHI fields stay in plaintext (gender / insurance / bloodType
        // are categorical, not patient-identifying on their own).
        gender:           row.gender || null,
        insurance:        row.insurance || null,
        bloodType:        row.bloodType || null,
        status:           'active',
        createdAt:        new Date().toISOString(),
        // Searchable HMACs
        emailHash:        await hmacField(row.email),
        qidHash:          await hmacField(row.qid),
        phoneHash:        await hmacField(row.phone)
    };
    return encryptFieldsForRow({ ...item, ...row }, PHI_FIELDS.patients);
}

async function buildDoctorItem(row) {
    const doctorId = randomUUID();
    const item = {
        PK:                `DOCTOR#${doctorId}`,
        SK:                'PROFILE',
        EntityType:        'DOCTOR',
        tenantId:          tenant.tenantId,
        doctorId,
        legacyDoctorId:    row.legacyDoctorId || null,
        name:              row.name,                  // doctor names not PHI
        email:             (row.email || '').toLowerCase().trim(),
        emailHash:         await hmacField(row.email),
        specialization:    row.specialization || null,
        department:        row.department || null,
        status:            'active',
        createdAt:         new Date().toISOString()
    };
    return encryptFieldsForRow(item, PHI_FIELDS.doctors);
}

async function buildAppointmentItem(row, lookups) {
    const apptId    = randomUUID();
    const patientId = lookups.patients[row.legacyPatientId];
    const doctorId  = lookups.doctors[row.legacyDoctorId];
    if (!patientId) throw new Error(`No imported patient for legacyPatientId ${row.legacyPatientId}`);
    if (!doctorId)  throw new Error(`No imported doctor for legacyDoctorId ${row.legacyDoctorId}`);
    const item = {
        PK:                  `APPOINTMENT#${apptId}`,
        SK:                  'PROFILE',
        EntityType:          'APPOINTMENT',
        tenantId:            tenant.tenantId,
        appointmentId:       apptId,
        legacyAppointmentId: row.legacyAppointmentId || null,
        patientId:           `PATIENT#${patientId}`,
        doctorId,
        date:                row.date,
        startTime:           row.startTime,
        endTime:             row.endTime,
        visitType:           row.visitType  || 'scheduled',
        priority:            row.priority   || 'routine',
        status:              row.status     || 'scheduled',
        createdAt:           new Date().toISOString()
    };
    return encryptFieldsForRow(item, PHI_FIELDS.appointments);
}

// ── Main ───────────────────────────────────────────────────────────────────
(async () => {
    if (!fs.existsSync(csvPath)) {
        console.error(`CSV not found at ${csvPath}`);
        process.exit(1);
    }
    const { rows } = parseCsv(fs.readFileSync(csvPath, 'utf8'));
    console.log(`Rows: ${rows.length}`);

    // For appointments, we need the legacy→new ID maps from prior imports.
    // Read the latest report file if present.
    const importsDir = path.dirname(csvPath);
    const lookups = { patients: {}, doctors: {} };
    if (entity === 'appointments') {
        for (const e of ['patients', 'doctors']) {
            const reports = fs.readdirSync(importsDir).filter(f => f.startsWith(`report-${e}-`));
            if (reports.length === 0) {
                console.error(`To import appointments, you must first --apply ${e}. No report found.`);
                process.exit(1);
            }
            const latest = reports.sort().pop();
            const data = JSON.parse(fs.readFileSync(path.join(importsDir, latest), 'utf8'));
            lookups[e] = data.idMap || {};
        }
    }

    let imported = 0;
    const skipped = [];
    const idMap   = {};   // legacyId → new UUID (for appointments lookup)

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;   // +1 for 0-index, +1 for header row

        // Validate required fields.
        const missing = REQUIRED_FIELDS[entity].filter(f => !row[f]);
        if (missing.length) {
            skipped.push({ row: rowNum, error: `missing required field(s): ${missing.join(', ')}` });
            continue;
        }

        try {
            let item;
            if (entity === 'patients')     item = await buildPatientItem(row);
            if (entity === 'doctors')      item = await buildDoctorItem(row);
            if (entity === 'appointments') item = await buildAppointmentItem(row, lookups);

            if (APPLY) {
                await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
            }
            imported++;

            // Track legacy→new ID for downstream entity imports.
            const legacyKey = row.patientId || row.legacyDoctorId || row.legacyAppointmentId;
            const newId = item.patientId || item.doctorId || item.appointmentId;
            if (legacyKey && newId) idMap[legacyKey] = newId;

            if (imported % 50 === 0) console.log(`  ${imported} / ${rows.length}`);
        } catch (e) {
            skipped.push({ row: rowNum, error: e.message });
        }
    }

    // Report
    const report = {
        tenant:   slug,
        tenantId: tenant.tenantId,
        entity,
        mode:     APPLY ? 'APPLY' : 'DRY-RUN',
        startedAt: new Date().toISOString(),
        rows:     rows.length,
        imported,
        skipped:  skipped.length,
        errors:   skipped,
        idMap                                  // used by the next entity import
    };
    const reportPath = path.join(importsDir, `report-${entity}-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n=== Done ===');
    console.log(`Imported: ${imported}`);
    console.log(`Skipped:  ${skipped.length}`);
    console.log(`Report:   ${reportPath}`);
    if (!APPLY) console.log('Re-run with --apply to actually write the rows.');
})();

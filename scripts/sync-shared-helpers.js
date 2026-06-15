/* eslint-disable no-console */
/**
 * Sync the master copies of _shared/*.js into each Lambda folder.
 *
 * Why we copy instead of `require('../_shared/crypto')`:
 *   CDK packages each Lambda from its own folder with `Code.fromAsset`.
 *   `../_shared/` is NOT included in that asset, so requiring across folder
 *   boundaries fails at runtime. Copying gives every Lambda a self-contained
 *   sibling file that ships with its asset.
 *
 * What gets synced:
 *   _shared/crypto.js      → every Lambda in TARGET_LAMBDAS
 *   (extend this script as more shared helpers come online)
 *
 * Run BEFORE every `cdk deploy`:
 *   node scripts/sync-shared-helpers.js
 *
 * Idempotent: copies are byte-identical to the master, so re-runs are no-ops
 * unless the master changed.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const LAMBDA_ROOT = path.resolve(__dirname, '..', 'tiryaq-cdk', 'lambda');
const SHARED_DIR  = path.join(LAMBDA_ROOT, '_shared');

// Helpers to sync from _shared into each Lambda folder.
// File on left is the master; file on right is the sibling name written
// into each Lambda folder (usually the same).
const HELPERS = [
    { master: 'crypto.js', target: 'crypto.js' }
];

// Lambdas that need PHI encryption / decryption.
// Add a Lambda folder name to this list once its index.js calls
// encryptItem / decryptItem from ./crypto.
const TARGET_LAMBDAS = [
    // Patients (3c)
    'createPatient',
    'updatePatient',
    'getPatientByID',
    'getAllPatients',
    'getPatientsDataByFilters',
    'deletePatient',
    // Doctors (3d)
    'createDoctor',
    'updateDoctor',
    'getDoctorByID',
    'getDoctorByEmail',
    'getAllDoctors',
    'deleteDoctor',
    // Appointments (3d)
    'tiryaq-appointments',
    // Examinations (3e)
    'tiryaq-examinations'
    // Payments / audit / etc. — extend as 3e rolls out
];

function syncOne(lambdaFolder) {
    const target = path.join(LAMBDA_ROOT, lambdaFolder);
    if (!fs.existsSync(target)) {
        console.warn(`  SKIP ${lambdaFolder} — folder not found at ${target}`);
        return;
    }
    for (const { master, target: outName } of HELPERS) {
        const src = path.join(SHARED_DIR, master);
        const dst = path.join(target, outName);
        if (!fs.existsSync(src)) {
            console.warn(`  SKIP ${master} — master not found at ${src}`);
            continue;
        }
        const srcBuf = fs.readFileSync(src);
        const dstBuf = fs.existsSync(dst) ? fs.readFileSync(dst) : null;
        if (dstBuf && srcBuf.equals(dstBuf)) {
            console.log(`  unchanged  ${lambdaFolder}/${outName}`);
            continue;
        }
        fs.writeFileSync(dst, srcBuf);
        console.log(`  ${dstBuf ? 'updated  ' : 'created  '}${lambdaFolder}/${outName}`);
    }
}

console.log(`Syncing shared helpers from ${SHARED_DIR}`);
console.log(`Target Lambdas: ${TARGET_LAMBDAS.length}`);
console.log('—'.repeat(60));
for (const f of TARGET_LAMBDAS) syncOne(f);
console.log('—'.repeat(60));
console.log('Done. Now run: cd tiryaq-cdk && npx cdk deploy --require-approval never');

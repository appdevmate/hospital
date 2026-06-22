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
 *   _shared/crypto.js        -> every Lambda that handles PHI fields
 *   _shared/throttle.js      -> every Lambda exposed to the public API
 *   _shared/plan-defaults.js -> every Lambda that reads tenant plan limits
 *   _shared/tenant-guard.js  -> big domain Lambdas that do by-id reads/writes
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

// PHI envelope encryption + decryption (Step 3).
const CRYPTO_TARGETS = [
    'createPatient', 'updatePatient', 'getPatientByID', 'getAllPatients',
    'getPatientsDataByFilters', 'deletePatient',
    'createDoctor', 'updateDoctor', 'getDoctorByID', 'getDoctorByEmail',
    'getAllDoctors', 'deleteDoctor',
    'tiryaq-appointments', 'tiryaq-examinations'
];

// Throttle + plan defaults (Step 2g) — auto-discovered: every Lambda folder
// that has a throttle.js (40+ Lambdas). Hand-maintained list was missing
// folders and let stale broken copies linger.
const THROTTLE_TARGETS = fs.readdirSync(LAMBDA_ROOT)
    .filter(name => name !== '_shared' && name !== 'lib')
    .filter(name => {
        const p = path.join(LAMBDA_ROOT, name, 'throttle.js');
        return fs.existsSync(p);
    });

// Per-row tenant enforcement (Step 2d-4). Big domain Lambdas that read
// or mutate rows by id - the highest-risk leak surface.
const TENANT_GUARD_TARGETS = [
    'tiryaq-bloodbank',
    'tiryaq-pharmacy',
    'tiryaq-examinations',
    'tiryaq-calendar',
    'tiryaq-scribe',
    'tiryaq-document-manager'
];

const HELPERS = [
    { master: 'crypto.js',        target: 'crypto.js',        lambdas: CRYPTO_TARGETS },
    { master: 'throttle.js',      target: 'throttle.js',      lambdas: THROTTLE_TARGETS },
    { master: 'plan-defaults.js', target: 'plan-defaults.js', lambdas: THROTTLE_TARGETS },
    { master: 'tenant-guard.js',  target: 'tenant-guard.js',  lambdas: TENANT_GUARD_TARGETS }
];

function syncHelperToLambda(masterName, outName, lambdaFolder) {
    const targetDir = path.join(LAMBDA_ROOT, lambdaFolder);
    if (!fs.existsSync(targetDir)) {
        console.warn(`  SKIP ${lambdaFolder}/${outName} - folder not found`);
        return;
    }
    const src = path.join(SHARED_DIR, masterName);
    const dst = path.join(targetDir, outName);
    if (!fs.existsSync(src)) {
        console.warn(`  SKIP ${masterName} - master not found at ${src}`);
        return;
    }
    const srcBuf = fs.readFileSync(src);
    const dstBuf = fs.existsSync(dst) ? fs.readFileSync(dst) : null;
    if (dstBuf && srcBuf.equals(dstBuf)) {
        console.log(`  unchanged  ${lambdaFolder}/${outName}`);
        return;
    }
    fs.writeFileSync(dst, srcBuf);
    console.log(`  ${dstBuf ? 'updated  ' : 'created  '}${lambdaFolder}/${outName}`);
}

console.log(`Syncing shared helpers from ${SHARED_DIR}`);
console.log('-'.repeat(60));
for (const helper of HELPERS) {
    console.log(`\n[ ${helper.master} -> ${helper.lambdas.length} Lambdas ]`);
    for (const folder of helper.lambdas) {
        syncHelperToLambda(helper.master, helper.target, folder);
    }
}
console.log('-'.repeat(60));
console.log('Done. Now run: cd tiryaq-cdk && npx cdk deploy --require-approval never');

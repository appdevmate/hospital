#!/usr/bin/env node
'use strict';
/**
 * Runs safe/ AND destructive/. The destructive set creates rows, floods the
 * API, and attempts privileged writes. It REFUSES to run unless:
 *   1. --i-understand-this-mutates-data is passed, AND
 *   2. API_BASE is set and does not contain the production API id.
 *
 *   API_BASE=https://<dev-api>.execute-api.us-east-1.amazonaws.com \
 *   AKWADONA_USERNAME=... AKWADONA_PASSWORD=... \
 *   AKWADONA_B_USERNAME=... AKWADONA_B_PASSWORD=... \
 *   AKWADONA_DOCTOR_USERNAME=... AKWADONA_DOCTOR_PASSWORD=... \
 *   node scripts/security-tests/run-all.js --i-understand-this-mutates-data
 */
const path = require('path');
const fs = require('fs');
const { sessions } = require('./lib/auth');

const PROD_API_IDS = ['ouohmmpi31'];

(async () => {
    const ack = process.argv.includes('--i-understand-this-mutates-data');
    const apiBase = (process.env.API_BASE || '').replace(/\/$/, '');
    if (!ack) { console.error('Refusing: pass --i-understand-this-mutates-data to run the destructive set.'); process.exit(2); }
    if (!apiBase) { console.error('Refusing: API_BASE must be set explicitly to a DEV stack.'); process.exit(2); }
    if (PROD_API_IDS.some(id => apiBase.includes(id)) && !process.env.ALLOW_PROD_DESTRUCTIVE) {
        console.error('Refusing: API_BASE looks like PRODUCTION. Set ALLOW_PROD_DESTRUCTIVE=1 only if you really mean it.'); process.exit(2);
    }
    const ctx = {
        apiBase,
        siteBase: (process.env.SITE_BASE || 'https://www.akwadona.com').replace(/\/$/, ''),
        documentsBucketUrl: process.env.DOCUMENTS_BUCKET_URL || null,
        sessions: await sessions()
    };
    console.log(`Akwadona security suite — FULL set (safe + destructive)\n  api=${ctx.apiBase}`);
    let failed = 0;
    for (const sub of ['safe', 'destructive']) {
        const dir = path.join(__dirname, sub);
        for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.js')).sort()) {
            try { const rep = await require(path.join(dir, f))(ctx); rep.print(); failed += rep.failed; }
            catch (e) { console.log(`\n── ${sub}/${f} ──\n[ FAIL ] suite crashed — ${e.message}`); failed++; }
        }
    }
    console.log(`\n${failed === 0 ? 'ALL CHECKS PASSED' : failed + ' CHECK(S) FAILED'}`);
    process.exit(failed === 0 ? 0 : 1);
})().catch(e => { console.error('setup error:', e.message); process.exit(2); });

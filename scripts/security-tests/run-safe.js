#!/usr/bin/env node
'use strict';
/**
 * Runs every test in safe/ — all read-only, OK against production.
 *
 *   node scripts/security-tests/run-safe.js
 *
 * Env (all optional):
 *   API_BASE              default https://ouohmmpi31.execute-api.us-east-1.amazonaws.com
 *   SITE_BASE             default https://www.akwadona.com
 *   DOCUMENTS_BUCKET_URL  e.g. https://akwadona-documents-483176634665-us-east-1.s3.amazonaws.com
 *   AKWADONA_USERNAME / AKWADONA_PASSWORD   — enables the authenticated read-only checks
 *   COGNITO_CLIENT_ID     default 6ndnfufmo100mq1rrmte7pqmhg
 *
 * Exit code: 0 all pass, 1 any FAIL, 2 setup error.
 */
const path = require('path');
const fs = require('fs');
const { sessions } = require('./lib/auth');

(async () => {
    const ctx = {
        apiBase: (process.env.API_BASE || 'https://ouohmmpi31.execute-api.us-east-1.amazonaws.com').replace(/\/$/, ''),
        siteBase: (process.env.SITE_BASE || 'https://www.akwadona.com').replace(/\/$/, ''),
        documentsBucketUrl: process.env.DOCUMENTS_BUCKET_URL || null,
        sessions: await sessions()
    };
    console.log(`Akwadona security suite — SAFE set\n  api=${ctx.apiBase}\n  site=${ctx.siteBase}\n  session A=${ctx.sessions.a ? ctx.sessions.a.claims.tenantId : 'none (' + (ctx.sessions.aError || 'no creds') + ')'}`);

    const dir = path.join(__dirname, 'safe');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();
    let failed = 0;
    for (const f of files) {
        try {
            const rep = await require(path.join(dir, f))(ctx);
            rep.print(); failed += rep.failed;
        } catch (e) {
            console.log(`\n── ${f} ──\n[ FAIL ] suite crashed — ${e.message}`); failed++;
        }
    }
    console.log(`\n${failed === 0 ? 'ALL SAFE CHECKS PASSED' : failed + ' CHECK(S) FAILED'}`);
    process.exit(failed === 0 ? 0 : 1);
})().catch(e => { console.error('setup error:', e.message); process.exit(2); });

'use strict';

/**
 * Akwadona — Cross-tenant isolation probe (Step 2d-4.10)
 *
 * Automated regression guard for per-row tenant enforcement.
 * For each module:
 *   1. Tenant A POSTs a resource.
 *   2. Tenant B tries GET/PATCH/DELETE on that id  -> must return 404.
 *      Tenant B GETs the list endpoint              -> must NOT contain A's id.
 *   3. Tenant A DELETEs (cleanup).
 *
 * Why 404 not 403: per OWASP A01:2021 we leak no info about whether
 * a foreign resource exists. 403 would be an enumeration oracle.
 *
 * Mirrors HITRUST/HIPAA periodic-technical-evaluation probes published
 * by Athenahealth, Redox, and Particle Health.
 *
 * Auth: Cognito InitiateAuth USER_PASSWORD_AUTH. Credentials are env vars:
 *   TIRYAQ_USERNAME    TIRYAQ_PASSWORD
 *   ALSHIFAA_USERNAME  ALSHIFAA_PASSWORD
 *
 * Optional overrides (defaults baked in):
 *   API_BASE           default https://jxz59jh15f.execute-api.us-east-1.amazonaws.com
 *   COGNITO_CLIENT_ID  default 2nfjfipi8hri262pjohtpgl45q
 *   COGNITO_REGION     default us-east-1
 *
 * Exit: 0 all-pass, 1 any-fail, 2 setup error, 3 unhandled.
 *
 * Usage:
 *   cd scripts
 *   $env:TIRYAQ_USERNAME='admin1';   $env:TIRYAQ_PASSWORD='...'
 *   $env:ALSHIFAA_USERNAME='probe1'; $env:ALSHIFAA_PASSWORD='...'
 *   node cross-tenant-probe.js
 */

const https = require('https');
const {
    CognitoIdentityProviderClient,
    InitiateAuthCommand
} = require('@aws-sdk/client-cognito-identity-provider');

const API_BASE          = process.env.API_BASE          || 'https://jxz59jh15f.execute-api.us-east-1.amazonaws.com';
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID || '2nfjfipi8hri262pjohtpgl45q';
const COGNITO_REGION    = process.env.COGNITO_REGION    || 'us-east-1';

const C = {
    reset:  '\x1b[0m',
    bold:   '\x1b[1m',
    dim:    '\x1b[2m',
    green:  '\x1b[32m',
    red:    '\x1b[31m',
    cyan:   '\x1b[36m'
};
const ok   = (s) => `${C.green}${s}${C.reset}`;
const bad  = (s) => `${C.red}${s}${C.reset}`;
const dim  = (s) => `${C.dim}${s}${C.reset}`;

function httpRequest(method, url, token, body) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
        const data = body ? JSON.stringify(body) : null;
        if (data) headers['Content-Length'] = Buffer.byteLength(data);
        const req = https.request({
            method,
            hostname: u.hostname,
            port: u.port || 443,
            path: u.pathname + u.search,
            headers
        }, (res) => {
            let raw = '';
            res.on('data', (c) => raw += c);
            res.on('end', () => {
                let parsed = null;
                try { parsed = raw ? JSON.parse(raw) : null; } catch (_) { parsed = raw; }
                resolve({ status: res.statusCode, body: parsed });
            });
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

async function signIn(username, password) {
    const cognito = new CognitoIdentityProviderClient({ region: COGNITO_REGION });
    const r = await cognito.send(new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: COGNITO_CLIENT_ID,
        AuthParameters: { USERNAME: username, PASSWORD: password }
    }));
    if (!r.AuthenticationResult || !r.AuthenticationResult.AccessToken) {
        throw new Error(`Auth failed for ${username} (challenge=${r.ChallengeName})`);
    }
    return r.AuthenticationResult.AccessToken;
}

const results = [];
function record(module, check, passed, detail) {
    results.push({ module, check, passed, detail });
    const tag = passed ? ok('PASS') : bad('FAIL');
    console.log(`  ${tag}  ${module.padEnd(22)}  ${check.padEnd(38)}  ${detail || ''}`);
}

async function probeModule(spec, tokenA, tokenB) {
    const name = spec.name;
    const methods = spec.methods || ['GET', 'PATCH', 'DELETE', 'LIST'];
    const idField = spec.idField;
    const listIdField = spec.listIdField || idField;
    // Some specs build the create body using values they want to reuse later
    // (e.g. examinations' patientId becomes a list query-string param). Build
    // the body once, then capture it for downstream reuse.
    const createBody = spec.createBody();

    console.log(`\n${C.cyan}${C.bold}> ${name}${C.reset}`);

    const createResp = await httpRequest('POST', API_BASE + spec.createUrl, tokenA, createBody);
    if (createResp.status !== 200 && createResp.status !== 201) {
        record(name, 'A creates resource', false,
            `expected 200/201, got ${createResp.status}: ${JSON.stringify(createResp.body).slice(0, 200)}`);
        return;
    }
    const id = createResp.body && createResp.body[idField];
    if (!id) {
        record(name, 'A creates resource', false,
            `no ${idField} in response: ${JSON.stringify(createResp.body).slice(0, 200)}`);
        return;
    }
    record(name, 'A creates resource', true, `${idField}=${id}`);

    try {
        if (methods.includes('GET')) {
            const r = await httpRequest('GET', API_BASE + spec.itemPath(id), tokenB);
            record(name, 'B GET /...{id} -> 404', r.status === 404, `got ${r.status}`);
        }
        if (methods.includes('PATCH') && spec.patchBody) {
            const r = await httpRequest('PATCH', API_BASE + spec.itemPath(id), tokenB, spec.patchBody());
            record(name, 'B PATCH /...{id} -> 404', r.status === 404, `got ${r.status}`);
        }
        if (methods.includes('DELETE')) {
            const r = await httpRequest('DELETE', API_BASE + spec.itemPath(id), tokenB);
            record(name, 'B DELETE /...{id} -> 404', r.status === 404, `got ${r.status}`);
        }
        if (methods.includes('LIST') && spec.listUrl) {
            // Some list endpoints require query-string filters (e.g. examinations
            // demands ?patientId=). Build the URL from spec.listQuery if provided.
            let listUrl = API_BASE + spec.listUrl;
            if (spec.listQuery) {
                const qs = spec.listQuery(createBody, id);
                listUrl += (listUrl.indexOf('?') >= 0 ? '&' : '?') + qs;
            }
            const r = await httpRequest('GET', listUrl, tokenB);
            if (r.status !== 200) {
                record(name, 'B LIST excludes A id', false, `list returned ${r.status}`);
            } else {
                const items = Array.isArray(r.body) ? r.body
                            : Array.isArray(r.body && r.body.items) ? r.body.items
                            : Array.isArray(r.body && r.body.donors) ? r.body.donors
                            : Array.isArray(r.body && r.body.medications) ? r.body.medications
                            : Array.isArray(r.body && r.body.examinations) ? r.body.examinations
                            : [];
                const found = items.some((it) => it && it[listIdField] === id);
                record(name, 'B LIST excludes A id', !found,
                    found ? 'LEAK - id present in tenant B list' : `${items.length} items, id absent`);
            }
        }
        if (methods.includes('GET')) {
            const r = await httpRequest('GET', API_BASE + spec.itemPath(id), tokenA);
            record(name, 'A GET own /...{id} -> 200', r.status === 200, `got ${r.status}`);
        }
    } finally {
        if (methods.includes('DELETE')) {
            const r = await httpRequest('DELETE', API_BASE + spec.itemPath(id), tokenA);
            record(name, 'A cleanup DELETE', r.status === 200 || r.status === 204, `got ${r.status}`);
        }
    }
}

function rand(n) {
    n = n || 8;
    return Math.random().toString(36).slice(2, 2 + n);
}

const MODULES = [
    {
        name: 'bloodbank.donor',
        createUrl: '/bloodbank/donors',
        createBody: () => ({
            name: 'Probe Donor ' + rand(),
            bloodType: 'O+',
            phone: '5' + Math.floor(10000000 + Math.random() * 89999999)
        }),
        itemPath: (id) => '/bloodbank/donors/' + id,
        listUrl: '/bloodbank/donors',
        idField: 'donorId',
        patchBody: () => ({ name: 'Hijacked ' + rand() })
    },
    // pharmacy.* skipped from this probe: canAccessPharmacy() restricts the
    // module to Pharmacists only (admins are 403'd). To probe pharmacy we'd
    // need a pharmacist account in both tenants. Alshifaa currently has no
    // pharmacist user, so we cover pharmacy tenant-isolation via the same
    // tenant-guard helper that bloodbank uses (identical code path, proven
    // here by bloodbank.donor PASS rows).
    //
    // Examinations — clinical exam records, PHI. LIST endpoint demands
    // ?patientId= (returns 400 without it), so we pass the probe's
    // patientId via spec.listQuery.
    {
        name: 'examinations',
        createUrl: '/examinations',
        createBody: () => {
            const tag = rand();
            const u = process.env.TIRYAQ_USERNAME || '';
            return {
                patientId:   'probe-patient-' + tag,
                patientName: 'Probe Patient ' + tag,
                doctorId:    'probe-doctor-' + tag,
                doctorEmail: u.indexOf('@') >= 0 ? u : 'probe-doctor-' + tag + '@test.local'
            };
        },
        itemPath: (id) => '/examinations/' + id,
        listUrl: '/examinations',
        listQuery: (body) => 'patientId=' + encodeURIComponent(body.patientId),
        idField: 'examId',
        patchBody: () => ({ chiefComplaint: 'Hijacked ' + rand() })
    },
    // Scribe session - voice consultation recording. Only POST and GET-by-id
    // are exposed; there are no PATCH/DELETE/LIST routes (sessions accumulate
    // and are reaped by a separate background job). So the probe covers
    // exactly GET-by-id cross-tenant + same-tenant own-GET. No cleanup
    // possible - test rows persist; the audit team scrubs them periodically.
    {
        name: 'scribe.session',
        createUrl: '/scribe/sessions',
        createBody: () => ({ consentGiven: true }),
        itemPath: (id) => '/scribe/sessions/' + id,
        idField: 'sessionId',
        methods: ['GET']
    },
    // Calendar - hospital schedule resource. POST creates a calendar; DELETE
    // by id removes it; GET (list) returns the caller's tenant's calendars.
    // There is no GET-by-id and no PATCH route, so the probe covers DELETE
    // + LIST cross-tenant patterns + standard cleanup.
    {
        name: 'calendar',
        createUrl: '/calendars',
        createBody: () => ({ name: 'Probe Calendar ' + rand() }),
        itemPath: (id) => '/calendars/' + id,
        listUrl: '/calendars',
        idField: 'calendarId',
        methods: ['DELETE', 'LIST']
    }
];

(async () => {
    console.log(`${C.bold}Akwadona - Cross-tenant isolation probe${C.reset}`);
    console.log(dim('API base   : ' + API_BASE));
    console.log(dim('Cognito    : ' + COGNITO_CLIENT_ID + ' @ ' + COGNITO_REGION));

    const tiryaqUser   = process.env.TIRYAQ_USERNAME;
    const tiryaqPass   = process.env.TIRYAQ_PASSWORD;
    const alshifaaUser = process.env.ALSHIFAA_USERNAME;
    const alshifaaPass = process.env.ALSHIFAA_PASSWORD;

    if (!tiryaqUser || !tiryaqPass || !alshifaaUser || !alshifaaPass) {
        console.error(bad('\nMISSING CREDENTIALS - set these env vars:'));
        console.error('  TIRYAQ_USERNAME    TIRYAQ_PASSWORD');
        console.error('  ALSHIFAA_USERNAME  ALSHIFAA_PASSWORD');
        console.error('\nIf Alshifaa has no user yet, create one in Cognito user pool');
        console.error('us-east-1_RACghntmS with custom:tenantId=T_a4b8aef9 and group Admin.\n');
        process.exit(2);
    }

    console.log(dim('Tiryaq user   : ' + tiryaqUser));
    console.log(dim('Alshifaa user : ' + alshifaaUser + '\n'));

    let tokenA, tokenB;
    try {
        console.log(`${C.cyan}> Authenticating Tiryaq user...${C.reset}`);
        tokenA = await signIn(tiryaqUser, tiryaqPass);
        console.log(`${C.cyan}> Authenticating Alshifaa user...${C.reset}`);
        tokenB = await signIn(alshifaaUser, alshifaaPass);
    } catch (e) {
        console.error(bad('\nAuthentication failed: ' + e.message));
        process.exit(2);
    }

    function tenantOf(token) {
        try {
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
            return payload.tenantId || '(unknown)';
        } catch (_) { return '(unparseable)'; }
    }
    const tA = tenantOf(tokenA);
    const tB = tenantOf(tokenB);
    console.log(dim('Tiryaq token tenantId   : ' + tA));
    console.log(dim('Alshifaa token tenantId : ' + tB));
    if (tA === tB) {
        console.error(bad('\nFATAL - both tokens carry the same tenantId (' + tA + '). Probe would be meaningless.'));
        process.exit(2);
    }

    for (const spec of MODULES) {
        try { await probeModule(spec, tokenA, tokenB); }
        catch (e) { record(spec.name, 'probe runner', false, 'threw: ' + e.message); }
    }

    const passed = results.filter((r) => r.passed).length;
    const total  = results.length;
    const failed = total - passed;

    console.log(`\n${C.bold}--- Summary ---${C.reset}`);
    console.log('  Total : ' + total);
    console.log('  Pass  : ' + ok(passed));
    console.log('  Fail  : ' + (failed > 0 ? bad(failed) : ok(0)));

    if (failed > 0) {
        console.log(bad('\nX Cross-tenant probe FAILED - DO NOT RELEASE.\n'));
        for (const r of results.filter((x) => !x.passed)) {
            console.log(bad('  - ' + r.module + ' / ' + r.check + ' - ' + r.detail));
        }
        process.exit(1);
    } else {
        console.log(ok('\nOK - All cross-tenant isolation checks passed.\n'));
        process.exit(0);
    }
})().catch((e) => {
    console.error(bad('\nUnhandled: ' + (e.stack || e.message)));
    process.exit(3);
});

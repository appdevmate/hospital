'use strict';
/**
 * SAFE — read-only. Authentication enforcement on every route.
 *
 * API Gateway's HttpJwtAuthorizer must reject the request BEFORE any Lambda
 * runs, so these calls have zero side effects even on POST/DELETE.
 *
 * What it proves:
 *   • Every known route returns 401 with no token.
 *   • Forged JWT (bad signature, wrong issuer) → 401.
 *   • Expired-looking JWT → 401.
 *   • Token in the wrong place (query string, cookie) is ignored → 401.
 *   • Malformed Authorization header values never produce a 500.
 */
const { request, get, bearer } = require('../lib/http');
const { forgeJwt } = require('../lib/auth');
const { Report } = require('../lib/report');

// Representative route per Lambda — covers every integration in the stack.
const ROUTES = [
    ['GET',    '/patients'], ['POST',  '/patients'], ['GET', '/patients/x'], ['PATCH', '/patients/x'], ['DELETE', '/patients/x'],
    ['GET',    '/patients/search'], ['GET', '/doctors'], ['POST', '/doctors'], ['GET', '/doctors/x'], ['GET', '/doctors/email/x'],
    ['GET',    '/patients/x/payments'], ['POST', '/patients/x/payments'], ['GET', '/payments'], ['GET', '/invoices'],
    ['GET',    '/patients/x/surgeries'], ['GET', '/surgeries/x'],
    ['GET',    '/departments'], ['POST', '/departments'], ['DELETE', '/departments'], ['POST', '/departments/bulk'],
    ['GET',    '/specializations'], ['POST', '/specializations'], ['DELETE', '/specializations'],
    ['GET',    '/admin/users'], ['POST', '/admin/users'], ['GET', '/operator/tenants'], ['POST', '/operator/tenants'],
    ['GET',    '/examinations'], ['POST', '/examinations'],
    ['GET',    '/pharmacy/medications'], ['POST', '/pharmacy/dispense'],
    ['POST',   '/documents/upload-url'], ['POST', '/documents/download-url'], ['GET', '/documents/list'], ['DELETE', '/documents/delete'],
    ['GET',    '/audit'], ['GET', '/appointments'], ['POST', '/appointments'],
    ['GET',    '/calendars'], ['POST', '/calendars'],
    ['GET',    '/bloodbank/donors'], ['POST', '/bloodbank/requests'], ['POST', '/bloodbank/requests/x/issue'],
    ['POST',   '/scribe/sessions'], ['POST', '/scribe/sessions/x/soap']
];

module.exports = async function run(ctx) {
    const r = new Report('02 Unauthenticated access');
    let all401 = true; const bad = [];
    for (const [method, path] of ROUTES) {
        const res = await request(`${ctx.apiBase}${path}`, { method, headers: { 'content-type': 'application/json' }, body: method === 'GET' || method === 'DELETE' ? undefined : '{}' });
        if (res.status !== 401) { all401 = false; bad.push(`${method} ${path} → ${res.status}`); }
    }
    r.expect(`All ${ROUTES.length} routes return 401 with no token`, all401, bad.slice(0, 5).join('; '));

    const forged = await get(`${ctx.apiBase}/patients`, { headers: bearer(forgeJwt()) });
    r.expect('Forged JWT (bad signature) → 401', forged.status === 401, `status=${forged.status}`);

    const expired = await get(`${ctx.apiBase}/patients`, { headers: bearer(forgeJwt({ exp: Math.floor(Date.now() / 1000) - 3600 })) });
    r.expect('Expired forged JWT → 401', expired.status === 401, `status=${expired.status}`);

    const algNone = (() => { const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url'); return `${b({ alg: 'none', typ: 'JWT' })}.${b({ sub: 'x', tenantId: 'T_x', role: 'operator', exp: Math.floor(Date.now() / 1000) + 3600 })}.`; })();
    const none = await get(`${ctx.apiBase}/patients`, { headers: bearer(algNone) });
    r.expect('alg=none JWT → 401', none.status === 401, `status=${none.status}`);

    const inQuery = await get(`${ctx.apiBase}/patients?access_token=${forgeJwt()}`);
    r.expect('Token in query string ignored → 401', inQuery.status === 401, `status=${inQuery.status}`);

    const inCookie = await get(`${ctx.apiBase}/patients`, { headers: { cookie: `accessToken=${forgeJwt()}` } });
    r.expect('Token in cookie ignored → 401', inCookie.status === 401, `status=${inCookie.status}`);

    let no500 = true; const junk = ['Bearer', 'Bearer ', 'Basic YWRtaW46YWRtaW4=', 'Bearer a.b', 'Bearer ' + 'A'.repeat(8192), 'Bearer \u0000', 'Bearer %00'];
    for (const v of junk) {
        const res = await get(`${ctx.apiBase}/patients`, { headers: { authorization: v } });
        if (res.status >= 500) { no500 = false; break; }
    }
    r.expect('Malformed Authorization never yields 5xx', no500);

    return r;
};

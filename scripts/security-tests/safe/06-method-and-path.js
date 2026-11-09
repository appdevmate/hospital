'use strict';
/**
 * SAFE — read-only. HTTP method / path handling edge cases.
 *
 * What it proves:
 *   • Unsupported methods (PUT, TRACE, HEAD on POST-only) → 404/405, not 500.
 *   • Absurdly long URL / query string → 414/400/404, never 500.
 *   • Path traversal and encoded slashes in the path do not reach a Lambda
 *     with a mangled rawPath (API Gateway normalises or 404s).
 *   • Non-JSON content-type on a JSON endpoint is rejected cleanly (needs a
 *     session; the POST body is empty so nothing is created).
 */
const { request, get, bearer } = require('../lib/http');
const { Report } = require('../lib/report');

module.exports = async function run(ctx) {
    const r = new Report('06 Method + path handling');
    const api = ctx.apiBase;

    for (const m of ['PUT', 'TRACE', 'HEAD', 'CONNECT', 'PROPFIND']) {
        const res = await request(`${api}/patients`, { method: m });
        r.expect(`${m} /patients → 401/404/405 (not 5xx)`, [401, 403, 404, 405].includes(res.status), `status=${res.status}`);
    }

    const longQ = await get(`${api}/patients?q=${'A'.repeat(16000)}`);
    r.expect('16 KB query string → 4xx not 5xx', longQ.status >= 400 && longQ.status < 500, `status=${longQ.status}`);

    for (const p of ['/patients/..%2F..%2Fadmin%2Fusers', '/patients/%2e%2e/%2e%2e/operator/tenants', '/documents/list/../../etc/passwd', '/%2fpatients', '/patients/;/admin/users']) {
        const res = await get(`${api}${p}`);
        r.expect(`Traversal "${p.slice(0, 36)}" → 401/404`, [401, 404].includes(res.status), `status=${res.status}`);
    }

    if (ctx.sessions.a) {
        const tok = bearer(ctx.sessions.a.accessToken);
        const xml = await request(`${api}/patients`, { method: 'POST', headers: { ...tok, 'content-type': 'text/xml' }, body: '<x/>' });
        r.expect('POST with text/xml body → 4xx (not 5xx, nothing created)', xml.status >= 400 && xml.status < 500, `status=${xml.status}`);
        const empty = await request(`${api}/patients`, { method: 'POST', headers: { ...tok, 'content-type': 'application/json' }, body: '' });
        r.expect('POST with empty body → 4xx', empty.status >= 400 && empty.status < 500, `status=${empty.status}`);
        const notJson = await request(`${api}/patients`, { method: 'POST', headers: { ...tok, 'content-type': 'application/json' }, body: '{not json' });
        r.expect('POST with malformed JSON → 4xx', notJson.status >= 400 && notJson.status < 500, `status=${notJson.status}`);
    } else r.skip('Content-type / body checks', 'set AKWADONA_USERNAME/PASSWORD');

    return r;
};

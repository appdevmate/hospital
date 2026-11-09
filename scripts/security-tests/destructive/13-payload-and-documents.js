'use strict';
/**
 * DESTRUCTIVE — writes to the documents module + large bodies. Dev only.
 *
 * What it proves:
 *   • Oversized JSON body (> 6 MB Lambda payload / 10 MB API GW) → 413, not 5xx.
 *   • Deeply nested JSON → 4xx, not a stack overflow 5xx.
 *   • documents/upload-url refuses keys with traversal or another tenant's prefix.
 *   • documents/download-url for a key outside the caller's tenant → 404.
 *   • Pre-signed URL (if issued) is scoped: PUT to a different key with the
 *     same signature is rejected by S3.
 */
const { post, request, bearer } = require('../lib/http');
const { Report } = require('../lib/report');

module.exports = async function run(ctx) {
    const r = new Report('13 Payload limits + documents');
    if (!ctx.sessions.a) { r.skip('all', 'set AKWADONA_USERNAME/PASSWORD'); return r; }
    const tok = bearer(ctx.sessions.a.accessToken);
    const api = ctx.apiBase;

    const huge = await post(`${api}/patients`, { name: 'x'.repeat(7 * 1024 * 1024) }, { headers: tok, timeoutMs: 60000 });
    r.expect('7 MB body → 413 (not 5xx)', huge.status === 413 || (huge.status >= 400 && huge.status < 500), `status=${huge.status}`);

    const nested = '{"a":'.repeat(5000) + '1' + '}'.repeat(5000);
    const deep = await request(`${api}/patients`, { method: 'POST', headers: { ...tok, 'content-type': 'application/json' }, body: nested, timeoutMs: 30000 });
    r.expect('Deeply nested JSON → 4xx (no stack-overflow 5xx)', deep.status >= 400 && deep.status < 500, `status=${deep.status}`);

    for (const key of ['../../etc/passwd', 'T_deadbeef/x.pdf', '/absolute/x.pdf', 'x%00.pdf', 'a'.repeat(2000) + '.pdf']) {
        const res = await post(`${api}/documents/upload-url`, { fileName: key, folder: 'lab-reports', contentType: 'application/pdf' }, { headers: tok });
        r.expect(`upload-url refuses "${key.slice(0, 24)}"`, res.status >= 400 && res.status < 500, `status=${res.status}`);
    }
    const foreignKey = await post(`${api}/documents/download-url`, { key: 'T_deadbeef/lab-reports/anything.pdf' }, { headers: tok });
    r.expect('download-url for foreign tenant key → 404/403', [403, 404].includes(foreignKey.status), `status=${foreignKey.status}`);

    const legit = await post(`${api}/documents/upload-url`, { fileName: 'probe.txt', folder: 'lab-reports', contentType: 'text/plain' }, { headers: tok });
    if (legit.status === 200 && legit.json && legit.json.uploadUrl) {
        const tampered = legit.json.uploadUrl.replace(/probe\.txt/, 'other.txt');
        const put = await request(tampered, { method: 'PUT', headers: { 'content-type': 'text/plain' }, body: 'x' });
        r.expect('Pre-signed URL cannot be re-pointed at another key', put.status === 403, `status=${put.status}`);
    } else r.skip('Pre-signed URL re-point', `upload-url → ${legit.status}`);

    return r;
};

'use strict';
/**
 * SAFE — read-only. CORS allow-list enforcement (API Gateway corsPreflight).
 *
 * What it proves:
 *   • Preflight from an allowed origin echoes that origin, not `*`.
 *   • Preflight from an unknown origin gets NO Access-Control-Allow-Origin.
 *   • Credentials are not allowed (allowCredentials:false).
 *   • Only the three declared request headers are allowed.
 *   • The S3 documents bucket does not answer CORS to unknown origins.
 */
const { options, get } = require('../lib/http');
const { Report } = require('../lib/report');

module.exports = async function run(ctx) {
    const r = new Report('03 CORS allow-list');
    const url = `${ctx.apiBase}/patients`;
    const pre = (origin, extra = {}) => options(url, { headers: { origin, 'access-control-request-method': 'GET', 'access-control-request-headers': 'authorization,content-type', ...extra } });

    const allowed = await pre(ctx.siteBase);
    r.expect('Allowed origin is echoed back', allowed.headers['access-control-allow-origin'] === ctx.siteBase, `got "${allowed.headers['access-control-allow-origin'] || ''}"`);
    r.expect('Allow-Origin is never *', allowed.headers['access-control-allow-origin'] !== '*');
    r.expect('Allow-Credentials is not true', (allowed.headers['access-control-allow-credentials'] || '').toLowerCase() !== 'true', allowed.headers['access-control-allow-credentials'] || 'absent');

    for (const evil of ['https://evil.example', 'https://akwadona.com.evil.example', 'https://wwwakwadona.com', 'null', 'https://www.akwadona.com.', 'http://www.akwadona.com']) {
        const res = await pre(evil);
        r.expect(`Unknown origin "${evil}" gets no Allow-Origin`, !res.headers['access-control-allow-origin'], res.headers['access-control-allow-origin'] || '');
    }

    const hdr = await pre(ctx.siteBase, { 'access-control-request-headers': 'authorization,content-type,x-client-request-id,x-evil' });
    const allowedHeaders = (hdr.headers['access-control-allow-headers'] || '').toLowerCase();
    r.expect('X-Evil request header not allowed', !allowedHeaders.includes('x-evil'), allowedHeaders || 'absent');

    // Documents bucket (pre-signed URL target) — must not CORS-answer strangers.
    if (ctx.documentsBucketUrl) {
        const b = await options(ctx.documentsBucketUrl, { headers: { origin: 'https://evil.example', 'access-control-request-method': 'PUT' } });
        r.expect('Documents bucket: unknown origin gets no Allow-Origin', !b.headers['access-control-allow-origin'], b.headers['access-control-allow-origin'] || '');
    } else r.skip('Documents bucket CORS', 'set DOCUMENTS_BUCKET_URL to test');

    return r;
};

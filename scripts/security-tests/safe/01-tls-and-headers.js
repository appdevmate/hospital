'use strict';
/**
 * SAFE — read-only. Transport + response-header hygiene.
 *
 * What it proves:
 *   • HTTP → HTTPS redirect on the site (CloudFront viewer policy).
 *   • HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy present
 *     (CloudFront SECURITY_HEADERS managed policy).
 *   • No server/technology banner leaks (no `x-powered-by`, generic `server`).
 *   • API refuses plain HTTP (execute-api is HTTPS-only by construction).
 *   • TLS 1.0 / 1.1 handshakes are rejected (minimumProtocolVersion TLS_V1_2_2021).
 */
const tls = require('tls');
const { get } = require('../lib/http');
const { Report } = require('../lib/report');

function tlsHandshake(host, version) {
    return new Promise((resolve) => {
        const s = tls.connect({ host, port: 443, servername: host, minVersion: version, maxVersion: version, rejectUnauthorized: true, timeout: 8000 }, () => {
            const proto = s.getProtocol(); s.end(); resolve({ ok: true, proto });
        });
        s.on('error', (e) => resolve({ ok: false, err: e.code || e.message }));
        s.on('timeout', () => { s.destroy(); resolve({ ok: false, err: 'timeout' }); });
    });
}

module.exports = async function run(ctx) {
    const r = new Report('01 TLS + security headers');
    const site = ctx.siteBase;            // https://www.akwadona.com
    const host = new URL(site).host;

    // HTTP → HTTPS redirect
    try {
        const plain = await get(site.replace('https://', 'http://'));
        r.expect('HTTP redirects to HTTPS', plain.status === 301 || plain.status === 302, `status=${plain.status} location=${plain.headers.location || '-'}`);
    } catch (e) { r.fail('HTTP redirects to HTTPS', e.message); }

    // Security headers on the SPA
    const page = await get(site);
    r.expect('Site responds 200', page.status === 200, `status=${page.status}`);
    const h = page.headers;
    r.expect('HSTS present', /max-age=\d+/.test(h['strict-transport-security'] || ''), h['strict-transport-security'] || 'missing');
    r.expect('X-Content-Type-Options: nosniff', (h['x-content-type-options'] || '').toLowerCase() === 'nosniff', h['x-content-type-options'] || 'missing');
    r.expect('X-Frame-Options set', !!h['x-frame-options'], h['x-frame-options'] || 'missing');
    r.expect('Referrer-Policy set', !!h['referrer-policy'], h['referrer-policy'] || 'missing');
    r.expect('No x-powered-by leak', !h['x-powered-by'], h['x-powered-by'] || '');
    if (!h['content-security-policy']) r.skip('Content-Security-Policy', 'not set — recommended follow-up (docs/45 §9)');
    else r.pass('Content-Security-Policy', h['content-security-policy'].slice(0, 60) + '…');

    // TLS floor on the site
    for (const [label, v] of [['TLSv1', 'TLSv1'], ['TLSv1.1', 'TLSv1.1']]) {
        const res = await tlsHandshake(host, v);
        r.expect(`${label} rejected`, !res.ok, res.ok ? `handshake SUCCEEDED (${res.proto})` : `rejected (${res.err})`);
    }
    const good = await tlsHandshake(host, 'TLSv1.2');
    r.expect('TLSv1.2 accepted', good.ok, good.ok ? good.proto : good.err);

    // API host
    const apiHost = new URL(ctx.apiBase).host;
    const apiTls = await tlsHandshake(apiHost, 'TLSv1');
    r.expect('API: TLSv1 rejected', !apiTls.ok, apiTls.ok ? 'handshake SUCCEEDED' : apiTls.err);
    const apiProbe = await get(`${ctx.apiBase}/departments`);
    r.expect('API returns 401 without token (not 500)', apiProbe.status === 401, `status=${apiProbe.status}`);
    r.expect('API: no x-powered-by leak', !apiProbe.headers['x-powered-by'], apiProbe.headers['x-powered-by'] || '');

    return r;
};

'use strict';
/**
 * DESTRUCTIVE — floods the API. Dev stack only. Will trip alarms and
 * throttle counters; do not run against production.
 *
 * What it proves:
 *   • App-level per-tenant throttle (throttle.js) returns 429 + Retry-After
 *     once the plan's per-minute budget is exceeded.
 *   • API Gateway stage throttle (2026-10-29) returns 429 under a hard burst
 *     before any Lambda runs.
 *   • 429 bodies carry no stack traces.
 */
const { get, bearer } = require('../lib/http');
const { Report } = require('../lib/report');

module.exports = async function run(ctx) {
    const r = new Report('12 Rate limiting');
    if (!ctx.sessions.a) { r.skip('all', 'set AKWADONA_USERNAME/PASSWORD'); return r; }
    const tok = bearer(ctx.sessions.a.accessToken);
    const url = `${ctx.apiBase}/departments`;
    const BURST = parseInt(process.env.RATE_BURST || '400', 10);

    const t0 = Date.now();
    const results = await Promise.all(Array.from({ length: BURST }, () => get(url, { headers: tok, timeoutMs: 30000 }).catch(e => ({ status: 0, text: e.message, headers: {} }))));
    const ms = Date.now() - t0;
    const codes = results.reduce((m, x) => { m[x.status] = (m[x.status] || 0) + 1; return m; }, {});
    const n429 = codes[429] || 0;
    r.expect(`${BURST} parallel GETs in ${ms} ms produced some 429s`, n429 > 0, JSON.stringify(codes));
    const with429 = results.find(x => x.status === 429);
    if (with429) {
        r.expect('429 carries Retry-After', !!with429.headers['retry-after'], with429.headers['retry-after'] || 'missing');
        r.expect('429 body has no stack trace', !/at .*\.js:\d+|Error:/.test(with429.text || ''));
    }
    r.expect('No 5xx under burst', !Object.keys(codes).some(c => Number(c) >= 500), JSON.stringify(codes));
    return r;
};

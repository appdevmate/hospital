'use strict';
/**
 * SAFE — read-only. Injection payloads on GET query parameters.
 *
 * DynamoDB has no SQL, but FilterExpressions are still string-built from
 * user input in several list handlers. This throws classic payloads at the
 * read endpoints and asserts: never a 5xx, never an error body that echoes
 * DynamoDB expression internals, and (where we can tell) no result that
 * belongs to another tenant.
 *
 * Needs AKWADONA_USERNAME / _PASSWORD; skipped otherwise. GET only.
 */
const { get, bearer } = require('../lib/http');
const { Report } = require('../lib/report');

const PAYLOADS = [
    `' OR 1=1 --`, `" OR ""="`, `#pk = :pfx OR attribute_exists(PK)`, `:tid`, `#tid`, `attribute_exists(#pk)`,
    `{"$ne":null}`, `{"$gt":""}`, `__proto__`, `constructor.prototype`, `%00`, `\u0000`, `<script>alert(1)</script>`,
    `../../etc/passwd`, `..%2F..%2F`, `${'A'.repeat(4096)}`, `😀`.repeat(64), `T_a4b8aef9`, `T_2572fc71`
];
const ENDPOINTS = [
    (p) => `/patients?search=${encodeURIComponent(p)}`,
    (p) => `/patients?name.contains=${encodeURIComponent(p)}`,
    (p) => `/patients?sortField=${encodeURIComponent(p)}`,
    (p) => `/patients?lastKey=${encodeURIComponent(p)}`,
    (p) => `/patients?pageSize=${encodeURIComponent(p)}&offset=${encodeURIComponent(p)}`,
    (p) => `/patients/search?q=${encodeURIComponent(p)}`,
    (p) => `/doctors?search=${encodeURIComponent(p)}`,
    (p) => `/doctors?department.equals=${encodeURIComponent(p)}`,
    (p) => `/doctors/email/${encodeURIComponent(p)}`,
    (p) => `/appointments?date=${encodeURIComponent(p)}`,
    (p) => `/pharmacy/medications?q=${encodeURIComponent(p)}`,
    (p) => `/audit?from=${encodeURIComponent(p)}&to=${encodeURIComponent(p)}`,
    (p) => `/documents/list?folder=${encodeURIComponent(p)}`,
    (p) => `/bloodbank/units?bloodGroup=${encodeURIComponent(p)}`
];
const LEAK_RE = /(ExpressionAttribute|ValidationException|KeyConditionExpression|FilterExpression|Syntax error|ResourceNotFoundException|AccessDenied|at Object\.|\.js:\d+)/i;

module.exports = async function run(ctx) {
    const r = new Report('05 Injection (read-only)');
    if (!ctx.sessions.a) { r.skip('all', ctx.sessions.aError || 'set AKWADONA_USERNAME/PASSWORD'); return r; }
    const tok = bearer(ctx.sessions.a.accessToken);
    const myTenant = ctx.sessions.a.claims.tenantId;

    let n = 0, s5xx = [], leaks = [], foreign = [];
    for (const build of ENDPOINTS) {
        for (const p of PAYLOADS) {
            const path = build(p); n++;
            const res = await get(`${ctx.apiBase}${path}`, { headers: tok });
            if (res.status >= 500) s5xx.push(`${path.slice(0, 50)} → ${res.status}`);
            if (LEAK_RE.test(res.text || '')) leaks.push(path.slice(0, 50));
            const items = res.json && (res.json.data || res.json.items || res.json.patients || res.json.doctors);
            if (Array.isArray(items) && items.some(it => it && it.tenantId && it.tenantId !== myTenant)) foreign.push(path.slice(0, 50));
        }
    }
    r.expect(`${n} payload×endpoint combos: zero 5xx`, s5xx.length === 0, s5xx.slice(0, 4).join('; '));
    r.expect('No DynamoDB/stack-trace internals in any response body', leaks.length === 0, leaks.slice(0, 4).join('; '));
    r.expect('No row from another tenant in any result', foreign.length === 0, foreign.slice(0, 4).join('; '));

    // Sort-field whitelist: an unknown sortField must be ignored, not errored.
    const sf = await get(`${ctx.apiBase}/patients?sortField=__proto__&pageSize=1`, { headers: tok });
    r.expect('Unknown sortField is ignored (200)', sf.status === 200, `status=${sf.status}`);
    const big = await get(`${ctx.apiBase}/patients?pageSize=999999`, { headers: tok });
    r.expect('pageSize is clamped (200, ≤100 rows)', big.status === 200 && (!big.json || !Array.isArray(big.json.data) || big.json.data.length <= 100), `status=${big.status} rows=${big.json && big.json.data ? big.json.data.length : '-'}`);

    return r;
};

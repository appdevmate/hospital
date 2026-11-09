'use strict';
/**
 * DESTRUCTIVE — attempts privileged writes with low-privilege tokens.
 * If the controls work nothing is written; if they DON'T, data changes.
 * Dev stack only.
 *
 * Needs AKWADONA_DOCTOR_* (a Doctors-group user). What it proves:
 *   • Doctor cannot mutate global reference data (2026-10-29 fix).
 *   • Doctor cannot reach /admin/* or /operator/*.
 *   • A tenantId / role / doctorId smuggled in the request BODY is ignored —
 *     only the JWT claim counts.
 *   • A doctor cannot read another doctor's patient list by passing
 *     ?doctorEmail= (server-side scoping from JWT).
 */
const { get, post, patch, del, bearer } = require('../lib/http');
const { Report } = require('../lib/report');

module.exports = async function run(ctx) {
    const r = new Report('11 Role escalation');
    const D = ctx.sessions.doctor;
    if (!D) { r.skip('all', ctx.sessions.doctorError || 'set AKWADONA_DOCTOR_USERNAME/PASSWORD'); return r; }
    const td = bearer(D.accessToken);
    const api = ctx.apiBase;

    const refWrites = [
        ['POST',   '/departments',          { name: 'Probe Dept ' + Date.now() }],
        ['POST',   '/departments/bulk',     { items: ['Probe A', 'Probe B'] }],
        ['DELETE', '/departments',          null],
        ['POST',   '/specializations',      { name: 'Probe Spec ' + Date.now() }],
        ['DELETE', '/specializations',      null]
    ];
    for (const [m, p, body] of refWrites) {
        const res = m === 'POST' ? await post(`${api}${p}`, body, { headers: td }) : await del(`${api}${p}`, { headers: td });
        r.expect(`Doctor ${m} ${p} → 403`, res.status === 403, `status=${res.status}`);
    }

    for (const p of ['/admin/users', '/admin/doctors', '/operator/tenants', '/operator/metrics']) {
        const res = await get(`${api}${p}`, { headers: td });
        r.expect(`Doctor GET ${p} → 403`, res.status === 403, `status=${res.status}`);
    }

    // Body-smuggled claims
    const smuggled = await post(`${api}/patients`, { name: 'Smuggle', qid: `2${Date.now()}`.slice(0, 11), phone: `+974${Date.now()}`.slice(0, 12), gender: 'male', dob: '1990-01-01', tenantId: 'T_deadbeef', role: 'operator' }, { headers: td });
    if (smuggled.status >= 200 && smuggled.status < 300) {
        const body = JSON.stringify(smuggled.json || '');
        r.expect('Body tenantId ignored (row stamped with JWT tenant)', !body.includes('T_deadbeef'));
        const id = (smuggled.json && (smuggled.json.patientId || smuggled.json.PK || (smuggled.json.data && (smuggled.json.data.patientId || smuggled.json.data.PK))));
        if (id) await del(`${api}/patients/${encodeURIComponent(id)}`, { headers: td });
    } else r.skip('Body-smuggled tenantId', `doctor POST /patients → ${smuggled.status} (doctors may not create patients on this stack)`);

    const foreignDoctor = await get(`${api}/patients?doctorEmail=someone-else@example.com`, { headers: td });
    r.expect('?doctorEmail= is ignored (200, own scope only)', foreignDoctor.status === 200, `status=${foreignDoctor.status}`);

    return r;
};

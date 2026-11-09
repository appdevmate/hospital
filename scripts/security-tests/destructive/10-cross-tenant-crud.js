'use strict';
/**
 * DESTRUCTIVE — creates + deletes rows. Dev stack only.
 *
 * Tenant A creates a resource; tenant B must get 404 on GET/PATCH/DELETE and
 * must not see it in list; tenant A deletes it. This is the same contract as
 * scripts/cross-tenant-probe.js, re-implemented on the shared helpers so it
 * runs with the rest of the suite. Needs AKWADONA_* and AKWADONA_B_* creds
 * for users in DIFFERENT tenants.
 */
const { get, post, patch, del, bearer } = require('../lib/http');
const { Report } = require('../lib/report');

const MODULES = [
    { name: 'patients',  create: '/patients',           body: () => ({ name: 'Probe Patient', qid: `2${Date.now()}`.slice(0, 11), phone: `+974${Date.now()}`.slice(0, 12), gender: 'male', dob: '1990-01-01' }), idOf: (j) => j.patientId || j.PK || (j.data && (j.data.patientId || j.data.PK)), item: (id) => `/patients/${encodeURIComponent(id)}`, list: '/patients' },
    { name: 'appointments', create: '/appointments',    body: () => ({ patientId: 'PATIENT#probe', doctorId: 'DOCTOR#probe', date: new Date().toISOString(), reason: 'probe' }), idOf: (j) => j.id || j.apptId || (j.data && (j.data.id || j.data.apptId)), item: (id) => `/appointments/${encodeURIComponent(id)}`, list: '/appointments' },
    { name: 'bloodbank.donors', create: '/bloodbank/donors', body: () => ({ name: 'Probe Donor', qid: `2${Date.now()}`.slice(0, 11), phone: `+974${Date.now()}`.slice(0, 12), bloodGroup: 'O', rhFactor: '+', consentGiven: true }), idOf: (j) => j.donorId || j.id || (j.data && (j.data.donorId || j.data.id)), item: (id) => `/bloodbank/donors/${encodeURIComponent(id)}`, list: '/bloodbank/donors' }
];

module.exports = async function run(ctx) {
    const r = new Report('10 Cross-tenant CRUD isolation');
    const A = ctx.sessions.a, B = ctx.sessions.b;
    if (!A || !B) { r.skip('all', 'need AKWADONA_* and AKWADONA_B_* in different tenants'); return r; }
    if (A.claims.tenantId === B.claims.tenantId) { r.fail('Sessions A and B are in the SAME tenant — cannot test isolation'); return r; }
    const ta = bearer(A.accessToken), tb = bearer(B.accessToken);

    for (const m of MODULES) {
        const created = await post(`${ctx.apiBase}${m.create}`, m.body(), { headers: ta });
        if (created.status < 200 || created.status >= 300) { r.skip(`${m.name}: create`, `A create → ${created.status} ${String(created.text).slice(0, 80)}`); continue; }
        const id = m.idOf(created.json || {});
        if (!id) { r.skip(`${m.name}: id`, 'could not read created id from response'); continue; }

        const bGet = await get(`${ctx.apiBase}${m.item(id)}`, { headers: tb });
        r.expect(`${m.name}: B GET A's item → 404`, bGet.status === 404, `status=${bGet.status}`);
        const bPatch = await patch(`${ctx.apiBase}${m.item(id)}`, { name: 'HACKED' }, { headers: tb });
        r.expect(`${m.name}: B PATCH A's item → 404`, bPatch.status === 404, `status=${bPatch.status}`);
        const bDel = await del(`${ctx.apiBase}${m.item(id)}`, { headers: tb });
        r.expect(`${m.name}: B DELETE A's item → 404`, bDel.status === 404, `status=${bDel.status}`);
        const bList = await get(`${ctx.apiBase}${m.list}?pageSize=100`, { headers: tb });
        const seen = JSON.stringify(bList.json || '').includes(String(id));
        r.expect(`${m.name}: B list does not contain A's id`, !seen);
        const aGet = await get(`${ctx.apiBase}${m.item(id)}`, { headers: ta });
        r.expect(`${m.name}: A still reads own item (B's PATCH did nothing)`, aGet.status === 200 && !JSON.stringify(aGet.json || '').includes('HACKED'), `status=${aGet.status}`);

        const cleanup = await del(`${ctx.apiBase}${m.item(id)}`, { headers: ta });
        r.expect(`${m.name}: A cleanup delete`, cleanup.status >= 200 && cleanup.status < 300, `status=${cleanup.status}`);
    }
    return r;
};

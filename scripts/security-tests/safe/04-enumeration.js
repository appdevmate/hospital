'use strict';
/**
 * SAFE — read-only. Enumeration resistance.
 *
 * Needs a signed-in session (AKWADONA_USERNAME / _PASSWORD) for the API
 * checks; without one they are SKIPPED. All calls are GETs on IDs that do not
 * exist — nothing is written.
 *
 * What it proves:
 *   • GET on a non-existent resource id → 404 (never 403 "exists but not
 *     yours", never 500). OWASP A01 — no existence oracle.
 *   • Cognito ForgotPassword on a fake username does NOT reveal whether the
 *     user exists (preventUserExistenceErrors: true).
 *   • Cognito InitiateAuth with a fake user and wrong password gives the
 *     same error as a real user with a wrong password.
 */
const { get, request, bearer } = require('../lib/http');
const { CLIENT_ID, REGION } = require('../lib/auth');
const { Report } = require('../lib/report');

const COGNITO = `https://cognito-idp.${REGION}.amazonaws.com/`;
async function cognito(target, body) {
    return request(COGNITO, { method: 'POST', headers: { 'content-type': 'application/x-amz-json-1.1', 'x-amz-target': `AWSCognitoIdentityProviderService.${target}` }, body: JSON.stringify(body) });
}

module.exports = async function run(ctx) {
    const r = new Report('04 Enumeration resistance');
    const ghost = '00000000-0000-4000-8000-000000000000';

    if (ctx.sessions.a) {
        const tok = bearer(ctx.sessions.a.accessToken);
        const probes = [
            ['/patients/PATIENT%23' + ghost], ['/doctors/DOCTOR%23' + ghost], ['/patients/PATIENT%23' + ghost + '/payments/' + ghost],
            ['/surgeries/' + ghost], ['/examinations/' + ghost], ['/appointments/' + ghost],
            ['/pharmacy/prescriptions/' + ghost], ['/bloodbank/donors/' + ghost], ['/bloodbank/requests/' + ghost], ['/scribe/sessions/' + ghost]
        ];
        for (const [path] of probes) {
            const res = await get(`${ctx.apiBase}${path}`, { headers: tok });
            r.expect(`GET ${decodeURIComponent(path).slice(0, 40)}… → 404 (not 403/500)`, res.status === 404, `status=${res.status}`);
        }
        // Cross-tenant-shaped IDs: a foreign tenantId embedded in the path must also be 404.
        const foreign = await get(`${ctx.apiBase}/patients/PATIENT%23T_deadbeef%23${ghost}`, { headers: tok });
        r.expect('Foreign-tenant-shaped id → 404', foreign.status === 404, `status=${foreign.status}`);
    } else {
        r.skip('API 404-vs-403 checks', ctx.sessions.aError || 'set AKWADONA_USERNAME/PASSWORD');
    }

    // Cognito user-enumeration
    const fakeUser = 'no-such-user-' + Math.random().toString(36).slice(2, 10);
    const fp = await cognito('ForgotPassword', { ClientId: CLIENT_ID, Username: fakeUser });
    const fpType = (fp.json && fp.json.__type) || '';
    r.expect('ForgotPassword(fake user) does not say "UserNotFound"', !/UserNotFound/i.test(fpType), fpType || `HTTP ${fp.status}`);

    const ia = await cognito('InitiateAuth', { AuthFlow: 'USER_PASSWORD_AUTH', ClientId: CLIENT_ID, AuthParameters: { USERNAME: fakeUser, PASSWORD: 'Wrong-Password-1!' } });
    const iaType = (ia.json && ia.json.__type) || '';
    r.expect('InitiateAuth(fake user) is NotAuthorized, not UserNotFound', /NotAuthorized/i.test(iaType) && !/UserNotFound/i.test(iaType), iaType || `HTTP ${ia.status}`);

    if (process.env.AKWADONA_USERNAME) {
        const real = await cognito('InitiateAuth', { AuthFlow: 'USER_PASSWORD_AUTH', ClientId: CLIENT_ID, AuthParameters: { USERNAME: process.env.AKWADONA_USERNAME, PASSWORD: 'Wrong-Password-1!' } });
        const realType = (real.json && real.json.__type) || '';
        r.expect('Real user + wrong password gives the SAME error as fake user', realType === iaType, `${realType} vs ${iaType}`);
    }

    return r;
};

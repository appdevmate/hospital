'use strict';
/**
 * Cognito sign-in for the security suite. Uses the same InitiateAuth
 * USER_PASSWORD_AUTH flow the Angular app uses (cognito-auth.service.ts),
 * via raw HTTPS so there is no SDK dependency.
 *
 * Reads credentials from env; never from a file, never logged.
 *
 *   AKWADONA_USERNAME / AKWADONA_PASSWORD        — primary (tenant A) account
 *   AKWADONA_B_USERNAME / AKWADONA_B_PASSWORD    — tenant B account (cross-tenant tests)
 *   AKWADONA_DOCTOR_USERNAME / _PASSWORD         — a Doctors-group account (role tests)
 *   COGNITO_CLIENT_ID                            — default 6ndnfufmo100mq1rrmte7pqmhg
 *   COGNITO_REGION                               — default us-east-1
 */
const { request } = require('./http');

const REGION    = process.env.COGNITO_REGION || 'us-east-1';
const CLIENT_ID = process.env.COGNITO_CLIENT_ID || '6ndnfufmo100mq1rrmte7pqmhg';
const ENDPOINT  = `https://cognito-idp.${REGION}.amazonaws.com/`;

async function signIn(username, password) {
    if (!username || !password) return null;
    const res = await request(ENDPOINT, {
        method: 'POST',
        headers: {
            'content-type': 'application/x-amz-json-1.1',
            'x-amz-target': 'AWSCognitoIdentityProviderService.InitiateAuth'
        },
        body: JSON.stringify({
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: CLIENT_ID,
            AuthParameters: { USERNAME: username, PASSWORD: password }
        })
    });
    if (res.status !== 200 || !res.json || !res.json.AuthenticationResult) {
        const code = res.json && (res.json.__type || res.json.code) || `HTTP ${res.status}`;
        throw new Error(`Cognito sign-in failed for ${username}: ${code}`);
    }
    const r = res.json.AuthenticationResult;
    return { accessToken: r.AccessToken, idToken: r.IdToken, refreshToken: r.RefreshToken, claims: decodeJwt(r.AccessToken) };
}

function decodeJwt(token) {
    try {
        const [, payload] = token.split('.');
        return JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    } catch (_) { return {}; }
}

/** Builds a syntactically valid but unsigned/tampered JWT for negative tests. */
function forgeJwt(claims = {}) {
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const header = { alg: 'RS256', typ: 'JWT', kid: 'forged' };
    const payload = { sub: '00000000-0000-0000-0000-000000000000', iss: 'https://evil.example', exp: Math.floor(Date.now() / 1000) + 3600, tenantId: 'T_attacker', role: 'operator', ...claims };
    return `${b64(header)}.${b64(payload)}.${b64({ sig: 'forged' })}`;
}

async function sessions() {
    const out = { a: null, b: null, doctor: null };
    const tryIn = async (k, u, p) => { try { out[k] = await signIn(u, p); } catch (e) { out[`${k}Error`] = e.message; } };
    await tryIn('a',      process.env.AKWADONA_USERNAME,        process.env.AKWADONA_PASSWORD);
    await tryIn('b',      process.env.AKWADONA_B_USERNAME,      process.env.AKWADONA_B_PASSWORD);
    await tryIn('doctor', process.env.AKWADONA_DOCTOR_USERNAME, process.env.AKWADONA_DOCTOR_PASSWORD);
    return out;
}

module.exports = { signIn, decodeJwt, forgeJwt, sessions, CLIENT_ID, REGION };

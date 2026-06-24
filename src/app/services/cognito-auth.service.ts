import { Injectable } from '@angular/core';

/**
 * Akwadona — Cognito direct-REST authentication client (Phase 1).
 *
 * Why no SDK: @aws-sdk/client-cognito-identity-provider ships ~200 KB to the
 * browser bundle. The InitiateAuth + RespondToAuthChallenge endpoints are
 * trivial REST calls with one specific header, so calling them directly via
 * fetch() keeps the bundle lean and the code auditable.
 *
 * Endpoint:   https://cognito-idp.<region>.amazonaws.com/
 * Required:   POST, Content-Type: application/x-amz-json-1.1,
 *             X-Amz-Target: AWSCognitoIdentityProviderService.<Action>
 *
 * Token storage: writes into the SAME keys the existing auth.guard.ts and
 * interceptors already read (`sessionStorage.accessToken`,
 * `localStorage.accessToken`). No changes needed elsewhere downstream.
 *
 * Reference systems: Stripe Dashboard, Particle Health, Vercel Teams all
 * use a custom login backed by their own IDP SDK call — never the IDP
 * vendor's hosted page.
 */

const REGION    = 'us-east-1';
const ENDPOINT  = `https://cognito-idp.${REGION}.amazonaws.com/`;
const CLIENT_ID = '2nfjfipi8hri262pjohtpgl45q';

export type SignInResult =
    | { kind: 'ok'; accessToken: string; idToken: string; refreshToken: string; expiresIn: number }
    | { kind: 'challenge'; challenge: 'NEW_PASSWORD_REQUIRED' | 'SMS_MFA' | 'SOFTWARE_TOKEN_MFA'; session: string; username: string }
    | { kind: 'error'; code: string; message: string };

/**
 * Codes the UI maps to user-friendly translation keys. Anything else
 * collapses to `unknown` so we never surface raw AWS exception names.
 */
const KNOWN_ERROR_CODES = new Set<string>([
    'NotAuthorizedException',
    'UserNotFoundException',
    'UserNotConfirmedException',
    'PasswordResetRequiredException',
    'InvalidParameterException',
    'TooManyRequestsException',
    'TooManyFailedAttemptsException',
    'LimitExceededException'
]);

@Injectable({ providedIn: 'root' })
export class CognitoAuthService {

    /** Sign in with username + password. Maps Cognito errors to stable codes. */
    async signIn(username: string, password: string): Promise<SignInResult> {
        if (!username || !password) {
            return { kind: 'error', code: 'MissingCredentials', message: 'username and password are required' };
        }
        try {
            const r = await this.cognitoCall('InitiateAuth', {
                AuthFlow: 'USER_PASSWORD_AUTH',
                ClientId: CLIENT_ID,
                AuthParameters: { USERNAME: username, PASSWORD: password }
            });
            if (r.ChallengeName) {
                return {
                    kind: 'challenge',
                    challenge: r.ChallengeName,
                    session: r.Session,
                    username
                };
            }
            const auth = r.AuthenticationResult || {};
            this.persistTokens(auth.AccessToken, auth.IdToken, auth.RefreshToken, auth.ExpiresIn);
            return {
                kind: 'ok',
                accessToken:  auth.AccessToken,
                idToken:      auth.IdToken,
                refreshToken: auth.RefreshToken,
                expiresIn:    auth.ExpiresIn
            };
        } catch (e: any) {
            return this.toErrorResult(e);
        }
    }

    /** Refresh the access + id tokens using the stored refresh token. */
    async refresh(): Promise<boolean> {
        const refreshToken = sessionStorage.getItem('refreshToken') || localStorage.getItem('refreshToken');
        if (!refreshToken) return false;
        try {
            const r = await this.cognitoCall('InitiateAuth', {
                AuthFlow: 'REFRESH_TOKEN_AUTH',
                ClientId: CLIENT_ID,
                AuthParameters: { REFRESH_TOKEN: refreshToken }
            });
            const auth = r.AuthenticationResult || {};
            // NB: REFRESH_TOKEN_AUTH does NOT return a new refresh token —
            // keep the existing one.
            this.persistTokens(auth.AccessToken, auth.IdToken, refreshToken, auth.ExpiresIn);
            return true;
        } catch (_) {
            return false;
        }
    }

    /**
     * Sign out:
     *   1. RevokeToken at Cognito so the refresh token cannot mint new
     *      access tokens elsewhere (matches the Stripe/GitHub model).
     *   2. Clear local storage so the guard rejects the next navigation.
     *   3. Caller decides whether to navigate to /login.
     */
    async signOut(): Promise<void> {
        const refreshToken = sessionStorage.getItem('refreshToken') || localStorage.getItem('refreshToken');
        if (refreshToken) {
            try {
                await this.cognitoCall('RevokeToken', { Token: refreshToken, ClientId: CLIENT_ID });
            } catch (_) { /* best-effort */ }
        }
        try {
            ['accessToken', 'idToken', 'refreshToken', 'userData'].forEach((k) => {
                sessionStorage.removeItem(k);
                localStorage.removeItem(k);
            });
        } catch (_) { /* quota errors are non-fatal */ }
    }

    // ──────────────────────────────────────────────────────────────────
    //  Internal helpers
    // ──────────────────────────────────────────────────────────────────

    private persistTokens(accessToken?: string, idToken?: string, refreshToken?: string, expiresIn?: number): void {
        if (accessToken) {
            sessionStorage.setItem('accessToken', accessToken);
            try { localStorage.setItem('accessToken', accessToken); } catch (_) { /* quota */ }
        }
        if (idToken) {
            sessionStorage.setItem('idToken', idToken);
            try { localStorage.setItem('idToken', idToken); } catch (_) { /* quota */ }
        }
        if (refreshToken) {
            sessionStorage.setItem('refreshToken', refreshToken);
            try { localStorage.setItem('refreshToken', refreshToken); } catch (_) { /* quota */ }
        }
        if (expiresIn) {
            const expiresAt = Date.now() + expiresIn * 1000;
            sessionStorage.setItem('tokenExpiresAt', String(expiresAt));
        }
    }

    private async cognitoCall(action: string, body: object): Promise<any> {
        const res = await fetch(ENDPOINT, {
            method:  'POST',
            mode:    'cors',
            headers: {
                'Content-Type':  'application/x-amz-json-1.1',
                'X-Amz-Target':  'AWSCognitoIdentityProviderService.' + action
            },
            body: JSON.stringify(body)
        });
        const txt = await res.text();
        let parsed: any = null;
        try { parsed = txt ? JSON.parse(txt) : null; } catch (_) { parsed = { message: txt }; }
        if (!res.ok) {
            const code = (parsed && (parsed.__type || parsed.code))
                || res.statusText
                || 'UnknownError';
            const err: any = new Error(parsed?.message || code);
            err.code = String(code).split('#').pop();  // 'NotAuthorizedException' from 'com...:NotAuthorizedException'
            throw err;
        }
        return parsed || {};
    }

    private toErrorResult(e: any): SignInResult {
        if (e && typeof e.code === 'string') {
            const code = KNOWN_ERROR_CODES.has(e.code) ? e.code : 'UnknownError';
            return { kind: 'error', code, message: e.message || code };
        }
        // Network / CORS / DNS failure — surface as a distinct code so the
        // UI can render "check your connection" instead of "wrong password".
        return { kind: 'error', code: 'NetworkError', message: e?.message || 'Network error' };
    }
}

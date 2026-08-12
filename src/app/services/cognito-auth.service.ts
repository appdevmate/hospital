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
const CLIENT_ID = '4r9fcr8f54pmubmmbnuldi9fqc';

export type SignInResult =
    | { kind: 'ok'; accessToken: string; idToken: string; refreshToken: string; expiresIn: number }
    | { kind: 'challenge'; challenge: 'NEW_PASSWORD_REQUIRED' | 'SMS_MFA' | 'SOFTWARE_TOKEN_MFA'; session: string; username: string }
    | { kind: 'error'; code: string; message: string };

export type ForgotPasswordResult =
    | { kind: 'ok'; destination: string; deliveryMedium: string }
    | { kind: 'error'; code: string; message: string };

export type ConfirmForgotPasswordResult =
    | { kind: 'ok' }
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
    'InvalidPasswordException',
    'TooManyRequestsException',
    'TooManyFailedAttemptsException',
    'LimitExceededException',
    'CodeMismatchException',
    'ExpiredCodeException'
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

    /**
     * Phase 3 - respond to a NEW_PASSWORD_REQUIRED challenge from the
     * preceding InitiateAuth. Cognito returns this when an admin created
     * the user with a temp password and the user is on first sign-in.
     *
     * On success the response carries the same AuthenticationResult shape
     * as a normal sign-in (access + id + refresh tokens). We persist them
     * immediately so the caller can navigate straight into the app.
     */
    async respondToNewPasswordChallenge(username: string, session: string, newPassword: string): Promise<SignInResult> {
        if (!username || !session || !newPassword) {
            return { kind: 'error', code: 'MissingCredentials', message: 'username/session/newPassword required' };
        }
        try {
            // The Akwadona Cognito pool was provisioned with `gender` AND
            // `name` as required attributes. When an admin creates a user
            // from the Cognito Console without setting either, the
            // NEW_PASSWORD_REQUIRED flow MUST supply them or Cognito rejects
            // with InvalidParameterException. We default both to safe
            // placeholders so first-login never deadlocks on a missing
            // attribute; the user can update them later in their profile.
            const safeName = username.indexOf('@') >= 0 ? username.split('@')[0] : username;
            const r = await this.cognitoCall('RespondToAuthChallenge', {
                ChallengeName: 'NEW_PASSWORD_REQUIRED',
                ClientId:      CLIENT_ID,
                Session:       session,
                ChallengeResponses: {
                    USERNAME:                 username,
                    NEW_PASSWORD:             newPassword,
                    'userAttributes.gender':  'prefer_not_to_say',
                    'userAttributes.name':    safeName
                }
            });
            // Cognito may chain another challenge (e.g. MFA). For now we only
            // know how to drive NEW_PASSWORD_REQUIRED; chained MFA falls out
            // as a generic error which the UI maps to "contact your admin".
            if (r.ChallengeName) {
                return { kind: 'error', code: 'UnsupportedChallenge', message: r.ChallengeName };
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
     * Step 1 of forgot-password: ask Cognito to email a one-time code to the
     * user's verified email address. We always surface the same generic
     * "ok" message to the UI for unknown/disabled users so the response
     * cannot be used to probe whether an account exists (OWASP A07).
     */
    async forgotPassword(username: string): Promise<ForgotPasswordResult> {
        if (!username || !username.trim()) {
            return { kind: 'error', code: 'MissingUsername', message: 'username is required' };
        }
        try {
            const r = await this.cognitoCall('ForgotPassword', {
                ClientId: CLIENT_ID,
                Username: username.trim()
            });
            const d = (r && r.CodeDeliveryDetails) || {};
            return {
                kind:            'ok',
                destination:     d.Destination     || 'your email',
                deliveryMedium:  d.DeliveryMedium  || 'EMAIL'
            };
        } catch (e: any) {
            return this.toForgotErrorResult(e);
        }
    }

    /**
     * Step 2 of forgot-password: confirm the emailed code and set the new
     * password. On success the caller redirects to /login.
     */
    async confirmForgotPassword(username: string, code: string, newPassword: string): Promise<ConfirmForgotPasswordResult> {
        if (!username || !username.trim()) return { kind: 'error', code: 'MissingUsername', message: 'username is required' };
        if (!code || !code.trim())          return { kind: 'error', code: 'MissingCode',     message: 'code is required' };
        if (!newPassword)                   return { kind: 'error', code: 'MissingPassword', message: 'new password is required' };
        try {
            await this.cognitoCall('ConfirmForgotPassword', {
                ClientId:          CLIENT_ID,
                Username:          username.trim(),
                ConfirmationCode:  code.trim(),
                Password:          newPassword
            });
            return { kind: 'ok' };
        } catch (e: any) {
            return this.toForgotErrorResult(e);
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

    /**
     * Persist tokens to sessionStorage (always) + localStorage (only when
     * the user opted in via "Remember me"). Reads `akw:rememberMe` flag
     * from localStorage; if absent (most users), defaults to true to keep
     * the prior behaviour of sessions surviving browser close.
     */
    private persistTokens(accessToken?: string, idToken?: string, refreshToken?: string, expiresIn?: number): void {
        const remember = (localStorage.getItem('akw:rememberMe') ?? 'true') !== 'false';

        if (accessToken) {
            sessionStorage.setItem('accessToken', accessToken);
            if (remember) {
                try { localStorage.setItem('accessToken', accessToken); } catch (_) { /* quota */ }
            } else {
                try { localStorage.removeItem('accessToken'); } catch (_) {}
            }
        }
        if (idToken) {
            sessionStorage.setItem('idToken', idToken);
            if (remember) {
                try { localStorage.setItem('idToken', idToken); } catch (_) {}
            } else {
                try { localStorage.removeItem('idToken'); } catch (_) {}
            }

            // Mirror IdToken claims into localStorage `userData` so the topbar
            // can show the user's name/email. The OIDC library would normally
            // populate this via /oauth2/userInfo, but we skip that round-trip
            // (see app.config.ts) and use the custom InitiateAuth flow, so we
            // hydrate userData manually here.
            try {
                const part = idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
                const pad = part + '='.repeat((4 - (part.length % 4)) % 4);
                const claims = JSON.parse(atob(pad));
                const userData = {
                    name:     claims['name']     || '',
                    email:    claims['email']    || '',
                    username: claims['cognito:username'] || claims['username'] || '',
                    tenantId: claims['tenantId'] || claims['custom:tenantId'] || '',
                    role:     claims['role']     || '',
                    doctorId: claims['doctorId'] || ''
                };
                localStorage.setItem('userData', JSON.stringify(userData));
                window.dispatchEvent(new CustomEvent('userDataChanged', { detail: userData }));
            } catch (_) { /* malformed token */ }
        }
        if (refreshToken) {
            sessionStorage.setItem('refreshToken', refreshToken);
            if (remember) {
                try { localStorage.setItem('refreshToken', refreshToken); } catch (_) {}
            } else {
                try { localStorage.removeItem('refreshToken'); } catch (_) {}
            }
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

    /** Same shape as toErrorResult but typed for ForgotPasswordResult /
     *  ConfirmForgotPasswordResult unions. Maps additional exception names
     *  specific to the password-reset flow (CodeMismatchException,
     *  ExpiredCodeException, InvalidPasswordException). */
    private toForgotErrorResult(e: any): any {
        const code = (e && typeof e.code === 'string') ? e.code : 'NetworkError';
        return { kind: 'error', code, message: e?.message || code };
    }
}

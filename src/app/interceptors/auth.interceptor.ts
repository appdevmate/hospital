import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * Akwadona auth interceptor (Phase 1 of Hosted-UI replacement).
 *
 * Two jobs:
 *
 *   1. INJECT the latest access token from sessionStorage onto every API
 *      request. Pre-Phase-1 each service manually called
 *      `oidc.getAccessToken().pipe(switchMap(...))` which is fragile: 13
 *      services do it, each can drift, and the OIDC library's internal
 *      state isn't synced when we sign in via CognitoAuthService.
 *      Centralising token injection here means services no longer have to
 *      know how auth works.
 *
 *   2. On 401, redirect to our custom /login page (not Cognito Hosted UI).
 *      Saves the current URL so the user lands back here after sign-in.
 *
 * Skips:
 *   - Cross-origin requests that aren't our API
 *   - Requests already carrying an Authorization header (e.g. multipart
 *     uploads to S3 presigned URLs)
 *   - Cognito IDP traffic itself (CognitoAuthService.signIn / refresh)
 */
const API_HOST   = 'execute-api.us-east-1.amazonaws.com';
const OIDC_HOSTS = ['cognito-idp.', 'auth.us-east-1.amazoncognito.com', 'amazoncognito.com', 'auth.akwadona.com'];

// Guard so multiple parallel 401s only trigger one /login redirect.
let redirecting = false;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const url = req.url || '';
    const isSameOrigin = url.startsWith('/') || url.startsWith(window.location.origin);
    const isApi  = url.includes(API_HOST);
    const isOidc = OIDC_HOSTS.some((h) => url.includes(h));

    // Never intercept auth-service traffic.
    if (isOidc || (!isSameOrigin && !isApi)) {
        return next(req);
    }

    // Step 1 - ALWAYS overwrite Authorization for API calls with the latest
    // sessionStorage token. Services historically call
    // `oidc.getAccessToken()` and set the header themselves, but the OIDC
    // library no longer holds the active session - we do, in sessionStorage.
    // Trusting the service-supplied header would inject "Bearer " (empty)
    // and produce a 401 on every API call. Overwriting here is the cheapest
    // shim that keeps all 13 service files working unchanged.
    let outgoing = req;
    if (isApi) {
        const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken') || '';
        if (token) {
            outgoing = req.clone({ setHeaders: { Authorization: 'Bearer ' + token } });
        }
    }

    const router = inject(Router);

    return next(outgoing).pipe(
        catchError((error) => {
            if (error instanceof HttpErrorResponse && error.status === 401) {
                if (!redirecting) {
                    redirecting = true;
                    try { localStorage.setItem('returnUrl', router.url); } catch (_) { /* quota */ }
                    try { sessionStorage.removeItem('accessToken'); } catch (_) {}
                    try { localStorage.removeItem('accessToken');  } catch (_) {}
                    // Hard redirect so the SPA bootstraps fresh against the
                    // emptied storage and lands on /login cleanly.
                    window.location.href = '/login';
                }
            }
            return throwError(() => error);
        })
    );
};

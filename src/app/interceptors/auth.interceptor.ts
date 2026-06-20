import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { catchError, throwError } from 'rxjs';

/**
 * Global 401 → re-login handler.
 *
 * The auth interceptor used to only intercept same-origin requests, which left
 * 401s from the API host (execute-api.us-east-1.amazonaws.com) silently failing
 * and forcing the user to refresh the page to be redirected to Cognito.
 *
 * Now we intercept BOTH:
 *   - same-origin app calls
 *   - our own API host (jxz59jh15f.execute-api.us-east-1.amazonaws.com)
 *
 * Cognito / OIDC endpoints are skipped so we never get an infinite redirect
 * loop when the discovery document or token endpoint hiccups.
 */
const API_HOST = 'execute-api.us-east-1.amazonaws.com';
const OIDC_HOSTS = ['cognito-idp.', 'auth.us-east-1.amazoncognito.com', 'amazoncognito.com', 'auth.akwadona.com'];

// Guard so multiple parallel 401s only trigger one Cognito redirect.
let redirecting = false;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const url = req.url || '';
    const isSameOrigin = url.startsWith('/') || url.startsWith(window.location.origin);
    const isApi  = url.includes(API_HOST);
    const isOidc = OIDC_HOSTS.some((h) => url.includes(h));

    // Never intercept OIDC traffic — it would feedback-loop the redirect.
    if (isOidc || (!isSameOrigin && !isApi)) {
        return next(req);
    }

    const oidc = inject(OidcSecurityService);
    const router = inject(Router);

    return next(req).pipe(
        catchError((error) => {
            if (error instanceof HttpErrorResponse && error.status === 401) {
                if (!redirecting) {
                    redirecting = true;
                    // Save the current route so the user returns here after re-login.
                    // localStorage so it survives the Cognito redirect reliably.
                    try { localStorage.setItem('returnUrl', router.url); } catch (_) {}
                    // Drop the stale token immediately so subsequent calls don't
                    // race against the redirect.
                    try { sessionStorage.removeItem('accessToken'); } catch (_) {}
                    try { localStorage.removeItem('accessToken'); } catch (_) {}
                    oidc.authorize();
                }
            }
            return throwError(() => error);
        })
    );
};

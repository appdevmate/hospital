import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { catchError, switchMap, take, throwError } from 'rxjs';

// API Gateway domains that require our Bearer token
const SECURE_DOMAINS = ['.execute-api.us-east-1.amazonaws.com'];

// OIDC library internal endpoints — never add our token here
const OIDC_DOMAINS = [
    'cognito-idp.us-east-1.amazonaws.com',
    '.auth.us-east-1.amazoncognito.com',
];

function isSecureApi(url: string): boolean {
    if (url.startsWith('/') || url.startsWith(window.location.origin)) return true;
    return SECURE_DOMAINS.some((d) => url.includes(d));
}

function isOidcInternal(url: string): boolean {
    return OIDC_DOMAINS.some((d) => url.includes(d));
}

/**
 * Attaches the Cognito ID token (not access token) to all API Gateway requests.
 *
 * Reason: Cognito now issues version-2 access tokens which the API Gateway
 * COGNITO_USER_POOLS authorizer does not support. ID tokens are still version-1
 * and are accepted by the authorizer.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
    if (!isSecureApi(req.url) || isOidcInternal(req.url)) {
        return next(req);
    }

    const oidc = inject(OidcSecurityService);
    const router = inject(Router);

    // getIdToken() emits synchronously once OIDC configs are loaded (uses `of()` internally)
    return oidc.getIdToken().pipe(
        take(1),
        switchMap((idToken) => {
            const authReq = idToken
                ? req.clone({ setHeaders: { Authorization: `Bearer ${idToken}` } })
                : req;

            return next(authReq).pipe(
                catchError((error) => {
                    if (error instanceof HttpErrorResponse && error.status === 401) {
                        sessionStorage.setItem('returnUrl', router.url);
                        oidc.authorize();
                    }
                    return throwError(() => error);
                }),
            );
        }),
    );
};

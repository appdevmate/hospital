import { inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { catchError, throwError } from 'rxjs';
export const authInterceptor = (req, next) => {
    // IMPORTANT: angular-auth-oidc-client uses HttpClient internally to fetch
    // Cognito's discovery document and exchange the authorization code for tokens.
    // Those requests are cross-origin (amazonaws.com / amazoncognito.com).
    // If we intercepted them, a failure there would call oidc.authorize() and
    // create an infinite redirect loop.
    // Only intercept requests going to our own backend (same origin).
    const isSameOrigin = req.url.startsWith('/') ||
        req.url.startsWith(window.location.origin);
    if (!isSameOrigin) {
        return next(req);
    }
    const oidc = inject(OidcSecurityService);
    const router = inject(Router);
    return next(req).pipe(catchError((error) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
            // Save the current route so the user returns here after re-login
            sessionStorage.setItem('returnUrl', router.url);
            oidc.authorize();
        }
        return throwError(() => error);
    }));
};

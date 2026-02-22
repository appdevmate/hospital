import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { firstValueFrom } from 'rxjs';

export const authGuard: CanActivateFn = async (_route, state) => {
    // inject() calls MUST happen before any await — this is valid in Angular guards.
    const oidc = inject(OidcSecurityService);
    const router = inject(Router);

    // checkAuth() must be called when the Router is ready (i.e. inside a guard,
    // NOT in provideAppInitializer). It processes the Cognito callback
    // (?code=...&state=...) when the user returns from login, and returns the
    // cached auth state on all subsequent navigations.
    let isAuthenticated = false;
    let accessToken = '';

    try {
        const result = await firstValueFrom(oidc.checkAuth());
        isAuthenticated = result.isAuthenticated;
        accessToken = result.accessToken;
    } catch {
        // checkAuth() failed (e.g. expired code, state mismatch, network error).
        // Treat as unauthenticated — guard will redirect to Cognito below.
    }

    if (isAuthenticated) {
        // Persist the token for services that read it from sessionStorage.
        if (accessToken) {
            sessionStorage.setItem('accessToken', accessToken);
        }

        // After any login redirect (initial load or expired-token re-login),
        // send the user back to where they came from.
        const returnUrl = sessionStorage.getItem('returnUrl');
        if (
            returnUrl &&
            returnUrl.startsWith('/') &&
            !returnUrl.startsWith('//') &&
            returnUrl !== state.url
        ) {
            sessionStorage.removeItem('returnUrl');
            // Return a UrlTree so Angular navigates in the same routing cycle.
            return router.parseUrl(returnUrl) as boolean | UrlTree;
        }

        return true;
    }

    // Not authenticated — save where the user was heading, then go to Cognito.
    sessionStorage.setItem('returnUrl', state.url);
    oidc.authorize();
    return false;
};

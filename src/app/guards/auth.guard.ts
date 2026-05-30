import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { firstValueFrom } from 'rxjs';

// Module-level flag — checkAuth() must run ONCE per app load to process the
// Cognito callback (?code=...&state=...). Calling it on every navigation makes
// every link click slow because the library does internal work each time.
// After the first call, we trust the cached sessionStorage token (the 401
// interceptor will force a re-login if it actually expires).
let checkAuthDone = false;

export const authGuard: CanActivateFn = async (_route, state) => {
    // inject() calls MUST happen before any await — valid in Angular guards.
    const oidc = inject(OidcSecurityService);
    const router = inject(Router);

    let isAuthenticated = !!sessionStorage.getItem('accessToken');
    let accessToken = sessionStorage.getItem('accessToken') || '';

    if (!checkAuthDone) {
        // First navigation after app boot — process potential ?code and
        // resolve the auth state from the OIDC library.
        try {
            const result = await firstValueFrom(oidc.checkAuth());
            isAuthenticated = result.isAuthenticated;
            accessToken = result.accessToken;
        } catch {
            // checkAuth() failed → fall through to the unauthenticated path.
        }
        checkAuthDone = true;
    }

    if (isAuthenticated) {
        // Persist the token for services that read it from sessionStorage.
        if (accessToken) {
            sessionStorage.setItem('accessToken', accessToken);
        }

        // After any login redirect (initial load or expired-token re-login),
        // send the user back to where they came from.
        const returnUrl = localStorage.getItem('returnUrl');
        if (
            returnUrl &&
            returnUrl.startsWith('/') &&
            !returnUrl.startsWith('//') &&
            returnUrl !== state.url
        ) {
            // Don't remove yet — the AppComponent NavigationEnd fallback clears
            // returnUrl once we actually land on the target page. If we remove
            // here and the UrlTree isn't honoured, the fallback can't recover.
            return router.parseUrl(returnUrl) as boolean | UrlTree;
        }

        return true;
    }

    // Not authenticated — save where the user was heading, then go to Cognito.
    // Using localStorage so the value survives the Cognito round-trip + works
    // when a new tab opens a deep link (sessionStorage is per-tab/can be flaky).
    // Only the URL path is stored — no tokens — so no XSS surface increase.
    localStorage.setItem('returnUrl', state.url);
    oidc.authorize();
    return false;
};

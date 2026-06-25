import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { firstValueFrom } from 'rxjs';
import { TenantService } from '@/services/tenant.service';

// Module-level flag — checkAuth() must run ONCE per app load to process the
// Cognito callback (?code=...&state=...). Calling it on every navigation makes
// every link click slow because the library does internal work each time.
let checkAuthDone = false;

/**
 * Step 7i — warm-session short-circuit (SaaS-grade < 1 s sign-in).
 *
 * Stripe / Vercel / Linear all paint the dashboard instantly when a valid
 * JWT is already in sessionStorage — they do NOT wait for an OIDC discovery
 * round-trip. We mirror that:
 *
 *   - If sessionStorage has a non-expired access token, skip checkAuth().
 *   - Only call checkAuth() when there's a ?code= callback (cold sign-in).
 *
 * Returns true if the cached token is valid and not expired.
 */
function hasFreshToken(): boolean {
    const token = sessionStorage.getItem('accessToken') || '';
    if (!token || token.split('.').length !== 3) return false;
    try {
        const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const pad = part + '='.repeat((4 - (part.length % 4)) % 4);
        const exp = JSON.parse(atob(pad))?.exp;
        if (typeof exp !== 'number') return false;
        // 30 s safety margin so the 401 interceptor doesn't race with an
        // expiring token mid-request.
        return exp * 1000 - Date.now() > 30_000;
    } catch {
        return false;
    }
}

export const authGuard: CanActivateFn = async (_route, state) => {
    const oidc = inject(OidcSecurityService);
    const router = inject(Router);
    const tenant = inject(TenantService);

    let isAuthenticated = hasFreshToken();
    let accessToken = sessionStorage.getItem('accessToken') || '';

    // Only run the heavy OIDC `checkAuth()` when either:
    //   (a) we don't yet have a fresh cached token, OR
    //   (b) the URL contains a `?code=` Cognito callback to exchange.
    const hasCallback = typeof window !== 'undefined'
        && window.location.search.includes('code=');

    if (!checkAuthDone && (!isAuthenticated || hasCallback)) {
        try {
            const result = await firstValueFrom(oidc.checkAuth());
            isAuthenticated = result.isAuthenticated;
            accessToken = result.accessToken;
        } catch {
            /* fall through to the unauthenticated path */
        }
        checkAuthDone = true;
    } else if (!checkAuthDone) {
        // Warm session — skip checkAuth() entirely. The library still
        // schedules silent renewal in the background via its own timers.
        checkAuthDone = true;
    }

    if (isAuthenticated) {
        // Persist the token for services that read it from sessionStorage.
        // Step 7i / Phase 4 - mirror to localStorage ONLY if Remember me
        // is opted-in. Pre-Phase-4 this always mirrored, which silently
        // overrode the user's choice to NOT persist their session.
        if (accessToken) {
            sessionStorage.setItem('accessToken', accessToken);
            const remember = (localStorage.getItem('akw:rememberMe') ?? 'true') !== 'false';
            if (remember) {
                try { localStorage.setItem('accessToken', accessToken); } catch (_) { /* quota */ }
            } else {
                try { localStorage.removeItem('accessToken'); } catch (_) {}
            }
        }

        // ── Step 2e + 7 — tenant / operator subdomain check ──────────────
        // The signed-in user carries `tenantId` + `role` in the JWT
        // (authoritative). The URL subdomain is just a label. We enforce:
        //   - operator on tenant subdomain → bounce to www
        //   - non-operator on www subdomain → bounce to their tenant
        //   - tenant user on wrong tenant subdomain → sign out + redirect
        // The backend would already refuse the data — this prevents the
        // user from even seeing the wrong page chrome.
        tenant.invalidate();
        const urlTid = tenant.tenantIdFromUrl;
        const jwtTid = tenant.tenantIdFromJwt;
        const isOperator = tenant.isOperator;
        const isOperatorSub = tenant.isOperatorSubdomain;

        // Operator landed on a tenant subdomain → push to www
        if (isOperator && !isOperatorSub && window.location.hostname.endsWith('.akwadona.com')) {
            window.location.replace(`https://www.akwadona.com/operator`);
            return false;
        }

        // Step 7g — operator on `/` (or any tenant route) → redirect to /operator.
        // The dashboard / patients / appointments pages call tenant APIs that
        // would fail with 403 for the operator anyway. Also clear returnUrl
        // (set during Cognito sign-in as '/') to break the ping-pong between
        // `/` and `/operator`.
        if (isOperator && state.url !== '/operator' && !state.url.startsWith('/operator')) {
            localStorage.removeItem('returnUrl');
            return router.parseUrl('/operator');
        }
        // Operator already on /operator — wipe any stale returnUrl pointing
        // to a tenant page so we don't bounce them off later.
        if (isOperator && state.url.startsWith('/operator')) {
            const ru = localStorage.getItem('returnUrl');
            if (ru && !ru.startsWith('/operator')) {
                localStorage.removeItem('returnUrl');
            }
        }

        // Non-operator landed on www → push to their tenant subdomain
        if (!isOperator && isOperatorSub && window.location.hostname.endsWith('.akwadona.com')) {
            const correctSlug = Object.entries({
                'tiryaq': 'T_2572fc71',
                'alshifaa': 'T_a4b8aef9'
            }).find(([, id]) => id === jwtTid)?.[0];
            if (correctSlug) {
                window.location.replace(`https://${correctSlug}.akwadona.com/`);
                return false;
            }
            // No matching subdomain → sign them out
            try { oidc.logoff(); } catch { /* ignore */ }
            sessionStorage.removeItem('accessToken');
            try { localStorage.removeItem('accessToken'); } catch (_) {}
            return false;
        }

        if (urlTid && jwtTid && urlTid !== jwtTid) {
            try { oidc.logoff(); } catch { /* fall through */ }
            sessionStorage.removeItem('accessToken');
            try { localStorage.removeItem('accessToken'); } catch (_) {}
            localStorage.removeItem('userData');
            // Best-effort redirect to the correct subdomain on production.
            // In dev/localhost we just sign them out.
            const correctSlug = Object.entries({
                'tiryaq': 'T_2572fc71',
                'alshifaa': 'T_a4b8aef9'
            }).find(([, id]) => id === jwtTid)?.[0];
            if (correctSlug && window.location.hostname.endsWith('.akwadona.com')) {
                window.location.replace(`https://${correctSlug}.akwadona.com${state.url}`);
            }
            return false;
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

    // Not authenticated — save where the user was heading, then go to our
    // custom Angular /login (Phase 1). Previously this called oidc.authorize()
    // which redirected to the Cognito Hosted UI (English-only). We now own
    // the sign-in UX in the app, fully translated and themed.
    localStorage.setItem('returnUrl', state.url);
    return router.parseUrl('/login');
};

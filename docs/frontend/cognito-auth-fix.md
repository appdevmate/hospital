# Cognito Authentication Fix

## Overview

This document records the two bugs that existed in the Angular + AWS Cognito OIDC authentication flow, explains their root causes, and describes the final solution.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Angular 20 (standalone) |
| Auth library | `angular-auth-oidc-client` v19 |
| Identity provider | AWS Cognito (managed login / hosted UI) |
| Grant type | Authorization Code |

---

## Bug 1 — Dashboard flashed before the Cognito login redirect

### Symptom

On first load (no active session), the dashboard rendered for a split second before the browser redirected to the Cognito login page.

### Root cause

The original `main.ts` called `checkAuth()` **after** `bootstrapApplication()` resolved:

```typescript
// OLD main.ts
bootstrapApplication(AppComponent, appConfig).then((ref) => {
    const oidcSecurityService = ref.injector.get(OidcSecurityService);
    oidcSecurityService.checkAuth().subscribe({
        next: (authResult) => {
            if (!authResult.isAuthenticated) {
                oidcSecurityService.authorize(); // redirect to Cognito
            }
        }
    });
});
```

By the time `.then()` ran, Angular had already completed its initial navigation and rendered the dashboard component. The auth check and redirect happened *after* the UI was visible.

There was also no route guard to block unauthenticated access, so Angular happily rendered every protected page before the redirect fired.

---

## Bug 2 — Infinite redirect loop and `/notfound` page after the fix attempt

### Symptom

After adding a `provideAppInitializer` to call `checkAuth()` early and a global HTTP interceptor to handle expired tokens, the app entered an infinite redirect loop. The browser kept cycling between the app and Cognito, and the only visible page was `/notfound`.

### Root causes (two separate problems)

#### Problem A — `checkAuth()` called before the Router was ready

`provideAppInitializer` runs during Angular's **bootstrap phase**, before the Router has started its first navigation.

`angular-auth-oidc-client` requires a working Router during `checkAuth()` because it uses Angular's Router internally (for URL cleanup after the OIDC callback, and for internal state management). When `checkAuth()` was called too early:

- The library could not complete its callback processing.
- It returned `{ isAuthenticated: false }` even when the user had just logged in successfully.
- The guard then saw `false`, called `oidc.authorize()` again.
- Cognito redirected back. The same thing happened. Infinite loop.

#### Problem B — HTTP interceptor caught OIDC library's own requests

`angular-auth-oidc-client` uses Angular's `HttpClient` internally. When `checkAuth()` runs, the library makes HTTP requests to Cognito to:

1. Fetch the OpenID discovery document (`https://cognito-idp.amazonaws.com/.../.well-known/openid-configuration`)
2. Exchange the authorization code for tokens (token endpoint)

The global HTTP interceptor was registered with `withInterceptors([authInterceptor])`, which applies it to **every** `HttpClient` request in the app — including those internal OIDC library requests.

If either of those Cognito requests failed for any reason (network, expired code, state mismatch), the interceptor caught the error and called `oidc.authorize()`. This triggered a new Cognito redirect, which came back to the app, which triggered `checkAuth()` again, which made the same HTTP requests, which could fail again — infinite loop. The `/notfound` page appeared because during the loop some navigation landed on an unmapped path that fell through to the `**` wildcard route.

---

## Final Solution

### 1. Auth guard — `src/app/guards/auth.guard.ts`

The guard is the only place that calls `checkAuth()`. Guards run **inside** Angular's navigation pipeline, after the Router is fully initialized. This is exactly when the OIDC library expects to be called.

```typescript
import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { firstValueFrom } from 'rxjs';

export const authGuard: CanActivateFn = async (_route, state) => {
    // inject() calls must happen before any await.
    const oidc = inject(OidcSecurityService);
    const router = inject(Router);

    let isAuthenticated = false;
    let accessToken = '';

    try {
        const result = await firstValueFrom(oidc.checkAuth());
        isAuthenticated = result.isAuthenticated;
        accessToken = result.accessToken;
    } catch {
        // checkAuth() failed — treat as unauthenticated, guard redirects to Cognito.
    }

    if (isAuthenticated) {
        if (accessToken) {
            sessionStorage.setItem('accessToken', accessToken);
        }

        // Restore the page the user was on before being sent to login.
        const returnUrl = sessionStorage.getItem('returnUrl');
        if (
            returnUrl &&
            returnUrl.startsWith('/') &&
            !returnUrl.startsWith('//') &&
            returnUrl !== state.url
        ) {
            sessionStorage.removeItem('returnUrl');
            return router.parseUrl(returnUrl) as boolean | UrlTree;
        }

        return true;
    }

    // Not authenticated — save destination, redirect to Cognito.
    sessionStorage.setItem('returnUrl', state.url);
    oidc.authorize();
    return false;
};
```

**Why this prevents the dashboard flash:** `withEnabledBlockingInitialNavigation()` (already set in `app.config.ts`) makes Angular's initial navigation synchronous and blocks component rendering until all guards resolve. Because `authGuard` is `async`, Angular waits for it before rendering anything. If the user is not authenticated, `oidc.authorize()` fires and the browser leaves the page — the dashboard component is never instantiated.

**Why `checkAuth()` is safe to call from the guard on every navigation:** The library caches the auth state after the first call. Subsequent navigations return the cached result immediately without making any HTTP requests (unless the session has expired and a silent refresh is needed).

### 2. HTTP interceptor — `src/app/interceptors/auth.interceptor.ts`

The interceptor only handles requests going to the **same origin** as the app. All cross-origin requests (Cognito's discovery document, token endpoint, userinfo endpoint) pass through untouched.

```typescript
import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    // Skip cross-origin requests — the OIDC library makes these internally.
    // Intercepting them could create an infinite redirect loop.
    const isSameOrigin =
        req.url.startsWith('/') ||
        req.url.startsWith(window.location.origin);

    if (!isSameOrigin) {
        return next(req);
    }

    const oidc = inject(OidcSecurityService);
    const router = inject(Router);

    return next(req).pipe(
        catchError((error) => {
            if (error instanceof HttpErrorResponse && error.status === 401) {
                sessionStorage.setItem('returnUrl', router.url);
                oidc.authorize();
            }
            return throwError(() => error);
        })
    );
};
```

### 3. Routes — `src/app.routes.ts`

`canActivate: [authGuard]` is placed on the **parent** layout route only. All child routes inherit protection without each needing its own guard. The `auth`, `landing`, and `notfound` routes are outside the guarded parent and remain publicly accessible.

```typescript
{
    path: '',
    component: AppLayout,
    canActivate: [authGuard],   // ← protects all children
    children: [ ... ]
},
{ path: 'auth', loadChildren: () => import('@/pages/auth/auth.routes') },
{ path: 'notfound', ... },
{ path: '**', redirectTo: '/notfound' }
```

### 4. App config — `src/app.config.ts`

`provideAppInitializer` was removed entirely. `checkAuth()` is no longer called during bootstrap. The interceptor is registered via `withInterceptors([authInterceptor])`.

---

## Authentication Flow (after the fix)

### Normal first load (no session)

```
Browser opens /doctors-management
  → Angular starts navigation (blocking, withEnabledBlockingInitialNavigation)
  → authGuard runs (async — nothing rendered yet)
      → checkAuth() → isAuthenticated: false
      → sessionStorage.setItem('returnUrl', '/doctors-management')
      → oidc.authorize() → browser redirects to Cognito
  → User logs in at Cognito
  → Cognito redirects to http://localhost:4200/?code=XXX&state=YYY
  → Angular starts navigation
  → authGuard runs
      → checkAuth() processes ?code= → isAuthenticated: true
      → sessionStorage.getItem('returnUrl') → '/doctors-management'
      → router.parseUrl('/doctors-management') returned (UrlTree)
  → Angular navigates to /doctors-management
  → authGuard runs again (cached auth state, instant)
      → isAuthenticated: true, no returnUrl → returns true
  → DoctorsManagementComponent renders ✓
```

### Expired token (401 from API)

```
User is on /patients-management
  → API call returns 401
  → authInterceptor catches it (same-origin request)
      → sessionStorage.setItem('returnUrl', '/patients-management')
      → oidc.authorize() → browser redirects to Cognito
  → User logs in at Cognito
  → Cognito redirects to http://localhost:4200/?code=XXX&state=YYY
  → authGuard runs
      → checkAuth() processes callback → isAuthenticated: true
      → returnUrl = '/patients-management'
      → router.parseUrl('/patients-management') returned
  → Angular navigates to /patients-management ✓
```

### Subsequent navigations (valid session)

```
User clicks a menu item → /documents
  → authGuard runs
      → checkAuth() returns cached state → isAuthenticated: true (instant)
      → no returnUrl in sessionStorage
      → returns true
  → DocumentManagerComponent renders ✓
```

---

## Key Rules (do not break these)

| Rule | Reason |
|---|---|
| Never call `checkAuth()` in `provideAppInitializer` or `APP_INITIALIZER` | The OIDC library needs the Router to be running when it processes the callback. Calling it before navigation starts causes it to silently fail. |
| Never apply the HTTP interceptor to cross-origin requests | `angular-auth-oidc-client` uses `HttpClient` internally. Intercepting those requests can create an infinite redirect loop. |
| Always place `canActivate: [authGuard]` on the parent layout route only | Child routes inherit the guard automatically. Applying it to children individually would call `checkAuth()` multiple times per navigation. |
| Always validate `returnUrl` before using it | Must start with `/` and not `//` to prevent open redirect vulnerabilities. |

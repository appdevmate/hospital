import { ApplicationConfig, isDevMode } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { PreloadAllModules, provideRouter, withInMemoryScrolling, withPreloading } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { appRoutes } from './app.routes';
import { provideAuth } from 'angular-auth-oidc-client';
import { MessageService, ConfirmationService } from 'primeng/api';
import { authInterceptor } from './app/interceptors/auth.interceptor';
import { offlineQueueInterceptor } from './app/interceptors/offline-queue.interceptor';

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(
            appRoutes,
            withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
            // Default (non-blocking) initial navigation — the app shell paints
            // immediately while the authGuard resolves auth state in parallel.
            // This eliminates the white-screen-while-OIDC-bootstraps delay
            // (which used to be 1–3 minutes on a cold-start login).
            withPreloading(PreloadAllModules)
        ),
        // offlineQueueInterceptor runs first → short-circuits offline mutations
        // into the IndexedDB queue. authInterceptor runs second → adds 401
        // re-login handling for requests that actually reach the network.
        provideHttpClient(withFetch(), withInterceptors([offlineQueueInterceptor, authInterceptor])),
        provideAnimationsAsync(),
        providePrimeNG({ theme: { preset: Aura, options: { darkModeSelector: '.app-dark' } } }),
        provideAuth({
            config: {
                // ── Step 7h: custom Cognito auth domain ─────────────────────
                // `authority` stays as the Cognito IDP URL — that's the `iss`
                // claim in every JWT and is what the library validates against.
                // `authWellknownEndpointUrl` overrides the discovery URL so the
                // user is redirected to our branded login at auth.akwadona.com
                // (Stripe / Vercel / Athenahealth pattern — single auth
                // surface, never a Cognito-default URL).
                authority: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_RACghntmS',
                authWellknownEndpointUrl: 'https://auth.akwadona.com/.well-known/openid-configuration',
                clientId: '2nfjfipi8hri262pjohtpgl45q',
                redirectUrl: window.location.origin + '/',
                postLogoutRedirectUri: window.location.origin + '/',
                responseType: 'code',
                useRefreshToken: true,
                scope: 'openid email phone profile',
                customParamsEndSessionRequest: {
                    logout_uri: window.location.origin + '/'
                }
            }
        }),
        MessageService,
        ConfirmationService,
        // Offline mode — Phase A: register Angular Service Worker (PWA shell)
        // so the app loads + browses cached pages without a network.
        // Enabled only in production builds; registers after the app is stable
        // (so it doesn't compete with initial load).
        provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
        })
    ]
};

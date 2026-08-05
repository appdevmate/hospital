import { ApplicationConfig, isDevMode } from '@angular/core';
import { HttpClient, provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { appRoutes } from './app.routes';
import { provideAuth } from 'angular-auth-oidc-client';
import { MessageService, ConfirmationService } from 'primeng/api';
import { authInterceptor } from './app/interceptors/auth.interceptor';
import { offlineQueueInterceptor } from './app/interceptors/offline-queue.interceptor';

// Step I — i18n loader. ngx-translate fetches JSON files from
// /assets/i18n/{lang}.json at runtime (browser-cached after first load).
export function translateLoaderFactory(http: HttpClient): TranslateLoader {
    // Files live in `public/i18n/` which Angular copies to dist/ root → served at /i18n/.
    return new TranslateHttpLoader(http, '/i18n/', '.json');
}

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(
            appRoutes,
            withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' })
            // Perf — no preload strategy. Lazy chunks load on demand only.
            // PreloadAllModules used to fetch every route's JS up-front (1MB+
            // of chunks) before the user navigated anywhere, dragging out the
            // sign-in → painted-screen window.
        ),
        // offlineQueueInterceptor runs first → short-circuits offline mutations
        // into the IndexedDB queue. authInterceptor runs second → adds 401
        // re-login handling for requests that actually reach the network.
        provideHttpClient(withFetch(), withInterceptors([offlineQueueInterceptor, authInterceptor])),
        // Step I — i18n. TranslateModule.forRoot must run once at app config.
        importProvidersFrom(
            TranslateModule.forRoot({
                loader: {
                    provide: TranslateLoader,
                    useFactory: translateLoaderFactory,
                    deps: [HttpClient]
                },
                defaultLanguage: 'en'
            })
        ),
        provideAnimationsAsync(),
        providePrimeNG({ theme: { preset: Aura, options: { darkModeSelector: '.app-dark' } } }),
        provideAuth({
            config: {
                // ── Step 7h: custom Cognito auth domain ─────────────────────
                // `authority` is the JWT issuer — must stay as the cognito-idp
                // URL because Cognito mints that as the `iss` claim and the
                // library validates against it. Discovery doc lives there too.
                //
                // `authWellknownEndpoints` (plural object) overrides the
                // individual endpoint URLs that come back from discovery — we
                // point the browser-visible endpoints (authorize, token,
                // userInfo, logout) at our branded custom domain so the URL
                // bar shows `auth.akwadona.com` instead of the AWS default.
                //
                // This is the Stripe / Vercel / Athenahealth pattern: one
                // branded auth domain in front, AWS-managed IDP behind it.
                authority: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_PXRIWC8SK',
                authWellknownEndpoints: {
                    issuer:                'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_PXRIWC8SK',
                    jwksUri:               'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_PXRIWC8SK/.well-known/jwks.json',
                    authorizationEndpoint: 'https://auth.akwadona.com/oauth2/authorize',
                    tokenEndpoint:         'https://auth.akwadona.com/oauth2/token',
                    userInfoEndpoint:      'https://auth.akwadona.com/oauth2/userInfo',
                    endSessionEndpoint:    'https://auth.akwadona.com/logout',
                    revocationEndpoint:    'https://auth.akwadona.com/oauth2/revoke'
                },
                clientId: '2gq65qfu5016iplpvssmfl75f6',
                redirectUrl: window.location.origin + '/',
                postLogoutRedirectUri: window.location.origin + '/',
                responseType: 'code',
                useRefreshToken: true,
                scope: 'openid email phone profile',
                // ── Perf: skip the userInfo round-trip ──────────────────────
                // The JWT already carries email / name / tenantId / role from
                // the pre-token-generation Lambda, so calling /oauth2/userInfo
                // after login adds 500ms–1s for no value. Setting
                // renewUserInfoAfterTokenRenew + disable triggers stops both
                // initial + renewal userInfo fetches.
                renewUserInfoAfterTokenRenew: false,
                triggerAuthorizationResultEvent: true,
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

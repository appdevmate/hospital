import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { PreloadAllModules, provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling, withPreloading } from '@angular/router';
import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { appRoutes } from './app.routes';
import { provideAuth } from 'angular-auth-oidc-client';
import { MessageService, ConfirmationService } from 'primeng/api';
import { authInterceptor } from './app/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(
            appRoutes,
            withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
            withEnabledBlockingInitialNavigation(),
            // Preload all lazy-loaded route chunks in the background after the
            // first render → clicking any link becomes instant (no on-demand
            // chunk download per route).
            withPreloading(PreloadAllModules)
        ),
        provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
        provideAnimationsAsync(),
        providePrimeNG({ theme: { preset: Aura, options: { darkModeSelector: '.app-dark' } } }),
        provideAuth({
            config: {
                authority: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_RACghntmS',
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
        ConfirmationService
    ]
};

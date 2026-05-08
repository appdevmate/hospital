import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling } from '@angular/router';
import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { appRoutes } from './app.routes';
import { provideAuth } from 'angular-auth-oidc-client';
import { MessageService, ConfirmationService } from 'primeng/api';
import { authInterceptor } from './app/interceptors/auth.interceptor';
import { environment } from '../src/environments/environment';

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(appRoutes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }), withEnabledBlockingInitialNavigation()),
        provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
        provideAnimationsAsync(),
        providePrimeNG({ theme: { preset: Aura, options: { darkModeSelector: '.app-dark' } } }),
        provideAuth({
            config: {
                authority:             environment.cognitoAuthority,
                clientId:              environment.cognitoClientId,
                redirectUrl:           window.location.origin + '/',
                postLogoutRedirectUri: window.location.origin + '/',
                responseType:          'code',
                useRefreshToken:       true,
                silentRenew:           true,
                renewTimeBeforeTokenExpiresInSeconds: 60,
                scope:                 'openid email phone profile',
                customParamsEndSessionRequest: {
                    logout_uri: window.location.origin + '/'
                }
            }
        }),
        MessageService,
        ConfirmationService
    ]
};

import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling } from '@angular/router';
import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { appRoutes } from './app.routes';
import { provideAuth } from 'angular-auth-oidc-client';
import { MessageService, ConfirmationService } from 'primeng/api';

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(appRoutes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }), withEnabledBlockingInitialNavigation()),
        provideHttpClient(withFetch()),
        provideAnimationsAsync(),
        providePrimeNG({ theme: { preset: Aura, options: { darkModeSelector: '.app-dark' } } }),
        // app.config.ts
        provideAuth({
            config: {
                authority: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_FHl62iNIq', // Hosted UI //'https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_DVT3Zga6h',
                clientId: '5lfhb74v4e5m8gboof9sb230e8', // '294jljvu34snu0nd4cm8fqf9bu',
                redirectUrl: window.location.origin + '/',
                postLogoutRedirectUri: window.location.origin + '/', // ← back to /
                responseType: 'code',
                useRefreshToken: true,
                scope: 'openid email phone profile',
                // Cognito expects logout_uri
                customParamsEndSessionRequest: {
                    logout_uri: window.location.origin + '/'
                }
            }
        }),
        MessageService,
        ConfirmationService
    ]
};

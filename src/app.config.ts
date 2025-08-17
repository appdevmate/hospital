import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling } from '@angular/router';
import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { appRoutes } from './app.routes';
import { provideAuth } from 'angular-auth-oidc-client';

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(appRoutes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }), withEnabledBlockingInitialNavigation()),
        provideHttpClient(withFetch()),
        provideAnimationsAsync(),
        providePrimeNG({ theme: { preset: Aura, options: { darkModeSelector: '.app-dark' } } }),
        provideAuth({
            config: {
                authority: 'https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_DVT3Zga6h',
                clientId: '294jljvu34snu0nd4cm8fqf9bu',
                redirectUrl: 'http://localhost:4200/',
                postLogoutRedirectUri: window.location.origin + '/auth/login',
                responseType: 'code',
                useRefreshToken: true,
                scope: 'openid email phone profile'
            }
        })
    ]
};

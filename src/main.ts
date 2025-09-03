import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app.config';
import { AppComponent } from './app.component';
import { OidcSecurityService } from 'angular-auth-oidc-client';

bootstrapApplication(AppComponent, appConfig).then(
    (ref) => {
        const oidcSecurityService = ref.injector.get(OidcSecurityService);
        const isAuthCallback = window.location.pathname.includes('/auth/callback');

        if (!isAuthCallback) {
            oidcSecurityService.checkAuth().subscribe({
                next: (r) => {
                    if (r.isAuthenticated) {
                        // continue
                    } else {
                        oidcSecurityService.authorize(); // ← sends to Hosted UI
                    }
                },
                error: () => oidcSecurityService.logoffLocal()
            });

        } else {
            console.log('📢 Auth callback detected, processing...');
        }
    }
).catch((err) => console.error(err));

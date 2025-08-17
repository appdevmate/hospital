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
                next: (authResult) => {
                    console.log('✅ Startup Auth Check:', authResult);
                    if (authResult.isAuthenticated) {
                        const token = authResult.accessToken;
                        sessionStorage.setItem("accessToken", token);
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        const groups = payload['cognito:groups'];
                        if (groups.includes('Patients')) {
                        console.log("Logged in user is a doctor!");
                        
                        } else if (groups.includes('patients')) {
                        console.log("Logged in user is not a doctor!");
                        }
                        console.log('🎉 User authenticated, continue to app');
                    } else {
                        console.warn('🔒 Not authenticated → waiting for user to sign in');
                        oidcSecurityService.authorize();
                    }
                },
                error: (err) => {
                    console.error('❌ Error during auth check:', err);
                    oidcSecurityService.logoffLocal();
                }
            });
        } else {
            console.log('📢 Auth callback detected, processing...');
        }
    }
).catch((err) => console.error(err));

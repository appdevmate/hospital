import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app.config';
import { AppComponent } from './app.component';
import { OidcSecurityService } from 'angular-auth-oidc-client';

bootstrapApplication(AppComponent, appConfig)
    .then((ref) => {
        const oidcSecurityService = ref.injector.get(OidcSecurityService);
        const isAuthCallback = window.location.pathname.includes('/auth/callback');

        if (!isAuthCallback) {
            oidcSecurityService.checkAuth().subscribe({
                next: (authResult: any) => {
                    if (authResult.isAuthenticated) {
                        const token = authResult.accessToken;
                        sessionStorage.setItem('accessToken', token);

                        try {
                            const payload = JSON.parse(atob(token.split('.')[1]));
                            const groups: string[] = payload['cognito:groups'] ?? [];

                            if (groups.includes('Patients')) {
                                console.log('Logged in user is a doctor!');
                            } else if (groups.includes('patients')) {
                                console.log('Logged in user is not a doctor!');
                            }
                        } catch {
                            console.warn('Failed to parse token payload');
                        }

                        console.log('🎉 User authenticated, continue to app');
                    } else {
                        console.warn('🔒 Not authenticated → redirecting to sign in');
                        oidcSecurityService.authorize(); // send to Hosted UI
                    }
                },
                error: () => oidcSecurityService.logoffLocal()
            });
        } else {
            console.log('📢 Auth callback detected, processing...');
        }
    })
    .catch((err) => console.error(err));

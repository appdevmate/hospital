import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { TranslatePipe } from '@ngx-translate/core';
import { CognitoAuthService } from '@/services/cognito-auth.service';
import { I18nService, SUPPORTED_LANGS } from '@/services/i18n.service';

/**
 * Akwadona — Custom Angular login (Phase 1 of Hosted-UI replacement).
 *
 * Replaces the Cognito Hosted UI redirect (English-only) with an in-app
 * sign-in form that follows the same translation + RTL pipeline as the
 * rest of the application.
 *
 * Flow:
 *   1. User types username + password, picks language if needed.
 *   2. CognitoAuthService.signIn -> InitiateAuth (USER_PASSWORD_AUTH).
 *   3. On success, tokens land in sessionStorage / localStorage and the
 *      existing auth.guard.ts picks the user up on the next navigation.
 *   4. NEW_PASSWORD_REQUIRED / MFA challenges are deferred to Phase 3.
 *      For now they surface a clear message and instruct the operator.
 *
 * Industry reference: Stripe dashboard, Vercel, Linear all use a custom
 * Angular/React login page over their IDP's REST API for exactly this
 * reason — full control over copy, language, and brand.
 */
@Component({
    selector: 'app-login',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        ButtonModule, InputTextModule, PasswordModule, SelectModule,
        CardModule, MessageModule, TranslatePipe
    ],
    template: `
        <div class="login-shell">
            <div class="login-card">
                <header class="brand">
                    <h1>{{ 'app.name' | translate }}</h1>
                    <p class="tagline">{{ 'app.tagline' | translate }}</p>
                </header>

                <h2>{{ 'auth.welcomeBack' | translate }}</h2>
                <p class="subtitle">{{ 'auth.signInToContinue' | translate }}</p>

                <form (submit)="onSubmit($event)" autocomplete="on">
                    <label class="field">
                        <span>{{ 'auth.username' | translate }}</span>
                        <input pInputText
                               type="text"
                               name="username"
                               autocomplete="username"
                               autofocus
                               [(ngModel)]="username"
                               [disabled]="loading()" />
                    </label>

                    <label class="field">
                        <span>{{ 'auth.password' | translate }}</span>
                        <p-password [(ngModel)]="password"
                                    name="password"
                                    [feedback]="false"
                                    [toggleMask]="true"
                                    [disabled]="loading()"
                                    inputStyleClass="w-full"
                                    styleClass="w-full"
                                    autocomplete="current-password"></p-password>
                    </label>

                    @if (error()) {
                        <p-message severity="error"
                                   [text]="'auth.errors.' + error() | translate"
                                   styleClass="w-full"></p-message>
                    }

                    <p-button type="submit"
                              [label]="(loading() ? 'auth.signingIn' : 'auth.signIn') | translate"
                              [disabled]="loading()"
                              [loading]="loading()"
                              icon="pi pi-sign-in"
                              styleClass="w-full submit-btn"></p-button>
                </form>

                <footer class="login-footer">
                    <div class="lang-row">
                        <span>{{ 'auth.language' | translate }}:</span>
                        <p-select [options]="langOptions"
                                  [ngModel]="currentLang()"
                                  (ngModelChange)="changeLang($event)"
                                  optionLabel="label"
                                  optionValue="code"
                                  appendTo="body"
                                  [style]="{ width: '8rem' }"></p-select>
                    </div>
                </footer>
            </div>
        </div>
    `,
    styles: [`
        .login-shell {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, var(--surface-50) 0%, var(--surface-100) 100%);
            padding: 1rem;
        }
        .login-card {
            background: var(--surface-0);
            border: 1px solid var(--surface-200);
            border-radius: 0.75rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.06);
            padding: 2.5rem 2rem;
            width: 100%;
            max-width: 26rem;
        }
        .brand { text-align: center; margin-bottom: 1.5rem; }
        .brand h1 { margin: 0; font-size: 1.5rem; color: var(--primary-color); }
        .brand .tagline { margin: 0.25rem 0 0; color: var(--text-color-secondary); font-size: 0.875rem; }
        h2 { margin: 0 0 0.25rem; font-size: 1.25rem; }
        .subtitle { margin: 0 0 1.5rem; color: var(--text-color-secondary); font-size: 0.9rem; }
        form { display: flex; flex-direction: column; gap: 1rem; }
        .field { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.875rem; color: var(--text-color-secondary); }
        .field input, .field :host ::ng-deep .p-password, .field :host ::ng-deep .p-password input { width: 100%; }
        .submit-btn { margin-top: 0.5rem; }
        .login-footer { margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--surface-200); }
        .lang-row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; font-size: 0.85rem; color: var(--text-color-secondary); }
        :host ::ng-deep .p-password { display: block; }
        :host ::ng-deep .p-password input { width: 100%; }
    `]
})
export class LoginComponent {
    private auth   = inject(CognitoAuthService);
    private i18n   = inject(I18nService);
    private router = inject(Router);
    private route  = inject(ActivatedRoute);

    username = '';
    password = '';

    readonly loading = signal(false);
    readonly error   = signal<string | null>(null);

    readonly currentLang = this.i18n.current;
    readonly langOptions = SUPPORTED_LANGS.map((l) => ({ code: l.code, label: l.label }));

    changeLang(code: string): void { this.i18n.setLang(code as any); }

    async onSubmit(ev: Event): Promise<void> {
        ev.preventDefault();
        if (this.loading()) return;

        this.error.set(null);

        if (!this.username.trim() || !this.password) {
            this.error.set('missingCredentials');
            return;
        }

        this.loading.set(true);
        const result = await this.auth.signIn(this.username.trim(), this.password);
        this.loading.set(false);

        if (result.kind === 'ok') {
            // Send the user where they were heading (or root if nothing pending).
            const returnUrl = this.route.snapshot.queryParamMap.get('return')
                           || localStorage.getItem('returnUrl')
                           || '/';
            localStorage.removeItem('returnUrl');
            this.router.navigateByUrl(returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/');
            return;
        }

        if (result.kind === 'challenge') {
            // Phase 3 will handle NEW_PASSWORD_REQUIRED inline. For Phase 1
            // surface a message so the operator knows to reset the password.
            this.error.set('newPasswordRequired');
            return;
        }

        // Map AWS exception codes to translation keys.
        this.error.set(mapErrorCode(result.code));
    }
}

/**
 * Maps Cognito exception codes to the translation key under `auth.errors.*`.
 * Anything unmapped collapses to `unknown` so we never expose raw AWS
 * exception names to the user.
 */
function mapErrorCode(code: string): string {
    switch (code) {
        case 'NotAuthorizedException':           return 'invalidCredentials';
        case 'UserNotFoundException':            return 'userNotFound';
        case 'UserNotConfirmedException':        return 'newPasswordRequired';
        case 'PasswordResetRequiredException':   return 'newPasswordRequired';
        case 'TooManyRequestsException':         return 'tooManyAttempts';
        case 'TooManyFailedAttemptsException':   return 'tooManyAttempts';
        case 'LimitExceededException':           return 'tooManyAttempts';
        case 'NetworkError':                     return 'networkError';
        case 'MissingCredentials':               return 'missingCredentials';
        default:                                  return 'unknown';
    }
}

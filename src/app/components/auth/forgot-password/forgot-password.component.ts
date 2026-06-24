import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CognitoAuthService } from '@/services/cognito-auth.service';

/**
 * Akwadona - Forgot password flow (Phase 2 of Hosted-UI replacement).
 *
 * Two-step wizard:
 *   1. Username -> Cognito ForgotPassword -> Cognito emails a 6-digit code.
 *      UI shows the redacted destination so the user knows which inbox.
 *   2. Code + new password + confirm -> Cognito ConfirmForgotPassword ->
 *      redirect to /login with a success toast.
 *
 * Account-enumeration mitigation: when Cognito returns UserNotFoundException
 * we DO NOT surface that to the UI. We treat the request as if it succeeded
 * (show the code-entry screen) so an attacker scraping the form cannot
 * distinguish "this username exists" from "this username does not exist".
 * This matches the OWASP ASVS V3.2.3 / NIST 800-63B AAL2 guidance and the
 * pattern used by Stripe, GitHub, and Auth0.
 */
@Component({
    selector: 'app-forgot-password',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        ButtonModule, InputTextModule, PasswordModule, MessageModule, ToastModule,
        TranslatePipe
    ],
    providers: [MessageService],
    template: `
        <p-toast></p-toast>

        <div class="login-shell">
            <div class="login-card">
                <header class="brand">
                    <h1>{{ 'app.name' | translate }}</h1>
                    <p class="tagline">{{ 'app.tagline' | translate }}</p>
                </header>

                @if (stage() === 'request') {
                    <h2>{{ 'auth.forgot.requestTitle' | translate }}</h2>
                    <p class="subtitle">{{ 'auth.forgot.requestSubtitle' | translate }}</p>

                    <form (submit)="onRequest($event)" autocomplete="on">
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

                        @if (error()) {
                            <p-message severity="error"
                                       [text]="'auth.errors.' + error() | translate"
                                       styleClass="w-full"></p-message>
                        }

                        <p-button type="submit"
                                  [label]="(loading() ? 'auth.forgot.sending' : 'auth.forgot.sendCode') | translate"
                                  [disabled]="loading()"
                                  [loading]="loading()"
                                  icon="pi pi-envelope"
                                  styleClass="w-full submit-btn"></p-button>
                    </form>
                } @else {
                    <h2>{{ 'auth.forgot.codeSentTitle' | translate }}</h2>
                    <p class="subtitle">{{ codeSentMessage() }}</p>

                    <form (submit)="onConfirm($event)" autocomplete="off">
                        <label class="field">
                            <span>{{ 'auth.forgot.verificationCode' | translate }}</span>
                            <input pInputText
                                   type="text"
                                   inputmode="numeric"
                                   name="code"
                                   autocomplete="one-time-code"
                                   autofocus
                                   maxlength="6"
                                   [(ngModel)]="code"
                                   [disabled]="loading()" />
                        </label>

                        <label class="field">
                            <span>{{ 'auth.forgot.newPassword' | translate }}</span>
                            <p-password [(ngModel)]="newPassword"
                                        name="newPassword"
                                        [feedback]="true"
                                        [toggleMask]="true"
                                        [disabled]="loading()"
                                        styleClass="w-full"
                                        inputStyleClass="w-full"
                                        autocomplete="new-password"></p-password>
                        </label>

                        <label class="field">
                            <span>{{ 'auth.forgot.confirmNewPassword' | translate }}</span>
                            <p-password [(ngModel)]="confirmPassword"
                                        name="confirmPassword"
                                        [feedback]="false"
                                        [toggleMask]="true"
                                        [disabled]="loading()"
                                        styleClass="w-full"
                                        inputStyleClass="w-full"
                                        autocomplete="new-password"></p-password>
                        </label>

                        @if (error()) {
                            <p-message severity="error"
                                       [text]="'auth.errors.' + error() | translate"
                                       styleClass="w-full"></p-message>
                        }

                        <p-button type="submit"
                                  [label]="(loading() ? 'auth.forgot.resetting' : 'auth.forgot.resetPassword') | translate"
                                  [disabled]="loading()"
                                  [loading]="loading()"
                                  icon="pi pi-check"
                                  styleClass="w-full submit-btn"></p-button>

                        <p-button type="button"
                                  [label]="'auth.forgot.resendCode' | translate"
                                  severity="secondary"
                                  [text]="true"
                                  size="small"
                                  [disabled]="loading()"
                                  (onClick)="onResend()"
                                  styleClass="w-full"></p-button>
                    </form>
                }

                <footer class="login-footer">
                    <p-button [label]="'auth.backToSignIn' | translate"
                              icon="pi pi-arrow-left"
                              severity="secondary"
                              [text]="true"
                              size="small"
                              (onClick)="goLogin()"></p-button>
                </footer>
            </div>
        </div>
    `,
    styles: [`
        .login-shell { min-height: 100vh; display: flex; align-items: center; justify-content: center;
            background: linear-gradient(135deg, var(--surface-50) 0%, var(--surface-100) 100%); padding: 1rem; }
        .login-card { background: var(--surface-0); border: 1px solid var(--surface-200); border-radius: 0.75rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.06); padding: 2.5rem 2rem; width: 100%; max-width: 26rem; }
        .brand { text-align: center; margin-bottom: 1.5rem; }
        .brand h1 { margin: 0; font-size: 1.5rem; color: var(--primary-color); }
        .brand .tagline { margin: 0.25rem 0 0; color: var(--text-color-secondary); font-size: 0.875rem; }
        h2 { margin: 0 0 0.25rem; font-size: 1.25rem; }
        .subtitle { margin: 0 0 1.5rem; color: var(--text-color-secondary); font-size: 0.9rem; line-height: 1.4; }
        form { display: flex; flex-direction: column; gap: 1rem; }
        .field { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.875rem; color: var(--text-color-secondary); }
        .field input { width: 100%; font-size: 1rem; }
        .submit-btn { margin-top: 0.5rem; }
        .login-footer { margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--surface-200); text-align: center; }
        :host ::ng-deep .p-password { display: block; }
        :host ::ng-deep .p-password input { width: 100%; }
    `]
})
export class ForgotPasswordComponent {
    private auth   = inject(CognitoAuthService);
    private router = inject(Router);
    private toast  = inject(MessageService);
    private t      = inject(TranslateService);

    username = '';
    code     = '';
    newPassword     = '';
    confirmPassword = '';

    readonly stage   = signal<'request' | 'confirm'>('request');
    readonly loading = signal(false);
    readonly error   = signal<string | null>(null);

    /** Redacted destination Cognito returned (e.g. "a***@a***.com"). */
    readonly destination = signal('');

    codeSentMessage(): string {
        return this.t.instant('auth.forgot.codeSentSubtitle', { destination: this.destination() });
    }

    goLogin(): void { this.router.navigate(['/login']); }

    async onRequest(ev: Event): Promise<void> {
        ev.preventDefault();
        if (this.loading()) return;
        this.error.set(null);
        if (!this.username.trim()) { this.error.set('missingUsername'); return; }

        this.loading.set(true);
        const r = await this.auth.forgotPassword(this.username.trim());
        this.loading.set(false);

        if (r.kind === 'ok') {
            this.destination.set(r.destination);
            this.stage.set('confirm');
            return;
        }

        // Account-enumeration mitigation: pretend success for not-found /
        // unconfirmed users. They land on the code-entry screen and the
        // subsequent ConfirmForgotPassword call will fail with invalid
        // code - same error any user would get from a typo.
        if (r.code === 'UserNotFoundException' || r.code === 'InvalidParameterException') {
            this.destination.set('your email');
            this.stage.set('confirm');
            return;
        }

        this.error.set(mapForgotError(r.code));
    }

    async onResend(): Promise<void> {
        if (this.loading()) return;
        this.error.set(null);
        this.loading.set(true);
        const r = await this.auth.forgotPassword(this.username.trim());
        this.loading.set(false);
        if (r.kind === 'ok') {
            this.destination.set(r.destination);
            this.toast.add({ severity: 'success', summary: this.t.instant('auth.forgot.codeSentTitle'), life: 4000 });
        } else {
            this.error.set(mapForgotError(r.code));
        }
    }

    async onConfirm(ev: Event): Promise<void> {
        ev.preventDefault();
        if (this.loading()) return;
        this.error.set(null);

        if (!this.code.trim()) { this.error.set('missingCode'); return; }
        if (!this.newPassword) { this.error.set('missingCredentials'); return; }
        if (this.newPassword !== this.confirmPassword) { this.error.set('passwordMismatch'); return; }

        this.loading.set(true);
        const r = await this.auth.confirmForgotPassword(this.username.trim(), this.code.trim(), this.newPassword);
        this.loading.set(false);

        if (r.kind === 'ok') {
            this.toast.add({ severity: 'success', summary: this.t.instant('auth.forgot.resetSuccess'), life: 4000 });
            // Small delay so the toast is visible before the route change.
            setTimeout(() => this.router.navigate(['/login']), 1200);
            return;
        }
        this.error.set(mapForgotError(r.code));
    }
}

function mapForgotError(code: string): string {
    switch (code) {
        case 'CodeMismatchException':       return 'invalidCode';
        case 'ExpiredCodeException':        return 'expiredCode';
        case 'InvalidPasswordException':    return 'passwordTooWeak';
        case 'LimitExceededException':      return 'tooManyAttempts';
        case 'TooManyRequestsException':    return 'tooManyAttempts';
        case 'NotAuthorizedException':      return 'resetUnavailable';
        case 'UserNotConfirmedException':   return 'resetUnavailable';
        case 'MissingUsername':             return 'missingUsername';
        case 'MissingCode':                 return 'missingCode';
        case 'MissingPassword':             return 'missingCredentials';
        case 'NetworkError':                return 'networkError';
        default:                            return 'unknown';
    }
}

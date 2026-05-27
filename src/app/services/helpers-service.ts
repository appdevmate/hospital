import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';
import { OidcSecurityService } from 'angular-auth-oidc-client';

@Injectable({
    providedIn: 'root'
})
export class HelpersService {
    private readonly SESSION_EXPIRED_DELAY_MS = 2000;

    constructor(
        private messageService: MessageService,
        private oidc: OidcSecurityService
    ) {}

    redirectToLogin(): void {
        this.notifyError('Session Expired', 'Please log in again');
        // Capture full path + query so the user returns to the exact page after re-login.
        sessionStorage.setItem('returnUrl', window.location.pathname + window.location.search);
        setTimeout(() => this.oidc.authorize(), this.SESSION_EXPIRED_DELAY_MS);
    }

    notifySuccess(message: string) {
        this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: message,
            life: 3000
        });
    }

    notifyWarning(message: string) {
        this.messageService.add({
            severity: 'warn',
            summary: 'Warning',
            detail: message,
            life: 3000
        });
    }

    notifyError(summary: string, message: string) {
        this.messageService.add({
            severity: 'error',
            summary: summary,
            detail: message,
            life: 3000
        });
    }

    /**
     * Pulls the most specific error text out of a failed HTTP call.
     * Backend Lambdas return { message, error }; some return only one, and
     * gateway/string errors land on err.error or err.message. This checks all.
     */
    extractError(err: any, fallback = 'Something went wrong. Please try again.'): string {
        if (!err) return fallback;
        const e = err.error ?? err;
        if (typeof e === 'string' && e.trim()) return e;
        return e?.message || e?.error || err?.message || fallback;
    }

    /**
     * Standard error toast for API calls: surfaces the backend message, and
     * transparently handles 401/Unauthorized by redirecting to login.
     */
    notifyApiError(summary: string, err: any, fallback = 'Something went wrong. Please try again.') {
        if (err?.status === 401 || err?.error?.message === 'Unauthorized') {
            this.redirectToLogin();
            return;
        }
        this.notifyError(summary, this.extractError(err, fallback));
    }

    notifyInfo(summary: string, message: string) {
        this.messageService.add({
            severity: 'info',
            summary: summary,
            detail: message,
            life: 3000
        });
    }

    toTimeStr(date: Date | null): string {
        if (!date) return '00:00';
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
}

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
        sessionStorage.setItem('returnUrl', window.location.pathname);
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

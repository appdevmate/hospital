import { __decorate } from "tslib";
import { Injectable } from '@angular/core';
let HelpersService = class HelpersService {
    messageService;
    oidc;
    SESSION_EXPIRED_DELAY_MS = 2000;
    constructor(messageService, oidc) {
        this.messageService = messageService;
        this.oidc = oidc;
    }
    redirectToLogin() {
        this.notifyError('Session Expired', 'Please log in again');
        sessionStorage.setItem('returnUrl', window.location.pathname);
        setTimeout(() => this.oidc.authorize(), this.SESSION_EXPIRED_DELAY_MS);
    }
    notifySuccess(message) {
        this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: message,
            life: 3000
        });
    }
    notifyWarning(message) {
        this.messageService.add({
            severity: 'warn',
            summary: 'Warning',
            detail: message,
            life: 3000
        });
    }
    notifyError(summary, message) {
        this.messageService.add({
            severity: 'error',
            summary: summary,
            detail: message,
            life: 3000
        });
    }
    notifyInfo(summary, message) {
        this.messageService.add({
            severity: 'info',
            summary: summary,
            detail: message,
            life: 3000
        });
    }
    toTimeStr(date) {
        if (!date)
            return '00:00';
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
};
HelpersService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], HelpersService);
export { HelpersService };

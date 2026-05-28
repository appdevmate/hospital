import { Injectable } from '@angular/core';
import { AbstractSecurityStorage } from 'angular-auth-oidc-client';

/**
 * angular-auth-oidc-client storage backed by localStorage so the OIDC session
 * is shared across browser tabs. Required so that right-click "Open link in
 * new tab" lands on the target page instead of forcing a fresh login.
 *
 * Tradeoff: localStorage is readable from any script on this origin (XSS risk
 * window is wider than sessionStorage). Accept this in exchange for the
 * cross-tab UX. Tokens are short-lived (1h access, 30d refresh) and rotated
 * by Cognito.
 */
@Injectable({ providedIn: 'root' })
export class LocalSecurityStorage implements AbstractSecurityStorage {
    read(key: string): any {
        const raw = localStorage.getItem(key);
        if (raw === null) return null;
        try {
            return JSON.parse(raw);
        } catch {
            return raw;
        }
    }

    write(key: string, value: any): void {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {
            // Quota or serialisation failure — swallow to mirror the library's defaults.
        }
    }

    remove(key: string): void {
        localStorage.removeItem(key);
    }

    clear(): void {
        // The library calls clear() on logout. Clearing all of localStorage
        // would wipe app prefs too — only remove OIDC-prefixed keys.
        const remove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.includes('oidc') || k.startsWith('0-') || k.startsWith('auth') || k.startsWith('access_token') || k.startsWith('refresh_token') || k.startsWith('id_token'))) {
                remove.push(k);
            }
        }
        remove.forEach((k) => localStorage.removeItem(k));
    }
}

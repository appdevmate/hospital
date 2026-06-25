import { Injectable, inject, OnDestroy } from '@angular/core';
import { CognitoAuthService } from './cognito-auth.service';

/**
 * Akwadona - silent token refresh scheduler (Phase 4 of Hosted-UI replacement).
 *
 * Cognito access tokens live for 1 hour. Without a refresher, any tab that
 * stays open past that window gets a 401 cascade and bounces the user to
 * /login - terrible UX for a daily-driver hospital app where users keep the
 * dashboard open all shift.
 *
 * This service:
 *   1. Reads `tokenExpiresAt` from sessionStorage on app bootstrap.
 *   2. Schedules a refresh 5 minutes BEFORE the token would expire.
 *   3. On success, the new tokens overwrite the storage entries; the
 *      auth.interceptor picks them up on the next request automatically.
 *   4. On failure (refresh token revoked or expired - default 30 days),
 *      surfaces nothing and lets the next 401 send the user to /login.
 *
 * No UI thrash, no Cognito redirect, no manual re-sign-in within the
 * 30-day refresh window. Same model as Stripe Dashboard, Vercel, Linear.
 */
@Injectable({ providedIn: 'root' })
export class RefreshSchedulerService implements OnDestroy {
    private auth = inject(CognitoAuthService);

    /** ms before the access token expiry at which we trigger a refresh. */
    private static readonly LEAD_TIME_MS = 5 * 60 * 1000;
    /** safety floor so we never schedule an immediate refresh in a tight loop. */
    private static readonly MIN_DELAY_MS = 10 * 1000;

    private timer: ReturnType<typeof setTimeout> | null = null;
    private refreshing = false;

    /**
     * Start watching. Safe to call multiple times - the previous timer is
     * cleared. Idempotent on a per-tab basis.
     */
    start(): void {
        this.stop();
        const expiresAt = Number(sessionStorage.getItem('tokenExpiresAt') || 0);
        if (!expiresAt) return;     // no session yet - nothing to do

        const fromNow = expiresAt - Date.now() - RefreshSchedulerService.LEAD_TIME_MS;
        const delay   = Math.max(fromNow, RefreshSchedulerService.MIN_DELAY_MS);

        this.timer = setTimeout(() => this.refreshOnce(), delay);
    }

    stop(): void {
        if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    }

    ngOnDestroy(): void { this.stop(); }

    private async refreshOnce(): Promise<void> {
        if (this.refreshing) return;
        this.refreshing = true;
        try {
            const ok = await this.auth.refresh();
            if (ok) {
                // Reschedule against the new token's expiry. CognitoAuthService
                // updated `tokenExpiresAt` for us.
                this.start();
            }
            // Failure path: do nothing. The interceptor will catch the next
            // 401 and bounce the user to /login.
        } finally {
            this.refreshing = false;
        }
    }
}

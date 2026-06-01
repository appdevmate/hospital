import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpRequest } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { offlineDb, PendingMutation } from './offline-db';
import { HelpersService } from './helpers-service';

/**
 * Offline mutation queue + replay.
 *
 * Phase C of the offline mode plan (see docs/offline-mode.md):
 *   - When offline, mutating HTTP requests (POST/PATCH/PUT/DELETE) are
 *     intercepted, persisted to IndexedDB, and a synthetic 202 response is
 *     returned so the caller's success path keeps running.
 *   - When the browser goes back online (or at app start), the queue is
 *     replayed in order. Each successful replay deletes its row.
 *   - 4xx errors that mean "already applied or invalid" (400/404/409/422) drop
 *     the row so we don't get stuck. 5xx / network errors stop replay so we
 *     try again on the next online event.
 */
@Injectable({ providedIn: 'root' })
export class OfflineService {
    private http = inject(HttpClient);
    private helpers = inject(HelpersService);

    private _pendingCount$ = new BehaviorSubject<number>(0);
    /** Observable count of mutations waiting in the queue (drives the UI badge). */
    readonly pendingCount$ = this._pendingCount$.asObservable();

    private replaying = false;

    constructor() {
        this.refreshCount();
        // Replay every time the browser comes back online.
        window.addEventListener('online', () => this.replay());
        // Also try a replay on app boot in case there's an unfinished backlog
        // from a previous session. Slight delay so auth has settled.
        if (typeof navigator !== 'undefined' && navigator.onLine) {
            setTimeout(() => this.replay(), 3000);
        }
    }

    isOffline(): boolean {
        return typeof navigator !== 'undefined' && !navigator.onLine;
    }

    /** Persist a mutation so it can be replayed when we're back online. */
    async enqueue(req: HttpRequest<any>): Promise<void> {
        const headers: Record<string, string> = {};
        req.headers.keys().forEach((k) => {
            // Don't persist the access token — it expires. Re-attached at replay.
            if (k.toLowerCase() !== 'authorization') {
                const v = req.headers.get(k);
                if (v !== null) headers[k] = v;
            }
        });
        const m: PendingMutation = {
            id: this.uuid(),
            clientRequestId: this.uuid(),
            url: req.urlWithParams,
            method: req.method,
            headers,
            body: req.body,
            createdAt: Date.now()
        };
        await offlineDb.add(m);
        await this.refreshCount();
    }

    /** Walk the queue in order and replay each mutation. */
    async replay(): Promise<void> {
        if (this.replaying) return;
        if (typeof navigator !== 'undefined' && !navigator.onLine) return;
        this.replaying = true;
        try {
            const all = await offlineDb.getAll();
            if (!all.length) return;
            all.sort((a, b) => a.createdAt - b.createdAt);

            const token = sessionStorage.getItem('accessToken') || '';
            let succeeded = 0;

            for (const m of all) {
                try {
                    const headers = new HttpHeaders({ ...m.headers, Authorization: `Bearer ${token}` });
                    await firstValueFrom(
                        this.http.request(m.method, m.url, { body: m.body, headers })
                    );
                    await offlineDb.remove(m.id);
                    succeeded++;
                } catch (e: any) {
                    const s = e?.status;
                    if (s === 400 || s === 404 || s === 409 || s === 422) {
                        // Already applied / invalid → drop and continue.
                        await offlineDb.remove(m.id);
                    } else {
                        // 0 / 401 / 5xx → stop now, retry on next online event.
                        break;
                    }
                }
            }

            if (succeeded > 0) {
                this.helpers.notifySuccess(
                    `Synced ${succeeded} pending action${succeeded > 1 ? 's' : ''}.`
                );
            }
        } finally {
            this.replaying = false;
            await this.refreshCount();
        }
    }

    /** Wipe the queue (e.g. on logout). */
    async clear(): Promise<void> {
        await offlineDb.clear();
        await this.refreshCount();
    }

    private async refreshCount(): Promise<void> {
        try {
            this._pendingCount$.next(await offlineDb.count());
        } catch {
            // ignore — IndexedDB unavailable
        }
    }

    private uuid(): string {
        if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
            return (crypto as any).randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }
}

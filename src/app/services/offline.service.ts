import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpRequest } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { offlineDb, PendingMutation, uuid } from './offline-db';
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
        // Preserve the X-Client-Request-Id the interceptor already attached so
        // the backend can dedupe on replay. Fall back to a new UUID if absent.
        const cid = req.headers.get('X-Client-Request-Id') || uuid();
        const m: PendingMutation = {
            id: uuid(),
            clientRequestId: cid,
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
            // Phase F: load known tempId→realId mappings; refresh after every create.
            let tempMap = await offlineDb.getAllTempMappings();
            let succeeded = 0;

            for (const m of all) {
                try {
                    // Phase F: rewrite any temp_* tokens in URL + body with their
                    // real server-issued ids before sending.
                    const rewrittenUrl = this.rewriteTemps(m.url, tempMap);
                    const tempIdsInBody = this.collectTempIds(m.body);
                    const rewrittenBody = this.rewriteBodyTemps(m.body, tempMap);

                    // If the URL or body still contains an unresolved temp id, the
                    // create that produces it must run first. The queue is in
                    // creation order, so if we hit one before its create, skip-stop.
                    if (this.hasUnresolvedTemp(rewrittenUrl, rewrittenBody)) {
                        // Stop here — a later replay round will resolve it.
                        break;
                    }

                    const headers = new HttpHeaders({ ...m.headers, Authorization: `Bearer ${token}` });
                    const resp: any = await firstValueFrom(
                        this.http.request(m.method, rewrittenUrl, { body: rewrittenBody, headers })
                    );

                    // Phase F: if the original request introduced a temp id and the
                    // response carries the real id, store the mapping.
                    const tempIdFromBody: string | null =
                        (m.body && typeof m.body === 'object' && (m.body as any)._tempId) || null;
                    if (tempIdFromBody && resp && typeof resp === 'object') {
                        const realId = this.findRealIdInResponse(resp);
                        if (realId) {
                            await offlineDb.putTempMapping(tempIdFromBody, realId);
                            tempMap[tempIdFromBody] = realId;
                        }
                    }
                    // Also store mappings for any tempIds the request used as
                    // path-segments if the response echoes a matching id field.
                    for (const t of tempIdsInBody) {
                        if (!tempMap[t]) {
                            const r = this.findRealIdInResponse(resp);
                            if (r) {
                                await offlineDb.putTempMapping(t, r);
                                tempMap[t] = r;
                            }
                        }
                    }

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

    // ── Phase F helpers: temp-id rewriting ──────────────────────────────────
    private rewriteTemps(s: string, map: Record<string, string>): string {
        if (!s) return s;
        return s.replace(/temp_[a-f0-9-]+/gi, (m) => map[m] || m);
    }
    private rewriteBodyTemps(body: any, map: Record<string, string>): any {
        if (body == null) return body;
        if (typeof body === 'string') return this.rewriteTemps(body, map);
        if (typeof body !== 'object') return body;
        try {
            const json = JSON.stringify(body);
            const rewritten = this.rewriteTemps(json, map);
            const obj = JSON.parse(rewritten);
            // strip _tempId before sending the create (server doesn't need it)
            if (obj && typeof obj === 'object' && '_tempId' in obj) delete obj._tempId;
            return obj;
        } catch {
            return body;
        }
    }
    private hasUnresolvedTemp(url: string, body: any): boolean {
        const inUrl = /temp_[a-f0-9-]+/i.test(url || '');
        let inBody = false;
        try { inBody = /temp_[a-f0-9-]+/i.test(JSON.stringify(body || '')); } catch {}
        return inUrl || inBody;
    }
    private collectTempIds(body: any): string[] {
        try {
            const m = JSON.stringify(body || '').match(/temp_[a-f0-9-]+/gi);
            return m ? Array.from(new Set(m)) : [];
        } catch { return []; }
    }
    private findRealIdInResponse(resp: any): string | null {
        if (!resp || typeof resp !== 'object') return null;
        // Try common id keys first.
        for (const k of ['id', 'examinationId', 'appointmentId', 'paymentId', 'eventId', 'calendarId',
                          'patientId', 'doctorId', 'orderId']) {
            const v = (resp as any)[k];
            if (typeof v === 'string' && v && !v.startsWith('temp_')) return v;
        }
        // Fallback: first *Id string value that isn't a temp id.
        for (const k of Object.keys(resp)) {
            if (/Id$/i.test(k)) {
                const v = (resp as any)[k];
                if (typeof v === 'string' && v && !v.startsWith('temp_')) return v;
            }
        }
        return null;
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
}

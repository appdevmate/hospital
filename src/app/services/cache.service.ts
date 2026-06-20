import { Injectable } from '@angular/core';

/**
 * TTL-keyed localStorage cache (Step 7i).
 *
 * Why: Stripe / Vercel / Linear all paint their dashboards from a cached
 * snapshot in < 200 ms, then refresh from the network in the background.
 * This service is the persistence half of that pattern.
 *
 * Keys are namespaced `akw:<area>:<id>` so we don't collide with other
 * localStorage usage. Values are JSON-serialised with a `_t` timestamp.
 * Reads that exceed the TTL return null (and the caller fetches fresh).
 *
 * Stays small: localStorage caps at ~5 MB per origin — fine for metadata,
 * never store PHI here.
 */
@Injectable({ providedIn: 'root' })
export class CacheService {
    private readonly NS = 'akw:';

    /**
     * Read a cached value. Returns null if missing or expired.
     * `ttlMs` is how long the cached value is considered fresh.
     */
    get<T>(key: string, ttlMs: number): T | null {
        try {
            const raw = localStorage.getItem(this.NS + key);
            if (!raw) return null;
            const { _t, v } = JSON.parse(raw) as { _t: number; v: T };
            if (typeof _t !== 'number') return null;
            if (Date.now() - _t > ttlMs) return null;
            return v;
        } catch {
            return null;
        }
    }

    /** Write a value with the current timestamp. */
    set<T>(key: string, value: T): void {
        try {
            localStorage.setItem(this.NS + key, JSON.stringify({ _t: Date.now(), v: value }));
        } catch {
            /* quota exceeded or unavailable — non-fatal */
        }
    }

    /** Remove one cached entry. */
    remove(key: string): void {
        try { localStorage.removeItem(this.NS + key); } catch { /* ignore */ }
    }

    /** Wipe every key in the akw: namespace (sign-out hook). */
    clearAll(): void {
        try {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const k = localStorage.key(i);
                if (k && k.startsWith(this.NS)) localStorage.removeItem(k);
            }
        } catch { /* ignore */ }
    }
}

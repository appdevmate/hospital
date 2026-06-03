// Minimal IndexedDB wrapper for the offline mutations queue.
// No external deps (raw IndexedDB API) so we don't add another npm package.
// The store persists across browser sessions until the user clears site data
// or the entries are successfully replayed.

export interface PendingMutation {
    id: string;             // client UUID (queue key)
    clientRequestId: string;// UUID sent to the server for idempotency
    url: string;            // full URL incl. query string
    method: string;         // POST / PATCH / PUT / DELETE
    headers: Record<string, string>;
    body: any;              // request body (structured-cloneable)
    createdAt: number;      // ms since epoch
}

const DB_NAME = 'tiryaq-offline';
// Phase F: bumped to v2 to add the tempIdMap store for offline-created
// entity FK rewriting (consultations etc.).
const DB_VERSION = 2;
const STORE = 'pendingMutations';
const TEMP_STORE = 'tempIdMap';

function open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(TEMP_STORE)) {
                // Map tempId (e.g. "temp_<uuid>") → realId returned by server on replay.
                db.createObjectStore(TEMP_STORE, { keyPath: 'tempId' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export const offlineDb = {
    async add(m: PendingMutation): Promise<void> {
        const db = await open();
        try {
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction(STORE, 'readwrite');
                tx.objectStore(STORE).add(m);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } finally {
            db.close();
        }
    },

    async getAll(): Promise<PendingMutation[]> {
        const db = await open();
        try {
            return await new Promise<PendingMutation[]>((resolve, reject) => {
                const tx = db.transaction(STORE, 'readonly');
                const req = tx.objectStore(STORE).getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => reject(req.error);
            });
        } finally {
            db.close();
        }
    },

    async remove(id: string): Promise<void> {
        const db = await open();
        try {
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction(STORE, 'readwrite');
                tx.objectStore(STORE).delete(id);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } finally {
            db.close();
        }
    },

    async count(): Promise<number> {
        const db = await open();
        try {
            return await new Promise<number>((resolve, reject) => {
                const tx = db.transaction(STORE, 'readonly');
                const req = tx.objectStore(STORE).count();
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        } finally {
            db.close();
        }
    },

    async clear(): Promise<void> {
        const db = await open();
        try {
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction(STORE, 'readwrite');
                tx.objectStore(STORE).clear();
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } finally {
            db.close();
        }
    },

    // ── Temp-ID mapping (Phase F) ───────────────────────────────────────────
    /** Record that an offline tempId resolved to a real server-issued id. */
    async putTempMapping(tempId: string, realId: string): Promise<void> {
        if (!tempId || !realId) return;
        const db = await open();
        try {
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction(TEMP_STORE, 'readwrite');
                tx.objectStore(TEMP_STORE).put({ tempId, realId, createdAt: Date.now() });
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } finally {
            db.close();
        }
    },

    async getTempMapping(tempId: string): Promise<string | null> {
        const db = await open();
        try {
            return await new Promise<string | null>((resolve, reject) => {
                const tx = db.transaction(TEMP_STORE, 'readonly');
                const req = tx.objectStore(TEMP_STORE).get(tempId);
                req.onsuccess = () => resolve(req.result?.realId || null);
                req.onerror = () => reject(req.error);
            });
        } finally {
            db.close();
        }
    },

    async getAllTempMappings(): Promise<Record<string, string>> {
        const db = await open();
        try {
            const rows = await new Promise<any[]>((resolve, reject) => {
                const tx = db.transaction(TEMP_STORE, 'readonly');
                const req = tx.objectStore(TEMP_STORE).getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => reject(req.error);
            });
            const map: Record<string, string> = {};
            for (const r of rows) map[r.tempId] = r.realId;
            return map;
        } finally {
            db.close();
        }
    }
};

/** Create a temp id used while offline. Recognisable everywhere as `temp_…`. */
export function tempId(): string {
    return 'temp_' + uuid();
}
export function isTempId(v: any): boolean {
    return typeof v === 'string' && v.startsWith('temp_');
}

// ── Toast coordination ──────────────────────────────────────────────────────
// The offline interceptor calls markOfflineEnqueue() the moment it queues a
// mutation. HelpersService.notifySuccess checks wasOfflineEnqueueRecent() and
// skips the component's "Saved/Created/..." toast so we don't double-notify on
// top of the interceptor's "Saved offline, will sync when back online" toast.
let lastEnqueueAt = 0;
export function markOfflineEnqueue(): void {
    lastEnqueueAt = Date.now();
}
export function wasOfflineEnqueueRecent(windowMs = 1500): boolean {
    return Date.now() - lastEnqueueAt < windowMs;
}

// ── UUID helper ─────────────────────────────────────────────────────────────
// Used for both queue row ids and the X-Client-Request-Id header attached to
// every mutating API call (backend uses it for idempotency / dedupe on replay).
export function uuid(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return (crypto as { randomUUID(): string }).randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

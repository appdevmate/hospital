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
const DB_VERSION = 1;
const STORE = 'pendingMutations';

function open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE, { keyPath: 'id' });
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
    }
};

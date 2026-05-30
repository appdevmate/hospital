# Offline Mode — Design Doc

**Date:** 2026-05-26
**Status:** Proposed (not implemented)
**Goal:** Let the user keep working while offline and auto-submit pending writes when the connection returns.

## What the user sees

- App keeps loading + browsing already-fetched data while offline
- Trying to save / update / cancel / delete → toast: "No connection. Will submit when you're back online."
- A small badge shows pending count
- When online → queued requests submit automatically → toast: "Synced."

## Glossary (abbreviations)

- **PWA** → Progressive Web App. A web app that can be installed and work offline.
- **SW / Service Worker** → Background JS script in the browser. Intercepts network requests; controls caching.
- **ngsw** → Angular Service Worker (`@angular/service-worker`). Configured via `ngsw-config.json`.
- **IndexedDB** → Browser-side database (per-origin). Stores structured data offline.
- **idb** → Tiny npm wrapper around IndexedDB (less boilerplate).
- **localForage** → Alternative npm lib that wraps IndexedDB with a simpler API.
- **Background Sync API** → Browser API (Chrome/Edge). Lets the SW retry queued requests even after the tab is closed.
- **CRUD** → Create / Read / Update / Delete.
- **FK** → Foreign Key — a field that references another record.
- **UUID** → Universally Unique Identifier (e.g. `550e8400-e29b-…`). Used to give offline-created records a stable ID before the server sees them.
- **OIDC** → OpenID Connect (auth protocol used with Cognito).
- **JWT** → JSON Web Token (access-token format).
- **PHI** → Protected Health Information (regulated patient data).
- **PDPPL** → Qatar's Personal Data Privacy Protection Law.
- **MOPH** → Ministry of Public Health (Qatar regulator).
- **SOAP note** → Subjective / Objective / Assessment / Plan — standard clinical note format.
- **TTL** → Time-to-live (auto-expiry for stored items).
- **LWW** → Last-Write-Wins (a conflict resolution policy).

---

## Building blocks

1. Cache app + GET responses → **Angular PWA / Service Worker**
2. Queue mutations (POST / PATCH / DELETE) → **HTTP interceptor + IndexedDB**
3. Replay queue → **`online` event** (and Background Sync where supported)
4. UI signals → banner + badge + toasts
5. Idempotency on the backend → each queued write carries a client UUID

---

## 1. Cache app + reads (Service Worker)

- `ng add @angular/pwa`
- Generates `ngsw-config.json` (cache rules)
- `assetGroups` → cache the SPA shell (HTML / JS / CSS / images)
- `dataGroups` → cache safe GET endpoints (e.g. departments, specializations, dashboards summaries)
- Result → app loads offline, previously-fetched lists/details viewable

## 2. Queue writes (interceptor + IndexedDB)

- New `OfflineQueueInterceptor` chained AFTER `authInterceptor`
- On POST / PATCH / DELETE → check `navigator.onLine`
- If offline:
  - Save `{ id, url, method, headers, body, createdAt }` to IndexedDB
  - Return a synthetic 202-style response: `{ queued: true, id }`
  - Show toast: "No connection. Will submit when you're back online."
- If online → pass through normally
- Use `idb` or `localForage` for IndexedDB

## 3. Replay queue (online event)

- `window.addEventListener('online', replay)`
- `replay()` → read all queued items in order → re-send via plain HttpClient
- On success → remove from IndexedDB → update UI badge
- On failure → keep in queue, retry later (exponential backoff)
- (Optional) Register Background Sync in the Service Worker → fires even if the tab is closed (Chrome / Edge only)

## 4. UI signals

- Top banner when `navigator.onLine === false` → "You are offline. Changes will sync when back."
- Badge in the topbar → "N pending"
- Per-row optimistic update → list shows the change immediately (with "pending" tag) so the user sees progress

## 5. Idempotency + conflict rules

- Frontend → assign a `clientRequestId` (UUID) to every queued mutation
- Backend Lambdas → dedupe by `clientRequestId` (store recent IDs for 24h)
- On replay 409 or 422 → drop from queue, show "Could not sync (already applied)"
- Conflict policy when offline-edited data is newer than server → simple last-write-wins for v1

---

## What NOT to cache

- Cognito callback `https://www.akwadona.com/?code=…&state=…` → never cache
- Auth tokens → never put tokens in IndexedDB
- Highly sensitive PHI → mark those routes `no-store` in `ngsw-config.json`
- Audit log routes → always fetch fresh

## Auth considerations

- Token can expire while offline → on replay, a 401 will fire → existing interceptor triggers re-login + `returnUrl`
- Don't store the token with the queued request → use the live token at replay time

---

## Suggested project layout

```
src/app/
├── services/
│   ├── offline.service.ts       # online status + queue + replay
│   └── offline-db.ts            # IndexedDB wrapper (idb)
├── interceptors/
│   └── offline-queue.interceptor.ts
├── components/
│   └── offline-banner/          # banner + pending badge
└── …
public/
└── ngsw-config.json             # service worker cache rules
```

`app.config.ts` additions:
- `provideServiceWorker('ngsw-worker.js', { enabled: production })`
- Add `OfflineQueueInterceptor` to the interceptor chain

---

## Backend changes needed

- Every mutating Lambda accepts an optional `clientRequestId` body field
- Store recent `clientRequestId`s in the `Hospital` table for ~24h (TTL via `expiresAt`)
- If a request comes in with a known `clientRequestId` → return the original result (no double-write)

---

## Full offline scenario (everything, incl. consultations)

Goal → every action works offline: create / edit / cancel appointments, file consultations end-to-end with prescriptions and lab orders, manage invoices, etc. Sync happens automatically when the connection returns.

### Local-first data model (IndexedDB)

- IndexedDB is the device's source of truth while offline (via `idb`).
- One object store per collection → `patients`, `doctors`, `appointments`, `consultations`, `payments`, `dispenses`, `pendingMutations`.
- Every row carries:
  - `id` → client-side **UUID** (used until the server assigns its own)
  - `serverId` → filled after sync confirms
  - `_status` → `synced` / `pending` / `failed`
  - `_op` → `create` / `update` / `delete`
  - `_updatedAt` → local timestamp
  - `clientRequestId` → **UUID** per mutation (used by backend for idempotency)

### Read path

- Every screen reads from IndexedDB first → instant render
- If online → also refresh from API in the background → update IndexedDB → screen reactively updates
- If offline → user sees the IndexedDB snapshot as-is

### Write path (optimistic)

1. Service writes to IndexedDB immediately
2. A `pendingMutations` row is appended → `{ url, method, body, headers, clientRequestId, ref: localId }`
3. If online → fire the HTTP call now → on success mark `synced`, store `serverId`
4. If offline → leave `pending` → on `online` event the queue replays

### Consultations end-to-end (the hardest case)

1. Doctor checks in an appointment (offline allowed) → updates appointment row + queues PATCH
2. Doctor clicks **Start Consultation** offline:
   - Locally `consultationId = UUID`
   - Insert `consultations` row (`_status: pending`, `_op: create`)
   - Queue `POST /examinations` with `appointmentId` + `clientRequestId`
3. Doctor fills each section (Chief Complaint, Vitals, …) → each save:
   - Update the same consultation row
   - Append `PATCH /examinations/{localId}` mutation
4. Doctor adds prescriptions / lab orders / radiology / referrals:
   - Stored as nested arrays on the consultation row (no separate FK store needed)
5. Doctor clicks **Close Consultation** → queue `POST /examinations/{localId}/signoff`
6. Browser reconnects → replay runs in order:
   - POST `/examinations` → server returns the real `examId`
   - **FK rewrite** → scan remaining queue → swap any `localId` references with `examId`
   - PATCHes apply → signoff applies → appointment auto-completes via the existing backend hook

### FK rewrite step (critical)

- A queued create returns a server ID → the queue may contain follow-ups that referenced the local UUID
- Walk the rest of the queue → replace `localId` with `serverId` in URLs and bodies
- Same trick for offline-created patients, doctors, invoices, appointments

### Conflict handling

- Replay 409 / 412 / 422 → mark the row `failed`, surface a toast: *"Couldn't sync X — newer version on server."*
- v1 → **LWW** (last-write-wins) with a "View server version" link
- v2 → optional merge dialog (Subjective/Objective fields side-by-side)
- Server is authoritative — local can never overwrite a `cancelled` or signed-off record (the backend guards already enforce this)

### Auth while offline

- Access JWT (1h) lives in sessionStorage; refresh token (30d) in OIDC storage
- Cannot refresh while offline → on replay a 401 fires → normal re-login flow (`returnUrl` + the queue both survive in localStorage)
- Never put tokens in IndexedDB

### Edge cases

- Browser closed offline → IndexedDB persists → next open replays
- User clears site data → queue is wiped → warn before destructive actions
- Two devices edit the same record while offline → second to replay loses (LWW) → flag for clinical review
- **S3 uploads (e.g. dispense override doc)** → cannot queue blindly:
  - Allow the form offline
  - Block only the file-upload step until online (no presigned PUT without network)
  - Surface: *"1 step pending: upload doctor-approved document"*

### PHI / compliance considerations

- IndexedDB on the device contains PHI → handle with care:
  - Recommend OS-level disk encryption + per-user OS login
  - On logout → wipe IndexedDB (`OfflineService.clear()`)
  - On role change → wipe and re-sync
  - Cap cached patient data by *touched-recently* (don't cache the whole hospital)
- `ngsw-config.json` → mark audit + admin routes `no-store`
- All compliance controls (PDPPL Art. 9, MOPH audit) still apply to data once it syncs

---

## Out of scope (deferred)

- Merge UI for non-trivial clinical conflicts → v2
- Voice scribe offline → recording needs streaming → out
- Bedrock SOAP generation offline → online-only
- Background Sync on Safari / Firefox → falls back to `online` event

## Suggested phasing

1. **Phase A** → Service Worker + cache the SPA shell (offline read-only)
2. **Phase B** → cache safe GET endpoints (lists viewable offline)
3. **Phase C** → offline queue + replay for simple mutations
4. **Phase D** → backend idempotency by `clientRequestId` + conflict messages
5. **Phase E** → richer UX (per-row "pending" indicators, optimistic updates)
6. **Phase F** → full-feature offline (consultations + nested entities + FK rewrite + conflict UI)

---

## Document control

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-05-26 | Initial design — proposed offline mode strategy |

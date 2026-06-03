# Offline Mode — Full Reference

**Status:** Implemented (Phases A–F).
**Goal:** Doctors / staff can keep working when the network drops — read previously-fetched data, create / edit / cancel records, and have everything sync automatically when the network returns.

---

## 1. What the user sees

- App keeps loading + browsing already-fetched data while offline.
- Trying to save / update / cancel / delete → toast: **"Saved offline — will sync when connection is back."**
- A topbar pill shows current state — **"Offline"** (red) or **"Syncing"** (amber) — with a badge showing pending mutation count.
- When network returns → queued requests replay in order → toast: **"Synced N pending action(s)."**

---

## 2. Glossary (abbreviations)

| Abbr | Meaning |
| --- | --- |
| PWA | Progressive Web App — installable, offline-capable web app |
| SW | Service Worker — browser background script that intercepts network requests and serves cache |
| ngsw | Angular's official Service Worker (`@angular/service-worker`), configured via `ngsw-config.json` |
| IDB | IndexedDB — browser-side per-origin database, used for the mutation queue and temp-id map |
| idb | npm wrapper for IndexedDB — **not used here** (we use raw IDB API to avoid the dependency) |
| Cache API | Browser caches managed by the SW (separate from IndexedDB) |
| Idempotency | Property that running the same request twice has the same effect as running it once |
| FK | Foreign Key — a field that points to another record (e.g. `appointmentId` in an examination) |
| temp id | Client-side placeholder id (`temp_<uuid>`) used for entities created while offline; replaced on replay |
| CID | `X-Client-Request-Id` HTTP header — unique per mutation, used for backend idempotency dedup |
| TTL | Time-to-live — DynamoDB attribute that auto-deletes the row after the timestamp |
| OIDC | OpenID Connect — auth protocol used with Cognito |
| JWT | JSON Web Token — Cognito access token format |
| LWW | Last-Write-Wins — chosen conflict policy for offline-edited rows |
| PHI | Protected Health Information |

---

## 3. Architecture (end-to-end)

```
   ┌──────────────┐   GET /…   ┌──────────────────────────┐
   │  Component   │ ─────────► │ Service Worker (ngsw)    │
   │              │ ◄───────── │  Cache: app shell + APIs │
   └──────┬───────┘   200 from └──────────────────────────┘
          │           cache when offline
          │
          │ POST/PATCH/DELETE
          ▼
   ┌──────────────────────────────────┐
   │ offline-queue.interceptor (TS)   │
   │  - adds X-Client-Request-Id      │
   │  - if offline:                   │
   │      stamps _tempId on POSTs     │
   │      enqueues to IndexedDB       │
   │      returns synthetic 202       │
   └──────────────┬───────────────────┘
                  │
                  ▼
   ┌──────────────────────────────────┐
   │ IndexedDB (tiryaq-offline)       │
   │   pendingMutations               │
   │   tempIdMap (Phase F)            │
   └──────────────┬───────────────────┘
                  │ window 'online' event
                  ▼
   ┌──────────────────────────────────┐
   │ OfflineService.replay()          │
   │  - rewrite temp_* in URL + body  │
   │  - send each queued mutation     │
   │  - extract real id from response │
   │  - drop on 4xx / break on 5xx    │
   └──────────────┬───────────────────┘
                  │
                  ▼
   ┌──────────────────────────────────┐
   │ Backend Lambdas                  │
   │  - read X-Client-Request-Id      │
   │  - check IDEMP#<cid> in DynamoDB │
   │  - if cached → return cached     │
   │  - else do work + cache (24h)    │
   └──────────────────────────────────┘
```

---

## 4. Phases — what was built

### Phase A — PWA shell (the page itself works offline)

- `npm install @angular/service-worker@20.0.6 --save-exact`
- `app.config.ts` registers the SW: `provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000' })`
- `ngsw-config.json` `assetGroups`:
  - `app` (prefetch HTML/JS/CSS)
  - `fonts-icons` (prefetch `**/*.{ttf,woff,woff2,eot}` — PrimeIcons offline)
  - `images` (lazy)
- `navigationUrls` allow the SPA to fall back to `/index.html` for any non-asset URL.

### Phase B — Cache GET responses

- `ngsw-config.json` `dataGroups`:
  ```json
  {
    "name": "api-reads",
    "urls": ["https://jxz59jh15f.execute-api.us-east-1.amazonaws.com/**"],
    "cacheConfig": { "maxSize": 500, "maxAge": "1d", "timeout": "3s", "strategy": "freshness" }
  }
  ```
- Freshness strategy: SW races network for 3 s; serves cache on timeout / offline.
- One catch-all rule prevents glob mismatches against query-string variants.

### Phase C — Queue mutations + replay

- `src/app/services/offline-db.ts` — raw IndexedDB wrapper.
  - Stores: `pendingMutations`, `tempIdMap`.
- `src/app/interceptors/offline-queue.interceptor.ts`:
  - Adds `X-Client-Request-Id: <uuid>` to every mutating API request.
  - If `!navigator.onLine`: enqueue to IDB, return synthetic 202 with body echoed, toast "Saved offline".
- `src/app/services/offline.service.ts`:
  - Subscribes to `window.online` event.
  - Loads queue, sends in `createdAt` order with the current access token.
  - Drops a row on 400/404/409/422 (already applied or invalid).
  - Stops on 0/401/5xx (will retry on next online event).
- `helpers-service.ts` suppresses duplicate "Created/Updated" toasts via `wasOfflineEnqueueRecent()` when an offline enqueue just fired.

### Phase D — Backend idempotency

Every mutating Lambda reads `X-Client-Request-Id` and stores a 24h idempotency cache row in DynamoDB:

```
PK = IDEMP#<cid>
SK = PROFILE
EntityType = IDEMPOTENCY
response = <JSON of the response that was returned>
expiresAt = <epoch + 86400>     (table TTL deletes the row after 24h)
```

Pattern at the top of each route handler:
```js
const cid = getClientRequestId(event);
const cached = await checkIdempotency(cid);
if (cached) return cached;
// … do work …
const response = res(/* … */);
await storeIdempotency(cid, response);
return response;
```

Applied to **every mutating Lambda in the app**:
- `tiryaq-appointments` — POST / PATCH / DELETE
- `tiryaq-examinations` — POST create / PATCH section / POST signoff / DELETE
- `tiryaq-pharmacy` — medications, inventory, dispense, purchase orders
- `tiryaq-calendar` — calendars + events
- `tiryaq-admin-panel` — disable / enable / set-password
- `tiryaq-document-manager` — upload-url, delete
- `createPatient` / `updatePatient` / `deletePatient`
- `createDoctor` / `updateDoctor` / `deleteDoctor`
- `createPatientPayment` / `updatePatientPayment` / `deletePayment`
- `createNewDepartment` / `bulkCreateDepartments` / `deleteAllDepartments`
- `createNewSpecialization` / `bulkCreateSpecializations` / `deleteAllSpecializations`

### Phase E — UI signals (offline + pending count)

- `src/app/layout/components/app.topbar.ts`:
  - Subscribes to `OfflineService.pendingCount$` (BehaviorSubject driven by `offlineDb.count()`).
  - Listens to `window.online` / `window.offline`.
  - Renders an offline / sync pill in the topbar actions, with a count badge when items are queued.

### Phase F — Full offline consultations + FK rewrite

- `offline-db.ts` v2 schema upgrade — new `tempIdMap` IDB store.
- `tempId()` / `isTempId()` helpers — generate `temp_<uuid>` placeholders.
- `offline-queue.interceptor.ts` — on offline POSTs, stamps `_tempId` into the body and echoes it back under common id keys (`examinationId`, `appointmentId`, …) so the UI can keep navigating.
- `offline.service.ts` `replay()`:
  - Loads `tempIdMap` from IDB.
  - Before sending each queued request, rewrites every `temp_<uuid>` occurrence in URL and body with the real server id (if known).
  - Strips `_tempId` from create bodies.
  - After a successful create, scans the response for the first real id key (e.g. `examinationId`) and saves the mapping `temp_xxx → real-yyy` to IDB.
  - If the queued request still references an unresolved temp id, replay halts so the next round (after later creates resolve) can continue.

This enables a full offline consultation flow:

```
offline:
  POST   /appointments                       → temp_aaa
  POST   /examinations  {appointmentId:aaa}  → temp_bbb
  PATCH  /examinations/temp_bbb/sections
  POST   /examinations/temp_bbb/signoff
  PATCH  /appointments/temp_aaa  status=completed

reconnect → replay:
  POST   /appointments       → real-AAA   (mapping aaa→AAA stored)
  POST   /examinations       → real-BBB   (mapping bbb→BBB stored)
  PATCH  /examinations/real-BBB/sections
  POST   /examinations/real-BBB/signoff
  PATCH  /appointments/real-AAA  status=completed
```

---

## 5. Files of interest

```
src/app/services/offline-db.ts                — raw IndexedDB wrapper, tempId helpers
src/app/services/offline.service.ts           — queue + replay + temp-id rewriting
src/app/interceptors/offline-queue.interceptor.ts — HTTP intercept, enqueue, temp-id stamp
src/app/services/helpers-service.ts           — toast coordination (skip duplicates)
src/app/layout/components/app.topbar.ts       — Phase E offline/sync pill + badge
src/app/guards/auth.guard.ts                  — single-shot checkAuth, returnUrl in localStorage
src/app.component.ts                          — NavigationEnd fallback for returnUrl
ngsw-config.json                              — assetGroups + dataGroups
src/app.config.ts                             — provideServiceWorker + interceptor wiring

tiryaq-cdk/lambda/*/index.js                  — every mutating Lambda has Phase D idempotency
docs/offline-mode.md                          — this file
```

---

## 6. Testing — Phase D + offline end-to-end

### 6.1 Phase D idempotency (one-shot dedupe at the API)

1. Open DevTools → Network → **online**.
2. Pick a module — e.g. Appointments → New Appointment → fill form.
3. In Network tab, **right-click** the resulting `POST /appointments` request → Copy as fetch.
4. Paste into the Console and run it again — verify response is **identical** (same `appointmentId`, same body). The 2nd call hit the idempotency cache.
5. In DynamoDB Studio (Hospital table) filter `EntityType = IDEMPOTENCY` — confirm the `IDEMP#<cid>` row exists with `expiresAt` ≈ now + 24h.

### 6.2 Phase C / E offline → replay

1. DevTools → Network → **Offline** (throttle).
2. Confirm the topbar pill flips to red **"Offline"**.
3. Create a new appointment → toast: **"Saved offline — will sync when connection is back."**
4. Pill goes amber **"Syncing"** with a **badge: 1**.
5. Repeat for 2–3 more mutations → badge climbs.
6. Network → **Online** (or **No throttling**).
7. Within a second:
   - Toast: **"Synced N pending action(s)."**
   - Pill disappears.
   - Refresh the page → all the offline-created rows are now real in the table.

### 6.3 Phase F full offline consultation

1. Pre-cache: visit Patients → open patient profile, visit Appointments page (so SW caches the relevant GETs).
2. Go **Offline**.
3. Patient profile → **Start consultation** offline. UI keeps working — `examinationId` shows as `temp_…` in the URL.
4. Fill SOAP sections (PATCH each — all queued).
5. **Sign off** the consultation (POST signoff — queued).
6. Go **Online**.
7. Watch the badge drop to 0. Refresh.
8. Open the patient's consultation list — the just-finished consultation is present with a **real** id, all sections saved, status = signed-off, and the linked appointment is **completed**.

### 6.4 Negative tests

- Offline → save → **Ctrl+F5 (hard refresh)** while still offline → page may show offline (expected — bypasses SW). Plain F5 works.
- Replay double-fires (e.g. flap online/offline) → backend idempotency returns the cached response, no duplicate rows.

---

## 7. Known constraints (and what's deferred)

- Hard refresh (Ctrl+F5) bypasses the SW — browser behaviour, not a bug.
- File uploads (S3 PUT via presigned URL) are **not** queued — they require a live network.
- Conflict policy is **Last-Write-Wins** at the DynamoDB row level; no merge UI.
- Cross-tab queue: each tab opens its own IDB connection but writes to the same DB, so a second tab will see queued items.
- Background Sync API not used — replay is bound to the `online` event in the open tab. Closing all tabs while offline pauses replay until a tab is reopened.

---

## 8. Operational notes

- Bumping `DB_VERSION` in `offline-db.ts` triggers an `onupgradeneeded` for users with an existing offline DB — only additive changes are safe.
- The `tiryaq-offline` DB is per-origin — clearing site data wipes the queue.
- Idempotency rows live in the main `Hospital` table under `PK = IDEMP#<cid>` with the table's TTL attribute `expiresAt`. No separate table needed.

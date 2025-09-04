# TableDemo Component — Production Guide

**Owner:** Web Client Team  
**Status:** Production-ready  
**Last Updated:** 2025-09-04 13:53 UTC

---

## 1) Purpose

`TableDemo` is the **container** component that orchestrates patient list discovery and management.
It binds a presentational table (`GenericTableComponent`) to the backend, translates UI events into
query parameters, and guarantees consistent data loading under pagination, sorting, and filtering.

This document covers **only** `TableDemo`—its responsibilities, inputs/outputs, control flow,
operational behaviors, and integration notes.

---

## 2) Responsibilities

- Manage state for **pagination**, **sorting**, **table filters**, and **quick filters** (Status & Gender).
- Normalize PrimeNG lazy events into a stable query model.
- Apply **request sequencing** so only the latest HTTP response updates the UI.
- Provide row **edit** (save/cancel), **bulk delete**, **CSV export**, and **import** hooks.
- Keep the view responsive and predictable when clearing filters or changing pages/sorts.

> Business logic is intentionally centralized here; `GenericTableComponent` remains a lean view.

---

## 3) Key Behaviors

### 3.1 Pagination & Sorting
- PrimeNG emits `onLazyLoad` → handled by `loadPatients(e)`.
- `pageSize`, `first`, `sortField`, `sortOrder` are read from `e` and mapped to the request.
- **Hybrid pagination:**  
  - When `lastKey` is present → use it (cursor mode).  
  - When absent → send `offset` (fallback for page jumps).
- Changing `pageSize` or sort resets the cursor via `reset()`.

### 3.2 Filters
- **Table filters**: parsed from `e.filters` inside `applyFilters()`.  
  - Global filter → `search`  
  - Field filters → `{ value, matchMode, operator }`, serialized later by the service.
- **Quick filters**:
  - **Status**:  
    - `active` → `status.notEquals = "dead,discharged"`  
    - `nonactive` → `status.equals = "dead,discharged"`
  - **Gender**: `gender.equals = "male" | "female"`.
- Clearing is unified via `onClearAll()` which resets:
  - `activeQuickFilterId = null`, `activeGender = null`
  - pagination (`reset()`), and `filters = { pageSize, lastKey:null, offset:0 }`  
  - The table then re-emits `onLazyLoad`, which rebuilds fresh parameters.

### 3.3 Request Sequencing (Race-safety)
- `reqSeq` increments for each `fetch()`.
- Only the response whose sequence matches the latest `reqSeq` is allowed to mutate `patients`/`totalRecords`.
- This prevents out-of-order UI updates during rapid user interactions.

---

## 4) Public Surface (Inputs/Outputs)

### Inputs wired into the view
- `patientColumns`, `tableConfig`, `toolbarConfig` — define structure & UX.
- `customTemplates` → status/gender tag rendering.
- `quickFilters`, `activeQuickFilterId`, `activeGender` → high-level filter shortcuts.
- `visibleColumnFields` → column visibility state (two-way via `columnsVisibilityChange`).

### Outputs handled by the component
- `lazyLoad` → `loadPatients(e)` (core data pipeline).
- Row edit: `rowEditInit`, `rowEditSave`, `rowEditCancel`.
- Toolbar: `newClick`, `deleteClick`, `importUpload`, `exportClick`.
- Selection: `selectionChange`.
- **Custom**: `clearAll` → bound to `onClearAll()` to also clear quick filters.

---

## 5) Core Methods

### `loadPatients(e: any)`
- Normalizes page size & sort, resets when needed.
- Computes `page`, `lastKey`, and decides when to send `offset`.
- Calls `applyFilters()` for table-sourced filters.
- Purges stale quick-filter params, re-applies the current **Status** and **Gender** quick filters.
- Triggers `fetch()`.

### `applyFilters(obj: Record<string, any>)`
- Translates PrimeNG filter model to a stable `GetPatientsPageOpts` structure:
  - Date coercion → `YYYY-MM-DD`.
  - Skips blank values.
  - Maps global filter to `search`.

### `applyQuickFilters()`
- Idempotently sets / deletes:
  - `status.notEquals`, `status.equals`
  - `gender.equals`

### `fetch()`
- Increments `reqSeq`.
- Calls `PatientsService.getPatientsPage(filters)`.
- Commits response iff `seq === reqSeq`.
- Maintains the `pageKeys` array for cursor-based navigation.

### `reset()`
- Resets `page`, `lastKey`, `pageKeys`, and clears row selection.

---

## 6) UX Details

- **Status chips** (`getStatusSeverity`) and **Gender chips** (`getGenderSeverity`) provide consistent severity mapping.
- **CSV export** delegates to the table to preserve current columns and display pipes.
- **Import** workflow batches requests, confirms with user, and provides success/error summaries.
- **Delete selection** confirms and executes in parallel; errors are summarized.

---

## 7) Data Model (excerpt used by the view)

```ts
type Patient = {
  PK: string;
  name: string;
  gender?: string;
  insurance?: string;
  dob?: string;
  timestamp?: string | number;
  status?: string;
};
```

---

## 8) Error Handling & Resilience

- Network errors → leave UI stable, clear data, show `totalRecords = 0`.
- Sequencing guard prevents stale data flashes.
- Import/create/update paths surface toast notifications via `Helpers`.

---

## 9) Performance Notes

- **Max 3× pageSize** server fetch per page in backend; frontend keeps request volume minimal.
- `reqSeq` avoids redundant DOM work from late responses.
- Column visibility and templates are memoized by Angular via straightforward bindings.

---

## 10) Integration & Usage

1. Declare `TableDemo` as a **standalone** component in a route or parent shell.
2. Provide `PatientsService`, `ConfirmationService`, `DialogService`, `MessageService`, `Helpers`.
3. Ensure JWT is set in `sessionStorage.accessToken` for authenticated calls.
4. Hook global styles for PrimeNG and ensure `TagModule`, `ConfirmDialogModule` CSS are bundled.

**Example (template):**
```html
<app-table-demo></app-table-demo>
```

---

## 11) Operational Checklists

**Pre-release**
- [ ] Pagination works with page jumps (offset without lastKey).
- [ ] Sorting resets pagination and returns valid first page.
- [ ] Quick filters (Status/Gender) + table filters combine correctly.
- [ ] Clear button resets both table and quick filters in one action.
- [ ] Race tests: trigger rapid sort + filter changes; UI remains consistent.

**Monitoring**
- [ ] Capture 4xx/5xx rates for `/patients`.
- [ ] Surface slow scans in logs; track average page latency.

---

## 12) Troubleshooting

- **Clear button requires two clicks:**  
  Ensure `onClearAll()` resets quick filters **and** does **not** call `fetch()` directly;
  `p-table.clear()` triggers a fresh `onLazyLoad` which calls `loadPatients()`.

- **Filters appear in URL after clearing:**  
  Verify `loadPatients()` deletes `status.*` and `gender.equals` before re-applying current quick filters.

- **Out-of-order results:**  
  Confirm `reqSeq` is incremented in `fetch()` and compared inside subscription callbacks.

---

## 13) Future Enhancements (Non-blocking)

- Persist column visibility and quick filter state in localStorage.
- Add empty-state guided actions (create first patient).
- Server-side indexes to reduce scan cost for common filters.

---

*End of document.*

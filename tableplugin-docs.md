# GenericTableComponent (PrimeNG v20) — Documentation

A lightweight wrapper around `p-table` that adds:
- Global search, column picker, quick filters, CSV export.
- Row or cell edit with save/cancel events.
- Toolbar and caption slots for custom buttons.
- Public API to control the table from the parent.

## Install and import

```ts
// app.module.ts not needed; component is standalone.
// Parent component template uses:
import { GenericTableComponent } from './tableplugin';
```

## Minimal usage

```html
<app-generic-table
  [columns]="cols"
  [data]="rows"
  [totalRecords]="total"
  [loading]="loading"
  [isLazy]="true"
  [config]="{ title: 'Patients', showToolbar: true, showGlobalSearch: true, showColumnPicker: true, editType: 'row', selectable: true, selectionMode: 'multiple' }"
  [filterControls]="quickFilters"
  [activeFilters]="activeFilters"
  (filterControlChange)="onFilterChange($event)"
  (lazyLoad)="load($event)"
  (rowEditSave)="onRowEditSave($event)"
  (selectionChange)="onSelectionChange($event)">
</app-generic-table>
```

```ts
cols = [
  { field: 'name', header: 'Name', filterable: true, sortable: true, editable: true },
  { field: 'gender', header: 'Gender', filterable: true, sortable: true, editable: true, editorType: 'autocomplete', editorOptions: [
    { label: 'Male', value: 'M' }, { label: 'Female', value: 'F' }
  ]},
  { field: 'dob', header: 'DOB', type: 'date', pipe: 'date', dateFormat: 'MM/dd/yyyy', editable: true, editorType: 'date' },
  { field: 'insurance', header: 'Insurance', filterable: true, sortable: true }
];
```

---

## 1) Quick filters (buttons)

**Goal:** render small buttons above the table that toggle or cycle filter values. The component renders them when you pass `filterControls` and `activeFilters`. When a user clicks a control it emits `(filterControlChange)` with `{ id, value }`.

### Define controls

```ts
quickFilters = [
  // Toggle: On/Off
  { id: 'onlyFemales', type: 'toggle', label: 'Female', icon: 'pi pi-user', severityOn: 'success', severityOff: 'secondary' },

  // Cycle: iterate through array values on each click
  { id: 'status', type: 'cycle', label: 'Status', values: [null, 'active', 'inactive', 'discharged'], getIcon: (v) => v ? 'pi pi-filter' : 'pi pi-filter-slash' },

  // Button: fire-and-forget true
  { id: 'resetFilters', type: 'button', label: 'Reset', icon: 'pi pi-refresh', outlined: true }
];

activeFilters: Record<string, any> = { onlyFemales: null, status: null };
```

### Handle changes and reload

```ts
onFilterChange(ev: { id: string; value: any }) {
  if (ev.id === 'resetFilters') {
    this.activeFilters = { onlyFemales: null, status: null };
  } else {
    this.activeFilters = { ...this.activeFilters, [ev.id]: ev.value };
  }
  // Re-query your backend using activeFilters as query params
  this.load({ first: 0, rows: 15 });
}
```

**Notes**
- `type: 'toggle'` sets `true`/`null` automatically.
- `type: 'cycle'` requires `values`. `null` means not applied.
- The component does not filter your data by itself. Use `activeFilters` in your service call.

---

## 2) Buttons above and below the table

### A) Buttons above the table (toolbar or caption)

Use the provided slots:
- `toolbarStart` and `toolbarEnd` → inside `<p-toolbar>` above the table.
- `captionStart` and `captionEnd` → inside the table caption area next to search.

#### Example: “New Patient” in header

```html
<ng-template #toolbarStartTpl let-api="api" let-selected="selected">
  <button pButton label="New Patient" icon="pi pi-plus" (click)="openNewPatient()"></button>
  <button pButton class="p-button-outlined" icon="pi pi-download" label="Export" (click)="api.exportCSV()"></button>
</ng-template>

<app-generic-table
  [columns]="cols"
  [data]="rows"
  [config]="{ title: 'Patients', showToolbar: true }"
  [toolbarStart]="toolbarStartTpl">
</app-generic-table>
```

### B) Button below the table

The component does not have a footer slot, so place your button right after the component and wire it to the instance via a template reference:

```html
<app-generic-table
  #tbl
  [columns]="cols"
  [data]="rows"
  [config]="{ title: 'Patients', showToolbar: true, selectable: true, selectionMode: 'multiple' }"
  (selectionChange)="selected = $event">
</app-generic-table>

<!-- Below the table -->
<div class="mt-3 flex gap-2">
  <button pButton label="Save" icon="pi pi-check" (click)="savePatients(tbl.publicApi.getSelected())"></button>
  <button pButton class="p-button-outlined" label="Clear" icon="pi pi-filter-slash" (click)="tbl.publicApi.clear()"></button>
</div>
```

```ts
selected: any[] = [];
savePatients(list: any[]) { /* send to backend */ }
```

**Alternative:** Put the “Save” button inside `captionEnd` so it sticks to the top-right.

---

## 3) “Select Columns” using `p-autocomplete`

The component already ships a built-in column picker popover. If you prefer an **autocomplete-based** selector, render it in a slot and call `publicApi.setVisibleColumns(fields)`.

### Example: multi-select with `p-autocomplete` in the caption

```html
<ng-template #captionEndTpl let-api="api">
  <p-autocomplete
    [multiple]="true"
    [dropdown]="true"
    [optionLabel]="'header'"
    [suggestions]="colSuggest"
    (completeMethod)="filterCols($event.query)"
    [(ngModel)]="selectedCols"
    (onSelect)="applyCols(api)"
    (onUnselect)="applyCols(api)"
    placeholder="Select columns"
    style="min-width: 22rem">
    <ng-template let-opt pTemplate="item">
      <div class="flex items-center gap-2">
        <i class="pi pi-columns"></i> <span>{{ opt.header }}</span>
      </div>
    </ng-template>
    <ng-template let-opt pTemplate="chip">
      {{ opt.header }}
    </ng-template>
  </p-autocomplete>
</ng-template>

<app-generic-table
  #tbl
  [columns]="cols"
  [data]="rows"
  [captionEnd]="captionEndTpl"
  (columnsVisibilityChange)="onVisibleChanged($event)">
</app-generic-table>
```

```ts
// Build once from your columns
allColOpts = this.cols.map(c => ({ header: c.header ?? c.field, field: c.field }));
selectedCols = this.allColOpts.slice(); // start with all visible
colSuggest = this.allColOpts.slice();

filterCols(q: string) {
  const s = (q || '').toLowerCase();
  this.colSuggest = this.allColOpts.filter(o => !s || o.header.toLowerCase().includes(s) || o.field.toLowerCase().includes(s));
}

applyCols(api: any) {
  const fields = this.selectedCols.map(o => o.field);
  api.setVisibleColumns(fields);
}

onVisibleChanged(fields: string[]) {
  // Optional: sync selection if user used the built-in picker too
  this.selectedCols = this.allColOpts.filter(o => fields.includes(o.field));
}
```

**Notes**
- Use `[(ngModel)]="selectedCols"` to hold selected items.
- `api.setVisibleColumns(fields)` enforces visibility and emits `columnsVisibilityChange`.
- To start with one column at minimum, configure the child with `[requireAtLeastOneColumn]="true"` (default).

---

## Row Edit in parent (logic lives outside the plugin)

```html
<app-generic-table
  [columns]="cols"
  [data]="rows"
  [config]="{ editType: 'row' }"
  (rowEditSave)="onRowEditSave($event)">
</app-generic-table>
```

```ts
onRowEditSave(ev: { data: any; index?: number }) {
  // Persist to backend
  this.patients.update(ev.data).subscribe(() => this.toast.add({ severity: 'success', summary: 'Saved' }));
}
```

---

## Public API surface

Available via `#tbl` → `tbl.publicApi` or inside slot templates as `let-api="api"`:

- `clear()`
- `exportCSV(opts?)`
- `table(): Table` (PrimeNG instance)
- `getSelected(): any[]`
- `setVisibleColumns(fields: string[])`
- `beginRowEdit(row, index?)`
- `saveRowEdit(row, index?)`
- `cancelRowEdit(row, index?)`

---

## Events

- `lazyLoad: $event` → pass to your data service.
- `rowEditInit|Save|Cancel: { data, index }`
- `selectionChange: any[]`
- `columnsVisibilityChange: string[]`
- `filterControlChange: { id, value }`
- `clearAll: void`

---

## Tips

- Use `isLazy=true` and always query by `first`, `rows`, sorting, search, and your `activeFilters`.
- For custom cells, pass `customTemplates` as `{ [field]: TemplateRef }` and set `customTemplate: true` in the column.
- For date editors the component caches parsed `Date` per-row for performance.

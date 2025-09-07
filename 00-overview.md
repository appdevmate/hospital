# GenericTableComponent — Overview

This component wraps PrimeNG `p-table` and exposes a clean API and slots.

## Features
- Lazy loading, paginator, global search.
- Quick Filters bar.
- Column picker and custom "Select Columns" via API.
- Row or cell editing with save/cancel events.
- Slots for toolbar and caption to place buttons.
- CSV export and selection helpers.

## Install
```ts
// Standalone usage
import { GenericTableComponent } from './tableplugin';
```

## Minimal Parent
```ts
// table-demo.component.ts
cols: TableColumn[] = [
  { field: 'name', header: 'Name', filterable: true, sortable: true, editable: true },
  { field: 'gender', header: 'Gender', filterable: true, sortable: true },
  { field: 'dob', header: 'DOB', pipe: 'date', dateFormat: 'MM/dd/yyyy' }
];
rows = [];
total = 0;
loading = false;
config: TableConfig = { title: 'Patients', showToolbar: true, showGlobalSearch: true, showColumnPicker: true, editType: 'row', selectable: true, selectionMode: 'multiple' };

load(e: any) { /* fetch data using e.first, e.rows, sort info, and your active filters */ }
onRowEditSave(ev: RowEditEvent<any>) { /* persist ev.data */ }
```

```html
<!-- table-demo.component.html -->
<app-generic-table
  [columns]="cols"
  [data]="rows"
  [totalRecords]="total"
  [loading]="loading"
  [isLazy]="true"
  [config]="config"
  (lazyLoad)="load($event)"
  (rowEditSave)="onRowEditSave($event)">
</app-generic-table>
```

## Data Flow
1. Parent sets `columns`, `data`, `config`.
2. When `isLazy=true`, the table emits `(lazyLoad)`. Parent loads rows and updates `data` and `totalRecords`.
3. Edits emit `rowEditInit|Save|Cancel`. Parent persists.
4. Column visibility changes emit `(columnsVisibilityChange)` so parent can sync.
5. Quick Filters clicks emit `(filterControlChange)`; parent updates `activeFilters` and reloads.

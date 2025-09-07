# Module: Header Buttons

Place buttons above the table using slots. Two areas:
- `toolbarStart` and `toolbarEnd` inside a `<p-toolbar>` bar.
- `captionStart` and `captionEnd` inside the table caption area next to global search.

## Minimal: New Patient + Export

```html
<ng-template #toolbarStartTpl let-api="api" let-selected="selected">
  <button pButton label="New Patient" icon="pi pi-plus" (click)="openNewPatient()"></button>
  <button pButton class="p-button-outlined" label="Export" icon="pi pi-download" (click)="api.exportCSV()"></button>
</ng-template>

<app-generic-table
  [columns]="cols"
  [data]="rows"
  [config]="{ title: 'Patients', showToolbar: true, showGlobalSearch: true }"
  [toolbarStart]="toolbarStartTpl">
</app-generic-table>
```

## With captionEnd actions

```html
<ng-template #captionEndTpl let-api="api" let-selected="selected">
  <button pButton label="Bulk Save" icon="pi pi-check" (click)="save(selected)"></button>
</ng-template>

<app-generic-table
  [columns]="cols"
  [data]="rows"
  [captionEnd]="captionEndTpl"
  (selectionChange)="selected=$event">
</app-generic-table>
```

## Flow

1. Parent provides `ng-template` and passes it via `[toolbarStart]`, `[toolbarEnd]`, `[captionStart]`, or `[captionEnd]`.
2. Component injects `toolbarCtx`/`captionCtx` → your template gets:
   - `api: TableApi` to call `clear()`, `exportCSV()`, `setVisibleColumns(...)`, and row-edit helpers.
   - `selected: T[]` selection snapshot.
   - `config`, `columns`, `viewColumns`, `total` (toolbar only).
3. Your button handlers run in the parent. Call services or `api.*` methods.

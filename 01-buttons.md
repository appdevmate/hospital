# Toolbar & Row Action Buttons — Usage Guide

This guide shows how to add **toolbar buttons** and **row action buttons** to the `app-generic-table` using only the public API exposed by the table and standard PrimeNG buttons.

---

## What you can customize

The table exposes three extension points for buttons:

1. **Toolbar (left)** — `toolbarStart` template
2. **Toolbar (right)** — `toolbarEnd` template
3. **Per-row actions** — `actionsTemplate` (and optional `actionsHeaderTemplate`)

In all cases, your templates receive a context object with a **public API** – `api` – you can call to interact with the table.

### Public API (available in template as `api`)
- `clear(): void` — clears filters and global search.
- `exportCSV(opts?): void` — exports visible rows to CSV. See *Export options* below.
- `table(): Table` — returns underlying PrimeNG `Table` instance.
- `getSelected(): T[]` — returns currently selected rows.
- `setVisibleColumns(fields: string[]): void` — sets which columns are visible.
- `beginRowEdit(row, index?)` / `saveRowEdit(row, index?)` / `cancelRowEdit(row, index?)` — programmatic row editing controls.

**Export options (`ExportOptions`):**
- `selectionOnly?: boolean`
- `filename?: string`
- `separator?: string`
- `includeHeaders?: boolean`
- `applyPipes?: boolean`
- `columns?: string[]` (limit export to these field names)

---

## Toolbar buttons (start / end)

```html
<ng-template #tbStart let-api="api" let-selected="selected">
  <!-- Add -->
  <p-button label="New Patient" icon="pi pi-plus"
            [disabled]="loading"
            (onClick)="openNewPatient()"></p-button>

  <!-- Delete selected -->
  <p-button label="Delete Selected" icon="pi pi-trash" severity="danger" outlined
            [disabled]="!selected?.length"
            (onClick)="deleteSelectedPatients()"></p-button>

  <!-- Import / Template -->
  <input type="file" #fileInput accept=".xlsx,.xls,.csv" (change)="onImportFromFileInput($event)" hidden />
  <p-button label="Import" icon="pi pi-upload" severity="secondary"
            (onClick)="fileInput.click()"></p-button>
  <p-button label="Template" icon="pi pi-file-excel" severity="secondary"
            (onClick)="downloadTemplate()"></p-button>
</ng-template>

<ng-template #tbEnd let-api="api">
  <!-- Export using table API -->
  <p-button label="Export" icon="pi pi-download" severity="secondary"
            (onClick)="api.exportCSV({
               selectionOnly: selectedPatients.length > 0,
               filename: 'patients_export',
               includeHeaders: true,
               applyPipes: true,
               columns: patientColumns.map(c => c.field)
            })"></p-button>
</ng-template>

<!-- Plug into the table -->
<app-generic-table
  [toolbarStart]="tbStart"
  [toolbarEnd]="tbEnd"
  ...>
</app-generic-table>
```

**Notes**
- Templates receive `let-api="api"` and `let-selected="selected"` (selected rows array) in their context.
- You can call any API method directly (e.g. `api.clear()` to clear filters).

---

## Per-row action buttons

You can either use the built-in actions (when `config.editType` is `row`/`cell` **and** a column is editable) **or** provide a custom `actionsTemplate`.

### Custom actions template

```html
<ng-template #rowActions let-row let-editing="editing" let-api="api" let-rowIndex="rowIndex">
  <ng-container *ngIf="!editing; else editCtrls">
    <p-button icon="pi pi-pencil" text pTooltip="Edit"
              (onClick)="api.beginRowEdit(row, rowIndex)"></p-button>
  </ng-container>

  <ng-template #editCtrls>
    <p-button icon="pi pi-check" text severity="success" pTooltip="Save"
              (onClick)="saveRow(row, rowIndex, api)"></p-button>
    <p-button icon="pi pi-times" text severity="danger" pTooltip="Cancel"
              (onClick)="api.cancelRowEdit(row, rowIndex)"></p-button>
  </ng-template>
</ng-template>

<app-generic-table
  [actionsTemplate]="rowActions"
  ...>
</app-generic-table>
```

### Optional actions header

```html
<ng-template #actionsHeader let-api="api">
  <span>Actions</span>
</ng-template>

<app-generic-table
  [actionsTemplate]="rowActions"
  [actionsHeaderTemplate]="actionsHeader"
  ...>
</app-generic-table>
```

---

## Programmatic examples

### Clear filters & global search
```ts
api.clear();
```

### Export only selected rows, with visible pipes applied
```ts
api.exportCSV({ selectionOnly: true, applyPipes: true });
```

### Toggle visible columns
```ts
api.setVisibleColumns(['name', 'gender', 'phone']);
```

### Imperative row edit
```ts
api.beginRowEdit(row, index);
// ... update your model ...
api.saveRowEdit(row, index);
// or api.cancelRowEdit(row, index);
```

---

## Enabling/Disabling built-in actions

- Built-in action buttons appear when **both**:
  - `config.editType` is `'row'` or `'cell'`, and
  - at least one `TableColumn` has `editable: true`.

If you provide `[actionsTemplate]`, built-in buttons are not shown for that column.

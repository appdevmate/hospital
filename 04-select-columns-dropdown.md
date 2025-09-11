# Select Columns Dropdown — How to Use

The table includes a **column picker** popover that lets users show/hide columns at runtime, with optional persistence in your component state.

---

## Enabling the picker

```html
<app-generic-table
  [columns]="patientColumns"
  [visibleColumnFields]="visibleColumnFields"
  (columnsVisibilityChange)="visibleColumnFields = $event"
  [config]="{ showColumnPicker: true /* other config ... */ }"
  ...>
</app-generic-table>
```

### Relevant inputs/outputs
- **`[config].showColumnPicker`** — set to `true` (default: `true` in this implementation; you can set `false` to hide).
- **`[visibleColumnFields]`** — provide the initial list of visible field names (order matters).
- **`(columnsVisibilityChange)`** — emits whenever the user changes the selection in the picker.

### Optional input
- **`[requireAtLeastOneColumn]`** — default `true`. If `true`, the picker will enforce at least one visible column.

---

## Programmatic control

You can also control visibility entirely from code using the public API:

```ts
// Show only a subset
api.setVisibleColumns(['name', 'gender', 'phone']);

// Or read your persisted preference and apply it
const saved = JSON.parse(localStorage.getItem('visibleCols') || '[]');
api.setVisibleColumns(saved);
```

**Tip:** persist `visibleColumnFields` when `(columnsVisibilityChange)` fires:

```ts
onColumnsChange(list: string[]) {
  this.visibleColumnFields = list;
  localStorage.setItem('visibleCols', JSON.stringify(list));
}
```

---

## Searching inside the picker

The popover includes a **search box** to filter the column list by header or field name. The checkbox in the header allows **Select All / Deselect All**.

---

## Interaction with CSV export

When you call `api.exportCSV()` **without** specifying `columns`, the export uses the **currently visible** columns. To export all columns regardless of visibility, pass the full list:

```ts
api.exportCSV({
  columns: patientColumns.map(c => c.field) // export all
});
```

# Module: Columns

Control which columns are visible. Two options:
1) Built-in **Column Picker** popover.
2) Programmatic control via `publicApi.setVisibleColumns(fields)` to integrate custom UIs like `p-autocomplete`.

## A) Built-in Column Picker

Nothing extra required. Enable it with config.

```html
<app-generic-table
  [columns]="cols"
  [data]="rows"
  [config]="{ showColumnPicker: true }"
  (columnsVisibilityChange)="onVisible($event)">
</app-generic-table>
```

```ts
onVisible(fields: string[]) {
  // Persist user preference if needed
}
```

### How it works
- Component builds `columnOptions` from `columns`.
- User selects/deselects. Component enforces at least one when `[requireAtLeastOneColumn]="true"`.
- Emits `columnsVisibilityChange` with the **fields** in order.

## B) Autocomplete-based Picker

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
    placeholder="Select columns">
  </p-autocomplete>
</ng-template>

<app-generic-table
  [columns]="cols"
  [data]="rows"
  [captionEnd]="captionEndTpl"
  (columnsVisibilityChange)="syncFromChild($event)">
</app-generic-table>
```

```ts
allColOpts = this.cols.map(c => ({ header: c.header ?? c.field, field: c.field }));
selectedCols = this.allColOpts.slice();
colSuggest = this.allColOpts.slice();

filterCols(q: string) {
  const s = (q || '').toLowerCase();
  this.colSuggest = this.allColOpts.filter(o => !s || o.header.toLowerCase().includes(s) || o.field.toLowerCase().includes(s));
}

applyCols(api: TableApi) {
  api.setVisibleColumns(this.selectedCols.map(o => o.field));
}

syncFromChild(fields: string[]) {
  this.selectedCols = this.allColOpts.filter(o => fields.includes(o.field));
}
```

## Flow

1. Parent sets `columns`.
2. User changes visibility using built-in popover or your custom control.
3. Component updates its internal `visibleFields` and emits `columnsVisibilityChange`.
4. Parent optionally persists selection to user profile or localStorage.

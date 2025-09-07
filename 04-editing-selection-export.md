# Module: Editing, Selection, Export

## Row or Cell Edit

Enable in config:
```html
<app-generic-table
  [columns]="cols"
  [data]="rows"
  [config]="{ editType: 'row' }"
  (rowEditSave)="onRowEditSave($event)">
</app-generic-table>
```

```ts
onRowEditSave(ev: RowEditEvent<any>) {
  this.service.update(ev.data).subscribe();
}
```

**Flow**
1. User clicks edit icon in Actions column or uses your custom template.
2. Component clones row in `clonedRows` on init and restores on cancel.
3. On save it emits `rowEditSave` and clears the clone.

## Selection

```html
<app-generic-table
  [columns]="cols"
  [data]="rows"
  [config]="{ selectable: true, selectionMode: 'multiple' }"
  (selectionChange)="selected = $event">
</app-generic-table>
<div class="mt-2">Selected: {{ selected.length }}</div>
```

**Flow**
- PrimeNG manages the selection array via `[(selection)]="selectedRows"` internally.
- Component re-emits `selectionChange` so parent can react.

## CSV Export

From template:
```html
<ng-template #captionEndTpl let-api="api">
  <button pButton label="Export CSV" icon="pi pi-download" (click)="api.exportCSV({ selectionOnly: true })"></button>
</ng-template>
```

From code:
```ts
@ViewChild('tbl') tbl!: GenericTableComponent<any>;
downloadAll() {
  this.tbl.publicApi.exportCSV({ filename: 'patients' });
}
```

**Options**
- `selectionOnly`, `filename`, `separator`, `includeHeaders`, `applyPipes`, `columns`.

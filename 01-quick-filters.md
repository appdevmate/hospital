# Module: Quick Filters

Purpose: render small action buttons above the table that toggle, cycle, or trigger an action. The component only **emits** intent; your parent applies filters when loading data.

## Minimal Usage

```ts
// component.ts
quickFilters: FilterControl[] = [
  { id: 'female', type: 'toggle', label: 'Female', icon: 'pi pi-user' },
  { id: 'status', type: 'cycle', label: 'Status', values: [null, 'active', 'inactive', 'discharged'] },
  { id: 'reset', type: 'button', label: 'Reset', icon: 'pi pi-refresh', outlined: true }
];
activeFilters: Record<string, any> = { female: null, status: null };

onFilterChange(ev: { id: string; value: any }) {
  if (ev.id === 'reset') {
    this.activeFilters = { female: null, status: null };
  } else {
    this.activeFilters = { ...this.activeFilters, [ev.id]: ev.value };
  }
  this.load({ first: 0, rows: 15 }); // re-query with new filters
}
```

```html
<app-generic-table
  [columns]="cols"
  [data]="rows"
  [config]="{ title: 'Patients', showToolbar: true }"
  [filterControls]="quickFilters"
  [activeFilters]="activeFilters"
  (filterControlChange)="onFilterChange($event)"
  (lazyLoad)="load($event)">
</app-generic-table>
```

## Flow

1. Parent passes `filterControls` and `activeFilters`.
2. User clicks a control.
   - `toggle`: component flips between `true` and `null`.
   - `cycle`: component rotates through `values` (e.g., `null` → `active` → `inactive` …).
   - `button`: emits once with `true`.
3. Component emits `filterControlChange` with `{ id, value }`.
4. Parent updates `activeFilters` and calls its data service.
5. Parent sets `data` and `totalRecords`. UI updates.

## Tips
- Store the filters in URL query params to preserve state.
- Use `getLabel`/`getIcon` to make the button reflect the current value.

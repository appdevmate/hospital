# Quick Filter Buttons — Usage Guide

Quick filter buttons are defined with the `FilterControl` interface and rendered in the table caption area. They allow users to toggle or cycle through predefined filter states and inform the parent via the `(filterControlChange)` output.

---

## FilterControl interface (recap)

```ts
export interface FilterControl {
  id: string;
  type: 'cycle' | 'toggle' | 'button';
  label?: string;
  icon?: string;
  tooltip?: string;
  outlined?: boolean;
  severityOn?: 'primary' | 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'help' | 'contrast';
  severityOff?: 'primary' | 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'help' | 'contrast';
  values?: any[];                       // for 'cycle' type
  getLabel?: (value: any) => string;    // dynamic label
  getIcon?: (value: any) => string;     // dynamic icon
}
```

The component also binds an `activeFilters` object, and emits `(filterControlChange)` when a control is clicked:

```html
<app-generic-table
  [filterControls]="filterControls"
  [activeFilters]="activeFilters"
  (filterControlChange)="onFilterControlChange($event)"
  ...>
</app-generic-table>
```

---

## Common patterns

### 1) Cycle control (rotates through values)

```ts
type StatusFilter = 'active' | 'nonactive' | null;

filterControls = [{
  id: 'status',
  type: 'cycle',
  icon: 'pi pi-users',
  tooltip: 'Toggle status quick filter',
  outlined: true,
  values: [null, 'active', 'nonactive'],
  getLabel: (v) => v === 'active'
    ? 'Non-Active Patients'     // next label
    : v === 'nonactive'
      ? 'All Patients'
      : 'Active Patients',
  getIcon: (v) => v === 'active' ? 'pi pi-user-minus' : 'pi pi-users'
}];
```

**How it works**
- Current value is read from `activeFilters['status']`.
- Clicking the button emits `{ id: 'status', value: nextValue }`, cycling through the `values` array.
- You update your component state and reload data accordingly.

### 2) Toggle control (on/off)

```ts
filterControls = [{
  id: 'archived',
  type: 'toggle',
  label: 'Archived',
  icon: 'pi pi-box',
  tooltip: 'Show archived items',
  outlined: true,
  severityOn: 'primary',
  severityOff: 'secondary'
}];
```

- When active, the table displays the `severityOn` color; otherwise `severityOff`.
- Emitted values are `true` (active) or `null` (cleared).

### 3) Button control (fire-and-forget)

```ts
filterControls = [{
  id: 'refresh',
  type: 'button',
  label: 'Refresh',
  icon: 'pi pi-refresh',
  tooltip: 'Reload data',
  outlined: true
}];
```

- Emits `{ id: 'refresh', value: true }` each time it's clicked.

---

## Handling emitted changes

```ts
activeFilters: any = { status: null, archived: null };

onFilterControlChange(e: { id: string; value: any }) {
  this.activeFilters[e.id] = e.value;
  // Example: feed values into your server query builder
  this.resetPaging();
  this.loadPatients(/* PrimeNG LazyLoadEvent */);
}
```

---

## Styling notes
- The button color changes based on active/inactive state using `severityOn`/`severityOff`.
- Set `outlined: true` for outlined appearance (default is outlined unless you set `false`).

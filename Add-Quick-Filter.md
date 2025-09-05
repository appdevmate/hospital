# Adding a Quick Filter Button to `TableDemo`

This guide shows how to add a **new quick filter button** (e.g., Status, Gender, etc.) in the `TableDemo` component using the **generic** controls provided by `GenericTableComponent` (`tableplugin`).

> The table plugin is **generic**: you only define _what_ you need in `TableDemo` (the button config + how it maps to API params). The plugin handles rendering, cycling values, emitting changes, and clearing.

---

## 1) Know the moving parts

- **`FilterControl`** (from `tableplugin`): config object describing a button / control.
- **`filterControls: FilterControl[]`** (in `TableDemo`): list of controls (buttons) to render.
- **`activeFilters: Record<string, any>`** (in `TableDemo`): current value per control (keyed by control `id`).
- **`(filterControlChange)` output** (from plugin): emits `{ id, value }` when a button cycles.
- **`loadPatients(...)`** (in `TableDemo`): maps `activeFilters` → API query params.

You already pass them in `TableDemo` template:

```html
<app-generic-table
  [filterControls]="filterControls"
  [activeFilters]="activeFilters"
  (filterControlChange)="onFilterControlChange($event)"
  ...
></app-generic-table>
```

---

## 2) Add a new filter button

In `TableDemo`, append a new entry to `filterControls`. Example: **Department** filter cycling `null → cardiology → radiology`:

```ts
filterControls: FilterControl[] = [
  // (existing controls...)

  {
    id: 'department',          // must be unique
    type: 'cycle',             // the plugin cycles values for you
    icon: 'pi pi-building',    // PrimeIcons class (optional)
    tooltip: 'Filter by department',
    outlined: true,
    values: [null, 'cardiology', 'radiology'],  // cycle order
    getLabel: (v) =>
      v === 'cardiology' ? 'Radiology' :
      v === 'radiology'  ? 'All Departments' :
                           'Cardiology'
  }
];
```

> **Tip:** `getLabel` should describe the **next** state (so users understand what will happen on click).

---

## 3) Handle the emitted value

Update your handler so the new control value is saved and the table reloads:

```ts
onFilterControlChange(e: { id: string; value: any }) {
  this.activeFilters[e.id] = e.value;             // persist new value
  this.reset();
  this.filters = { pageSize: this.pageSize, lastKey: null, offset: 0 };
  // Force a fresh lazy load (wipes table filters for a clean request)
  this.loadPatients({
    first: 0,
    rows: this.pageSize,
    sortField: this.prevSortField,
    sortOrder: this.prevSortOrder,
    filters: {}
  });
}
```

No changes needed in the plugin.

---

## 4) Map the new control to API parameters

In `loadPatients(...)`, translate `activeFilters` into query params before calling the service.

**Example:** mapping for the `department` control to `department.equals`:

```ts
// Remove stale keys first
delete (this.filters as any)['department.equals'];

// Re-apply active button(s)
const dep = this.activeFilters['department'];
if (dep) (this.filters as any)['department.equals'] = dep;
```

> Follow the same pattern you already use for `status` and `gender`:
> - `status === 'active'`  → `status.notEquals = 'dead,discharged'`
> - `status === 'nonactive'` → `status.equals = 'dead,discharged'`
> - `gender in {'male','female'}` → `gender.equals = gender`

---

## 5) Test quickly

1. Click your new **Department** button multiple times:
   - `null` → `cardiology` → `radiology` → `null` → ...
2. Watch the network tab; requests should include:
   - `department.equals=cardiology` or `department.equals=radiology` (or be absent when `null`).
3. Use the **Clear** button: it should call `(clearAll)` → reset `activeFilters` → wipe quick filters and table filters.

---

## 6) Minimal example (Status, Gender, Department)

```ts
activeFilters: Record<string, any> = { status: null, gender: null, department: null };

filterControls: FilterControl[] = [
  {
    id: 'status',
    type: 'cycle',
    icon: 'pi pi-users',
    tooltip: 'Toggle status quick filter',
    outlined: true,
    values: [null, 'active', 'nonactive'],
    getLabel: (v) => (v === 'active' ? 'Non-Active Patients' : v === 'nonactive' ? 'All Patients' : 'Active Patients'),
    getIcon: (v) => (v === 'active' ? 'pi pi-user-minus' : 'pi pi-users')
  },
  {
    id: 'gender',
    type: 'cycle',
    icon: 'pi pi-user',
    tooltip: 'Cycle gender filter',
    outlined: true,
    values: [null, 'male', 'female'],
    getLabel: (v) => (v === 'male' ? 'Female' : v === 'female' ? 'All Genders' : 'Male')
  },
  {
    id: 'department',
    type: 'cycle',
    icon: 'pi pi-building',
    tooltip: 'Filter by department',
    outlined: true,
    values: [null, 'cardiology', 'radiology'],
    getLabel: (v) => (v === 'cardiology' ? 'Radiology' : v === 'radiology' ? 'All Departments' : 'Cardiology')
  }
];

// in loadPatients(...)
delete (this.filters as any)['status.notEquals'];
delete (this.filters as any)['status.equals'];
delete (this.filters as any)['gender.equals'];
delete (this.filters as any)['department.equals'];

const st = this.activeFilters['status'];
if (st === 'active') (this.filters as any)['status.notEquals'] = 'dead,discharged';
else if (st === 'nonactive') (this.filters as any)['status.equals'] = 'dead,discharged';

const g = this.activeFilters['gender'];
if (g === 'male' || g === 'female') (this.filters as any)['gender.equals'] = g;

const dep = this.activeFilters['department'];
if (dep) (this.filters as any)['department.equals'] = dep;
```

---

## FAQ

- **Can I add non-cycling controls?**  
  Yes—extend `FilterControl` with new `type`s (e.g., dropdown) in `tableplugin`, emit `(filterControlChange)` with `{id, value}`, and handle it in the same way.

- **Do I need to change the plugin to add buttons?**  
  No. For cycling buttons, just add objects to `filterControls` and handle mapping in `TableDemo`.

- **How do I reset everything?**  
  The **Clear** button triggers `(clearAll)`. In `TableDemo.onClearAll()` reset `activeFilters`, `filters`, and pagination (`reset()`); the plugin clears table filters and global search.

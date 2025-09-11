# Columns — Full Attribute Reference & Examples

This guide explains **all** `TableColumn` attributes used by `app-generic-table` and shows how to configure each one.

---

## Interface (recap)

```ts
export interface TableColumn {
  field: string;    // required
  header: string;   // required

  type?: 'text' | 'date' | 'number' | 'boolean' | 'custom';
  pipe?: 'date' | 'currency' | 'number' | 'titlecase' | 'uppercase' | 'lowercase';
  dateFormat?: string; // e.g. 'MM/dd/yyyy'
  filterable?: boolean;
  sortable?: boolean;
  width?: string;       // e.g. '12rem', '200px'
  customTemplate?: boolean;
  editable?: boolean;
  editorType?: 'text' | 'date' | 'number' | 'textarea' | 'autocomplete';
  editorOptions?: ReadonlyArray<{ label: string; value: any }>;
  filterType?: 'text' | 'dropdown';
  filterOptions?: Array<{ label: string; value: any }>;
  filterMatchMode?: 'contains' | 'equals' | 'startsWith' | 'endsWith';
}
```

> The table uses **PrimeNG** cells and pipes the value for display when `pipe` is set. If `customTemplate` is true and a template is supplied for that field, the template output is used instead.

---

## Complete example

```ts
const GENDER_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Prefer not to Answer', value: 'na' }
] as const;

patientColumns: TableColumn[] = [
  // Text with titlecase pipe, filterable & sortable, editable with text input
  {
    field: 'name',
    header: 'Name',
    type: 'text',
    pipe: 'titlecase',
    dateFormat: undefined,     // not used for non-date pipes
    filterable: true,
    sortable: true,
    width: '16rem',
    customTemplate: false,
    editable: true,
    editorType: 'text',
    editorOptions: undefined,  // not used for text editor
    filterType: 'text',
    filterOptions: undefined,  // not used for text filter
    filterMatchMode: 'contains'
  },

  // Autocomplete editor with custom template for display
  {
    field: 'gender',
    header: 'Gender',
    type: 'text',
    filterable: true,
    sortable: true,
    width: '12rem',
    customTemplate: true,               // use <ng-template #genderTemplate>
    editable: true,
    editorType: 'autocomplete',
    editorOptions: GENDER_OPTIONS,
    filterType: 'dropdown',
    filterOptions: [...GENDER_OPTIONS], // drop-down filtering
    filterMatchMode: 'equals'
  },

  // Uppercase pipe with inline text editor
  {
    field: 'insurance',
    header: 'Insurance',
    type: 'text',
    pipe: 'uppercase',
    filterable: true,
    sortable: false,        // stick to natural order
    width: '14rem',
    editable: true,
    editorType: 'text',
    filterType: 'text',
    filterMatchMode: 'contains'
  },

  // Number (no pipe -> displayed as string unless you set 'number' pipe)
  {
    field: 'phone',
    header: 'Phone',
    type: 'number',
    pipe: undefined,
    filterable: true,
    sortable: true,
    width: '14rem',
    editable: true,
    editorType: 'text', // keep as text to preserve leading zeros, etc.
    filterType: 'text',
    filterMatchMode: 'contains'
  },

  // Qatar ID
  {
    field: 'qid',
    header: 'Qatar ID',
    type: 'text',
    filterable: true,
    sortable: true,
    width: '14rem',
    editable: true,
    editorType: 'text',
    filterType: 'text',
    filterMatchMode: 'contains'
  },

  // Date column with date pipe & DatePicker editor
  {
    field: 'dob',
    header: 'Date of Birth',
    type: 'date',
    pipe: 'date',
    dateFormat: 'MM/dd/yyyy',   // used for display & editor
    filterable: true,
    sortable: true,
    width: '14rem',
    editable: true,
    editorType: 'date',
    filterType: 'text'          // PrimeNG column filter type; menu will be text/date as configured
  },

  // Status with autocomplete editor + custom template
  {
    field: 'status',
    header: 'Status',
    type: 'text',
    filterable: true,
    sortable: true,
    width: '14rem',
    customTemplate: true,      // use <ng-template #statusTemplate>
    editable: true,
    editorType: 'autocomplete',
    editorOptions: [
      { label: 'ADMITTED', value: 'admitted' },
      { label: 'STABLE', value: 'stable' },
      { label: 'UNDER TREATMENT', value: 'under treatment' },
      { label: 'DISCHARGED', value: 'discharged' },
      { label: 'CRITICAL', value: 'critical' },
      { label: 'DEAD', value: 'dead' }
    ],
    filterType: 'dropdown',
    filterOptions: [
      { label: 'Admitted', value: 'admitted' },
      { label: 'Stable', value: 'stable' },
      { label: 'Under Treatment', value: 'under treatment' },
      { label: 'Discharged', value: 'discharged' },
      { label: 'Critical', value: 'critical' },
      { label: 'Dead', value: 'dead' }
    ],
    filterMatchMode: 'equals'
  },

  // Submitted Date (read-only)
  {
    field: 'timestamp',
    header: 'Submitted Date',
    type: 'date',
    pipe: 'date',
    dateFormat: 'MM/dd/yyyy',
    filterable: true,
    sortable: true,
    width: '14rem',
    editable: false,
    editorType: undefined,
    filterType: 'text',
    filterMatchMode: 'contains'
  }
];
```

---

## Custom cell templates

Set `customTemplate: true` in the column and define a matching `ng-template` keyed by the field name in `customTemplates`:

```html
<ng-template #genderTemplate let-value="value">
  <p-tag [value]="value | titlecase"
         [severity]="getGenderSeverity(value)"></p-tag>
</ng-template>
```

Then in code:

```ts
@ViewChild('genderTemplate') genderTemplate!: TemplateRef<any>;

ngAfterViewInit() {
  this.customTemplates = { gender: this.genderTemplate };
}
```

---

## Editing

- Set `config.editType` to `'row'` or `'cell'` to enable editing.
- Mark columns with `editable: true` and choose an `editorType`:
  - `'text' | 'number' | 'textarea' | 'date' | 'autocomplete'`
- For `'autocomplete'`, provide `editorOptions: ReadonlyArray<{label, value}>`.

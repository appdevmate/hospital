import { Component, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { Subject, takeUntil } from 'rxjs';
import { GenericTableComponent, TableColumn, TableConfig, RowEditEvent } from './tableplugin';
import { Patient, PatientService, GetPatientsPageOpts } from '../service/patients.service';

@Component({
  selector: 'app-table-demo',
  standalone: true,
  imports: [CommonModule, GenericTableComponent, TagModule],
  template: `
    <app-generic-table
      [columns]="patientColumns"
      [data]="patients"
      [totalRecords]="totalRecords"
      [loading]="loading"
      [config]="tableConfig"
      [isLazy]="true"
      dataKey="PK"
      (lazyLoad)="loadPatients($event)"
      (rowEditInit)="onRowEditInit($event)"
      (rowEditSave)="onRowEditSave($event)"
      (rowEditCancel)="onRowEditCancel($event)"
      [customTemplates]="customTemplates"
      [actionsTemplate]="actionsTemplate"
    >
      <ng-template #statusTemplate let-row let-value="value">
        <p-tag [value]="(value || '') | uppercase" [severity]="getSeverity(value)"></p-tag>
      </ng-template>
      <ng-template #actionsTemplate let-row></ng-template>
    </app-generic-table>
  `
})
export class TableDemo implements OnDestroy {
  @ViewChild('statusTemplate') statusTemplate!: TemplateRef<any>;
  @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<any>;

  EditorType = { Text:'text', Date:'date', Number:'number', Textarea:'textarea', Autocomplete:'autocomplete' } as const;
  STATUS_OPTIONS = [
    { label:'QUALIFIED', value:'qualified' },
    { label:'SENIOR', value:'senior' },
    { label:'MID-SENIOR', value:'mid-senior' },
    { label:'JUNIOR', value:'junior' }
  ] as const;

  patients: Patient[] = [];
  loading = true;
  totalRecords = 0;

  private lastKey: string | null = null;
  private pageKeys: (string | null)[] = [null];
  private page = 0;
  private pageSize = 15;
  
  private prevSortField: string | null = null;
  private prevSortOrder: 1 | -1 | 0 | null = null;


  filters: GetPatientsPageOpts = { pageSize: this.pageSize, lastKey: null };

  patientColumns: TableColumn[] = [
    { field:'name', header:'Name', editable:true, editorType:this.EditorType.Text,    pipe:'titlecase', sortable:true, filterable:true },
    { field:'gender', header:'Gender', editable:true, editorType:this.EditorType.Text, pipe:'titlecase', filterable:true },
    { field:'insurance', header:'Insurance', editable:true, editorType:this.EditorType.Text, pipe:'titlecase', filterable:true },
    { field:'dob', header:'Date of Birth', editable:true, editorType:this.EditorType.Date, type:'date', pipe:'date', dateFormat:'MM/dd/yyyy', filterable:true },
    { field:'status', header:'Level', editable:true, editorType:this.EditorType.Autocomplete, editorOptions:this.STATUS_OPTIONS, customTemplate:true, filterable:true },
    { field:'timestamp', header:'Submitted Date', editable:false, type:'date', pipe:'date', dateFormat:'MM/dd/yyyy', filterable:true }
  ];

  tableConfig: TableConfig = {
    title:'Patient Management',
    showGlobalSearch:true, showClearButton:true,
    pageSizeOptions:[5,10,15,25,50,100],
    defaultPageSize:15, scrollHeight:'600px',
    emptyMessage:'No patients found matching your criteria.',
    loadingMessage:'Loading patient data...',
    showGridlines:true, rowHover:true, responsive:true, showResultsSummary:true
  };

  customTemplates: { [key: string]: TemplateRef<any> } = {};
  private destroy$ = new Subject<void>();

  constructor(private svc: PatientService) {}

  ngAfterViewInit() {
    this.customTemplates = { status: this.statusTemplate };
    this.pageSize = this.tableConfig.defaultPageSize ?? 15;
    this.filters.pageSize = this.pageSize;
  }

  loadPatients(e: any) {
  if (!e) return;

  // page size change
  if (e.rows && e.rows !== this.pageSize) {
    this.pageSize = e.rows;
    this.reset();
  }

  // sort change? reset pagination (invalidates lastKey sequence)
  const newSortField = e.sortField ?? null;
  const newSortOrder: 1 | -1 | 0 = (e.sortOrder ?? 1) as 1 | -1 | 0;
  if (newSortField !== this.prevSortField || newSortOrder !== this.prevSortOrder) {
    this.prevSortField = newSortField;
    this.prevSortOrder = newSortOrder;
    this.reset();
  }

  // page calc
  this.page = Math.floor((e.first || 0) / this.pageSize);
  this.lastKey = this.pageKeys[this.page] || null;

  // filters: search/column filters
  this.applyFilters(e.filters || {});

  // include sort in backend request
  (this.filters as any).sortField = newSortField;
  (this.filters as any).sortOrder = newSortOrder; // 1 asc, -1 desc

  this.filters = { ...this.filters, pageSize: this.pageSize, lastKey: this.lastKey };
  this.fetch();
}


  private fetch() {
    this.loading = true;
    this.svc.getPatientsPage(this.filters).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.patients = r.data || [];
        this.totalRecords = r.totalCount || 0;
        if (r.lastKey) this.pageKeys[this.page + 1] = r.lastKey; else this.pageKeys = this.pageKeys.slice(0, this.page + 1);
        this.loading = false;
      },
      error: () => { this.loading = false; this.patients = []; this.totalRecords = 0; }
    });
  }

  private applyFilters(obj: Record<string, any>) {
    const toYmd = (d: Date) => d.toISOString().slice(0, 10);
    const isBlank = (v: unknown) => v == null || (typeof v === 'string' && v.trim() === '');
    const base: GetPatientsPageOpts = { pageSize: this.filters.pageSize, lastKey: this.filters.lastKey ?? null };
    for (const [k, raw] of Object.entries(obj)) {
      const f = Array.isArray(raw) ? raw[0] : raw; if (!f) continue;
      let { value, matchMode, operator } = f as { value: any; matchMode?: string; operator?: 'and' | 'or' };
      if (value instanceof Date) value = toYmd(value);
      if (typeof value === 'string') value = value.trim();
      if (isBlank(value)) continue;
      if (k === 'global') { (base as any).search = value; continue; }
      (base as any)[k] = { value, matchMode: matchMode ?? 'contains', operator: (operator as 'and'|'or') ?? 'and' };
    }
    this.filters = base;
  }

  private reset() { this.page = 0; this.lastKey = null; this.pageKeys = [null]; }

  onRowEditInit(ev: RowEditEvent<Patient>)  { /* optional clone */ console.log('Edit INIT', ev.data); }
  onRowEditSave(ev: RowEditEvent<Patient>)  { console.log('Edit SAVE', ev.data); /* this.svc.updatePatient(ev.data.PK, ev.data).subscribe() */ }
  onRowEditCancel(ev: RowEditEvent<Patient>){ console.log('Edit CANCEL', ev.data); }

  getSeverity(v?: string): 'success' | 'info' | 'warn' | 'danger' {
    switch ((v || '').toLowerCase().trim()) { case 'qualified': return 'success'; case 'senior': return 'danger';
      case 'mid-senior': return 'info'; case 'junior': return 'warn'; default: return 'info'; }
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
}
// import { Component, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { TagModule } from 'primeng/tag';
// import { Subject, takeUntil } from 'rxjs';

// import { GenericTableComponent, TableColumn, TableConfig, RowEditEvent } from './tableplugin';
// import { Patient, PatientService, GetPatientsPageOpts } from '../service/patients.service';

// @Component({
//   selector: 'app-table-demo',
//   standalone: true,
//   imports: [CommonModule, GenericTableComponent, TagModule],
//   template: `
//     <app-generic-table
//       [columns]="patientColumns"
//       [data]="patients"
//       [totalRecords]="totalRecords"
//       [loading]="loading"
//       [config]="tableConfig"
//       [isLazy]="true"
//       dataKey="PK"
//       (lazyLoad)="loadPatients($event)"
//       (rowEditInit)="onRowEditInit($event)"
//       (rowEditSave)="onRowEditSave($event)"
//       (rowEditCancel)="onRowEditCancel($event)"
//       [customTemplates]="customTemplates"
//       [actionsTemplate]="actionsTemplate"
//     >
//       <ng-template #statusTemplate let-row let-value="value">
//         <p-tag [value]="(value || '') | uppercase" [severity]="getSeverity(value)"></p-tag>
//       </ng-template>

//       <ng-template #actionsTemplate let-row>
//         <!-- add extra row actions here if needed -->
//       </ng-template>
//     </app-generic-table>
//   `
// })
// export class TableDemo implements OnDestroy {
//   @ViewChild('statusTemplate') statusTemplate!: TemplateRef<any>;
//   @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<any>;

//   EditorType = {
//     Text: 'text',
//     Date: 'date',
//     Number: 'number',
//     Textarea: 'textarea',
//     Autocomplete: 'autocomplete'
//   } as const;

//   STATUS_OPTIONS = [
//     { label: 'QUALIFIED',  value: 'qualified' },
//     { label: 'SENIOR',     value: 'senior' },
//     { label: 'MID-SENIOR', value: 'mid-senior' },
//     { label: 'JUNIOR',     value: 'junior' }
//   ] as const;

//   patients: Patient[] = [];
//   loading = true;
//   totalRecords = 0;

//   private currentLastKey: string | null = null;
//   private pageKeys: (string | null)[] = [null];
//   private currentPage = 0;
//   private pageSize = 15;

//   filters: GetPatientsPageOpts = {
//     pageSize: this.pageSize,
//     lastKey: null
//   };

//   patientColumns: TableColumn[] = [
//     { field: 'name', header: 'Name', editable: true, editorType: this.EditorType.Text, pipe: 'titlecase', sortable: true, filterable: true },
//     { field: 'gender', header: 'Gender', editable: true, editorType: this.EditorType.Text, pipe: 'titlecase', filterable: true },
//     { field: 'insurance', header: 'Insurance', editable: true, editorType: this.EditorType.Text, pipe: 'titlecase', filterable: true },
//     { field: 'dob', header: 'Date of Birth', editable: true, editorType: this.EditorType.Date, type: 'date', pipe: 'date', dateFormat: 'MM/dd/yyyy', filterable: true },
//     { field: 'status', header: 'Level', editable: true, editorType: this.EditorType.Autocomplete, editorOptions: this.STATUS_OPTIONS, customTemplate: true, filterable: true },
//     { field: 'timestamp', header: 'Submitted Date', editable: false, type: 'date', pipe: 'date', dateFormat: 'MM/dd/yyyy', filterable: true }
//   ];

//   tableConfig: TableConfig = {
//     title: 'Patient Management',
//     showGlobalSearch: true,
//     showClearButton: true,
//     pageSizeOptions: [5, 10, 15, 25, 50, 100],
//     defaultPageSize: 15,
//     scrollHeight: '600px',
//     emptyMessage: 'No patients found matching your criteria.',
//     loadingMessage: 'Loading patient data...',
//     showGridlines: true,
//     rowHover: true,
//     responsive: true,
//     showResultsSummary: true
//   };

//   customTemplates: { [key: string]: TemplateRef<any> } = {};
//   private destroy$ = new Subject<void>();

//   constructor(private patientsService: PatientService) {}

//   ngAfterViewInit() {
//     this.customTemplates = { status: this.statusTemplate };
//     this.pageSize = this.tableConfig.defaultPageSize ?? 15;
//     this.filters.pageSize = this.pageSize;
//   }

//   loadPatients(event: any) {
//     if (!event) return;

//     if (event.rows && event.rows !== this.pageSize) {
//       this.pageSize = event.rows;
//       this.resetPagination();
//     }

//     const newPage = Math.floor((event.first || 0) / this.pageSize);
//     this.currentPage = newPage;
//     this.currentLastKey = this.pageKeys[newPage] || null;

//     this.buildFilterOptions(event.filters || {});
//     this.filters = { ...this.filters, pageSize: this.pageSize, lastKey: this.currentLastKey };

//     this.loadData();
//   }

//   private loadData() {
//     this.loading = true;

//     this.patientsService
//       .getPatientsPage(this.filters)
//       .pipe(takeUntil(this.destroy$))
//       .subscribe({
//         next: (response) => {
//           this.patients = response.data || [];
//           this.totalRecords = response.totalCount || 0;

//           if (response.lastKey) {
//             this.pageKeys[this.currentPage + 1] = response.lastKey;
//           } else {
//             this.pageKeys = this.pageKeys.slice(0, this.currentPage + 1);
//           }

//           this.loading = false;
//         },
//         error: () => {
//           this.loading = false;
//           this.patients = [];
//           this.totalRecords = 0;
//         }
//       });
//   }

//   private buildFilterOptions(filtersObject: Record<string, any>) {
//     const base: GetPatientsPageOpts = {
//       pageSize: this.filters?.pageSize,
//       lastKey: this.filters?.lastKey ?? null
//     };

//     const toYmd = (d: Date) => d.toISOString().slice(0, 10);
//     const isBlank = (v: unknown) => v == null || (typeof v === 'string' && v.trim() === '');

//     for (const [key, rawVal] of Object.entries(filtersObject ?? {})) {
//       const first = Array.isArray(rawVal) ? rawVal[0] : rawVal;
//       if (!first) continue;

//       let { value, matchMode, operator } = first as {
//         value: any;
//         matchMode?: string;
//         operator?: 'and' | 'or';
//       };

//       if (value instanceof Date) value = toYmd(value);
//       if (typeof value === 'string') value = value.trim();
//       if (isBlank(value)) continue;

//       if (key === 'global') {
//         base.search = value as string;
//         continue;
//       }

//       (base as any)[key] = {
//         value,
//         matchMode: matchMode ?? 'contains',
//         operator: (operator as 'and' | 'or') ?? 'and'
//       };
//     }

//     this.filters = base;
//   }

//   private resetPagination() {
//     this.currentPage = 0;
//     this.currentLastKey = null;
//     this.pageKeys = [null];
//   }

//   onRowEditInit(ev: RowEditEvent<Patient>) {
//     console.log('Edit INIT:', ev.data);
//   }

//   onRowEditSave(ev: RowEditEvent<Patient>) {
//     console.log('Edit SAVE:', ev.data);
//     // this.patientsService.updatePatient(ev.data.PK, ev.data).subscribe(...)
//   }

//   onRowEditCancel(ev: RowEditEvent<Patient>) {
//     console.log('Edit CANCEL:', ev.data);
//   }

//   getSeverity(val?: string): 'success' | 'info' | 'warn' | 'danger' {
//     switch ((val || '').toLowerCase().trim()) {
//       case 'qualified': return 'success';
//       case 'senior': return 'danger';
//       case 'mid-senior': return 'info';
//       case 'junior': return 'warn';
//       default: return 'info';
//     }
//   }

//   ngOnDestroy() {
//     this.destroy$.next();
//     this.destroy$.complete();
//   }
// }

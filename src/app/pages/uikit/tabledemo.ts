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
      <!-- Status tag (view mode) -->
      <ng-template #statusTemplate let-row let-value="value">
        <p-tag [value]="(value || '') | uppercase" [severity]="getSeverity(value)"></p-tag>
      </ng-template>

      <!-- (Optional) extra actions next to edit/save/cancel -->
      <ng-template #actionsTemplate let-row>
        <!-- Example placeholder: -->
        <!-- <button pButton icon="pi pi-info-circle" text (click)="inspect(row)"></button> -->
      </ng-template>
    </app-generic-table>
  `
})
export class TableDemo implements OnDestroy {
  @ViewChild('statusTemplate') statusTemplate!: TemplateRef<any>;
  @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<any>;

  // Editor types as class property (so you can use this.EditorType.X)
  EditorType = {
    Text: 'text',
    Date: 'date',
    Number: 'number',
    Textarea: 'textarea',
    Autocomplete: 'autocomplete'
  } as const;

  // Autocomplete options: labels UPPERCASE, values lowercase
  STATUS_OPTIONS = [
    { label: 'QUALIFIED',  value: 'qualified' },
    { label: 'SENIOR',     value: 'senior' },
    { label: 'MID-SENIOR', value: 'mid-senior' },
    { label: 'JUNIOR',     value: 'junior' }
  ] as const;

  // Data state
  patients: Patient[] = [];
  loading = true;
  totalRecords = 0;

  // Pagination (compatible with your lastKey approach)
  private currentLastKey: string | null = null;
  private pageKeys: (string | null)[] = [null];
  private currentPage = 0;
  private pageSize = 15;

  // Filters sent to backend
  filters: GetPatientsPageOpts = {
    pageSize: this.pageSize,
    lastKey: null
  };

  // Columns (mark editable + editorType)
  patientColumns: TableColumn[] = [
    { field: 'name', header: 'Name', editable: true, editorType: this.EditorType.Text, pipe: 'titlecase', sortable: true, filterable: true },
    { field: 'gender', header: 'Gender', editable: true, editorType: this.EditorType.Text, pipe: 'titlecase', filterable: true },
    { field: 'insurance', header: 'Insurance', editable: true, editorType: this.EditorType.Text, pipe: 'titlecase', filterable: true },
    { field: 'dob', header: 'Date of Birth', editable: true, editorType: this.EditorType.Date, type: 'date', pipe: 'date', dateFormat: 'MM/dd/yyyy', filterable: true },

    // Autocomplete editor for status
    { field: 'status', header: 'Level', editable: true, editorType: this.EditorType.Autocomplete, editorOptions: this.STATUS_OPTIONS, customTemplate: true, filterable: true },

    { field: 'timestamp', header: 'Submitted Date', editable: false, type: 'date', pipe: 'date', dateFormat: 'MM/dd/yyyy', filterable: true }
  ];

  // Table configuration
  tableConfig: TableConfig = {
    title: 'Patient Management',
    showGlobalSearch: true,
    showClearButton: true,
    pageSizeOptions: [5, 10, 15, 25, 50, 100],
    defaultPageSize: 15,
    scrollHeight: '600px',
    emptyMessage: 'No patients found matching your criteria.',
    loadingMessage: 'Loading patient data...',
    showGridlines: true,
    rowHover: true,
    responsive: true,
    showResultsSummary: true
  };

  // Custom templates mapping
  customTemplates: { [key: string]: TemplateRef<any> } = {};

  private destroy$ = new Subject<void>();

  constructor(private patientsService: PatientService) {}

  ngAfterViewInit() {
    // map templates
    this.customTemplates = {
      status: this.statusTemplate
    };

    this.pageSize = this.tableConfig.defaultPageSize ?? 15;
    this.filters.pageSize = this.pageSize;
  }

  // Lazy load handler (PrimeNG event)
  loadPatients(event: any) {
    if (!event) return;

    if (event.rows && event.rows !== this.pageSize) {
      this.pageSize = event.rows;
      this.resetPagination();
    }

    // compute current page from event.first
    const newPage = Math.floor((event.first || 0) / this.pageSize);
    this.currentPage = newPage;
    this.currentLastKey = this.pageKeys[newPage] || null;

    // build filters for backend
    this.buildFilterOptions(event.filters || {});
    this.filters = { ...this.filters, pageSize: this.pageSize, lastKey: this.currentLastKey };

    this.loadData();
  }

  private loadData() {
    this.loading = true;

    this.patientsService
      .getPatientsPage(this.filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.patients = response.data || [];
          this.totalRecords = response.totalCount || 0;

          if (response.lastKey) {
            this.pageKeys[this.currentPage + 1] = response.lastKey;
          } else {
            this.pageKeys = this.pageKeys.slice(0, this.currentPage + 1);
          }

          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.patients = [];
          this.totalRecords = 0;
        }
      });
  }

  private buildFilterOptions(filtersObject: Record<string, any>) {
    const baseFilters: GetPatientsPageOpts = {
      pageSize: this.filters?.pageSize,
      lastKey: this.filters?.lastKey ?? null
    };

    const toYmd = (d: Date) => d.toISOString().slice(0, 10);
    const isBlank = (v: unknown) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

    for (const [key, rawVal] of Object.entries(filtersObject ?? {})) {
      const first = Array.isArray(rawVal) ? rawVal[0] : rawVal;
      if (!first) continue;

      let { value, matchMode, operator } = first as {
        value: any;
        matchMode?: string;
        operator?: 'and' | 'or';
      };

      if (value instanceof Date) value = toYmd(value);
      if (typeof value === 'string') value = value.trim();
      if (isBlank(value)) continue;

      if (key === 'global') {
        baseFilters.search = value as string;
        continue;
      }

      (baseFilters as any)[key] = {
        value,
        matchMode: matchMode ?? 'contains',
        operator: (operator as 'and' | 'or') ?? 'and'
      };
    }

    this.filters = baseFilters;
  }

  private resetPagination() {
    this.currentPage = 0;
    this.currentLastKey = null;
    this.pageKeys = [null];
  }

  // Row edit events (hook to your API as needed)
  onRowEditInit(ev: RowEditEvent<Patient>) {
    // Optionally clone original row for cancel revert
    // this._originalRow = structuredClone(ev.data);
    console.log('Edit INIT:', ev.data);
  }

  onRowEditSave(ev: RowEditEvent<Patient>) {
    console.log('Edit SAVE:', ev.data);
    // Example persist:
    // this.patientsService.updatePatient(ev.data.PK, ev.data).subscribe(...)
  }

  onRowEditCancel(ev: RowEditEvent<Patient>) {
    console.log('Edit CANCEL:', ev.data);
    // Optionally restore original row if you cloned it on init
  }

  getSeverity(val?: string): 'success' | 'info' | 'warn' | 'danger' {
    switch ((val || '').toLowerCase().trim()) {
      case 'qualified': return 'success';
      case 'senior': return 'danger';
      case 'mid-senior': return 'info';
      case 'junior': return 'warn';
      default: return 'info';
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

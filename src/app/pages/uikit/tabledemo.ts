import { Component, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { Subject, takeUntil } from 'rxjs';

import { Patient, PatientService, GetPatientsPageOpts } from '../service/patients.service';
import { GenericTableComponent, TableColumn, TableConfig } from './tableplugin';

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
      [actionsTemplate]="actionsTemplate"
      [customTemplates]="customTemplates"
    >
      <ng-template #statusTemplate let-patient let-value="value">
        <p-tag [value]="value | titlecase" [severity]="getSeverity(value)"></p-tag>
      </ng-template>
    </app-generic-table>
  `
})
export class TableDemo implements OnDestroy {
  @ViewChild('statusTemplate') statusTemplate!: TemplateRef<any>;
  @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<any>;

  patients: Patient[] = [];
  loading = true;
  totalRecords = 0;

  // pagination state
  private currentLastKey: string | null = null;
  private pageKeys: (string | null)[] = [null];
  private currentPage = 0;

  // keep pageSize consistent with table config
  private pageSize = 15;

  filters: GetPatientsPageOpts = {
    pageSize: this.pageSize,
    lastKey: null
  };

  patientColumns: TableColumn[] = [
    { field: 'name', header: 'Name', pipe: 'titlecase', filterable: true, sortable: true },
    { field: 'gender', header: 'Gender', pipe: 'titlecase', filterable: true },
    { field: 'insurance', header: 'Insurance', pipe: 'titlecase', filterable: true },
    { field: 'dob', header: 'Date of Birth', type: 'date', pipe: 'date', dateFormat: 'MM/dd/yyyy', filterable: true },
    { field: 'timestamp', header: 'Submitted Date', type: 'date', pipe: 'date', dateFormat: 'MM/dd/yyyy', filterable: true },
    { field: 'status', header: 'Level', customTemplate: true, filterable: true }
  ];

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

  // map of field -> template
  customTemplates: { [key: string]: TemplateRef<any> } = {};

  private destroy$ = new Subject<void>();

  constructor(private patientsService: PatientService) {}

  ngAfterViewInit() {
    // set templates used by the generic table
    this.customTemplates = {
      status: this.statusTemplate
    };

    // sync local page size with config default
    this.pageSize = this.tableConfig.defaultPageSize ?? 15;
    this.filters.pageSize = this.pageSize;
  }

  loadPatients(event: any) {
    if (!event) return;

    // handle page size change
    if (event.rows && event.rows !== this.pageSize) {
      this.pageSize = event.rows;
      this.resetPagination();
    }

    // compute current page from PrimeNG event
    const newPage = Math.floor((event.first || 0) / this.pageSize);
    this.currentPage = newPage;
    this.currentLastKey = this.pageKeys[newPage] || null;

    // build filters from PrimeNG column filters
    this.buildFilterOptions(event.filters || {});

    // update paging params
    this.filters = {
      ...this.filters,
      pageSize: this.pageSize,
      lastKey: this.currentLastKey
    };

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
            // no next page
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
    const isBlank = (v: unknown) =>
      v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

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

  getSeverity(val?: string): 'success' | 'info' | 'warn' | 'danger' {
    switch ((val || '').toLowerCase().trim()) {
      case 'qualified':
        return 'success';
      case 'senior':
        return 'danger';
      case 'mid-senior':
        return 'info';
      case 'junior':
        return 'warn';
      default:
        return 'info';
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

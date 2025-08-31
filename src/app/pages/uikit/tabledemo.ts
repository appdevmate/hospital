// table-demo.component.ts - Updated with edit functionality

import { Component, AfterViewInit, DestroyRef, inject, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { GenericTableComponent, TableColumn, TableConfig, RowEditEvent, ToolbarConfig } from './tableplugin';
import { Patient, GetPatientsPageOpts, PatientsService, CreateUpdatePatientRequest } from '../service/patients.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NewPatient } from '@/components/new-patient/new-patient';
import { Helpers } from '@/services/helpers';
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-table-demo',
  standalone: true,
  imports: [CommonModule, GenericTableComponent, TagModule, ConfirmDialogModule],
  providers: [DialogService],
  template: `
    <app-generic-table
      [columns]="patientColumns"
      [data]="patients"
      [totalRecords]="totalRecords"
      [loading]="loading"
      [config]="tableConfig"
      [toolbarConfig]="toolbarConfig"
      [customTemplates]="customTemplates"
      [selectedRows]="selectedPatients"
      dataKey="PK"
      (lazyLoad)="loadPatients($event)"
      (selectionChange)="onSelectionChange($event)"
      (rowEditInit)="onRowEditInit($event)"
      (rowEditSave)="onRowEditSave($event)"
      (rowEditCancel)="onRowEditCancel($event)"
      (newClick)="openNewPatient()"
      (deleteClick)="deleteSelectedPatients()"
      (exportClick)="exportCSV()"
    >
      <ng-template #statusTemplate let-value="value">
        <p-tag [value]="value | uppercase" [severity]="getStatusSeverity(value)"></p-tag>
      </ng-template>

      <ng-template #genderTemplate let-value="value">
        <p-tag [value]="value | titlecase" [severity]="getGenderSeverity(value)"></p-tag>
      </ng-template>


      <ng-template #actionsTemplate let-row="row" let-index="index">
        <!-- Custom actions can be added here if needed -->
        <!-- The edit/save/cancel buttons are now handled by the table component -->
      </ng-template>
    </app-generic-table>
    <p-confirmDialog key="global" appendTo="body" [baseZIndex]="200000"></p-confirmDialog>
  `
})
export class TableDemo implements AfterViewInit, OnDestroy {
  @ViewChild('statusTemplate') statusTemplate!: TemplateRef<any>;
  @ViewChild('genderTemplate') genderTemplate!: TemplateRef<any>;
  @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<any>;
  @ViewChild(GenericTableComponent) tableCmp?: GenericTableComponent;

  EditorType = { Text: 'text', Date: 'date', Number: 'number', Textarea: 'textarea', Autocomplete: 'autocomplete' } as const;

  STATUS_OPTIONS = [
    { label: 'QUALIFIED', value: 'qualified' },
    { label: 'SENIOR', value: 'senior' },
    { label: 'MID-SENIOR', value: 'mid-senior' },
    { label: 'JUNIOR', value: 'junior' }
  ] as const;

  GENDER_OPTIONS = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Prefer not to Answer', value: 'na' }
  ] as const;


  patients: Patient[] = [];
  selectedPatients: Patient[] = [];
  loading = true;
  totalRecords = 0;

  private lastKey: string | null = null;
  private pageKeys: (string | null)[] = [null];
  private page = 0;
  private pageSize = 15;
  private prevSortField: string | null = null;
  private prevSortOrder: 1 | -1 | 0 | null = null;

  filters: GetPatientsPageOpts = { pageSize: this.pageSize, lastKey: null };
  customTemplates: { [key: string]: TemplateRef<any> } = {};
  private destroy$ = new Subject<void>();

  private dialog = inject(DialogService);
  private ref?: DynamicDialogRef;
  lastResult: unknown;
  private destroyRef = inject(DestroyRef);

  constructor(
    private patientsService: PatientsService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private helpersFunctions: Helpers
  ) { }

  ngAfterViewInit(): void {
    this.customTemplates = { status: this.statusTemplate, gender: this.genderTemplate, actions: this.actionsTemplate };
    this.pageSize = this.tableConfig.defaultPageSize ?? 15;
    this.filters.pageSize = this.pageSize;
  }

  // Row Edit Event Handlers
  onRowEditInit(event: RowEditEvent<Patient>) {
    console.log('Row edit started for patient:', event.data);
    this.helpersFunctions.notifyInfo('Edit Mode', `Editing patient: ${event.data.name || 'Unknown'}`);
  }

  onRowEditSave(event: RowEditEvent<Patient>) {
    console.log('Row edit saved for patient:', event.data);
    if (event && event.data) {
      if (event.data.PK) {
        const patientID = event.data.PK.split("#");
        console.log(patientID);
        const patient = event.data;
        if (patientID[1]) {
          this.loading = true;
          this.patientsService.updatePatient(patientID[1], patient as CreateUpdatePatientRequest).subscribe({
            next: (updatedPatient) => {
              console.log(updatedPatient);
              this.loading = false
              this.helpersFunctions.notifySuccess("Patient Updated Successfully!")
            },
            error: () => { this.loading = false; this.patients = []; this.totalRecords = 0; }
          });
        }
      }
    }
  }

  onRowEditCancel(event: RowEditEvent<Patient>) {
    console.log('Row edit cancelled for patient:', event.data);
    this.helpersFunctions.notifyInfo('Edit Cancelled', `Changes to patient ${event.data.name || 'Unknown'} were discarded`);
  }

  loadPatients(e: any) {
    if (!e) return;

    if (e.rows && e.rows !== this.pageSize) {
      this.pageSize = e.rows;
      this.reset();
    }

    const newSortField = e.sortField ?? null;
    const newSortOrder: 1 | -1 | 0 = (e.sortOrder ?? 1) as 1 | -1 | 0;
    if (newSortField !== this.prevSortField || newSortOrder !== this.prevSortOrder) {
      this.prevSortField = newSortField;
      this.prevSortOrder = newSortOrder;
      this.reset();
    }

    const first = e.first || 0;
    this.page = Math.floor(first / this.pageSize);
    this.lastKey = this.pageKeys[this.page] || null;

    this.applyFilters(e.filters || {});
    (this.filters as any).sortField = newSortField;
    (this.filters as any).sortOrder = newSortOrder;

    this.filters = { ...this.filters, pageSize: this.pageSize, lastKey: this.lastKey };
    if (!this.lastKey) (this.filters as any).offset = first; else delete (this.filters as any).offset;

    this.fetch();
  }

  private fetch() {
    this.loading = true;
    this.patientsService.getPatientsPage(this.filters).pipe(takeUntil(this.destroy$)).subscribe({
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
      const f = Array.isArray(raw) ? raw[0] : raw;
      if (!f) continue;
      let { value, matchMode, operator } = f as { value: any; matchMode?: string; operator?: 'and' | 'or' };
      if (value instanceof Date) value = toYmd(value);
      if (typeof value === 'string') value = value.trim();
      if (isBlank(value)) continue;
      if (k === 'global') { (base as any).search = value; continue; }
      (base as any)[k] = { value, matchMode: matchMode ?? 'contains', operator: (operator as 'and' | 'or') ?? 'and' };
    }
    this.filters = base;
  }

  private reset() {
    this.page = 0;
    this.lastKey = null;
    this.pageKeys = [null];
    this.selectedPatients = [];
  }

  onSelectionChange(selectedRows: Patient[]) {
    this.selectedPatients = selectedRows;
  }

  getStatusSeverity(v?: string): 'success' | 'info' | 'warn' | 'danger' {
    switch ((v || '').toLowerCase().trim()) {
      case 'qualified': return 'success';
      case 'senior': return 'danger';
      case 'mid-senior': return 'info';
      case 'junior': return 'warn';
      default: return 'info';
    }
  }

  getGenderSeverity(v?: string): 'info' | 'danger' | 'secondary' {
    switch ((v || '').toLowerCase().trim()) {
      case 'male': return 'info';
      case 'female': return 'danger';
      case 'na': return 'secondary';
      default: return 'secondary';
    }
  }

  private pkToId(pk: string): string {
  const m = /^PATIENTS?#(.+)$/.exec(pk); // handles PATIENT# and PATIENTS#
  return m ? m[1] : (pk?.split('#')[1] ?? pk);
}


  deleteSelectedPatients() {
  const ids = Array.from(new Set(
    (this.selectedPatients || [])
      .map(p => this.pkToId(p.PK))
      .filter(Boolean)
  ));
  if (!ids.length) return;

  this.loading = true;

  const tasks = ids.map(id =>
    this.patientsService.deletePatient(id).pipe(catchError(() => of(null)))
  );

  forkJoin(tasks).subscribe({
    next: (results) => {
      const ok = results.filter(r => r !== null).length;
      const total = ids.length;
      this.loading = false;
      this.selectedPatients = [];
      this.helpersFunctions.notifySuccess(`${ok}/${total} patient(s) deleted`);
      this.refreshPatientTable();
    },
    error: () => {
      this.loading = false;
      this.selectedPatients = [];
      this.helpersFunctions.notifyInfo('Delete', 'Some items could not be deleted');
      this.refreshPatientTable();
    }
  });
}



  exportCSV() {
    this.tableCmp?.exportCSV();
  }

  openNewPatient() {
    const ref = this.dialog.open(NewPatient, {
      width: '50vw',
      modal: true,
      dismissableMask: true,
      data: { name: 'Sami' }
    });
    ref.onClose.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result) => {
      if (result) {
        this.lastResult = result;
        this.helpersFunctions.notifySuccess('Patient profile created successfully!');
        this.refreshPatientTable();
      }
    });
  }

  refreshPatientTable(): void {
    this.fetch();
  }

  clearSelection() {
    this.selectedPatients = [];
    this.tableCmp?.clearSelection();
  }

  getSelectedPatientIds(): string[] {
    return this.selectedPatients.map(p => p.PK);
  }

  isPatientSelected(patient: Patient): boolean {
    return this.selectedPatients.some(s => s.PK === patient.PK);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  patientColumns: TableColumn[] = [
    {
      field: 'name',
      header: 'Name',
      editable: true,
      editorType: this.EditorType.Text,
      pipe: 'titlecase',
      sortable: true,
      filterable: true
    },
    {
      field: 'gender',
      header: 'Gender',
      editable: true,
      editorType: this.EditorType.Autocomplete,
      editorOptions: this.GENDER_OPTIONS,
      customTemplate: true,
      filterable: true
    },
    {
      field: 'insurance',
      header: 'Insurance',
      editable: true,
      editorType: this.EditorType.Text,
      pipe: 'uppercase',
      filterable: true
    },
    {
      field: 'dob',
      header: 'Date of Birth',
      editable: true,
      editorType: this.EditorType.Date,
      type: 'date',
      pipe: 'date',
      dateFormat: 'MM/dd/yyyy',
      filterable: true
    },
    {
      field: 'status',
      header: 'Level',
      editable: true,
      editorType: this.EditorType.Autocomplete,
      editorOptions: this.STATUS_OPTIONS,
      customTemplate: true,
      filterable: true
    },
    {
      field: 'timestamp',
      header: 'Submitted Date',
      editable: false,
      type: 'date',
      pipe: 'date',
      dateFormat: 'MM/dd/yyyy',
      filterable: true
    }
  ];

  tableConfig: TableConfig = {
    title: 'Patient Management',
    showGlobalSearch: true,
    showClearButton: true,
    showToolbar: true,
    pageSizeOptions: [5, 10, 15, 25, 50, 100],
    defaultPageSize: 15,
    scrollHeight: '600px',
    emptyMessage: 'No patients found matching your criteria.',
    loadingMessage: 'Loading patient data...',
    showGridlines: true,
    rowHover: true,
    responsive: true,
    showResultsSummary: true,
    selectable: true,
    selectionMode: 'multiple',
    showSelectAll: true,
    editType: 'row' // Enable row editing
  };

  toolbarConfig: ToolbarConfig = {
    showNew: true,
    showDelete: true,
    showImport: true,
    showExport: true,
    newLabel: 'New Patient',
    deleteLabel: 'Delete Selected',
    importLabel: 'Import',
    exportLabel: 'Export'
  };
}
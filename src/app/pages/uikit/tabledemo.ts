// table-demo.component.ts

import { Component, AfterViewInit, OnDestroy, TemplateRef, ViewChild, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of, from, Subject, takeUntil } from 'rxjs';
import { catchError, finalize, map, mergeMap, toArray } from 'rxjs/operators';
import {
  GenericTableComponent,
  TableColumn,
  TableConfig,
  RowEditEvent,
  ToolbarConfig,
  QuickFilter
} from './tableplugin';
import {
  Patient,
  GetPatientsPageOpts,
  PatientsService,
  CreateUpdatePatientRequest
} from '../service/patients.service';
import { ConfirmationService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NewPatient } from '@/components/new-patient/new-patient';
import { Helpers } from '@/services/helpers';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

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
      (importUpload)="onImportPatients($event)"
      [quickFilters]="quickFilters"
      [activeQuickFilterId]="activeQuickFilterId"
      (quickFilterChange)="onQuickFilterChange($event)"
      (clearAll)="onClearAll()"
      [activeGender]="activeGender"
      (genderFilterChange)="onGenderFilterChange($event)"
      (exportClick)="exportCSV()"
      [visibleColumnFields]="visibleColumnFields"
      (columnsVisibilityChange)="visibleColumnFields = $event">
      <ng-template #statusTemplate let-value="value">
        <p-tag [value]="value | uppercase" [severity]="getStatusSeverity(value)"></p-tag>
      </ng-template>
      <ng-template #genderTemplate let-value="value">
        <p-tag [value]="value | titlecase" [severity]="getGenderSeverity(value)"></p-tag>
      </ng-template>
      <ng-template #actionsTemplate let-row="row" let-index="index"></ng-template>
    </app-generic-table>

    <p-confirmDialog key="global" appendTo="body" [baseZIndex]="200000"></p-confirmDialog>
  `
})
export class TableDemo implements AfterViewInit, OnDestroy {
  /* ------------------------------ ViewChilds ------------------------------ */
  @ViewChild('statusTemplate') statusTemplate!: TemplateRef<any>;
  @ViewChild('genderTemplate') genderTemplate!: TemplateRef<any>;
  @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<any>;
  @ViewChild(GenericTableComponent) tableCmp?: GenericTableComponent;

  /* -------------------------------- Consts -------------------------------- */
  EditorType = { Text: 'text', Date: 'date', Number: 'number', Textarea: 'textarea', Autocomplete: 'autocomplete' } as const;

  STATUS_OPTIONS = [
    { label: 'ADMITTED', value: 'admitted' },
    { label: 'STABLE', value: 'stable' },
    { label: 'UNDER TREATMENT', value: 'under treatment' },
    { label: 'DISCHARGED', value: 'discharged' },
    { label: 'DEAD', value: 'dead' }
  ] as const;

  GENDER_OPTIONS = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Prefer not to Answer', value: 'na' }
  ] as const;

  /* ------------------------------ Public state ---------------------------- */
  patients: Patient[] = [];
  selectedPatients: Patient[] = [];
  loading = true;
  totalRecords = 0;
  activeQuickFilterId: string | null = null;
  activeGender: 'male' | 'female' | null = null;
  visibleColumnFields: string[] = ['name', 'gender', 'insurance', 'dob', 'timestamp', 'status'];
  customTemplates: { [key: string]: TemplateRef<any> } = {};
  filters: GetPatientsPageOpts = { pageSize: 15, lastKey: null };

  quickFilters: QuickFilter[] = [
    { id: 'active', label: 'Active Patients', icon: 'pi pi-users', tooltip: 'status != dead, discharged' }
  ];

  /* ------------------------------ Private state --------------------------- */
  private reqSeq = 0;
  private lastKey: string | null = null;
  private pageKeys: (string | null)[] = [null];
  private page = 0;
  private pageSize = 15;
  private prevSortField: string | null = null;
  private prevSortOrder: 1 | -1 | 0 | null = null;
  private destroy$ = new Subject<void>();

  /* --------------------------- Injected services --------------------------- */
  private dialog = inject(DialogService);
  private destroyRef = inject(DestroyRef);
  private ref?: DynamicDialogRef;
  lastResult: unknown;

  constructor(
    private patientsService: PatientsService,
    private confirmationService: ConfirmationService,
    private helpersFunctions: Helpers
  ) { }

  /* ------------------------------ Lifecycle -------------------------------- */
  ngAfterViewInit(): void {
    this.customTemplates = { status: this.statusTemplate, gender: this.genderTemplate, actions: this.actionsTemplate };
    this.pageSize = this.tableConfig.defaultPageSize ?? 15;
    this.filters.pageSize = this.pageSize;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* --------------------------------- Table --------------------------------- */
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
    if (!this.lastKey) (this.filters as any).offset = first;
    else delete (this.filters as any).offset;

    delete (this.filters as any)['status.notEquals'];
    delete (this.filters as any)['status.equals'];
    delete (this.filters as any)['gender.equals'];

    if (this.activeQuickFilterId === 'active') {
      (this.filters as any)['status.notEquals'] = 'dead,discharged';
    } else if (this.activeQuickFilterId === 'nonactive') {
      (this.filters as any)['status.equals'] = 'dead,discharged';
    }

    if (this.activeGender === 'male' || this.activeGender === 'female') {
      (this.filters as any)['gender.equals'] = this.activeGender;
    }

    this.fetch();
  }

  private fetch() {
    this.loading = true;
    const seq = ++this.reqSeq;

    this.patientsService.getPatientsPage(this.filters).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        if (seq !== this.reqSeq) return;
        this.patients = r.data || [];
        this.totalRecords = r.totalCount || 0;
        if (r.lastKey) this.pageKeys[this.page + 1] = r.lastKey;
        else this.pageKeys = this.pageKeys.slice(0, this.page + 1);
        this.loading = false;
      },
      error: () => {
        if (seq !== this.reqSeq) return;
        this.loading = false;
        this.patients = [];
        this.totalRecords = 0;
      }
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

  /* ------------------------------ Row Editing ------------------------------ */
  onRowEditInit(event: RowEditEvent<Patient>) {
    console.log('Row edit started for patient:', event.data);
    this.helpersFunctions.notifyInfo('Edit Mode', `Editing patient: ${event.data.name || 'Unknown'}`);
  }

  onRowEditSave(event: RowEditEvent<Patient>) {
    console.log('Row edit saved for patient:', event.data);
    if (event?.data?.PK) {
      const patientID = event.data.PK.split('#');
      const patient = event.data;
      if (patientID[1]) {
        this.loading = true;
        this.patientsService.updatePatient(patientID[1], patient as CreateUpdatePatientRequest).subscribe({
          next: () => {
            this.loading = false;
            this.helpersFunctions.notifySuccess('Patient Updated Successfully!');
          },
          error: () => { this.loading = false; this.patients = []; this.totalRecords = 0; }
        });
      }
    }
  }

  onRowEditCancel(event: RowEditEvent<Patient>) {
    console.log('Row edit cancelled for patient:', event.data);
    this.helpersFunctions.notifyInfo('Edit Cancelled', `Changes to patient ${event.data.name || 'Unknown'} were discarded`);
  }

  /* --------------------------------- Actions ------------------------------- */
  deleteSelectedPatients() {
    if (!this.selectedPatients?.length) {
      this.helpersFunctions.notifyInfo('Warning', 'No patients selected for deletion');
      return;
    }

    this.confirmationService.confirm({
      key: 'global',
      header: 'Confirm Deletion',
      message: `Delete ${this.selectedPatients.length} selected patient(s)?`,
      icon: 'pi pi-exclamation-triangle',
      rejectButtonProps: { label: 'No', severity: 'secondary', variant: 'text' },
      acceptButtonProps: { label: 'Yes', severity: 'danger' },
      accept: () => {
        const ids = Array.from(new Set(this.selectedPatients.map(p => this.pkToId(p.PK)).filter(Boolean)));
        this.loading = true;

        const tasks = ids.map(id =>
          this.patientsService.deletePatient(id).pipe(
            map(() => ({ id, ok: true as const })),
            catchError(() => of({ id, ok: false as const }))
          )
        );

        forkJoin(tasks)
          .pipe(finalize(() => (this.loading = false)))
          .subscribe(results => {
            const failed = results.filter(r => !r.ok).length;
            this.selectedPatients = [];
            if (failed === 0) this.helpersFunctions.notifySuccess('Patient(s) profile delete successfully!');
            else this.helpersFunctions.notifyError('Delete failed', 'Could not delete patient(s) profile!');
            this.refreshPatientTable();
          });
      }
    });
  }

  exportCSV() {
    const ts = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    this.tableCmp?.exportCSV({
      selectionOnly: this.selectedPatients.length > 0,
      filename: `patients_${ts}`,
      applyPipes: true,
      columns: this.patientColumns.map(c => c.field)
    });
  }

  openNewPatient() {
    const ref = this.dialog.open(NewPatient, {
      width: '50vw',
      modal: true,
      dismissableMask: true,
      data: { name: 'Sami' },
      focusOnShow: false
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

  /* -------------------------------- Import --------------------------------- */
  onImportPatients(files: File[]) {
    const file = files?.[0];
    if (!file) return;

    this.loading = true;
    this.readWorkbook(file)
      .then(rows => {
        const { valid, skipped } = this.preparePatients(rows);
        const seen = new Set<string>();
        const unique = valid.filter(r => {
          if (seen.has(r.phone)) return false;
          seen.add(r.phone);
          return true;
        });

        this.confirmationService.confirm({
          key: 'global',
          header: 'Confirm Import',
          message: `Create ${unique.length} patient(s). Skipped ${skipped.length}. Proceed?`,
          icon: 'pi pi-exclamation-triangle',
          rejectButtonProps: { label: 'No', severity: 'secondary', variant: 'text' },
          acceptButtonProps: { label: 'Yes', severity: 'primary' },
          accept: () => this.bulkCreatePatients(unique),
          reject: () => { this.loading = false; }
        });
      })
      .catch(() => {
        this.loading = false;
        this.helpersFunctions.notifyError('Import failed', 'Could not read the file');
      });
  }

  private async readWorkbook(file: File): Promise<any[]> {
    const { read, utils } = await import('xlsx');
    const buf = await file.arrayBuffer();
    const wb = read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return utils.sheet_to_json(ws, { defval: '' });
  }

  private preparePatients(rows: any[]) {
    const accepted = new Set(['name', 'phone', 'dob', 'gender', 'insurance', 'job', 'licenseNumber', 'qatarID', 'qid']);
    const valid: any[] = [];
    const skipped: any[] = [];

    for (const r of rows) {
      const get = (k: string) => r[k] ?? r[k.toLowerCase()] ?? r[k.toUpperCase()];
      const name = String(get('name') || '').trim();
      const phone = String(get('phone') || '').replace(/\D/g, '');
      const qatarID = String(get('qatarID') ?? get('qid') ?? '').replace(/\D/g, '');
      const genderRaw = String(get('gender') || '').trim().toLowerCase();
      const gender = genderRaw.startsWith('m') ? 'male' : genderRaw.startsWith('f') ? 'female' : genderRaw.startsWith('prefer') ? 'na' : genderRaw || '';

      if (!name || !phone || !gender || !qatarID) { skipped.push(r); continue; }

      const dob = this.toISODate(get('dob'));
      const item: any = {
        name,
        phone,
        gender,
        qid: qatarID,
        insurance: String(get('insurance') || '').trim(),
        job: String(get('job') || '').trim(),
        licenseNumber: String(get('licenseNumber') || '').trim(),
        ...(dob ? { dob } : {})
      };

      for (const k of Object.keys(r)) { if (!accepted.has(k)) continue; }
      valid.push(item);
    }

    return { valid, skipped };
  }

  private toISODate(v: any): string | undefined {
    if (!v) return undefined;
    if (typeof v === 'string') {
      const s = v.trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
      const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
      if (m) {
        const [, d, mo, y] = m;
        const yr = (+y < 100) ? 2000 + +y : +y;
        const dt = new Date(yr, +mo - 1, +d);
        return isNaN(+dt) ? undefined : dt.toISOString().slice(0, 10);
      }
      const d = new Date(s);
      return isNaN(+d) ? undefined : d.toISOString().slice(0, 10);
    }
    if (typeof v === 'number' && isFinite(v)) {
      const epoch = new Date(Math.round((v - 25569) * 86400 * 1000));
      return isNaN(+epoch) ? undefined : epoch.toISOString().slice(0, 10);
    }
    return undefined;
  }

  private bulkCreatePatients(rows: any[]) {
    from(rows).pipe(
      mergeMap(r =>
        this.patientsService.createPatient(r).pipe(
          map(() => true),
          catchError(() => of(false))
        ),
        10
      ),
      toArray(),
      finalize(() => this.loading = false)
    ).subscribe(results => {
      const ok = results.filter(Boolean).length;
      const total = results.length;
      if (ok === total) this.helpersFunctions.notifySuccess('Import completed successfully.');
      else if (ok === 0) this.helpersFunctions.notifyError('Import failed', 'No patient was created.');
      else this.helpersFunctions.notifyError('Import partial', `${ok}/${total} patient(s) created.`);
      this.refreshPatientTable();
    });
  }

  /* ------------------------------ Quick Filters ---------------------------- */
  onClearAll() {
    this.activeQuickFilterId = null;
    this.activeGender = null;
    this.reset();
    this.filters = { pageSize: this.pageSize, lastKey: null, offset: 0 };
  }

  onQuickFilterChange(id: string | null) {
    this.activeQuickFilterId = id;
    this.reset();
    this.filters = { pageSize: this.pageSize, lastKey: null, offset: 0 };
    this.applyQuickFilters();
    this.fetch();
  }

  onGenderFilterChange(v: 'male' | 'female' | null) {
    this.activeGender = v;
    this.reset();
    this.filters = { pageSize: this.pageSize, lastKey: null, offset: 0 };
    this.applyQuickFilters();
    this.fetch();
  }

  private applyQuickFilters() {
    delete (this.filters as any)['status.notEquals'];
    if (this.activeQuickFilterId === 'active') {
      (this.filters as any)['status.notEquals'] = 'dead,discharged';
    } else if (this.activeQuickFilterId === 'nonactive') {
      (this.filters as any)['status.notEquals'] = 'admitted,stable, critical, "under treatment"';
    }

    delete (this.filters as any)['gender.equals'];
    if (this.activeGender === 'male' || this.activeGender === 'female') {
      (this.filters as any)['gender.equals'] = this.activeGender;
    }
  }

  /* ------------------------------ UI Helpers ------------------------------- */
  getStatusSeverity(v?: string): 'success' | 'info' | 'warn' | 'danger' | 'contrast' | 'secondary' {
    switch ((v || '').toLowerCase().trim()) {
      case 'stable': return 'success';
      case 'critical': return 'danger';
      case 'admitted': return 'info';
      case 'under treatment': return 'warn';
      case 'dead': return 'contrast';
      case 'discharged': return 'secondary';
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
    const m = /^PATIENTS?#(.+)$/.exec(pk);
    return m ? m[1] : (pk?.split('#')[1] ?? pk);
  }

  /* ------------------------------ Column defs ------------------------------ */
  patientColumns: TableColumn[] = [
    { field: 'name', header: 'Name', editable: true, editorType: this.EditorType.Text, pipe: 'titlecase', sortable: true, filterable: true },
    { field: 'gender', header: 'Gender', editable: true, editorType: this.EditorType.Autocomplete, editorOptions: this.GENDER_OPTIONS, customTemplate: true, filterable: true },
    { field: 'insurance', header: 'Insurance', editable: true, editorType: this.EditorType.Text, pipe: 'uppercase', filterable: true },
    { field: 'dob', header: 'Date of Birth', editable: true, editorType: this.EditorType.Date, type: 'date', pipe: 'date', dateFormat: 'MM/dd/yyyy', filterable: true },
    { field: 'status', header: 'Level', editable: true, editorType: this.EditorType.Autocomplete, editorOptions: this.STATUS_OPTIONS, customTemplate: true, filterable: true },
    { field: 'timestamp', header: 'Submitted Date', editable: false, type: 'date', pipe: 'date', dateFormat: 'MM/dd/yyyy', filterable: true }
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
    editType: 'row'
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

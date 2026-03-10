import { Component, AfterViewInit, OnDestroy, TemplateRef, ViewChild, DestroyRef, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { of, forkJoin, Subject } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { DialogService } from 'primeng/dynamicdialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { GenericTableComponent } from '../../pages/uikit/generic-table';
import type { TableColumn, TableConfig, RowEditEvent, FilterControl } from '../../interfaces/tableplugin.interfaces';
import type { Patient, GetPatientsPageOpts, CreateUpdatePatientRequest } from '../../pages/service/patients.service';
import { PatientsService } from '../../pages/service/patients.service';
import { ConfirmationService } from 'primeng/api';
import { HelpersService } from '@/services/helpers-service';
import { NewPatient } from './new-patient';
import { Router } from '@angular/router';

const EditorType = {
    Text: 'text',
    Date: 'date',
    Number: 'number',
    Textarea: 'textarea',
    Autocomplete: 'autocomplete',
    Time: 'time'
} as const;
const GENDER_OPTIONS = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Prefer not to Answer', value: 'na' }
] as const;
const PATIENT_STATUS_OPTIONS = [
    { label: 'ADMITTED', value: 'admitted' },
    { label: 'STABLE', value: 'stable' },
    { label: 'UNDER TREATMENT', value: 'under treatment' },
    { label: 'DISCHARGED', value: 'discharged' },
    { label: 'CRITICAL', value: 'critical' },
    { label: 'DEAD', value: 'dead' }
] as const;

const GENDER_SEVERITY: Record<string, 'info' | 'danger' | 'secondary'> = { male: 'info', female: 'danger', na: 'secondary' };
const STATUS_SEVERITY: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'contrast' | 'secondary'> = {
    admitted: 'info',
    stable: 'success',
    'under treatment': 'warn',
    discharged: 'secondary',
    critical: 'danger',
    dead: 'contrast'
};

@Component({
    selector: 'app-patients-management',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, GenericTableComponent, TagModule, ConfirmDialogModule, ButtonModule, TooltipModule],
    providers: [DialogService, ConfirmationService],
    template: `
        <ng-template #tbStart let-api="api" let-selected="selected">
            <p-button class="mr-2" [disabled]="loading()" label="New Patient" icon="pi pi-plus" (onClick)="openNew()"></p-button>
            <p-button class="mr-2" [disabled]="!selected?.length" label="Delete Selected" icon="pi pi-trash" severity="danger" (onClick)="deleteSelected('soft')"></p-button>
            @if (this.isDeveloper) {
                <p-button class="mr-2" [disabled]="!selected?.length" label="Hard Delete Selected Patients" icon="pi pi-trash" severity="contrast" (onClick)="deleteSelected('hard')"></p-button>
            }
            <input type="file" #fileInput accept=".xlsx,.xls,.csv" (change)="onImportFromFileInput($event)" hidden />
            <p-button class="mr-2" label="Import Patient(s) Data" icon="pi pi-download" severity="secondary" (onClick)="fileInput.click()"></p-button>
            <p-button class="mr-2" label="Download Patient Template" icon="pi pi-file-excel" severity="secondary" (onClick)="downloadTemplate()"></p-button>
        </ng-template>

        <ng-template #tbEnd>
            <p-button label="Export Patients Data to Excel" icon="pi pi-download" severity="secondary" (onClick)="exportExcel()"></p-button>
        </ng-template>

        <ng-template #rowActions let-row let-editing="editing" let-api="api" let-rowIndex="rowIndex">
            @if (!editing) {
                <p-button icon="pi pi-pencil" text (onClick)="beginEdit(row, rowIndex, api)" pTooltip="Edit"></p-button>
                <p-button icon="pi pi-trash" text severity="danger" class="ml-2" (onClick)="deleteRow(row)" pTooltip="Delete"></p-button>
                <p-button icon="pi pi-eye" text severity="info" (onClick)="viewProfile(row)" pTooltip="View Profile"></p-button>
            } @else {
                <p-button icon="pi pi-check" text severity="success" (onClick)="saveRow(row, rowIndex, api)" pTooltip="Save"></p-button>
                <p-button icon="pi pi-times" text severity="danger" (onClick)="cancelEdit(row, rowIndex, api)" pTooltip="Cancel"></p-button>
            }
        </ng-template>

        <app-generic-table
            [columns]="columns"
            [config]="config"
            [data]="rows()"
            [totalRecords]="totalRecords()"
            [loading]="loading()"
            [customTemplates]="customTemplates()"
            [selectedRows]="selected()"
            [filterControls]="filterControls"
            [activeFilters]="activeFilters"
            (filterControlChange)="onFilterControlChange($event)"
            [visibleColumnFields]="visibleCols()"
            (columnsVisibilityChange)="visibleCols.set($event)"
            [actionsTemplate]="rowActions"
            [toolbarStart]="tbStart"
            [toolbarEnd]="tbEnd"
            dataKey="PK"
            (lazyLoad)="load($event)"
            (selectionChange)="selected.set($event)"
            (rowEditInit)="onRowEditInit($event)"
            (rowEditSave)="onRowEditSave($event)"
            (rowEditCancel)="onRowEditCancel($event)"
        >
            <ng-template #statusTemplate let-value="value">
                <p-tag [value]="value || '' | uppercase" [severity]="getStatusSeverity(value)"></p-tag>
            </ng-template>
            <ng-template #genderTemplate let-value="value">
                <p-tag [value]="value || '' | titlecase" [severity]="getGenderSeverity(value)"></p-tag>
            </ng-template>
        </app-generic-table>

        <p-confirmDialog key="global" appendTo="body" [baseZIndex]="200000"></p-confirmDialog>
    `
})
export class PatientsManagementComponent implements AfterViewInit, OnDestroy {
    @ViewChild(GenericTableComponent) tableCmp?: GenericTableComponent;
    @ViewChild('statusTemplate') statusTemplate!: TemplateRef<any>;
    @ViewChild('genderTemplate') genderTemplate!: TemplateRef<any>;

    private destroyRef = inject(DestroyRef);
    private destroy$ = new Subject<void>();
    private router = inject(Router);

    // signals
    private _rows = signal<Patient[]>([]);
    private _selected = signal<Patient[]>([]);
    private _loading = signal<boolean>(true);
    private _totalRecords = signal<number>(0);
    private originalRowData: Map<string, any> = new Map();
    isDeveloper = false; // Set this based on user groups/roles
    rows = this._rows.asReadonly();
    selected = this._selected;
    loading = this._loading.asReadonly();
    totalRecords = this._totalRecords.asReadonly();
    visibleCols = signal<string[]>(['name', 'bloodGroup', 'gender', 'phone', 'qid', 'dob', 'status', 'bedNumber', 'ward']);

    private _customTemplates = signal<{ [k: string]: TemplateRef<any> }>({});
    customTemplates = this._customTemplates;
    ALLOWED_STATUS = new Set(['admitted', 'stable', 'under treatment', 'discharged', 'critical', 'dead']);
    PHONE_REGEX = /^[0-9]{1,15}$/;

    // map display labels -> backend field names
    LABEL_TO_FIELD: Record<string, string> = {
        'date of birth': 'dob',
        'admission date': 'admissionDate',
        status: 'status',
        'qatar id': 'qid',
        'submitted date': 'timestamp'
    };

    // table config & columns (name frozen, tooltips opt-in via showTooltip)
    config: TableConfig = {
        title: 'Patients Management',
        showGlobalSearch: true,
        showClearButton: true,
        showToolbar: true,
        pageSizeOptions: [5, 10, 15, 25, 50, 100],
        defaultPageSize: 15,
        scrollHeight: '600px',
        emptyMessage: 'No rows found.',
        loadingMessage: 'Loading...',
        showGridlines: true,
        rowHover: true,
        responsive: true,
        showResultsSummary: true,
        selectable: true,
        selectionMode: 'multiple',
        showSelectAll: true,
        editType: 'row',
        showColumnPicker: true
    };

    columns: TableColumn[] = [
        { field: 'name', header: 'Name', editable: true, editorType: EditorType.Text, pipe: 'titlecase', sortable: true, filterable: true, width: '200px' },
        { field: 'email', header: 'Email', editable: true, editorType: EditorType.Text, pipe: 'lowercase', sortable: true, filterable: true, width: '200px' },
        { field: 'gender', header: 'Gender', editable: true, editorType: EditorType.Autocomplete, editorOptions: GENDER_OPTIONS, customTemplate: true, filterable: true },
        { field: 'insurance', header: 'Insurance', editable: true, editorType: EditorType.Text, pipe: 'titlecase', showTooltip: true, filterable: true },
        { field: 'department', header: 'Department', editable: true, editorType: EditorType.Text, pipe: 'titlecase', showTooltip: true, filterable: true },
        { field: 'specialization', header: 'Specialization', editable: true, editorType: EditorType.Text, pipe: 'titlecase', showTooltip: true, filterable: true },
        { field: 'phone', header: 'Phone', editable: true, editorType: EditorType.Text, filterable: true },
        { field: 'qid', header: 'Qatar ID', editable: true, editorType: EditorType.Text, filterable: true },
        { field: 'dob', header: 'Date of Birth', editable: true, editorType: EditorType.Date, type: 'date', pipe: 'date', dateFormat: 'MM/dd/yyyy', filterable: true },
        { field: 'admissionDate', header: 'Admission Date', editable: true, editorType: EditorType.Date, type: 'date', pipe: 'date', dateFormat: 'MM/dd/yyyy', filterable: true },
        { field: 'status', header: 'Status', editable: true, editorType: EditorType.Autocomplete, editorOptions: PATIENT_STATUS_OPTIONS, customTemplate: true, filterable: true },
        { field: 'notes', header: 'Notes', editable: true, editorType: EditorType.Textarea, showTooltip: true, filterable: true },
        { field: 'medicalHistory', header: 'Medical History', editable: true, editorType: EditorType.Textarea, pipe: 'titlecase', showTooltip: true, filterable: true },
        { field: 'allergies', header: 'Allergies', editable: true, editorType: EditorType.Text, showTooltip: true, filterable: true },
        { field: 'medications', header: 'Medications', editable: true, editorType: EditorType.Textarea, pipe: 'titlecase', showTooltip: true, filterable: true },
        { field: 'bloodGroup', header: 'Blood Group', editable: true, editorType: EditorType.Text, filterable: true },
        { field: 'bedNumber', header: 'Bed Number', editable: true, editorType: EditorType.Text, filterable: false },
        { field: 'ward', header: 'Ward', editable: true, editorType: EditorType.Text, filterable: true },
        { field: 'timestamp', header: 'Submitted Date', editable: false, type: 'date', pipe: 'date', dateFormat: 'MM/dd/yyyy', filterable: true }
    ];

    // server query state
    private prevSortField: string | null = null;
    private prevSortOrder: 1 | -1 | 0 | null = null;
    private pageSize = this.config.defaultPageSize || 15;
    filters: GetPatientsPageOpts = { pageSize: this.pageSize, lastKey: null };
    activeFilters: { status: 'active' | 'nonactive' | null; gender: 'male' | 'female' | null } = { status: null, gender: null };

    // quick filters
    filterControls: FilterControl[] = [
        { id: 'status', type: 'cycle', icon: 'pi pi-users', tooltip: 'Toggle status', outlined: true, values: [null, 'active', 'nonactive'], getLabel: (v) => (v === 'active' ? 'Non-Active' : v === 'nonactive' ? 'All' : 'Active') },
        { id: 'gender', type: 'cycle', icon: 'pi pi-user', tooltip: 'Cycle gender', outlined: true, values: [null, 'male', 'female'], getLabel: (v) => (v === 'male' ? 'Female' : v === 'female' ? 'All' : 'Male') }
    ];

    constructor(
        private patients: PatientsService,
        private confirm: ConfirmationService,
        private helpers: HelpersService,
        private dialog: DialogService
    ) {
        const token = sessionStorage.getItem('accessToken') || '';

        if (this.isJwt(token)) {
            try {
                const payload = JSON.parse(this.b64url(token.split('.')[1]));
                console.log(payload);
                const groups: string[] = payload['cognito:groups'] ?? [];
                if (groups.includes('Patients')) console.log('Logged in user is a patient!');
                else if (groups.includes('Doctors')) console.log('Logged in user is a doctor!');
                else if (groups.includes('Developers')) {
                    this.isDeveloper = true;
                    console.log('Logged in user is a developer!');
                }
            } catch {
                // ignore malformed payloads
            }
        }
    }

    private isJwt(t: string) {
        return !!t && t.split('.').length === 3;
    }
    private b64url(s: string) {
        const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
        return atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
    }

    ngAfterViewInit() {
        this._customTemplates.set({ status: this.statusTemplate, gender: this.genderTemplate });
        this.filters.pageSize = this.pageSize;
        this.load({ first: 0, rows: this.pageSize });
    }
    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    viewProfile(row: Patient) {
        // Extract just the UUID part after PATIENT#
        const id = row.PK.includes('#') ? row.PK.split('#')[1] : row.PK;
        this.router.navigate(['/patient-profile', id]);
    }

    // toolbar actions
    async exportExcel(): Promise<void> {
        const XLSX = await import('xlsx');

        // Use _rows() signal for all data, or _selected() for selected rows
        const allData: Patient[] = this._rows();
        const dataToExport: Patient[] = this._selected().length > 0 ? this._selected() : allData;

        if (!dataToExport || dataToExport.length === 0) {
            this.helpers.notifyWarning('No Data');
            return;
        }

        // Use your existing columns configuration
        const fields: string[] = this.columns.map((c: TableColumn) => c.field).filter((field): field is string => Boolean(field));

        const headers: string[] = this.columns.map((c: TableColumn) => c.header || c.field);

        // Map data to rows
        const rows: any[][] = dataToExport.map((item: Patient) =>
            fields.map((field: string) => {
                const value: any = (item as any)[field];
                return Array.isArray(value) ? value.join(', ') : (value ?? '');
            })
        );

        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        ws['!cols'] = headers.map((h: string) => ({
            wch: Math.max(12, String(h).length + 2)
        }));

        // Create workbook and download
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Patients');

        const ts: string = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
        const selectionText = this._selected().length > 0 ? '_selected' : '';
        XLSX.writeFile(wb, `patients${selectionText}_${ts}.xlsx`);

        this.helpers.notifySuccess('Export Successful');
    }

    async downloadTemplate() {
        const XLSX = await import('xlsx');

        // Define all columns in the exact order matching the upload format
        const headers = ['name', 'email', 'dob', 'gender', 'phone', 'qid', 'insurance', 'specialization', 'department', 'status', 'admissionDate', 'notes', 'medicalHistory', 'allergies', 'medications', 'bedNumber', 'ward', 'bloodGroup'];

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers]);

        // Set column widths for better readability
        const columnWidths = [
            { wch: 25 }, // name
            { wch: 25 }, // email
            { wch: 12 }, // dob
            { wch: 10 }, // gender
            { wch: 18 }, // phone
            { wch: 13 }, // qid
            { wch: 25 }, // insurance
            { wch: 20 }, // specialization
            { wch: 20 }, // department
            { wch: 12 }, // status
            { wch: 13 }, // admissionDate
            { wch: 50 }, // notes
            { wch: 55 }, // medicalHistory
            { wch: 30 }, // allergies
            { wch: 50 }, // medications
            { wch: 12 }, // bedNumber
            { wch: 20 }, // ward
            { wch: 10 } // bloodGroup
        ];

        ws['!cols'] = columnWidths;

        // Optional: Add a sample row with example data as guidance
        const sampleRow = [
            'Ahmed Hassan', // name
            'ahmed@hospital.com', // email
            '1990-03-15', // dob
            'Male', // gender
            '+974-5512-3456', // phone
            '28503156789', // qid (11 digits)
            'Qatar Insurance Company', // insurance
            'Cardiology', // specialization
            'Cardiovascular', // department
            'admitted', // status
            '2024-01-15', // admissionDate
            'Post-operative care', // notes
            'History of hypertension', // medicalHistory
            'Aspirin allergy', // allergies
            'Metoprolol, Lisinopril', // medications
            'A101', // bedNumber
            'Cardiology Ward', // ward
            'O+' // bloodGroup
        ];

        // Add sample row (comment this out if you want empty template)
        XLSX.utils.sheet_add_aoa(ws, [sampleRow], { origin: 'A2' });

        // Add the worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Patients');

        // Download the file
        XLSX.writeFile(wb, 'patients_import_template.xlsx');

        this.helpers.notifySuccess('Template Downloaded');
    }
    openNew() {
        const ref = this.dialog.open(NewPatient, { width: '90vw', height: '100vh', modal: true, dismissableMask: true, data: { kind: 'patients' }, focusOnShow: false });
        if (ref) {
            ref.onClose.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((r) => {
                if (r) {
                    this.helpers.notifySuccess('Patient created');
                    this.fetch();
                }
            });
        }
    }

    deleteSelected(deletionOption: 'hard' | 'soft') {
        const sel = this._selected();

        if (!sel?.length) {
            this.helpers.notifyInfo('Warning', 'No rows selected');
            return;
        }

        this.confirm.confirm({
            key: 'global',
            header: 'Confirm Deletion',
            message: `Delete ${sel.length} selected?`,
            icon: 'pi pi-exclamation-triangle',
            rejectButtonProps: {
                label: 'No',
                severity: 'secondary',
                variant: 'text'
            },
            acceptButtonProps: {
                label: 'Yes',
                severity: 'danger'
            },
            accept: () => {
                const ids = Array.from(new Set(sel.map((p) => this.pkToId(p.PK)).filter((id): id is string => !!id)));

                this._loading.set(true);

                let hasRedirected = false;

                const handleUnauthorized = (err: any) => {
                    if (err?.error?.message == 'Unauthorized' && !hasRedirected) {
                        hasRedirected = true;
                        this.helpers.redirectToLogin();
                    }
                };

                const request$ =
                    deletionOption === 'hard'
                        ? this.patients.hardDeletePatient(ids).pipe(
                              map(() => ids.map(() => true)),
                              catchError((err) => {
                                  handleUnauthorized(err);
                                  return of(ids.map(() => false));
                              })
                          )
                        : forkJoin(
                              ids.map((id) =>
                                  this.patients.deletePatient(id).pipe(
                                      map(() => true),
                                      catchError((err) => {
                                          handleUnauthorized(err);
                                          return of(false);
                                      })
                                  )
                              )
                          );

                request$.pipe(finalize(() => this._loading.set(false))).subscribe((res) => {
                    const successCount = res.filter(Boolean).length;

                    this._selected.set([]);

                    if (successCount === res.length) {
                        this.helpers.notifySuccess('Deleted');
                    } else {
                        this.helpers.notifyError('Delete failed', 'Some items could not be deleted');
                    }

                    this.fetch();
                });
            }
        });
    }

    // row actions
    onFilterControlChange(e: { id: string; value: any }) {
        (this.activeFilters as any)[e.id] = e.value;
        this.filters = { pageSize: this.pageSize, lastKey: null, offset: 0 };
        this.load({ first: 0, rows: this.pageSize, sortField: this.prevSortField, sortOrder: this.prevSortOrder, filters: {} });
    }

    onRowEditSave(_: RowEditEvent<Patient>) {}

    // Add this method to handle edit button click
    beginEdit(row: Patient, rowIndex: number, api: any) {
        const id = this.pkToId((row as any).PK || '');
        console.log('beginEdit - ID:', id);

        if (id) {
            // Find and clone the ORIGINAL row from _rows() before table mutates it
            const originalRow = this._rows().find((r) => this.pkToId((r as any).PK) === id);
            if (originalRow) {
                const clone = JSON.parse(JSON.stringify(originalRow));
                this.originalRowData.set(id, clone);
                console.log('✅ Stored original data for ID:', id, clone);
            }
        }

        // Now trigger the table's edit mode
        api.beginRowEdit(row, rowIndex);
    }

    // Add this method to handle cancel
    cancelEdit(row: Patient, rowIndex: number, api: any) {
        const id = this.pkToId((row as any).PK || '');
        console.log('cancelEdit - ID:', id);

        if (id) {
            this.originalRowData.delete(id);
        }

        api.cancelRowEdit(row, rowIndex);
        this.helpers.notifyInfo('Edit Cancelled', `Discarded changes for ${row.name || 'Unknown'}`);
    }

    // Keep your existing saveRow method as is
    saveRow(row: Patient, rowIndex: number, api: any) {
        const id = this.pkToId((row as any)?.PK || '');
        console.log('saveRow - ID:', id);

        if (!id) {
            this.helpers.notifyError('Save failed', 'Missing id');
            return;
        }

        const originalData = this.originalRowData.get(id);
        console.log('saveRow - Original:', originalData);
        console.log('saveRow - Current:', row);

        if (!originalData) {
            this.helpers.notifyError('Save failed', 'Original data not found');
            return;
        }

        const changedFields: any = {};

        const allFields = ['name', 'email', 'dob', 'gender', 'phone', 'qid', 'job', 'insurance', 'department', 'specialization', 'status', 'admissionDate', 'notes', 'medicalHistory', 'allergies', 'medications', 'bedNumber', 'ward'];

        let hasChanges = false;

        for (const field of allFields) {
            let newValue = (row as any)[field];
            let oldValue = originalData[field];

            // Normalize values for comparison
            const normalizeValue = (val: any) => {
                if (val === null || val === undefined || val === '') return null;
                if (typeof val === 'string') return val.trim().toLowerCase();
                if (val instanceof Date) return val.toISOString().slice(0, 10);
                if (Array.isArray(val)) return JSON.stringify(val.sort());
                return val;
            };

            const normalizedNew = normalizeValue(newValue);
            const normalizedOld = normalizeValue(oldValue);

            if (normalizedNew !== normalizedOld) {
                console.log(`✏️ Field "${field}" changed:`, {
                    old: normalizedOld,
                    new: normalizedNew,
                    rawOld: oldValue,
                    rawNew: newValue
                });
                changedFields[field] = newValue;
                hasChanges = true;
            }
        }

        if (!hasChanges) {
            console.warn('⚠️ No changes detected!');
            this.helpers.notifyInfo('No Changes', 'No fields were modified');
            api.cancelRowEdit(row, rowIndex);
            this.originalRowData.delete(id);
            return;
        }

        // Convert comma-separated strings to arrays for allergies and medications
        if (typeof changedFields.allergies === 'string') {
            changedFields.allergies = changedFields.allergies
                .split(',')
                .map((s: string) => s.trim())
                .filter(Boolean);
        }
        if (typeof changedFields.medications === 'string') {
            changedFields.medications = changedFields.medications
                .split(',')
                .map((s: string) => s.trim())
                .filter(Boolean);
        }

        console.log('📤 Sending changed fields:', changedFields);

        this._loading.set(true);
        this.patients.updatePatient(id, changedFields as CreateUpdatePatientRequest).subscribe({
            next: () => {
                this._loading.set(false);
                api.saveRowEdit(row, rowIndex);
                this.originalRowData.delete(id);
                this.helpers.notifySuccess(`${new TitleCasePipe().transform(row?.name ?? '')} updated`);
                this.fetch();
            },
            error: (err) => {
                if (err.error.message == 'Unauthorized') {
                    this.helpers.redirectToLogin();
                    return;
                } else {
                    this._loading.set(false);
                    api.cancelRowEdit(row, rowIndex);
                    this.originalRowData.delete(id);
                    this.helpers.notifyError('Update failed', err?.error?.message || 'Could not save');
                }
            }
        });
    }

    onRowEditInit(ev: RowEditEvent<Patient>) {
        // This might not be called, but keep it as a fallback
        console.log('⚠️ onRowEditInit called (fallback)');
    }

    onRowEditCancel(ev: RowEditEvent<Patient>) {
        // This might not be called, but keep it as a fallback
        console.log('⚠️ onRowEditCancel called (fallback)');
    }
    deleteRow(row: Patient) {
        const id = this.pkToId((row as any)?.PK || '');
        if (!id) {
            this.helpers.notifyError('Delete failed', 'Missing id');
            return;
        }
        this.confirm.confirm({
            key: 'global',
            header: 'Confirm Deletion',
            message: `Delete ${new TitleCasePipe().transform(row?.name ?? '')}?`,
            icon: 'pi pi-exclamation-triangle',
            rejectButtonProps: { label: 'No', severity: 'secondary', variant: 'text' },
            acceptButtonProps: { label: 'Yes', severity: 'danger' },
            accept: () => {
                this._loading.set(true);
                this.patients
                    .deletePatient(id)
                    .pipe(finalize(() => this._loading.set(false)))
                    .subscribe({
                        next: () => {
                            this.helpers.notifySuccess(`${new TitleCasePipe().transform(row.name)} Deleted`);
                            this.fetch();
                        },
                        error: (err) => {
                            if (err?.error?.message == 'Unauthorized') {
                                this.helpers.redirectToLogin();
                                return;
                            }
                            this.helpers.notifyError('Delete failed', 'Could not delete');
                        }
                    });
            }
        });
    }

    // table -> server bridge
    load(e: any) {
        if (!e) return;
        if (e.rows && e.rows !== this.pageSize) {
            this.pageSize = e.rows;
            this.filters.pageSize = this.pageSize;
        }
        const sf = e.sortField ?? null,
            so: 1 | -1 | 0 = e.sortOrder ?? 1;
        const sortChanged = sf !== this.prevSortField || so !== this.prevSortOrder;
        this.prevSortField = sf;
        this.prevSortOrder = so;

        const first = e.first || 0;
        const base: any = { pageSize: this.pageSize, offset: first, sortField: sf, sortOrder: so };

        // map primeng filters
        if (e.filters?.global?.value) base.search = String(e.filters.global.value).trim();
        for (const [k, f] of Object.entries<any>(e.filters || {})) {
            if (k === 'global' || !f?.value) continue;
            base[k] = { value: f.value, matchMode: f.matchMode ?? 'contains', operator: f.operator ?? 'and' };
        }

        // quick toggles: active = NOT (dead|discharged), nonactive = (dead|discharged)
        delete base['status.notEquals'];
        delete base['status.equals'];
        delete base['gender.equals'];
        if (this.activeFilters.status === 'active') base['status.notEquals'] = 'dead,discharged';
        else if (this.activeFilters.status === 'nonactive') base['status.equals'] = 'dead,discharged';
        if (this.activeFilters.gender) base['gender.equals'] = this.activeFilters.gender;

        this.filters = base;
        if (sortChanged) this.filters.lastKey = null; // keep it simple
        this.fetch();
    }
    private fetch() {
        this._loading.set(true);
        this.patients.getPatientsPage(this.filters).subscribe({
            next: (r) => {
                console.log(r);
                this._rows.set(r.data || []);
                this._totalRecords.set(r.totalCount || 0);
                this._loading.set(false);
            },
            error: (err) => {
                if (err?.error?.message == 'Unauthorized') {
                    this.helpers.redirectToLogin();
                    return;
                }
                this._rows.set([]);
                this._totalRecords.set(0);
                this._loading.set(false);
            }
        });
    }
    refresh() {
        this.fetch();
    }

    // import
    onImportFromFileInput(ev: Event) {
        const list = (ev.target as HTMLInputElement).files;
        if (!list?.length) return;
        this.onImport(Array.from(list));
        (ev.target as HTMLInputElement).value = '';
    }

    onImport(input: File[] | { files?: File[] } | Event) {
        const files: File[] = Array.isArray(input) ? input : (((input as any)?.files as File[]) ?? []);
        const file = files?.[0];
        if (!file) return;

        this._loading.set(true);
        this.readWorkbook(file)
            .then((rows) => {
                const { valid, skipped } = this.prepare(rows);

                // de-dup using QID (required and unique by validation)
                const seen = new Set<string>();
                const unique = valid.filter((r) => {
                    const k = r.qid as string;
                    if (!k || seen.has(k)) return false;
                    seen.add(k);
                    return true;
                });

                if (!unique.length) {
                    this._loading.set(false);
                    const sample = skipped
                        .slice(0, 5)
                        .map((e, i) => `${i + 1}) ${e.reason}`)
                        .join(' | ');
                    this.helpers.notifyError('Import aborted', sample || 'No valid rows.');
                    return;
                }

                const errSummary = skipped.length
                    ? ` Skipped ${skipped.length}. ${skipped
                          .slice(0, 3)
                          .map((s) => s.reason)
                          .join(' | ')}`
                    : '';

                this.confirm.confirm({
                    key: 'global',
                    header: 'Confirm Import',
                    message: `Create ${unique.length} patient(s).${errSummary}`,
                    icon: 'pi pi-exclamation-triangle',
                    rejectButtonProps: { label: 'No', severity: 'secondary', variant: 'text' },
                    acceptButtonProps: { label: 'Yes', severity: 'primary' },
                    accept: () => this.bulkCreate(unique),
                    reject: () => this._loading.set(false)
                });
            })
            .catch(() => {
                this._loading.set(false);
                this.helpers.notifyError('Import failed', 'Could not read file');
            });
    }

    prepare(rows: any[]): { valid: any[]; skipped: { row: any; reason: string }[] } {
        const valid: any[] = [];
        const skipped: { row: any; reason: string }[] = [];

        const lc = (x: any) => (typeof x === 'string' && x.trim() ? x.trim().toLowerCase() : null);
        const sanitizePhone = (x: any): string | null => {
            const s = String(x ?? '').trim();
            if (!s) return null;
            const sign = s.startsWith('+') ? '+' : '';
            const digits = s.replace(/\D/g, '');
            return digits ? sign + digits : null;
        };
        const toISODate = (v: any): string | null => {
            if (!v) return null;
            if (v instanceof Date && !isNaN(+v)) return v.toISOString().slice(0, 10);
            const s = String(v).trim();
            if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
            const d = new Date(s);
            return isNaN(+d) ? null : d.toISOString().slice(0, 10);
        };

        rows.forEach((row, index) => {
            const rowNum = index + 2; // Excel row number (1-indexed + header)
            const errors: string[] = [];

            // Required field validations
            // name: required, min 3 chars
            if (!row.name || typeof row.name !== 'string' || row.name.trim().length < 3) {
                errors.push('Name required (min 3 chars)');
            }

            // dob: required
            if (!row.dob) {
                errors.push('DOB required');
            }

            // phone: required
            const phone = sanitizePhone(row.phone);
            if (!phone) {
                errors.push('Phone required');
            }

            // qid: required, must be exactly 11 digits
            const qidStr = String(row.qid || '').replace(/\D/g, '');
            if (!qidStr || !/^\d{11}$/.test(qidStr)) {
                errors.push('QID required (11 digits)');
            }

            if (errors.length > 0) {
                skipped.push({
                    row,
                    reason: `Row ${rowNum}: ${errors.join(', ')}`
                });
            } else {
                // Build valid patient object with all fields
                const patient: any = {
                    // Required fields
                    name: row.name?.trim().toLowerCase(),
                    dob: toISODate(row.dob) ?? row.dob,
                    phone: phone,
                    qid: qidStr,

                    // Optional fields (include if present)
                    email: row.email?.trim().toLowerCase() || null,
                    gender: lc(row.gender),
                    job: row.job?.trim() || null,
                    insurance: row.insurance?.trim().toLowerCase() || null,
                    specialization: row.specialization?.trim().toLowerCase() || null,
                    department: row.department?.trim().toLowerCase() || null,
                    status: lc(row.status),
                    admissionDate: toISODate(row.admissionDate),
                    notes: row.notes?.trim() || null,
                    medicalHistory: row.medicalHistory?.trim() || null,
                    allergies: row.allergies?.trim() || null,
                    medications: row.medications?.trim() || null,
                    bedNumber: row.bedNumber?.trim() || null,
                    ward: row.ward?.trim() || null,
                    bloodGroup: row.bloodGroup?.trim() || null
                };

                valid.push(patient);
            }
        });

        return { valid, skipped };
    }

    private async readWorkbook(file: File) {
        const XLSX = await import('xlsx');
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        // strings for safety; empty cells stay ''
        return XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
    }

    private toISODate(v: unknown): string | undefined {
        if (v == null || v === '') return undefined;
        if (v instanceof Date && !isNaN(+v)) return v.toISOString().slice(0, 10);
        if (typeof v === 'number' && isFinite(v)) {
            const d = new Date(Math.round((v - 25569) * 86400 * 1000));
            return isNaN(+d) ? undefined : d.toISOString().slice(0, 10);
        }
        if (typeof v === 'string') {
            const s = v.trim();
            if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
            const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
            if (m) {
                const [, d, mo, y] = m;
                const yr = +y < 100 ? 2000 + +y : +y;
                const dt = new Date(yr, +mo - 1, +d);
                return isNaN(+dt) ? undefined : dt.toISOString().slice(0, 10);
            }
            const d2 = new Date(s);
            return isNaN(+d2) ? undefined : d2.toISOString().slice(0, 10);
        }
        return undefined;
    }

    // ---------- helpers ----------
    private onlyDigits(v: unknown): string {
        return String(v ?? '').replace(/\D/g, '');
    }

    private parseDateAny(v: unknown): Date | null {
        if (v == null || v === '') return null;

        // Excel serial number
        if (typeof v === 'number' && isFinite(v)) {
            const ms = Math.round((v - 25569) * 86400 * 1000);
            const d = new Date(ms);
            return Number.isNaN(+d) ? null : d;
        }

        const s = String(v).trim();
        if (!s) return null;

        // ISO date or ISO with time: YYYY-MM-DD or YYYY-MM-DD HH:mm:ss
        const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T]\d{2}:\d{2}:\d{2})?$/);
        if (iso) return new Date(`${iso[1]}-${iso[2]}-${iso[3]}`);

        // Native Date parse as a fallback
        const d0 = new Date(s);
        if (!Number.isNaN(+d0)) return d0;

        // dd/mm/yyyy or mm/dd/yyyy with / - .
        const m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
        if (m) {
            const [, a, b, c] = m;
            const dd = +a,
                mm = +b,
                yy = +c < 100 ? 2000 + +c : +c;
            const d = new Date(yy, mm - 1, dd);
            return Number.isNaN(+d) ? null : d;
        }

        return null;
    }

    private toISODateOnly(d: Date | string | null | undefined): string | undefined {
        const x = typeof d === 'string' ? new Date(d) : d;
        if (!x || Number.isNaN(+x)) return undefined;
        return new Date(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate())).toISOString().slice(0, 10);
    }

    private normalizeKeys(r: any): Record<string, unknown> {
        const out: Record<string, unknown> = {};
        for (const k of Object.keys(r ?? {})) {
            const low = String(k).trim().toLowerCase();
            const mapped = this.LABEL_TO_FIELD[low] ?? low; // << changed: fallback to lowercase key
            out[mapped] = (r as any)[k];
        }
        return out;
    }

    private getStr(obj: Record<string, unknown>, key: string): string {
        return String(obj[key] ?? '').trim();
    }

    private bulkCreate(rows: any[]) {
        console.log('[Import] Starting bulk create for', rows.length, 'patients');
        this.patients
            .createPatient({ patients: rows })
            .pipe(finalize(() => this._loading.set(false)))
            .subscribe({
                next: () => {
                    this.helpers.notifySuccess(`Import completed: ${rows.length}/${rows.length}`);
                    this.fetch();
                },
                error: (err) => {
                    const msg = (err?.error?.message ?? err?.message ?? (typeof err === 'string' ? err : JSON.stringify(err))) || 'Unknown error';
                    this.helpers.notifyError('Import failed', msg);
                    console.error('Import failures', err);
                    this.fetch();
                }
            });
    }

    // utils
    getStatusSeverity(v?: string) {
        return STATUS_SEVERITY[(v || '').toLowerCase().trim()] || 'info';
    }
    getGenderSeverity(v?: string) {
        return GENDER_SEVERITY[(v || '').toLowerCase().trim()] || 'secondary';
    }
    private pkToId(pk: string): string {
        if (!pk) return '';

        // Handle both PATIENT# and PATIENTS# formats
        const match = /^PATIENTS?#(.+)$/.exec(pk);
        if (match) {
            return match[1];
        }

        // Fallback: try splitting by #
        const parts = pk.split('#');
        if (parts.length > 1) {
            return parts[1];
        }

        // Last resort: return as-is
        return pk;
    }
}

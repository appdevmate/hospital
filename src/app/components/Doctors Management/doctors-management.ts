import { Component, AfterViewInit, OnDestroy, TemplateRef, ViewChild, DestroyRef, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { of, from, forkJoin, Subject } from 'rxjs';
import { catchError, finalize, map, mergeMap, toArray } from 'rxjs/operators';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { DialogService } from 'primeng/dynamicdialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { GenericTableComponent } from '../../pages/uikit/generic-table';
import type { TableColumn, TableConfig, RowEditEvent, FilterControl } from '../../interfaces/tableplugin.interfaces';
import type { Patient as DoctorLike, GetPatientsPageOpts } from '../../pages/service/patients.service'; // reuse shape
import { CreateUpdateDoctorRequest, DoctorsService } from '@/pages/service/doctors.service';
import { ConfirmationService } from 'primeng/api';
import { HelpersService } from '@/services/helpers-service';
import { NewDoctor } from './new-doctor';

const EditorType = {
    Text: 'text',
    Date: 'date',
    Number: 'number',
    Textarea: 'textarea',
    Autocomplete: 'autocomplete',
    Time: 'time' // ✅ Add this
} as const;

const GENDER_OPTIONS = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Prefer not to Answer', value: 'na' }
] as const;
const DOCTOR_STATUS_OPTIONS = [
    { label: 'SENIOR', value: 'senior' },
    { label: 'JUNIOR', value: 'junior' },
    { label: 'UNDER DEVELOPMENT', value: 'under development' },
    { label: 'Associate', value: 'associate' }
] as const;

const GENDER_SEVERITY: Record<string, 'info' | 'danger' | 'secondary'> = { male: 'info', female: 'danger', na: 'secondary' };
const STATUS_SEVERITY: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'contrast' | 'secondary'> = {
    senior: 'success',
    junior: 'info',
    'under development': 'warn',
    associate: 'secondary'
};

@Component({
    selector: 'app-doctors-management',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, GenericTableComponent, TagModule, ConfirmDialogModule, ButtonModule, TooltipModule],
    providers: [DialogService],
    template: `
        <ng-template #tbStart let-api="api" let-selected="selected">
            <p-button class="mr-2" [disabled]="loading()" label="New Doctor" icon="pi pi-plus" (onClick)="openNew()"></p-button>
            <p-button class="mr-2" [disabled]="!selected?.length" label="Delete Selected" icon="pi pi-trash" severity="danger" (onClick)="deleteSelected('soft')"></p-button>
            @if (this.isDeveloper) {
                <p-button class="mr-2" [disabled]="!selected?.length" label="Hard Delete Selected" icon="pi pi-trash" severity="contrast" (onClick)="deleteSelected('hard')"></p-button>
            }
            <input type="file" #fileInput accept=".xlsx,.xls,.csv" (change)="onImportFromFileInput($event)" hidden />
            <p-button class="mr-2" label="Import Doctor(s) Data" icon="pi pi-download" severity="secondary" (onClick)="fileInput.click()"></p-button>
            <p-button class="mr-2" label="Download Doctor Template" icon="pi pi-file-excel" severity="secondary" (onClick)="downloadTemplate()"></p-button>
        </ng-template>

        <ng-template #tbEnd>
            <p-button label="Export to Excel" icon="pi pi-download" severity="secondary" (onClick)="exportExcel()"></p-button>
        </ng-template>

        // Update your template's rowActions section:
        <ng-template #rowActions let-row let-editing="editing" let-api="api" let-rowIndex="rowIndex">
            @if (!editing) {
                <p-button icon="pi pi-pencil" text (onClick)="beginEdit(row, rowIndex, api)" pTooltip="Edit"></p-button>
                <p-button icon="pi pi-trash" text severity="danger" class="ml-2" (onClick)="deleteRow(row)" pTooltip="Delete"></p-button>
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
export class DoctorsManagementComponent implements AfterViewInit, OnDestroy {
    @ViewChild(GenericTableComponent) tableCmp?: GenericTableComponent;
    @ViewChild('statusTemplate') statusTemplate!: TemplateRef<any>;
    @ViewChild('genderTemplate') genderTemplate!: TemplateRef<any>;

    private destroyRef = inject(DestroyRef);
    private destroy$ = new Subject<void>();

    // signals
    private _rows = signal<DoctorLike[]>([]);
    private _selected = signal<DoctorLike[]>([]);
    private _loading = signal<boolean>(true);
    private _totalRecords = signal<number>(0);
    private originalRowData: Map<string, any> = new Map();
    isDeveloper = false; // Set this based on user groups/roles
    rows = this._rows.asReadonly();
    selected = this._selected;
    loading = this._loading.asReadonly();
    totalRecords = this._totalRecords.asReadonly();
    visibleCols = signal<string[]>([
        'name',
        'gender',
        'insurance',
        'department',
        'specialization',
        'phone',
        'qid',
        'dob',
        'hiringDate',
        'status',
        'experienceYears',
        'experienceMonths',
        'notes',
        'education',
        'dutyDays',
        'dutyStart',
        'dutyEnd',
        'timestamp'
    ]);

    private _customTemplates = signal<{ [k: string]: TemplateRef<any> }>({});
    customTemplates = this._customTemplates;
    ALLOWED_STATUS = new Set(['senior', 'junior', 'associate', 'under development']);
    PHONE_REGEX = /^[0-9]{1,15}$/;

    // map display labels -> backend field names
    LABEL_TO_FIELD: Record<string, string> = {
        'date of birth': 'dob',
        'join date': 'hiringDate',
        level: 'status',
        'qatar id': 'qid',
        'submitted date': 'timestamp'
    };

    // table config & columns (keep name frozen, tooltips via showTooltip)
    config: TableConfig = {
        title: 'Doctors Management',
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
        { field: 'name', header: 'Name', editable: true, editorType: EditorType.Text, pipe: 'titlecase', sortable: true, filterable: true, width: '200px' }, // ✅ Removed frozen: true
        { field: 'gender', header: 'Gender', editable: true, editorType: EditorType.Autocomplete, editorOptions: GENDER_OPTIONS, customTemplate: true, filterable: true },
        { field: 'insurance', header: 'Insurance', editable: true, editorType: EditorType.Text, pipe: 'titlecase', showTooltip: true, filterable: true },
        { field: 'department', header: 'Department', editable: true, editorType: EditorType.Text, pipe: 'titlecase', showTooltip: true, filterable: true },
        { field: 'specialization', header: 'Specialization', editable: true, editorType: EditorType.Text, pipe: 'titlecase', showTooltip: true, filterable: true },
        { field: 'phone', header: 'Phone', editable: true, editorType: EditorType.Text, filterable: true },
        { field: 'qid', header: 'Qatar ID', editable: true, editorType: EditorType.Text, filterable: true },
        { field: 'dob', header: 'Date of Birth', editable: true, editorType: EditorType.Date, type: 'date', pipe: 'date', dateFormat: 'MM/dd/yyyy', filterable: true },
        { field: 'hiringDate', header: 'Join Date', editable: true, editorType: EditorType.Date, type: 'date', pipe: 'date', dateFormat: 'MM/dd/yyyy', filterable: true },
        { field: 'status', header: 'Level', editable: true, editorType: EditorType.Autocomplete, editorOptions: DOCTOR_STATUS_OPTIONS, customTemplate: true, filterable: true },
        { field: 'experienceYears', header: 'Experience (Years)', editable: true, editorType: EditorType.Number, filterable: true },
        { field: 'experienceMonths', header: 'Experience (Months)', editable: true, editorType: EditorType.Number, filterable: true },
        { field: 'notes', header: 'Notes', editable: true, editorType: EditorType.Textarea, showTooltip: true, filterable: true },
        { field: 'education', header: 'Education', editable: true, editorType: EditorType.Textarea, pipe: 'titlecase', showTooltip: true, filterable: true },
        { field: 'dutyDays', header: 'Duty Days', editable: true, editorType: EditorType.Text, showTooltip: true, filterable: false },
        { field: 'dutyStart', header: 'Duty Start', editable: true, editorType: EditorType.Time, filterable: false },
        { field: 'dutyEnd', header: 'Duty End', editable: true, editorType: EditorType.Time, filterable: false },
        { field: 'timestamp', header: 'Submitted Date', editable: false, type: 'date', pipe: 'date', dateFormat: 'MM/dd/yyyy', filterable: true }
    ];

    // server query state
    private prevSortField: string | null = null;
    private prevSortOrder: 1 | -1 | 0 | null = null;
    private pageSize = this.config.defaultPageSize || 15;
    filters: GetPatientsPageOpts = { pageSize: this.pageSize, lastKey: null };
    activeFilters: { status: 'active' | 'nonactive' | null; gender: 'male' | 'female' | null } = { status: null, gender: null };

    filterControls: FilterControl[] = [
        { id: 'status', type: 'cycle', icon: 'pi pi-users', tooltip: 'Toggle level filter', outlined: true, values: [null, 'active', 'nonactive'], getLabel: (v) => (v === 'active' ? 'Non-Active' : v === 'nonactive' ? 'All' : 'Active') },
        { id: 'gender', type: 'cycle', icon: 'pi pi-user', tooltip: 'Cycle gender', outlined: true, values: [null, 'male', 'female'], getLabel: (v) => (v === 'male' ? 'Female' : v === 'female' ? 'All' : 'Male') }
    ];

    constructor(
        private doctors: DoctorsService,
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

    // UI actions
    onFilterControlChange(e: { id: string; value: any }) {
        (this.activeFilters as any)[e.id] = e.value;
        this.filters = { pageSize: this.pageSize, lastKey: null, offset: 0 };
        this.load({ first: 0, rows: this.pageSize, sortField: this.prevSortField, sortOrder: this.prevSortOrder, filters: {} });
    }

    onRowEditSave(_: RowEditEvent<DoctorLike>) {}
    // Add this method to handle edit button click
    beginEdit(row: DoctorLike, rowIndex: number, api: any) {
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
    cancelEdit(row: DoctorLike, rowIndex: number, api: any) {
        const id = this.pkToId((row as any).PK || '');
        console.log('cancelEdit - ID:', id);

        if (id) {
            this.originalRowData.delete(id);
        }

        api.cancelRowEdit(row, rowIndex);
        this.helpers.notifyInfo('Edit Cancelled', `Discarded changes for ${row.name || 'Unknown'}`);
    }

    // Keep your existing saveRow method as is
    saveRow(row: DoctorLike, rowIndex: number, api: any) {
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

        const allFields = ['name', 'dob', 'gender', 'phone', 'qid', 'job', 'insurance', 'department', 'specialization', 'status', 'hiringDate', 'experienceYears', 'experienceMonths', 'notes', 'education', 'dutyDays', 'dutyStart', 'dutyEnd'];

        let hasChanges = false;

        // ✅ Helper to format time from Date to HH:mm string
        const formatTime = (val: any): string | null => {
            if (!val) return null;
            if (typeof val === 'string' && /^\d{2}:\d{2}$/.test(val)) {
                return val; // Already in HH:mm format
            }
            if (val instanceof Date) {
                const hh = String(val.getHours()).padStart(2, '0');
                const mm = String(val.getMinutes()).padStart(2, '0');
                return `${hh}:${mm}`;
            }
            return null;
        };

        for (const field of allFields) {
            let newValue = (row as any)[field];
            let oldValue = originalData[field];

            // ✅ Special handling for time fields
            if (field === 'dutyStart' || field === 'dutyEnd') {
                newValue = formatTime(newValue);
                oldValue = formatTime(oldValue);
            }

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

        console.log('📤 Sending changed fields:', changedFields);

        this._loading.set(true);
        this.doctors.updateDoctor(id, changedFields).subscribe({
            next: () => {
                this._loading.set(false);
                api.saveRowEdit(row, rowIndex);
                this.originalRowData.delete(id);
                this.helpers.notifySuccess(`${new TitleCasePipe().transform(row?.name ?? '')} updated`);
                this.fetch();
            },
            error: (err) => {
                this._loading.set(false);
                api.cancelRowEdit(row, rowIndex);
                this.originalRowData.delete(id);
                this.helpers.notifyError('Update failed', err?.error?.message || 'Could not save');
            }
        });
    }

    // Remove or keep these as fallbacks (they won't be triggered)
    onRowEditInit(ev: RowEditEvent<DoctorLike>) {
        // This might not be called, but keep it as a fallback
        console.log('⚠️ onRowEditInit called (fallback)');
    }

    onRowEditCancel(ev: RowEditEvent<DoctorLike>) {
        // This might not be called, but keep it as a fallback
        console.log('⚠️ onRowEditCancel called (fallback)');
    }

    async exportExcel(): Promise<void> {
        const XLSX = await import('xlsx');

        // Use _rows() signal for all data, or _selected() for selected rows
        const allData: DoctorLike[] = this._rows();
        const dataToExport: DoctorLike[] = this._selected().length > 0 ? this._selected() : allData;

        if (!dataToExport || dataToExport.length === 0) {
            this.helpers.notifyWarning('No Data');
            return;
        }

        // Use your existing columns configuration
        const fields: string[] = this.columns.map((c: TableColumn) => c.field).filter((field): field is string => Boolean(field));

        const headers: string[] = this.columns.map((c: TableColumn) => c.header || c.field);

        // Map data to rows
        const rows: any[][] = dataToExport.map((item: DoctorLike) =>
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
        XLSX.utils.book_append_sheet(wb, ws, 'Doctors');

        const ts: string = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
        const selectionText = this._selected().length > 0 ? '_selected' : '';
        XLSX.writeFile(wb, `doctors${selectionText}_${ts}.xlsx`);

        this.helpers.notifySuccess('Export Successful');
    }

    async downloadTemplate() {
        const XLSX = await import('xlsx');

        // Define all columns in the exact order matching the upload format
        const headers = ['name', 'dob', 'gender', 'phone', 'qid', 'job', 'insurance', 'specialization', 'department', 'status', 'hiringDate', 'experienceYears', 'experienceMonths', 'notes', 'education', 'dutyDays', 'dutyStart', 'dutyEnd'];

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers]);

        // Set column widths for better readability
        const columnWidths = [
            { wch: 25 }, // name
            { wch: 12 }, // dob
            { wch: 10 }, // gender
            { wch: 18 }, // phone
            { wch: 13 }, // qid
            { wch: 20 }, // job
            { wch: 25 }, // insurance
            { wch: 20 }, // specialization
            { wch: 20 }, // department
            { wch: 12 }, // status
            { wch: 13 }, // hiringDate
            { wch: 12 }, // experienceYears
            { wch: 12 }, // experienceMonths
            { wch: 50 }, // notes
            { wch: 55 }, // education
            { wch: 35 }, // dutyDays
            { wch: 12 }, // dutyStart
            { wch: 12 } // dutyEnd
        ];

        ws['!cols'] = columnWidths;

        // Optional: Add a sample row with example data as guidance
        const sampleRow = [
            'Dr. Ahmed Hassan', // name
            '1985-03-15', // dob
            'Male', // gender
            '+974-5512-3456', // phone
            '28503156789', // qid (11 digits)
            'Senior Consultant', // job
            'Qatar Insurance Company', // insurance
            'Cardiology', // specialization
            'Cardiovascular', // department
            'senior', // status
            '2015-06-01', // hiringDate
            12, // experienceYears
            3, // experienceMonths
            'Specialized in interventional cardiology', // notes
            'MD from Weill Cornell Medicine-Qatar', // education
            'Sunday, Monday, Tuesday, Wednesday', // dutyDays (comma-separated)
            '08:00', // dutyStart
            '16:00' // dutyEnd
        ];

        // Add sample row (comment this out if you want empty template)
        XLSX.utils.sheet_add_aoa(ws, [sampleRow], { origin: 'A2' });

        // Add the worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Doctors');

        // Download the file
        XLSX.writeFile(wb, 'doctors_import_template.xlsx');

        this.helpers.notifySuccess('Template Downloaded');
    }

    openNew() {
        const ref = this.dialog.open(NewDoctor, { width: '90vw', height: '100vh', modal: true, dismissableMask: true, data: { kind: 'doctors' }, focusOnShow: false });
        if (ref) {
            ref.onClose.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((r) => {
                if (r) {
                    this.helpers.notifySuccess('Doctor created');
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

                forkJoin(
                    ids.map((id) => {
                        const request$ = deletionOption === 'hard' ? this.doctors.hardDeleteDoctor(id) : this.doctors.deleteDoctor(id);

                        return request$.pipe(
                            map(() => true),
                            catchError(() => of(false))
                        );
                    })
                )
                    .pipe(finalize(() => this._loading.set(false)))
                    .subscribe((res) => {
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

    deleteRow(row: DoctorLike) {
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
                this.doctors
                    .deleteDoctor(id)
                    .pipe(finalize(() => this._loading.set(false)))
                    .subscribe({
                        next: () => {
                            this.helpers.notifySuccess(`${new TitleCasePipe().transform(row.name)} Deleted`);
                            this.fetch();
                        },
                        error: () => {
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

        // quick toggles
        delete base['gender.equals'];
        if (this.activeFilters.gender) base['gender.equals'] = this.activeFilters.gender;

        this.filters = base;
        if (sortChanged) this.filters.lastKey = null; // keep it simple
        this.fetch();
    }
    private fetch() {
        this._loading.set(true);
        this.doctors.getDoctorsPage(this.filters).subscribe({
            next: (r) => {
                console.log(r);
                this._rows.set(r.data || []);
                this._totalRecords.set(r.totalCount || 0);
                this._loading.set(false);
            },
            error: () => {
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
                    message: `Create ${unique.length} doctor(s).${errSummary}`,
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
            if (!row.phone) {
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
                // ✅ ADD THIS SECTION HERE - Parse dutyDays if it's a comma-separated string
                let dutyDaysArray: string[] = [];
                if (row.dutyDays) {
                    if (Array.isArray(row.dutyDays)) {
                        dutyDaysArray = row.dutyDays;
                    } else if (typeof row.dutyDays === 'string') {
                        // Split by comma and trim each day
                        dutyDaysArray = row.dutyDays
                            .split(',')
                            .map((day: string) => day.trim().toLowerCase())
                            .filter((day: string) => day.length > 0);
                    }
                }

                // Build valid doctor object with all fields
                const doctor: any = {
                    // Required fields
                    name: row.name?.trim(),
                    dob: row.dob,
                    phone: row.phone,
                    qid: qidStr,

                    // Optional fields (include if present)
                    gender: row.gender || null,
                    job: row.job || null,
                    insurance: row.insurance || null,
                    specialization: row.specialization || null,
                    department: row.department || null,
                    status: row.status || null,
                    hiringDate: row.hiringDate || null,
                    licenseNumber: row.licenseNumber || null,
                    experienceYears: row.experienceYears ?? 0,
                    experienceMonths: row.experienceMonths ?? 0,
                    notes: row.notes || null,
                    education: row.education || null,
                    dutyDays: dutyDaysArray, // ✅ USE THE PARSED ARRAY HERE
                    dutyStart: row.dutyStart || null,
                    dutyEnd: row.dutyEnd || null
                };

                valid.push(doctor);
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
        from(rows)
            .pipe(
                mergeMap(
                    (dto, idx) =>
                        this.doctors.createDoctor(dto as CreateUpdateDoctorRequest).pipe(
                            map(() => ({ ok: true as const, idx, dto })),
                            catchError((err) =>
                                of({
                                    ok: false as const,
                                    idx,
                                    dto,
                                    err,
                                    msg: (err?.error?.message ?? err?.message ?? (typeof err === 'string' ? err : JSON.stringify(err))) || 'Unknown error'
                                })
                            )
                        ),
                    5 // moderate concurrency
                ),
                toArray(),
                finalize(() => this._loading.set(false))
            )
            .subscribe((results) => {
                const failures = results.filter((r: any) => !r.ok) as Array<{ idx: number; dto: any; msg: string; err: any }>;
                const successes = results.filter((r: any) => r.ok);

                if (successes.length && !failures.length) {
                    this.helpers.notifySuccess(`Import completed: ${successes.length}/${results.length}`);
                } else if (!successes.length) {
                    const first = failures[0];
                    this.helpers.notifyError('Import failed', `0/${results.length} created. First error: ${first?.msg}`);
                    // surface details for debugging
                    console.error('Import failures', failures);
                } else {
                    const sample = failures
                        .slice(0, 3)
                        .map((f, i) => `${i + 1}) ${f.msg}`)
                        .join(' | ');
                    this.helpers.notifyError('Partial import', `${successes.length}/${results.length} created. ${failures.length} failed. ${sample}`);
                    console.warn('Partial import details', failures);
                }

                this.fetch();
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

        // Handle both DOCTOR# and DOCTORS# formats
        const match = /^DOCTORS?#(.+)$/.exec(pk);
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

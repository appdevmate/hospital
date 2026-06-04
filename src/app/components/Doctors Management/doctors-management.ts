import { Component, AfterViewInit, OnDestroy, TemplateRef, ViewChild, DestroyRef, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { of, forkJoin } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { DialogService } from 'primeng/dynamicdialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { GenericTableComponent } from '../generic-table/generic-table';
import type { TableColumn, TableConfig, RowEditEvent, FilterControl } from '../../interfaces/tableplugin.interfaces';
import type { Patient as DoctorLike, GetPatientsPageOpts } from '../../services/patients.service';
import { DoctorsService } from '@/services/doctors.service';
import { ConfirmationService } from 'primeng/api';
import { HelpersService } from '@/services/helpers-service';
import { AuthService } from '@/services/auth.service';
import { NewDoctor } from './new-doctor';
import { TiryaqLoaderComponent } from '@/components/tiryaq-loader/tiryaq-loader';

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

const DOCTOR_STATUS_OPTIONS = [
    { label: 'SENIOR', value: 'senior' },
    { label: 'JUNIOR', value: 'junior' },
    { label: 'UNDER DEVELOPMENT', value: 'under development' },
    { label: 'Associate', value: 'associate' }
] as const;

const GENDER_SEVERITY: Record<string, 'info' | 'danger' | 'secondary'> = {
    male: 'info',
    female: 'danger',
    na: 'secondary'
};

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
    imports: [CommonModule, GenericTableComponent, TagModule, ConfirmDialogModule, DialogModule, TableModule, ButtonModule, TooltipModule, TiryaqLoaderComponent],
    providers: [DialogService, ConfirmationService],
    template: `
        <div style="position:relative; min-height:200px;">
        <app-tiryaq-loader [loading]="loading()" [message]="loaderMessage" />
        <ng-template #tbStart let-api="api" let-selected="selected">
            @if (auth.isAdmin || auth.isDeveloper) {
                <p-button class="mr-2" [disabled]="loading()" label="New Doctor" icon="pi pi-plus" (onClick)="openNew()"></p-button>
                <p-button class="mr-2" [disabled]="!selected?.length" label="Delete Selected" icon="pi pi-trash" severity="danger" (onClick)="deleteSelected()"></p-button>
                <input type="file" #fileInput accept=".xlsx,.xls,.csv" (change)="onImportFromFileInput($event)" hidden />
                <p-button class="mr-2" label="Import Doctor(s) Data" icon="pi pi-download" severity="secondary" (onClick)="fileInput.click()"></p-button>
                <p-button class="mr-2" label="Download Doctor Template" icon="pi pi-file-excel" severity="secondary" (onClick)="downloadTemplate()"></p-button>
            }
        </ng-template>

        <ng-template #tbEnd>
            <p-button label="Export Doctors Data to Excel" icon="pi pi-download" severity="secondary" (onClick)="exportExcel()"></p-button>
        </ng-template>

        <ng-template #rowActions let-row let-editing="editing" let-api="api" let-rowIndex="rowIndex">
            @if (auth.isAdmin || auth.isDeveloper) {
                @if (!editing) {
                    <p-button icon="pi pi-pencil" text (onClick)="beginEdit(row, rowIndex, api)" pTooltip="Edit"></p-button>
                    <p-button icon="pi pi-trash" text severity="danger" class="ml-2" (onClick)="deleteRow(row)" pTooltip="Delete"></p-button>
                } @else {
                    <p-button icon="pi pi-check" text severity="success" (onClick)="saveRow(row, rowIndex, api)" pTooltip="Save"></p-button>
                    <p-button icon="pi pi-times" text severity="danger" (onClick)="cancelEdit(row, rowIndex, api)" pTooltip="Cancel"></p-button>
                }
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

        <!-- Import-issues dialog: shows rows with missing required fields -->
        <p-dialog header="Import issues — required fields missing" [(visible)]="showImportIssues" [modal]="true" [style]="{ width: '720px', maxWidth: '95vw' }" [closable]="false">
            <div class="text-sm mb-3">
                <strong>{{ pendingValid.length }}</strong> row(s) are ready to import.
                <strong class="text-red-600">{{ pendingSkipped.length }}</strong> row(s) will be skipped because required fields are missing.
            </div>
            <p-table [value]="pendingSkipped" [paginator]="pendingSkipped.length > 5" [rows]="5" responsiveLayout="scroll" styleClass="p-datatable-sm">
                <ng-template pTemplate="header">
                    <tr><th>Name</th><th>QID</th><th>Phone</th><th>Missing</th></tr>
                </ng-template>
                <ng-template pTemplate="body" let-r>
                    <tr>
                        <td>{{ r.row?.name || '—' }}</td>
                        <td>{{ r.row?.qid  || '—' }}</td>
                        <td>{{ r.row?.phone || '—' }}</td>
                        <td class="text-red-600">{{ r.reason }}</td>
                    </tr>
                </ng-template>
                <ng-template pTemplate="emptymessage"><tr><td colspan="4" class="text-center p-3">—</td></tr></ng-template>
            </p-table>
            <ng-template pTemplate="footer">
                <p-button label="Cancel" severity="secondary" text (onClick)="cancelImport()"></p-button>
                <p-button [label]="'Import ' + pendingValid.length + ' valid only'" icon="pi pi-check" [disabled]="!pendingValid.length" (onClick)="confirmPartialImport()"></p-button>
            </ng-template>
        </p-dialog>
        </div>
    `
})
export class DoctorsManagementComponent implements AfterViewInit, OnDestroy {
    @ViewChild(GenericTableComponent) tableCmp?: GenericTableComponent;
    @ViewChild('statusTemplate') statusTemplate!: TemplateRef<any>;
    @ViewChild('genderTemplate') genderTemplate!: TemplateRef<any>;

    auth = inject(AuthService);
    private doctors = inject(DoctorsService);
    private confirm = inject(ConfirmationService);
    private helpers = inject(HelpersService);
    private dialog = inject(DialogService);
    private destroyRef = inject(DestroyRef);

    // ── Import-issues dialog state ──────────────────────────────────────
    showImportIssues = false;
    pendingValid: any[] = [];
    pendingSkipped: { row: any; reason: string }[] = [];
    loaderMessage = 'Loading doctors…';

    private _rows = signal<DoctorLike[]>([]);
    private _selected = signal<DoctorLike[]>([]);
    private _loading = signal<boolean>(true);
    private _totalRecords = signal<number>(0);
    private originalRowData = new Map<string, any>();

    rows = this._rows.asReadonly();
    selected = this._selected;
    loading = this._loading.asReadonly();
    totalRecords = this._totalRecords.asReadonly();
    visibleCols = signal<string[]>(['name', 'gender', 'bloodGroup', 'department', 'specialization', 'status', 'dutyDays', 'dutyStart', 'dutyEnd']);

    private _customTemplates = signal<{ [k: string]: TemplateRef<any> }>({});
    customTemplates = this._customTemplates;

    LABEL_TO_FIELD: Record<string, string> = {
        'date of birth': 'dob',
        'join date': 'hiringDate',
        level: 'status',
        'qatar id': 'qid',
        'submitted date': 'timestamp'
    };

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
        { field: 'name', header: 'Name', editable: true, editorType: EditorType.Text, pipe: 'titlecase', sortable: true, filterable: true, width: '200px' },
        { field: 'email', header: 'Email', editable: true, editorType: EditorType.Text, pipe: 'lowercase', sortable: true, filterable: true, width: '200px' },
        { field: 'gender', header: 'Gender', editable: true, editorType: EditorType.Autocomplete, editorOptions: GENDER_OPTIONS, customTemplate: true, filterable: true },
        { field: 'insurance', header: 'Insurance', editable: true, editorType: EditorType.Text, pipe: 'titlecase', showTooltip: true, filterable: true },
        { field: 'department', header: 'Department', editable: true, editorType: EditorType.Text, pipe: 'titlecase', showTooltip: true, filterable: true },
        { field: 'specialization', header: 'Specialization', editable: true, editorType: EditorType.Text, pipe: 'titlecase', showTooltip: true, filterable: true },
        { field: 'phone', header: 'Phone', editable: true, editorType: EditorType.Text, filterable: true },
        { field: 'qid', header: 'Qatar ID', editable: true, editorType: EditorType.Text, filterable: true },
        { field: 'licenseNumber', header: 'License Number', editable: true, editorType: EditorType.Text, filterable: true },
        { field: 'dob', header: 'Date of Birth', editable: true, editorType: EditorType.Date, type: 'date', pipe: 'date', dateFormat: 'MM/dd/yyyy', filterable: true },
        { field: 'hiringDate', header: 'Join Date', editable: true, editorType: EditorType.Date, type: 'date', pipe: 'date', dateFormat: 'MM/dd/yyyy', filterable: true },
        { field: 'status', header: 'Level', editable: true, editorType: EditorType.Autocomplete, editorOptions: DOCTOR_STATUS_OPTIONS, customTemplate: true, filterable: true },
        { field: 'experienceYears', header: 'Experience (Years)', editable: true, editorType: EditorType.Number, filterable: true },
        { field: 'experienceMonths', header: 'Experience (Months)', editable: true, editorType: EditorType.Number, filterable: true },
        { field: 'notes', header: 'Notes', editable: true, editorType: EditorType.Textarea, showTooltip: true, filterable: true },
        { field: 'education', header: 'Education', editable: true, editorType: EditorType.Textarea, pipe: 'titlecase', showTooltip: true, filterable: true },
        { field: 'bloodGroup', header: 'Blood Group', editable: true, editorType: EditorType.Text, filterable: true },
        { field: 'dutyDays', header: 'Duty Days', editable: true, editorType: EditorType.Text, showTooltip: true, filterable: false },
        { field: 'dutyStart', header: 'Duty Start', editable: true, editorType: EditorType.Time, filterable: false },
        { field: 'dutyEnd', header: 'Duty End', editable: true, editorType: EditorType.Time, filterable: false },
        { field: 'timestamp', header: 'Submitted Date', editable: false, type: 'date', pipe: 'date', dateFormat: 'MM/dd/yyyy', filterable: true }
    ];

    private prevSortField: string | null = null;
    private prevSortOrder: 1 | -1 | 0 | null = null;
    private pageSize = this.config.defaultPageSize || 15;
    filters: GetPatientsPageOpts = { pageSize: this.pageSize, lastKey: null };
    activeFilters: { status: 'active' | 'nonactive' | null; gender: 'male' | 'female' | null } = { status: null, gender: null };

    filterControls: FilterControl[] = [
        {
            id: 'status',
            type: 'cycle',
            icon: 'pi pi-users',
            tooltip: 'Toggle level filter',
            outlined: true,
            values: [null, 'active', 'nonactive'],
            getLabel: (v) => (v === 'active' ? 'Non-Active' : v === 'nonactive' ? 'All' : 'Active')
        },
        {
            id: 'gender',
            type: 'cycle',
            icon: 'pi pi-user',
            tooltip: 'Cycle gender',
            outlined: true,
            values: [null, 'male', 'female'],
            getLabel: (v) => (v === 'male' ? 'Female' : v === 'female' ? 'All' : 'Male')
        }
    ];

    ngAfterViewInit() {
        this._customTemplates.set({ status: this.statusTemplate, gender: this.genderTemplate });
        this.filters.pageSize = this.pageSize;
        this.load({ first: 0, rows: this.pageSize });
    }

    ngOnDestroy() {}

    onFilterControlChange(e: { id: string; value: any }) {
        (this.activeFilters as any)[e.id] = e.value;
        this.filters = { pageSize: this.pageSize, lastKey: null, offset: 0 };
        this.load({ first: 0, rows: this.pageSize, sortField: this.prevSortField, sortOrder: this.prevSortOrder, filters: {} });
    }

    onRowEditSave(_: RowEditEvent<DoctorLike>) {}
    onRowEditInit(_: RowEditEvent<DoctorLike>) {}
    onRowEditCancel(_: RowEditEvent<DoctorLike>) {}

    beginEdit(row: DoctorLike, rowIndex: number, api: any) {
        const id = this.pkToId((row as any).PK || '');
        if (id) {
            const originalRow = this._rows().find((r) => this.pkToId((r as any).PK) === id);
            if (originalRow) {
                this.originalRowData.set(id, JSON.parse(JSON.stringify(originalRow)));
            }
        }
        api.beginRowEdit(row, rowIndex);
    }

    cancelEdit(row: DoctorLike, rowIndex: number, api: any) {
        const id = this.pkToId((row as any).PK || '');
        if (id) this.originalRowData.delete(id);
        api.cancelRowEdit(row, rowIndex);
        this.helpers.notifyInfo('Edit Cancelled', `Discarded changes for ${row.name || 'Unknown'}`);
    }

    saveRow(row: DoctorLike, rowIndex: number, api: any) {
        const id = this.pkToId((row as any)?.PK || '');
        if (!id) {
            this.helpers.notifyError('Save failed', 'Missing id');
            return;
        }

        const originalData = this.originalRowData.get(id);
        if (!originalData) {
            this.helpers.notifyError('Save failed', 'Original data not found');
            return;
        }

        const allFields = [
            'name',
            'dob',
            'gender',
            'phone',
            'qid',
            'licenseNumber',
            'job',
            'insurance',
            'department',
            'specialization',
            'status',
            'hiringDate',
            'experienceYears',
            'experienceMonths',
            'notes',
            'education',
            'dutyDays',
            'dutyStart',
            'dutyEnd'
        ];

        const formatTime = (val: any): string | null => {
            if (!val) return null;
            if (typeof val === 'string' && /^\d{2}:\d{2}$/.test(val)) return val;
            if (val instanceof Date) {
                return `${String(val.getHours()).padStart(2, '0')}:${String(val.getMinutes()).padStart(2, '0')}`;
            }
            return null;
        };

        const normalizeValue = (val: any) => {
            if (val === null || val === undefined || val === '') return null;
            if (typeof val === 'string') return val.trim().toLowerCase();
            if (val instanceof Date) return val.toISOString().slice(0, 10);
            if (Array.isArray(val)) return JSON.stringify(val.sort());
            return val;
        };

        const changedFields: any = {};
        let hasChanges = false;

        for (const field of allFields) {
            let newValue = (row as any)[field];
            let oldValue = originalData[field];

            if (field === 'dutyStart' || field === 'dutyEnd') {
                newValue = formatTime(newValue);
                oldValue = formatTime(oldValue);
            }

            if (normalizeValue(newValue) !== normalizeValue(oldValue)) {
                changedFields[field] = newValue;
                hasChanges = true;
            }
        }

        if (!hasChanges) {
            this.helpers.notifyInfo('No Changes', 'No fields were modified');
            api.cancelRowEdit(row, rowIndex);
            this.originalRowData.delete(id);
            return;
        }

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
                if (err?.error?.message === 'Unauthorized') {
                    this.helpers.redirectToLogin();
                    return;
                }
                this.helpers.notifyError('Update failed', err?.error?.message || 'Could not save');
            }
        });
    }

    async exportExcel(): Promise<void> {
        const XLSX = await import('xlsx');
        const dataToExport: DoctorLike[] = this._selected().length > 0 ? this._selected() : this._rows();

        if (!dataToExport.length) {
            this.helpers.notifyWarning('No Data');
            return;
        }

        const fields = this.columns.map((c) => c.field).filter((f): f is string => Boolean(f));
        const headers = this.columns.map((c) => c.header || c.field);
        const rowsData = dataToExport.map((item) =>
            fields.map((field) => {
                const value = (item as any)[field];
                return Array.isArray(value) ? value.join(', ') : (value ?? '');
            })
        );

        const ws = XLSX.utils.aoa_to_sheet([headers, ...rowsData]);
        ws['!cols'] = headers.map((h) => ({ wch: Math.max(12, String(h).length + 2) }));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Doctors');

        const ts = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
        const selectionText = this._selected().length > 0 ? '_selected' : '';
        XLSX.writeFile(wb, `doctors${selectionText}_${ts}.xlsx`);
        this.helpers.notifySuccess('Export Successful');
    }

    async downloadTemplate() {
        const XLSX = await import('xlsx');
        const headers = [
            'name',
            'email',
            'dob',
            'gender',
            'phone',
            'qid',
            'job',
            'insurance',
            'specialization',
            'department',
            'status',
            'hiringDate',
            'experienceYears',
            'experienceMonths',
            'notes',
            'education',
            'dutyDays',
            'dutyStart',
            'dutyEnd',
            'bloodGroup'
        ];
        const columnWidths = [
            { wch: 25 },
            { wch: 30 },
            { wch: 12 },
            { wch: 10 },
            { wch: 18 },
            { wch: 13 },
            { wch: 20 },
            { wch: 25 },
            { wch: 20 },
            { wch: 20 },
            { wch: 12 },
            { wch: 13 },
            { wch: 12 },
            { wch: 12 },
            { wch: 50 },
            { wch: 55 },
            { wch: 35 },
            { wch: 12 },
            { wch: 12 },
            { wch: 10 }
        ];
        const sampleRow = [
            'Dr. Ahmed Hassan',
            'ahmed.hassan@tiryaq.com',
            '1985-03-15',
            'Male',
            '+974-5512-3456',
            '28503156789',
            'Senior Consultant',
            'Qatar Insurance Company',
            'Cardiology',
            'Cardiovascular',
            'senior',
            '2015-06-01',
            12,
            3,
            'Specialized in interventional cardiology',
            'MD from Weill Cornell Medicine-Qatar',
            'Sunday, Monday, Tuesday, Wednesday',
            '08:00',
            '16:00',
            'B+'
        ];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers]);
        ws['!cols'] = columnWidths;
        XLSX.utils.sheet_add_aoa(ws, [sampleRow], { origin: 'A2' });
        XLSX.utils.book_append_sheet(wb, ws, 'Doctors');
        XLSX.writeFile(wb, 'doctors_import_template.xlsx');
        this.helpers.notifySuccess('Template Downloaded');
    }

    openNew() {
        const ref = this.dialog.open(NewDoctor, {
            width: '90vw',
            height: '100vh',
            modal: true,
            dismissableMask: true,
            data: { kind: 'doctors' },
            focusOnShow: false
        });
        if (ref) {
            ref.onClose.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((r) => {
                if (r) this.fetch();
            });
        }
    }

    // ── Delete (soft only) ─────────────────────────────────────────────────
    // Hard delete is intentionally NOT exposed in the UI. Permanent removal is
    // an IT-side DB operation, never a clinician/admin action.
    deleteSelected() {
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
            rejectButtonProps: { label: 'No', severity: 'secondary', variant: 'text' },
            acceptButtonProps: { label: 'Yes', severity: 'danger' },
            accept: () => {
                const ids = Array.from(new Set(sel.map((p) => this.pkToId(p.PK)).filter((id): id is string => !!id)));
                this._loading.set(true);
                let hasRedirected = false;

                const handleUnauthorized = (err: any) => {
                    if (err?.error?.message === 'Unauthorized' && !hasRedirected) {
                        hasRedirected = true;
                        this.helpers.redirectToLogin();
                    }
                };

                const request$ = forkJoin(
                    ids.map((id) =>
                        this.doctors.deleteDoctor(id).pipe(
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
                        error: (err) => {
                            if (err?.error?.message === 'Unauthorized') {
                                this.helpers.redirectToLogin();
                                return;
                            }
                            this.helpers.notifyError('Delete failed', 'Could not delete');
                        }
                    });
            }
        });
    }

    load(e: any) {
        if (!e) return;
        if (e.rows && e.rows !== this.pageSize) {
            this.pageSize = e.rows;
            this.filters.pageSize = this.pageSize;
        }
        const sf = e.sortField ?? null;
        const so: 1 | -1 | 0 = e.sortOrder ?? 1;
        const sortChanged = sf !== this.prevSortField || so !== this.prevSortOrder;
        this.prevSortField = sf;
        this.prevSortOrder = so;

        const first = e.first || 0;
        const base: any = { pageSize: this.pageSize, offset: first, sortField: sf, sortOrder: so };

        if (e.filters?.global?.value) base.search = String(e.filters.global.value).trim();
        for (const [k, f] of Object.entries<any>(e.filters || {})) {
            if (k === 'global' || !f?.value) continue;
            base[k] = { value: f.value, matchMode: f.matchMode ?? 'contains', operator: f.operator ?? 'and' };
        }

        delete base['gender.equals'];
        if (this.activeFilters.gender) base['gender.equals'] = this.activeFilters.gender;

        this.filters = base;
        if (sortChanged) this.filters.lastKey = null;
        this.fetch();
    }

    private fetch() {
        this._loading.set(true);
        this.doctors.getDoctorsPage(this.filters).subscribe({
            next: (r) => {
                this._rows.set(r.data || []);
                this._totalRecords.set(r.totalCount || 0);
                this._loading.set(false);
            },
            error: (err) => {
                if (err?.error?.message === 'Unauthorized') {
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

        // Loader while we parse the workbook and validate every row.
        this.loaderMessage = 'Reading & validating file…';
        this._loading.set(true);

        this.readWorkbook(file)
            .then((rows) => {
                const { valid, skipped } = this.prepare(rows);
                this._loading.set(false);
                this.loaderMessage = 'Loading doctors…';

                const seen = new Set<string>();
                const unique = valid.filter((r) => {
                    const k = r.qid as string;
                    if (!k || seen.has(k)) return false;
                    seen.add(k);
                    return true;
                });

                // No valid rows at all → show the issue dialog with all bad rows.
                if (!unique.length) {
                    this.pendingValid = [];
                    this.pendingSkipped = skipped;
                    this.showImportIssues = true;
                    return;
                }

                // Some rows have missing required fields → ask user to proceed
                // with only the valid ones or cancel.
                if (skipped.length) {
                    this.pendingValid = unique;
                    this.pendingSkipped = skipped;
                    this.showImportIssues = true;
                    return;
                }

                // Clean file — just confirm and import.
                this.confirm.confirm({
                    key: 'global',
                    header: 'Confirm Import',
                    message: `Create ${unique.length} doctor(s).`,
                    icon: 'pi pi-exclamation-triangle',
                    rejectButtonProps: { label: 'No', severity: 'secondary', variant: 'text' },
                    acceptButtonProps: { label: 'Yes', severity: 'primary' },
                    accept: () => {
                        this.loaderMessage = 'Importing doctors…';
                        this._loading.set(true);
                        this.bulkCreate(unique);
                    }
                });
            })
            .catch(() => {
                this._loading.set(false);
                this.loaderMessage = 'Loading doctors…';
                this.helpers.notifyError('Import failed', 'Could not read file');
            });
    }

    /** User confirmed import — proceed with only the valid rows. */
    confirmPartialImport() {
        const toImport = this.pendingValid;
        this.showImportIssues = false;
        this.pendingValid = [];
        this.pendingSkipped = [];
        if (!toImport.length) return;
        this.loaderMessage = 'Importing doctors…';
        this._loading.set(true);
        this.bulkCreate(toImport);
    }

    /** User cancelled — drop everything. */
    cancelImport() {
        this.showImportIssues = false;
        this.pendingValid = [];
        this.pendingSkipped = [];
    }

    prepare(rows: any[]): { valid: any[]; skipped: { row: any; reason: string }[] } {
        const valid: any[] = [];
        const skipped: { row: any; reason: string }[] = [];

        rows.forEach((row, index) => {
            const rowNum = index + 2;
            const errors: string[] = [];

            if (!row.name || typeof row.name !== 'string' || row.name.trim().length < 3) errors.push('Name required (min 3 chars)');
            if (!row.dob) errors.push('DOB required');
            if (!row.phone) errors.push('Phone required');

            const qidStr = String(row.qid || '').replace(/\D/g, '');
            if (!qidStr || !/^\d{11}$/.test(qidStr)) errors.push('QID required (11 digits)');

            if (errors.length > 0) {
                skipped.push({ row, reason: `Row ${rowNum}: ${errors.join(', ')}` });
                return;
            }

            let dutyDaysArray: string[] = [];
            if (row.dutyDays) {
                if (Array.isArray(row.dutyDays)) {
                    dutyDaysArray = row.dutyDays;
                } else if (typeof row.dutyDays === 'string') {
                    dutyDaysArray = row.dutyDays
                        .split(',')
                        .map((day: string) => day.trim().toLowerCase())
                        .filter((day: string) => day.length > 0);
                }
            }

            valid.push({
                name: row.name?.trim(),
                dob: row.dob,
                phone: row.phone,
                qid: qidStr,
                email: row.email?.trim().toLowerCase() || null,
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
                dutyDays: dutyDaysArray,
                dutyStart: row.dutyStart || null,
                dutyEnd: row.dutyEnd || null,
                bloodGroup: row.bloodGroup || null
            });
        });

        return { valid, skipped };
    }

    private async readWorkbook(file: File) {
        const XLSX = await import('xlsx');
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        return XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
    }

    private bulkCreate(rows: any[]) {
        this.doctors
            .createDoctor({ doctors: rows })
            .pipe(finalize(() => this._loading.set(false)))
            .subscribe({
                next: () => {
                    this.helpers.notifySuccess(`Import completed: ${rows.length}/${rows.length}`);
                    this.fetch();
                },
                error: (err) => {
                    const msg = (err?.error?.message ?? err?.message ?? (typeof err === 'string' ? err : JSON.stringify(err))) || 'Unknown error';
                    this.helpers.notifyError('Import failed', msg);
                    this.fetch();
                }
            });
    }

    getStatusSeverity(v?: string) {
        return STATUS_SEVERITY[(v || '').toLowerCase().trim()] || 'info';
    }

    getGenderSeverity(v?: string) {
        return GENDER_SEVERITY[(v || '').toLowerCase().trim()] || 'secondary';
    }

    private pkToId(pk: string): string {
        if (!pk) return '';
        const match = /^DOCTORS?#(.+)$/.exec(pk);
        if (match) return match[1];
        const parts = pk.split('#');
        if (parts.length > 1) return parts[1];
        return pk;
    }
}

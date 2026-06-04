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
import { Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';

import { GenericTableComponent } from '../generic-table/generic-table';
import type { TableColumn, TableConfig, RowEditEvent, FilterControl } from '../../interfaces/tableplugin.interfaces';
import type { Patient, GetPatientsPageOpts, CreateUpdatePatientRequest } from '../../services/patients.service';
import { PatientsService } from '../../services/patients.service';
import { HelpersService } from '@/services/helpers-service';
import { AuthService } from '@/services/auth.service';
import { NewPatient } from './new-patient';
import { EditPatient } from './edit-patient';
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

const PATIENT_STATUS_OPTIONS = [
    { label: 'ADMITTED', value: 'admitted' },
    { label: 'STABLE', value: 'stable' },
    { label: 'UNDER TREATMENT', value: 'under treatment' },
    { label: 'DISCHARGED', value: 'discharged' },
    { label: 'CRITICAL', value: 'critical' },
    { label: 'DEAD', value: 'dead' }
] as const;

const GENDER_SEVERITY: Record<string, 'info' | 'danger' | 'secondary'> = {
    male: 'info',
    female: 'danger',
    na: 'secondary'
};

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
    imports: [CommonModule, GenericTableComponent, TagModule, ConfirmDialogModule, DialogModule, TableModule, ButtonModule, TooltipModule, TiryaqLoaderComponent],
    providers: [DialogService, ConfirmationService],
    template: `
        <div style="position:relative; min-height:200px;">
        <app-tiryaq-loader [loading]="loading()" message="Loading patients…" />
        <!-- ── Toolbar: Start ── -->
        <ng-template #tbStart>
            <p-button class="mr-2" [disabled]="loading()" label="New Patient" icon="pi pi-plus" (onClick)="openNew()"></p-button>
            <p-button class="mr-2" [disabled]="!selected().length" label="Delete Selected" icon="pi pi-trash" severity="danger" (onClick)="deleteSelected()"></p-button>
            <input type="file" #fileInput accept=".xlsx,.xls,.csv" (change)="onImportFromFileInput($event)" hidden />
            <p-button class="mr-2" label="Import Patient(s)" icon="pi pi-download" severity="secondary" (onClick)="fileInput.click()"></p-button>
            <p-button class="mr-2" label="Download Template" icon="pi pi-file-excel" severity="secondary" (onClick)="downloadTemplate()"></p-button>
        </ng-template>

        <!-- ── Toolbar: End ── -->
        <ng-template #tbEnd>
            <p-button label="Export to Excel" icon="pi pi-download" severity="secondary" (onClick)="exportExcel()"></p-button>
        </ng-template>

        <!-- ── Row Actions ── -->
        <ng-template #rowActions let-row let-editing="editing">
            @if (!editing) {
                <p-button icon="pi pi-pencil" text (onClick)="openEdit(row)" pTooltip="Edit Patient"></p-button>
                <p-button icon="pi pi-trash" text severity="danger" class="ml-2" (onClick)="deleteRow(row)" pTooltip="Delete"></p-button>
                <p-button icon="pi pi-eye" text severity="info" (onClick)="viewProfile(row)" pTooltip="View Profile"></p-button>
            }
        </ng-template>

        <!-- ── Table ── -->
        <app-generic-table
            [columns]="columns"
            [config]="tableConfig()"
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
export class PatientsManagementComponent implements AfterViewInit, OnDestroy {
    @ViewChild(GenericTableComponent) tableCmp?: GenericTableComponent;
    @ViewChild('statusTemplate') statusTemplate!: TemplateRef<any>;
    @ViewChild('genderTemplate') genderTemplate!: TemplateRef<any>;

    // ── Services ────────────────────────────────────────────────────────
    auth = inject(AuthService);
    private patients = inject(PatientsService);
    private confirm = inject(ConfirmationService);
    private helpers = inject(HelpersService);
    private dialog = inject(DialogService);
    private router = inject(Router);
    private destroyRef = inject(DestroyRef);

    // ── Signals ─────────────────────────────────────────────────────────
    private _rows = signal<Patient[]>([]);
    private _selected = signal<Patient[]>([]);
    private _loading = signal<boolean>(true);
    private _totalRecords = signal<number>(0);
    private _customTemplates = signal<{ [k: string]: TemplateRef<any> }>({});

    rows = this._rows.asReadonly();
    selected = this._selected;
    loading = this._loading.asReadonly();
    totalRecords = this._totalRecords.asReadonly();
    customTemplates = this._customTemplates;

    visibleCols = signal<string[]>(['name', 'bloodGroup', 'gender', 'phone', 'qid', 'dob', 'status', 'bedNumber', 'ward']);

    // ── Import-issues dialog state ──────────────────────────────────────
    showImportIssues = false;
    pendingValid: any[] = [];
    pendingSkipped: { row: any; reason: string }[] = [];

    // ── Table config (reactive — disables selection in deleted view) ────
    tableConfig = signal<TableConfig>({
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
    });

    columns: TableColumn[] = [
        { field: 'name', header: 'Name', editable: true, editorType: EditorType.Text, pipe: 'titlecase', sortable: true, filterable: true, width: '200px' },
        { field: 'email', header: 'Email', editable: true, editorType: EditorType.Text, pipe: 'lowercase', sortable: true, filterable: true, width: '200px' },
        { field: 'gender', header: 'Gender', editable: true, editorType: EditorType.Autocomplete, editorOptions: GENDER_OPTIONS, customTemplate: true, filterable: true },
        { field: 'insurance', header: 'Insurance', editable: true, editorType: EditorType.Text, pipe: 'titlecase', showTooltip: true, filterable: true },
        { field: 'phone', header: 'Phone', editable: true, editorType: EditorType.Text, filterable: true },
        { field: 'qid', header: 'Qatar ID', editable: true, editorType: EditorType.Text, filterable: true },
        { field: 'dob', header: 'Date of Birth', editable: true, editorType: EditorType.Date, type: 'date', pipe: 'date', dateFormat: 'MM/dd/yyyy', filterable: true },
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

    // ── Server query state ───────────────────────────────────────────────
    private prevSortField: string | null = null;
    private prevSortOrder: 1 | -1 | 0 | null = null;
    private pageSize = 15;

    filters: GetPatientsPageOpts = { pageSize: this.pageSize, lastKey: null };
    activeFilters: { status: 'active' | 'nonactive' | null; gender: 'male' | 'female' | null } = { status: null, gender: null };

    filterControls: FilterControl[] = [
        { id: 'status', type: 'cycle', icon: 'pi pi-users', tooltip: 'Toggle status', outlined: true, values: [null, 'active', 'nonactive'], getLabel: (v) => (v === 'active' ? 'Non-Active' : v === 'nonactive' ? 'All' : 'Active') },
        { id: 'gender', type: 'cycle', icon: 'pi pi-user', tooltip: 'Cycle gender', outlined: true, values: [null, 'male', 'female'], getLabel: (v) => (v === 'male' ? 'Female' : v === 'female' ? 'All' : 'Male') }
    ];

    // ── Lifecycle ────────────────────────────────────────────────────────
    ngAfterViewInit() {
        this._customTemplates.set({ status: this.statusTemplate, gender: this.genderTemplate });
        this.filters.pageSize = this.pageSize;
        this.load({ first: 0, rows: this.pageSize });
    }

    ngOnDestroy() {}

    // ── Navigation ───────────────────────────────────────────────────────
    viewProfile(row: Patient) {
        const id = row.PK.includes('#') ? row.PK.split('#')[1] : row.PK;
        this.router.navigate(['/patient-profile', id]);
    }

    // ── Toolbar actions ──────────────────────────────────────────────────
    async exportExcel(): Promise<void> {
        const XLSX = await import('xlsx');
        const dataToExport = this._selected().length > 0 ? this._selected() : this._rows();

        if (!dataToExport.length) {
            this.helpers.notifyWarning('No Data');
            return;
        }

        const fields = this.columns.map((c) => c.field).filter(Boolean) as string[];
        const headers = this.columns.map((c) => c.header || c.field);
        const rows = dataToExport.map((item) =>
            fields.map((field) => {
                const value = (item as any)[field];
                return Array.isArray(value) ? value.join(', ') : (value ?? '');
            })
        );

        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        ws['!cols'] = headers.map((h) => ({ wch: Math.max(12, String(h).length + 2) }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Patients');

        const ts = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
        const selectionText = this._selected().length > 0 ? '_selected' : '';
        XLSX.writeFile(wb, `patients${selectionText}_${ts}.xlsx`);
        this.helpers.notifySuccess('Export Successful');
    }

    async downloadTemplate() {
        const XLSX = await import('xlsx');
        const headers = ['name', 'email', 'dob', 'gender', 'phone', 'qid', 'insurance', 'status', 'notes', 'medicalHistory', 'allergies', 'medications', 'bedNumber', 'ward', 'bloodGroup'];
        const sampleRow = [
            'Ahmed Hassan',
            'ahmed@hospital.com',
            '1990-03-15',
            'Male',
            '+974-5512-3456',
            '28503156789',
            'Qatar Insurance Company',
            'admitted',
            'Post-operative care',
            'History of hypertension',
            'Aspirin allergy',
            'Metoprolol, Lisinopril',
            'A101',
            'Cardiology Ward',
            'O+'
        ];
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers]);
        ws['!cols'] = [25, 25, 12, 10, 18, 13, 25, 12, 50, 55, 30, 50, 12, 20, 10].map((wch) => ({ wch }));
        XLSX.utils.sheet_add_aoa(ws, [sampleRow], { origin: 'A2' });
        XLSX.utils.book_append_sheet(wb, ws, 'Patients');
        XLSX.writeFile(wb, 'patients_import_template.xlsx');
        this.helpers.notifySuccess('Template Downloaded');
    }

    openNew() {
        const ref = this.dialog.open(NewPatient, { width: '90vw', height: '100vh', modal: true, dismissableMask: true, data: { kind: 'patients' }, focusOnShow: false });
        ref?.onClose.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((r) => {
            if (r) this.fetch();
        });
    }

    openEdit(row: Patient) {
        const ref = this.dialog.open(EditPatient, { width: '90vw', height: '100vh', modal: true, dismissableMask: true, data: { patient: row }, focusOnShow: false });
        ref?.onClose.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((r) => {
            if (r) {
                this.helpers.notifySuccess('Patient updated');
                this.fetch();
            }
        });
    }

    // ── Delete (soft only) ─────────────────────────────────────────────────
    // Hard delete is intentionally NOT exposed in the UI. Soft delete sets
    // deletedAt; permanent removal / restore is an IT-side operation against
    // the database, not a clinician/admin action (clinical-record integrity).
    deleteSelected() {
        const sel = this._selected();
        if (!sel.length) {
            this.helpers.notifyInfo('Warning', 'No rows selected');
            return;
        }

        this.confirm.confirm({
            key: 'global',
            header: 'Confirm Deletion',
            message: `Delete ${sel.length} selected patient(s)?`,
            icon: 'pi pi-exclamation-triangle',
            rejectButtonProps: { label: 'No', severity: 'secondary', variant: 'text' },
            acceptButtonProps: { label: 'Yes', severity: 'danger' },
            accept: () => {
                const ids = Array.from(new Set(sel.map((p) => this.pkToId(p.PK)).filter(Boolean))) as string[];
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
                    const successCount = (res as boolean[]).filter(Boolean).length;
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

    deleteRow(row: Patient) {
        const id = this.pkToId(row?.PK || '');
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

    // ── Filter ───────────────────────────────────────────────────────────
    onFilterControlChange(e: { id: string; value: any }) {
        (this.activeFilters as any)[e.id] = e.value;
        this.filters = { pageSize: this.pageSize, lastKey: null, offset: 0 };
        this.load({ first: 0, rows: this.pageSize, sortField: this.prevSortField, sortOrder: this.prevSortOrder, filters: {} });
    }

    // ── Load / Fetch ─────────────────────────────────────────────────────
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

        const base: any = { pageSize: this.pageSize, offset: e.first || 0, sortField: sf, sortOrder: so };

        if (e.filters?.global?.value) base.search = String(e.filters.global.value).trim();
        for (const [k, f] of Object.entries<any>(e.filters || {})) {
            if (k === 'global' || !f?.value) continue;
            base[k] = { value: f.value, matchMode: f.matchMode ?? 'contains', operator: f.operator ?? 'and' };
        }

        delete base['status.notEquals'];
        delete base['status.equals'];
        delete base['gender.equals'];
        if (this.activeFilters.status === 'active') base['status.notEquals'] = 'dead,discharged';
        if (this.activeFilters.status === 'nonactive') base['status.equals'] = 'dead,discharged';
        if (this.activeFilters.gender) base['gender.equals'] = this.activeFilters.gender;

        this.filters = base;
        if (sortChanged) this.filters.lastKey = null;
        this.fetch();
    }

    private fetch() {
        this._loading.set(true);
        const opts: GetPatientsPageOpts = { ...this.filters };
        // No doctorEmail param — backend handles scoping from JWT

        this.patients.getPatientsPage(opts).subscribe({
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
    // ── Import ───────────────────────────────────────────────────────────
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

        this.readWorkbook(file)
            .then((rows) => {
                const { valid, skipped } = this.prepare(rows);
                const seen = new Set<string>();
                const unique = valid.filter((r) => {
                    const k = r.qid as string;
                    if (!k || seen.has(k)) return false;
                    seen.add(k);
                    return true;
                });

                // No valid rows at all → block with a popup showing all the issues.
                if (!unique.length) {
                    this.pendingValid = [];
                    this.pendingSkipped = skipped;
                    this.showImportIssues = true;
                    return;
                }

                // Some rows have missing required fields → show the issue dialog
                // so the user can either import only the valid ones or cancel.
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
                    message: `Create ${unique.length} patient(s).`,
                    icon: 'pi pi-exclamation-triangle',
                    rejectButtonProps: { label: 'No', severity: 'secondary', variant: 'text' },
                    acceptButtonProps: { label: 'Yes', severity: 'primary' },
                    accept: () => {
                        this._loading.set(true);
                        this.bulkCreate(unique);
                    }
                });
            })
            .catch(() => {
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
            const rowNum = index + 2;
            const errors: string[] = [];
            if (!row.name || typeof row.name !== 'string' || row.name.trim().length < 3) errors.push('Name required (min 3 chars)');
            if (!row.dob) errors.push('DOB required');
            if (!row.gender || typeof row.gender !== 'string' || !row.gender.trim()) errors.push('Gender required');
            const phone = sanitizePhone(row.phone);
            if (!phone) errors.push('Phone required');
            const qidStr = String(row.qid || '').replace(/\D/g, '');
            if (!qidStr || !/^\d{11}$/.test(qidStr)) errors.push('QID required (11 digits)');

            if (errors.length) {
                skipped.push({ row, reason: `Row ${rowNum}: ${errors.join(', ')}` });
            } else {
                valid.push({
                    name: row.name?.trim().toLowerCase(),
                    dob: toISODate(row.dob) ?? row.dob,
                    phone,
                    qid: qidStr,
                    email: row.email?.trim().toLowerCase() || null,
                    gender: lc(row.gender),
                    insurance: row.insurance?.trim().toLowerCase() || null,
                    status: lc(row.status),
                    notes: row.notes?.trim() || null,
                    medicalHistory: row.medicalHistory?.trim() || null,
                    allergies: row.allergies?.trim() || null,
                    medications: row.medications?.trim() || null,
                    bedNumber: row.bedNumber?.trim() || null,
                    ward: row.ward?.trim() || null,
                    bloodGroup: row.bloodGroup?.trim() || null
                });
            }
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
        this.patients
            .createPatient({ patients: rows })
            .pipe(finalize(() => this._loading.set(false)))
            .subscribe({
                next: () => {
                    this.helpers.notifySuccess(`Import completed: ${rows.length}/${rows.length}`);
                    this.fetch();
                },
                error: (err) => {
                    const msg = err?.error?.message ?? err?.message ?? 'Unknown error';
                    this.helpers.notifyError('Import failed', msg);
                    this.fetch();
                }
            });
    }

    // ── Severity helpers ─────────────────────────────────────────────────
    getStatusSeverity(v?: string) {
        return STATUS_SEVERITY[(v || '').toLowerCase().trim()] || 'info';
    }
    getGenderSeverity(v?: string) {
        return GENDER_SEVERITY[(v || '').toLowerCase().trim()] || 'secondary';
    }

    // ── Utils ────────────────────────────────────────────────────────────
    private pkToId(pk: string): string {
        if (!pk) return '';
        const match = /^PATIENTS?#(.+)$/.exec(pk);
        if (match) return match[1];
        const parts = pk.split('#');
        return parts.length > 1 ? parts[1] : pk;
    }
}

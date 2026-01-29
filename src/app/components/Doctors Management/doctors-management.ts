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

const EditorType = { Text: 'text', Date: 'date', Number: 'number', Textarea: 'textarea', Autocomplete: 'autocomplete' } as const;
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
            <p-button class="mr-2" [disabled]="!selected?.length" label="Delete Selected" icon="pi pi-trash" severity="danger" outlined (onClick)="deleteSelected()"></p-button>
            <input type="file" #fileInput accept=".xlsx,.xls,.csv" (change)="onImportFromFileInput($event)" hidden />
            <p-button class="mr-2" label="Import" icon="pi pi-download" severity="secondary" (onClick)="fileInput.click()"></p-button>
            <p-button class="mr-2" label="Download Template" icon="pi pi-file-excel" severity="secondary" (onClick)="downloadTemplate()"></p-button>
        </ng-template>

        <ng-template #tbEnd>
            <p-button label="Export" icon="pi pi-download" severity="secondary" (onClick)="exportCSV()"></p-button>
        </ng-template>

        <ng-template #rowActions let-row let-editing="editing" let-api="api" let-rowIndex="rowIndex">
            @if (!editing) {
                <p-button icon="pi pi-pencil" text (onClick)="api.beginRowEdit(row, rowIndex)" pTooltip="Edit"></p-button>
                <p-button icon="pi pi-trash" text severity="danger" class="ml-2" (onClick)="deleteRow(row)" pTooltip="Delete"></p-button>
            } @else {
                <p-button icon="pi pi-check" text severity="success" (onClick)="saveRow(row, rowIndex, api)" pTooltip="Save"></p-button>
                <p-button icon="pi pi-times" text severity="danger" (onClick)="api.cancelRowEdit(row, rowIndex)" pTooltip="Cancel"></p-button>
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
    rows = this._rows.asReadonly();
    selected = this._selected;
    loading = this._loading.asReadonly();
    totalRecords = this._totalRecords.asReadonly();
    visibleCols = signal<string[]>(['name', 'gender', 'insurance', 'department', 'specialization', 'phone', 'qid', 'dob', 'timestamp', 'status', 'hiringDate']);
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
        { field: 'name', header: 'Name', editable: true, editorType: EditorType.Text, pipe: 'titlecase', sortable: true, filterable: true, frozen: true },
        { field: 'gender', header: 'Gender', editable: true, editorType: EditorType.Autocomplete, editorOptions: GENDER_OPTIONS, customTemplate: true, filterable: true },
        { field: 'insurance', header: 'Insurance', editable: true, editorType: EditorType.Text, pipe: 'titlecase', showTooltip: true, filterable: true },
        { field: 'department', header: 'Department', editable: true, editorType: EditorType.Text, pipe: 'titlecase', showTooltip: true, filterable: true },
        { field: 'specialization', header: 'Specialization', editable: true, editorType: EditorType.Text, pipe: 'titlecase', showTooltip: true, filterable: true },
        { field: 'phone', header: 'Phone', editable: true, editorType: EditorType.Text, filterable: true },
        { field: 'qid', header: 'Qatar ID', editable: true, editorType: EditorType.Text, filterable: true },
        { field: 'dob', header: 'Date of Birth', editable: true, editorType: EditorType.Date, type: 'date', pipe: 'date', dateFormat: 'MM/dd/yyyy', filterable: true },
        { field: 'hiringDate', header: 'Join Date', editable: true, editorType: EditorType.Date, type: 'date', pipe: 'date', dateFormat: 'MM/dd/yyyy', filterable: true },
        { field: 'status', header: 'Level', editable: true, editorType: EditorType.Autocomplete, editorOptions: DOCTOR_STATUS_OPTIONS, customTemplate: true, filterable: true },
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
    ) {}

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
    onRowEditInit(ev: RowEditEvent<DoctorLike>) {
        this.helpers.notifyInfo('Edit Mode', `Editing: ${ev.data.name || 'Unknown'}`);
    }
    onRowEditSave(_: RowEditEvent<DoctorLike>) {}
    onRowEditCancel(ev: RowEditEvent<DoctorLike>) {
        this.helpers.notifyInfo('Edit Cancelled', `Discarded changes for ${ev.data.name || 'Unknown'}`);
    }

    exportCSV() {
        const ts = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
        this.tableCmp?.exportCSV({ selectionOnly: this._selected().length > 0, filename: `doctors_${ts}`, applyPipes: true, columns: this.columns.map((c) => c.field) });
    }
    async downloadTemplate() {
        // normalize: support ['name', ...] or [{ field: 'name', header: 'Name' }, ...]
        const sel = this.visibleCols() as Array<string | TableColumn>;
        const fields = sel.map((x: any) => (typeof x === 'string' ? x : x?.field)).filter(Boolean) as string[];

        // map to display headers; fall back to field when header missing
        const byField = new Map(this.columns.map((c) => [c.field, c]));
        const headers = fields.map((f) => byField.get(f)?.header || f);

        // optional: enforce exactly 11 selected columns
        if (headers.length !== 11) {
            // keep exporting whatever is selected; adjust/remove this guard if undesired
            // this.helpers.notifyInfo('Columns', `Selected ${headers.length} columns; expected 11`);
        }

        const XLSX = await import('xlsx');
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers]);

        // widths
        (ws as any)['!cols'] = headers.map((h) => ({ wch: Math.max(12, String(h).length + 2) }));

        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        XLSX.writeFile(wb, 'doctors_template.xlsx');
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
                const ids = Array.from(new Set(sel.map((p) => this.pkToId(p.PK)).filter(Boolean)));
                this._loading.set(true);
                forkJoin(
                    ids.map((id) =>
                        this.doctors.deleteDoctor(id!).pipe(
                            map(() => true),
                            catchError(() => of(false))
                        )
                    )
                )
                    .pipe(finalize(() => this._loading.set(false)))
                    .subscribe((res) => {
                        const ok = res.filter(Boolean).length;
                        this._selected.set([]);
                        if (ok === res.length) this.helpers.notifySuccess('Deleted');
                        else this.helpers.notifyError('Delete failed', 'Some items could not be deleted');
                        this.fetch();
                    });
            }
        });
    }
    saveRow(row: DoctorLike, rowIndex: number, api: any) {
        const id = this.pkToId((row as any)?.PK || '');
        if (!id) {
            this.helpers.notifyError('Save failed', 'Missing id');
            return;
        }
        this._loading.set(true);
        this.doctors.updateDoctor(id, row as unknown as CreateUpdateDoctorRequest).subscribe({
            next: () => {
                this._loading.set(false);
                api.saveRowEdit(row, rowIndex);
                this.helpers.notifySuccess(`${new TitleCasePipe().transform(row?.name ?? '')} updated`);
                this.fetch();
            },
            error: () => {
                this._loading.set(false);
                api.cancelRowEdit(row, rowIndex);
                this.helpers.notifyError('Update failed', 'Could not save');
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
                    message: `Create ${unique.length} record(s).${errSummary}`,
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

    // ---------- VALIDATION + TRANSFORM ----------
    private prepare(rows: any[]) {
        const todayISO = this.toISODateOnly(new Date())!;
        const valid: any[] = [];
        const skipped: Array<{ row: any; reason: string }> = [];

        for (const raw of rows) {
            const r0 = this.normalizeKeys(raw); // map display labels -> backend fields

            const name = this.getStr(r0, 'name');
            const gRaw = this.getStr(r0, 'gender').toLowerCase();
            const department = this.getStr(r0, 'department');
            const phoneRaw = this.getStr(r0, 'phone');
            const qidRaw = this.getStr(r0, 'qid');
            const statusRaw = this.getStr(r0, 'status').toLowerCase();
            const dobRaw = this.getStr(r0, 'dob');
            const joinRaw = this.getStr(r0, 'hiringDate');

            const gender = gRaw.startsWith('m') ? 'male' : gRaw.startsWith('f') ? 'female' : gRaw.startsWith('prefer') ? 'na' : gRaw;

            const phone = this.onlyDigits(phoneRaw);
            const qid = this.onlyDigits(qidRaw);

            const dobDate = this.parseDateAny(dobRaw);
            const joinDate = this.parseDateAny(joinRaw);
            const submittedISO = todayISO; // rule 3

            // rule 1: required
            const missing: string[] = [];
            if (!name) missing.push('name');
            if (!gender) missing.push('gender');
            if (!department) missing.push('department');
            if (!phone) missing.push('phone');
            if (!dobDate) missing.push('dob');
            if (!joinDate) missing.push('hiringDate');
            if (missing.length) {
                skipped.push({ row: raw, reason: `Missing required: ${missing.join(', ')}` });
                continue;
            }

            // rule 4: qid 11 digits
            if (!(qid.length === 11 && /^\d{11}$/.test(qid))) {
                skipped.push({ row: raw, reason: 'qid must be exactly 11 digits' });
                continue;
            }

            // rule 5: phone 1..15 digits
            if (!this.PHONE_REGEX.test(phone)) {
                skipped.push({ row: raw, reason: 'phone must be 1..15 digits' });
                continue;
            }

            // rule 6: allowed status (optional)
            if (statusRaw && !this.ALLOWED_STATUS.has(statusRaw)) {
                skipped.push({ row: raw, reason: 'status must be one of: senior, junior, associate, under development' });
                continue;
            }

            // rule 7: dob < join and dob < submitted
            const dobISO = this.toISODateOnly(dobDate)!;
            const joinISO = this.toISODateOnly(joinDate)!;
            if (!(new Date(dobISO) < new Date(joinISO))) {
                skipped.push({ row: raw, reason: 'dob must be earlier than join date' });
                continue;
            }
            if (!(new Date(dobISO) < new Date(submittedISO))) {
                skipped.push({ row: raw, reason: 'dob must be earlier than submitted date' });
                continue;
            }

            // payload
            valid.push({
                name,
                gender,
                department,
                phone,
                qid,
                dob: dobISO,
                hiringDate: joinISO,
                status: statusRaw,
                insurance: this.getStr(r0, 'insurance'),
                specialization: this.getStr(r0, 'specialization'),
                timestamp: submittedISO
            });
        }

        return { valid, skipped };
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
    private pkToId(pk: string) {
        const m = /^DOCTORS?#(.+)$/.exec(pk);
        return m ? m[1] : (pk?.split('#')[1] ?? pk);
    }
}

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
import type { Patient as DoctorLike, GetPatientsPageOpts, CreateUpdatePatientRequest } from '../../pages/service/patients.service'; // reuse shape
import { DoctorsService } from '@/pages/service/doctors.service';
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
            <p-button class="mr-2" label="Import" icon="pi pi-upload" severity="secondary" (onClick)="fileInput.click()"></p-button>
            <p-button class="mr-2" label="Template" icon="pi pi-file-excel" severity="secondary" (onClick)="downloadTemplate()"></p-button>
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
        const headers = this.columns.map((c) => c.header || c.field);
        const XLSX = await import('xlsx');
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers]);
        (ws as any)['!cols'] = headers.map((h) => ({ wch: Math.max(12, (h ?? '').length + 2) }));
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        XLSX.writeFile(wb, `doctors_template.xlsx`);
    }
    openNew() {
        const ref = this.dialog.open(NewDoctor, { width: '60vw', modal: true, dismissableMask: true, data: { kind: 'doctors' }, focusOnShow: false });
        ref.onClose.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((r) => {
            if (r) {
                this.helpers.notifySuccess('Doctor created');
                this.fetch();
            }
        });
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
        this.doctors.updateDoctor(id, row as unknown as CreateUpdatePatientRequest).subscribe({
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
        const files: File[] = Array.isArray(input) ? input : ((input as any)?.files ?? []);
        const file = files?.[0];
        if (!file) return;
        this._loading.set(true);
        this.readWorkbook(file)
            .then((rows) => {
                const { valid, skipped } = this.prepare(rows);
                const seen = new Set<string>();
                const unique = valid.filter((r) => (seen.has(r.phone) ? false : (seen.add(r.phone), true)));
                this.confirm.confirm({
                    key: 'global',
                    header: 'Confirm Import',
                    message: `Create ${unique.length}. Skipped ${skipped.length}. Proceed?`,
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
        const { read, utils } = await import('xlsx');
        const wb = read(await file.arrayBuffer(), { type: 'array' });
        return utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
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
    private prepare(rows: any[]) {
        const accepted = new Set(['name', 'phone', 'dob', 'gender', 'insurance', 'department', 'specialization', 'qatarID', 'qid', 'hiringDate', 'status']);
        const valid: any[] = [],
            skipped: any[] = [];
        for (const r of rows) {
            const get = (k: string) => r[k] ?? r[k.toLowerCase()] ?? r[k.toUpperCase()];
            const name = String(get('name') || '').trim();
            const phone = String(get('phone') || '').replace(/\D/g, '');
            const qid = String(get('qatarID') ?? get('qid') ?? '').replace(/\D/g, '');
            const gRaw = String(get('gender') || '')
                .trim()
                .toLowerCase();
            const gender = gRaw.startsWith('m') ? 'male' : gRaw.startsWith('f') ? 'female' : gRaw.startsWith('prefer') ? 'na' : gRaw || '';
            if (!name || !phone || !gender || !qid) {
                skipped.push(r);
                continue;
            }
            const dob = this.toISODate(get('dob'));
            const hiringDate = this.toISODate(get('hiringDate'));
            const item: any = {
                name,
                phone,
                gender,
                qid,
                insurance: String(get('insurance') || '').trim(),
                department: String(get('department') || '').trim(),
                specialization: String(get('specialization') || '').trim(),
                ...(dob ? { dob } : {}),
                ...(hiringDate ? { hiringDate } : {})
            };
            for (const k of Object.keys(r)) {
                if (!accepted.has(k)) continue;
            }
            valid.push(item);
        }
        return { valid, skipped };
    }
    private bulkCreate(rows: any[]) {
        from(rows)
            .pipe(
                mergeMap(
                    (r) =>
                        this.doctors.createDoctor(r).pipe(
                            map(() => true),
                            catchError(() => of(false))
                        ),
                    10
                ),
                toArray(),
                finalize(() => this._loading.set(false))
            )
            .subscribe((results) => {
                const ok = results.filter(Boolean).length,
                    total = results.length;
                if (ok === total) this.helpers.notifySuccess('Import completed');
                else if (!ok) this.helpers.notifyError('Import failed', 'No item created');
                else this.helpers.notifyError('Partial import', `${ok}/${total} created`);
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

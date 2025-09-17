import { Component, AfterViewInit, OnDestroy, TemplateRef, ViewChild, DestroyRef, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { forkJoin, of, from, Subject } from 'rxjs';
import { catchError, finalize, map, mergeMap, toArray } from 'rxjs/operators';
import { TabsModule } from 'primeng/tabs';
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
import { DoctorsService } from '@/pages/service/doctors.service';
import { NewPatient } from './new-patient';
import { HelpersService } from '@/services/helpers-service';
import { NewDoctor } from './new-doctor/new-doctor';

type TabKey = 'patients' | 'doctors';
type StatusFilter = 'active' | 'nonactive' | null;
type GenderFilter = 'male' | 'female' | null;

const EditorType = { Text: 'text', Date: 'date', Number: 'number', Textarea: 'textarea', Autocomplete: 'autocomplete' } as const;
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
const DOCTOR_STATUS_OPTIONS = [
    { label: 'SENIOR', value: 'senior' },
    { label: 'JUNIOR', value: 'junior' },
    { label: 'UNDER DEVELOPMENT', value: 'under development' },
    { label: 'Associate', value: 'associate' }
] as const;

const GENDER_SEVERITY: Record<string, 'info' | 'danger' | 'secondary'> = { male: 'info', female: 'danger', na: 'secondary' };
const STATUS_SEVERITY: Record<TabKey, Record<string, 'success' | 'info' | 'warn' | 'danger' | 'contrast' | 'secondary'>> = {
    patients: { admitted: 'info', stable: 'success', 'under treatment': 'warn', discharged: 'secondary', critical: 'danger', dead: 'contrast' },
    doctors: { senior: 'success', junior: 'info', 'under development': 'warn', associate: 'secondary' }
};

@Component({
    selector: 'app-people-management',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, TabsModule, GenericTableComponent, TagModule, ConfirmDialogModule, ButtonModule, TooltipModule],
    providers: [DialogService],
    template: `
        <p-tabs [(value)]="activeIndex" (valueChange)="onTabChange($event)">
            <p-tablist>
                <p-tab [value]="0">Doctors</p-tab>
                <p-tab [value]="1">Patients</p-tab>
            </p-tablist>
            <p-tabpanels>
                <p-tabpanel [value]="0"><ng-container *ngTemplateOutlet="tableArea; context: { $implicit: 'doctors' }"></ng-container></p-tabpanel>
                <p-tabpanel [value]="1"><ng-container *ngTemplateOutlet="tableArea; context: { $implicit: 'patients' }"></ng-container></p-tabpanel>
            </p-tabpanels>
        </p-tabs>

        <ng-template #tableArea let-kind>
            <ng-template #tbStart let-api="api" let-selected="selected">
                <p-button class="mr-2" [disabled]="loading()" [label]="kind === 'patients' ? 'New Patient' : 'New Doctor'" icon="pi pi-plus" (onClick)="openNew(kind)"></p-button>
                <p-button class="mr-2" [disabled]="!selected?.length" label="Delete Selected" icon="pi pi-trash" severity="danger" outlined (onClick)="deleteSelected()"></p-button>
                <input type="file" #fileInput accept=".xlsx,.xls,.csv" (change)="onImportFromFileInput($event)" hidden />
                <p-button class="mr-2" label="Import" icon="pi pi-upload" severity="secondary" (onClick)="fileInput.click()"></p-button>
                <p-button class="mr-2" label="Template" icon="pi pi-file-excel" severity="secondary" (onClick)="downloadTemplate(kind)"></p-button>
            </ng-template>

            <ng-template #tbEnd let-api="api">
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
                [columns]="columnsArr()"
                [config]="configSig()"
                [data]="rows()"
                [totalRecords]="totalRecords()"
                [loading]="loading()"
                [customTemplates]="customTemplates()"
                [selectedRows]="selected()"
                [filterControls]="filterControls"
                [activeFilters]="activeFilters"
                (filterControlChange)="onFilterControlChange($event)"
                [visibleColumnFields]="visibleColumnFields()"
                (columnsVisibilityChange)="onColumnsVisibilityChange($event)"
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
        </ng-template>
    `
})
export class StaffPatientsManagement implements AfterViewInit, OnDestroy {
    @ViewChild(GenericTableComponent) tableCmp?: GenericTableComponent;
    @ViewChild('statusTemplate') statusTemplate!: TemplateRef<any>;
    @ViewChild('genderTemplate') genderTemplate!: TemplateRef<any>;

    activeIndex = 0;
    kind = signal<TabKey>('doctors');
    private _rows = signal<Patient[]>([]);
    private _selected = signal<Patient[]>([]);
    private _loading = signal<boolean>(true);
    private _totalRecords = signal<number>(0);
    private _visibleCols = {
        patients: signal<string[]>(['name', 'gender', 'insurance', 'phone', 'qid', 'dob', 'timestamp', 'status']),
        doctors: signal<string[]>(['name', 'gender', 'insurance', 'department', 'specialization', 'phone', 'qid', 'dob', 'timestamp', 'status', 'hiringDate'])
    };
    rows = this._rows.asReadonly();
    selected = this._selected;
    loading = this._loading.asReadonly();
    totalRecords = this._totalRecords.asReadonly();
    visibleColumnFields = computed(() => this._visibleCols[this.kind()]());
    private _customTemplates = signal<{ [k: string]: TemplateRef<any> }>({});
    customTemplates = this._customTemplates;

    columnsSig = computed<ReadonlyArray<TableColumn>>(() => (this.kind() === 'patients' ? this.patientColumns : this.doctorColumns));
    configSig = computed<TableConfig>(() => ({ ...this.baseConfig, title: this.kind() === 'patients' ? 'Patients Management' : 'Doctors Management' }));
    columnsArr = computed<TableColumn[]>(() => Array.from(this.columnsSig()));

    private reqSeq = 0;
    private lastKey: string | null = null;
    private pageKeys: (string | null)[] = [null];
    private page = 0;
    private _pageSize = signal<number>(15);
    private prevSortField: string | null = null;
    private prevSortOrder: 1 | -1 | 0 | null = null;

    filters: GetPatientsPageOpts = { pageSize: 15, lastKey: null };
    activeFilters: { status: StatusFilter; gender: GenderFilter } = { status: null, gender: null };

    private dialog = inject(DialogService);
    private destroyRef = inject(DestroyRef);
    private destroy$ = new Subject<void>();
    constructor(
        private patientsService: PatientsService,
        private confirm: ConfirmationService,
        private doctorsService: DoctorsService,
        private helpers: HelpersService
    ) {}

    private baseConfig: TableConfig = {
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

    readonly patientColumns: ReadonlyArray<TableColumn> = [
        { field: 'name', header: 'Name', editable: true, editorType: EditorType.Text, pipe: 'titlecase', sortable: true, filterable: true, frozen: true },
        { field: 'gender', header: 'Gender', editable: true, editorType: EditorType.Autocomplete, editorOptions: GENDER_OPTIONS, customTemplate: true, filterable: true },
        { field: 'insurance', header: 'Insurance', editable: true, editorType: EditorType.Text, pipe: 'titlecase', filterable: true },
        { field: 'phone', header: 'Phone', editable: true, editorType: EditorType.Text, filterable: true },
        { field: 'qid', header: 'Qatar ID', editable: true, editorType: EditorType.Text, filterable: true },
        { field: 'dob', header: 'Date of Birth', editable: true, editorType: EditorType.Date, type: 'date', pipe: 'date', dateFormat: 'MM/dd/yyyy', filterable: true },
        { field: 'status', header: 'Status', editable: true, editorType: EditorType.Autocomplete, editorOptions: PATIENT_STATUS_OPTIONS, customTemplate: true, filterable: true },
        { field: 'timestamp', header: 'Submitted Date', editable: false, type: 'date', pipe: 'date', dateFormat: 'MM/dd/yyyy', filterable: true }
    ] as const;

    readonly doctorColumns: ReadonlyArray<TableColumn> = [
        { ...this.patientColumns[0] },
        { ...this.patientColumns[1] },
        { ...this.patientColumns[2] },
        { field: 'department', header: 'Department', editable: true, editorType: EditorType.Text, pipe: 'titlecase', filterable: true },
        { field: 'specialization', header: 'Specialization', editable: true, editorType: EditorType.Text, pipe: 'titlecase', filterable: true },
        { ...this.patientColumns[3] },
        { ...this.patientColumns[4] },
        { field: 'dob', header: 'Date of Birth', editable: true, editorType: EditorType.Date, type: 'date', pipe: 'date', dateFormat: 'MM/dd/yyyy', filterable: true },
        { field: 'hiringDate', header: 'Join Date', editable: true, editorType: EditorType.Date, type: 'date', pipe: 'date', dateFormat: 'MM/dd/yyyy', filterable: true },
        { field: 'status', header: 'Level', editable: true, editorType: EditorType.Autocomplete, editorOptions: DOCTOR_STATUS_OPTIONS, customTemplate: true, filterable: true },
        { ...this.patientColumns[7] }
    ] as const;

    filterControls: FilterControl[] = [
        {
            id: 'status',
            type: 'cycle',
            icon: 'pi pi-users',
            tooltip: 'Toggle status',
            outlined: true,
            values: [null, 'active', 'nonactive'],
            getLabel: (v) => (v === 'active' ? 'Non-Active' : v === 'nonactive' ? 'All' : 'Active'),
            getIcon: () => 'pi pi-users'
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
        this._pageSize.set(this.baseConfig.defaultPageSize ?? 15);
        this.filters.pageSize = this._pageSize();
        this.load({ first: 0, rows: this._pageSize() });
    }
    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    onTabChange(v: number | string) {
        const i = +v;
        this.activeIndex = i;
        this.kind.set(i === 0 ? 'doctors' : 'patients');
        this.reset();
        this.load({ first: 0, rows: this._pageSize() });
    }

    onColumnsVisibilityChange(fields: string[]) {
        this._visibleCols[this.kind()].set(fields);
    }

    onFilterControlChange(e: { id: string; value: any }) {
        (this.activeFilters as any)[e.id] = e.value;
        this.reset();
        this.filters = { pageSize: this._pageSize(), lastKey: null, offset: 0 };
        this.load({ first: 0, rows: this._pageSize(), sortField: this.prevSortField, sortOrder: this.prevSortOrder, filters: {} });
    }

    onRowEditInit(ev: RowEditEvent<Patient>) {
        this.helpers.notifyInfo('Edit Mode', `Editing: ${ev.data.name || 'Unknown'}`);
    }
    onRowEditSave(_: RowEditEvent<Patient>) {}
    onRowEditCancel(ev: RowEditEvent<Patient>) {
        this.helpers.notifyInfo('Edit Cancelled', `Discarded changes for ${ev.data.name || 'Unknown'}`);
    }

    exportCSV() {
        const ts = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
        const cols = this.columnsSig();
        this.tableCmp?.exportCSV({ selectionOnly: this._selected().length > 0, filename: `${this.kind()}_${ts}`, applyPipes: true, columns: cols.map((c) => c.field) });
    }

    openNew(kind: TabKey) {
        console.log(kind);
        let ref;

        if (kind === 'doctors') {
            ref = this.dialog.open(NewDoctor, { width: '60vw', modal: true, dismissableMask: true, data: { kind }, focusOnShow: false });
            ref.onClose.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((r) => {
                if (r) {
                    this.helpers.notifySuccess(`${kind === 'doctors' ? 'Doctor' : 'Doctor'} created`);
                    this.refresh();
                }
            });
        } else if (kind === 'patients') {
            ref = this.dialog.open(NewPatient, { width: '50vw', modal: true, dismissableMask: true, data: { kind }, focusOnShow: false });
            ref.onClose.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((r) => {
                if (r) {
                    this.helpers.notifySuccess(`${kind === 'patients' ? 'Patient' : 'Doctor'} created`);
                    this.refresh();
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

                const reqs = ids.map((id) =>
                    (this.kind() === 'doctors' ? this.doctorsService.deleteDoctor(id!) : this.patientsService.deletePatient(id!)).pipe(
                        map(() => ({ id, ok: true as const })),
                        catchError(() => of({ id, ok: false as const }))
                    )
                );

                forkJoin(reqs)
                    .pipe(finalize(() => this._loading.set(false)))
                    .subscribe((results) => {
                        const failed = results.filter((r) => !r.ok).length;
                        this._selected.set([]);
                        if (!failed) this.helpers.notifySuccess('Deleted');
                        else this.helpers.notifyError('Delete failed', 'Some items could not be deleted');
                        this.refresh();
                    });
            }
        });
    }

    load(e: any) {
        if (!e) return;
        if (e.rows && e.rows !== this._pageSize()) {
            this._pageSize.set(e.rows);
            this.reset();
        }
        const sf = e.sortField ?? null,
            so: 1 | -1 | 0 = e.sortOrder ?? 1;
        if (sf !== this.prevSortField || so !== this.prevSortOrder) {
            this.prevSortField = sf;
            this.prevSortOrder = so;
            this.reset();
        }
        const first = e.first || 0;
        this.page = Math.floor(first / this._pageSize());
        this.lastKey = this.pageKeys[this.page] || null;
        this.applyFilters(e.filters || {});
        Object.assign(this.filters, { sortField: sf, sortOrder: so, pageSize: this._pageSize(), lastKey: this.lastKey });
        if (!this.lastKey) (this.filters as any).offset = first;
        else delete (this.filters as any).offset;

        delete (this.filters as any)['status.notEquals'];
        delete (this.filters as any)['status.equals'];
        delete (this.filters as any)['gender.equals'];
        if (this.activeFilters.status === 'active') (this.filters as any)['status.notEquals'] = 'dead,discharged';
        else if (this.activeFilters.status === 'nonactive') (this.filters as any)['status.equals'] = 'dead,discharged';
        if (this.activeFilters.gender) (this.filters as any)['gender.equals'] = this.activeFilters.gender;

        this.fetch(this.kind());
    }

    private fetch(kind: TabKey) {
        this._loading.set(true);
        const seq = ++this.reqSeq;
        const req$ = kind === 'patients' ? this.patientsService.getPatientsPage(this.filters) : this.doctorsService.getDoctorsPage(this.filters);
        req$.subscribe({
            next: (r) => {
                if (seq !== this.reqSeq) return;
                this._rows.set(r.data || []);
                this._totalRecords.set(r.totalCount || 0);
                if (r.lastKey) this.pageKeys[this.page + 1] = r.lastKey;
                else this.pageKeys = this.pageKeys.slice(0, this.page + 1);
                this._loading.set(false);
            },
            error: () => {
                if (seq !== this.reqSeq) return;
                this._loading.set(false);
                this._rows.set([]);
                this._totalRecords.set(0);
            }
        });
    }

    async downloadTemplate(kind: TabKey) {
        const headers = this.columnsSig().map((c) => c.header || c.field);
        const base = (this.configSig().title || kind).replace(/\s+/g, '_').toLowerCase();
        const XLSX = await import('xlsx');
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers]);
        (ws as any)['!cols'] = headers.map((h) => ({ wch: Math.max(12, (h ?? '').length + 2) }));
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        XLSX.writeFile(wb, `${base}_template.xlsx`);
    }

    refresh() {
        this.fetch(this.kind());
    }

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

    private isDoctorRow(pk?: string) {
        return this.kind() === 'doctors' || (pk ?? '').startsWith('DOCTOR#');
    }

    saveRow(row: Patient, rowIndex: number, api: any) {
        const pk = (row as any)?.PK;
        const id = pk ? pk.split('#')[1] || pk : undefined;
        if (!id) {
            this.helpers.notifyError('Save failed', 'Missing id');
            return;
        }

        this._loading.set(true);
        const body = row as unknown as CreateUpdatePatientRequest;

        const req$ = this.isDoctorRow(pk) ? this.doctorsService.updateDoctor(id, body) : this.patientsService.updatePatient(id, body);

        req$.subscribe({
            next: () => {
                this._loading.set(false);
                api.saveRowEdit(row, rowIndex);
                this.helpers.notifySuccess(`${new TitleCasePipe().transform(row?.name ?? '')} updated`);
                this.refresh();
            },
            error: () => {
                this._loading.set(false);
                api.cancelRowEdit(row, rowIndex);
                this.helpers.notifyError('Update failed', 'Could not save');
            }
        });
    }

    deleteRow(row: Patient) {
        const pk = (row as any)?.PK ?? '',
            id = this.pkToId(pk);
        if (!id) {
            this.helpers.notifyError('Delete failed', 'Missing id');
            return;
        }
        const isDoctor = pk.startsWith('DOCTOR#') || this.kind() === 'doctors';
        this.confirm.confirm({
            key: 'global',
            header: 'Confirm Deletion',
            message: `Delete ${new TitleCasePipe().transform(row?.name ?? '')}?`,
            icon: 'pi pi-exclamation-triangle',
            rejectButtonProps: { label: 'No', severity: 'secondary', variant: 'text' },
            acceptButtonProps: { label: 'Yes', severity: 'danger' },
            accept: () => {
                this._loading.set(true);
                const del$ = isDoctor ? this.doctorsService.deleteDoctor(id) : this.patientsService.deletePatient(id);
                del$.pipe(finalize(() => this._loading.set(false))).subscribe({
                    next: () => {
                        this.helpers.notifySuccess(`${new TitleCasePipe().transform(row.name)} Deleted`);
                        this.refresh();
                    },
                    error: () => {
                        this.helpers.notifyError('Delete failed', 'Could not delete');
                    }
                });
            }
        });
    }

    getStatusSeverity(v?: string) {
        return STATUS_SEVERITY[this.kind()][(v || '').toLowerCase().trim()] || 'info';
    }
    getGenderSeverity(v?: string) {
        return GENDER_SEVERITY[(v || '').toLowerCase().trim()] || 'secondary';
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
            if (k === 'global') {
                (base as any).search = value;
                continue;
            }
            (base as any)[k] = { value, matchMode: matchMode ?? 'contains', operator: (operator as 'and' | 'or') ?? 'and' };
        }
        this.filters = base;
    }

    private reset() {
        this.page = 0;
        this.lastKey = null;
        this.pageKeys = [null];
        this._selected.set([]);
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
            const epoch = new Date(Math.round((v - 25569) * 86400 * 1000));
            return isNaN(+epoch) ? undefined : epoch.toISOString().slice(0, 10);
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
            const d = new Date(s);
            return isNaN(+d) ? undefined : d.toISOString().slice(0, 10);
        }
        return undefined;
    }
    private prepare(rows: any[]) {
        const accepted = new Set(['name', 'phone', 'dob', 'gender', 'insurance', 'job', 'licenseNumber', 'qatarID', 'qid']);
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
            const item: any = { name, phone, gender, qid, insurance: String(get('insurance') || '').trim(), job: String(get('job') || '').trim(), licenseNumber: String(get('licenseNumber') || '').trim(), ...(dob ? { dob } : {}) };
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
                        this.patientsService.createPatient(r).pipe(
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
                this.refresh();
            });
    }

    private pkToId(pk: string) {
        const m = /^PATIENTS?#(.+)$/.exec(pk);
        return m ? m[1] : (pk?.split('#')[1] ?? pk);
    }
}

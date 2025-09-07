// table-demo.component.ts
import { Component, AfterViewInit, OnDestroy, TemplateRef, ViewChild, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of, from, Subject } from 'rxjs';
import { catchError, finalize, map, mergeMap, toArray } from 'rxjs/operators';
import { TableColumn, TableConfig, RowEditEvent, FilterControl } from '../../interfaces/tableplugin.interfaces';
import { GenericTableComponent } from './tableplugin';
import { Patient, GetPatientsPageOpts, PatientsService, CreateUpdatePatientRequest } from '../service/patients.service';
import { ConfirmationService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { DialogService } from 'primeng/dynamicdialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NewPatient } from '@/components/new-patient/new-patient';
import { Helpers } from '@/services/helpers';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ButtonModule } from 'primeng/button';
import { Tooltip } from "primeng/tooltip";

type StatusFilter = 'active' | 'nonactive' | null;
type GenderFilter = 'male' | 'female' | null;
type ActiveFilters = { status: StatusFilter; gender: GenderFilter; [k: string]: any };

@Component({
    selector: 'app-table-demo',
    standalone: true,
    imports: [CommonModule, GenericTableComponent, TagModule, ConfirmDialogModule, ButtonModule, Tooltip],
    providers: [DialogService],
    template: ` <ng-template #tbStart let-api="api" let-selected="selected">
            <p-button class="mr-2" [disabled]="loading" label="New Patient" icon="pi pi-plus" (onClick)="openNewPatient()"></p-button>
            <p-button class="mr-2" [disabled]="!selected?.length" label="Delete Selected" icon="pi pi-trash" severity="danger" outlined (onClick)="deleteSelectedPatients()"></p-button>
            <input type="file" #fileInput accept=".xlsx,.xls,.csv" (change)="onImportFromFileInput($event)" hidden />
            <p-button class="mr-2" label="Import" icon="pi pi-upload" severity="secondary" (onClick)="fileInput.click()"></p-button>
            <p-button class="mr-2" label="Template" icon="pi pi-file-excel" severity="secondary" (onClick)="downloadTemplate()"></p-button>
        </ng-template>
        <ng-template #tbEnd let-api="api"><p-button label="Export" icon="pi pi-download" severity="secondary" (onClick)="exportCSV()"></p-button></ng-template>
        <ng-template #rowActions let-row let-editing="editing" let-api="api" let-rowIndex="rowIndex">
            <ng-container *ngIf="!editing; else editCtrls"><p-button icon="pi pi-pencil" text (onClick)="api.beginRowEdit(row, rowIndex)" pTooltip="Edit"></p-button></ng-container>
            <ng-template #editCtrls>
                <p-button icon="pi pi-check" text severity="success" (onClick)="saveRow(row, rowIndex, api)" pTooltip="Save"></p-button>
                <p-button icon="pi pi-times" text severity="danger" (onClick)="api.cancelRowEdit(row, rowIndex)" pTooltip="Cancel"></p-button>
            </ng-template>
        </ng-template>
        <app-generic-table
            [columns]="patientColumns"
            [data]="patients"
            [totalRecords]="totalRecords"
            [loading]="loading"
            [config]="tableConfig"
            [customTemplates]="customTemplates"
            [selectedRows]="selectedPatients"
            [filterControls]="filterControls"
            [activeFilters]="activeFilters"
            (filterControlChange)="onFilterControlChange($event)"
            [visibleColumnFields]="visibleColumnFields"
            (columnsVisibilityChange)="visibleColumnFields = $event"
            [actionsTemplate]="rowActions"
            [toolbarStart]="tbStart"
            [toolbarEnd]="tbEnd"
            dataKey="PK"
            (lazyLoad)="loadPatients($event)"
            (selectionChange)="onSelectionChange($event)"
            (rowEditInit)="onRowEditInit($event)"
            (rowEditSave)="onRowEditSave($event)"
            (rowEditCancel)="onRowEditCancel($event)"
        >
            <ng-template #statusTemplate let-value="value"><p-tag [value]="value | uppercase" [severity]="getStatusSeverity(value)"></p-tag></ng-template>
            <ng-template #genderTemplate let-value="value"><p-tag [value]="value | titlecase" [severity]="getGenderSeverity(value)"></p-tag></ng-template>
        </app-generic-table>
        <p-confirmDialog key="global" appendTo="body" [baseZIndex]="200000"></p-confirmDialog>`
})
export class TableDemo implements AfterViewInit, OnDestroy {
    @ViewChild('statusTemplate') statusTemplate!: TemplateRef<any>;
    @ViewChild('genderTemplate') genderTemplate!: TemplateRef<any>;
    @ViewChild(GenericTableComponent) tableCmp?: GenericTableComponent;
    patients: Patient[] = [];
    selectedPatients: Patient[] = [];
    loading = true;
    totalRecords = 0;
    visibleColumnFields: string[] = ['name', 'gender', 'insurance', 'phone', 'qid', 'dob', 'timestamp', 'status'];
    customTemplates: { [k: string]: TemplateRef<any> } = {};
    filters: GetPatientsPageOpts = { pageSize: 15, lastKey: null };
    activeFilters: ActiveFilters = { status: null, gender: null };
    EditorType = { Text: 'text', Date: 'date', Number: 'number', Textarea: 'textarea', Autocomplete: 'autocomplete' } as const;
    STATUS_OPTIONS = [
        { label: 'ADMITTED', value: 'admitted' },
        { label: 'STABLE', value: 'stable' },
        { label: 'UNDER TREATMENT', value: 'under treatment' },
        { label: 'DISCHARGED', value: 'discharged' },
        { label: 'CRITICAL', value: 'critical' },
        { label: 'DEAD', value: 'dead' }
    ] as const;
    GENDER_OPTIONS = [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' },
        { label: 'Prefer not to Answer', value: 'na' }
    ] as const;
    filterControls: FilterControl[] = [
        {
            id: 'status',
            type: 'cycle',
            icon: 'pi pi-users',
            tooltip: 'Toggle status quick filter',
            outlined: true,
            values: [null, 'active', 'nonactive'],
            getLabel: (v) => (v === 'active' ? 'Non-Active Patients' : v === 'nonactive' ? 'All Patients' : 'Active Patients'),
            getIcon: (v) => (v === 'active' ? 'pi pi-user-minus' : 'pi pi-users')
        },
        { id: 'gender', type: 'cycle', icon: 'pi pi-user', tooltip: 'Cycle gender filter', outlined: true, values: [null, 'male', 'female'], getLabel: (v) => (v === 'male' ? 'Female' : v === 'female' ? 'All Genders' : 'Male') }
    ];
    private reqSeq = 0;
    private lastKey: string | null = null;
    private pageKeys: (string | null)[] = [null];
    private page = 0;
    private pageSize = 15;
    private prevSortField: string | null = null;
    private prevSortOrder: 1 | -1 | 0 | null = null;
    private destroy$ = new Subject<void>();
    private dialog = inject(DialogService);
    private destroyRef = inject(DestroyRef);
    constructor(
        private patientsService: PatientsService,
        private confirmationService: ConfirmationService,
        private helpersFunctions: Helpers
    ) {}
    ngAfterViewInit() {
        this.customTemplates = { status: this.statusTemplate, gender: this.genderTemplate };
        this.pageSize = this.tableConfig.defaultPageSize ?? 15;
        this.filters.pageSize = this.pageSize;
    }
    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
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
        if (!this.lastKey) (this.filters as any).offset = first;
        else delete (this.filters as any).offset;
        delete (this.filters as any)['status.notEquals'];
        delete (this.filters as any)['status.equals'];
        delete (this.filters as any)['gender.equals'];
        const st = this.activeFilters.status;
        if (st === 'active') (this.filters as any)['status.notEquals'] = 'dead,discharged';
        else if (st === 'nonactive') (this.filters as any)['status.equals'] = 'dead,discharged';
        const g = this.activeFilters.gender;
        if (g === 'male' || g === 'female') (this.filters as any)['gender.equals'] = g;
        this.fetch();
    }
    private fetch() {
        this.loading = true;
        const seq = ++this.reqSeq;
        this.patientsService.getPatientsPage(this.filters).subscribe({
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
        this.selectedPatients = [];
    }
    onSelectionChange(selectedRows: Patient[]) {
        this.selectedPatients = selectedRows;
    }
    onFilterControlChange(e: { id: string; value: any }) {
        (this.activeFilters as any)[e.id] = e.value;
        this.reset();
        this.filters = { pageSize: this.pageSize, lastKey: null, offset: 0 };
        this.loadPatients({ first: 0, rows: this.pageSize, sortField: this.prevSortField, sortOrder: this.prevSortOrder, filters: {} });
    }

    onRowEditInit(event: RowEditEvent<Patient>) {
        this.helpersFunctions.notifyInfo('Edit Mode', `Editing patient: ${event.data.name || 'Unknown'}`);
    }
    onRowEditSave(event: RowEditEvent<Patient>) {
        if (!event?.data?.PK) return;
        const id = event.data.PK.split('#')[1];
        if (!id) return;
        this.loading = true;
        this.patientsService.updatePatient(id, event.data as CreateUpdatePatientRequest).subscribe({
            next: () => {
                this.loading = false;
                this.helpersFunctions.notifySuccess('Patient Updated Successfully!');
            },
            error: () => {
                this.loading = false;
                this.patients = [];
                this.totalRecords = 0;
            }
        });
    }
    onRowEditCancel(event: RowEditEvent<Patient>) {
        this.helpersFunctions.notifyInfo('Edit Cancelled', `Changes to patient ${event.data.name || 'Unknown'} were discarded`);
    }

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
                const ids = Array.from(new Set(this.selectedPatients.map((p) => this.pkToId(p.PK)).filter(Boolean)));
                this.loading = true;
                const tasks = ids.map((id) =>
                    this.patientsService.deletePatient(id).pipe(
                        map(() => ({ id, ok: true as const })),
                        catchError(() => of({ id, ok: false as const }))
                    )
                );
                forkJoin(tasks)
                    .pipe(finalize(() => (this.loading = false)))
                    .subscribe((results) => {
                        const failed = results.filter((r) => !r.ok).length;
                        this.selectedPatients = [];
                        if (!failed) this.helpersFunctions.notifySuccess('Patient(s) profile delete successfully!');
                        else this.helpersFunctions.notifyError('Delete failed', 'Could not delete patient(s) profile!');
                        this.refreshPatientTable();
                    });
            }
        });
    }

    exportCSV() {
        const ts = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
        this.tableCmp?.exportCSV({ selectionOnly: this.selectedPatients.length > 0, filename: `patients_${ts}`, applyPipes: true, columns: this.patientColumns.map((c) => c.field) });
    }
    openNewPatient() {
        const ref = this.dialog.open(NewPatient, { width: '50vw', modal: true, dismissableMask: true, data: { name: 'Sami' }, focusOnShow: false });
        ref.onClose.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((r) => {
            if (r) {
                this.helpersFunctions.notifySuccess('Patient profile created successfully!');
                this.refreshPatientTable();
            }
        });
    }
    refreshPatientTable() {
        this.fetch();
    }

    onImportFromFileInput(ev: Event) {
        const list = (ev.target as HTMLInputElement).files;
        if (!list?.length) return;
        this.onImportPatients(Array.from(list));
        (ev.target as HTMLInputElement).value = '';
    }
    onImportPatients(input: File[] | { files?: File[] } | Event) {
        const files: File[] = Array.isArray(input) ? input : ((input as any)?.files ?? []);
        const file = files?.[0];
        console.log(file);        
        if (!file) return;
        this.loading = true;
        this.readWorkbook(file)
            .then((rows) => {
                console.log(rows);
                const { valid, skipped } = this.preparePatients(rows);
                const seen = new Set<string>();
                console.log(valid);
                
                const unique = valid.filter((r) => {
                    console.log(r);
                    
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
                    reject: () => {
                        this.loading = false;
                    }
                });
            })
            .catch(() => {
                this.loading = false;
                this.helpersFunctions.notifyError('Import failed', 'Could not read the file');
            });
    }
    private async readWorkbook(file: File): Promise<any[]> {
        const { read, utils } = await import('xlsx');
        const wb = read(await file.arrayBuffer(), { type: 'array' });
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
            const genderRaw = String(get('gender') || '')
                .trim()
                .toLowerCase();
            const gender = genderRaw.startsWith('m') ? 'male' : genderRaw.startsWith('f') ? 'female' : genderRaw.startsWith('prefer') ? 'na' : genderRaw || '';
            if (!name || !phone || !gender || !qatarID) {
                skipped.push(r);
                continue;
            }
            const dob = this.toISODate(get('dob'));
            const item: any = { name, phone, gender, qid: qatarID, insurance: String(get('insurance') || '').trim(), job: String(get('job') || '').trim(), licenseNumber: String(get('licenseNumber') || '').trim(), ...(dob ? { dob } : {}) };
            for (const k of Object.keys(r)) {
                if (!accepted.has(k)) continue;
            }
            valid.push(item);
        }
        return { valid, skipped };
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

    private bulkCreatePatients(rows: any[]) {
        console.log(rows);
        
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
                finalize(() => (this.loading = false))
            )
            .subscribe((results) => {
                const ok = results.filter(Boolean).length,
                    total = results.length;
                if (ok === total) this.helpersFunctions.notifySuccess('Import completed successfully.');
                else if (!ok) this.helpersFunctions.notifyError('Import failed', 'No patient was created.');
                else this.helpersFunctions.notifyError('Import partial', `${ok}/${total} patient(s) created.`);
                this.refreshPatientTable();
            });
    }
    saveRow(row: Patient, rowIndex: number, api: any) {
        const pk: string | undefined = (row as any)?.PK;
        const id = pk ? pk.split('#')[1] || pk : undefined;
        if (!id) {
            this.helpersFunctions.notifyError('Save failed', 'Missing patient id');
            return;
        }
        this.loading = true;
        this.patientsService.updatePatient(id, row as unknown as CreateUpdatePatientRequest).subscribe({
            next: () => {
                this.loading = false;
                api.saveRowEdit(row, rowIndex);
                this.helpersFunctions.notifySuccess('Patient Updated Successfully!');
                this.refreshPatientTable();
            },
            error: () => {
                this.loading = false;
                api.cancelRowEdit(row, rowIndex);
                this.helpersFunctions.notifyError('Update failed', 'Could not save changes');
            }
        });
    }
    async downloadTemplate(): Promise<void> {
        const headers = this.patientColumns.map((c) => c.header || c.field);
        const base = (this.tableConfig?.title || 'table').replace(/\s+/g, '_').toLowerCase();
        const { utils, writeFile } = await import('xlsx');
        const wb = utils.book_new();
        const ws = utils.aoa_to_sheet([headers]);
        (ws as any)['!cols'] = headers.map((h) => ({ wch: Math.max(12, h.length + 2) }));
        utils.book_append_sheet(wb, ws, 'Template');
        writeFile(wb, `${base}_template.xlsx`);
    }
    private statusMap: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'contrast' | 'secondary'> = { stable: 'success', critical: 'danger', admitted: 'info', 'under treatment': 'warn', dead: 'contrast', discharged: 'secondary' };
    private genderMap: Record<string, 'info' | 'danger' | 'secondary'> = { male: 'info', female: 'danger', na: 'secondary' };
    getStatusSeverity(v?: string) {
        return this.statusMap[(v || '').toLowerCase().trim()] || 'info';
    }
    getGenderSeverity(v?: string) {
        return this.genderMap[(v || '').toLowerCase().trim()] || 'secondary';
    }
    private pkToId(pk: string) {
        const m = /^PATIENTS?#(.+)$/.exec(pk);
        return m ? m[1] : (pk?.split('#')[1] ?? pk);
    }

    patientColumns: TableColumn[] = [
        { field: 'name', header: 'Name', editable: true, editorType: this.EditorType.Text, pipe: 'titlecase', sortable: true, filterable: true },
        { field: 'gender', header: 'Gender', editable: true, editorType: this.EditorType.Autocomplete, editorOptions: this.GENDER_OPTIONS, customTemplate: true, filterable: true },
        { field: 'insurance', header: 'Insurance', editable: true, editorType: this.EditorType.Text, pipe: 'uppercase', filterable: true },
        { field: 'phone', header: 'Phone', editable: true, editorType: this.EditorType.Text, filterable: true },
        { field: 'qid', header: 'Qatar ID', editable: true, editorType: this.EditorType.Text, filterable: true },
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
        editType: 'row',
        showColumnPicker: true
    };
}

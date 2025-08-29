import { ChangeDetectorRef, Component, DestroyRef, inject, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { GenericTableComponent, TableColumn, TableConfig, RowEditEvent, ToolbarConfig } from './tableplugin';
import { Patient, PatientService, GetPatientsPageOpts } from '../service/patients.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NewPatient } from '@/components/new-patient/new-patient';
import { Helpers } from '@/services/helpers';

@Component({
    selector: 'app-table-demo',
    standalone: true,
    imports: [CommonModule, GenericTableComponent, TagModule],
    providers: [ConfirmationService, DialogService],
    template: `
        <!-- Add the missing event bindings for rowEditInit and rowEditSave -->
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
            (newClick)="openNewPatient()"
            (deleteClick)="deleteSelectedPatients()"
            (exportClick)="exportCSV()"
            (rowEditInit)="onRowEditInit($event)"
            (rowEditSave)="onRowEditSave($event)"
        >
            <ng-template #statusTemplate let-value="value" let-row="row" let-col="col">
                <p-tag [value]="value | uppercase" [severity]="getSeverity(value)"></p-tag>
            </ng-template>

            <ng-template #actionsTemplate let-row="row" let-index="index">
                <!-- Your action buttons here if needed -->
            </ng-template>
        </app-generic-table>
    `
})
export class TableDemo implements OnDestroy {
    @ViewChild('statusTemplate') statusTemplate!: TemplateRef<any>;
    @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<any>;
    @ViewChild(GenericTableComponent) tableCmp?: GenericTableComponent;

    EditorType = { Text: 'text', Date: 'date', Number: 'number', Textarea: 'textarea', Autocomplete: 'autocomplete' } as const;
    STATUS_OPTIONS = [
        { label: 'QUALIFIED', value: 'qualified' },
        { label: 'SENIOR', value: 'senior' },
        { label: 'MID-SENIOR', value: 'mid-senior' },
        { label: 'JUNIOR', value: 'junior' }
    ] as const;

    patients: Patient[] = [];
    selectedPatients: Patient[] = []; // NEW: Track selected patients
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
        private svc: PatientService,
        private confirmationService: ConfirmationService,
        private cd: ChangeDetectorRef,
        private messageService: MessageService,
        private helpersFunctions: Helpers
    ) {}

    ngAfterViewInit() {
        this.customTemplates = { status: this.statusTemplate };
        this.pageSize = this.tableConfig.defaultPageSize ?? 15;
        this.filters.pageSize = this.pageSize;
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
        this.page = Math.floor((e.first || 0) / this.pageSize);
        this.lastKey = this.pageKeys[this.page] || null;
        this.applyFilters(e.filters || {});
        (this.filters as any).sortField = newSortField;
        (this.filters as any).sortOrder = newSortOrder;
        this.filters = { ...this.filters, pageSize: this.pageSize, lastKey: this.lastKey };
        this.fetch();
    }

    private fetch() {
        this.loading = true;
        this.svc
            .getPatientsPage(this.filters)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (r) => {
                    this.patients = r.data || [];
                    this.totalRecords = r.totalCount || 0;
                    if (r.lastKey) this.pageKeys[this.page + 1] = r.lastKey;
                    else this.pageKeys = this.pageKeys.slice(0, this.page + 1);
                    this.loading = false;
                },
                error: () => {
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
        // Clear selection when resetting
        this.selectedPatients = [];
    }

    // NEW: Handle selection changes
    onSelectionChange(selectedRows: Patient[]) {
        this.selectedPatients = selectedRows;
        console.log('Selected patients:', this.selectedPatients);
    }

    getSeverity(v?: string): 'success' | 'info' | 'warn' | 'danger' {
        switch ((v || '').toLowerCase().trim()) {
            case 'qualified':
                return 'success';
            case 'senior':
                return 'danger';
            case 'mid-senior':
                return 'info';
            case 'junior':
                return 'warn';
            default:
                return 'info';
        }
    }

    openNew() {
        console.log('New clicked');
        // Implement your new record logic here
    }

    // UPDATED: Delete selected patients instead of products
    deleteSelectedPatients() {
        console.log(this.selectedPatients);
        if (this.selectedPatients.length === 0) {
            this.helpersFunctions.notifyInfo('Warning', 'No patients selected for deletion');
            return;
        }
        this.confirmationService.confirm({
            message: `Are you sure you want to delete ${this.selectedPatients.length} selected patient(s)?`,
            header: 'Confirm Deletion',
            icon: 'pi pi-exclamation-triangle',
            rejectButtonProps: {
                label: 'No',
                severity: 'secondary',
                variant: 'text'
            },
            acceptButtonProps: {
                severity: 'danger',
                label: 'Yes'
            },
            accept: () => {
                // Here you would typically call your service to delete the patients
                console.log('Deleting patients:', this.selectedPatients);

                // For demo purposes, just clear the selection
                this.selectedPatients = [];

                this.messageService.add({
                    severity: 'success',
                    summary: 'Successful',
                    detail: 'Patients Deleted',
                    life: 3000
                });

                // Optionally refresh the table data
                this.refreshPatientTable();
            }
        });
    }

    exportCSV() {
        if (this.tableCmp) {
            this.tableCmp.exportCSV();
        }
    }

    openNewPatient() {
        this.ref = this.dialog.open(NewPatient, {
            width: '50vw',
            modal: true,
            dismissableMask: true,
            data: { name: 'Sami' }
        });

        this.ref.onClose.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result) => {
            if (result) {
                console.log('New patient created:', result);
                this.lastResult = result;

                // Show success notification after dialog closes
                this.helpersFunctions.notifySuccess('Patient profile created successfully!');

                // Refresh the table to show the new patient
                this.refreshPatientTable();
            }
        });
    }

    refreshPatientTable(): void {
        this.fetch();
    }

    // NEW: Utility methods for working with selection
    clearSelection() {
        this.selectedPatients = [];
        if (this.tableCmp) {
            this.tableCmp.clearSelection();
        }
    }

    getSelectedPatientIds(): string[] {
        return this.selectedPatients.map((patient) => patient.PK);
    }

    isPatientSelected(patient: Patient): boolean {
        return this.selectedPatients.some((selected) => selected.PK === patient.PK);
    }

    onRowEditInit(ev: RowEditEvent<any>) {
        console.log('Edit INIT', ev);
    }
    onRowEditSave(ev: RowEditEvent<any>) {
        console.log('Edit SAVE', ev);
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    patientColumns: TableColumn[] = [
        { field: 'name', header: 'Name', editable: true, editorType: this.EditorType.Text, pipe: 'titlecase', sortable: true, filterable: true },
        { field: 'gender', header: 'Gender', editable: true, editorType: this.EditorType.Text, pipe: 'titlecase', filterable: true },
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
        // NEW: Selection configuration
        selectable: true,
        selectionMode: 'multiple',
        showSelectAll: true
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

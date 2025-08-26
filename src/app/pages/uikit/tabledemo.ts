import { ChangeDetectorRef, Component, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { GenericTableComponent, TableColumn, TableConfig, RowEditEvent, ToolbarConfig } from './tableplugin';
import { Patient, PatientService, GetPatientsPageOpts } from '../service/patients.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TagModule } from 'primeng/tag';

@Component({
    selector: 'app-table-demo',
    standalone: true,
    imports: [CommonModule, GenericTableComponent, TagModule], // Add TagModule for p-tag in template
    providers: [MessageService, ConfirmationService],
    template: `
        <app-generic-table
            [columns]="patientColumns"
            [data]="patients"
            [totalRecords]="totalRecords"
            [loading]="loading"
            [config]="tableConfig"
            [toolbarConfig]="toolbarConfig"
            [isLazy]="true"
            [hasSelectedItems]="!!selectedProducts?.length"
            dataKey="PK"
            (lazyLoad)="loadPatients($event)"
            (newClick)="openNew()"
            (deleteClick)="deleteSelectedProducts()"
            (exportClick)="exportCSV()"
            (rowEditInit)="onRowEditInit($event)"
            (rowEditSave)="onRowEditSave($event)"
            (rowEditCancel)="onRowEditCancel($event)"
            [customTemplates]="customTemplates"
            [actionsTemplate]="actionsTemplate"
        >
            <ng-template #statusTemplate let-row let-value="value">
                <p-tag [value]="value || '' | uppercase" [severity]="getSeverity(value)"></p-tag>
            </ng-template>
            <ng-template #actionsTemplate let-row></ng-template>
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
    loading = true;
    totalRecords = 0;
    private lastKey: string | null = null;
    private pageKeys: (string | null)[] = [null];
    private page = 0;
    private pageSize = 15;
    private prevSortField: string | null = null;
    private prevSortOrder: 1 | -1 | 0 | null = null;
    filters: GetPatientsPageOpts = { pageSize: this.pageSize, lastKey: null };
    selectedProducts: any;
    customTemplates: { [key: string]: TemplateRef<any> } = {};
    private destroy$ = new Subject<void>();

    constructor(
        private svc: PatientService,
        private confirmationService: ConfirmationService,
        private cd: ChangeDetectorRef,
        private messageService: MessageService
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
    }

    onRowEditInit(ev: RowEditEvent<Patient>) {
        console.log('Edit INIT', ev.data);
    }
    onRowEditSave(ev: RowEditEvent<Patient>) {
        console.log('Edit SAVE', ev.data);
    }
    onRowEditCancel(ev: RowEditEvent<Patient>) {
        console.log('Edit CANCEL', ev.data);
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

    deleteSelectedProducts() {
        this.confirmationService.confirm({
            message: 'Are you sure you want to delete the selected products?',
            header: 'Confirm',
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
                this.selectedProducts = null;
                this.messageService.add({
                    severity: 'success',
                    summary: 'Successful',
                    detail: 'Products Deleted',
                    life: 3000
                });
            }
        });
    }

    exportCSV() {
        if (this.tableCmp) {
            this.tableCmp.exportCSV();
        }
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    patientColumns: TableColumn[] = [
        { field: 'name', header: 'Name', editable: true, editorType: this.EditorType.Text, pipe: 'titlecase', sortable: true, filterable: true },
        { field: 'gender', header: 'Gender', editable: true, editorType: this.EditorType.Text, pipe: 'titlecase', filterable: true },
        { field: 'insurance', header: 'Insurance', editable: true, editorType: this.EditorType.Text, pipe: 'titlecase', filterable: true },
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
        showResultsSummary: true
    };

    toolbarConfig: ToolbarConfig = {
        showNew: true,
        showDelete: true,
        showImport: true,
        showExport: true,
        newLabel: 'New',
        deleteLabel: 'Delete',
        importLabel: 'Import',
        exportLabel: 'Export'
    };
}

import { Component, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { Patient, PatientService, GetPatientsPageOpts } from '../service/patients.service';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { GenericTableComponent, TableColumn, TableConfig } from './tableplugin';
import { TagModule } from 'primeng/tag';

@Component({
    selector: 'app-table-demo',
    standalone: true,
    imports: [CommonModule, GenericTableComponent, ButtonModule, TagModule],
    template: `
        <!-- Your Generic Table -->
        <app-generic-table
            [columns]="patientColumns"
            [data]="patients"
            [totalRecords]="totalRecords"
            [loading]="loading"
            [config]="tableConfig"
            [isLazy]="true"
            dataKey="PK"
            (lazyLoad)="loadPatients($event)"
            [actionsTemplate]="actionsTemplate"
            [customTemplates]="customTemplates"
        >
            <!-- Custom template for insurance with styling -->
            <ng-template #insuranceTemplate let-patient let-value="value">
                <span
                    class="px-2 py-1 rounded-full text-xs font-medium"
                    [ngClass]="{
                        'bg-green-100 text-green-800': value?.toLowerCase() === 'premium',
                        'bg-yellow-100 text-yellow-800': value?.toLowerCase() === 'standard',
                        'bg-gray-100 text-gray-800': value?.toLowerCase() === 'basic'
                    }"
                >
                    {{ value | titlecase }}
                </span>
            </ng-template>

            <!-- Improved Status Template with Better Color Hierarchy -->
            <ng-template #statusTemplate let-patient let-value="value">
                <p-tag [value]="value" [severity]="getSeverity(value)"></p-tag>
            </ng-template>

            <!-- Actions template -->
            <ng-template #actionsTemplate let-patient>
                <div class="flex gap-1">
                    <button pButton icon="pi pi-eye" class="p-button-rounded p-button-text p-button-sm" (click)="viewPatient(patient)" title="View Patient"></button>
                    <button pButton icon="pi pi-pencil" class="p-button-rounded p-button-text p-button-sm" (click)="editPatient(patient)" title="Edit Patient"></button>
                    <button pButton icon="pi pi-trash" class="p-button-rounded p-button-text p-button-sm p-button-danger" (click)="deletePatient(patient)" title="Delete Patient"></button>
                </div>
            </ng-template>
        </app-generic-table>
    `
})
export class TableDemo implements OnDestroy {
    @ViewChild('insuranceTemplate') insuranceTemplate!: TemplateRef<any>;
    @ViewChild('statusTemplate') statusTemplate!: TemplateRef<any>;
    @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<any>;

    patients: Patient[] = [];
    loading = true;
    totalRecords = 0;

    // Pagination state (keep your existing logic)
    private currentLastKey: string | null = null;
    private pageKeys: (string | null)[] = [null];
    private currentPage = 0;
    private pageSize = 3;

    filters: GetPatientsPageOpts = {
        pageSize: 3,
        lastKey: null
    };

    // Define your table columns
    patientColumns: TableColumn[] = [
        {
            field: 'name',
            header: 'Name',
            pipe: 'titlecase',
            filterable: true,
            sortable: true
        },
        {
            field: 'gender',
            header: 'Gender',
            pipe: 'titlecase',
            filterable: true
        },
        {
            field: 'insurance',
            header: 'Insurance',
            customTemplate: true, // This will use the insuranceTemplate
            filterable: true
        },
        {
            field: 'dob',
            header: 'Date of Birth',
            type: 'date',
            pipe: 'date',
            dateFormat: 'MM/dd/yyyy',
            filterable: true
        },
        {
            field: 'timestamp',
            header: 'Submitted Date',
            type: 'date',
            pipe: 'date',
            dateFormat: 'MM/dd/yyyy',
            filterable: true
        },
        {
            field: 'status',
            header: 'Level',
            customTemplate: true, // This will use the statusTemplate
            filterable: true
        }
    ];

    // Table configuration
    tableConfig: TableConfig = {
        title: 'Patient Management',
        showGlobalSearch: true,
        showClearButton: true,
        pageSizeOptions: [5, 10, 15, 25, 50, 100],
        defaultPageSize: 15,
        scrollHeight: '600px',
        emptyMessage: 'No patients found matching your criteria.',
        loadingMessage: 'Loading patient data...'
    };

    // Custom templates mapping
    customTemplates: { [key: string]: TemplateRef<any> } = {};

    private destroy$ = new Subject<void>();

    constructor(private patientsService: PatientService) {}

    ngAfterViewInit() {
        // Map your custom templates
        this.customTemplates = {
            insurance: this.insuranceTemplate,
            status: this.statusTemplate
        };
    }

    // Your existing loadPatients method with minor adjustments
    loadPatients(event: any) {
        console.log('loadPatients event:', event);

        if (!event) return;

        // Handle page size changes
        if (event.rows && event.rows !== this.pageSize) {
            console.log('Page size changed from', this.pageSize, 'to', event.rows);
            this.pageSize = event.rows;
            this.resetPagination();
        }

        // Calculate current page based on event.first
        const newPage = Math.floor((event.first || 0) / this.pageSize);
        console.log('Calculated page:', newPage, 'from first:', event.first, 'pageSize:', this.pageSize);

        this.currentPage = newPage;
        this.currentLastKey = this.pageKeys[newPage] || null;

        console.log('Current page:', this.currentPage, 'lastKey:', this.currentLastKey);

        // Build filters
        this.buildFilterOptions(event.filters || {});

        // Update filters object with correct pagination info
        this.filters = {
            ...this.filters,
            pageSize: this.pageSize,
            lastKey: this.currentLastKey
        };

        console.log('Final filters being sent:', this.filters);
        this.loadData();
    }

    // Keep your existing methods
    private loadData() {
        this.loading = true;

        this.patientsService
            .getPatientsPage(this.filters)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    console.log('API Response:', response);
                    console.log('Items returned:', response.data?.length);

                    this.patients = response.data || [];
                    this.totalRecords = response.totalCount || 0;

                    // Handle pagination keys for next page
                    if (response.lastKey) {
                        this.pageKeys[this.currentPage + 1] = response.lastKey;
                        console.log('Stored lastKey for next page:', response.lastKey);
                    } else {
                        // No more pages, trim the pageKeys array
                        this.pageKeys = this.pageKeys.slice(0, this.currentPage + 1);
                        console.log('No more pages, trimmed pageKeys');
                    }

                    this.loading = false;
                },
                error: (error) => {
                    console.error('Error loading patients:', error);
                    this.loading = false;
                    this.patients = [];
                    this.totalRecords = 0;
                }
            });
    }

    private buildFilterOptions(filtersObject: Record<string, any>) {
        // Keep your existing filter building logic
        const baseFilters: GetPatientsPageOpts = {
            pageSize: this.filters?.pageSize,
            lastKey: this.filters?.lastKey ?? null
        };

        const toYmd = (d: Date) => d.toISOString().slice(0, 10);
        const isBlank = (v: unknown) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

        for (const [key, rawVal] of Object.entries(filtersObject ?? {})) {
            const first = Array.isArray(rawVal) ? rawVal[0] : rawVal;
            if (!first) continue;

            let { value, matchMode, operator } = first as {
                value: any;
                matchMode?: string;
                operator?: 'and' | 'or';
            };

            if (value instanceof Date) value = toYmd(value);
            if (typeof value === 'string') value = value.trim();
            if (isBlank(value)) continue;

            if (key === 'global') {
                baseFilters.search = value as string;
                continue;
            }

            (baseFilters as any)[key] = {
                value,
                matchMode: matchMode ?? 'contains',
                operator: (operator as 'and' | 'or') ?? 'and'
            };
        }

        this.filters = baseFilters;
        console.log('Built filters:', this.filters);
    }

    private resetPagination() {
        console.log('Resetting pagination');
        this.currentPage = 0;
        this.currentLastKey = null;
        this.pageKeys = [null];
    }

    // Action methods
    viewPatient(patient: Patient) {
        console.log('View patient:', patient);
        // Add your view logic here
    }

    editPatient(patient: Patient) {
        console.log('Edit patient:', patient);
        // Add your edit logic here
    }

    deletePatient(patient: Patient) {
        console.log('Delete patient:', patient);
        // Add your delete logic here
    }

    getSeverity(val?: string): 'success' | 'info' | 'warn' | 'danger' {
        switch ((val || '').toLowerCase().trim()) {
            case 'qualified':
                return 'success'; // green
            case 'senior':
                return 'danger'; // red
            case 'mid-senior':
                return 'info'; // blue
            case 'junior':
                return 'warn'; // yellow/amber
            default:
                return 'info';
        }
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }
}

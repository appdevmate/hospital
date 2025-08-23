// import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
// import { Table, TableModule } from 'primeng/table';
// import { Patient, PatientService, GetPatientsPageOpts } from '../service/patients.service';
// import { Subject, takeUntil } from 'rxjs';
// import { DatePipe, CommonModule } from '@angular/common';
// import { IconFieldModule } from 'primeng/iconfield';
// import { InputIconModule } from 'primeng/inputicon';
// import { InputTextModule } from 'primeng/inputtext';
// import { AutoCompleteModule } from 'primeng/autocomplete';
// import { DatePickerModule } from 'primeng/datepicker';
// import { ButtonModule } from 'primeng/button';
// import { ReactiveFormsModule } from '@angular/forms';

// @Component({
//     selector: 'app-table-demo',
//     standalone: true,
//     imports: [CommonModule, TableModule, DatePipe, IconFieldModule, InputIconModule, InputTextModule, AutoCompleteModule, DatePickerModule, ButtonModule, ReactiveFormsModule],
//     template: ` <div class="card">
//         <div class="font-semibold text-xl mb-4">Patient Management</div>

//         <!-- Data Table -->
//         <p-table
//             #dt1
//             [value]="patients"
//             dataKey="PK"
//             [loading]="loading"
//             [lazy]="true"
//             [paginator]="true"
//             [rows]="pageSize"
//             [rowsPerPageOptions]="pageSizeOptions"
//             [totalRecords]="totalRecords"
//             [rowHover]="true"
//             [showGridlines]="true"
//             (onLazyLoad)="loadPatients($event)"
//             responsiveLayout="scroll"
//             [scrollable]="true"
//             scrollHeight="600px"
//         >
//             <ng-template #caption>
//                 <div class="flex justify-between items-center flex-col sm:flex-row">
//                     <button pButton label="Clear" class="p-button-outlined mb-2" icon="pi pi-filter-slash" (click)="clear(dt1)"></button>
//                     <p-iconfield iconPosition="left" class="ml-auto">
//                         <p-inputicon>
//                             <i class="pi pi-search"></i>
//                         </p-inputicon>
//                         <input pInputText type="text" (input)="onGlobalFilter(dt1, $event)" placeholder="Global Search" />
//                     </p-iconfield>
//                 </div>
//             </ng-template>
//             <ng-template pTemplate="header">
//                 <tr>
//                     <th style="min-width: 12rem">
//                         <div class="flex justify-between items-center">
//                             Name
//                             <p-columnFilter type="text" field="name" display="menu" placeholder="Search by name" [showOperator]="false" [showAddButton]="false"></p-columnFilter>
//                         </div>
//                     </th>

//                     <th style="min-width: 12rem">
//                         <div class="flex justify-between items-center">
//                             Gender
//                             <p-columnFilter type="text" field="gender" display="menu" placeholder="Search by gender" [showOperator]="false" [showAddButton]="false"></p-columnFilter>
//                         </div>
//                     </th>

//                     <th style="min-width: 12rem">
//                         <div class="flex justify-between items-center">
//                             Insurance
//                             <p-columnFilter type="text" field="insurance" display="menu" placeholder="Search by insurance" [showOperator]="false" [showAddButton]="false"></p-columnFilter>
//                         </div>
//                     </th>

//                     <th style="min-width: 12rem">
//                         <div class="flex justify-between items-center">
//                             Date of Birth
//                             <p-columnFilter type="text" field="dob" display="menu" placeholder="Search by Date of Birth" [showOperator]="false" [showAddButton]="false"></p-columnFilter>
//                         </div>
//                     </th>

//                     <th style="min-width: 12rem">
//                         <div class="flex justify-between items-center">
//                             Submitted Date
//                             <p-columnFilter type="text" field="submittedDate" display="menu" placeholder="Search by Date of Birth" [showOperator]="false" [showAddButton]="false"></p-columnFilter>
//                         </div>
//                     </th>
//                 </tr>
//             </ng-template>

//             <ng-template pTemplate="body" let-patient>
//                 <tr>
//                     <td>{{ patient?.name ? (patient.name | titlecase) : '-' }}</td>
//                     <td>{{ patient?.gender ? (patient.gender | titlecase) : '-' }}</td>
//                     <td>{{ patient?.insurance ? (patient.insurance | titlecase) : '-' }}</td>
//                     <td>{{ patient?.dob | date: 'MM/dd/yyyy' }}</td>
//                     <td>{{ patient?.timestamp | date: 'MM/dd/yyyy' }}</td>
//                 </tr>
//             </ng-template>

//             <ng-template pTemplate="emptymessage">
//                 <tr>
//                     <td colspan="5" class="text-center py-8">
//                         <div class="text-gray-500">
//                             <i class="pi pi-search text-3xl mb-2"></i>
//                             <div>No patients found matching your criteria.</div>
//                         </div>
//                     </td>
//                 </tr>
//             </ng-template>

//             <ng-template pTemplate="loadingbody">
//                 <tr>
//                     <td colspan="5" class="text-center py-8">
//                         <div class="text-gray-500">
//                             <i class="pi pi-spin pi-spinner text-2xl mb-2"></i>
//                             <div>Loading patient data...</div>
//                         </div>
//                     </td>
//                 </tr>
//             </ng-template>
//         </p-table>

//         <!-- Results Summary -->
//         <div class="mt-4 text-sm text-gray-600" *ngIf="!loading">Showing {{ patients.length }} of {{ totalRecords | number }} patients</div>
//     </div>`,
//     styles: `
//         .p-datatable-frozen-tbody {
//             font-weight: bold;
//         }

//         .p-datatable-scrollable .p-frozen-column {
//             font-weight: bold;
//         }

//         .field label {
//             color: #6b7280;
//         }

//         :host ::ng-deep .p-calendar {
//             width: 100%;
//         }

//         :host ::ng-deep .p-dropdown {
//             width: 100%;
//         }

//         :host ::ng-deep .flex-1 .p-calendar {
//             width: 100%;
//         }
//     `
// })
// export class TableDemo implements OnDestroy {
//     @ViewChild('dt1') dt1!: Table;
//     @ViewChild('filter') filter!: ElementRef;

//     patients: Patient[] = [];
//     loading = true;
//     pageSize = 3;
//     pageSizeOptions = [10, 25, 50, 100];
//     totalRecords = 0;

//     filters: GetPatientsPageOpts = {
//         pageSize: 25,
//         lastKey: null
//     };

//     // Pagination state
//     private currentLastKey: string | null = null;
//     private pageKeys: (string | null)[] = [null];
//     private currentPage = 0;

//     private destroy$ = new Subject<void>();

//     constructor(private patientsService: PatientService) {}

//     loadPatients(event: any) {
//         console.log('loadPatients event:', event);

//         if (!event) return;

//         // Handle page size changes
//         if (event.rows && event.rows !== this.pageSize) {
//             console.log('Page size changed from', this.pageSize, 'to', event.rows);
//             this.pageSize = event.rows;
//             this.resetPagination();
//         }

//         // Calculate current page based on event.first
//         const newPage = Math.floor((event.first || 0) / this.pageSize);
//         console.log('Calculated page:', newPage, 'from first:', event.first, 'pageSize:', this.pageSize);

//         this.currentPage = newPage;
//         this.currentLastKey = this.pageKeys[newPage] || null;

//         console.log('Current page:', this.currentPage, 'lastKey:', this.currentLastKey);

//         // Build filters
//         this.buildFilterOptions(event.filters || {});

//         // Update filters object with correct pagination info
//         this.filters = {
//             ...this.filters,
//             pageSize: this.pageSize,
//             lastKey: this.currentLastKey
//         };

//         console.log('Final filters being sent:', this.filters);
//         this.loadData();
//     }

//     private loadData() {
//         this.loading = true;

//         this.patientsService
//             .getPatientsPage(this.filters)
//             .pipe(takeUntil(this.destroy$))
//             .subscribe({
//                 next: (response) => {
//                     console.log('API Response:', response);
//                     console.log('Items returned:', response.data?.length);

//                     this.patients = response.data || [];
//                     this.totalRecords = response.totalCount || 0;

//                     // Handle pagination keys for next page
//                     if (response.lastKey) {
//                         this.pageKeys[this.currentPage + 1] = response.lastKey;
//                         console.log('Stored lastKey for next page:', response.lastKey);
//                     } else {
//                         // No more pages, trim the pageKeys array
//                         this.pageKeys = this.pageKeys.slice(0, this.currentPage + 1);
//                         console.log('No more pages, trimmed pageKeys');
//                     }

//                     this.loading = false;
//                 },
//                 error: (error) => {
//                     console.error('Error loading patients:', error);
//                     this.loading = false;
//                     this.patients = [];
//                     this.totalRecords = 0;
//                 }
//             });
//     }

//     private buildFilterOptions(filtersObject: Record<string, any>) {
//         // Preserve paging keys
//         const baseFilters: GetPatientsPageOpts = {
//             pageSize: this.filters?.pageSize,
//             lastKey: this.filters?.lastKey ?? null
//         };

//         const toYmd = (d: Date) => d.toISOString().slice(0, 10);
//         const isBlank = (v: unknown) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

//         for (const [key, rawVal] of Object.entries(filtersObject ?? {})) {
//             // PrimeNG gives arrays; accept both array or plain object
//             const first = Array.isArray(rawVal) ? rawVal[0] : rawVal;
//             if (!first) continue;

//             let { value, matchMode, operator } = first as {
//                 value: any;
//                 matchMode?: string;
//                 operator?: 'and' | 'or';
//             };

//             // Normalize value
//             if (value instanceof Date) value = toYmd(value);
//             if (typeof value === 'string') value = value.trim();
//             if (isBlank(value)) continue;

//             // Map PrimeNG "global" to our "search"
//             if (key === 'global') {
//                 baseFilters.search = value as string;
//                 continue;
//             }

//             // Build single-object filter: { value, matchMode, operator }
//             (baseFilters as any)[key] = {
//                 value,
//                 matchMode: matchMode ?? 'contains',
//                 operator: (operator as 'and' | 'or') ?? 'and'
//             };
//         }

//         this.filters = baseFilters;
//         console.log('Built filters:', this.filters);
//     }

//     private resetPagination() {
//         console.log('Resetting pagination');
//         this.currentPage = 0;
//         this.currentLastKey = null;
//         this.pageKeys = [null];

//         if (this.dt1) {
//             this.dt1.first = 0;
//         }
//     }

//     private formatDate(date: Date): string {
//         if (!date) return '';
//         const year = date.getFullYear();
//         const month = (date.getMonth() + 1).toString().padStart(2, '0');
//         const day = date.getDate().toString().padStart(2, '0');
//         return `${year}-${month}-${day}`;
//     }

//     onGlobalFilter(table: Table, event: Event) {
//         table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
//     }

//     clear(table: Table) {
//         table.clear();

//         if (this.filter && this.filter.nativeElement?.value) {
//             this.filter.nativeElement.value = '';
//         }

//         // Reset pagination when clearing
//         this.resetPagination();
//         this.filters = {
//             pageSize: this.pageSize,
//             lastKey: null
//         };
//     }

//     ngOnDestroy() {
//         this.destroy$.next();
//         this.destroy$.complete();
//     }
// }

// Replace your existing TableDemo component with this:

import { Component, ElementRef, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { Patient, PatientService, GetPatientsPageOpts } from '../service/patients.service';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { GenericTableComponent, TableColumn, TableConfig } from './tableplugin';

@Component({
    selector: 'app-table-demo',
    standalone: true,
    imports: [CommonModule, GenericTableComponent, ButtonModule],
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
        }
    ];

    // Table configuration
    tableConfig: TableConfig = {
        title: 'Patient Management',
        showGlobalSearch: true,
        showClearButton: true,
        pageSizeOptions: [1, 2, 5, 10, 25, 50, 100],
        defaultPageSize: 3,
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
            insurance: this.insuranceTemplate
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

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }
}

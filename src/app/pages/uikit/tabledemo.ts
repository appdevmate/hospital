import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Table, TableModule } from 'primeng/table';
import { Patient, PatientService, GetPatientsPageOpts } from '../service/patients.service';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, filter } from 'rxjs';
import { DatePipe, CommonModule } from '@angular/common';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

interface FilterState {
    global?: string;
    name?: string;
    gender?: string;
    insurance?: string;
    dobFrom?: Date;
    dobTo?: Date;
}

@Component({
    selector: 'app-table-demo',
    standalone: true,
    imports: [CommonModule, TableModule, DatePipe, IconFieldModule, InputIconModule, InputTextModule, AutoCompleteModule, DatePickerModule, ButtonModule, ReactiveFormsModule],
    template: ` <div class="card">
        <div class="font-semibold text-xl mb-4">Patient Management</div>

        <!-- Filters Row -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <!-- Name Filter -->
            <div class="field">
                <label for="nameFilter" class="block text-sm font-medium mb-1">Name</label>
                <input pInputText id="nameFilter" [formControl]="nameFilterControl" placeholder="Filter by name" class="w-full" />
            </div>

            <!-- Gender Filter -->
            <div class="field">
                <label for="genderFilter" class="block text-sm font-medium mb-1">Gender</label>
                <p-autocomplete [suggestions]="genderOptions" [formControl]="genderFilterControl" placeholder="Select gender" [showClear]="true" optionLabel="label" optionValue="value" class="w-full"> </p-autocomplete>
            </div>

            <!-- Insurance Filter -->
            <div class="field">
                <label for="insuranceFilter" class="block text-sm font-medium mb-1">Insurance</label>
                <input pInputText id="insuranceFilter" [formControl]="insuranceFilterControl" placeholder="Filter by insurance" class="w-full" />
            </div>

            <!-- Date Range -->
            <div class="field">
                <label class="block text-sm font-medium mb-1">Birth Date Range</label>
                <div class="flex gap-2">
                    <p-datepicker [formControl]="dobFromControl" placeholder="From" dateFormat="mm/dd/yy" [showIcon]="true" [showOnFocus]="false" styleClass="flex-1"> </p-datepicker>
                    <p-datepicker [formControl]="dobToControl" placeholder="To" dateFormat="mm/dd/yy" [showIcon]="true" [showOnFocus]="false" styleClass="flex-1"> </p-datepicker>
                </div>
            </div>
        </div>

        <!-- Data Table -->
        <p-table
            #dt1
            [value]="patients"
            dataKey="PK"
            [loading]="loading"
            [lazy]="true"
            [paginator]="true"
            [rows]="pageSize"
            [rowsPerPageOptions]="pageSizeOptions"
            [totalRecords]="totalRecords"
            [rowHover]="true"
            [showGridlines]="true"
            (onLazyLoad)="loadPatients($event)"
            responsiveLayout="scroll"
            [scrollable]="true"
            scrollHeight="600px"
        >
        <ng-template #caption>
                <div class="flex justify-between items-center flex-col sm:flex-row">
                    <button pButton label="Clear" class="p-button-outlined mb-2" icon="pi pi-filter-slash" (click)="clear(dt1)"></button>
                    <p-iconfield iconPosition="left" class="ml-auto">
                        <p-inputicon>
                            <i class="pi pi-search"></i>
                        </p-inputicon>
                        <input pInputText type="text" (input)="onGlobalFilter(dt1, $event)" placeholder="Global Search" />
                    </p-iconfield>
                </div>
            </ng-template>
            <ng-template pTemplate="header">
                <tr>
                    <th style="min-width: 12rem">
                        <div class="flex justify-between items-center">
                            Name
                            <p-columnFilter type="text" field="name" display="menu" placeholder="Search by name" [showOperator]="false" [showAddButton]="false"></p-columnFilter>
                        </div>
                    </th>
                    <th style="min-width: 12rem">
                        <div class="flex justify-between items-center">
                            Gender
                            <p-columnFilter type="text" field="gender" display="menu" placeholder="Search by gender" [showOperator]="false" [showAddButton]="false"></p-columnFilter>
                        </div>
                    </th>
                    <th style="min-width: 12rem">
                        <div class="flex justify-between items-center">
                            Insurance
                            <p-columnFilter type="text" field="insurance" display="menu" placeholder="Search by insurance" [showOperator]="false" [showAddButton]="false"></p-columnFilter>
                        </div>
                    </th>
                    <th>Date of Birth</th>
                    <th>Submitted Date</th>
                </tr>
            </ng-template>

            <ng-template pTemplate="body" let-patient>
                <tr>
                    <td>{{ patient?.name ? (patient.name | titlecase) : '-' }}</td>
                    <td>{{ patient?.gender ? (patient.gender | titlecase) : '-' }}</td>
                    <td>{{ patient?.insurance ? (patient.insurance | titlecase) : '-' }}</td>
                    <td>{{ patient?.dob | date: 'MM/dd/yyyy' }}</td>
                    <td>{{ patient?.timestamp | date: 'MM/dd/yyyy' }}</td>
                </tr>
            </ng-template>

            <ng-template pTemplate="emptymessage">
                <tr>
                    <td colspan="5" class="text-center py-8">
                        <div class="text-gray-500">
                            <i class="pi pi-search text-3xl mb-2"></i>
                            <div>No patients found matching your criteria.</div>
                        </div>
                    </td>
                </tr>
            </ng-template>

            <ng-template pTemplate="loadingbody">
                <tr>
                    <td colspan="5" class="text-center py-8">
                        <div class="text-gray-500">
                            <i class="pi pi-spin pi-spinner text-2xl mb-2"></i>
                            <div>Loading patient data...</div>
                        </div>
                    </td>
                </tr>
            </ng-template>
        </p-table>

        <!-- Results Summary -->
        <div class="mt-4 text-sm text-gray-600" *ngIf="!loading">
            Showing {{ patients.length }} of {{ totalRecords | number }} patients
            <span *ngIf="hasFilters()"> (filtered)</span>
        </div>
    </div>`,
    styles: `
        .p-datatable-frozen-tbody {
            font-weight: bold;
        }

        .p-datatable-scrollable .p-frozen-column {
            font-weight: bold;
        }

        .field label {
            color: #6b7280;
        }

        :host ::ng-deep .p-calendar {
            width: 100%;
        }

        :host ::ng-deep .p-dropdown {
            width: 100%;
        }

        :host ::ng-deep .flex-1 .p-calendar {
            width: 100%;
        }
    `
})
export class TableDemo implements OnInit, OnDestroy {
    @ViewChild('dt1') dt1!: Table;
    @ViewChild('filter') filter!: ElementRef;

    patients: Patient[] = [];
    loading = true;
    pageSize = 25;
    pageSizeOptions = [10, 25, 50, 100];
    totalRecords = 0;
    filters: GetPatientsPageOpts | undefined;

    // Pagination state
    private currentLastKey: string | null = null;
    private pageKeys: (string | null)[] = [null]; // Store keys for each page
    private currentPage = 0;

    // Filter controls
    globalSearchControl = new FormControl('');
    nameFilterControl = new FormControl('');
    genderFilterControl = new FormControl('');
    insuranceFilterControl = new FormControl('');
    dobFromControl = new FormControl();
    dobToControl = new FormControl();

    // Filter options
    genderOptions = [
        { label: 'Male', value: 'Male' },
        { label: 'Female', value: 'Female' },
        { label: 'Other', value: 'Other' }
    ];

    private destroy$ = new Subject<void>();
    private filterChanged$ = new Subject<void>();

    constructor(private patientsService: PatientService) {}

    ngOnInit() {
        this.setupFilterListeners();
        this.loadInitialData();
    }

    private setupFilterListeners() {
        // Global search with debounce
        this.globalSearchControl.valueChanges.pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(() => {
            this.resetPagination();
            this.filterChanged$.next();
        });
        
        
        // Individual filter listeners
        [this.nameFilterControl, this.genderFilterControl, this.insuranceFilterControl, this.dobFromControl, this.dobToControl].forEach((control) => {
            control.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(() => {
                this.resetPagination();
                this.filterChanged$.next();
            });
        });

        // React to filter changes
        this.filterChanged$.pipe(debounceTime(100), takeUntil(this.destroy$)).subscribe(() => {
            this.loadData();
        });
    }

    private loadInitialData() {
        this.loadData();
    }

    loadPatients(event: any) {
        // Handle page size changes
        if (event.rows !== this.pageSize) {
            this.pageSize = event.rows;
            this.resetPagination();
        }

        // Calculate current page
        const newPage = Math.floor(event.first / this.pageSize);
        this.currentPage = newPage;

        // Set the last key for this page
        this.currentLastKey = this.pageKeys[newPage] || null;

        this.loadData();
    }

    private loadData() {
        this.loading = true;
        this.patientsService
            .getPatientsPage(this.filters)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    this.patients = response.data || [];
                    this.totalRecords = response.totalCount || 0;

                    // Update pagination keys
                    if (response.lastKey) {
                        this.pageKeys[this.currentPage + 1] = response.lastKey;
                    } else {
                        // No more pages, trim the keys array
                        this.pageKeys = this.pageKeys.slice(0, this.currentPage + 1);
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

    private buildFilterOptionsIcon(event: any): GetPatientsPageOpts {
        const filters: GetPatientsPageOpts = {
            pageSize: this.pageSize,
            lastKey: this.currentLastKey
        }; 
        if(event && event?.filters?.name && event?.filters?.name != 0 && event?.filters?.name[0]) {
            filters.name = event?.filters?.name[0].value
        }
        if(event && event?.filters?.gender && event?.filters?.gender != 0 && event?.filters?.gender[0]) {
            filters.gender = event?.filters?.gender[0].value
        }
        if(event && event?.filters?.insurance && event?.filters?.insurance != 0 && event?.filters?.insurance[0]) {
            filters.insurance = event?.filters?.insurance[0].value
        }
        return filters;
    }

    private buildFilterOptions(): GetPatientsPageOpts {
        const filters: GetPatientsPageOpts = {
            pageSize: this.pageSize,
            lastKey: this.currentLastKey
        };

        // Global search across all fields
        const globalSearch = this.globalSearchControl.value?.trim();
        if (globalSearch) {
            filters.search = globalSearch.toLowerCase();
        }

        // Specific name filter
        const nameFilter = this.nameFilterControl.value?.trim();
        if (nameFilter) {          
            filters.name = nameFilter.toLowerCase();
        }

        const genderFilter = this.genderFilterControl.value?.trim();
        if (genderFilter) {
            filters.gender = genderFilter.toLowerCase();
        }

        const insuranceFilter = this.insuranceFilterControl.value?.trim();
        if (insuranceFilter) {
            filters.insurance = insuranceFilter.toLowerCase();
        }

        // Date filters
        if (this.dobFromControl.value) {
            filters.dobFrom = this.formatDate(this.dobFromControl.value);
        }

        if (this.dobToControl.value) {
            filters.dobTo = this.formatDate(this.dobToControl.value);
        }

        return filters;
    }

    private formatDate(date: Date): string {
        if (!date) return '';
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    clearAllFilters() {
        this.globalSearchControl.reset();
        this.nameFilterControl.reset();
        this.genderFilterControl.reset();
        this.insuranceFilterControl.reset();
        this.dobFromControl.reset();
        this.dobToControl.reset();

        this.resetPagination();
        this.filterChanged$.next();
    }

    hasFilters(): boolean {
        return !!(this.globalSearchControl.value || this.nameFilterControl.value || this.genderFilterControl.value || this.insuranceFilterControl.value || this.dobFromControl.value || this.dobToControl.value);
    }

    private resetPagination() {
        this.currentPage = 0;
        this.currentLastKey = null;
        this.pageKeys = [null];

        if (this.dt1) {
            this.dt1.first = 0;
        }
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    clear(table: Table) {
        table.clear();
        if(this.filter && this.filter.nativeElement?.value) {
            this.filter.nativeElement.value = '';
        }
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }
}

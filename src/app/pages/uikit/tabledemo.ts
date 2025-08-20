import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Table, TableModule } from 'primeng/table';
import { Patient, PatientService } from '../service/patients.service';
import { Subject, takeUntil } from 'rxjs';
import { DatePipe } from '@angular/common';
import { IconFieldModule } from "primeng/iconfield";
import { InputIconModule } from "primeng/inputicon";
import { InputTextModule } from "primeng/inputtext";

@Component({
    selector: 'app-table-demo',
    standalone: true,
    imports: [TableModule, DatePipe, IconFieldModule, InputIconModule, InputTextModule],
    template: `
    <div class="card">
        <div class="font-semibold text-xl mb-4">Filtering</div>
        <p-table
            #dt1
            [value]="patients"
            dataKey="PK"
            [loading]="loading"
            [paginator]="true"
            [rows]="pageSize"
            [rowsPerPageOptions]="pageSizeOptions"
            [totalRecords]="totalRecords"
            [lazy]="true"
            [rowHover]="true"
            (onLazyLoad)="loadPatients($event)"
            [showGridlines]="true"
            [globalFilterFields]="['name', 'country.name', 'representative.name', 'status']"
            responsiveLayout="scroll"
        >
        <ng-template #caption>
                <div class="flex justify-between items-center flex-col sm:flex-row">
                    <button pButton label="Clear" class="p-button-outlined mb-2" icon="pi pi-filter-slash" (click)="clear(dt1)"></button>
                    <p-iconfield iconPosition="left" class="ml-auto">
                        <p-inputicon>
                            <i class="pi pi-search"></i>
                        </p-inputicon>
                        <input pInputText type="text" (input)="onGlobalFilter(dt1, $event)" placeholder="Search keyword" />
                    </p-iconfield>
                </div>
            </ng-template>
            <ng-template #header>
                <tr>
                    <th>Name</th>
                    <th>Gender</th>
                    <th>Insurance</th>
                    <th>Date of Birth</th>
                    <th>Submitted Date</th>
                </tr>
            </ng-template>
            <ng-template #body let-patient>
                <tr>
                    <td>{{ patient?.name }}</td>
                    <td>{{ patient?.gender }}</td>
                    <td>{{ patient?.insurance }}</td>
                    <td>{{ patient?.dob | date: 'MM/dd/yyyy' }}</td>
                    <td>{{ patient?.timestamp | date: 'MM/dd/yyyy' }}</td>
                </tr>
            </ng-template>
            <ng-template #emptymessage>
                <tr>
                    <td colspan="8">No patients found.</td>
                </tr>
            </ng-template>
            <ng-template #loadingbody>
                <tr>
                    <td colspan="8">Loading patients data. Please wait.</td>
                </tr>
            </ng-template>
        </p-table>
    </div>`,
    styles: `
        .p-datatable-frozen-tbody {
            font-weight: bold;
        }

        .p-datatable-scrollable .p-frozen-column {
            font-weight: bold;
        }
    `,
})
export class TableDemo implements OnInit, OnDestroy {

    @ViewChild('dt1') dt1!: Table;
    @ViewChild('filter') filter!: ElementRef;
    patients: Patient[] = [];
    loading = true;
    pageSize = 1;
    pageSizeOptions = [1, 2, 5, 10, 25, 50, 100];
    totalRecords = 0;
    private lastKeys: (string | null)[] = [null]
    private destroy$ = new Subject<void>();

    constructor(private patientsService: PatientService) {}

    ngOnInit() {}

    clear(table: Table) {
        table.clear();
        this.filter.nativeElement.value = '';
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    loadPatients(event: any) {
        console.log(event);
        this.loading = true;
        const requestedRows: number = event?.rows ?? this.pageSize;
        if (requestedRows !== this.pageSize) {
            this.pageSize = requestedRows;
            this.lastKeys = [null];
            this.totalRecords = 0;
            if (this.dt1) this.dt1.first = 0;
        }
        const pageIndex = Math.floor((event?.first ?? 0) / this.pageSize);
        this.patientsService
            .getPatientsPage({ pageNumber: (((event?.first ?? 0) / event?.rows) + 1), pageSize: this.pageSize })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    this.patients = res?.data ?? [];
                    if (res?.lastKey) {
                        this.lastKeys[pageIndex + 1] = res.lastKey;
                        console.log("Last Keys: ", this.lastKeys);
                    } else {
                        this.lastKeys.length = pageIndex + 1;
                        console.log("Last Keys: ", this.lastKeys);
                    }
                    if (typeof res?.totalPages === 'number') {
                        this.totalRecords = res.totalPages * this.pageSize;
                    } else {
                        this.totalRecords = this.lastKeys.length * this.pageSize;
                    }
                    this.loading = false;
                },
                error: () => { this.loading = false; }
            });
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }
}

// import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
// import { Table, TableModule } from 'primeng/table';
// import { Patient, PatientService } from '../service/patients.service';
// import { Subject, takeUntil } from 'rxjs';
// import { DatePipe } from '@angular/common';

// @Component({
//     selector: 'app-table-demo',
//     standalone: true,
//     imports: [TableModule, DatePipe /* ... other modules */],
//     template: ` <div class="card">
//         <p-table 
//         #dt1
//         [value]="patients"
//         dataKey="PK"
//         [rows]="pageSize"
//         [loading]="loading"
//         [paginator]="true"
//         [totalRecords]="totalPages"
//         [lazy]="true"
//         (onLazyLoad)="loadPatients($event)"
//         [showGridlines]="true"
//         responsiveLayout="scroll"
//         >
//             <ng-template #header>
//                 <tr>
//                     <th>Name</th>
//                     <th>Gender</th>
//                     <th>Insurance</th>
//                     <th>Date of Birth</th>
//                     <th>Submitted Date</th>
//                 </tr>
//             </ng-template>
//             <ng-template #body let-patient>
//                 <tr>
//                     <td>{{ patient?.name }}</td>
//                     <td>{{ patient?.gender }}</td>
//                     <td>{{ patient?.insurance }}</td>
//                     <td>{{ patient?.dob | date: 'MM/dd/yyyy' }}</td>
//                     <td>{{ patient?.timestamp | date: 'MM/dd/yyyy' }}</td>
//                 </tr>
//             </ng-template>
//         </p-table>
//     </div>`
// })
// export class TableDemo implements OnInit, OnDestroy {
//     @ViewChild('dt1') dt1!: Table;

//     patients: Patient[] = [];
//     loading = true;
//     totalPages = 0;
//     pageSize = 1;

//     private lastKeys: (string | null)[] = [null];
//     private reachedEnd = false;

//     private destroy$ = new Subject<void>();

//     constructor(private patientsService: PatientService) {}

//     ngOnInit() {}

//     loadPatients(event: any) {
//         this.loading = true;

//         const pageIndex = Math.floor(event.first / event.rows); // 0-based

//         const lastKey = this.lastKeys[pageIndex] ?? null;

//         this.patientsService
//             .getPatientsPage({ pageSize: this.pageSize, lastKey })
//             .pipe(takeUntil(this.destroy$))
//             .subscribe({
//                 next: (res) => {
//                     console.log(res);
//                     this.totalPages = res.totalPages ?? 0;
//                     const rows = res?.data ?? [];
//                     const hasData = rows.length > 0;
//                     console.log(res?.lastKey);                    
//                     const hasNext = !!res?.lastKey;

//                     // If API returned an empty page (can happen with scans), clamp and snap back
//                     if (!hasData) {
//                         this.reachedEnd = true;
//                         // pages before this are valid; this page is not
//                         this.lastKeys.length = Math.max(1, pageIndex); // keep previous pages only
//                         // snap back to the last valid page
//                         const prevIndex = Math.max(0, pageIndex - 1);
//                         this.dt1.first = prevIndex * this.pageSize;

//                         this.loading = false;
//                         return;
//                     }

//                     // render current page rows
//                     this.patients = rows;

//                     if (hasNext) {
//                         // only advertise exactly one more page
//                         this.lastKeys.length = pageIndex + 2;
//                         this.lastKeys[pageIndex + 1] = res!.lastKey!;
//                     } else {
//                         // no more pages — lock totals & trim cursors
//                         this.reachedEnd = true;
//                         this.lastKeys.length = pageIndex + 1;
//                     }

//                     this.loading = false;
//                 },
//                 error: () => {
//                     this.loading = false;
//                 }
//             });
//     }

//     ngOnDestroy() {
//         this.destroy$.next();
//         this.destroy$.complete();
//     }
// }

// @Component({
//     selector: 'app-table-demo',
//     standalone: true,
//     imports: [
//         TableModule,
//         MultiSelectModule,
//         SelectModule,
//         InputIconModule,
//         TagModule,
//         InputTextModule,
//         SliderModule,
//         ProgressBarModule,
//         ToggleButtonModule,
//         ToastModule,
//         CommonModule,
//         FormsModule,
//         ButtonModule,
//         RatingModule,
//         RippleModule,
//         IconFieldModule
//     ],
//     template: ` <div class="card">
//         <div class="font-semibold text-xl mb-4">Filtering</div>
//         <p-table
//             #dt1
//             [value]="patients"
//             dataKey="PK"
//             [rows]="1"
//             [loading]="loading"
//             [rowHover]="true"
//             [showGridlines]="true"
//             [paginator]="true"
//             [globalFilterFields]="['name', 'country.name', 'representative.name', 'status']"
//             responsiveLayout="scroll"
//         >
//             <ng-template #caption>
//                 <div class="flex justify-between items-center flex-col sm:flex-row">
//                     <button pButton label="Clear" class="p-button-outlined mb-2" icon="pi pi-filter-slash" (click)="clear(dt1)"></button>
//                     <p-iconfield iconPosition="left" class="ml-auto">
//                         <p-inputicon>
//                             <i class="pi pi-search"></i>
//                         </p-inputicon>
//                         <input pInputText type="text" (input)="onGlobalFilter(dt1, $event)" placeholder="Search keyword" />
//                     </p-iconfield>
//                 </div>
//             </ng-template>
//            <ng-template #header>
//                     <tr>
//                         <th style="min-width: 12rem">
//                             <div class="flex justify-between items-center">
//                                 Name
//                                 <p-columnFilter type="text" field="name" display="menu" placeholder="Search by name"></p-columnFilter>
//                             </div>
//                         </th>

//                         <th style="min-width: 12rem">
//                             <div class="flex justify-between items-center">
//                                 Gender
//                                 <p-columnFilter type="text" field="gender" display="menu" placeholder="Search by gender"></p-columnFilter>
//                             </div>
//                         </th>

//                         <th style="min-width: 12rem">
//                             <div class="flex justify-between items-center">
//                                 Insurance
//                                 <p-columnFilter type="text" field="insurance" display="menu" placeholder="Search by insurance"></p-columnFilter>
//                             </div>
//                         </th>

//                         <th style="min-width: 10rem">
//                             <div class="flex justify-between items-center">
//                                 Date of Birth
//                                 <p-columnFilter type="date" field="dob" display="menu" placeholder="mm/dd/yyyy"></p-columnFilter>
//                             </div>
//                         </th>

//                         <th style="min-width: 10rem">
//                             <div class="flex justify-between items-center">
//                                 Submitted Date
//                                 <p-columnFilter type="date" field="timestamp" display="menu" placeholder="mm/dd/yyyy"></p-columnFilter>
//                             </div>
//                         </th>
//                     </tr>
//                 </ng-template>
//             <ng-template #body let-patient>
//                     <tr>
//                         <td>
//                             {{ patient.name }}
//                         </td>

//                         <td>
//                             {{ patient.gender }}
//                         </td>

//                         <td>
//                             {{ patient.insurance }}
//                         </td>

//                         <td>
//                             {{ patient.dob | date: 'MM/dd/yyyy' }}
//                         </td>

//                         <td>
//                             {{ patient.timestamp | date: 'MM/dd/yyyy' }}
//                         </td>
//                     </tr>
//                 </ng-template>
//             <ng-template #emptymessage>
//                 <tr>
//                     <td colspan="8">No customers found.</td>
//                 </tr>
//             </ng-template>
//             <ng-template #loadingbody>
//                 <tr>
//                     <td colspan="8">Loading customers data. Please wait.</td>
//                 </tr>
//             </ng-template>
//         </p-table>
//     </div>`,
//     styles: `
//         .p-datatable-frozen-tbody {
//             font-weight: bold;
//         }

//         .p-datatable-scrollable .p-frozen-column {
//             font-weight: bold;
//         }
//     `,
//     providers: [ConfirmationService, MessageService, CustomerService, ProductService]
// })
// export class TableDemo implements OnInit, OnDestroy {

//     patients: Patient[] = [];
//     loading: boolean = true;
//     private destroy$ = new Subject<void>();

//     @ViewChild('filter') filter!: ElementRef;

//     constructor(
//         private patientsService: PatientService,
//     ) {}
//     ngOnDestroy(): void {
//         throw new Error('Method not implemented.');
//     }

//     ngOnInit() {
//        this.patientsService.getPatientsPage().pipe(takeUntil(this.destroy$))
//             .subscribe({
//                 next: (res: any) => {
//                     console.log(res);
//                     this.patients = res.data;
//                     this.loading = false;
//                 },
//                 error: () => {
//                     this.loading = false;
//                 }
//             });
//     }

//     onGlobalFilter(table: Table, event: Event) {
//         table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
//     }

//     clear(table: Table) {
//         table.clear();
//         this.filter.nativeElement.value = '';
//     }

// }

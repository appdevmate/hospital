import {Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ConfirmationService, MessageService} from 'primeng/api';
import {InputTextModule} from 'primeng/inputtext';
import {MultiSelectModule} from 'primeng/multiselect';
import {SelectModule} from 'primeng/select';
import {SliderModule} from 'primeng/slider';
import {Table, TableModule} from 'primeng/table';
import {ProgressBarModule} from 'primeng/progressbar';
import {ToggleButtonModule} from 'primeng/togglebutton';
import {ToastModule} from 'primeng/toast';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ButtonModule} from 'primeng/button';
import {RatingModule} from 'primeng/rating';
import {RippleModule} from 'primeng/ripple';
import {InputIconModule} from 'primeng/inputicon';
import {IconFieldModule} from 'primeng/iconfield';
import {TagModule} from 'primeng/tag';
import {Customer, CustomerService, Representative} from '@/pages/service/customer.service';
import {Product, ProductService} from '@/pages/service/product.service';
import { Patient, PatientService } from '../service/patients.service';
import { Subject, takeUntil } from 'rxjs';

interface expandedRows {
    [key: string]: boolean;
}

@Component({
    selector: 'app-table-demo',
    standalone: true,
    imports: [
        TableModule,
        MultiSelectModule,
        SelectModule,
        InputIconModule,
        TagModule,
        InputTextModule,
        SliderModule,
        ProgressBarModule,
        ToggleButtonModule,
        ToastModule,
        CommonModule,
        FormsModule,
        ButtonModule,
        RatingModule,
        RippleModule,
        IconFieldModule
    ],
    template: ` <div class="card">
        <div class="font-semibold text-xl mb-4">Filtering</div>
        <p-table
            #dt1
            [value]="patients"
            dataKey="PK"
            [rows]="1"
            [loading]="loading"
            [rowHover]="true"
            [showGridlines]="true"
            [paginator]="true"
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
                        <th style="min-width: 12rem">
                            <div class="flex justify-between items-center">
                                Name
                                <p-columnFilter type="text" field="name" display="menu" placeholder="Search by name"></p-columnFilter>
                            </div>
                        </th>

                        <th style="min-width: 12rem">
                            <div class="flex justify-between items-center">
                                Gender
                                <p-columnFilter type="text" field="gender" display="menu" placeholder="Search by gender"></p-columnFilter>
                            </div>
                        </th>

                        <th style="min-width: 12rem">
                            <div class="flex justify-between items-center">
                                Insurance
                                <p-columnFilter type="text" field="insurance" display="menu" placeholder="Search by insurance"></p-columnFilter>
                            </div>
                        </th>

                        <th style="min-width: 10rem">
                            <div class="flex justify-between items-center">
                                Date of Birth
                                <p-columnFilter type="date" field="dob" display="menu" placeholder="mm/dd/yyyy"></p-columnFilter>
                            </div>
                        </th>

                        <th style="min-width: 10rem">
                            <div class="flex justify-between items-center">
                                Submitted Date
                                <p-columnFilter type="date" field="timestamp" display="menu" placeholder="mm/dd/yyyy"></p-columnFilter>
                            </div>
                        </th>
                    </tr>
                </ng-template>
            <ng-template #body let-patient>
                    <tr>
                        <td>
                            {{ patient.name }}
                        </td>

                        <td>
                            {{ patient.gender }}
                        </td>

                        <td>
                            {{ patient.insurance }}
                        </td>

                        <td>
                            {{ patient.dob | date: 'MM/dd/yyyy' }}
                        </td>

                        <td>
                            {{ patient.timestamp | date: 'MM/dd/yyyy' }}
                        </td>
                    </tr>
                </ng-template>
            <ng-template #emptymessage>
                <tr>
                    <td colspan="8">No customers found.</td>
                </tr>
            </ng-template>
            <ng-template #loadingbody>
                <tr>
                    <td colspan="8">Loading customers data. Please wait.</td>
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
    providers: [ConfirmationService, MessageService, CustomerService, ProductService]
})
export class TableDemo implements OnInit, OnDestroy {

    patients: Patient[] = [];
    loading: boolean = true;
    private destroy$ = new Subject<void>();

    @ViewChild('filter') filter!: ElementRef;

    constructor(
        private patientsService: PatientService,
    ) {}
    ngOnDestroy(): void {
        throw new Error('Method not implemented.');
    }

    ngOnInit() {
       this.patientsService.getPatientsPage().pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    console.log(res);
                    this.patients = res.data;
                    this.loading = false;
                },
                error: () => {
                    this.loading = false;
                }
            });
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    clear(table: Table) {
        table.clear();
        this.filter.nativeElement.value = '';
    }

}

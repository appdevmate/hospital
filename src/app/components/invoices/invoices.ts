import { Component, OnInit, inject, signal, computed, ViewChild, TemplateRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { TextareaModule } from 'primeng/textarea';
import { FloatLabelModule } from 'primeng/floatlabel';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { DividerModule } from 'primeng/divider';
import { PaymentsService, Payment, CreateUpdatePaymentRequest, PaymentItem } from '@/services/payments.service';
import { PatientsService, Patient } from '@/pages/service/patients.service';
import { HelpersService } from '@/services/helpers-service';
import { GenericTableComponent } from '@/pages/uikit/generic-table';
import { TableColumn, TableConfig } from '@/interfaces/tableplugin.interfaces';
import { DoctorsService } from '@/pages/service/doctors.service';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from '@/services/auth.service';

@Component({
    selector: 'app-invoices',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        ReactiveFormsModule,
        ButtonModule,
        TagModule,
        CardModule,
        DialogModule,
        InputTextModule,
        InputNumberModule,
        DatePickerModule,
        AutoCompleteModule,
        TextareaModule,
        FloatLabelModule,
        ToastModule,
        ConfirmDialogModule,
        DividerModule,
        GenericTableComponent
    ],
    providers: [MessageService, ConfirmationService, HelpersService],
    template: `
        <p-toast />
        <p-confirmDialog />

        <div style="padding: 1.5rem;">
            <!-- Header -->
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1.5rem;">
                <div style="display:flex; align-items:center; gap:1rem;">
                    <i class="pi pi-file-edit" style="font-size:1.5rem; color:#10b981;"></i>
                    <h2 style="margin:0; font-size:1.4rem; font-weight:700;">Invoices & Payments</h2>
                </div>
            </div>

            <!-- Stats -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px,1fr)); gap:1rem; margin-bottom:1.5rem;">
                <div class="stat-card" *ngFor="let s of stats()">
                    <div class="stat-value" [style.color]="s.color">{{ s.value }}</div>
                    <div class="stat-label">{{ s.label }}</div>
                </div>
            </div>

            <!-- Table -->
            <app-generic-table [columns]="columns" [config]="config" [data]="filtered()" [loading]="loading()" [actionsTemplate]="rowActions" [toolbarStart]="tbStart" dataKey="paymentId" [customTemplates]="customTemplates()">
                <ng-template #statusTemplate let-value="value">
                    <p-tag [value]="value || '' | titlecase" [severity]="getStatusSeverity(value)"></p-tag>
                </ng-template>
            </app-generic-table>

            <ng-template #tbStart>
                <p-button label="New Invoice" icon="pi pi-plus" (onClick)="openCreate()"></p-button>
            </ng-template>

            <ng-template #rowActions let-row>
                <p-button icon="pi pi-eye" text severity="info" (onClick)="viewInvoice(row)" pTooltip="View"></p-button>
                <p-button icon="pi pi-pencil" text (onClick)="openEdit(row)" pTooltip="Edit"></p-button>
                <p-button icon="pi pi-trash" text severity="danger" (onClick)="confirmDelete(row)" pTooltip="Delete"></p-button>
            </ng-template>

            <ng-template #statusTemplate let-row>
                <p-tag [value]="row.status | titlecase" [severity]="getStatusSeverity(row.status)" />
            </ng-template>
        </div>

        <!-- Create/Edit Dialog -->
        <p-dialog [(visible)]="showForm" [modal]="true" [style]="{ width: '750px' }" [closable]="true" [header]="editingPayment ? 'Edit Invoice' : 'New Invoice'" [draggable]="false">
            <form [formGroup]="form" (ngSubmit)="submit()">
                <!-- Patient & Doctor -->
                <div class="form-section">
                    <h4 class="section-title">Basic Info</h4>
                    <div class="form-grid">
                        <p-floatLabel variant="on">
                            <p-autoComplete
                                inputId="patient"
                                formControlName="patientObj"
                                [suggestions]="filteredPatientNames"
                                (completeMethod)="searchPatient($event)"
                                [dropdown]="true"
                                styleClass="w-full"
                                (onSelect)="onPatientSelect($event)"
                                (onClear)="form.patchValue({ patientId: '', patientName: '' })"
                            >
                            </p-autoComplete>
                            <label for="patient">Patient</label>
                        </p-floatLabel>
                        <p-floatLabel variant="on" *ngIf="auth.isAdmin">
                            <p-autoComplete inputId="doctorName" formControlName="doctorName" [suggestions]="filteredDoctorNames" (completeMethod)="searchDoctor($event)" [dropdown]="true" styleClass="w-full" (onSelect)="onDoctorSelect($event)">
                            </p-autoComplete>
                            <label for="doctorName">Doctor</label>
                        </p-floatLabel>
                    </div>
                    <div class="form-grid mt-3">
                        <p-floatLabel variant="on">
                            <input pInputText id="invoiceNumber" formControlName="invoiceNumber" class="w-full" />
                            <label for="invoiceNumber">Invoice Number</label>
                        </p-floatLabel>
                        <p-floatLabel variant="on">
                            <p-datepicker inputId="dueDate" formControlName="dueDate" dateFormat="yy-mm-dd" [showIcon]="true" styleClass="w-full"></p-datepicker>
                            <label for="dueDate">Due Date</label>
                        </p-floatLabel>
                    </div>
                </div>

                <p-divider />

                <!-- Items -->
                <div class="form-section">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                        <h4 class="section-title" style="margin:0;">Items</h4>
                        <p-button label="Add Item" icon="pi pi-plus" size="small" text (onClick)="addItem()"></p-button>
                    </div>
                    <div formArrayName="items">
                        <div *ngFor="let item of itemsArray.controls; let i = index" [formGroupName]="i" style="display:grid; grid-template-columns:2fr 1fr 1fr 1fr auto; gap:0.5rem; align-items:center; margin-bottom:0.5rem;">
                            <input pInputText formControlName="description" placeholder="Description" class="w-full" />
                            <p-inputNumber formControlName="quantity" placeholder="Qty" [min]="1" styleClass="w-full"></p-inputNumber>
                            <p-inputNumber formControlName="unitPrice" placeholder="Price" [minFractionDigits]="2" styleClass="w-full" (onInput)="recalcItem(i)"></p-inputNumber>
                            <input pInputText [value]="'QAR ' + getItemTotal(i)" readonly class="w-full" style="background:#F9FAFB;" />
                            <p-button icon="pi pi-times" text severity="danger" (onClick)="removeItem(i)"></p-button>
                        </div>
                    </div>
                </div>

                <p-divider />

                <!-- Amounts -->
                <div class="form-section">
                    <h4 class="section-title">Payment Details</h4>
                    <div class="form-grid">
                        <p-floatLabel variant="on">
                            <p-inputNumber inputId="amount" formControlName="amount" [minFractionDigits]="2" styleClass="w-full" (onInput)="recalcOwes()"></p-inputNumber>
                            <label for="amount">Total Amount (QAR)</label>
                        </p-floatLabel>
                        <p-floatLabel variant="on">
                            <p-floatLabel variant="on">
                                <p-autoComplete inputId="status" formControlName="status" [suggestions]="filteredStatuses" (completeMethod)="filterStatuses($event)" [dropdown]="true" [forceSelection]="true" styleClass="w-full"> </p-autoComplete>
                                <label for="status">Status</label>
                            </p-floatLabel>
                            <label for="status">Status</label>
                        </p-floatLabel>
                    </div>
                    <div class="form-grid mt-3">
                        <p-floatLabel variant="on">
                            <input pInputText inputId="insuranceProvider" formControlName="insuranceProvider" class="w-full" />
                            <label for="insuranceProvider">Insurance Provider</label>
                        </p-floatLabel>
                        <p-floatLabel variant="on">
                            <p-inputNumber inputId="insuranceCoverage" formControlName="insuranceCoverage" [min]="0" [max]="100" suffix="%" styleClass="w-full" (onInput)="recalcOwes()"></p-inputNumber>
                            <label for="insuranceCoverage">Insurance Coverage %</label>
                        </p-floatLabel>
                    </div>
                    <div class="form-grid mt-3">
                        <p-floatLabel variant="on">
                            <p-inputNumber inputId="insuranceAmount" formControlName="insuranceAmount" [minFractionDigits]="2" styleClass="w-full" [readonly]="true"></p-inputNumber>
                            <label for="insuranceAmount">Insurance Pays (QAR)</label>
                        </p-floatLabel>
                        <p-floatLabel variant="on">
                            <p-inputNumber inputId="patientOwes" formControlName="patientOwes" [minFractionDigits]="2" styleClass="w-full" [readonly]="true"></p-inputNumber>
                            <label for="patientOwes">Patient Owes (QAR)</label>
                        </p-floatLabel>
                    </div>
                </div>

                <p-divider />

                <!-- Notes -->
                <div class="form-section">
                    <p-floatLabel variant="on">
                        <textarea pTextarea inputId="notes" formControlName="notes" class="w-full" rows="3"></textarea>
                        <label for="notes">Notes</label>
                    </p-floatLabel>
                </div>

                <div style="display:flex; justify-content:flex-end; gap:0.75rem; margin-top:1rem;">
                    <p-button type="button" label="Cancel" severity="secondary" (onClick)="showForm = false"></p-button>
                    <p-button type="submit" [label]="editingPayment ? 'Save Changes' : 'Create Invoice'" icon="pi pi-save" [loading]="submitting"></p-button>
                </div>
            </form>
        </p-dialog>

        <!-- View Dialog -->
        <p-dialog [(visible)]="showView" [modal]="true" [style]="{ width: '600px' }" header="Invoice Details" [draggable]="false">
            <div *ngIf="viewingPayment" class="invoice-view">
                <div class="inv-header">
                    <div>
                        <div class="inv-number">{{ viewingPayment.invoiceNumber }}</div>
                        <div class="inv-date">Created: {{ viewingPayment.createdAt | date: 'mediumDate' }}</div>
                    </div>
                    <p-tag [value]="viewingPayment.status | titlecase" [severity]="getStatusSeverity(viewingPayment.status)" styleClass="text-lg" />
                </div>

                <div class="inv-grid">
                    <div>
                        <span class="inv-label">Patient</span><span>{{ viewingPayment.patientName | titlecase }}</span>
                    </div>
                    <div>
                        <span class="inv-label">Doctor</span><span>{{ viewingPayment.doctorName | titlecase }}</span>
                    </div>
                    <div>
                        <span class="inv-label">Due Date</span><span>{{ viewingPayment.dueDate || '—' }}</span>
                    </div>
                    <div>
                        <span class="inv-label">Payment Type</span><span>{{ viewingPayment.paymentType || '—' }}</span>
                    </div>
                </div>

                <p-divider />

                <div *ngIf="viewingPayment.items && viewingPayment.items.length > 0">
                    <h4 style="margin:0 0 0.75rem 0;">Items</h4>
                    <div style="border:1px solid #E5E7EB; border-radius:8px; overflow:hidden;">
                        <div style="display:grid; grid-template-columns:2fr 1fr 1fr 1fr; background:#F9FAFB; padding:0.5rem 1rem; font-weight:600; font-size:0.85rem; color:#6B7280;">
                            <span>Description</span><span>Qty</span><span>Unit Price</span><span>Total</span>
                        </div>
                        <div *ngFor="let item of viewingPayment.items; let i = index" style="display:grid; grid-template-columns:2fr 1fr 1fr 1fr; padding:0.5rem 1rem; font-size:0.9rem;" [style.background]="i % 2 === 0 ? 'white' : '#F9FAFB'">
                            <span>{{ item.description }}</span>
                            <span>{{ item.quantity }}</span>
                            <span>QAR {{ item.unitPrice | number: '1.2-2' }}</span>
                            <span>QAR {{ item.total | number: '1.2-2' }}</span>
                        </div>
                    </div>
                    <p-divider />
                </div>

                <div class="inv-totals">
                    <div class="inv-total-row">
                        <span>Total Amount</span><span>QAR {{ viewingPayment.amount | number: '1.2-2' }}</span>
                    </div>
                    <div class="inv-total-row" *ngIf="viewingPayment.insuranceProvider">
                        <span>Insurance ({{ viewingPayment.insuranceProvider }} {{ viewingPayment.insuranceCoverage }}%)</span>
                        <span>- QAR {{ viewingPayment.insuranceAmount | number: '1.2-2' }}</span>
                    </div>
                    <div class="inv-total-row total">
                        <span>Patient Owes</span><span>QAR {{ viewingPayment.patientOwes | number: '1.2-2' }}</span>
                    </div>
                </div>

                <div *ngIf="viewingPayment.notes" style="margin-top:1rem; color:#6B7280; font-size:0.9rem;"><strong>Notes:</strong> {{ viewingPayment.notes }}</div>
            </div>
        </p-dialog>
    `,
    styles: [
        `
            .stat-card {
                background: white;
                border-radius: 10px;
                padding: 1rem 1.25rem;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
                text-align: center;
            }
            .stat-value {
                font-size: 1.5rem;
                font-weight: 700;
            }
            .stat-label {
                font-size: 0.8rem;
                color: #6b7280;
                margin-top: 4px;
            }

            .form-section {
                margin-bottom: 1rem;
            }
            .section-title {
                font-size: 0.95rem;
                font-weight: 700;
                color: #10b981;
                margin: 0 0 0.75rem 0;
            }
            .form-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1rem;
            }
            .mt-3 {
                margin-top: 0.75rem;
            }

            .invoice-view {
                padding: 0.5rem;
            }
            .inv-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 1rem;
            }
            .inv-number {
                font-size: 1.2rem;
                font-weight: 700;
                color: #111827;
            }
            .inv-date {
                font-size: 0.85rem;
                color: #6b7280;
                margin-top: 4px;
            }
            .inv-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 0.75rem;
                margin-bottom: 1rem;
            }
            .inv-label {
                display: block;
                font-size: 0.75rem;
                color: #9ca3af;
                margin-bottom: 2px;
            }
            .inv-totals {
                background: #f9fafb;
                border-radius: 8px;
                padding: 1rem;
            }
            .inv-total-row {
                display: flex;
                justify-content: space-between;
                padding: 0.25rem 0;
                font-size: 0.95rem;
            }
            .inv-total-row.total {
                font-weight: 700;
                font-size: 1.05rem;
                border-top: 1px solid #e5e7eb;
                margin-top: 0.5rem;
                padding-top: 0.5rem;
            }
        `
    ]
})
export class InvoicesComponent implements OnInit {
    private paymentsService = inject(PaymentsService);
    private patientsService = inject(PatientsService);
    private helpers = inject(HelpersService);
    private fb = inject(FormBuilder);
    private confirmationService = inject(ConfirmationService);
    filteredPatientNames: string[] = [];
    private doctorsService = inject(DoctorsService);
    auth = inject(AuthService);
    @ViewChild('statusTemplate') statusTemplateTpl!: TemplateRef<any>;

    filteredStatuses: string[] = [];

    columns: TableColumn[] = [
        { field: 'invoiceNumber', header: 'Invoice #', sortable: true, filterable: true, width: '130px' },
        { field: 'patientName', header: 'Patient', sortable: true, filterable: true, pipe: 'titlecase' },
        { field: 'doctorName', header: 'Doctor', sortable: true, filterable: true, pipe: 'titlecase' },
        { field: 'amount', header: 'Amount (QAR)', sortable: true, filterable: false, type: 'number', pipe: 'number', width: '130px' },
        { field: 'patientOwes', header: 'Patient Owes', sortable: true, filterable: false, type: 'number', pipe: 'number', width: '130px' },
        { field: 'insuranceProvider', header: 'Insurance', sortable: false, filterable: true },
        { field: 'dueDate', header: 'Due Date', sortable: true, filterable: false, width: '110px' },
        { field: 'status', header: 'Status', sortable: true, filterable: true, customTemplate: true, width: '130px' }
    ];

    config: TableConfig = {
        showGlobalSearch: true,
        showClearButton: true,
        showToolbar: true,
        pageSizeOptions: [10, 25, 50],
        defaultPageSize: 10,
        emptyMessage: 'No invoices found.',
        showGridlines: true,
        rowHover: true,
        responsive: true,
        showResultsSummary: true,
        selectable: false,
        editType: 'none',
        showColumnPicker: true
    };

    customTemplates = signal<Record<string, any>>({});

    _allInvoices = signal<Payment[]>([]);
    _patients = signal<Patient[]>([]);
    loading = signal(false);
    submitting = false;
    showForm = false;
    showView = false;
    editingPayment: Payment | null = null;
    viewingPayment: Payment | null = null;
    filterStatus: string | null = null;
    filterPatient: string | null = null;
    _doctors = signal<any[]>([]);
    filteredDoctorNames: string[] = [];

    statusOptions = ['pending', 'paid', 'partial', 'cancelled', 'health-insurance'];

    form: FormGroup = this.fb.group({
        patientObj: [null],
        patientId: ['', Validators.required],
        patientName: [''],
        doctorName: [''],
        invoiceNumber: [''],
        dueDate: [null],
        items: this.fb.array([]),
        amount: [0, Validators.required],
        status: ['pending', Validators.required],
        insuranceProvider: [''],
        insuranceCoverage: [0],
        insuranceAmount: [0],
        patientOwes: [0],
        notes: ['']
    });

    get itemsArray(): FormArray {
        return this.form.get('items') as FormArray;
    }

    patientOptions = computed(() =>
        this._patients().map((p) => ({
            label: p.name,
            value: p.PK.includes('#') ? p.PK.split('#')[1] : p.PK
        }))
    );

    filtered = computed(() => {
        let list = this._allInvoices();
        if (this.filterStatus) list = list.filter((i) => i.status === this.filterStatus);
        if (this.filterPatient) list = list.filter((i) => i.patientId === this.filterPatient);
        return list;
    });

    stats = computed(() => {
        const all = this._allInvoices();
        const total = all.reduce((s, i) => s + (i.amount || 0), 0);
        const owes = all.reduce((s, i) => s + (i.patientOwes || 0), 0);
        return [
            { label: 'Total Invoices', value: all.length, color: '#6366F1' },
            { label: 'Total Amount', value: `QAR ${total.toFixed(0)}`, color: '#10B981' },
            { label: 'Pending', value: all.filter((i) => i.status === 'pending').length, color: '#F59E0B' },
            { label: 'Paid', value: all.filter((i) => i.status === 'paid').length, color: '#10B981' },
            { label: 'Patient Owes', value: `QAR ${owes.toFixed(0)}`, color: '#EF4444' }
        ];
    });

    ngOnInit() {
        this.loadDoctors();
        this.loadPatients();
    }

    ngAfterViewInit() {
        this.customTemplates.set({ status: this.statusTemplateTpl });
    }

    loadDoctors() {
        this.doctorsService.getDoctorsPage({ pageSize: 200 }).subscribe({
            next: (res) => this._doctors.set(res.data || []),
            error: () => {}
        });
    }

    loadPatients() {
        this.loading.set(true);
        this.patientsService.getPatientsPage({ pageSize: 200 }).subscribe({
            next: (res) => {
                this._patients.set(res.data);
                this.loadAllInvoices(res.data);
            },
            error: () => this.loading.set(false)
        });
    }

    loadAllInvoices(patients: Patient[]) {
        if (patients.length === 0) {
            this.loading.set(false);
            return;
        }
        const all: Payment[] = [];
        let done = 0;
        const doctorEmail = this.auth.isDoctor ? this.auth.current.email : undefined;
        console.log('isDoctor:', this.auth.isDoctor, 'isAdmin:', this.auth.isAdmin, 'role:', this.auth.current.role);
        patients.forEach((p) => {
            const id = p.PK.includes('#') ? p.PK.split('#')[1] : p.PK;
            this.paymentsService
                .getPayments(id, doctorEmail)
                .pipe(
                    catchError(() => of({ data: [], count: 0 })),
                    finalize(() => {
                        done++;
                        if (done === patients.length) {
                            this._allInvoices.set(all);
                            this.loading.set(false);
                        }
                    })
                )
                .subscribe({
                    next: (res) => all.push(...(res.data || []))
                });
        });
    }

    applyFilter() {}
    clearFilter() {
        this.filterStatus = null;
        this.filterPatient = null;
    }

    searchPatient(event: any) {
        const q = (event.query || '').toLowerCase();
        this.filteredPatientNames = this._patients()
            .filter((p) => p.name.toLowerCase().includes(q))
            .map((p) => p.name);
    }

    onPatientSelect(event: any) {
        const name = event.value as string;
        const patient = this._patients().find((p) => p.name === name);
        if (patient) {
            const id = patient.PK.includes('#') ? patient.PK.split('#')[1] : patient.PK;
            this.form.patchValue({ patientId: id, patientName: name });
        }
    }

    openCreate() {
        this.editingPayment = null;
        this.form.reset({ status: 'pending', insuranceCoverage: 0, insuranceAmount: 0, patientOwes: 0, amount: 0 });
        while (this.itemsArray.length) this.itemsArray.removeAt(0);
        this.showForm = true;
    }

    openEdit(p: Payment) {
        this.editingPayment = p;
        const patient = this._patients().find((pt) => pt.PK.includes(p.patientId));
        this.form.patchValue({
            patientObj: p.patientName || '',
            patientId: p.patientId,
            patientName: p.patientName,
            doctorName: p.doctorName,
            invoiceNumber: p.invoiceNumber,
            dueDate: p.dueDate ? new Date(p.dueDate) : null,
            amount: p.amount,
            status: p.status,
            insuranceProvider: p.insuranceProvider,
            insuranceCoverage: p.insuranceCoverage,
            insuranceAmount: p.insuranceAmount,
            patientOwes: p.patientOwes,
            notes: p.notes
        });
        while (this.itemsArray.length) this.itemsArray.removeAt(0);
        (p.items || []).forEach((item) =>
            this.itemsArray.push(
                this.fb.group({
                    description: [item.description],
                    quantity: [item.quantity],
                    unitPrice: [item.unitPrice],
                    total: [item.total]
                })
            )
        );
        this.showForm = true;
    }

    viewInvoice(p: Payment) {
        this.viewingPayment = p;
        this.showView = true;
    }

    addItem() {
        this.itemsArray.push(
            this.fb.group({
                description: [''],
                quantity: [1],
                unitPrice: [0],
                total: [0]
            })
        );
    }

    removeItem(i: number) {
        this.itemsArray.removeAt(i);
        this.recalcTotal();
    }

    recalcItem(i: number) {
        const g = this.itemsArray.at(i) as FormGroup;
        const total = (g.value.quantity || 0) * (g.value.unitPrice || 0);
        g.patchValue({ total }, { emitEvent: false });
        this.recalcTotal();
    }

    recalcTotal() {
        const total = this.itemsArray.controls.reduce((s, g) => s + (g.value.total || 0), 0);
        this.form.patchValue({ amount: total }, { emitEvent: false });
        this.recalcOwes();
    }

    recalcOwes() {
        const amount = this.form.value.amount || 0;
        const coverage = this.form.value.insuranceCoverage || 0;
        const insuranceAmount = (amount * coverage) / 100;
        const patientOwes = amount - insuranceAmount;
        this.form.patchValue({ insuranceAmount, patientOwes }, { emitEvent: false });
    }

    getItemTotal(i: number): string {
        const g = this.itemsArray.at(i);
        return ((g.value.quantity || 0) * (g.value.unitPrice || 0)).toFixed(2);
    }

    submit() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const f = this.form.getRawValue();
        if (!f.patientId) {
            this.helpers.notifyError('Error', 'Please select a patient');
            return;
        }

        this.submitting = true;
        const payload: CreateUpdatePaymentRequest = {
            invoiceNumber: f.invoiceNumber || `INV-${Date.now()}`,
            patientName: f.patientName,
            doctorEmail: this.auth.isDoctor
                ? this.auth.current.email
                : this._doctors()
                      .find((d) => d.name === f.doctorName)
                      ?.email?.toLowerCase()
                      .trim() || null,
            doctorName: this.auth.isDoctor ? this.auth.current.name : f.doctorName,
            items: f.items,
            amount: f.amount,
            status: f.status,
            insuranceProvider: f.insuranceProvider || null,
            insuranceCoverage: f.insuranceCoverage || 0,
            insuranceAmount: f.insuranceAmount || 0,
            patientOwes: f.patientOwes ?? f.amount,
            dueDate: f.dueDate ? new Date(f.dueDate).toISOString().slice(0, 10) : undefined,
            notes: f.notes || null
        };

        if (this.editingPayment) {
            this.paymentsService.updatePayment(f.patientId, this.editingPayment.paymentId, payload).subscribe({
                next: () => {
                    this.submitting = false;
                    this.showForm = false;
                    this.helpers.notifySuccess('Invoice updated');
                    this.loadPatients();
                },
                error: (e) => {
                    this.submitting = false;
                    this.helpers.notifyError('Error', e?.error?.message || 'Failed');
                }
            });
        } else {
            this.paymentsService.createPayment(f.patientId, payload).subscribe({
                next: () => {
                    this.submitting = false;
                    this.showForm = false;
                    this.helpers.notifySuccess('Invoice created');
                    this.loadPatients();
                },
                error: (e) => {
                    this.submitting = false;
                    this.helpers.notifyError('Error', e?.error?.message || 'Failed');
                }
            });
        }
    }

    confirmDelete(p: Payment) {
        this.confirmationService.confirm({
            message: `Delete invoice ${p.invoiceNumber}?`,
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.paymentsService.deletePayment(p.patientId, p.paymentId).subscribe({
                    next: () => {
                        this.helpers.notifySuccess('Invoice deleted');
                        this.loadPatients();
                    },
                    error: (e) => this.helpers.notifyError('Error', e?.error?.message || 'Failed')
                });
            }
        });
    }

    getStatusSeverity(status: string): any {
        const map: any = {
            paid: 'success',
            pending: 'warn',
            partial: 'info',
            cancelled: 'danger',
            'health-insurance': 'secondary'
        };
        return map[status] || 'secondary';
    }

    filterStatuses(event: any) {
        const q = (event.query || '').toLowerCase();
        this.filteredStatuses = this.statusOptions.filter((s) => s.includes(q));
    }

    searchDoctor(event: any) {
        const q = (event.query || '').toLowerCase();
        this.filteredDoctorNames = this._doctors()
            .filter((d) => d.name.toLowerCase().includes(q))
            .map((d) => d.name);
    }

    onDoctorSelect(event: any) {
        const name = event.value as string;
        const doctor = this._doctors().find((d) => d.name === name);
        if (doctor) {
            this.form.patchValue({ doctorName: name });
        }
    }
}

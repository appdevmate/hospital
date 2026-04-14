import { Component, OnInit, AfterViewInit, inject, signal, computed, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
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
import { SelectModule } from 'primeng/select';

import { PaymentsService, Payment, CreateUpdatePaymentRequest } from '@/service/payments.service';
import { PatientsService, Patient } from '@/service/patients.service';
import { DoctorsService } from '@/service/doctors.service';
import { HelpersService } from '@/service/helpers-service';
import { AuthService } from '@/service/auth.service';
import { GenericTableComponent } from '@/components/generic-table/generic-table';
import { TableColumn, TableConfig } from '@/interfaces/tableplugin.interfaces';

/** Status → PrimeNG severity map */
const STATUS_SEVERITY: Record<string, string> = {
    paid: 'success',
    pending: 'warn',
    partial: 'info',
    cancelled: 'danger',
    'health-insurance': 'secondary'
};

@Component({
    selector: 'app-invoices',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        ButtonModule,
        TagModule,
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
        SelectModule,
        GenericTableComponent
    ],
    providers: [MessageService, ConfirmationService, HelpersService],
    templateUrl: './invoices.html',
    styleUrl: './invoices.scss'
})
export class InvoicesComponent implements OnInit, AfterViewInit {
    @ViewChild('statusTemplate') statusTemplateTpl!: TemplateRef<any>;

    // ── Services ─────────────────────────────────────────────────────────────
    private paymentsService = inject(PaymentsService);
    private patientsService = inject(PatientsService);
    private doctorsService = inject(DoctorsService);
    private helpers = inject(HelpersService);
    private fb = inject(FormBuilder);
    private confirmationService = inject(ConfirmationService);
    auth = inject(AuthService); // public — used in template

    // ── State signals ─────────────────────────────────────────────────────────
    _allInvoices = signal<Payment[]>([]);
    private _patients = signal<Patient[]>([]);
    private _doctors = signal<any[]>([]);
    loading = signal(false);
    customTemplates = signal<Record<string, any>>({});

    // ── Dialog state ──────────────────────────────────────────────────────────
    submitting = false;
    showForm = false;
    showView = false;
    editingPayment: Payment | null = null;
    viewingPayment: Payment | null = null;

    // ── Autocomplete suggestions ──────────────────────────────────────────────
    filteredPatientNames: string[] = [];
    filteredDoctorNames: string[] = [];
    filteredStatuses: string[] = [];

    statusOptions = ['pending', 'paid', 'partial', 'cancelled', 'health-insurance'];

    // ── Table config ──────────────────────────────────────────────────────────
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

    // ── Computed ──────────────────────────────────────────────────────────────

    /** Stats cards above table */
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

    // ── Reactive Form ─────────────────────────────────────────────────────────
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

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    ngOnInit() {
        this.auth.invalidate();
        console.log('isAdmin:', this.auth.isAdmin, 'isDoctor:', this.auth.isDoctor, 'role:', this.auth.current.role);
        if (this.auth.isAdmin) {
            this.loadReferenceData();
        }
        this.loadInvoices();
    }

    ngAfterViewInit() {
        this.customTemplates.set({ status: this.statusTemplateTpl });
    }

    // ── Data loading ──────────────────────────────────────────────────────────

    /** Load doctors and patients for dropdowns */
    loadReferenceData() {
        this.doctorsService.getDoctorsPage({ pageSize: 200 }).subscribe({
            next: (res) => this._doctors.set(res.data || [])
        });
        this.patientsService.getPatientsPage({ pageSize: 200 }).subscribe({
            next: (res) => this._patients.set(res.data || [])
        });
    }

    /** Single request to GET /invoices — filtered by doctorEmail for doctors */
    loadInvoices() {
        this.loading.set(true);
        const doctorEmail = this.auth.isDoctor ? this.auth.current.email : undefined;
        this.paymentsService.getAllInvoices(doctorEmail).subscribe({
            next: (res) => {
                this._allInvoices.set(res.data || []);
                this.loading.set(false);
            },
            error: () => this.loading.set(false)
        });
    }

    // ── Create ────────────────────────────────────────────────────────────────
    openCreate() {
        this.editingPayment = null;
        this.form.reset({ status: 'pending', insuranceCoverage: 0, insuranceAmount: 0, patientOwes: 0, amount: 0 });
        while (this.itemsArray.length) this.itemsArray.removeAt(0);
        this.showForm = true;
    }

    // ── Edit ──────────────────────────────────────────────────────────────────
    openEdit(p: Payment) {
        this.editingPayment = p;
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

    // ── View ──────────────────────────────────────────────────────────────────
    viewInvoice(p: Payment) {
        this.viewingPayment = p;
        this.showView = true;
    }

    // ── Items ─────────────────────────────────────────────────────────────────
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

    // ── Submit ────────────────────────────────────────────────────────────────
    submit() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const f = this.form.getRawValue();
        if (!f.patientId) {
            this.helpers.notifyError('Error', 'Please select a patient.');
            return;
        }

        this.submitting = true;

        const payload: CreateUpdatePaymentRequest = {
            invoiceNumber: f.invoiceNumber || `INV-${Date.now()}`,
            patientName: f.patientName,
            // Doctors use their own email; admins pick from dropdown
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
                    this.helpers.notifySuccess('Invoice updated.');
                    this.loadInvoices();
                },
                error: (e) => {
                    this.submitting = false;
                    this.helpers.notifyError('Error', e?.error?.message || 'Failed.');
                }
            });
        } else {
            this.paymentsService.createPayment(f.patientId, payload).subscribe({
                next: () => {
                    this.submitting = false;
                    this.showForm = false;
                    this.helpers.notifySuccess('Invoice created.');
                    this.loadInvoices();
                },
                error: (e) => {
                    this.submitting = false;
                    this.helpers.notifyError('Error', e?.error?.message || 'Failed.');
                }
            });
        }
    }

    // ── Delete ────────────────────────────────────────────────────────────────
    confirmDelete(p: Payment) {
        this.confirmationService.confirm({
            message: `Delete invoice ${p.invoiceNumber}?`,
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            rejectButtonProps: { label: 'No', severity: 'secondary', variant: 'text' },
            acceptButtonProps: { label: 'Yes', severity: 'danger' },
            accept: () => {
                this.paymentsService.deletePayment(p.patientId, p.paymentId).subscribe({
                    next: () => {
                        this.helpers.notifySuccess('Invoice deleted.');
                        this.loadInvoices();
                    },
                    error: (e) => this.helpers.notifyError('Error', e?.error?.message || 'Failed.')
                });
            }
        });
    }

    // ── Autocomplete ──────────────────────────────────────────────────────────
    searchPatient(event: any) {
        const q = (event.query || '').toLowerCase();
        this.filteredPatientNames = this._patients()
            .filter((p) => p.name.toLowerCase().includes(q))
            .map((p) => p.name);
    }

    onPatientSelect(event: any) {
        const patient = this._patients().find((p) => p.name === event.value);
        if (patient) {
            const id = patient.PK.includes('#') ? patient.PK.split('#')[1] : patient.PK;
            this.form.patchValue({ patientId: id, patientName: patient.name });
        }
    }

    searchDoctor(event: any) {
        const q = (event.query || '').toLowerCase();
        this.filteredDoctorNames = this._doctors()
            .filter((d) => d.name.toLowerCase().includes(q))
            .map((d) => d.name);
    }

    onDoctorSelect(event: any) {
        this.form.patchValue({ doctorName: event.value });
    }

    filterStatuses(event: any) {
        const q = (event.query || '').toLowerCase();
        this.filteredStatuses = this.statusOptions.filter((s) => s.includes(q));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    getStatusSeverity(status: string): any {
        return STATUS_SEVERITY[status] || 'secondary';
    }
}

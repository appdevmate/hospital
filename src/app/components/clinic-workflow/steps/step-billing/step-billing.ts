import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { DividerModule } from 'primeng/divider';
import { CardModule } from 'primeng/card';
import { MessageService } from 'primeng/api';
import { WorkflowStateService } from '../../workflow-state.service';
import { PaymentsService } from '@/pages/service/payments.service';
import { AuthService } from '@/pages/service/auth.service';

@Component({
    selector: 'app-step-billing',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [MessageService],
    imports: [
        CommonModule, FormsModule,
        TableModule, ButtonModule, InputNumberModule, SelectModule,
        DatePickerModule, TextareaModule, ToastModule, DividerModule, CardModule
    ],
    template: `
<p-toast></p-toast><div class="flex flex-col gap-6"><div class="card"><h2 class="text-xl font-semibold mb-4">Invoice Items</h2><p-table [value]="invoiceItems()" dataKey="description" styleClass="p-datatable-sm"><ng-template pTemplate="header"><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></ng-template><ng-template pTemplate="body" let-item let-i="rowIndex"><tr><td>{{ item.description }}</td><td>{{ item.quantity }}</td><td><p-inputNumber [(ngModel)]="invoiceItems()[i].unitPrice" [min]="0" (ngModelChange)="updateTotal(i, $event)" styleClass="w-28"></p-inputNumber></td><td>{{ item.total | currency }}</td></tr></ng-template></p-table><div class="flex justify-end mt-4"><span class="text-xl font-bold">Total: {{ totalAmount() | currency }}</span></div></div><div class="card"><h3 class="text-lg font-semibold mb-4">Payment Details</h3><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div class="flex flex-col gap-1"><label class="text-sm font-medium">Payment Type</label><p-select [(ngModel)]="paymentType" [options]="paymentTypeOptions" placeholder="Select type" styleClass="w-full"></p-select></div><div class="flex flex-col gap-1"><label class="text-sm font-medium">Due Date</label><p-date-picker [(ngModel)]="dueDate" placeholder="Select due date" dateFormat="yy-mm-dd" styleClass="w-full" (onSelect)="onDueDateSelect($event)"></p-date-picker></div><div class="flex flex-col gap-1 md:col-span-2"><label class="text-sm font-medium">Notes</label><textarea pTextarea [(ngModel)]="notes" rows="3" class="w-full" placeholder="Invoice notes"></textarea></div></div></div><div class="flex justify-between"><p-button label="Back" icon="pi pi-arrow-left" severity="secondary" (onClick)="back.emit()"></p-button><p-button label="Generate Invoice" icon="pi pi-file" [loading]="saving()" (onClick)="generateInvoice()"></p-button></div></div>
    `
})
export class StepBillingComponent implements OnInit {
    @Output() next = new EventEmitter<void>();
    @Output() back = new EventEmitter<void>();
    state = inject(WorkflowStateService);
    private paymentsService = inject(PaymentsService);
    private auth = inject(AuthService);
    private messageService = inject(MessageService);
    saving = signal(false);
    invoiceItems = signal<{ description: string; quantity: number; unitPrice: number; total: number }[]>([
        { description: "Consultation Fee", quantity: 1, unitPrice: 50, total: 50 }
    ]);
    totalAmount = computed(() => this.invoiceItems().reduce((sum, item) => sum + item.total, 0));
    paymentType = "cash";
    paymentTypeOptions = ["cash", "card", "insurance"];
    dueDate: Date | null = null;
    dueDateStr = "";
    notes = "";
    ngOnInit(): void {}
    onDueDateSelect(date: Date): void { this.dueDateStr = date.toISOString().split("T")[0]; }
    updateTotal(index: number, newUnitPrice: number): void {
        this.invoiceItems.update(items => {
            const updated = [...items];
            updated[index] = { ...updated[index], unitPrice: newUnitPrice, total: newUnitPrice * updated[index].quantity };
            return updated;
        });
    }
    generateInvoice(): void {
        const patient = this.state.patient()!;
        const appt = this.state.appointment()!;
        this.saving.set(true);
        const payload = {
            amount: this.totalAmount(),
            status: "pending",
            invoiceNumber: "INV-" + Date.now(),
            patientName: patient.name,
            doctorId: "",
            doctorName: this.auth.current.name,
            doctorEmail: this.auth.current.email,
            appointmentId: appt.appointmentId,
            items: this.invoiceItems(),
            paymentType: this.paymentType,
            dueDate: this.dueDateStr || undefined,
            insuranceCoverage: 0,
            insuranceAmount: 0,
            patientOwes: this.totalAmount(),
            notes: this.notes || undefined
        };
        this.paymentsService.createPayment(patient.patientId, payload)
            .pipe(catchError(err => { this.messageService.add({ severity: "error", summary: "Error", detail: err.message }); this.saving.set(false); return of(null); }))
            .subscribe(res => {
                this.saving.set(false);
                if (res) {
                    this.state.invoice.set(res.data);
                    this.messageService.add({ severity: "success", summary: "Invoice Generated", detail: res.data.invoiceNumber });
                    this.next.emit();
                }
            });
    }
}
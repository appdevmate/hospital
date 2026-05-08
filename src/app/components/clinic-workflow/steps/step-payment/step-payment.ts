import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { DividerModule } from 'primeng/divider';
import { CardModule } from 'primeng/card';
import { MessageService } from 'primeng/api';
import { WorkflowStateService } from '../../workflow-state.service';
import { PaymentsService } from '@/pages/service/payments.service';

@Component({
    selector: 'app-step-payment',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [MessageService],
    imports: [
        CommonModule, FormsModule,
        TableModule, ButtonModule, SelectModule, TagModule, ToastModule, DividerModule, CardModule
    ],
    template: `
<p-toast></p-toast><div class="flex flex-col gap-6">@if (state.invoice()) {<div class="card"><h2 class="text-xl font-semibold mb-4">Invoice Summary</h2><div class="grid grid-cols-2 gap-4 mb-4"><div><span class="text-surface-500 text-sm">Invoice #</span><p class="font-medium m-0">{{ state.invoice()!.invoiceNumber }}</p></div><div><span class="text-surface-500 text-sm">Patient</span><p class="font-medium m-0">{{ state.invoice()!.patientName }}</p></div><div><span class="text-surface-500 text-sm">Amount</span><p class="font-bold text-xl m-0">{{ state.invoice()!.amount | currency }}</p></div><div><span class="text-surface-500 text-sm">Status</span><p-tag [value]="state.invoice()!.status" severity="warn"></p-tag></div></div><p-table [value]="state.invoice()!.items || []" styleClass="p-datatable-sm"><ng-template pTemplate="header"><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></ng-template><ng-template pTemplate="body" let-item><tr><td>{{ item.description }}</td><td>{{ item.quantity }}</td><td>{{ item.unitPrice | currency }}</td><td>{{ item.total | currency }}</td></tr></ng-template></p-table></div><div class="card"><h3 class="text-lg font-semibold mb-4">Confirm Payment</h3><div class="flex flex-col gap-1 mb-4"><label class="text-sm font-medium">Payment Method</label><p-select [(ngModel)]="paymentMethodValue" [options]="paymentMethods" placeholder="Select payment method" styleClass="w-full md:w-64"></p-select></div></div>}<div class="flex justify-between"><p-button label="Back" icon="pi pi-arrow-left" severity="secondary" (onClick)="back.emit()"></p-button><p-button label="Confirm Payment" icon="pi pi-check-circle" severity="success" [loading]="saving()" [disabled]="!state.invoice()" (onClick)="confirmPayment()"></p-button></div></div>
    `
})
export class StepPaymentComponent {
    @Output() next = new EventEmitter<void>();
    @Output() back = new EventEmitter<void>();
    state = inject(WorkflowStateService);
    private paymentsService = inject(PaymentsService);
    private messageService = inject(MessageService);
    saving = signal(false);
    paymentMethodValue = signal<string>("cash");
    paymentMethods = ["cash", "card", "insurance", "online"];
    confirmPayment(): void {
        const invoice = this.state.invoice();
        const patient = this.state.patient();
        if (!invoice || !patient) return;
        this.saving.set(true);
        this.paymentsService.updatePayment(patient.patientId, invoice.paymentId, { status: "paid", paymentType: this.paymentMethodValue() })
            .pipe(catchError(err => { this.messageService.add({ severity: "error", summary: "Error", detail: err.message }); this.saving.set(false); return of(null); }))
            .subscribe(res => {
                this.saving.set(false);
                if (res) {
                    this.state.invoice.set(res.updatedData);
                    this.messageService.add({ severity: "success", summary: "Payment Confirmed", detail: "Payment has been processed successfully." });
                    setTimeout(() => this.next.emit(), 1000);
                }
            });
    }
}
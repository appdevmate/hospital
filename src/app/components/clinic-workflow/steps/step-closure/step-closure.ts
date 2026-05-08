import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { catchError, of } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { DividerModule } from 'primeng/divider';
import { MessageService } from 'primeng/api';
import { WorkflowStateService } from '../../workflow-state.service';
import { ConsultationService } from '@/pages/service/hms/consultation.service';

@Component({
    selector: 'app-step-closure',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [MessageService],
    imports: [CommonModule, ButtonModule, CardModule, TagModule, ToastModule, DividerModule],
    template: `
<p-toast></p-toast><div class="flex flex-col gap-6"><div class="card text-center"><div class="flex flex-col items-center gap-4 py-8"><div class="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center"><i class="pi pi-check-circle text-5xl text-green-500"></i></div><h1 class="text-3xl font-bold text-green-600 m-0">Consultation Complete</h1><p class="text-surface-500 m-0">The workflow has been completed successfully.</p></div><p-divider></p-divider><div class="grid grid-cols-2 gap-6 mt-4 text-left"><div><span class="text-surface-500 text-sm block">Patient</span><p class="font-semibold m-0">{{ state.patient()?.name || '--' }}</p></div><div><span class="text-surface-500 text-sm block">Appointment Date</span><p class="font-semibold m-0">{{ state.appointment()?.date || '--' }}</p></div><div><span class="text-surface-500 text-sm block">Invoice Number</span><p class="font-semibold m-0">{{ state.invoice()?.invoiceNumber || '--' }}</p></div><div><span class="text-surface-500 text-sm block">Payment Status</span><p-tag [value]="state.invoice()?.status || 'N/A'" severity="success"></p-tag></div></div><div class="flex justify-center mt-8"><p-button label="Start New Consultation" icon="pi pi-refresh" (onClick)="restart.emit()"></p-button></div></div></div>
    `
})
export class StepClosureComponent implements OnInit {
    @Output() restart = new EventEmitter<void>();
    state = inject(WorkflowStateService);
    private consultationService = inject(ConsultationService);
    private messageService = inject(MessageService);
    ngOnInit(): void {
        const c = this.state.consultation();
        if (c) {
            this.consultationService.update(c.consultationId, c.patientId, { status: "completed" })
                .pipe(catchError(() => of(null)))
                .subscribe(updated => { if (updated) this.state.consultation.set(updated); });
        }
    }
}
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StepsModule } from 'primeng/steps';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService, MenuItem } from 'primeng/api';
import { WorkflowStateService } from './workflow-state.service';
import { StepPatientComponent } from './steps/step-patient/step-patient';
import { StepAppointmentComponent } from './steps/step-appointment/step-appointment';
import { StepConsultationComponent } from './steps/step-consultation/step-consultation';
import { StepBillingComponent } from './steps/step-billing/step-billing';
import { StepPaymentComponent } from './steps/step-payment/step-payment';
import { StepClosureComponent } from './steps/step-closure/step-closure';

@Component({
    selector: 'app-clinic-workflow',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [WorkflowStateService, MessageService],
    imports: [
        CommonModule, StepsModule, ButtonModule, ToastModule,
        StepPatientComponent, StepAppointmentComponent, StepConsultationComponent,
        StepBillingComponent, StepPaymentComponent, StepClosureComponent
    ],
    template: `
        <p-toast></p-toast>
        <div class="flex flex-col gap-4 p-4">
            <div class="flex items-center justify-between mb-2">
                <div>
                    <h1 class="text-3xl font-bold m-0">Clinic Workflow</h1>
                    @if (state.patient()) {
                        <p class="text-surface-500 mt-1 m-0">Patient: <strong>{{ state.patient()!.name }}</strong></p>
                    }
                </div>
                @if (state.currentStep() > 0) {
                    <p-button label="Start Over" icon="pi pi-refresh" severity="secondary" [text]="true" (onClick)="restart()"></p-button>
                }
            </div>
            <p-steps [model]="steps" [activeIndex]="state.currentStep()" [readonly]="true" styleClass="mb-6"></p-steps>
            @switch (state.currentStep()) {
                @case (0) { <app-step-patient (next)="next()"></app-step-patient> }
                @case (1) { <app-step-appointment (next)="next()" (back)="back()"></app-step-appointment> }
                @case (2) { <app-step-consultation (next)="next()" (back)="back()"></app-step-consultation> }
                @case (3) { <app-step-billing (next)="next()" (back)="back()"></app-step-billing> }
                @case (4) { <app-step-payment (next)="next()" (back)="back()"></app-step-payment> }
                @case (5) { <app-step-closure (restart)="restart()"></app-step-closure> }
            }
        </div>
    `
})
export class ClinicWorkflowComponent {
    state = inject(WorkflowStateService);
    steps: MenuItem[] = [
        { label: 'Patient' },
        { label: 'Appointment' },
        { label: 'Consultation' },
        { label: 'Billing' },
        { label: 'Payment' },
        { label: 'Done' },
    ];
    next(): void { this.state.currentStep.update(s => Math.min(s + 1, 5)); }
    back(): void { this.state.currentStep.update(s => Math.max(s - 1, 0)); }
    restart(): void { this.state.reset(); }
}
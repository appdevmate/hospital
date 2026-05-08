import { Injectable, signal } from '@angular/core';
import { HmsPatient } from '@/pages/service/hms/patient.service';
import { HmsAppointment } from '@/pages/service/hms/appointment.service';
import { HmsConsultation } from '@/pages/service/hms/consultation.service';
import { Payment } from '@/pages/service/payments.service';

@Injectable()
export class WorkflowStateService {
    patient = signal<HmsPatient | null>(null);
    appointment = signal<HmsAppointment | null>(null);
    consultation = signal<HmsConsultation | null>(null);
    invoice = signal<Payment | null>(null);
    currentStep = signal<number>(0);

    reset() {
        this.patient.set(null);
        this.appointment.set(null);
        this.consultation.set(null);
        this.invoice.set(null);
        this.currentStep.set(0);
    }
}
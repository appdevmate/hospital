import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { PatientsService, Patient } from '../../pages/service/patients.service';
import { AppointmentsService, Appointment } from '../../pages/service/appointments.service';
import { PaymentsService, Payment } from '../../pages/service/payments.service';

@Component({
    selector: 'app-patient-profile',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, TagModule, TabsModule, CardModule],
    templateUrl: './patient-profile.html',
    styleUrl: './patient-profile.scss'
})
export class PatientProfileComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private patientsService = inject(PatientsService);
    private appointmentsService = inject(AppointmentsService);
    private paymentsService = inject(PaymentsService);

    patient: Patient | null = null;
    appointments: Appointment[] = [];
    invoices: Payment[] = [];
    loading = true;

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) {
            this.loading = false;
            return;
        }

        forkJoin({
            patient: this.patientsService.getPatientById(id).pipe(catchError(() => of(null))),
            appointments: this.appointmentsService.getAppointments().pipe(catchError(() => of([]))),
            invoices: this.paymentsService.getAllInvoices().pipe(catchError(() => of({ data: [] })))
        }).subscribe(({ patient, appointments, invoices }) => {
            this.patient = (patient as any)?.data || patient;

            // patientId in appointments may be stored as full 'PATIENT#uuid' or just 'uuid'
            // match against both to be safe
            const patientPK = this.patient?.PK || '';
            const plainId = patientPK.includes('#') ? patientPK.split('#')[1] : patientPK;
            const fullId = patientPK.startsWith('PATIENT#') ? patientPK : `PATIENT#${plainId}`;

            this.appointments = (appointments as Appointment[]).filter((a) => a.patientId === plainId || a.patientId === fullId);

            const allInvoices = ((invoices as any)?.data || []) as Payment[];
            this.invoices = allInvoices.filter((inv) => inv.patientId === plainId || inv.patientId === fullId);

            this.loading = false;
        });
    }

    // ── Severity helpers ──────────────────────────────────────────────────
    getStatusSeverity(status: string): 'success' | 'warn' | 'danger' | 'secondary' | 'info' | 'contrast' {
        const map: Record<string, any> = {
            admitted: 'info',
            stable: 'success',
            'under treatment': 'warn',
            discharged: 'secondary',
            critical: 'danger',
            dead: 'contrast'
        };
        return map[status?.toLowerCase()] || 'secondary';
    }

    getApptStatusSeverity(status: string): 'success' | 'warn' | 'danger' | 'secondary' {
        const map: Record<string, any> = {
            scheduled: 'warn',
            completed: 'success',
            cancelled: 'danger'
        };
        return map[status] || 'secondary';
    }

    getInvoiceStatusSeverity(status: string): 'success' | 'warn' | 'danger' | 'secondary' {
        const map: Record<string, any> = {
            paid: 'success',
            pending: 'warn',
            overdue: 'danger'
        };
        return map[status?.toLowerCase()] || 'secondary';
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    isArray(value: any): boolean {
        return Array.isArray(value);
    }

    get age(): number | null {
        if (!this.patient?.dob) return null;
        const dob = new Date(this.patient.dob);
        const diff = Date.now() - dob.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    }
}

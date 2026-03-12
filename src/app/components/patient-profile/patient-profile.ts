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

    patient: Patient | null = null;
    appointments: Appointment[] = [];
    loading = true;

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) {
            this.loading = false;
            return;
        }

        forkJoin({
            patient: this.patientsService.getPatientById(id).pipe(catchError(() => of(null))),
            appointments: this.appointmentsService.getAppointments().pipe(catchError(() => of([])))
        }).subscribe(({ patient, appointments }) => {
            this.patient = (patient as any)?.data || patient;

            // PK is PATIENT#uuid — extract plain uuid to match appointment.patientId
            const patientPK = this.patient?.PK || '';
            const patientId = patientPK.includes('#') ? patientPK.split('#')[1] : patientPK;
            this.appointments = (appointments as Appointment[]).filter((a) => a.patientId === patientId);

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

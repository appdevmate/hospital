import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PatientsService, Patient } from '../../pages/service/patients.service';
import { AppointmentsService, Appointment } from '../../pages/service/appointments.service';
import { forkJoin } from 'rxjs';
import { catchError, of } from 'rxjs';

@Component({
    selector: 'app-patient-profile',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, TagModule, TabsModule, CardModule, ToastModule],
    providers: [MessageService],
    templateUrl: './patient-profile.html',
    styleUrl: './patient-profile.scss'
})
export class PatientProfileComponent implements OnInit {
    patient: Patient | null = null;
    appointments: Appointment[] = [];
    loading = true;

    constructor(
        private route: ActivatedRoute,
        private patientsService: PatientsService,
        private appointmentsService: AppointmentsService,
        private messageService: MessageService,
        private cd: ChangeDetectorRef
    ) {}

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) return;

        forkJoin({
            patient: this.patientsService.getPatientById(id).pipe(catchError(() => of(null))),
            appointments: this.appointmentsService.getAppointments().pipe(catchError(() => of([])))
        }).subscribe(({ patient, appointments }) => {
            console.log('patient response:', patient);
            this.patient = (patient as any)?.data || patient;
            const patientPK = this.patient?.PK || '';
            this.appointments = (appointments as Appointment[]).filter((a) => a.patientId === patientPK);
            this.loading = false;
            this.cd.detectChanges();
        });
    }

    getStatusSeverity(status: string): 'success' | 'warn' | 'danger' | 'secondary' | 'info' | 'contrast' {
        const map: any = {
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
        const map: any = { scheduled: 'warn', completed: 'success', cancelled: 'danger' };
        return map[status] || 'secondary';
    }

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

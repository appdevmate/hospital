import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { PatientsService, Patient } from '../../services/patients.service';
import { AppointmentsService, Appointment } from '../../services/appointments.service';
import { ConsultationService } from '@/services/consultation.service';
import { PaymentsService, Payment } from '../../services/payments.service';
import { HelpersService } from '@/services/helpers-service';
import { AuthService } from '@/services/auth.service';
import { ConsultationListComponent } from '../consultation/consultation-list/consultation-list';

@Component({
    selector: 'app-patient-profile',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, TagModule, Tabs, TabList, Tab, TabPanels, TabPanel, CardModule, ConfirmDialogModule, ConsultationListComponent],
    providers: [ConfirmationService],
    templateUrl: './patient-profile.html',
    styleUrl: './patient-profile.scss'
})
export class PatientProfileComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private patientsService = inject(PatientsService);
    private appointmentsService = inject(AppointmentsService);
    private consultationService = inject(ConsultationService);
    private paymentsService = inject(PaymentsService);
    private confirm = inject(ConfirmationService);
    private helpers = inject(HelpersService);
    auth = inject(AuthService);

    patient: Patient | null = null;
    appointments: Appointment[] = [];
    invoices: Payment[] = [];
    loading = true;
    restoring = false;
    startingConsultation: string | null = null;

    plainId = '';
    patientName = '';

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

            const patientPK = this.patient?.PK || '';
            this.plainId = patientPK.includes('#') ? patientPK.split('#')[1] : patientPK;
            this.patientName = this.patient?.name || '';

            const fullId = patientPK.startsWith('PATIENT#') ? patientPK : `PATIENT#${this.plainId}`;

            this.appointments = (appointments as Appointment[]).filter((a) => a.patientId === this.plainId || a.patientId === fullId);

            const allInvoices = ((invoices as any)?.data || []) as Payment[];
            this.invoices = allInvoices.filter((inv) => inv.patientId === this.plainId || inv.patientId === fullId);

            this.loading = false;
        });
    }

    // ── Start / resume consultation from appointment ──────────────────────
    startConsultation(appt: Appointment) {
        // Already linked to a consultation → resume it (don't create a duplicate).
        if (appt.encounterId) {
            this.router.navigate(['/consultation', appt.encounterId]);
            return;
        }

        this.startingConsultation = appt.appointmentId;

        this.appointmentsService
            .startConsultation(appt.appointmentId)
            .pipe(catchError(() => of(null)))
            .subscribe(() => {
                this.consultationService
                    .createConsultation({
                        patientId: this.plainId,
                        patientName: this.patientName,
                        doctorEmail: this.auth.current?.email || '',
                        doctorName: this.auth.current?.name || '',
                        appointmentId: appt.appointmentId
                    })
                    .subscribe({
                        next: (c) => {
                            this.startingConsultation = null;
                            const id = c.consultationId || (c as any).examId;
                            // Link the consultation to the appointment so we can resume it
                            // and so closing it can complete the appointment.
                            if (id) {
                                appt.encounterId = id;
                                this.appointmentsService.linkEncounter(appt.appointmentId, id).subscribe({ error: () => {} });
                            }
                            this.router.navigate(['/consultation', id]);
                        },
                        error: (err) => {
                            this.startingConsultation = null;
                            this.helpers.notifyError('Error', err?.error?.message || 'Could not create consultation');
                        }
                    });
            });
    }

    // ── Restore ───────────────────────────────────────────────────────────
    restorePatient() {
        if (!this.patient) return;
        const name = this.patient.name;
        this.confirm.confirm({
            message: `Restore ${name}? They will become visible again in all normal views.`,
            header: 'Restore Patient',
            icon: 'pi pi-undo',
            acceptButtonProps: { label: 'Restore', severity: 'success' },
            rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
            accept: () => {
                this.restoring = true;
                this.patientsService.restorePatient(this.plainId).subscribe({
                    next: () => {
                        this.helpers.notifySuccess(`${name} restored successfully`);
                        this.patientsService
                            .getPatientById(this.plainId)
                            .pipe(catchError(() => of(null)))
                            .subscribe((res) => {
                                this.patient = (res as any)?.data || res;
                                this.restoring = false;
                            });
                    },
                    error: (e: any) => {
                        this.helpers.notifyError('Error', e?.error?.message || 'Could not restore patient');
                        this.restoring = false;
                    }
                });
            }
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    get isDeactivated(): boolean {
        const d = this.patient?.deletedAt;
        return !!d && d !== '' && d !== 'null' && d !== '<empty>';
    }

    getStatusSeverity(status: string): 'success' | 'warn' | 'danger' | 'secondary' | 'info' | 'contrast' {
        const map: Record<string, any> = { admitted: 'info', stable: 'success', 'under treatment': 'warn', discharged: 'secondary', critical: 'danger', dead: 'contrast' };
        return map[status?.toLowerCase()] || 'secondary';
    }

    getApptStatusSeverity(status: string): 'success' | 'warn' | 'danger' | 'secondary' | 'info' | 'contrast' {
        const map: Record<string, any> = { scheduled: 'warn', 'checked-in': 'info', 'in-progress': 'info', completed: 'success', cancelled: 'danger', 'no-show': 'contrast' };
        return map[status] || 'secondary';
    }

    getInvoiceStatusSeverity(status: string): 'success' | 'warn' | 'danger' | 'secondary' {
        const map: Record<string, any> = { paid: 'success', pending: 'warn', overdue: 'danger' };
        return map[status?.toLowerCase()] || 'secondary';
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

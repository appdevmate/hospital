import { __decorate } from "tslib";
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PatientsService } from '../../pages/service/patients.service';
import { AppointmentsService } from '../../pages/service/appointments.service';
import { PaymentsService } from '../../pages/service/payments.service';
import { HelpersService } from '@/pages/service/helpers-service';
import { AuthService } from '@/pages/service/auth.service';
import { ExaminationListComponent } from '../examination/examination-list/examination-list';
let PatientProfileComponent = class PatientProfileComponent {
    route = inject(ActivatedRoute);
    patientsService = inject(PatientsService);
    appointmentsService = inject(AppointmentsService);
    paymentsService = inject(PaymentsService);
    confirm = inject(ConfirmationService);
    helpers = inject(HelpersService);
    auth = inject(AuthService);
    patient = null;
    appointments = [];
    invoices = [];
    loading = true;
    restoring = false;
    // plain uuid extracted from PK — used for examination-list and profile queries
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
            this.patient = patient?.data || patient;
            const patientPK = this.patient?.PK || '';
            this.plainId = patientPK.includes('#') ? patientPK.split('#')[1] : patientPK;
            this.patientName = this.patient?.name || '';
            const fullId = patientPK.startsWith('PATIENT#') ? patientPK : `PATIENT#${this.plainId}`;
            this.appointments = appointments.filter((a) => a.patientId === this.plainId || a.patientId === fullId);
            const allInvoices = (invoices?.data || []);
            this.invoices = allInvoices.filter((inv) => inv.patientId === this.plainId || inv.patientId === fullId);
            this.loading = false;
        });
    }
    // ── Restore ───────────────────────────────────────────────────────────
    restorePatient() {
        if (!this.patient)
            return;
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
                        // refresh patient to clear the deletedAt value
                        this.patientsService
                            .getPatientById(this.plainId)
                            .pipe(catchError(() => of(null)))
                            .subscribe((res) => {
                            this.patient = res?.data || res;
                            this.restoring = false;
                        });
                    },
                    error: (e) => {
                        this.helpers.notifyError('Error', e?.error?.message || 'Could not restore patient');
                        this.restoring = false;
                    }
                });
            }
        });
    }
    // ── Computed helpers ──────────────────────────────────────────────────
    get isDeactivated() {
        const d = this.patient?.deletedAt;
        return !!d && d !== '' && d !== 'null' && d !== '<empty>';
    }
    // ── Severity helpers ──────────────────────────────────────────────────
    getStatusSeverity(status) {
        const map = {
            admitted: 'info',
            stable: 'success',
            'under treatment': 'warn',
            discharged: 'secondary',
            critical: 'danger',
            dead: 'contrast'
        };
        return map[status?.toLowerCase()] || 'secondary';
    }
    getApptStatusSeverity(status) {
        const map = { scheduled: 'warn', completed: 'success', cancelled: 'danger' };
        return map[status] || 'secondary';
    }
    getInvoiceStatusSeverity(status) {
        const map = { paid: 'success', pending: 'warn', overdue: 'danger' };
        return map[status?.toLowerCase()] || 'secondary';
    }
    isArray(value) {
        return Array.isArray(value);
    }
    get age() {
        if (!this.patient?.dob)
            return null;
        const dob = new Date(this.patient.dob);
        const diff = Date.now() - dob.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    }
};
PatientProfileComponent = __decorate([
    Component({
        selector: 'app-patient-profile',
        standalone: true,
        imports: [CommonModule, RouterModule, ButtonModule, TagModule, Tabs, TabList, Tab, TabPanels, TabPanel, CardModule, ConfirmDialogModule, ExaminationListComponent],
        providers: [ConfirmationService],
        templateUrl: './patient-profile.html',
        styleUrl: './patient-profile.scss'
    })
], PatientProfileComponent);
export { PatientProfileComponent };

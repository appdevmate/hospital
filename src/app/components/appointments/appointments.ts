import { Component, OnInit, AfterViewInit, ChangeDetectorRef, TemplateRef, ViewChild, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { forkJoin } from 'rxjs';
import { catchError, of } from 'rxjs';

import { GenericTableComponent } from '@/components/generic-table/generic-table';
import { TiryaqLoaderComponent } from '@/components/tiryaq-loader/tiryaq-loader';
import type { TableColumn, TableConfig } from '@/interfaces/tableplugin.interfaces';
import { AppointmentsService, Appointment, CreateAppointmentRequest } from '@/services/appointments.service';
import { DoctorsService, Doctor } from '@/services/doctors.service';
import { PatientsService, Patient } from '@/services/patients.service';
import { HelpersService } from '@/services/helpers-service';
import { AuthService } from '@/services/auth.service';

const STATUS_SEVERITY: Record<string, 'success' | 'warn' | 'danger' | 'secondary' | 'info' | 'contrast'> = {
    scheduled: 'warn',
    'checked-in': 'info',
    'in-progress': 'info',
    completed: 'success',
    cancelled: 'danger',
    'no-show': 'contrast'
};

const PRIORITY_SEVERITY: Record<string, 'success' | 'warn' | 'danger' | 'secondary'> = {
    routine: 'secondary',
    urgent: 'warn',
    emergency: 'danger'
};

const VISIT_TYPE_SEVERITY: Record<string, 'success' | 'warn' | 'danger' | 'secondary' | 'info' | 'contrast'> = {
    scheduled: 'info',
    'walk-in': 'secondary',
    emergency: 'danger',
    referral: 'warn',
    'follow-up': 'success',
    'check-up': 'contrast'
};

@Component({
    selector: 'app-appointments',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, TextareaModule, SelectModule, DatePickerModule, TagModule, ToastModule, ConfirmDialogModule, TooltipModule, GenericTableComponent, TiryaqLoaderComponent],
    providers: [MessageService, ConfirmationService, HelpersService],
    templateUrl: './appointments.html',
    styleUrl: './appointments.scss'
})
export class AppointmentsComponent implements OnInit, AfterViewInit {
    @ViewChild(GenericTableComponent) tableCmp?: GenericTableComponent;
    @ViewChild('statusTemplate') statusTemplate!: TemplateRef<any>;
    @ViewChild('priorityTemplate') priorityTemplate!: TemplateRef<any>;
    @ViewChild('durationTemplate') durationTemplate!: TemplateRef<any>;
    @ViewChild('typeTemplate') typeTemplate!: TemplateRef<any>;

    // ── Services ─────────────────────────────────────────────────────────────
    private appointmentsService = inject(AppointmentsService);
    private doctorsService = inject(DoctorsService);
    private patientsService = inject(PatientsService);
    private helpers = inject(HelpersService);
    private confirmationService = inject(ConfirmationService);
    private cd = inject(ChangeDetectorRef);
    auth = inject(AuthService);

    // ── State ─────────────────────────────────────────────────────────────────
    private _rows = signal<Appointment[]>([]);
    private _loading = signal<boolean>(false);
    private _customTemplates = signal<{ [k: string]: TemplateRef<any> }>({});

    rows = this._rows.asReadonly();
    loading = this._loading.asReadonly();
    customTemplates = this._customTemplates;

    // ── Reference data ────────────────────────────────────────────────────────
    doctors: Doctor[] = [];
    patients: Patient[] = [];

    // ── Dialog state ──────────────────────────────────────────────────────────
    saving = false;
    showCreateDialog = false;
    showEditDialog = false;
    showDetailDialog = false;
    showCancelDialog = false;
    selectedAppointment: Appointment | null = null;
    appointmentToCancel: Appointment | null = null;
    cancelReason = '';
    newAppt: any = this.emptyAppt();
    editAppt: any = {};

    // ── Dropdown options ──────────────────────────────────────────────────────
    visitTypeOptions = [
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Walk-in', value: 'walk-in' },
        { label: 'Emergency', value: 'emergency' },
        { label: 'Referral', value: 'referral' },
        { label: 'Follow-up', value: 'follow-up' },
        { label: 'Check-up', value: 'check-up' }
    ];

    priorityOptions = [
        { label: 'Routine', value: 'routine' },
        { label: 'Urgent', value: 'urgent' },
        { label: 'Emergency', value: 'emergency' }
    ];

    statusOptions = [
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Checked In', value: 'checked-in' },
        { label: 'In Progress', value: 'in-progress' },
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'No Show', value: 'no-show' }
    ];

    // ── Table config ──────────────────────────────────────────────────────────
    config: TableConfig = {
        title: 'Appointments',
        showGlobalSearch: true,
        showClearButton: true,
        showToolbar: true,
        pageSizeOptions: [10, 25, 50],
        defaultPageSize: 10,
        scrollHeight: '600px',
        emptyMessage: 'No appointments found.',
        showGridlines: true,
        rowHover: true,
        responsive: true,
        showResultsSummary: true,
        selectable: false,
        editType: 'none'
    };

    columns: TableColumn[] = [
        { field: 'date', header: 'Date', sortable: true, filterable: true, type: 'date', pipe: 'date', dateFormat: 'MMM d, y', width: '130px' },
        { field: 'dayName', header: 'Day', sortable: true, filterable: true, width: '110px' },
        { field: 'startTime', header: 'Start', sortable: false, filterable: false, width: '80px' },
        { field: 'endTime', header: 'End', sortable: false, filterable: false, width: '80px' },
        { field: 'duration', header: 'Duration', sortable: true, filterable: false, customTemplate: true, width: '100px' },
        { field: 'patientName', header: 'Patient', sortable: true, filterable: true, pipe: 'titlecase' },
        { field: 'doctorName', header: 'Doctor', sortable: true, filterable: true, pipe: 'titlecase' },
        { field: 'department', header: 'Department', sortable: true, filterable: true, pipe: 'titlecase' },
        { field: 'chiefComplaint', header: 'Chief Complaint', sortable: false, filterable: true, showTooltip: true },
        { field: 'visitType', header: 'Type', sortable: true, filterable: true, customTemplate: true, width: '120px' },
        { field: 'priority', header: 'Priority', sortable: true, filterable: true, customTemplate: true, width: '110px' },
        { field: 'status', header: 'Status', sortable: true, filterable: true, customTemplate: true, width: '130px' },
        { field: 'notes', header: 'Notes', sortable: false, filterable: true, showTooltip: true }
    ];

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    ngOnInit() {
        this.auth.invalidate();
        this.loadAll();
    }

    ngAfterViewInit() {
        this._customTemplates.set({
            status: this.statusTemplate,
            priority: this.priorityTemplate,
            duration: this.durationTemplate,
            visitType: this.typeTemplate
        });
    }

    // ── Data loading ──────────────────────────────────────────────────────────
    loadAll() {
        this._loading.set(true);
        forkJoin({
            appointments: this.appointmentsService.getAppointments().pipe(catchError(() => of([]))),
            doctors: this.doctorsService.getDoctorsPage({ pageSize: 200 }).pipe(catchError(() => of({ data: [] }))),
            patients: this.patientsService.getPatientsPage({ pageSize: 200 }).pipe(catchError(() => of({ data: [] })))
        }).subscribe(({ appointments, doctors, patients }) => {
            this._rows.set((appointments as Appointment[]).map((a) => ({ ...a, dayName: this.weekdayLabel(a.date) })));
            this.doctors = (doctors as any).data || [];
            this.patients = (patients as any).data || [];
            this._loading.set(false);
            this.cd.detectChanges();
        });
    }

    // ── Dropdown option builders ──────────────────────────────────────────────
    get doctorOptions() {
        return this.doctors.map((d) => ({ label: d.name, value: d.PK, email: d.email, department: d.department }));
    }
    get patientOptions() {
        return this.patients.map((p) => ({ label: p.name, value: p.PK }));
    }

    // ── Create ────────────────────────────────────────────────────────────────
    openCreate() {
        this.newAppt = this.emptyAppt();
        this.showCreateDialog = true;
    }

    onDoctorSelect(doctorPK: string | null) {
        if (!doctorPK) {
            this.newAppt.department = '';
            return;
        }
        const doctor = this.doctors.find((d) => d.PK === doctorPK);
        this.newAppt.department = doctor?.department || '';
    }

    onNewApptTimeChange() {
        if (this.newAppt.startTime && this.newAppt.endTime) {
            const diff = (this.newAppt.endTime.getTime() - this.newAppt.startTime.getTime()) / 60000;
            if (diff <= 0) {
                this.helpers.notifyError('Invalid Time', 'End time must be after start time.');
                this.newAppt.endTime = null;
                this.newAppt.duration = 0;
            } else {
                this.newAppt.duration = Math.round(diff);
            }
        }
    }

    onEditApptTimeChange() {
        if (this.editAppt.startTime && this.editAppt.endTime) {
            const diff = (this.editAppt.endTime.getTime() - this.editAppt.startTime.getTime()) / 60000;
            if (diff <= 0) {
                this.helpers.notifyError('Invalid Time', 'End time must be after start time.');
                this.editAppt.endTime = null;
                this.editAppt.duration = 0;
            } else {
                this.editAppt.duration = Math.round(diff);
            }
        }
    }

    onCreate() {
        if (!this.newAppt.doctorId || !this.newAppt.patientId || !this.newAppt.date || !this.newAppt.startTime) {
            this.helpers.notifyError('Required', 'Please fill doctor, patient, date and start time.');
            return;
        }

        // Fix 7: Validate start time < end time
        if (this.newAppt.startTime && this.newAppt.endTime) {
            const diff = (this.newAppt.endTime.getTime() - this.newAppt.startTime.getTime()) / 60000;
            if (diff <= 0) {
                this.helpers.notifyError('Invalid Time', 'End time must be after start time.');
                return;
            }
        }

        const doctor = this.doctors.find((d) => d.PK === this.newAppt.doctorId);
        const patient = this.patients.find((p) => p.PK === this.newAppt.patientId);
        const dateStr = this.formatDate(this.newAppt.date);

        // A patient may have multiple appointments on the same day, but not
        // at overlapping times (e.g. two clinics simultaneously).
        const startTimeStrCheck = this.formatTime(this.newAppt.startTime);
        const endTimeStrCheck = this.newAppt.endTime ? this.formatTime(this.newAppt.endTime) : startTimeStrCheck;
        const patientConflict = this.findPatientOverlap(
            this.newAppt.patientId,
            dateStr,
            startTimeStrCheck,
            endTimeStrCheck
        );
        if (patientConflict) {
            this.helpers.notifyError(
                'Time conflict',
                `${patient?.name || 'This patient'} already has an appointment at ${patientConflict.startTime}-${patientConflict.endTime} on ${dateStr}.`
            );
            return;
        }

        // #2 — date must be one of the doctor's duty days
        const dutyErr = this.dutyDayError(this.newAppt.doctorId, this.newAppt.date);
        if (dutyErr) {
            this.helpers.notifyError('Outside duty days', dutyErr);
            return;
        }

        // Doctor may have many appointments on the same date, but not at
        // overlapping times. Block if the new slot intersects an existing one.
        const docConflict = this.findDoctorOverlap(
            this.newAppt.doctorId,
            dateStr,
            this.formatTime(this.newAppt.startTime),
            this.newAppt.endTime ? this.formatTime(this.newAppt.endTime) : this.formatTime(this.newAppt.startTime)
        );
        if (docConflict) {
            this.helpers.notifyError(
                'Time conflict',
                `${doctor?.name || 'This doctor'} already has an appointment at ${docConflict.startTime}-${docConflict.endTime} on ${dateStr}.`
            );
            return;
        }

        this.saving = true;
        const startTimeStr = this.formatTime(this.newAppt.startTime);
        const endTimeStr = this.newAppt.endTime ? this.formatTime(this.newAppt.endTime) : startTimeStr;

        // Ensure duration is up to date
        if (this.newAppt.startTime && this.newAppt.endTime) {
            const diff = (this.newAppt.endTime.getTime() - this.newAppt.startTime.getTime()) / 60000;
            if (diff > 0) this.newAppt.duration = Math.round(diff);
        }

        const data: CreateAppointmentRequest = {
            doctorId: this.newAppt.doctorId,
            doctorName: doctor?.name || '',
            doctorEmail: doctor?.email || '',
            department: this.newAppt.department || doctor?.department || '',
            patientId: this.newAppt.patientId,
            patientName: patient?.name || '',
            date: dateStr,
            startTime: startTimeStr,
            endTime: endTimeStr,
            duration: this.newAppt.duration,
            visitType: this.newAppt.visitType,
            priority: this.newAppt.priority,
            status: this.newAppt.status,
            notes: this.newAppt.notes || null,
            chiefComplaint: this.newAppt.chiefComplaint || null
        };

        this.appointmentsService.createAppointment(data).subscribe({
            next: (appt) => {
                this._rows.set([{ ...appt, dayName: this.weekdayLabel(appt.date) }, ...this._rows()]);
                this.showCreateDialog = false;
                this.saving = false;
                this.helpers.notifySuccess(`Appointment booked: ${patient?.name} with ${doctor?.name}`);
                this.cd.detectChanges();
            },
            error: (e) => {
                this.saving = false;
                this.helpers.notifyError('Error', e?.error?.message || 'Failed to create appointment.');
            }
        });
    }

    // ── Edit ──────────────────────────────────────────────────────────────────
    openEdit(appt: Appointment) {
        this.selectedAppointment = appt;
        this.editAppt = {
            doctorId: appt.doctorId,
            patientId: appt.patientId,
            department: appt.department,
            date: new Date(appt.date),
            startTime: this.parseTime(appt.startTime),
            endTime: this.parseTime(appt.endTime),
            duration: appt.duration,
            visitType: appt.visitType,
            priority: appt.priority,
            status: appt.status,
            notes: appt.notes || '',
            chiefComplaint: appt.chiefComplaint || '',
            cancelReason: appt.cancelReason || ''
        };
        this.showDetailDialog = false;
        this.showEditDialog = true;
    }

    onUpdate() {
        if (!this.selectedAppointment) return;

        // Defensive guard: the edit icon is hidden for these, but block here too
        // in case the dialog was opened before the row changed state.
        if (!this.canEdit(this.selectedAppointment)) {
            this.helpers.notifyError('Cannot edit', 'A cancelled or past appointment can no longer be edited.');
            return;
        }

        // #2 — date must be one of the doctor's duty days
        const dutyErr = this.dutyDayError(this.editAppt.doctorId, this.editAppt.date);
        if (dutyErr) {
            this.helpers.notifyError('Outside duty days', dutyErr);
            return;
        }

        const doctor = this.doctors.find((d) => d.PK === this.editAppt.doctorId);
        const patient = this.patients.find((p) => p.PK === this.editAppt.patientId);
        const dateStr = this.formatDate(this.editAppt.date);
        const startTimeStr = this.formatTime(this.editAppt.startTime);
        const endTimeStr = this.editAppt.endTime ? this.formatTime(this.editAppt.endTime) : startTimeStr;

        // Same-time overlap check (allow many appointments per day, block overlap).
        const docConflict = this.findDoctorOverlap(
            this.editAppt.doctorId,
            dateStr,
            startTimeStr,
            endTimeStr,
            this.selectedAppointment.appointmentId
        );
        if (docConflict) {
            this.helpers.notifyError(
                'Time conflict',
                `${doctor?.name || 'This doctor'} already has an appointment at ${docConflict.startTime}-${docConflict.endTime} on ${dateStr}.`
            );
            return;
        }
        const patientConflict = this.findPatientOverlap(
            this.editAppt.patientId,
            dateStr,
            startTimeStr,
            endTimeStr,
            this.selectedAppointment.appointmentId
        );
        if (patientConflict) {
            this.helpers.notifyError(
                'Time conflict',
                `${patient?.name || 'This patient'} already has an appointment at ${patientConflict.startTime}-${patientConflict.endTime} on ${dateStr}.`
            );
            return;
        }

        this.saving = true;

        if (this.editAppt.startTime && this.editAppt.endTime) {
            const diff = (this.editAppt.endTime.getTime() - this.editAppt.startTime.getTime()) / 60000;
            if (diff > 0) this.editAppt.duration = diff;
        }

        this.appointmentsService
            .updateAppointment(this.selectedAppointment.appointmentId, {
                doctorId: this.editAppt.doctorId,
                doctorName: doctor?.name || '',
                doctorEmail: doctor?.email || '',
                department: this.editAppt.department,
                // patientId and patientName removed — not updatable
                date: dateStr,
                startTime: startTimeStr,
                endTime: endTimeStr,
                duration: this.editAppt.duration,
                visitType: this.editAppt.visitType,
                priority: this.editAppt.priority,
                status: this.editAppt.status,
                notes: this.editAppt.notes || null,
                chiefComplaint: this.editAppt.chiefComplaint || null,
                cancelReason: this.editAppt.status === 'cancelled' ? this.editAppt.cancelReason : null
            })
            .subscribe({
                next: (updated) => {
                    const rows = [...this._rows()];
                    const idx = rows.findIndex((a) => a.appointmentId === updated.appointmentId);
                    if (idx !== -1) rows[idx] = { ...updated, dayName: this.weekdayLabel(updated.date) };
                    this._rows.set(rows);
                    this.showEditDialog = false;
                    this.saving = false;
                    this.helpers.notifySuccess('Appointment updated.');
                    this.cd.detectChanges();
                },
                error: (e) => {
                    this.saving = false;
                    this.helpers.notifyError('Error', e?.error?.message || 'Failed to update.');
                }
            });
    }

    // ── View ──────────────────────────────────────────────────────────────────
    openDetail(appt: Appointment) {
        this.selectedAppointment = appt;
        this.showDetailDialog = true;
    }

    // ── Cancel (replaces delete) ───────────────────────────────────────────────
    openCancel(appt: Appointment) {
        this.appointmentToCancel = appt;
        this.cancelReason = '';
        this.showDetailDialog = false;
        this.showCancelDialog = true;
    }

    confirmCancel() {
        const appt = this.appointmentToCancel;
        if (!appt) return;
        const reason = (this.cancelReason || '').trim();
        if (!reason) {
            this.helpers.notifyError('Reason required', 'Please enter a reason for cancellation.');
            return;
        }
        this.saving = true;
        // Backend sets status=cancelled, cancelledAt and cancelledBy from the JWT.
        this.appointmentsService.cancel(appt.appointmentId, reason).subscribe({
            next: (updated) => {
                this.updateRow(updated);
                this.showCancelDialog = false;
                this.saving = false;
                this.helpers.notifySuccess('Appointment cancelled.');
            },
            error: (e) => {
                this.saving = false;
                this.helpers.notifyApiError('Error', e, 'Failed to cancel appointment.');
            }
        });
    }

    // ── Quick status updates ──────────────────────────────────────────────────
    checkIn(appt: Appointment) {
        this.appointmentsService.checkIn(appt.appointmentId).subscribe({
            next: (updated) => {
                this.updateRow(updated);
                this.helpers.notifySuccess(`${appt.patientName || 'Patient'} has been checked in successfully.`);
            },
            error: () => this.helpers.notifyError('Error', 'Failed to check in.')
        });
    }

    startConsultation(appt: Appointment) {
        this.appointmentsService.startConsultation(appt.appointmentId).subscribe({
            next: (updated) => {
                this.updateRow(updated);
                this.helpers.notifySuccess(`Consultation started for ${appt.patientName}.`);
            },
            error: () => this.helpers.notifyError('Error', 'Failed to start consultation.')
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    getStatusSeverity(status: string) {
        return STATUS_SEVERITY[status] || 'secondary';
    }

    /**
     * An appointment can be edited only while it is not cancelled and its date
     * has not passed. Used to hide the edit (pencil) action; the backend also
     * enforces this (security boundary — never trust the client).
     */
    canEdit(appt: Appointment): boolean {
        if (!appt) return false;
        if (appt.status === 'cancelled') return false;
        return !this.isPastDate(appt.date);
    }

    /** True when the appointment's date (YYYY-MM-DD) is before today. */
    private isPastDate(dateStr: string): boolean {
        if (!dateStr) return false;
        return dateStr < this.formatDate(new Date());
    }
    getPrioritySeverity(priority: string) {
        return PRIORITY_SEVERITY[priority] || 'secondary';
    }

    getVisitTypeSeverity(visitType: string) {
        return VISIT_TYPE_SEVERITY[visitType] || 'secondary';
    }

    /** Full weekday name from a YYYY-MM-DD date string (e.g. "Friday"). */
    private weekdayLabel(dateStr: string): string {
        if (!dateStr) return '';
        const d = new Date(`${dateStr}T00:00:00`);
        return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { weekday: 'long' });
    }

    private weekdayName(date: Date): string {
        return date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    }

    /**
     * Normalises a weekday token to its 3-letter lowercase prefix so stored
     * abbreviations ("Fri", "Mon") and full names ("Friday") compare equal.
     * mon/tue/wed/thu/fri/sat/sun are all unique in their first 3 letters.
     */
    private normDay(d: string): string {
        return String(d).toLowerCase().slice(0, 3);
    }

    /**
     * Patient may have multiple appointments per day; only block when slot overlaps.
     * Returns the conflicting appointment or null.
     */
    private findPatientOverlap(
        patientId: string | null,
        date: string,
        startTime: string,
        endTime: string,
        ignoreApptId?: string
    ): Appointment | null {
        if (!patientId || !date || !startTime) return null;
        const toMin = (t: string) => {
            const [h, m] = (t || '').split(':').map(Number);
            return isNaN(h) || isNaN(m) ? NaN : h * 60 + m;
        };
        const s = toMin(startTime);
        const e = toMin(endTime || startTime);
        if (isNaN(s)) return null;
        for (const a of this._rows()) {
            if (ignoreApptId && a.appointmentId === ignoreApptId) continue;
            if (a.patientId !== patientId) continue;
            if (a.date !== date) continue;
            if (a.status === 'cancelled') continue;
            const is = toMin(a.startTime);
            const ie = toMin(a.endTime || a.startTime);
            if (isNaN(is)) continue;
            if (s < ie && e > is) return a;
        }
        return null;
    }

    /**
     * Doctor may have multiple appointments per day; only block when slot overlaps.
     * Returns the conflicting appointment or null. Pass `ignoreApptId` when editing
     * so the appointment doesn't conflict with itself.
     */
    private findDoctorOverlap(
        doctorId: string | null,
        date: string,
        startTime: string,
        endTime: string,
        ignoreApptId?: string
    ): Appointment | null {
        if (!doctorId || !date || !startTime) return null;
        const toMin = (t: string) => {
            const [h, m] = (t || '').split(':').map(Number);
            return isNaN(h) || isNaN(m) ? NaN : h * 60 + m;
        };
        const s = toMin(startTime);
        const e = toMin(endTime || startTime);
        if (isNaN(s)) return null;
        for (const a of this._rows()) {
            if (ignoreApptId && a.appointmentId === ignoreApptId) continue;
            if (a.doctorId !== doctorId) continue;
            if (a.date !== date) continue;
            if (a.status === 'cancelled') continue;
            const is = toMin(a.startTime);
            const ie = toMin(a.endTime || a.startTime);
            if (isNaN(is)) continue;
            if (s < ie && e > is) return a;
        }
        return null;
    }

    /** Returns an error message if the date is not one of the doctor's duty days, else null. */
    private dutyDayError(doctorPK: string | null, date: Date | null): string | null {
        if (!doctorPK || !date) return null;
        const doctor = this.doctors.find((d) => d.PK === doctorPK);
        const rawDays = doctor?.dutyDays || [];
        if (!rawDays.length) return null; // no duty days configured → no restriction
        const days = rawDays.map((d) => this.normDay(d));
        const wd = this.weekdayName(date);
        if (!days.includes(this.normDay(wd))) {
            const pretty = rawDays.join(', ');
            const wdCap = wd.charAt(0).toUpperCase() + wd.slice(1);
            return `${doctor?.name || 'This doctor'} is on duty on: ${pretty}. ${wdCap} is not a duty day.`;
        }
        return null;
    }

    private updateRow(updated: Appointment) {
        const rows = [...this._rows()];
        const idx = rows.findIndex((a) => a.appointmentId === updated.appointmentId);
        if (idx !== -1) rows[idx] = { ...updated, dayName: this.weekdayLabel(updated.date) };
        this._rows.set(rows);
        this.showDetailDialog = false;
        this.cd.detectChanges();
    }

    private emptyAppt() {
        return {
            doctorId: null as string | null,
            patientId: null as string | null,
            department: '',
            date: null as Date | null,
            startTime: null as Date | null,
            endTime: null as Date | null,
            duration: 30,
            visitType: 'scheduled',
            priority: 'routine',
            status: 'scheduled',
            notes: '',
            chiefComplaint: ''
        };
    }

    private parseTime(timeStr: string): Date {
        const d = new Date();
        const [h, m] = (timeStr || '00:00').split(':');
        d.setHours(+h, +m, 0, 0);
        return d;
    }

    private formatDate(date: Date): string {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    private formatTime(date: Date): string {
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
}

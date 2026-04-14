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
import type { TableColumn, TableConfig } from '@/interfaces/tableplugin.interfaces';
import { AppointmentsService, Appointment, CreateAppointmentRequest } from '@/services/appointments.service';
import { DoctorsService, Doctor } from '@/services/doctors.service';
import { PatientsService, Patient } from '@/services/patients.service';
import { HospitalCalendarService } from '@/services/hospital-calendar.service';
import { HelpersService } from '@/services/helpers-service';
import { AuthService } from '@/services/auth.service';

/** Tag severity map for appointment statuses */
const STATUS_SEVERITY: Record<string, 'success' | 'warn' | 'danger' | 'secondary'> = {
    scheduled: 'warn',
    completed: 'success',
    cancelled: 'danger'
};

@Component({
    selector: 'app-appointments',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, TextareaModule, SelectModule, DatePickerModule, TagModule, ToastModule, ConfirmDialogModule, TooltipModule, GenericTableComponent],
    providers: [MessageService, ConfirmationService, HelpersService],
    templateUrl: './appointments.html',
    styleUrl: './appointments.scss'
})
export class AppointmentsComponent implements OnInit, AfterViewInit {
    @ViewChild(GenericTableComponent) tableCmp?: GenericTableComponent;
    @ViewChild('statusTemplate') statusTemplate!: TemplateRef<any>;

    // ── Services ────────────────────────────────────────────────────────────
    private appointmentsService = inject(AppointmentsService);
    private doctorsService = inject(DoctorsService);
    private patientsService = inject(PatientsService);
    private calendarService = inject(HospitalCalendarService);
    private helpers = inject(HelpersService);
    private confirmationService = inject(ConfirmationService);
    private cd = inject(ChangeDetectorRef);
    auth = inject(AuthService); // public — used in template

    // ── State signals ────────────────────────────────────────────────────────
    private _rows = signal<Appointment[]>([]);
    private _loading = signal<boolean>(false);
    private _customTemplates = signal<{ [k: string]: TemplateRef<any> }>({});

    rows = this._rows.asReadonly();
    loading = this._loading.asReadonly();
    customTemplates = this._customTemplates;

    // ── Reference data ───────────────────────────────────────────────────────
    doctors: Doctor[] = [];
    patients: Patient[] = [];
    calendars: any[] = [];

    // ── Dialog state ─────────────────────────────────────────────────────────
    saving = false;
    showCreateDialog = false;
    showEditDialog = false;
    showDetailDialog = false;
    selectedAppointment: Appointment | null = null;
    newAppt: any = this.emptyAppt();
    editAppt: any = {};

    // ── Dropdown options ─────────────────────────────────────────────────────
    typeOptions = [
        { label: 'Consultation', value: 'consultation' },
        { label: 'Follow-up', value: 'follow-up' },
        { label: 'Emergency', value: 'emergency' },
        { label: 'Check-up', value: 'check-up' }
    ];

    statusOptions = [
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' }
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
        { field: 'startTime', header: 'Time', sortable: false, filterable: false, width: '90px' },
        { field: 'patientName', header: 'Patient', sortable: true, filterable: true, pipe: 'titlecase' },
        { field: 'doctorName', header: 'Doctor', sortable: true, filterable: true, pipe: 'titlecase' },
        { field: 'type', header: 'Type', sortable: true, filterable: true, pipe: 'titlecase', width: '120px' },
        { field: 'duration', header: 'Duration', sortable: false, filterable: false, width: '90px' },
        { field: 'status', header: 'Status', sortable: true, filterable: true, customTemplate: true, width: '120px' },
        { field: 'notes', header: 'Notes', sortable: false, filterable: true, showTooltip: true }
    ];

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    ngOnInit() {
        // Invalidate cached user so role is re-read from latest token
        this.auth.invalidate();
        this.loadAll();
    }

    ngAfterViewInit() {
        this._customTemplates.set({ status: this.statusTemplate });
    }

    // ── Data loading ──────────────────────────────────────────────────────────

    /** Load appointments + reference data (doctors, patients, calendars) in parallel */
    loadAll() {
        this._loading.set(true);

        // Doctors only see their own appointments via doctorEmail filter
        const doctorEmail = this.auth.isDoctor ? this.auth.current.email : undefined;

        forkJoin({
            appointments: this.appointmentsService.getAppointments(doctorEmail).pipe(catchError(() => of([]))),
            doctors: this.doctorsService.getDoctorsPage({ pageSize: 200 }).pipe(catchError(() => of({ data: [] }))),
            patients: this.patientsService.getPatientsPage({ pageSize: 200 }).pipe(catchError(() => of({ data: [] }))),
            calendars: this.calendarService.getCalendars().pipe(catchError(() => of([])))
        }).subscribe(({ appointments, doctors, patients, calendars }) => {
            this._rows.set(appointments);
            this.doctors = (doctors as any).data || [];
            this.patients = (patients as any).data || [];
            this.calendars = calendars;
            this._loading.set(false);
            this.cd.detectChanges();
        });
    }

    // ── Dropdown option builders ───────────────────────────────────────────────
    get doctorOptions() {
        return this.doctors.map((d) => ({ label: d.name, value: d.PK }));
    }
    get patientOptions() {
        return this.patients.map((p) => ({ label: p.name, value: p.PK }));
    }

    // ── Create ────────────────────────────────────────────────────────────────
    openCreate() {
        this.newAppt = this.emptyAppt();
        this.showCreateDialog = true;
    }

    onCreate() {
        if (!this.newAppt.doctorId || !this.newAppt.patientId || !this.newAppt.date || !this.newAppt.startTime) {
            this.helpers.notifyError('Required', 'Please fill doctor, patient, date and start time.');
            return;
        }

        this.saving = true;
        const doctor = this.doctors.find((d) => d.PK === this.newAppt.doctorId);
        const patient = this.patients.find((p) => p.PK === this.newAppt.patientId);
        const dateStr = this.formatDate(this.newAppt.date);
        const startTimeStr = this.formatTime(this.newAppt.startTime);
        const endTimeStr = this.newAppt.endTime ? this.formatTime(this.newAppt.endTime) : startTimeStr;

        // Auto-calculate duration from start/end time if both provided
        if (this.newAppt.startTime && this.newAppt.endTime) {
            const diff = (this.newAppt.endTime.getTime() - this.newAppt.startTime.getTime()) / 60000;
            if (diff > 0) this.newAppt.duration = diff;
        }

        // Try to find matching calendar for this doctor
        const cal = this.calendars.find((c) => c.name === doctor?.name);

        const createAppt = (calendarEventId: string | null, calendarId: string | null) => {
            const data: CreateAppointmentRequest = {
                doctorId: this.newAppt.doctorId,
                doctorName: doctor?.name || '',
                doctorEmail: doctor?.email || null,
                patientId: this.newAppt.patientId,
                patientName: patient?.name || '',
                date: dateStr,
                startTime: startTimeStr,
                endTime: endTimeStr,
                duration: this.newAppt.duration,
                type: this.newAppt.type,
                status: this.newAppt.status,
                notes: this.newAppt.notes,
                calendarEventId,
                calendarId
            };

            this.appointmentsService.createAppointment(data).subscribe({
                next: (appt) => {
                    this._rows.set([appt, ...this._rows()]);
                    this.showCreateDialog = false;
                    this.saving = false;
                    this.helpers.notifySuccess(`Appointment booked: ${patient?.name} with ${doctor?.name}`);
                    this.cd.detectChanges();
                },
                error: () => {
                    this.saving = false;
                    this.helpers.notifyError('Error', 'Failed to create appointment.');
                }
            });
        };

        // Create calendar event first if doctor has a calendar
        if (cal) {
            this.calendarService
                .createEvent(cal.calendarId, {
                    name: `${patient?.name} - ${this.newAppt.type}`,
                    description: `Appointment | ${this.newAppt.notes}`,
                    startDate: `${dateStr}T${startTimeStr}:00`,
                    endDate: `${dateStr}T${endTimeStr}:00`,
                    color: '#6366F1'
                })
                .subscribe({
                    next: (ev: any) => createAppt(ev.eventId, cal.calendarId),
                    error: () => createAppt(null, null)
                });
        } else {
            createAppt(null, null);
        }
    }

    // ── Edit ──────────────────────────────────────────────────────────────────
    openEdit(appt: Appointment) {
        this.selectedAppointment = appt;
        this.editAppt = {
            doctorId: appt.doctorId,
            patientId: appt.patientId,
            date: new Date(appt.date),
            startTime: this.parseTime(appt.startTime),
            endTime: this.parseTime(appt.endTime),
            duration: appt.duration,
            type: appt.type,
            status: appt.status,
            notes: appt.notes
        };
        this.showDetailDialog = false;
        this.showEditDialog = true;
    }

    onUpdate() {
        if (!this.selectedAppointment) return;
        this.saving = true;

        const doctor = this.doctors.find((d) => d.PK === this.editAppt.doctorId);
        const patient = this.patients.find((p) => p.PK === this.editAppt.patientId);
        const dateStr = this.formatDate(this.editAppt.date);
        const startTimeStr = this.formatTime(this.editAppt.startTime);
        const endTimeStr = this.editAppt.endTime ? this.formatTime(this.editAppt.endTime) : startTimeStr;

        // Auto-calculate duration from start/end time if both provided
        if (this.editAppt.startTime && this.editAppt.endTime) {
            const diff = (this.editAppt.endTime.getTime() - this.editAppt.startTime.getTime()) / 60000;
            if (diff > 0) this.editAppt.duration = diff;
        }

        this.appointmentsService
            .updateAppointment(this.selectedAppointment.appointmentId, {
                doctorId: this.editAppt.doctorId,
                doctorName: doctor?.name || '',
                doctorEmail: doctor?.email || null,
                patientId: this.editAppt.patientId,
                patientName: patient?.name || '',
                date: dateStr,
                startTime: startTimeStr,
                endTime: endTimeStr,
                duration: this.editAppt.duration,
                type: this.editAppt.type,
                status: this.editAppt.status,
                notes: this.editAppt.notes
            })
            .subscribe({
                next: (updated) => {
                    // Update row in-place without full reload
                    const rows = [...this._rows()];
                    const idx = rows.findIndex((a) => a.appointmentId === updated.appointmentId);
                    if (idx !== -1) rows[idx] = updated;
                    this._rows.set(rows);
                    this.showEditDialog = false;
                    this.saving = false;
                    this.helpers.notifySuccess('Appointment updated.');
                    this.cd.detectChanges();
                },
                error: () => {
                    this.saving = false;
                    this.helpers.notifyError('Error', 'Failed to update.');
                }
            });
    }

    // ── View ──────────────────────────────────────────────────────────────────
    openDetail(appt: Appointment) {
        this.selectedAppointment = appt;
        this.showDetailDialog = true;
    }

    // ── Delete ────────────────────────────────────────────────────────────────
    onDelete(appt: Appointment) {
        this.confirmationService.confirm({
            message: `Delete appointment for ${appt.patientName}?`,
            header: 'Confirm Delete',
            icon: 'pi pi-trash',
            rejectButtonProps: { label: 'No', severity: 'secondary', variant: 'text' },
            acceptButtonProps: { label: 'Yes', severity: 'danger' },
            accept: () => {
                this.appointmentsService.deleteAppointment(appt.appointmentId).subscribe({
                    next: () => {
                        this._rows.set(this._rows().filter((a) => a.appointmentId !== appt.appointmentId));
                        this.showDetailDialog = false;
                        this.helpers.notifySuccess('Appointment deleted.');
                        this.cd.detectChanges();
                    },
                    error: () => this.helpers.notifyError('Error', 'Failed to delete appointment.')
                });
            }
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    getStatusSeverity(status: string) {
        return STATUS_SEVERITY[status] || 'secondary';
    }

    private emptyAppt() {
        return {
            doctorId: null as string | null,
            patientId: null as string | null,
            date: null as Date | null,
            startTime: null as Date | null,
            endTime: null as Date | null,
            duration: 30,
            type: 'consultation',
            status: 'scheduled',
            notes: ''
        };
    }

    private parseTime(timeStr: string): Date {
        const d = new Date();
        const [h, m] = timeStr.split(':');
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

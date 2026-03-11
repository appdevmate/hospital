import { Component, OnInit, AfterViewInit, ChangeDetectorRef, TemplateRef, ViewChild, signal, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, finalize } from 'rxjs';
import { catchError, of } from 'rxjs';

import { GenericTableComponent } from '@/pages/uikit/generic-table';
import type { TableColumn, TableConfig } from '@/interfaces/tableplugin.interfaces';
import { AppointmentsService, Appointment, CreateAppointmentRequest } from '@/services/appointments.service';
import { DoctorsService, Doctor } from '@/pages/service/doctors.service';
import { PatientsService, Patient } from '@/pages/service/patients.service';
import { HospitalCalendarService } from '@/services/hospital-calendar.service';
import { HelpersService } from '@/services/helpers-service';
import { AuthService } from '@/services/auth.service';

const STATUS_SEVERITY: Record<string, 'success' | 'warn' | 'danger' | 'secondary'> = {
    scheduled: 'warn',
    completed: 'success',
    cancelled: 'danger'
};

@Component({
    selector: 'app-appointments',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, ButtonModule, DialogModule, InputTextModule, TextareaModule, SelectModule, DatePickerModule, TagModule, ToastModule, ConfirmDialogModule, TooltipModule, GenericTableComponent],
    providers: [MessageService, ConfirmationService, HelpersService],
    templateUrl: './appointments.html',
    styleUrl: './appointments.scss'
})
export class AppointmentsComponent implements OnInit, AfterViewInit {
    @ViewChild(GenericTableComponent) tableCmp?: GenericTableComponent;
    @ViewChild('statusTemplate') statusTemplate!: TemplateRef<any>;
    private auth = inject(AuthService);
    currentUser = this.auth.current;

    private destroyRef = inject(DestroyRef);

    // signals
    private _rows = signal<Appointment[]>([]);
    private _loading = signal<boolean>(false);
    private _selected = signal<Appointment[]>([]);
    rows = this._rows.asReadonly();
    loading = this._loading.asReadonly();
    selected = this._selected;

    private _customTemplates = signal<{ [k: string]: TemplateRef<any> }>({});
    customTemplates = this._customTemplates;

    doctors: Doctor[] = [];
    patients: Patient[] = [];
    calendars: any[] = [];
    saving = false;

    showCreateDialog = false;
    showEditDialog = false;
    showDetailDialog = false;
    selectedAppointment: Appointment | null = null;

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

    newAppt: any = this.emptyAppt();
    editAppt: any = {};

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
        { field: 'date', header: 'Date', sortable: true, filterable: true, type: 'date', pipe: 'date', dateFormat: 'MMM d, y', width: '200px' },
        { field: 'startTime', header: 'Time', sortable: false, filterable: false, width: '200px' },
        { field: 'patientName', header: 'Patient', sortable: true, filterable: true, pipe: 'titlecase', width: '200px' },
        { field: 'doctorName', header: 'Doctor', sortable: true, filterable: true, pipe: 'titlecase', width: '200px' },
        { field: 'type', header: 'Type', sortable: true, filterable: true, pipe: 'titlecase', width: '200px' },
        { field: 'duration', header: 'Duration', sortable: false, filterable: false, width: '200px' },
        { field: 'status', header: 'Status', sortable: true, filterable: true, customTemplate: true, width: '200px' },
        { field: 'notes', header: 'Notes', sortable: false, filterable: true, showTooltip: true }
    ];

    constructor(
        private appointmentsService: AppointmentsService,
        private doctorsService: DoctorsService,
        private patientsService: PatientsService,
        private calendarService: HospitalCalendarService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private helpers: HelpersService,
        private cd: ChangeDetectorRef
    ) {}

    ngOnInit() {
        this.loadAll();
    }

    ngAfterViewInit() {
        this._customTemplates.set({ status: this.statusTemplate });
    }

    emptyAppt() {
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

    loadAll() {
        this._loading.set(true);
        const doctorEmail = this.auth.isDoctor ? this.currentUser.email : undefined;
        forkJoin({
            appointments: this.appointmentsService.getAppointments(doctorEmail).pipe(catchError(() => of([]))),
            doctors: this.doctorsService.getDoctorsPage({ pageSize: 100 }).pipe(catchError(() => of({ data: [] }))),
            patients: this.patientsService.getPatientsPage({ pageSize: 100 }).pipe(catchError(() => of({ data: [] }))),
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

    get doctorOptions() {
        return this.doctors.map((d) => ({ label: d.name, value: d.PK }));
    }

    get patientOptions() {
        return this.patients.map((p) => ({ label: p.name, value: p.PK }));
    }

    openCreate() {
        this.newAppt = this.emptyAppt();
        this.showCreateDialog = true;
    }

    onCreate() {
        if (!this.newAppt.doctorId || !this.newAppt.patientId || !this.newAppt.date || !this.newAppt.startTime) {
            this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Please fill doctor, patient, date and start time.' });
            return;
        }
        this.saving = true;

        const doctor = this.doctors.find((d) => d.PK === this.newAppt.doctorId);
        const patient = this.patients.find((p) => p.PK === this.newAppt.patientId);
        const dateStr = this.formatDate(this.newAppt.date);
        const startTimeStr = this.formatTime(this.newAppt.startTime);
        const endTimeStr = this.newAppt.endTime ? this.formatTime(this.newAppt.endTime) : startTimeStr;

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

    openEdit(appt: Appointment) {
        this.selectedAppointment = appt;
        const parseTime = (timeStr: string): Date => {
            const d = new Date();
            const [h, m] = timeStr.split(':');
            d.setHours(+h, +m, 0, 0);
            return d;
        };
        this.editAppt = {
            doctorId: appt.doctorId,
            patientId: appt.patientId,
            date: new Date(appt.date),
            startTime: parseTime(appt.startTime),
            endTime: parseTime(appt.endTime),
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

        this.appointmentsService
            .updateAppointment(this.selectedAppointment.appointmentId, {
                doctorId: this.editAppt.doctorId,
                doctorName: doctor?.name || '',
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

    openDetail(appt: Appointment) {
        this.selectedAppointment = appt;
        this.showDetailDialog = true;
    }

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
                    }
                });
            }
        });
    }

    getStatusSeverity(status: string) {
        return STATUS_SEVERITY[status] || 'secondary';
    }

    private formatDate(date: Date): string {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    private formatTime(date: Date): string {
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
}

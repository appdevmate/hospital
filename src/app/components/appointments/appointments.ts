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
    selectedAppointment: Appointment | null = null;
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
        { field: 'startTime', header: 'Start', sortable: false, filterable: false, width: '80px' },
        { field: 'endTime', header: 'End', sortable: false, filterable: false, width: '80px' },
        { field: 'duration', header: 'Duration', sortable: true, filterable: false, customTemplate: true, width: '100px' },
        { field: 'patientName', header: 'Patient', sortable: true, filterable: true, pipe: 'titlecase' },
        { field: 'doctorName', header: 'Doctor', sortable: true, filterable: true, pipe: 'titlecase' },
        { field: 'department', header: 'Department', sortable: true, filterable: true, pipe: 'titlecase' },
        { field: 'chiefComplaint', header: 'Chief Complaint', sortable: false, filterable: true, showTooltip: true },
        { field: 'visitType', header: 'Type', sortable: true, filterable: true, pipe: 'titlecase', width: '120px' },
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
            duration: this.durationTemplate
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
            this._rows.set(appointments);
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

        // Fix 6: Check for duplicate patient on same date
        const duplicate = this._rows().find((a) => a.patientId === this.newAppt.patientId && a.date === dateStr);
        if (duplicate) {
            this.helpers.notifyError(
                'Duplicate Appointment',
                `${patient?.name || 'This patient'} already has an appointment on ${dateStr}. Please choose a different date or review existing appointments.`
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
                this._rows.set([appt, ...this._rows()]);
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
        this.saving = true;

        const doctor = this.doctors.find((d) => d.PK === this.editAppt.doctorId);
        const patient = this.patients.find((p) => p.PK === this.editAppt.patientId);
        const dateStr = this.formatDate(this.editAppt.date);
        const startTimeStr = this.formatTime(this.editAppt.startTime);
        const endTimeStr = this.editAppt.endTime ? this.formatTime(this.editAppt.endTime) : startTimeStr;

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
                    if (idx !== -1) rows[idx] = updated;
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
    getPrioritySeverity(priority: string) {
        return PRIORITY_SEVERITY[priority] || 'secondary';
    }

    private updateRow(updated: Appointment) {
        const rows = [...this._rows()];
        const idx = rows.findIndex((a) => a.appointmentId === updated.appointmentId);
        if (idx !== -1) rows[idx] = updated;
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

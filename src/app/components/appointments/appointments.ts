import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AppointmentsService, Appointment, CreateAppointmentRequest } from '../../services/appointments.service';
import { DoctorsService, Doctor } from '../../pages/service/doctors.service';
import { PatientsService, Patient } from '../../pages/service/patients.service';
import { HospitalCalendarService } from '../../services/hospital-calendar.service';
import { forkJoin } from 'rxjs';
import { catchError, of } from 'rxjs';

@Component({
    selector: 'app-appointments',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, ButtonModule, DialogModule, InputTextModule, TextareaModule, SelectModule, DatePickerModule, TableModule, TagModule, ToastModule, ConfirmDialogModule],
    providers: [MessageService, ConfirmationService],
    templateUrl: './appointments.html',
    styleUrl: './appointments.scss'
})
export class AppointmentsComponent implements OnInit {
    appointments: Appointment[] = [];
    doctors: Doctor[] = [];
    patients: Patient[] = [];
    calendars: any[] = [];
    loading = false;
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

    constructor(
        private appointmentsService: AppointmentsService,
        private doctorsService: DoctorsService,
        private patientsService: PatientsService,
        private calendarService: HospitalCalendarService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private cd: ChangeDetectorRef
    ) {}

    ngOnInit() {
        this.loadAll();
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
        this.loading = true;
        forkJoin({
            appointments: this.appointmentsService.getAppointments().pipe(catchError(() => of([]))),
            doctors: this.doctorsService.getDoctorsPage({ pageSize: 100 }).pipe(catchError(() => of({ data: [] }))),
            patients: this.patientsService.getPatientsPage({ pageSize: 100 }).pipe(catchError(() => of({ data: [] }))),
            calendars: this.calendarService.getCalendars().pipe(catchError(() => of([])))
        }).subscribe(({ appointments, doctors, patients, calendars }) => {
            this.appointments = appointments;
            this.doctors = (doctors as any).data || [];
            this.patients = (patients as any).data || [];
            this.calendars = calendars;
            this.loading = false;
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

        // Find doctor's calendar
        const calendarName = doctor?.name || '';
        const cal = this.calendars.find((c) => c.name === calendarName);

        const createAppt = (calendarEventId: string | null, calendarId: string | null) => {
            const data: CreateAppointmentRequest = {
                doctorId: this.newAppt.doctorId,
                doctorName: doctor?.name || '',
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
                    this.appointments = [appt, ...this.appointments];
                    this.showCreateDialog = false;
                    this.saving = false;
                    this.messageService.add({ severity: 'success', summary: 'Appointment booked', detail: `${patient?.name} with ${doctor?.name}` });
                    this.cd.detectChanges();
                },
                error: () => {
                    this.saving = false;
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to create appointment.' });
                }
            });
        };

        // Create calendar event if doctor has a calendar
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
                    const idx = this.appointments.findIndex((a) => a.appointmentId === updated.appointmentId);
                    if (idx !== -1) this.appointments[idx] = updated;
                    this.appointments = [...this.appointments];
                    this.showEditDialog = false;
                    this.saving = false;
                    this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Appointment updated.' });
                    this.cd.detectChanges();
                },
                error: () => {
                    this.saving = false;
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update.' });
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
            accept: () => {
                this.appointmentsService.deleteAppointment(appt.appointmentId).subscribe({
                    next: () => {
                        this.appointments = this.appointments.filter((a) => a.appointmentId !== appt.appointmentId);
                        this.showDetailDialog = false;
                        this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Appointment deleted.' });
                        this.cd.detectChanges();
                    }
                });
            }
        });
    }

    getStatusSeverity(status: string): 'success' | 'warn' | 'danger' | 'secondary' {
        switch (status) {
            case 'scheduled':
                return 'warn';
            case 'completed':
                return 'success';
            case 'cancelled':
                return 'danger';
            default:
                return 'secondary';
        }
    }

    private formatDate(date: Date): string {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    private formatTime(date: Date): string {
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
}

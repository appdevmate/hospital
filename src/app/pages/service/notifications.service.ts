import { Injectable, inject } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AppointmentsService, Appointment } from '@/pages/service/appointments.service';
import { PatientsService, Patient } from '@/pages/service/patients.service';

export interface Notification {
    id: string;
    type: 'today' | 'upcoming' | 'critical';
    title: string;
    message: string;
    icon: string;
    severity: 'info' | 'warn' | 'danger';
    routerLink?: string;
    data?: any;
    time?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
    private appointmentsService = inject(AppointmentsService);
    private patientsService = inject(PatientsService);

    getNotifications(): Observable<Notification[]> {
        const today = new Date();
        const todayStr = this.toDateStr(today);
        const tomorrowStr = this.toDateStr(new Date(today.getTime() + 24 * 60 * 60 * 1000));

        return forkJoin({
            appointments: this.appointmentsService.getAppointments().pipe(catchError(() => of([]))),
            patients: this.patientsService.getPatientsPage({ pageSize: 200 }).pipe(catchError(() => of({ data: [] })))
        }).pipe(
            map(({ appointments, patients }) => {
                const notifications: Notification[] = [];
                const allPatients: Patient[] = (patients as any).data || [];

                const todayAppts = (appointments as Appointment[]).filter((a) => a.date === todayStr && a.status === 'scheduled');
                if (todayAppts.length > 0) {
                    notifications.push({
                        id: 'today-appts',
                        type: 'today',
                        title: "Today's Appointments",
                        message: `${todayAppts.length} appointment${todayAppts.length > 1 ? 's' : ''} scheduled for today`,
                        icon: 'pi pi-calendar',
                        severity: 'info',
                        routerLink: '/notifications',
                        data: todayAppts
                    });
                }

                const upcomingAppts = (appointments as Appointment[]).filter((a) => a.date === tomorrowStr && a.status === 'scheduled');
                if (upcomingAppts.length > 0) {
                    notifications.push({
                        id: 'upcoming-appts',
                        type: 'upcoming',
                        title: 'Upcoming Appointments',
                        message: `${upcomingAppts.length} appointment${upcomingAppts.length > 1 ? 's' : ''} tomorrow`,
                        icon: 'pi pi-clock',
                        severity: 'warn',
                        routerLink: '/notifications',
                        data: upcomingAppts
                    });
                }

                const criticalPatients = allPatients.filter((p) => p.status?.toLowerCase() === 'critical');
                if (criticalPatients.length > 0) {
                    notifications.push({
                        id: 'critical-patients',
                        type: 'critical',
                        title: 'Critical Patients',
                        message: `${criticalPatients.length} patient${criticalPatients.length > 1 ? 's' : ''} in critical condition`,
                        icon: 'pi pi-exclamation-triangle',
                        severity: 'danger',
                        routerLink: '/notifications',
                        data: criticalPatients
                    });
                }

                return notifications;
            })
        );
    }

    private toDateStr(d: Date): string {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
}

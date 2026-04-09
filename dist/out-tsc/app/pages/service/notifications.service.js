import { __decorate } from "tslib";
import { Injectable, inject } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AppointmentsService } from '@/pages/service/appointments.service';
import { PatientsService } from '@/pages/service/patients.service';
let NotificationsService = class NotificationsService {
    appointmentsService = inject(AppointmentsService);
    patientsService = inject(PatientsService);
    getNotifications(isAdmin, doctorEmail) {
        const today = new Date();
        const todayStr = this.toDateStr(today);
        const tomorrowStr = this.toDateStr(new Date(today.getTime() + 24 * 60 * 60 * 1000));
        const sources = {
            // Doctors get their own appointments, admins get all
            appointments: this.appointmentsService.getAppointments(doctorEmail).pipe(catchError(() => of([])))
        };
        // Critical patients check — admin only
        if (isAdmin) {
            sources.patients = this.patientsService.getPatientsPage({ pageSize: 200 }).pipe(catchError(() => of({ data: [] })));
        }
        return forkJoin(sources).pipe(map(({ appointments, patients }) => {
            const notifications = [];
            const allPatients = patients?.data || [];
            // Today's appointments
            const todayAppts = appointments.filter((a) => a.date === todayStr && a.status === 'scheduled');
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
            // Tomorrow's appointments
            const upcomingAppts = appointments.filter((a) => a.date === tomorrowStr && a.status === 'scheduled');
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
            // Critical patients — admin only
            if (isAdmin) {
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
            }
            return notifications;
        }));
    }
    toDateStr(d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
};
NotificationsService = __decorate([
    Injectable({ providedIn: 'root' })
], NotificationsService);
export { NotificationsService };

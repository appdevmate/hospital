import { Injectable, inject } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AppointmentsService, Appointment } from '@/services/appointments.service';
import { PatientsService, Patient } from '@/services/patients.service';
import { PharmacyService, PharmacyAlert } from '@/services/pharmacy.service';
import { ExaminationService, Examination } from '@/services/consultation.service';

export interface Notification {
    id: string;
    type: 'today' | 'upcoming' | 'critical' | 'pharmacy_alert' | 'pending_prescriptions' | 'pending_signoff';
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
    private pharmacyService = inject(PharmacyService);
    private examinationService = inject(ExaminationService);

    getNotifications(isAdmin: boolean, doctorEmail?: string, isPharmacist = false, isDeveloper = false): Observable<Notification[]> {
        const today = new Date();
        const todayStr = this.toDateStr(today);
        const tomorrowStr = this.toDateStr(new Date(today.getTime() + 24 * 60 * 60 * 1000));

        const isDoctor = !!doctorEmail;

        // ── Build sources based on role ─────────────────────────────────────
        const sources: Record<string, Observable<any>> = {};

        // Appointments — everyone except pharmacists
        if (!isPharmacist) {
            sources['appointments'] = this.appointmentsService.getAppointments().pipe(catchError(() => of([])));
        }

        // Critical patients — admin, developer, and doctor (own patients)
        if (isAdmin || isDeveloper) {
            sources['patients'] = this.patientsService.getPatientsPage({ pageSize: 200 }).pipe(catchError(() => of({ data: [] })));
        } else if (isDoctor) {
            sources['patients'] = this.patientsService.getPatientsPage({ pageSize: 200 }).pipe(catchError(() => of({ data: [] })));
        }

        // Pharmacy alerts — admin, pharmacist, developer
        if (isAdmin || isPharmacist || isDeveloper) {
            sources['pharmacyAlerts'] = this.pharmacyService.getAlerts().pipe(catchError(() => of({ count: 0, alerts: [] })));
        }

        // Pending prescriptions queue — admin, pharmacist, developer
        if (isAdmin || isPharmacist || isDeveloper) {
            sources['pendingPrescriptions'] = this.pharmacyService.getPrescriptions('ordered').pipe(catchError(() => of([])));
        }

        // For doctors — fetch their exams by doctorEmail using the GSI
        if (isDoctor && !isAdmin && !isDeveloper) {
            sources['examinations'] = this.examinationService.listExaminations('', doctorEmail).pipe(catchError(() => of([])));
        }

        // ── Build admin/developer examination sign-offs ─────────────────────
        // Admin and developer see ALL draft examinations awaiting sign-off
        // Critical patients source — always fetch for admin/developer/doctor
        if (isAdmin || isDeveloper || isDoctor) {
            sources['patients'] = this.patientsService.getPatientsPage({ pageSize: 200 }).pipe(catchError(() => of({ data: [] })));
        }

        return forkJoin(sources).pipe(
            map((results: any) => {
                const notifications: Notification[] = [];

                const appointments: Appointment[] = results['appointments'] || [];
                const allPatients: Patient[] = results['patients']?.data || [];
                const pharmacyAlerts: PharmacyAlert[] = results['pharmacyAlerts']?.alerts || [];
                const pendingRx: any[] = results['pendingPrescriptions'] || [];
                const examinations: Examination[] = results['examinations'] || [];

                // ── Today's appointments ──────────────────────────────────
                const todayAppts = appointments.filter((a) => a.date === todayStr && a.status === 'scheduled');
                if (todayAppts.length > 0) {
                    notifications.push({
                        id: 'today-appts',
                        type: 'today',
                        title: "Today's Appointments",
                        message: `${todayAppts.length} appointment${todayAppts.length > 1 ? 's' : ''} scheduled for today`,
                        icon: 'pi pi-calendar',
                        severity: 'info',
                        routerLink: '/appointments',
                        data: todayAppts
                    });
                }

                // ── Tomorrow's appointments ───────────────────────────────
                const upcomingAppts = appointments.filter((a) => a.date === tomorrowStr && a.status === 'scheduled');
                if (upcomingAppts.length > 0) {
                    notifications.push({
                        id: 'upcoming-appts',
                        type: 'upcoming',
                        title: 'Upcoming Appointments (Tomorrow)',
                        message: `${upcomingAppts.length} appointment${upcomingAppts.length > 1 ? 's' : ''} tomorrow`,
                        icon: 'pi pi-clock',
                        severity: 'warn',
                        routerLink: '/appointments',
                        data: upcomingAppts
                    });
                }

                // ── Critical patients (admin + developer) ─────────────────
                if (isAdmin || isDeveloper) {
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
                } else if (isDoctor) {
                    // Extract patient IDs from this doctor's exams (already filtered by doctorEmail via GSI)
                    const myPatientIds = new Set(examinations.map((e) => e.patientId));
                    const criticalPatients = allPatients.filter((p) => p.status?.toLowerCase() === 'critical' && myPatientIds.has(p.PK.replace('PATIENT#', '')));
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

                // ── Pharmacy alerts (admin + pharmacist + developer) ───────
                if (pharmacyAlerts.length > 0) {
                    // Critical alerts (out of stock, expired) as danger
                    const criticalAlerts = pharmacyAlerts.filter((a) => a.severity === 'critical');
                    if (criticalAlerts.length > 0) {
                        notifications.push({
                            id: 'pharmacy-critical',
                            type: 'pharmacy_alert',
                            title: 'Critical Pharmacy Alerts',
                            message: `${criticalAlerts.length} item${criticalAlerts.length > 1 ? 's' : ''} out of stock or expired`,
                            icon: 'pi pi-times-circle',
                            severity: 'danger',
                            routerLink: '/pharmacy',
                            data: criticalAlerts
                        });
                    }

                    // Warning alerts (low stock, expiring soon) as warn
                    const warningAlerts = pharmacyAlerts.filter((a) => a.severity === 'warning');
                    if (warningAlerts.length > 0) {
                        notifications.push({
                            id: 'pharmacy-warning',
                            type: 'pharmacy_alert',
                            title: 'Pharmacy Warnings',
                            message: `${warningAlerts.length} item${warningAlerts.length > 1 ? 's' : ''} low stock or expiring soon`,
                            icon: 'pi pi-exclamation-circle',
                            severity: 'warn',
                            routerLink: '/pharmacy',
                            data: warningAlerts
                        });
                    }
                }

                // ── Pending prescriptions queue (admin + pharmacist + developer)
                if (pendingRx.length > 0) {
                    notifications.push({
                        id: 'pending-prescriptions',
                        type: 'pending_prescriptions',
                        title: 'Pending Prescriptions',
                        message: `${pendingRx.length} prescription${pendingRx.length > 1 ? 's' : ''} waiting to be dispensed`,
                        icon: 'pi pi-list',
                        severity: 'info',
                        routerLink: '/pharmacy',
                        data: pendingRx
                    });
                }

                // ── Pending examination sign-offs ─────────────────────────
                // Doctors see their own drafts, admins/developers see all drafts
                const pendingSignOffs = examinations.filter((e) => {
                    if (e.status !== 'draft') return false;
                    if (isDoctor && !isAdmin && !isDeveloper) {
                        return e.doctorEmail === doctorEmail;
                    }
                    return true;
                });
                if (pendingSignOffs.length > 0) {
                    notifications.push({
                        id: 'pending-signoffs',
                        type: 'pending_signoff',
                        title: 'Examinations Pending Sign-off',
                        message: `${pendingSignOffs.length} examination${pendingSignOffs.length > 1 ? 's' : ''} awaiting sign-off`,
                        icon: 'pi pi-file-edit',
                        severity: 'warn',
                        routerLink: '/patients-management',
                        data: pendingSignOffs
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
// import { Injectable, inject } from '@angular/core';
// import { forkJoin, Observable, of } from 'rxjs';
// import { map, catchError } from 'rxjs/operators';
// import { AppointmentsService, Appointment } from '@/pages/service/appointments.service';
// import { PatientsService, Patient } from '@/pages/service/patients.service';
// import { PharmacyService, PharmacyAlert } from '@/pages/service/pharmacy.service';
// import { ExaminationService, Examination } from '@/pages/service/examination.service';

// export interface Notification {
//     id: string;
//     type: 'today' | 'upcoming' | 'critical' | 'pharmacy_alert' | 'pending_prescriptions' | 'pending_signoff';
//     title: string;
//     message: string;
//     icon: string;
//     severity: 'info' | 'warn' | 'danger';
//     routerLink?: string;
//     data?: any;
//     time?: string;
// }

// @Injectable({ providedIn: 'root' })
// export class NotificationsService {
//     private appointmentsService = inject(AppointmentsService);
//     private patientsService     = inject(PatientsService);
//     private pharmacyService     = inject(PharmacyService);
//     private examinationService  = inject(ExaminationService);

//     getNotifications(
//         isAdmin: boolean,
//         doctorEmail?: string,
//         isPharmacist = false,
//         isDeveloper  = false
//     ): Observable<Notification[]> {
//         const today        = new Date();
//         const todayStr     = this.toDateStr(today);
//         const tomorrowStr  = this.toDateStr(new Date(today.getTime() + 24 * 60 * 60 * 1000));

//         const isDoctor = !!doctorEmail;

//         // ── Build sources based on role ─────────────────────────────────────
//         const sources: Record<string, Observable<any>> = {};

//         // Appointments — everyone except pharmacists
//         if (!isPharmacist) {
//             sources['appointments'] = this.appointmentsService
//                 .getAppointments(isDoctor && !isAdmin && !isDeveloper ? doctorEmail : undefined)
//                 .pipe(catchError(() => of([])));
//         }

//         // Critical patients — admin and developer only
//         if (isAdmin || isDeveloper) {
//             sources['patients'] = this.patientsService
//                 .getPatientsPage({ pageSize: 200 })
//                 .pipe(catchError(() => of({ data: [] })));
//         }

//         // Pharmacy alerts — admin, pharmacist, developer
//         if (isAdmin || isPharmacist || isDeveloper) {
//             sources['pharmacyAlerts'] = this.pharmacyService
//                 .getAlerts()
//                 .pipe(catchError(() => of({ count: 0, alerts: [] })));
//         }

//         // Pending prescriptions queue — admin, pharmacist, developer
//         if (isAdmin || isPharmacist || isDeveloper) {
//             sources['pendingPrescriptions'] = this.pharmacyService
//                 .getPrescriptions('ordered')
//                 .pipe(catchError(() => of([])));
//         }

//         // Pending examination sign-offs — doctor only (their own drafts)
//         if (isDoctor && !isAdmin && !isDeveloper) {
//             sources['examinations'] = this.examinationService
//                 .listExaminations('')
//                 .pipe(catchError(() => of([])));
//         }

//         // ── Build admin/developer examination sign-offs ─────────────────────
//         // Admin and developer see ALL draft examinations awaiting sign-off
//         if (isAdmin || isDeveloper) {
//             sources['examinations'] = this.examinationService
//                 .listExaminations('')
//                 .pipe(catchError(() => of([])));
//         }

//         return forkJoin(sources).pipe(
//             map((results: any) => {
//                 const notifications: Notification[] = [];

//                 const appointments: Appointment[]  = results['appointments']        || [];
//                 const allPatients: Patient[]        = results['patients']?.data      || [];
//                 const pharmacyAlerts: PharmacyAlert[] = results['pharmacyAlerts']?.alerts || [];
//                 const pendingRx: any[]              = results['pendingPrescriptions'] || [];
//                 const examinations: Examination[]   = results['examinations']        || [];

//                 // ── Today's appointments ──────────────────────────────────
//                 const todayAppts = appointments.filter(
//                     (a) => a.date === todayStr && a.status === 'scheduled'
//                 );
//                 if (todayAppts.length > 0) {
//                     notifications.push({
//                         id:         'today-appts',
//                         type:       'today',
//                         title:      "Today's Appointments",
//                         message:    `${todayAppts.length} appointment${todayAppts.length > 1 ? 's' : ''} scheduled for today`,
//                         icon:       'pi pi-calendar',
//                         severity:   'info',
//                         routerLink: '/appointments',
//                         data:       todayAppts
//                     });
//                 }

//                 // ── Tomorrow's appointments ───────────────────────────────
//                 const upcomingAppts = appointments.filter(
//                     (a) => a.date === tomorrowStr && a.status === 'scheduled'
//                 );
//                 if (upcomingAppts.length > 0) {
//                     notifications.push({
//                         id:         'upcoming-appts',
//                         type:       'upcoming',
//                         title:      'Upcoming Appointments (Tomorrow)',
//                         message:    `${upcomingAppts.length} appointment${upcomingAppts.length > 1 ? 's' : ''} tomorrow`,
//                         icon:       'pi pi-clock',
//                         severity:   'warn',
//                         routerLink: '/appointments',
//                         data:       upcomingAppts
//                     });
//                 }

//                 // ── Critical patients (admin + developer) ─────────────────
//                 if (isAdmin || isDeveloper) {
//                     const criticalPatients = allPatients.filter(
//                         (p) => p.status?.toLowerCase() === 'critical'
//                     );
//                     if (criticalPatients.length > 0) {
//                         notifications.push({
//                             id:         'critical-patients',
//                             type:       'critical',
//                             title:      'Critical Patients',
//                             message:    `${criticalPatients.length} patient${criticalPatients.length > 1 ? 's' : ''} in critical condition`,
//                             icon:       'pi pi-exclamation-triangle',
//                             severity:   'danger',
//                             routerLink: '/notifications',
//                             data:       criticalPatients
//                         });
//                     }
//                 }

//                 // ── Pharmacy alerts (admin + pharmacist + developer) ───────
//                 if (pharmacyAlerts.length > 0) {
//                     // Critical alerts (out of stock, expired) as danger
//                     const criticalAlerts = pharmacyAlerts.filter((a) => a.severity === 'critical');
//                     if (criticalAlerts.length > 0) {
//                         notifications.push({
//                             id:         'pharmacy-critical',
//                             type:       'pharmacy_alert',
//                             title:      'Critical Pharmacy Alerts',
//                             message:    `${criticalAlerts.length} item${criticalAlerts.length > 1 ? 's' : ''} out of stock or expired`,
//                             icon:       'pi pi-times-circle',
//                             severity:   'danger',
//                             routerLink: '/pharmacy',
//                             data:       criticalAlerts
//                         });
//                     }

//                     // Warning alerts (low stock, expiring soon) as warn
//                     const warningAlerts = pharmacyAlerts.filter((a) => a.severity === 'warning');
//                     if (warningAlerts.length > 0) {
//                         notifications.push({
//                             id:         'pharmacy-warning',
//                             type:       'pharmacy_alert',
//                             title:      'Pharmacy Warnings',
//                             message:    `${warningAlerts.length} item${warningAlerts.length > 1 ? 's' : ''} low stock or expiring soon`,
//                             icon:       'pi pi-exclamation-circle',
//                             severity:   'warn',
//                             routerLink: '/pharmacy',
//                             data:       warningAlerts
//                         });
//                     }
//                 }

//                 // ── Pending prescriptions queue (admin + pharmacist + developer)
//                 if (pendingRx.length > 0) {
//                     notifications.push({
//                         id:         'pending-prescriptions',
//                         type:       'pending_prescriptions',
//                         title:      'Pending Prescriptions',
//                         message:    `${pendingRx.length} prescription${pendingRx.length > 1 ? 's' : ''} waiting to be dispensed`,
//                         icon:       'pi pi-list',
//                         severity:   'info',
//                         routerLink: '/pharmacy',
//                         data:       pendingRx
//                     });
//                 }

//                 // ── Pending examination sign-offs ─────────────────────────
//                 // Doctors see their own drafts, admins/developers see all drafts
//                 const pendingSignOffs = examinations.filter((e) => {
//                     if (e.status !== 'draft') return false;
//                     if (isDoctor && !isAdmin && !isDeveloper) {
//                         return e.doctorEmail === doctorEmail;
//                     }
//                     return true;
//                 });
//                 if (pendingSignOffs.length > 0) {
//                     notifications.push({
//                         id:         'pending-signoffs',
//                         type:       'pending_signoff',
//                         title:      'Examinations Pending Sign-off',
//                         message:    `${pendingSignOffs.length} examination${pendingSignOffs.length > 1 ? 's' : ''} awaiting sign-off`,
//                         icon:       'pi pi-file-edit',
//                         severity:   'warn',
//                         routerLink: '/patients-management',
//                         data:       pendingSignOffs
//                     });
//                 }

//                 return notifications;
//             })
//         );
//     }

//     private toDateStr(d: Date): string {
//         return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
//     }
// }

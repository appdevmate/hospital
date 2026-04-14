import { Component, OnInit, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';

import { LayoutService } from '@/layout/service/layout.service';
import { AuthService } from '@/services/auth.service';
import { DoctorsService } from '@/services/doctors.service';
import { PatientsService } from '@/services/patients.service';
import { AppointmentsService, Appointment } from '@/services/appointments.service';
import { PaymentsService, Payment } from '@/services/payments.service';

interface StatCard {
    label: string;
    value: number | string;
    icon: string;
    color: string;
    svgKey: string;
    suffix?: string;
}

@Component({
    selector: 'app-dashboard',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, RouterModule, TagModule, ButtonModule, SkeletonModule, TooltipModule],
    host: { class: 'grid grid-cols-12 gap-8 mb-4' },
    template: `
        <!-- ═══════════════════════════════════════════════ STAT CARDS ══ -->
        @for (card of stats(); track card.label) {
            <div class="col-span-12 md:col-span-6 xl:col-span-3">
                <div class="card p-0! overflow-hidden flex flex-col">
                    <div class="flex items-center p-6">
                        <i [class]="card.icon + ' text-5xl!'" [ngClass]="textClass(card.color)"></i>
                        <div class="ml-6">
                            <span class="block whitespace-nowrap uppercase text-sm font-semibold" [ngClass]="textClass(card.color)">{{ card.label }}</span>
                            @if (loading()) {
                                <p-skeleton width="5rem" height="2.5rem" styleClass="mt-1"></p-skeleton>
                            } @else {
                                <span class="block text-4xl font-bold" [ngClass]="textClass(card.color)"> {{ card.value }}{{ card.suffix ?? '' }} </span>
                            }
                        </div>
                    </div>
                    <img [src]="setSvg(card.svgKey)" class="w-full mt-auto" [alt]="card.label" />
                </div>
            </div>
        }

        <!-- ════════════════════════════════ TODAY'S APPOINTMENTS ══ -->
        <div class="col-span-12 xl:col-span-7">
            <div class="card h-full">
                <div class="flex items-center justify-between mb-6">
                    <h5 class="font-semibold text-lg m-0">Today's Appointments</h5>
                    <p-button label="View All" icon="pi pi-arrow-right" iconPos="right" size="small" [text]="true" routerLink="/appointments"></p-button>
                </div>

                @if (loading()) {
                    @for (i of [1, 2, 3]; track i) {
                        <div class="flex items-center gap-4 mb-4">
                            <p-skeleton shape="circle" size="3rem"></p-skeleton>
                            <div class="flex-1">
                                <p-skeleton width="60%" height="1rem" styleClass="mb-2"></p-skeleton>
                                <p-skeleton width="40%" height="0.75rem"></p-skeleton>
                            </div>
                            <p-skeleton width="4rem" height="1.5rem"></p-skeleton>
                        </div>
                    }
                } @else if (todayAppointments().length === 0) {
                    <div class="flex flex-col items-center justify-center py-10 text-surface-400">
                        <i class="pi pi-calendar text-4xl mb-3"></i>
                        <span>No appointments scheduled for today</span>
                    </div>
                } @else {
                    <div class="flex flex-col gap-3">
                        @for (appt of todayAppointments(); track appt.appointmentId) {
                            <div class="flex items-center gap-4 p-3 rounded-lg border border-surface-200 dark:border-surface-700">
                                <!-- Avatar -->
                                <div class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center flex-shrink-0">
                                    <i class="pi pi-user text-primary-600 dark:text-primary-300"></i>
                                </div>
                                <!-- Info -->
                                <div class="flex-1 min-w-0">
                                    <div class="font-medium text-surface-900 dark:text-surface-0 truncate">{{ appt.patientName | titlecase }}</div>
                                    <div class="text-sm text-surface-500 flex items-center gap-2 mt-0.5">
                                        <i class="pi pi-clock text-xs"></i>
                                        <span>{{ appt.startTime }} – {{ appt.endTime }}</span>
                                        @if (auth.isAdmin || auth.isDeveloper) {
                                            <span class="mx-1">·</span>
                                            <i class="pi pi-user-plus text-xs"></i>
                                            <span class="truncate">{{ appt.doctorName | titlecase }}</span>
                                        }
                                    </div>
                                </div>
                                <!-- Status -->
                                <p-tag [value]="appt.status | titlecase" [severity]="apptSeverity(appt.status)"></p-tag>
                            </div>
                        }
                    </div>
                }
            </div>
        </div>

        <!-- ════════════════════════════════ UPCOMING (7 DAYS) ══ -->
        <div class="col-span-12 xl:col-span-5">
            <div class="card h-full">
                <div class="flex items-center justify-between mb-6">
                    <h5 class="font-semibold text-lg m-0">Upcoming (7 Days)</h5>
                    <span class="text-sm text-surface-500">{{ upcomingAppointments().length }} scheduled</span>
                </div>

                @if (loading()) {
                    @for (i of [1, 2, 3, 4]; track i) {
                        <div class="flex items-center gap-3 mb-3">
                            <p-skeleton width="3.5rem" height="3.5rem" borderRadius="0.5rem"></p-skeleton>
                            <div class="flex-1">
                                <p-skeleton width="70%" height="0.9rem" styleClass="mb-2"></p-skeleton>
                                <p-skeleton width="50%" height="0.75rem"></p-skeleton>
                            </div>
                        </div>
                    }
                } @else if (upcomingAppointments().length === 0) {
                    <div class="flex flex-col items-center justify-center py-10 text-surface-400">
                        <i class="pi pi-calendar-times text-4xl mb-3"></i>
                        <span>No upcoming appointments</span>
                    </div>
                } @else {
                    <div class="flex flex-col gap-2">
                        @for (appt of upcomingAppointments().slice(0, 8); track appt.appointmentId) {
                            <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
                                <!-- Date badge -->
                                <div class="w-14 h-14 rounded-lg bg-surface-100 dark:bg-surface-700 flex flex-col items-center justify-center flex-shrink-0">
                                    <span class="text-xs text-surface-500 uppercase">{{ appt.date | date: 'MMM' }}</span>
                                    <span class="text-xl font-bold text-surface-900 dark:text-surface-0 leading-none">{{ appt.date | date: 'd' }}</span>
                                </div>
                                <!-- Info -->
                                <div class="flex-1 min-w-0">
                                    <div class="font-medium text-surface-900 dark:text-surface-0 truncate text-sm">{{ appt.patientName | titlecase }}</div>
                                    <div class="text-xs text-surface-500 mt-0.5">{{ appt.startTime }} · {{ appt.type | titlecase }}</div>
                                </div>
                                <p-tag [value]="appt.status | titlecase" [severity]="apptSeverity(appt.status)" styleClass="text-xs"></p-tag>
                            </div>
                        }
                    </div>
                }
            </div>
        </div>

        <!-- ════════════════════════════════ INVOICES SUMMARY (admin only) ══ -->
        @if (auth.isAdmin || auth.isDeveloper) {
            <div class="col-span-12 xl:col-span-6">
                <div class="card h-full">
                    <div class="flex items-center justify-between mb-6">
                        <h5 class="font-semibold text-lg m-0">Invoice Summary</h5>
                        <p-button label="View All" icon="pi pi-arrow-right" iconPos="right" size="small" [text]="true" routerLink="/invoices"></p-button>
                    </div>

                    @if (loading()) {
                        @for (i of [1, 2, 3]; track i) {
                            <p-skeleton width="100%" height="2.5rem" styleClass="mb-3"></p-skeleton>
                        }
                    } @else {
                        <!-- Summary row -->
                        <div class="grid grid-cols-3 gap-4 mb-6">
                            <div class="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                                <div class="text-xl font-bold text-green-600">{{ invoiceSummary().paid }}</div>
                                <div class="text-xs text-green-600 mt-1">Paid</div>
                            </div>
                            <div class="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                                <div class="text-xl font-bold text-orange-500">{{ invoiceSummary().pending }}</div>
                                <div class="text-xs text-orange-500 mt-1">Pending</div>
                            </div>
                            <div class="text-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                                <div class="text-xl font-bold text-red-500">{{ invoiceSummary().overdue }}</div>
                                <div class="text-xs text-red-500 mt-1">Overdue</div>
                            </div>
                        </div>

                        <!-- Recent invoices -->
                        <div class="flex flex-col gap-2">
                            @for (inv of recentInvoices(); track inv.paymentId) {
                                <div class="flex items-center justify-between p-2 rounded-lg border border-surface-100 dark:border-surface-700">
                                    <div class="flex items-center gap-3">
                                        <i class="pi pi-file-invoice text-primary-500"></i>
                                        <div>
                                            <div class="text-sm font-medium text-surface-900 dark:text-surface-0">{{ inv.patientName | titlecase }}</div>
                                            <div class="text-xs text-surface-500">{{ inv.invoiceNumber }}</div>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-3">
                                        <span class="font-semibold text-surface-900 dark:text-surface-0">QAR {{ inv.amount | number: '1.0-0' }}</span>
                                        <p-tag [value]="inv.status | titlecase" [severity]="invoiceSeverity(inv.status)"></p-tag>
                                    </div>
                                </div>
                            }
                        </div>
                    }
                </div>
            </div>

            <!-- ══ PATIENTS & DOCTORS COUNTS ══ -->
            <div class="col-span-12 xl:col-span-6">
                <div class="card h-full">
                    <h5 class="font-semibold text-lg mb-6 m-0">Quick Overview</h5>
                    @if (loading()) {
                        @for (i of [1, 2, 3, 4]; track i) {
                            <p-skeleton width="100%" height="2rem" styleClass="mb-3"></p-skeleton>
                        }
                    } @else {
                        <div class="flex flex-col gap-4">
                            <div class="flex items-center justify-between p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                                <div class="flex items-center gap-3">
                                    <i class="pi pi-user-plus text-blue-500 text-xl"></i>
                                    <span class="font-medium text-blue-700 dark:text-blue-300">Total Doctors</span>
                                </div>
                                <span class="text-2xl font-bold text-blue-600">{{ totalDoctors() }}</span>
                            </div>
                            <div class="flex items-center justify-between p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20">
                                <div class="flex items-center gap-3">
                                    <i class="pi pi-users text-orange-500 text-xl"></i>
                                    <span class="font-medium text-orange-700 dark:text-orange-300">Total Patients</span>
                                </div>
                                <span class="text-2xl font-bold text-orange-600">{{ totalPatients() }}</span>
                            </div>
                            <div class="flex items-center justify-between p-4 rounded-xl bg-green-50 dark:bg-green-900/20">
                                <div class="flex items-center gap-3">
                                    <i class="pi pi-calendar-check text-green-500 text-xl"></i>
                                    <span class="font-medium text-green-700 dark:text-green-300">Appointments This Month</span>
                                </div>
                                <span class="text-2xl font-bold text-green-600">{{ monthAppointments() }}</span>
                            </div>
                            <div class="flex items-center justify-between p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20">
                                <div class="flex items-center gap-3">
                                    <i class="pi pi-dollar text-purple-500 text-xl"></i>
                                    <span class="font-medium text-purple-700 dark:text-purple-300">Total Revenue (QAR)</span>
                                </div>
                                <span class="text-2xl font-bold text-purple-600">{{ totalRevenue() | number: '1.0-0' }}</span>
                            </div>
                        </div>
                    }
                </div>
            </div>
        }

        <!-- ════════════════════════════════ DOCTOR: PENDING INVOICES ══ -->
        @if (auth.isDoctor || auth.isDeveloper) {
            <div class="col-span-12">
                <div class="card">
                    <div class="flex items-center justify-between mb-6">
                        <h5 class="font-semibold text-lg m-0">My Pending Invoices</h5>
                        <p-button label="View All" icon="pi pi-arrow-right" iconPos="right" size="small" [text]="true" routerLink="/invoices"></p-button>
                    </div>

                    @if (loading()) {
                        @for (i of [1, 2, 3]; track i) {
                            <p-skeleton width="100%" height="2.5rem" styleClass="mb-3"></p-skeleton>
                        }
                    } @else if (pendingInvoices().length === 0) {
                        <div class="flex flex-col items-center justify-center py-8 text-surface-400">
                            <i class="pi pi-check-circle text-4xl mb-3 text-green-400"></i>
                            <span>No pending invoices</span>
                        </div>
                    } @else {
                        <div class="flex flex-col gap-2">
                            @for (inv of pendingInvoices(); track inv.paymentId) {
                                <div class="flex items-center justify-between p-3 rounded-lg border border-surface-200 dark:border-surface-700">
                                    <div class="flex items-center gap-3">
                                        <i class="pi pi-file-invoice text-orange-400"></i>
                                        <div>
                                            <div class="text-sm font-medium">{{ inv.patientName | titlecase }}</div>
                                            <div class="text-xs text-surface-500">{{ inv.invoiceNumber }} · {{ inv.createdAt | date: 'MMM d, y' }}</div>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-3">
                                        <span class="font-semibold">QAR {{ inv.amount | number: '1.0-0' }}</span>
                                        <p-tag [value]="inv.status | titlecase" [severity]="invoiceSeverity(inv.status)"></p-tag>
                                    </div>
                                </div>
                            }
                        </div>
                    }
                </div>
            </div>
        }
    `
})
export class DashboardComponent implements OnInit {
    auth = inject(AuthService);
    private layoutService = inject(LayoutService);
    private doctorsService = inject(DoctorsService);
    private patientsService = inject(PatientsService);
    private appointmentsService = inject(AppointmentsService);
    private paymentsService = inject(PaymentsService);
    private cdr = inject(ChangeDetectorRef);

    loading = signal(true);

    // Stats
    stats = signal<StatCard[]>([]);
    totalDoctors = signal(0);
    totalPatients = signal(0);
    monthAppointments = signal(0);
    totalRevenue = signal(0);

    // Appointments
    todayAppointments = signal<Appointment[]>([]);
    upcomingAppointments = signal<Appointment[]>([]);

    // Invoices
    invoiceSummary = signal({ paid: 0, pending: 0, overdue: 0 });
    recentInvoices = signal<Payment[]>([]);
    pendingInvoices = signal<Payment[]>([]);

    private today = new Date();
    private todayStr = this.formatDate(this.today);
    private in7DaysStr = this.formatDate(new Date(this.today.getTime() + 7 * 24 * 60 * 60 * 1000));
    private thisMonthStr = `${this.today.getFullYear()}-${String(this.today.getMonth() + 1).padStart(2, '0')}`;

    ngOnInit() {
        const doctorEmail = this.auth.isDoctor ? this.auth.current.email : undefined;

        if (this.auth.isAdmin || this.auth.isAdmin) {
            this.loadAdminDashboard();
        } else {
            this.loadDoctorDashboard(doctorEmail!);
        }
    }

    private loadAdminDashboard() {
        forkJoin({
            doctors: this.doctorsService.getDoctorsPage({ pageSize: 1 }).pipe(catchError(() => of({ totalCount: 0 }))),
            patients: this.patientsService.getPatientsPage({ pageSize: 1 }).pipe(catchError(() => of({ totalCount: 0 }))),
            appointments: this.appointmentsService.getAppointments().pipe(catchError(() => of([]))),
            invoices: this.paymentsService.getAllInvoices().pipe(catchError(() => of({ data: [], count: 0 })))
        }).subscribe(({ doctors, patients, appointments, invoices }) => {
            const allAppts = appointments as Appointment[];
            const allInvoices = (invoices as any).data as Payment[];

            const totalDoctors = (doctors as any).totalCount || 0;
            const totalPatients = (patients as any).totalCount || 0;

            const todayAppts = allAppts.filter((a) => a.date === this.todayStr);
            const upcomingAppts = allAppts.filter((a) => a.date > this.todayStr && a.date <= this.in7DaysStr && a.status === 'scheduled').sort((a, b) => a.date.localeCompare(b.date));

            const monthAppts = allAppts.filter((a) => a.date.startsWith(this.thisMonthStr)).length;

            const paid = allInvoices.filter((i) => i.status?.toLowerCase() === 'paid').length;
            const pending = allInvoices.filter((i) => i.status?.toLowerCase() === 'pending').length;
            const overdue = allInvoices.filter((i) => i.status?.toLowerCase() === 'overdue').length;
            const revenue = allInvoices.filter((i) => i.status?.toLowerCase() === 'paid').reduce((sum, i) => sum + (i.amount || 0), 0);

            this.totalDoctors.set(totalDoctors);
            this.totalPatients.set(totalPatients);
            this.monthAppointments.set(monthAppts);
            this.totalRevenue.set(revenue);
            this.todayAppointments.set(todayAppts);
            this.upcomingAppointments.set(upcomingAppts);
            this.invoiceSummary.set({ paid, pending, overdue });
            this.recentInvoices.set(allInvoices.slice(0, 5));

            this.stats.set([
                { label: "Today's Appointments", value: todayAppts.length, icon: 'pi pi-calendar-clock', color: 'purple', svgKey: 'interactions' },
                { label: 'Upcoming (7 Days)', value: upcomingAppts.length, icon: 'pi pi-calendar', color: 'blue', svgKey: 'users' },
                { label: 'Pending Invoices', value: pending, icon: 'pi pi-file-invoice', color: 'orange', svgKey: 'locations' },
                { label: 'Total Revenue', value: revenue, icon: 'pi pi-dollar', color: 'green', svgKey: 'rate', suffix: ' QAR' }
            ]);

            this.loading.set(false);
            this.cdr.markForCheck();
        });
    }

    private loadDoctorDashboard(doctorEmail: string) {
        forkJoin({
            appointments: this.appointmentsService.getAppointments(doctorEmail).pipe(catchError(() => of([]))),
            invoices: this.paymentsService.getAllInvoices(doctorEmail).pipe(catchError(() => of({ data: [], count: 0 })))
        }).subscribe(({ appointments, invoices }) => {
            const allAppts = appointments as Appointment[];
            const allInvoices = (invoices as any).data as Payment[];

            const todayAppts = allAppts.filter((a) => a.date === this.todayStr);
            const upcomingAppts = allAppts.filter((a) => a.date > this.todayStr && a.date <= this.in7DaysStr && a.status === 'scheduled').sort((a, b) => a.date.localeCompare(b.date));

            const pending = allInvoices.filter((i) => ['pending', 'overdue'].includes(i.status?.toLowerCase()));

            this.todayAppointments.set(todayAppts);
            this.upcomingAppointments.set(upcomingAppts);
            this.pendingInvoices.set(pending);

            this.stats.set([
                { label: "Today's Appointments", value: todayAppts.length, icon: 'pi pi-calendar-clock', color: 'purple', svgKey: 'interactions' },
                { label: 'Upcoming (7 Days)', value: upcomingAppts.length, icon: 'pi pi-calendar', color: 'blue', svgKey: 'users' },
                { label: 'Pending Invoices', value: pending.length, icon: 'pi pi-file-invoice', color: 'orange', svgKey: 'locations' },
                { label: 'Total Appointments', value: allAppts.length, icon: 'pi pi-list', color: 'green', svgKey: 'rate' }
            ]);

            this.loading.set(false);
            this.cdr.markForCheck();
        });
    }

    setSvg(path: string): string {
        return `/demo/images/dashboard/${path}` + (this.layoutService.isDarkTheme() ? '-dark' : '') + '.svg';
    }

    // ── Severity helpers ──────────────────────────────────────────────
    apptSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        const map: Record<string, any> = {
            scheduled: 'info',
            completed: 'success',
            cancelled: 'danger',
            'no-show': 'warn',
            pending: 'warn'
        };
        return map[status?.toLowerCase()] ?? 'secondary';
    }

    invoiceSeverity(status: string): 'success' | 'warn' | 'danger' | 'secondary' {
        const map: Record<string, any> = {
            paid: 'success',
            pending: 'warn',
            overdue: 'danger'
        };
        return map[status?.toLowerCase()] ?? 'secondary';
    }

    textClass(color: string): string {
        const map: Record<string, string> = {
            blue: 'text-blue-500',
            green: 'text-green-500',
            orange: 'text-orange-500',
            purple: 'text-purple-500',
            red: 'text-red-500'
        };
        return map[color] ?? 'text-surface-500';
    }

    private formatDate(d: Date): string {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
}

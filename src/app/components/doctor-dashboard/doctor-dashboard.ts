import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';

import { AuthService } from '@/pages/service/auth.service';
import { AppointmentsService, Appointment } from '@/pages/service/appointments.service';
import { PaymentsService, Payment } from '@/pages/service/payments.service';
import { PatientsService, Patient } from '@/pages/service/patients.service';
import { DoctorsService, Doctor } from '@/pages/service/doctors.service';

@Component({
    selector: 'app-doctor-dashboard',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, RouterModule, ButtonModule, SkeletonModule, TagModule],
    template: `
        <div class="grid grid-cols-12 gap-6 mb-4">
            <div class="col-span-12">
                <div class="card">
                    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                            <div class="text-primary text-sm font-semibold uppercase tracking-wide mb-2">Doctor Dashboard</div>
                            <h1 class="text-3xl font-bold m-0">{{ welcomeName() }}</h1>
                            <p class="text-surface-500 mt-3 mb-0 max-w-3xl">
                                A doctor-focused overview of today's consultations, active patients, upcoming follow-ups, and billing items that still need attention.
                            </p>
                        </div>
                        <div class="flex gap-2 flex-wrap">
                            <p-button label="Doctor Workflow" icon="pi pi-sitemap" routerLink="/doctor-workflow"></p-button>
                            <p-button label="Appointments" icon="pi pi-calendar-plus" severity="secondary" [outlined]="true" routerLink="/appointments"></p-button>
                        </div>
                    </div>
                </div>
            </div>

            @for (metric of metrics(); track metric.label) {
                <div class="col-span-12 md:col-span-6 xl:col-span-3">
                    <div class="card h-full">
                        <div class="text-surface-500 text-sm font-medium mb-3">{{ metric.label }}</div>
                        @if (loading()) {
                            <p-skeleton width="5rem" height="2rem" styleClass="mb-3"></p-skeleton>
                            <p-skeleton width="80%" height="1rem"></p-skeleton>
                        } @else {
                            <div class="text-4xl font-bold mb-2">{{ metric.value }}</div>
                            <div class="text-surface-500 text-sm">{{ metric.note }}</div>
                        }
                    </div>
                </div>
            }

            <div class="col-span-12 xl:col-span-7">
                <div class="card h-full">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <h2 class="text-xl font-semibold m-0">Today's schedule</h2>
                            <div class="text-surface-500 text-sm mt-1">Consultations assigned to this doctor today.</div>
                        </div>
                        <p-button label="View all" icon="pi pi-arrow-right" iconPos="right" size="small" [text]="true" routerLink="/appointments"></p-button>
                    </div>

                    @if (loading()) {
                        @for (i of [1, 2, 3]; track i) {
                            <p-skeleton width="100%" height="4rem" styleClass="mb-3"></p-skeleton>
                        }
                    } @else if (todayAppointments().length === 0) {
                        <div class="flex flex-col items-center justify-center py-10 text-surface-400">
                            <i class="pi pi-calendar-times text-4xl mb-3"></i>
                            <span>No consultations scheduled for today.</span>
                        </div>
                    } @else {
                        <div class="flex flex-col gap-3">
                            @for (appt of todayAppointments(); track appt.appointmentId) {
                                <div class="border border-surface-200 dark:border-surface-700 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                    <div>
                                        <div class="font-semibold text-lg">{{ appt.patientName | titlecase }}</div>
                                        <div class="text-surface-500 text-sm mt-1">{{ appt.startTime }} - {{ appt.endTime }} | {{ appt.type | titlecase }}</div>
                                        @if (patientLookup()[appt.patientId]; as patient) {
                                            <div class="text-surface-500 text-sm mt-1">
                                                {{ patient.department || 'General care' }} | {{ patient.status || 'No status yet' }}
                                            </div>
                                        }
                                    </div>
                                    <p-tag [value]="appt.status | titlecase" [severity]="appointmentSeverity(appt.status)"></p-tag>
                                </div>
                            }
                        </div>
                    }
                </div>
            </div>

            <div class="col-span-12 xl:col-span-5">
                <div class="card h-full">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <h2 class="text-xl font-semibold m-0">Upcoming follow-ups</h2>
                            <div class="text-surface-500 text-sm mt-1">Next 7 days of scheduled care.</div>
                        </div>
                    </div>

                    @if (loading()) {
                        @for (i of [1, 2, 3, 4]; track i) {
                            <p-skeleton width="100%" height="3.25rem" styleClass="mb-3"></p-skeleton>
                        }
                    } @else if (upcomingAppointments().length === 0) {
                        <div class="flex flex-col items-center justify-center py-10 text-surface-400">
                            <i class="pi pi-check-circle text-4xl mb-3"></i>
                            <span>No follow-ups scheduled in the next 7 days.</span>
                        </div>
                    } @else {
                        <div class="flex flex-col gap-3">
                            @for (appt of upcomingAppointments().slice(0, 6); track appt.appointmentId) {
                                <div class="rounded-xl bg-surface-50 dark:bg-surface-800 p-3 flex items-center justify-between gap-3">
                                    <div>
                                        <div class="font-medium">{{ appt.patientName | titlecase }}</div>
                                        <div class="text-surface-500 text-sm mt-1">{{ appt.date | date: 'MMM d' }} | {{ appt.startTime }}</div>
                                    </div>
                                    <p-tag [value]="appt.type | titlecase" severity="info"></p-tag>
                                </div>
                            }
                        </div>
                    }
                </div>
            </div>

            <div class="col-span-12 xl:col-span-6">
                <div class="card h-full">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <h2 class="text-xl font-semibold m-0">Patients needing attention</h2>
                            <div class="text-surface-500 text-sm mt-1">Active patient records connected to this doctor's appointments.</div>
                        </div>
                        <p-button label="Patients" icon="pi pi-users" iconPos="right" size="small" [text]="true" routerLink="/patients-management"></p-button>
                    </div>

                    @if (loading()) {
                        @for (i of [1, 2, 3]; track i) {
                            <p-skeleton width="100%" height="4rem" styleClass="mb-3"></p-skeleton>
                        }
                    } @else if (activePatients().length === 0) {
                        <div class="flex flex-col items-center justify-center py-10 text-surface-400">
                            <i class="pi pi-folder-open text-4xl mb-3"></i>
                            <span>No active patient records linked yet.</span>
                        </div>
                    } @else {
                        <div class="flex flex-col gap-3">
                            @for (patient of activePatients().slice(0, 6); track patient.PK) {
                                <div class="border border-surface-200 dark:border-surface-700 rounded-xl p-4 flex items-center justify-between gap-3">
                                    <div>
                                        <div class="font-medium">{{ patient.name | titlecase }}</div>
                                        <div class="text-surface-500 text-sm mt-1">
                                            {{ patient.department || 'General care' }} | {{ patient.specialization || 'No specialization' }}
                                        </div>
                                    </div>
                                    <p-tag [value]="(patient.status || 'under review') | titlecase" [severity]="patientSeverity(patient.status)"></p-tag>
                                </div>
                            }
                        </div>
                    }
                </div>
            </div>

            <div class="col-span-12 xl:col-span-6">
                <div class="card h-full">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <h2 class="text-xl font-semibold m-0">Pending invoices</h2>
                            <div class="text-surface-500 text-sm mt-1">Billing items still pending or overdue for this doctor's patients.</div>
                        </div>
                        <p-button label="Invoices" icon="pi pi-file-edit" iconPos="right" size="small" [text]="true" routerLink="/invoices"></p-button>
                    </div>

                    @if (loading()) {
                        @for (i of [1, 2, 3]; track i) {
                            <p-skeleton width="100%" height="4rem" styleClass="mb-3"></p-skeleton>
                        }
                    } @else if (pendingInvoices().length === 0) {
                        <div class="flex flex-col items-center justify-center py-10 text-surface-400">
                            <i class="pi pi-wallet text-4xl mb-3"></i>
                            <span>No pending invoices.</span>
                        </div>
                    } @else {
                        <div class="flex flex-col gap-3">
                            @for (invoice of pendingInvoices().slice(0, 6); track invoice.paymentId) {
                                <div class="border border-surface-200 dark:border-surface-700 rounded-xl p-4 flex items-center justify-between gap-3">
                                    <div>
                                        <div class="font-medium">{{ invoice.patientName | titlecase }}</div>
                                        <div class="text-surface-500 text-sm mt-1">{{ invoice.invoiceNumber }} | {{ invoice.createdAt | date: 'MMM d, y' }}</div>
                                    </div>
                                    <div class="text-right">
                                        <div class="font-semibold">QAR {{ invoice.amount | number: '1.0-0' }}</div>
                                        <p-tag [value]="invoice.status | titlecase" [severity]="invoiceSeverity(invoice.status)"></p-tag>
                                    </div>
                                </div>
                            }
                        </div>
                    }
                </div>
            </div>
        </div>
    `
})
export class DoctorDashboardComponent implements OnInit {
    auth = inject(AuthService);
    private appointmentsService = inject(AppointmentsService);
    private paymentsService = inject(PaymentsService);
    private patientsService = inject(PatientsService);
    private doctorsService = inject(DoctorsService);

    loading = signal(true);
    doctor = signal<Doctor | null>(null);
    todayAppointments = signal<Appointment[]>([]);
    upcomingAppointments = signal<Appointment[]>([]);
    activePatients = signal<Patient[]>([]);
    pendingInvoices = signal<Payment[]>([]);
    patientLookup = signal<Record<string, Patient>>({});

    welcomeName = computed(() => this.doctor()?.name || this.auth.current.name || 'Doctor');

    metrics = computed(() => [
        {
            label: "Today's Consultations",
            value: this.todayAppointments().length,
            note: 'Scheduled patient encounters for today'
        },
        {
            label: 'Active Patients',
            value: this.activePatients().length,
            note: 'Patients linked to current and upcoming appointments'
        },
        {
            label: 'Upcoming Follow-ups',
            value: this.upcomingAppointments().length,
            note: 'Scheduled in the next 7 days'
        },
        {
            label: 'Pending Invoices',
            value: this.pendingInvoices().length,
            note: 'Pending or overdue billing items'
        }
    ]);

    ngOnInit(): void {
        this.auth.invalidate();
        const currentEmail = this.auth.current.email;
        const doctorEmail = this.auth.isDoctor ? currentEmail : undefined;
        const today = new Date();
        const todayStr = this.formatDate(today);
        const in7DaysStr = this.formatDate(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000));

        forkJoin({
            doctor: currentEmail ? this.doctorsService.getDoctorByEmail(currentEmail).pipe(catchError(() => of(null))) : of(null),
            appointments: this.appointmentsService.getAppointments(doctorEmail).pipe(catchError(() => of([]))),
            patients: this.patientsService.getPatientsPage({ pageSize: 200 }).pipe(catchError(() => of({ data: [] }))),
            invoices: this.paymentsService.getAllInvoices(doctorEmail).pipe(catchError(() => of({ data: [], count: 0 })))
        }).subscribe(({ doctor, appointments, patients, invoices }) => {
            const allAppointments = (appointments as Appointment[]) || [];
            const patientRows = ((patients as { data?: Patient[] })?.data || []) as Patient[];
            const invoiceRows = ((invoices as { data?: Payment[] })?.data || []) as Payment[];

            const todayAppointments = allAppointments
                .filter((appointment) => appointment.date === todayStr)
                .sort((left, right) => left.startTime.localeCompare(right.startTime));

            const upcomingAppointments = allAppointments
                .filter((appointment) => appointment.date > todayStr && appointment.date <= in7DaysStr && appointment.status?.toLowerCase() === 'scheduled')
                .sort((left, right) => (left.date + left.startTime).localeCompare(right.date + right.startTime));

            const activePatientIds = new Set([...todayAppointments, ...upcomingAppointments].map((appointment) => appointment.patientId));
            const activePatients = patientRows.filter((patient) => activePatientIds.has(patient.PK));
            const patientLookup = activePatients.reduce(
                (acc, patient) => {
                    acc[patient.PK] = patient;
                    return acc;
                },
                {} as Record<string, Patient>
            );

            const pendingInvoices = invoiceRows.filter((invoice) => ['pending', 'overdue'].includes((invoice.status || '').toLowerCase()));

            this.doctor.set(this.normalizeDoctor(doctor));
            this.todayAppointments.set(todayAppointments);
            this.upcomingAppointments.set(upcomingAppointments);
            this.activePatients.set(activePatients);
            this.pendingInvoices.set(pendingInvoices);
            this.patientLookup.set(patientLookup);
            this.loading.set(false);
        });
    }

    appointmentSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        const map: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
            completed: 'success',
            scheduled: 'info',
            pending: 'warn',
            cancelled: 'danger'
        };
        return map[(status || '').toLowerCase()] ?? 'secondary';
    }

    invoiceSeverity(status: string): 'success' | 'warn' | 'danger' | 'secondary' {
        const map: Record<string, 'success' | 'warn' | 'danger' | 'secondary'> = {
            paid: 'success',
            pending: 'warn',
            overdue: 'danger'
        };
        return map[(status || '').toLowerCase()] ?? 'secondary';
    }

    patientSeverity(status?: string | null): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        const map: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
            admitted: 'warn',
            discharged: 'success',
            'under observation': 'info',
            'in treatment': 'warn',
            critical: 'danger'
        };
        return map[(status || '').toLowerCase()] ?? 'secondary';
    }

    private normalizeDoctor(response: any): Doctor | null {
        if (!response) return null;
        if (response.data) return response.data as Doctor;
        if (response.item) return response.item as Doctor;
        return response as Doctor;
    }

    private formatDate(date: Date): string {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
}

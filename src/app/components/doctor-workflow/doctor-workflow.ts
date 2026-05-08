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
import { DoctorsService, Doctor } from '@/pages/service/doctors.service';
import { PatientsService, Patient } from '@/pages/service/patients.service';

type WorkflowStatus = 'completed' | 'active' | 'pending';

interface WorkflowStep {
    order: number;
    title: string;
    detail: string;
    status: WorkflowStatus;
    countLabel?: string;
}

@Component({
    selector: 'app-doctor-workflow',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, RouterModule, ButtonModule, SkeletonModule, TagModule],
    template: `
        <div class="doctor-workflow grid grid-cols-12 gap-6">
            <div class="col-span-12">
                <div class="hero-card">
                    <div>
                        <div class="eyebrow">Doctor Section</div>
                        <h1 class="hero-title">Doctor workflow</h1>
                        <p class="hero-copy">
                            Follow the full care path from sign-in and patient review to diagnosis, treatment, admission or discharge, ongoing monitoring,
                            and specialist referral when needed.
                        </p>
                    </div>

                    <div class="hero-actions">
                        <p-button label="Open Appointments" icon="pi pi-calendar-plus" routerLink="/appointments"></p-button>
                        <p-button label="Review Patients" icon="pi pi-users" severity="secondary" [outlined]="true" routerLink="/patients-management"></p-button>
                    </div>
                </div>
            </div>

            <div class="col-span-12 md:col-span-6 xl:col-span-3">
                <div class="metric-card">
                    <div class="metric-label">Doctor</div>
                    @if (loading()) {
                        <p-skeleton width="12rem" height="1.75rem"></p-skeleton>
                    } @else {
                        <div class="metric-value">{{ doctorDisplayName() }}</div>
                    }
                    <div class="metric-note">Signed in and ready for clinical work</div>
                </div>
            </div>

            <div class="col-span-12 md:col-span-6 xl:col-span-3">
                <div class="metric-card">
                    <div class="metric-label">Today's Consultations</div>
                    @if (loading()) {
                        <p-skeleton width="5rem" height="1.75rem"></p-skeleton>
                    } @else {
                        <div class="metric-value">{{ todayAppointments().length }}</div>
                    }
                    <div class="metric-note">Patients currently in today's queue</div>
                </div>
            </div>

            <div class="col-span-12 md:col-span-6 xl:col-span-3">
                <div class="metric-card">
                    <div class="metric-label">Records To Review</div>
                    @if (loading()) {
                        <p-skeleton width="5rem" height="1.75rem"></p-skeleton>
                    } @else {
                        <div class="metric-value">{{ relatedPatients().length }}</div>
                    }
                    <div class="metric-note">Patient files linked to active appointments</div>
                </div>
            </div>

            <div class="col-span-12 md:col-span-6 xl:col-span-3">
                <div class="metric-card">
                    <div class="metric-label">Next 7 Days</div>
                    @if (loading()) {
                        <p-skeleton width="5rem" height="1.75rem"></p-skeleton>
                    } @else {
                        <div class="metric-value">{{ upcomingAppointments().length }}</div>
                    }
                    <div class="metric-note">Upcoming follow-ups and consultations</div>
                </div>
            </div>

            <div class="col-span-12 xl:col-span-8">
                <div class="content-card">
                    <div class="section-head">
                        <div>
                            <div class="section-title">Workflow steps</div>
                            <div class="section-subtitle">Mapped from the doctor flow defined in the workflow SVG.</div>
                        </div>
                        <p-tag value="8 steps" severity="info"></p-tag>
                    </div>

                    @if (loading()) {
                        @for (i of [1, 2, 3, 4]; track i) {
                            <div class="step-skeleton">
                                <p-skeleton shape="circle" size="2.75rem"></p-skeleton>
                                <div class="flex-1">
                                    <p-skeleton width="45%" height="1rem" styleClass="mb-2"></p-skeleton>
                                    <p-skeleton width="90%" height="0.875rem"></p-skeleton>
                                </div>
                            </div>
                        }
                    } @else {
                        <div class="steps">
                            @for (step of workflowSteps(); track step.order) {
                                <div class="step-card" [class.step-active]="step.status === 'active'" [class.step-complete]="step.status === 'completed'">
                                    <div class="step-index">{{ step.order }}</div>
                                    <div class="step-body">
                                        <div class="step-topline">
                                            <h3>{{ step.title }}</h3>
                                            <p-tag [value]="statusLabel(step.status)" [severity]="statusSeverity(step.status)"></p-tag>
                                        </div>
                                        <p>{{ step.detail }}</p>
                                        @if (step.countLabel) {
                                            <div class="step-count">{{ step.countLabel }}</div>
                                        }
                                    </div>
                                </div>
                            }
                        </div>
                    }
                </div>
            </div>

            <div class="col-span-12 xl:col-span-4">
                <div class="content-card h-full">
                    <div class="section-head">
                        <div>
                            <div class="section-title">Next actions</div>
                            <div class="section-subtitle">Fast access into the main doctor tasks.</div>
                        </div>
                    </div>

                                        <div class="action-stack">
                        <a class="action-item" routerLink="/doctor-dashboard">
                            <i class="pi pi-desktop"></i>
                            <div>
                                <strong>Doctor dashboard</strong>
                                <span>See doctor-only metrics, today's consultations, active patients, and pending invoices</span>
                            </div>
                        </a>

                        <a class="action-item" routerLink="/consult-patient">
                            <i class="pi pi-calendar-clock"></i>
                            <div>
                                <strong>Consult patient</strong>
                                <span>Select a patient, reopen an open consultation, or start a new one</span>
                            </div>
                        </a>

                        <a class="action-item" routerLink="/patients-management">
                            <i class="pi pi-folder-open"></i>
                            <div>
                                <strong>Review patient records</strong>
                                <span>Browse history, allergies, medications, and notes</span>
                            </div>
                        </a>

                        <a class="action-item" routerLink="/calendar">
                            <i class="pi pi-calendar"></i>
                            <div>
                                <strong>Manage follow-up workflow</strong>
                                <span>Monitor progress, scheduling, and continuing care</span>
                            </div>
                        </a>

                        @if (auth.isAdmin) {
                            <a class="action-item" routerLink="/doctors-management">
                                <i class="pi pi-briefcase"></i>
                                <div>
                                    <strong>Doctor administration</strong>
                                    <span>Maintain staffing, roles, and clinical assignments</span>
                                </div>
                            </a>
                        }
                    </div>
                </div>
            </div>

            <div class="col-span-12 xl:col-span-6">
                <div class="content-card">
                    <div class="section-head">
                        <div>
                            <div class="section-title">Today's patient queue</div>
                            <div class="section-subtitle">Records tied to today's consultations.</div>
                        </div>
                    </div>

                    @if (loading()) {
                        @for (i of [1, 2, 3]; track i) {
                            <div class="list-skeleton">
                                <p-skeleton width="100%" height="3.5rem"></p-skeleton>
                            </div>
                        }
                    } @else if (todayAppointments().length === 0) {
                        <div class="empty-state">
                            <i class="pi pi-calendar-times"></i>
                            <span>No consultations scheduled for today.</span>
                        </div>
                    } @else {
                        <div class="queue-list">
                            @for (appt of todayAppointments(); track appt.appointmentId) {
                                <div class="queue-item">
                                    <div>
                                        <div class="queue-name">{{ appt.patientName | titlecase }}</div>
                                        <div class="queue-meta">{{ appt.startTime }} - {{ appt.endTime }} | {{ appt.type | titlecase }}</div>
                                    </div>
                                    <p-tag [value]="appt.status | titlecase" [severity]="appointmentSeverity(appt.status)"></p-tag>
                                </div>
                            }
                        </div>
                    }
                </div>
            </div>

            <div class="col-span-12 xl:col-span-6">
                <div class="content-card">
                    <div class="section-head">
                        <div>
                            <div class="section-title">Care outcomes to track</div>
                            <div class="section-subtitle">Last-step decisions after diagnosis and treatment.</div>
                        </div>
                    </div>

                    @if (loading()) {
                        @for (i of [1, 2, 3]; track i) {
                            <div class="list-skeleton">
                                <p-skeleton width="100%" height="3.5rem"></p-skeleton>
                            </div>
                        }
                    } @else {
                        <div class="outcome-grid">
                            <div class="outcome-card">
                                <span>Admission or discharge</span>
                                <strong>{{ admissionOrDischargeCount() }}</strong>
                                <small>Patients with tracked status updates</small>
                            </div>
                            <div class="outcome-card">
                                <span>Monitor progress</span>
                                <strong>{{ monitoringCount() }}</strong>
                                <small>Active patient records needing follow-up</small>
                            </div>
                            <div class="outcome-card">
                                <span>Refer to specialist</span>
                                <strong>{{ referralCandidatesCount() }}</strong>
                                <small>Patients with specialization or department routing</small>
                            </div>
                        </div>
                    }
                </div>
            </div>
        </div>
    `,
    styles: [
        `
            :host {
                display: block;
            }

            .doctor-workflow {
                margin-bottom: 1.5rem;
            }

            .hero-card,
            .metric-card,
            .content-card {
                background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 249, 255, 0.98) 100%);
                border: 1px solid var(--surface-border);
                border-radius: 1.5rem;
                box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08);
            }

            :host-context(.app-dark) .hero-card,
            :host-context(.app-dark) .metric-card,
            :host-context(.app-dark) .content-card {
                background: linear-gradient(180deg, rgba(20, 24, 35, 0.96) 0%, rgba(28, 34, 48, 0.96) 100%);
                box-shadow: 0 20px 45px rgba(0, 0, 0, 0.28);
            }

            .hero-card {
                padding: 2rem;
                display: flex;
                gap: 1.5rem;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
            }

            .eyebrow {
                text-transform: uppercase;
                letter-spacing: 0.16em;
                color: var(--primary-color);
                font-size: 0.75rem;
                font-weight: 700;
                margin-bottom: 0.75rem;
            }

            .hero-title {
                margin: 0;
                font-size: 2rem;
                line-height: 1.1;
            }

            .hero-copy {
                max-width: 52rem;
                margin: 0.75rem 0 0;
                color: var(--text-color-secondary);
            }

            .hero-actions {
                display: flex;
                gap: 0.75rem;
                flex-wrap: wrap;
            }

            .metric-card,
            .content-card {
                padding: 1.25rem;
                height: 100%;
            }

            .metric-label,
            .section-subtitle,
            .metric-note,
            .queue-meta,
            .step-count,
            .outcome-card small,
            .action-item span {
                color: var(--text-color-secondary);
            }

            .metric-label {
                font-size: 0.85rem;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                font-weight: 700;
                margin-bottom: 0.75rem;
            }

            .metric-value {
                font-size: 1.8rem;
                font-weight: 700;
                margin-bottom: 0.35rem;
            }

            .section-head {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 1rem;
                margin-bottom: 1rem;
            }

            .section-title {
                font-size: 1.15rem;
                font-weight: 700;
                margin-bottom: 0.2rem;
            }

            .steps {
                display: flex;
                flex-direction: column;
                gap: 0.85rem;
            }

            .step-card {
                display: flex;
                gap: 1rem;
                padding: 1rem;
                border-radius: 1rem;
                border: 1px solid var(--surface-border);
                background: rgba(255, 255, 255, 0.55);
            }

            :host-context(.app-dark) .step-card {
                background: rgba(255, 255, 255, 0.02);
            }

            .step-active {
                border-color: rgba(14, 165, 233, 0.45);
                box-shadow: inset 0 0 0 1px rgba(14, 165, 233, 0.12);
            }

            .step-complete {
                border-color: rgba(34, 197, 94, 0.35);
            }

            .step-index {
                width: 2.75rem;
                height: 2.75rem;
                border-radius: 999px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                background: linear-gradient(135deg, #0ea5e9, #2563eb);
                color: #fff;
                flex-shrink: 0;
            }

            .step-body {
                flex: 1;
                min-width: 0;
            }

            .step-topline {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 1rem;
                margin-bottom: 0.35rem;
            }

            .step-topline h3,
            .step-body p {
                margin: 0;
            }

            .step-body p {
                line-height: 1.55;
            }

            .step-count {
                margin-top: 0.65rem;
                font-size: 0.92rem;
                font-weight: 600;
            }

            .action-stack,
            .queue-list {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
            }

            .action-item,
            .queue-item {
                display: flex;
                gap: 0.9rem;
                align-items: center;
                justify-content: space-between;
                padding: 1rem;
                border-radius: 1rem;
                border: 1px solid var(--surface-border);
                text-decoration: none;
                color: inherit;
                background: rgba(255, 255, 255, 0.5);
            }

            :host-context(.app-dark) .action-item,
            :host-context(.app-dark) .queue-item {
                background: rgba(255, 255, 255, 0.02);
            }

            .action-item i {
                font-size: 1.15rem;
                color: var(--primary-color);
            }

            .action-item strong,
            .queue-name {
                display: block;
                margin-bottom: 0.2rem;
            }

            .outcome-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 0.85rem;
            }

            .outcome-card {
                padding: 1rem;
                border-radius: 1rem;
                border: 1px solid var(--surface-border);
                background: rgba(255, 255, 255, 0.5);
                display: flex;
                flex-direction: column;
                gap: 0.45rem;
            }

            :host-context(.app-dark) .outcome-card {
                background: rgba(255, 255, 255, 0.02);
            }

            .outcome-card strong {
                font-size: 1.8rem;
                line-height: 1;
            }

            .empty-state {
                min-height: 13rem;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                gap: 0.75rem;
                color: var(--text-color-secondary);
            }

            .empty-state i {
                font-size: 2rem;
            }

            .step-skeleton,
            .list-skeleton {
                margin-bottom: 0.85rem;
            }

            .step-skeleton {
                display: flex;
                gap: 1rem;
                align-items: center;
            }

            @media (max-width: 768px) {
                .hero-title {
                    font-size: 1.6rem;
                }

                .step-topline,
                .queue-item {
                    flex-direction: column;
                    align-items: flex-start;
                }
            }
        `
    ]
})
export class DoctorWorkflowComponent implements OnInit {
    auth = inject(AuthService);
    private appointmentsService = inject(AppointmentsService);
    private doctorsService = inject(DoctorsService);
    private patientsService = inject(PatientsService);

    loading = signal(true);
    doctor = signal<Doctor | null>(null);
    todayAppointments = signal<Appointment[]>([]);
    upcomingAppointments = signal<Appointment[]>([]);
    relatedPatients = signal<Patient[]>([]);

    doctorDisplayName = computed(() => this.doctor()?.name || this.auth.current.name || this.auth.current.email || 'Doctor');
    admissionOrDischargeCount = computed(() => this.relatedPatients().filter((patient) => ['admitted', 'discharged'].includes((patient.status || '').toLowerCase())).length);
    monitoringCount = computed(() => this.relatedPatients().filter((patient) => ['admitted', 'in treatment', 'under observation'].includes((patient.status || '').toLowerCase())).length);
    referralCandidatesCount = computed(() => this.relatedPatients().filter((patient) => !!patient.specialization || !!patient.department).length);

    workflowSteps = computed<WorkflowStep[]>(() => {
        const todayCount = this.todayAppointments().length;
        const patientCount = this.relatedPatients().length;
        const upcomingCount = this.upcomingAppointments().length;
        const admissionCount = this.admissionOrDischargeCount();
        const monitoringCount = this.monitoringCount();
        const referralCount = this.referralCandidatesCount();

        return [
            {
                order: 1,
                title: 'Doctor Sign In',
                detail: 'Authenticate the doctor and unlock doctor-specific tools, permissions, and assigned patient workload.',
                status: 'completed',
                countLabel: this.auth.current.email ? this.auth.current.email : 'Authenticated session'
            },
            {
                order: 2,
                title: 'Doctor Dashboard',
                detail: 'Enter the doctor hub to view the day plan, active patients, and fast navigation into consultation work.',
                status: 'active',
                countLabel: 'This page is the new workflow start tab'
            },
            {
                order: 3,
                title: 'Review Patient Records',
                detail: 'Open the patient file before consultation to review history, medications, allergies, and previous notes.',
                status: patientCount > 0 ? 'active' : 'pending',
                countLabel: `${patientCount} record(s) linked to current appointments`
            },
            {
                order: 4,
                title: 'Consult Patient',
                detail: 'See the patient at the scheduled appointment time and capture clinical findings from the encounter.',
                status: todayCount > 0 ? 'active' : 'pending',
                countLabel: `${todayCount} consultation(s) today`
            },
            {
                order: 5,
                title: 'Diagnosis',
                detail: 'Evaluate consultation findings and determine the diagnosis or working clinical impression for the case.',
                status: todayCount > 0 ? 'active' : 'pending',
                countLabel: 'Follows directly after consultation'
            },
            {
                order: 6,
                title: 'Prescribe Treatment or Tests',
                detail: 'Issue medication plans, diagnostic tests, and follow-up orders based on the diagnosis.',
                status: todayCount > 0 ? 'active' : 'pending',
                countLabel: `${upcomingCount} follow-up appointment(s) in the next 7 days`
            },
            {
                order: 7,
                title: 'Patient Admission or Discharge',
                detail: 'Decide whether the patient should be admitted for continued care or discharged with clear next steps.',
                status: admissionCount > 0 ? 'active' : 'pending',
                countLabel: `${admissionCount} patient status update(s) tracked`
            },
            {
                order: 8,
                title: 'Monitor Progress or Refer to Specialist',
                detail: 'Continue monitoring care progress and update the medical record, or refer the patient to a specialist when needed.',
                status: monitoringCount > 0 || referralCount > 0 ? 'active' : 'pending',
                countLabel: `${monitoringCount} monitoring case(s), ${referralCount} referral candidate(s)`
            }
        ];
    });

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
            patients: this.patientsService.getPatientsPage({ pageSize: 200 }).pipe(catchError(() => of({ data: [] })))
        }).subscribe(({ doctor, appointments, patients }) => {
            const allAppointments = (appointments as Appointment[]) || [];
            const patientRows = ((patients as { data?: Patient[] })?.data || []) as Patient[];

            const todayAppointments = allAppointments
                .filter((appointment) => appointment.date === todayStr)
                .sort((left, right) => left.startTime.localeCompare(right.startTime));

            const upcomingAppointments = allAppointments
                .filter((appointment) => appointment.date > todayStr && appointment.date <= in7DaysStr)
                .sort((left, right) => (left.date + left.startTime).localeCompare(right.date + right.startTime));

            const activePatientIds = new Set([...todayAppointments, ...upcomingAppointments].map((appointment) => appointment.patientId));
            const relatedPatients = patientRows.filter((patient) => activePatientIds.has(patient.PK));

            this.doctor.set(this.normalizeDoctor(doctor));
            this.todayAppointments.set(todayAppointments);
            this.upcomingAppointments.set(upcomingAppointments);
            this.relatedPatients.set(relatedPatients);
            this.loading.set(false);
        });
    }

    statusLabel(status: WorkflowStatus): string {
        const labels: Record<WorkflowStatus, string> = {
            completed: 'Completed',
            active: 'Active',
            pending: 'Pending'
        };
        return labels[status];
    }

    statusSeverity(status: WorkflowStatus): 'success' | 'info' | 'contrast' {
        const map: Record<WorkflowStatus, 'success' | 'info' | 'contrast'> = {
            completed: 'success',
            active: 'info',
            pending: 'contrast'
        };
        return map[status];
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

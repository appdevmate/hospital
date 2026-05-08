import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';

import { AuthService } from '@/pages/service/auth.service';
import { HelpersService } from '@/pages/service/helpers-service';
import { PatientsService, Patient } from '@/pages/service/patients.service';
import { AppointmentsService, Appointment } from '@/pages/service/appointments.service';
import { ExaminationService, Examination } from '@/pages/service/examination.service';

interface PatientOption {
    label: string;
    value: Patient;
}

@Component({
    selector: 'app-consult-patient',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, RouterModule, AutoCompleteModule, ButtonModule, CardModule, DividerModule, SkeletonModule, TagModule],
    template: `
        <div class="grid grid-cols-12 gap-6 mb-4">
            <div class="col-span-12">
                <div class="card">
                    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                            <div class="text-primary text-sm font-semibold uppercase tracking-wide mb-2">Consult Patient</div>
                            <h1 class="text-3xl font-bold m-0">Select a patient and continue consultation</h1>
                            <p class="text-surface-500 mt-3 mb-0 max-w-3xl">
                                Choose an existing patient. If there is already an open consultation, we will open it directly. Otherwise, you can review
                                the patient details here and start a new consultation.
                            </p>
                        </div>
                        <div class="flex gap-2 flex-wrap">
                            <p-button label="Doctor Workflow" icon="pi pi-sitemap" routerLink="/doctor-workflow"></p-button>
                            <p-button label="Patients" icon="pi pi-users" severity="secondary" [outlined]="true" routerLink="/patients-management"></p-button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-span-12 xl:col-span-4">
                <div class="card h-full">
                    <h2 class="text-xl font-semibold mt-0 mb-4">Patient search</h2>
                    @if (loadingPatients()) {
                        <p-skeleton width="100%" height="3rem"></p-skeleton>
                    } @else {
                        <p-autoComplete
                            [(ngModel)]="selectedPatient"
                            [suggestions]="filteredPatients()"
                            (completeMethod)="searchPatients($event)"
                            optionLabel="label"
                            [dropdown]="true"
                            [forceSelection]="true"
                            [style]="{ width: '100%' }"
                            inputStyleClass="w-full"
                            appendTo="body"
                            placeholder="Search by patient name"
                            (onSelect)="onPatientSelected()"
                        />
                    }

                    <div class="text-surface-500 text-sm mt-4">
                        {{ patientOptions().length }} patient record(s) loaded for consultation lookup.
                    </div>

                    <p-divider></p-divider>

                    <div class="flex flex-col gap-3">
                        <div class="rounded-xl bg-surface-50 dark:bg-surface-800 p-3">
                            <div class="font-medium mb-1">What happens after selection?</div>
                            <div class="text-surface-500 text-sm">If a draft consultation exists, it opens directly in the examination form.</div>
                        </div>
                        <div class="rounded-xl bg-surface-50 dark:bg-surface-800 p-3">
                            <div class="font-medium mb-1">No open consultation?</div>
                            <div class="text-surface-500 text-sm">The patient summary appears here with a button to start a new consultation.</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-span-12 xl:col-span-8">
                <div class="card h-full">
                    @if (!selectedPatientRecord()) {
                        <div class="flex flex-col items-center justify-center py-16 text-surface-400">
                            <i class="pi pi-user text-5xl mb-4"></i>
                            <h3 class="text-xl font-semibold m-0 mb-2 text-surface-700 dark:text-surface-200">No patient selected</h3>
                            <p class="m-0 text-center max-w-xl">Choose a patient from the search box to open an existing draft consultation or start a new one.</p>
                        </div>
                    } @else if (loadingConsultation()) {
                        <div class="flex flex-col gap-4">
                            <p-skeleton width="40%" height="2rem"></p-skeleton>
                            <p-skeleton width="100%" height="8rem"></p-skeleton>
                            <p-skeleton width="100%" height="8rem"></p-skeleton>
                        </div>
                    } @else {
                        <div class="flex items-start justify-between gap-4 flex-wrap mb-4">
                            <div>
                                <h2 class="text-2xl font-semibold mt-0 mb-2">{{ selectedPatientRecord()!.name | titlecase }}</h2>
                                <div class="flex gap-2 flex-wrap">
                                    <p-tag [value]="(selectedPatientRecord()!.status || 'Under Review') | titlecase" [severity]="patientSeverity(selectedPatientRecord()!.status)"></p-tag>
                                    @if (selectedPatientRecord()!.department) {
                                        <p-tag [value]="selectedPatientRecord()!.department!" severity="info"></p-tag>
                                    }
                                    @if (selectedPatientRecord()!.specialization) {
                                        <p-tag [value]="selectedPatientRecord()!.specialization!" severity="contrast"></p-tag>
                                    }
                                </div>
                            </div>

                            <div class="flex gap-2 flex-wrap">
                                @if (openConsultation()) {
                                    <p-button label="Open Consultation" icon="pi pi-pencil" (onClick)="openExistingConsultation()"></p-button>
                                } @else {
                                    <p-button label="Start Consultation" icon="pi pi-play" (onClick)="startConsultation()" [loading]="startingConsultation()"></p-button>
                                }
                                <p-button label="Patient Profile" icon="pi pi-id-card" severity="secondary" [outlined]="true" (onClick)="openPatientProfile()"></p-button>
                            </div>
                        </div>

                        @if (openConsultation()) {
                            <div class="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 p-4 mb-4">
                                <div class="font-semibold text-green-700 dark:text-green-300 mb-1">Open consultation found</div>
                                <div class="text-sm text-green-700 dark:text-green-300">
                                    Draft consultation from {{ openConsultation()!.date | date: 'MMM d, y' }} is ready to continue.
                                </div>
                            </div>
                        } @else {
                            <div class="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 p-4 mb-4">
                                <div class="font-semibold text-orange-700 dark:text-orange-300 mb-1">No open consultation found</div>
                                <div class="text-sm text-orange-700 dark:text-orange-300">
                                    Review the patient details below, then click <strong>Start Consultation</strong> to create a new draft.
                                </div>
                            </div>
                        }

                        <div class="grid grid-cols-12 gap-4">
                            <div class="col-span-12 md:col-span-6">
                                <div class="rounded-xl border border-surface-200 dark:border-surface-700 p-4 h-full">
                                    <div class="font-semibold mb-3">Patient details</div>
                                    <div class="detail-grid">
                                        <div><span>Email</span><strong>{{ selectedPatientRecord()!.email || 'N/A' }}</strong></div>
                                        <div><span>Phone</span><strong>{{ selectedPatientRecord()!.phone || 'N/A' }}</strong></div>
                                        <div><span>Gender</span><strong>{{ selectedPatientRecord()!.gender || 'N/A' }}</strong></div>
                                        <div><span>Date of Birth</span><strong>{{ selectedPatientRecord()!.dob || 'N/A' }}</strong></div>
                                        <div><span>Insurance</span><strong>{{ selectedPatientRecord()!.insurance || 'N/A' }}</strong></div>
                                        <div><span>Blood Group</span><strong>{{ selectedPatientRecord()!.bloodGroup || 'N/A' }}</strong></div>
                                    </div>
                                </div>
                            </div>

                            <div class="col-span-12 md:col-span-6">
                                <div class="rounded-xl border border-surface-200 dark:border-surface-700 p-4 h-full">
                                    <div class="font-semibold mb-3">Clinical context</div>
                                    <div class="detail-grid">
                                        <div><span>Department</span><strong>{{ selectedPatientRecord()!.department || 'N/A' }}</strong></div>
                                        <div><span>Specialization</span><strong>{{ selectedPatientRecord()!.specialization || 'N/A' }}</strong></div>
                                        <div><span>Ward</span><strong>{{ selectedPatientRecord()!.ward || 'N/A' }}</strong></div>
                                        <div><span>Bed Number</span><strong>{{ selectedPatientRecord()!.bedNumber || 'N/A' }}</strong></div>
                                        <div><span>Admission Date</span><strong>{{ selectedPatientRecord()!.admissionDate || 'N/A' }}</strong></div>
                                        <div><span>Related Appointments</span><strong>{{ matchingAppointments().length }}</strong></div>
                                    </div>
                                </div>
                            </div>

                            <div class="col-span-12">
                                <div class="rounded-xl border border-surface-200 dark:border-surface-700 p-4">
                                    <div class="font-semibold mb-3">Medical summary</div>
                                    <div class="summary-block">
                                        <span>Medical History</span>
                                        <p>{{ selectedPatientRecord()!.medicalHistory || 'No medical history recorded.' }}</p>
                                    </div>
                                    <div class="summary-block">
                                        <span>Notes</span>
                                        <p>{{ selectedPatientRecord()!.notes || 'No notes recorded.' }}</p>
                                    </div>
                                    <div class="summary-block">
                                        <span>Allergies</span>
                                        <p>{{ joinList(selectedPatientRecord()!.allergies) }}</p>
                                    </div>
                                    <div class="summary-block">
                                        <span>Medications</span>
                                        <p>{{ joinList(selectedPatientRecord()!.medications) }}</p>
                                    </div>
                                </div>
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

            .detail-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 1rem;
            }

            .detail-grid div,
            .summary-block {
                display: flex;
                flex-direction: column;
                gap: 0.35rem;
            }

            .detail-grid span,
            .summary-block span {
                font-size: 0.85rem;
                color: var(--text-color-secondary);
            }

            .detail-grid strong {
                font-size: 0.95rem;
                word-break: break-word;
            }

            .summary-block + .summary-block {
                margin-top: 1rem;
            }

            .summary-block p {
                margin: 0;
                line-height: 1.55;
            }

            @media (max-width: 768px) {
                .detail-grid {
                    grid-template-columns: 1fr;
                }
            }
        `
    ]
})
export class ConsultPatientComponent {
    private patientsService = inject(PatientsService);
    private appointmentsService = inject(AppointmentsService);
    private examinationService = inject(ExaminationService);
    private auth = inject(AuthService);
    private router = inject(Router);
    private helpers = inject(HelpersService);

    loadingPatients = signal(true);
    loadingConsultation = signal(false);
    startingConsultation = signal(false);

    patientOptions = signal<PatientOption[]>([]);
    filteredPatients = signal<PatientOption[]>([]);
    selectedPatient: PatientOption | null = null;
    selectedPatientRecord = signal<Patient | null>(null);
    matchingAppointments = signal<Appointment[]>([]);
    openConsultation = signal<Examination | null>(null);

    constructor() {
        this.loadPatients();
    }

    searchPatients(event: { query: string }) {
        const query = (event.query || '').trim().toLowerCase();
        if (!query) {
            this.filteredPatients.set(this.patientOptions().slice(0, 20));
            return;
        }

        this.filteredPatients.set(this.patientOptions().filter((option) => option.label.toLowerCase().includes(query)).slice(0, 20));
    }

    onPatientSelected() {
        const patient = this.selectedPatient?.value ?? null;
        this.selectedPatientRecord.set(patient);
        this.openConsultation.set(null);
        this.matchingAppointments.set([]);

        if (!patient) return;

        const patientId = this.plainPatientId(patient.PK);
        const fullPatientId = this.fullPatientId(patient.PK);
        const doctorEmail = this.auth.isDoctor ? this.auth.current.email : undefined;

        this.loadingConsultation.set(true);

        forkJoin({
            examinations: this.examinationService.listExaminations(patientId).pipe(catchError(() => of([]))),
            appointments: this.appointmentsService.getAppointments(doctorEmail).pipe(catchError(() => of([])))
        }).subscribe(({ examinations, appointments }) => {
            const examRows = (examinations as Examination[]) || [];
            const appointmentRows = ((appointments as Appointment[]) || []).filter(
                (appointment) => appointment.patientId === patientId || appointment.patientId === fullPatientId
            );

            const openDraft =
                examRows
                    .filter((exam) => exam.status === 'draft')
                    .sort((left, right) => (right.updatedAt || right.createdAt || '').localeCompare(left.updatedAt || left.createdAt || ''))[0] || null;

            this.matchingAppointments.set(appointmentRows);
            this.openConsultation.set(openDraft);
            this.loadingConsultation.set(false);
        });
    }

    openExistingConsultation() {
        const exam = this.openConsultation();
        if (!exam) return;
        this.router.navigate(['/examination', exam.examId]);
    }

    startConsultation() {
        const patient = this.selectedPatientRecord();
        if (!patient) return;

        this.startingConsultation.set(true);
        this.examinationService
            .createExamination({
                patientId: this.plainPatientId(patient.PK),
                patientName: patient.name,
                doctorEmail: this.auth.current.email || '',
                doctorName: this.auth.current.name || ''
            })
            .subscribe({
                next: (exam) => {
                    this.startingConsultation.set(false);
                    this.router.navigate(['/examination', exam.examId]);
                },
                error: (err) => {
                    this.startingConsultation.set(false);
                    this.helpers.notifyError('Error', err?.error?.message || 'Could not start consultation');
                }
            });
    }

    openPatientProfile() {
        const patient = this.selectedPatientRecord();
        if (!patient) return;
        this.router.navigate(['/patient-profile', this.plainPatientId(patient.PK)]);
    }

    patientSeverity(status?: string | null): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        const map: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
            admitted: 'warn',
            discharged: 'success',
            stable: 'success',
            critical: 'danger',
            'under treatment': 'info',
            'under observation': 'info'
        };
        return map[(status || '').toLowerCase()] ?? 'secondary';
    }

    joinList(values?: string[] | null): string {
        return values?.length ? values.join(', ') : 'None recorded.';
    }

    private loadPatients() {
        this.loadingPatients.set(true);
        this.patientsService
            .getPatientsPage({ pageSize: 300 })
            .pipe(catchError(() => of({ data: [] })))
            .subscribe((response) => {
                const patients = ((response as { data?: Patient[] })?.data || []) as Patient[];
                const options = patients
                    .sort((left, right) => (left.name || '').localeCompare(right.name || ''))
                    .map((patient) => ({
                        label: patient.name,
                        value: patient
                    }));

                this.patientOptions.set(options);
                this.filteredPatients.set(options.slice(0, 20));
                this.loadingPatients.set(false);
            });
    }

    private plainPatientId(pk: string): string {
        if (!pk) return '';
        return pk.includes('#') ? pk.split('#')[1] : pk;
    }

    private fullPatientId(pk: string): string {
        if (!pk) return '';
        return pk.startsWith('PATIENT#') ? pk : `PATIENT#${this.plainPatientId(pk)}`;
    }
}

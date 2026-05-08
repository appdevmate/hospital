import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';
import { TabsModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';

import { ConsultationService, HmsConsultation } from '@/pages/service/hms/consultation.service';
import { DoctorNotesService, HmsDoctorNote } from '@/pages/service/hms/doctor-notes.service';
import { DiagnosisService, HmsDiagnosis } from '@/pages/service/hms/diagnosis.service';
import { TreatmentPlanService, HmsTreatmentPlan } from '@/pages/service/hms/treatment-plan.service';
import { PrescriptionService, HmsPrescription } from '@/pages/service/hms/prescription.service';
import { LabResultsService, HmsLabResult } from '@/pages/service/hms/lab-results.service';
import { RadiologyService, HmsRadiologyResult } from '@/pages/service/hms/radiology.service';
import { ReferralService, HmsReferral } from '@/pages/service/hms/referral.service';
import { FollowUpService, HmsFollowUp } from '@/pages/service/hms/follow-up.service';

@Component({
    selector: 'app-consultation-detail',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [ConfirmationService, MessageService],
    imports: [
        CommonModule, RouterModule,
        ButtonModule, SkeletonModule, TagModule, DividerModule, ToastModule,
        TabsModule, TableModule, TooltipModule, ConfirmDialogModule
    ],
    template: `
        <p-toast></p-toast>
        <p-confirmDialog></p-confirmDialog>

        <div class="grid grid-cols-12 gap-6">

            <!-- Header -->
            <div class="col-span-12">
                <div class="card flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    @if (loading()) {
                        <p-skeleton width="18rem" height="2rem"></p-skeleton>
                    } @else if (consultation()) {
                        <div>
                            <div class="text-primary text-sm font-semibold uppercase tracking-wide mb-1">HMS / Consultations</div>
                            <h1 class="text-3xl font-bold m-0">Consultation — {{ consultation()!.date || 'No date' }}</h1>
                            <div class="flex gap-2 mt-2">
                                <p-tag [value]="consultation()!.status || 'Unknown'" [severity]="statusSeverity(consultation()!.status)"/>
                                @if (consultation()!.type) { <p-tag [value]="consultation()!.type!" severity="info"/> }
                            </div>
                        </div>
                    }
                    <div class="flex gap-2">
                        <p-button label="Edit" icon="pi pi-pencil" severity="secondary" [outlined]="true"
                            [routerLink]="['edit']" [queryParams]="{patientId: patientId()}"></p-button>
                        <p-button icon="pi pi-arrow-left" [text]="true" severity="secondary"
                            routerLink="/hms/consultations" pTooltip="Back to list"></p-button>
                    </div>
                </div>
            </div>

            <!-- Overview: vitals + summary -->
            <div class="col-span-12 md:col-span-6">
                <div class="card h-full">
                    <h2 class="text-lg font-semibold mt-0 mb-4">Summary</h2>
                    @if (loading()) {
                        <div class="flex flex-col gap-3">
                            @for (i of [1,2,3,4]; track i) { <p-skeleton width="100%" height="2rem"></p-skeleton> }
                        </div>
                    } @else if (consultation()) {
                        <div class="detail-grid">
                            <div><span>Patient</span>
                                <a class="font-medium text-primary hover:underline"
                                   [routerLink]="['/hms/patients', consultation()!.patientId]">
                                   {{ consultation()!.patientName || consultation()!.patientId }}
                                </a>
                            </div>
                            <div><span>Doctor</span><strong>{{ consultation()!.doctorName || consultation()!.doctorEmail || '—' }}</strong></div>
                            <div><span>Date</span><strong>{{ consultation()!.date || '—' }}</strong></div>
                            <div><span>Type</span><strong>{{ consultation()!.type || '—' }}</strong></div>
                            <div class="col-span-2"><span>Chief Complaint</span><strong>{{ consultation()!.chiefComplaint || '—' }}</strong></div>
                            <div class="col-span-2"><span>Notes</span><p class="m-0 text-sm">{{ consultation()!.notes || 'None.' }}</p></div>
                        </div>
                    }
                </div>
            </div>

            <div class="col-span-12 md:col-span-6">
                <div class="card h-full">
                    <h2 class="text-lg font-semibold mt-0 mb-4">Vital Signs</h2>
                    @if (loading()) {
                        <div class="flex flex-col gap-3">
                            @for (i of [1,2,3,4]; track i) { <p-skeleton width="100%" height="2rem"></p-skeleton> }
                        </div>
                    } @else if (consultation()?.vitalSigns) {
                        <div class="detail-grid">
                            <div><span>Temperature</span><strong>{{ consultation()!.vitalSigns!.temperature || '—' }}</strong></div>
                            <div><span>Blood Pressure</span><strong>{{ consultation()!.vitalSigns!.bloodPressure || '—' }}</strong></div>
                            <div><span>Heart Rate</span><strong>{{ consultation()!.vitalSigns!.heartRate || '—' }}</strong></div>
                            <div><span>Respiratory Rate</span><strong>{{ consultation()!.vitalSigns!.respiratoryRate || '—' }}</strong></div>
                            <div><span>O₂ Saturation</span><strong>{{ consultation()!.vitalSigns!.oxygenSaturation || '—' }}</strong></div>
                            <div><span>Weight</span><strong>{{ consultation()!.vitalSigns!.weight || '—' }}</strong></div>
                            <div><span>Height</span><strong>{{ consultation()!.vitalSigns!.height || '—' }}</strong></div>
                        </div>
                    } @else if (!loading()) {
                        <p class="text-surface-400 m-0">No vital signs recorded.</p>
                    }
                </div>
            </div>

            <!-- Sub-entity tabs -->
            <div class="col-span-12">
                <div class="card">
                    @if (loadingSubs()) {
                        <div class="flex flex-col gap-3">
                            @for (i of [1,2,3]; track i) { <p-skeleton width="100%" height="3rem"></p-skeleton> }
                        </div>
                    } @else {
                        <p-tabs value="notes">
                            <p-tablist>
                                <p-tab value="notes">Doctor Notes <span class="ml-1 text-xs text-surface-400">({{ notes().length }})</span></p-tab>
                                <p-tab value="diagnoses">Diagnoses <span class="ml-1 text-xs text-surface-400">({{ diagnoses().length }})</span></p-tab>
                                <p-tab value="plans">Treatment Plans <span class="ml-1 text-xs text-surface-400">({{ plans().length }})</span></p-tab>
                                <p-tab value="prescriptions">Prescriptions <span class="ml-1 text-xs text-surface-400">({{ prescriptions().length }})</span></p-tab>
                                <p-tab value="labs">Lab Results <span class="ml-1 text-xs text-surface-400">({{ labs().length }})</span></p-tab>
                                <p-tab value="radiology">Radiology <span class="ml-1 text-xs text-surface-400">({{ radiology().length }})</span></p-tab>
                                <p-tab value="referrals">Referrals <span class="ml-1 text-xs text-surface-400">({{ referrals().length }})</span></p-tab>
                                <p-tab value="followups">Follow-ups <span class="ml-1 text-xs text-surface-400">({{ followUps().length }})</span></p-tab>
                            </p-tablist>

                            <p-tabpanels>
                                <!-- Doctor Notes -->
                                <p-tabpanel value="notes">
                                    @if (notes().length === 0) {
                                        <p class="text-surface-400 py-4 text-center m-0">No doctor notes recorded.</p>
                                    } @else {
                                        <div class="flex flex-col gap-3 pt-3">
                                            @for (n of notes(); track n.noteId) {
                                                <div class="p-3 rounded-xl border border-surface-200 dark:border-surface-700">
                                                    <div class="text-xs text-surface-400 mb-2">{{ n.authorName || n.authorEmail || 'Unknown author' }} — {{ n.createdAt | date:'medium' }}</div>
                                                    @if (n.subjective) { <div class="mb-1"><span class="font-semibold text-sm">S:</span> {{ n.subjective }}</div> }
                                                    @if (n.objective) { <div class="mb-1"><span class="font-semibold text-sm">O:</span> {{ n.objective }}</div> }
                                                    @if (n.assessment) { <div class="mb-1"><span class="font-semibold text-sm">A:</span> {{ n.assessment }}</div> }
                                                    @if (n.plan) { <div><span class="font-semibold text-sm">P:</span> {{ n.plan }}</div> }
                                                </div>
                                            }
                                        </div>
                                    }
                                </p-tabpanel>

                                <!-- Diagnoses -->
                                <p-tabpanel value="diagnoses">
                                    @if (diagnoses().length === 0) {
                                        <p class="text-surface-400 py-4 text-center m-0">No diagnoses recorded.</p>
                                    } @else {
                                        <p-table [value]="diagnoses()" styleClass="p-datatable-sm mt-3" dataKey="diagnosisId">
                                            <ng-template pTemplate="header">
                                                <tr>
                                                    <th>Code</th><th>Description</th><th>Type</th>
                                                    <th>Severity</th><th>Status</th><th>Onset</th>
                                                </tr>
                                            </ng-template>
                                            <ng-template pTemplate="body" let-d>
                                                <tr>
                                                    <td class="font-mono text-sm">{{ d.code || '—' }}</td>
                                                    <td>{{ d.description || '—' }}</td>
                                                    <td><p-tag [value]="d.type || 'unknown'" severity="info"/></td>
                                                    <td><p-tag [value]="d.severity || '—'" [severity]="severitySeverity(d.severity)"/></td>
                                                    <td><p-tag [value]="d.status || '—'" [severity]="diagStatusSeverity(d.status)"/></td>
                                                    <td>{{ d.onset || '—' }}</td>
                                                </tr>
                                            </ng-template>
                                        </p-table>
                                    }
                                </p-tabpanel>

                                <!-- Treatment Plans -->
                                <p-tabpanel value="plans">
                                    @if (plans().length === 0) {
                                        <p class="text-surface-400 py-4 text-center m-0">No treatment plans recorded.</p>
                                    } @else {
                                        <div class="flex flex-col gap-3 pt-3">
                                            @for (p of plans(); track p.planId) {
                                                <div class="p-3 rounded-xl border border-surface-200 dark:border-surface-700">
                                                    <div class="flex items-center justify-between mb-2">
                                                        <span class="font-semibold">{{ p.title || 'Untitled Plan' }}</span>
                                                        <p-tag [value]="p.status || 'unknown'" [severity]="planStatusSeverity(p.status)"/>
                                                    </div>
                                                    @if (p.description) { <p class="m-0 text-sm mb-2">{{ p.description }}</p> }
                                                    <div class="grid grid-cols-2 gap-2 text-sm text-surface-500">
                                                        <div>Start: {{ p.startDate || '—' }}</div>
                                                        <div>End: {{ p.endDate || '—' }}</div>
                                                    </div>
                                                    @if (p.goals) { <div class="mt-2 text-sm"><strong>Goals:</strong> {{ p.goals }}</div> }
                                                    @if (p.interventions) { <div class="mt-1 text-sm"><strong>Interventions:</strong> {{ p.interventions }}</div> }
                                                </div>
                                            }
                                        </div>
                                    }
                                </p-tabpanel>

                                <!-- Prescriptions -->
                                <p-tabpanel value="prescriptions">
                                    @if (prescriptions().length === 0) {
                                        <p class="text-surface-400 py-4 text-center m-0">No prescriptions recorded.</p>
                                    } @else {
                                        <div class="flex flex-col gap-4 pt-3">
                                            @for (rx of prescriptions(); track rx.prescriptionId) {
                                                <div class="p-3 rounded-xl border border-surface-200 dark:border-surface-700">
                                                    <div class="flex items-center justify-between mb-2">
                                                        <span class="text-sm text-surface-400">{{ rx.prescribedBy || '—' }} — {{ rx.prescribedDate || '—' }}</span>
                                                        <p-tag [value]="rx.status || 'unknown'" [severity]="rxStatusSeverity(rx.status)"/>
                                                    </div>
                                                    @if (rx.medications && rx.medications.length > 0) {
                                                        <p-table [value]="rx.medications" styleClass="p-datatable-sm" dataKey="name">
                                                            <ng-template pTemplate="header">
                                                                <tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr>
                                                            </ng-template>
                                                            <ng-template pTemplate="body" let-m>
                                                                <tr>
                                                                    <td class="font-medium">{{ m.name }}</td>
                                                                    <td>{{ m.dosage || '—' }}</td>
                                                                    <td>{{ m.frequency || '—' }}</td>
                                                                    <td>{{ m.duration || '—' }}</td>
                                                                </tr>
                                                            </ng-template>
                                                        </p-table>
                                                    }
                                                    @if (rx.notes) { <p class="mt-2 text-sm text-surface-500 m-0">{{ rx.notes }}</p> }
                                                </div>
                                            }
                                        </div>
                                    }
                                </p-tabpanel>

                                <!-- Lab Results -->
                                <p-tabpanel value="labs">
                                    @if (labs().length === 0) {
                                        <p class="text-surface-400 py-4 text-center m-0">No lab results recorded.</p>
                                    } @else {
                                        <div class="flex flex-col gap-4 pt-3">
                                            @for (lab of labs(); track lab.resultId) {
                                                <div class="p-3 rounded-xl border border-surface-200 dark:border-surface-700">
                                                    <div class="flex items-center justify-between mb-2">
                                                        <span class="font-semibold">{{ lab.labName || 'Lab Result' }}</span>
                                                        <p-tag [value]="lab.status || 'unknown'" [severity]="labStatusSeverity(lab.status)"/>
                                                    </div>
                                                    <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-surface-500 mb-2">
                                                        <div>Ordered: {{ lab.orderedDate || '—' }}</div>
                                                        <div>Collected: {{ lab.collectionDate || '—' }}</div>
                                                        <div>Reported: {{ lab.reportDate || '—' }}</div>
                                                        <div>By: {{ lab.orderedBy || '—' }}</div>
                                                    </div>
                                                    @if (lab.tests && lab.tests.length > 0) {
                                                        <p-table [value]="lab.tests" styleClass="p-datatable-sm" dataKey="testName">
                                                            <ng-template pTemplate="header">
                                                                <tr><th>Test</th><th>Result</th><th>Unit</th><th>Reference</th><th>Flag</th></tr>
                                                            </ng-template>
                                                            <ng-template pTemplate="body" let-t>
                                                                <tr>
                                                                    <td>{{ t.testName }}</td>
                                                                    <td class="font-medium">{{ t.result || '—' }}</td>
                                                                    <td>{{ t.unit || '—' }}</td>
                                                                    <td>{{ t.referenceRange || '—' }}</td>
                                                                    <td>
                                                                        @if (t.flag) {
                                                                            <p-tag [value]="t.flag" [severity]="labFlagSeverity(t.flag)"/>
                                                                        } @else { <span>—</span> }
                                                                    </td>
                                                                </tr>
                                                            </ng-template>
                                                        </p-table>
                                                    }
                                                    @if (lab.summary) { <p class="mt-2 text-sm m-0"><strong>Summary:</strong> {{ lab.summary }}</p> }
                                                </div>
                                            }
                                        </div>
                                    }
                                </p-tabpanel>

                                <!-- Radiology -->
                                <p-tabpanel value="radiology">
                                    @if (radiology().length === 0) {
                                        <p class="text-surface-400 py-4 text-center m-0">No radiology results recorded.</p>
                                    } @else {
                                        <div class="flex flex-col gap-3 pt-3">
                                            @for (r of radiology(); track r.resultId) {
                                                <div class="p-3 rounded-xl border border-surface-200 dark:border-surface-700">
                                                    <div class="flex items-center justify-between mb-2">
                                                        <span class="font-semibold">{{ r.modality || r.bodyPart || 'Radiology Study' }}</span>
                                                        <p-tag [value]="r.status || 'unknown'" [severity]="radiologyStatusSeverity(r.status)"/>
                                                    </div>
                                                    <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-surface-500 mb-2">
                                                        <div>Modality: {{ r.modality || '—' }}</div>
                                                        <div>Body Part: {{ r.bodyPart || '—' }}</div>
                                                        <div>Performed: {{ r.performedDate || r.orderedDate || '—' }}</div>
                                                        <div>Radiologist: {{ r.radiologistName || '—' }}</div>
                                                    </div>
                                                    @if (r.findings) { <p class="text-sm m-0 mb-1"><strong>Findings:</strong> {{ r.findings }}</p> }
                                                    @if (r.impression) { <p class="text-sm m-0"><strong>Impression:</strong> {{ r.impression }}</p> }
                                                </div>
                                            }
                                        </div>
                                    }
                                </p-tabpanel>

                                <!-- Referrals -->
                                <p-tabpanel value="referrals">
                                    @if (referrals().length === 0) {
                                        <p class="text-surface-400 py-4 text-center m-0">No referrals recorded.</p>
                                    } @else {
                                        <p-table [value]="referrals()" styleClass="p-datatable-sm mt-3" dataKey="referralId">
                                            <ng-template pTemplate="header">
                                                <tr>
                                                    <th>Referred To</th><th>Specialty</th><th>Department</th>
                                                    <th>Urgency</th><th>Status</th><th>Date</th>
                                                </tr>
                                            </ng-template>
                                            <ng-template pTemplate="body" let-ref>
                                                <tr>
                                                    <td>{{ ref.referredTo || '—' }}<br><span class="text-xs text-surface-400">{{ ref.referredToEmail || '' }}</span></td>
                                                    <td>{{ ref.specialty || '—' }}</td>
                                                    <td>{{ ref.department || '—' }}</td>
                                                    <td><p-tag [value]="ref.urgency || '—'" [severity]="urgencySeverity(ref.urgency)"/></td>
                                                    <td><p-tag [value]="ref.status || '—'" [severity]="referralStatusSeverity(ref.status)"/></td>
                                                    <td>{{ ref.referralDate || '—' }}</td>
                                                </tr>
                                            </ng-template>
                                        </p-table>
                                    }
                                </p-tabpanel>

                                <!-- Follow-ups -->
                                <p-tabpanel value="followups">
                                    @if (followUps().length === 0) {
                                        <p class="text-surface-400 py-4 text-center m-0">No follow-ups recorded.</p>
                                    } @else {
                                        <p-table [value]="followUps()" styleClass="p-datatable-sm mt-3" dataKey="followUpId">
                                            <ng-template pTemplate="header">
                                                <tr>
                                                    <th>Scheduled</th><th>Type</th><th>Purpose</th>
                                                    <th>Assigned To</th><th>Status</th><th>Completed</th>
                                                </tr>
                                            </ng-template>
                                            <ng-template pTemplate="body" let-fu>
                                                <tr>
                                                    <td>{{ fu.scheduledDate || '—' }}</td>
                                                    <td>{{ fu.type || '—' }}</td>
                                                    <td>{{ fu.purpose || '—' }}</td>
                                                    <td>{{ fu.assignedTo || '—' }}</td>
                                                    <td><p-tag [value]="fu.status || '—'" [severity]="followUpStatusSeverity(fu.status)"/></td>
                                                    <td>{{ fu.completedDate || '—' }}</td>
                                                </tr>
                                            </ng-template>
                                        </p-table>
                                    }
                                </p-tabpanel>
                            </p-tabpanels>
                        </p-tabs>
                    }
                </div>
            </div>
        </div>
    `,
    styles: [`
        .detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
        .detail-grid div { display: flex; flex-direction: column; gap: 0.3rem; }
        .detail-grid span { font-size: 0.85rem; color: var(--text-color-secondary); }
        .detail-grid .col-span-2 { grid-column: span 2; }
    `]
})
export class ConsultationDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private consultationService = inject(ConsultationService);
    private notesService = inject(DoctorNotesService);
    private diagnosisService = inject(DiagnosisService);
    private planService = inject(TreatmentPlanService);
    private prescriptionService = inject(PrescriptionService);
    private labService = inject(LabResultsService);
    private radiologyService = inject(RadiologyService);
    private referralService = inject(ReferralService);
    private followUpService = inject(FollowUpService);

    patientId = signal('');
    consultation = signal<HmsConsultation | null>(null);
    notes = signal<HmsDoctorNote[]>([]);
    diagnoses = signal<HmsDiagnosis[]>([]);
    plans = signal<HmsTreatmentPlan[]>([]);
    prescriptions = signal<HmsPrescription[]>([]);
    labs = signal<HmsLabResult[]>([]);
    radiology = signal<HmsRadiologyResult[]>([]);
    referrals = signal<HmsReferral[]>([]);
    followUps = signal<HmsFollowUp[]>([]);
    loading = signal(true);
    loadingSubs = signal(true);

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id') ?? '';
        const pid = this.route.snapshot.queryParamMap.get('patientId') ?? '';
        this.patientId.set(pid);

        this.consultationService.getById(id, pid)
            .pipe(catchError(() => of(null)))
            .subscribe((c) => { this.consultation.set(c); this.loading.set(false); });

        forkJoin({
            notes: this.notesService.getAll(id).pipe(catchError(() => of([]))),
            diagnoses: this.diagnosisService.getAll(id).pipe(catchError(() => of([]))),
            plans: this.planService.getAll(id).pipe(catchError(() => of([]))),
            prescriptions: this.prescriptionService.getAll(id).pipe(catchError(() => of([]))),
            labs: this.labService.getAll(id).pipe(catchError(() => of([]))),
            radiology: this.radiologyService.getAll(id).pipe(catchError(() => of([]))),
            referrals: this.referralService.getAll(id).pipe(catchError(() => of([]))),
            followUps: this.followUpService.getAll(id).pipe(catchError(() => of([])))
        }).subscribe(({ notes, diagnoses, plans, prescriptions, labs, radiology, referrals, followUps }) => {
            this.notes.set(notes);
            this.diagnoses.set(diagnoses);
            this.plans.set(plans);
            this.prescriptions.set(prescriptions);
            this.labs.set(labs);
            this.radiology.set(radiology);
            this.referrals.set(referrals);
            this.followUps.set(followUps);
            this.loadingSubs.set(false);
        });
    }

    statusSeverity(s?: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
        const m: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'secondary'> = {
            completed: 'success', draft: 'warn', 'in-progress': 'info', cancelled: 'danger'
        };
        return m[(s ?? '').toLowerCase()] ?? 'secondary';
    }

    severitySeverity(s?: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
        const m: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'secondary'> = {
            mild: 'success', moderate: 'warn', severe: 'danger'
        };
        return m[(s ?? '').toLowerCase()] ?? 'secondary';
    }

    diagStatusSeverity(s?: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
        const m: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'secondary'> = {
            active: 'info', resolved: 'success', chronic: 'warn'
        };
        return m[(s ?? '').toLowerCase()] ?? 'secondary';
    }

    planStatusSeverity(s?: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
        const m: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'secondary'> = {
            active: 'info', completed: 'success', cancelled: 'danger'
        };
        return m[(s ?? '').toLowerCase()] ?? 'secondary';
    }

    rxStatusSeverity(s?: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
        const m: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'secondary'> = {
            active: 'info', dispensed: 'success', cancelled: 'danger'
        };
        return m[(s ?? '').toLowerCase()] ?? 'secondary';
    }

    labStatusSeverity(s?: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
        const m: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'secondary'> = {
            completed: 'success', pending: 'warn', processing: 'info', cancelled: 'danger', collected: 'info'
        };
        return m[(s ?? '').toLowerCase()] ?? 'secondary';
    }

    labFlagSeverity(f?: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
        const m: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'secondary'> = {
            normal: 'success', high: 'warn', low: 'info', critical: 'danger'
        };
        return m[(f ?? '').toLowerCase()] ?? 'secondary';
    }

    urgencySeverity(u?: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
        const m: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'secondary'> = {
            routine: 'secondary', urgent: 'warn', emergency: 'danger'
        };
        return m[(u ?? '').toLowerCase()] ?? 'secondary';
    }

    referralStatusSeverity(s?: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
        const m: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'secondary'> = {
            pending: 'warn', accepted: 'info', completed: 'success', rejected: 'danger'
        };
        return m[(s ?? '').toLowerCase()] ?? 'secondary';
    }

    radiologyStatusSeverity(s?: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
        const m: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'secondary'> = {
            pending: 'warn', scheduled: 'info', performed: 'info', reported: 'success', cancelled: 'danger'
        };
        return m[(s ?? '').toLowerCase()] ?? 'secondary';
    }

    followUpStatusSeverity(s?: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
        const m: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'secondary'> = {
            scheduled: 'info', completed: 'success', missed: 'danger', cancelled: 'secondary'
        };
        return m[(s ?? '').toLowerCase()] ?? 'secondary';
    }
}

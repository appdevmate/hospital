import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { catchError, of } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { PatientService, HmsPatient } from '@/pages/service/hms/patient.service';
import { ConsultationService, HmsConsultation } from '@/pages/service/hms/consultation.service';

@Component({
    selector: 'app-patient-detail',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [MessageService],
    imports: [CommonModule, RouterModule, ButtonModule, SkeletonModule, TagModule, DividerModule, ToastModule],
    template: `
        <p-toast></p-toast>

        <div class="grid grid-cols-12 gap-6">

            <!-- Header -->
            <div class="col-span-12">
                <div class="card flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    @if (loading()) {
                        <p-skeleton width="16rem" height="2rem"></p-skeleton>
                    } @else if (patient()) {
                        <div>
                            <div class="text-primary text-sm font-semibold uppercase tracking-wide mb-1">Patient</div>
                            <h1 class="text-3xl font-bold m-0">{{ patient()!.name }}</h1>
                            <div class="flex gap-2 mt-2">
                                <p-tag [value]="patient()!.status || 'Unknown'" [severity]="statusSeverity(patient()!.status)"/>
                                @if (patient()!.department) { <p-tag [value]="patient()!.department!" severity="info"/> }
                                @if (patient()!.specialization) { <p-tag [value]="patient()!.specialization!" severity="contrast"/> }
                            </div>
                        </div>
                    }
                    <div class="flex gap-2">
                        <p-button label="Edit" icon="pi pi-pencil" severity="secondary" [outlined]="true"
                            [routerLink]="['edit']"></p-button>
                        <p-button label="New Consultation" icon="pi pi-plus"
                            routerLink="/hms/consultations/new" [queryParams]="{patientId: patientId()}"></p-button>
                        <p-button icon="pi pi-arrow-left" [text]="true" severity="secondary"
                            routerLink="/hms/patients" pTooltip="Back to list"></p-button>
                    </div>
                </div>
            </div>

            <!-- Demographics -->
            <div class="col-span-12 md:col-span-6">
                <div class="card h-full">
                    <h2 class="text-lg font-semibold mt-0 mb-4">Demographics</h2>
                    @if (loading()) {
                        <div class="flex flex-col gap-3">
                            @for (i of [1,2,3,4]; track i) { <p-skeleton width="100%" height="2rem"></p-skeleton> }
                        </div>
                    } @else if (patient()) {
                        <div class="detail-grid">
                            <div><span>Email</span><strong>{{ patient()!.email || '—' }}</strong></div>
                            <div><span>Phone</span><strong>{{ patient()!.phone || '—' }}</strong></div>
                            <div><span>Gender</span><strong>{{ patient()!.gender || '—' }}</strong></div>
                            <div><span>Date of Birth</span><strong>{{ patient()!.dob || '—' }}</strong></div>
                            <div><span>Blood Group</span><strong>{{ patient()!.bloodGroup || '—' }}</strong></div>
                            <div><span>Insurance</span><strong>{{ patient()!.insurance || '—' }}</strong></div>
                        </div>
                    }
                </div>
            </div>

            <!-- Clinical Context -->
            <div class="col-span-12 md:col-span-6">
                <div class="card h-full">
                    <h2 class="text-lg font-semibold mt-0 mb-4">Clinical Context</h2>
                    @if (loading()) {
                        <div class="flex flex-col gap-3">
                            @for (i of [1,2,3,4]; track i) { <p-skeleton width="100%" height="2rem"></p-skeleton> }
                        </div>
                    } @else if (patient()) {
                        <div class="detail-grid">
                            <div><span>Department</span><strong>{{ patient()!.department || '—' }}</strong></div>
                            <div><span>Specialization</span><strong>{{ patient()!.specialization || '—' }}</strong></div>
                            <div><span>Ward</span><strong>{{ patient()!.ward || '—' }}</strong></div>
                            <div><span>Bed Number</span><strong>{{ patient()!.bedNumber || '—' }}</strong></div>
                            <div><span>Admission Date</span><strong>{{ patient()!.admissionDate || '—' }}</strong></div>
                            <div><span>Patient ID</span><strong class="font-mono text-sm">{{ patient()!.patientId }}</strong></div>
                        </div>
                    }
                </div>
            </div>

            <!-- Medical Summary -->
            <div class="col-span-12">
                <div class="card">
                    <h2 class="text-lg font-semibold mt-0 mb-4">Medical Summary</h2>
                    @if (loading()) {
                        <p-skeleton width="100%" height="6rem"></p-skeleton>
                    } @else if (patient()) {
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <div class="text-sm text-surface-500 mb-1">Medical History</div>
                                <p class="m-0">{{ patient()!.medicalHistory || 'None recorded.' }}</p>
                            </div>
                            <div>
                                <div class="text-sm text-surface-500 mb-1">Notes</div>
                                <p class="m-0">{{ patient()!.notes || 'None recorded.' }}</p>
                            </div>
                            <div>
                                <div class="text-sm text-surface-500 mb-1">Allergies</div>
                                <p class="m-0">{{ patient()!.allergies?.join(', ') || 'None recorded.' }}</p>
                            </div>
                            <div>
                                <div class="text-sm text-surface-500 mb-1">Medications</div>
                                <p class="m-0">{{ patient()!.medications?.join(', ') || 'None recorded.' }}</p>
                            </div>
                        </div>
                    }
                </div>
            </div>

            <!-- Consultation History -->
            <div class="col-span-12">
                <div class="card">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-lg font-semibold m-0">Consultation History</h2>
                        <span class="text-surface-500 text-sm">{{ consultations().length }} record(s)</span>
                    </div>
                    @if (loadingConsultations()) {
                        <div class="flex flex-col gap-2">
                            @for (i of [1,2,3]; track i) { <p-skeleton width="100%" height="3rem"></p-skeleton> }
                        </div>
                    } @else if (consultations().length === 0) {
                        <div class="text-center py-8 text-surface-400">
                            <i class="pi pi-clipboard text-4xl block mb-2"></i>No consultations recorded.
                        </div>
                    } @else {
                        <div class="flex flex-col gap-2">
                            @for (c of consultations(); track c.consultationId) {
                                <a class="flex items-center justify-between p-3 rounded-xl border border-surface-200 dark:border-surface-700
                                          hover:bg-surface-50 dark:hover:bg-surface-800 cursor-pointer no-underline text-inherit"
                                   [routerLink]="['/hms/consultations', c.consultationId]"
                                   [queryParams]="{patientId: c.patientId}">
                                    <div>
                                        <div class="font-medium">{{ c.date || 'No date' }} — {{ c.type || 'General' }}</div>
                                        <div class="text-sm text-surface-500">{{ c.chiefComplaint || 'No chief complaint' }}</div>
                                    </div>
                                    <p-tag [value]="c.status || 'Unknown'" [severity]="consultationSeverity(c.status)"/>
                                </a>
                            }
                        </div>
                    }
                </div>
            </div>
        </div>
    `,
    styles: [`
        .detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
        .detail-grid div { display: flex; flex-direction: column; gap: 0.3rem; }
        .detail-grid span { font-size: 0.85rem; color: var(--text-color-secondary); }
    `]
})
export class PatientDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private patientService = inject(PatientService);
    private consultationService = inject(ConsultationService);

    patientId = signal('');
    patient = signal<HmsPatient | null>(null);
    consultations = signal<HmsConsultation[]>([]);
    loading = signal(true);
    loadingConsultations = signal(true);

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id') ?? '';
        this.patientId.set(id);

        this.patientService.getById(id)
            .pipe(catchError(() => of(null)))
            .subscribe((p) => { this.patient.set(p); this.loading.set(false); });

        this.consultationService.getAll(id)
            .pipe(catchError(() => of([])))
            .subscribe((list) => {
                this.consultations.set(list.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')));
                this.loadingConsultations.set(false);
            });
    }

    statusSeverity(s?: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
        const m: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'secondary'> = {
            admitted: 'warn', discharged: 'success', stable: 'success', critical: 'danger',
            'under treatment': 'info', 'under observation': 'info'
        };
        return m[(s ?? '').toLowerCase()] ?? 'secondary';
    }

    consultationSeverity(s?: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
        const m: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'secondary'> = {
            completed: 'success', draft: 'warn', 'in-progress': 'info', cancelled: 'danger'
        };
        return m[(s ?? '').toLowerCase()] ?? 'secondary';
    }
}

import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { DividerModule } from 'primeng/divider';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';

import { ConsultationService, HmsConsultation, CreateConsultationRequest, UpdateConsultationRequest } from '@/pages/service/hms/consultation.service';

@Component({
    selector: 'app-consultation-form',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [MessageService],
    imports: [
        CommonModule, RouterModule, FormsModule,
        ButtonModule, InputTextModule, SelectModule, TextareaModule,
        ToastModule, DividerModule, SkeletonModule
    ],
    template: `
        <p-toast></p-toast>
        <div class="card">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <div class="text-primary text-sm font-semibold uppercase tracking-wide mb-1">HMS / Consultations</div>
                    <h1 class="text-3xl font-bold m-0">{{ editMode() ? 'Edit Consultation' : 'New Consultation' }}</h1>
                </div>
                <p-button icon="pi pi-arrow-left" [text]="true" severity="secondary" routerLink="/hms/consultations" pTooltip="Back to list"></p-button>
            </div>

            @if (loading()) {
                <div class="flex flex-col gap-3">
                    @for (i of [1,2,3,4,5]; track i) { <p-skeleton width="100%" height="2.5rem"></p-skeleton> }
                </div>
            } @else {
                <form #f="ngForm" (ngSubmit)="save(f.valid)" class="grid grid-cols-12 gap-x-6 gap-y-4">

                    <div class="col-span-12">
                        <p-divider align="left"><span class="font-semibold text-sm">Patient &amp; Doctor</span></p-divider>
                    </div>

                    <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                        <label class="text-sm font-medium">Patient ID <span class="text-red-500">*</span></label>
                        <input pInputText name="patientId" [(ngModel)]="form.patientId" required placeholder="Patient UUID" />
                    </div>
                    <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                        <label class="text-sm font-medium">Patient Name</label>
                        <input pInputText name="patientName" [(ngModel)]="form.patientName" placeholder="Patient display name" />
                    </div>
                    <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                        <label class="text-sm font-medium">Doctor Name</label>
                        <input pInputText name="doctorName" [(ngModel)]="form.doctorName" placeholder="Dr. Full Name" />
                    </div>
                    <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                        <label class="text-sm font-medium">Doctor Email</label>
                        <input pInputText name="doctorEmail" [(ngModel)]="form.doctorEmail" type="email" placeholder="doctor@hospital.com" />
                    </div>

                    <div class="col-span-12">
                        <p-divider align="left"><span class="font-semibold text-sm">Consultation Info</span></p-divider>
                    </div>

                    <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                        <label class="text-sm font-medium">Date</label>
                        <input pInputText name="date" [(ngModel)]="form.date" type="date" />
                    </div>
                    <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                        <label class="text-sm font-medium">Type</label>
                        <p-select name="type" [(ngModel)]="form.type" [options]="typeOptions" placeholder="Select type" styleClass="w-full" />
                    </div>
                    <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                        <label class="text-sm font-medium">Status</label>
                        <p-select name="status" [(ngModel)]="form.status" [options]="statusOptions" placeholder="Select status" styleClass="w-full" />
                    </div>
                    <div class="col-span-12 flex flex-col gap-1">
                        <label class="text-sm font-medium">Chief Complaint</label>
                        <textarea pTextarea name="chiefComplaint" [(ngModel)]="form.chiefComplaint" rows="2"
                            placeholder="Primary reason for the consultation"></textarea>
                    </div>

                    <div class="col-span-12">
                        <p-divider align="left"><span class="font-semibold text-sm">Vital Signs</span></p-divider>
                    </div>

                    <div class="col-span-12 md:col-span-4 flex flex-col gap-1">
                        <label class="text-sm font-medium">Temperature</label>
                        <input pInputText name="temperature" [(ngModel)]="vitalSigns.temperature" placeholder="e.g. 37.2°C" />
                    </div>
                    <div class="col-span-12 md:col-span-4 flex flex-col gap-1">
                        <label class="text-sm font-medium">Blood Pressure</label>
                        <input pInputText name="bloodPressure" [(ngModel)]="vitalSigns.bloodPressure" placeholder="e.g. 120/80 mmHg" />
                    </div>
                    <div class="col-span-12 md:col-span-4 flex flex-col gap-1">
                        <label class="text-sm font-medium">Heart Rate</label>
                        <input pInputText name="heartRate" [(ngModel)]="vitalSigns.heartRate" placeholder="e.g. 72 bpm" />
                    </div>
                    <div class="col-span-12 md:col-span-4 flex flex-col gap-1">
                        <label class="text-sm font-medium">Respiratory Rate</label>
                        <input pInputText name="respiratoryRate" [(ngModel)]="vitalSigns.respiratoryRate" placeholder="e.g. 16 /min" />
                    </div>
                    <div class="col-span-12 md:col-span-4 flex flex-col gap-1">
                        <label class="text-sm font-medium">O₂ Saturation</label>
                        <input pInputText name="oxygenSaturation" [(ngModel)]="vitalSigns.oxygenSaturation" placeholder="e.g. 98%" />
                    </div>
                    <div class="col-span-12 md:col-span-2 flex flex-col gap-1">
                        <label class="text-sm font-medium">Weight</label>
                        <input pInputText name="weight" [(ngModel)]="vitalSigns.weight" placeholder="e.g. 70 kg" />
                    </div>
                    <div class="col-span-12 md:col-span-2 flex flex-col gap-1">
                        <label class="text-sm font-medium">Height</label>
                        <input pInputText name="height" [(ngModel)]="vitalSigns.height" placeholder="e.g. 175 cm" />
                    </div>

                    <div class="col-span-12">
                        <p-divider align="left"><span class="font-semibold text-sm">Notes</span></p-divider>
                    </div>

                    <div class="col-span-12 flex flex-col gap-1">
                        <label class="text-sm font-medium">Notes</label>
                        <textarea pTextarea name="notes" [(ngModel)]="form.notes" rows="4"
                            placeholder="General consultation notes"></textarea>
                    </div>

                    <div class="col-span-12 flex justify-end gap-2 pt-2">
                        <p-button label="Cancel" severity="secondary" [outlined]="true" routerLink="/hms/consultations"></p-button>
                        <p-button type="submit" [label]="editMode() ? 'Save Changes' : 'Create Consultation'"
                            [loading]="saving()" [disabled]="f.invalid"></p-button>
                    </div>
                </form>
            }
        </div>
    `
})
export class ConsultationFormComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private consultationService = inject(ConsultationService);
    private messageService = inject(MessageService);

    editMode = signal(false);
    loading = signal(false);
    saving = signal(false);

    form: Partial<HmsConsultation> = {};
    vitalSigns: NonNullable<HmsConsultation['vitalSigns']> = {};
    private consultationId = '';
    private patientId = '';

    readonly typeOptions = ['General', 'Specialist', 'Emergency', 'Follow-up', 'Telemedicine', 'Pre-op', 'Post-op'];
    readonly statusOptions = ['Draft', 'In-Progress', 'Completed', 'Cancelled'];

    ngOnInit(): void {
        this.patientId = this.route.snapshot.queryParamMap.get('patientId') ?? '';
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.editMode.set(true);
            this.consultationId = id;
            this.loading.set(true);
            this.consultationService.getById(id, this.patientId)
                .pipe(catchError(() => of(null)))
                .subscribe((c) => {
                    if (c) {
                        const { consultationId: _id, createdAt: _c, updatedAt: _u, vitalSigns, ...rest } = c;
                        this.form = rest;
                        this.vitalSigns = { ...vitalSigns };
                    }
                    this.loading.set(false);
                });
        } else if (this.patientId) {
            this.form.patientId = this.patientId;
        }
    }

    save(valid: boolean | null): void {
        if (!valid) return;
        const payload: Partial<HmsConsultation> = {
            ...this.form,
            vitalSigns: { ...this.vitalSigns }
        };
        this.saving.set(true);
        const pid = payload.patientId ?? this.patientId;

        if (this.editMode()) {
            const { patientId: _p, consultationId: _id, ...updatePayload } = payload;
            this.consultationService.update(this.consultationId, pid, updatePayload as UpdateConsultationRequest).subscribe({
                next: () => {
                    this.saving.set(false);
                    this.router.navigate(['/hms/consultations', this.consultationId], { queryParams: { patientId: pid } });
                },
                error: (e: Error) => {
                    this.saving.set(false);
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: e.message });
                }
            });
        } else {
            this.consultationService.create(payload as CreateConsultationRequest).subscribe({
                next: (c) => {
                    this.saving.set(false);
                    this.router.navigate(['/hms/consultations', c.consultationId], { queryParams: { patientId: c.patientId } });
                },
                error: (e: Error) => {
                    this.saving.set(false);
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: e.message });
                }
            });
        }
    }
}

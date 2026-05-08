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

import { PatientService, HmsPatient, CreatePatientRequest, UpdatePatientRequest } from '@/pages/service/hms/patient.service';

@Component({
    selector: 'app-patient-form',
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
                    <div class="text-primary text-sm font-semibold uppercase tracking-wide mb-1">HMS / Patients</div>
                    <h1 class="text-3xl font-bold m-0">{{ editMode() ? 'Edit Patient' : 'New Patient' }}</h1>
                </div>
                <p-button icon="pi pi-arrow-left" [text]="true" severity="secondary" routerLink="/hms/patients" pTooltip="Back to list"></p-button>
            </div>

            @if (loading()) {
                <div class="flex flex-col gap-3">
                    @for (i of [1,2,3,4,5,6]; track i) { <p-skeleton width="100%" height="2.5rem"></p-skeleton> }
                </div>
            } @else {
                <form #f="ngForm" (ngSubmit)="save(f.valid)" class="grid grid-cols-12 gap-x-6 gap-y-4">

                    <div class="col-span-12">
                        <p-divider align="left"><span class="font-semibold text-sm">Identity</span></p-divider>
                    </div>

                    <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                        <label class="text-sm font-medium">Full Name <span class="text-red-500">*</span></label>
                        <input pInputText name="name" [(ngModel)]="form.name" required placeholder="Patient full name" />
                    </div>
                    <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                        <label class="text-sm font-medium">Email</label>
                        <input pInputText name="email" [(ngModel)]="form.email" type="email" placeholder="email@example.com" />
                    </div>
                    <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                        <label class="text-sm font-medium">Phone</label>
                        <input pInputText name="phone" [(ngModel)]="form.phone" placeholder="+1 555 000 0000" />
                    </div>
                    <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                        <label class="text-sm font-medium">Gender</label>
                        <p-select name="gender" [(ngModel)]="form.gender" [options]="genderOptions" placeholder="Select gender" styleClass="w-full" />
                    </div>
                    <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                        <label class="text-sm font-medium">Date of Birth</label>
                        <input pInputText name="dob" [(ngModel)]="form.dob" type="date" />
                    </div>
                    <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                        <label class="text-sm font-medium">Blood Group</label>
                        <p-select name="bloodGroup" [(ngModel)]="form.bloodGroup" [options]="bloodGroupOptions" placeholder="Select blood group" styleClass="w-full" />
                    </div>
                    <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                        <label class="text-sm font-medium">Insurance</label>
                        <input pInputText name="insurance" [(ngModel)]="form.insurance" placeholder="Insurance provider or policy number" />
                    </div>

                    <div class="col-span-12">
                        <p-divider align="left"><span class="font-semibold text-sm">Clinical</span></p-divider>
                    </div>

                    <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                        <label class="text-sm font-medium">Status</label>
                        <p-select name="status" [(ngModel)]="form.status" [options]="statusOptions" placeholder="Select status" styleClass="w-full" />
                    </div>
                    <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                        <label class="text-sm font-medium">Department</label>
                        <input pInputText name="department" [(ngModel)]="form.department" placeholder="e.g. Cardiology" />
                    </div>
                    <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                        <label class="text-sm font-medium">Specialization</label>
                        <input pInputText name="specialization" [(ngModel)]="form.specialization" placeholder="e.g. Interventional Cardiology" />
                    </div>
                    <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                        <label class="text-sm font-medium">Ward</label>
                        <input pInputText name="ward" [(ngModel)]="form.ward" placeholder="Ward name or number" />
                    </div>
                    <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                        <label class="text-sm font-medium">Bed Number</label>
                        <input pInputText name="bedNumber" [(ngModel)]="form.bedNumber" placeholder="Bed identifier" />
                    </div>
                    <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                        <label class="text-sm font-medium">Admission Date</label>
                        <input pInputText name="admissionDate" [(ngModel)]="form.admissionDate" type="date" />
                    </div>

                    <div class="col-span-12">
                        <p-divider align="left"><span class="font-semibold text-sm">Medical History</span></p-divider>
                    </div>

                    <div class="col-span-12 flex flex-col gap-1">
                        <label class="text-sm font-medium">Medical History</label>
                        <textarea pTextarea name="medicalHistory" [(ngModel)]="form.medicalHistory" rows="3"
                            placeholder="Prior conditions, surgeries, chronic illnesses…"></textarea>
                    </div>
                    <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                        <label class="text-sm font-medium">Allergies <span class="text-surface-400 text-xs">(comma-separated)</span></label>
                        <input pInputText name="allergies" [(ngModel)]="allergiesStr" placeholder="Penicillin, Aspirin, Latex" />
                    </div>
                    <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                        <label class="text-sm font-medium">Medications <span class="text-surface-400 text-xs">(comma-separated)</span></label>
                        <input pInputText name="medications" [(ngModel)]="medicationsStr" placeholder="Metformin 500mg, Lisinopril 10mg" />
                    </div>
                    <div class="col-span-12 flex flex-col gap-1">
                        <label class="text-sm font-medium">Notes</label>
                        <textarea pTextarea name="notes" [(ngModel)]="form.notes" rows="3"
                            placeholder="Additional clinical or administrative notes"></textarea>
                    </div>

                    <div class="col-span-12 flex justify-end gap-2 pt-2">
                        <p-button label="Cancel" severity="secondary" [outlined]="true" routerLink="/hms/patients"></p-button>
                        <p-button type="submit" [label]="editMode() ? 'Save Changes' : 'Create Patient'"
                            [loading]="saving()" [disabled]="f.invalid"></p-button>
                    </div>
                </form>
            }
        </div>
    `
})
export class PatientFormComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private patientService = inject(PatientService);
    private messageService = inject(MessageService);

    editMode = signal(false);
    loading = signal(false);
    saving = signal(false);

    form: Partial<HmsPatient> = {};
    allergiesStr = '';
    medicationsStr = '';
    private patientId = '';

    readonly genderOptions = ['Male', 'Female', 'Other'];
    readonly bloodGroupOptions = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    readonly statusOptions = ['Admitted', 'Discharged', 'Stable', 'Critical', 'Under Treatment', 'Under Observation'];

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.editMode.set(true);
            this.patientId = id;
            this.loading.set(true);
            this.patientService.getById(id)
                .pipe(catchError(() => of(null)))
                .subscribe((p) => {
                    if (p) {
                        const { patientId: _id, createdAt: _c, updatedAt: _u, allergies, medications, ...rest } = p;
                        this.form = rest;
                        this.allergiesStr = (allergies ?? []).join(', ');
                        this.medicationsStr = (medications ?? []).join(', ');
                    }
                    this.loading.set(false);
                });
        }
    }

    save(valid: boolean | null): void {
        if (!valid) return;
        const payload = {
            ...this.form,
            allergies: this.allergiesStr.split(',').map((s) => s.trim()).filter(Boolean),
            medications: this.medicationsStr.split(',').map((s) => s.trim()).filter(Boolean)
        };

        this.saving.set(true);
        if (this.editMode()) {
            this.patientService.update(this.patientId, payload as UpdatePatientRequest).subscribe({
                next: () => {
                    this.saving.set(false);
                    this.router.navigate(['/hms/patients', this.patientId]);
                },
                error: (e: Error) => {
                    this.saving.set(false);
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: e.message });
                }
            });
        } else {
            this.patientService.create(payload as CreatePatientRequest).subscribe({
                next: (p) => {
                    this.saving.set(false);
                    this.router.navigate(['/hms/patients', p.patientId]);
                },
                error: (e: Error) => {
                    this.saving.set(false);
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: e.message });
                }
            });
        }
    }
}

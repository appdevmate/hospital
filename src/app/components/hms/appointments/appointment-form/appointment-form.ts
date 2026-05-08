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

import { AppointmentService, HmsAppointment, CreateAppointmentRequest, UpdateAppointmentRequest } from '@/pages/service/hms/appointment.service';

@Component({
    selector: 'app-appointment-form',
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
                    <div class="text-primary text-sm font-semibold uppercase tracking-wide mb-1">HMS / Appointments</div>
                    <h1 class="text-3xl font-bold m-0">{{ editMode() ? 'Edit Appointment' : 'New Appointment' }}</h1>
                </div>
                <p-button icon="pi pi-arrow-left" [text]="true" severity="secondary" routerLink="/hms/appointments" pTooltip="Back to list"></p-button>
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
                        <label class="text-sm font-medium">Doctor Name</label>
                        <input pInputText name="doctorName" [(ngModel)]="form.doctorName" placeholder="Dr. Full Name" />
                    </div>
                    <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                        <label class="text-sm font-medium">Doctor Email</label>
                        <input pInputText name="doctorEmail" [(ngModel)]="form.doctorEmail" type="email" placeholder="doctor@hospital.com" />
                    </div>

                    <div class="col-span-12">
                        <p-divider align="left"><span class="font-semibold text-sm">Schedule</span></p-divider>
                    </div>

                    <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                        <label class="text-sm font-medium">Date</label>
                        <input pInputText name="date" [(ngModel)]="form.date" type="date" />
                    </div>
                    <div class="col-span-12 md:col-span-3 flex flex-col gap-1">
                        <label class="text-sm font-medium">Start Time</label>
                        <input pInputText name="startTime" [(ngModel)]="form.startTime" type="time" />
                    </div>
                    <div class="col-span-12 md:col-span-3 flex flex-col gap-1">
                        <label class="text-sm font-medium">End Time</label>
                        <input pInputText name="endTime" [(ngModel)]="form.endTime" type="time" />
                    </div>
                    <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                        <label class="text-sm font-medium">Type</label>
                        <p-select name="type" [(ngModel)]="form.type" [options]="typeOptions" placeholder="Select type" styleClass="w-full" />
                    </div>
                    <div class="col-span-12 md:col-span-6 flex flex-col gap-1">
                        <label class="text-sm font-medium">Status</label>
                        <p-select name="status" [(ngModel)]="form.status" [options]="statusOptions" placeholder="Select status" styleClass="w-full" />
                    </div>

                    <div class="col-span-12">
                        <p-divider align="left"><span class="font-semibold text-sm">Details</span></p-divider>
                    </div>

                    <div class="col-span-12 flex flex-col gap-1">
                        <label class="text-sm font-medium">Reason for Visit</label>
                        <textarea pTextarea name="reason" [(ngModel)]="form.reason" rows="2"
                            placeholder="Chief reason for the appointment"></textarea>
                    </div>
                    <div class="col-span-12 flex flex-col gap-1">
                        <label class="text-sm font-medium">Notes</label>
                        <textarea pTextarea name="notes" [(ngModel)]="form.notes" rows="3"
                            placeholder="Additional scheduling or clinical notes"></textarea>
                    </div>

                    <div class="col-span-12 flex justify-end gap-2 pt-2">
                        <p-button label="Cancel" severity="secondary" [outlined]="true" routerLink="/hms/appointments"></p-button>
                        <p-button type="submit" [label]="editMode() ? 'Save Changes' : 'Create Appointment'"
                            [loading]="saving()" [disabled]="f.invalid"></p-button>
                    </div>
                </form>
            }
        </div>
    `
})
export class AppointmentFormComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private appointmentService = inject(AppointmentService);
    private messageService = inject(MessageService);

    editMode = signal(false);
    loading = signal(false);
    saving = signal(false);

    form: Partial<HmsAppointment> = {};
    private appointmentId = '';
    private patientId = '';

    readonly typeOptions = ['Routine', 'Emergency', 'Follow-up', 'Specialist', 'Telemedicine', 'Pre-op', 'Post-op'];
    readonly statusOptions = ['Scheduled', 'Pending', 'Confirmed', 'Completed', 'Cancelled'];

    ngOnInit(): void {
        this.patientId = this.route.snapshot.queryParamMap.get('patientId') ?? '';
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.editMode.set(true);
            this.appointmentId = id;
            this.loading.set(true);
            this.appointmentService.getById(id, this.patientId)
                .pipe(catchError(() => of(null)))
                .subscribe((a) => {
                    if (a) {
                        const { appointmentId: _id, createdAt: _c, updatedAt: _u, ...rest } = a;
                        this.form = rest;
                    }
                    this.loading.set(false);
                });
        } else if (this.patientId) {
            this.form.patientId = this.patientId;
        }
    }

    save(valid: boolean | null): void {
        if (!valid) return;
        this.saving.set(true);
        const pid = this.form.patientId ?? this.patientId;

        if (this.editMode()) {
            const { patientId: _p, ...updatePayload } = this.form;
            this.appointmentService.update(this.appointmentId, pid, updatePayload as UpdateAppointmentRequest).subscribe({
                next: () => {
                    this.saving.set(false);
                    this.router.navigate(['/hms/appointments', this.appointmentId], { queryParams: { patientId: pid } });
                },
                error: (e: Error) => {
                    this.saving.set(false);
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: e.message });
                }
            });
        } else {
            this.appointmentService.create(this.form as CreateAppointmentRequest).subscribe({
                next: (a) => {
                    this.saving.set(false);
                    this.router.navigate(['/hms/appointments', a.appointmentId], { queryParams: { patientId: a.patientId } });
                },
                error: (e: Error) => {
                    this.saving.set(false);
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: e.message });
                }
            });
        }
    }
}

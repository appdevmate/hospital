import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { catchError, of } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { AppointmentService, HmsAppointment } from '@/pages/service/hms/appointment.service';

@Component({
    selector: 'app-appointment-detail',
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
                    } @else if (appointment()) {
                        <div>
                            <div class="text-primary text-sm font-semibold uppercase tracking-wide mb-1">HMS / Appointments</div>
                            <h1 class="text-3xl font-bold m-0">Appointment — {{ appointment()!.date || 'No date' }}</h1>
                            <div class="flex gap-2 mt-2">
                                <p-tag [value]="appointment()!.status || 'Unknown'" [severity]="statusSeverity(appointment()!.status)"/>
                                @if (appointment()!.type) { <p-tag [value]="appointment()!.type!" severity="info"/> }
                            </div>
                        </div>
                    }
                    <div class="flex gap-2">
                        <p-button label="Edit" icon="pi pi-pencil" severity="secondary" [outlined]="true"
                            [routerLink]="['edit']" [queryParams]="{patientId: appointment()?.patientId}"></p-button>
                        <p-button icon="pi pi-arrow-left" [text]="true" severity="secondary"
                            routerLink="/hms/appointments" pTooltip="Back to list"></p-button>
                    </div>
                </div>
            </div>

            <!-- Details -->
            <div class="col-span-12 md:col-span-6">
                <div class="card h-full">
                    <h2 class="text-lg font-semibold mt-0 mb-4">Appointment Details</h2>
                    @if (loading()) {
                        <div class="flex flex-col gap-3">
                            @for (i of [1,2,3,4]; track i) { <p-skeleton width="100%" height="2rem"></p-skeleton> }
                        </div>
                    } @else if (appointment()) {
                        <div class="detail-grid">
                            <div><span>Date</span><strong>{{ appointment()!.date || '—' }}</strong></div>
                            <div><span>Start Time</span><strong>{{ appointment()!.startTime || '—' }}</strong></div>
                            <div><span>End Time</span><strong>{{ appointment()!.endTime || '—' }}</strong></div>
                            <div><span>Type</span><strong>{{ appointment()!.type || '—' }}</strong></div>
                            <div><span>Status</span><strong>{{ appointment()!.status || '—' }}</strong></div>
                        </div>
                    }
                </div>
            </div>

            <!-- People -->
            <div class="col-span-12 md:col-span-6">
                <div class="card h-full">
                    <h2 class="text-lg font-semibold mt-0 mb-4">Personnel</h2>
                    @if (loading()) {
                        <div class="flex flex-col gap-3">
                            @for (i of [1,2,3]; track i) { <p-skeleton width="100%" height="2rem"></p-skeleton> }
                        </div>
                    } @else if (appointment()) {
                        <div class="detail-grid">
                            <div><span>Patient ID</span>
                                <a class="font-mono text-sm text-primary hover:underline"
                                   [routerLink]="['/hms/patients', appointment()!.patientId]">{{ appointment()!.patientId }}</a>
                            </div>
                            <div><span>Doctor</span><strong>{{ appointment()!.doctorName || '—' }}</strong></div>
                            <div><span>Doctor Email</span><strong>{{ appointment()!.doctorEmail || '—' }}</strong></div>
                        </div>
                    }
                </div>
            </div>

            <!-- Notes -->
            <div class="col-span-12">
                <div class="card">
                    <h2 class="text-lg font-semibold mt-0 mb-4">Reason &amp; Notes</h2>
                    @if (loading()) {
                        <p-skeleton width="100%" height="5rem"></p-skeleton>
                    } @else if (appointment()) {
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <div class="text-sm text-surface-500 mb-1">Reason for Visit</div>
                                <p class="m-0">{{ appointment()!.reason || 'None recorded.' }}</p>
                            </div>
                            <div>
                                <div class="text-sm text-surface-500 mb-1">Notes</div>
                                <p class="m-0">{{ appointment()!.notes || 'None recorded.' }}</p>
                            </div>
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
export class AppointmentDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private appointmentService = inject(AppointmentService);

    appointment = signal<HmsAppointment | null>(null);
    loading = signal(true);

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id') ?? '';
        const patientId = this.route.snapshot.queryParamMap.get('patientId') ?? '';

        this.appointmentService.getById(id, patientId)
            .pipe(catchError(() => of(null)))
            .subscribe((a) => { this.appointment.set(a); this.loading.set(false); });
    }

    statusSeverity(s?: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
        const m: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'secondary'> = {
            completed: 'success', scheduled: 'info', pending: 'warn',
            cancelled: 'danger', confirmed: 'success'
        };
        return m[(s ?? '').toLowerCase()] ?? 'secondary';
    }
}

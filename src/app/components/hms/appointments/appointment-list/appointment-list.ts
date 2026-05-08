import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

import { AppointmentService, HmsAppointment } from '@/pages/service/hms/appointment.service';

@Component({
    selector: 'app-appointment-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [ConfirmationService, MessageService],
    imports: [
        CommonModule, RouterModule, FormsModule,
        TableModule, ButtonModule, InputTextModule, TagModule,
        SkeletonModule, ToastModule, ConfirmDialogModule,
        IconFieldModule, InputIconModule
    ],
    template: `
        <p-toast></p-toast>
        <p-confirmDialog></p-confirmDialog>

        <div class="card">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <div class="text-primary text-sm font-semibold uppercase tracking-wide mb-1">HMS</div>
                    <h1 class="text-3xl font-bold m-0">Appointments</h1>
                    <p class="text-surface-500 mt-2 mb-0">Schedule and track all patient appointments.</p>
                </div>
                <p-button label="New Appointment" icon="pi pi-plus" routerLink="new"></p-button>
            </div>

            @if (loading()) {
                <div class="flex flex-col gap-3">
                    @for (i of [1,2,3,4,5]; track i) {
                        <p-skeleton width="100%" height="3rem"></p-skeleton>
                    }
                </div>
            } @else {
                <p-table
                    [value]="appointments()"
                    [paginator]="true"
                    [rows]="20"
                    [rowsPerPageOptions]="[10, 20, 50]"
                    [globalFilterFields]="['patientId','doctorName','date','type','status']"
                    #dt
                    dataKey="appointmentId"
                    sortField="date"
                    [sortOrder]="-1"
                    styleClass="p-datatable-sm">

                    <ng-template pTemplate="caption">
                        <div class="flex justify-end">
                            <p-iconfield>
                                <p-inputicon styleClass="pi pi-search"/>
                                <input pInputText type="text" placeholder="Search appointments…"
                                    (input)="dt.filterGlobal($any($event.target).value, 'contains')"/>
                            </p-iconfield>
                        </div>
                    </ng-template>

                    <ng-template pTemplate="header">
                        <tr>
                            <th pSortableColumn="date">Date <p-sortIcon field="date"/></th>
                            <th>Time</th>
                            <th>Patient ID</th>
                            <th pSortableColumn="doctorName">Doctor <p-sortIcon field="doctorName"/></th>
                            <th pSortableColumn="type">Type <p-sortIcon field="type"/></th>
                            <th pSortableColumn="status">Status <p-sortIcon field="status"/></th>
                            <th style="width:8rem">Actions</th>
                        </tr>
                    </ng-template>

                    <ng-template pTemplate="body" let-appt>
                        <tr>
                            <td>{{ appt.date || '—' }}</td>
                            <td>{{ appt.startTime || '—' }}{{ appt.endTime ? ' – ' + appt.endTime : '' }}</td>
                            <td><span class="font-mono text-sm">{{ appt.patientId | slice:0:8 }}…</span></td>
                            <td>{{ appt.doctorName || appt.doctorEmail || '—' }}</td>
                            <td>{{ appt.type || '—' }}</td>
                            <td><p-tag [value]="appt.status || 'Unknown'" [severity]="statusSeverity(appt.status)"/></td>
                            <td>
                                <div class="flex gap-1">
                                    <p-button icon="pi pi-eye" [rounded]="true" [text]="true" severity="info"
                                        [routerLink]="[appt.appointmentId]" [queryParams]="{patientId: appt.patientId}" pTooltip="View"></p-button>
                                    <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="secondary"
                                        [routerLink]="[appt.appointmentId, 'edit']" [queryParams]="{patientId: appt.patientId}" pTooltip="Edit"></p-button>
                                    <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger"
                                        (onClick)="confirmDelete(appt)" pTooltip="Delete"></p-button>
                                </div>
                            </td>
                        </tr>
                    </ng-template>

                    <ng-template pTemplate="emptymessage">
                        <tr><td colspan="7" class="text-center py-8 text-surface-400">No appointments found.</td></tr>
                    </ng-template>
                </p-table>
            }
        </div>
    `
})
export class AppointmentListComponent implements OnInit {
    private appointmentService = inject(AppointmentService);
    private confirmationService = inject(ConfirmationService);
    private messageService = inject(MessageService);

    appointments = signal<HmsAppointment[]>([]);
    loading = signal(true);

    ngOnInit(): void {
        this.load();
    }

    confirmDelete(appt: HmsAppointment): void {
        this.confirmationService.confirm({
            message: `Delete this appointment on <strong>${appt.date ?? 'unknown date'}</strong>?`,
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            accept: () => this.delete(appt)
        });
    }

    statusSeverity(status?: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
        const map: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'secondary'> = {
            completed: 'success', scheduled: 'info', pending: 'warn',
            cancelled: 'danger', confirmed: 'success'
        };
        return map[(status ?? '').toLowerCase()] ?? 'secondary';
    }

    private load(): void {
        this.loading.set(true);
        this.appointmentService.getAll()
            .pipe(catchError(() => of([])))
            .subscribe((list) => { this.appointments.set(list); this.loading.set(false); });
    }

    private delete(appt: HmsAppointment): void {
        this.appointmentService.delete(appt.appointmentId, appt.patientId).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Appointment removed.' });
                this.appointments.update((list) => list.filter((a) => a.appointmentId !== appt.appointmentId));
            },
            error: (err: Error) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message })
        });
    }
}

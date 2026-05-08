import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
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

import { PatientService, HmsPatient } from '@/pages/service/hms/patient.service';

@Component({
    selector: 'app-patient-list',
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
                    <h1 class="text-3xl font-bold m-0">Patients</h1>
                    <p class="text-surface-500 mt-2 mb-0">Manage all registered patients in the system.</p>
                </div>
                <div class="flex gap-2">
                    <p-button label="New Patient" icon="pi pi-plus" routerLink="new"></p-button>
                </div>
            </div>

            @if (loading()) {
                <div class="flex flex-col gap-3">
                    @for (i of [1,2,3,4,5]; track i) {
                        <p-skeleton width="100%" height="3rem"></p-skeleton>
                    }
                </div>
            } @else {
                <p-table
                    [value]="patients()"
                    [paginator]="true"
                    [rows]="20"
                    [rowsPerPageOptions]="[10, 20, 50]"
                    [globalFilterFields]="['name','email','phone','status','department']"
                    #dt
                    dataKey="patientId"
                    sortField="name"
                    [sortOrder]="1"
                    styleClass="p-datatable-sm">

                    <ng-template pTemplate="caption">
                        <div class="flex justify-end">
                            <p-iconfield>
                                <p-inputicon styleClass="pi pi-search"/>
                                <input pInputText type="text" placeholder="Search patients…"
                                    (input)="dt.filterGlobal($any($event.target).value, 'contains')"/>
                            </p-iconfield>
                        </div>
                    </ng-template>

                    <ng-template pTemplate="header">
                        <tr>
                            <th pSortableColumn="name">Name <p-sortIcon field="name"/></th>
                            <th pSortableColumn="email">Email <p-sortIcon field="email"/></th>
                            <th>Phone</th>
                            <th pSortableColumn="gender">Gender <p-sortIcon field="gender"/></th>
                            <th pSortableColumn="department">Department <p-sortIcon field="department"/></th>
                            <th pSortableColumn="status">Status <p-sortIcon field="status"/></th>
                            <th style="width:8rem">Actions</th>
                        </tr>
                    </ng-template>

                    <ng-template pTemplate="body" let-patient>
                        <tr>
                            <td><a class="font-medium text-primary cursor-pointer hover:underline"
                                   [routerLink]="[patient.patientId]">{{ patient.name }}</a></td>
                            <td>{{ patient.email || '—' }}</td>
                            <td>{{ patient.phone || '—' }}</td>
                            <td>{{ patient.gender || '—' }}</td>
                            <td>{{ patient.department || '—' }}</td>
                            <td><p-tag [value]="patient.status || 'Unknown'" [severity]="statusSeverity(patient.status)"/></td>
                            <td>
                                <div class="flex gap-1">
                                    <p-button icon="pi pi-eye" [rounded]="true" [text]="true" severity="info"
                                        [routerLink]="[patient.patientId]" pTooltip="View"></p-button>
                                    <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="secondary"
                                        [routerLink]="[patient.patientId, 'edit']" pTooltip="Edit"></p-button>
                                    <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger"
                                        (onClick)="confirmDelete(patient)" pTooltip="Delete"></p-button>
                                </div>
                            </td>
                        </tr>
                    </ng-template>

                    <ng-template pTemplate="emptymessage">
                        <tr><td colspan="7" class="text-center py-8 text-surface-400">No patients found.</td></tr>
                    </ng-template>
                </p-table>
            }
        </div>
    `
})
export class PatientListComponent implements OnInit {
    private patientService = inject(PatientService);
    private confirmationService = inject(ConfirmationService);
    private messageService = inject(MessageService);
    private router = inject(Router);

    patients = signal<HmsPatient[]>([]);
    loading = signal(true);

    ngOnInit(): void {
        this.load();
    }

    confirmDelete(patient: HmsPatient): void {
        this.confirmationService.confirm({
            message: `Delete patient <strong>${patient.name}</strong>? This cannot be undone.`,
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            accept: () => this.delete(patient.patientId)
        });
    }

    statusSeverity(status?: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
        const map: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'secondary'> = {
            admitted: 'warn', discharged: 'success', stable: 'success',
            critical: 'danger', 'under treatment': 'info', 'under observation': 'info'
        };
        return map[(status ?? '').toLowerCase()] ?? 'secondary';
    }

    private load(): void {
        this.loading.set(true);
        this.patientService.getAll()
            .pipe(catchError(() => of([])))
            .subscribe((list) => { this.patients.set(list); this.loading.set(false); });
    }

    private delete(patientId: string): void {
        this.patientService.delete(patientId).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Patient removed.' });
                this.patients.update((list) => list.filter((p) => p.patientId !== patientId));
            },
            error: (err: Error) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message })
        });
    }
}

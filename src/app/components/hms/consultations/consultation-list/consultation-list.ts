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

import { ConsultationService, HmsConsultation } from '@/pages/service/hms/consultation.service';

@Component({
    selector: 'app-consultation-list',
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
                    <h1 class="text-3xl font-bold m-0">Consultations</h1>
                    <p class="text-surface-500 mt-2 mb-0">Clinical encounters with diagnosis, treatment, notes and results.</p>
                </div>
                <p-button label="New Consultation" icon="pi pi-plus" routerLink="new"></p-button>
            </div>

            @if (loading()) {
                <div class="flex flex-col gap-3">
                    @for (i of [1,2,3,4,5]; track i) {
                        <p-skeleton width="100%" height="3rem"></p-skeleton>
                    }
                </div>
            } @else {
                <p-table
                    [value]="consultations()"
                    [paginator]="true"
                    [rows]="20"
                    [rowsPerPageOptions]="[10, 20, 50]"
                    [globalFilterFields]="['patientId','patientName','doctorName','date','type','status']"
                    #dt
                    dataKey="consultationId"
                    sortField="date"
                    [sortOrder]="-1"
                    styleClass="p-datatable-sm">

                    <ng-template pTemplate="caption">
                        <div class="flex justify-end">
                            <p-iconfield>
                                <p-inputicon styleClass="pi pi-search"/>
                                <input pInputText type="text" placeholder="Search consultations…"
                                    (input)="dt.filterGlobal($any($event.target).value, 'contains')"/>
                            </p-iconfield>
                        </div>
                    </ng-template>

                    <ng-template pTemplate="header">
                        <tr>
                            <th pSortableColumn="date">Date <p-sortIcon field="date"/></th>
                            <th pSortableColumn="patientName">Patient <p-sortIcon field="patientName"/></th>
                            <th pSortableColumn="doctorName">Doctor <p-sortIcon field="doctorName"/></th>
                            <th pSortableColumn="type">Type <p-sortIcon field="type"/></th>
                            <th>Chief Complaint</th>
                            <th pSortableColumn="status">Status <p-sortIcon field="status"/></th>
                            <th style="width:8rem">Actions</th>
                        </tr>
                    </ng-template>

                    <ng-template pTemplate="body" let-c>
                        <tr>
                            <td>{{ c.date || '—' }}</td>
                            <td>
                                <a class="font-medium text-primary cursor-pointer hover:underline"
                                   [routerLink]="[c.consultationId]" [queryParams]="{patientId: c.patientId}">
                                   {{ c.patientName || c.patientId | slice:0:12 }}
                                </a>
                            </td>
                            <td>{{ c.doctorName || c.doctorEmail || '—' }}</td>
                            <td>{{ c.type || '—' }}</td>
                            <td class="max-w-xs truncate">{{ c.chiefComplaint || '—' }}</td>
                            <td><p-tag [value]="c.status || 'Unknown'" [severity]="statusSeverity(c.status)"/></td>
                            <td>
                                <div class="flex gap-1">
                                    <p-button icon="pi pi-eye" [rounded]="true" [text]="true" severity="info"
                                        [routerLink]="[c.consultationId]" [queryParams]="{patientId: c.patientId}" pTooltip="View"></p-button>
                                    <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="secondary"
                                        [routerLink]="[c.consultationId, 'edit']" [queryParams]="{patientId: c.patientId}" pTooltip="Edit"></p-button>
                                    <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger"
                                        (onClick)="confirmDelete(c)" pTooltip="Delete"></p-button>
                                </div>
                            </td>
                        </tr>
                    </ng-template>

                    <ng-template pTemplate="emptymessage">
                        <tr><td colspan="7" class="text-center py-8 text-surface-400">No consultations found.</td></tr>
                    </ng-template>
                </p-table>
            }
        </div>
    `
})
export class ConsultationListComponent implements OnInit {
    private consultationService = inject(ConsultationService);
    private confirmationService = inject(ConfirmationService);
    private messageService = inject(MessageService);

    consultations = signal<HmsConsultation[]>([]);
    loading = signal(true);

    ngOnInit(): void {
        this.load();
    }

    confirmDelete(c: HmsConsultation): void {
        this.confirmationService.confirm({
            message: `Delete consultation from <strong>${c.date ?? 'unknown date'}</strong>? All linked records (notes, diagnoses, prescriptions) will be orphaned.`,
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            accept: () => this.delete(c)
        });
    }

    statusSeverity(status?: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
        const map: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'secondary'> = {
            completed: 'success', draft: 'warn', 'in-progress': 'info', cancelled: 'danger'
        };
        return map[(status ?? '').toLowerCase()] ?? 'secondary';
    }

    private load(): void {
        this.loading.set(true);
        this.consultationService.getAll()
            .pipe(catchError(() => of([])))
            .subscribe((list) => { this.consultations.set(list); this.loading.set(false); });
    }

    private delete(c: HmsConsultation): void {
        this.consultationService.delete(c.consultationId, c.patientId).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Consultation removed.' });
                this.consultations.update((list) => list.filter((x) => x.consultationId !== c.consultationId));
            },
            error: (err: Error) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message })
        });
    }
}

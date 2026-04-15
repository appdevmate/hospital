import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { catchError, of } from 'rxjs';

import { ConsultationService, Consultation } from '@/services/consultation.service';
import { AuthService } from '@/services/auth.service';
import { HelpersService } from '@/services/helpers-service';

@Component({
    selector: 'app-consultation-list',
    standalone: true,
    imports: [CommonModule, ButtonModule, TagModule, TooltipModule, ConfirmDialogModule],
    providers: [ConfirmationService],
    template: `
        <div class="exam-list">
            <!-- Header -->
            <div class="exam-list-header">
                <div class="flex items-center gap-2">
                    <i class="pi pi-file-medical" style="color:#16a34a;font-size:1.2rem;"></i>
                    <span class="font-semibold text-lg">Consultations ({{ consultations.length }})</span>
                </div>
            </div>

            <!-- Loading -->
            @if (loading) {
                <div class="flex justify-center py-8">
                    <i class="pi pi-spin pi-spinner text-3xl" style="color:#16a34a;"></i>
                </div>
            }

            <!-- Empty -->
            @if (!loading && consultations.length === 0) {
                <div class="empty-state">
                    <i class="pi pi-file-medical text-4xl mb-3" style="color:#D1D5DB;"></i>
                    <p>No consultations recorded yet.</p>
                    <p class="text-sm text-surface-400">Start a consultation from the Appointments tab.</p>
                </div>
            }

            <!-- List -->
            @if (!loading && consultations.length > 0) {
                <div class="flex flex-col gap-3">
                    @for (c of consultations; track c.consultationId) {
                        <div class="exam-card" [class.exam-card-completed]="c.status === 'completed'">
                            <!-- Left: date badge -->
                            <div class="exam-date-badge">
                                <span class="exam-day">{{ c.date | date: 'd' }}</span>
                                <span class="exam-month">{{ c.date | date: 'MMM y' }}</span>
                            </div>

                            <!-- Middle: info -->
                            <div class="exam-info flex-1 min-w-0">
                                <div class="flex items-center gap-2 mb-1 flex-wrap">
                                    <p-tag [value]="c.status === 'completed' ? 'Closed' : 'Draft'" [severity]="c.status === 'completed' ? 'success' : 'warn'" />
                                    @if (c.diagnosis && c.diagnosis.length > 0) {
                                        <span class="text-sm font-medium text-surface-700 dark:text-surface-200"> {{ c.diagnosis[0].icdCode }} — {{ c.diagnosis[0].icdDescription }} </span>
                                    } @else {
                                        <span class="text-sm text-surface-400 italic">No diagnosis yet</span>
                                    }
                                </div>

                                <div class="flex items-center gap-3 text-xs text-surface-500 flex-wrap">
                                    <span><i class="pi pi-user-plus mr-1"></i>{{ c.doctorName | titlecase }}</span>
                                    @if (c.chiefComplaint?.cc) {
                                        <span><i class="pi pi-comment mr-1"></i>{{ c.chiefComplaint!.cc | titlecase }}</span>
                                    }
                                    @if (c.prescriptions.length) {
                                        <span><i class="pi pi-heart mr-1"></i>{{ c.prescriptions.length }} Rx</span>
                                    }
                                    @if (c.labOrders.length) {
                                        <span><i class="pi pi-flask mr-1"></i>{{ c.labOrders.length }} Labs</span>
                                    }
                                    @if (c.radiologyOrders.length) {
                                        <span><i class="pi pi-image mr-1"></i>{{ c.radiologyOrders.length }} Imaging</span>
                                    }
                                </div>
                            </div>

                            <!-- Right: actions -->
                            <div class="flex items-center gap-1 flex-shrink-0">
                                @if (c.status === 'draft' && (auth.isDoctor || auth.isDeveloper)) {
                                    <p-button icon="pi pi-pencil" text severity="success" pTooltip="Continue Consultation" (onClick)="openForm(c.consultationId)" />
                                }
                                <p-button icon="pi pi-eye" text severity="info" pTooltip="View Details" (onClick)="openDetail(c.consultationId)" />
                                @if (auth.isAdmin || auth.isDeveloper) {
                                    <p-button icon="pi pi-trash" text severity="danger" pTooltip="Delete (Admin)" (onClick)="confirmDelete(c)" />
                                }
                            </div>
                        </div>
                    }
                </div>
            }
        </div>

        <p-confirmDialog appendTo="body" />
    `,
    styles: [
        `
            .exam-list-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 1rem;
            }
            .exam-card {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 0.875rem 1rem;
                border-radius: 10px;
                border: 1px solid var(--p-surface-200);
                background: var(--p-surface-0);
                transition: box-shadow 0.15s;
                &:hover {
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
                }
            }
            .exam-card-completed {
                border-left: 4px solid #16a34a;
            }
            .exam-date-badge {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                width: 52px;
                height: 52px;
                border-radius: 8px;
                background: var(--p-surface-100);
                flex-shrink: 0;
            }
            .exam-day {
                font-size: 1.3rem;
                font-weight: 700;
                line-height: 1;
                color: var(--p-surface-900);
            }
            .exam-month {
                font-size: 0.65rem;
                text-transform: uppercase;
                color: var(--p-surface-500);
            }
            .empty-state {
                text-align: center;
                padding: 3rem 1rem;
                color: var(--p-surface-400);
                display: flex;
                flex-direction: column;
                align-items: center;
            }
        `
    ]
})
export class ConsultationListComponent implements OnInit {
    @Input({ required: true }) patientId!: string;
    @Input() patientName: string = '';

    auth = inject(AuthService);
    private consultationService = inject(ConsultationService);
    private helpers = inject(HelpersService);
    private router = inject(Router);
    private confirm = inject(ConfirmationService);

    consultations: Consultation[] = [];
    loading = true;

    ngOnInit() {
        this.load();
    }

    load() {
        this.loading = true;
        this.consultationService
            .listConsultations(this.patientId)
            .pipe(catchError(() => of([])))
            .subscribe((data) => {
                this.consultations = data as Consultation[];
                this.loading = false;
            });
    }

    openForm(consultationId: string) {
        this.router.navigate(['/consultation', consultationId]);
    }

    openDetail(consultationId: string) {
        this.router.navigate(['/consultation', consultationId, 'view']);
    }

    confirmDelete(c: Consultation) {
        this.confirm.confirm({
            message: `Delete consultation from ${c.date}?`,
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            acceptButtonProps: { label: 'Delete', severity: 'danger' },
            rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
            accept: () => {
                this.consultationService.deleteConsultation(c.consultationId).subscribe({
                    next: () => {
                        this.helpers.notifySuccess('Consultation deleted');
                        this.load();
                    },
                    error: () => this.helpers.notifyError('Error', 'Could not delete consultation')
                });
            }
        });
    }
}

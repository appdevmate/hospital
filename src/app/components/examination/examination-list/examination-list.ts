import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { catchError, of } from 'rxjs';

import { ExaminationService, Examination } from '@/pages/service/examination.service';
import { AuthService } from '@/pages/service/auth.service';
import { HelpersService } from '@/pages/service/helpers-service';

@Component({
    selector: 'app-examination-list',
    standalone: true,
    imports: [CommonModule, ButtonModule, TagModule, TooltipModule, ConfirmDialogModule],
    providers: [ConfirmationService],
    template: `
        <div class="exam-list">
            <!-- Header -->
            <div class="exam-list-header">
                <div class="flex items-center gap-2">
                    <i class="pi pi-file-medical" style="color:#16a34a;font-size:1.2rem;"></i>
                    <span class="font-semibold text-lg">Examinations ({{ exams.length }})</span>
                </div>
                @if (auth.isDoctor) {
                    <p-button label="New Examination" icon="pi pi-plus" severity="success" size="small" [loading]="creating" (onClick)="createNew()" />
                }
            </div>

            <!-- Loading -->
            @if (loading) {
                <div class="flex justify-center py-8">
                    <i class="pi pi-spin pi-spinner text-3xl" style="color:#16a34a;"></i>
                </div>
            }

            <!-- Empty -->
            @if (!loading && exams.length === 0) {
                <div class="empty-state">
                    <i class="pi pi-file-medical text-4xl mb-3" style="color:#D1D5DB;"></i>
                    <p>No examinations recorded yet.</p>
                    @if (auth.isDoctor) {
                        <p class="text-sm text-surface-400">Click "New Examination" to start a SOAP note.</p>
                    }
                </div>
            }

            <!-- List -->
            @if (!loading && exams.length > 0) {
                <div class="flex flex-col gap-3">
                    @for (exam of exams; track exam.examId) {
                        <div class="exam-card" [class.exam-card-completed]="exam.status === 'completed'">
                            <!-- Left: date badge -->
                            <div class="exam-date-badge">
                                <span class="exam-day">{{ exam.date | date: 'd' }}</span>
                                <span class="exam-month">{{ exam.date | date: 'MMM y' }}</span>
                            </div>

                            <!-- Middle: info -->
                            <div class="exam-info flex-1 min-w-0">
                                <div class="flex items-center gap-2 mb-1 flex-wrap">
                                    <p-tag [value]="exam.status === 'completed' ? 'Signed Off' : 'Draft'" [severity]="exam.status === 'completed' ? 'success' : 'warn'" />
                                    @if (exam.diagnosis && exam.diagnosis.length > 0) {
                                        <span class="text-sm font-medium text-surface-700 dark:text-surface-200"> {{ exam.diagnosis[0].icdCode }} — {{ exam.diagnosis[0].icdDescription }} </span>
                                    } @else {
                                        <span class="text-sm text-surface-400 italic">No diagnosis yet</span>
                                    }
                                </div>

                                <div class="flex items-center gap-3 text-xs text-surface-500 flex-wrap">
                                    <span><i class="pi pi-user-plus mr-1"></i>{{ exam.doctorName | titlecase }}</span>
                                    @if (exam.chiefComplaint?.cc) {
                                        <span><i class="pi pi-comment mr-1"></i>{{ exam.chiefComplaint!.cc | titlecase }}</span>
                                    }
                                    @if (exam.prescriptions.length) {
                                        <span><i class="pi pi-heart mr-1"></i>{{ exam.prescriptions.length }} Rx</span>
                                    }
                                    @if (exam.labOrders.length) {
                                        <span><i class="pi pi-flask mr-1"></i>{{ exam.labOrders.length }} Labs</span>
                                    }
                                    @if (exam.radiologyOrders.length) {
                                        <span><i class="pi pi-image mr-1"></i>{{ exam.radiologyOrders.length }} Imaging</span>
                                    }
                                </div>
                            </div>

                            <!-- Right: actions -->
                            <div class="flex items-center gap-1 flex-shrink-0">
                                @if (exam.status === 'draft' && auth.isDoctor) {
                                    <p-button icon="pi pi-pencil" text severity="success" pTooltip="Continue Examination" (onClick)="openForm(exam.examId)" />
                                }
                                <p-button icon="pi pi-eye" text severity="info" pTooltip="View Details" (onClick)="openDetail(exam.examId)" />
                                @if (auth.isAdmin) {
                                    <p-button icon="pi pi-trash" text severity="danger" pTooltip="Delete (Admin)" (onClick)="confirmDelete(exam)" />
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
export class ExaminationListComponent implements OnInit {
    @Input({ required: true }) patientId!: string;
    @Input() patientName: string = '';

    auth = inject(AuthService);
    private examService = inject(ExaminationService);
    private helpers = inject(HelpersService);
    private router = inject(Router);
    private confirm = inject(ConfirmationService);

    exams: Examination[] = [];
    loading = true;
    creating = false;

    ngOnInit() {
        this.load();
    }

    load() {
        this.loading = true;
        this.examService
            .listExaminations(this.patientId)
            .pipe(catchError(() => of([])))
            .subscribe((data) => {
                this.exams = data as Examination[];
                this.loading = false;
            });
    }

    createNew() {
        this.creating = true;
        this.examService
            .createExamination({
                patientId: this.patientId,
                patientName: this.patientName,
                doctorEmail: this.auth.current?.email || '',
                doctorName: this.auth.current?.name || ''
            })
            .subscribe({
                next: (exam) => {
                    this.creating = false;
                    this.router.navigate(['/examination', exam.examId]);
                },
                error: (err) => {
                    this.creating = false;
                    this.helpers.notifyError('Error', err?.error?.message || 'Could not create examination');
                }
            });
    }

    openForm(examId: string) {
        this.router.navigate(['/examination', examId]);
    }
    openDetail(examId: string) {
        this.router.navigate(['/examination', examId, 'view']);
    }

    confirmDelete(exam: Examination) {
        this.confirm.confirm({
            message: `Delete examination from ${exam.date}?`,
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            acceptButtonProps: { label: 'Delete', severity: 'danger' },
            rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
            accept: () => {
                this.examService.deleteExamination(exam.examId).subscribe({
                    next: () => {
                        this.helpers.notifySuccess('Examination deleted');
                        this.load();
                    },
                    error: () => this.helpers.notifyError('Error', 'Could not delete examination')
                });
            }
        });
    }
}

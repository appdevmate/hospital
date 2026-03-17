import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { TabsModule } from 'primeng/tabs';
import { catchError, of } from 'rxjs';

import { ExaminationService, Examination } from '@/pages/service/examination.service';
import { AuthService } from '@/pages/service/auth.service';
import { HelpersService } from '@/pages/service/helpers-service';

@Component({
    selector: 'app-examination-detail',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, TagModule, DividerModule, TabsModule],
    templateUrl: './examination-detail.html',
    styleUrl: './examination-detail.scss'
})
export class ExaminationDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private examService = inject(ExaminationService);
    private helpers = inject(HelpersService);
    auth = inject(AuthService);

    exam: Examination | null = null;
    loading = true;

    ngOnInit() {
        const examId = this.route.snapshot.paramMap.get('examId');
        if (!examId) {
            this.router.navigate(['/']);
            return;
        }

        this.examService
            .getExamination(examId)
            .pipe(
                catchError((err) => {
                    this.helpers.notifyError('Error', err?.error?.message || 'Could not load examination');
                    this.router.navigate(['/']);
                    return of(null);
                })
            )
            .subscribe((exam) => {
                this.exam = exam as Examination;
                this.loading = false;
            });
    }

    goBack() {
        if (this.exam?.patientId) {
            this.router.navigate(['/patient-profile', this.exam.patientId]);
        } else {
            this.router.navigate(['/']);
        }
    }

    editExam() {
        this.router.navigate(['/examination', this.exam!.examId]);
    }

    print() {
        window.print();
    }

    diagSeverity(t: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
        return t === 'primary' ? 'danger' : t === 'secondary' ? 'warn' : 'info';
    }
    urgencySeverity(u: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
        return u === 'stat' ? 'danger' : u === 'urgent' ? 'warn' : 'info';
    }
    statusSeverity(s: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
        return s === 'resulted' || s === 'completed' || s === 'dispensed' ? 'success' : s === 'cancelled' ? 'secondary' : 'info';
    }
    bmiCategory(bmi: number | undefined): string {
        if (!bmi) return '';
        if (bmi < 18.5) return 'Underweight';
        if (bmi < 25) return 'Normal';
        if (bmi < 30) return 'Overweight';
        return 'Obese';
    }
}

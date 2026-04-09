import { __decorate } from "tslib";
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { TabsModule } from 'primeng/tabs';
import { catchError, of } from 'rxjs';
import { ExaminationService } from '@/pages/service/examination.service';
import { AuthService } from '@/pages/service/auth.service';
import { HelpersService } from '@/pages/service/helpers-service';
let ExaminationDetailComponent = class ExaminationDetailComponent {
    route = inject(ActivatedRoute);
    router = inject(Router);
    examService = inject(ExaminationService);
    helpers = inject(HelpersService);
    auth = inject(AuthService);
    exam = null;
    loading = true;
    ngOnInit() {
        const examId = this.route.snapshot.paramMap.get('examId');
        if (!examId) {
            this.router.navigate(['/']);
            return;
        }
        this.examService
            .getExamination(examId)
            .pipe(catchError((err) => {
            this.helpers.notifyError('Error', err?.error?.message || 'Could not load examination');
            this.router.navigate(['/']);
            return of(null);
        }))
            .subscribe((exam) => {
            this.exam = exam;
            this.loading = false;
        });
    }
    goBack() {
        if (this.exam?.patientId) {
            this.router.navigate(['/patient-profile', this.exam.patientId]);
        }
        else {
            this.router.navigate(['/']);
        }
    }
    editExam() {
        this.router.navigate(['/examination', this.exam.examId]);
    }
    print() {
        window.print();
    }
    diagSeverity(t) {
        return t === 'primary' ? 'danger' : t === 'secondary' ? 'warn' : 'info';
    }
    urgencySeverity(u) {
        return u === 'stat' ? 'danger' : u === 'urgent' ? 'warn' : 'info';
    }
    statusSeverity(s) {
        return s === 'resulted' || s === 'completed' || s === 'dispensed' ? 'success' : s === 'cancelled' ? 'secondary' : 'info';
    }
    bmiCategory(bmi) {
        if (!bmi)
            return '';
        if (bmi < 18.5)
            return 'Underweight';
        if (bmi < 25)
            return 'Normal';
        if (bmi < 30)
            return 'Overweight';
        return 'Obese';
    }
};
ExaminationDetailComponent = __decorate([
    Component({
        selector: 'app-examination-detail',
        standalone: true,
        imports: [CommonModule, RouterModule, ButtonModule, TagModule, DividerModule, TabsModule],
        templateUrl: './examination-detail.html',
        styleUrl: './examination-detail.scss'
    })
], ExaminationDetailComponent);
export { ExaminationDetailComponent };

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { TabsModule } from 'primeng/tabs';
import { catchError, of } from 'rxjs';

import { ConsultationService, Consultation } from '@/services/consultation.service';
import { AuthService } from '@/services/auth.service';
import { HelpersService } from '@/services/helpers-service';

@Component({
    selector: 'app-consultation-detail',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, TagModule, DividerModule, TabsModule],
    templateUrl: './consultation-detail.html',
    styleUrl: './consultation-detail.scss'
})
export class ConsultationDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private consultationService = inject(ConsultationService);
    private helpers = inject(HelpersService);
    auth = inject(AuthService);

    consultation: Consultation | null = null;
    loading = true;

    /** Template alias */
    get exam() {
        return this.consultation;
    }

    ngOnInit() {
        const consultationId = this.route.snapshot.paramMap.get('consultationId');
        if (!consultationId) {
            this.router.navigate(['/']);
            return;
        }

        this.consultationService
            .getConsultation(consultationId)
            .pipe(
                catchError((err) => {
                    this.helpers.notifyError('Error', err?.error?.message || 'Could not load consultation');
                    this.router.navigate(['/']);
                    return of(null);
                })
            )
            .subscribe((c) => {
                this.consultation = c as Consultation;
                this.loading = false;
            });
    }

    goBack() {
        if (this.consultation?.patientId) {
            this.router.navigate(['/patient-profile', this.consultation.patientId]);
        } else {
            this.router.navigate(['/']);
        }
    }

    editConsultation() {
        this.router.navigate(['/consultation', this.consultation!.consultationId]);
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

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface HmsTreatmentPlan {
    planId: string;
    consultationId: string;
    title?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    status?: 'active' | 'completed' | 'cancelled';
    goals?: string;
    interventions?: string;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}

export type CreateTreatmentPlanRequest = Omit<HmsTreatmentPlan, 'planId' | 'createdAt' | 'updatedAt'> & { consultationId: string };
export type UpdateTreatmentPlanRequest = Partial<Omit<HmsTreatmentPlan, 'planId' | 'consultationId' | 'createdAt' | 'updatedAt'>>;

@Injectable({ providedIn: 'root' })
export class TreatmentPlanService {
    private http = inject(HttpClient);
    private readonly base = `${environment.hmsApiUrl}/treatment-plans`;

    private headers(): HttpHeaders {
        return new HttpHeaders({ Authorization: `Bearer ${sessionStorage.getItem('accessToken') ?? ''}` });
    }

    getAll(consultationId?: string): Observable<HmsTreatmentPlan[]> {
        const params = consultationId ? new HttpParams().set('consultationId', consultationId) : undefined;
        return this.http.get<HmsTreatmentPlan[]>(this.base, { headers: this.headers(), params }).pipe(catchError(this.handleError));
    }

    getById(planId: string, consultationId: string): Observable<HmsTreatmentPlan> {
        const params = new HttpParams().set('consultationId', consultationId);
        return this.http
            .get<HmsTreatmentPlan>(`${this.base}/${encodeURIComponent(planId)}`, { headers: this.headers(), params })
            .pipe(catchError(this.handleError));
    }

    create(data: CreateTreatmentPlanRequest): Observable<HmsTreatmentPlan> {
        return this.http.post<HmsTreatmentPlan>(this.base, data, { headers: this.headers() }).pipe(catchError(this.handleError));
    }

    update(planId: string, consultationId: string, data: UpdateTreatmentPlanRequest): Observable<HmsTreatmentPlan> {
        const params = new HttpParams().set('consultationId', consultationId);
        return this.http
            .put<HmsTreatmentPlan>(`${this.base}/${encodeURIComponent(planId)}`, data, { headers: this.headers(), params })
            .pipe(catchError(this.handleError));
    }

    delete(planId: string, consultationId: string): Observable<{ message: string }> {
        const params = new HttpParams().set('consultationId', consultationId);
        return this.http
            .delete<{ message: string }>(`${this.base}/${encodeURIComponent(planId)}`, { headers: this.headers(), params })
            .pipe(catchError(this.handleError));
    }

    private handleError(error: HttpErrorResponse): Observable<never> {
        const message = (error.error as { message?: string })?.message ?? error.message ?? 'An unexpected error occurred';
        return throwError(() => new Error(message));
    }
}

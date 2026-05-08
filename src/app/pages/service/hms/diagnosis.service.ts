import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface HmsDiagnosis {
    diagnosisId: string;
    consultationId: string;
    code?: string;
    description?: string;
    type?: 'primary' | 'secondary' | 'differential';
    severity?: 'mild' | 'moderate' | 'severe';
    status?: 'active' | 'resolved' | 'chronic';
    onset?: string;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}

export type CreateDiagnosisRequest = Omit<HmsDiagnosis, 'diagnosisId' | 'createdAt' | 'updatedAt'> & { consultationId: string };
export type UpdateDiagnosisRequest = Partial<Omit<HmsDiagnosis, 'diagnosisId' | 'consultationId' | 'createdAt' | 'updatedAt'>>;

@Injectable({ providedIn: 'root' })
export class DiagnosisService {
    private http = inject(HttpClient);
    private readonly base = `${environment.hmsApiUrl}/clinical-diagnosis`;

    private headers(): HttpHeaders {
        return new HttpHeaders({ Authorization: `Bearer ${sessionStorage.getItem('accessToken') ?? ''}` });
    }

    getAll(consultationId?: string): Observable<HmsDiagnosis[]> {
        const params = consultationId ? new HttpParams().set('consultationId', consultationId) : undefined;
        return this.http.get<HmsDiagnosis[]>(this.base, { headers: this.headers(), params }).pipe(catchError(this.handleError));
    }

    getById(diagnosisId: string, consultationId: string): Observable<HmsDiagnosis> {
        const params = new HttpParams().set('consultationId', consultationId);
        return this.http
            .get<HmsDiagnosis>(`${this.base}/${encodeURIComponent(diagnosisId)}`, { headers: this.headers(), params })
            .pipe(catchError(this.handleError));
    }

    create(data: CreateDiagnosisRequest): Observable<HmsDiagnosis> {
        return this.http.post<HmsDiagnosis>(this.base, data, { headers: this.headers() }).pipe(catchError(this.handleError));
    }

    update(diagnosisId: string, consultationId: string, data: UpdateDiagnosisRequest): Observable<HmsDiagnosis> {
        const params = new HttpParams().set('consultationId', consultationId);
        return this.http
            .put<HmsDiagnosis>(`${this.base}/${encodeURIComponent(diagnosisId)}`, data, { headers: this.headers(), params })
            .pipe(catchError(this.handleError));
    }

    delete(diagnosisId: string, consultationId: string): Observable<{ message: string }> {
        const params = new HttpParams().set('consultationId', consultationId);
        return this.http
            .delete<{ message: string }>(`${this.base}/${encodeURIComponent(diagnosisId)}`, { headers: this.headers(), params })
            .pipe(catchError(this.handleError));
    }

    private handleError(error: HttpErrorResponse): Observable<never> {
        const message = (error.error as { message?: string })?.message ?? error.message ?? 'An unexpected error occurred';
        return throwError(() => new Error(message));
    }
}

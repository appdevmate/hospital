import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface HmsRadiologyResult {
    resultId: string;
    consultationId: string;
    modality?: 'X-Ray' | 'CT' | 'MRI' | 'Ultrasound' | 'PET' | 'Mammography' | 'Fluoroscopy' | 'Other';
    bodyPart?: string;
    orderedBy?: string;
    orderedDate?: string;
    performedDate?: string;
    reportDate?: string;
    status?: 'pending' | 'scheduled' | 'performed' | 'reported' | 'cancelled';
    findings?: string;
    impression?: string;
    recommendation?: string;
    radiologistName?: string;
    fileKey?: string;
    fileUrl?: string;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}

export type CreateRadiologyRequest = Omit<HmsRadiologyResult, 'resultId' | 'createdAt' | 'updatedAt'> & { consultationId: string };
export type UpdateRadiologyRequest = Partial<Omit<HmsRadiologyResult, 'resultId' | 'consultationId' | 'createdAt' | 'updatedAt'>>;

@Injectable({ providedIn: 'root' })
export class RadiologyService {
    private http = inject(HttpClient);
    private readonly base = `${environment.hmsApiUrl}/radiology-results`;

    private headers(): HttpHeaders {
        return new HttpHeaders({ Authorization: `Bearer ${sessionStorage.getItem('accessToken') ?? ''}` });
    }

    getAll(consultationId?: string): Observable<HmsRadiologyResult[]> {
        const params = consultationId ? new HttpParams().set('consultationId', consultationId) : undefined;
        return this.http.get<HmsRadiologyResult[]>(this.base, { headers: this.headers(), params }).pipe(catchError(this.handleError));
    }

    getById(resultId: string, consultationId: string): Observable<HmsRadiologyResult> {
        const params = new HttpParams().set('consultationId', consultationId);
        return this.http
            .get<HmsRadiologyResult>(`${this.base}/${encodeURIComponent(resultId)}`, { headers: this.headers(), params })
            .pipe(catchError(this.handleError));
    }

    create(data: CreateRadiologyRequest): Observable<HmsRadiologyResult> {
        return this.http.post<HmsRadiologyResult>(this.base, data, { headers: this.headers() }).pipe(catchError(this.handleError));
    }

    update(resultId: string, consultationId: string, data: UpdateRadiologyRequest): Observable<HmsRadiologyResult> {
        const params = new HttpParams().set('consultationId', consultationId);
        return this.http
            .put<HmsRadiologyResult>(`${this.base}/${encodeURIComponent(resultId)}`, data, { headers: this.headers(), params })
            .pipe(catchError(this.handleError));
    }

    delete(resultId: string, consultationId: string): Observable<{ message: string }> {
        const params = new HttpParams().set('consultationId', consultationId);
        return this.http
            .delete<{ message: string }>(`${this.base}/${encodeURIComponent(resultId)}`, { headers: this.headers(), params })
            .pipe(catchError(this.handleError));
    }

    private handleError(error: HttpErrorResponse): Observable<never> {
        const message = (error.error as { message?: string })?.message ?? error.message ?? 'An unexpected error occurred';
        return throwError(() => new Error(message));
    }
}

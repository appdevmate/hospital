import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface LabTestItem {
    testName: string;
    result?: string;
    unit?: string;
    referenceRange?: string;
    flag?: 'normal' | 'high' | 'low' | 'critical';
}

export interface HmsLabResult {
    resultId: string;
    consultationId: string;
    labName?: string;
    orderedBy?: string;
    orderedDate?: string;
    collectionDate?: string;
    reportDate?: string;
    status?: 'pending' | 'collected' | 'processing' | 'completed' | 'cancelled';
    tests?: LabTestItem[];
    summary?: string;
    fileKey?: string;
    fileUrl?: string;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}

export type CreateLabResultRequest = Omit<HmsLabResult, 'resultId' | 'createdAt' | 'updatedAt'> & { consultationId: string };
export type UpdateLabResultRequest = Partial<Omit<HmsLabResult, 'resultId' | 'consultationId' | 'createdAt' | 'updatedAt'>>;

@Injectable({ providedIn: 'root' })
export class LabResultsService {
    private http = inject(HttpClient);
    private readonly base = `${environment.hmsApiUrl}/lab-results`;

    private headers(): HttpHeaders {
        return new HttpHeaders({ Authorization: `Bearer ${sessionStorage.getItem('accessToken') ?? ''}` });
    }

    getAll(consultationId?: string): Observable<HmsLabResult[]> {
        const params = consultationId ? new HttpParams().set('consultationId', consultationId) : undefined;
        return this.http.get<HmsLabResult[]>(this.base, { headers: this.headers(), params }).pipe(catchError(this.handleError));
    }

    getById(resultId: string, consultationId: string): Observable<HmsLabResult> {
        const params = new HttpParams().set('consultationId', consultationId);
        return this.http
            .get<HmsLabResult>(`${this.base}/${encodeURIComponent(resultId)}`, { headers: this.headers(), params })
            .pipe(catchError(this.handleError));
    }

    create(data: CreateLabResultRequest): Observable<HmsLabResult> {
        return this.http.post<HmsLabResult>(this.base, data, { headers: this.headers() }).pipe(catchError(this.handleError));
    }

    update(resultId: string, consultationId: string, data: UpdateLabResultRequest): Observable<HmsLabResult> {
        const params = new HttpParams().set('consultationId', consultationId);
        return this.http
            .put<HmsLabResult>(`${this.base}/${encodeURIComponent(resultId)}`, data, { headers: this.headers(), params })
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

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface PrescriptionItem {
    name: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
}

export interface HmsPrescription {
    prescriptionId: string;
    consultationId: string;
    medications?: PrescriptionItem[];
    status?: 'active' | 'dispensed' | 'cancelled';
    prescribedBy?: string;
    prescribedDate?: string;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}

export type CreatePrescriptionRequest = Omit<HmsPrescription, 'prescriptionId' | 'createdAt' | 'updatedAt'> & { consultationId: string };
export type UpdatePrescriptionRequest = Partial<Omit<HmsPrescription, 'prescriptionId' | 'consultationId' | 'createdAt' | 'updatedAt'>>;

@Injectable({ providedIn: 'root' })
export class PrescriptionService {
    private http = inject(HttpClient);
    private readonly base = `${environment.hmsApiUrl}/prescriptions`;

    private headers(): HttpHeaders {
        return new HttpHeaders({ Authorization: `Bearer ${sessionStorage.getItem('accessToken') ?? ''}` });
    }

    getAll(consultationId?: string): Observable<HmsPrescription[]> {
        const params = consultationId ? new HttpParams().set('consultationId', consultationId) : undefined;
        return this.http.get<HmsPrescription[]>(this.base, { headers: this.headers(), params }).pipe(catchError(this.handleError));
    }

    getById(prescriptionId: string, consultationId: string): Observable<HmsPrescription> {
        const params = new HttpParams().set('consultationId', consultationId);
        return this.http
            .get<HmsPrescription>(`${this.base}/${encodeURIComponent(prescriptionId)}`, { headers: this.headers(), params })
            .pipe(catchError(this.handleError));
    }

    create(data: CreatePrescriptionRequest): Observable<HmsPrescription> {
        return this.http.post<HmsPrescription>(this.base, data, { headers: this.headers() }).pipe(catchError(this.handleError));
    }

    update(prescriptionId: string, consultationId: string, data: UpdatePrescriptionRequest): Observable<HmsPrescription> {
        const params = new HttpParams().set('consultationId', consultationId);
        return this.http
            .put<HmsPrescription>(`${this.base}/${encodeURIComponent(prescriptionId)}`, data, { headers: this.headers(), params })
            .pipe(catchError(this.handleError));
    }

    delete(prescriptionId: string, consultationId: string): Observable<{ message: string }> {
        const params = new HttpParams().set('consultationId', consultationId);
        return this.http
            .delete<{ message: string }>(`${this.base}/${encodeURIComponent(prescriptionId)}`, { headers: this.headers(), params })
            .pipe(catchError(this.handleError));
    }

    private handleError(error: HttpErrorResponse): Observable<never> {
        const message = (error.error as { message?: string })?.message ?? error.message ?? 'An unexpected error occurred';
        return throwError(() => new Error(message));
    }
}

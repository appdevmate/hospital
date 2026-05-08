import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface HmsConsultation {
    consultationId: string;
    patientId: string;
    patientName?: string;
    doctorId?: string;
    doctorName?: string;
    doctorEmail?: string;
    date?: string;
    type?: string;
    status?: string;
    chiefComplaint?: string;
    vitalSigns?: {
        temperature?: string;
        bloodPressure?: string;
        heartRate?: string;
        respiratoryRate?: string;
        oxygenSaturation?: string;
        weight?: string;
        height?: string;
    };
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}

export type CreateConsultationRequest = Omit<HmsConsultation, 'consultationId' | 'createdAt' | 'updatedAt'> & { patientId: string };
export type UpdateConsultationRequest = Partial<Omit<HmsConsultation, 'consultationId' | 'patientId' | 'createdAt' | 'updatedAt'>>;

@Injectable({ providedIn: 'root' })
export class ConsultationService {
    private http = inject(HttpClient);
    private readonly base = `${environment.hmsApiUrl}/consultations`;

    private headers(): HttpHeaders {
        return new HttpHeaders({ Authorization: `Bearer ${sessionStorage.getItem('accessToken') ?? ''}` });
    }

    getAll(patientId?: string): Observable<HmsConsultation[]> {
        const params = patientId ? new HttpParams().set('patientId', patientId) : undefined;
        return this.http.get<HmsConsultation[]>(this.base, { headers: this.headers(), params }).pipe(catchError(this.handleError));
    }

    getById(consultationId: string, patientId: string): Observable<HmsConsultation> {
        const params = new HttpParams().set('patientId', patientId);
        return this.http
            .get<HmsConsultation>(`${this.base}/${encodeURIComponent(consultationId)}`, { headers: this.headers(), params })
            .pipe(catchError(this.handleError));
    }

    create(data: CreateConsultationRequest): Observable<HmsConsultation> {
        return this.http.post<HmsConsultation>(this.base, data, { headers: this.headers() }).pipe(catchError(this.handleError));
    }

    update(consultationId: string, patientId: string, data: UpdateConsultationRequest): Observable<HmsConsultation> {
        const params = new HttpParams().set('patientId', patientId);
        return this.http
            .put<HmsConsultation>(`${this.base}/${encodeURIComponent(consultationId)}`, data, { headers: this.headers(), params })
            .pipe(catchError(this.handleError));
    }

    delete(consultationId: string, patientId: string): Observable<{ message: string }> {
        const params = new HttpParams().set('patientId', patientId);
        return this.http
            .delete<{ message: string }>(`${this.base}/${encodeURIComponent(consultationId)}`, { headers: this.headers(), params })
            .pipe(catchError(this.handleError));
    }

    private handleError(error: HttpErrorResponse): Observable<never> {
        const message = (error.error as { message?: string })?.message ?? error.message ?? 'An unexpected error occurred';
        return throwError(() => new Error(message));
    }
}

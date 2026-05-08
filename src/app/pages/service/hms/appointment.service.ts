import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface HmsAppointment {
    appointmentId: string;
    patientId: string;
    doctorId?: string;
    doctorName?: string;
    doctorEmail?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    type?: string;
    status?: string;
    reason?: string;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}

export type CreateAppointmentRequest = Omit<HmsAppointment, 'appointmentId' | 'createdAt' | 'updatedAt'> & { patientId: string };
export type UpdateAppointmentRequest = Partial<Omit<HmsAppointment, 'appointmentId' | 'patientId' | 'createdAt' | 'updatedAt'>>;

@Injectable({ providedIn: 'root' })
export class AppointmentService {
    private http = inject(HttpClient);
    private readonly base = `${environment.hmsApiUrl}/appointments`;

    private headers(): HttpHeaders {
        return new HttpHeaders({ Authorization: `Bearer ${sessionStorage.getItem('accessToken') ?? ''}` });
    }

    getAll(patientId?: string): Observable<HmsAppointment[]> {
        const params = patientId ? new HttpParams().set('patientId', patientId) : undefined;
        return this.http.get<HmsAppointment[]>(this.base, { headers: this.headers(), params }).pipe(catchError(this.handleError));
    }

    getById(appointmentId: string, patientId: string): Observable<HmsAppointment> {
        const params = new HttpParams().set('patientId', patientId);
        return this.http
            .get<HmsAppointment>(`${this.base}/${encodeURIComponent(appointmentId)}`, { headers: this.headers(), params })
            .pipe(catchError(this.handleError));
    }

    create(data: CreateAppointmentRequest): Observable<HmsAppointment> {
        return this.http.post<HmsAppointment>(this.base, data, { headers: this.headers() }).pipe(catchError(this.handleError));
    }

    update(appointmentId: string, patientId: string, data: UpdateAppointmentRequest): Observable<HmsAppointment> {
        const params = new HttpParams().set('patientId', patientId);
        return this.http
            .put<HmsAppointment>(`${this.base}/${encodeURIComponent(appointmentId)}`, data, { headers: this.headers(), params })
            .pipe(catchError(this.handleError));
    }

    delete(appointmentId: string, patientId: string): Observable<{ message: string }> {
        const params = new HttpParams().set('patientId', patientId);
        return this.http
            .delete<{ message: string }>(`${this.base}/${encodeURIComponent(appointmentId)}`, { headers: this.headers(), params })
            .pipe(catchError(this.handleError));
    }

    private handleError(error: HttpErrorResponse): Observable<never> {
        const message = (error.error as { message?: string })?.message ?? error.message ?? 'An unexpected error occurred';
        return throwError(() => new Error(message));
    }
}

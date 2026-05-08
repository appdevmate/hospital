import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface HmsPatient {
    patientId: string;
    name: string;
    email?: string;
    phone?: string;
    gender?: string;
    dob?: string;
    bloodGroup?: string;
    insurance?: string;
    status?: string;
    department?: string;
    specialization?: string;
    ward?: string;
    bedNumber?: string;
    admissionDate?: string;
    medicalHistory?: string;
    allergies?: string[];
    medications?: string[];
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}

export type CreatePatientRequest = Omit<HmsPatient, 'patientId' | 'createdAt' | 'updatedAt'>;
export type UpdatePatientRequest = Partial<CreatePatientRequest>;

@Injectable({ providedIn: 'root' })
export class PatientService {
    private http = inject(HttpClient);
    private readonly base = `${environment.hmsApiUrl}/patients`;

    private headers(): HttpHeaders {
        return new HttpHeaders({ Authorization: `Bearer ${sessionStorage.getItem('accessToken') ?? ''}` });
    }

    getAll(): Observable<HmsPatient[]> {
        return this.http.get<HmsPatient[]>(this.base, { headers: this.headers() }).pipe(catchError(this.handleError));
    }

    getById(patientId: string): Observable<HmsPatient> {
        return this.http
            .get<HmsPatient>(`${this.base}/${encodeURIComponent(patientId)}`, { headers: this.headers() })
            .pipe(catchError(this.handleError));
    }

    create(data: CreatePatientRequest): Observable<HmsPatient> {
        return this.http.post<HmsPatient>(this.base, data, { headers: this.headers() }).pipe(catchError(this.handleError));
    }

    update(patientId: string, data: UpdatePatientRequest): Observable<HmsPatient> {
        return this.http
            .put<HmsPatient>(`${this.base}/${encodeURIComponent(patientId)}`, data, { headers: this.headers() })
            .pipe(catchError(this.handleError));
    }

    delete(patientId: string): Observable<{ message: string }> {
        return this.http
            .delete<{ message: string }>(`${this.base}/${encodeURIComponent(patientId)}`, { headers: this.headers() })
            .pipe(catchError(this.handleError));
    }

    private handleError(error: HttpErrorResponse): Observable<never> {
        const message = (error.error as { message?: string })?.message ?? error.message ?? 'An unexpected error occurred';
        return throwError(() => new Error(message));
    }
}

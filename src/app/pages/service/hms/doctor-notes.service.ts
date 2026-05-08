import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

/** SOAP-structured clinical note */
export interface HmsDoctorNote {
    noteId: string;
    consultationId: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    authorName?: string;
    authorEmail?: string;
    createdAt?: string;
    updatedAt?: string;
}

export type CreateDoctorNoteRequest = Omit<HmsDoctorNote, 'noteId' | 'createdAt' | 'updatedAt'> & { consultationId: string };
export type UpdateDoctorNoteRequest = Partial<Omit<HmsDoctorNote, 'noteId' | 'consultationId' | 'createdAt' | 'updatedAt'>>;

@Injectable({ providedIn: 'root' })
export class DoctorNotesService {
    private http = inject(HttpClient);
    private readonly base = `${environment.hmsApiUrl}/doctor-notes`;

    private headers(): HttpHeaders {
        return new HttpHeaders({ Authorization: `Bearer ${sessionStorage.getItem('accessToken') ?? ''}` });
    }

    getAll(consultationId?: string): Observable<HmsDoctorNote[]> {
        const params = consultationId ? new HttpParams().set('consultationId', consultationId) : undefined;
        return this.http.get<HmsDoctorNote[]>(this.base, { headers: this.headers(), params }).pipe(catchError(this.handleError));
    }

    getById(noteId: string, consultationId: string): Observable<HmsDoctorNote> {
        const params = new HttpParams().set('consultationId', consultationId);
        return this.http
            .get<HmsDoctorNote>(`${this.base}/${encodeURIComponent(noteId)}`, { headers: this.headers(), params })
            .pipe(catchError(this.handleError));
    }

    create(data: CreateDoctorNoteRequest): Observable<HmsDoctorNote> {
        return this.http.post<HmsDoctorNote>(this.base, data, { headers: this.headers() }).pipe(catchError(this.handleError));
    }

    update(noteId: string, consultationId: string, data: UpdateDoctorNoteRequest): Observable<HmsDoctorNote> {
        const params = new HttpParams().set('consultationId', consultationId);
        return this.http
            .put<HmsDoctorNote>(`${this.base}/${encodeURIComponent(noteId)}`, data, { headers: this.headers(), params })
            .pipe(catchError(this.handleError));
    }

    delete(noteId: string, consultationId: string): Observable<{ message: string }> {
        const params = new HttpParams().set('consultationId', consultationId);
        return this.http
            .delete<{ message: string }>(`${this.base}/${encodeURIComponent(noteId)}`, { headers: this.headers(), params })
            .pipe(catchError(this.handleError));
    }

    private handleError(error: HttpErrorResponse): Observable<never> {
        const message = (error.error as { message?: string })?.message ?? error.message ?? 'An unexpected error occurred';
        return throwError(() => new Error(message));
    }
}

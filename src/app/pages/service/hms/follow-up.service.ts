import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface HmsFollowUp {
    followUpId: string;
    consultationId: string;
    scheduledDate?: string;
    completedDate?: string;
    status?: 'scheduled' | 'completed' | 'missed' | 'cancelled';
    type?: 'in-person' | 'telehealth' | 'phone';
    purpose?: string;
    outcome?: string;
    nextFollowUpDate?: string;
    assignedTo?: string;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}

export type CreateFollowUpRequest = Omit<HmsFollowUp, 'followUpId' | 'createdAt' | 'updatedAt'> & { consultationId: string };
export type UpdateFollowUpRequest = Partial<Omit<HmsFollowUp, 'followUpId' | 'consultationId' | 'createdAt' | 'updatedAt'>>;

@Injectable({ providedIn: 'root' })
export class FollowUpService {
    private http = inject(HttpClient);
    private readonly base = `${environment.hmsApiUrl}/follow-ups`;

    private headers(): HttpHeaders {
        return new HttpHeaders({ Authorization: `Bearer ${sessionStorage.getItem('accessToken') ?? ''}` });
    }

    getAll(consultationId?: string): Observable<HmsFollowUp[]> {
        const params = consultationId ? new HttpParams().set('consultationId', consultationId) : undefined;
        return this.http.get<HmsFollowUp[]>(this.base, { headers: this.headers(), params }).pipe(catchError(this.handleError));
    }

    getById(followUpId: string, consultationId: string): Observable<HmsFollowUp> {
        const params = new HttpParams().set('consultationId', consultationId);
        return this.http
            .get<HmsFollowUp>(`${this.base}/${encodeURIComponent(followUpId)}`, { headers: this.headers(), params })
            .pipe(catchError(this.handleError));
    }

    create(data: CreateFollowUpRequest): Observable<HmsFollowUp> {
        return this.http.post<HmsFollowUp>(this.base, data, { headers: this.headers() }).pipe(catchError(this.handleError));
    }

    update(followUpId: string, consultationId: string, data: UpdateFollowUpRequest): Observable<HmsFollowUp> {
        const params = new HttpParams().set('consultationId', consultationId);
        return this.http
            .put<HmsFollowUp>(`${this.base}/${encodeURIComponent(followUpId)}`, data, { headers: this.headers(), params })
            .pipe(catchError(this.handleError));
    }

    delete(followUpId: string, consultationId: string): Observable<{ message: string }> {
        const params = new HttpParams().set('consultationId', consultationId);
        return this.http
            .delete<{ message: string }>(`${this.base}/${encodeURIComponent(followUpId)}`, { headers: this.headers(), params })
            .pipe(catchError(this.handleError));
    }

    private handleError(error: HttpErrorResponse): Observable<never> {
        const message = (error.error as { message?: string })?.message ?? error.message ?? 'An unexpected error occurred';
        return throwError(() => new Error(message));
    }
}

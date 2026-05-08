import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export type ReferralStatus = 'pending' | 'accepted' | 'rejected' | 'completed';

export interface HmsReferral {
    referralId: string;
    consultationId: string;
    referredTo?: string;
    referredToEmail?: string;
    specialty?: string;
    department?: string;
    status?: ReferralStatus;
    urgency?: 'routine' | 'urgent' | 'emergency';
    reason?: string;
    notes?: string;
    referralDate?: string;
    createdAt?: string;
    updatedAt?: string;
}

export type CreateReferralRequest = Omit<HmsReferral, 'referralId' | 'createdAt' | 'updatedAt'> & { consultationId: string };
export type UpdateReferralRequest = Partial<Omit<HmsReferral, 'referralId' | 'consultationId' | 'createdAt' | 'updatedAt'>>;

@Injectable({ providedIn: 'root' })
export class ReferralService {
    private http = inject(HttpClient);
    private readonly base = `${environment.hmsApiUrl}/referrals`;

    private headers(): HttpHeaders {
        return new HttpHeaders({ Authorization: `Bearer ${sessionStorage.getItem('accessToken') ?? ''}` });
    }

    getAll(consultationId?: string): Observable<HmsReferral[]> {
        const params = consultationId ? new HttpParams().set('consultationId', consultationId) : undefined;
        return this.http.get<HmsReferral[]>(this.base, { headers: this.headers(), params }).pipe(catchError(this.handleError));
    }

    getById(referralId: string, consultationId: string): Observable<HmsReferral> {
        const params = new HttpParams().set('consultationId', consultationId);
        return this.http
            .get<HmsReferral>(`${this.base}/${encodeURIComponent(referralId)}`, { headers: this.headers(), params })
            .pipe(catchError(this.handleError));
    }

    create(data: CreateReferralRequest): Observable<HmsReferral> {
        return this.http.post<HmsReferral>(this.base, data, { headers: this.headers() }).pipe(catchError(this.handleError));
    }

    update(referralId: string, consultationId: string, data: UpdateReferralRequest): Observable<HmsReferral> {
        const params = new HttpParams().set('consultationId', consultationId);
        return this.http
            .put<HmsReferral>(`${this.base}/${encodeURIComponent(referralId)}`, data, { headers: this.headers(), params })
            .pipe(catchError(this.handleError));
    }

    delete(referralId: string, consultationId: string): Observable<{ message: string }> {
        const params = new HttpParams().set('consultationId', consultationId);
        return this.http
            .delete<{ message: string }>(`${this.base}/${encodeURIComponent(referralId)}`, { headers: this.headers(), params })
            .pipe(catchError(this.handleError));
    }

    private handleError(error: HttpErrorResponse): Observable<never> {
        const message = (error.error as { message?: string })?.message ?? error.message ?? 'An unexpected error occurred';
        return throwError(() => new Error(message));
    }
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Config } from './config';

// ── Pagination types ───────────────────────────────────────────────────────
export interface PagedAppointmentsResponse {
    data: Appointment[];
    nextToken: string | null;
    hasMore: boolean;
    count: number;
    pageSize: number;
    /** Total rows in the dataset (unfiltered, admin-only). null if not available. */
    totalRecords?: number | null;
}

export interface AppointmentsPageOpts {
    pageSize?: number;
    nextToken?: string | null;
    /** 'upcoming' (today+future) | 'past' | 'all'. Server default: upcoming. */
    tab?: 'upcoming' | 'past' | 'all';
    date?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    priority?: string;
    visitType?: string;
    doctorId?: string;
    patientId?: string;
    /** Free-text — patientName / doctorName / department / chiefComplaint. */
    q?: string;
    sortDir?: 'asc' | 'desc';
}

export interface Appointment {
    appointmentId: string;
    // Patient
    patientId: string;
    patientName: string;
    // Doctor & Department — Step C.3: doctorId is the canonical foreign key.
    // doctorEmail is NOT stored on appointment rows — the doctor's current
    // email is looked up live by doctorId (so it stays correct after a
    // doctor changes their email).
    doctorId: string;
    doctorName: string;
    department: string;
    specialization?: string | null;
    // Scheduling
    date: string; // YYYY-MM-DD
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    duration: number; // minutes
    // Classification
    visitType: 'walk-in' | 'scheduled' | 'emergency' | 'referral' | 'follow-up' | 'check-up';
    priority: 'routine' | 'urgent' | 'emergency';
    status: 'scheduled' | 'checked-in' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
    // Referral
    referredBy?: string | null;
    referredByName?: string | null;
    // Clinical link
    encounterId?: string | null;
    // Flow tracking
    checkedInAt?: string | null;
    checkedOutAt?: string | null;
    cancelReason?: string | null;
    cancelledAt?: string | null;
    cancelledBy?: string | null;
    // Notes
    notes?: string | null;
    chiefComplaint?: string | null;
    // Audit
    createdBy: string;
    createdByName: string;
    createdAt: string;
    updatedAt: string | null;
    updatedBy?: string | null;
    // UI-only: weekday label derived from `date` (not persisted).
    dayName?: string;
}

export interface CreateAppointmentRequest {
    // Required
    patientId: string;
    patientName: string;
    doctorId: string;
    doctorName: string;
    department: string;
    date: string;
    startTime: string;
    endTime: string;
    // Optional
    specialization?: string | null;
    duration?: number;
    visitType?: string;
    priority?: string;
    status?: string;
    referredBy?: string | null;
    referredByName?: string | null;
    notes?: string | null;
    chiefComplaint?: string | null;
}

export interface UpdateAppointmentRequest {
    status?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    duration?: number;
    visitType?: string;
    priority?: string;
    notes?: string | null;
    chiefComplaint?: string | null;
    checkedInAt?: string | null;
    checkedOutAt?: string | null;
    cancelReason?: string | null;
    encounterId?: string | null;
    doctorId?: string;
    doctorName?: string;
    doctorEmail?: string;
    department?: string;
    specialization?: string | null;
    referredBy?: string | null;
    referredByName?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AppointmentsService {
    private readonly path = 'appointments';

    constructor(private http: HttpClient) {}

    private headers(): HttpHeaders {
        const jwt = sessionStorage.getItem('accessToken') || '';
        return new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`
        });
    }

    /**
     * Get appointments.
     * Admin → all appointments.
     * Doctor → own appointments (scoped by JWT on backend, no params needed).
     * Optional filters: date (YYYY-MM-DD), status.
     */
    /** @deprecated — pulls only the first page. Use getAppointmentsPage for production. */
    getAppointments(filters?: { date?: string; status?: string }): Observable<Appointment[]> {
        let params = new HttpParams().set('pageSize', '100').set('tab', 'all');
        if (filters?.date) params = params.set('date', filters.date);
        if (filters?.status) params = params.set('status', filters.status);
        return this.http.get<PagedAppointmentsResponse>(Config.buildUrl(this.path), { headers: this.headers(), params })
            .pipe(map((r: any) => (r?.data ?? r ?? []) as Appointment[]));
    }

    /**
     * Production paginated list. Pass filters + a nextToken to walk the cursor.
     * Server caps `pageSize` at 100.
     */
    getAppointmentsPage(opts: AppointmentsPageOpts = {}): Observable<PagedAppointmentsResponse> {
        let params = new HttpParams();
        const set = (k: string, v: any) => { if (v != null && v !== '') params = params.set(k, String(v)); };
        set('pageSize',  opts.pageSize ?? 25);
        set('nextToken', opts.nextToken);
        set('tab',       opts.tab);
        set('date',      opts.date);
        set('dateFrom',  opts.dateFrom);
        set('dateTo',    opts.dateTo);
        set('status',    opts.status);
        set('priority',  opts.priority);
        set('visitType', opts.visitType);
        set('doctorId',  opts.doctorId);
        set('patientId', opts.patientId);
        set('q',         opts.q);
        set('sortDir',   opts.sortDir);
        return this.http.get<PagedAppointmentsResponse>(Config.buildUrl(this.path), { headers: this.headers(), params });
    }

    getAppointmentById(appointmentId: string): Observable<Appointment> {
        return this.http.get<Appointment>(Config.buildUrl(`${this.path}/${appointmentId}`), { headers: this.headers() });
    }

    createAppointment(data: CreateAppointmentRequest): Observable<Appointment> {
        return this.http.post<Appointment>(Config.buildUrl(this.path), data, { headers: this.headers() });
    }

    updateAppointment(appointmentId: string, data: UpdateAppointmentRequest): Observable<Appointment> {
        return this.http.patch<Appointment>(Config.buildUrl(`${this.path}/${appointmentId}`), data, { headers: this.headers() });
    }

    deleteAppointment(appointmentId: string): Observable<void> {
        return this.http.delete<void>(Config.buildUrl(`${this.path}/${appointmentId}`), { headers: this.headers() });
    }

    // ── Convenience status update methods ────────────────────────────────────
    checkIn(appointmentId: string): Observable<Appointment> {
        return this.updateAppointment(appointmentId, { status: 'checked-in' });
    }

    checkOut(appointmentId: string): Observable<Appointment> {
        return this.updateAppointment(appointmentId, { status: 'completed' });
    }

    cancel(appointmentId: string, cancelReason: string): Observable<Appointment> {
        return this.updateAppointment(appointmentId, { status: 'cancelled', cancelReason });
    }

    markNoShow(appointmentId: string): Observable<Appointment> {
        return this.updateAppointment(appointmentId, { status: 'no-show' });
    }

    startConsultation(appointmentId: string): Observable<Appointment> {
        return this.updateAppointment(appointmentId, { status: 'in-progress' });
    }

    linkEncounter(appointmentId: string, encounterId: string): Observable<Appointment> {
        return this.updateAppointment(appointmentId, { encounterId });
    }
}

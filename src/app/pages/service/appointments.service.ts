import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Config } from './config';

const CALENDAR_API_KEY = 'tiryaq-hospital-001';

export interface Appointment {
    appointmentId: string;
    doctorId: string;
    doctorName: string;
    doctorEmail: string;
    patientId: string;
    patientName: string;
    date: string;
    startTime: string;
    endTime: string;
    duration: number;
    type: string;
    status: string;
    notes: string;
    calendarEventId?: string | null;
    calendarId?: string | null;
    createdAt: string;
}

export interface CreateAppointmentRequest {
    doctorId: string;
    doctorName: string;
    doctorEmail?: string | null;
    patientId: string;
    patientName: string;
    date: string;
    startTime: string;
    endTime: string;
    duration: number;
    type: string;
    status: string;
    notes: string;
    calendarEventId?: string | null;
    calendarId?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AppointmentsService {
    private readonly path = 'appointments';

    constructor(private http: HttpClient) {}

    /** x-api-key header for SaaS Calendar API */
    private headers(): HttpHeaders {
        return new HttpHeaders({ 'x-api-key': CALENDAR_API_KEY });
    }

    /** Get appointments. Pass doctorEmail to filter by doctor (doctor role only). */
    getAppointments(doctorEmail?: string): Observable<Appointment[]> {
        let params = new HttpParams();
        if (doctorEmail) params = params.set('doctorEmail', doctorEmail.toLowerCase().trim());
        return this.http.get<Appointment[]>(Config.buildCalendarUrl(this.path), { headers: this.headers(), params });
    }

    createAppointment(data: CreateAppointmentRequest): Observable<Appointment> {
        return this.http.post<Appointment>(Config.buildCalendarUrl(this.path), data, { headers: this.headers() });
    }

    updateAppointment(appointmentId: string, data: Partial<CreateAppointmentRequest>): Observable<Appointment> {
        return this.http.patch<Appointment>(Config.buildCalendarUrl(`${this.path}/${appointmentId}`), data, { headers: this.headers() });
    }

    deleteAppointment(appointmentId: string): Observable<void> {
        return this.http.delete<void>(Config.buildCalendarUrl(`${this.path}/${appointmentId}`), { headers: this.headers() });
    }
}

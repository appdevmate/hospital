import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

const API_URL = 'https://od8gx8kld8.execute-api.us-east-1.amazonaws.com';
const API_KEY = 'tiryaq-hospital-001';
const headers = new HttpHeaders({ 'x-api-key': API_KEY });

export interface Appointment {
    appointmentId: string;
    doctorId: string;
    doctorName: string;
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
    patientId: string;
    patientName: string;
    doctorEmail?: string | null;
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
    constructor(private http: HttpClient) {}

    getAppointments(doctorEmail?: string) {
        const params: any = {};
        if (doctorEmail) params['doctorEmail'] = doctorEmail.toLowerCase().trim();
        return this.http.get<Appointment[]>(`${API_URL}/appointments`, { headers, params });
    }

    createAppointment(data: CreateAppointmentRequest) {
        return this.http.post<Appointment>(`${API_URL}/appointments`, data, { headers });
    }

    updateAppointment(appointmentId: string, data: Partial<CreateAppointmentRequest>) {
        return this.http.patch<Appointment>(`${API_URL}/appointments/${appointmentId}`, data, { headers });
    }

    deleteAppointment(appointmentId: string) {
        return this.http.delete(`${API_URL}/appointments/${appointmentId}`, { headers });
    }
}

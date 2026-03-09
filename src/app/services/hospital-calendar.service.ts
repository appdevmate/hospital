import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

const API_URL = 'https://od8gx8kld8.execute-api.us-east-1.amazonaws.com';
const API_KEY = 'tiryaq-hospital-001';

const headers = new HttpHeaders({ 'x-api-key': API_KEY });

export interface HospitalCalendar {
    calendarId: string;
    name: string;
    description: string;
    createdAt: string;
}

export interface HospitalEvent {
    eventId: string;
    calendarId: string;
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    color?: string;
    recurrence?: string;
}

@Injectable({ providedIn: 'root' })
export class HospitalCalendarService {
    constructor(private http: HttpClient) {}

    getCalendars() {
        return this.http.get<HospitalCalendar[]>(`${API_URL}/calendars`, { headers });
    }

    createCalendar(name: string, description: string) {
        return this.http.post<HospitalCalendar>(`${API_URL}/calendars`, { name, description }, { headers });
    }

    getEvents(calendarId: string) {
        return this.http.get<HospitalEvent[]>(`${API_URL}/calendars/${calendarId}/events`, { headers });
    }

    createEvent(calendarId: string, event: Partial<HospitalEvent>) {
        return this.http.post<HospitalEvent>(`${API_URL}/calendars/${calendarId}/events`, event, { headers });
    }

    deleteCalendar(calendarId: string) {
        return this.http.delete(`${API_URL}/calendars/${calendarId}`, { headers });
    }
}

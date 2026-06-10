import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Config } from './config';

// Hospital calendar is now Akwadona-local — backed by the tiryaq-calendar Lambda
// writing into the Hospital DynamoDB table. The previous external CalendarPlatform
// API has been retired for PDPPL data-residency + clinical-privacy compliance.

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
    private http = inject(HttpClient);

    private headers(): HttpHeaders {
        const jwt = sessionStorage.getItem('accessToken') || '';
        return new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`
        });
    }

    getCalendars(): Observable<HospitalCalendar[]> {
        return this.http.get<HospitalCalendar[]>(Config.buildUrl('calendars'), { headers: this.headers() });
    }

    createCalendar(name: string, description: string): Observable<HospitalCalendar> {
        return this.http.post<HospitalCalendar>(Config.buildUrl('calendars'), { name, description }, { headers: this.headers() });
    }

    deleteCalendar(calendarId: string): Observable<void> {
        return this.http.delete<void>(Config.buildUrl(`calendars/${calendarId}`), { headers: this.headers() });
    }

    getEvents(calendarId: string): Observable<HospitalEvent[]> {
        return this.http.get<HospitalEvent[]>(Config.buildUrl(`calendars/${calendarId}/events`), { headers: this.headers() });
    }

    createEvent(calendarId: string, event: Partial<HospitalEvent>): Observable<HospitalEvent> {
        return this.http.post<HospitalEvent>(Config.buildUrl(`calendars/${calendarId}/events`), event, { headers: this.headers() });
    }

    updateEvent(calendarId: string, eventId: string, event: Partial<HospitalEvent>): Observable<HospitalEvent> {
        return this.http.patch<HospitalEvent>(Config.buildUrl(`calendars/${calendarId}/events/${eventId}`), event, { headers: this.headers() });
    }

    deleteEvent(calendarId: string, eventId: string): Observable<void> {
        return this.http.delete<void>(Config.buildUrl(`calendars/${calendarId}/events/${eventId}`), { headers: this.headers() });
    }
}

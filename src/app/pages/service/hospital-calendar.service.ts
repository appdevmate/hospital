import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Config } from './config';

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
        const jwt = sessionStorage.getItem('accessToken') ?? '';
        return new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    }

    getCalendars(): Observable<HospitalCalendar[]> {
        return this.http.get<HospitalCalendar[]>(Config.buildCalendarUrl('calendars'), { headers: this.headers() });
    }

    createCalendar(name: string, description: string): Observable<HospitalCalendar> {
        return this.http.post<HospitalCalendar>(Config.buildCalendarUrl('calendars'), { name, description }, { headers: this.headers() });
    }

    deleteCalendar(calendarId: string): Observable<void> {
        return this.http.delete<void>(Config.buildCalendarUrl(`calendars/${calendarId}`), { headers: this.headers() });
    }

    getEvents(calendarId: string): Observable<HospitalEvent[]> {
        return this.http.get<HospitalEvent[]>(Config.buildCalendarUrl(`calendars/${calendarId}/events`), { headers: this.headers() });
    }

    createEvent(calendarId: string, event: Partial<HospitalEvent>): Observable<HospitalEvent> {
        return this.http.post<HospitalEvent>(Config.buildCalendarUrl(`calendars/${calendarId}/events`), event, { headers: this.headers() });
    }

    updateEvent(calendarId: string, eventId: string, event: Partial<HospitalEvent>): Observable<HospitalEvent> {
        return this.http.patch<HospitalEvent>(Config.buildCalendarUrl(`calendars/${calendarId}/events/${eventId}`), event, { headers: this.headers() });
    }

    deleteEvent(calendarId: string, eventId: string): Observable<void> {
        return this.http.delete<void>(Config.buildCalendarUrl(`calendars/${calendarId}/events/${eventId}`), { headers: this.headers() });
    }
}

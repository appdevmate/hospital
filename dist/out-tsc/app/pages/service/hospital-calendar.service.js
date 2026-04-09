import { __decorate } from "tslib";
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Config } from './config';
const CALENDAR_API_KEY = 'tiryaq-hospital-001';
let HospitalCalendarService = class HospitalCalendarService {
    http = inject(HttpClient);
    headers() {
        return new HttpHeaders({ 'x-api-key': CALENDAR_API_KEY });
    }
    getCalendars() {
        return this.http.get(Config.buildCalendarUrl('calendars'), { headers: this.headers() });
    }
    createCalendar(name, description) {
        return this.http.post(Config.buildCalendarUrl('calendars'), { name, description }, { headers: this.headers() });
    }
    deleteCalendar(calendarId) {
        return this.http.delete(Config.buildCalendarUrl(`calendars/${calendarId}`), { headers: this.headers() });
    }
    getEvents(calendarId) {
        return this.http.get(Config.buildCalendarUrl(`calendars/${calendarId}/events`), { headers: this.headers() });
    }
    createEvent(calendarId, event) {
        return this.http.post(Config.buildCalendarUrl(`calendars/${calendarId}/events`), event, { headers: this.headers() });
    }
    updateEvent(calendarId, eventId, event) {
        return this.http.patch(Config.buildCalendarUrl(`calendars/${calendarId}/events/${eventId}`), event, { headers: this.headers() });
    }
    deleteEvent(calendarId, eventId) {
        return this.http.delete(Config.buildCalendarUrl(`calendars/${calendarId}/events/${eventId}`), { headers: this.headers() });
    }
};
HospitalCalendarService = __decorate([
    Injectable({ providedIn: 'root' })
], HospitalCalendarService);
export { HospitalCalendarService };

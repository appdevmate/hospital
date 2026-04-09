import { __decorate } from "tslib";
import { Injectable } from '@angular/core';
import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Config } from './config';
const CALENDAR_API_KEY = 'tiryaq-hospital-001';
let AppointmentsService = class AppointmentsService {
    http;
    path = 'appointments';
    constructor(http) {
        this.http = http;
    }
    /** x-api-key header for SaaS Calendar API */
    headers() {
        return new HttpHeaders({ 'x-api-key': CALENDAR_API_KEY });
    }
    /** Get appointments. Pass doctorEmail to filter by doctor (doctor role only). */
    getAppointments(doctorEmail) {
        let params = new HttpParams();
        if (doctorEmail)
            params = params.set('doctorEmail', doctorEmail.toLowerCase().trim());
        return this.http.get(Config.buildCalendarUrl(this.path), { headers: this.headers(), params });
    }
    createAppointment(data) {
        return this.http.post(Config.buildCalendarUrl(this.path), data, { headers: this.headers() });
    }
    updateAppointment(appointmentId, data) {
        return this.http.patch(Config.buildCalendarUrl(`${this.path}/${appointmentId}`), data, { headers: this.headers() });
    }
    deleteAppointment(appointmentId) {
        return this.http.delete(Config.buildCalendarUrl(`${this.path}/${appointmentId}`), { headers: this.headers() });
    }
};
AppointmentsService = __decorate([
    Injectable({ providedIn: 'root' })
], AppointmentsService);
export { AppointmentsService };

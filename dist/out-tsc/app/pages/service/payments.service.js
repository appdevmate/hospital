import { __decorate } from "tslib";
import { Injectable } from '@angular/core';
import { HttpHeaders, HttpParams } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Config } from './config';
let PaymentsService = class PaymentsService {
    http;
    constructor(http) {
        this.http = http;
    }
    authHeaders() {
        const jwt = sessionStorage.getItem('accessToken') || '';
        return new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    }
    /** GET /invoices — single request for all invoices (admin or doctor filtered) */
    getAllInvoices(doctorEmail) {
        let params = new HttpParams();
        if (doctorEmail)
            params = params.set('doctorEmail', doctorEmail.toLowerCase().trim());
        return this.http.get(Config.buildUrl('invoices'), { headers: this.authHeaders(), params });
    }
    /** GET /patients/:id/payments — per-patient payments (used in patient profile) */
    getPayments(patientId, doctorEmail) {
        let params = new HttpParams();
        if (doctorEmail)
            params = params.set('doctorEmail', doctorEmail.toLowerCase().trim());
        return this.http.get(Config.buildUrl(`patients/${encodeURIComponent(patientId)}/payments`), { headers: this.authHeaders(), params }).pipe(map((res) => ({
            data: res.data || res.items || [],
            count: res.count || 0
        })));
    }
    createPayment(patientId, payload) {
        return this.http.post(Config.buildUrl(`patients/${encodeURIComponent(patientId)}/payments`), payload, { headers: this.authHeaders() });
    }
    updatePayment(patientId, paymentId, payload) {
        return this.http.patch(Config.buildUrl(`patients/${encodeURIComponent(patientId)}/payments/${encodeURIComponent(paymentId)}`), payload, { headers: this.authHeaders() });
    }
    deletePayment(patientId, paymentId) {
        return this.http.delete(Config.buildUrl(`patients/${encodeURIComponent(patientId)}/payments/${encodeURIComponent(paymentId)}`), { headers: this.authHeaders() });
    }
};
PaymentsService = __decorate([
    Injectable({ providedIn: 'root' })
], PaymentsService);
export { PaymentsService };

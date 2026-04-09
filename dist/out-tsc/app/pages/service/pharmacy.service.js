import { __decorate } from "tslib";
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Config } from '@/pages/service/config';
// ── Service ───────────────────────────────────────────────────────────────────
let PharmacyService = class PharmacyService {
    http = inject(HttpClient);
    headers() {
        const jwt = sessionStorage.getItem('accessToken') || '';
        return new HttpHeaders({ 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` });
    }
    // Medications
    getMedications() {
        return this.http.get(Config.buildUrl('pharmacy/medications'), { headers: this.headers() });
    }
    createMedication(data) {
        return this.http.post(Config.buildUrl('pharmacy/medications'), data, { headers: this.headers() });
    }
    updateMedication(medId, data) {
        return this.http.patch(Config.buildUrl(`pharmacy/medications/${medId}`), data, { headers: this.headers() });
    }
    deleteMedication(medId) {
        return this.http.delete(Config.buildUrl(`pharmacy/medications/${medId}`), { headers: this.headers() });
    }
    // Inventory
    getInventory() {
        return this.http.get(Config.buildUrl('pharmacy/inventory'), { headers: this.headers() });
    }
    adjustStock(medId, data) {
        return this.http.patch(Config.buildUrl(`pharmacy/inventory/${medId}`), data, { headers: this.headers() });
    }
    // Prescriptions queue
    getPrescriptions(status = 'ordered') {
        const params = new HttpParams().set('status', status);
        return this.http.get(Config.buildUrl('pharmacy/prescriptions'), { headers: this.headers(), params });
    }
    // Dispense
    dispense(data) {
        return this.http.post(Config.buildUrl('pharmacy/dispense'), data, { headers: this.headers() });
    }
    getDispenseHistory(patientId) {
        let params = new HttpParams();
        if (patientId)
            params = params.set('patientId', patientId);
        return this.http.get(Config.buildUrl('pharmacy/dispense'), { headers: this.headers(), params });
    }
    // Purchase orders
    getPurchaseOrders() {
        return this.http.get(Config.buildUrl('pharmacy/purchase-orders'), { headers: this.headers() });
    }
    createPurchaseOrder(data) {
        return this.http.post(Config.buildUrl('pharmacy/purchase-orders'), data, { headers: this.headers() });
    }
    updatePurchaseOrder(poId, data) {
        return this.http.patch(Config.buildUrl(`pharmacy/purchase-orders/${poId}`), data, { headers: this.headers() });
    }
    // Alerts
    getAlerts() {
        return this.http.get(Config.buildUrl('pharmacy/alerts'), { headers: this.headers() });
    }
};
PharmacyService = __decorate([
    Injectable({ providedIn: 'root' })
], PharmacyService);
export { PharmacyService };

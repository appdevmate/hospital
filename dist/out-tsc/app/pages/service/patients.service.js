import { __decorate } from "tslib";
import { Injectable } from '@angular/core';
import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Config } from './config';
let PatientsService = class PatientsService {
    http;
    path = 'patients';
    deletePath = 'patients/delete';
    constructor(http) {
        this.http = http;
    }
    authHeaders() {
        const jwt = sessionStorage.getItem('accessToken') || '';
        return new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    }
    getPatientsPage(opts) {
        let params = new HttpParams();
        const setIf = (k, v) => {
            if (v === null || v === undefined)
                return;
            const s = String(v);
            if (s.trim() !== '')
                params = params.set(k, s);
        };
        const addFilter = (key, f) => {
            if (!f)
                return;
            const raw = typeof f.value === 'string' ? f.value.trim() : f.value;
            if (raw === '' || raw === undefined || raw === null)
                return;
            if (key === 'dobFrom' || key === 'dobTo') {
                params = params.set(String(key), String(raw));
                return;
            }
            if (f.matchMode === 'equals') {
                params = params.set(String(key), String(raw));
            }
            else {
                params = params.set(`${String(key)}.${f.matchMode}`, String(raw));
            }
        };
        // paging
        setIf('pageSize', opts.pageSize ?? 25);
        setIf('lastKey', opts.lastKey ?? null);
        setIf('offset', opts.offset ?? null);
        // sorting
        setIf('sortField', opts.sortField ?? null);
        setIf('sortOrder', opts.sortOrder ?? null);
        // deactivated view — only sent when true so default Lambda behaviour is untouched
        if (opts.showDeleted)
            params = params.set('showDeleted', 'true');
        // global search
        if (opts.search && opts.search.trim())
            params = params.set('search', opts.search.trim());
        // field filters
        addFilter('name', opts.name);
        addFilter('gender', opts.gender);
        addFilter('insurance', opts.insurance);
        addFilter('dobFrom', opts.dobFrom);
        addFilter('dobTo', opts.dobTo);
        // pass-through for arbitrary quick filters (status.notEquals etc.)
        const knownKeys = new Set(['pageSize', 'lastKey', 'offset', 'sortField', 'sortOrder', 'search', 'name', 'gender', 'insurance', 'dobFrom', 'dobTo', 'showDeleted']);
        Object.entries(opts).forEach(([k, v]) => {
            if (knownKeys.has(k))
                return;
            if (v === null || v === undefined)
                return;
            if (Array.isArray(v)) {
                if (v.length === 0)
                    return;
                params = params.set(k, v.map((x) => String(x)).join(','));
                return;
            }
            if (k.includes('.')) {
                params = params.set(k, String(v));
                return;
            }
            if (typeof v !== 'object') {
                params = params.set(k, String(v));
                return;
            }
            const maybe = v;
            if (maybe && 'value' in maybe && 'matchMode' in maybe) {
                const raw = typeof maybe.value === 'string' ? maybe.value.trim() : maybe.value;
                if (raw !== '' && raw !== undefined && raw !== null) {
                    if (maybe.matchMode === 'equals')
                        params = params.set(k, String(raw));
                    else
                        params = params.set(`${k}.${maybe.matchMode}`, String(raw));
                }
            }
        });
        const url = Config.buildUrl(this.path);
        console.log('GET /patients query ->', params.toString());
        return this.http.get(url, { headers: this.authHeaders(), params });
    }
    getPatientById(patientID) {
        return this.http.get(`${Config.buildUrl(this.path)}/${encodeURIComponent(patientID)}`, { headers: this.authHeaders() });
    }
    getPatientPayments(patientID, pageSize = 50, lastKey) {
        let params = new HttpParams().set('pageSize', String(pageSize));
        if (lastKey)
            params = params.set('lastKey', lastKey);
        return this.http.get(`${Config.buildUrl(this.path)}/${encodeURIComponent(patientID)}/payments`, { headers: this.authHeaders(), params });
    }
    getFilterOptions(field) {
        return this.http.get(`${Config.buildUrl(this.path)}/filter-options/${field}`, { headers: this.authHeaders() });
    }
    createPatient(patientData) {
        return this.http.post(Config.buildUrl(this.path), patientData, {
            headers: this.authHeaders()
        });
    }
    updatePatient(patientID, patientData) {
        return this.http.patch(Config.buildUrl(`${this.path}/${patientID}`), patientData, { headers: this.authHeaders() });
    }
    deletePatient(patientID) {
        return this.http.delete(Config.buildUrl(`${this.path}/${patientID}`), { headers: this.authHeaders() });
    }
    hardDeletePatient(idList) {
        return this.http.delete(Config.buildUrl(this.deletePath), {
            headers: this.authHeaders(),
            body: { ids: idList }
        });
    }
    // ── Restore a deactivated patient ─────────────────────────────────────────
    // Calls PATCH /patients/{id}/restore — clears deletedAt and increments
    // the patient counter back by 1 (mirrors the deletePatient transaction)
    restorePatient(patientID) {
        return this.http.patch(Config.buildUrl(`${this.path}/${encodeURIComponent(patientID)}/restore`), {}, { headers: this.authHeaders() });
    }
};
PatientsService = __decorate([
    Injectable({ providedIn: 'root' })
], PatientsService);
export { PatientsService };

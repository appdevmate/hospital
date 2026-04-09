import { __decorate } from "tslib";
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Config } from './config';
let DoctorsService = class DoctorsService {
    http = inject(HttpClient);
    path = 'doctors';
    deletePath = 'doctors/delete';
    authHeaders() {
        const jwt = sessionStorage.getItem('accessToken') || '';
        return new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    }
    getDoctorsPage(opts) {
        let params = new HttpParams();
        const setIf = (k, v) => {
            if (v === null || v === undefined)
                return;
            const s = String(v);
            if (s.trim())
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
            if (f.matchMode === 'equals')
                params = params.set(String(key), String(raw));
            else
                params = params.set(`${String(key)}.${f.matchMode}`, String(raw));
        };
        setIf('pageSize', opts.pageSize ?? 25);
        setIf('lastKey', opts.lastKey ?? null);
        setIf('offset', opts.offset ?? null);
        setIf('sortField', opts.sortField ?? null);
        setIf('sortOrder', opts.sortOrder ?? null);
        if (opts.search?.trim())
            params = params.set('search', opts.search.trim());
        addFilter('name', opts.name);
        addFilter('gender', opts.gender);
        addFilter('insurance', opts.insurance);
        addFilter('dobFrom', opts.dobFrom);
        addFilter('dobTo', opts.dobTo);
        const knownKeys = new Set(['pageSize', 'lastKey', 'offset', 'sortField', 'sortOrder', 'search', 'name', 'gender', 'insurance', 'dobFrom', 'dobTo']);
        Object.entries(opts).forEach(([k, v]) => {
            if (knownKeys.has(k) || v === null || v === undefined)
                return;
            if (Array.isArray(v)) {
                if (v.length)
                    params = params.set(k, v.map(String).join(','));
                return;
            }
            if (k.includes('.') || typeof v !== 'object') {
                params = params.set(k, String(v));
                return;
            }
            const maybe = v;
            if ('value' in maybe && 'matchMode' in maybe) {
                const raw = typeof maybe.value === 'string' ? maybe.value.trim() : maybe.value;
                if (raw !== '' && raw !== undefined && raw !== null) {
                    if (maybe.matchMode === 'equals')
                        params = params.set(k, String(raw));
                    else
                        params = params.set(`${k}.${maybe.matchMode}`, String(raw));
                }
            }
        });
        return this.http.get(Config.buildUrl(this.path), { headers: this.authHeaders(), params });
    }
    getDoctorById(doctorID) {
        return this.http.get(`${Config.buildUrl(this.path)}/${encodeURIComponent(doctorID)}`, { headers: this.authHeaders() });
    }
    getDoctorByEmail(email) {
        return this.http.post(Config.buildUrl(this.path + '/email'), { email, type: 'DOCTOR' }, { headers: this.authHeaders() });
    }
    getDoctorPayments(doctorID, pageSize = 50, lastKey) {
        let params = new HttpParams().set('pageSize', String(pageSize));
        if (lastKey)
            params = params.set('lastKey', lastKey);
        return this.http.get(`${Config.buildUrl(this.path)}/${encodeURIComponent(doctorID)}/payments`, { headers: this.authHeaders(), params });
    }
    getFilterOptions(field) {
        return this.http.get(`${Config.buildUrl(this.path)}/filter-options/${field}`, { headers: this.authHeaders() });
    }
    createDoctor(doctorData) {
        return this.http.post(Config.buildUrl(this.path), doctorData, { headers: this.authHeaders() });
    }
    updateDoctor(doctorID, doctorData) {
        return this.http.patch(Config.buildUrl(`${this.path}/${doctorID}`), doctorData, { headers: this.authHeaders() });
    }
    deleteDoctor(doctorID) {
        return this.http.delete(Config.buildUrl(`${this.path}/${doctorID}`), { headers: this.authHeaders() });
    }
    hardDeleteDoctor(idList) {
        return this.http.delete(Config.buildUrl(this.deletePath), { headers: this.authHeaders(), body: { ids: idList } });
    }
    searchSpecializations(search = '', limit = 20) {
        const params = new HttpParams().set('search', search).set('limit', String(limit));
        return this.http.get(Config.buildUrl('specializations'), { headers: this.authHeaders(), params }).pipe(map((r) => r?.items ?? []));
    }
    createSpecialization(payload) {
        return this.http.post(Config.buildUrl('specializations'), payload, { headers: this.authHeaders() });
    }
    searchDepartments(search = '', limit = 20) {
        const params = new HttpParams().set('search', search).set('limit', String(limit));
        return this.http.get(Config.buildUrl('departments'), { headers: this.authHeaders(), params }).pipe(map((r) => r?.items ?? []));
    }
    createDepartment(payload) {
        return this.http.post(Config.buildUrl('departments'), payload, { headers: this.authHeaders() });
    }
    bulkCreateDepartments(items) {
        return this.http.post(Config.buildUrl('departments/bulk'), { items }, { headers: this.authHeaders() });
    }
    bulkCreateSpecializations(items) {
        return this.http.post(Config.buildUrl('specializations/bulk'), { items }, { headers: this.authHeaders() });
    }
};
DoctorsService = __decorate([
    Injectable({ providedIn: 'root' })
], DoctorsService);
export { DoctorsService };

import { __decorate } from "tslib";
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Config } from '@/pages/service/config';
let AdminPanelService = class AdminPanelService {
    http = inject(HttpClient);
    headers() {
        const jwt = sessionStorage.getItem('accessToken') || '';
        return new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`
        });
    }
    // ── Stats ─────────────────────────────────────────────────────────────────
    getStats() {
        return this.http.get(Config.buildUrl('admin/stats'), { headers: this.headers() });
    }
    // ── Users ─────────────────────────────────────────────────────────────────
    getUsers(filter, nextToken) {
        let params = new HttpParams();
        if (filter)
            params = params.set('filter', filter);
        if (nextToken)
            params = params.set('nextToken', nextToken);
        return this.http.get(Config.buildUrl('admin/users'), { headers: this.headers(), params });
    }
    disableUser(username) {
        return this.http.post(Config.buildUrl(`admin/users/${encodeURIComponent(username)}/disable`), {}, { headers: this.headers() });
    }
    enableUser(username) {
        return this.http.post(Config.buildUrl(`admin/users/${encodeURIComponent(username)}/enable`), {}, { headers: this.headers() });
    }
    setPassword(username, password) {
        return this.http.post(Config.buildUrl(`admin/users/${encodeURIComponent(username)}/set-password`), { password }, { headers: this.headers() });
    }
    // ── Audit ─────────────────────────────────────────────────────────────────
    getAuditLog(params) {
        let p = new HttpParams();
        if (params.date)
            p = p.set('date', params.date);
        if (params.entityType)
            p = p.set('entityType', params.entityType);
        if (params.entityId)
            p = p.set('entityId', params.entityId);
        if (params.action)
            p = p.set('action', params.action);
        if (params.actor)
            p = p.set('actor', params.actor);
        if (params.limit)
            p = p.set('limit', String(params.limit));
        return this.http.get(Config.buildUrl('admin/audit'), { headers: this.headers(), params: p });
    }
};
AdminPanelService = __decorate([
    Injectable({ providedIn: 'root' })
], AdminPanelService);
export { AdminPanelService };

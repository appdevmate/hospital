import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Config } from '@/pages/service/config';

export interface AdminStats {
    totalPatients: number;
    totalDoctors: number;
    totalExams: number;
    totalInvoices: number;
}

export interface CognitoUser {
    username: string;
    email: string;
    name: string;
    sub: string;
    status: string;
    enabled: boolean;
    created: string;
    modified: string;
    groups: string[];
}

export interface AuditItem {
    auditId: string;
    action: string;
    entityType: string;
    entityId: string;
    actorEmail: string;
    actorName: string;
    timestamp: string;
    changeSummary: string;
    before: string | null;
    after: string | null;
}

@Injectable({ providedIn: 'root' })
export class AdminPanelService {
    private http = inject(HttpClient);

    private headers(): HttpHeaders {
        const jwt = sessionStorage.getItem('accessToken') || '';
        return new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`
        });
    }

    // ── Stats ─────────────────────────────────────────────────────────────────
    getStats(): Observable<AdminStats> {
        return this.http.get<AdminStats>(Config.buildUrl('admin/stats'), { headers: this.headers() });
    }

    // ── Users ─────────────────────────────────────────────────────────────────
    getUsers(filter?: string, nextToken?: string): Observable<{ users: CognitoUser[]; nextToken: string | null }> {
        let params = new HttpParams();
        if (filter) params = params.set('filter', filter);
        if (nextToken) params = params.set('nextToken', nextToken);
        return this.http.get<any>(Config.buildUrl('admin/users'), { headers: this.headers(), params });
    }

    disableUser(username: string): Observable<any> {
        return this.http.post(Config.buildUrl(`admin/users/${encodeURIComponent(username)}/disable`), {}, { headers: this.headers() });
    }

    enableUser(username: string): Observable<any> {
        return this.http.post(Config.buildUrl(`admin/users/${encodeURIComponent(username)}/enable`), {}, { headers: this.headers() });
    }

    setPassword(username: string, password: string): Observable<any> {
        return this.http.post(Config.buildUrl(`admin/users/${encodeURIComponent(username)}/set-password`), { password }, { headers: this.headers() });
    }

    // ── Audit ─────────────────────────────────────────────────────────────────
    getAuditLog(params: { date?: string; entityType?: string; entityId?: string; action?: string; actor?: string; limit?: number }): Observable<{ date: string; count: number; items: AuditItem[] }> {
        let p = new HttpParams();
        if (params.date) p = p.set('date', params.date);
        if (params.entityType) p = p.set('entityType', params.entityType);
        if (params.entityId) p = p.set('entityId', params.entityId);
        if (params.action) p = p.set('action', params.action);
        if (params.actor) p = p.set('actor', params.actor);
        if (params.limit) p = p.set('limit', String(params.limit));
        return this.http.get<any>(Config.buildUrl('admin/audit'), { headers: this.headers(), params: p });
    }
}

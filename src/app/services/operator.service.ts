import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { switchMap } from 'rxjs/operators';
import { Config } from './config';

/**
 * Akwadona Operator Console API client (Step 7).
 *
 * Calls /operator/* endpoints on the API Gateway. All requests require a
 * JWT with `role: operator` — anything else returns 403 from the backend.
 *
 * This service never sees PHI:
 *   - listTenants() returns tenant metadata (name, plan, status).
 *   - getTenantStats() returns counts (patients, doctors, appointments).
 *   - getTenantAudit() returns audit METADATA — the encrypted before/after
 *     PHI snapshots are stripped server-side before returning.
 *   - updateTenant() updates tenant config (limits, plan, status) only.
 */

export interface TenantSummary {
    slug: string;
    tenantId: string;
    name: string;
    status: string;
    plan: string;
    contractStart: string | null;
    createdAt: string;
    updatedAt: string;
}

/**
 * Step 7g — PHI-blind + business-data-blind operator stats.
 * Patient / doctor / appointment counters are NEVER exposed.
 */
export interface TenantStats {
    slug: string;
    tenantId: string;
    subscription: {
        plan: string;
        status: string;
        contractStart: string | null;
        mrrUSD: number | null;
    };
    usage: {
        apiCalls24h: number | null;
        bandwidthGB30d: number | null;
        activeUsers: number | null;
        storageGB: number | null;
        estimatedMonthlyCostUSD: number | null;
        // Step 2g.5 — how many requests this tenant got 429'd in the last 24h.
        throttle429Count24h: number | null;
    };
    compliance: {
        baaSigned: boolean;
        baaSignedAt: string | null;
        dpaSigned: boolean;
        dpaSignedAt: string | null;
        lastAuditDate: string | null;
    };
    encryption: {
        kmsKeyId: string | null;
        hmacKeyId: string | null;
    };
    lastActivityAt: string | null;
}

/**
 * Sanitized audit metadata. `category` is coarsened so the operator never
 * sees which clinical entity a tenant user touched.
 */
export interface AuditEntry {
    auditId: string;
    category: 'AUTH' | 'DATA_READ' | 'DATA_WRITE' | 'DATA_DELETE' | 'OPERATOR_ACTION' | 'OTHER';
    actorEmail: string;
    ipAddress: string;
    timestamp: string;
}

/**
 * Tenant onboarding wizard payload — sent to POST /operator/tenants. Backend
 * provisions per-tenant KMS data + HMAC CMKs, writes the TENANT profile row,
 * and creates the initial admin Cognito user. Returns a temp password the
 * operator must forward to the customer over a trusted channel.
 */
export interface NewTenantRequest {
    slug: string;
    name: string;
    plan: 'free' | 'standard' | 'enterprise';
    country?: string;
    contactEmail?: string;
    adminEmail: string;
    adminName: string;
    adminUsername?: string;
}

export interface NewTenantResponse {
    slug: string;
    tenantId: string;
    name: string;
    plan: string;
    kmsKeyId: string;
    hmacKeyId: string;
    admin: {
        username: string;
        email: string;
        tempPassword: string;
        signInUrl: string;
    };
    createdAt: string;
}

export interface TenantUpdate {
    status?: string;
    plan?: string;
    name?: string;
    contractStart?: string;
    notes?: string;
    limits?: {
        rps?: number;
        dailyQuota?: number;
        storageGB?: number;
        maxUploadMB?: number;
        uploadsPerMinute?: number;
    };
    // Step 7g — operator records billing + compliance signatures.
    mrrUSD?: number;
    baaSigned?: boolean;
    baaSignedAt?: string;
    dpaSigned?: boolean;
    dpaSignedAt?: string;
    lastAuditDate?: string;
}

@Injectable({ providedIn: 'root' })
export class OperatorService {
    private http = inject(HttpClient);
    private oidc = inject(OidcSecurityService);

    listTenants(): Observable<{ tenants: TenantSummary[] }> {
        return this.authedGet(Config.buildUrl('operator/tenants'));
    }

    /**
     * Step 7i — combined detail call: tenant profile + stats + audit in one
     * round-trip. Pass `expand: ['stats','audit']` to ask the server to
     * include them inline on the response (saves 2 extra round-trips).
     */
    getTenant(slug: string, opts?: { expand?: ('stats' | 'audit')[]; auditLimit?: number }): Observable<any> {
        let params = new HttpParams();
        if (opts?.expand?.length) params = params.set('expand', opts.expand.join(','));
        if (opts?.auditLimit) params = params.set('limit', String(opts.auditLimit));
        return this.authedGet(Config.buildUrl(`operator/tenants/${encodeURIComponent(slug)}`), params);
    }

    getTenantStats(slug: string): Observable<TenantStats> {
        return this.authedGet(Config.buildUrl(`operator/tenants/${encodeURIComponent(slug)}/stats`));
    }

    getTenantAudit(slug: string, opts?: { date?: string; limit?: number }): Observable<{ date: string; count: number; items: AuditEntry[] }> {
        let params = new HttpParams();
        if (opts?.date) params = params.set('date', opts.date);
        if (opts?.limit) params = params.set('limit', String(opts.limit));
        return this.authedGet(Config.buildUrl(`operator/tenants/${encodeURIComponent(slug)}/audit`), params);
    }

    updateTenant(slug: string, updates: TenantUpdate): Observable<{ slug: string; updated: TenantUpdate; updatedAt: string }> {
        return this.oidc.getAccessToken().pipe(
            switchMap((token) => this.http.patch<any>(
                Config.buildUrl(`operator/tenants/${encodeURIComponent(slug)}`),
                updates,
                { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
            ))
        );
    }

    /**
     * Step 96 — self-service tenant onboarding. Backend performs all the
     * KMS / DynamoDB / Cognito provisioning atomically and rolls back on
     * any partial failure.
     */
    createTenant(payload: NewTenantRequest): Observable<NewTenantResponse> {
        return this.oidc.getAccessToken().pipe(
            switchMap((token) => this.http.post<NewTenantResponse>(
                Config.buildUrl('operator/tenants'),
                payload,
                { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
            ))
        );
    }

    private authedGet<T>(url: string, params?: HttpParams): Observable<T> {
        return this.oidc.getAccessToken().pipe(
            switchMap((token) => this.http.get<T>(url, {
                headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
                params
            }))
        );
    }
}

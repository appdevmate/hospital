import { Injectable } from '@angular/core';

/**
 * Akwadona — Tenant Service (Step 2e).
 *
 * Reads the current customer ("tenant") from two sources:
 *
 *   1. SUBDOMAIN (display)   — `tiryaq.akwadona.com` → slug `tiryaq`.
 *   2. JWT CLAIM (authority) — `tenantId` claim minted by Cognito's
 *                              pre-token-generation Lambda (Step 2b).
 *
 * Why two sources:
 *   - The subdomain gives a friendly brand name we can show in the UI.
 *   - The JWT carries the opaque tenantId backend Lambdas trust. The JWT
 *     is signed by Cognito so a malicious client cannot forge it.
 *
 * Mismatch handling: if the subdomain says `tiryaq` but the JWT says
 * tenantId belongs to `alshifaa`, the user is in the wrong place. We
 * expose `subdomainMatchesJwt()` so guards can sign the user out and
 * redirect them to their own subdomain — never serve the wrong tenant's
 * data even by mistake.
 *
 * Deterministic slug → tenantId map (mirror of scripts/lib/tenant-ids.js):
 *   tiryaq   → T_2572fc71
 *   alshifaa → T_a4b8aef9
 *
 * Updated by the operator when a new customer is onboarded. Frontend
 * doesn't need to recompute — just declare known slugs here.
 */

const TENANTS: Record<string, { tenantId: string; displayName: string }> = {
    tiryaq:   { tenantId: 'T_2572fc71', displayName: 'Tiryaq Hospital' },
    alshifaa: { tenantId: 'T_a4b8aef9', displayName: 'Alshifaa Hospital' }
};

@Injectable({ providedIn: 'root' })
export class TenantService {
    private _slug: string | null = null;
    private _jwtTenantId: string | null = null;

    /** Lowercased subdomain prefix from window.location, e.g. "tiryaq". */
    get slug(): string | null {
        if (this._slug !== null) return this._slug;
        this._slug = this.readSlugFromUrl();
        return this._slug;
    }

    /** Friendly name shown in UI, e.g. "Tiryaq Hospital". */
    get displayName(): string {
        const s = this.slug;
        if (!s) return 'Akwadona';
        return TENANTS[s]?.displayName ?? s;
    }

    /**
     * tenantId resolved from the URL slug. UI-only — backend trusts only
     * the JWT claim. Returns null if subdomain is unknown.
     */
    get tenantIdFromUrl(): string | null {
        const s = this.slug;
        return s ? (TENANTS[s]?.tenantId ?? null) : null;
    }

    /** tenantId carried by the current access token (authoritative). */
    get tenantIdFromJwt(): string | null {
        if (this._jwtTenantId !== null) return this._jwtTenantId;
        try {
            const token = sessionStorage.getItem('accessToken') || '';
            if (!token || token.split('.').length !== 3) return null;
            const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            const pad = part + '='.repeat((4 - (part.length % 4)) % 4);
            const payload = JSON.parse(atob(pad));
            this._jwtTenantId = payload?.tenantId || null;
        } catch {
            this._jwtTenantId = null;
        }
        return this._jwtTenantId;
    }

    /**
     * Returns true when the subdomain's tenantId matches the JWT's
     * tenantId. False means the user is on the wrong subdomain — caller
     * should sign them out and redirect.
     */
    subdomainMatchesJwt(): boolean {
        const urlTid = this.tenantIdFromUrl;
        const jwtTid = this.tenantIdFromJwt;
        // If we can't resolve either side, refuse to claim a match.
        if (!urlTid || !jwtTid) return false;
        return urlTid === jwtTid;
    }

    /** Reset cached values — call after sign-out / token refresh. */
    invalidate(): void {
        this._slug = null;
        this._jwtTenantId = null;
    }

    /**
     * Parse the subdomain. Examples:
     *   tiryaq.akwadona.com         → 'tiryaq'
     *   alshifaa.akwadona.com       → 'alshifaa'
     *   www.akwadona.com            → 'www'      (operator console — Step 7)
     *   akwadona.com                → null       (bare apex — landing page)
     *   localhost / 127.0.0.1       → 'tiryaq'   (dev fallback)
     */
    private readSlugFromUrl(): string | null {
        const host = (window?.location?.hostname || '').toLowerCase();
        if (!host) return null;

        // Dev convenience — local builds always behave as the Tiryaq tenant.
        if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) {
            return 'tiryaq';
        }

        // Strip the public apex.
        const apex = 'akwadona.com';
        if (host === apex) return null;
        if (!host.endsWith(`.${apex}`)) return null;

        const sub = host.slice(0, -1 * (apex.length + 1));
        // Multi-level subdomains: take the leftmost label.
        const slug = sub.split('.')[0] || null;
        return slug;
    }
}

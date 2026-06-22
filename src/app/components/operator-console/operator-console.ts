import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { SkeletonModule } from 'primeng/skeleton';
import { TranslatePipe } from '@ngx-translate/core';
import { OperatorService, TenantSummary, TenantStats, AuditEntry, TenantUpdate } from '@/services/operator.service';
import { CacheService } from '@/services/cache.service';

/**
 * Akwadona Operator Console (Step 7g).
 *
 * What the operator sees: subscription, platform usage, compliance, encryption.
 * What the operator NEVER sees: patient / doctor / appointment counts or any
 * other clinical data. Modeled after Athenahealth / Stripe Connect / Vercel
 * Teams: the platform vendor sees billable usage, not the customer's domain.
 */

@Component({
    selector: 'app-operator-console',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        ButtonModule, TableModule, TagModule, CardModule, DialogModule,
        InputTextModule, InputNumberModule, SelectModule, CheckboxModule, ToastModule,
        SkeletonModule, TranslatePipe
    ],
    providers: [MessageService],
    template: `
        <p-toast></p-toast>

        <div class="op-shell">
            <header class="op-header">
                <div>
                    <h1>{{ 'operatorConsole.title' | translate }}</h1>
                    <p class="subtitle">{{ 'operatorConsole.subtitle' | translate }}</p>
                </div>
                <span class="zk-badge" title="The operator console cannot see customer data.">{{ 'topbar.phiBlind' | translate }} ✓</span>
            </header>

            <div class="op-body">
                <!-- Tenant list -->
                <section class="tenants-panel">
                    <div class="panel-title">
                        <h2>{{ 'operatorConsole.tenants' | translate }}</h2>
                        <p-button icon="pi pi-refresh" severity="secondary" [text]="true" size="small" (onClick)="reload()" />
                    </div>

                    @if (loading()) {
                        <ul class="tenant-list">
                            @for (i of [1,2,3]; track i) {
                                <li class="skeleton-row">
                                    <p-skeleton width="70%" height="1rem" styleClass="mb-2"></p-skeleton>
                                    <p-skeleton width="50%" height="0.75rem"></p-skeleton>
                                </li>
                            }
                        </ul>
                    } @else if (tenants().length === 0) {
                        <div class="empty">{{ 'operatorConsole.noTenants' | translate }}</div>
                    } @else {
                        <ul class="tenant-list">
                            @for (t of tenants(); track t.slug) {
                                <li [class.selected]="t.slug === selectedSlug()" (click)="select(t.slug)">
                                    <div class="row-name">
                                        <strong>{{ t.name || t.slug }}</strong>
                                        <p-tag [value]="t.status" [severity]="statusSeverity(t.status)" />
                                    </div>
                                    <div class="row-meta">
                                        <span>{{ t.slug }}.akwadona.com</span>
                                        <span class="dot">·</span>
                                        <span>{{ t.plan }}</span>
                                    </div>
                                </li>
                            }
                        </ul>
                    }
                </section>

                <!-- Tenant detail -->
                <section class="detail-panel">
                    @if (!selectedTenant()) {
                        <div class="empty-detail">
                            <i class="pi pi-arrow-left"></i>
                            <p>{{ 'operatorConsole.selectTenant' | translate }}</p>
                        </div>
                    } @else {
                        <div class="detail-header">
                            <div>
                                <h2>{{ selectedTenant()!.name }}</h2>
                                <p class="subtitle">{{ selectedTenant()!.slug }}.akwadona.com · tenantId <code>{{ selectedTenant()!.tenantId }}</code></p>
                            </div>
                            <p-button [label]="'common.edit' | translate" icon="pi pi-pencil" (onClick)="openEdit()" />
                        </div>

                        <!-- Subscription -->
                        <h3 class="section-h">{{ 'operatorConsole.subscription' | translate }}</h3>
                        <div class="kv-grid">
                            <div><span>{{ 'operatorConsole.cards.plan' | translate }}</span><strong>{{ stats()?.subscription?.plan || '—' }}</strong></div>
                            <div><span>{{ 'operatorConsole.cards.statusLabel' | translate }}</span><strong>{{ stats()?.subscription?.status || '—' }}</strong></div>
                            <div><span>{{ 'operatorConsole.cards.contractStart' | translate }}</span><strong>{{ stats()?.subscription?.contractStart || '—' }}</strong></div>
                            <div><span>{{ 'operatorConsole.cards.mrr' | translate }}</span><strong>{{ stats()?.subscription?.mrrUSD ?? '—' }}</strong></div>
                        </div>

                        <!-- Platform usage (no business data) -->
                        <h3 class="section-h">{{ 'operatorConsole.platformUsage' | translate }}</h3>
                        <div class="stats-grid">
                            <div class="stat-card">
                                <div class="stat-label">{{ 'operatorConsole.cards.apiCalls24h' | translate }}</div>
                                <div class="stat-value">{{ stats()?.usage?.apiCalls24h ?? '—' }}</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">{{ 'operatorConsole.cards.bandwidth30d' | translate }}</div>
                                <div class="stat-value">{{ stats()?.usage?.bandwidthGB30d ?? '—' }}</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">{{ 'operatorConsole.cards.activeUsers' | translate }}</div>
                                <div class="stat-value">{{ stats()?.usage?.activeUsers ?? '—' }}</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">{{ 'operatorConsole.cards.storage' | translate }}</div>
                                <div class="stat-value">{{ stats()?.usage?.storageGB ?? '—' }}</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">{{ 'operatorConsole.cards.estCost' | translate }}</div>
                                <div class="stat-value">{{ stats()?.usage?.estimatedMonthlyCostUSD ?? '—' }}</div>
                            </div>
                            <div class="stat-card" [class.warn]="(stats()?.usage?.throttle429Count24h ?? 0) > 0">
                                <div class="stat-label">{{ 'operatorConsole.cards.rateLimited' | translate }}</div>
                                <div class="stat-value">{{ stats()?.usage?.throttle429Count24h ?? '—' }}</div>
                                @if ((stats()?.usage?.throttle429Count24h ?? 0) > 0) {
                                    <div class="stat-hint">{{ 'operatorConsole.cards.rateLimitedHint' | translate }}</div>
                                }
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">{{ 'operatorConsole.cards.lastActivity' | translate }}</div>
                                <div class="stat-value small">{{ stats()?.lastActivityAt ? (stats()?.lastActivityAt! | date:'short') : '—' }}</div>
                            </div>
                        </div>

                        <!-- Limits -->
                        <h3 class="section-h">{{ 'operatorConsole.limits' | translate }}</h3>
                        <div class="kv-grid">
                            <div><span>{{ 'operatorConsole.limitsPanel.ratePerSec' | translate }}</span><strong>{{ selectedTenant()!.limits?.rps ?? '—' }}</strong></div>
                            <div><span>{{ 'operatorConsole.limitsPanel.dailyQuota' | translate }}</span><strong>{{ selectedTenant()!.limits?.dailyQuota ?? '—' }}</strong></div>
                            <div><span>{{ 'operatorConsole.limitsPanel.storageCap' | translate }}</span><strong>{{ selectedTenant()!.limits?.storageGB ?? '—' }}</strong></div>
                            <div><span>{{ 'operatorConsole.limitsPanel.maxUpload' | translate }}</span><strong>{{ selectedTenant()!.limits?.maxUploadMB ?? '—' }}</strong></div>
                        </div>

                        <!-- Compliance -->
                        <h3 class="section-h">{{ 'operatorConsole.compliance' | translate }}</h3>
                        <div class="kv-grid">
                            <div>
                                <span>{{ 'operatorConsole.compliancePanel.baaSigned' | translate }}</span>
                                <strong>
                                    <p-tag [value]="(stats()?.compliance?.baaSigned ? 'operatorConsole.compliancePanel.signed' : 'operatorConsole.compliancePanel.pending') | translate" [severity]="stats()?.compliance?.baaSigned ? 'success' : 'warn'" />
                                    @if (stats()?.compliance?.baaSignedAt) {
                                        <small class="muted">{{ stats()?.compliance?.baaSignedAt | date:'mediumDate' }}</small>
                                    }
                                </strong>
                            </div>
                            <div>
                                <span>{{ 'operatorConsole.compliancePanel.dpaSigned' | translate }}</span>
                                <strong>
                                    <p-tag [value]="(stats()?.compliance?.dpaSigned ? 'operatorConsole.compliancePanel.signed' : 'operatorConsole.compliancePanel.pending') | translate" [severity]="stats()?.compliance?.dpaSigned ? 'success' : 'warn'" />
                                    @if (stats()?.compliance?.dpaSignedAt) {
                                        <small class="muted">{{ stats()?.compliance?.dpaSignedAt | date:'mediumDate' }}</small>
                                    }
                                </strong>
                            </div>
                            <div><span>{{ 'operatorConsole.compliancePanel.lastAudit' | translate }}</span><strong>{{ stats()?.compliance?.lastAuditDate || '—' }}</strong></div>
                        </div>

                        <!-- Encryption -->
                        <h3 class="section-h">{{ 'operatorConsole.encryption' | translate }}</h3>
                        <div class="kv-grid">
                            <div><span>{{ 'operatorConsole.kmsDataKey' | translate }}</span><strong><code>{{ stats()?.encryption?.kmsKeyId || '—' }}</code></strong></div>
                            <div><span>{{ 'operatorConsole.kmsHmacKey' | translate }}</span><strong><code>{{ stats()?.encryption?.hmacKeyId || '—' }}</code></strong></div>
                        </div>

                        <!-- Audit (sanitized) -->
                        <h3 class="section-h">{{ 'operatorConsole.auditToday' | translate }}</h3>
                        <p class="audit-note">{{ 'operatorConsole.auditNote' | translate }}</p>
                        @if (!audit() || audit()!.items.length === 0) {
                            <div class="empty">{{ 'operatorConsole.noAuditEvents' | translate }}</div>
                        } @else {
                            <p-table [value]="audit()!.items" [paginator]="true" [rows]="10" class="audit-table">
                                <ng-template pTemplate="header">
                                    <tr>
                                        <th>Time</th>
                                        <th>Actor</th>
                                        <th>Category</th>
                                        <th>IP</th>
                                    </tr>
                                </ng-template>
                                <ng-template pTemplate="body" let-row>
                                    <tr>
                                        <td>{{ row.timestamp | date:'short' }}</td>
                                        <td>{{ row.actorEmail }}</td>
                                        <td><p-tag [value]="row.category" [severity]="categorySeverity(row.category)" /></td>
                                        <td>{{ row.ipAddress }}</td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        }
                    }
                </section>
            </div>

            <!-- Edit dialog -->
            <p-dialog header="Edit tenant" [(visible)]="editOpen" [modal]="true" [style]="{ width: '520px' }">
                @if (editForm()) {
                    <div class="edit-form">
                        <label>Display name</label>
                        <input pInputText [(ngModel)]="editForm()!.name" />

                        <label>Status</label>
                        <p-select [options]="statusOptions" [(ngModel)]="editForm()!.status" optionLabel="label" optionValue="value" appendTo="body"></p-select>

                        <label>Plan</label>
                        <p-select [options]="planOptions" [(ngModel)]="editForm()!.plan" optionLabel="label" optionValue="value" appendTo="body"></p-select>

                        <label>MRR (USD)</label>
                        <p-inputNumber [(ngModel)]="editForm()!.mrrUSD" [min]="0" mode="decimal" [maxFractionDigits]="2" />

                        <label>Rate (req/s)</label>
                        <p-inputNumber [(ngModel)]="editForm()!.limits!.rps" [min]="0" [max]="10000" />

                        <label>Daily quota</label>
                        <p-inputNumber [(ngModel)]="editForm()!.limits!.dailyQuota" [min]="0" />

                        <label>Storage cap (GB)</label>
                        <p-inputNumber [(ngModel)]="editForm()!.limits!.storageGB" [min]="0" />

                        <label>Max upload (MB)</label>
                        <p-inputNumber [(ngModel)]="editForm()!.limits!.maxUploadMB" [min]="0" [max]="500" />

                        <div class="cb-row">
                            <p-checkbox [(ngModel)]="editForm()!.baaSigned" [binary]="true" inputId="baa" />
                            <label for="baa" class="cb-label">BAA signed</label>
                        </div>
                        <div class="cb-row">
                            <p-checkbox [(ngModel)]="editForm()!.dpaSigned" [binary]="true" inputId="dpa" />
                            <label for="dpa" class="cb-label">DPA signed</label>
                        </div>

                        <label>Last audit date</label>
                        <input pInputText type="date" [(ngModel)]="editForm()!.lastAuditDate" />

                        <label>Internal notes</label>
                        <input pInputText [(ngModel)]="editForm()!.notes" placeholder="Operator-only notes about this tenant" />
                    </div>
                    <div class="edit-actions">
                        <p-button [label]="'common.cancel' | translate" severity="secondary" [text]="true" (onClick)="editOpen = false" />
                        <p-button [label]="'common.save' | translate" icon="pi pi-check" (onClick)="saveEdit()" [loading]="saving()" />
                    </div>
                }
            </p-dialog>
        </div>
    `,
    styles: `
        .op-shell { padding: 1.5rem 2rem; max-width: 1400px; margin: 0 auto; }
        .op-header {
            display: flex; justify-content: space-between; align-items: center;
            border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem; margin-bottom: 1.5rem;
            h1 { margin: 0; font-size: 1.5rem; color: #111827; }
            .subtitle { color: #6b7280; margin: 0.25rem 0 0; font-size: 0.875rem; }
        }
        .zk-badge {
            background: #d1fae5; color: #047857;
            padding: 0.3rem 0.8rem; border-radius: 999px;
            font-weight: 600; font-size: 0.85rem;
        }
        .op-body { display: grid; grid-template-columns: 320px 1fr; gap: 1.5rem; }
        .tenants-panel, .detail-panel {
            background: #fff; border-radius: 12px; padding: 1.25rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .panel-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;
            h2 { margin: 0; font-size: 1.1rem; } }
        .tenant-list { list-style: none; padding: 0; margin: 0;
            li { padding: 0.75rem; border-radius: 8px; cursor: pointer; border: 1px solid transparent;
                &:hover { background: #f9fafb; }
                &.selected { background: #ecfdf5; border-color: #10b981; }
                .row-name { display: flex; justify-content: space-between; align-items: center; font-size: 1rem; }
                .row-meta { font-size: 0.8rem; color: #6b7280; margin-top: 0.25rem;
                    .dot { margin: 0 0.4rem; color: #d1d5db; } } } }
        .empty, .empty-detail { color: #9ca3af; text-align: center; padding: 2rem; }
        .empty-detail i { font-size: 1.5rem; display: block; margin-bottom: 0.5rem; }
        .detail-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;
            h2 { margin: 0; font-size: 1.25rem; } code { font-size: 0.8rem; color: #047857; } }
        .section-h { font-size: 0.95rem; margin: 1.25rem 0 0.5rem; color: #374151; text-transform: uppercase; letter-spacing: 0.04em; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem;
            .stat-card { background: #f9fafb; padding: 0.9rem; border-radius: 8px; text-align: center;
                .stat-label { color: #6b7280; font-size: 0.8rem; }
                .stat-value { font-size: 1.5rem; font-weight: 700; color: #111827; margin-top: 0.25rem;
                    &.small { font-size: 0.9rem; font-weight: 500; } }
                .stat-hint { font-size: 0.7rem; color: #b45309; margin-top: 0.25rem; }
                &.warn { background: #fef3c7; border: 1px solid #fbbf24; } } }
        .kv-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem 1rem;
            background: #f9fafb; padding: 0.9rem; border-radius: 8px;
            div { font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem;
                span { color: #6b7280; min-width: 8rem; }
                strong { color: #111827; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;
                    code { background: #eef2ff; color: #4338ca; padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.75rem; }
                    .muted { color: #9ca3af; font-weight: 400; } } } }
        .audit-note { color: #9ca3af; font-size: 0.8rem; margin: 0 0 0.5rem; }
        .skeleton-row { padding: 0.75rem; }
        .edit-form { display: grid; gap: 0.5rem; max-height: 60vh; overflow-y: auto; padding-right: 0.25rem;
            label { font-size: 0.85rem; color: #374151; font-weight: 600; } }
        .cb-row { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem;
            .cb-label { font-weight: 500; } }
        .edit-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem; }
    `,
})
export class OperatorConsoleComponent {
    private api = inject(OperatorService);
    private toast = inject(MessageService);
    private cache = inject(CacheService);

    // Step 7i — cache TTLs (SaaS-grade dashboards: paint from cache instantly,
    // then refresh from network in the background — Stripe / Vercel pattern).
    private readonly TENANTS_TTL_MS = 60_000;            // 1 min
    private readonly DETAIL_TTL_MS  = 30_000;            // 30 s
    private readonly TENANTS_KEY    = 'operator:tenants';

    tenants = signal<TenantSummary[]>([]);
    selectedSlug = signal<string | null>(null);
    selectedTenant = signal<any | null>(null);
    stats = signal<TenantStats | null>(null);
    audit = signal<{ date: string; count: number; items: AuditEntry[] } | null>(null);
    loading = signal(true);
    saving = signal(false);

    editOpen = false;
    editForm = signal<any | null>(null);

    statusOptions = [
        { label: 'Active', value: 'active' },
        { label: 'Suspended', value: 'suspended' },
        { label: 'Trial', value: 'trial' }
    ];
    planOptions = [
        { label: 'Free', value: 'free' },
        { label: 'Standard', value: 'standard' },
        { label: 'Enterprise', value: 'enterprise' }
    ];

    constructor() {
        // Step 7i — paint instantly from cached state, then refresh in
        // background. This is the Stripe / Vercel pattern: first paint at
        // < 200 ms even on a cold sign-in, real data arrives shortly after.
        const cached = this.cache.get<TenantSummary[]>(this.TENANTS_KEY, this.TENANTS_TTL_MS);
        if (cached && cached.length) {
            this.tenants.set(cached);
            this.loading.set(false);
            // Auto-select the first tenant from cache so the right pane
            // also paints immediately.
            this.select(cached[0].slug);
        }
        this.reload();
    }

    /**
     * Refresh the tenant list from the API. Always runs in the background;
     * does NOT block first paint (constructor already showed cached data).
     */
    reload() {
        this.api.listTenants().subscribe({
            next: (r) => {
                const list = r.tenants || [];
                this.tenants.set(list);
                this.cache.set(this.TENANTS_KEY, list);
                this.loading.set(false);
                if (!this.selectedSlug() && list.length > 0) {
                    this.select(list[0].slug);
                }
            },
            error: (e) => {
                // Only surface error if nothing painted (no cache).
                this.loading.set(false);
                if (!this.tenants().length) {
                    this.toast.add({ severity: 'error', summary: 'Load failed', detail: e?.error?.message || 'Could not load tenants' });
                }
            }
        });
    }

    /**
     * Step 7i — single combined detail call. Backend returns tenant + stats
     * + audit in one round-trip via ?expand=stats,audit. Result is cached
     * per slug so re-selecting a tenant is instant.
     */
    select(slug: string) {
        this.selectedSlug.set(slug);

        // Paint from per-slug detail cache first.
        const detailKey = `operator:detail:${slug}`;
        const cached = this.cache.get<any>(detailKey, this.DETAIL_TTL_MS);
        if (cached) {
            this.selectedTenant.set(cached.tenant);
            this.stats.set(cached.stats || null);
            this.audit.set(cached.audit || null);
        } else {
            // No cache — fall back to the list row so the header/limits show
            // immediately, but blank out stats/audit until the API returns.
            const row = this.tenants().find(t => t.slug === slug);
            this.selectedTenant.set(row ? { ...row } : null);
            this.stats.set(null);
            this.audit.set(null);
        }

        // Refresh from network (one request).
        this.api.getTenant(slug, { expand: ['stats', 'audit'], auditLimit: 50 }).subscribe({
            next: (t) => {
                const stats = t.stats || null;
                const audit = t.audit || null;
                // Strip expansions before storing the tenant row.
                const tenant = { ...t };
                delete tenant.stats;
                delete tenant.audit;
                this.selectedTenant.set(tenant);
                this.stats.set(stats);
                this.audit.set(audit);
                this.cache.set(detailKey, { tenant, stats, audit });
            },
            error: () => { /* keep cached / partial */ }
        });
    }

    openEdit() {
        const t = this.selectedTenant();
        const s = this.stats();
        if (!t) return;
        this.editForm.set({
            name:          t.name,
            status:        t.status,
            plan:          t.plan,
            notes:         t.notes,
            mrrUSD:        s?.subscription?.mrrUSD ?? null,
            baaSigned:     s?.compliance?.baaSigned ?? false,
            dpaSigned:     s?.compliance?.dpaSigned ?? false,
            lastAuditDate: s?.compliance?.lastAuditDate ?? '',
            limits:        { ...(t.limits || {}) }
        });
        this.editOpen = true;
    }

    saveEdit() {
        const form = this.editForm();
        const slug = this.selectedSlug();
        if (!form || !slug) return;
        this.saving.set(true);

        // Stamp signed dates when the operator flips compliance flags on.
        const update: TenantUpdate = { ...form };
        if (form.baaSigned && !this.stats()?.compliance?.baaSigned) {
            update.baaSignedAt = new Date().toISOString();
        }
        if (form.dpaSigned && !this.stats()?.compliance?.dpaSigned) {
            update.dpaSignedAt = new Date().toISOString();
        }

        this.api.updateTenant(slug, update).subscribe({
            next: () => {
                this.saving.set(false);
                this.editOpen = false;
                this.toast.add({ severity: 'success', summary: 'Saved', detail: 'Tenant updated' });
                this.select(slug);
            },
            error: (e) => {
                this.saving.set(false);
                this.toast.add({ severity: 'error', summary: 'Save failed', detail: e?.error?.message || '' });
            }
        });
    }

    statusSeverity(status?: string): 'success' | 'warn' | 'danger' | 'info' {
        switch ((status || '').toLowerCase()) {
            case 'active': return 'success';
            case 'trial': return 'info';
            case 'suspended': return 'danger';
            default: return 'warn';
        }
    }

    categorySeverity(c: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
        switch (c) {
            case 'AUTH':            return 'info';
            case 'DATA_READ':       return 'secondary';
            case 'DATA_WRITE':      return 'info';
            case 'DATA_DELETE':     return 'danger';
            case 'OPERATOR_ACTION': return 'success';
            default:                return 'warn';
        }
    }
}

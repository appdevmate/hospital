import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { StepsModule } from 'primeng/steps';
import { MessageService, MenuItem } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { TranslatePipe } from '@ngx-translate/core';
import { OperatorService, NewTenantRequest, NewTenantResponse } from '@/services/operator.service';

/**
 * Akwadona — Tenant Onboarding Wizard (Step 96 / Phase 4).
 *
 * Four-step PrimeNG Steps form that walks the operator through provisioning a
 * new customer hospital. The backend (POST /operator/tenants) does all the
 * heavy lifting: KMS keys, DynamoDB profile row, Cognito admin user. This
 * component only collects inputs, shows progress, and renders the success
 * view with the temp password the operator must forward.
 *
 * Mirrors the Stripe Connect / Twilio sub-account onboarding flow: a single
 * synchronous wizard with rollback handled server-side.
 */
@Component({
    selector: 'app-tenant-onboarding-wizard',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        ButtonModule, CardModule, InputTextModule, StepsModule,
        ToastModule, ProgressSpinnerModule, TagModule, TranslatePipe
    ],
    providers: [MessageService],
    template: `
        <p-toast></p-toast>

        <div class="wiz-shell">
            <header class="wiz-header">
                <p-button icon="pi pi-arrow-left" severity="secondary" [text]="true"
                          (onClick)="back()" label="Back to operator console" />
                <h1>Onboard a new tenant</h1>
                <p class="subtitle">Provision a customer hospital end-to-end. Takes about 5&nbsp;seconds.</p>
            </header>

            @if (result()) {
                <!-- Success view -->
                <p-card>
                    <ng-template pTemplate="header">
                        <div class="success-banner">
                            <i class="pi pi-check-circle"></i>
                            <span>Tenant created</span>
                        </div>
                    </ng-template>

                    <dl class="kv">
                        <dt>Hospital</dt>            <dd><strong>{{ result()!.name }}</strong> ({{ result()!.slug }})</dd>
                        <dt>Tenant ID</dt>          <dd><code>{{ result()!.tenantId }}</code></dd>
                        <dt>Plan</dt>               <dd><p-tag [value]="result()!.plan" severity="info" /></dd>
                        <dt>KMS data key</dt>       <dd><code>{{ result()!.kmsKeyId }}</code></dd>
                        <dt>KMS HMAC key</dt>       <dd><code>{{ result()!.hmacKeyId }}</code></dd>
                        <dt>Admin username</dt>     <dd><code>{{ result()!.admin.username }}</code></dd>
                        <dt>Admin email</dt>        <dd>{{ result()!.admin.email }}</dd>
                        <dt>Temp password</dt>      <dd class="password">
                            <code>{{ result()!.admin.tempPassword }}</code>
                            <p-button icon="pi pi-copy" severity="secondary" [text]="true" size="small"
                                      (onClick)="copy(result()!.admin.tempPassword)" />
                        </dd>
                        <dt>Sign-in URL</dt>        <dd><a [href]="result()!.admin.signInUrl" target="_blank">{{ result()!.admin.signInUrl }}</a></dd>
                    </dl>

                    <div class="hint">
                        <i class="pi pi-info-circle"></i>
                        Forward the temp password to the customer over a trusted channel (encrypted email, SMS, or password manager share). It cannot be recovered later — only reset.
                    </div>

                    <ng-template pTemplate="footer">
                        <p-button label="Open operator console" icon="pi pi-arrow-right" (onClick)="back()" />
                    </ng-template>
                </p-card>
            } @else {
                <p-steps [model]="steps" [activeIndex]="active()" [readonly]="false"
                         (activeIndexChange)="active.set($event)" />

                <p-card styleClass="wiz-card">
                    <!-- Step 0 — identity -->
                    @if (active() === 0) {
                        <h2>Hospital details</h2>
                        <div class="form-grid">
                            <label>
                                Display name *
                                <input pInputText [(ngModel)]="form.name" placeholder="Probe Hospital Co." />
                            </label>
                            <label>
                                URL slug *
                                <input pInputText [(ngModel)]="form.slug" placeholder="probe-co"
                                       (input)="form.slug = slugify(form.slug)" />
                                <small>lowercase letters, digits, hyphens — used in subdomains and KMS aliases</small>
                            </label>
                            <label>
                                Country (ISO-2)
                                <input pInputText [(ngModel)]="form.country" placeholder="QA" maxlength="2" />
                            </label>
                            <label>
                                Contact email
                                <input pInputText type="email" [(ngModel)]="form.contactEmail" placeholder="ops@hospital.com" />
                            </label>
                        </div>
                    }

                    <!-- Step 1 — plan -->
                    @if (active() === 1) {
                        <h2>Pick a plan</h2>
                        <div class="plan-grid">
                            @for (p of plans; track p.value) {
                                <div class="plan-card" [class.selected]="form.plan === p.value"
                                     (click)="form.plan = p.value">
                                    <div class="plan-name">{{ p.label }}</div>
                                    <div class="plan-cap">{{ p.rps }} req/s · {{ p.quota }} req/day</div>
                                    <div class="plan-desc">{{ p.desc }}</div>
                                </div>
                            }
                        </div>
                    }

                    <!-- Step 2 — initial admin -->
                    @if (active() === 2) {
                        <h2>Initial admin user</h2>
                        <p>This person becomes the first Admin for the new tenant. They can invite more users.</p>
                        <div class="form-grid">
                            <label>
                                Admin full name *
                                <input pInputText [(ngModel)]="form.adminName" placeholder="Hospital Admin" />
                            </label>
                            <label>
                                Admin email *
                                <input pInputText type="email" [(ngModel)]="form.adminEmail" placeholder="admin@hospital.com" />
                            </label>
                        </div>
                    }

                    <!-- Step 3 — review -->
                    @if (active() === 3) {
                        <h2>Review</h2>
                        <dl class="kv">
                            <dt>Hospital</dt>      <dd>{{ form.name }}</dd>
                            <dt>Slug</dt>          <dd>{{ form.slug }}</dd>
                            <dt>Country</dt>       <dd>{{ form.country || '—' }}</dd>
                            <dt>Contact email</dt> <dd>{{ form.contactEmail || '—' }}</dd>
                            <dt>Plan</dt>          <dd>{{ form.plan }}</dd>
                            <dt>Admin name</dt>    <dd>{{ form.adminName }}</dd>
                            <dt>Admin email</dt>   <dd>{{ form.adminEmail }}</dd>
                        </dl>
                        <div class="hint">
                            On submit we'll create 2 KMS keys, a TENANT profile row, and a Cognito admin user. Any partial failure rolls back automatically.
                        </div>
                    }

                    @if (loading()) {
                        <div class="loading-overlay">
                            <p-progressSpinner strokeWidth="3" />
                            <p>Provisioning… this takes ~5&nbsp;seconds.</p>
                        </div>
                    }

                    <ng-template pTemplate="footer">
                        <div class="footer-actions">
                            <p-button label="Back" icon="pi pi-arrow-left" severity="secondary"
                                      [disabled]="active() === 0 || loading()"
                                      (onClick)="active.set(active() - 1)" />
                            @if (active() < 3) {
                                <p-button label="Next" icon="pi pi-arrow-right" iconPos="right"
                                          [disabled]="!stepValid || loading()"
                                          (onClick)="next()" />
                            } @else {
                                <p-button label="Create tenant" icon="pi pi-check" severity="success"
                                          [disabled]="!stepValid || loading()"
                                          (onClick)="submit()" />
                            }
                        </div>
                    </ng-template>
                </p-card>
            }
        </div>
    `,
    styles: [`
        .wiz-shell { max-width: 880px; margin: 0 auto; padding: 1.5rem; }
        .wiz-header h1 { margin: 0.5rem 0 0.25rem; font-size: 1.5rem; }
        .wiz-header .subtitle { color: var(--text-color-secondary); margin: 0; }
        :host ::ng-deep .wiz-card { margin-top: 1.5rem; }
        .form-grid { display: grid; gap: 1rem; grid-template-columns: 1fr 1fr; }
        .form-grid label { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.875rem; color: var(--text-color-secondary); }
        .form-grid input { font-size: 1rem; }
        .form-grid small { color: var(--text-color-secondary); font-size: 0.75rem; }
        .plan-grid { display: grid; gap: 1rem; grid-template-columns: repeat(3, 1fr); }
        .plan-card { padding: 1rem; border: 2px solid var(--surface-border); border-radius: 0.5rem; cursor: pointer; transition: all 0.15s; }
        .plan-card:hover { border-color: var(--primary-color); }
        .plan-card.selected { border-color: var(--primary-color); background: var(--highlight-bg); }
        .plan-name { font-weight: 600; font-size: 1.125rem; }
        .plan-cap { color: var(--text-color-secondary); font-size: 0.875rem; margin: 0.5rem 0; }
        .plan-desc { font-size: 0.875rem; }
        .kv { display: grid; grid-template-columns: max-content 1fr; column-gap: 1rem; row-gap: 0.5rem; }
        .kv dt { color: var(--text-color-secondary); }
        .kv dd { margin: 0; }
        .kv code { background: var(--surface-100); padding: 0.125rem 0.5rem; border-radius: 0.25rem; font-size: 0.875rem; }
        .password { display: flex; align-items: center; gap: 0.5rem; }
        .hint { display: flex; gap: 0.5rem; padding: 0.75rem 1rem; background: var(--surface-100); border-left: 3px solid var(--primary-color); border-radius: 0.25rem; margin-top: 1rem; font-size: 0.875rem; }
        .footer-actions { display: flex; justify-content: space-between; }
        .loading-overlay { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 2rem; }
        .success-banner { display: flex; align-items: center; gap: 0.5rem; padding: 1rem; color: var(--green-600); font-weight: 600; }
        .success-banner i { font-size: 1.5rem; }
    `]
})
export class TenantOnboardingWizardComponent {
    private operator = inject(OperatorService);
    private router   = inject(Router);
    private toast    = inject(MessageService);

    readonly steps: MenuItem[] = [
        { label: 'Hospital' },
        { label: 'Plan' },
        { label: 'Admin' },
        { label: 'Review' }
    ];

    readonly plans = [
        { value: 'free' as const,       label: 'Free',       rps: 10,  quota: '100k',  desc: 'Pilot deployments, sandbox use.' },
        { value: 'standard' as const,   label: 'Standard',   rps: 100, quota: '1M',    desc: 'Small to mid-size hospitals.' },
        { value: 'enterprise' as const, label: 'Enterprise', rps: 500, quota: '10M',   desc: 'Large hospital systems with high call volume.' }
    ];

    readonly active  = signal(0);
    readonly loading = signal(false);
    readonly result  = signal<NewTenantResponse | null>(null);

    form: NewTenantRequest = {
        name: '',
        slug: '',
        plan: 'free',
        country: '',
        contactEmail: '',
        adminEmail: '',
        adminName: ''
    };

    // Plain getter (not a computed signal) so it re-evaluates on every
    // change-detection cycle as the user types into ngModel-bound inputs.
    // computed() would cache because `this.form` is not a signal — the
    // computed has no way to know its dependencies changed.
    get stepValid(): boolean {
        const i = this.active();
        if (i === 0) return /^[a-z][a-z0-9-]{1,30}[a-z0-9]$/.test(this.form.slug) && this.form.name.trim().length > 0;
        if (i === 1) return !!this.form.plan;
        if (i === 2) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.adminEmail) && this.form.adminName.trim().length > 0;
        return true;
    }

    slugify(v: string): string {
        return (v || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
    }

    next() { this.active.set(this.active() + 1); }
    back() { this.router.navigate(['/operator']); }

    submit() {
        if (this.loading()) return;
        this.loading.set(true);
        // Build the payload with empty optional fields stripped — keeps the
        // backend allow-list cleaner and the audit log tidier.
        const payload: NewTenantRequest = {
            slug:         this.form.slug,
            name:         this.form.name.trim(),
            plan:         this.form.plan,
            adminEmail:   this.form.adminEmail.trim().toLowerCase(),
            adminName:    this.form.adminName.trim()
        };
        if (this.form.country)      payload.country      = this.form.country.trim().toUpperCase();
        if (this.form.contactEmail) payload.contactEmail = this.form.contactEmail.trim().toLowerCase();

        this.operator.createTenant(payload).subscribe({
            next: (r) => {
                this.loading.set(false);
                this.result.set(r);
                this.toast.add({ severity: 'success', summary: 'Tenant created', detail: r.slug, life: 5000 });
            },
            error: (e) => {
                this.loading.set(false);
                const detail = e?.error?.error || e?.error?.message || e?.message || 'Unknown error';
                this.toast.add({ severity: 'error', summary: 'Onboarding failed', detail, life: 9000 });
            }
        });
    }

    copy(value: string) {
        navigator.clipboard?.writeText(value).then(
            () => this.toast.add({ severity: 'info', summary: 'Copied', life: 2000 }),
            () => this.toast.add({ severity: 'warn', summary: 'Copy failed', life: 3000 })
        );
    }
}

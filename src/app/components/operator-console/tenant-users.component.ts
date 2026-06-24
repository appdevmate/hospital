import { Component, Input, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonModule } from 'primeng/skeleton';
import {
    OperatorService,
    OperatorUser,
    NewUserRequest,
    UpdateUserRequest
} from '@/services/operator.service';

/**
 * Step 106 - Operator-side user management (Keycloak-style).
 *
 * Embedded inside the operator console tenant-detail panel. Lists every
 * Cognito user that belongs to the currently-selected tenant and lets the
 * operator: create users, reset passwords, change attributes / group,
 * enable / disable, and delete.
 *
 * Does NOT show PHI (staff identity is business data, not PHI). The
 * server-side handler still enforces operator-only access via
 * getOperator(event) and writes an OPERATOR_* audit row for every change.
 *
 * Industry reference: Stripe Connect dashboard, Auth0 dashboard, Keycloak
 * admin console - all let platform staff manage customer-side identities
 * without entering the customer tenant.
 */
@Component({
    selector: 'app-tenant-users',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        ButtonModule, TableModule, TagModule, DialogModule, InputTextModule,
        SelectModule, ToastModule, ConfirmDialogModule, SkeletonModule
    ],
    providers: [MessageService, ConfirmationService],
    template: `
        <p-toast></p-toast>
        <p-confirmDialog></p-confirmDialog>

        <div class="tu-section">
            <div class="tu-header">
                <h3 class="section-h">Users</h3>
                <div class="tu-actions">
                    <p-button icon="pi pi-refresh" severity="secondary" [text]="true" size="small"
                              (onClick)="reload()" [disabled]="loading()" />
                    <p-button icon="pi pi-user-plus" label="Add user" severity="primary" size="small"
                              (onClick)="openCreate()" />
                </div>
            </div>

            @if (loading()) {
                <p-skeleton width="100%" height="10rem"></p-skeleton>
            } @else if (users().length === 0) {
                <div class="empty">No users in this tenant yet. Click "Add user" to create the first one.</div>
            } @else {
                <p-table [value]="users()" [paginator]="true" [rows]="10" styleClass="users-table">
                    <ng-template pTemplate="header">
                        <tr>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Name</th>
                            <th>Group</th>
                            <th>Status</th>
                            <th style="width: 14rem;">Actions</th>
                        </tr>
                    </ng-template>
                    <ng-template pTemplate="body" let-u>
                        <tr>
                            <td><code>{{ u.username }}</code></td>
                            <td>{{ u.email }} @if (!u.emailVerified) { <p-tag value="unverified" severity="warn" /> }</td>
                            <td>{{ u.name }}</td>
                            <td>
                                @for (g of u.groups; track g) {
                                    <p-tag [value]="g" severity="info" styleClass="mr-1" />
                                }
                            </td>
                            <td>
                                <p-tag [value]="u.status"
                                       [severity]="u.enabled ? statusSeverity(u.status) : 'danger'" />
                                @if (!u.enabled) { <p-tag value="disabled" severity="danger" styleClass="ml-1" /> }
                            </td>
                            <td class="row-actions">
                                <p-button icon="pi pi-pencil"  severity="secondary" [text]="true" size="small"
                                          (onClick)="openEdit(u)" pTooltip="Edit"></p-button>
                                <p-button icon="pi pi-key"     severity="secondary" [text]="true" size="small"
                                          (onClick)="openResetPassword(u)" pTooltip="Reset password"></p-button>
                                @if (u.enabled) {
                                    <p-button icon="pi pi-ban" severity="warn"   [text]="true" size="small"
                                              (onClick)="confirmDisable(u)" pTooltip="Disable"></p-button>
                                } @else {
                                    <p-button icon="pi pi-check" severity="success" [text]="true" size="small"
                                              (onClick)="enable(u)" pTooltip="Enable"></p-button>
                                }
                                <p-button icon="pi pi-trash"   severity="danger" [text]="true" size="small"
                                          (onClick)="confirmDelete(u)" pTooltip="Delete"></p-button>
                            </td>
                        </tr>
                    </ng-template>
                </p-table>
            }
        </div>

        <!-- Create user dialog -->
        <p-dialog header="Add user" [(visible)]="createOpen" [modal]="true" [style]="{ width: '480px' }">
            <div class="form-grid">
                <label>Username (no spaces, not an email) *
                    <input pInputText [(ngModel)]="newUser.username"
                           (input)="newUser.username = sanitizeUsername(newUser.username)" />
                </label>
                <label>Full name *
                    <input pInputText [(ngModel)]="newUser.name" />
                </label>
                <label>Email *
                    <input pInputText type="email" [(ngModel)]="newUser.email" />
                </label>
                <label>Group *
                    <p-select [options]="GROUPS" [(ngModel)]="newUser.group"
                              optionLabel="label" optionValue="value" appendTo="body"></p-select>
                </label>
                <label>Gender
                    <p-select [options]="GENDERS" [(ngModel)]="newUser.gender"
                              optionLabel="label" optionValue="value" appendTo="body"></p-select>
                </label>
            </div>
            <ng-template pTemplate="footer">
                <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="createOpen = false" />
                <p-button label="Create" icon="pi pi-check" (onClick)="submitCreate()" [disabled]="saving()" />
            </ng-template>
        </p-dialog>

        <!-- Edit user dialog -->
        <p-dialog header="Edit user" [(visible)]="editOpen" [modal]="true" [style]="{ width: '480px' }">
            @if (editTarget()) {
                <div class="form-grid">
                    <label>Username
                        <input pInputText [value]="editTarget()!.username" disabled />
                    </label>
                    <label>Full name
                        <input pInputText [(ngModel)]="editForm.name" />
                    </label>
                    <label>Email
                        <input pInputText type="email" [(ngModel)]="editForm.email" />
                    </label>
                    <label>Group
                        <p-select [options]="GROUPS" [(ngModel)]="editForm.group"
                                  optionLabel="label" optionValue="value" appendTo="body"></p-select>
                    </label>
                </div>
            }
            <ng-template pTemplate="footer">
                <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="editOpen = false" />
                <p-button label="Save"   icon="pi pi-save" (onClick)="submitEdit()" [disabled]="saving()" />
            </ng-template>
        </p-dialog>

        <!-- Reset password dialog -->
        <p-dialog header="Reset password" [(visible)]="resetOpen" [modal]="true" [style]="{ width: '460px' }">
            @if (resetTarget()) {
                <p>Setting a new password for <strong>{{ resetTarget()!.username }}</strong>.</p>
                <label class="block">
                    New password (leave blank to auto-generate)
                    <input pInputText [(ngModel)]="resetPasswordValue" type="text" />
                </label>
                <p class="hint">Make sure to copy and forward the password through a trusted channel.</p>
            }
            <ng-template pTemplate="footer">
                <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="resetOpen = false" />
                <p-button label="Reset"  icon="pi pi-key" severity="warn" (onClick)="submitReset()" [disabled]="saving()" />
            </ng-template>
        </p-dialog>

        <!-- Reset password result dialog -->
        <p-dialog header="Password reset" [(visible)]="resetResultOpen" [modal]="true" [style]="{ width: '460px' }">
            <p>Forward this password over a trusted channel:</p>
            <pre class="pw">{{ resetResultPassword() }}</pre>
            <ng-template pTemplate="footer">
                <p-button label="Copy"  icon="pi pi-copy" (onClick)="copyResetPassword()" />
                <p-button label="Close" severity="secondary" [text]="true" (onClick)="resetResultOpen = false" />
            </ng-template>
        </p-dialog>
    `,
    styles: [`
        .tu-section { margin-top: 1.5rem; }
        .tu-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
        .section-h { margin: 0; font-size: 1rem; }
        .tu-actions { display: flex; gap: 0.5rem; }
        .empty { padding: 1.5rem; text-align: center; color: var(--text-color-secondary); background: var(--surface-100); border-radius: 0.5rem; }
        .row-actions { display: flex; gap: 0.25rem; }
        .form-grid { display: flex; flex-direction: column; gap: 0.75rem; }
        .form-grid label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; color: var(--text-color-secondary); }
        .form-grid input, .form-grid :host ::ng-deep .p-select { width: 100%; }
        .block { display: block; margin-top: 0.5rem; }
        .hint { color: var(--text-color-secondary); font-size: 0.85rem; margin-top: 0.5rem; }
        .pw { background: var(--surface-100); padding: 0.75rem; border-radius: 0.25rem; font-size: 1rem; font-family: monospace; word-break: break-all; }
        :host ::ng-deep .mr-1 { margin-right: 0.25rem; }
        :host ::ng-deep .ml-1 { margin-left: 0.25rem; }
    `]
})
export class TenantUsersComponent implements OnChanges {
    @Input() slug: string | null = null;

    private api    = inject(OperatorService);
    private toast  = inject(MessageService);
    private confirm = inject(ConfirmationService);

    readonly users   = signal<OperatorUser[]>([]);
    readonly loading = signal(false);
    readonly saving  = signal(false);

    readonly GROUPS = [
        { label: 'Admin',       value: 'Admin' },
        { label: 'Doctors',     value: 'Doctors' },
        { label: 'Pharmacists', value: 'Pharmacists' },
        { label: 'Developers',  value: 'Developers' }
    ];
    readonly GENDERS = [
        { label: 'Prefer not to say', value: 'prefer_not_to_say' },
        { label: 'Male',              value: 'male' },
        { label: 'Female',            value: 'female' },
        { label: 'Other',             value: 'other' }
    ];

    // ── Create dialog ──
    createOpen = false;
    newUser: NewUserRequest = { username: '', email: '', name: '', group: 'Admin', gender: 'prefer_not_to_say' };

    // ── Edit dialog ──
    editOpen = false;
    readonly editTarget = signal<OperatorUser | null>(null);
    editForm: UpdateUserRequest = {};

    // ── Reset password dialog ──
    resetOpen = false;
    readonly resetTarget = signal<OperatorUser | null>(null);
    resetPasswordValue = '';

    // ── Reset result dialog ──
    resetResultOpen = false;
    readonly resetResultPassword = signal('');

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['slug']) this.reload();
    }

    reload(): void {
        if (!this.slug) { this.users.set([]); return; }
        this.loading.set(true);
        this.api.listTenantUsers(this.slug).subscribe({
            next: (r) => { this.users.set(r.users || []); this.loading.set(false); },
            error: (e) => { this.toast.add({ severity: 'error', summary: 'Load failed', detail: e?.error?.message || e?.message }); this.loading.set(false); }
        });
    }

    sanitizeUsername(v: string): string {
        return (v || '').toLowerCase().replace(/[^a-z0-9._-]+/g, '').slice(0, 64);
    }

    statusSeverity(status: string): 'success' | 'warn' | 'info' | 'danger' {
        switch (status) {
            case 'CONFIRMED':              return 'success';
            case 'FORCE_CHANGE_PASSWORD':  return 'warn';
            case 'RESET_REQUIRED':         return 'warn';
            case 'ARCHIVED':               return 'danger';
            default:                       return 'info';
        }
    }

    // ── Create ─────────────────────────────────────────────────────────────
    openCreate(): void {
        this.newUser = { username: '', email: '', name: '', group: 'Admin', gender: 'prefer_not_to_say' };
        this.createOpen = true;
    }
    submitCreate(): void {
        if (!this.slug) return;
        if (!this.newUser.username || !this.newUser.email || !this.newUser.name) {
            this.toast.add({ severity: 'warn', summary: 'Missing required fields' });
            return;
        }
        this.saving.set(true);
        this.api.createTenantUser(this.slug, this.newUser).subscribe({
            next: (r) => {
                this.saving.set(false);
                this.createOpen = false;
                this.resetResultPassword.set(r.tempPassword);
                this.resetResultOpen = true;
                this.reload();
            },
            error: (e) => {
                this.saving.set(false);
                this.toast.add({ severity: 'error', summary: 'Create failed', detail: e?.error?.message || e?.message });
            }
        });
    }

    // ── Edit ───────────────────────────────────────────────────────────────
    openEdit(u: OperatorUser): void {
        this.editTarget.set(u);
        this.editForm = {
            email: u.email || '',
            name:  u.name  || '',
            group: (u.groups || [])[0] || 'Admin'
        };
        this.editOpen = true;
    }
    submitEdit(): void {
        const u = this.editTarget();
        if (!u) return;
        this.saving.set(true);
        this.api.updateUser(u.username, this.editForm).subscribe({
            next: () => {
                this.saving.set(false);
                this.editOpen = false;
                this.toast.add({ severity: 'success', summary: 'User updated' });
                this.reload();
            },
            error: (e) => {
                this.saving.set(false);
                this.toast.add({ severity: 'error', summary: 'Update failed', detail: e?.error?.message || e?.message });
            }
        });
    }

    // ── Reset password ─────────────────────────────────────────────────────
    openResetPassword(u: OperatorUser): void {
        this.resetTarget.set(u);
        this.resetPasswordValue = '';
        this.resetOpen = true;
    }
    submitReset(): void {
        const u = this.resetTarget();
        if (!u) return;
        this.saving.set(true);
        const body: { newPassword?: string; permanent?: boolean } = { permanent: true };
        if (this.resetPasswordValue.trim()) body.newPassword = this.resetPasswordValue.trim();
        this.api.resetUserPassword(u.username, body).subscribe({
            next: (r) => {
                this.saving.set(false);
                this.resetOpen = false;
                this.resetResultPassword.set(r.tempPassword);
                this.resetResultOpen = true;
            },
            error: (e) => {
                this.saving.set(false);
                this.toast.add({ severity: 'error', summary: 'Reset failed', detail: e?.error?.message || e?.message });
            }
        });
    }
    copyResetPassword(): void {
        navigator.clipboard?.writeText(this.resetResultPassword()).then(
            () => this.toast.add({ severity: 'info', summary: 'Copied', life: 2000 }),
            () => this.toast.add({ severity: 'warn', summary: 'Copy failed', life: 3000 })
        );
    }

    // ── Enable / disable / delete ──────────────────────────────────────────
    confirmDisable(u: OperatorUser): void {
        this.confirm.confirm({
            message: 'Disable user "' + u.username + '"? They cannot sign in until re-enabled.',
            header:  'Disable user',
            icon:    'pi pi-exclamation-triangle',
            accept:  () => this.api.disableUser(u.username).subscribe({
                next: () => { this.toast.add({ severity: 'success', summary: 'User disabled' }); this.reload(); },
                error: (e) => this.toast.add({ severity: 'error', summary: 'Disable failed', detail: e?.error?.message })
            })
        });
    }
    enable(u: OperatorUser): void {
        this.api.enableUser(u.username).subscribe({
            next: () => { this.toast.add({ severity: 'success', summary: 'User enabled' }); this.reload(); },
            error: (e) => this.toast.add({ severity: 'error', summary: 'Enable failed', detail: e?.error?.message })
        });
    }
    confirmDelete(u: OperatorUser): void {
        this.confirm.confirm({
            message: 'PERMANENTLY DELETE user "' + u.username + '"? This cannot be undone.',
            header:  'Delete user',
            icon:    'pi pi-exclamation-triangle',
            acceptButtonStyleClass: 'p-button-danger',
            accept:  () => this.api.deleteUser(u.username).subscribe({
                next: () => { this.toast.add({ severity: 'success', summary: 'User deleted' }); this.reload(); },
                error: (e) => this.toast.add({ severity: 'error', summary: 'Delete failed', detail: e?.error?.message })
            })
        });
    }
}

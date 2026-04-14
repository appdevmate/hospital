import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Dialog } from 'primeng/dialog';
import { ConfirmationService } from 'primeng/api';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { DividerModule } from 'primeng/divider';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { catchError, of, finalize } from 'rxjs';

import { AdminPanelService, AdminStats, CognitoUser, AuditItem } from '@/services/admin-panel.service';
import { HelpersService } from '@/services/helpers-service';
import { AuthService } from '@/services/auth.service';

@Component({
    selector: 'app-admin-panel',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        TagModule,
        CardModule,
        InputTextModule,
        SelectModule,
        DatePickerModule,
        TableModule,
        TooltipModule,
        ConfirmDialogModule,
        Dialog,
        DividerModule,
        IconFieldModule,
        InputIconModule,
        Tabs,
        TabList,
        Tab,
        TabPanels,
        TabPanel
    ],
    providers: [ConfirmationService],
    templateUrl: './admin-panel.html',
    styleUrl: './admin-panel.scss'
})
export class AdminPanelComponent implements OnInit {
    private adminService = inject(AdminPanelService);
    private helpers = inject(HelpersService);
    private confirm = inject(ConfirmationService);
    private cdr = inject(ChangeDetectorRef);
    auth = inject(AuthService);

    // ── Stats ─────────────────────────────────────────────────────────────────
    stats: AdminStats = { totalPatients: 0, totalDoctors: 0, totalExams: 0, totalInvoices: 0 };
    statsLoading = true;

    // ── Users ─────────────────────────────────────────────────────────────────
    users: CognitoUser[] = [];
    usersLoading = false;
    userFilter = '';
    actionLoading: Record<string, boolean> = {};
    showPasswordDialog = false;
    passwordTarget: CognitoUser | null = null;
    newPassword = '';
    passwordSaving = false;

    // ── Audit ─────────────────────────────────────────────────────────────────
    auditItems: AuditItem[] = [];
    auditLoading = false;
    auditDate: Date = new Date();
    auditEntityType = '';
    auditAction = '';
    auditActor = '';
    auditCount = 0;

    entityTypeOptions = [
        { label: 'All Types', value: '' },
        { label: 'Examination', value: 'EXAMINATION' },
        { label: 'Patient', value: 'PATIENT' },
        { label: 'Doctor', value: 'DOCTOR' },
        { label: 'Payment', value: 'PAYMENT' }
    ];

    actionOptions = [
        { label: 'All Actions', value: '' },
        { label: 'CREATE', value: 'CREATE' },
        { label: 'UPDATE', value: 'UPDATE' },
        { label: 'DELETE', value: 'DELETE' },
        { label: 'SIGNOFF', value: 'SIGNOFF' },
        { label: 'VIEW', value: 'VIEW' }
    ];

    ngOnInit() {
        this.loadStats();
        this.loadUsers();
        this.loadAudit();
    }

    // ── Stats ─────────────────────────────────────────────────────────────────
    loadStats() {
        this.statsLoading = true;
        this.adminService
            .getStats()
            .pipe(catchError(() => of({ totalPatients: 0, totalDoctors: 0, totalExams: 0, totalInvoices: 0 })))
            .subscribe((s) => {
                this.stats = s;
                this.statsLoading = false;
                this.cdr.markForCheck();
            });
    }

    // ── Users ─────────────────────────────────────────────────────────────────
    loadUsers() {
        this.usersLoading = true;
        this.adminService
            .getUsers(this.userFilter || undefined)
            .pipe(
                catchError(() => of({ users: [], nextToken: null })),
                finalize(() => {
                    this.usersLoading = false;
                    this.cdr.markForCheck();
                })
            )
            .subscribe((r) => {
                this.users = r.users;
            });
    }

    disableUser(user: CognitoUser) {
        this.confirm.confirm({
            message: `Disable ${user.name || user.email}? They will not be able to log in.`,
            header: 'Confirm Disable User',
            icon: 'pi pi-exclamation-triangle',
            acceptButtonProps: { label: 'Disable', severity: 'danger' },
            rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
            accept: () => {
                this.actionLoading[user.username] = true;
                this.adminService.disableUser(user.username).subscribe({
                    next: () => {
                        this.helpers.notifySuccess(`${user.name || user.email} disabled`);
                        this.loadUsers();
                    },
                    error: (e) => this.helpers.notifyError('Error', e?.error?.message || 'Could not disable user'),
                    complete: () => {
                        delete this.actionLoading[user.username];
                        this.cdr.markForCheck();
                    }
                });
            }
        });
    }

    enableUser(user: CognitoUser) {
        this.actionLoading[user.username] = true;
        this.adminService.enableUser(user.username).subscribe({
            next: () => {
                this.helpers.notifySuccess(`${user.name || user.email} enabled`);
                this.loadUsers();
            },
            error: (e) => this.helpers.notifyError('Error', e?.error?.message || 'Could not enable user'),
            complete: () => {
                delete this.actionLoading[user.username];
                this.cdr.markForCheck();
            }
        });
    }

    openSetPassword(user: CognitoUser) {
        this.passwordTarget = user;
        this.newPassword = '';
        this.showPasswordDialog = true;
    }

    savePassword() {
        if (!this.passwordTarget || !this.newPassword) return;
        if (this.newPassword.length < 8) {
            this.helpers.notifyError('Validation', 'Password must be at least 8 characters');
            return;
        }
        this.passwordSaving = true;
        this.adminService.setPassword(this.passwordTarget.username, this.newPassword).subscribe({
            next: () => {
                this.helpers.notifySuccess(`Temporary password set for ${this.passwordTarget!.email}`);
                this.showPasswordDialog = false;
                this.newPassword = '';
                this.passwordTarget = null;
                this.passwordSaving = false;
                this.cdr.markForCheck();
            },
            error: (e) => {
                this.helpers.notifyError('Error', e?.error?.message || 'Could not set password');
                this.passwordSaving = false;
                this.cdr.markForCheck();
            }
        });
    }

    // ── Audit ─────────────────────────────────────────────────────────────────
    loadAudit() {
        this.auditLoading = true;
        const dateStr = this.auditDate instanceof Date ? this.auditDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

        this.adminService
            .getAuditLog({
                date: dateStr,
                entityType: this.auditEntityType || undefined,
                action: this.auditAction || undefined,
                actor: this.auditActor || undefined,
                limit: 200
            })
            .pipe(
                catchError(() => of({ date: dateStr, count: 0, items: [] })),
                finalize(() => {
                    this.auditLoading = false;
                    this.cdr.markForCheck();
                })
            )
            .subscribe((r) => {
                this.auditItems = r.items;
                this.auditCount = r.count;
            });
    }

    clearAuditFilters() {
        this.auditDate = new Date();
        this.auditEntityType = '';
        this.auditAction = '';
        this.auditActor = '';
        this.loadAudit();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    userStatusSeverity(u: CognitoUser): 'success' | 'danger' | 'warn' | 'secondary' {
        if (!u.enabled) return 'danger';
        if (u.status === 'CONFIRMED') return 'success';
        if (u.status === 'FORCE_CHANGE_PASSWORD') return 'warn';
        return 'secondary';
    }

    userStatusLabel(u: CognitoUser): string {
        if (!u.enabled) return 'Disabled';
        if (u.status === 'FORCE_CHANGE_PASSWORD') return 'Pending Setup';
        return u.status === 'CONFIRMED' ? 'Active' : u.status;
    }

    groupSeverity(g: string): 'success' | 'info' | 'warn' | 'secondary' {
        return g === 'Admin' ? 'warn' : g === 'Developers' ? 'info' : 'success';
    }

    actionSeverity(a: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
        const m: Record<string, any> = {
            CREATE: 'success',
            UPDATE: 'info',
            DELETE: 'danger',
            SIGNOFF: 'warn',
            VIEW: 'secondary'
        };
        return m[a] || 'secondary';
    }
}

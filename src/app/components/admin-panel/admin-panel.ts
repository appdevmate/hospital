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
import { ConfirmationService } from 'primeng/api';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { DividerModule } from 'primeng/divider';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { catchError, of, finalize } from 'rxjs';

import { AdminPanelService, AdminStats, CognitoUser, AuditItem, GdprExport } from '@/pages/service/admin-panel.service';
import { PatientsService, Patient } from '@/pages/service/patients.service';
import { HelpersService } from '@/pages/service/helpers-service';
import { AuthService } from '@/pages/service/auth.service';

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
    private patientsService = inject(PatientsService);
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

    // ── GDPR ──────────────────────────────────────────────────────────────────
    gdprSearchTerm = '';
    gdprPatients: Patient[] = [];
    gdprLoading = false;
    gdprExportData: GdprExport | null = null;
    gdprExporting = false;
    showGdprDeleted = false;

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

    resetPassword(user: CognitoUser) {
        this.confirm.confirm({
            message: `Send password reset email to ${user.email}?`,
            header: 'Confirm Password Reset',
            icon: 'pi pi-key',
            acceptButtonProps: { label: 'Send Reset Email', severity: 'warn' },
            rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
            accept: () => {
                this.actionLoading[user.username] = true;
                this.adminService.resetPassword(user.username).subscribe({
                    next: () => this.helpers.notifySuccess(`Reset email sent to ${user.email}`),
                    error: (e) => this.helpers.notifyError('Error', e?.error?.message || 'Could not reset password'),
                    complete: () => {
                        delete this.actionLoading[user.username];
                        this.cdr.markForCheck();
                    }
                });
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

    // ── GDPR ──────────────────────────────────────────────────────────────────
    searchGdprPatients() {
        if (!this.gdprSearchTerm.trim()) return;
        this.gdprLoading = true;
        this.patientsService
            .getPatientsPage({ pageSize: 20, search: this.gdprSearchTerm })
            .pipe(
                catchError(() => of({ data: [], totalCount: 0 })),
                finalize(() => {
                    this.gdprLoading = false;
                    this.cdr.markForCheck();
                })
            )
            .subscribe((r) => {
                this.gdprPatients = r.data || [];
            });
    }

    exportGdpr(patient: Patient) {
        const id = patient.PK.includes('#') ? patient.PK.split('#')[1] : patient.PK;
        this.gdprExporting = true;
        this.adminService
            .gdprExport(id)
            .pipe(
                finalize(() => {
                    this.gdprExporting = false;
                    this.cdr.markForCheck();
                })
            )
            .subscribe({
                next: async (data) => {
                    const XLSX = await import('xlsx');
                    const wb = XLSX.utils.book_new();

                    // Patient sheet
                    const patientRow = [{ ...data.patient, PK: undefined, SK: undefined }];
                    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(patientRow), 'Patient');

                    // Exams sheet
                    if (data.exams.length > 0) {
                        const examRows = data.exams.map((e) => ({
                            examId: e.examId,
                            date: e.date,
                            status: e.status,
                            doctorName: e.doctorName,
                            chiefComplaint: e.chiefComplaint?.cc || '',
                            signedOffAt: e.signedOffAt || ''
                        }));
                        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(examRows), 'Examinations');
                    }

                    // Invoices sheet
                    if (data.invoices.length > 0) {
                        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.invoices), 'Invoices');
                    }

                    const ts = new Date().toISOString().slice(0, 10);
                    const name = (data.patient.name || id).replace(/\s+/g, '_');
                    XLSX.writeFile(wb, `GDPR_Export_${name}_${ts}.xlsx`);
                    this.helpers.notifySuccess('GDPR export downloaded');
                },
                error: (e) => this.helpers.notifyError('Export failed', e?.error?.message || 'Could not export')
            });
    }

    gdprSoftDelete(patient: Patient) {
        const id = patient.PK.includes('#') ? patient.PK.split('#')[1] : patient.PK;
        const name = patient.name || id;
        this.confirm.confirm({
            message: `Mark ${name} as GDPR deleted? Their data will be hidden from all normal views but preserved in the database. This can be reversed.`,
            header: 'GDPR Soft Delete',
            icon: 'pi pi-shield',
            acceptButtonProps: { label: 'Mark as Deleted', severity: 'danger' },
            rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
            accept: () => {
                this.adminService.gdprSoftDelete(id).subscribe({
                    next: () => {
                        this.helpers.notifySuccess(`${name} marked as GDPR deleted`);
                        this.searchGdprPatients();
                    },
                    error: (e) => this.helpers.notifyError('Error', e?.error?.message || 'Could not mark as deleted')
                });
            }
        });
    }

    gdprRestore(patient: Patient) {
        const id = patient.PK.includes('#') ? patient.PK.split('#')[1] : patient.PK;
        const name = patient.name || id;
        this.confirm.confirm({
            message: `Restore ${name}? Their data will become visible again in all normal views.`,
            header: 'Restore GDPR Deleted Patient',
            icon: 'pi pi-undo',
            acceptButtonProps: { label: 'Restore', severity: 'success' },
            rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
            accept: () => {
                this.adminService.gdprRestore(id).subscribe({
                    next: () => {
                        this.helpers.notifySuccess(`${name} restored`);
                        this.searchGdprPatients();
                    },
                    error: (e) => this.helpers.notifyError('Error', e?.error?.message || 'Could not restore')
                });
            }
        });
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

    patientPk(p: Patient): string {
        return p.PK.includes('#') ? p.PK.split('#')[1] : p.PK;
    }
}

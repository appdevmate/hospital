import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { TabsModule } from 'primeng/tabs';
import { NotificationsService, Notification } from '@/pages/service/notifications.service';
import { AuthService } from '@/pages/service/auth.service';

@Component({
    selector: 'app-notifications',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, TagModule, CardModule, TabsModule],
    template: `
        <div class="notifications-page" style="padding: 1.5rem;">
            <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1.5rem;">
                <i class="pi pi-bell" style="font-size:1.5rem; color:#6366F1;"></i>
                <h2 style="margin:0; font-size:1.4rem; font-weight:700;">Notifications</h2>
                <p-tag *ngIf="notifications.length > 0" [value]="notifications.length + ' active'" severity="danger" />
            </div>

            <div *ngIf="loading" style="text-align:center; padding:3rem; color:#9CA3AF;">
                <i class="pi pi-spin pi-spinner" style="font-size:2rem;"></i>
            </div>

            <div *ngIf="!loading && notifications.length === 0" style="text-align:center; padding:4rem; color:#9CA3AF;">
                <i class="pi pi-check-circle" style="font-size:3rem; display:block; margin-bottom:1rem; color:#10B981;"></i>
                <p style="font-size:1.1rem;">All clear! No active notifications.</p>
            </div>

            <div *ngIf="!loading">
                <!-- Today's Appointments -->
                <ng-container *ngIf="todayAppts.length > 0">
                    <div class="notif-section-header">
                        <i class="pi pi-calendar" style="color:#3B82F6;"></i>
                        <span>Today's Appointments</span>
                        <p-tag [value]="todayAppts.length.toString()" severity="info" />
                    </div>
                    <div class="notif-cards">
                        <div class="notif-card info" *ngFor="let appt of todayAppts">
                            <div class="notif-card-left">
                                <div class="notif-card-icon info"><i class="pi pi-calendar"></i></div>
                                <div>
                                    <div class="notif-card-title">{{ appt.patientName | titlecase }} with {{ appt.doctorName | titlecase }}</div>
                                    <div class="notif-card-sub">{{ appt.startTime }} — {{ appt.endTime }} · {{ appt.type | titlecase }}</div>
                                </div>
                            </div>
                            <p-button icon="pi pi-arrow-right" text severity="info" routerLink="/appointments" />
                        </div>
                    </div>
                </ng-container>

                <!-- Upcoming Appointments -->
                <ng-container *ngIf="upcomingAppts.length > 0">
                    <div class="notif-section-header">
                        <i class="pi pi-clock" style="color:#F59E0B;"></i>
                        <span>Upcoming Appointments (Tomorrow)</span>
                        <p-tag [value]="upcomingAppts.length.toString()" severity="warn" />
                    </div>
                    <div class="notif-cards">
                        <div class="notif-card warn" *ngFor="let appt of upcomingAppts">
                            <div class="notif-card-left">
                                <div class="notif-card-icon warn"><i class="pi pi-clock"></i></div>
                                <div>
                                    <div class="notif-card-title">{{ appt.patientName | titlecase }} with {{ appt.doctorName | titlecase }}</div>
                                    <div class="notif-card-sub">{{ appt.date }} · {{ appt.startTime }} — {{ appt.endTime }}</div>
                                </div>
                            </div>
                            <p-button icon="pi pi-arrow-right" text severity="warn" routerLink="/appointments" />
                        </div>
                    </div>
                </ng-container>

                <!-- Critical Patients -->
                <ng-container *ngIf="criticalPatients.length > 0">
                    <div class="notif-section-header">
                        <i class="pi pi-exclamation-triangle" style="color:#EF4444;"></i>
                        <span>Critical Patients</span>
                        <p-tag [value]="criticalPatients.length.toString()" severity="danger" />
                    </div>
                    <div class="notif-cards">
                        <div class="notif-card danger" *ngFor="let p of criticalPatients">
                            <div class="notif-card-left">
                                <div class="notif-card-icon danger"><i class="pi pi-exclamation-triangle"></i></div>
                                <div>
                                    <div class="notif-card-title">{{ p.name | titlecase }}</div>
                                    <div class="notif-card-sub">{{ p.ward || 'No ward' }} · {{ p.bedNumber || 'No bed' }} · {{ p.department || 'No dept' }}</div>
                                </div>
                            </div>
                            <p-button icon="pi pi-arrow-right" text severity="danger" routerLink="/patients-management" />
                        </div>
                    </div>
                </ng-container>
            </div>
        </div>
    `,
    styles: [
        `
            .notif-section-header {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                margin: 1.5rem 0 0.75rem 0;
                font-size: 1rem;
                font-weight: 700;
                color: #111827;
            }

            .notif-cards {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }

            .notif-card {
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: white;
                border-radius: 10px;
                padding: 1rem 1.25rem;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);

                &.info {
                    border-left: 4px solid #3b82f6;
                }
                &.warn {
                    border-left: 4px solid #f59e0b;
                }
                &.danger {
                    border-left: 4px solid #ef4444;
                }
            }

            .notif-card-left {
                display: flex;
                align-items: center;
                gap: 1rem;
            }

            .notif-card-icon {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1rem;
                flex-shrink: 0;
                &.info {
                    background: #eff6ff;
                    color: #3b82f6;
                }
                &.warn {
                    background: #fffbeb;
                    color: #f59e0b;
                }
                &.danger {
                    background: #fef2f2;
                    color: #ef4444;
                }
            }

            .notif-card-title {
                font-weight: 600;
                font-size: 0.95rem;
                color: #111827;
            }
            .notif-card-sub {
                font-size: 0.82rem;
                color: #6b7280;
                margin-top: 2px;
            }
        `
    ]
})
export class NotificationsComponent implements OnInit {
    notifications: Notification[] = [];
    todayAppts: any[] = [];
    upcomingAppts: any[] = [];
    criticalPatients: any[] = [];
    loading = true;
    activeType: string | null = null;
    private notificationsService = inject(NotificationsService);
    private route = inject(ActivatedRoute);
    private auth = inject(AuthService);

    ngOnInit() {
        this.activeType = this.route.snapshot.queryParamMap.get('type');
        this.load();
    }

    load() {
        this.loading = true;
        this.notificationsService.getNotifications(this.auth.isAdmin, this.auth.isDoctor ? this.auth.current.email : undefined).subscribe({
            next: (notifications) => {
                this.notifications = notifications;
                const todayN = notifications.find((n) => n.type === 'today');
                const upcomingN = notifications.find((n) => n.type === 'upcoming');
                const criticalN = notifications.find((n) => n.type === 'critical');
                this.todayAppts = todayN?.data || [];
                this.upcomingAppts = upcomingN?.data || [];
                this.criticalPatients = criticalN?.data || [];
                this.loading = false;
            },
            error: () => (this.loading = false)
        });
    }
}

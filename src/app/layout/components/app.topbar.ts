import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { LayoutService } from '@/layout/service/layout.service';
import { Ripple } from 'primeng/ripple';
import { InputText } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { take } from 'rxjs';
import { BadgeModule } from 'primeng/badge';
import { PopoverModule } from 'primeng/popover';
import { TagModule } from 'primeng/tag';
import { Router } from '@angular/router';
import { NotificationsService, Notification } from '@/services/notifications.service';
import { AuthService } from '@/services/auth.service';
import { OfflineService } from '@/services/offline.service';
import { TenantService } from '@/services/tenant.service';

@Component({
    selector: '[app-topbar]',
    standalone: true,
    imports: [RouterModule, CommonModule, StyleClassModule, FormsModule, Ripple, InputText, ButtonModule, IconField, InputIcon, BadgeModule, PopoverModule, TagModule],
    template: `
        <div class="layout-topbar">
            <a class="app-logo" routerLink="/">
                <!-- Step 1: text-only brand — no logo image, no icon. The
                     legacy tiryaq_logo_v5.png had "Tiryaq" baked into the
                     image. The product brand "Akwadona" is shown as plain
                     HTML text + a per-tenant pill ("Tiryaq Hospital" /
                     "Alshifaa Hospital") fed by TenantService. -->
                <span class="app-name">Akwadona</span>
                @if (isOperator) {
                    <span class="operator-badge" title="Akwadona platform staff — PHI-blind console">Operator</span>
                } @else if (tenantDisplayName) {
                    <span class="tenant-badge" [title]="'Tenant: ' + tenantDisplayName">{{ tenantDisplayName }}</span>
                }
            </a>

            <button #menubutton class="topbar-menubutton p-link" type="button" (click)="onMenuButtonClick()">
                <span></span>
            </button>

            <ul class="topbar-menu">
                @for (item of tabs; track $index; let i = $index) {
                    <li>
                        <a
                            [routerLink]="item.routerLink"
                            routerLinkActive="active-route"
                            [routerLinkActiveOptions]="item.routerLinkActiveOptions || { paths: 'exact', queryParams: 'ignored', fragment: 'ignored', matrixParams: 'ignored' }"
                            [fragment]="item.fragment"
                            [queryParamsHandling]="item.queryParamsHandling"
                            [preserveFragment]="item.preserveFragment!"
                            [skipLocationChange]="item.skipLocationChange!"
                            [replaceUrl]="item.replaceUrl!"
                            [state]="item.state"
                            [queryParams]="item.queryParams"
                        >
                            <span>{{ item.label }}</span>
                        </a>
                        <i class="pi pi-times" (click)="removeTab($event, item, i)"></i>
                    </li>
                } @empty {}
            </ul>

            <div class="topbar-actions">
                <!-- Offline / sync pill (Phase E) -->
                @if (!isOnline || pendingCount > 0) {
                    <div class="offline-pill"
                         [class.offline-pill-off]="!isOnline"
                         [class.offline-pill-sync]="isOnline && pendingCount > 0"
                         [title]="!isOnline ? 'You are offline — changes will sync when back online' : 'Syncing pending changes…'">
                        <i [class]="!isOnline ? 'pi pi-wifi' : 'pi pi-sync'" [class.pi-spin]="isOnline && pendingCount > 0"></i>
                        <span class="offline-pill-text">{{ !isOnline ? 'Offline' : 'Syncing' }}</span>
                        @if (pendingCount > 0) {
                            <span class="offline-pill-badge">{{ pendingCount }}</span>
                        }
                    </div>
                }

                <p-button icon="pi pi-palette" rounded (onClick)="layoutService.showConfigSidebar()"></p-button>

                <div class="topbar-search" [ngClass]="{ 'topbar-search-active': searchActive }">
                    <button pButton [rounded]="true" severity="secondary" type="button" icon="pi pi-search" (click)="activateSearch()"></button>
                    <div class="search-input-wrapper">
                        <p-icon-field>
                            <input #searchinput type="text" pInputText placeholder="Search" (blur)="deactivateSearch()" (keydown.escape)="deactivateSearch()" />
                            <p-inputicon class="pi pi-search" />
                        </p-icon-field>
                    </div>
                </div>

                <!-- Bell Notification -->
                <div class="relative" style="position:relative; display:inline-flex;">
                    <p-button [rounded]="true" severity="secondary" icon="pi pi-bell" (onClick)="toggleNotifications($event)"></p-button>
                    @if (notifications.length > 0) {
                        <span
                            style="position:absolute; top:-4px; right:-4px; background:#EF4444; color:white; border-radius:50%; width:18px; height:18px; font-size:11px; display:flex; align-items:center; justify-content:center; font-weight:700; pointer-events:none;"
                        >
                            {{ notifications.length }}
                        </span>
                    }
                    <p-popover #notifPanel [style]="{ width: '360px' }">
                        <div class="notif-header">
                            <span class="notif-title">Notifications</span>
                            @if (notifications.length > 0) {
                                <p-tag [value]="notifications.length + ' new'" severity="danger" />
                            }
                        </div>

                        @if (notifications.length === 0) {
                            <div class="notif-empty">
                                <i class="pi pi-check-circle"></i>
                                <p>All clear! No notifications.</p>
                            </div>
                        }

                        @if (notifications.length > 0) {
                            <div class="notif-list">
                                @for (n of notifications; track n.type) {
                                    <div class="notif-item" (click)="onNotifClick(n)">
                                        <div class="notif-icon" [ngClass]="'notif-' + n.severity">
                                            <i [class]="n.icon"></i>
                                        </div>
                                        <div class="notif-body">
                                            <div class="notif-item-title">{{ n.title }}</div>
                                            <div class="notif-item-msg">{{ n.message }}</div>
                                        </div>
                                        <i class="pi pi-chevron-right notif-arrow"></i>
                                    </div>
                                }
                            </div>
                            <div class="notif-footer">
                                <button pButton text label="View All Notifications" icon="pi pi-arrow-right" iconPos="right" (click)="goToNotifications()"></button>
                            </div>
                        }
                    </p-popover>
                </div>

                <div class="topbar-profile">
                    <button class="topbar-profile-button" type="button" pStyleClass="@next" enterFromClass="hidden" enterActiveClass="animate-scalein" leaveToClass="hidden" leaveActiveClass="animate-fadeout" [hideOnOutsideClick]="true">
                        <img alt="avatar" src="/layout/images/avatar.png" />
                        @if (userData) {
                            <span class="profile-details">
                                <span class="profile-name">{{ userData?.name || userData?.username || 'User' }}</span>
                                <span class="profile-job">{{ userData?.email || '' }}</span>
                            </span>
                        }
                        <i class="pi pi-angle-down"></i>
                    </button>
                    <ul class="list-none hidden p-2 sm:p-4 m-0 rounded-border shadow absolute bg-surface-0 dark:bg-surface-900 origin-top w-48 mt-2 right-0 top-auto">
                        <li class="flex items-start flex-col">
                            <a [routerLink]="['/user-profile']" pRipple class="flex p-2 rounded-border w-full items-center hover:bg-emphasis transition-colors duration-150 cursor-pointer">
                                <i class="pi pi-user mr-4"></i>
                                <span>Profile</span>
                            </a>
                            <a pRipple class="flex p-2 rounded-border w-full items-center hover:bg-emphasis transition-colors duration-150 cursor-pointer">
                                <i class="pi pi-inbox mr-4"></i>
                                <span>Inbox</span>
                            </a>
                            <a pRipple class="flex p-2 rounded-border w-full items-center hover:bg-emphasis transition-colors duration-150 cursor-pointer">
                                <i class="pi pi-cog mr-4"></i>
                                <span>Settings</span>
                            </a>
                            <a (click)="logout()" pRipple class="flex p-2 rounded-border w-full items-center hover:bg-emphasis transition-colors duration-150 cursor-pointer">
                                <i class="pi pi-power-off mr-4"></i>
                                <span>Sign Out</span>
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    `,
    styles: `
        .layout-topbar {
            .app-logo {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                text-decoration: none;
                /* Legacy logo image removed from the template — keep this
                   rule in case any cached template still renders the <img>. */
                img {
                    display: none;
                }
                .app-name {
                    /* The Verona theme's slim-sidebar SCSS hides every <span>
                       inside .app-logo at min-width:992px. Force it back so
                       the Akwadona brand text stays visible. */
                    display: inline-block !important;
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #111827;
                    margin-left: 0;
                    letter-spacing: -0.01em;
                }
                .tenant-badge {
                    /* Same slim-sidebar override applies to this badge. */
                    display: inline-block !important;
                    margin-left: 0.5rem;
                    padding: 0.15rem 0.55rem;
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: #047857;
                    background: #d1fae5;
                    border-radius: 999px;
                    line-height: 1.2;
                    white-space: nowrap;
                }
                .operator-badge {
                    display: inline-block !important;
                    margin-left: 0.5rem;
                    padding: 0.15rem 0.55rem;
                    font-size: 0.8rem;
                    font-weight: 700;
                    color: #fff;
                    background: #4338ca;
                    border-radius: 999px;
                    line-height: 1.2;
                    white-space: nowrap;
                    letter-spacing: 0.02em;
                }
            }
        }
        .notif-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.75rem 1rem;
            border-bottom: 1px solid #f3f4f6;
            .notif-title {
                font-weight: 700;
                font-size: 1rem;
                color: #111827;
            }
        }
        .notif-empty {
            text-align: center;
            padding: 2rem;
            color: #9ca3af;
            i {
                font-size: 2rem;
                display: block;
                margin-bottom: 0.5rem;
            }
            p {
                margin: 0;
                font-size: 0.9rem;
            }
        }
        .notif-list {
            padding: 0.5rem 0;
        }
        .notif-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1rem;
            cursor: pointer;
            transition: background 0.15s;
            &:hover {
                background: #f9fafb;
            }
        }
        .notif-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            font-size: 1rem;
            &.notif-info {
                background: #eff6ff;
                color: #3b82f6;
            }
            &.notif-warn {
                background: #fffbeb;
                color: #f59e0b;
            }
            &.notif-danger {
                background: #fef2f2;
                color: #ef4444;
            }
        }
        .notif-body {
            flex: 1;
        }
        .notif-item-title {
            font-weight: 600;
            font-size: 0.875rem;
            color: #111827;
        }
        .notif-item-msg {
            font-size: 0.8rem;
            color: #6b7280;
            margin-top: 2px;
        }
        .notif-arrow {
            color: #d1d5db;
            font-size: 0.75rem;
        }
        .notif-footer {
            border-top: 1px solid #f3f4f6;
            padding: 0.5rem;
            text-align: center;
        }
        /* Offline / sync pill (Phase E) */
        .offline-pill {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.35rem 0.7rem;
            border-radius: 9999px;
            font-size: 0.78rem;
            font-weight: 600;
            line-height: 1;
            cursor: default;
            user-select: none;
            border: 1px solid transparent;
            i { font-size: 0.85rem; }
        }
        .offline-pill-off {
            background: #fef2f2;
            color: #b91c1c;
            border-color: #fecaca;
        }
        .offline-pill-sync {
            background: #fffbeb;
            color: #b45309;
            border-color: #fde68a;
        }
        .offline-pill-badge {
            background: rgba(0, 0, 0, 0.08);
            border-radius: 9999px;
            padding: 0 0.45rem;
            min-width: 18px;
            text-align: center;
            font-weight: 700;
        }
    `,
    host: { class: 'layout-topbar' }
})
export class AppTopbar implements OnInit {
    // ── Services ──────────────────────────────────────────────────────────
    layoutService = inject(LayoutService);
    private auth = inject(AuthService);
    private notificationsService = inject(NotificationsService);
    private oidc = inject(OidcSecurityService);
    private http = inject(HttpClient);
    private router = inject(Router);
    private offline = inject(OfflineService);
    private tenant = inject(TenantService);

    // ── Step 2e: tenant display ───────────────────────────────────────────
    // Friendly name pulled from subdomain — read-only label so the doctor
    // / admin always knows which hospital scope they're working in.
    get tenantDisplayName(): string | null {
        const slug = this.tenant.slug;
        if (!slug || slug === 'www') return null;
        return this.tenant.displayName;
    }

    // ── Step 7: operator badge ────────────────────────────────────────────
    // Shown instead of the tenant pill when the JWT carries role=operator.
    get isOperator(): boolean {
        return this.tenant.isOperator;
    }

    // ── Phase E: offline status + pending count ───────────────────────────
    isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    pendingCount = 0;
    private onlineHandler = () => { this.isOnline = true; };
    private offlineHandler = () => { this.isOnline = false; };

    // ── ViewChildren ──────────────────────────────────────────────────────
    @ViewChild('searchinput') searchInput!: ElementRef;
    @ViewChild('menubutton') menuButton!: ElementRef;
    @ViewChild('notifPanel') notifPanel: any;

    // ── State ─────────────────────────────────────────────────────────────
    notifications: Notification[] = [];
    searchActive = false;
    username = '';

    // ── Lifecycle ─────────────────────────────────────────────────────────
    constructor() {
        this.oidc.userData$.pipe(take(10)).subscribe(({ userData }) => {
            localStorage.setItem('userData', JSON.stringify(userData));
            window.dispatchEvent(new CustomEvent('userDataChanged', { detail: userData }));
            this.username = userData?.username;
        });
    }

    ngOnInit() {
        this.loadNotifications();
        // Phase E: live offline status + pending count
        window.addEventListener('online', this.onlineHandler);
        window.addEventListener('offline', this.offlineHandler);
        this.offline.pendingCount$.subscribe((n) => (this.pendingCount = n));
    }

    ngOnDestroy() {
        window.removeEventListener('online', this.onlineHandler);
        window.removeEventListener('offline', this.offlineHandler);
    }

    // ── Notifications ─────────────────────────────────────────────────────
    loadNotifications() {
        const doctorEmail = this.auth.isDoctor ? this.auth.current.email : undefined;
        this.notificationsService.getNotifications(this.auth.isAdmin, doctorEmail, this.auth.isPharmacist, this.auth.isDeveloper).subscribe({
            next: (n) => (this.notifications = n),
            error: () => (this.notifications = [])
        });
    }

    toggleNotifications(event: Event) {
        this.notifPanel.toggle(event);
        this.loadNotifications();
    }

    onNotifClick(n: Notification) {
        this.notifPanel.hide();
        this.router.navigate(['/notifications'], { queryParams: { type: n.type } });
    }

    goToNotifications() {
        this.notifPanel.hide();
        this.router.navigate(['/notifications']);
    }

    // ── Profile ───────────────────────────────────────────────────────────
    get userData() {
        try {
            const s = localStorage.getItem('userData');
            return s ? JSON.parse(s) : null;
        } catch {
            return null;
        }
    }

    // ── Layout helpers ────────────────────────────────────────────────────
    onMenuButtonClick() {
        this.layoutService.onMenuToggle();
    }

    activateSearch() {
        this.searchActive = true;
        setTimeout(() => this.searchInput?.nativeElement?.focus(), 100);
    }

    deactivateSearch() {
        this.searchActive = false;
    }

    removeTab(event: MouseEvent, item: MenuItem, index: number) {
        this.layoutService.onTabClose(item, index);
        event.preventDefault();
    }

    get logo(): string {
        return '/layout/images/tiryaq_logo_v5.png';
    }
    get tabs(): MenuItem[] {
        return this.layoutService.tabs;
    }

    // ── Logout ────────────────────────────────────────────────────────────
    logout() {
        const clientId = '2nfjfipi8hri262pjohtpgl45q';
        const authority = 'https://auth.akwadona.com';
        const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });

        const finish = () => {
            this.oidc.logoffLocal();
            // Step 7i — wipe the operator/tenant cache on sign-out so the next
            // user doesn't see the previous user's data on first paint.
            try {
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const k = localStorage.key(i);
                    if (k && k.startsWith('akw:')) localStorage.removeItem(k);
                }
                localStorage.removeItem('accessToken');
                localStorage.removeItem('returnUrl');
            } catch { /* ignore */ }
            window.location.href = `${authority}/logout?client_id=${encodeURIComponent(clientId)}&logout_uri=${encodeURIComponent(window.location.origin + '/')}`;
        };

        this.oidc.getRefreshToken().subscribe({
            next: (refreshToken) => {
                if (refreshToken) {
                    const body = new URLSearchParams({ token: refreshToken, token_type_hint: 'refresh_token', client_id: clientId }).toString();
                    this.http.post(`${authority}/oauth2/revoke`, body, { headers }).subscribe({ next: finish, error: finish });
                } else {
                    finish();
                }
            },
            error: () => finish()
        });
    }
}

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
import { NotificationsService, Notification } from '@/pages/service/notifications.service';

@Component({
    selector: '[app-topbar]',
    standalone: true,
    imports: [RouterModule, CommonModule, StyleClassModule, FormsModule, Ripple, InputText, ButtonModule, IconField, InputIcon, BadgeModule, PopoverModule, TagModule],
    template: `
        <div class="layout-topbar">
            <a class="app-logo" routerLink="/">
                <img alt="app logo" [src]="logo" />
                <span class="app-name">Verona</span>
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
                    <p-button [rounded]="true" severity="secondary" icon="pi pi-bell" (onClick)="toggleNotifications($event)"> </p-button>
                    <span
                        *ngIf="notifications.length > 0"
                        style="position:absolute; top:-4px; right:-4px; background:#EF4444; color:white; border-radius:50%; width:18px; height:18px; font-size:11px; display:flex; align-items:center; justify-content:center; font-weight:700; pointer-events:none;"
                    >
                        {{ notifications.length }}
                    </span>
                    <p-popover #notifPanel [style]="{ width: '360px' }">
                        <div class="notif-header">
                            <span class="notif-title">Notifications</span>
                            <p-tag *ngIf="notifications.length > 0" [value]="notifications.length + ' new'" severity="danger" />
                        </div>

                        <div *ngIf="notifications.length === 0" class="notif-empty">
                            <i class="pi pi-check-circle"></i>
                            <p>All clear! No notifications.</p>
                        </div>

                        <div class="notif-list" *ngIf="notifications.length > 0">
                            <div class="notif-item" *ngFor="let n of notifications" (click)="onNotifClick(n)">
                                <div class="notif-icon" [ngClass]="'notif-' + n.severity">
                                    <i [class]="n.icon"></i>
                                </div>
                                <div class="notif-body">
                                    <div class="notif-item-title">{{ n.title }}</div>
                                    <div class="notif-item-msg">{{ n.message }}</div>
                                </div>
                                <i class="pi pi-chevron-right notif-arrow"></i>
                            </div>
                        </div>

                        <div class="notif-footer" *ngIf="notifications.length > 0">
                            <button pButton text label="View All Notifications" icon="pi pi-arrow-right" iconPos="right" (click)="goToNotifications()"></button>
                        </div>
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
                gap: 0.75rem;
                img {
                    height: 100px;
                    width: auto;
                }
                .app-name {
                    font-size: 1.5rem;
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
    `,
    host: { class: 'layout-topbar' }
})
export class AppTopbar implements OnInit {
    username = '';
    role = '';
    menu: MenuItem[] = [];
    notifications: Notification[] = [];

    @ViewChild('searchinput') searchInput!: ElementRef;
    @ViewChild('menubutton') menuButton!: ElementRef;
    @ViewChild('notifPanel') notifPanel: any;

    private notificationsService = inject(NotificationsService);

    searchActive = false;

    constructor(
        public layoutService: LayoutService,
        private oidc: OidcSecurityService,
        private http: HttpClient,
        private router: Router
    ) {
        const token = sessionStorage.getItem('accessToken') || '';
        if (this.isJwt(token)) {
            try {
                const payload = JSON.parse(this.b64url(token.split('.')[1]));
                const groups: string[] = payload['cognito:groups'] ?? [];
                if (groups.includes('Patients')) this.role = 'patient';
                else if (groups.includes('Doctors')) this.role = 'doctor';
                else if (groups.includes('Developers')) this.role = 'developer';
            } catch {}
        }

        this.oidc.userData$.pipe(take(10)).subscribe(({ userData }) => {
            userData.role = this.role;
            localStorage.setItem('userData', JSON.stringify(userData));
            window.dispatchEvent(new CustomEvent('userDataChanged', { detail: userData }));
            this.username = userData?.username;
        });
    }

    ngOnInit() {
        this.loadNotifications();
    }

    loadNotifications() {
        this.notificationsService.getNotifications().subscribe({
            next: (n: Notification[]) => (this.notifications = n),
            error: () => (this.notifications = [])
        });
    }

    toggleNotifications(event: Event) {
        this.notifPanel.toggle(event);
        this.loadNotifications(); // always reload on every toggle
    }

    onNotifClick(n: Notification) {
        this.notifPanel.hide();
        this.router.navigate(['/notifications'], { queryParams: { type: n.type } });
    }

    goToNotifications() {
        this.notifPanel.hide();
        this.router.navigate(['/notifications']);
    }

    get userData() {
        const userDataStr = localStorage.getItem('userData');
        if (userDataStr) {
            try {
                return JSON.parse(userDataStr);
            } catch {
                return null;
            }
        }
        return null;
    }

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

    get layoutTheme(): string | undefined {
        return this.layoutService.layoutConfig().layoutTheme;
    }
    set layoutTheme(value: string) {
        this.layoutService.layoutConfig.update((state) => ({ ...state, layoutTheme: value }));
    }

    get logo(): string {
        return '/layout/images/tiryaq_logo_v5.png';
    }

    get tabs(): MenuItem[] {
        return this.layoutService.tabs;
    }

    logout() {
        const clientId = '4n7mna6irf5vjfg770l46aldij';
        const authority = 'https://us-east-1k2smci5zb.auth.us-east-1.amazoncognito.com';
        const revokeUrl = `${authority}/oauth2/revoke`;
        const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });
        const finish = () => {
            this.oidc.logoffLocal();
            window.location.href = `${authority}/logout?client_id=${encodeURIComponent(clientId)}&logout_uri=${encodeURIComponent(window.location.origin + '/')}`;
        };
        this.oidc.getRefreshToken().subscribe({
            next: (refreshToken) => {
                if (refreshToken) {
                    const body = new URLSearchParams({ token: refreshToken, token_type_hint: 'refresh_token', client_id: clientId }).toString();
                    this.http.post(revokeUrl, body, { headers }).subscribe({ next: finish, error: finish });
                } else {
                    finish();
                }
            },
            error: () => finish()
        });
    }

    private isJwt(t: string) {
        return !!t && t.split('.').length === 3;
    }
    private b64url(s: string) {
        const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
        return atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
    }
}

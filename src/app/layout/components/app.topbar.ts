// app.topbar.ts
import { Component, ElementRef, ViewChild } from '@angular/core';
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

@Component({
    selector: '[app-topbar]',
    standalone: true,
    imports: [RouterModule, CommonModule, StyleClassModule, FormsModule, Ripple, InputText, ButtonModule, IconField, InputIcon],
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
                } @empty {
                    <li class="topbar-menu-empty">Use (cmd + click) on a menu item to open a tab</li>
                }
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

                <div class="topbar-profile">
                    <button class="topbar-profile-button" type="button" pStyleClass="@next" enterFromClass="hidden" enterActiveClass="animate-scalein" leaveToClass="hidden" leaveActiveClass="animate-fadeout" [hideOnOutsideClick]="true">
                        <img alt="avatar" src="/layout/images/avatar.png" />
                        @if (userData$ | async; as ud) {
                            <span class="profile-details">
                                <span class="profile-name">{{ ud.userData?.given_name || ud.userData?.email || 'User' }}</span>
                                <span class="profile-job">{{ ud.userData?.email || '' }}</span>
                            </span>
                        }
                        <i class="pi pi-angle-down"></i>
                    </button>
                    <ul class="list-none hidden p-2 sm:p-4 m-0 rounded-border shadow absolute bg-surface-0 dark:bg-surface-900 origin-top w-48 mt-2 right-0 top-auto">
                        <li class="flex items-start flex-col">
                            <a pRipple class="flex p-2 rounded-border w-full items-center hover:bg-emphasis transition-colors duration-150 cursor-pointer">
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
    host: { class: 'layout-topbar' }
})
export class AppTopbar {
    username = '';
    role = '';
    menu: MenuItem[] = [];

    @ViewChild('searchinput') searchInput!: ElementRef;
    @ViewChild('menubutton') menuButton!: ElementRef;

    searchActive = false;

    constructor(
        public layoutService: LayoutService,
        private oidc: OidcSecurityService,
        private http: HttpClient
    ) {
        // Safe decode only if accessToken is a JWT
        const token = sessionStorage.getItem('accessToken') || '';
        if (this.isJwt(token)) {
            try {
                const payload = JSON.parse(this.b64url(token.split('.')[1]));
                const groups: string[] = payload['cognito:groups'] ?? [];
                if (groups.includes('Patients')) console.log('Logged in user is a patient!');
                else if (groups.includes('Doctors')) console.log('Logged in user is a doctor!');
                else if (groups.includes('Developers')) console.log('Logged in user is a developer!');
            } catch {
                // ignore malformed payloads
            }
        }

        this.oidc.userData$.pipe(take(10)).subscribe(({ userData }) => {
            console.log(userData);
            this.username = userData?.given_name;
        });
    }

    get userData$() {
        return this.oidc.userData$;
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
        const path = '/layout/images/logo-';
        const logo = this.layoutService.isDarkTheme() || this.layoutService.layoutConfig().layoutTheme === 'primaryColor' ? 'light.png' : 'dark.png';
        return path + logo;
    }

    get tabs(): MenuItem[] {
        return this.layoutService.tabs;
    }

    onConfigButtonClick() {
        this.layoutService.showConfigSidebar();
    }

    toggleConfigSidebar() {
        const layoutState = this.layoutService.layoutState();
        if (this.layoutService.isSidebarActive()) {
            layoutState.overlayMenuActive = false;
            layoutState.overlaySubmenuActive = false;
            layoutState.staticMenuMobileActive = false;
            layoutState.menuHoverActive = false;
            layoutState.configSidebarVisible = false;
        }
        layoutState.configSidebarVisible = !layoutState.configSidebarVisible;
        this.layoutService.layoutState.set(layoutState);
    }

    logout() {
        const clientId = '5lfhb74v4e5m8gboof9sb230e8'; //294jljvu34snu0nd4cm8fqf9bu
        const authority = 'eu-north-1dvt3zga6h.auth.eu-north-1.amazoncognito.com'; //https://us-east-1dvt3zga6h.auth.eu-north-1.amazoncognito.com';
        const revokeUrl = `${authority}/oauth2/revoke`;
        const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });

        const finish = () => {
            this.oidc.logoffLocal();
            window.location.href = `${authority}/logout?client_id=${encodeURIComponent(clientId)}&logout_uri=${encodeURIComponent(window.location.origin + '/')}`;
        };

        this.oidc.getRefreshToken().subscribe({
            next: (refreshToken) => {
                if (refreshToken) {
                    const body = new URLSearchParams({
                        token: refreshToken,
                        token_type_hint: 'refresh_token',
                        client_id: clientId
                    }).toString();
                    this.http.post(revokeUrl, body, { headers }).subscribe({ next: finish, error: finish });
                } else {
                    finish();
                }
            },
            error: () => finish()
        });
    }

    // --- helpers ---
    private isJwt(t: string) {
        return !!t && t.split('.').length === 3;
    }
    private b64url(s: string) {
        const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
        return atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
    }
}

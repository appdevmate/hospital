import { Component, ElementRef, inject, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { AuthService } from '@/services/auth.service';
import { TenantService } from '@/services/tenant.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: '[app-menu]',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `
        <div class="layout-menu-container" #menuContainer>
            <ul class="layout-menu">
                @for (item of model; track $index; let i = $index) {
                    @if (!item.separator) {
                        <li app-menuitem [item]="item" [index]="i" [root]="true"></li>
                    } @else {
                        <li class="menu-separator"></li>
                    }
                }
            </ul>
        </div>
    `
})
export class AppMenu implements OnInit {
    el: ElementRef = inject(ElementRef);
    private auth = inject(AuthService);
    private tenant = inject(TenantService);
    private t = inject(TranslateService);
    @ViewChild('menuContainer') menuContainer!: ElementRef;

    model: MenuItem[] = [];

    // Step I — translation helper: ngx-translate provides a sync method that
    // returns the currently active translation immediately. We call it when
    // building the menu so the labels honour the current language. The menu
    // is rebuilt on a language change via the i18n service's effect (TODO:
    // wire a re-render via signal subscription if needed).
    private tr(key: string): string {
        return this.t.instant(key);
    }

    ngOnInit() {
        // Build immediately so the sidebar isn't blank.
        this.rebuild();

        // After translations load — rebuild so labels stop being raw keys.
        this.t.get('menu.dashboard').subscribe(() => this.rebuild());
        // After language change.
        this.t.onLangChange.subscribe(() => this.rebuild());

        // Refresh-loses-sidebar fix: on a cold reload, ngOnInit runs BEFORE
        // angular-auth-oidc-client finishes hydrating from storage. At that
        // moment auth.isAdmin returns false and the admin items vanish.
        // Re-derive auth roles on a short retry schedule so the sidebar fills
        // in as soon as the JWT is parsed.
        [100, 300, 800, 1500, 3000].forEach(ms => setTimeout(() => this.rebuild(), ms));
    }

    /** Re-read auth state RIGHT NOW (no captured values) and rebuild. */
    private rebuild() {
        this.auth.invalidate();
        this.buildModel(
            this.auth.isAdmin,
            this.auth.isDoctor,
            this.auth.isDeveloper,
            this.auth.isPharmacist
        );
    }

    private buildModel(isAdmin: boolean, isDoctor: boolean, isDeveloper: boolean, isPharmacist: boolean) {

        // ── Step 7g — Operator menu (platform admin only, no tenant nav) ──
        // The operator never works inside a hospital, so we never show
        // Calendar / Appointments / Patients / Doctors / Documents etc.
        // Modeled after Stripe Connect / Vercel Teams admin nav.
        if (this.tenant.isOperator) {
            this.model = [
                { label: this.tr('menu.operator.tenants'),    icon: 'pi pi-building',   routerLink: ['/operator'] },
                { label: this.tr('menu.operator.usage'),      icon: 'pi pi-chart-line', routerLink: ['/operator'], fragment: 'usage' },
                { label: this.tr('menu.operator.compliance'), icon: 'pi pi-verified',   routerLink: ['/operator'], fragment: 'compliance' },
                { label: this.tr('menu.operator.audit'),      icon: 'pi pi-history',    routerLink: ['/operator'], fragment: 'audit' }
            ];
            return;
        }

        // Step I — labels read from translations.
        const developerItems: MenuItem[] = [
            { label: this.tr('menu.dashboard'),     icon: 'pi pi-desktop',        routerLink: ['/'] },
            { label: this.tr('menu.calendar'),      icon: 'pi pi-calendar',       routerLink: ['/calendar'] },
            { label: this.tr('menu.appointments'),  icon: 'pi pi-calendar-plus',  routerLink: ['/appointments'] },
            { label: this.tr('menu.voiceScribe'),   icon: 'pi pi-microphone',     routerLink: ['/voice-scribe'] },
            { label: this.tr('menu.invoices'),      icon: 'pi pi-file-edit',      routerLink: ['/invoices'] },
            { label: this.tr('menu.notifications'), icon: 'pi pi-bell',           routerLink: ['/notifications'] },
            { label: this.tr('menu.patients'),      icon: 'pi pi-user-plus',      routerLink: ['/patients-management'] },
            { label: this.tr('menu.doctors'),       icon: 'pi pi-briefcase',      routerLink: ['/doctors-management'] },
            { label: this.tr('menu.bloodBank'),     icon: 'pi pi-heart-fill',     routerLink: ['/blood-bank'] },
            { label: this.tr('menu.documents'),     icon: 'pi pi-folder',         routerLink: ['/documents'] },
            { label: this.tr('menu.administration'),icon: 'pi pi-shield',         routerLink: ['/admin-panel'] }
        ];

        const sharedItems: MenuItem[] = [
            { label: this.tr('menu.dashboard'),     icon: 'pi pi-desktop',        routerLink: ['/'] },
            { label: this.tr('menu.calendar'),      icon: 'pi pi-calendar',       routerLink: ['/calendar'] },
            { label: this.tr('menu.appointments'),  icon: 'pi pi-calendar-plus',  routerLink: ['/appointments'] },
            { label: this.tr('menu.invoices'),      icon: 'pi pi-file-edit',      routerLink: ['/invoices'] },
            { label: this.tr('menu.notifications'), icon: 'pi pi-bell',           routerLink: ['/notifications'] }
        ];

        const adminOnlyItems: MenuItem[] = [
            { separator: true },
            { label: this.tr('menu.patients'),      icon: 'pi pi-user-plus',      routerLink: ['/patients-management'] },
            { label: this.tr('menu.doctors'),       icon: 'pi pi-briefcase',      routerLink: ['/doctors-management'] },
            { label: this.tr('menu.bloodBank'),     icon: 'pi pi-heart-fill',     routerLink: ['/blood-bank'] },
            { label: this.tr('menu.documents'),     icon: 'pi pi-folder',         routerLink: ['/documents'] },
            { label: this.tr('menu.administration'),icon: 'pi pi-shield',         routerLink: ['/admin-panel'] }
        ];

        const doctorOnlyItems: MenuItem[] = [
            { separator: true },
            { label: this.tr('menu.patients'),      icon: 'pi pi-user-plus',      routerLink: ['/patients-management'] },
            { label: this.tr('menu.voiceScribe'),   icon: 'pi pi-microphone',     routerLink: ['/voice-scribe'] },
            { label: this.tr('menu.bloodBank'),     icon: 'pi pi-heart-fill',     routerLink: ['/blood-bank'] },
            { label: this.tr('menu.documents'),     icon: 'pi pi-folder',         routerLink: ['/documents'] }
        ];

        const pharmacistItems: MenuItem[] = [
            { separator: true },
            { label: this.tr('menu.pharmacy'),      icon: 'pi pi-shop',           routerLink: ['/pharmacy'] },
            { label: this.tr('menu.bloodBank'),     icon: 'pi pi-heart-fill',     routerLink: ['/blood-bank'] }
        ];

        if (isAdmin) {
            this.model = [...sharedItems, ...adminOnlyItems];
        } else if (isDoctor) {
            this.model = [...sharedItems, ...doctorOnlyItems];
        } else if (isDeveloper) {
            this.model = [...developerItems];
        } else if (isPharmacist) {
            this.model = [...sharedItems, ...pharmacistItems];
        } else {
            this.model = [...sharedItems];
        }
    }
}

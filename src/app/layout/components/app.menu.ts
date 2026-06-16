import { Component, ElementRef, inject, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { AuthService } from '@/services/auth.service';
import { TenantService } from '@/services/tenant.service';

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
    @ViewChild('menuContainer') menuContainer!: ElementRef;

    model: MenuItem[] = [];

    ngOnInit() {
        this.auth.invalidate();
        const isAdmin = this.auth.isAdmin;
        const isDoctor = this.auth.isDoctor;
        const isDeveloper = this.auth.isDeveloper;
        const isPharmacist = this.auth.isPharmacist;

        // ── Step 7g — Operator menu (platform admin only, no tenant nav) ──
        // The operator never works inside a hospital, so we never show
        // Calendar / Appointments / Patients / Doctors / Documents etc.
        // Modeled after Stripe Connect / Vercel Teams admin nav.
        if (this.tenant.isOperator) {
            this.model = [
                { label: 'Tenants',     icon: 'pi pi-building', routerLink: ['/operator'] },
                { label: 'Usage',       icon: 'pi pi-chart-line', routerLink: ['/operator'], fragment: 'usage' },
                { label: 'Compliance',  icon: 'pi pi-verified', routerLink: ['/operator'], fragment: 'compliance' },
                { label: 'Audit',       icon: 'pi pi-history', routerLink: ['/operator'], fragment: 'audit' }
            ];
            return;
        }

        const developerItems: MenuItem[] = [
            { label: 'Dashboard', icon: 'pi pi-desktop', routerLink: ['/'] },
            { label: 'Calendar', icon: 'pi pi-calendar', routerLink: ['/calendar'] },
            { label: 'Appointments', icon: 'pi pi-calendar-plus', routerLink: ['/appointments'] },
            { label: 'Voice Scribe', icon: 'pi pi-microphone', routerLink: ['/voice-scribe'] },
            { label: 'Invoices', icon: 'pi pi-file-edit', routerLink: ['/invoices'] },
            { label: 'Notifications', icon: 'pi pi-bell', routerLink: ['/notifications'] },
            { label: 'Patients', icon: 'pi pi-user-plus', routerLink: ['/patients-management'] },
            { label: 'Doctors Management', icon: 'pi pi-briefcase', routerLink: ['/doctors-management'] },
            { label: 'Blood Bank', icon: 'pi pi-heart-fill', routerLink: ['/blood-bank'] },
            { label: 'Documents', icon: 'pi pi-folder', routerLink: ['/documents'] },
            {
                label: 'Administration',
                icon: 'pi pi-shield',
                routerLink: ['/admin-panel']
            }
        ];

        const sharedItems: MenuItem[] = [
            { label: 'Dashboard', icon: 'pi pi-desktop', routerLink: ['/'] },
            { label: 'Calendar', icon: 'pi pi-calendar', routerLink: ['/calendar'] },
            { label: 'Appointments', icon: 'pi pi-calendar-plus', routerLink: ['/appointments'] },
            { label: 'Invoices', icon: 'pi pi-file-edit', routerLink: ['/invoices'] },
            { label: 'Notifications', icon: 'pi pi-bell', routerLink: ['/notifications'] }
        ];

        const adminOnlyItems: MenuItem[] = [
            { separator: true },
            { label: 'Patients', icon: 'pi pi-user-plus', routerLink: ['/patients-management'] },
            { label: 'Doctors Management', icon: 'pi pi-briefcase', routerLink: ['/doctors-management'] },
            { label: 'Blood Bank', icon: 'pi pi-heart-fill', routerLink: ['/blood-bank'] },
            { label: 'Documents', icon: 'pi pi-folder', routerLink: ['/documents'] },
            {
                label: 'Administration',
                icon: 'pi pi-shield',
                routerLink: ['/admin-panel']
            }
        ];

        const doctorOnlyItems: MenuItem[] = [
            { separator: true },
            { label: 'Patients', icon: 'pi pi-user-plus', routerLink: ['/patients-management'] },
            { label: 'Voice Scribe', icon: 'pi pi-microphone', routerLink: ['/voice-scribe'] },
            { label: 'Blood Bank', icon: 'pi pi-heart-fill', routerLink: ['/blood-bank'] },
            { label: 'Documents', icon: 'pi pi-folder', routerLink: ['/documents'] }
        ];

        const pharmacistItems: MenuItem[] = [
            { separator: true },
            { label: 'Pharmacy', icon: 'pi pi-shop', routerLink: ['/pharmacy'] },
            { label: 'Blood Bank', icon: 'pi pi-heart-fill', routerLink: ['/blood-bank'] }
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

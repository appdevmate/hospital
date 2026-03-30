import { Component, ElementRef, inject, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { AuthService } from '@/pages/service/auth.service';

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
    @ViewChild('menuContainer') menuContainer!: ElementRef;

    model: MenuItem[] = [];

    ngOnInit() {
        this.auth.invalidate();
        const isAdmin = this.auth.isAdmin;
        const isDoctor = this.auth.isDoctor;
        const isDeveloper = this.auth.isDeveloper;

        const developerItems: MenuItem[] = [
            { label: 'Dashboard', icon: 'pi pi-desktop', routerLink: ['/'] },
            { label: 'Calendar', icon: 'pi pi-calendar', routerLink: ['/calendar'] },
            { label: 'Appointments', icon: 'pi pi-calendar-plus', routerLink: ['/appointments'] },
            { label: 'Invoices', icon: 'pi pi-file-edit', routerLink: ['/invoices'] },
            { label: 'Notifications', icon: 'pi pi-bell', routerLink: ['/notifications'] },
            { label: 'Pharmacy', icon: 'pi pi-heart-fill', routerLink: ['/pharmacy'] },
            { label: 'Patients', icon: 'pi pi-user-plus', routerLink: ['/patients-management'] },
            { label: 'Doctors Management', icon: 'pi pi-briefcase', routerLink: ['/doctors-management'] },
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
            { label: 'Pharmacy', icon: 'pi pi-heart-fill', routerLink: ['/pharmacy'] },
            { label: 'Doctors Management', icon: 'pi pi-briefcase', routerLink: ['/doctors-management'] },
            {
                label: 'Administration',
                icon: 'pi pi-shield',
                routerLink: ['/admin-panel']
            }
        ];

        const doctorOnlyItems: MenuItem[] = [{ separator: true }, { label: 'Patients', icon: 'pi pi-user-plus', routerLink: ['/patients-management'] }];

        if (isAdmin) {
            this.model = [...sharedItems, ...adminOnlyItems];
        } else if (isDoctor) {
            this.model = [...sharedItems, ...doctorOnlyItems];
        } else if (isDeveloper) {
            this.model = [...developerItems];
        } else {
            this.model = [...sharedItems];
        }
    }
}

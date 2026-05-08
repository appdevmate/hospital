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

        const adminOnlyItems: MenuItem[] = [
            {
                label: 'Management',
                icon: 'pi pi-users',
                items: [{ label: 'Doctors Management', icon: 'pi pi-briefcase', routerLink: ['/doctors-management'] }]
            }
        ];

        const sharedItems: MenuItem[] = [
            { label: 'Dashboard', icon: 'pi pi-desktop', routerLink: ['/'] },
            { label: 'Doctor Workflow', icon: 'pi pi-sitemap', routerLink: ['/doctor-workflow'] },
            { label: 'Patients', icon: 'pi pi-user-plus', routerLink: ['/patients-management'] },
            { label: 'Calendar', icon: 'pi pi-calendar', routerLink: ['/calendar'] },
            { label: 'Appointments', icon: 'pi pi-calendar-plus', routerLink: ['/appointments'] },
            { label: 'Invoices', icon: 'pi pi-file-edit', routerLink: ['/invoices'] },
            { label: 'Notifications', icon: 'pi pi-bell', routerLink: ['/notifications'] },
            {
                label: 'Clinical HMS',
                icon: 'pi pi-heart',
                items: [
                    { label: 'Patients', icon: 'pi pi-users', routerLink: ['/hms/patients'] },
                    { label: 'Appointments', icon: 'pi pi-calendar-plus', routerLink: ['/hms/appointments'] },
                    { label: 'Consultations', icon: 'pi pi-clipboard', routerLink: ['/hms/consultations'] }
                ]
            },
            { label: 'Clinic Workflow', icon: 'pi pi-play-circle', routerLink: ['/clinic-workflow'] }
        ];

        this.model = isAdmin ? [...sharedItems, ...adminOnlyItems] : sharedItems;
    }
}

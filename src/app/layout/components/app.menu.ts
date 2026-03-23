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

        const sharedItems: MenuItem[] = [
            { label: 'Dashboard', icon: 'pi pi-desktop', routerLink: ['/'] },
            { label: 'Patients', icon: 'pi pi-user-plus', routerLink: ['/patients-management'] },
            { label: 'Calendar', icon: 'pi pi-calendar', routerLink: ['/calendar'] },
            { label: 'Appointments', icon: 'pi pi-calendar-plus', routerLink: ['/appointments'] },
            { label: 'Invoices', icon: 'pi pi-file-edit', routerLink: ['/invoices'] },
            { label: 'Notifications', icon: 'pi pi-bell', routerLink: ['/notifications'] }
        ];

        const adminOnlyItems: MenuItem[] = [
            { separator: true },
            {
                label: 'Administration',
                icon: 'pi pi-shield',
                items: [
                    { label: 'Admin Panel', icon: 'pi pi-shield-check', routerLink: ['/admin-panel'] },
                    { label: 'Doctors Management', icon: 'pi pi-briefcase', routerLink: ['/doctors-management'] }
                ]
            }
        ];

        this.model = isAdmin ? [...sharedItems, ...adminOnlyItems] : sharedItems;
    }
}

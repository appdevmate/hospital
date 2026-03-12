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
    template: `<div class="layout-menu-container" #menuContainer>
        <ul class="layout-menu">
            <ng-container *ngFor="let item of model; let i = index">
                <li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true"></li>
                <li *ngIf="item.separator" class="menu-separator"></li>
            </ng-container>
        </ul>
    </div>`
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

        const adminItems: MenuItem[] = [
            {
                label: 'Dashboard',
                icon: 'pi pi-desktop',
                routerLink: ['/']
            },
            {
                label: 'Management',
                icon: 'pi pi-users',
                items: [
                    { label: 'Doctors Management', icon: 'pi pi-briefcase', routerLink: ['/doctors-management'] },
                    { label: 'Patients Management', icon: 'pi pi-user-plus', routerLink: ['/patients-management'] }
                ]
            },
            { label: 'Notifications', icon: 'pi pi-bell', routerLink: ['/notifications'] }
        ];

        const sharedItems: MenuItem[] = [
            { label: 'Calendar', icon: 'pi pi-calendar', routerLink: ['/calendar'] },
            { label: 'Appointments', icon: 'pi pi-calendar-plus', routerLink: ['/appointments'] },
            { label: 'Invoices', icon: 'pi pi-file-edit', routerLink: ['/invoices'] },
            { label: 'Document Control', icon: 'pi pi-folder', routerLink: ['/documents'] }
        ];

        if (isAdmin) this.model = [...adminItems, ...sharedItems];
        else this.model = sharedItems;
    }
}

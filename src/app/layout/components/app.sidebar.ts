import {Component, ElementRef, inject, ViewChild} from '@angular/core';
import { AppMenu } from './app.menu';

@Component({
    selector: '[app-sidebar]',
    standalone: true,
    imports: [AppMenu],
    template: `<div app-menu class="layout-sidebar"></div>`,
})
export class AppSidebar {
    el = inject(ElementRef);

    @ViewChild(AppMenu) appMenu!: AppMenu;
}

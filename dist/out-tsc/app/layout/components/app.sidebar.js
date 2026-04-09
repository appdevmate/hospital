import { __decorate } from "tslib";
import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { AppMenu } from './app.menu';
let AppSidebar = class AppSidebar {
    el = inject(ElementRef);
    appMenu;
};
__decorate([
    ViewChild(AppMenu)
], AppSidebar.prototype, "appMenu", void 0);
AppSidebar = __decorate([
    Component({
        selector: '[app-sidebar]',
        standalone: true,
        imports: [AppMenu],
        template: `<div app-menu class="layout-sidebar"></div>`,
    })
], AppSidebar);
export { AppSidebar };

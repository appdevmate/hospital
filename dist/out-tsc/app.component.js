import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ToastModule } from 'primeng/toast';
let AppComponent = class AppComponent {
};
AppComponent = __decorate([
    Component({
        selector: 'app-root',
        standalone: true,
        imports: [RouterModule, ToastModule],
        template: `
    <!-- Single global host -->
    <p-toast></p-toast>
    <router-outlet></router-outlet>
  `
    })
], AppComponent);
export { AppComponent };

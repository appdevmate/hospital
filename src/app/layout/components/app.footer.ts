import { Component, inject } from '@angular/core';
import { LayoutService } from '@/layout/service/layout.service';


@Component({
    standalone: true,
    selector: '[app-footer]',
    template: ` <div class="footer-start">
            <img src="/layout/images/logo-dark.png" alt="logo" />
            <span class="app-name">Verona</span>
        </div>
        <div class="footer-right">
            <span>© Your Organization</span>
        </div>`,
    host: {
        class: 'layout-footer'
    }
})
export class AppFooter {
    layoutService = inject(LayoutService);
}

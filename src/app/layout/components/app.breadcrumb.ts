import { Component, inject } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterModule } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';

interface Breadcrumb {
    /** Translation key (e.g. `pages.patients.title`). */
    label: string;
    url?: string;
}

@Component({
    selector: '[app-breadcrumb]',
    standalone: true,
    imports: [CommonModule, RouterModule, TranslatePipe],
    template: ` <ol>
        <li>
            <a [routerLink]="['/']">
                <i class="pi pi-home"></i>
            </a>
        </li>
        <li class="layout-breadcrumb-chevron">/</li>
        <ng-template ngFor let-item let-last="last" [ngForOf]="breadcrumbs$ | async">
            <li style="cursor: pointer;">{{ item.label | translate }}</li>
            <li *ngIf="!last" class="layout-breadcrumb-chevron">/</li>
        </ng-template>
    </ol>`,
    host: {
        class: 'layout-breadcrumb'
    }
})
export class AppBreadcrumb {
    private readonly _breadcrumbs$ = new BehaviorSubject<Breadcrumb[]>([]);

    readonly breadcrumbs$ = this._breadcrumbs$.asObservable();

    // Step I — i18n: when the language changes we re-emit the breadcrumbs so
    // the translate pipe re-renders (the pipe listens on onLangChange anyway,
    // but re-emitting also covers any inline string callers if added later).
    private readonly t = inject(TranslateService);

    constructor(private router: Router) {
        this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => {
            const root = this.router.routerState.snapshot.root;
            const breadcrumbs: Breadcrumb[] = [];
            this.addBreadcrumb(root, [], breadcrumbs);

            this._breadcrumbs$.next(breadcrumbs);
        });

        this.t.onLangChange.subscribe(() => {
            // Force re-render by re-emitting the current list.
            this._breadcrumbs$.next(this._breadcrumbs$.getValue());
        });
    }

    private addBreadcrumb(route: ActivatedRouteSnapshot, parentUrl: string[], breadcrumbs: Breadcrumb[]) {
        const routeUrl = parentUrl.concat(route.url.map((url) => url.path));
        const breadcrumb = route.data['breadcrumb'];
        const parentBreadcrumb = route.parent && route.parent.data ? route.parent.data['breadcrumb'] : null;

        if (breadcrumb && breadcrumb !== parentBreadcrumb) {
            breadcrumbs.push({
                label: route.data['breadcrumb'],
                url: '/' + routeUrl.join('/')
            });
        }

        if (route.firstChild) {
            this.addBreadcrumb(route.firstChild, routeUrl, breadcrumbs);
        }
    }
}

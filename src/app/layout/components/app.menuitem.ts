import { Component, computed, ElementRef, HostBinding, Input, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { animate, AnimationEvent, state, style, transition, trigger } from '@angular/animations';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { TooltipModule } from 'primeng/tooltip';
import { CommonModule } from '@angular/common';
import { RippleModule } from 'primeng/ripple';
import { LayoutService } from '@/layout/service/layout.service';

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: '[app-menuitem]',
    imports: [CommonModule, RouterModule, RippleModule, TooltipModule],
    template: `
        <ng-container>
            @if (root && item.visible !== false) {
                <div class="layout-menuitem-root-text">{{ item.label }}</div>
            }

            @if ((!item.routerLink || item.items) && item.visible !== false) {
                <a [attr.href]="item.url" (click)="itemClick($event)" (mouseenter)="onMouseEnter()" [ngClass]="item.class" [attr.target]="item.target" tabindex="0" pRipple [pTooltip]="item.label" [tooltipDisabled]="!(isSlim() && root && !active)">
                    <i [ngClass]="item.icon" class="layout-menuitem-icon"></i>
                    <span class="layout-menuitem-text">{{ item.label }}</span>
                    @if (item.items) {
                        <i class="pi pi-fw pi-angle-down layout-submenu-toggler"></i>
                    }
                </a>
            }

            @if (item.routerLink && !item.items && item.visible !== false) {
                <a
                    (click)="itemClick($event)"
                    (mouseenter)="onMouseEnter()"
                    [ngClass]="item.class"
                    [routerLink]="item.routerLink"
                    routerLinkActive="active-route"
                    [routerLinkActiveOptions]="
                        item.routerLinkActiveOptions || {
                            paths: 'exact',
                            queryParams: 'ignored',
                            matrixParams: 'ignored',
                            fragment: 'ignored'
                        }
                    "
                    [fragment]="item.fragment"
                    [queryParamsHandling]="item.queryParamsHandling"
                    [preserveFragment]="item.preserveFragment"
                    [skipLocationChange]="item.skipLocationChange"
                    [replaceUrl]="item.replaceUrl"
                    [state]="item.state"
                    [queryParams]="item.queryParams"
                    [attr.target]="item.target"
                    tabindex="0"
                    pRipple
                    [pTooltip]="item.label"
                    [tooltipDisabled]="!(isSlim() && root)"
                >
                    <i [ngClass]="item.icon" class="layout-menuitem-icon"></i>
                    <span class="layout-menuitem-text">{{ item.label }}</span>
                    @if (item.items) {
                        <i class="pi pi-fw pi-angle-down layout-submenu-toggler"></i>
                    }
                </a>
            }

            @if (item.items && item.visible !== false) {
                <ul #submenu [@children]="submenuAnimation" (@children.done)="onSubmenuAnimated($event)">
                    @for (child of item.items; track child; let i = $index) {
                        <li app-menuitem [item]="child" [index]="i" [parentKey]="key" [class]="child['badgeClass']"></li>
                    }
                </ul>
            }
        </ng-container>
    `,
    animations: [
        trigger('children', [
            state('collapsed', style({ height: '0' })),
            state('expanded', style({ height: '*' })),
            state('hidden', style({ display: 'none' })),
            state('visible', style({ display: 'block' })),
            transition('collapsed <=> expanded', animate('400ms cubic-bezier(0.86, 0, 0.07, 1)'))
        ])
    ]
})
export class AppMenuitem implements OnInit, OnDestroy {
    @Input() item: any;
    @Input() index!: number;
    @Input() @HostBinding('class.layout-root-menuitem') root!: boolean;
    @Input() parentKey!: string;

    @ViewChild('submenu') submenu!: ElementRef;

    @HostBinding('class.active-menuitem')
    get activeClass() {
        return this.active;
    }

    // ── Services ──────────────────────────────────────────────────────────
    layoutService = inject(LayoutService);
    router = inject(Router);

    // ── State ─────────────────────────────────────────────────────────────
    active = false;
    key: string = '';

    private menuSourceSubscription: Subscription;
    private menuResetSubscription: Subscription;

    // ── Computed ──────────────────────────────────────────────────────────
    isSlim = computed(() => this.layoutService.isSlim());
    isSlimPlus = computed(() => this.layoutService.isSlimPlus());
    isHorizontal = computed(() => this.layoutService.isHorizontal());

    get isDesktop() {
        return this.layoutService.isDesktop();
    }
    get isMobile() {
        return this.layoutService.isMobile();
    }

    get submenuAnimation() {
        if (this.layoutService.isDesktop() && (this.layoutService.isHorizontal() || this.layoutService.isSlim() || this.layoutService.isSlimPlus())) {
            return this.active ? 'visible' : 'hidden';
        }
        return this.root ? 'expanded' : this.active ? 'expanded' : 'collapsed';
    }

    // ── Constructor ───────────────────────────────────────────────────────
    constructor() {
        this.menuSourceSubscription = this.layoutService.menuSource$.subscribe((value) => {
            Promise.resolve(null).then(() => {
                if (value.routeEvent) {
                    this.active = value.key === this.key || value.key.startsWith(this.key + '-');
                } else {
                    if (value.key !== this.key && !value.key.startsWith(this.key + '-')) {
                        this.active = false;
                    }
                }
            });
        });

        this.menuResetSubscription = this.layoutService.resetSource$.subscribe(() => {
            this.active = false;
        });

        this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
            if (this.isSlimPlus() || this.isSlim() || this.isHorizontal()) {
                this.active = false;
            } else {
                if (this.item.routerLink) this.updateActiveStateFromRoute();
            }
        });
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────
    ngOnInit() {
        this.key = this.parentKey ? this.parentKey + '-' + this.index : String(this.index);
        if (!(this.isSlimPlus() || this.isSlim() || this.isHorizontal()) && this.item.routerLink) {
            this.updateActiveStateFromRoute();
        }
    }

    ngAfterViewChecked() {
        if (this.root && this.active && this.isDesktop && (this.isHorizontal() || this.isSlim() || this.isSlimPlus())) {
            this.calculatePosition(this.submenu?.nativeElement, this.submenu?.nativeElement.parentElement);
        }
    }

    ngOnDestroy() {
        this.menuSourceSubscription?.unsubscribe();
        this.menuResetSubscription?.unsubscribe();
    }

    // ── Route helpers ─────────────────────────────────────────────────────
    updateActiveStateFromRoute() {
        const activeRoute = this.router.isActive(this.item.routerLink[0], {
            paths: 'exact',
            queryParams: 'ignored',
            matrixParams: 'ignored',
            fragment: 'ignored'
        });
        if (activeRoute) {
            this.layoutService.onMenuStateChange({ key: this.key, routeEvent: true });
        }
    }

    onSubmenuAnimated(event: AnimationEvent) {
        if (event.toState === 'visible' && this.isDesktop && (this.isHorizontal() || this.isSlim() || this.isSlimPlus())) {
            this.calculatePosition(event.element as HTMLUListElement, (event.element as HTMLUListElement).parentElement as HTMLUListElement);
        }
    }

    calculatePosition(overlay: HTMLElement, target: HTMLElement) {
        if (!overlay) return;
        const { top } = target.getBoundingClientRect();
        const vHeight = window.innerHeight;
        const oHeight = overlay.offsetHeight;
        const topbarEl = document.querySelector('.layout-topbar') as HTMLElement;
        const topbarHeight = topbarEl?.offsetHeight || 0;

        overlay.style.top = '';
        overlay.style.left = '';

        if (this.layoutService.isSlim() || this.layoutService.isSlimPlus()) {
            const topOffset = top - topbarHeight;
            const height = topOffset + oHeight + topbarHeight;
            overlay.style.top = vHeight < height ? `${topOffset - (height - vHeight)}px` : `${topOffset}px`;
        }
    }

    // ── Interactions ──────────────────────────────────────────────────────
    itemClick(event: MouseEvent) {
        if (this.item.disabled) {
            event.preventDefault();
            return;
        }

        if ((this.root && this.isSlim()) || this.isHorizontal() || this.isSlimPlus()) {
            this.layoutService.layoutState.update((val) => ({ ...val, menuHoverActive: !val.menuHoverActive }));
        }

        if (this.item.command) {
            this.item.command({ originalEvent: event, item: this.item });
        }

        // Ctrl/Cmd/middle-click → let the browser open the routerLink in a new
        // tab natively (the <a> has an href). Do not intercept or preventDefault.
        if ((event.metaKey || event.ctrlKey) && this.item.routerLink) {
            return;
        }

        if (this.item.items) {
            this.active = !this.active;
            if (this.root && this.active && (this.isSlim() || this.isHorizontal() || this.isSlimPlus())) {
                this.layoutService.onOverlaySubmenuOpen();
            }
        } else {
            if (this.layoutService.isMobile()) {
                this.layoutService.layoutState.update((val) => ({ ...val, staticMenuMobileActive: false }));
            }
            if (this.isSlim() || this.isHorizontal() || this.isSlimPlus()) {
                this.layoutService.reset();
                this.layoutService.layoutState.update((val) => ({ ...val, menuHoverActive: false }));
            }
        }

        this.layoutService.onMenuStateChange({ key: this.key });
    }

    onMouseEnter() {
        if (this.root && (this.isSlim() || this.isHorizontal() || this.isSlimPlus()) && this.layoutService.isDesktop()) {
            if (this.layoutService.layoutState().menuHoverActive) {
                this.active = true;
                this.layoutService.onMenuStateChange({ key: this.key });
            }
        }
    }
}

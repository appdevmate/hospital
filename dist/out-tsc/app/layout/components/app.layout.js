import { __decorate } from "tslib";
import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { AppTopbar } from './app.topbar';
import { AppFooter } from './app.footer';
import { AppConfigurator } from './app.configurator';
import { AppBreadcrumb } from './app.breadcrumb';
import { AppSidebar } from "./app.sidebar";
let AppLayout = class AppLayout {
    layoutService;
    renderer;
    router;
    overlayMenuOpenSubscription;
    tabOpenSubscription;
    tabCloseSubscription;
    menuOutsideClickListener;
    menuScrollListener;
    appSidebar;
    appTopbar;
    constructor(layoutService, renderer, router) {
        this.layoutService = layoutService;
        this.renderer = renderer;
        this.router = router;
        this.overlayMenuOpenSubscription = this.layoutService.overlayOpen$.subscribe(() => {
            if (!this.menuOutsideClickListener) {
                this.menuOutsideClickListener = this.renderer.listen('document', 'click', (event) => {
                    const isOutsideClicked = !(this.appSidebar.appMenu.el.nativeElement.isSameNode(event.target) ||
                        this.appSidebar.appMenu.el.nativeElement.contains(event.target) ||
                        this.appTopbar.menuButton.nativeElement.isSameNode(event.target) ||
                        this.appTopbar.menuButton.nativeElement.contains(event.target));
                    if (isOutsideClicked) {
                        this.hideMenu();
                    }
                });
            }
            if ((this.layoutService.isSlim() || this.layoutService.isSlimPlus()) && !this.menuScrollListener) {
                this.menuScrollListener = this.renderer.listen(this.appSidebar.appMenu.menuContainer.nativeElement, 'scroll', (event) => {
                    if (this.layoutService.isDesktop()) {
                        this.hideMenu();
                    }
                });
            }
            if (this.layoutService.layoutState().staticMenuMobileActive) {
                this.blockBodyScroll();
            }
        });
        this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
            this.hideMenu();
        });
        this.tabOpenSubscription = this.layoutService.tabOpen$.subscribe((tab) => {
            this.router.navigate(tab.routerLink);
            this.layoutService.openTab(tab);
        });
        this.tabCloseSubscription = this.layoutService.tabClose$.subscribe((event) => {
            if (this.router.isActive(event.tab.routerLink[0], { paths: 'subset', queryParams: 'subset', fragment: 'ignored', matrixParams: 'ignored' })) {
                const tabs = this.layoutService.tabs;
                if (tabs.length > 1) {
                    if (event.index === tabs.length - 1)
                        this.router.navigate(tabs[tabs.length - 2].routerLink);
                    else
                        this.router.navigate(tabs[event.index + 1].routerLink);
                }
                else {
                    this.router.navigate(['/']);
                }
            }
            this.layoutService.closeTab(event.index);
        });
    }
    blockBodyScroll() {
        if (document.body.classList) {
            document.body.classList.add('blocked-scroll');
        }
        else {
            document.body.className += ' blocked-scroll';
        }
    }
    unblockBodyScroll() {
        if (document.body.classList) {
            document.body.classList.remove('blocked-scroll');
        }
        else {
            document.body.className = document.body.className.replace(new RegExp('(^|\\b)' + 'blocked-scroll'.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
        }
    }
    hideMenu() {
        this.layoutService.layoutState.update((prev) => ({ ...prev, overlayMenuActive: false, staticMenuMobileActive: false, menuHoverActive: false }));
        this.layoutService.reset();
        if (this.menuOutsideClickListener) {
            this.menuOutsideClickListener();
            this.menuOutsideClickListener = null;
        }
        if (this.menuScrollListener) {
            this.menuScrollListener();
            this.menuScrollListener = null;
        }
        this.unblockBodyScroll();
    }
    get containerClass() {
        return {
            'layout-slim': this.layoutService.layoutConfig().menuMode === 'slim',
            'layout-slim-plus': this.layoutService.layoutConfig().menuMode === 'slim-plus',
            'layout-static': this.layoutService.layoutConfig().menuMode === 'static',
            'layout-overlay': this.layoutService.layoutConfig().menuMode === 'overlay',
            'layout-overlay-active': this.layoutService.layoutState().overlayMenuActive,
            'layout-mobile-active': this.layoutService.layoutState().staticMenuMobileActive,
            'layout-static-inactive': this.layoutService.layoutState().staticMenuDesktopInactive && this.layoutService.layoutConfig().menuMode === 'static',
            'layout-light': this.layoutService.layoutConfig().layoutTheme === 'colorScheme' && !this.layoutService.isDarkTheme(),
            'layout-dark': this.layoutService.layoutConfig().layoutTheme === 'colorScheme' && this.layoutService.isDarkTheme(),
            'layout-primary': !this.layoutService.isDarkTheme() && this.layoutService.layoutConfig().layoutTheme === 'primaryColor'
        };
    }
    ngOnDestroy() {
        if (this.overlayMenuOpenSubscription) {
            this.overlayMenuOpenSubscription.unsubscribe();
        }
        if (this.menuOutsideClickListener) {
            this.menuOutsideClickListener();
        }
        if (this.tabOpenSubscription) {
            this.tabOpenSubscription.unsubscribe();
        }
        if (this.tabCloseSubscription) {
            this.tabCloseSubscription.unsubscribe();
        }
    }
};
__decorate([
    ViewChild(AppSidebar)
], AppLayout.prototype, "appSidebar", void 0);
__decorate([
    ViewChild(AppTopbar)
], AppLayout.prototype, "appTopbar", void 0);
AppLayout = __decorate([
    Component({
        selector: 'app-layout',
        standalone: true,
        imports: [CommonModule, AppTopbar, AppSidebar, RouterModule, AppFooter, AppConfigurator, AppBreadcrumb],
        template: `
        <div class="layout-container" [ngClass]="containerClass">
            <div app-topbar></div>
            <div app-sidebar></div>
            <div class="layout-content-wrapper">
                <div class="layout-content">
                    <div class="layout-content-inner">
                        <nav app-breadcrumb></nav>
                        <router-outlet></router-outlet>
                        <div app-footer></div>
                    </div>
                </div>
            </div>
        </div>
        <app-configurator />
    `,
    })
], AppLayout);
export { AppLayout };

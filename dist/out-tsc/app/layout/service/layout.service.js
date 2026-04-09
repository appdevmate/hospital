import { __decorate } from "tslib";
import { Injectable, effect, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';
let LayoutService = class LayoutService {
    _config = {
        preset: 'Aura',
        primary: 'emerald',
        surface: null,
        darkTheme: false,
        menuMode: 'slim',
        layoutTheme: 'colorScheme'
    };
    _state = {
        staticMenuDesktopInactive: false,
        overlayMenuActive: false,
        configSidebarVisible: false,
        staticMenuMobileActive: false,
        menuHoverActive: false,
        rightMenuActive: false,
        topbarMenuActive: false,
        sidebarActive: false,
        activeMenuItem: null,
        overlaySubmenuActive: false
    };
    layoutConfig = signal(this._config);
    layoutState = signal(this._state);
    configUpdate = new Subject();
    overlayOpen = new Subject();
    menuSource = new Subject();
    resetSource = new Subject();
    tabOpen = new Subject();
    tabClose = new Subject();
    tabs = [];
    menuSource$ = this.menuSource.asObservable();
    resetSource$ = this.resetSource.asObservable();
    configUpdate$ = this.configUpdate.asObservable();
    overlayOpen$ = this.overlayOpen.asObservable();
    tabOpen$ = this.tabOpen.asObservable();
    tabClose$ = this.tabClose.asObservable();
    isSidebarActive = computed(() => this.layoutState().overlayMenuActive || this.layoutState().staticMenuMobileActive);
    isDarkTheme = computed(() => this.layoutConfig().darkTheme);
    isOverlay = computed(() => this.layoutConfig().menuMode === 'overlay');
    isSlim = computed(() => this.layoutConfig().menuMode === 'slim');
    isSlimPlus = computed(() => this.layoutConfig().menuMode === 'slim-plus');
    isHorizontal = computed(() => this.layoutConfig().menuMode === 'horizontal');
    transitionComplete = signal(false);
    isSidebarStateChanged = computed(() => {
        const layoutConfig = this.layoutConfig();
        return layoutConfig.menuMode === 'horizontal' || layoutConfig.menuMode === 'slim' || layoutConfig.menuMode === 'slim-plus';
    });
    initialized = false;
    constructor() {
        effect(() => {
            const config = this.layoutConfig();
            if (config) {
                this.onConfigUpdate();
            }
        });
        effect(() => {
            const config = this.layoutConfig();
            if (!this.initialized || !config) {
                this.initialized = true;
                return;
            }
            this.handleDarkModeTransition(config);
        });
        effect(() => {
            this.isSidebarStateChanged() && this.reset();
        });
    }
    handleDarkModeTransition(config) {
        if (document.startViewTransition) {
            this.startViewTransition(config);
        }
        else {
            this.toggleDarkMode(config);
            this.onTransitionEnd();
        }
    }
    startViewTransition(config) {
        const transition = document.startViewTransition(() => {
            this.toggleDarkMode(config);
        });
        transition.ready
            .then(() => {
            this.onTransitionEnd();
        })
            .catch(() => { });
    }
    toggleDarkMode(config) {
        const _config = config || this.layoutConfig();
        if (_config.darkTheme) {
            document.documentElement.classList.add('app-dark');
        }
        else {
            document.documentElement.classList.remove('app-dark');
        }
    }
    onTransitionEnd() {
        this.transitionComplete.set(true);
        setTimeout(() => {
            this.transitionComplete.set(false);
        });
    }
    onMenuToggle() {
        if (this.isOverlay()) {
            this.layoutState.update((prev) => ({ ...prev, overlayMenuActive: !this.layoutState().overlayMenuActive }));
            if (this.layoutState().overlayMenuActive) {
                this.overlayOpen.next(null);
            }
        }
        if (this.isDesktop()) {
            this.layoutState.update((prev) => ({ ...prev, staticMenuDesktopInactive: !this.layoutState().staticMenuDesktopInactive }));
        }
        else {
            this.layoutState.update((prev) => ({ ...prev, staticMenuMobileActive: !this.layoutState().staticMenuMobileActive }));
            if (this.layoutState().staticMenuMobileActive) {
                this.overlayOpen.next(null);
            }
        }
    }
    isDesktop() {
        return window.innerWidth > 991;
    }
    isMobile() {
        return !this.isDesktop();
    }
    onConfigUpdate() {
        this._config = { ...this.layoutConfig() };
        this.configUpdate.next(this.layoutConfig());
    }
    onMenuStateChange(event) {
        this.menuSource.next(event);
    }
    reset() {
        this.resetSource.next(true);
    }
    onOverlaySubmenuOpen() {
        this.overlayOpen.next(null);
    }
    showProfileSidebar() {
        this.layoutState.update((prev) => ({ ...prev, profileSidebarVisible: true }));
    }
    showConfigSidebar() {
        this.layoutState.update((prev) => ({ ...prev, configSidebarVisible: true }));
    }
    hideConfigSidebar() {
        this.layoutState.update((prev) => ({ ...prev, configSidebarVisible: false }));
    }
    onTabOpen(value) {
        this.tabOpen.next(value);
    }
    openTab(value) {
        this.tabs = [...this.tabs, value];
    }
    onTabClose(value, index) {
        this.tabClose.next({ tab: value, index: index });
    }
    closeTab(index) {
        this.tabs.splice(index, 1);
        this.tabs = [...this.tabs];
    }
};
LayoutService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], LayoutService);
export { LayoutService };

import { Component } from '@angular/core';
import { StyleClass } from 'primeng/styleclass';
import { Ripple } from 'primeng/ripple';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
    selector: 'header-widget',
    imports: [StyleClass, Ripple, CommonModule, RouterModule, ButtonModule],
    template: `
        <div class="flex items-center justify-between px-8 sm:px-20 py-12">
            <a [routerLink]="['/']" class="cursor-pointer">
                <span class="text-2xl font-bold text-color">VERONA</span>
            </a>
            <div class="relative">
                <button
                    pButton
                    pRipple
                    rounded
                    class="cursor-pointer lg:hidden! select-none w-12 h-12"
                    pStyleClass="@next"
                    enterFromClass="hidden"
                    enterActiveClass="animate-scalein"
                    leaveActiveClass="animate-fadeout"
                    leaveToClass="hidden"
                    [hideOnOutsideClick]="true"
                >
                    <i class="pi pi-bars text-4xl"></i>
                </button>
                <div
                    id="landing-menu"
                    class="hidden lg:block absolute right-0 top-auto lg:static z-10 shadow lg:shadow-none w-60 lg:w-auto bg-surface-0 dark:bg-surface-900 lg:bg-surface-50 dark:lg:bg-surface-950 origin-top p-4 lg:p-0"
                    style="border-radius:14px"
                >
                    <ul class="flex flex-col lg:flex-row m-0 p-0 list-none text-2xl lg:text-base">
                        <li>
                            <a
                                class="block p-4 cursor-pointer font-bold text-muted-color hover:text-color transition-colors duration-300"
                                (click)="scrollTo('stats')"
                                pStyleClass="#landing-menu"
                                leaveActiveClass="animate-fadeout"
                                leaveToClass="hidden"
                                >STATS</a
                            >
                        </li>
                        <li>
                            <a
                                class="block p-4 cursor-pointer font-bold text-muted-color hover:text-color transition-colors duration-300"
                                (click)="scrollTo('features')"
                                pStyleClass="#landing-menu"
                                leaveActiveClass="animate-fadeout"
                                leaveToClass="hidden"
                                >FEATURES</a
                            >
                        </li>
                        <li>
                            <a
                                class="block p-4 cursor-pointer font-bold text-muted-color hover:text-color transition-colors duration-300"
                                (click)="scrollTo('pricing')"
                                pStyleClass="#landing-menu"
                                leaveActiveClass="animate-fadeout"
                                leaveToClass="hidden"
                                >PRICING</a
                            >
                        </li>
                        <li>
                            <a class="block p-4 cursor-pointer font-bold text-muted-color hover:text-color transition-colors duration-300" [routerLink]="['/auth/login']">SIGN IN</a>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    `
})
export class HeaderWidget {
    scrollTo(id: string) {
        setTimeout(() => {
            const element = document.getElementById(id);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
            }
        }, 200);
    }
}

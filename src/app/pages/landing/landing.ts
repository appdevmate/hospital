import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { RippleModule } from 'primeng/ripple';
import { StyleClassModule } from 'primeng/styleclass';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { HeaderWidget } from './components/headerwidget';
import { HeroWidget } from './components/herowidget';
import { StatsWidget } from './components/statswidget';
import { FeaturesWidget } from './components/featureswidget';
import { JoinWidget } from './components/joinwidget';
import { PricingWidget } from './components/pricingwidget';
import { FooterWidget } from './components/footerwidget';
import { LayoutService } from '@/layout/service/layout.service';

@Component({
    selector: 'app-landing',
    standalone: true,
    imports: [RouterModule, RippleModule, StyleClassModule, ButtonModule, DividerModule, HeaderWidget, HeroWidget, StatsWidget, FeaturesWidget, JoinWidget, PricingWidget, FooterWidget],
    template: `
        <div class="bg-surface-50 dark:bg-surface-950 min-h-screen w-screen">
            <div class="landing-wrapper">
                <div [style]="backgroundStyle" class="bg-no-repeat bg-cover bg-bottom">
                    <header-widget />
                    <hero-widget />
                    <stats-widget />
                </div>
                <features-widget />
                <join-widget />
                <pricing-widget />
                <footer-widget />
            </div>
        </div>
    `
})
export class Landing {
    layoutService = inject(LayoutService);

    get backgroundStyle(): object {
        let path = '/demo/images/landing/';
        let image = this.layoutService.isDarkTheme() ? 'line-effect-dark.svg' : 'line-effect.svg';

        return { 'background-image': 'url(' + path + image + ')' };
    }
}

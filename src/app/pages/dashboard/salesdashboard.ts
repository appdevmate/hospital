import { Component } from '@angular/core';
import { BonjourWidget } from './components/sales/bonjourwidget';
import { StatsSalesWidget } from './components/sales/statssaleswidget';
import { StoreOverviewWidget } from './components/sales/storeoverviewwidget';
import { RecentSalesWidget } from './components/sales/recentsaleswidget';
import { LiveSupportWidget } from './components/sales/livesupportwidget';
import { RevenueStreamWidget } from './components/sales/revenuestreamwidget';
import { SalesChannelsWidget } from './components/sales/saleschannelswidget';
import { OptimizingWidget } from './components/sales/optimizingwidget';
import { BestSellersWidget } from './components/sales/bestsellerswidget';
import { CustomerStoriesWidget } from './components/sales/customerstorieswidget';
import { PotentialInfluencersWidget } from './components/sales/potentialinfluencerswidget';
import { ProductService } from '@/pages/service/product.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-sales-dashboard',
    standalone: true,
    imports: [CommonModule, BonjourWidget, StatsSalesWidget, StoreOverviewWidget, RecentSalesWidget, LiveSupportWidget, RevenueStreamWidget, SalesChannelsWidget, OptimizingWidget, BestSellersWidget, CustomerStoriesWidget, PotentialInfluencersWidget],
    template: `
        <div class="col-span-12">
            <bonjour-widget />
        </div>

        <div class="col-span-12">
            <stats-sales-widget />
        </div>

        <div class="col-span-12 lg:col-span-6">
            <store-overview-widget />
        </div>

        <div class="col-span-12 lg:col-span-6">
            <recent-sales-widget />
        </div>

        <div class="col-span-12 md:col-span-6 xl:col-span-6">
            <live-support-widget />
        </div>

        <div class="col-span-12 md:col-span-6 xl:col-span-3">
            <revenue-stream-widget />
        </div>

        <div class="col-span-12 md:col-span-6 lg:col-span-6 xl:col-span-3">
            <sales-channels-widget />
        </div>

        <div class="col-span-12 md:col-span-6 xl:col-span-3">
            <optimizing-widget />
        </div>

        <div class="col-span-12 md:col-span-6 xl:col-span-3">
            <best-sellers-widget />
        </div>

        <div class="col-span-12 md:col-span-6 lg:col-span-6">
            <div class="grid grid-cols-12 gap-8">
                <customer-stories-widget />
                <potential-influencers-widget />
            </div>
        </div>
    `,
    host: {
        class: 'grid grid-cols-12 gap-8 mb-4'
    },
    providers: [ProductService]
})
export class SalesDashboard {}

import { Component } from '@angular/core';
import { StatsSaasWidget } from './components/sass/statssaaswidget';
import { AcquisitionOverviewWidget } from './components/sass/acquisitionoverviewwidget';
import { LatestCustomerWidget } from './components/sass/latestcustomerwidget';
import { ProfileWidget } from './components/sass/profilewidget';
import { TrialsLeadsWidget } from './components/sass/trialsleadswidget';
import { LeadsByRoleWidget } from './components/sass/leadsbyrolewidget';
import { RecentBlogPostWidget } from './components/sass/recentblogpostwidget';
import { TimelineWidget } from './components/sass/timelinewidget';
import { MonthlyRecurringWidget } from './components/sass/monthlyrecurringwidget';

@Component({
    selector: 'app-saas-dashboard',
    standalone: true,
    imports: [StatsSaasWidget, AcquisitionOverviewWidget, LatestCustomerWidget, ProfileWidget, TrialsLeadsWidget, LeadsByRoleWidget, RecentBlogPostWidget, TimelineWidget, MonthlyRecurringWidget],
    template: `
        <stats-saas-widget />
        <acquisition-overview-widget />

        <div class="col-span-12 lg:col-span-6 xl:col-span-3">
            <latest-customer-widget />
        </div>

        <div class="col-span-12 lg:col-span-6 xl:col-span-3">
            <profile-widget />
        </div>

        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <trials-leads-widget />
        </div>

        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <leads-by-role-widget />
        </div>

        <div class="col-span-12 lg:col-span-6 xl:col-span-4">
            <recent-blog-post-widget />
        </div>

        <div class="col-span-12 lg:col-span-6">
            <timeline-widget />
        </div>
        <div class="col-span-12 xl:col-span-6">
            <monthly-recurring-widget />
        </div>
    `,
    host: {
        class: 'grid grid-cols-12 gap-8 mb-4'
    }
})
export class SaasDashboard {}

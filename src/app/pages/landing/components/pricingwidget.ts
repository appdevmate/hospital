import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
    standalone: true,
    selector: 'pricing-widget',
    imports: [ButtonModule],
    template: ` <div id="pricing" class="px-8 sm:px-20 py-20 bg-surface-0 dark:bg-surface-900 flex flex-col lg:flex-row justify-center gap-8">
        <div class="shadow bg-surface-0 dark:bg-surface-900 p-8 text-center rounded-2xl">
            <img alt="intro image" src="/demo/images/landing/asset-free.svg" class="w-full sm:w-6/12 lg:w-full block mx-auto mb-8" />
            <div class="text-2xl font-bold mb-4">Free</div>
            <div class="mb-8">
                <span class="text-6xl font-bold">$0 </span>
                <span class="text-xl text-muted-color">/month</span>
            </div>
            <a
                class="p-2 mb-8 font-bold block text-center cursor-pointer hover:bg-emphasis transition-colors duration-300"
                style="
                    border-radius: 2rem;
                    box-shadow:
                        0px 3px 4px rgba(0, 0, 0, 0.1),
                        0px 24px 36px rgba(0, 0, 0, 0.04);
                "
                >TRY NOW</a
            >
            <ul class="list-none p-0 m-0">
                <li class="flex items-center">
                    <i class="pi pi-check-circle text-green-500 text-xl mr-2"></i>
                    <span>Responsive Layout</span>
                </li>
            </ul>
        </div>
        <div class="shadow bg-surface-0 dark:bg-surface-900 p-8 text-center rounded-2xl">
            <img alt="intro image" src="/demo/images/landing/asset-premium.svg" class="w-full sm:w-6/12 lg:w-full block mx-auto mb-8" />
            <div class="text-2xl font-bold mb-4">Premium</div>
            <div class="mb-8">
                <span class="text-6xl font-bold">$9 </span>
                <span class="text-xl text-muted-color">/month</span>
            </div>
            <a
                class="p-2 mb-8 font-bold block text-center cursor-pointer hover:bg-emphasis transition-colors duration-300"
                style="
                    border-radius: 2rem;
                    box-shadow:
                        0px 3px 4px rgba(0, 0, 0, 0.1),
                        0px 24px 36px rgba(0, 0, 0, 0.04);
                "
                >TRY NOW</a
            >
            <ul class="list-none p-0 m-0">
                <li class="flex items-center mb-4">
                    <i class="pi pi-check-circle text-green-500 text-xl mr-2"></i>
                    <span>Responsive Layout</span>
                </li>
                <li class="flex items-center mb-4">
                    <i class="pi pi-check-circle text-green-500 text-xl mr-2"></i>
                    <span>10000 Push Messages</span>
                </li>
                <li class="flex items-center">
                    <i class="pi pi-check-circle text-green-500 text-xl mr-2"></i>
                    <span>50 Support Tickets</span>
                </li>
            </ul>
        </div>
        <div class="shadow bg-surface-0 dark:bg-surface-900 p-8 text-center rounded-2xl">
            <img alt="intro image" src="/demo/images/landing/asset-enterprise.svg" class="w-full sm:w-6/12 lg:w-full block mx-auto mb-8" />
            <div class="text-2xl font-bold mb-4">Enterprise</div>
            <div class="mb-8">
                <span class="text-6xl font-bold">$19 </span>
                <span class="text-xl text-muted-color">/month</span>
            </div>
            <a
                class="p-2 mb-8 font-bold block text-center cursor-pointer hover:bg-emphasis transition-colors duration-300"
                style="
                    border-radius: 2rem;
                    box-shadow:
                        0px 3px 4px rgba(0, 0, 0, 0.1),
                        0px 24px 36px rgba(0, 0, 0, 0.04);
                "
                >TRY NOW</a
            >
            <ul class="list-none p-0 m-0">
                <li class="flex items-center mb-4">
                    <i class="pi pi-check-circle text-green-500 text-xl mr-2"></i>
                    <span>Responsive Layout</span>
                </li>
                <li class="flex items-center mb-4">
                    <i class="pi pi-check-circle text-green-500 text-xl mr-2"></i>
                    <span>Unlimited Push Messages</span>
                </li>
                <li class="flex items-center mb-4">
                    <i class="pi pi-check-circle text-green-500 text-xl mr-2"></i>
                    <span>1000 Support Tickets</span>
                </li>
                <li class="flex items-center mb-4">
                    <i class="pi pi-check-circle text-green-500 text-xl mr-2"></i>
                    <span>Free Shipping</span>
                </li>
                <li class="flex items-center">
                    <i class="pi pi-check-circle text-green-500 text-xl mr-2"></i>
                    <span>Unlimited Storage</span>
                </li>
            </ul>
        </div>
    </div>`
})
export class PricingWidget {}

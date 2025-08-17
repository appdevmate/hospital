import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
    standalone: true,
    selector: 'stats-widget',
    imports: [ButtonModule],
    template: `
        <div id="stats" class="p-20">
            <div class="flex flex-col items-center mb-16">
                <span class="font-bold text-muted-color text-2xl mb-4">Ecosystem</span>
                <h2 class="font-bold text-6xl my-0">All You Need Is Here</h2>
            </div>
            <div class="flex flex-col xl:flex-row justify-center gap-8">
                <div class="bg-surface-0 dark:bg-surface-900 text-center py-16 px-8 shadow" style="border-radius: 14px">
                    <div class="text-xl text-muted-color mb-4">Easy to use</div>
                    <h3 class="mt-0 mb-4 font-bold text-4xl">Play like a toy</h3>
                    <p class="leading-normal mb-8 text-muted-color">More than <strong>80</strong> UI components.</p>
                    <button pButton icon="pi pi-arrow-right" label="Get Started" class="p-button-text" iconPos="right"></button>
                    <div class="mt-20 xl:pt-20">
                        <img alt="intro image" src="/demo/images/landing/feature-components.svg" class="w-9/12 md:w-4/12 xl:w-9/12" />
                    </div>
                </div>
                <div class="flex flex-col md:flex-row xl:flex-col gap-8">
                    <div class="flex-1 bg-surface-0 dark:bg-surface-900 flex flex-col xl:flex-row xl:items-center justify-between py-16 px-8 shadow gap-8" style="border-radius: 14px">
                        <div class="flex-1 order-1 xl:order-0 text-center xl:text-left">
                            <img alt="intro image" src="/demo/images/landing/feature-blocks.svg" class="w-9/12" />
                        </div>
                        <div class="text-center xl:text-right flex-1">
                            <div class="text-xl text-muted-color mb-4">PrimeBlocks</div>
                            <h3 class="mt-0 mb-4 font-bold text-4xl">Save your time</h3>
                            <p class="leading-normal mb-8 text-muted-color">PrimeBlocks have <strong>370+</strong> blocks: hero sections, pricing, footers and more....</p>
                            <button pButton icon="pi pi-arrow-right" label="Browse Blocks" class="p-button-text" iconPos="right"></button>
                        </div>
                    </div>
                    <div class="flex-1 bg-surface-0 dark:bg-surface-900 flex flex-col xl:flex-row xl:items-center justify-between py-16 px-8 shadow gap-8" style="border-radius: 14px">
                        <div class="text-center xl:text-left flex-1">
                            <div class="text-xl text-muted-color mb-4">PrimeIcons</div>
                            <h3 class="mt-0 mb-4 font-bold text-4xl">Enjoy 300+ Icons</h3>
                            <p class="leading-normal mb-8 text-muted-color">What you need in your app, you find any icon in PrimeIcons.</p>
                            <button pButton icon="pi pi-arrow-right" label="Explore Icons" class="p-button-text" iconPos="right"></button>
                        </div>
                        <div class="flex-1 text-center xl:text-right">
                            <img alt="intro image" src="/demo/images/landing/feature-icons.svg" class="w-9/12" />
                        </div>
                    </div>
                </div>
                <div class="bg-surface-0 dark:bg-surface-900 text-center py-16 px-8 shadow" style="border-radius: 14px">
                    <div class="text-xl text-muted-color mb-4">Theme Designer</div>
                    <h3 class="mt-0 mb-4 font-bold text-4xl">Design Your Own</h3>
                    <p class="leading-normal mb-8 text-muted-color">Limitless customization.</p>
                    <button pButton icon="pi pi-arrow-right" label="View Designer" class="p-button-text" iconPos="right"></button>
                    <div class="mt-20 xl:pt-20">
                        <img alt="intro image" src="/demo/images/landing/feature-designer.svg" class="w-9/12 md:w-4/12 xl:w-9/12" />
                    </div>
                </div>
            </div>
        </div>
    `
})
export class StatsWidget {}

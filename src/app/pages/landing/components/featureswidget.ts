import { Component } from '@angular/core';

@Component({
    standalone: true,
    selector: 'features-widget',
    template: ` <div id="features" class="px-8 sm:px-20 py-20 bg-surface-0 dark:bg-surface-900">
        <div class="flex flex-col lg:flex-row justify-center gap-8">
            <div>
                <div class="bg-orange-50 p-12 flex items-center justify-center mb-8" style="border-radius: 5rem 14px 14px 14px;">
                    <img alt="intro image" src="/demo/images/landing/icon-modern-responsive.svg" class="h-24 sm:h-48" />
                </div>
                <h3 class="mt-0 mb-8 font-bold text-4xl">Responsive Design</h3>
                <p class="leading-normal text-muted-color">Nam non ligula sed urna malesuada lacinia. Aliquam sed viverra ipsum.</p>
            </div>
            <div>
                <div class="bg-green-50 p-12 flex items-center justify-center mb-8" style="border-radius: 14px">
                    <img alt="intro image" src="/demo/images/landing/icon-modern-design.svg" class="h-24 sm:h-48" />
                </div>
                <h3 class="mt-0 mb-8 font-bold text-4xl">Modern Design</h3>
                <p class="leading-normal text-muted-color">Nam non ligula sed urna malesuada lacinia. Aliquam sed viverra ipsum.</p>
            </div>
            <div>
                <div class="bg-red-50 p-12 flex items-center justify-center mb-8" style="border-radius: 14px; border-bottom-right-radius: 5rem">
                    <img alt="intro image" src="/demo/images/landing/icon-clean-code.svg" class="h-24 sm:h-48" />
                </div>
                <h3 class="mt-0 mb-8 font-bold text-4xl">Clean Code</h3>
                <p class="leading-normal text-muted-color">Nam non ligula sed urna malesuada lacinia. Aliquam sed viverra ipsum.</p>
            </div>
        </div>
    </div>`
})
export class FeaturesWidget {}

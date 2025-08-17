import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
    standalone: true,
    selector: 'hero-widget',
    imports: [ButtonModule],
    template: ` <div class="flex flex-col lg:flex-row gap-8 items-center justify-between px-8 sm:px-20 py-20 overflow-hidden">
        <div class="flex-1 animate-fadein animate-duration-1000">
            <span class="font-bold text-7xl mt-0 mb-8">PrimeTek Presents Verona</span>
            <p class="text-3xl mb-8 leading-normal">Minimal layout inspired by a beautiful city</p>
            <button pButton label="TRY NOW"></button>
        </div>
        <div class="flex-1">
            <img alt="intro image" src="/demo/images/landing/screen.jpg" class="animate-fadeinright animate-ease-in-out animate-duration-1000 w-full rounded-2xl shadow" />
        </div>
    </div>`
})
export class HeroWidget {}

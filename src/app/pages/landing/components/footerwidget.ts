import { Component } from '@angular/core';

@Component({
    standalone: true,
    selector: 'footer-widget',
    template: ` <div class="px-8 sm:px-20 py-20 bg-gray-900 flex flex-col md:flex-row md:items-start gap-8" style="border-top-left-radius: 14px; border-top-right-radius: 14px">
        <div class="flex items-center flex-1">
            <img alt="intro image" src="/layout/images/logo-light.png" class="w-16 md:w-10 lg:w-16" />
            <span class="text-white text-5xl md:text-3xl lg:text-5xl font-bold ml-2">Verona</span>
        </div>
        <div class="flex-1">
            <div class="text-xl text-gray-600 mb-6">LATEST</div>
            <ul class="list-none p-0 m-0">
                <li class="mb-4">
                    <a class="cursor-pointer text-white text-xl">Ultima</a>
                </li>
                <li class="mb-4">
                    <a class="cursor-pointer text-white text-xl">Apollo</a>
                </li>
                <li class="mb-4">
                    <a class="cursor-pointer text-white text-xl">Sakai</a>
                </li>
                <li class="mb-4">
                    <a class="cursor-pointer text-white text-xl">Diamond</a>
                </li>
                <li>
                    <a class="cursor-pointer text-white text-xl">Poseidon</a>
                </li>
            </ul>
        </div>
        <div class="flex-1">
            <div class="text-xl text-gray-600 mb-6">DEMOS</div>
            <ul class="list-none p-0 m-0">
                <li class="mb-4">
                    <a class="cursor-pointer text-white text-xl">PrimeNG</a>
                </li>
                <li class="mb-4">
                    <a class="cursor-pointer text-white text-xl">PrimeFaces</a>
                </li>
                <li class="mb-4">
                    <a class="cursor-pointer text-white text-xl">PrimeReact</a>
                </li>
                <li>
                    <a class="cursor-pointer text-white text-xl">PrimeVue</a>
                </li>
            </ul>
        </div>
        <div class="flex flex-1 gap-6">
            <a href="http://github.com/primefaces">
                <i class="pi pi-github text-white text-3xl! lg:text-5xl!"></i>
            </a>
            <a href="https://discord.gg/gzKFYnpmCY">
                <i class="pi pi-discord text-white text-3xl! lg:text-5xl!"></i>
            </a>
            <a href="http://twitter/primeng">
                <i class="pi pi-twitter text-white text-3xl! lg:text-5xl!"></i>
            </a>
        </div>
    </div>`
})
export class FooterWidget {}

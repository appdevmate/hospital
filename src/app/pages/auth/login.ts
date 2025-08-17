import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';
import { AppConfigurator } from '@/layout/components/app.configurator';
import { InputIcon } from 'primeng/inputicon';
import { IconField } from 'primeng/iconfield';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [ButtonModule, CheckboxModule, InputTextModule, PasswordModule, FormsModule, RouterModule, RippleModule, AppConfigurator, InputIcon, IconField],
    template: `
        <app-configurator [simple]="true" />
        <div class="bg-surface-100 dark:bg-surface-950 h-screen w-screen flex items-center justify-center">
            <div class="bg-surface-0 dark:bg-surface-900 py-16 px-8 sm:px-16 shadow flex flex-col w-11/12 sm:w-120" style="border-radius: 14px">
                <h1 class="font-bold text-2xl mt-0 mb-2">VERONA</h1>
                <p class="text-muted-color mb-6">Welcome to the <strong>Verona Community</strong>, where the magic happens, sign in to continue.</p>

                <p-iconfield class="mb-6">
                    <p-inputicon class="pi pi-user" />
                    <input pInputText type="text" placeholder="Email" class="w-full" />
                </p-iconfield>

                <p-iconfield class="mb-6">
                    <p-inputicon class="pi pi-key" />
                    <input pInputText type="password" placeholder="Password" class="w-full" />
                </p-iconfield>

                <p-button label="Sign In" styleClass="mb-6" [routerLink]="'/'"></p-button>

                <span class="text-muted-color text-center mb-6">or sign in with below</span>

                <div class="flex gap-6 items-center justify-center">
                    <a href="https://www.facebook.com" class="inline-flex shrink-0 w-12 h-12 justify-center items-center bg-surface-50 dark:bg-surface-950 rounded-full">
                        <i class="pi pi-facebook text-2xl! text-color"></i>
                    </a>
                    <a href="https://www.twitter.com" class="inline-flex shrink-0 w-12 h-12 justify-center items-center bg-surface-50 dark:bg-surface-950 rounded-full">
                        <i class="pi pi-twitter text-2xl! text-color"></i>
                    </a>
                    <a href="https://www.google.com" class="inline-flex shrink-0 w-12 h-12 justify-center items-center bg-surface-50 dark:bg-surface-950 rounded-full">
                        <i class="pi pi-google text-2xl! text-color"></i>
                    </a>
                    <a href="https://www.github.com" class="inline-flex shrink-0 w-12 h-12 justify-center items-center bg-surface-50 dark:bg-surface-950 rounded-full">
                        <i class="pi pi-github text-2xl! text-color"></i>
                    </a>
                </div>
            </div>
        </div>
    `
})
export class Login {
    email: string = '';

    password: string = '';

    checked: boolean = false;
}

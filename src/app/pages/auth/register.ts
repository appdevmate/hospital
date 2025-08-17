import { Component } from '@angular/core';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { Password } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [IconField, InputIcon, Password, ButtonModule, RouterModule, FormsModule, InputText],
    template: `
        <div class="bg-surface-100 dark:bg-surface-950 h-screen w-screen flex items-center justify-center">
            <div class="bg-surface-0 dark:bg-surface-900 py-16 px-8 sm:px-16 shadow flex flex-col w-11/12 sm:w-120" style="border-radius: 14px">
                <h1 class="font-bold text-2xl mt-0 mb-2">VERONA</h1>
                <p class="text-muted-color mb-6">Welcome to the <strong>Verona Community</strong>, where the magic happens, sign up to continue.</p>

                <p-icon-field class="mb-6">
                    <p-inputicon class="pi pi-user" />
                    <input pInputText type="text" placeholder="Email" class="w-full" />
                </p-icon-field>

                <p-icon-field class="mb-6">
                    <p-inputicon class="pi pi-key z-20" />
                    <p-password id="password" placeholder="Password" styleClass="w-full" [(ngModel)]="value" [inputStyle]="{ paddingLeft: '2.5rem' }" inputStyleClass="w-full" [toggleMask]="true"></p-password>
                </p-icon-field>

                <p-button [routerLink]="['/']" label="Sign Up" class="mb-4"></p-button>

                <span class="text-muted-color text-center mb-6">or sign up with below</span>

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
export class Register {
    value: string = '';
}

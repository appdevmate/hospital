import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
    standalone: true,
    selector: 'join-widget',
    imports: [ButtonModule],
    template: ` <div class="px-8 sm:px-20 py-20 bg-surface-50 dark:bg-surface-950 flex flex-wrap gap-8 items-center justify-between">
        <div class="text-4xl font-bold">Join the Prime Community</div>
        <button pButton label="Join Now" class="p-button-raised"></button>
    </div>`
})
export class JoinWidget {}

import { __decorate } from "tslib";
import { Component } from '@angular/core';
let Empty = class Empty {
};
Empty = __decorate([
    Component({
        selector: 'app-empty',
        standalone: true,
        template: `<div class="grid grid-cols-12 gap-4">
        <div class="col-span-12">
            <div class="card">
                <div class="font-semibold text-xl mb-4">Empty Page</div>
                <p>Use this page to start from scratch and place your custom content.</p>
            </div>
        </div>
    </div>`
    })
], Empty);
export { Empty };

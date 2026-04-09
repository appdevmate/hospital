import { __decorate } from "tslib";
import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';
let IconService = class IconService {
    http;
    constructor(http) {
        this.http = http;
    }
    icons;
    selectedIcon;
    apiUrl = 'public/demo/data/icons.json';
    getIcons() {
        return this.http.get(this.apiUrl).pipe(map((response) => {
            this.icons = response.icons;
            return this.icons;
        }));
    }
};
IconService = __decorate([
    Injectable()
], IconService);
export { IconService };

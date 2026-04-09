import { __decorate } from "tslib";
import { Injectable } from '@angular/core';
let FileAppService = class FileAppService {
    http;
    constructor(http) {
        this.http = http;
    }
    getFiles() {
        return this.http
            .get('/demo/data/file-management.json')
            .toPromise()
            .then((res) => res.files)
            .then((data) => data);
    }
    getMetrics() {
        return this.http
            .get('/demo/data/file-management.json')
            .toPromise()
            .then((res) => res.metrics)
            .then((data) => data);
    }
    getFoldersSmall() {
        return this.http
            .get('/demo/data/file-management.json')
            .toPromise()
            .then((res) => res.folders_small)
            .then((data) => data);
    }
    getFoldersLarge() {
        return this.http
            .get('/demo/data/file-management.json')
            .toPromise()
            .then((res) => res.folders_large)
            .then((data) => data);
    }
};
FileAppService = __decorate([
    Injectable()
], FileAppService);
export { FileAppService };

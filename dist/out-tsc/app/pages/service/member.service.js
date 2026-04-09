import { __decorate } from "tslib";
import { Injectable } from '@angular/core';
let MemberService = class MemberService {
    http;
    constructor(http) {
        this.http = http;
    }
    getMembers() {
        return this.http
            .get('demo/data/members.json')
            .toPromise()
            .then((res) => res.data)
            .then((data) => data);
    }
};
MemberService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], MemberService);
export { MemberService };

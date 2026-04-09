import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { MailTableComponent } from './mail-table';
let MailInboxComponent = class MailInboxComponent {
    mailService;
    router;
    mails = [];
    subscription;
    constructor(mailService, router) {
        this.mailService = mailService;
        this.router = router;
        this.subscription = this.mailService.mails$.subscribe((data) => {
            this.mails = data.filter((d) => !d.archived && !d.spam && !d.trash && !d.hasOwnProperty('sent'));
        });
    }
    ngOnDestroy() {
        this.subscription.unsubscribe();
    }
};
MailInboxComponent = __decorate([
    Component({
        selector: 'app-mail-inbox',
        standalone: true,
        imports: [MailTableComponent],
        template: `<app-mail-table [mails]="mails"></app-mail-table>`
    })
], MailInboxComponent);
export { MailInboxComponent };

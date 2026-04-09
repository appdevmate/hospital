import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { MailTableComponent } from './mail-table';
let MailArchiveComponent = class MailArchiveComponent {
    mailService;
    archivedMails = [];
    subscription;
    constructor(mailService) {
        this.mailService = mailService;
        this.subscription = this.mailService.mails$.subscribe((data) => {
            this.archivedMails = data.filter((d) => d.archived);
        });
    }
    ngOnDestroy() {
        this.subscription.unsubscribe();
    }
};
MailArchiveComponent = __decorate([
    Component({
        selector: 'app-mail-archive',
        standalone: true,
        imports: [MailTableComponent],
        template: `<app-mail-table [mails]="archivedMails"></app-mail-table>`
    })
], MailArchiveComponent);
export { MailArchiveComponent };

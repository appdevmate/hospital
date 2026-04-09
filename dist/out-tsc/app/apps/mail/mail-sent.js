import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { MailTableComponent } from './mail-table';
let MailSentComponent = class MailSentComponent {
    mailService;
    sentMails = [];
    subscription;
    constructor(mailService) {
        this.mailService = mailService;
        this.subscription = this.mailService.mails$.subscribe((data) => {
            this.sentMails = data.filter((d) => d.sent && !d.trash && !d.archived);
        });
    }
};
MailSentComponent = __decorate([
    Component({
        standalone: true,
        imports: [MailTableComponent],
        template: `<app-mail-table [mails]="sentMails"></app-mail-table>`
    })
], MailSentComponent);
export { MailSentComponent };

import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { MailTableComponent } from './mail-table';
let MailSpamComponent = class MailSpamComponent {
    mailService;
    spamMails;
    subscription;
    constructor(mailService) {
        this.mailService = mailService;
        this.subscription = this.mailService.mails$.subscribe((data) => {
            this.spamMails = data.filter((d) => d.spam && !d.archived && !d.trash && !d.hasOwnProperty('sent'));
        });
    }
    ngOnDestroy() {
        this.subscription.unsubscribe();
    }
};
MailSpamComponent = __decorate([
    Component({
        selector: 'app-mail-spam',
        standalone: true,
        imports: [MailTableComponent],
        template: `<app-mail-table [mails]="spamMails"></app-mail-table> `
    })
], MailSpamComponent);
export { MailSpamComponent };

import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { MailTableComponent } from './mail-table';
let MailImportantComponent = class MailImportantComponent {
    mailService;
    importantMails = [];
    subscription;
    constructor(mailService) {
        this.mailService = mailService;
        this.subscription = this.mailService.mails$.subscribe((data) => {
            this.importantMails = data.filter((d) => d.important && !d.spam && !d.trash && !d.archived);
        });
    }
    ngOnDestroy() {
        this.subscription.unsubscribe();
    }
};
MailImportantComponent = __decorate([
    Component({
        selector: 'app-mail-important',
        standalone: true,
        imports: [MailTableComponent],
        template: `<app-mail-table [mails]="importantMails"></app-mail-table>`
    })
], MailImportantComponent);
export { MailImportantComponent };

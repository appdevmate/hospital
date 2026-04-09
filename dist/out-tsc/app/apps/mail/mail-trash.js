import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { MailTableComponent } from './mail-table';
let MailTrashComponent = class MailTrashComponent {
    mailService;
    trashMails = [];
    subscription;
    constructor(mailService) {
        this.mailService = mailService;
        this.subscription = this.mailService.mails$.subscribe((data) => {
            this.trashMails = data.filter((d) => d.trash);
        });
    }
    ngOnDestroy() {
        this.subscription.unsubscribe();
    }
};
MailTrashComponent = __decorate([
    Component({
        template: `<app-mail-table [mails]="trashMails"></app-mail-table>`,
        standalone: true,
        imports: [MailTableComponent]
    })
], MailTrashComponent);
export { MailTrashComponent };

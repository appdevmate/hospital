import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { MailTableComponent } from './mail-table';
let MailStarredComponent = class MailStarredComponent {
    mailService;
    starredMails = [];
    subscription;
    constructor(mailService) {
        this.mailService = mailService;
        this.subscription = this.mailService.mails$.subscribe((data) => {
            this.starredMails = data.filter((d) => d.starred && !d.archived && !d.trash);
        });
    }
    ngOnDestroy() {
        this.subscription.unsubscribe();
    }
};
MailStarredComponent = __decorate([
    Component({
        selector: 'app-mail-starred',
        standalone: true,
        imports: [MailTableComponent],
        template: `<app-mail-table [mails]="starredMails"></app-mail-table>`
    })
], MailStarredComponent);
export { MailStarredComponent };

import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { ChatService } from './service/chat.service';
import { ChatSidebar } from './chatsidebar';
import { ChatBox } from './chatbox';
let Chat = class Chat {
    chatService;
    subscription;
    activeUser;
    constructor(chatService) {
        this.chatService = chatService;
        this.subscription = this.chatService.activeUser$.subscribe((data) => (this.activeUser = data));
    }
    ngOnDestroy() {
        this.subscription.unsubscribe();
    }
};
Chat = __decorate([
    Component({
        selector: 'app-chat',
        standalone: true,
        imports: [ChatSidebar, ChatBox],
        template: `<div class="flex flex-col md:flex-row gap-8" style="min-height: 81vh">
        <div class="md:w-100 card p-0!">
            <app-chat-sidebar></app-chat-sidebar>
        </div>
        <div class="flex-1 card p-0!">
            <app-chat-box [user]="activeUser"></app-chat-box>
        </div>
    </div> `,
        providers: [ChatService]
    })
], Chat);
export { Chat };

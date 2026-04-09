import { __decorate } from "tslib";
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
let ChatService = class ChatService {
    http;
    _activeUser = {
        id: 1,
        name: 'Ioni Bowcher',
        image: 'ionibowcher.png',
        status: 'active',
        messages: [
            {
                text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit',
                ownerId: 1,
                createdAt: 1652646338240
            },
            {
                text: 'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua',
                ownerId: 1,
                createdAt: 1652646368718
            },
            {
                text: 'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua',
                ownerId: 123,
                createdAt: 1652646368718
            }
        ],
        lastSeen: '2d'
    };
    activeUser = new BehaviorSubject(this._activeUser);
    activeUser$ = this.activeUser.asObservable();
    constructor(http) {
        this.http = http;
    }
    getChatData() {
        return this.http
            .get('/demo/data/chat.json')
            .toPromise()
            .then((res) => res.data)
            .then((data) => data);
    }
    changeActiveChat(user) {
        this._activeUser = user;
        this.activeUser.next(user);
    }
    sendMessage(message) {
        this._activeUser.messages.push(message);
        this.activeUser.next(this._activeUser);
    }
};
ChatService = __decorate([
    Injectable()
], ChatService);
export { ChatService };

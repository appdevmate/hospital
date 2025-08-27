import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root'
})
export class Helpers {

  constructor(private messageService: MessageService) { }

  notifySuccess(message: string) {
    this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: message,
        life: 3000
      });
  }

  notifyWarning(message: string) {
    this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: message,
        life: 3000
      });
  }

  notifyError(summary: string, message: string) {
    this.messageService.add({
        severity: 'error',
        summary: summary,
        detail: message,
        life: 3000
      });
  }

  notifyInfo(summary: string, message: string) {
    this.messageService.add({
        severity: 'info',
        summary: summary,
        detail: message,
        life: 3000
      });
  }

}

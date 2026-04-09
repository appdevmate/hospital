import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { TaskService } from './service/task.service';
import { ButtonModule } from 'primeng/button';
import { TaskListComponent } from './task-list';
import { CreateTaskComponent } from './create-task';
import { RippleModule } from 'primeng/ripple';
let TaskList = class TaskList {
    taskService;
    subscription;
    todo = [];
    completed = [];
    constructor(taskService) {
        this.taskService = taskService;
        this.subscription = this.taskService.taskSource$.subscribe((data) => this.categorize(data));
    }
    categorize(tasks) {
        this.todo = tasks.filter((t) => t.completed !== true);
        this.completed = tasks.filter((t) => t.completed);
    }
    ngOnDestroy() {
        this.subscription.unsubscribe();
    }
    showDialog() {
        this.taskService.showDialog('Create Task', true);
    }
};
TaskList = __decorate([
    Component({
        standalone: true,
        imports: [ButtonModule, TaskListComponent, CreateTaskComponent, RippleModule],
        template: `<div class="card">
            <div class="flex justify-between items-center mb-8">
                <span class="text-surface-900 dark:text-surface-0 text-xl font-semibold">Task List</span>
                <button pButton pRipple class="font-semibold" outlined icon="pi pi-plus" label="Create Task" (click)="showDialog()"></button>
            </div>
            <app-task-list [taskList]="todo" title="ToDo"></app-task-list>
            <app-task-list [taskList]="completed" title="Completed"></app-task-list>
        </div>

        <app-create-task></app-create-task>`,
        providers: [TaskService]
    })
], TaskList);
export { TaskList };

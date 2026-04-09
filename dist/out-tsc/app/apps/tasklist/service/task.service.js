import { __decorate } from "tslib";
import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
let TaskService = class TaskService {
    http;
    dialogConfig = {
        visible: false,
        header: '',
        newTask: false
    };
    tasks = [];
    taskSource = new BehaviorSubject(this.tasks);
    selectedTask = new Subject();
    dialogSource = new BehaviorSubject(this.dialogConfig);
    taskSource$ = this.taskSource.asObservable();
    selectedTask$ = this.selectedTask.asObservable();
    dialogSource$ = this.dialogSource.asObservable();
    constructor(http) {
        this.http = http;
        this.http
            .get('/demo/data/tasks.json')
            .toPromise()
            .then((res) => res.data)
            .then((data) => {
            this.tasks = data;
            this.taskSource.next(data);
        });
    }
    addTask(task) {
        if (this.tasks.includes(task)) {
            this.tasks = this.tasks.map((t) => (t.id === task.id ? task : t));
        }
        else {
            this.tasks = [...this.tasks, task];
        }
        this.taskSource.next(this.tasks);
    }
    removeTask(id) {
        this.tasks = this.tasks.filter((t) => t.id !== id);
        this.taskSource.next(this.tasks);
    }
    onTaskSelect(task) {
        this.selectedTask.next(task);
    }
    markAsCompleted(task) {
        this.tasks = this.tasks.map((t) => (t.id === task.id ? task : t));
        this.taskSource.next(this.tasks);
    }
    showDialog(header, newTask) {
        this.dialogConfig = {
            visible: true,
            header: header,
            newTask: newTask
        };
        this.dialogSource.next(this.dialogConfig);
    }
    closeDialog() {
        this.dialogConfig = {
            visible: false
        };
        this.dialogSource.next(this.dialogConfig);
    }
};
TaskService = __decorate([
    Injectable()
], TaskService);
export { TaskService };

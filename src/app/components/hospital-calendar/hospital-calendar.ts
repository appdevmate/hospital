import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { HospitalCalendarService, HospitalCalendar, HospitalEvent } from '../../services/hospital-calendar.service';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';

@Component({
    selector: 'app-hospital-calendar',
    standalone: true,
    imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule, SelectModule, TextareaModule],
    templateUrl: './hospital-calendar.html',
    styleUrl: './hospital-calendar.scss'
})
export class HospitalCalendarComponent implements OnInit, AfterViewInit {
    @ViewChild('calendarEl') calendarEl!: ElementRef;

    calendarList: HospitalCalendar[] = [];
    selectedCalendarId = '';
    fcInstance: Calendar | null = null;

    showEventDialog = false;
    showDetailDialog = false;
    loading = false;
    pendingStart = '';
    pendingEnd = '';
    selectedEvent: any = null;

    newEvent = { name: '', description: '', color: '#3B82F6', recurrence: 'none' };

    colorOptions = [
        { value: '#3B82F6', label: 'Blue' },
        { value: '#10B981', label: 'Green' },
        { value: '#F59E0B', label: 'Amber' },
        { value: '#EF4444', label: 'Red' },
        { value: '#8B5CF6', label: 'Purple' },
        { value: '#EC4899', label: 'Pink' }
    ];

    recurrenceOptions = [
        { label: 'Does not repeat', value: 'none' },
        { label: 'Daily', value: 'daily' },
        { label: 'Weekly', value: 'weekly' },
        { label: 'Monthly', value: 'monthly' }
    ];

    constructor(
        private calendarService: HospitalCalendarService,
        private cd: ChangeDetectorRef
    ) {}

    ngOnInit() {
        this.calendarService.getCalendars().subscribe((data) => {
            this.calendarList = data;
            if (data.length > 0) {
                this.selectedCalendarId = data[0].calendarId;
                this.loadEvents();
            }
            this.cd.detectChanges();
        });
    }

    ngAfterViewInit() {
        this.initCalendar();
    }

    initCalendar() {
        this.fcInstance = new Calendar(this.calendarEl.nativeElement, {
            plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            editable: true,
            selectable: true,
            selectMirror: true,
            dayMaxEvents: true,
            height: 'calc(100vh - 200px)',
            events: [],
            select: (arg) => {
                this.pendingStart = arg.startStr;
                this.pendingEnd = arg.endStr;
                this.newEvent = { name: '', description: '', color: '#3B82F6', recurrence: 'none' };
                this.showEventDialog = true;
                this.cd.detectChanges();
            },
            eventClick: (arg) => {
                this.selectedEvent = arg.event;
                this.showDetailDialog = true;
                this.cd.detectChanges();
            }
        });
        this.fcInstance.render();
    }

    onCalendarChange() {
        this.loadEvents();
    }

    loadEvents() {
        if (!this.selectedCalendarId) return;
        this.calendarService.getEvents(this.selectedCalendarId).subscribe((data) => {
            if (this.fcInstance) {
                this.fcInstance.removeAllEvents();
                data.forEach((e) =>
                    this.fcInstance!.addEvent({
                        id: e.eventId,
                        title: e.name,
                        start: e.startDate,
                        end: e.endDate,
                        backgroundColor: e.color || '#3B82F6',
                        borderColor: e.color || '#3B82F6',
                        extendedProps: { description: e.description, recurrence: e.recurrence }
                    })
                );
            }
            this.cd.detectChanges();
        });
    }

    onCreate() {
        if (!this.newEvent.name) return;
        this.loading = true;
        this.calendarService
            .createEvent(this.selectedCalendarId, {
                name: this.newEvent.name,
                description: this.newEvent.description,
                startDate: this.pendingStart,
                endDate: this.pendingEnd,
                color: this.newEvent.color,
                recurrence: this.newEvent.recurrence
            })
            .subscribe({
                next: () => {
                    this.showEventDialog = false;
                    this.loading = false;
                    this.loadEvents();
                    this.cd.detectChanges();
                },
                error: (err) => {
                    console.error(err);
                    this.loading = false;
                }
            });
    }
}

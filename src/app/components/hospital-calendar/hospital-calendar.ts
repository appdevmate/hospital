import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { HospitalCalendarService, HospitalCalendar } from '../../services/hospital-calendar.service';
import { DoctorsService } from '@/pages/service/doctors.service';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-hospital-calendar',
    standalone: true,
    imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule, SelectModule, TextareaModule, RouterModule],
    templateUrl: './hospital-calendar.html',
    styleUrl: './hospital-calendar.scss'
})
export class HospitalCalendarComponent implements OnInit, AfterViewInit {
    @ViewChild('calendarEl') calendarEl!: ElementRef;

    calendarList: HospitalCalendar[] = [];
    selectedCalendarId = '';
    fcInstance: Calendar | null = null;
    calendarReady = false;

    showEventDialog = false;
    showDetailDialog = false;
    loading = false;
    pendingStart = '';
    pendingEnd = '';
    selectedEvent: any = null;
    syncing = false;

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
        private doctorsService: DoctorsService,
        private cd: ChangeDetectorRef
    ) {}

    ngOnInit() {
        this.syncDoctorCalendars();
    }

    ngAfterViewInit() {}

    syncDoctorCalendars() {
        this.syncing = true;
        this.cd.detectChanges();

        forkJoin({
            calendars: this.calendarService.getCalendars(),
            doctors: this.doctorsService.getDoctorsPage({ pageSize: 200 }).pipe(catchError(() => of({ data: [] })))
        }).subscribe(({ calendars, doctors }) => {
            const doctorList = doctors.data || [];
            const doctorNames = new Set(doctorList.map((d) => d.name).filter(Boolean));
            const existingNames = new Set(calendars.map((c) => c.name));

            // Calendars to create — doctor exists but no calendar yet
            const missing = doctorList.filter((d) => d.name && !existingNames.has(d.name));

            // Calendars to delete — calendar exists but doctor was deleted
            const orphaned = calendars.filter((c) => !doctorNames.has(c.name));

            const creates$ = missing.map((d) => this.calendarService.createCalendar(d.name, `Calendar for ${d.name}`).pipe(catchError(() => of(null))));

            const deletes$ = orphaned.map((c) => this.calendarService.deleteCalendar(c.calendarId).pipe(catchError(() => of(null))));

            const all$ = [...creates$, ...deletes$];

            if (all$.length === 0) {
                this.calendarList = calendars;
                this.syncing = false;
                this.selectFirst();
                return;
            }

            forkJoin(all$).subscribe(() => {
                this.calendarService.getCalendars().subscribe((updated) => {
                    this.calendarList = updated;
                    this.syncing = false;
                    this.selectFirst();
                });
            });
        });
    }

    selectFirst() {
        if (this.calendarList.length > 0) {
            this.selectedCalendarId = this.calendarList[0].calendarId;
            setTimeout(() => {
                this.initCalendar();
            }, 0);
        }
        this.cd.detectChanges();
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
        this.calendarReady = true;
        if (this.selectedCalendarId) this.loadEvents();
    }

    onCalendarChange() {
        this.loadEvents();
    }

    loadEvents() {
        if (!this.selectedCalendarId || !this.fcInstance) return;
        this.calendarService.getEvents(this.selectedCalendarId).subscribe((data) => {
            this.fcInstance!.removeAllEvents();
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

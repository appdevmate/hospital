import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
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
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HelpersService } from '@/services/helpers-service';

@Component({
    selector: 'app-hospital-calendar',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, DialogModule, ButtonModule, InputTextModule, SelectModule, TextareaModule, ConfirmDialogModule],
    providers: [ConfirmationService],
    templateUrl: './hospital-calendar.html',
    styleUrl: './hospital-calendar.scss'
})
export class HospitalCalendarComponent implements OnInit {
    @ViewChild('calendarEl') calendarEl!: ElementRef;

    calendarList: HospitalCalendar[] = [];
    selectedCalendarId = '';
    fcInstance: Calendar | null = null;
    syncing = false;

    // create dialog
    showEventDialog = false;
    // edit dialog
    showEditDialog = false;
    // detail dialog
    showDetailDialog = false;

    loading = false;
    pendingStart = '';
    pendingEnd = '';
    selectedEvent: any = null;

    newEvent = { name: '', description: '', color: '#3B82F6', recurrence: 'none' };
    editEvent = { name: '', description: '', color: '#3B82F6', recurrence: 'none', startDate: '', endDate: '' };

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
        private confirmationService: ConfirmationService,
        private helpers: HelpersService,
        private cd: ChangeDetectorRef
    ) {}

    ngOnInit() {
        this.syncDoctorCalendars();
    }

    syncDoctorCalendars() {
        this.syncing = true;
        this.cd.detectChanges();

        forkJoin({
            calendars: this.calendarService.getCalendars(),
            doctors: this.doctorsService.getDoctorsPage({ pageSize: 200 }).pipe(catchError(() => of({ data: [] })))
        }).subscribe(({ calendars, doctors }) => {
            const doctorList = doctors.data || [];
            const doctorNames = new Set(doctorList.map((d: any) => d.name).filter(Boolean));
            const existingNames = new Set(calendars.map((c) => c.name));

            const missing = doctorList.filter((d: any) => d.name && !existingNames.has(d.name));
            const orphaned = calendars.filter((c) => !doctorNames.has(c.name));

            const creates$ = missing.map((d: any) => this.calendarService.createCalendar(d.name, `Calendar for ${d.name}`).pipe(catchError(() => of(null))));

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
            setTimeout(() => this.initCalendar(), 0);
        }
        this.cd.detectChanges();
    }

    initCalendar() {
        if (this.fcInstance) {
            this.fcInstance.destroy();
            this.fcInstance = null;
        }

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
            },
            eventDrop: (arg) => {
                this.saveEventDrop(arg);
            }
        });

        this.fcInstance.render();
        this.loadEvents();
    }

    onCalendarChange() {
        if (this.fcInstance) {
            this.loadEvents();
        } else {
            setTimeout(() => this.initCalendar(), 0);
        }
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

    // Create
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
                    this.helpers.notifySuccess('Event Created');
                    this.loadEvents();
                    this.cd.detectChanges();
                },
                error: (err) => {
                    console.error(err);
                    this.loading = false;
                    this.helpers.notifyError('Failed', 'Could not create event');
                }
            });
    }

    // Open edit dialog from detail dialog
    openEdit() {
        if (!this.selectedEvent) return;
        this.editEvent = {
            name: this.selectedEvent.title,
            description: this.selectedEvent.extendedProps?.description || '',
            color: this.selectedEvent.backgroundColor || '#3B82F6',
            recurrence: this.selectedEvent.extendedProps?.recurrence || 'none',
            startDate: this.selectedEvent.startStr,
            endDate: this.selectedEvent.endStr || ''
        };
        this.showDetailDialog = false;
        this.showEditDialog = true;
        this.cd.detectChanges();
    }

    // Save edit
    onUpdate() {
        if (!this.editEvent.name || !this.selectedEvent) return;
        this.loading = true;
        this.calendarService
            .updateEvent(this.selectedCalendarId, this.selectedEvent.id, {
                name: this.editEvent.name,
                description: this.editEvent.description,
                startDate: this.editEvent.startDate,
                endDate: this.editEvent.endDate,
                color: this.editEvent.color,
                recurrence: this.editEvent.recurrence
            })
            .subscribe({
                next: () => {
                    this.showEditDialog = false;
                    this.loading = false;
                    this.helpers.notifySuccess('Event Updated');
                    this.loadEvents();
                    this.cd.detectChanges();
                },
                error: (err) => {
                    console.error(err);
                    this.loading = false;
                    this.helpers.notifyError('Failed', 'Could not update event');
                }
            });
    }

    // Delete from detail dialog
    onDelete() {
        if (!this.selectedEvent) return;
        this.confirmationService.confirm({
            message: `Delete "${this.selectedEvent.title}"?`,
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            acceptButtonProps: { label: 'Delete', severity: 'danger' },
            rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
            accept: () => {
                this.calendarService.deleteEvent(this.selectedCalendarId, this.selectedEvent.id).subscribe({
                    next: () => {
                        this.showDetailDialog = false;
                        this.helpers.notifySuccess('Event Deleted');
                        this.loadEvents();
                        this.cd.detectChanges();
                    },
                    error: (err) => {
                        console.error(err);
                        this.helpers.notifyError('Failed', 'Could not delete event');
                    }
                });
            }
        });
    }

    // Save drag-and-drop
    saveEventDrop(arg: any) {
        this.calendarService
            .updateEvent(this.selectedCalendarId, arg.event.id, {
                name: arg.event.title,
                description: arg.event.extendedProps?.description || '',
                startDate: arg.event.startStr,
                endDate: arg.event.endStr || '',
                color: arg.event.backgroundColor || '#3B82F6',
                recurrence: arg.event.extendedProps?.recurrence || 'none'
            })
            .subscribe({
                error: () => arg.revert()
            });
    }
}

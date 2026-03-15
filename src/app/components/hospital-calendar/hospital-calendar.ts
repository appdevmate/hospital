import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { ConfirmationService } from 'primeng/api';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { HospitalCalendarService, HospitalCalendar } from '../../pages/service/hospital-calendar.service';
import { DoctorsService, Doctor } from '@/pages/service/doctors.service';
import { HelpersService } from '@/pages/service/helpers-service';

@Component({
    selector: 'app-hospital-calendar',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, DialogModule, ButtonModule, InputTextModule, SelectModule, TextareaModule, ConfirmDialogModule, DatePickerModule],
    providers: [ConfirmationService],
    templateUrl: './hospital-calendar.html',
    styleUrl: './hospital-calendar.scss'
})
export class HospitalCalendarComponent implements OnInit {
    @ViewChild('calendarEl') calendarEl!: ElementRef;

    // ── Services ─────────────────────────────────────────────────────────
    private calendarService = inject(HospitalCalendarService);
    private doctorsService = inject(DoctorsService);
    private confirmationService = inject(ConfirmationService);
    private helpers = inject(HelpersService);
    private cdr = inject(ChangeDetectorRef);

    // ── State ─────────────────────────────────────────────────────────────
    calendarList: HospitalCalendar[] = [];
    selectedCalendarId = '';
    fcInstance: Calendar | null = null;
    syncing = false;
    loading = false;
    resyncing = false;

    showEventDialog = false;
    showEditDialog = false;
    showDetailDialog = false;

    pendingStart = '';
    pendingEnd = '';
    selectedEvent: any = null;

    // ── Cache: doctor list fetched once on load, reused everywhere ────────
    private cachedDoctors: Doctor[] = [];

    private readonly dayNameToNumber: Record<string, number> = {
        sun: 0,
        mon: 1,
        tue: 2,
        wed: 3,
        thu: 4,
        fri: 5,
        sat: 6
    };

    newEvent = { name: '', description: '', color: '#3B82F6', recurrence: 'none', startTime: null as Date | null, endTime: null as Date | null };
    editEvent = { name: '', description: '', color: '#3B82F6', recurrence: 'none', startDate: '', endDate: '', startTime: null as Date | null, endTime: null as Date | null };

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

    // ── Lifecycle ─────────────────────────────────────────────────────────
    ngOnInit() {
        this.syncDoctorCalendars();
    }

    // ── Initial sync — fetches doctors ONCE and caches them ───────────────
    syncDoctorCalendars() {
        this.syncing = true;
        this.cdr.detectChanges();

        forkJoin({
            calendars: this.calendarService.getCalendars(),
            doctors: this.doctorsService.getDoctorsPage({ pageSize: 200 }).pipe(catchError(() => of({ data: [] })))
        }).subscribe(({ calendars, doctors }) => {
            // Cache doctor list — used by all subsequent duty shift operations
            this.cachedDoctors = (doctors as any).data || [];

            const doctorNames = new Set(this.cachedDoctors.map((d) => d.name).filter(Boolean));
            const existingNames = new Set(calendars.map((c) => c.name));

            const missing = this.cachedDoctors.filter((d) => d.name && !existingNames.has(d.name));
            const orphaned = calendars.filter((c) => !doctorNames.has(c.name));

            const creates$ = missing.map((d) => this.calendarService.createCalendar(d.name, `Calendar for ${d.name}`).pipe(catchError(() => of(null))));
            const deletes$ = orphaned.map((c) => this.calendarService.deleteCalendar(c.calendarId).pipe(catchError(() => of(null))));
            const all$ = [...creates$, ...deletes$];

            if (all$.length === 0) {
                this.calendarList = calendars;
                this.syncing = false;
                this.selectFirst();
                this.syncDutyShifts(this.cachedDoctors, calendars);
                return;
            }

            forkJoin(all$).subscribe(() => {
                this.calendarService.getCalendars().subscribe((updated) => {
                    this.calendarList = updated;
                    this.syncing = false;
                    this.selectFirst();
                    this.syncDutyShifts(this.cachedDoctors, calendars);
                });
            });
        });
    }

    selectFirst() {
        if (this.calendarList.length > 0) {
            this.selectedCalendarId = this.calendarList[0].calendarId;
            setTimeout(() => this.initCalendar(), 0);
        }
        this.cdr.detectChanges();
    }

    // ── FullCalendar ──────────────────────────────────────────────────────
    initCalendar() {
        if (this.fcInstance) {
            this.fcInstance.destroy();
            this.fcInstance = null;
        }

        this.fcInstance = new Calendar(this.calendarEl.nativeElement, {
            plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
            initialView: 'dayGridMonth',
            headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
            editable: true,
            selectable: true,
            selectMirror: true,
            dayMaxEvents: true,
            height: 'calc(100vh - 200px)',
            events: [],
            select: (arg) => {
                this.pendingStart = arg.startStr;
                this.pendingEnd = arg.endStr;
                this.newEvent = { name: '', description: '', color: '#3B82F6', recurrence: 'none', startTime: null, endTime: null };
                this.showEventDialog = true;
                this.cdr.detectChanges();
            },
            eventClick: (arg) => {
                this.selectedEvent = arg.event;
                this.showDetailDialog = true;
                this.cdr.detectChanges();
            },
            eventDrop: (arg) => {
                this.saveEventDrop(arg);
            }
        });

        this.fcInstance.render();
        this.loadEvents();
    }

    // ── On dropdown change — load events + sync duty shifts using cached doctors ──
    onCalendarChange() {
        if (this.fcInstance) {
            this.loadEvents();
            this.syncDutyShiftsForSelected();
        } else {
            setTimeout(() => this.initCalendar(), 0);
        }
    }

    // Uses cachedDoctors — no API call needed
    private syncDutyShiftsForSelected() {
        const cal = this.calendarList.find((c) => c.calendarId === this.selectedCalendarId);
        if (!cal) return;

        const doctor = this.cachedDoctors.find((d) => d.name === cal.name);
        if (!doctor?.dutyDays?.length || !doctor.dutyStart || !doctor.dutyEnd) return;

        this.calendarService.getEvents(this.selectedCalendarId).subscribe((existingEvents) => {
            // Already has duty shifts — nothing to do
            if (existingEvents.some((e) => e.description?.includes('DUTY_SHIFT'))) return;

            const today = new Date();
            const threeMonthsLater = new Date();
            threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

            const creates = this.buildDutyEvents(doctor, today, threeMonthsLater);
            if (!creates.length) return;

            const creates$ = creates.map((e) => this.calendarService.createEvent(this.selectedCalendarId, e).pipe(catchError(() => of(null))));
            forkJoin(creates$).subscribe(() => this.loadEvents());
        });
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
            this.cdr.detectChanges();
        });
    }

    // ── CRUD ──────────────────────────────────────────────────────────────
    onCreate() {
        if (!this.newEvent.name) return;
        this.loading = true;
        this.calendarService
            .createEvent(this.selectedCalendarId, {
                name: this.newEvent.name,
                description: this.newEvent.description,
                startDate: `${this.pendingStart}T${this.helpers.toTimeStr(this.newEvent.startTime)}:00`,
                endDate: `${this.pendingStart}T${this.helpers.toTimeStr(this.newEvent.endTime)}:00`,
                color: this.newEvent.color,
                recurrence: this.newEvent.recurrence
            })
            .subscribe({
                next: () => {
                    this.newEvent = { name: '', description: '', color: '#3B82F6', recurrence: 'none', startTime: null, endTime: null };
                    this.showEventDialog = false;
                    this.loading = false;
                    this.helpers.notifySuccess('Event Created');
                    this.loadEvents();
                    this.cdr.detectChanges();
                },
                error: () => {
                    this.loading = false;
                    this.helpers.notifyError('Failed', 'Could not create event');
                }
            });
    }

    openEdit() {
        if (!this.selectedEvent) return;
        const parseTime = (dateStr: string): Date | null => {
            if (!dateStr) return null;
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? null : d;
        };
        this.editEvent = {
            name: this.selectedEvent.title,
            description: this.selectedEvent.extendedProps?.description || '',
            color: this.selectedEvent.backgroundColor || '#3B82F6',
            recurrence: this.selectedEvent.extendedProps?.recurrence || 'none',
            startDate: this.selectedEvent.startStr,
            endDate: this.selectedEvent.endStr || '',
            startTime: parseTime(this.selectedEvent.startStr),
            endTime: parseTime(this.selectedEvent.endStr)
        };
        this.showDetailDialog = false;
        this.showEditDialog = true;
        this.cdr.detectChanges();
    }

    onUpdate() {
        if (!this.editEvent.name || !this.selectedEvent) return;
        this.loading = true;
        this.calendarService
            .updateEvent(this.selectedCalendarId, this.selectedEvent.id, {
                name: this.editEvent.name,
                description: this.editEvent.description,
                startDate: `${this.editEvent.startDate.slice(0, 10)}T${this.helpers.toTimeStr(this.editEvent.startTime)}:00`,
                endDate: `${this.editEvent.startDate.slice(0, 10)}T${this.helpers.toTimeStr(this.editEvent.endTime)}:00`,
                color: this.editEvent.color,
                recurrence: this.editEvent.recurrence
            })
            .subscribe({
                next: () => {
                    this.showEditDialog = false;
                    this.loading = false;
                    this.helpers.notifySuccess('Event Updated');
                    this.loadEvents();
                    this.cdr.detectChanges();
                },
                error: () => {
                    this.loading = false;
                    this.helpers.notifyError('Failed', 'Could not update event');
                }
            });
    }

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
                        this.cdr.detectChanges();
                    },
                    error: () => {
                        this.helpers.notifyError('Failed', 'Could not delete event');
                    }
                });
            }
        });
    }

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
            .subscribe({ error: () => arg.revert() });
    }

    // ── Duty Shifts — all use cachedDoctors, no extra API calls ──────────
    syncDutyShifts(doctors: Doctor[], calendars: HospitalCalendar[]) {
        const today = new Date();
        const threeMonthsLater = new Date();
        threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

        doctors.forEach((doctor) => {
            if (!doctor.dutyDays?.length || !doctor.dutyStart || !doctor.dutyEnd) return;

            const cal = calendars.find((c) => c.name === doctor.name);
            if (!cal) return;

            this.calendarService.getEvents(cal.calendarId).subscribe((existingEvents) => {
                if (existingEvents.some((e) => e.description?.includes('DUTY_SHIFT'))) return;

                const creates = this.buildDutyEvents(doctor, today, threeMonthsLater);
                if (!creates.length) return;

                const creates$ = creates.map((e) => this.calendarService.createEvent(cal.calendarId, e).pipe(catchError(() => of(null))));
                forkJoin(creates$).subscribe(() => {
                    if (this.selectedCalendarId === cal.calendarId) this.loadEvents();
                });
            });
        });
    }

    // ── Re-sync: delete only DUTY_SHIFT events then regenerate from cache ──
    resyncDutySchedule() {
        if (!this.selectedCalendarId) return;

        const cal = this.calendarList.find((c) => c.calendarId === this.selectedCalendarId);
        const doctor = this.cachedDoctors.find((d) => cal && d.name === cal.name);

        if (!doctor?.dutyDays?.length || !doctor.dutyStart || !doctor.dutyEnd) {
            this.helpers.notifyWarning('No duty schedule found for this doctor');
            return;
        }

        this.resyncing = true;

        // Step 1: fetch events, delete only DUTY_SHIFT ones
        this.calendarService.getEvents(this.selectedCalendarId).subscribe({
            next: (events) => {
                const dutyEvents = events.filter((e) => e.description?.includes('DUTY_SHIFT'));
                const deleteOrSkip = dutyEvents.length > 0 ? forkJoin(dutyEvents.map((e) => this.calendarService.deleteEvent(this.selectedCalendarId, e.eventId).pipe(catchError(() => of(null))))) : of([]);

                // Step 2: regenerate duty shifts from cached doctor data
                deleteOrSkip.subscribe(() => {
                    const today = new Date();
                    const threeMonthsLater = new Date();
                    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

                    const creates = this.buildDutyEvents(doctor, today, threeMonthsLater);
                    if (!creates.length) {
                        this.resyncing = false;
                        this.helpers.notifyWarning('No duty days to sync');
                        return;
                    }

                    this.createInBatches(creates, 0);
                });
            },
            error: () => {
                this.resyncing = false;
                this.helpers.notifyError('Failed', 'Could not load events for resync');
            }
        });
    }

    private buildDutyEvents(doctor: Doctor, from: Date, to: Date): any[] {
        const events: any[] = [];
        const cursor = new Date(from);

        while (cursor <= to) {
            const dayNum = cursor.getDay();
            const dayName = Object.keys(this.dayNameToNumber).find((k) => this.dayNameToNumber[k] === dayNum);

            if (dayName && doctor.dutyDays!.includes(dayName)) {
                const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
                events.push({
                    name: `${doctor.name} - Duty Shift`,
                    description: 'DUTY_SHIFT',
                    startDate: `${dateStr}T${doctor.dutyStart}:00`,
                    endDate: `${dateStr}T${doctor.dutyEnd}:00`,
                    color: '#10B981',
                    recurrence: 'none'
                });
            }
            cursor.setDate(cursor.getDate() + 1);
        }
        return events;
    }

    private createInBatches(events: any[], index: number) {
        const batchSize = 5;
        const batch = events.slice(index, index + batchSize);

        if (batch.length === 0) {
            this.resyncing = false;
            this.helpers.notifySuccess('Duty schedule synced');
            this.loadEvents();
            this.cdr.detectChanges();
            return;
        }

        const batch$ = batch.map((e) => this.calendarService.createEvent(this.selectedCalendarId, e).pipe(catchError(() => of(null))));
        forkJoin(batch$).subscribe(() => {
            setTimeout(() => this.createInBatches(events, index + batchSize), 300);
        });
    }
}

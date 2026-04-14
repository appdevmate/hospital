// import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef, inject } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { RouterModule } from '@angular/router';
// import { Calendar } from '@fullcalendar/core';
// import dayGridPlugin from '@fullcalendar/daygrid';
// import timeGridPlugin from '@fullcalendar/timegrid';
// import interactionPlugin from '@fullcalendar/interaction';
// import { DialogModule } from 'primeng/dialog';
// import { ButtonModule } from 'primeng/button';
// import { InputTextModule } from 'primeng/inputtext';
// import { SelectModule } from 'primeng/select';
// import { TextareaModule } from 'primeng/textarea';
// import { ConfirmDialogModule } from 'primeng/confirmdialog';
// import { DatePickerModule } from 'primeng/datepicker';
// import { ConfirmationService } from 'primeng/api';
// import { Observable, forkJoin, of } from 'rxjs';
// import { catchError } from 'rxjs/operators';

// import { HospitalCalendarService, HospitalCalendar } from '../../pages/service/hospital-calendar.service';
// import { DoctorsService, Doctor } from '@/pages/service/doctors.service';
// import { HelpersService } from '@/pages/service/helpers-service';

// @Component({
//     selector: 'app-hospital-calendar',
//     standalone: true,
//     imports: [CommonModule, FormsModule, RouterModule, DialogModule, ButtonModule, InputTextModule, SelectModule, TextareaModule, ConfirmDialogModule, DatePickerModule],
//     providers: [ConfirmationService],
//     templateUrl: './hospital-calendar.html',
//     styleUrl: './hospital-calendar.scss'
// })
// export class HospitalCalendarComponent implements OnInit {
//     @ViewChild('calendarEl') calendarEl!: ElementRef;

//     private calendarService = inject(HospitalCalendarService);
//     private doctorsService = inject(DoctorsService);
//     private confirmationService = inject(ConfirmationService);
//     private helpers = inject(HelpersService);
//     private cdr = inject(ChangeDetectorRef);

//     calendarList: HospitalCalendar[] = [];
//     selectedCalendarId = '';
//     fcInstance: Calendar | null = null;
//     syncing = false;
//     loading = false;
//     resyncing = false;

//     showEventDialog = false;
//     showEditDialog = false;
//     showDetailDialog = false;
//     pendingStart = '';
//     pendingEnd = '';
//     selectedEvent: any = null;

//     private cachedDoctors: Doctor[] = [];

//     private readonly dayNameToNumber: Record<string, number> = {
//         sun: 0,
//         mon: 1,
//         tue: 2,
//         wed: 3,
//         thu: 4,
//         fri: 5,
//         sat: 6
//     };

//     newEvent = { name: '', description: '', color: '#3B82F6', recurrence: 'none', startTime: null as Date | null, endTime: null as Date | null };
//     editEvent = { name: '', description: '', color: '#3B82F6', recurrence: 'none', startDate: '', endDate: '', startTime: null as Date | null, endTime: null as Date | null };

//     colorOptions = [
//         { value: '#3B82F6', label: 'Blue' },
//         { value: '#10B981', label: 'Green' },
//         { value: '#F59E0B', label: 'Amber' },
//         { value: '#EF4444', label: 'Red' },
//         { value: '#8B5CF6', label: 'Purple' },
//         { value: '#EC4899', label: 'Pink' }
//     ];

//     recurrenceOptions = [
//         { label: 'Does not repeat', value: 'none' },
//         { label: 'Daily', value: 'daily' },
//         { label: 'Weekly', value: 'weekly' },
//         { label: 'Monthly', value: 'monthly' }
//     ];

//     ngOnInit() {
//         this.syncDoctorCalendars();
//     }

//     syncDoctorCalendars() {
//         this.syncing = true;
//         this.cdr.detectChanges();

//         forkJoin({
//             calendars: this.calendarService.getCalendars(),
//             doctors: this.doctorsService.getDoctorsPage({ pageSize: 200 }).pipe(catchError(() => of({ data: [] })))
//         }).subscribe(({ calendars, doctors }) => {
//             this.cachedDoctors = (doctors as any).data || [];

//             const doctorNames = new Set(this.cachedDoctors.map((d) => d.name).filter(Boolean));
//             const existingNames = new Set(calendars.map((c) => c.name));

//             const missing = this.cachedDoctors.filter((d) => d.name && !existingNames.has(d.name));
//             const orphaned = calendars.filter((c) => !doctorNames.has(c.name));

//             const creates$ = missing.map((d) => this.calendarService.createCalendar(d.name, `Calendar for ${d.name}`).pipe(catchError(() => of(null))));
//             const deletes$ = orphaned.map((c) => this.calendarService.deleteCalendar(c.calendarId).pipe(catchError(() => of(null))));
//             const all$ = [...creates$, ...deletes$];

//             const proceed = (updatedCalendars: HospitalCalendar[]) => {
//                 this.calendarList = updatedCalendars;
//                 this.syncing = false;
//                 this.selectFirst();
//                 this.seedDutyShiftsSequentially(this.cachedDoctors, updatedCalendars, 0);
//             };

//             if (all$.length === 0) {
//                 proceed(calendars);
//                 return;
//             }

//             forkJoin(all$).subscribe(() => {
//                 this.calendarService.getCalendars().subscribe((updated) => proceed(updated));
//             });
//         });
//     }

//     // Seed duty shifts for each doctor one at a time (sequential, not parallel)
//     private seedDutyShiftsSequentially(doctors: Doctor[], calendars: HospitalCalendar[], index: number) {
//         if (index >= doctors.length) return;

//         const doctor = doctors[index];
//         const next = () => this.seedDutyShiftsSequentially(doctors, calendars, index + 1);

//         if (!doctor.dutyDays?.length || !doctor.dutyStart || !doctor.dutyEnd) {
//             next();
//             return;
//         }

//         const cal = calendars.find((c) => c.name === doctor.name);
//         if (!cal) {
//             next();
//             return;
//         }

//         this.calendarService.getEvents(cal.calendarId).subscribe((existingEvents) => {
//             if (existingEvents.some((e) => e.description?.includes('DUTY_SHIFT'))) {
//                 // Already has duty shifts — reload if selected, then move on
//                 if (this.selectedCalendarId === cal.calendarId) setTimeout(() => this.loadEvents(), 100);
//                 next();
//                 return;
//             }

//             const creates = this.buildDutyEvents(doctor);
//             const isSelected = this.selectedCalendarId === cal.calendarId;

//             this.createInBatches(cal.calendarId, creates, 0, () => {
//                 if (isSelected) setTimeout(() => this.loadEvents(), 100);
//                 next(); // process next doctor only after this one completes
//             });
//         });
//     }

//     selectFirst() {
//         if (this.calendarList.length > 0) {
//             this.selectedCalendarId = this.calendarList[0].calendarId;
//             setTimeout(() => this.initCalendar(), 0);
//         }
//         this.cdr.detectChanges();
//     }

//     initCalendar() {
//         if (this.fcInstance) {
//             this.fcInstance.destroy();
//             this.fcInstance = null;
//         }

//         this.fcInstance = new Calendar(this.calendarEl.nativeElement, {
//             plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
//             initialView: 'dayGridMonth',
//             headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
//             editable: true,
//             selectable: true,
//             selectMirror: true,
//             dayMaxEvents: true,
//             height: 'calc(100vh - 200px)',
//             events: [],
//             select: (arg) => {
//                 this.pendingStart = arg.startStr;
//                 this.pendingEnd = arg.endStr;
//                 this.newEvent = { name: '', description: '', color: '#3B82F6', recurrence: 'none', startTime: null, endTime: null };
//                 this.showEventDialog = true;
//                 this.cdr.detectChanges();
//             },
//             eventClick: (arg) => {
//                 this.selectedEvent = arg.event;
//                 this.showDetailDialog = true;
//                 this.cdr.detectChanges();
//             },
//             eventDrop: (arg) => {
//                 this.saveEventDrop(arg);
//             }
//         });

//         this.fcInstance.render();
//         setTimeout(() => this.loadEvents(), 100);
//     }

//     // Dropdown change: show existing events immediately, seed only if truly empty
//     onCalendarChange() {
//         if (!this.fcInstance) {
//             setTimeout(() => this.initCalendar(), 0);
//             return;
//         }

//         this.calendarService.getEvents(this.selectedCalendarId).subscribe((events) => {
//             // Render what exists immediately
//             this.fcInstance!.removeAllEvents();
//             events.forEach((e) =>
//                 this.fcInstance!.addEvent({
//                     id: e.eventId,
//                     title: e.name,
//                     start: e.startDate,
//                     end: e.endDate,
//                     backgroundColor: e.color || '#3B82F6',
//                     borderColor: e.color || '#3B82F6',
//                     extendedProps: { description: e.description, recurrence: e.recurrence }
//                 })
//             );
//             this.cdr.detectChanges();

//             // Only seed if NO duty shifts exist yet
//             if (events.some((e) => e.description?.includes('DUTY_SHIFT'))) return;

//             const cal = this.calendarList.find((c) => c.calendarId === this.selectedCalendarId);
//             const doctor = this.cachedDoctors.find((d) => cal && d.name === cal.name);
//             if (!doctor?.dutyDays?.length || !doctor.dutyStart || !doctor.dutyEnd) return;

//             const creates = this.buildDutyEvents(doctor);
//             if (!creates.length) return;

//             this.createInBatches(this.selectedCalendarId, creates, 0, () => {
//                 setTimeout(() => this.loadEvents(), 100);
//             });
//         });
//     }

//     loadEvents() {
//         if (!this.selectedCalendarId || !this.fcInstance) return;
//         this.calendarService.getEvents(this.selectedCalendarId).subscribe((data) => {
//             this.fcInstance!.removeAllEvents();
//             data.forEach((e) =>
//                 this.fcInstance!.addEvent({
//                     id: e.eventId,
//                     title: e.name,
//                     start: e.startDate,
//                     end: e.endDate,
//                     backgroundColor: e.color || '#3B82F6',
//                     borderColor: e.color || '#3B82F6',
//                     extendedProps: { description: e.description, recurrence: e.recurrence }
//                 })
//             );
//             this.cdr.detectChanges();
//         });
//     }

//     // ── CRUD ──────────────────────────────────────────────────────────────
//     onCreate() {
//         if (!this.newEvent.name) return;
//         this.loading = true;
//         this.calendarService
//             .createEvent(this.selectedCalendarId, {
//                 name: this.newEvent.name,
//                 description: this.newEvent.description,
//                 startDate: `${this.pendingStart}T${this.helpers.toTimeStr(this.newEvent.startTime)}:00`,
//                 endDate: `${this.pendingStart}T${this.helpers.toTimeStr(this.newEvent.endTime)}:00`,
//                 color: this.newEvent.color,
//                 recurrence: this.newEvent.recurrence
//             })
//             .subscribe({
//                 next: () => {
//                     this.newEvent = { name: '', description: '', color: '#3B82F6', recurrence: 'none', startTime: null, endTime: null };
//                     this.showEventDialog = false;
//                     this.loading = false;
//                     this.helpers.notifySuccess('Event Created');
//                     this.loadEvents();
//                     this.cdr.detectChanges();
//                 },
//                 error: () => {
//                     this.loading = false;
//                     this.helpers.notifyError('Failed', 'Could not create event');
//                 }
//             });
//     }

//     openEdit() {
//         if (!this.selectedEvent) return;
//         const parseTime = (s: string): Date | null => {
//             if (!s) return null;
//             const d = new Date(s);
//             return isNaN(d.getTime()) ? null : d;
//         };
//         this.editEvent = {
//             name: this.selectedEvent.title,
//             description: this.selectedEvent.extendedProps?.description || '',
//             color: this.selectedEvent.backgroundColor || '#3B82F6',
//             recurrence: this.selectedEvent.extendedProps?.recurrence || 'none',
//             startDate: this.selectedEvent.startStr,
//             endDate: this.selectedEvent.endStr || '',
//             startTime: parseTime(this.selectedEvent.startStr),
//             endTime: parseTime(this.selectedEvent.endStr)
//         };
//         this.showDetailDialog = false;
//         this.showEditDialog = true;
//         this.cdr.detectChanges();
//     }

//     onUpdate() {
//         if (!this.editEvent.name || !this.selectedEvent) return;
//         this.loading = true;
//         this.calendarService
//             .updateEvent(this.selectedCalendarId, this.selectedEvent.id, {
//                 name: this.editEvent.name,
//                 description: this.editEvent.description,
//                 startDate: `${this.editEvent.startDate.slice(0, 10)}T${this.helpers.toTimeStr(this.editEvent.startTime)}:00`,
//                 endDate: `${this.editEvent.startDate.slice(0, 10)}T${this.helpers.toTimeStr(this.editEvent.endTime)}:00`,
//                 color: this.editEvent.color,
//                 recurrence: this.editEvent.recurrence
//             })
//             .subscribe({
//                 next: () => {
//                     this.showEditDialog = false;
//                     this.loading = false;
//                     this.helpers.notifySuccess('Event Updated');
//                     this.loadEvents();
//                     this.cdr.detectChanges();
//                 },
//                 error: () => {
//                     this.loading = false;
//                     this.helpers.notifyError('Failed', 'Could not update event');
//                 }
//             });
//     }

//     onDelete() {
//         if (!this.selectedEvent) return;
//         this.confirmationService.confirm({
//             message: `Delete "${this.selectedEvent.title}"?`,
//             header: 'Confirm Delete',
//             icon: 'pi pi-exclamation-triangle',
//             acceptButtonProps: { label: 'Delete', severity: 'danger' },
//             rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
//             accept: () => {
//                 this.calendarService.deleteEvent(this.selectedCalendarId, this.selectedEvent.id).subscribe({
//                     next: () => {
//                         this.showDetailDialog = false;
//                         this.helpers.notifySuccess('Event Deleted');
//                         this.loadEvents();
//                         this.cdr.detectChanges();
//                     },
//                     error: () => {
//                         this.helpers.notifyError('Failed', 'Could not delete event');
//                     }
//                 });
//             }
//         });
//     }

//     saveEventDrop(arg: any) {
//         this.calendarService
//             .updateEvent(this.selectedCalendarId, arg.event.id, {
//                 name: arg.event.title,
//                 description: arg.event.extendedProps?.description || '',
//                 startDate: arg.event.startStr,
//                 endDate: arg.event.endStr || '',
//                 color: arg.event.backgroundColor || '#3B82F6',
//                 recurrence: arg.event.extendedProps?.recurrence || 'none'
//             })
//             .subscribe({ error: () => arg.revert() });
//     }

//     // Re-sync: delete all duty shifts in batches then recreate in batches
//     resyncDutySchedule() {
//         if (!this.selectedCalendarId) return;
//         const cal = this.calendarList.find((c) => c.calendarId === this.selectedCalendarId);
//         const doctor = this.cachedDoctors.find((d) => cal && d.name === cal.name);

//         if (!doctor?.dutyDays?.length || !doctor.dutyStart || !doctor.dutyEnd) {
//             this.helpers.notifyWarning('No duty schedule found for this doctor');
//             return;
//         }

//         this.resyncing = true;
//         this.calendarService.getEvents(this.selectedCalendarId).subscribe({
//             next: (events) => {
//                 const dutyIds = events.filter((e) => e.description?.includes('DUTY_SHIFT')).map((e) => e.eventId);

//                 this.deleteInBatches(dutyIds, 0, () => {
//                     const creates = this.buildDutyEvents(doctor);
//                     if (!creates.length) {
//                         this.resyncing = false;
//                         this.helpers.notifyWarning('No duty days to sync');
//                         return;
//                     }
//                     this.createInBatches(this.selectedCalendarId, creates, 0, () => {
//                         this.resyncing = false;
//                         this.helpers.notifySuccess('Duty schedule synced');
//                         setTimeout(() => this.loadEvents(), 300);
//                         this.cdr.detectChanges();
//                     });
//                 });
//             },
//             error: () => {
//                 this.resyncing = false;
//                 this.helpers.notifyError('Failed', 'Could not resync');
//             }
//         });
//     }

//     // Build events from 1st of current month → 3 months forward
//     private buildDutyEvents(doctor: Doctor): any[] {
//         const events: any[] = [];
//         const from = new Date();
//         from.setDate(1);
//         from.setHours(0, 0, 0, 0);
//         const to = new Date(from);
//         to.setMonth(to.getMonth() + 3);
//         const cursor = new Date(from);

//         while (cursor <= to) {
//             const dayNum = cursor.getDay();
//             const dayName = Object.keys(this.dayNameToNumber).find((k) => this.dayNameToNumber[k] === dayNum);
//             if (dayName && doctor.dutyDays!.includes(dayName)) {
//                 const d = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
//                 events.push({ name: `${doctor.name} - Duty Shift`, description: 'DUTY_SHIFT', startDate: `${d}T${doctor.dutyStart}:00`, endDate: `${d}T${doctor.dutyEnd}:00`, color: '#10B981', recurrence: 'none' });
//             }
//             cursor.setDate(cursor.getDate() + 1);
//         }
//         return events;
//     }

//     // Create events in batches of 5 with 300ms between batches
//     private createInBatches(calendarId: string, events: any[], index: number, onComplete?: () => void) {
//         const batch = events.slice(index, index + 5);
//         if (!batch.length) {
//             onComplete?.();
//             return;
//         }
//         forkJoin(batch.map((e) => this.calendarService.createEvent(calendarId, e).pipe(catchError(() => of(null))))).subscribe(() => {
//             setTimeout(() => this.createInBatches(calendarId, events, index + 5, onComplete), 300);
//         });
//     }

//     // Delete event IDs in batches of 5 with 300ms between batches
//     private deleteInBatches(ids: string[], index: number, onComplete?: () => void) {
//         const batch = ids.slice(index, index + 5);
//         if (!batch.length) {
//             onComplete?.();
//             return;
//         }
//         forkJoin(batch.map((id) => this.calendarService.deleteEvent(this.selectedCalendarId, id).pipe(catchError(() => of(null))))).subscribe(() => {
//             setTimeout(() => this.deleteInBatches(ids, index + 5, onComplete), 300);
//         });
//     }
// }

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

import { HospitalCalendarService, HospitalCalendar } from '../../services/hospital-calendar.service';
import { DoctorsService, Doctor } from '@/services/doctors.service';
import { HelpersService } from '@/services/helpers-service';
import { AuthService } from '@/services/auth.service';

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

    private calendarService = inject(HospitalCalendarService);
    private doctorsService = inject(DoctorsService);
    private confirmationService = inject(ConfirmationService);
    private helpers = inject(HelpersService);
    private cdr = inject(ChangeDetectorRef);
    auth = inject(AuthService);

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

    ngOnInit() {
        if (this.auth.isAdmin) {
            this.syncDoctorCalendars();
        } else {
            this.loadDoctorOwnCalendar();
        }
    }

    // ── DOCTOR: Load only their own calendar ─────────────────────────────
    private loadDoctorOwnCalendar() {
        this.syncing = true;
        this.cdr.detectChanges();

        const doctorEmail = this.auth.current?.email?.toLowerCase().trim();
        if (!doctorEmail) {
            this.syncing = false;
            this.helpers.notifyError('Error', 'Could not determine your identity');
            return;
        }

        forkJoin({
            calendars: this.calendarService.getCalendars(),
            doctors: this.doctorsService.getDoctorsPage({ pageSize: 200 }).pipe(catchError(() => of({ data: [] })))
        }).subscribe(({ calendars, doctors }) => {
            this.cachedDoctors = (doctors as any).data || [];

            // Find this doctor's record by email
            const myDoctor = this.cachedDoctors.find((d) => d.email?.toLowerCase().trim() === doctorEmail);

            if (!myDoctor) {
                this.syncing = false;
                this.helpers.notifyWarning('No doctor profile found for your account');
                this.cdr.detectChanges();
                return;
            }

            // Find their calendar by name
            const myCal = calendars.find((c) => c.name === myDoctor.name);
            if (!myCal) {
                this.syncing = false;
                this.helpers.notifyWarning('No calendar found for your account');
                this.cdr.detectChanges();
                return;
            }

            // Only expose their own calendar — no dropdown needed
            this.calendarList = [myCal];
            this.selectedCalendarId = myCal.calendarId;
            this.syncing = false;

            setTimeout(() => this.initCalendar(), 0);
            this.cdr.detectChanges();

            // Seed duty shifts if empty
            this.seedDutyShiftsIfEmpty([myDoctor], [myCal]);
        });
    }

    // ── ADMIN: Full sync of all doctor calendars ──────────────────────────
    syncDoctorCalendars() {
        this.syncing = true;
        this.cdr.detectChanges();

        forkJoin({
            calendars: this.calendarService.getCalendars(),
            doctors: this.doctorsService.getDoctorsPage({ pageSize: 200 }).pipe(catchError(() => of({ data: [] })))
        }).subscribe(({ calendars, doctors }) => {
            this.cachedDoctors = (doctors as any).data || [];

            const doctorNames = new Set(this.cachedDoctors.map((d) => d.name).filter(Boolean));
            const existingNames = new Set(calendars.map((c) => c.name));

            const missing = this.cachedDoctors.filter((d) => d.name && !existingNames.has(d.name));
            const orphaned = calendars.filter((c) => !doctorNames.has(c.name));

            const creates$ = missing.map((d) => this.calendarService.createCalendar(d.name, `Calendar for ${d.name}`).pipe(catchError(() => of(null))));
            const deletes$ = orphaned.map((c) => this.calendarService.deleteCalendar(c.calendarId).pipe(catchError(() => of(null))));
            const all$ = [...creates$, ...deletes$];

            const proceed = (updatedCalendars: HospitalCalendar[]) => {
                this.calendarList = updatedCalendars;
                this.syncing = false;
                this.selectFirst();
                this.seedDutyShiftsIfEmpty(this.cachedDoctors, updatedCalendars);
            };

            if (all$.length === 0) {
                proceed(calendars);
                return;
            }

            forkJoin(all$).subscribe(() => {
                this.calendarService.getCalendars().subscribe((updated) => proceed(updated));
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

    // Seed duty shifts on page load only if calendar has none yet
    private seedDutyShiftsIfEmpty(doctors: Doctor[], calendars: HospitalCalendar[]) {
        doctors.forEach((doctor) => {
            if (!doctor.dutyDays?.length || !doctor.dutyStart || !doctor.dutyEnd) return;
            const cal = calendars.find((c) => c.name === doctor.name);
            if (!cal) return;

            this.calendarService.getEvents(cal.calendarId).subscribe((existingEvents) => {
                if (existingEvents.some((e) => e.description?.includes('DUTY_SHIFT'))) {
                    if (this.selectedCalendarId === cal.calendarId) setTimeout(() => this.loadEvents(), 100);
                    return;
                }
                const creates = this.buildDutyEvents(doctor);
                if (!creates.length) return;

                this.createInBatches(cal.calendarId, creates, 0, () => {
                    if (this.selectedCalendarId === cal.calendarId) setTimeout(() => this.loadEvents(), 100);
                });
            });
        });
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
        setTimeout(() => this.loadEvents(), 100);
    }

    // On dropdown change (admin only — doctor has no dropdown)
    onCalendarChange() {
        if (!this.fcInstance) {
            setTimeout(() => this.initCalendar(), 0);
            return;
        }

        this.calendarService.getEvents(this.selectedCalendarId).subscribe((events) => {
            this.fcInstance!.removeAllEvents();
            events.forEach((e) =>
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

            if (events.some((e) => e.description?.includes('DUTY_SHIFT'))) return;

            const cal = this.calendarList.find((c) => c.calendarId === this.selectedCalendarId);
            const doctor = this.cachedDoctors.find((d) => cal && d.name === cal.name);
            if (!doctor?.dutyDays?.length || !doctor.dutyStart || !doctor.dutyEnd) return;

            const creates = this.buildDutyEvents(doctor);
            if (!creates.length) return;

            this.createInBatches(this.selectedCalendarId, creates, 0, () => {
                setTimeout(() => this.loadEvents(), 100);
            });
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
        const parseTime = (s: string): Date | null => {
            if (!s) return null;
            const d = new Date(s);
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

    // ── Re-sync (admin only) ──────────────────────────────────────────────
    resyncDutySchedule() {
        if (!this.selectedCalendarId) return;

        const localCal = this.calendarList.find((c) => c.calendarId === this.selectedCalendarId);
        if (!localCal) {
            this.helpers.notifyWarning('Calendar not found');
            return;
        }

        const doctor = this.cachedDoctors.find((d) => d.name === localCal.name);
        if (!doctor?.dutyDays?.length || !doctor.dutyStart || !doctor.dutyEnd) {
            this.helpers.notifyWarning('No duty schedule found for this doctor');
            return;
        }

        this.resyncing = true;
        const calName = localCal.name;

        this.calendarService.getCalendars().subscribe({
            next: (freshCalendars) => {
                const freshCal = freshCalendars.find((c) => c.name === calName);
                if (!freshCal) {
                    this.createCalendarAndSeedDutyShifts(calName, doctor!);
                    return;
                }
                this.deleteAndRecreateCalendar(freshCal.calendarId, calName, doctor!);
            },
            error: () => {
                this.resyncing = false;
                this.helpers.notifyError('Failed', 'Could not fetch calendars');
            }
        });
    }

    private deleteAndRecreateCalendar(calendarId: string, calName: string, doctor: Doctor) {
        this.calendarService.deleteCalendar(calendarId).subscribe({
            next: () => {
                this.calendarService.createCalendar(calName, `Calendar for ${calName}`).subscribe({
                    next: (newCal) => {
                        const newCalId = newCal.calendarId;
                        this.calendarList = this.calendarList.map((c) => (c.name === calName ? { ...c, calendarId: newCalId } : c));
                        this.selectedCalendarId = newCalId;
                        this.fcInstance?.removeAllEvents();

                        const creates = this.buildDutyEvents(doctor!);
                        if (!creates.length) {
                            this.resyncing = false;
                            this.helpers.notifyWarning('No duty days to sync');
                            return;
                        }

                        this.createInBatches(newCalId, creates, 0, () => {
                            this.resyncing = false;
                            this.helpers.notifySuccess('Duty schedule synced');
                            setTimeout(() => this.loadEvents(), 300);
                            this.cdr.detectChanges();
                        });
                    },
                    error: () => {
                        this.resyncing = false;
                        this.helpers.notifyError('Failed', 'Could not recreate calendar');
                    }
                });
            },
            error: () => {
                this.resyncing = false;
                this.helpers.notifyError('Failed', 'Could not delete calendar');
            }
        });
    }

    private createCalendarAndSeedDutyShifts(calName: string, doctor: Doctor) {
        this.calendarService.createCalendar(calName, `Calendar for ${calName}`).subscribe({
            next: (newCal) => {
                const newCalId = newCal.calendarId;
                this.calendarList = this.calendarList.map((c) => (c.name === calName ? { ...c, calendarId: newCalId } : c));
                this.selectedCalendarId = newCalId;
                this.fcInstance?.removeAllEvents();

                const creates = this.buildDutyEvents(doctor);
                if (!creates.length) {
                    this.resyncing = false;
                    this.helpers.notifyWarning('No duty days to sync');
                    return;
                }

                this.createInBatches(newCalId, creates, 0, () => {
                    this.resyncing = false;
                    this.helpers.notifySuccess('Duty schedule synced');
                    setTimeout(() => this.loadEvents(), 300);
                    this.cdr.detectChanges();
                });
            },
            error: () => {
                this.resyncing = false;
                this.helpers.notifyError('Failed', 'Could not create calendar');
            }
        });
    }

    private buildDutyEvents(doctor: Doctor): any[] {
        const events: any[] = [];
        const from = new Date();
        from.setDate(1);
        from.setHours(0, 0, 0, 0);
        const to = new Date(from);
        to.setMonth(to.getMonth() + 3);
        const cursor = new Date(from);

        while (cursor <= to) {
            const dayNum = cursor.getDay();
            const dayName = Object.keys(this.dayNameToNumber).find((k) => this.dayNameToNumber[k] === dayNum);
            if (dayName && doctor.dutyDays!.includes(dayName)) {
                const d = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
                events.push({
                    name: `${doctor.name} - Duty Shift`,
                    description: 'DUTY_SHIFT',
                    startDate: `${d}T${doctor.dutyStart}:00`,
                    endDate: `${d}T${doctor.dutyEnd}:00`,
                    color: '#10B981',
                    recurrence: 'none'
                });
            }
            cursor.setDate(cursor.getDate() + 1);
        }
        return events;
    }

    private createInBatches(calendarId: string, events: any[], index: number, onComplete?: () => void) {
        const batch = events.slice(index, index + 5);
        if (!batch.length) {
            onComplete?.();
            return;
        }
        forkJoin(batch.map((e) => this.calendarService.createEvent(calendarId, e).pipe(catchError(() => of(null))))).subscribe(() => {
            setTimeout(() => this.createInBatches(calendarId, events, index + 5, onComplete), 300);
        });
    }
}

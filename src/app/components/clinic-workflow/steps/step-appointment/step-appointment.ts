import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { MessageService } from 'primeng/api';
import { WorkflowStateService } from '../../workflow-state.service';
import { AppointmentService, HmsAppointment, CreateAppointmentRequest } from '@/pages/service/hms/appointment.service';
import { AuthService } from '@/pages/service/auth.service';

@Component({
    selector: 'app-step-appointment',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [MessageService],
    imports: [
        CommonModule, FormsModule,
        TableModule, ButtonModule, InputTextModule, TextareaModule, SelectModule,
        DatePickerModule, TagModule, ToastModule, SkeletonModule, CardModule, DividerModule
    ],
    template: `
        <p-toast></p-toast>
        <div class="flex flex-col gap-6">
            <div class="card">
                <h2 class="text-xl font-semibold mb-4">Existing Appointments</h2>
                @if (loading()) {
                    <p-skeleton width="100%" height="4rem"></p-skeleton>
                } @else {
                    <p-table [value]="appointments()" dataKey="appointmentId" styleClass="p-datatable-sm" [rows]="5" [paginator]="true">
                        <ng-template pTemplate="header">
                            <tr><th>Date</th><th>Type</th><th>Status</th><th>Doctor</th><th></th></tr>
                        </ng-template>
                        <ng-template pTemplate="body" let-a>
                            <tr>
                                <td>{{ a.date || "--" }}</td>
                                <td>{{ a.type || "--" }}</td>
                                <td><p-tag [value]="a.status || 'unknown'" [severity]="apptSeverity(a.status)"></p-tag></td>
                                <td>{{ a.doctorName || "--" }}</td>
                                <td><p-button label="Use This" size="small" (onClick)="useAppointment(a)"></p-button></td>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="emptymessage"><tr><td colspan="5" class="text-center py-6 text-surface-400">No appointments found for this patient.</td></tr></ng-template>
                    </p-table>
                }
            </div>
            <div class="card">
                <div class="flex items-center gap-2 mb-4 cursor-pointer" (click)="showForm.set(!showForm())">
                    <i class="pi pi-plus-circle text-primary"></i>
                    <h3 class="text-lg font-semibold m-0">Create New Appointment</h3>
                    <i [class]="showForm() ? 'pi pi-chevron-up ml-auto' : 'pi pi-chevron-down ml-auto'"></i>
                </div>
                @if (showForm()) {
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="flex flex-col gap-1"><label class="text-sm font-medium">Date *</label><p-date-picker [(ngModel)]="apptDate" placeholder="Select date" dateFormat="yy-mm-dd" styleClass="w-full" (onSelect)="onDateSelect($event)"></p-date-picker></div>
                        <div class="flex flex-col gap-1"><label class="text-sm font-medium">Start Time (HH:mm) *</label><input pInputText [(ngModel)]="form.startTime" placeholder="09:00" /></div>
                        <div class="flex flex-col gap-1"><label class="text-sm font-medium">End Time (HH:mm)</label><input pInputText [(ngModel)]="form.endTime" placeholder="10:00" /></div>
                        <div class="flex flex-col gap-1"><label class="text-sm font-medium">Type</label><p-select [(ngModel)]="form.type" [options]="typeOptions" placeholder="Select type" styleClass="w-full"></p-select></div>
                        <div class="flex flex-col gap-1 md:col-span-2"><label class="text-sm font-medium">Reason</label><input pInputText [(ngModel)]="form.reason" placeholder="Reason for appointment" /></div>
                        <div class="flex flex-col gap-1 md:col-span-2"><label class="text-sm font-medium">Notes</label><textarea pTextarea [(ngModel)]="form.notes" rows="3" class="w-full" placeholder="Additional notes"></textarea></div>
                    </div>
                    <div class="flex justify-end mt-4"><p-button label="Create Appointment" icon="pi pi-check" [loading]="saving()" [disabled]="!form.startTime || !apptDate" (onClick)="save()"></p-button></div>
                }
            </div>
            @if (state.appointment()) {
                <div class="card border-l-4 border-green-500">
                    <div class="flex items-center gap-2 mb-2"><i class="pi pi-calendar-check text-green-500"></i><span class="font-semibold">Appointment Selected</span><p-tag value="Ready" severity="success" styleClass="ml-auto"></p-tag></div>
                    <p class="m-0">{{ state.appointment()!.date }} - {{ state.appointment()!.type }} ({{ state.appointment()!.status }})</p>
                </div>
            }
            <div class="flex justify-between">
                <p-button label="Back" icon="pi pi-arrow-left" severity="secondary" (onClick)="back.emit()"></p-button>
                <p-button label="Next: Consultation" icon="pi pi-arrow-right" iconPos="right" [disabled]="!state.appointment()" (onClick)="next.emit()"></p-button>
            </div>
        </div>
    `
})
export class StepAppointmentComponent implements OnInit {
    @Output() next = new EventEmitter<void>();
    @Output() back = new EventEmitter<void>();
    state = inject(WorkflowStateService);
    private appointmentService = inject(AppointmentService);
    private auth = inject(AuthService);
    private messageService = inject(MessageService);
    loading = signal(true);
    saving = signal(false);
    showForm = signal(false);
    appointments = signal<HmsAppointment[]>([]);
    apptDate: Date | null = null;
    form: Partial<CreateAppointmentRequest> = {};
    typeOptions = ["consultation","follow-up","emergency","routine","procedure"];
    ngOnInit(): void {
        const pid = this.state.patient()?.patientId;
        if (!pid) return;
        this.appointmentService.getAll(pid).pipe(catchError(() => of([]))).subscribe(list => {
            this.appointments.set(list);
            this.loading.set(false);
        });
    }
    onDateSelect(date: Date): void {
        this.form.date = date.toISOString().split("T")[0];
    }
    useAppointment(a: HmsAppointment): void {
        this.state.appointment.set(a);
        this.messageService.add({ severity: "success", summary: "Appointment Selected", detail: "Appointment from " + a.date + " selected." });
    }
    save(): void {
        const patient = this.state.patient();
        if (!patient || !this.form.startTime || !this.form.date) return;
        this.saving.set(true);
        const payload: CreateAppointmentRequest = { patientId: patient.patientId, doctorName: this.auth.current.name, doctorEmail: this.auth.current.email, ...this.form };
        this.appointmentService.create(payload)
            .pipe(catchError(err => { this.messageService.add({ severity: "error", summary: "Error", detail: err.message }); this.saving.set(false); return of(null); }))
            .subscribe(appt => {
                this.saving.set(false);
                if (appt) {
                    this.state.appointment.set(appt);
                    this.appointments.update(list => [appt, ...list]);
                    this.showForm.set(false);
                    this.form = {};
                    this.apptDate = null;
                    this.messageService.add({ severity: "success", summary: "Appointment Created", detail: "Appointment scheduled for " + appt.date });
                }
            });
    }
    apptSeverity(status?: string): "success" | "warn" | "danger" | "info" | "secondary" {
        const m: Record<string,"success"|"warn"|"danger"|"info"|"secondary"> = { confirmed: "success", pending: "warn", cancelled: "danger", completed: "info" };
        return m[(status || "").toLowerCase()] || "secondary";
    }
}
import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { DividerModule } from 'primeng/divider';
import { MessageService } from 'primeng/api';
import { WorkflowStateService } from '../../workflow-state.service';
import { PatientService, HmsPatient, CreatePatientRequest } from '@/pages/service/hms/patient.service';
@Component({
    selector: `app-step-patient`,
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [MessageService],
    imports: [
        CommonModule, FormsModule,
        AutoCompleteModule, ButtonModule, InputTextModule, SelectModule,
        DatePickerModule, CardModule, TagModule, ToastModule, SkeletonModule, DividerModule
    ],
    template: `
        <p-toast></p-toast>
        <div class="flex flex-col gap-6">
            <div class="card">
                <h2 class="text-xl font-semibold mb-4">Select Existing Patient</h2>
                <p-autocomplete [(ngModel)]="searchValue" [suggestions]="filteredPatients()" field="name" placeholder="Search by name or email..." [dropdown]="true" styleClass="w-full" (completeMethod)="filterPatients($event)" (onSelect)="selectPatient($event.value)">
                    <ng-template let-p pTemplate="item"><div class="flex flex-col"><span class="font-medium">{{ p.name }}</span><span class="text-sm text-surface-500">{{ p.email }} - {{ p.phone }}</span></div></ng-template>
                </p-autocomplete>
                @if (loading()) { <p-skeleton width="100%" height="3rem" styleClass="mt-3"></p-skeleton> }
            </div>
            @if (state.patient()) {
                <div class="card border-l-4 border-primary">
                    <div class="flex items-center gap-3 mb-3">
                        <i class="pi pi-user text-2xl text-primary"></i>
                        <h3 class="text-lg font-semibold m-0">Selected Patient</h3>
                        <p-tag value="Selected" severity="success" styleClass="ml-auto"></p-tag>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div><span class="text-surface-500 text-sm">Name</span><p class="font-medium m-0">{{ state.patient()!.name }}</p></div>
                        <div><span class="text-surface-500 text-sm">Email</span><p class="font-medium m-0">{{ state.patient()!.email || "--" }}</p></div>
                        <div><span class="text-surface-500 text-sm">Phone</span><p class="font-medium m-0">{{ state.patient()!.phone || "--" }}</p></div>
                        <div><span class="text-surface-500 text-sm">Gender</span><p class="font-medium m-0">{{ state.patient()!.gender || "--" }}</p></div>
                        <div><span class="text-surface-500 text-sm">Date of Birth</span><p class="font-medium m-0">{{ state.patient()!.dob || "--" }}</p></div>
                        <div><span class="text-surface-500 text-sm">Blood Group</span><p class="font-medium m-0">{{ state.patient()!.bloodGroup || "--" }}</p></div>
                    </div>
                </div>
            }
            <div class="card">
                <div class="flex items-center gap-2 mb-4 cursor-pointer" (click)="showForm.set(!showForm())">
                    <i class="pi pi-plus-circle text-primary"></i>
                    <h3 class="text-lg font-semibold m-0">Register New Patient</h3>
                    <i [class]="showForm() ? 'pi pi-chevron-up ml-auto' : 'pi pi-chevron-down ml-auto'"></i>
                </div>
                @if (showForm()) {
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="flex flex-col gap-1"><label class="text-sm font-medium">Name *</label><input pInputText [(ngModel)]="newPatient.name" placeholder="Full name" /></div>
                        <div class="flex flex-col gap-1"><label class="text-sm font-medium">Email</label><input pInputText [(ngModel)]="newPatient.email" placeholder="Email address" /></div>
                        <div class="flex flex-col gap-1"><label class="text-sm font-medium">Phone</label><input pInputText [(ngModel)]="newPatient.phone" placeholder="Phone number" /></div>
                        <div class="flex flex-col gap-1"><label class="text-sm font-medium">Gender</label><p-select [(ngModel)]="newPatient.gender" [options]="genderOptions" optionLabel="label" optionValue="value" placeholder="Select gender" styleClass="w-full"></p-select></div>
                        <div class="flex flex-col gap-1"><label class="text-sm font-medium">Date of Birth</label><p-date-picker [(ngModel)]="dobDate" placeholder="Select date" dateFormat="yy-mm-dd" styleClass="w-full" (onSelect)="onDobSelect($event)"></p-date-picker></div>
                        <div class="flex flex-col gap-1"><label class="text-sm font-medium">Blood Group</label><p-select [(ngModel)]="newPatient.bloodGroup" [options]="bloodGroupOptions" placeholder="Select blood group" styleClass="w-full"></p-select></div>
                        <div class="flex flex-col gap-1"><label class="text-sm font-medium">Status</label><p-select [(ngModel)]="newPatient.status" [options]="statusOptions" optionLabel="label" optionValue="value" placeholder="Select status" styleClass="w-full"></p-select></div>
                    </div>
                    <div class="flex justify-end mt-4"><p-button label="Register Patient" icon="pi pi-check" [loading]="saving()" [disabled]="!newPatient.name" (onClick)="saveNewPatient()"></p-button></div>
                }
            </div>
            <div class="flex justify-end">
                <p-button label="Next: Appointment" icon="pi pi-arrow-right" iconPos="right" [disabled]="!state.patient()" (onClick)="next.emit()"></p-button>
            </div>
        </div>
    `
})
export class StepPatientComponent implements OnInit {
    @Output() next = new EventEmitter<void>();
    state = inject(WorkflowStateService);
    private patientService = inject(PatientService);
    private messageService = inject(MessageService);
    loading = signal(true);
    saving = signal(false);
    showForm = signal(false);
    allPatients = signal<HmsPatient[]>([]);
    filteredPatients = signal<HmsPatient[]>([]);
    searchValue: HmsPatient | string | null = null;
    newPatient: Partial<CreatePatientRequest> = { name: '', status: 'active' };
    dobDate: Date | null = null;
    genderOptions = [{ label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }, { label: 'Other', value: 'other' }];
    bloodGroupOptions = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
    statusOptions = [{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }];
    ngOnInit(): void {
        this.patientService.getAll().pipe(catchError(() => of([]))).subscribe(list => {
            this.allPatients.set(list);
            this.loading.set(false);
        });
    }
    filterPatients(event: { query: string }): void {
        const q = event.query.toLowerCase();
        this.filteredPatients.set(this.allPatients().filter(p =>
            (p.name || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q)
        ));
    }
    selectPatient(patient: HmsPatient): void { this.state.patient.set(patient); }
    onDobSelect(date: Date): void { this.newPatient.dob = date.toISOString().split('T')[0]; }
    saveNewPatient(): void {
        if (!this.newPatient.name) return;
        this.saving.set(true);
        this.patientService.create(this.newPatient as CreatePatientRequest)
            .pipe(catchError(err => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
                this.saving.set(false);
                return of(null);
            }))
            .subscribe(patient => {
                this.saving.set(false);
                if (patient) {
                    this.state.patient.set(patient);
                    this.allPatients.update(list => [patient, ...list]);
                    this.showForm.set(false);
                    this.newPatient = { name: '', status: 'active' };
                    this.dobDate = null;
                    this.messageService.add({ severity: 'success', summary: 'Registered', detail: patient.name + ' registered successfully.' });
                }
            });
    }
}
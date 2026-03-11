import { Component, OnInit, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { InputMaskModule } from 'primeng/inputmask';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TextareaModule } from 'primeng/textarea';
import { DialogModule } from 'primeng/dialog';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';
import { PatientsService, CreateUpdatePatientRequest, Patient } from '@/pages/service/patients.service';
import { HelpersService } from '@/pages/service/helpers-service';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputNumberModule } from 'primeng/inputnumber';
import { Fluid } from 'primeng/fluid';

@Component({
    selector: 'app-edit-patient',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        CardModule,
        InputTextModule,
        DatePickerModule,
        AutoCompleteModule,
        InputMaskModule,
        ButtonModule,
        ToastModule,
        FloatLabelModule,
        TextareaModule,
        DialogModule,
        MultiSelectModule,
        InputNumberModule,
        Fluid
    ],
    providers: [HelpersService, MessageService],
    template: `
        <div class="patient-form-container">
            <p-card>
                <ng-template pTemplate="header">
                    <div class="header flex items-center justify-between px-6 py-4">
                        <div class="flex items-center gap-3">
                            <i class="pi pi-user-edit text-primary" style="font-size: 2rem;"></i>
                            <h3 class="text-xl font-semibold m-0">Edit Patient</h3>
                        </div>
                        <p-button icon="pi pi-times" text severity="secondary" pTooltip="Close" (click)="ref.close()"></p-button>
                    </div>
                </ng-template>

                <form [formGroup]="form" (ngSubmit)="submit()" class="form-content" autocomplete="off">
                    <!-- Personal Information -->
                    <div class="mb-6">
                        <h4 class="devider text-lg font-semibold mb-4 text-gray-700 border-b pb-2">Personal Information</h4>

                        <div class="mb-4">
                            <p-floatLabel variant="on">
                                <input pInputText id="name" formControlName="name" autocomplete="off" [class.p-invalid]="invalid('name')" class="w-full" />
                                <label for="name"><i class="pi pi-user"></i> Full Name</label>
                            </p-floatLabel>
                            <small class="p-error" *ngIf="invalid('name')">Valid name is required</small>
                        </div>

                        <div class="mb-4">
                            <p-floatLabel variant="on">
                                <input pInputText id="email" type="email" formControlName="email" autocomplete="off" class="w-full" [class.p-invalid]="invalid('email')" />
                                <label for="email"><i class="pi pi-envelope"></i> Email Address</label>
                            </p-floatLabel>
                            <small class="p-error" *ngIf="invalid('email')">Valid email is required</small>
                        </div>

                        <p-fluid class="flex flex-wrap gap-4 mb-6">
                            <div class="flex-1 md:flex-[2]">
                                <p-floatLabel variant="on">
                                    <p-inputMask inputId="qid" formControlName="qid" mask="99999999999" [unmask]="true" [slotChar]="' '" inputmode="numeric" styleClass="w-full"></p-inputMask>
                                    <label for="qid"><i class="pi pi-id-card"></i> Qatar ID</label>
                                </p-floatLabel>
                            </div>
                            <div class="flex-1 md:flex-[1.5]">
                                <p-floatLabel variant="on">
                                    <p-inputMask inputId="phone" formControlName="phone" mask="+999 9999 9999" styleClass="w-full"></p-inputMask>
                                    <label for="phone"><i class="pi pi-phone"></i> Phone Number</label>
                                </p-floatLabel>
                            </div>
                            <div class="flex-1 md:flex-[1.5]">
                                <p-floatLabel variant="on">
                                    <p-autoComplete
                                        inputId="gender"
                                        formControlName="gender"
                                        [suggestions]="filteredGenderOptions"
                                        (completeMethod)="filterGender($event)"
                                        field="label"
                                        [optionValue]="'value'"
                                        [forceSelection]="true"
                                        [dropdown]="true"
                                        [readonly]="true"
                                        styleClass="w-full"
                                        autocomplete="off"
                                    >
                                        <ng-template pTemplate="item" let-option>
                                            <div class="flex items-center gap-2">
                                                <i class="pi" [class]="getGenderIcon(option.value)"></i>
                                                <span>{{ option.label }}</span>
                                            </div>
                                        </ng-template>
                                    </p-autoComplete>
                                    <label for="gender"><i class="pi pi-venus-mars"></i> Gender</label>
                                </p-floatLabel>
                            </div>
                        </p-fluid>

                        <p-fluid class="flex flex-wrap gap-4 mb-6">
                            <div class="flex-1 md:flex-[1.5]">
                                <p-floatLabel variant="on">
                                    <p-datepicker inputId="dob" formControlName="dob" [showIcon]="true" dateFormat="dd/MM/yy" [maxDate]="today" [showOnFocus]="false" [readonlyInput]="true" class="w-full"></p-datepicker>
                                    <label for="dob"><i class="pi pi-calendar"></i> Date of Birth</label>
                                </p-floatLabel>
                            </div>
                            <div class="flex-1 md:flex-[1.5]">
                                <p-floatLabel variant="on">
                                    <p-datepicker inputId="admissionDate" formControlName="admissionDate" [showIcon]="true" dateFormat="dd/MM/yy" [maxDate]="today" [showOnFocus]="false" [readonlyInput]="true" class="w-full"></p-datepicker>
                                    <label for="admissionDate"><i class="pi pi-calendar"></i> Admission Date</label>
                                </p-floatLabel>
                            </div>
                            <div class="flex-1 md:flex-[2]">
                                <p-floatLabel variant="on">
                                    <input pInputText id="insurance" formControlName="insurance" autocomplete="off" class="w-full" />
                                    <label for="insurance"><i class="pi pi-shield"></i> Insurance</label>
                                </p-floatLabel>
                            </div>
                        </p-fluid>
                    </div>

                    <!-- Medical Information -->
                    <div class="mb-6">
                        <h4 class="devider text-lg font-semibold mb-4 text-gray-700 border-b pb-2">Medical Information</h4>

                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                            <div>
                                <p-floatLabel variant="on">
                                    <input pInputText id="department" formControlName="department" autocomplete="off" class="w-full" />
                                    <label for="department"><i class="pi pi-sitemap"></i> Department</label>
                                </p-floatLabel>
                            </div>
                            <div>
                                <p-floatLabel variant="on">
                                    <input pInputText id="specialization" formControlName="specialization" autocomplete="off" class="w-full" />
                                    <label for="specialization"><i class="pi pi-sparkles"></i> Specialization</label>
                                </p-floatLabel>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <p-floatLabel variant="on">
                                    <p-autoComplete
                                        inputId="status"
                                        formControlName="status"
                                        [suggestions]="filteredStatusOptions"
                                        (completeMethod)="filterStatus($event)"
                                        [forceSelection]="true"
                                        [dropdown]="true"
                                        [readonly]="true"
                                        styleClass="w-full"
                                        autocomplete="off"
                                    >
                                        <ng-template pTemplate="item" let-option>
                                            <span>{{ option }}</span>
                                        </ng-template>
                                    </p-autoComplete>
                                    <label for="status"><i class="pi pi-badge"></i> Status</label>
                                </p-floatLabel>
                            </div>
                            <div>
                                <p-floatLabel variant="on">
                                    <input pInputText id="bedNumber" formControlName="bedNumber" autocomplete="off" class="w-full" />
                                    <label for="bedNumber"><i class="pi pi-home"></i> Bed Number</label>
                                </p-floatLabel>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <p-floatLabel variant="on">
                                    <input pInputText id="ward" formControlName="ward" autocomplete="off" class="w-full" />
                                    <label for="ward"><i class="pi pi-building"></i> Ward</label>
                                </p-floatLabel>
                            </div>
                        </div>
                    </div>

                    <!-- Health Details -->
                    <div class="mb-6">
                        <h4 class="devider text-lg font-semibold mb-4 text-gray-700 border-b pb-2">Health Details</h4>

                        <div class="mb-4">
                            <p-floatLabel variant="on">
                                <p-autoComplete
                                    inputId="bloodGroup"
                                    formControlName="bloodGroup"
                                    [suggestions]="filteredBloodGroupOptions"
                                    (completeMethod)="filterBloodGroup($event)"
                                    [forceSelection]="true"
                                    [dropdown]="true"
                                    [readonly]="true"
                                    styleClass="w-full"
                                    autocomplete="off"
                                >
                                    <ng-template pTemplate="item" let-option>
                                        <span>{{ option }}</span>
                                    </ng-template>
                                </p-autoComplete>
                                <label for="bloodGroup"><i class="pi pi-heart"></i> Blood Group</label>
                            </p-floatLabel>
                        </div>

                        <div class="mb-4">
                            <p-floatLabel variant="on">
                                <textarea pTextarea id="medicalHistory" formControlName="medicalHistory" autocomplete="off" class="w-full" rows="3"></textarea>
                                <label for="medicalHistory"><i class="pi pi-file-edit"></i> Medical History</label>
                            </p-floatLabel>
                        </div>

                        <div class="mb-4">
                            <label class="block text-sm font-medium mb-2" style="color:#9CA3AF"> <i class="pi pi-exclamation-triangle mr-1" style="color:#EF4444"></i> Allergies </label>
                            <p-autoComplete formControlName="allergies" [multiple]="true" [typeahead]="false" [addOnBlur]="true" placeholder="Type and press Enter" styleClass="w-full" />
                            <small style="color:#9CA3AF">Type each allergy and press Enter to add</small>
                        </div>

                        <div class="mb-4">
                            <label class="block text-sm font-medium mb-2" style="color:#9CA3AF"> <i class="pi pi-plus-circle mr-1" style="color:#3B82F6"></i> Current Medications </label>
                            <p-autoComplete formControlName="medications" [multiple]="true" [typeahead]="false" [addOnBlur]="true" placeholder="Type and press Enter" styleClass="w-full" />
                            <small style="color:#9CA3AF">Type each medication and press Enter to add</small>
                        </div>
                    </div>

                    <!-- Notes -->
                    <div class="mb-6">
                        <h4 class="devider text-lg font-semibold mb-4 text-gray-700 border-b pb-2">Notes</h4>
                        <div class="mb-4">
                            <p-floatLabel variant="on">
                                <input pInputText id="notes" formControlName="notes" autocomplete="off" class="w-full" />
                                <label for="notes"><i class="pi pi-file-edit"></i> Write your notes here...</label>
                            </p-floatLabel>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="devider flex justify-end gap-3 pt-4">
                        <p-button type="button" label="Close" icon="pi pi-times" severity="secondary" (click)="ref.close()"></p-button>
                        <p-button type="submit" label="Save Changes" icon="pi pi-save" [loading]="isSubmitting"></p-button>
                    </div>
                </form>
            </p-card>
        </div>
    `,
    styles: [
        `
            .devider {
                color: #10b981;
            }
            .header {
                background: var(--p-primary-50);
            }
        `
    ]
})
export class EditPatient implements OnInit, AfterViewInit, OnDestroy {
    private messageService = inject(MessageService);

    form: FormGroup;
    today = new Date();
    isSubmitting = false;
    patient: Patient | null = null;

    genderOptions = [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' },
        { label: 'Non-binary', value: 'non-binary' },
        { label: 'Prefer not to say', value: 'prefer-not-to-say' }
    ];
    filteredGenderOptions: any[] = [];
    statusOptions: string[] = ['admitted', 'stable', 'under treatment', 'discharged', 'critical', 'dead'];
    filteredStatusOptions: string[] = [];
    bloodGroupOptions: string[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    filteredBloodGroupOptions: string[] = [];

    constructor(
        private fb: FormBuilder,
        private helpersService: HelpersService,
        private patientService: PatientsService,
        public ref: DynamicDialogRef,
        private config: DynamicDialogConfig
    ) {
        this.form = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(3)]],
            email: ['', [Validators.email]],
            dob: [null],
            gender: [''],
            phone: [''],
            qid: [''],
            insurance: [''],
            admissionDate: [null],
            department: [''],
            specialization: [''],
            status: [''],
            bedNumber: [''],
            ward: [''],
            medicalHistory: [''],
            allergies: [[]],
            medications: [[]],
            notes: [''],
            bloodGroup: ['']
        });
    }

    ngOnInit() {
        this.patient = this.config.data?.patient as Patient;
        if (this.patient) {
            this.populateForm(this.patient);
        }
    }

    ngAfterViewInit() {
        setTimeout(() => {
            const el = document.activeElement as HTMLElement | null;
            if (el && typeof el.blur === 'function') el.blur();
        }, 0);
    }

    ngOnDestroy() {}

    private populateForm(p: Patient) {
        // parse gender object back to value string
        const genderVal = this.genderOptions.find((g) => g.value === p.gender) || p.gender || '';

        this.form.patchValue({
            name: p.name || '',
            email: p.email || '',
            dob: p.dob ? new Date(p.dob) : null,
            gender: genderVal,
            phone: p.phone || '',
            qid: p.qid || '',
            insurance: p.insurance || '',
            admissionDate: p.admissionDate ? new Date(p.admissionDate) : null,
            department: p.department || '',
            specialization: p.specialization || '',
            status: p.status || '',
            bedNumber: p.bedNumber || '',
            ward: p.ward || '',
            medicalHistory: p.medicalHistory || '',
            allergies: Array.isArray(p.allergies) ? p.allergies : p.allergies ? [p.allergies] : [],
            medications: Array.isArray(p.medications) ? p.medications : p.medications ? [p.medications] : [],
            notes: p.notes || '',
            bloodGroup: p.bloodGroup || ''
        });
    }

    filterGender(event: any): void {
        const q = String(event?.query || '').toLowerCase();
        this.filteredGenderOptions = this.genderOptions.filter((o) => o.label.toLowerCase().includes(q));
    }

    filterStatus(e: { query: string }) {
        const q = (e?.query || '').toLowerCase();
        this.filteredStatusOptions = this.statusOptions.filter((x) => x.toLowerCase().includes(q));
    }

    filterBloodGroup(e: { query: string }) {
        const q = (e?.query || '').toLowerCase();
        this.filteredBloodGroupOptions = this.bloodGroupOptions.filter((x) => x.toLowerCase().includes(q));
    }

    invalid(fieldName: string): boolean {
        const c = this.form.get(fieldName);
        if (!c || !(c.dirty || c.touched)) return false;
        return c.invalid;
    }

    getGenderIcon(gender: string): string {
        const map: Record<string, string> = {
            male: 'pi-mars',
            female: 'pi-venus',
            'non-binary': 'pi-circle',
            'prefer-not-to-say': 'pi-question-circle'
        };
        return map[gender] || 'pi-user';
    }

    sanitizePhone(x: any): string | undefined {
        if (typeof x !== 'string') return undefined;
        const s = x.trim();
        if (!s) return undefined;
        let sign = '';
        let body = s;
        if (body.startsWith('+')) {
            sign = '+';
            body = body.slice(1);
        }
        const digits = body.replace(/\D+/g, '');
        return digits ? sign + digits : undefined;
    }

    submit() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.helpersService.notifyError('Validation Error', 'Please fix the errors before saving');
            return;
        }

        if (!this.patient?.PK) {
            this.helpersService.notifyError('Error', 'Patient ID missing');
            return;
        }

        this.isSubmitting = true;
        const f = this.form.getRawValue();
        const lc = (x: any) => (typeof x === 'string' ? x.toLowerCase().trim() : (x ?? null));

        // extract gender value if it's an object
        const genderValue = typeof f.gender === 'object' && f.gender?.value ? f.gender.value : lc(f.gender);

        const patientId = this.patient.PK.includes('#') ? this.patient.PK.split('#')[1] : this.patient.PK;

        const payload: CreateUpdatePatientRequest = {
            name: lc(f.name) ?? '',
            email: lc(f.email) ?? '',
            dob: f.dob ? new Date(f.dob).toISOString().slice(0, 10) : '',
            gender: genderValue ?? '',
            phone: this.sanitizePhone(f.phone),
            qid: lc(f.qid),
            insurance: lc(f.insurance),
            admissionDate: f.admissionDate ? new Date(f.admissionDate).toISOString().slice(0, 10) : null,
            department: lc(f.department),
            specialization: lc(f.specialization),
            status: lc(f.status),
            bedNumber: f.bedNumber ? f.bedNumber.trim() : null,
            ward: f.ward ? f.ward.trim() : null,
            medicalHistory: f.medicalHistory ? f.medicalHistory.trim() : null,
            allergies: Array.isArray(f.allergies) ? f.allergies : [],
            medications: Array.isArray(f.medications) ? f.medications : [],
            notes: f.notes ? f.notes.trim() : null,
            bloodGroup: f.bloodGroup ? f.bloodGroup.trim() : null
        };

        this.patientService.updatePatient(patientId, payload).subscribe({
            next: (res: any) => {
                this.isSubmitting = false;
                this.helpersService.notifySuccess('Patient updated successfully');
                this.ref.close(res?.data ?? res);
            },
            error: (err) => {
                this.isSubmitting = false;
                this.helpersService.notifyError('Error', err?.error?.message || 'Failed to update patient');
            }
        });
    }
}

import { Component, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

// PrimeNG v20
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
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { FileUploadModule, FileSelectEvent } from 'primeng/fileupload';

import { PatientsService, CreateUpdatePatientRequest } from '@/pages/service/patients.service';
import { HelpersService } from '@/services/helpers-service';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputNumberModule } from 'primeng/inputnumber';
import { Fluid } from 'primeng/fluid';

@Component({
    selector: 'app-new-patient',
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
        FileUploadModule,
        MultiSelectModule,
        InputNumberModule,
        Fluid
    ],
    providers: [HelpersService],
    template: `
        <div class="patient-form-container">
            <p-card>
                <ng-template pTemplate="header">
                    <div class="header flex items-center justify-between px-6 py-4">
                        <div class="flex items-center gap-3">
                            <i class="pi pi-user-plus text-6xl text-primary" style="font-size: 2rem;"></i>
                            <h3 class="text-xl font-semibold m-0">New Patient</h3>
                        </div>
                        <p-button icon="pi pi-times" text severity="secondary" pTooltip="Close" (click)="ref.close()"></p-button>
                    </div>
                </ng-template>

                <form [formGroup]="form" (ngSubmit)="submit()" class="form-content" autocomplete="off">
                    <!-- Personal Information Section -->
                    <div class="mb-6">
                        <h4 class="devider text-lg font-semibold mb-4 text-gray-700 border-b pb-2">Personal Information</h4>

                        <!-- Full Name - Takes full width as it's usually long -->
                        <div class="mb-4">
                            <p-floatLabel variant="on">
                                <input pInputText id="name" formControlName="name" autocomplete="off" [class.p-invalid]="invalid('name')" class="w-full" />
                                <label for="name"><i class="pi pi-user"></i> Full Name</label>
                            </p-floatLabel>
                            <small class="p-error" *ngIf="invalid('name')">Valid name is required</small>
                        </div>

                        <!-- Email -->
                        <div class="mb-4">
                            <p-floatLabel variant="on">
                                <input pInputText id="email" type="email" formControlName="email" autocomplete="off" class="w-full" [class.p-invalid]="invalid('email')" />
                                <label for="email"> <i class="pi pi-envelope"></i> Email Address </label>
                            </p-floatLabel>
                            <small class="p-error" *ngIf="invalid('email')"> Valid email is required </small>
                        </div>

                        <!-- QID, Phone, Gender - Single row -->
                        <p-fluid class="flex flex-wrap gap-4 mb-6">
                            <div class="flex-1 md:flex-[2]">
                                <p-floatLabel variant="on">
                                    <p-inputMask inputId="qid" formControlName="qid" mask="99999999999" [unmask]="true" [slotChar]="' '" inputmode="numeric" styleClass="w-full" [class.p-invalid]="invalid('qid')"></p-inputMask>
                                    <label for="qid"><i class="pi pi-id-card"></i> Qatar ID</label>
                                </p-floatLabel>
                                <small class="p-error" *ngIf="validateQID('qid')">Use numbers only (11-digit)</small>
                            </div>

                            <div class="flex-1 md:flex-[1.5]">
                                <p-floatLabel variant="on">
                                    <p-inputMask inputId="phone" formControlName="phone" mask="+999 9999 9999" styleClass="w-full" [class.p-invalid]="invalid('phone')"></p-inputMask>
                                    <label for="phone"><i class="pi pi-phone"></i> Phone Number *</label>
                                </p-floatLabel>
                                <small class="p-error" *ngIf="validatePhoneNumber('phone')">Valid phone number is required</small>
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
                                        [class.p-invalid]="invalid('gender')"
                                        styleClass="w-full"
                                        autocomplete="off"
                                    >
                                        <ng-template pTemplate="item" let-option>
                                            <div class="gender-item">
                                                <i class="pi" [class]="getGenderIcon(option.value)"></i>
                                                <span>{{ option.label }}</span>
                                            </div>
                                        </ng-template>
                                    </p-autoComplete>
                                    <label for="gender"><i class="pi pi-venus-mars"></i> Gender</label>
                                </p-floatLabel>
                                <small class="p-error" *ngIf="invalid('gender')">Please select a gender</small>
                            </div>
                        </p-fluid>

                        <!-- Date of Birth and Admission Date -->
                        <p-fluid class="flex flex-wrap gap-4 mb-6">
                            <div class="flex-1 md:flex-[1.5]">
                                <p-floatLabel variant="on">
                                    <p-datepicker inputId="dob" formControlName="dob" [showIcon]="true" class="w-full" dateFormat="dd/MM/yy" [maxDate]="today" [showOnFocus]="false" [class.p-invalid]="invalid('dob')" [readonlyInput]="true">
                                    </p-datepicker>
                                    <label for="dob"><i class="pi pi-calendar"></i> Date of Birth</label>
                                </p-floatLabel>
                                <small class="p-error" *ngIf="invalid('dob')">Date of birth is required</small>
                            </div>

                            <div class="flex-1 md:flex-[1.5]">
                                <p-floatLabel variant="on">
                                    <p-datepicker
                                        inputId="admissionDate"
                                        formControlName="admissionDate"
                                        [showIcon]="true"
                                        dateFormat="dd/MM/yy"
                                        [maxDate]="today"
                                        [showOnFocus]="false"
                                        [class.p-invalid]="invalid('admissionDate')"
                                        [readonlyInput]="true"
                                        class="w-full"
                                    >
                                    </p-datepicker>
                                    <label for="admissionDate"><i class="pi pi-calendar"></i> Admission Date</label>
                                </p-floatLabel>
                                <small class="p-error" *ngIf="invalid('admissionDate')">Admission Date is required</small>
                            </div>

                            <div class="flex-1 md:flex-[2]">
                                <p-floatLabel variant="on">
                                    <input pInputText id="insurance" formControlName="insurance" autocomplete="off" [class.p-invalid]="invalid('insurance')" />
                                    <label for="insurance"><i class="pi pi-shield"></i> Insurance *</label>
                                </p-floatLabel>
                                <small class="p-error" *ngIf="invalid('insurance')">Insurance is required</small>
                            </div>
                        </p-fluid>
                    </div>

                    <!-- Medical Information Section -->
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
                                        [class.p-invalid]="invalid('status')"
                                        styleClass="w-full"
                                        autocomplete="off"
                                    >
                                        <ng-template pTemplate="item" let-option>
                                            <span>{{ option }}</span>
                                        </ng-template>
                                    </p-autoComplete>
                                    <label for="status"><i class="pi pi-badge"></i> Status *</label>
                                </p-floatLabel>
                                @if (invalid('status')) {
                                    <small class="p-error">Status is required</small>
                                }
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

                    <!-- Health Details Section -->
                    <div class="mb-6">
                        <h4 class="devider text-lg font-semibold mb-4 text-gray-700 border-b pb-2">Health Details</h4>

                        <div class="mb-4">
                            <p-floatLabel variant="on">
                                <textarea pTextarea id="medicalHistory" formControlName="medicalHistory" autocomplete="off" class="w-full" rows="3"></textarea>
                                <label for="medicalHistory"><i class="pi pi-file-edit"></i> Medical History</label>
                            </p-floatLabel>
                        </div>

                        <div class="mb-4">
                            <p-floatLabel variant="on">
                                <input pInputText id="allergies" formControlName="allergies" autocomplete="off" class="w-full" />
                                <label for="allergies"><i class="pi pi-exclamation-triangle"></i> Allergies</label>
                            </p-floatLabel>
                        </div>

                        <div class="mb-4">
                            <p-floatLabel variant="on">
                                <textarea pTextarea id="medications" formControlName="medications" autocomplete="off" class="w-full" rows="3"></textarea>
                                <label for="medications"><i class="pi pi-file-edit"></i> Current Medications</label>
                            </p-floatLabel>
                        </div>
                    </div>

                    <!-- Notes Section -->
                    <div class="mb-6">
                        <h4 class="devider text-lg font-semibold mb-4 text-gray-700 border-b pb-2">Notes</h4>
                        <div class="mb-4">
                            <p-floatLabel variant="on">
                                <input pInputText id="notes" formControlName="notes" autocomplete="off" [class.p-invalid]="invalid('notes')" class="w-full" />
                                <label for="notes"><i class="pi pi-file-edit"></i> Write your notes here...</label>
                            </p-floatLabel>
                        </div>
                    </div>

                    <!-- Attachments Section -->
                    <div class="mb-6">
                        <h4 class="devider text-lg font-semibold mb-4 text-gray-700 border-b pb-2">Attachments</h4>
                        <div class="mb-4">
                            <p-fileupload
                                #patientUploader
                                name="patient_attachments[]"
                                [customUpload]="true"
                                [multiple]="true"
                                [showUploadButton]="false"
                                [showCancelButton]="false"
                                [auto]="false"
                                (onSelect)="onAttachmentsSelect($event)"
                                (onClear)="attachments = []"
                                class="upload-button-hidden w-full"
                            >
                                <ng-template pTemplate="content">
                                    <div class="w-full py-4" style="cursor: copy" (click)="patientUploader.advancedFileInput.nativeElement.click()">
                                        <div *ngIf="!attachments.length" class="h-full flex flex-col justify-center items-center">
                                            <i class="pi pi-upload text-surface-900 dark:text-surface-0 text-2xl mb-4"></i>
                                            <span class="font-bold text-surface-900 dark:text-surface-0 text-xl mb-4">Upload Attachments</span>
                                            <span class="font-medium text-surface-600 dark:text-surface-200 text-md text-center">Drop or select files</span>
                                        </div>
                                        <div class="w-full py-4" *ngIf="attachments.length">
                                            <div
                                                *ngFor="let file of attachments"
                                                class="flex items-center justify-between border rounded p-2 mb-2 gap-3"
                                            >
                                                <div class="flex items-center gap-2 min-w-0">
                                                    <i class="pi pi-paperclip text-surface-600"></i>
                                                    <span class="truncate max-w-xs">{{ file.name }}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    pButton
                                                    pRipple
                                                    icon="pi pi-times"
                                                    [text]="true"
                                                    class="shrink-0"
                                                    (click)="removeAttachment(file)"
                                                ></button>
                                            </div>
                                        </div>
                                    </div>
                                </ng-template>
                            </p-fileupload>
                        </div>
                    </div>

                    <!-- Form Actions -->
                    <div class="devider flex justify-end gap-3 pt-4">
                        <p-button type="button" label="Close" icon="pi pi-times" severity="secondary" (click)="ref.close()"></p-button>
                        <p-button type="button" label="Reset" icon="pi pi-refresh" severity="secondary" [outlined]="true" (click)="reset()"></p-button>
                        <p-button type="submit" label="Save Patient" icon="pi pi-save" [disabled]="form.invalid" [loading]="isSubmitting"></p-button>
                    </div>
                </form>
            </p-card>
        </div>
    `,
    styles: [
        `
            /* make p-datepicker take full width inside p-floatLabel or grid column */
            .devider {
                color: #10b981;
            }
            .header {
                background: var(--p-primary-50);
            }

            /* Match file upload look & feel from uploader.ts */
            :host ::ng-deep .p-fileupload-header {
                display: none;
            }

            :host ::ng-deep .p-fileupload {
                border: none;
            }

            :host ::ng-deep .p-fileupload-file-list {
                display: none;
            }
        `
    ]
})
export class NewPatient implements AfterViewInit {
    form: FormGroup;
    today = new Date();
    isSubmitting = false;
    attachments: File[] = [];

    genderOptions = [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' },
        { label: 'Non-binary', value: 'non-binary' },
        { label: 'Prefer not to say', value: 'prefer-not-to-say' }
    ];
    filteredGenderOptions: any[] = [];

    statusOptions: string[] = ['admitted', 'stable', 'under treatment', 'discharged', 'critical', 'dead'];
    filteredStatusOptions: string[] = [];

    constructor(
        private fb: FormBuilder,
        private helpersService: HelpersService,
        private patientService: PatientsService,
        public ref: DynamicDialogRef
    ) {
        this.form = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(3)]],
            email: ['', [Validators.required, Validators.email]],
            dob: ['', Validators.required],
            gender: ['', Validators.required],
            phone: ['', Validators.required],
            qid: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
            insurance: ['', Validators.required],
            admissionDate: ['', Validators.required],
            department: [''],
            specialization: [''],
            status: ['', Validators.required],
            bedNumber: [''],
            ward: [''],
            medicalHistory: [''],
            allergies: [''],
            medications: [''],
            notes: ['']
        });

        this.resetFormState();
    }

    ngAfterViewInit(): void {
        setTimeout(() => {
            const el = document.activeElement as HTMLElement | null;
            if (el && typeof el.blur === 'function') el.blur();
        }, 0);
    }

    private resetFormState(): void {
        this.form.reset(this.form.getRawValue(), { emitEvent: false });
        Object.values(this.form.controls).forEach((c) => {
            c.markAsPristine();
            c.markAsUntouched();
            c.updateValueAndValidity({ onlySelf: true, emitEvent: false });
        });
        this.form.markAsPristine();
        this.form.markAsUntouched();
    }

    // ===== Autocomplete handlers =====
    filterGender(event: any): void {
        const q = String(event?.query || '').toLowerCase();
        this.filteredGenderOptions = this.genderOptions.filter((o) => o.label.toLowerCase().includes(q));
    }

    filterStatus(e: { query: string }) {
        const q = (e?.query || '').toLowerCase();
        this.filteredStatusOptions = this.statusOptions.filter((x) => x.toLowerCase().includes(q));
    }

    // ===== Validation helpers =====
    validateQID(field: string): boolean {
        const c = this.form.get(field);
        return !!c && c.invalid && (c.dirty || c.touched);
    }

    invalid(fieldName: string): boolean {
        const c = this.form.get(fieldName);
        if (!c || !(c.dirty || c.touched)) return false;
        if (fieldName === 'phone') {
            const val: string = c.value || '';
            const digits = val.replace(/\D/g, '');
            return digits.length < 8 || digits.length > 15;
        }
        return c.invalid;
    }

    validatePhoneNumber(fieldName: string): boolean {
        const c = this.form.get(fieldName);
        if (!c || !(c.dirty || c.touched)) return false;
        const val: string = c.value || '';
        const digits = val.replace(/\D/g, '');
        return digits.length < 8 || digits.length > 15;
    }

    getGenderIcon(gender: string): string {
        switch (gender) {
            case 'male':
                return 'pi-mars';
            case 'female':
                return 'pi-venus';
            case 'non-binary':
                return 'pi-circle';
            case 'prefer-not-to-say':
                return 'pi-question-circle';
            default:
                return 'pi-user';
        }
    }

    // ===== Submit / Reset =====
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
        const digits = body.replace(/\D+/g, ''); // drops spaces, underscores, etc.
        return digits ? sign + digits : undefined;
    }

    onAttachmentsSelect(ev: FileSelectEvent): void {
        const files = Array.from(ev.files ?? []);
        this.attachments = [...this.attachments, ...files];
    }

    removeAttachment(file: File): void {
        this.attachments = this.attachments.filter((f) => f !== file);
    }

    submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.helpersService.notifyError('Validation Error', 'Please fill in all required fields correctly');
            return;
        }

        const email = this.form.get('email')?.value;
        if (!this.validateEmail(email)) {
            this.helpersService.notifyError('Validation Error', 'Email must be a valid email address');
            return;
        }

        this.isSubmitting = true;
        const f = this.form.getRawValue();

        const lc = (x: any) => (typeof x === 'string' ? x.toLowerCase().trim() : (x ?? null));

        const payload: CreateUpdatePatientRequest = {
            name: lc(f.name) ?? '',
            email: lc(f.email) ?? '',
            dob: new Date(f.dob).toISOString().slice(0, 10),
            gender: lc(f.gender) ?? '',
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
            allergies: f.allergies ? f.allergies.trim() : null,
            medications: f.medications ? f.medications.trim() : null,
            notes: f.notes ? f.notes.trim() : null
        };

        console.log('Submitting payload:', payload);

        this.patientService.createPatient(payload).subscribe({
            next: (res: any) => {
                this.isSubmitting = false;
                this.helpersService.notifySuccess('Patient created successfully');
                this.ref.close(res?.data ?? res);
            },
            error: (err) => {
                console.error('Error creating patient:', err);
                this.helpersService.notifyError('Error', err?.error?.message || 'Failed to create patient profile');
                this.isSubmitting = false;
            }
        });
    }

    validateEmail(email: string): boolean {
        if (!email) return false;
        return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
    }

    reset(): void {
        this.form.reset(
            {
                name: '',
                email: '',
                dob: '',
                gender: '',
                phone: '',
                qid: '',
                insurance: '',
                admissionDate: '',
                department: '',
                specialization: '',
                status: '',
                bedNumber: '',
                ward: '',
                medicalHistory: '',
                allergies: '',
                medications: '',
                notes: ''
            },
            { emitEvent: false }
        );
        this.resetFormState();
    }
}

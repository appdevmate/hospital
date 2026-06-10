import { Component, AfterViewInit, inject } from '@angular/core';
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
import { DialogModule } from 'primeng/dialog';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { FileUploadModule, FileSelectEvent } from 'primeng/fileupload';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputNumberModule } from 'primeng/inputnumber';
import { Fluid } from 'primeng/fluid';

import { DoctorsService, Department, Specialization, CreateUpdateDoctorRequest } from '@/services/doctors.service';
import { HelpersService } from '@/services/helpers-service';
import { GENDER_OPTIONS } from '@/shared/form-constants';

@Component({
    selector: 'app-new-doctor',
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
        DialogModule,
        FileUploadModule,
        MultiSelectModule,
        InputNumberModule,
        Fluid
    ],
    providers: [HelpersService],
    template: `
        <div class="doctor-form-container">
            <p-card>
                <ng-template pTemplate="header">
                    <div class="header flex items-center justify-between px-6 py-4">
                        <div class="flex items-center gap-3">
                            <i class="pi pi-user-plus text-primary" style="font-size: 2rem;"></i>
                            <h3 class="text-xl font-semibold m-0">New Doctor</h3>
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
                                            <div class="flex items-center gap-2">
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

                        <p-fluid class="flex flex-wrap gap-4 mb-6">
                            <div class="flex-1 md:flex-[2]">
                                <p-floatLabel variant="on">
                                    <input id="insurance" pInputText formControlName="insurance" autocomplete="off" [class.p-invalid]="invalid('insurance')" />
                                    <label for="insurance"><i class="pi pi-shield"></i> Insurance *</label>
                                </p-floatLabel>
                                <small class="p-error" *ngIf="invalid('insurance')">Insurance is required</small>
                            </div>

                            <div class="flex-1 md:flex-[1.5]">
                                <p-floatLabel variant="on">
                                    <p-datepicker
                                        inputId="hiringDate"
                                        formControlName="hiringDate"
                                        [showIcon]="true"
                                        class="w-full"
                                        dateFormat="dd/MM/yy"
                                        [maxDate]="today"
                                        [showOnFocus]="false"
                                        [class.p-invalid]="invalid('hiringDate')"
                                        [readonlyInput]="true"
                                    ></p-datepicker>
                                    <label for="hiringDate"><i class="pi pi-calendar"></i> Hiring Date</label>
                                </p-floatLabel>
                                <small class="p-error" *ngIf="invalid('hiringDate')">Hiring Date is required</small>
                            </div>

                            <div class="flex-1 md:flex-[1.5]">
                                <p-floatLabel variant="on">
                                    <p-datepicker
                                        inputId="dob"
                                        formControlName="dob"
                                        [showIcon]="true"
                                        dateFormat="dd/MM/yy"
                                        [maxDate]="today"
                                        [showOnFocus]="false"
                                        [class.p-invalid]="invalid('dob')"
                                        [readonlyInput]="true"
                                        class="w-full"
                                    ></p-datepicker>
                                    <label for="dob"><i class="pi pi-calendar"></i> Date of Birth</label>
                                </p-floatLabel>
                                <small class="p-error" *ngIf="invalid('dob')">Date of birth is required</small>
                            </div>
                        </p-fluid>

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
                    </div>

                    <!-- Professional Information -->
                    <div class="mb-6">
                        <h4 class="devider text-lg font-semibold mb-4 text-gray-700 border-b pb-2">Professional Information</h4>

                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                            <div class="flex gap-2 items-start">
                                <p-floatLabel variant="on" class="flex-1">
                                    <p-autoComplete
                                        inputId="department"
                                        formControlName="department"
                                        [suggestions]="filteredDepartmentOptions"
                                        (completeMethod)="searchRefData('department', $event)"
                                        field="name"
                                        [forceSelection]="true"
                                        [dropdown]="true"
                                        styleClass="w-full"
                                        autocomplete="off"
                                        (onSelect)="onDepartmentSelect($event)"
                                        (onClear)="onDepartmentClear()"
                                    >
                                        <ng-template pTemplate="item" let-option>
                                            <div class="flex items-center justify-between w-full">
                                                <span>{{ option.name }}</span>
                                                @if (option.code) {
                                                    <small class="opacity-70">{{ option.code }}</small>
                                                }
                                            </div>
                                        </ng-template>
                                    </p-autoComplete>
                                    <label for="department"><i class="pi pi-sitemap"></i> Department</label>
                                </p-floatLabel>
                                <p-button type="button" icon="pi pi-plus" [text]="true" [rounded]="true" size="small" pTooltip="Add Department" (click)="openAddDepartment()"></p-button>
                                <p-button type="button" icon="pi pi-upload" [text]="true" [rounded]="true" size="small" pTooltip="Bulk import departments" (click)="openBulk('department')"></p-button>
                            </div>

                            <div class="flex gap-2 items-start">
                                <p-floatLabel variant="on" class="flex-1">
                                    <p-autoComplete
                                        inputId="specialization"
                                        formControlName="specialization"
                                        [suggestions]="filteredSpecializationOptions"
                                        (completeMethod)="searchRefData('specialization', $event)"
                                        field="name"
                                        [forceSelection]="true"
                                        [dropdown]="true"
                                        styleClass="w-full"
                                        autocomplete="off"
                                        (onSelect)="onSpecializationSelect($event)"
                                        (onClear)="onSpecializationClear()"
                                    >
                                        <ng-template pTemplate="item" let-option>
                                            <div class="flex items-center justify-between w-full">
                                                <span>{{ option.name }}</span>
                                                @if (option.code) {
                                                    <small class="opacity-70">{{ option.code }}</small>
                                                }
                                            </div>
                                        </ng-template>
                                    </p-autoComplete>
                                    <label for="specialization"><i class="pi pi-sparkles"></i> Specialization</label>
                                </p-floatLabel>
                                <p-button type="button" icon="pi pi-plus" [text]="true" [rounded]="true" size="small" pTooltip="Add Specialization" (click)="openAddSpec()"></p-button>
                                <p-button type="button" icon="pi pi-upload" [text]="true" [rounded]="true" size="small" pTooltip="Bulk import specializations" (click)="openBulk('specialization')"></p-button>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <p-floatLabel variant="on">
                                    <p-autoComplete
                                        inputId="education"
                                        formControlName="education"
                                        [suggestions]="filteredEducationOptions"
                                        (completeMethod)="filterEducation($event)"
                                        field="name"
                                        [dropdown]="true"
                                        [forceSelection]="true"
                                        styleClass="w-full"
                                        autocomplete="off"
                                        (onSelect)="onEducationSelect($event)"
                                        (onClear)="onEducationClear()"
                                    >
                                        <ng-template pTemplate="item" let-option>
                                            <div class="flex items-center justify-between w-full">
                                                <span>{{ option.name }}</span>
                                                @if (option.level) {
                                                    <small class="opacity-70">{{ option.level }}</small>
                                                }
                                            </div>
                                        </ng-template>
                                    </p-autoComplete>
                                    <label for="education"><i class="pi pi-book"></i> Education</label>
                                </p-floatLabel>
                            </div>

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
                        </div>

                        <div class="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <p-floatLabel variant="on">
                                    <p-inputNumber inputId="experienceYears" formControlName="experienceYears" [showButtons]="true" [min]="0" styleClass="w-full"></p-inputNumber>
                                    <label for="experienceYears"><i class="pi pi-hourglass"></i> Years of Experience</label>
                                </p-floatLabel>
                            </div>
                            <div>
                                <p-floatLabel variant="on">
                                    <p-inputNumber inputId="experienceMonths" formControlName="experienceMonths" [showButtons]="true" [min]="0" [max]="11" styleClass="w-full"></p-inputNumber>
                                    <label for="experienceMonths"><i class="pi pi-hourglass"></i> Months</label>
                                </p-floatLabel>
                            </div>
                        </div>
                    </div>

                    <!-- Duty Schedule -->
                    <div class="mb-6">
                        <h4 class="devider text-lg font-semibold mb-4 text-gray-700 border-b pb-2">Duty Schedule</h4>
                        <p-fluid class="flex flex-wrap gap-4 mb-6">
                            <div class="flex-1 md:flex-[3]">
                                <p-floatLabel variant="on">
                                    <p-multiSelect inputId="dutyDays" formControlName="dutyDays" [options]="weekDays" optionLabel="label" optionValue="value" display="chip" class="w-full"></p-multiSelect>
                                    <label for="dutyDays"><i class="pi pi-calendar"></i> Duty Days</label>
                                </p-floatLabel>
                            </div>
                            <div class="flex-1 md:flex-[1]">
                                <p-floatLabel variant="on">
                                    <p-datepicker inputId="dutyStart" formControlName="dutyStart" [timeOnly]="true" [showIcon]="true" [showOnFocus]="false" styleClass="w-full"></p-datepicker>
                                    <label for="dutyStart"><i class="pi pi-clock"></i> Start Time</label>
                                </p-floatLabel>
                            </div>
                            <div class="flex-1 md:flex-[1]">
                                <p-floatLabel variant="on">
                                    <p-datepicker inputId="dutyEnd" formControlName="dutyEnd" [timeOnly]="true" [showIcon]="true" [showOnFocus]="false" styleClass="w-full"></p-datepicker>
                                    <label for="dutyEnd"><i class="pi pi-clock"></i> End Time</label>
                                </p-floatLabel>
                            </div>
                        </p-fluid>
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

                    <!-- Form Actions -->
                    <div class="devider flex justify-end gap-3 pt-4">
                        <p-button type="button" label="Close" icon="pi pi-times" severity="secondary" (click)="ref.close()"></p-button>
                        <p-button type="button" label="Reset" icon="pi pi-refresh" severity="secondary" [outlined]="true" (click)="reset()"></p-button>
                        <p-button type="submit" label="Save Doctor" icon="pi pi-save" [disabled]="form.invalid" [loading]="isSubmitting"></p-button>
                    </div>
                </form>
            </p-card>
        </div>

        <!-- Add Department Dialog -->
        <p-dialog [(visible)]="addDeptVisible" [modal]="true" header="Add Department" [style]="{ width: '28rem' }" [draggable]="false" [resizable]="false">
            <div class="space-y-4">
                <div>
                    <label for="newDept" class="font-medium block mb-2">Department name</label>
                    <input id="newDept" pInputText [(ngModel)]="newDept" autocomplete="off" class="w-full" />
                </div>
                <div>
                    <label for="newDeptCode" class="font-medium block mb-2">Code</label>
                    <input id="newDeptCode" pInputText [(ngModel)]="newDeptCode" autocomplete="off" class="w-full" />
                </div>
                <div class="flex justify-end gap-2 mt-3">
                    <p-button label="Cancel" severity="secondary" (click)="addDeptVisible = false"></p-button>
                    <p-button label="Add" icon="pi pi-check" [disabled]="isSavingDept || !newDept.trim() || !newDeptCode.trim()" [loading]="isSavingDept" (click)="saveDepartment()"></p-button>
                </div>
            </div>
        </p-dialog>

        <!-- Add Specialization Dialog -->
        <p-dialog [(visible)]="addSpecVisible" [modal]="true" header="Add Specialization" [style]="{ width: '28rem' }" [draggable]="false" [resizable]="false">
            <div class="space-y-4">
                <div>
                    <label for="newSpec" class="font-medium block mb-2">Specialization name</label>
                    <input id="newSpec" pInputText [(ngModel)]="newSpec" autocomplete="off" class="w-full" />
                </div>
                <div>
                    <label for="newSpecCode" class="font-medium block mb-2">Code (optional)</label>
                    <input id="newSpecCode" pInputText [(ngModel)]="newSpecCode" autocomplete="off" class="w-full" />
                </div>
                <div class="flex justify-end gap-2 mt-3">
                    <p-button label="Cancel" severity="secondary" (click)="addSpecVisible = false"></p-button>
                    <p-button label="Add" icon="pi pi-check" [disabled]="!newSpec.trim()" (click)="saveSpecialization()"></p-button>
                </div>
            </div>
        </p-dialog>

        <!-- Bulk Dialog -->
        <p-dialog [(visible)]="bulkVisible" [modal]="true" [header]="bulkType === 'department' ? 'Bulk Import Departments' : 'Bulk Import Specializations'" [style]="{ width: '36rem' }" [draggable]="false" [resizable]="false">
            <div class="space-y-4">
                <div class="text-sm">
                    <p class="mb-2">
                        Step 1: Download the template, then fill <b>name</b>, <b>code</b>
                        @if (bulkType === 'specialization') {
                            <span>(code optional)</span>
                        }
                        .
                    </p>
                    <p-button size="small" icon="pi pi-download" label="Download template" (click)="downloadBulkTemplate(bulkType)"></p-button>
                </div>
                <div class="text-sm">
                    <div class="mb-2">Step 2: Upload the filled CSV or Excel file.</div>
                    <p-fileUpload mode="basic" [showUploadButton]="false" [showCancelButton]="false" accept=".csv,.xlsx,.xls" chooseLabel="Choose file" (onSelect)="onBulkFiles($event)"></p-fileUpload>
                </div>
                <div class="text-sm">
                    <div>Parsed: {{ bulkPreview.length }} rows</div>
                    @if (bulkInvalid.length) {
                        <div>Invalid: {{ bulkInvalid.length }}</div>
                    }
                </div>
                <div class="flex justify-end gap-2">
                    <p-button label="Cancel" severity="secondary" (click)="bulkVisible = false"></p-button>
                    <p-button label="Upload" icon="pi pi-check" [disabled]="isUploadingBulk || !bulkPreview.length" [loading]="isUploadingBulk" (click)="saveBulk()"></p-button>
                </div>
            </div>
        </p-dialog>
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
export class NewDoctor implements AfterViewInit {
    private fb = inject(FormBuilder);
    private helpersService = inject(HelpersService);
    private doctorService = inject(DoctorsService);
    ref = inject(DynamicDialogRef);

    form: FormGroup;
    today = new Date();
    isSubmitting = false;

    addDeptVisible = false;
    addSpecVisible = false;
    newDept = '';
    newDeptCode = '';
    newSpec = '';
    newSpecCode = '';
    isSavingDept = false;
    isSavingSpec = false;

    bulkVisible = false;
    bulkType: 'department' | 'specialization' = 'department';
    isUploadingBulk = false;
    bulkPreview: { name: string; code?: string }[] = [];
    bulkInvalid: any[] = [];

    genderOptions = GENDER_OPTIONS;
    filteredGenderOptions: any[] = [];

    filteredDepartmentOptions: Department[] = [];
    filteredSpecializationOptions: Specialization[] = [];
    statusOptions: string[] = ['senior', 'junior', 'under development', 'associate'];
    filteredStatusOptions: string[] = [];

    weekDays = [
        { label: 'Mon', value: 'MON' },
        { label: 'Tue', value: 'TUE' },
        { label: 'Wed', value: 'WED' },
        { label: 'Thu', value: 'THU' },
        { label: 'Fri', value: 'FRI' },
        { label: 'Sat', value: 'SAT' },
        { label: 'Sun', value: 'SUN' }
    ];

    educationOptions = [{ name: 'MBBS' }, { name: 'MD' }, { name: 'DO' }, { name: 'MS' }, { name: 'PhD' }, { name: 'Fellowship' }];
    filteredEducationOptions: any[] = [];

    bloodGroupOptions: string[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    filteredBloodGroupOptions: string[] = [];

    constructor() {
        this.form = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(3)]],
            email: ['', [Validators.required, Validators.email]],
            dob: ['', Validators.required],
            gender: ['', Validators.required],
            phone: ['', Validators.required],
            qid: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
            job: [''],
            insurance: ['', Validators.required],
            specialization: ['', Validators.required],
            department: ['', Validators.required],
            status: ['', Validators.required],
            hiringDate: ['', Validators.required],
            experienceYears: [0],
            experienceMonths: [0],
            notes: [''],
            education: [null],
            dutyDays: [[]],
            dutyStart: [null],
            dutyEnd: [null],
            bloodGroup: ['']
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

    filterGender(event: any): void {
        const q = String(event?.query || '').toLowerCase();
        this.filteredGenderOptions = this.genderOptions.filter((o) => o.label.toLowerCase().includes(q));
    }

    filterEducation(e: any) {
        const q = (e.query || '').toLowerCase();
        this.filteredEducationOptions = this.educationOptions.filter((x) => x.name.toLowerCase().includes(q));
    }

    searchRefData(kind: 'department' | 'specialization', e: { query: string }) {
        const q = e?.query ?? '';
        const obs = kind === 'department' ? this.doctorService.searchDepartments(q) : this.doctorService.searchSpecializations(q);
        obs.subscribe({
            next: (items) => {
                if (kind === 'department') this.filteredDepartmentOptions = items || [];
                else this.filteredSpecializationOptions = items || [];
            },
            error: (err) => {
                if (err?.error?.message === 'Unauthorized') {
                    this.helpersService.redirectToLogin();
                    return;
                }
                if (kind === 'department') this.filteredDepartmentOptions = [];
                else this.filteredSpecializationOptions = [];
            }
        });
    }

    onDepartmentSelect(e: { value: Department }) {
        this.form.get('department')?.setValue(e?.value?.name ?? '');
    }
    onDepartmentClear() {
        this.form.get('department')?.setValue('');
    }
    onSpecializationSelect(e: { value: Specialization }) {
        this.form.get('specialization')?.setValue(e?.value?.name ?? '');
    }
    onSpecializationClear() {
        this.form.get('specialization')?.setValue('');
    }
    onEducationSelect(e: { value: any }) {
        this.form.get('education')?.setValue(e?.value?.name ?? '');
    }
    onEducationClear() {
        this.form.get('education')?.setValue('');
    }

    filterStatus(e: { query: string }) {
        const q = (e?.query || '').toLowerCase();
        this.filteredStatusOptions = this.statusOptions.filter((x) => x.toLowerCase().includes(q));
    }

    filterBloodGroup(e: { query: string }) {
        const q = (e?.query || '').toLowerCase();
        this.filteredBloodGroupOptions = this.bloodGroupOptions.filter((x) => x.toLowerCase().includes(q));
    }

    validateQID(field: string): boolean {
        const c = this.form.get(field);
        return !!c && c.invalid && (c.dirty || c.touched);
    }

    invalid(fieldName: string): boolean {
        const c = this.form.get(fieldName);
        if (!c || !(c.dirty || c.touched)) return false;
        if (fieldName === 'phone') {
            const digits = (c.value || '').replace(/\D/g, '');
            return digits.length < 8 || digits.length > 15;
        }
        return c.invalid;
    }

    validatePhoneNumber(fieldName: string): boolean {
        const c = this.form.get(fieldName);
        if (!c || !(c.dirty || c.touched)) return false;
        const digits = (c.value || '').replace(/\D/g, '');
        return digits.length < 8 || digits.length > 15;
    }

    getGenderIcon(gender: string): string {
        const icons: Record<string, string> = {
            male: 'pi-mars',
            female: 'pi-venus'
        };
        return icons[gender] || 'pi-user';
    }

    sanitizePhone(x: any): string | null {
        if (typeof x !== 'string') return x ?? null;
        const s = x.trim();
        if (!s) return null;
        const sign = s.startsWith('+') ? '+' : '';
        const digits = s.replace(/\D+/g, '');
        return digits ? sign + digits : null;
    }

    validateEmail(email: string): boolean {
        if (!email) return false;
        // Standard RFC-style email — any domain. Per-tenant allow-lists
        // are enforced by Cognito + backend, not by frontend regex.
        return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i.test(email.trim());
    }

    submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.helpersService.notifyError('Validation Error', 'Please fill in all required fields correctly');
            return;
        }

        const email = this.form.get('email')?.value;
        if (!this.validateEmail(email)) {
            this.helpersService.notifyError('Validation Error', 'Please enter a valid email address');
            return;
        }

        this.isSubmitting = true;
        const f = this.form.getRawValue();
        const lc = (x: any) => (typeof x === 'string' ? x.toLowerCase().trim() : (x ?? null));

        const formatTime = (dateVal: any): string | null => {
            if (!dateVal) return null;
            const d = new Date(dateVal);
            if (isNaN(d.getTime())) return null;
            return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        };

        const payload: CreateUpdateDoctorRequest = {
            name: lc(f.name),
            email: lc(f.email),
            dob: f.dob ? new Date(f.dob).toISOString().slice(0, 10) : null,
            gender: lc(f.gender),
            phone: this.sanitizePhone(f.phone),
            qid: lc(f.qid),
            insurance: lc(f.insurance),
            department: lc(f.department),
            specialization: lc(f.specialization),
            status: lc(f.status),
            hiringDate: f.hiringDate ? new Date(f.hiringDate).toISOString().slice(0, 10) : null,
            job: lc(f.job),
            experienceYears: f.experienceYears ?? 0,
            experienceMonths: f.experienceMonths ?? 0,
            notes: f.notes ? f.notes.trim() : null,
            education: f.education ? (typeof f.education === 'string' ? f.education.trim() : f.education.name) : null,
            dutyDays: Array.isArray(f.dutyDays) ? f.dutyDays.map((d: string) => d.toLowerCase()) : [],
            dutyStart: formatTime(f.dutyStart),
            dutyEnd: formatTime(f.dutyEnd),
            bloodGroup: f.bloodGroup ? f.bloodGroup.trim() : null
        };

        this.doctorService.createDoctor(payload).subscribe({
            next: (res: any) => {
                this.isSubmitting = false;
                this.helpersService.notifySuccess('Doctor created successfully');
                this.ref.close(res?.data ?? res);
            },
            error: (err) => {
                this.isSubmitting = false;
                this.helpersService.notifyApiError('Error', err, 'Failed to create doctor profile');
            }
        });
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
                job: '',
                insurance: '',
                specialization: '',
                department: '',
                status: '',
                hiringDate: '',
                experienceYears: 0,
                experienceMonths: 0,
                notes: '',
                education: null,
                dutyDays: [],
                dutyStart: null,
                dutyEnd: null,
                bloodGroup: ''
            },
            { emitEvent: false }
        );
        this.resetFormState();
    }

    openAddDepartment() {
        this.newDept = '';
        this.newDeptCode = '';
        this.addDeptVisible = true;
    }

    saveDepartment() {
        const name = this.newDept.trim();
        const code = this.newDeptCode.trim();
        if (!name || !code) return;
        this.isSavingDept = true;
        this.doctorService.createDepartment({ name, code }).subscribe({
            next: () => {
                this.searchRefData('department', { query: '' });
                this.form.get('department')?.setValue(name);
                this.addDeptVisible = false;
                this.helpersService.notifySuccess('Department Added');
                this.isSavingDept = false;
            },
            error: (err) => {
                this.isSavingDept = false;
                this.helpersService.notifyApiError('Error', err, 'Failed to add department');
            }
        });
    }

    openAddSpec() {
        this.newSpec = '';
        this.newSpecCode = '';
        this.addSpecVisible = true;
    }

    saveSpecialization() {
        const name = this.newSpec.trim();
        const code = this.newSpecCode.trim() || undefined;
        if (!name) return;
        this.isSavingSpec = true;
        this.doctorService.createSpecialization({ name, code }).subscribe({
            next: () => {
                this.searchRefData('specialization', { query: '' });
                this.form.get('specialization')?.setValue(name);
                this.addSpecVisible = false;
                this.helpersService.notifyInfo('Added', 'Specialization added');
                this.isSavingSpec = false;
            },
            error: (err) => {
                this.isSavingSpec = false;
                this.helpersService.notifyApiError('Error', err, 'Failed to add specialization');
            }
        });
    }

    openBulk(type: 'department' | 'specialization') {
        this.bulkType = type;
        this.bulkPreview = [];
        this.bulkInvalid = [];
        this.bulkVisible = true;
    }

    onBulkFiles(ev: FileSelectEvent) {
        const f = ev.files?.[0];
        if (!f) return;
        this.parseTwoColFile(f, this.bulkType === 'specialization').then(({ ok, rows, invalid, error }) => {
            if (!ok) {
                this.helpersService.notifyError('Parse error', error || 'Unable to read file');
                return;
            }
            this.bulkPreview = rows as any[];
            this.bulkInvalid = invalid;
        });
    }

    saveBulk() {
        if (!this.bulkPreview.length) return;
        this.isUploadingBulk = true;
        const obs = this.bulkType === 'department' ? this.doctorService.bulkCreateDepartments(this.bulkPreview as { name: string; code: string }[]) : this.doctorService.bulkCreateSpecializations(this.bulkPreview as { name: string; code?: string }[]);

        obs.subscribe({
            next: (res) => {
                const imported = res?.count ?? this.bulkPreview.length;
                this.helpersService.notifySuccess(`Imported ${imported} ${this.bulkType === 'department' ? 'departments' : 'specializations'}`);
                this.isUploadingBulk = false;
                this.bulkVisible = false;
                this.searchRefData(this.bulkType, { query: '' });
            },
            error: (err) => {
                this.isUploadingBulk = false;
                if (err?.error?.message === 'Unauthorized') {
                    this.helpersService.redirectToLogin();
                    return;
                }
                this.helpersService.notifyError('Upload failed', `Could not import ${this.bulkType}s`);
            }
        });
    }

    downloadBulkTemplate(kind: 'department' | 'specialization') {
        const blob = new Blob(['name,code\n'], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = kind === 'department' ? 'departments_template.csv' : 'specializations_template.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    private async parseTwoColFile(file: File, codeOptional = false): Promise<{ ok: boolean; rows: any[]; invalid: any[]; error?: string }> {
        try {
            const ext = file.name.toLowerCase().split('.').pop() || '';
            if (ext === 'csv') return this.parseCsvText(await file.text(), codeOptional);
            if (ext === 'xlsx' || ext === 'xls') {
                const XLSX = await import('xlsx');
                const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                return this.normalizeRows(XLSX.utils.sheet_to_json<any>(ws, { defval: '' }), codeOptional);
            }
            return { ok: false, rows: [], invalid: [], error: 'Unsupported file type' };
        } catch (e: any) {
            return { ok: false, rows: [], invalid: [], error: e?.message || 'Unknown error' };
        }
    }

    private parseCsvText(text: string, codeOptional: boolean) {
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
        if (!lines.length) return { ok: true, rows: [], invalid: [] };
        const split = (row: string) => row.match(/("([^"]|"")*"|[^,]+)/g)?.map((s) => s.replace(/^"(.*)"$/, '$1').replace(/""/g, '"')) || [];
        const header = split(lines[0]).map((h) => h.trim().toLowerCase());
        let nameIdx = header.indexOf('name');
        let codeIdx = header.indexOf('code');
        const hasHeader = nameIdx !== -1;
        const dataLines = hasHeader ? lines.slice(1) : lines;
        if (!hasHeader) {
            nameIdx = 0;
            codeIdx = 1;
        }
        const rows: any[] = [];
        const invalid: any[] = [];
        for (const line of dataLines) {
            const cols = split(line).map((s) => s.trim());
            const name = (cols[nameIdx] || '').trim();
            const code = (cols[codeIdx] || '').trim();
            if (!name || (!codeOptional && !code)) {
                invalid.push({ line });
                continue;
            }
            rows.push(codeOptional ? { name, ...(code ? { code } : {}) } : { name, code });
        }
        return this.dedupeRows(rows, invalid);
    }

    private normalizeRows(json: any[], codeOptional: boolean) {
        const rows: any[] = [];
        const invalid: any[] = [];
        for (const r of json) {
            const name = String(r.name ?? r.Name ?? r.NAME ?? '').trim();
            const code = String(r.code ?? r.Code ?? r.CODE ?? '').trim();
            if (!name || (!codeOptional && !code)) {
                invalid.push(r);
                continue;
            }
            rows.push(codeOptional ? { name, ...(code ? { code } : {}) } : { name, code });
        }
        return this.dedupeRows(rows, invalid);
    }

    private dedupeRows(rows: any[], invalid: any[]) {
        const seen = new Set<string>();
        const out: any[] = [];
        for (const r of rows) {
            const key = `${r.name.toLowerCase()}|${(r.code || '').toLowerCase()}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(r);
        }
        return { ok: true, rows: out, invalid };
    }
}

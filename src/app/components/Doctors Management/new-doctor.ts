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
import { DialogModule } from 'primeng/dialog';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { FileUploadModule, FileSelectEvent } from 'primeng/fileupload';

import { DoctorsService, Department, Specialization, CreateUpdateDoctorRequest } from '@/pages/service/doctors.service';
import { HelpersService } from '@/services/helpers-service';

@Component({
    selector: 'app-new-doctor',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule, CardModule, InputTextModule, DatePickerModule, AutoCompleteModule, InputMaskModule, ButtonModule, ToastModule, FloatLabelModule, DialogModule, FileUploadModule],
    providers: [HelpersService],
    template: `
        <div class="doctor-form-container">
            <p-card>
                <ng-template pTemplate="header">
                    <div class="form-header">
                        <div class="title">
                            <i class="pi pi-user-plus"></i>
                            <h3>New Doctor</h3>
                        </div>
                        <p-button icon="pi pi-times" text severity="secondary" pTooltip="Close" (click)="ref.close()"></p-button>
                    </div>
                </ng-template>

                <form [formGroup]="form" (ngSubmit)="submit()" class="form-content" autocomplete="off">
                    <!-- Name -->
                    <div class="form-field">
                        <p-floatlabel variant="on">
                            <input pInputText id="name" formControlName="name" autocomplete="off" [class.p-invalid]="invalid('name')" class="w-full" />
                            <label for="name"><i class="pi pi-user"></i> Enter Full Name</label>
                        </p-floatlabel>
                    </div>

                    <!-- QID & Gender -->
                    <div class="form-row">
                        <div class="form-field form-field-half">
                            <p-floatlabel variant="on">
                                <input id="qid" pInputText formControlName="qid" autocomplete="off" [class.p-invalid]="validateQID('qid')" class="w-full" />
                                <label for="qid"><i class="pi pi-id-card"></i> Qatar ID</label>
                            </p-floatlabel>
                            <small class="p-error" *ngIf="validateQID('qid')">Use numbers only (11-digit)</small>
                        </div>

                        <div class="form-field form-field-half">
                            <p-floatlabel variant="on">
                                <p-autocomplete
                                    id="gender"
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
                                </p-autocomplete>
                                <label for="gender"><i class="pi pi-question-circle"></i> Select Gender</label>
                            </p-floatlabel>
                            <small class="p-error" *ngIf="invalid('gender')">Please select a gender</small>
                        </div>
                    </div>

                    <!-- Phone & Insurance -->
                    <div class="form-row">
                        <div class="form-field form-field-half">
                            <p-floatlabel variant="on">
                                <p-inputMask id="phone" formControlName="phone" mask="+999 9999 9999 9999 999" [autoClear]="false" styleClass="w-full" inputId="phone"></p-inputMask>
                                <label for="phone"><i class="pi pi-phone"></i> Phone Number *</label>
                            </p-floatlabel>
                            <small class="p-error" *ngIf="validatePhoneNumber('phone')">Valid phone number is required</small>
                        </div>

                        <div class="form-field form-field-half">
                            <p-floatlabel variant="on">
                                <input id="insurance" pInputText formControlName="insurance" autocomplete="off" [class.p-invalid]="invalid('insurance')" class="w-full" />
                                <label for="insurance"><i class="pi pi-shield"></i> Insurance *</label>
                            </p-floatlabel>
                            <small class="p-error" *ngIf="invalid('insurance')">Insurance is required</small>
                        </div>
                    </div>

                    <!-- Department & Specialization -->
                    <div class="form-row">
                        <div class="form-field form-field-half">
                            <div class="field-with-btn">
                                <p-floatlabel variant="on" class="flex-1">
                                    <p-autocomplete
                                        id="department"
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
                                                <small class="opacity-70" *ngIf="option.code">{{ option.code }}</small>
                                            </div>
                                        </ng-template>
                                    </p-autocomplete>
                                    <label for="department"><i class="pi pi-sitemap"></i> Department</label>
                                </p-floatlabel>

                                <p-button type="button" icon="pi pi-plus" [text]="true" [rounded]="true" size="small" pTooltip="Add Department" (click)="openAddDepartment()"></p-button>
                                <p-button type="button" icon="pi pi-upload" [text]="true" [rounded]="true" size="small" pTooltip="Bulk import departments" (click)="openBulk('department')"></p-button>
                            </div>
                        </div>

                        <div class="form-field form-field-half">
                            <div class="field-with-btn">
                                <p-floatlabel variant="on" class="flex-1">
                                    <p-autocomplete
                                        id="specialization"
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
                                                <small class="opacity-70" *ngIf="option.code">{{ option.code }}</small>
                                            </div>
                                        </ng-template>
                                    </p-autocomplete>
                                    <label for="specialization"><i class="pi pi-sparkles"></i> Specialization</label>
                                </p-floatlabel>

                                <p-button type="button" icon="pi pi-plus" [text]="true" [rounded]="true" size="small" pTooltip="Add Specialization" (click)="openAddSpec()"></p-button>
                                <p-button type="button" icon="pi pi-upload" [text]="true" [rounded]="true" size="small" pTooltip="Bulk import specializations" (click)="openBulk('specialization')"></p-button>
                            </div>
                        </div>
                    </div>

                    <!-- Job & Status -->
                    <div class="form-row">
                        <div class="form-field form-field-half">
                            <p-floatlabel variant="on">
                                <input id="job" pInputText formControlName="job" autocomplete="off" class="w-full" />
                                <label for="job"><i class="pi pi-briefcase"></i> Job</label>
                            </p-floatlabel>
                        </div>

                        <div class="form-field form-field-half">
                            <p-floatlabel variant="on">
                                <p-autocomplete
                                    id="status"
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
                                </p-autocomplete>
                                <label for="status"><i class="pi pi-badge"></i> Status *</label>
                            </p-floatlabel>
                            <small class="p-error" *ngIf="invalid('status')">Status is required</small>
                        </div>
                    </div>

                    <!-- Join Date & DOB (last row) -->
                    <div class="form-row">
                        <div class="form-field form-field-half">
                            <p-floatlabel variant="on">
                                <p-datepicker id="hiringDate" formControlName="hiringDate" [showIcon]="true" [showOnFocus]="false" [readonlyInput]="true" styleClass="w-full"></p-datepicker>
                                <label for="hiringDate"><i class="pi pi-calendar-plus"></i> Join Date</label>
                            </p-floatlabel>
                        </div>

                        <div class="form-field form-field-half">
                            <p-floatlabel variant="on">
                                <p-datepicker id="dob" formControlName="dob" [showIcon]="true" dateFormat="dd/MM/yy" [maxDate]="today" [showOnFocus]="false" [class.p-invalid]="invalid('dob')" [readonlyInput]="true" styleClass="w-full"></p-datepicker>
                                <label for="dob"><i class="pi pi-calendar"></i> Date of Birth</label>
                            </p-floatlabel>
                            <small class="p-error" *ngIf="invalid('dob')">Date of birth is required</small>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="form-actions">
                        <p-button type="button" label="Close" icon="pi pi-times" severity="secondary" (click)="ref.close()"></p-button>
                        <p-button type="button" label="Reset" icon="pi pi-refresh" severity="secondary" [outlined]="true" (click)="reset()"></p-button>
                        <p-button type="submit" label="Save Doctor" icon="pi pi-save" [disabled]="form.invalid" [loading]="isSubmitting"></p-button>
                    </div>
                </form>
            </p-card>
        </div>

        <!-- Add Department Dialog -->
        <p-dialog [(visible)]="addDeptVisible" [modal]="true" header="Add Department" [style]="{ width: '28rem' }" [draggable]="false" [resizable]="false">
            <div class="p-fluid">
                <div class="form-field">
                    <label for="newDept" class="font-medium">Department name</label>
                    <input id="newDept" pInputText [(ngModel)]="newDept" autocomplete="off" />
                </div>
                <div class="form-field">
                    <label for="newDeptCode" class="font-medium">Code</label>
                    <input id="newDeptCode" pInputText [(ngModel)]="newDeptCode" autocomplete="off" />
                </div>
                <div class="flex justify-end gap-2 mt-3">
                    <p-button label="Cancel" icon="pi pi-times" severity="secondary" (click)="addDeptVisible = false"></p-button>
                    <p-button label="Add" icon="pi pi-check" [disabled]="isSavingDept || !newDept.trim() || !newDeptCode.trim()" [loading]="isSavingDept" (click)="saveDepartment()"></p-button>
                </div>
            </div>
        </p-dialog>

        <!-- Add Specialization Dialog -->
        <p-dialog [(visible)]="addSpecVisible" [modal]="true" header="Add Specialization" [style]="{ width: '28rem' }" [draggable]="false" [resizable]="false">
            <div class="p-fluid">
                <div class="form-field">
                    <label for="newSpec" class="font-medium">Specialization name</label>
                    <input id="newSpec" pInputText [(ngModel)]="newSpec" autocomplete="off" />
                </div>
                <div class="form-field">
                    <label for="newSpecCode" class="font-medium">Code (optional)</label>
                    <input id="newSpecCode" pInputText [(ngModel)]="newSpecCode" autocomplete="off" />
                </div>
                <div class="flex justify-end gap-2 mt-3">
                    <p-button label="Cancel" icon="pi pi-times" severity="secondary" (click)="addSpecVisible = false"></p-button>
                    <p-button label="Add" icon="pi pi-check" (click)="saveSpecialization()" [disabled]="!newSpec.trim()"></p-button>
                </div>
            </div>
        </p-dialog>

        <!-- Unified Bulk Dialog -->
        <p-dialog [(visible)]="bulkVisible" [modal]="true" [header]="bulkType === 'department' ? 'Bulk Import Departments' : 'Bulk Import Specializations'" [style]="{ width: '36rem' }" [draggable]="false" [resizable]="false">
            <div class="p-fluid">
                <div class="mb-3 text-sm">
                    <p class="m-0">Step 1: Download the template, then fill <b>name</b>, <b>code</b><span *ngIf="bulkType === 'specialization'"> (code optional)</span>.</p>
                    <p-button size="small" icon="pi pi-download" label="Download template" (click)="downloadTemplate(bulkType)"></p-button>
                </div>

                <div class="mb-2 text-sm">Step 2: Upload the filled CSV or Excel file.</div>
                <p-fileUpload mode="basic" [showUploadButton]="false" [showCancelButton]="false" accept=".csv,.xlsx,.xls" chooseLabel="Choose file" (onSelect)="onBulkFiles($event)"></p-fileUpload>

                <div class="mt-3 text-sm">
                    <div>Parsed: {{ bulkPreview.length }} rows</div>
                    <div *ngIf="bulkInvalid.length">Invalid: {{ bulkInvalid.length }}</div>
                </div>

                <div class="flex justify-end gap-2 mt-3">
                    <p-button label="Cancel" icon="pi pi-times" severity="secondary" (click)="bulkVisible = false"></p-button>
                    <p-button label="Upload" icon="pi pi-check" (click)="saveBulk()" [disabled]="isUploadingBulk || !bulkPreview.length" [loading]="isUploadingBulk"></p-button>
                </div>
            </div>
        </p-dialog>
    `,
    styles: [
        `
            .doctor-form-container {
                width: 100%;
                max-width: 100%;
            }
            .form-header {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 1rem 1.5rem;
                background: var(--p-primary-50);
                border-bottom: 1px solid var(--p-surface-border);
                justify-content: space-between;
            }
            .form-header i {
                color: var(--p-primary-500);
                font-size: 1.25rem;
            }
            .form-header h3 {
                margin: 0;
                color: var(--p-text-color);
                font-weight: 600;
            }
            .form-header .title {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            .form-content {
                padding: 1.5rem;
            }
            .form-field {
                margin-bottom: 1.5rem;
            }
            .form-row {
                display: flex;
                gap: 1rem;
                margin-bottom: 1.5rem;
            }
            .form-field-half {
                flex: 1;
                margin-bottom: 0;
            }
            .p-error {
                display: block;
                margin-top: 0.25rem;
                font-size: 0.875rem;
                color: var(--p-red-500);
            }
            .gender-item {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            .form-actions {
                display: flex;
                gap: 0.75rem;
                justify-content: flex-end;
                margin-top: 2rem;
                padding-top: 1rem;
                border-top: 1px solid var(--p-surface-border);
            }
            :host ::ng-deep .p-inputtext,
            :host ::ng-deep .p-datepicker,
            :host ::ng-deep .p-autocomplete,
            :host ::ng-deep .p-inputmask {
                width: 100%;
            }
            :host ::ng-deep .p-autocomplete .p-autocomplete-input {
                width: 100%;
            }
            :host ::ng-deep .p-datepicker .p-inputtext {
                width: 100%;
            }
            .field-with-btn {
                display: flex;
                align-items: flex-start;
                gap: 0.5rem;
            }
            .field-with-btn .flex-1 {
                flex: 1;
            }
            .code {
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
            }
            @media (max-width: 600px) {
                .form-row {
                    flex-direction: column;
                    gap: 0;
                }
                .form-field-half {
                    margin-bottom: 1.5rem;
                }
                .form-actions {
                    flex-direction: column;
                }
            }
        `
    ]
})
export class NewDoctor implements AfterViewInit {
    form: FormGroup;
    today = new Date();
    isSubmitting = false;

    // Dialog state
    addDeptVisible = false;
    addSpecVisible = false;
    newDept = '';
    newDeptCode = '';
    newSpec = '';
    newSpecCode = '';

    isSavingDept = false;
    isSavingSpec = false;

    // Unified bulk dialog state
    bulkVisible = false;
    bulkType: 'department' | 'specialization' = 'department';
    isUploadingBulk = false;
    bulkPreview: { name: string; code?: string }[] = [];
    bulkInvalid: any[] = [];

    genderOptions = [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' },
        { label: 'Non-binary', value: 'non-binary' },
        { label: 'Prefer not to say', value: 'prefer-not-to-say' }
    ];
    filteredGenderOptions: any[] = [];

    // Server-backed options
    filteredDepartmentOptions: Department[] = [];
    filteredSpecializationOptions: Specialization[] = [];
    statusOptions: string[] = ['senior', 'junior', 'under development', 'associate'];
    filteredStatusOptions: string[] = [];

    constructor(
        private fb: FormBuilder,
        private helpersService: HelpersService,
        private doctorService: DoctorsService,
        public ref: DynamicDialogRef
    ) {
        this.form = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(3)]],
            dob: ['', Validators.required],
            gender: ['', Validators.required],
            phone: ['', Validators.required],
            qid: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
            job: [''],
            insurance: ['', Validators.required],
            specialization: ['', Validators.required],
            department: ['', Validators.required],
            status: ['', Validators.required],
            hiringDate: [''] // ← added
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

    // Unified search for departments/specializations
    searchRefData(kind: 'department' | 'specialization', e: { query: string }) {
        const q = e?.query ?? '';
        const obs = kind === 'department' ? this.doctorService.searchDepartments(q) : this.doctorService.searchSpecializations(q);
        obs.subscribe({
            next: (items) => {
                if (kind === 'department') this.filteredDepartmentOptions = items || [];
                else this.filteredSpecializationOptions = items || [];
            },
            error: () => {
                if (kind === 'department') this.filteredDepartmentOptions = [];
                else this.filteredSpecializationOptions = [];
            }
        });
    }

    onDepartmentSelect(e: { value: Department }) {
        const name = e?.value?.name ?? '';
        this.form.get('department')?.setValue(name);
    }
    onDepartmentClear() {
        this.form.get('department')?.setValue('');
    }

    onSpecializationSelect(e: { value: Specialization }) {
        const name = e?.value?.name ?? '';
        this.form.get('specialization')?.setValue(name);
    }
    onSpecializationClear() {
        this.form.get('specialization')?.setValue('');
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
    // add above submit()
    sanitizePhone(x: any): string | null {
        if (typeof x !== 'string') return x ?? null;
        const s = x.trim();
        if (!s) return null;
        let sign = '';
        let body = s;
        if (body.startsWith('+')) {
            sign = '+';
            body = body.slice(1);
        }
        const digits = body.replace(/\D+/g, ''); // drops spaces, underscores, etc.
        return digits ? sign + digits : null;
    }

    submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.helpersService.notifyError('Validation Error', 'Please fill in all required fields correctly');
            return;
        }
        this.isSubmitting = true;

        const f = this.form.getRawValue();
        const lc = (x: any) => (typeof x === 'string' ? x.toLowerCase().trim() : (x ?? null));

        const payload: CreateUpdateDoctorRequest = {
            name: lc(f.name),
            dob: f.dob ? new Date(f.dob).toISOString() : null,
            gender: lc(f.gender),
            phone: this.sanitizePhone(f.phone),
            qid: lc(f.qid),
            job: lc(f.job),
            insurance: lc(f.insurance),
            department: lc(f.department),
            specialization: lc(f.specialization),
            status: lc(f.status),
            hiringDate: f.hiringDate ? new Date(f.hiringDate).toISOString() : null // ← added
        };

        this.doctorService.createDoctor(payload).subscribe({
            next: (res: any) => {
                this.isSubmitting = false;
                this.ref.close(res?.data ?? res);
            },
            error: (err) => {
                console.error('Error creating doctor:', err);
                this.helpersService.notifyError('Error', 'Failed to create doctor profile');
                this.isSubmitting = false;
            }
        });
    }

    reset(): void {
        this.form.reset(
            {
                name: '',
                dob: '',
                gender: '',
                phone: '',
                qid: '',
                job: '',
                insurance: '',
                specialization: '',
                department: '',
                status: '',
                hiringDate: '' // ← added
            },
            { emitEvent: false }
        );
        this.resetFormState();
        this.helpersService.notifyInfo('Form Reset', 'Form has been reset to initial state');
    }

    // ===== Dept dialog =====
    openAddDepartment() {
        this.newDept = '';
        this.newDeptCode = '';
        this.addDeptVisible = true;
    }

    saveDepartment() {
        const name = (this.newDept || '').trim();
        const code = (this.newDeptCode || '').trim();
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
                console.error('Error creating department:', err);
                this.helpersService.notifyError('Error', 'Failed to add department');
                this.isSavingDept = false;
            }
        });
    }

    // ===== Specialization dialog =====
    openAddSpec() {
        this.newSpec = '';
        this.newSpecCode = '';
        this.addSpecVisible = true;
    }

    saveSpecialization() {
        const name = (this.newSpec || '').trim();
        const code = (this.newSpecCode || '').trim() || undefined;
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
                console.error('Error creating specialization:', err);
                this.helpersService.notifyError('Error', 'Failed to add specialization');
                this.isSavingSpec = false;
            }
        });
    }

    // ===== Unified bulk flow =====
    openBulk(type: 'department' | 'specialization') {
        this.bulkType = type;
        this.bulkPreview = [];
        this.bulkInvalid = [];
        this.bulkVisible = true;
    }

    onBulkFiles(ev: FileSelectEvent) {
        const f = ev.files?.[0];
        if (!f) return;
        const codeOptional = this.bulkType === 'specialization';
        this.parseTwoColFile(f, codeOptional).then(({ ok, rows, invalid, error }) => {
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
                // refresh suggestions
                this.searchRefData(this.bulkType, { query: '' });
            },
            error: (err) => {
                console.error(err);
                this.helpersService.notifyError('Upload failed', `Could not import ${this.bulkType}s`);
                this.isUploadingBulk = false;
            }
        });
    }

    downloadTemplate(kind: 'department' | 'specialization') {
        const header = 'name,code\n';
        const blob = new Blob([header], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = kind === 'department' ? 'departments_template.csv' : 'specializations_template.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    // ===== Parser for CSV/XLSX with headers: name, code =====
    private async parseTwoColFile(file: File, codeOptional = false): Promise<{ ok: boolean; rows: any[]; invalid: any[]; error?: string }> {
        try {
            const ext = file.name.toLowerCase().split('.').pop() || '';
            if (ext === 'csv') {
                const text = await file.text();
                return this.parseCsvText(text, codeOptional);
            }
            if (ext === 'xlsx' || ext === 'xls') {
                const buf = await file.arrayBuffer();
                const XLSX = await import('xlsx'); // ensure `npm i xlsx`
                const wb = XLSX.read(buf, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json<any>(ws, { defval: '' });
                return this.normalizeRows(json, codeOptional);
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
            const codeRaw = r.code ?? r.Code ?? r.CODE ?? '';
            const code = codeRaw === undefined || codeRaw === null ? '' : String(codeRaw).trim();
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

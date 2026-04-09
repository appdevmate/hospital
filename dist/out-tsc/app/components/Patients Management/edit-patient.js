// import { Component, OnInit, AfterViewInit, inject } from '@angular/core';
// import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
// import { CommonModule } from '@angular/common';
// import { CardModule } from 'primeng/card';
// import { InputTextModule } from 'primeng/inputtext';
// import { DatePickerModule } from 'primeng/datepicker';
// import { AutoCompleteModule } from 'primeng/autocomplete';
// import { InputMaskModule } from 'primeng/inputmask';
// import { ButtonModule } from 'primeng/button';
// import { FloatLabelModule } from 'primeng/floatlabel';
// import { TextareaModule } from 'primeng/textarea';
// import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
// import { Fluid } from 'primeng/fluid';
import { __decorate } from "tslib";
// import { PatientsService, CreateUpdatePatientRequest, Patient } from '@/pages/service/patients.service';
// import { HelpersService } from '@/pages/service/helpers-service';
// @Component({
//     selector: 'app-edit-patient',
//     standalone: true,
//     imports: [CommonModule, ReactiveFormsModule, FormsModule, CardModule, InputTextModule, DatePickerModule, AutoCompleteModule, InputMaskModule, ButtonModule, FloatLabelModule, TextareaModule, Fluid],
//     providers: [HelpersService],
//     template: `
//         <div class="patient-form-container">
//             <p-card>
//                 <ng-template pTemplate="header">
//                     <div class="header flex items-center justify-between px-6 py-4">
//                         <div class="flex items-center gap-3">
//                             <i class="pi pi-user-edit text-primary" style="font-size: 2rem;"></i>
//                             <h3 class="text-xl font-semibold m-0">Edit Patient</h3>
//                         </div>
//                         <p-button icon="pi pi-times" text severity="secondary" pTooltip="Close" (click)="ref.close()"></p-button>
//                     </div>
//                 </ng-template>
//                 <form [formGroup]="form" (ngSubmit)="submit()" class="form-content" autocomplete="off">
//                     <!-- Personal Information -->
//                     <div class="mb-6">
//                         <h4 class="section-title">Personal Information</h4>
//                         <div class="mb-4">
//                             <p-floatLabel variant="on">
//                                 <input pInputText id="name" formControlName="name" autocomplete="off" [class.p-invalid]="invalid('name')" class="w-full" />
//                                 <label for="name"><i class="pi pi-user"></i> Full Name *</label>
//                             </p-floatLabel>
//                             @if (invalid('name')) {
//                                 <small class="p-error">Valid name is required</small>
//                             }
//                         </div>
//                         <div class="mb-4">
//                             <p-floatLabel variant="on">
//                                 <input pInputText id="email" type="email" formControlName="email" autocomplete="off" class="w-full" [class.p-invalid]="invalid('email')" />
//                                 <label for="email"><i class="pi pi-envelope"></i> Email Address</label>
//                             </p-floatLabel>
//                             @if (invalid('email')) {
//                                 <small class="p-error">Valid email is required</small>
//                             }
//                         </div>
//                         <p-fluid class="flex flex-wrap gap-4 mb-4">
//                             <div class="flex-1 md:flex-[2]">
//                                 <p-floatLabel variant="on">
//                                     <p-inputMask inputId="qid" formControlName="qid" mask="99999999999" [unmask]="true" [slotChar]="' '" inputmode="numeric" styleClass="w-full"></p-inputMask>
//                                     <label for="qid"><i class="pi pi-id-card"></i> Qatar ID</label>
//                                 </p-floatLabel>
//                             </div>
//                             <div class="flex-1 md:flex-[1.5]">
//                                 <p-floatLabel variant="on">
//                                     <p-inputMask inputId="phone" formControlName="phone" mask="+999 9999 9999" styleClass="w-full"></p-inputMask>
//                                     <label for="phone"><i class="pi pi-phone"></i> Phone Number</label>
//                                 </p-floatLabel>
//                             </div>
//                             <div class="flex-1 md:flex-[1.5]">
//                                 <p-floatLabel variant="on">
//                                     <p-autoComplete
//                                         inputId="gender"
//                                         formControlName="gender"
//                                         [suggestions]="filteredGenderOptions"
//                                         (completeMethod)="filterGender($event)"
//                                         field="label"
//                                         [optionValue]="'value'"
//                                         [forceSelection]="true"
//                                         [dropdown]="true"
//                                         [readonly]="true"
//                                         styleClass="w-full"
//                                         autocomplete="off"
//                                     >
//                                         <ng-template pTemplate="item" let-option>
//                                             <div class="flex items-center gap-2">
//                                                 <i class="pi" [class]="getGenderIcon(option.value)"></i>
//                                                 <span>{{ option.label }}</span>
//                                             </div>
//                                         </ng-template>
//                                     </p-autoComplete>
//                                     <label for="gender"><i class="pi pi-venus-mars"></i> Gender</label>
//                                 </p-floatLabel>
//                             </div>
//                         </p-fluid>
//                         <p-fluid class="flex flex-wrap gap-4 mb-4">
//                             <div class="flex-1 md:flex-[1.5]">
//                                 <p-floatLabel variant="on">
//                                     <p-datepicker inputId="dob" formControlName="dob" [showIcon]="true" dateFormat="dd/MM/yy" [maxDate]="today" [showOnFocus]="false" [readonlyInput]="true" class="w-full"></p-datepicker>
//                                     <label for="dob"><i class="pi pi-calendar"></i> Date of Birth</label>
//                                 </p-floatLabel>
//                             </div>
//                             <div class="flex-1 md:flex-[1.5]">
//                                 <p-floatLabel variant="on">
//                                     <p-datepicker inputId="admissionDate" formControlName="admissionDate" [showIcon]="true" dateFormat="dd/MM/yy" [maxDate]="today" [showOnFocus]="false" [readonlyInput]="true" class="w-full"></p-datepicker>
//                                     <label for="admissionDate"><i class="pi pi-calendar"></i> Admission Date</label>
//                                 </p-floatLabel>
//                             </div>
//                             <div class="flex-1 md:flex-[2]">
//                                 <p-floatLabel variant="on">
//                                     <input pInputText id="insurance" formControlName="insurance" autocomplete="off" class="w-full" />
//                                     <label for="insurance"><i class="pi pi-shield"></i> Insurance</label>
//                                 </p-floatLabel>
//                             </div>
//                         </p-fluid>
//                     </div>
//                     <!-- Medical Information -->
//                     <div class="mb-6">
//                         <h4 class="section-title">Medical Information</h4>
//                         <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
//                             <div>
//                                 <p-floatLabel variant="on">
//                                     <input pInputText id="department" formControlName="department" autocomplete="off" class="w-full" />
//                                     <label for="department"><i class="pi pi-sitemap"></i> Department</label>
//                                 </p-floatLabel>
//                             </div>
//                             <div>
//                                 <p-floatLabel variant="on">
//                                     <input pInputText id="specialization" formControlName="specialization" autocomplete="off" class="w-full" />
//                                     <label for="specialization"><i class="pi pi-sparkles"></i> Specialization</label>
//                                 </p-floatLabel>
//                             </div>
//                         </div>
//                         <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
//                             <div>
//                                 <p-floatLabel variant="on">
//                                     <p-autoComplete
//                                         inputId="status"
//                                         formControlName="status"
//                                         [suggestions]="filteredStatusOptions"
//                                         (completeMethod)="filterStatus($event)"
//                                         [forceSelection]="true"
//                                         [dropdown]="true"
//                                         [readonly]="true"
//                                         styleClass="w-full"
//                                         autocomplete="off"
//                                     >
//                                         <ng-template pTemplate="item" let-option>
//                                             <span>{{ option }}</span>
//                                         </ng-template>
//                                     </p-autoComplete>
//                                     <label for="status"><i class="pi pi-badge"></i> Status</label>
//                                 </p-floatLabel>
//                             </div>
//                             <div>
//                                 <p-floatLabel variant="on">
//                                     <input pInputText id="bedNumber" formControlName="bedNumber" autocomplete="off" class="w-full" />
//                                     <label for="bedNumber"><i class="pi pi-home"></i> Bed Number</label>
//                                 </p-floatLabel>
//                             </div>
//                         </div>
//                         <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
//                             <div>
//                                 <p-floatLabel variant="on">
//                                     <input pInputText id="ward" formControlName="ward" autocomplete="off" class="w-full" />
//                                     <label for="ward"><i class="pi pi-building"></i> Ward</label>
//                                 </p-floatLabel>
//                             </div>
//                         </div>
//                     </div>
//                     <!-- Health Details -->
//                     <div class="mb-6">
//                         <h4 class="section-title">Health Details</h4>
//                         <div class="mb-4">
//                             <p-floatLabel variant="on">
//                                 <p-autoComplete
//                                     inputId="bloodGroup"
//                                     formControlName="bloodGroup"
//                                     [suggestions]="filteredBloodGroupOptions"
//                                     (completeMethod)="filterBloodGroup($event)"
//                                     [forceSelection]="true"
//                                     [dropdown]="true"
//                                     [readonly]="true"
//                                     styleClass="w-full"
//                                     autocomplete="off"
//                                 >
//                                     <ng-template pTemplate="item" let-option>
//                                         <span>{{ option }}</span>
//                                     </ng-template>
//                                 </p-autoComplete>
//                                 <label for="bloodGroup"><i class="pi pi-heart"></i> Blood Group</label>
//                             </p-floatLabel>
//                         </div>
//                         <div class="mb-4">
//                             <p-floatLabel variant="on">
//                                 <textarea pTextarea id="medicalHistory" formControlName="medicalHistory" autocomplete="off" class="w-full" rows="3"></textarea>
//                                 <label for="medicalHistory"><i class="pi pi-file-edit"></i> Medical History</label>
//                             </p-floatLabel>
//                         </div>
//                         <div class="mb-4">
//                             <label class="block text-sm font-medium mb-2 text-surface-400"> <i class="pi pi-exclamation-triangle mr-1 text-red-500"></i> Allergies </label>
//                             <p-autoComplete formControlName="allergies" [multiple]="true" [typeahead]="false" [addOnBlur]="true" placeholder="Type and press Enter" styleClass="w-full" />
//                             <small class="text-surface-400">Type each allergy and press Enter to add</small>
//                         </div>
//                         <div class="mb-4">
//                             <label class="block text-sm font-medium mb-2 text-surface-400"> <i class="pi pi-plus-circle mr-1 text-blue-500"></i> Current Medications </label>
//                             <p-autoComplete formControlName="medications" [multiple]="true" [typeahead]="false" [addOnBlur]="true" placeholder="Type and press Enter" styleClass="w-full" />
//                             <small class="text-surface-400">Type each medication and press Enter to add</small>
//                         </div>
//                     </div>
//                     <!-- Notes -->
//                     <div class="mb-6">
//                         <h4 class="section-title">Notes</h4>
//                         <div class="mb-4">
//                             <p-floatLabel variant="on">
//                                 <input pInputText id="notes" formControlName="notes" autocomplete="off" class="w-full" />
//                                 <label for="notes"><i class="pi pi-file-edit"></i> Notes</label>
//                             </p-floatLabel>
//                         </div>
//                     </div>
//                     <!-- Actions -->
//                     <div class="flex justify-end gap-3 pt-4 border-t">
//                         <p-button type="button" label="Close" icon="pi pi-times" severity="secondary" (click)="ref.close()"></p-button>
//                         <p-button type="submit" label="Save Changes" icon="pi pi-save" [loading]="isSubmitting"></p-button>
//                     </div>
//                 </form>
//             </p-card>
//         </div>
//     `,
//     styles: [
//         `
//             .section-title {
//                 color: #10b981;
//                 font-size: 1.1rem;
//                 font-weight: 600;
//                 margin-bottom: 1rem;
//                 padding-bottom: 0.5rem;
//                 border-bottom: 1px solid var(--p-surface-200);
//             }
//             .header {
//                 background: var(--p-primary-50);
//             }
//         `
//     ]
// })
// export class EditPatient implements OnInit, AfterViewInit {
//     // ── Services ──────────────────────────────────────────────────────────
//     private fb = inject(FormBuilder);
//     private helpersService = inject(HelpersService);
//     private patientService = inject(PatientsService);
//     private dialogConfig = inject(DynamicDialogConfig);
//     ref = inject(DynamicDialogRef);
//     // ── State ─────────────────────────────────────────────────────────────
//     form: FormGroup;
//     today = new Date();
//     isSubmitting = false;
//     patient: Patient | null = null;
//     genderOptions = [
//         { label: 'Male', value: 'male' },
//         { label: 'Female', value: 'female' }
//     ];
//     filteredGenderOptions: any[] = [];
//     statusOptions: string[] = ['admitted', 'stable', 'under treatment', 'discharged', 'critical', 'dead'];
//     filteredStatusOptions: string[] = [];
//     bloodGroupOptions: string[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
//     filteredBloodGroupOptions: string[] = [];
//     constructor() {
//         this.form = this.fb.group({
//             name: ['', [Validators.required, Validators.minLength(3)]],
//             email: ['', [Validators.email]],
//             dob: [null],
//             gender: [''],
//             phone: [''],
//             qid: [''],
//             insurance: [''],
//             admissionDate: [null],
//             department: [''],
//             specialization: [''],
//             status: [''],
//             bedNumber: [''],
//             ward: [''],
//             medicalHistory: [''],
//             allergies: [[]],
//             medications: [[]],
//             notes: [''],
//             bloodGroup: ['']
//         });
//     }
//     ngOnInit() {
//         this.patient = this.dialogConfig.data?.patient as Patient;
//         if (this.patient) this.populateForm(this.patient);
//     }
//     ngAfterViewInit() {
//         setTimeout(() => {
//             const el = document.activeElement as HTMLElement | null;
//             if (el && typeof el.blur === 'function') el.blur();
//         }, 0);
//     }
//     // ── Form population ───────────────────────────────────────────────────
//     private populateForm(p: Patient) {
//         this.form.patchValue({
//             name: p.name || '',
//             email: p.email || '',
//             dob: p.dob ? new Date(p.dob) : null,
//             gender: p.gender || '',
//             phone: p.phone || '',
//             qid: p.qid || '',
//             insurance: p.insurance || '',
//             admissionDate: p.admissionDate ? new Date(p.admissionDate) : null,
//             department: p.department || '',
//             specialization: p.specialization || '',
//             status: p.status || '',
//             bedNumber: p.bedNumber || '',
//             ward: p.ward || '',
//             medicalHistory: p.medicalHistory || '',
//             allergies: Array.isArray(p.allergies) ? p.allergies : p.allergies ? [p.allergies] : [],
//             medications: Array.isArray(p.medications) ? p.medications : p.medications ? [p.medications] : [],
//             notes: p.notes || '',
//             bloodGroup: p.bloodGroup || ''
//         });
//     }
//     // ── Autocomplete ──────────────────────────────────────────────────────
//     filterGender(event: any): void {
//         const q = String(event?.query || '').toLowerCase();
//         this.filteredGenderOptions = this.genderOptions.filter((o) => o.label.toLowerCase().includes(q));
//     }
//     filterStatus(e: { query: string }) {
//         const q = (e?.query || '').toLowerCase();
//         this.filteredStatusOptions = this.statusOptions.filter((x) => x.toLowerCase().includes(q));
//     }
//     filterBloodGroup(e: { query: string }) {
//         const q = (e?.query || '').toLowerCase();
//         this.filteredBloodGroupOptions = this.bloodGroupOptions.filter((x) => x.toLowerCase().includes(q));
//     }
//     // ── Validation ────────────────────────────────────────────────────────
//     invalid(field: string): boolean {
//         const c = this.form.get(field);
//         return !!c && c.invalid && (c.dirty || c.touched);
//     }
//     getGenderIcon(gender: string): string {
//         const map: Record<string, string> = {
//             male: 'pi-mars',
//             female: 'pi-venus'
//         };
//         return map[gender] || 'pi-user';
//     }
//     // ── Submit ────────────────────────────────────────────────────────────
//     submit() {
//         if (this.form.invalid) {
//             this.form.markAllAsTouched();
//             this.helpersService.notifyError('Validation Error', 'Please fix the errors before saving');
//             return;
//         }
//         if (!this.patient?.PK) {
//             this.helpersService.notifyError('Error', 'Patient ID missing');
//             return;
//         }
//         this.isSubmitting = true;
//         const f = this.form.getRawValue();
//         const lc = (x: any) => (typeof x === 'string' ? x.toLowerCase().trim() : (x ?? null));
//         const id = this.patient.PK.includes('#') ? this.patient.PK.split('#')[1] : this.patient.PK;
//         const payload: CreateUpdatePatientRequest = {
//             name: lc(f.name) ?? '',
//             email: lc(f.email) ?? '',
//             dob: f.dob ? new Date(f.dob).toISOString().slice(0, 10) : '',
//             gender: lc(f.gender) ?? '',
//             phone: this.sanitizePhone(f.phone),
//             qid: lc(f.qid),
//             insurance: lc(f.insurance),
//             admissionDate: f.admissionDate ? new Date(f.admissionDate).toISOString().slice(0, 10) : null,
//             department: lc(f.department),
//             specialization: lc(f.specialization),
//             status: lc(f.status),
//             bedNumber: f.bedNumber ? f.bedNumber.trim() : null,
//             ward: f.ward ? f.ward.trim() : null,
//             medicalHistory: f.medicalHistory ? f.medicalHistory.trim() : null,
//             allergies: Array.isArray(f.allergies) ? f.allergies : [],
//             medications: Array.isArray(f.medications) ? f.medications : [],
//             notes: f.notes ? f.notes.trim() : null,
//             bloodGroup: f.bloodGroup ? f.bloodGroup.trim() : null
//         };
//         this.patientService.updatePatient(id, payload).subscribe({
//             next: (res: any) => {
//                 this.isSubmitting = false;
//                 this.helpersService.notifySuccess('Patient updated successfully');
//                 this.ref.close(res?.data ?? res);
//             },
//             error: (err) => {
//                 this.isSubmitting = false;
//                 if (err?.error?.message === 'Unauthorized') {
//                     this.helpersService.redirectToLogin();
//                     return;
//                 }
//                 this.helpersService.notifyError('Error', err?.error?.message || 'Failed to update patient');
//             }
//         });
//     }
//     // ── Private helpers ───────────────────────────────────────────────────
//     private sanitizePhone(x: any): string | undefined {
//         if (typeof x !== 'string') return undefined;
//         const s = x.trim();
//         if (!s) return undefined;
//         const sign = s.startsWith('+') ? '+' : '';
//         const digits = s.slice(sign ? 1 : 0).replace(/\D+/g, '');
//         return digits ? sign + digits : undefined;
//     }
// }
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { InputMaskModule } from 'primeng/inputmask';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TextareaModule } from 'primeng/textarea';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { Fluid } from 'primeng/fluid';
import { PatientsService } from '@/pages/service/patients.service';
import { HelpersService } from '@/pages/service/helpers-service';
let EditPatient = class EditPatient {
    fb = inject(FormBuilder);
    helpersService = inject(HelpersService);
    patientService = inject(PatientsService);
    dialogConfig = inject(DynamicDialogConfig);
    ref = inject(DynamicDialogRef);
    form;
    today = new Date();
    isSubmitting = false;
    patient = null;
    genderOptions = [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' }
    ];
    filteredGenderOptions = [];
    statusOptions = ['admitted', 'stable', 'under treatment', 'discharged', 'critical', 'dead'];
    filteredStatusOptions = [];
    bloodGroupOptions = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    filteredBloodGroupOptions = [];
    constructor() {
        this.form = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(3)]],
            email: ['', [Validators.email]], // optional
            dob: [null],
            gender: [''],
            phone: [''],
            qid: [''],
            insurance: [''],
            status: [''],
            bedNumber: [''],
            ward: [''],
            medicalHistory: [''],
            allergies: [[]],
            medications: [[]],
            notes: [''],
            bloodGroup: ['']
            // department, specialization, admissionDate removed
        });
    }
    ngOnInit() {
        this.patient = this.dialogConfig.data?.patient;
        if (this.patient)
            this.populateForm(this.patient);
    }
    ngAfterViewInit() {
        setTimeout(() => {
            const el = document.activeElement;
            if (el && typeof el.blur === 'function')
                el.blur();
        }, 0);
    }
    populateForm(p) {
        this.form.patchValue({
            name: p.name || '',
            email: p.email || '',
            dob: p.dob ? new Date(p.dob) : null,
            gender: p.gender || '',
            phone: p.phone || '',
            qid: p.qid || '',
            insurance: p.insurance || '',
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
    filterGender(event) {
        const q = String(event?.query || '').toLowerCase();
        this.filteredGenderOptions = this.genderOptions.filter((o) => o.label.toLowerCase().includes(q));
    }
    filterStatus(e) {
        const q = (e?.query || '').toLowerCase();
        this.filteredStatusOptions = this.statusOptions.filter((x) => x.toLowerCase().includes(q));
    }
    filterBloodGroup(e) {
        const q = (e?.query || '').toLowerCase();
        this.filteredBloodGroupOptions = this.bloodGroupOptions.filter((x) => x.toLowerCase().includes(q));
    }
    invalid(field) {
        const c = this.form.get(field);
        return !!c && c.invalid && (c.dirty || c.touched);
    }
    getGenderIcon(gender) {
        return { male: 'pi-mars', female: 'pi-venus' }[gender] || 'pi-user';
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
        const lc = (x) => (typeof x === 'string' ? x.toLowerCase().trim() : (x ?? null));
        const id = this.patient.PK.includes('#') ? this.patient.PK.split('#')[1] : this.patient.PK;
        const payload = {
            name: lc(f.name) ?? '',
            email: f.email ? lc(f.email) : null,
            dob: f.dob ? new Date(f.dob).toISOString().slice(0, 10) : '',
            gender: lc(f.gender) ?? '',
            phone: this.sanitizePhone(f.phone),
            qid: lc(f.qid),
            insurance: lc(f.insurance),
            status: lc(f.status),
            bedNumber: f.bedNumber ? f.bedNumber.trim() : null,
            ward: f.ward ? f.ward.trim() : null,
            medicalHistory: f.medicalHistory ? f.medicalHistory.trim() : null,
            allergies: Array.isArray(f.allergies) ? f.allergies : [],
            medications: Array.isArray(f.medications) ? f.medications : [],
            notes: f.notes ? f.notes.trim() : null,
            bloodGroup: f.bloodGroup ? f.bloodGroup.trim() : null
        };
        this.patientService.updatePatient(id, payload).subscribe({
            next: (res) => {
                this.isSubmitting = false;
                this.helpersService.notifySuccess('Patient updated successfully');
                this.ref.close(res?.data ?? res);
            },
            error: (err) => {
                this.isSubmitting = false;
                if (err?.error?.message === 'Unauthorized') {
                    this.helpersService.redirectToLogin();
                    return;
                }
                this.helpersService.notifyError('Error', err?.error?.message || 'Failed to update patient');
            }
        });
    }
    sanitizePhone(x) {
        if (typeof x !== 'string')
            return undefined;
        const s = x.trim();
        if (!s)
            return undefined;
        const sign = s.startsWith('+') ? '+' : '';
        const digits = s.slice(sign ? 1 : 0).replace(/\D+/g, '');
        return digits ? sign + digits : undefined;
    }
};
EditPatient = __decorate([
    Component({
        selector: 'app-edit-patient',
        standalone: true,
        imports: [CommonModule, ReactiveFormsModule, FormsModule, CardModule, InputTextModule, DatePickerModule, AutoCompleteModule, InputMaskModule, ButtonModule, FloatLabelModule, TextareaModule, Fluid],
        providers: [HelpersService],
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
                        <h4 class="section-title">Personal Information</h4>

                        <div class="mb-4">
                            <p-floatLabel variant="on">
                                <input pInputText id="name" formControlName="name" autocomplete="off" [class.p-invalid]="invalid('name')" class="w-full" />
                                <label for="name"><i class="pi pi-user"></i> Full Name *</label>
                            </p-floatLabel>
                            @if (invalid('name')) {
                                <small class="p-error">Valid name is required</small>
                            }
                        </div>

                        <!-- email optional -->
                        <div class="mb-4">
                            <p-floatLabel variant="on">
                                <input pInputText id="email" type="email" formControlName="email" autocomplete="off" class="w-full" [class.p-invalid]="invalid('email')" />
                                <label for="email"><i class="pi pi-envelope"></i> Email Address</label>
                            </p-floatLabel>
                            @if (invalid('email')) {
                                <small class="p-error">Enter a valid email address</small>
                            }
                        </div>

                        <p-fluid class="flex flex-wrap gap-4 mb-4">
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

                        <p-fluid class="flex flex-wrap gap-4 mb-4">
                            <div class="flex-1 md:flex-[1.5]">
                                <p-floatLabel variant="on">
                                    <p-datepicker inputId="dob" formControlName="dob" [showIcon]="true" dateFormat="dd/MM/yy" [maxDate]="today" [showOnFocus]="false" [readonlyInput]="true" class="w-full"></p-datepicker>
                                    <label for="dob"><i class="pi pi-calendar"></i> Date of Birth</label>
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
                        <h4 class="section-title">Medical Information</h4>

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
                        <h4 class="section-title">Health Details</h4>

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
                            <label class="block text-sm font-medium mb-2 text-surface-400"> <i class="pi pi-exclamation-triangle mr-1 text-red-500"></i> Allergies </label>
                            <p-autoComplete formControlName="allergies" [multiple]="true" [typeahead]="false" [addOnBlur]="true" placeholder="Type and press Enter" styleClass="w-full" />
                            <small class="text-surface-400">Type each allergy and press Enter to add</small>
                        </div>

                        <div class="mb-4">
                            <label class="block text-sm font-medium mb-2 text-surface-400"> <i class="pi pi-plus-circle mr-1 text-blue-500"></i> Current Medications </label>
                            <p-autoComplete formControlName="medications" [multiple]="true" [typeahead]="false" [addOnBlur]="true" placeholder="Type and press Enter" styleClass="w-full" />
                            <small class="text-surface-400">Type each medication and press Enter to add</small>
                        </div>
                    </div>

                    <!-- Notes -->
                    <div class="mb-6">
                        <h4 class="section-title">Notes</h4>
                        <div class="mb-4">
                            <p-floatLabel variant="on">
                                <input pInputText id="notes" formControlName="notes" autocomplete="off" class="w-full" />
                                <label for="notes"><i class="pi pi-file-edit"></i> Notes</label>
                            </p-floatLabel>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex justify-end gap-3 pt-4 border-t">
                        <p-button type="button" label="Close" icon="pi pi-times" severity="secondary" (click)="ref.close()"></p-button>
                        <p-button type="submit" label="Save Changes" icon="pi pi-save" [loading]="isSubmitting"></p-button>
                    </div>
                </form>
            </p-card>
        </div>
    `,
        styles: [
            `
            .section-title {
                color: #10b981;
                font-size: 1.1rem;
                font-weight: 600;
                margin-bottom: 1rem;
                padding-bottom: 0.5rem;
                border-bottom: 1px solid var(--p-surface-200);
            }
            .header {
                background: var(--p-primary-50);
            }
        `
        ]
    })
], EditPatient);
export { EditPatient };

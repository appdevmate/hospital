import { Component, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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

import { Helpers } from '../../services/helpers';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { PatientsService } from '@/pages/service/patients.service';

@Component({
  selector: 'app-new-patient',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    InputTextModule,
    DatePickerModule,
    AutoCompleteModule,
    InputMaskModule,
    ButtonModule,
    ToastModule,
    FloatLabelModule
  ],
  providers: [Helpers],
  template: `
    <div class="patient-form-container">
      <p-card>
        <ng-template pTemplate="header">
  <div class="form-header">
    <div class="title">
      <i class="pi pi-user-plus"></i>
      <h3>New Patient</h3>
    </div>
    <p-button
      icon="pi pi-times"
      text
      severity="secondary"
      pTooltip="Close"
      (click)="ref.close()">
    </p-button>
  </div>
</ng-template>


        <form [formGroup]="form" (ngSubmit)="submit()" class="form-content" autocomplete="off">
  <!-- Name -->
  <div class="form-field">
    <p-floatlabel variant="on">
      <input
        pInputText
        id="name"
        formControlName="name"
        autocomplete="off"
        [class.p-invalid]="invalid('name')"
        class="w-full" />
      <label for="name"><i class="pi pi-user"></i> Enter Full Name</label>
    </p-floatlabel>
  </div>

  <!-- DOB and Gender -->
  <div class="form-row">
    <div class="form-field form-field-half">
      <p-floatlabel variant="on">
        <p-datepicker
          id="dob"
          formControlName="dob"
          [showIcon]="true"
          dateFormat="dd/MM/yy"
          [maxDate]="today"
          [showOnFocus]="false"
          [class.p-invalid]="invalid('dob')"
          [readonlyInput]="true" 
          styleClass="w-full" />
        <label for="dob"><i class="pi pi-calendar"></i> Date of Birth</label>
      </p-floatlabel>
      <small class="p-error" *ngIf="invalid('dob')">Date of birth is required</small>
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
          autocomplete="off">
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

  <!-- Phone -->
  <div class="form-field">
    <p-floatlabel variant="on">
      <p-inputMask
        id="phone"
        formControlName="phone"
        mask="+999 9999 9999"
        styleClass="w-full"
        inputId="phone" />
      <label for="phone"><i class="pi pi-phone"></i> Phone Number *</label>
    </p-floatlabel>
    <small class="p-error" *ngIf="validatePhoneNumber('phone')">Valid phone number is required</small>
  </div>

  <!-- Job and Insurance -->
  <div class="form-row">
    <div class="form-field form-field-half">
      <p-floatlabel variant="on">
        <input
          id="job"
          pInputText
          formControlName="job"
          autocomplete="off"
          class="w-full" />
        <label for="job"><i class="pi pi-briefcase"></i> Job</label>
      </p-floatlabel>
    </div>

    <div class="form-field form-field-half">
      <p-floatlabel variant="on">
        <input
          id="insurance"
          pInputText
          formControlName="insurance"
          autocomplete="off"
          [class.p-invalid]="invalid('insurance')"
          class="w-full" />
        <label for="insurance"><i class="pi pi-shield"></i> Insurance *</label>
      </p-floatlabel>
      <small class="p-error" *ngIf="invalid('insurance')">Insurance is required</small>
    </div>
  </div>

  <!-- QID -->
  <div class="form-field">
    <p-floatlabel variant="on">
      <input
        id="qid"
        pInputText
        formControlName="qid"
        autocomplete="off"
        [class.p-invalid]="validateQID('qid')"
        class="w-full" />
      <label for="qid"><i class="pi pi-id-card"></i> Qatar ID</label>
    </p-floatlabel>
    <small class="p-error" *ngIf="validateQID('qid')">Use numbers only (11-digit)</small>
  </div>

  <!-- Actions -->
  <div class="form-actions">
  <p-button
    type="button"
    label="Close"
    icon="pi pi-times"
    severity="secondary"
    (click)="ref.close()">
  </p-button>

  <p-button
    type="button"
    label="Reset"
    icon="pi pi-refresh"
    severity="secondary"
    [outlined]="true"
    (click)="reset()">
  </p-button>

  <p-button
    type="submit"
    label="Save Patient"
    icon="pi pi-save"
    [disabled]="form.invalid"
    [loading]="isSubmitting">
  </p-button>
</div>

</form>

      </p-card>
    </div>
  `,
  styles: [`
    .patient-form-container { width: 100%; max-width: 100%; }
    .form-header { display:flex; align-items:center; gap:0.5rem; padding:1rem 1.5rem; background:var(--p-primary-50); border-bottom:1px solid var(--p-surface-border); }
    .form-header i { color:var(--p-primary-500); font-size:1.25rem; }
    .form-header h3 { margin:0; color:var(--p-text-color); font-weight:600; }
    .form-content { padding:1.5rem; }
    .form-field { margin-bottom:1.5rem; }
    .form-row { display:flex; gap:1rem; margin-bottom:1.5rem; }
    .form-field-half { flex:1; margin-bottom:0; }
    .p-error { display:block; margin-top:0.25rem; font-size:0.875rem; color:var(--p-red-500); }
    .gender-item { display:flex; align-items:center; gap:0.5rem; }
    .form-actions { display:flex; gap:0.75rem; justify-content:flex-end; margin-top:2rem; padding-top:1rem; border-top:1px solid var(--p-surface-border); }
    .form-header { justify-content: space-between; }
    .form-header .title { display: flex; align-items: center; gap: .5rem; }
    :host ::ng-deep .p-inputtext,
    :host ::ng-deep .p-datepicker,
    :host ::ng-deep .p-autocomplete,
    :host ::ng-deep .p-inputmask { width:100%; }
    :host ::ng-deep .p-autocomplete .p-autocomplete-input { width:100%; }
    :host ::ng-deep .p-datepicker .p-inputtext { width:100%; }
    @media (max-width: 600px) {
      .form-row { flex-direction:column; gap:0; }
      .form-field-half { margin-bottom:1.5rem; }
      .form-actions { flex-direction:column; }
    }
  `]
})
export class NewPatient implements AfterViewInit {
  form: FormGroup;
  today = new Date();
  isSubmitting = false;

  genderOptions = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Non-binary', value: 'non-binary' },
    { label: 'Prefer not to say', value: 'prefer-not-to-say' }
  ];
  filteredGenderOptions: any[] = [];

  constructor(
    private fb: FormBuilder,
    private helpersFunctions: Helpers,
    private patientService: PatientsService,
    public ref: DynamicDialogRef
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      dob: ['', Validators.required],
      gender: ['', Validators.required],
      phone: ['', Validators.required],
      qid: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
      job: [''],
      insurance: ['', Validators.required]
    });

    // ensure pristine + untouched on init
    this.resetFormState();
  }

  ngAfterViewInit(): void {
    // blur any auto-focused element (dialogs or browser)
    setTimeout(() => {
      const el = document.activeElement as HTMLElement | null;
      if (el && typeof el.blur === 'function') el.blur();
    }, 0);
  }

  private resetFormState(): void {
    // guard against autofill marking controls dirty on load
    this.form.reset(this.form.getRawValue(), { emitEvent: false });
    Object.values(this.form.controls).forEach(c => {
      c.markAsPristine();
      c.markAsUntouched();
      c.updateValueAndValidity({ onlySelf: true, emitEvent: false });
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  filterGender(event: any): void {
    const q = String(event?.query || '').toLowerCase();
    this.filteredGenderOptions = this.genderOptions.filter(o => o.label.toLowerCase().includes(q));
  }

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
      case 'male': return 'pi-mars';
      case 'female': return 'pi-venus';
      case 'non-binary': return 'pi-circle';
      case 'prefer-not-to-say': return 'pi-question-circle';
      default: return 'pi-user';
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.helpersFunctions.notifyError('Validation Error', 'Please fill in all required fields correctly');
      return;
    }

    this.isSubmitting = true;

    this.patientService.createPatient(this.form.value).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        this.ref.close(res?.data ?? res);
      },
      error: (err) => {
        console.error('Error creating patient:', err);
        this.helpersFunctions.notifyError('Error', 'Failed to create patient profile');
        this.isSubmitting = false;
      }
    });
  }

  reset(): void {
    this.form.reset({
      name: '',
      dob: '',
      gender: '',
      phone: '',
      qid: '',
      job: '',
      insurance: ''
    }, { emitEvent: false });
    this.resetFormState();
    this.helpersFunctions.notifyInfo('Form Reset', 'Form has been reset to initial state');
  }
}

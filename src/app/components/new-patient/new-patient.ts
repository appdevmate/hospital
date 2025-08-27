import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

// PrimeNG v20 Imports
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { InputMaskModule } from 'primeng/inputmask';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { Helpers } from '../../services/helpers';
import { PatientService } from '../../../app/pages/service/patients.service';
import { Patient } from '../../pages/service/patients.service';
import { DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-new-patient',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    InputTextModule,
    DatePickerModule,
    AutoCompleteModule,
    InputMaskModule,
    ButtonModule,
    ToastModule
  ],
  providers: [Helpers],
  template: `
    <div class="patient-form-container">
      <p-card>
        <ng-template pTemplate="header">
          <div class="form-header">
            <i class="pi pi-user-plus"></i>
            <h3>New Patient</h3>
          </div>
        </ng-template>

        <form [formGroup]="form" (ngSubmit)="submit()" class="form-content">
          <!-- Name -->
          <div class="form-field">
            <label for="name" class="field-label">
              <i class="pi pi-user"></i>
              Full Name *
            </label>
            <input 
              id="name"
              pInputText 
              formControlName="name" 
              placeholder="Enter patient's full name"
              [class.p-invalid]="invalid('name')"
              class="w-full" />
            <small class="p-error" *ngIf="invalid('name')">
              Full name is required (min 3 characters)
            </small>
          </div>

          <!-- DOB and Gender Row -->
          <div class="form-row">
            <div class="form-field form-field-half">
              <label for="dob" class="field-label">
                <i class="pi pi-calendar"></i>
                Date of Birth *
              </label>
              <p-datepicker 
                inputId="dob"
                formControlName="dob" 
                [showIcon]="true" 
                placeholder="Select date"
                dateFormat="dd/mm/yy"
                [maxDate]="today"
                [showOnFocus]="false"
                [class.p-invalid]="invalid('dob')"
                styleClass="w-full" />
              <small class="p-error" *ngIf="invalid('dob')">
                Date of birth is required
              </small>
            </div>

            <div class="form-field form-field-half">
              <label for="gender" class="field-label">
                <i class="pi pi-venus-mars"></i>
                Gender *
              </label>
              <p-autocomplete
                inputId="gender"
                formControlName="gender"
                [suggestions]="filteredGenderOptions"
                (completeMethod)="filterGender($event)"
                field="label"
                [forceSelection]="true"
                [dropdown]="true"
                placeholder="Select gender"
                [class.p-invalid]="invalid('gender')"
                styleClass="w-full">
                <ng-template pTemplate="item" let-option>
                  <div class="gender-item">
                    <i class="pi" [class]="getGenderIcon(option.value)"></i>
                    <span>{{ option.label }}</span>
                  </div>
                </ng-template>
              </p-autocomplete>
              <small class="p-error" *ngIf="invalid('gender')">
                Please select a gender
              </small>
            </div>
          </div>

          <!-- Phone -->
          <div class="form-field">
            <label for="phone" class="field-label">
              <i class="pi pi-phone"></i>
              Phone Number *
            </label>
            <p-inputMask 
              id="phone"
              formControlName="phone" 
              mask="+999 9999 9999" 
              placeholder="+974 5xxx xxxx"
              [class.p-invalid]="validatePhoneNumber('phone')"
              styleClass="w-full" />
            <small class="p-error" *ngIf="validatePhoneNumber('phone')">
              Valid phone number is required
            </small>
          </div>

          <!-- Job and Insurance Row -->
          <div class="form-row">
            <div class="form-field form-field-half">
              <label for="job" class="field-label">
                <i class="pi pi-briefcase"></i>
                Job
              </label>
              <input 
                id="job"
                pInputText 
                formControlName="job" 
                placeholder="e.g., Engineer"
                class="w-full" />
            </div>

            <div class="form-field form-field-half">
              <label for="insurance" class="field-label">
                <i class="pi pi-shield"></i>
                Insurance *
              </label>
              <input 
              id="insurance"
              pInputText 
              formControlName="insurance" 
              placeholder="e.g., Qatar Insurance"
              [class.p-invalid]="invalid('insurance')"
              class="w-full" />
              <small class="p-error" *ngIf="invalid('insurance')">
                Insurance is required
              </small>
            </div>
          </div>

          <!-- QID Number -->
          <div class="form-field">
            <label for="qid" class="field-label">
              <i class="pi pi-id-card"></i>
              Qatar ID
            </label>
            <input 
              id="qid"
              pInputText 
              formControlName="qid" 
              placeholder="e.g., 28XXXXXXXXX"
              [class.p-invalid]="validateQID('qid')"
              class="w-full" />
            <small class="p-error" *ngIf="validateQID('qid')">
              Use numbers only (11-digit)
            </small>
          </div>

          <!-- Form Actions -->
          <div class="form-actions">
            <p-button 
              type="button" 
              label="Reset" 
              icon="pi pi-refresh"
              severity="secondary" 
              [outlined]="true"
              (click)="reset()" />
            <p-button 
              type="submit" 
              label="Save Patient" 
              icon="pi pi-save"
              [disabled]="form.invalid"
              [loading]="isSubmitting" />
          </div>
        </form>
      </p-card>
    </div>
  `,
  styles: `
    .patient-form-container {
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

    .field-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: var(--p-text-color);
    }

    .field-label i {
      color: var(--p-primary-500);
      width: 1rem;
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

    /* Ensure proper input width */
    :host ::ng-deep .p-inputtext,
    :host ::ng-deep .p-datepicker,
    :host ::ng-deep .p-autocomplete,
    :host ::ng-deep .p-inputmask {
      width: 100%;
    }

    /* Fix autocomplete dropdown width */
    :host ::ng-deep .p-autocomplete .p-autocomplete-input {
      width: 100%;
    }

    /* Fix datepicker width */
    :host ::ng-deep .p-datepicker .p-inputtext {
      width: 100%;
    }

    /* Responsive for very small popups */
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
})
export class NewPatient {
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
    private patientService: PatientService,
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
  }

  filterGender(event: any): void {
    const query = event.query.toLowerCase();
    this.filteredGenderOptions = this.genderOptions.filter(option =>
      option.label.toLowerCase().includes(query)
    );
  }

  validateQID(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  invalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    if (!field || !(field.dirty || field.touched)) return false;

    // ✅ Special validation for phone
    if (fieldName === 'phone') {
      const val: string = field.value || '';
      // Remove spaces, plus, dashes
      const digitsOnly = val.replace(/\D/g, '');
      // Must be between 8–15 digits (typical international phone range)
      return digitsOnly.length < 8 || digitsOnly.length > 15;
    }

    return field.invalid;
  }

  validatePhoneNumber(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    if (!field || !(field.dirty || field.touched)) return false;

    // ✅ Special validation for phone
    if (fieldName === 'phone') {
      const val: string = field.value || '';
      // Remove spaces, plus, dashes
      const digitsOnly = val.replace(/\D/g, '');
      // Must be between 8–15 digits (typical international phone range)
      return digitsOnly.length < 8 || digitsOnly.length > 15;
    }

    return field.invalid;
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

  submit(): void {
  if (this.form.invalid) {
    this.form.markAllAsTouched();
    this.helpersFunctions.notifyError('Validation Error', 'Please fill in all required fields correctly');
    return;
  }
  
  this.isSubmitting = true;
  
  this.patientService.createPatient(this.form.value).subscribe({
    next: (res: any) => {
      console.log('Patient created:', res);
      this.isSubmitting = false;
      
      // Close dialog and return the created patient data (no success notification here)
      this.ref.close(res.data || res);
    },
    error: (error) => {
      console.error('Error creating patient:', error);
      this.helpersFunctions.notifyError('Error', 'Failed to create patient profile');
      this.isSubmitting = false;
    }
  });
}

  reset(): void {
    this.form.reset();
    this.helpersFunctions.notifyInfo('Form Reset', 'Form has been reset to initial state');
  }
}
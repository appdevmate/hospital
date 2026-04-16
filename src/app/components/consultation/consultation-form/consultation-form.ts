import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { catchError, of } from 'rxjs';

import { ConsultationService, Consultation, ChiefComplaint, VitalSigns, PhysicalExam, Diagnosis, Prescription, LabOrder, RadiologyOrder, TreatmentPlan } from '@/services/consultation.service';
import { AuthService } from '@/services/auth.service';
import { HelpersService } from '@/services/helpers-service';

import ICD10_CODES from './icd10-codes.json';
import LOINC_CODES from './loinc-codes.json';

@Component({
    selector: 'app-consultation-form',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        RouterModule,
        ButtonModule,
        TagModule,
        InputTextModule,
        TextareaModule,
        SelectModule,
        InputNumberModule,
        DatePickerModule,
        AutoCompleteModule,
        DividerModule,
        TooltipModule,
        ConfirmDialogModule,
        ToastModule
    ],
    providers: [ConfirmationService, MessageService, HelpersService],
    templateUrl: './consultation-form.html',
    styleUrl: './consultation-form.scss'
})
export class ConsultationFormComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private consultationService = inject(ConsultationService);
    private helpers = inject(HelpersService);
    private confirm = inject(ConfirmationService);
    auth = inject(AuthService);
    private cdr = inject(ChangeDetectorRef);

    consultation: Consultation | null = null;
    loading = true;
    saving = false;
    step = 0;

    // ── ICD-10 search ────────────────────────────────────────────────────────
    icdSuggestions: any[] = [];
    searchIcd(event: { query: string }) {
        const q = event.query.toLowerCase();
        this.icdSuggestions = (ICD10_CODES as any[])
            .filter((c) => c.code.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q))
            .slice(0, 15)
            .map((c) => ({ label: `${c.code} — ${c.desc}`, value: c.code, desc: c.desc }));
    }

    // ── LOINC search ─────────────────────────────────────────────────────────
    loincSuggestions: any[] = [];
    searchLoinc(event: { query: string }) {
        const q = event.query.toLowerCase();
        this.loincSuggestions = (LOINC_CODES as any[])
            .filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
            .slice(0, 15)
            .map((c) => ({ label: `${c.code} — ${c.name}`, value: c.code, name: c.name, unit: c.unit, ref: c.ref }));
    }

    // ── Form models ──────────────────────────────────────────────────────────
    cc: ChiefComplaint = {
        cc: '',
        duration: '',
        onset: undefined,
        severity: undefined,
        location: '',
        radiation: '',
        quality: '',
        modifyingFactors: '',
        associatedSx: '',
        hpi: '',
        pmh: '',
        psh: '',
        familyHistory: '',
        socialHistory: '',
        allergies: '',
        currentMeds: '',
        ros: { constitutional: '', cardiovascular: '', respiratory: '', gastrointestinal: '', genitourinary: '', musculoskeletal: '', neurological: '', psychiatric: '', other: '' }
    };
    vs: VitalSigns = {};
    pe: PhysicalExam = {};
    diagnoses: Diagnosis[] = [];
    prescriptions: Prescription[] = [];
    labOrders: LabOrder[] = [];
    radOrders: RadiologyOrder[] = [];
    tp: TreatmentPlan = { plan: '', goals: '', followUpDate: '', followUpNotes: '', referrals: '', restrictions: '', patientEducation: '', prognosis: '' };

    newDiag: Partial<Diagnosis> = { type: 'primary' };
    icdSelected: any = null;
    newLab: Partial<LabOrder> = { urgency: 'routine', status: 'ordered' };
    loincSelected: any = null;
    newRad: Partial<RadiologyOrder> = { urgency: 'routine', status: 'ordered' };
    newRx: Partial<Prescription> = { route: 'oral', status: 'ordered', refills: 0 };

    onsetOptions = ['sudden', 'gradual', 'unknown'].map((v) => ({ label: v, value: v }));
    severityOptions = ['mild', 'moderate', 'severe'].map((v) => ({ label: v, value: v }));
    routeOptions = ['oral', 'iv', 'im', 'topical', 'inhaled', 'sublingual', 'other'].map((v) => ({ label: v, value: v }));
    urgencyOptions = ['routine', 'urgent', 'stat'].map((v) => ({ label: v, value: v }));
    studyTypes = ['X-Ray', 'CT', 'MRI', 'Ultrasound', 'PET', 'Mammography', 'Other'].map((v) => ({ label: v, value: v }));
    diagTypeOptions = ['primary', 'secondary', 'differential'].map((v) => ({ label: v, value: v }));

    get stepDone(): boolean[] {
        const e = this.consultation;
        if (!e) return Array(8).fill(false);
        return [
            !!e.chiefComplaint?.cc,
            !!(e.vitalSigns?.heartRate || e.vitalSigns?.systolic),
            !!(e.physicalExam?.generalAppearance || e.physicalExam?.notes),
            (e.diagnosis?.length ?? 0) > 0,
            (e.prescriptions?.length ?? 0) > 0,
            (e.labOrders?.length ?? 0) > 0,
            (e.radiologyOrders?.length ?? 0) > 0,
            !!e.treatmentPlan?.plan
        ];
    }

    get canSignOff(): boolean {
        const e = this.consultation;
        if (!e || e.status === 'completed') return false;
        return !!e.chiefComplaint?.cc && (e.diagnosis?.length ?? 0) > 0 && e.diagnosis.some((d) => d.type === 'primary');
    }

    get isReadOnly(): boolean {
        return this.consultation?.status === 'completed';
    }

    get bmi(): number | null {
        const w = this.vs.weight,
            h = this.vs.height;
        if (!w || !h) return null;
        return parseFloat((w / (h / 100) ** 2).toFixed(1));
    }

    // Expose consultation as exam for template backward compat
    get exam() {
        return this.consultation;
    }

    ngOnInit() {
        const consultationId = this.route.snapshot.paramMap.get('consultationId');
        if (!consultationId) {
            this.router.navigate(['/']);
            return;
        }

        this.consultationService
            .getConsultation(consultationId)
            .pipe(
                catchError((err) => {
                    this.helpers.notifyError('Error', err?.error?.message || 'Could not load consultation');
                    this.router.navigate(['/']);
                    return of(null);
                })
            )
            .subscribe((c) => {
                if (!c) return;
                this.consultation = c as Consultation;
                this.cdr.markForCheck();
                this.populateForms(c as Consultation);
                this.loading = false;
                this.cdr.markForCheck();
            });
    }

    populateForms(c: Consultation) {
        if (c.chiefComplaint) this.cc = { ...this.cc, ...c.chiefComplaint };
        if (c.vitalSigns) this.vs = { ...c.vitalSigns };
        if (c.physicalExam) this.pe = { ...c.physicalExam };
        if (c.diagnosis?.length) this.diagnoses = [...c.diagnosis];
        if (c.prescriptions?.length) this.prescriptions = [...c.prescriptions];
        if (c.labOrders?.length) this.labOrders = [...c.labOrders];
        if (c.radiologyOrders?.length) this.radOrders = [...c.radiologyOrders];
        if (c.treatmentPlan) this.tp = { ...this.tp, ...c.treatmentPlan };
    }

    saveSection(sectionName: string, data: any) {
        const id = this.consultation?.consultationId;
        if (!id) return;
        this.saving = true;
        this.cdr.markForCheck();
        this.consultationService.updateSection(id, sectionName, data).subscribe({
            next: (updated) => {
                this.consultation = updated;
                this.saving = false;
                this.cdr.markForCheck();
                this.helpers.notifySuccess('Saved');
            },
            error: (err) => {
                this.saving = false;
                this.cdr.markForCheck();
                this.helpers.notifyError('Validation Error', err?.error?.message || err?.error?.error || 'Could not save');
            }
        });
    }

    saveCc() {
        this.saveSection('chiefComplaint', this.cc);
    }
    saveVs() {
        const data = { ...this.vs };
        if (data.weight && data.height) data.bmi = this.bmi ?? undefined;
        this.saveSection('vitalSigns', data);
    }
    savePe() {
        this.saveSection('physicalExam', this.pe);
    }
    saveDx() {
        this.saveSection('diagnosis', this.diagnoses);
    }
    saveRx() {
        this.saveSection('prescriptions', this.prescriptions);
    }
    saveLabs() {
        this.saveSection('labOrders', this.labOrders);
    }
    saveRads() {
        this.saveSection('radiologyOrders', this.radOrders);
    }
    saveTp() {
        this.saveSection('treatmentPlan', this.tp);
    }

    onIcdSelect(item: any) {
        this.newDiag.icdCode = item.value;
        this.newDiag.icdDescription = item.desc;
    }
    addDiagnosis() {
        if (!this.newDiag.icdCode || !this.newDiag.icdDescription) return;
        this.diagnoses = [...this.diagnoses, { icdCode: this.newDiag.icdCode!, icdDescription: this.newDiag.icdDescription!, type: this.newDiag.type || 'primary', notes: this.newDiag.notes || '' }];
        this.newDiag = { type: 'primary' };
        this.icdSelected = null;
    }
    removeDiagnosis(i: number) {
        this.diagnoses = this.diagnoses.filter((_, idx) => idx !== i);
    }

    addPrescription() {
        if (!this.newRx.medication || !this.newRx.dose || !this.newRx.frequency) return;
        this.prescriptions = [...this.prescriptions, { ...this.newRx } as Prescription];
        this.newRx = { route: 'oral', status: 'ordered', refills: 0 };
    }
    removeRx(i: number) {
        this.prescriptions = this.prescriptions.filter((_, idx) => idx !== i);
    }

    onLoincSelect(item: any) {
        this.newLab.testName = item.name;
        this.newLab.loincCode = item.value;
        this.newLab.referenceRange = item.ref;
        this.newLab.unit = item.unit;
    }
    addLabOrder() {
        if (!this.newLab.testName) return;
        this.labOrders = [...this.labOrders, { ...this.newLab } as LabOrder];
        this.newLab = { urgency: 'routine', status: 'ordered' };
        this.loincSelected = null;
    }
    removeLab(i: number) {
        this.labOrders = this.labOrders.filter((_, idx) => idx !== i);
    }

    addRadOrder() {
        if (!this.newRad.studyType || !this.newRad.bodyPart) return;
        this.radOrders = [...this.radOrders, { ...this.newRad } as RadiologyOrder];
        this.newRad = { urgency: 'routine', status: 'ordered' };
    }
    removeRad(i: number) {
        this.radOrders = this.radOrders.filter((_, idx) => idx !== i);
    }

    signOff() {
        this.confirm.confirm({
            message: 'Close this consultation? It will become read-only and cannot be edited.',
            header: 'Confirm Close Consultation',
            icon: 'pi pi-check-circle',
            acceptButtonProps: { label: 'Close Consultation', severity: 'success' },
            rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
            accept: () => {
                this.saving = true;
                this.cdr.markForCheck();
                this.consultationService.signOff(this.consultation!.consultationId).subscribe({
                    next: (updated) => {
                        this.consultation = updated;
                        this.saving = false;
                        this.cdr.markForCheck();
                        this.helpers.notifySuccess('Consultation closed successfully');
                    },
                    error: (err) => {
                        this.saving = false;
                        this.cdr.markForCheck();
                        this.helpers.notifyError('Cannot close consultation', err?.error?.message || err?.error?.error || 'Validation failed');
                    }
                });
            }
        });
    }

    goBack() {
        this.router.navigate(['/patient-profile', this.consultation?.patientId]);
    }
    goToStep(n: number) {
        this.step = n;
        this.cdr.markForCheck();
    }

    severityClass(type: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
        return type === 'primary' ? 'danger' : type === 'secondary' ? 'warn' : 'info';
    }
    urgencyClass(u: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
        return u === 'stat' ? 'danger' : u === 'urgent' ? 'warn' : 'info';
    }
    statusClass(s: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
        return s === 'resulted' || s === 'completed' || s === 'dispensed' ? 'success' : s === 'cancelled' ? 'secondary' : 'info';
    }
}

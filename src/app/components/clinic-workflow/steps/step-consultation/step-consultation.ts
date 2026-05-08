import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { DividerModule } from 'primeng/divider';
import { SkeletonModule } from 'primeng/skeleton';
import { CardModule } from 'primeng/card';
import { MessageService } from 'primeng/api';
import { WorkflowStateService } from '../../workflow-state.service';
import { AuthService } from '@/pages/service/auth.service';
import { ConsultationService, HmsConsultation, CreateConsultationRequest } from '@/pages/service/hms/consultation.service';
import { DiagnosisService, HmsDiagnosis } from '@/pages/service/hms/diagnosis.service';
import { DoctorNotesService } from '@/pages/service/hms/doctor-notes.service';
import { PrescriptionService, HmsPrescription } from '@/pages/service/hms/prescription.service';
import { LabResultsService, HmsLabResult } from '@/pages/service/hms/lab-results.service';
import { RadiologyService, HmsRadiologyResult } from '@/pages/service/hms/radiology.service';
import { FollowUpService, HmsFollowUp } from '@/pages/service/hms/follow-up.service';

interface VitalSigns {
    temperature?: string;
    bloodPressure?: string;
    heartRate?: string;
    respiratoryRate?: string;
    oxygenSaturation?: string;
    weight?: string;
    height?: string;
}

@Component({
    selector: 'app-step-consultation',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [MessageService],
    imports: [
        CommonModule, FormsModule,
        TabsModule, ButtonModule, InputTextModule, TextareaModule,
        SelectModule, DatePickerModule, TableModule, TagModule, ToastModule,
        DividerModule, SkeletonModule, CardModule
    ],
    template: `
        <p-toast></p-toast>
        <div class="flex flex-col gap-6">
            @if (!state.consultation()) {
                <div class="card">
                    <h2 class="text-xl font-semibold mb-4">Start Consultation</h2>
                    <div class="flex flex-col gap-4">
                        <div class="flex flex-col gap-1"><label class="text-sm font-medium">Chief Complaint *</label><textarea pTextarea [(ngModel)]="form.chiefComplaint" rows="3" class="w-full"></textarea></div>
                        <div class="flex flex-col gap-1"><label class="text-sm font-medium">Type</label><p-select [(ngModel)]="form.type" [options]="consultationTypes" placeholder="Select type" styleClass="w-full md:w-64"></p-select></div>
                        <div class="flex flex-col gap-1"><label class="text-sm font-medium">Notes</label><textarea pTextarea [(ngModel)]="form.notes" rows="2" class="w-full"></textarea></div>
                        <div class="flex justify-between">
                            <p-button label="Back" icon="pi pi-arrow-left" severity="secondary" (onClick)="back.emit()"></p-button>
                            <p-button label="Start Consultation" icon="pi pi-play" [loading]="saving()" [disabled]="!form.chiefComplaint" (onClick)="startConsultation()"></p-button>
                        </div>
                    </div>
                </div>
            } @else {
                <div class="card">
                    <div class="flex items-center gap-3 mb-4">
                        <i class="pi pi-clipboard text-2xl text-primary"></i>
                        <div><h2 class="text-xl font-semibold m-0">Active Consultation</h2><p class="text-surface-500 m-0">{{ state.consultation()!.chiefComplaint }}</p></div>
                        <p-tag value="In Progress" severity="info" styleClass="ml-auto"></p-tag>
                    </div>
                    <p-tabs><p-tablist><p-tab value="0">Vital Signs</p-tab><p-tab value="1">Diagnosis</p-tab><p-tab value="2">Lab Request</p-tab><p-tab value="3">Radiology</p-tab><p-tab value="4">Prescription</p-tab><p-tab value="5">Doctor Notes</p-tab><p-tab value="6">Follow-up</p-tab></p-tablist><p-tabpanels>
                        <p-tabpanel value="0"><div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
<div class="flex flex-col gap-1"><label class="text-sm font-medium">Temperature (°C)</label><input pInputText [(ngModel)]="vitals.temperature" placeholder="37.0" class="w-full" /></div>
<div class="flex flex-col gap-1"><label class="text-sm font-medium">Blood Pressure</label><input pInputText [(ngModel)]="vitals.bloodPressure" placeholder="120/80" class="w-full" /></div>
<div class="flex flex-col gap-1"><label class="text-sm font-medium">Heart Rate (bpm)</label><input pInputText [(ngModel)]="vitals.heartRate" placeholder="72" class="w-full" /></div>
<div class="flex flex-col gap-1"><label class="text-sm font-medium">Respiratory Rate</label><input pInputText [(ngModel)]="vitals.respiratoryRate" placeholder="16" class="w-full" /></div>
<div class="flex flex-col gap-1"><label class="text-sm font-medium">Oxygen Saturation (%)</label><input pInputText [(ngModel)]="vitals.oxygenSaturation" placeholder="98" class="w-full" /></div>
<div class="flex flex-col gap-1"><label class="text-sm font-medium">Weight (kg)</label><input pInputText [(ngModel)]="vitals.weight" placeholder="70" class="w-full" /></div>
<div class="flex flex-col gap-1"><label class="text-sm font-medium">Height (cm)</label><input pInputText [(ngModel)]="vitals.height" placeholder="170" class="w-full" /></div>
</div><div class="flex justify-end mt-4"><p-button label="Save Vitals" icon="pi pi-check" [loading]="savingVitals()" (onClick)="saveVitals()"></p-button></div></p-tabpanel>
                        <p-tabpanel value="1"><div class="flex flex-col gap-4 pt-4">
<p-table [value]="diagnoses()" styleClass="p-datatable-sm">
<ng-template pTemplate="header"><tr><th>Code</th><th>Description</th><th>Type</th><th>Severity</th></tr></ng-template>
<ng-template pTemplate="body" let-d><tr><td>{{ d.code }}</td><td>{{ d.description }}</td><td>{{ d.type }}</td><td>{{ d.severity }}</td></tr></ng-template>
<ng-template pTemplate="emptymessage"><tr><td colspan="4" class="text-center py-4">No diagnoses added.</td></tr></ng-template>
</p-table>
<div class="grid grid-cols-1 md:grid-cols-2 gap-3 border-t pt-4">
<div class="flex flex-col gap-1"><label class="text-sm font-medium">Code</label><input pInputText [(ngModel)]="diagForm.code" placeholder="ICD-10 code" /></div>
<div class="flex flex-col gap-1"><label class="text-sm font-medium">Description *</label><input pInputText [(ngModel)]="diagForm.description" placeholder="Diagnosis description" /></div>
<div class="flex flex-col gap-1"><label class="text-sm font-medium">Type</label><p-select [(ngModel)]="diagForm.type" [options]="diagTypes" placeholder="Type" styleClass="w-full"></p-select></div>
<div class="flex flex-col gap-1"><label class="text-sm font-medium">Severity</label><p-select [(ngModel)]="diagForm.severity" [options]="diagSeverities" placeholder="Severity" styleClass="w-full"></p-select></div>
<div class="flex flex-col gap-1 md:col-span-2"><label class="text-sm font-medium">Notes</label><input pInputText [(ngModel)]="diagForm.notes" placeholder="Notes" /></div>
</div>
<div class="flex justify-end"><p-button label="Add Diagnosis" icon="pi pi-plus" [loading]="savingDiag()" [disabled]="!diagForm.description" (onClick)="addDiagnosis()"></p-button></div>
</div></p-tabpanel>
                        <p-tabpanel value="2"><div class="flex flex-col gap-4 pt-4">
<p-table [value]="labs()" styleClass="p-datatable-sm"><ng-template pTemplate="header"><tr><th>Lab Name</th><th>Date</th><th>Status</th></tr></ng-template><ng-template pTemplate="body" let-l><tr><td>{{ l.labName }}</td><td>{{ l.orderedDate }}</td><td><p-tag [value]="l.status"></p-tag></td></tr></ng-template><ng-template pTemplate="emptymessage"><tr><td colspan="3" class="text-center py-4">No lab requests.</td></tr></ng-template></p-table>
<div class="grid grid-cols-1 md:grid-cols-2 gap-3 border-t pt-4">
<div class="flex flex-col gap-1"><label class="text-sm font-medium">Lab Name *</label><input pInputText [(ngModel)]="labForm.labName" /></div>
<div class="flex flex-col gap-1"><label class="text-sm font-medium">Ordered Date</label><p-date-picker [(ngModel)]="labOrderedDate" dateFormat="yy-mm-dd" styleClass="w-full" (onSelect)="onLabDateSelect($event)"></p-date-picker></div>
<div class="flex flex-col gap-1 md:col-span-2"><label class="text-sm font-medium">Notes</label><input pInputText [(ngModel)]="labForm.notes" /></div>
</div><div class="flex justify-end"><p-button label="Request Lab" icon="pi pi-plus" [loading]="savingLab()" [disabled]="!labForm.labName" (onClick)="addLab()"></p-button></div></div></p-tabpanel>
                        <p-tabpanel value="3"><div class="flex flex-col gap-4 pt-4">
<p-table [value]="radiology()" styleClass="p-datatable-sm"><ng-template pTemplate="header"><tr><th>Modality</th><th>Body Part</th><th>Date</th><th>Status</th></tr></ng-template><ng-template pTemplate="body" let-r><tr><td>{{ r.modality }}</td><td>{{ r.bodyPart }}</td><td>{{ r.orderedDate }}</td><td><p-tag [value]="r.status"></p-tag></td></tr></ng-template><ng-template pTemplate="emptymessage"><tr><td colspan="4" class="text-center py-4">No radiology requests.</td></tr></ng-template></p-table>
<div class="grid grid-cols-1 md:grid-cols-2 gap-3 border-t pt-4">
<div class="flex flex-col gap-1"><label class="text-sm font-medium">Modality</label><p-select [(ngModel)]="radForm.modality" [options]="modalityOptions" placeholder="Select modality" styleClass="w-full"></p-select></div>
<div class="flex flex-col gap-1"><label class="text-sm font-medium">Body Part</label><input pInputText [(ngModel)]="radForm.bodyPart" placeholder="e.g. Chest" /></div>
<div class="flex flex-col gap-1"><label class="text-sm font-medium">Ordered Date</label><p-date-picker [(ngModel)]="radOrderedDate" dateFormat="yy-mm-dd" styleClass="w-full" (onSelect)="onRadDateSelect($event)"></p-date-picker></div>
<div class="flex flex-col gap-1"><label class="text-sm font-medium">Notes</label><input pInputText [(ngModel)]="radForm.notes" /></div>
</div><div class="flex justify-end"><p-button label="Request Radiology" icon="pi pi-plus" [loading]="savingRad()" (onClick)="addRadiology()"></p-button></div></div></p-tabpanel>
                        <p-tabpanel value="4"><div class="flex flex-col gap-4 pt-4">
<p-table [value]="prescriptions()" styleClass="p-datatable-sm"><ng-template pTemplate="header"><tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr></ng-template><ng-template pTemplate="body" let-rx><tr><td>{{ rx.medications?.[0]?.name }}</td><td>{{ rx.medications?.[0]?.dosage }}</td><td>{{ rx.medications?.[0]?.frequency }}</td><td>{{ rx.medications?.[0]?.duration }}</td></tr></ng-template><ng-template pTemplate="emptymessage"><tr><td colspan="4" class="text-center py-4">No prescriptions.</td></tr></ng-template></p-table>
<div class="grid grid-cols-1 md:grid-cols-2 gap-3 border-t pt-4">
<div class="flex flex-col gap-1"><label class="text-sm font-medium">Medication Name *</label><input pInputText [(ngModel)]="rxForm.name" /></div>
<div class="flex flex-col gap-1"><label class="text-sm font-medium">Dosage</label><input pInputText [(ngModel)]="rxForm.dosage" /></div>
<div class="flex flex-col gap-1"><label class="text-sm font-medium">Frequency</label><input pInputText [(ngModel)]="rxForm.frequency" /></div>
<div class="flex flex-col gap-1"><label class="text-sm font-medium">Duration</label><input pInputText [(ngModel)]="rxForm.duration" /></div>
<div class="flex flex-col gap-1 md:col-span-2"><label class="text-sm font-medium">Instructions</label><input pInputText [(ngModel)]="rxForm.instructions" /></div>
</div><div class="flex justify-end"><p-button label="Add Prescription" icon="pi pi-plus" [loading]="savingRx()" [disabled]="!rxForm.name" (onClick)="addPrescription()"></p-button></div></div></p-tabpanel>
                        <p-tabpanel value="5"><div class="flex flex-col gap-4 pt-4">
<div class="flex flex-col gap-1"><label class="text-sm font-medium">Subjective</label><textarea pTextarea [(ngModel)]="soapForm.subjective" rows="3" class="w-full"></textarea></div>
<div class="flex flex-col gap-1"><label class="text-sm font-medium">Objective</label><textarea pTextarea [(ngModel)]="soapForm.objective" rows="3" class="w-full"></textarea></div>
<div class="flex flex-col gap-1"><label class="text-sm font-medium">Assessment</label><textarea pTextarea [(ngModel)]="soapForm.assessment" rows="3" class="w-full"></textarea></div>
<div class="flex flex-col gap-1"><label class="text-sm font-medium">Plan</label><textarea pTextarea [(ngModel)]="soapForm.plan" rows="3" class="w-full"></textarea></div>
<div class="flex justify-end"><p-button label="Save Notes" icon="pi pi-check" [loading]="savingNotes()" (onClick)="saveNotes()"></p-button></div>
</div></p-tabpanel>
                        <p-tabpanel value="6"><div class="flex flex-col gap-4 pt-4">
<p-table [value]="followUps()" styleClass="p-datatable-sm"><ng-template pTemplate="header"><tr><th>Scheduled Date</th><th>Type</th><th>Purpose</th><th>Status</th></tr></ng-template><ng-template pTemplate="body" let-fu><tr><td>{{ fu.scheduledDate }}</td><td>{{ fu.type }}</td><td>{{ fu.purpose }}</td><td><p-tag [value]="fu.status"></p-tag></td></tr></ng-template><ng-template pTemplate="emptymessage"><tr><td colspan="4" class="text-center py-4">No follow-ups scheduled.</td></tr></ng-template></p-table>
<div class="grid grid-cols-1 md:grid-cols-2 gap-3 border-t pt-4">
<div class="flex flex-col gap-1"><label class="text-sm font-medium">Scheduled Date *</label><p-date-picker [(ngModel)]="fuScheduledDate" dateFormat="yy-mm-dd" styleClass="w-full" (onSelect)="onFuDateSelect($event)"></p-date-picker></div>
<div class="flex flex-col gap-1"><label class="text-sm font-medium">Type</label><p-select [(ngModel)]="fuForm.type" [options]="followUpTypes" placeholder="Select type" styleClass="w-full"></p-select></div>
<div class="flex flex-col gap-1"><label class="text-sm font-medium">Purpose</label><input pInputText [(ngModel)]="fuForm.purpose" /></div>
<div class="flex flex-col gap-1"><label class="text-sm font-medium">Notes</label><input pInputText [(ngModel)]="fuForm.notes" /></div>
</div><div class="flex justify-end"><p-button label="Schedule Follow-up" icon="pi pi-plus" [loading]="savingFu()" [disabled]="!fuForm.scheduledDate" (onClick)="addFollowUp()"></p-button></div></div></p-tabpanel>
                    </p-tabpanels></p-tabs>
                </div>
                <div class="flex justify-between">
                    <p-button label="Back" icon="pi pi-arrow-left" severity="secondary" (onClick)="back.emit()"></p-button>
                    <p-button label="Proceed to Billing" icon="pi pi-arrow-right" iconPos="right" (onClick)="next.emit()"></p-button>
                </div>
            }
        </div>
    `
})
export class StepConsultationComponent implements OnInit {
    @Output() next = new EventEmitter<void>();
    @Output() back = new EventEmitter<void>();
    state = inject(WorkflowStateService);
    private auth = inject(AuthService);
    private consultationService = inject(ConsultationService);
    private diagnosisService = inject(DiagnosisService);
    private doctorNotesService = inject(DoctorNotesService);
    private prescriptionService = inject(PrescriptionService);
    private labResultsService = inject(LabResultsService);
    private radiologyService = inject(RadiologyService);
    private followUpService = inject(FollowUpService);
    private messageService = inject(MessageService);
    saving = signal(false);
    savingVitals = signal(false);
    savingDiag = signal(false);
    savingLab = signal(false);
    savingRad = signal(false);
    savingRx = signal(false);
    savingNotes = signal(false);
    savingFu = signal(false);
    diagnoses = signal<HmsDiagnosis[]>([]);
    labs = signal<HmsLabResult[]>([]);
    radiology = signal<HmsRadiologyResult[]>([]);
    prescriptions = signal<HmsPrescription[]>([]);
    followUps = signal<HmsFollowUp[]>([]);
    form: Partial<CreateConsultationRequest> = {};
    vitals: VitalSigns = {};
    diagForm: Partial<HmsDiagnosis> = {};
    labForm: Partial<HmsLabResult> = {};
    radForm: Partial<HmsRadiologyResult> = {};
    rxForm: { name: string; dosage?: string; frequency?: string; duration?: string; instructions?: string } = { name: "" };
    soapForm: { subjective?: string; objective?: string; assessment?: string; plan?: string } = {};
    fuForm: Partial<HmsFollowUp> = {};
    labOrderedDate: Date | null = null;
    radOrderedDate: Date | null = null;
    fuScheduledDate: Date | null = null;
    consultationTypes = ["outpatient", "inpatient", "emergency", "follow-up"];
    diagTypes = ["primary", "secondary", "differential"];
    diagSeverities = ["mild", "moderate", "severe"];
    modalityOptions = ["X-Ray", "CT", "MRI", "Ultrasound", "PET", "Other"];
    followUpTypes = ["in-person", "telehealth", "phone"];
    ngOnInit(): void {
        if (this.state.consultation()) { this.loadSubData(); }
    }
    private loadSubData(): void {
        const cid = this.state.consultation()!.consultationId;
        this.diagnosisService.getAll(cid).pipe(catchError(() => of([]))).subscribe(d => this.diagnoses.set(d));
        this.labResultsService.getAll(cid).pipe(catchError(() => of([]))).subscribe(l => this.labs.set(l));
        this.radiologyService.getAll(cid).pipe(catchError(() => of([]))).subscribe(r => this.radiology.set(r));
        this.prescriptionService.getAll(cid).pipe(catchError(() => of([]))).subscribe(p => this.prescriptions.set(p));
        this.followUpService.getAll(cid).pipe(catchError(() => of([]))).subscribe(f => this.followUps.set(f));
        const vs = this.state.consultation()!.vitalSigns;
        if (vs) { this.vitals = { ...vs }; }
    }    startConsultation(): void {
        const patient = this.state.patient()!;
        const today = new Date().toISOString().split("T")[0];
        this.saving.set(true);
        const payload: CreateConsultationRequest = {
            patientId: patient.patientId,
            patientName: patient.name,
            doctorName: this.auth.current.name,
            doctorEmail: this.auth.current.email,
            date: today,
            type: this.form.type || "outpatient",
            chiefComplaint: this.form.chiefComplaint,
            status: "in-progress",
            notes: this.form.notes
        };
        this.consultationService.create(payload)
            .pipe(catchError(err => { this.messageService.add({ severity: "error", summary: "Error", detail: err.message }); this.saving.set(false); return of(null); }))
            .subscribe(c => {
                this.saving.set(false);
                if (c) { this.state.consultation.set(c); this.loadSubData(); this.messageService.add({ severity: "success", summary: "Consultation Started" }); }
            });
    }
    saveVitals(): void {
        const c = this.state.consultation()!;
        this.savingVitals.set(true);
        const vs = { ...this.vitals } as HmsConsultation['vitalSigns'];
        this.consultationService.update(c.consultationId, c.patientId, { vitalSigns: vs })
            .pipe(catchError(err => { this.messageService.add({ severity: "error", summary: "Error", detail: err.message }); this.savingVitals.set(false); return of(null); }))
            .subscribe(updated => { this.savingVitals.set(false); if (updated) { this.state.consultation.set(updated); this.messageService.add({ severity: "success", summary: "Vitals Saved" }); } });
    }
    addDiagnosis(): void {
        if (!this.diagForm.description) return;
        const cid = this.state.consultation()!.consultationId;
        this.savingDiag.set(true);
        this.diagnosisService.create({ consultationId: cid, ...this.diagForm })
            .pipe(catchError(err => { this.messageService.add({ severity: "error", summary: "Error", detail: err.message }); this.savingDiag.set(false); return of(null); }))
            .subscribe(d => { this.savingDiag.set(false); if (d) { this.diagnoses.update(list => [d, ...list]); this.diagForm = {}; this.messageService.add({ severity: "success", summary: "Diagnosis Added" }); } });
    }
    onLabDateSelect(date: Date): void { this.labForm.orderedDate = date.toISOString().split("T")[0]; }
    addLab(): void {
        if (!this.labForm.labName) return;
        const cid = this.state.consultation()!.consultationId;
        this.savingLab.set(true);
        this.labResultsService.create({ consultationId: cid, orderedBy: this.auth.current.name, status: "pending", ...this.labForm })
            .pipe(catchError(err => { this.messageService.add({ severity: "error", summary: "Error", detail: err.message }); this.savingLab.set(false); return of(null); }))
            .subscribe(l => { this.savingLab.set(false); if (l) { this.labs.update(list => [l, ...list]); this.labForm = {}; this.labOrderedDate = null; this.messageService.add({ severity: "success", summary: "Lab Requested" }); } });
    }
    onRadDateSelect(date: Date): void { this.radForm.orderedDate = date.toISOString().split("T")[0]; }
    addRadiology(): void {
        const cid = this.state.consultation()!.consultationId;
        this.savingRad.set(true);
        this.radiologyService.create({ consultationId: cid, orderedBy: this.auth.current.name, status: "pending", ...this.radForm })
            .pipe(catchError(err => { this.messageService.add({ severity: "error", summary: "Error", detail: err.message }); this.savingRad.set(false); return of(null); }))
            .subscribe(r => { this.savingRad.set(false); if (r) { this.radiology.update(list => [r, ...list]); this.radForm = {}; this.radOrderedDate = null; this.messageService.add({ severity: "success", summary: "Radiology Requested" }); } });
    }
    addPrescription(): void {
        if (!this.rxForm.name) return;
        const cid = this.state.consultation()!.consultationId;
        const today = new Date().toISOString().split("T")[0];
        this.savingRx.set(true);
        this.prescriptionService.create({ consultationId: cid, prescribedBy: this.auth.current.name, prescribedDate: today, status: "active", medications: [{ ...this.rxForm }] })
            .pipe(catchError(err => { this.messageService.add({ severity: "error", summary: "Error", detail: err.message }); this.savingRx.set(false); return of(null); }))
            .subscribe(p => { this.savingRx.set(false); if (p) { this.prescriptions.update(list => [p, ...list]); this.rxForm = { name: "" }; this.messageService.add({ severity: "success", summary: "Prescription Added" }); } });
    }
    saveNotes(): void {
        const cid = this.state.consultation()!.consultationId;
        this.savingNotes.set(true);
        this.doctorNotesService.create({ consultationId: cid, ...this.soapForm, authorName: this.auth.current.name, authorEmail: this.auth.current.email })
            .pipe(catchError(err => { this.messageService.add({ severity: "error", summary: "Error", detail: err.message }); this.savingNotes.set(false); return of(null); }))
            .subscribe(n => { this.savingNotes.set(false); if (n) { this.messageService.add({ severity: "success", summary: "Notes Saved" }); } });
    }
    onFuDateSelect(date: Date): void { this.fuForm.scheduledDate = date.toISOString().split("T")[0]; }
    addFollowUp(): void {
        if (!this.fuForm.scheduledDate) return;
        const cid = this.state.consultation()!.consultationId;
        this.savingFu.set(true);
        this.followUpService.create({ consultationId: cid, status: "scheduled", ...this.fuForm })
            .pipe(catchError(err => { this.messageService.add({ severity: "error", summary: "Error", detail: err.message }); this.savingFu.set(false); return of(null); }))
            .subscribe(f => { this.savingFu.set(false); if (f) { this.followUps.update(list => [f, ...list]); this.fuForm = {}; this.fuScheduledDate = null; this.messageService.add({ severity: "success", summary: "Follow-up Scheduled" }); } });
    }
}
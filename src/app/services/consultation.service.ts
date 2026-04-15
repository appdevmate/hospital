import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Config } from '@/services/config';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface ROS {
    constitutional?: string;
    cardiovascular?: string;
    respiratory?: string;
    gastrointestinal?: string;
    genitourinary?: string;
    musculoskeletal?: string;
    neurological?: string;
    psychiatric?: string;
    other?: string;
    [key: string]: string | undefined;
}

export interface ChiefComplaint {
    cc: string;
    duration?: string;
    onset?: 'sudden' | 'gradual' | 'unknown';
    severity?: 'mild' | 'moderate' | 'severe';
    location?: string;
    radiation?: string;
    quality?: string;
    modifyingFactors?: string;
    associatedSx?: string;
    hpi?: string;
    ros?: ROS;
    pmh?: string;
    psh?: string;
    familyHistory?: string;
    socialHistory?: string;
    allergies?: string;
    currentMeds?: string;
}

export interface VitalSigns {
    systolic?: number;
    diastolic?: number;
    heartRate?: number;
    temperature?: number;
    weight?: number;
    height?: number;
    bmi?: number;
    oxygenSaturation?: number;
    respiratoryRate?: number;
    painScale?: number;
    recordedAt?: string;
}

export interface PhysicalExam {
    generalAppearance?: string;
    heent?: string;
    neck?: string;
    chest?: string;
    cardiovascular?: string;
    abdomen?: string;
    extremities?: string;
    neurological?: string;
    skin?: string;
    musculoskeletal?: string;
    notes?: string;
    [key: string]: string | undefined;
}

export interface Diagnosis {
    id?: string;
    icdCode: string;
    icdDescription: string;
    type: 'primary' | 'secondary' | 'differential';
    notes?: string;
}

export interface Prescription {
    id?: string;
    medication: string;
    dose: string;
    frequency: string;
    duration?: string;
    route: 'oral' | 'iv' | 'im' | 'topical' | 'inhaled' | 'sublingual' | 'other';
    refills?: number;
    instructions?: string;
    status: 'ordered' | 'dispensed' | 'cancelled';
}

export interface LabOrder {
    id?: string;
    testName: string;
    loincCode?: string;
    urgency: 'routine' | 'urgent' | 'stat';
    clinicalReason?: string;
    status: 'ordered' | 'collected' | 'resulted' | 'cancelled';
    result?: string;
    unit?: string;
    referenceRange?: string;
    resultDate?: string;
    resultNotes?: string;
}

export interface RadiologyOrder {
    id?: string;
    studyType: 'X-Ray' | 'CT' | 'MRI' | 'Ultrasound' | 'PET' | 'Mammography' | 'Other';
    bodyPart: string;
    urgency: 'routine' | 'urgent' | 'stat';
    clinicalInfo?: string;
    status: 'ordered' | 'scheduled' | 'completed' | 'cancelled';
    findings?: string;
    impression?: string;
    reportDate?: string;
    notes?: string;
}

export interface TreatmentPlan {
    plan: string;
    goals?: string;
    followUpDate?: string;
    followUpNotes?: string;
    referrals?: string;
    restrictions?: string;
    patientEducation?: string;
    prognosis?: string;
}

export interface Consultation {
    PK: string;
    SK: string;
    consultationId: string;
    /** @deprecated use consultationId */
    examId?: string;
    patientId: string;
    patientName: string;
    doctorId: string;
    doctorName: string;
    doctorEmail: string;
    date: string;
    status: 'draft' | 'completed';
    signedOffAt: string | null;
    createdAt: string;
    updatedAt: string | null;
    chiefComplaint: ChiefComplaint | null;
    vitalSigns: VitalSigns | null;
    physicalExam: PhysicalExam | null;
    diagnosis: Diagnosis[];
    prescriptions: Prescription[];
    labOrders: LabOrder[];
    radiologyOrders: RadiologyOrder[];
    treatmentPlan: TreatmentPlan | null;
}

/** Backward-compatible alias — remove once Lambda is renamed */
export type Examination = Consultation;

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ConsultationService {
    private http = inject(HttpClient);

    private headers(): HttpHeaders {
        const jwt = sessionStorage.getItem('accessToken') || '';
        return new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`
        });
    }

    createConsultation(data: { patientId: string; patientName: string; doctorEmail: string; doctorName?: string; date?: string; appointmentId?: string }): Observable<Consultation> {
        return this.http.post<Consultation>(Config.buildUrl('examinations'), data, { headers: this.headers() });
    }

    /** @deprecated use createConsultation */
    createExamination = this.createConsultation.bind(this);

    listConsultations(patientId: string, doctorEmail?: string): Observable<Consultation[]> {
        let params = new HttpParams();
        if (patientId) params = params.set('patientId', patientId);
        if (doctorEmail) params = params.set('doctorEmail', doctorEmail);
        return this.http.get<Consultation[]>(Config.buildUrl('examinations'), { headers: this.headers(), params });
    }

    /** @deprecated use listConsultations */
    listExaminations = this.listConsultations.bind(this);

    getConsultation(consultationId: string): Observable<Consultation> {
        return this.http.get<Consultation>(Config.buildUrl(`examinations/${consultationId}`), { headers: this.headers() });
    }

    /** @deprecated use getConsultation */
    getExamination = this.getConsultation.bind(this);

    updateSection(consultationId: string, section: string, data: any): Observable<Consultation> {
        return this.http.patch<Consultation>(Config.buildUrl(`examinations/${consultationId}`), { [section]: data }, { headers: this.headers() });
    }

    signOff(consultationId: string): Observable<Consultation> {
        return this.http.post<Consultation>(Config.buildUrl(`examinations/${consultationId}/signoff`), {}, { headers: this.headers() });
    }

    deleteConsultation(consultationId: string): Observable<any> {
        return this.http.delete(Config.buildUrl(`examinations/${consultationId}`), { headers: this.headers() });
    }

    /** @deprecated use deleteConsultation */
    deleteExamination = this.deleteConsultation.bind(this);
}

/** @deprecated import ConsultationService instead */
export { ConsultationService as ExaminationService };

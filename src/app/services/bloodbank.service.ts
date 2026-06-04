import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Config } from '@/services/config';

// ── Interfaces ────────────────────────────────────────────────────────────────
export type BloodType    = 'O+' | 'O-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-';
export type ProductType  = 'whole' | 'packed-rbc' | 'plasma' | 'platelets' | 'cryo';
export type UnitStatus   = 'available' | 'reserved' | 'issued' | 'used' | 'discarded' | 'expired' | 'quarantined';
export type ReqStatus    = 'pending' | 'approved' | 'crossmatched' | 'issued' | 'cancelled' | 'rejected';
export type Urgency      = 'routine' | 'urgent' | 'emergency' | 'stat';

export interface Donor {
    donorId: string;
    name: string;
    bloodType: BloodType;
    gender?: string;
    dob?: string;
    phone?: string;         // at least one of phone/qid required
    qid?: string;           // 11-digit Qatar ID; at least one of phone/qid required
    email?: string;
    address?: string;
    lastDonation?: string | null;
    donationCount?: number;
    eligibilityStatus?: 'eligible' | 'temporarily-deferred' | 'permanently-deferred';
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface Donation {
    donationId: string;
    donorId: string;
    donorName?: string;
    bloodType: BloodType;
    productType: ProductType;
    volumeMl?: number;
    units?: number;
    collectionDate: string;
    notes?: string | null;
    createdAt: string;
}

export interface BBUnit {
    unitId: string;
    donationId: string;
    donorId: string;
    donorName?: string;
    bloodType: BloodType;
    productType: ProductType;
    volumeMl?: number;
    collectionDate: string;
    expiryDate: string;
    status: UnitStatus;
    currentLocation?: string;
    reservedForRequestId?: string | null;
    reservedUntil?: string | null;
}

export interface BBRequest {
    requestId: string;
    patientId: string;
    patientName: string;
    bloodType: BloodType;
    productType: ProductType;
    unitsRequested: number;
    urgency: Urgency;
    clinicalReason?: string;
    notes?: string;
    requestingDoctorId?: string | null;
    requestingDoctorName?: string;
    requestingDoctorEmail?: string;
    status: ReqStatus;
    createdAt: string;
    updatedAt: string;
    crossmatches?: Crossmatch[];
    issues?: BBIssue[];
}

export interface Crossmatch {
    requestId: string;
    unitId: string;
    donorBloodType: BloodType;
    recipientBloodType: BloodType;
    compatible: boolean;
    aboRhCompatible: boolean;
    technician: string;
    method?: string;
    notes?: string | null;
    performedAt: string;
}

export interface BBIssue {
    issueId: string;
    requestId: string;
    unitIds: string[];
    issuedBy: string;
    issuedTo?: string;
    notes?: string;
    issuedAt: string;
}

export interface StockRow {
    bloodType: BloodType;
    productType: ProductType;
    total: number;
    available?: number;
    reserved?: number;
    issued?: number;
    used?: number;
    discarded?: number;
    expired?: number;
    quarantined?: number;
}

// ── Service ───────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class BloodBankService {
    private http = inject(HttpClient);
    private base = Config.getBaseUrl() + '/bloodbank';

    private h(): { headers: HttpHeaders } {
        const jwt = sessionStorage.getItem('accessToken') || '';
        return { headers: new HttpHeaders({ 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` }) };
    }

    // Donors
    listDonors():                                   Observable<Donor[]>     { return this.http.get<Donor[]>(`${this.base}/donors`, this.h()); }
    getDonor(id: string):                           Observable<Donor>       { return this.http.get<Donor>(`${this.base}/donors/${id}`, this.h()); }
    createDonor(d: Partial<Donor>):                 Observable<Donor>       { return this.http.post<Donor>(`${this.base}/donors`, d, this.h()); }
    updateDonor(id: string, d: Partial<Donor>):     Observable<Donor>       { return this.http.patch<Donor>(`${this.base}/donors/${id}`, d, this.h()); }
    deleteDonor(id: string):                        Observable<void>        { return this.http.delete<void>(`${this.base}/donors/${id}`, this.h()); }

    // Donations
    listAllDonations():                             Observable<Donation[]>  { return this.http.get<Donation[]>(`${this.base}/donations`, this.h()); }
    listDonorDonations(id: string):                 Observable<Donation[]>  { return this.http.get<Donation[]>(`${this.base}/donors/${id}/donations`, this.h()); }
    createDonation(id: string, d: Partial<Donation>): Observable<{donation: Donation, units: BBUnit[]}> {
        return this.http.post<{donation: Donation, units: BBUnit[]}>(`${this.base}/donors/${id}/donations`, d, this.h());
    }

    // Units
    listUnits(filters?: { status?: UnitStatus; bloodType?: BloodType; productType?: ProductType; expiringIn?: number }): Observable<BBUnit[]> {
        const qs = new URLSearchParams();
        if (filters?.status)      qs.set('status', filters.status);
        if (filters?.bloodType)   qs.set('bloodType', filters.bloodType);
        if (filters?.productType) qs.set('productType', filters.productType);
        if (filters?.expiringIn != null) qs.set('expiringIn', String(filters.expiringIn));
        const q = qs.toString();
        return this.http.get<BBUnit[]>(`${this.base}/units${q ? '?' + q : ''}`, this.h());
    }
    updateUnit(id: string, body: Partial<BBUnit>):  Observable<BBUnit>      { return this.http.patch<BBUnit>(`${this.base}/units/${id}`, body, this.h()); }
    discardUnit(id: string):                        Observable<void>        { return this.http.delete<void>(`${this.base}/units/${id}`, this.h()); }
    stock():                                        Observable<StockRow[]>  { return this.http.get<StockRow[]>(`${this.base}/stock`, this.h()); }

    // Requests
    listRequests(filters?: { status?: ReqStatus; urgency?: Urgency; patientId?: string }): Observable<BBRequest[]> {
        const qs = new URLSearchParams();
        if (filters?.status)    qs.set('status', filters.status);
        if (filters?.urgency)   qs.set('urgency', filters.urgency);
        if (filters?.patientId) qs.set('patientId', filters.patientId);
        const q = qs.toString();
        return this.http.get<BBRequest[]>(`${this.base}/requests${q ? '?' + q : ''}`, this.h());
    }
    getRequest(id: string):                         Observable<BBRequest>   { return this.http.get<BBRequest>(`${this.base}/requests/${id}`, this.h()); }
    createRequest(body: Partial<BBRequest>):        Observable<BBRequest>   { return this.http.post<BBRequest>(`${this.base}/requests`, body, this.h()); }
    updateRequest(id: string, body: Partial<BBRequest>): Observable<BBRequest> { return this.http.patch<BBRequest>(`${this.base}/requests/${id}`, body, this.h()); }
    cancelRequest(id: string):                      Observable<void>        { return this.http.delete<void>(`${this.base}/requests/${id}`, this.h()); }
    addCrossmatch(reqId: string, body: { unitId: string; compatible?: boolean; method?: string; notes?: string }): Observable<Crossmatch> {
        return this.http.post<Crossmatch>(`${this.base}/requests/${reqId}/crossmatch`, body, this.h());
    }
    issueUnits(reqId: string, body: { unitIds: string[]; issuedTo?: string; notes?: string }): Observable<BBIssue> {
        return this.http.post<BBIssue>(`${this.base}/requests/${reqId}/issue`, body, this.h());
    }
}

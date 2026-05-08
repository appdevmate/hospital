import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Config } from './config';

export interface Patient {
    PK: string;
    name: string;
    email?: string;
    gender?: string;
    insurance?: string;
    dob?: string;
    timestamp?: string | number;
    phone?: string;
    qid?: string;
    admissionDate?: string | null;
    department?: string | null;
    specialization?: string | null;
    status?: string | null;
    bedNumber?: string | null;
    ward?: string | null;
    medicalHistory?: string | null;
    allergies?: string[] | null;
    medications?: string[] | null;
    notes?: string | null;
    bloodGroup?: string | null;
    address?: string | null;
}

export interface PagedPatientsResponse {
    data: Patient[];
    lastKey?: string | null;
    hasMore?: boolean;
    count?: number;
    totalCount?: number;
    pageSize?: number;
}

export interface FilterOption {
    value: string;
    matchMode: string; // contains | startsWith | equals ...
    operator: 'and' | 'or';
}

export interface CreateUpdatePatientRequest {
    name: string;
    email: string;
    gender: string;
    dob: string;
    phone?: string;
    qid?: string;
    insurance?: string | null;
    admissionDate?: string | null;
    department?: string | null;
    specialization?: string | null;
    status?: string | null;
    bedNumber?: string | null;
    ward?: string | null;
    medicalHistory?: string | null;
    allergies?: string[] | null;
    medications?: string[] | null;
    notes?: string | null;
    job?: string;
    bloodGroup?: string | null;
}

export interface GetPatientsPageOpts {
    pageSize?: number;
    lastKey?: string | null;
    offset?: number;

    // filters
    search?: string;
    name?: FilterOption;
    gender?: FilterOption;
    insurance?: FilterOption;
    dobFrom?: FilterOption;
    dobTo?: FilterOption;

    // sorting
    sortField?: string | null;
    sortOrder?: number | 'asc' | 'desc';

    // allow arbitrary extra params like "status.notEquals"
    [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class PatientsService {
    private readonly hmsBase = Config.buildHmsUrl('patients');
    private readonly clinicBase = Config.buildUrl('patients');

    constructor(private http: HttpClient) {}

    private authHeaders(): HttpHeaders {
        const jwt = sessionStorage.getItem('accessToken') || '';
        return new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    }

    private mapPatient(p: any): Patient {
        return {
            PK: p.patientId ?? p.PK ?? '',
            name: p.name ?? '',
            email: p.email,
            gender: p.gender,
            insurance: p.insurance,
            dob: p.dob,
            phone: p.phone,
            qid: p.qid,
            admissionDate: p.admissionDate ?? null,
            department: p.department ?? null,
            specialization: p.specialization ?? null,
            status: p.status ?? null,
            bedNumber: p.bedNumber ?? null,
            ward: p.ward ?? null,
            medicalHistory: p.medicalHistory ?? null,
            allergies: p.allergies ?? null,
            medications: p.medications ?? null,
            notes: p.notes ?? null,
            bloodGroup: p.bloodGroup ?? null,
            address: p.address ?? null,
            timestamp: p.timestamp ?? p.createdAt,
        };
    }

    getPatientsPage(_opts: GetPatientsPageOpts): Observable<PagedPatientsResponse> {
        return this.http.get<any>(this.hmsBase, { headers: this.authHeaders() }).pipe(
            map((res) => {
                const arr: any[] = Array.isArray(res) ? res : (res.data ?? res.items ?? []);
                const data = arr.map((p) => this.mapPatient(p));
                return { data, hasMore: false, totalCount: data.length, count: data.length };
            })
        );
    }

    getPatientById(patientID: string): Observable<{ data: Patient }> {
        return this.http.get<any>(`${this.hmsBase}/${encodeURIComponent(patientID)}`, { headers: this.authHeaders() }).pipe(
            map((res) => ({ data: this.mapPatient(res.data ?? res) }))
        );
    }

    getPatientPayments(patientID: string, pageSize = 50, lastKey?: string | null) {
        let params = new HttpParams().set('pageSize', String(pageSize));
        if (lastKey) params = params.set('lastKey', lastKey);
        return this.http.get<{ items: any[]; lastKey?: string | null }>(`${this.clinicBase}/${encodeURIComponent(patientID)}/payments`, { headers: this.authHeaders(), params });
    }

    getFilterOptions(field: 'gender' | 'insurance'): Observable<string[]> {
        return this.http.get<string[]>(`${this.hmsBase}/filter-options/${field}`, { headers: this.authHeaders() });
    }

    createPatient(patientData: CreateUpdatePatientRequest | CreateUpdatePatientRequest[] | { patients: CreateUpdatePatientRequest[] }): Observable<any> {
        return this.http.post<any>(this.hmsBase, patientData, { headers: this.authHeaders() });
    }

    updatePatient(patientID: string, patientData: CreateUpdatePatientRequest): Observable<{ data: Patient }> {
        return this.http.put<any>(`${this.hmsBase}/${patientID}`, patientData, { headers: this.authHeaders() }).pipe(
            map((res) => ({ data: this.mapPatient(res.data ?? res) }))
        );
    }

    deletePatient(patientID: string): Observable<{ data: Patient }> {
        return this.http.delete<any>(`${this.hmsBase}/${patientID}`, { headers: this.authHeaders() }).pipe(
            map((res) => ({ data: this.mapPatient(res.data ?? { patientId: patientID }) }))
        );
    }

    hardDeletePatient(idList: string[]): Observable<{ data: Patient }> {
        return this.http.delete<any>(`${this.hmsBase}/bulk`, { headers: this.authHeaders(), body: { ids: idList } }).pipe(
            map((res) => ({ data: this.mapPatient(res.data ?? {}) }))
        );
    }
}

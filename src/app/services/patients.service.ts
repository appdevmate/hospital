import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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
    deletedAt?: string | null;
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
    matchMode: string;
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
    showDeleted?: boolean;

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
    path = 'patients';
    deletePath = 'patients/delete';

    constructor(private http: HttpClient) {}

    private authHeaders(): HttpHeaders {
        const jwt = sessionStorage.getItem('accessToken') || '';
        return new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    }

    getPatientsPage(opts: GetPatientsPageOpts): Observable<PagedPatientsResponse> {
        let params = new HttpParams();

        const setIf = (k: string, v?: string | number | null) => {
            if (v === null || v === undefined) return;
            const s = String(v);
            if (s.trim() !== '') params = params.set(k, s);
        };

        const addFilter = (key: keyof GetPatientsPageOpts, f?: FilterOption) => {
            if (!f) return;
            const raw = typeof f.value === 'string' ? f.value.trim() : f.value;
            if (raw === '' || raw === undefined || raw === null) return;
            if (key === 'dobFrom' || key === 'dobTo') {
                params = params.set(String(key), String(raw));
                return;
            }
            if (f.matchMode === 'equals') {
                params = params.set(String(key), String(raw));
            } else {
                params = params.set(`${String(key)}.${f.matchMode}`, String(raw));
            }
        };

        // paging
        setIf('pageSize', opts.pageSize ?? 25);
        setIf('lastKey', opts.lastKey ?? null);
        setIf('offset', opts.offset ?? null);

        // sorting
        setIf('sortField', opts.sortField ?? null);
        setIf('sortOrder', opts.sortOrder ?? null);

        // deactivated view — only sent when true so default Lambda behaviour is untouched
        if (opts.showDeleted) params = params.set('showDeleted', 'true');

        // global search
        if (opts.search && opts.search.trim()) params = params.set('search', opts.search.trim());

        // field filters
        addFilter('name', opts.name);
        addFilter('gender', opts.gender);
        addFilter('insurance', opts.insurance);
        addFilter('dobFrom', opts.dobFrom);
        addFilter('dobTo', opts.dobTo);

        // pass-through for arbitrary quick filters (status.notEquals etc.)
        const knownKeys = new Set(['pageSize', 'lastKey', 'offset', 'sortField', 'sortOrder', 'search', 'name', 'gender', 'insurance', 'dobFrom', 'dobTo', 'showDeleted']);

        Object.entries(opts).forEach(([k, v]) => {
            if (knownKeys.has(k)) return;
            if (v === null || v === undefined) return;
            if (Array.isArray(v)) {
                if (v.length === 0) return;
                params = params.set(k, v.map((x) => String(x)).join(','));
                return;
            }
            if (k.includes('.')) {
                params = params.set(k, String(v));
                return;
            }
            if (typeof v !== 'object') {
                params = params.set(k, String(v));
                return;
            }
            const maybe = v as Partial<FilterOption>;
            if (maybe && 'value' in maybe && 'matchMode' in maybe) {
                const raw = typeof maybe.value === 'string' ? maybe.value.trim() : maybe.value;
                if (raw !== '' && raw !== undefined && raw !== null) {
                    if (maybe.matchMode === 'equals') params = params.set(k, String(raw));
                    else params = params.set(`${k}.${maybe.matchMode}`, String(raw));
                }
            }
        });

        const url = Config.buildUrl(this.path);
        console.log('GET /patients query ->', params.toString());
        return this.http.get<PagedPatientsResponse>(url, { headers: this.authHeaders(), params });
    }

    getPatientById(patientID: string): Observable<{ data: Patient }> {
        return this.http.get<{ data: Patient }>(`${Config.buildUrl(this.path)}/${encodeURIComponent(patientID)}`, { headers: this.authHeaders() });
    }

    getPatientPayments(patientID: string, pageSize = 50, lastKey?: string | null) {
        let params = new HttpParams().set('pageSize', String(pageSize));
        if (lastKey) params = params.set('lastKey', lastKey);
        return this.http.get<{ items: any[]; lastKey?: string | null }>(`${Config.buildUrl(this.path)}/${encodeURIComponent(patientID)}/payments`, { headers: this.authHeaders(), params });
    }

    getFilterOptions(field: 'gender' | 'insurance'): Observable<string[]> {
        return this.http.get<string[]>(`${Config.buildUrl(this.path)}/filter-options/${field}`, { headers: this.authHeaders() });
    }

    createPatient(patientData: CreateUpdatePatientRequest | CreateUpdatePatientRequest[] | { patients: CreateUpdatePatientRequest[] }): Observable<any> {
        return this.http.post<any>(Config.buildUrl(this.path), patientData, {
            headers: this.authHeaders()
        });
    }

    updatePatient(patientID: string, patientData: CreateUpdatePatientRequest): Observable<{ data: Patient }> {
        return this.http.patch<{ data: Patient }>(Config.buildUrl(`${this.path}/${patientID}`), patientData, { headers: this.authHeaders() });
    }

    deletePatient(patientID: string): Observable<{ data: Patient }> {
        return this.http.delete<{ data: Patient }>(Config.buildUrl(`${this.path}/${patientID}`), { headers: this.authHeaders() });
    }

    hardDeletePatient(idList: string[]): Observable<{ data: Patient }> {
        return this.http.delete<{ data: Patient }>(Config.buildUrl(this.deletePath), {
            headers: this.authHeaders(),
            body: { ids: idList }
        });
    }

    // ── Restore a deactivated patient ─────────────────────────────────────────
    // Calls PATCH /patients/{id}/restore — clears deletedAt and increments
    // the patient counter back by 1 (mirrors the deletePatient transaction)
    restorePatient(patientID: string): Observable<any> {
        return this.http.patch(Config.buildUrl(`${this.path}/${encodeURIComponent(patientID)}/restore`), {}, { headers: this.authHeaders() });
    }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Config } from './config';

export interface Doctor {
    PK: string;
    name: string;
    email?: string;
    gender?: string;
    insurance?: string;
    dob?: string;
    phone?: string;
    qid?: string;
    licenseNumber?: string;
    job?: string;
    department?: string;
    specialization?: string;
    status?: string;
    hiringDate?: string;
    experienceYears?: number;
    experienceMonths?: number;
    notes?: string;
    education?: string;
    bloodGroup?: string;
    dutyDays?: string[];
    dutyStart?: string | null;
    dutyEnd?: string | null;
    timestamp?: string | number;
}

export interface PagedDoctorsResponse {
    data: Doctor[];
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

export interface CreateUpdateDoctorRequest {
    name: string;
    email: string;
    dob: string | null;
    gender: string;
    phone: string | null;
    qid: string | null;
    job: string | null;
    insurance: string | null;
    department: string | null;
    specialization: string | null;
    status: string | null;
    hiringDate: string | null;
    experienceYears?: number;
    experienceMonths?: number;
    notes?: string | null;
    education?: string | null;
    dutyDays?: string[];
    dutyStart?: string | null;
    dutyEnd?: string | null;
    licenseNumber?: string | null;
    bloodGroup?: string | null;
}

export interface GetDoctorsPageOpts {
    pageSize?: number;
    lastKey?: string | null;
    offset?: number;
    search?: string;
    name?: FilterOption;
    gender?: FilterOption;
    insurance?: FilterOption;
    dobFrom?: FilterOption;
    dobTo?: FilterOption;
    sortField?: string | null;
    sortOrder?: number | 'asc' | 'desc';
    [key: string]: any;
}

export interface Department {
    id?: string;
    PK?: string;
    name: string;
    code?: string;
    timestamp?: string | number;
}

export interface Specialization {
    id?: string;
    PK?: string;
    name: string;
    code?: string;
    timestamp?: string | number;
}

export interface DepartmentCreate {
    name: string;
    code: string;
}

export interface SpecializationCreate {
    name: string;
    code?: string;
}

export interface BulkCreateResp {
    message: string;
    count: number;
    skipped?: any[];
}

@Injectable({ providedIn: 'root' })
export class DoctorsService {
    private http = inject(HttpClient);

    private readonly path = 'doctors';
    private readonly deletePath = 'doctors/delete';

    private authHeaders(): HttpHeaders {
        const jwt = sessionStorage.getItem('accessToken') || '';
        return new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    }

    getDoctorsPage(opts: GetDoctorsPageOpts): Observable<PagedDoctorsResponse> {
        let params = new HttpParams();

        const setIf = (k: string, v?: string | number | null) => {
            if (v === null || v === undefined) return;
            const s = String(v);
            if (s.trim()) params = params.set(k, s);
        };

        const addFilter = (key: keyof GetDoctorsPageOpts, f?: FilterOption) => {
            if (!f) return;
            const raw = typeof f.value === 'string' ? f.value.trim() : f.value;
            if (raw === '' || raw === undefined || raw === null) return;
            if (key === 'dobFrom' || key === 'dobTo') {
                params = params.set(String(key), String(raw));
                return;
            }
            if (f.matchMode === 'equals') params = params.set(String(key), String(raw));
            else params = params.set(`${String(key)}.${f.matchMode}`, String(raw));
        };

        setIf('pageSize', opts.pageSize ?? 25);
        setIf('lastKey', opts.lastKey ?? null);
        setIf('offset', opts.offset ?? null);
        setIf('sortField', opts.sortField ?? null);
        setIf('sortOrder', opts.sortOrder ?? null);

        if (opts.search?.trim()) params = params.set('search', opts.search.trim());

        addFilter('name', opts.name);
        addFilter('gender', opts.gender);
        addFilter('insurance', opts.insurance);
        addFilter('dobFrom', opts.dobFrom);
        addFilter('dobTo', opts.dobTo);

        const knownKeys = new Set(['pageSize', 'lastKey', 'offset', 'sortField', 'sortOrder', 'search', 'name', 'gender', 'insurance', 'dobFrom', 'dobTo']);

        Object.entries(opts).forEach(([k, v]) => {
            if (knownKeys.has(k) || v === null || v === undefined) return;
            if (Array.isArray(v)) {
                if (v.length) params = params.set(k, v.map(String).join(','));
                return;
            }
            if (k.includes('.') || typeof v !== 'object') {
                params = params.set(k, String(v));
                return;
            }
            const maybe = v as Partial<FilterOption>;
            if ('value' in maybe && 'matchMode' in maybe) {
                const raw = typeof maybe.value === 'string' ? maybe.value.trim() : maybe.value;
                if (raw !== '' && raw !== undefined && raw !== null) {
                    if (maybe.matchMode === 'equals') params = params.set(k, String(raw));
                    else params = params.set(`${k}.${maybe.matchMode}`, String(raw));
                }
            }
        });

        return this.http.get<PagedDoctorsResponse>(Config.buildUrl(this.path), { headers: this.authHeaders(), params });
    }

    getDoctorById(doctorID: string): Observable<{ data: Doctor }> {
        return this.http.get<{ data: Doctor }>(`${Config.buildUrl(this.path)}/${encodeURIComponent(doctorID)}`, { headers: this.authHeaders() });
    }

    getDoctorByEmail(email: string): Observable<any> {
        return this.http.post<any>(Config.buildUrl(this.path + '/email'), { email, type: 'DOCTOR' }, { headers: this.authHeaders() });
    }

    getDoctorPayments(doctorID: string, pageSize = 50, lastKey?: string | null): Observable<{ items: any[]; lastKey?: string | null }> {
        let params = new HttpParams().set('pageSize', String(pageSize));
        if (lastKey) params = params.set('lastKey', lastKey);
        return this.http.get<{ items: any[]; lastKey?: string | null }>(`${Config.buildUrl(this.path)}/${encodeURIComponent(doctorID)}/payments`, { headers: this.authHeaders(), params });
    }

    getFilterOptions(field: 'gender' | 'insurance'): Observable<string[]> {
        return this.http.get<string[]>(`${Config.buildUrl(this.path)}/filter-options/${field}`, { headers: this.authHeaders() });
    }

    createDoctor(doctorData: CreateUpdateDoctorRequest | CreateUpdateDoctorRequest[] | { doctors: CreateUpdateDoctorRequest[] }): Observable<any> {
        return this.http.post<any>(Config.buildUrl(this.path), doctorData, { headers: this.authHeaders() });
    }

    updateDoctor(doctorID: string, doctorData: Partial<CreateUpdateDoctorRequest>): Observable<{ data: Doctor }> {
        return this.http.patch<{ data: Doctor }>(Config.buildUrl(`${this.path}/${doctorID}`), doctorData, { headers: this.authHeaders() });
    }

    deleteDoctor(doctorID: string): Observable<{ data: Doctor }> {
        return this.http.delete<{ data: Doctor }>(Config.buildUrl(`${this.path}/${doctorID}`), { headers: this.authHeaders() });
    }

    hardDeleteDoctor(idList: string[]): Observable<{ data: Doctor }> {
        return this.http.delete<{ data: Doctor }>(Config.buildUrl(this.deletePath), { headers: this.authHeaders(), body: { ids: idList } });
    }

    searchSpecializations(search = '', limit = 20): Observable<Specialization[]> {
        const params = new HttpParams().set('search', search).set('limit', String(limit));
        return this.http.get<{ items?: Specialization[] }>(Config.buildUrl('specializations'), { headers: this.authHeaders(), params }).pipe(map((r) => r?.items ?? []));
    }

    createSpecialization(payload: { name: string; code?: string }): Observable<{ specializationID: string }> {
        return this.http.post<{ specializationID: string }>(Config.buildUrl('specializations'), payload, { headers: this.authHeaders() });
    }

    searchDepartments(search = '', limit = 20): Observable<Department[]> {
        const params = new HttpParams().set('search', search).set('limit', String(limit));
        return this.http.get<{ items?: Department[] }>(Config.buildUrl('departments'), { headers: this.authHeaders(), params }).pipe(map((r) => r?.items ?? []));
    }

    createDepartment(payload: { name: string; code: string }): Observable<{ departmentID: string }> {
        return this.http.post<{ departmentID: string }>(Config.buildUrl('departments'), payload, { headers: this.authHeaders() });
    }

    bulkCreateDepartments(items: DepartmentCreate[]): Observable<BulkCreateResp> {
        return this.http.post<BulkCreateResp>(Config.buildUrl('departments/bulk'), { items }, { headers: this.authHeaders() });
    }

    bulkCreateSpecializations(items: SpecializationCreate[]): Observable<BulkCreateResp> {
        return this.http.post<BulkCreateResp>(Config.buildUrl('specializations/bulk'), { items }, { headers: this.authHeaders() });
    }
}

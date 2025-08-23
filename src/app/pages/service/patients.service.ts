import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Config } from './config';

export interface Patient {
    PK: string;
    name: string;
    gender?: string;
    insurance?: string;
    dob?: string;
    timestamp?: string | number;
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
    value: string;       // the actual filter value
    matchMode: string;          // e.g., "startsWith", "contains", etc.
    operator: 'and' | 'or';     // logical operator
}


export interface GetPatientsPageOpts {
    pageSize?: number;
    lastKey?: string | null;

    // Filter options
    search?: string; // Global search across all fields
    name?: FilterOption; // Specific name filter
    gender?: FilterOption;
    insurance?: FilterOption;
    dobFrom?: FilterOption;
    dobTo?: FilterOption;

    // Sorting (for future implementation)
    sortField?: string;
    sortOrder?: 'asc' | 'desc';

    // index
    [key: string]: any;
}

export interface ColumnFilter {
    field: string;
    value: any;
    matchMode: string;
}

@Injectable({ providedIn: 'root' })
export class PatientService {
    path: string = 'patients';

    constructor(private http: HttpClient) { }

    private authHeaders(): HttpHeaders {
        const jwt = sessionStorage.getItem('accessToken') || '';
        return new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    }

    getPatientsPage(opts: GetPatientsPageOpts): Observable<PagedPatientsResponse> {
        let params = new HttpParams();

        const setIf = (k: string, v?: string | number | null) => {
            if (v === null || v === undefined) return;
            const s = String(v).trim();
            if (s !== '') params = params.set(k, s);
        };

        const addFilter = (key: keyof GetPatientsPageOpts, f?: FilterOption) => {
            if (!f) return;
            const value = typeof f.value === 'string' ? f.value.trim() : f.value;
            if (!value) return;

            // If matchMode is "equals", just use plain key
            if (f.matchMode === 'equals') {
                params = params.set(String(key), value);
            } else {
                // otherwise append .matchMode
                params = params.set(`${String(key)}.${f.matchMode}`, value);
            }
        };

        // Paging
        setIf('pageSize', opts.pageSize ?? 25);
        setIf('lastKey', opts.lastKey ?? null);

        // Global search
        if (opts.search && opts.search.trim()) {
            params = params.set('search', opts.search.trim());
        }

        // Filters
        addFilter('name', opts.name);
        addFilter('gender', opts.gender);
        addFilter('insurance', opts.insurance);
        addFilter('dobFrom', opts.dobFrom);
        addFilter('dobTo', opts.dobTo);

        // Sorting
        setIf('sortField', opts.sortField);
        setIf('sortOrder', opts.sortOrder);

        console.log('GET /patients query:', params.toString());

        return this.http.get<PagedPatientsResponse>(Config.buildUrl(this.path), {
            headers: this.authHeaders(),
            params
        });
    }

    getPatientById(patientID: string): Observable<{ data: Patient }> {
        return this.http.get<{ data: Patient }>(`${Config.buildUrl(this.path)}/${encodeURIComponent(patientID)}`, { headers: this.authHeaders() });
    }

    getPatientPayments(patientID: string, pageSize = 50, lastKey?: string | null) {
        let params = new HttpParams().set('pageSize', String(pageSize));
        if (lastKey) params = params.set('lastKey', lastKey);

        return this.http.get<{ items: any[]; lastKey?: string | null }>(`${Config.buildUrl(this.path)}/${encodeURIComponent(patientID)}/payments`, { headers: this.authHeaders(), params });
    }

    // Helper method to get unique values for filter dropdowns
    getFilterOptions(field: 'gender' | 'insurance'): Observable<string[]> {
        return this.http.get<string[]>(`${Config.buildUrl(this.path)}/filter-options/${field}`, { headers: this.authHeaders() });
    }
}

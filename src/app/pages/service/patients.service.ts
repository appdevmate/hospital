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

export interface GetPatientsPageOpts {
    pageSize: number;
    lastKey?: string | null;

    // Filter options
    search?: string; // Global search across all fields
    name?: string; // Specific name filter
    gender?: string;
    insurance?: string;
    dobFrom?: string;
    dobTo?: string;

    // Sorting (for future implementation)
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface ColumnFilter {
    field: string;
    value: any;
    matchMode: string;
}

@Injectable({ providedIn: 'root' })
export class PatientService {
    path: string = 'patients';

    constructor(private http: HttpClient) {}

    private authHeaders(): HttpHeaders {
        const jwt = sessionStorage.getItem('accessToken') || '';
        return new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    }

    getPatientsPage(opts: GetPatientsPageOpts): Observable<PagedPatientsResponse> {
        let params = new HttpParams().set('pageSize', String(opts.pageSize));

        if (opts.lastKey) {
            params = params.set('lastKey', opts.lastKey);
        }

        if (opts.search && opts.search.trim()) {
            params = params.set('search', opts.search.trim());
        }

        if (opts.name && opts.name.trim()) {
            params = params.set('name', opts.name.trim());
        }

        if (opts.gender && opts.gender.trim()) {
            params = params.set('gender', opts.gender.trim());
        }

        if (opts.insurance && opts.insurance.trim()) {
            params = params.set('insurance', opts.insurance.trim());
        }

        if (opts.dobFrom && opts.dobFrom.trim()) {
            params = params.set('dobFrom', opts.dobFrom.trim());
        }

        if (opts.dobTo && opts.dobTo.trim()) {
            params = params.set('dobTo', opts.dobTo.trim());
        }

        if (opts.sortField) {
            params = params.set('sortField', opts.sortField);
        }

        if (opts.sortOrder) {
            params = params.set('sortOrder', opts.sortOrder);
        }

        return this.http.get<PagedPatientsResponse>(`${Config.buildUrl(this.path)}`, {
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

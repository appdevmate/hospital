import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Config } from './config';

export interface Patient {
    PK: string;
    name: string;
    gender?: string;
    insurance?: string;
    dob?: string; // e.g., YYYY-MM-DD
    timestamp?: string | number; // ISO or epoch
}

export interface PagedPatientsResponse {
    data: Patient[];
    lastKey?: string | null;
    total?: number; // optional if you implement counters
}

export interface GetPatientsPageOpts {
    pageSize: number;
    lastKey?: string | null;
    // server-side search/sort
    namePrefix?: string;
    sortField?: string; // e.g., 'createdAt'
    sortOrder?: 'asc' | 'desc';
    // optional scalar filters
    gender?: string;
    insurance?: string;
    dobFrom?: string; // YYYY-MM-DD
    dobTo?: string; // YYYY-MM-DD
}

@Injectable({ providedIn: 'root' })
export class PatientService {
    path: string = 'patients';

    constructor(private http: HttpClient) {}

    private authHeaders(): HttpHeaders {
        const jwt = sessionStorage.getItem('accessToken') || '';
        return new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    }

    getPatientsPage() {
        return this.http.get<PagedPatientsResponse>(`${Config.buildUrl(this.path)}`, {
            headers: this.authHeaders(),
        });
    }

    getPatientById(patientID: string) {
        return this.http.get<{ data: Patient }>(`${Config.buildUrl}/patients/${encodeURIComponent(patientID)}`, { headers: this.authHeaders() });
    }

    getPatientPayments(patientID: string, pageSize = 50, lastKey?: string | null) {
        let params = new HttpParams().set('pageSize', String(pageSize));
        if (lastKey) params = params.set('lastKey', lastKey);
        return this.http.get<{ items: any[]; lastKey?: string | null }>(`${Config.buildUrl}/patients/${encodeURIComponent(patientID)}/payments`, { headers: this.authHeaders(), params });
    }
}

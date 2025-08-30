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
  value: string;
  matchMode: string;       // contains | startsWith | equals ...
  operator: 'and' | 'or';
}

export interface CreatePatientRequest {
  name: string;
  gender: string;
  insurance?: string;
  dob: string;
  phone?: string;
  qid?: string;
  job?: string;
}

export interface GetPatientsPageOpts {
  pageSize?: number;
  lastKey?: string | null;
  offset?: number;                   // <-- needed for jump to page N

  // filters
  search?: string;
  name?: FilterOption;
  gender?: FilterOption;
  insurance?: FilterOption;
  dobFrom?: FilterOption;            // will be sent as plain dobFrom
  dobTo?: FilterOption;              // will be sent as plain dobTo

  // sorting
  sortField?: string | null;
  sortOrder?: number | 'asc' | 'desc'; // component sends 1 | -1
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class PatientService {
  path = 'patients';
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

      // dobFrom/dobTo must be plain keys (Lambda expects exact names)
      if (key === 'dobFrom' || key === 'dobTo') {
        params = params.set(String(key), String(raw));
        return;
      }

      // equals -> plain key, others -> key.matchMode
      if (f.matchMode === 'equals') {
        params = params.set(String(key), String(raw));
      } else {
        params = params.set(`${String(key)}.${f.matchMode}`, String(raw));
      }
    };

    // paging
    setIf('pageSize', opts.pageSize ?? 25);
    setIf('lastKey', opts.lastKey ?? null);
    setIf('offset', opts.offset ?? null);      // <-- send offset when present

    // sorting
    setIf('sortField', opts.sortField ?? null);
    setIf('sortOrder', opts.sortOrder ?? null);

    // global search
    if (opts.search && opts.search.trim()) params = params.set('search', opts.search.trim());

    // field filters
    addFilter('name', opts.name);
    addFilter('gender', opts.gender);
    addFilter('insurance', opts.insurance);
    addFilter('dobFrom', opts.dobFrom);  // plain
    addFilter('dobTo', opts.dobTo);      // plain

    // if you have other flattened filters, add here similarly

    const url = Config.buildUrl(this.path);
    console.log('GET /patients query ->', params.toString());
    return this.http.get<PagedPatientsResponse>(url, { headers: this.authHeaders(), params });
  }

  getPatientById(patientID: string): Observable<{ data: Patient }> {
    return this.http.get<{ data: Patient }>(
      `${Config.buildUrl(this.path)}/${encodeURIComponent(patientID)}`,
      { headers: this.authHeaders() }
    );
  }

  getPatientPayments(patientID: string, pageSize = 50, lastKey?: string | null) {
    let params = new HttpParams().set('pageSize', String(pageSize));
    if (lastKey) params = params.set('lastKey', lastKey);
    return this.http.get<{ items: any[]; lastKey?: string | null }>(
      `${Config.buildUrl(this.path)}/${encodeURIComponent(patientID)}/payments`,
      { headers: this.authHeaders(), params }
    );
  }

  getFilterOptions(field: 'gender' | 'insurance'): Observable<string[]> {
    return this.http.get<string[]>(
      `${Config.buildUrl(this.path)}/filter-options/${field}`,
      { headers: this.authHeaders() }
    );
  }

  createPatient(patientData: CreatePatientRequest): Observable<{ data: Patient }> {
    return this.http.post<{ data: Patient }>(Config.buildUrl(this.path), patientData, {
      headers: this.authHeaders()
    });
  }
}

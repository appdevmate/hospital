import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Config } from './config';

export interface ScribeSession {
    sessionId: string;
    examId: string | null;
    patientId: string | null;
    consentGiven: boolean;
    consentTimestamp: string;
    status: 'CREATED' | 'SOAP_GENERATED' | 'APPROVED';
    startedBy: string;
    transcriptDurationSec?: number | null;
    transcriptLength?: number;
    transcriptSha256?: string;
    soapDraft?: SoapDraft;
    finalSoap?: SoapDraft;
    approvedAt?: string;
    approvedBy?: string;
}

export interface SoapDraft {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
}

export interface CreateSessionRequest {
    consentGiven: boolean;
    examId?: string | null;
    patientId?: string | null;
}

export interface GenerateSoapRequest {
    transcript: string;
    durationSec?: number;
}

export interface ApproveRequest {
    soap?: SoapDraft;
}

@Injectable({ providedIn: 'root' })
export class ScribeService {
    private http = inject(HttpClient);

    private headers(): HttpHeaders {
        const jwt = sessionStorage.getItem('accessToken') || '';
        return new HttpHeaders({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`
        });
    }

    createSession(req: CreateSessionRequest): Observable<{ sessionId: string; status: string }> {
        return this.http.post<{ sessionId: string; status: string }>(
            Config.buildUrl('scribe/sessions'),
            req,
            { headers: this.headers() }
        );
    }

    generateSoap(sessionId: string, req: GenerateSoapRequest): Observable<{ sessionId: string; soap: SoapDraft }> {
        return this.http.post<{ sessionId: string; soap: SoapDraft }>(
            Config.buildUrl(`scribe/sessions/${sessionId}/soap`),
            req,
            { headers: this.headers() }
        );
    }

    approveSession(sessionId: string, req: ApproveRequest): Observable<{ sessionId: string; status: string; approvedAt: string }> {
        return this.http.post<{ sessionId: string; status: string; approvedAt: string }>(
            Config.buildUrl(`scribe/sessions/${sessionId}/approve`),
            req,
            { headers: this.headers() }
        );
    }

    getSession(sessionId: string): Observable<{ session: ScribeSession }> {
        return this.http.get<{ session: ScribeSession }>(
            Config.buildUrl(`scribe/sessions/${sessionId}`),
            { headers: this.headers() }
        );
    }
}

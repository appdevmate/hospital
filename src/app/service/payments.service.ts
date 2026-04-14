import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Config } from './config';

export interface PaymentItem {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface Payment {
    PK: string;
    SK: string;
    paymentId: string;
    patientId: string;
    invoiceNumber: string;
    patientName?: string;
    doctorId?: string;
    doctorName?: string;
    doctorEmail?: string;
    appointmentId?: string;
    items?: PaymentItem[];
    amount: number;
    insuranceProvider?: string;
    insuranceCoverage?: number;
    insuranceAmount?: number;
    patientOwes?: number;
    status: string;
    paymentType?: string;
    dueDate?: string;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateUpdatePaymentRequest {
    amount: number;
    status: string;
    invoiceNumber?: string;
    patientName?: string;
    doctorEmail?: string | null;
    doctorId?: string;
    doctorName?: string;
    appointmentId?: string;
    items?: PaymentItem[];
    insuranceProvider?: string | null;
    insuranceCoverage?: number;
    insuranceAmount?: number;
    patientOwes?: number;
    paymentType?: string;
    dueDate?: string;
    notes?: string | null;
}

export interface GetInvoicesResponse {
    data: Payment[];
    count: number;
    lastKey?: string | null;
    hasMore?: boolean;
}

@Injectable({ providedIn: 'root' })
export class PaymentsService {
    constructor(private http: HttpClient) {}

    private authHeaders(): HttpHeaders {
        const jwt = sessionStorage.getItem('accessToken') || '';
        return new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    }

    /** GET /invoices — single request for all invoices (admin or doctor filtered) */
    getAllInvoices(doctorEmail?: string): Observable<GetInvoicesResponse> {
        let params = new HttpParams();
        if (doctorEmail) params = params.set('doctorEmail', doctorEmail.toLowerCase().trim());
        return this.http.get<GetInvoicesResponse>(Config.buildUrl('invoices'), { headers: this.authHeaders(), params });
    }

    /** GET /patients/:id/payments — per-patient payments (used in patient profile) */
    getPayments(patientId: string, doctorEmail?: string): Observable<{ data: Payment[]; count: number }> {
        let params = new HttpParams();
        if (doctorEmail) params = params.set('doctorEmail', doctorEmail.toLowerCase().trim());
        return this.http.get<any>(Config.buildUrl(`patients/${encodeURIComponent(patientId)}/payments`), { headers: this.authHeaders(), params }).pipe(
            map((res: any) => ({
                data: res.data || res.items || [],
                count: res.count || 0
            }))
        );
    }

    createPayment(patientId: string, payload: CreateUpdatePaymentRequest): Observable<{ data: Payment }> {
        return this.http.post<{ data: Payment }>(Config.buildUrl(`patients/${encodeURIComponent(patientId)}/payments`), payload, { headers: this.authHeaders() });
    }

    updatePayment(patientId: string, paymentId: string, payload: Partial<CreateUpdatePaymentRequest>): Observable<{ updatedData: Payment }> {
        return this.http.patch<{ updatedData: Payment }>(Config.buildUrl(`patients/${encodeURIComponent(patientId)}/payments/${encodeURIComponent(paymentId)}`), payload, { headers: this.authHeaders() });
    }

    deletePayment(patientId: string, paymentId: string): Observable<void> {
        return this.http.delete<void>(Config.buildUrl(`patients/${encodeURIComponent(patientId)}/payments/${encodeURIComponent(paymentId)}`), { headers: this.authHeaders() });
    }
}

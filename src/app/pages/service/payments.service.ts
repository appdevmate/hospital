import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Config } from '@/pages/service/config';
import { map } from 'rxjs/operators';

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
    insuranceProvider?: string;
    insuranceCoverage?: number;
    insuranceAmount?: number;
    patientOwes?: number;
    paymentType?: string;
    dueDate?: string;
    notes?: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentsService {
    constructor(private http: HttpClient) {}

    private authHeaders(): HttpHeaders {
        const jwt = sessionStorage.getItem('accessToken') || '';
        return new HttpHeaders({ Authorization: `Bearer ${jwt}` });
    }

    private patientUrl(patientId: string): string {
        return `${Config.getBaseUrl()}/patients/${encodeURIComponent(patientId)}/payments`;
    }

    getPayments(patientId: string, doctorEmail?: string): Observable<{ data: Payment[]; count: number }> {
        const params: any = {};
        if (doctorEmail) params['doctorEmail'] = doctorEmail.toLowerCase().trim();
        return this.http.get<any>(this.patientUrl(patientId), { headers: this.authHeaders(), params }).pipe(
            map((res: any) => ({
                data: res.data || res.items || [],
                count: res.count || 0
            }))
        );
    }

    createPayment(patientId: string, payload: CreateUpdatePaymentRequest): Observable<{ data: Payment }> {
        return this.http.post<{ data: Payment }>(this.patientUrl(patientId), payload, { headers: this.authHeaders() });
    }

    updatePayment(patientId: string, paymentId: string, payload: Partial<CreateUpdatePaymentRequest>): Observable<{ updatedData: Payment }> {
        return this.http.patch<{ updatedData: Payment }>(`${this.patientUrl(patientId)}/${encodeURIComponent(paymentId)}`, payload, { headers: this.authHeaders() });
    }

    deletePayment(patientId: string, paymentId: string): Observable<any> {
        return this.http.delete(`${this.patientUrl(patientId)}/${encodeURIComponent(paymentId)}`, { headers: this.authHeaders() });
    }
}

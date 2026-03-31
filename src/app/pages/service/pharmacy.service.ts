import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Config } from '@/pages/service/config';

// ── Interfaces ────────────────────────────────────────────────────────────────
export interface Medication {
    PK: string;
    medId: string;
    name: string;
    genericName?: string;
    category: string;
    form?: string;
    strength?: string;
    unit?: string;
    manufacturer?: string;
    description?: string;
    requiresPrescription: boolean;
    reorderPoint: number;
    packUnit?: string;
    createdAt: string;
    updatedAt: string | null;
}

export interface InventoryItem {
    medId: string;
    medName: string;
    stockQty: number;
    reservedQty: number;
    unit?: string;
    location?: string;
    batchNumber?: string;
    expiryDate?: string;
    lastUpdated: string;
    reorderPoint: number;
    isLowStock: boolean;
    isExpiringSoon: boolean;
    isExpired: boolean;
    daysToExpiry: number | null;
    category?: string;
    form?: string;
    strength?: string;
    packUnit?: string;
    genericName?: string;
    adjustments: StockAdjustment[];
}

export interface StockAdjustment {
    id: string;
    type: 'received' | 'returned' | 'expired' | 'damaged' | 'correction' | 'dispensed';
    quantity: number;
    delta: number;
    newQty: number;
    reason?: string;
    batchNumber?: string;
    actorEmail: string;
    actorName: string;
    timestamp: string;
}

export interface PrescriptionQueueItem {
    examId: string;
    examDate: string;
    patientId: string;
    patientName: string;
    doctorName: string;
    prescription: any;
    allergyWarnings: string[];
    hasAllergyAlert: boolean;
}

export interface DispenseRecord {
    dispenseId: string;
    examId: string;
    prescriptionId: string;
    patientId: string;
    patientName: string;
    doctorName: string;
    medId: string;
    medName: string;
    quantityDispensed: number;
    unit?: string;
    batchNumber?: string;
    expiryDate?: string;
    notes?: string;
    allergyWarnings: string[];
    allergyOverridden: boolean;
    dispensedBy: string;
    dispensedByName: string;
    dispensedAt: string;
    prescription: any;
}

export interface PurchaseOrder {
    poId: string;
    poNumber: string;
    status: 'draft' | 'submitted' | 'ordered' | 'partially_received' | 'received' | 'cancelled';
    supplier?: string;
    notes?: string;
    expectedDate?: string;
    items: POItem[];
    totalCost: number;
    currency: string;
    createdBy: string;
    createdByName: string;
    createdAt: string;
    updatedAt: string | null;
    submittedAt?: string;
    orderedAt?: string;
    receivedAt?: string;
}

export interface POItem {
    id?: string;
    medId?: string;
    medName?: string;
    quantity?: number;
    unitCost?: number;
    totalCost?: number;
    received?: number;
    batchNumber?: string;
    expiryDate?: string;
}

export interface PharmacyAlert {
    type: 'out_of_stock' | 'low_stock' | 'expired' | 'expiring_soon';
    severity: 'critical' | 'warning';
    medId: string;
    medName: string;
    stockQty?: number;
    reorderPoint?: number;
    expiryDate?: string;
    daysToExpiry?: number;
    message: string;
}

// ── Service ───────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class PharmacyService {
    private http = inject(HttpClient);

    private headers(): HttpHeaders {
        const jwt = sessionStorage.getItem('accessToken') || '';
        return new HttpHeaders({ 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` });
    }

    // Medications
    getMedications(): Observable<Medication[]> {
        return this.http.get<Medication[]>(Config.buildUrl('pharmacy/medications'), { headers: this.headers() });
    }
    createMedication(data: Partial<Medication> & { location?: string }): Observable<any> {
        return this.http.post(Config.buildUrl('pharmacy/medications'), data, { headers: this.headers() });
    }
    updateMedication(medId: string, data: Partial<Medication>): Observable<Medication> {
        return this.http.patch<Medication>(Config.buildUrl(`pharmacy/medications/${medId}`), data, { headers: this.headers() });
    }
    deleteMedication(medId: string): Observable<any> {
        return this.http.delete(Config.buildUrl(`pharmacy/medications/${medId}`), { headers: this.headers() });
    }

    // Inventory
    getInventory(): Observable<InventoryItem[]> {
        return this.http.get<InventoryItem[]>(Config.buildUrl('pharmacy/inventory'), { headers: this.headers() });
    }
    adjustStock(
        medId: string,
        data: {
            adjustmentType: string;
            quantity: number;
            reason?: string;
            batchNumber?: string;
            expiryDate?: string;
            location?: string;
        }
    ): Observable<any> {
        return this.http.patch(Config.buildUrl(`pharmacy/inventory/${medId}`), data, { headers: this.headers() });
    }

    // Prescriptions queue
    getPrescriptions(status = 'ordered'): Observable<PrescriptionQueueItem[]> {
        const params = new HttpParams().set('status', status);
        return this.http.get<PrescriptionQueueItem[]>(Config.buildUrl('pharmacy/prescriptions'), { headers: this.headers(), params });
    }

    // Dispense
    dispense(data: { examId: string; prescriptionId: string; medId: string; quantityDispensed: number; notes?: string; allergyOverrideConfirmed?: boolean; dispensedByName?: string; dispensedByEmail?: string }): Observable<any> {
        return this.http.post(Config.buildUrl('pharmacy/dispense'), data, { headers: this.headers() });
    }
    getDispenseHistory(patientId?: string): Observable<DispenseRecord[]> {
        let params = new HttpParams();
        if (patientId) params = params.set('patientId', patientId);
        return this.http.get<DispenseRecord[]>(Config.buildUrl('pharmacy/dispense'), { headers: this.headers(), params });
    }

    // Purchase orders
    getPurchaseOrders(): Observable<PurchaseOrder[]> {
        return this.http.get<PurchaseOrder[]>(Config.buildUrl('pharmacy/purchase-orders'), { headers: this.headers() });
    }
    createPurchaseOrder(data: Partial<PurchaseOrder>): Observable<PurchaseOrder> {
        return this.http.post<PurchaseOrder>(Config.buildUrl('pharmacy/purchase-orders'), data, { headers: this.headers() });
    }
    updatePurchaseOrder(poId: string, data: Partial<PurchaseOrder>): Observable<PurchaseOrder> {
        return this.http.patch<PurchaseOrder>(Config.buildUrl(`pharmacy/purchase-orders/${poId}`), data, { headers: this.headers() });
    }

    // Alerts
    getAlerts(): Observable<{ count: number; alerts: PharmacyAlert[] }> {
        return this.http.get<any>(Config.buildUrl('pharmacy/alerts'), { headers: this.headers() });
    }
}

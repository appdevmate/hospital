import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { ConfirmationService } from 'primeng/api';
import { catchError, of, finalize } from 'rxjs';

import { PharmacyService, Medication, InventoryItem, PrescriptionQueueItem, DispenseRecord, PurchaseOrder, POItem, PharmacyAlert } from '@/service/pharmacy.service';
import { HelpersService } from '@/service/helpers-service';
import { AuthService } from '@/service/auth.service';

@Component({
    selector: 'app-pharmacy',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        TagModule,
        InputTextModule,
        InputNumberModule,
        SelectModule,
        DatePickerModule,
        TextareaModule,
        TableModule,
        TooltipModule,
        ConfirmDialogModule,
        DialogModule,
        DividerModule,
        IconFieldModule,
        InputIconModule,
        Tabs,
        TabList,
        Tab,
        TabPanels,
        TabPanel
    ],
    providers: [ConfirmationService],
    templateUrl: './pharmacy.html',
    styleUrl: './pharmacy.scss'
})
export class PharmacyComponent implements OnInit {
    private pharmService = inject(PharmacyService);
    private helpers = inject(HelpersService);
    private confirm = inject(ConfirmationService);
    private cdr = inject(ChangeDetectorRef);
    auth = inject(AuthService);

    // ── Dashboard ─────────────────────────────────────────────────────────────
    alerts: PharmacyAlert[] = [];
    alertsLoading = false;

    // ── Medications ───────────────────────────────────────────────────────────
    medications: Medication[] = [];
    medsLoading = false;
    showMedDialog = false;
    editingMed: Medication | null = null;
    medForm = {
        name: '',
        genericName: '',
        category: '',
        form: '',
        strength: '',
        unit: '',
        packUnit: '',
        manufacturer: '',
        description: '',
        requiresPrescription: true,
        reorderPoint: 10,
        location: ''
    };
    medSaving = false;

    categoryOptions = [
        'Antibiotic',
        'Analgesic',
        'Antihypertensive',
        'Antidiabetic',
        'Antihistamine',
        'Antacid',
        'Cardiovascular',
        'Respiratory',
        'Neurological',
        'Vitamins & Supplements',
        'Topical',
        'Ophthalmic',
        'Ear / Nose',
        'Vaccine',
        'Other'
    ].map((v) => ({ label: v, value: v }));
    formOptions = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Ointment', 'Drops', 'Inhaler', 'Patch', 'Suppository', 'Powder', 'Solution', 'Other'].map((v) => ({ label: v, value: v }));
    packUnitOptions = ['Box', 'Strip', 'Vial', 'Bottle', 'Ampoule', 'Sachet', 'Tube', 'Unit'].map((v) => ({ label: v, value: v }));
    // ── Inventory ─────────────────────────────────────────────────────────────
    inventory: InventoryItem[] = [];
    invLoading = false;
    showAdjustDialog = false;
    adjustingItem: InventoryItem | null = null;
    adjustForm = { adjustmentType: 'received', quantity: 0, reason: '', batchNumber: '', expiryDate: null as Date | null, location: '' };
    adjustSaving = false;
    invFilter = '';

    adjustTypeOptions = [
        { label: 'Received (add stock)', value: 'received' },
        { label: 'Returned by patient', value: 'returned' },
        { label: 'Expired / Disposed', value: 'expired' },
        { label: 'Damaged', value: 'damaged' },
        { label: 'Manual Correction', value: 'correction' }
    ];

    // ── Prescriptions Queue ───────────────────────────────────────────────────
    prescriptions: PrescriptionQueueItem[] = [];
    rxLoading = false;
    rxFilter = 'ordered';
    showDispenseDialog = false;
    dispensingRx: PrescriptionQueueItem | null = null;
    dispenseForm = { medId: '', quantityDispensed: 1, notes: '' };
    dispenseSaving = false;
    allergyWarnings: string[] = [];
    allergyOverride = false;

    rxStatusOptions = [
        { label: 'Pending (ordered)', value: 'ordered' },
        { label: 'Dispensed', value: 'dispensed' },
        { label: 'Cancelled', value: 'cancelled' }
    ];

    // ── Dispense History ──────────────────────────────────────────────────────
    dispenseHistory: DispenseRecord[] = [];
    histLoading = false;

    // ── Purchase Orders ───────────────────────────────────────────────────────
    purchaseOrders: PurchaseOrder[] = [];
    poLoading = false;
    showPoDialog = false;
    editingPo: PurchaseOrder | null = null;
    poForm = { supplier: '', notes: '', expectedDate: null as Date | null, currency: 'QAR', items: [] as Partial<POItem>[] };
    poSaving = false;
    newPoItem = { medId: '', medName: '', quantity: 1, unitCost: 0 };

    poStatusOptions = [
        { label: 'Draft', value: 'draft' },
        { label: 'Submitted', value: 'submitted' },
        { label: 'Ordered', value: 'ordered' },
        { label: 'Partially Received', value: 'partially_received' },
        { label: 'Received', value: 'received' },
        { label: 'Cancelled', value: 'cancelled' }
    ];

    get hasInventoryAlerts(): boolean {
        return this.inventory.some((i) => i.isLowStock || i.isExpired || i.isExpiringSoon);
    }

    ngOnInit() {
        this.loadAlerts();
        this.loadMedications();
        this.loadInventory();
        this.loadPrescriptions();
        this.loadDispenseHistory();
        this.loadPurchaseOrders();
    }

    // ── Alerts ────────────────────────────────────────────────────────────────
    loadAlerts() {
        this.alertsLoading = true;
        this.pharmService
            .getAlerts()
            .pipe(
                catchError(() => of({ count: 0, alerts: [] })),
                finalize(() => {
                    this.alertsLoading = false;
                    this.cdr.markForCheck();
                })
            )
            .subscribe((r) => {
                this.alerts = r.alerts;
            });
    }

    get criticalAlerts() {
        return this.alerts.filter((a) => a.severity === 'critical');
    }
    get warningAlerts() {
        return this.alerts.filter((a) => a.severity === 'warning');
    }

    // ── Medications ───────────────────────────────────────────────────────────
    loadMedications() {
        this.medsLoading = true;
        this.pharmService
            .getMedications()
            .pipe(
                catchError(() => of([])),
                finalize(() => {
                    this.medsLoading = false;
                    this.cdr.markForCheck();
                })
            )
            .subscribe((m) => {
                this.medications = m as Medication[];
            });
    }

    openNewMed() {
        this.editingMed = null;
        this.medForm = { name: '', genericName: '', category: '', form: '', strength: '', unit: '', packUnit: '', manufacturer: '', description: '', requiresPrescription: true, reorderPoint: 10, location: '' };
        this.showMedDialog = true;
    }

    openEditMed(med: Medication) {
        this.editingMed = med;
        this.medForm = {
            name: med.name,
            genericName: med.genericName || '',
            category: med.category,
            form: med.form || '',
            strength: med.strength || '',
            unit: med.unit || '',
            packUnit: med.packUnit || '',
            manufacturer: med.manufacturer || '',
            description: med.description || '',
            requiresPrescription: med.requiresPrescription,
            reorderPoint: med.reorderPoint,
            location: ''
        };
        this.showMedDialog = true;
    }

    saveMed() {
        if (!this.medForm.name || !this.medForm.category) {
            this.helpers.notifyError('Validation', 'Name and category are required');
            return;
        }
        this.medSaving = true;
        const obs = this.editingMed ? this.pharmService.updateMedication(this.editingMed.medId, this.medForm) : this.pharmService.createMedication(this.medForm);

        obs.pipe(
            finalize(() => {
                this.medSaving = false;
                this.cdr.markForCheck();
            })
        ).subscribe({
            next: () => {
                this.helpers.notifySuccess(this.editingMed ? 'Medication updated' : 'Medication added');
                this.showMedDialog = false;
                this.loadMedications();
                this.loadInventory();
            },
            error: (e) => this.helpers.notifyError('Error', e?.error?.message || 'Could not save')
        });
    }

    deleteMed(med: Medication) {
        this.confirm.confirm({
            message: `Delete ${med.name} from the catalog? This cannot be undone.`,
            header: 'Confirm Delete',
            icon: 'pi pi-trash',
            acceptButtonProps: { label: 'Delete', severity: 'danger' },
            rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
            accept: () => {
                this.pharmService.deleteMedication(med.medId).subscribe({
                    next: () => {
                        this.helpers.notifySuccess('Medication deleted');
                        this.loadMedications();
                        this.loadInventory();
                    },
                    error: (e) => this.helpers.notifyError('Error', e?.error?.message || 'Could not delete')
                });
            }
        });
    }

    // ── Inventory ─────────────────────────────────────────────────────────────
    loadInventory() {
        this.invLoading = true;
        this.pharmService
            .getInventory()
            .pipe(
                catchError(() => of([])),
                finalize(() => {
                    this.invLoading = false;
                    this.cdr.markForCheck();
                })
            )
            .subscribe((i) => {
                this.inventory = i as InventoryItem[];
            });
    }

    get filteredInventory() {
        if (!this.invFilter) return this.inventory;
        const q = this.invFilter.toLowerCase();
        return this.inventory.filter((i) => i.medName?.toLowerCase().includes(q) || i.category?.toLowerCase().includes(q));
    }

    openAdjust(item: InventoryItem) {
        this.adjustingItem = item;
        this.adjustForm = {
            adjustmentType: 'received',
            quantity: 0,
            reason: '',
            batchNumber: item.batchNumber || '',
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            location: item.location || ''
        };
        this.showAdjustDialog = true;
    }

    saveAdjust() {
        if (!this.adjustForm.quantity) {
            this.helpers.notifyError('Validation', 'Quantity is required');
            return;
        }
        if (!this.adjustingItem) return;
        this.adjustSaving = true;
        this.pharmService
            .adjustStock(this.adjustingItem.medId, {
                adjustmentType: this.adjustForm.adjustmentType,
                quantity: this.adjustForm.quantity,
                reason: this.adjustForm.reason || undefined,
                batchNumber: this.adjustForm.batchNumber || undefined,
                expiryDate: this.adjustForm.expiryDate ? new Date(this.adjustForm.expiryDate).toISOString().slice(0, 10) : undefined,
                location: this.adjustForm.location || undefined
            })
            .pipe(
                finalize(() => {
                    this.adjustSaving = false;
                    this.cdr.markForCheck();
                })
            )
            .subscribe({
                next: (r) => {
                    this.helpers.notifySuccess(`Stock updated. New qty: ${r.newQty}`);
                    this.showAdjustDialog = false;
                    this.loadInventory();
                    this.loadAlerts();
                },
                error: (e) => this.helpers.notifyError('Error', e?.error?.message || 'Could not adjust stock')
            });
    }

    // ── Prescriptions ─────────────────────────────────────────────────────────
    loadPrescriptions() {
        this.rxLoading = true;
        this.pharmService
            .getPrescriptions(this.rxFilter)
            .pipe(
                catchError(() => of([])),
                finalize(() => {
                    this.rxLoading = false;
                    this.cdr.markForCheck();
                })
            )
            .subscribe((r) => {
                this.prescriptions = r as PrescriptionQueueItem[];
            });
    }

    openDispense(rx: PrescriptionQueueItem) {
        this.dispensingRx = rx;
        this.allergyWarnings = [];
        this.allergyOverride = false;
        this.dispenseForm = { medId: '', quantityDispensed: 1, notes: '' };
        this.showDispenseDialog = true;
    }

    doDispense(overrideAllergy = false) {
        if (!this.dispensingRx || !this.dispenseForm.medId) {
            this.helpers.notifyError('Validation', 'Select the inventory medication to dispense');
            return;
        }
        this.dispenseSaving = true;
        this.pharmService
            .dispense({
                examId: this.dispensingRx.examId,
                prescriptionId: this.dispensingRx.prescription.id,
                medId: this.dispenseForm.medId,
                quantityDispensed: this.dispenseForm.quantityDispensed,
                notes: this.dispenseForm.notes || undefined,
                allergyOverrideConfirmed: overrideAllergy || undefined
            })
            .pipe(
                finalize(() => {
                    this.dispenseSaving = false;
                    this.cdr.markForCheck();
                })
            )
            .subscribe({
                next: (r) => {
                    if (r.requiresAllergyConfirmation) {
                        // Backend requires override confirmation
                        this.allergyWarnings = r.allergyWarnings;
                        this.allergyOverride = true;
                        return;
                    }
                    this.helpers.notifySuccess(`Dispensed successfully. Stock remaining: ${r.newStock}`);
                    this.showDispenseDialog = false;
                    this.allergyWarnings = [];
                    this.allergyOverride = false;
                    this.loadPrescriptions();
                    this.loadInventory();
                    this.loadDispenseHistory();
                    this.loadAlerts();
                },
                error: (e) => this.helpers.notifyError('Dispense Failed', e?.error?.message || 'Could not dispense')
            });
    }

    confirmAllergyOverride() {
        this.doDispense(true);
    }

    // ── Dispense History ──────────────────────────────────────────────────────
    loadDispenseHistory() {
        this.histLoading = true;
        this.pharmService
            .getDispenseHistory()
            .pipe(
                catchError(() => of([])),
                finalize(() => {
                    this.histLoading = false;
                    this.cdr.markForCheck();
                })
            )
            .subscribe((r) => {
                this.dispenseHistory = r as DispenseRecord[];
            });
    }

    // ── Purchase Orders ───────────────────────────────────────────────────────
    loadPurchaseOrders() {
        this.poLoading = true;
        this.pharmService
            .getPurchaseOrders()
            .pipe(
                catchError(() => of([])),
                finalize(() => {
                    this.poLoading = false;
                    this.cdr.markForCheck();
                })
            )
            .subscribe((r) => {
                this.purchaseOrders = r as PurchaseOrder[];
            });
    }

    openNewPo() {
        this.editingPo = null;
        this.poForm = { supplier: '', notes: '', expectedDate: null, currency: 'QAR', items: [] };
        this.newPoItem = { medId: '', medName: '', quantity: 1, unitCost: 0 };
        this.showPoDialog = true;
    }

    openEditPo(po: PurchaseOrder) {
        this.editingPo = po;
        this.poForm = { supplier: po.supplier || '', notes: po.notes || '', expectedDate: po.expectedDate ? new Date(po.expectedDate) : null, currency: po.currency, items: [...po.items] };
        this.showPoDialog = true;
    }

    addPoItem() {
        if (!this.newPoItem.medName || !this.newPoItem.quantity || !this.newPoItem.unitCost) {
            this.helpers.notifyError('Validation', 'Medication name, quantity, and unit cost are required');
            return;
        }
        this.poForm.items = [...this.poForm.items, { ...this.newPoItem, id: '', totalCost: this.newPoItem.quantity * this.newPoItem.unitCost, received: 0 }];
        this.newPoItem = { medId: '', medName: '', quantity: 1, unitCost: 0 };
    }

    removePoItem(i: number) {
        this.poForm.items = this.poForm.items.filter((_, idx) => idx !== i);
    }

    get poTotal(): number {
        return this.poForm.items.reduce((s, i) => s + (i.quantity || 0) * (i.unitCost || 0), 0);
    }

    savePo() {
        if (!this.poForm.items.length) {
            this.helpers.notifyError('Validation', 'Add at least one item');
            return;
        }
        this.poSaving = true;
        const payload = {
            ...this.poForm,
            expectedDate: this.poForm.expectedDate ? new Date(this.poForm.expectedDate).toISOString().slice(0, 10) : undefined
        };
        const obs = this.editingPo ? this.pharmService.updatePurchaseOrder(this.editingPo.poId, payload) : this.pharmService.createPurchaseOrder(payload);

        obs.pipe(
            finalize(() => {
                this.poSaving = false;
                this.cdr.markForCheck();
            })
        ).subscribe({
            next: () => {
                this.helpers.notifySuccess('Purchase order saved');
                this.showPoDialog = false;
                this.loadPurchaseOrders();
            },
            error: (e) => this.helpers.notifyError('Error', e?.error?.message || 'Could not save')
        });
    }

    updatePoStatus(po: PurchaseOrder, status: string) {
        this.pharmService.updatePurchaseOrder(po.poId, { status: status as any }).subscribe({
            next: () => {
                this.helpers.notifySuccess(`PO status updated to ${status}`);
                this.loadPurchaseOrders();
                this.loadInventory();
            },
            error: (e) => this.helpers.notifyError('Error', e?.error?.message || 'Could not update status')
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    alertSeverity(a: PharmacyAlert): 'danger' | 'warn' {
        return a.severity === 'critical' ? 'danger' : 'warn';
    }

    stockSeverity(item: InventoryItem): 'success' | 'warn' | 'danger' | 'secondary' {
        if (item.stockQty === 0 || item.isExpired) return 'danger';
        if (item.isLowStock || item.isExpiringSoon) return 'warn';
        return 'success';
    }

    poStatusSeverity(s: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
        const m: any = { draft: 'secondary', submitted: 'info', ordered: 'warn', partially_received: 'warn', received: 'success', cancelled: 'danger' };
        return m[s] || 'secondary';
    }

    rxSeverity(rx: PrescriptionQueueItem): 'warn' | 'danger' {
        return rx.hasAllergyAlert ? 'danger' : 'warn';
    }

    get inventoryMedOptions() {
        return this.inventory.map((i) => ({ label: `${i.medName} (${i.stockQty} ${i.packUnit || 'units'} available)`, value: i.medId }));
    }
}

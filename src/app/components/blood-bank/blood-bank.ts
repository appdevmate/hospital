import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputMaskModule } from 'primeng/inputmask';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { ConfirmationService } from 'primeng/api';
import { finalize } from 'rxjs';

import {
    BloodBankService, Donor, BBUnit, BBRequest, StockRow,
    BloodType, ProductType, UnitStatus, ReqStatus, Urgency, Crossmatch
} from '@/services/bloodbank.service';
import { HelpersService } from '@/services/helpers-service';
import { AuthService } from '@/services/auth.service';
import { PatientsService } from '@/services/patients.service';
import { GENDER_OPTIONS, PHONE_MASK as APP_PHONE_MASK, QID_MASK, BLOOD_TYPE_OPTIONS, isValidPhone, isValidQid } from '@/shared/form-constants';

@Component({
    selector: 'app-blood-bank',
    standalone: true,
    imports: [
        CommonModule, FormsModule, ButtonModule, TagModule, InputTextModule,
        InputNumberModule, SelectModule, MultiSelectModule, InputMaskModule,
        DatePickerModule, TextareaModule, TableModule, TooltipModule, ConfirmDialogModule,
        DialogModule, DividerModule, Tabs, TabList, Tab, TabPanels, TabPanel
    ],
    providers: [ConfirmationService],
    templateUrl: './blood-bank.html',
    styleUrl: './blood-bank.scss'
})
export class BloodBankComponent implements OnInit {
    private bb = inject(BloodBankService);
    private helpers = inject(HelpersService);
    private confirm = inject(ConfirmationService);
    private cdr = inject(ChangeDetectorRef);
    private patientsSvc = inject(PatientsService);
    auth = inject(AuthService);

    readonly BLOOD_TYPES: BloodType[] = BLOOD_TYPE_OPTIONS as BloodType[];
    readonly PRODUCT_TYPES: { label: string; value: ProductType }[] = [
        { label: 'Whole blood', value: 'whole' },
        { label: 'Packed RBC',  value: 'packed-rbc' },
        { label: 'Plasma',      value: 'plasma' },
        { label: 'Platelets',   value: 'platelets' },
        { label: 'Cryo',        value: 'cryo' }
    ];
    readonly UNIT_STATUSES: UnitStatus[] = ['available','reserved','issued','used','discarded','expired','quarantined'];
    readonly REQ_STATUSES: ReqStatus[]   = ['pending','approved','crossmatched','issued','cancelled','rejected'];
    readonly URGENCIES: Urgency[]        = ['routine','urgent','emergency','stat'];
    readonly GENDERS = GENDER_OPTIONS;
    /** Standard phone mask used across the app (patient/doctor) */
    readonly PHONE_MASK = APP_PHONE_MASK;
    readonly QID_MASK = QID_MASK;

    canManageInventory = false;
    canRequestBlood    = false;
    canIssueBlood      = false;

    // Stock
    stock: StockRow[] = [];
    stockLoading = false;

    // Donors
    donors: Donor[] = [];
    donorsLoading = false;
    showDonorDialog = false;
    editingDonor: Donor | null = null;
    donorForm: Partial<Donor> = this.emptyDonor();

    // Donations
    showDonationDialog = false;
    donationDonor: Donor | null = null;
    donationForm: any = this.emptyDonation();

    // Units
    units: BBUnit[] = [];
    unitsLoading = false;
    unitFilters = { status: null as UnitStatus | null, bloodType: null as BloodType | null, productType: null as ProductType | null };

    // Requests
    requests: BBRequest[] = [];
    requestsLoading = false;
    showRequestDialog = false;
    requestForm: any = this.emptyRequest();
    patients: any[] = [];

    // Request detail / crossmatch / issue
    showDetailDialog = false;
    detail: BBRequest | null = null;
    detailLoading = false;
    xmatchUnitId: string | null = null;
    xmatchCandidates: BBUnit[] = [];
    issueUnitIds: string[] = [];

    ngOnInit() {
        const isAdmin   = !!this.auth.isAdmin;
        const isDev     = !!this.auth.isDeveloper;
        const isDoc     = !!this.auth.isDoctor;
        const isPharm   = !!this.auth.isPharmacist;
        this.canManageInventory = isAdmin || isDev || isPharm;
        this.canRequestBlood    = isAdmin || isDev || isDoc;
        this.canIssueBlood      = isAdmin || isDev || isPharm;

        this.refreshStock();
        this.refreshDonors();
        this.refreshUnits();
        this.refreshRequests();
        this.patientsSvc.getPatientsPage({ pageSize: 500 } as any).subscribe({
            next: (r: any) => (this.patients = (r?.items || r?.data || r || []) as any[]),
            error: () => {}
        });
    }

    // ── Stock ────────────────────────────────────────────────────────────────
    refreshStock() {
        this.stockLoading = true;
        this.bb.stock().pipe(finalize(() => (this.stockLoading = false))).subscribe({
            next: (s) => (this.stock = s),
            error: () => this.helpers.notifyError('Stock', 'Failed to load stock')
        });
    }
    stockCellSeverity(n: number | undefined): 'success' | 'warn' | 'danger' | 'secondary' {
        if (!n) return 'secondary';
        if (n < 3) return 'danger';
        if (n < 6) return 'warn';
        return 'success';
    }

    // ── Donors ───────────────────────────────────────────────────────────────
    refreshDonors() {
        this.donorsLoading = true;
        this.bb.listDonors().pipe(finalize(() => (this.donorsLoading = false))).subscribe({
            next: (d) => (this.donors = d || []),
            error: () => this.helpers.notifyError('Donors', 'Failed to load donors')
        });
    }
    openDonorDialog(d?: Donor) {
        this.editingDonor = d || null;
        this.donorForm = d ? { ...d } : this.emptyDonor();
        this.showDonorDialog = true;
    }
    saveDonor() {
        if (!this.donorForm.name || !this.donorForm.bloodType) {
            this.helpers.notifyError('Required', 'Name and blood type are required.');
            return;
        }
        const hasPhone = isValidPhone(this.donorForm.phone);
        const hasQid   = isValidQid(this.donorForm.qid);
        if (!hasPhone && !hasQid) {
            this.helpers.notifyError('Identifier required', 'Enter at least one — phone number or Qatar ID.');
            return;
        }
        if (this.donorForm.phone && !hasPhone) {
            this.helpers.notifyError('Invalid phone', 'Enter a valid phone number.');
            return;
        }
        if (this.donorForm.qid && !hasQid) {
            this.helpers.notifyError('Invalid QID', 'Qatar ID must be 11 digits.');
            return;
        }
        const obs = this.editingDonor
            ? this.bb.updateDonor(this.editingDonor.donorId, this.donorForm)
            : this.bb.createDonor(this.donorForm);
        obs.subscribe({
            next: () => {
                this.showDonorDialog = false;
                this.helpers.notifySuccess(this.editingDonor ? 'Donor updated' : 'Donor created');
                this.refreshDonors();
            },
            error: (e) => this.helpers.notifyError('Save', e?.error?.message || 'Failed')
        });
    }
    deleteDonor(d: Donor) {
        this.confirm.confirm({
            message: `Delete donor ${d.name}?`,
            accept: () => this.bb.deleteDonor(d.donorId).subscribe({
                next: () => { this.helpers.notifySuccess('Donor removed'); this.refreshDonors(); },
                error: () => this.helpers.notifyError('Delete', 'Failed')
            })
        });
    }
    openDonationDialog(d: Donor) {
        this.donationDonor = d;
        this.donationForm = this.emptyDonation();
        this.showDonationDialog = true;
    }
    saveDonation() {
        if (!this.donationDonor) return;
        this.bb.createDonation(this.donationDonor.donorId, this.donationForm).subscribe({
            next: () => {
                this.helpers.notifySuccess(`Donation recorded — ${this.donationForm.units || 1} unit(s) added to inventory.`);
                this.showDonationDialog = false;
                this.refreshDonors();
                this.refreshUnits();
                this.refreshStock();
            },
            error: (e) => this.helpers.notifyError('Save', e?.error?.message || 'Failed')
        });
    }

    // ── Units ────────────────────────────────────────────────────────────────
    refreshUnits() {
        this.unitsLoading = true;
        this.bb.listUnits({
            status: this.unitFilters.status || undefined,
            bloodType: this.unitFilters.bloodType || undefined,
            productType: this.unitFilters.productType || undefined
        }).pipe(finalize(() => (this.unitsLoading = false))).subscribe({
            next: (u) => (this.units = u || []),
            error: () => this.helpers.notifyError('Units', 'Failed to load inventory')
        });
    }
    unitStatusSeverity(s: UnitStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        switch (s) {
            case 'available': return 'success';
            case 'reserved':  return 'info';
            case 'issued':    return 'warn';
            case 'expired':
            case 'discarded':
            case 'quarantined': return 'danger';
            default: return 'secondary';
        }
    }
    discardUnit(u: BBUnit) {
        this.confirm.confirm({
            message: `Discard unit ${u.unitId.slice(0,8)} (${u.bloodType}, ${u.productType})?`,
            accept: () => this.bb.discardUnit(u.unitId).subscribe({
                next: () => { this.helpers.notifySuccess('Unit discarded'); this.refreshUnits(); this.refreshStock(); },
                error: () => this.helpers.notifyError('Discard', 'Failed')
            })
        });
    }

    // ── Requests ─────────────────────────────────────────────────────────────
    refreshRequests() {
        this.requestsLoading = true;
        this.bb.listRequests().pipe(finalize(() => (this.requestsLoading = false))).subscribe({
            next: (r) => (this.requests = r || []),
            error: () => this.helpers.notifyError('Requests', 'Failed to load requests')
        });
    }
    requestStatusSeverity(s: ReqStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        switch (s) {
            case 'issued':       return 'success';
            case 'crossmatched': return 'info';
            case 'pending':
            case 'approved':     return 'warn';
            case 'cancelled':
            case 'rejected':     return 'danger';
            default: return 'secondary';
        }
    }
    urgencySeverity(u: Urgency): 'success' | 'info' | 'warn' | 'danger' {
        switch (u) {
            case 'routine':   return 'info';
            case 'urgent':    return 'warn';
            case 'emergency':
            case 'stat':      return 'danger';
            default:          return 'info';
        }
    }
    openRequestDialog() {
        this.requestForm = this.emptyRequest();
        this.showRequestDialog = true;
    }
    onRequestPatientChange(patientId: string) {
        const p = this.patients.find((x) => x.PK === patientId || x.patientId === patientId);
        if (p) {
            this.requestForm.patientName = p.name;
            if (p.bloodType) this.requestForm.bloodType = p.bloodType;
        }
    }
    submitRequest() {
        if (!this.requestForm.patientId || !this.requestForm.patientName || !this.requestForm.bloodType) {
            this.helpers.notifyError('Required', 'Patient and blood type are required.');
            return;
        }
        this.bb.createRequest(this.requestForm).subscribe({
            next: () => {
                this.helpers.notifySuccess('Request submitted');
                this.showRequestDialog = false;
                this.refreshRequests();
            },
            error: (e) => this.helpers.notifyError('Save', e?.error?.message || 'Failed')
        });
    }
    cancelRequest(r: BBRequest) {
        this.confirm.confirm({
            message: `Cancel request for ${r.patientName}?`,
            accept: () => this.bb.cancelRequest(r.requestId).subscribe({
                next: () => { this.helpers.notifySuccess('Request cancelled'); this.refreshRequests(); this.refreshUnits(); },
                error: () => this.helpers.notifyError('Cancel', 'Failed')
            })
        });
    }
    openDetail(r: BBRequest) {
        this.detailLoading = true;
        this.detail = null;
        this.showDetailDialog = true;
        this.xmatchUnitId = null;
        this.issueUnitIds = [];
        this.bb.getRequest(r.requestId).pipe(finalize(() => (this.detailLoading = false))).subscribe({
            next: (full) => {
                this.detail = full;
                this.loadXmatchCandidates(full);
            },
            error: () => { this.helpers.notifyError('Detail', 'Failed to load request'); this.showDetailDialog = false; }
        });
    }
    private loadXmatchCandidates(r: BBRequest) {
        this.bb.listUnits({ status: 'available', productType: r.productType }).subscribe({
            next: (u) => (this.xmatchCandidates = (u || []).filter((x) => x.bloodType !== null)),
            error: () => (this.xmatchCandidates = [])
        });
    }
    addCrossmatch() {
        if (!this.detail || !this.xmatchUnitId) return;
        this.bb.addCrossmatch(this.detail.requestId, { unitId: this.xmatchUnitId }).subscribe({
            next: () => { this.helpers.notifySuccess('Cross-match saved'); this.openDetail(this.detail!); this.refreshUnits(); this.refreshRequests(); this.refreshStock(); },
            error: (e) => this.helpers.notifyError('Cross-match', e?.error?.message || 'Failed')
        });
    }
    compatibleCrossmatchedUnits(): Crossmatch[] {
        return (this.detail?.crossmatches || []).filter((x) => x.compatible);
    }
    issueSelectedUnits() {
        if (!this.detail || !this.issueUnitIds.length) return;
        this.bb.issueUnits(this.detail.requestId, { unitIds: this.issueUnitIds }).subscribe({
            next: () => {
                this.helpers.notifySuccess(`Issued ${this.issueUnitIds.length} unit(s)`);
                this.showDetailDialog = false;
                this.refreshRequests();
                this.refreshUnits();
                this.refreshStock();
            },
            error: (e) => this.helpers.notifyError('Issue', e?.error?.message || 'Failed')
        });
    }

    // ── Form helpers ─────────────────────────────────────────────────────────
    private emptyDonor(): Partial<Donor> {
        return { name: '', bloodType: undefined as any, gender: '', phone: '', qid: '', address: '', notes: '' };
    }
    private emptyDonation() {
        return { productType: 'whole' as ProductType, units: 1, volumeMl: 450, collectionDate: new Date().toISOString().slice(0,10), notes: '' };
    }
    private emptyRequest(): Partial<BBRequest> {
        return {
            patientId: '',
            patientName: '',
            bloodType: undefined as any,
            productType: 'packed-rbc',
            unitsRequested: 1,
            urgency: 'routine',
            clinicalReason: '',
            notes: ''
        };
    }
}

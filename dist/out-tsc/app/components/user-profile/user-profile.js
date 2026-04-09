import { __decorate } from "tslib";
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { ProgressBarModule } from 'primeng/progressbar';
import { TabsModule } from 'primeng/tabs';
import { TimelineModule } from 'primeng/timeline';
import { ChipModule } from 'primeng/chip';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { RatingModule } from 'primeng/rating';
import { PanelModule } from 'primeng/panel';
import { DoctorsService } from '@/pages/service/doctors.service';
class UserProfileStore {
    _profile$;
    userDataLoaded = false;
    apiCallInProgress = false;
    lastLoadedEmail = '';
    doctorsService = inject(DoctorsService);
    async initializeProfile() {
        // Prevent concurrent API calls
        if (this.apiCallInProgress) {
            return;
        }
        const userDataStr = localStorage.getItem('userData');
        let userData = null;
        if (userDataStr) {
            try {
                userData = JSON.parse(userDataStr);
            }
            catch (e) {
                console.error('Failed to parse userData from localStorage', e);
            }
        }
        const fullName = userData?.name || '';
        const email = userData?.email || '';
        const phone = userData?.phone_number || '';
        const userId = userData?.sub || '';
        // Skip API call if email hasn't changed and data already loaded
        if (email === this.lastLoadedEmail && this.userDataLoaded) {
            return;
        }
        // Try to fetch doctor profile from API if email exists
        if (email) {
            try {
                this.apiCallInProgress = true;
                const response = await this.doctorsService.getDoctorByEmail(email).toPromise();
                if (response?.data) {
                    const doctorData = response.data;
                    this.userDataLoaded = true;
                    this.lastLoadedEmail = email;
                    this._profile$.next({
                        id: doctorData.id || userId,
                        fullName: doctorData.name || fullName,
                        role: doctorData.job || '',
                        department: doctorData.department || '',
                        email: doctorData.email || email,
                        phone: doctorData.phone || phone,
                        bio: doctorData.notes || '',
                        licenseNumber: doctorData.licenseNumber,
                        yearsExperience: doctorData.experienceYears || 0,
                        experienceMonths: doctorData.experienceMonths || 0,
                        patientRating: 0,
                        successRate: 0,
                        totalPatients: 0,
                        completedProcedures: 0,
                        gender: doctorData.gender,
                        specialization: doctorData.specialization,
                        education: doctorData.education,
                        status: doctorData.status,
                        insurance: doctorData.insurance,
                        qid: doctorData.qid,
                        dob: doctorData.dob,
                        hiringDate: doctorData.hiringDate,
                        dutyDays: doctorData.dutyDays,
                        dutyStart: doctorData.dutyStart,
                        dutyEnd: doctorData.dutyEnd,
                        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(doctorData.name || fullName)}&background=1e40af&color=fff&size=256`
                    });
                    return;
                }
            }
            catch (error) {
                console.error('Failed to fetch doctor profile from API', error);
            }
            finally {
                this.apiCallInProgress = false;
            }
        }
        // Fallback to localStorage data if API call fails or email is not available
        this.userDataLoaded = true;
        this.lastLoadedEmail = email;
        this._profile$.next({
            id: userId,
            fullName: fullName,
            role: '',
            department: '',
            email: email,
            phone: phone,
            bio: '',
            licenseNumber: null,
            yearsExperience: 0,
            patientRating: 0,
            successRate: 0,
            totalPatients: 0,
            completedProcedures: 0,
            avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=1e40af&color=fff&size=256`
        });
    }
    constructor() {
        this._profile$ = new BehaviorSubject({
            id: '',
            fullName: '',
            role: '',
            department: '',
            email: '',
            phone: '',
            bio: '',
            licenseNumber: null,
            yearsExperience: 0,
            patientRating: 0,
            successRate: 0,
            totalPatients: 0,
            completedProcedures: 0,
            avatarUrl: ''
        });
        // Initialize with current localStorage data once
        this.initializeProfile();
        // Listen for storage changes from other tabs/windows - only if userData actually changed
        window.addEventListener('storage', (event) => {
            if (event.key === 'userData') {
                this.initializeProfile();
            }
        });
        // Listen for custom event dispatched from same-tab components (e.g., topbar)
        window.addEventListener('userDataChanged', () => {
            this.initializeProfile();
        });
    }
    get profile$() {
        return this._profile$.asObservable();
    }
    updateProfile(update) {
        this._profile$.next({ ...this._profile$.value, ...update });
    }
}
let UserProfileComponent = class UserProfileComponent {
    store = inject(UserProfileStore);
    messageService = inject(MessageService);
    currentProfile = null;
    editDialogVisible = false;
    appointmentDialogVisible = false;
    editForm = { fullName: '', email: '', phone: '', bio: '' };
    newAppointment = { patient: '', date: '', time: '', type: '', status: 'scheduled' };
    appointments = [];
    activities = [];
    ngOnInit() {
        this.store.profile$.subscribe((profile) => {
            this.currentProfile = profile;
        });
    }
    isMedicalStaff() {
        if (!this.currentProfile?.role)
            return false;
        const role = this.currentProfile.role.toLowerCase();
        return role === 'doctor' || role === 'nurse';
    }
    openEditDialog() {
        if (this.currentProfile) {
            this.editForm = {
                fullName: this.currentProfile.fullName,
                email: this.currentProfile.email,
                phone: this.currentProfile.phone,
                bio: this.currentProfile.bio
            };
        }
        this.editDialogVisible = true;
    }
    saveProfile() {
        this.store.updateProfile(this.editForm);
        this.closeEditDialog();
        this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Profile updated successfully',
            life: 3000
        });
    }
    closeEditDialog() {
        this.editDialogVisible = false;
    }
    openAppointmentDialog() {
        this.newAppointment = { patient: '', date: '', time: '', type: '', status: 'scheduled' };
        this.appointmentDialogVisible = true;
    }
    addAppointment() {
        if (this.newAppointment.patient && this.newAppointment.date && this.newAppointment.time) {
            this.appointments.push({ ...this.newAppointment });
            this.closeAppointmentDialog();
            this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Appointment added successfully',
                life: 3000
            });
        }
        else {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Please fill all fields',
                life: 3000
            });
        }
    }
    closeAppointmentDialog() {
        this.appointmentDialogVisible = false;
    }
    printProfile() {
        window.print();
    }
    exportProfile() {
        if (this.currentProfile) {
            const data = `PROFILE EXPORT\n\n${this.currentProfile.fullName}\n${this.currentProfile.role}\nEmail: ${this.currentProfile.email}\nPhone: ${this.currentProfile.phone}\n\nLicense: ${this.currentProfile.licenseNumber}\nExperience: ${this.currentProfile.yearsExperience} years\nSuccess Rate: ${this.currentProfile.successRate}%`;
            const blob = new Blob([data], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `profile-${this.currentProfile.fullName.replace(/\s/g, '-')}.txt`;
            a.click();
            window.URL.revokeObjectURL(url);
            this.messageService.add({
                severity: 'success',
                summary: 'Exported',
                detail: 'Profile exported successfully',
                life: 3000
            });
        }
    }
    getStatusColor(status) {
        switch (status) {
            case 'completed':
                return 'success';
            case 'scheduled':
                return 'info';
            case 'cancelled':
                return 'danger';
            default:
                return 'secondary';
        }
    }
    getStatusSeverity(status) {
        switch (status?.toLowerCase()) {
            case 'senior':
                return 'success';
            case 'junior':
                return 'info';
            case 'under development':
                return 'warn';
            case 'associate':
                return 'secondary';
            default:
                return 'secondary';
        }
    }
};
UserProfileComponent = __decorate([
    Component({
        selector: 'app-user-profile',
        standalone: true,
        imports: [
            CommonModule,
            FormsModule,
            TagModule,
            TableModule,
            CardModule,
            ButtonModule,
            DividerModule,
            ProgressBarModule,
            TabsModule,
            TimelineModule,
            ChipModule,
            DialogModule,
            InputTextModule,
            TextareaModule,
            ToastModule,
            AvatarModule,
            RatingModule,
            PanelModule
        ],
        providers: [UserProfileStore, MessageService],
        template: `
        <div class="p-4 md:p-6 min-h-screen w-full grid md:grid-cols-12 gap-6">
            <!-- Hero Section with Green Gradient - Full Width -->
            <div class="col-span-12 card p-0! overflow-hidden flex flex-col">
                <div class="bg-gradient-to-r from-green-100 to-green-50 px-6 py-8">
                    <div class="flex items-center gap-6">
                        <div class="relative">
                            <p-avatar [image]="currentProfile?.avatarUrl" shape="circle" size="xlarge" class="ring-4 ring-white"></p-avatar>
                            <div class="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-2 border-white"></div>
                        </div>
                        <div class="flex-1">
                            <div class="flex items-center gap-3 mb-2">
                                <h1 class="text-3xl font-bold text-gray-900">{{ currentProfile?.fullName }}</h1>
                                <p-tag [value]="currentProfile?.status || 'N/A' | uppercase" [severity]="getStatusSeverity(currentProfile?.status)" class="text-sm"></p-tag>
                            </div>
                            <p class="text-xl text-gray-700 mb-3">{{ currentProfile?.role }}</p>
                            <div class="flex flex-wrap gap-2">
                                <p-tag [value]="currentProfile?.specialization || 'N/A'" severity="warn" [style]="{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.1)', color: '#374151' }"></p-tag>
                                <p-tag [value]="currentProfile?.department" severity="info" [style]="{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.1)', color: '#374151' }"></p-tag>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="flex flex-column gap-2">
                                <button pButton label="Edit" icon="pi pi-pencil" class="p-button-light" (click)="openEditDialog()" [style]="{ background: 'rgba(0,0,0,0.05)', border: 'none', color: '#6B7280' }"></button>
                                <button pButton label="Print" icon="pi pi-print" class="p-button-light" (click)="printProfile()" [style]="{ background: 'rgba(0,0,0,0.05)', border: 'none', color: '#6B7280' }"></button>
                                <button pButton label="Export" icon="pi pi-download" class="p-button-light" (click)="exportProfile()" [style]="{ background: 'rgba(0,0,0,0.05)', border: 'none', color: '#6B7280' }"></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Key Metrics Section Title -->
            <div class="col-span-12">
                <h3 class="text-2xl font-bold text-gray-900 flex items-center gap-3"><i class="pi pi-chart-line text-gray-600 text-2xl"></i> Key Performance Metrics</h3>
            </div>

            <!-- Patient Rating Card -->
            <div class="col-span-12 md:col-span-6 xl:col-span-3">
                <div class="card p-0! overflow-hidden flex flex-col">
                    <div class="flex items-center p-6">
                        <i class="pi pi-star-fill text-5xl! text-amber-600"></i>
                        <div class="ml-6">
                            <span class="text-amber-700 block whitespace-nowrap">PATIENT RATING</span>
                            <span class="text-amber-700 block text-4xl font-bold">{{ currentProfile?.patientRating || '0' }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Years Experience Card -->
            <div class="col-span-12 md:col-span-6 xl:col-span-3">
                <div class="card p-0! overflow-hidden flex flex-col">
                    <div class="flex items-center p-6">
                        <i class="pi pi-check-circle text-5xl! text-green-700"></i>
                        <div class="ml-6">
                            <span class="text-green-700 block whitespace-nowrap">EXPERIENCE</span>
                            <span class="text-green-700 block text-4xl font-bold">{{ currentProfile?.yearsExperience }}y</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Success Rate Card -->
            <div class="col-span-12 md:col-span-6 xl:col-span-3">
                <div class="card p-0! overflow-hidden flex flex-col">
                    <div class="flex items-center p-6">
                        <i class="pi pi-chart-line text-5xl! text-blue-700"></i>
                        <div class="ml-6">
                            <span class="text-blue-700 block whitespace-nowrap">SUCCESS RATE</span>
                            <span class="text-blue-700 block text-4xl font-bold">{{ currentProfile?.successRate || '0' }}%</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Completed Procedures Card -->
            <div class="col-span-12 md:col-span-6 xl:col-span-3">
                <div class="card p-0! overflow-hidden flex flex-col">
                    <div class="flex items-center p-6">
                        <i class="pi pi-list text-5xl! text-purple-700"></i>
                        <div class="ml-6">
                            <span class="text-purple-700 block whitespace-nowrap">PROCEDURES</span>
                            <span class="text-purple-700 block text-4xl font-bold">{{ currentProfile?.completedProcedures || '0' }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Professional Details Section Title -->
            @if (isMedicalStaff()) {
                <div class="col-span-12 mt-6">
                    <h3 class="text-2xl font-bold text-gray-900 flex items-center gap-3"><i class="pi pi-briefcase text-green-600 text-2xl"></i> Professional Profile</h3>
                </div>

                <!-- Specialization Card -->
                <div class="col-span-12 md:col-span-6 lg:col-span-4 card p-0 overflow-hidden hover:shadow-lg transition-all duration-300">
                    <div class="bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-b-2 border-gray-300 flex items-center gap-3">
                        <div class="rounded-lg p-3">
                            <i class="pi pi-star-fill text-gray-600 text-xl"></i>
                        </div>
                        <div>
                            <span class="text-xs text-gray-600 uppercase font-bold tracking-wider block">Specialization</span>
                            <span class="text-gray-500 text-xs">Main expertise</span>
                        </div>
                    </div>
                    <div class="p-6">
                        <p class="font-bold text-gray-900 text-lg">{{ currentProfile?.specialization || 'N/A' }}</p>
                    </div>
                </div>

                <!-- Education Card -->
                <div class="col-span-12 md:col-span-6 lg:col-span-4 card p-0 overflow-hidden hover:shadow-lg transition-all duration-300">
                    <div class="bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-b-2 border-gray-300 flex items-center gap-3">
                        <div class="rounded-lg p-3">
                            <i class="pi pi-book text-gray-600 text-xl"></i>
                        </div>
                        <div>
                            <span class="text-xs text-gray-600 uppercase font-bold tracking-wider block">Education</span>
                            <span class="text-gray-500 text-xs">Academic background</span>
                        </div>
                    </div>
                    <div class="p-6">
                        <p class="font-bold text-gray-900 text-lg">{{ currentProfile?.education || 'N/A' }}</p>
                    </div>
                </div>

                <!-- Gender Card -->
                <div class="col-span-12 md:col-span-6 lg:col-span-4 card p-0 overflow-hidden hover:shadow-lg transition-all duration-300">
                    <div class="bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-b-2 border-gray-300 flex items-center gap-3">
                        <div class="rounded-lg p-3">
                            <i class="pi pi-user text-gray-600 text-xl"></i>
                        </div>
                        <div>
                            <span class="text-xs text-gray-600 uppercase font-bold tracking-wider block">Gender</span>
                            <span class="text-gray-500 text-xs">Personal info</span>
                        </div>
                    </div>
                    <div class="p-6">
                        <p class="font-bold text-gray-900 text-lg capitalize">{{ currentProfile?.gender || 'N/A' }}</p>
                    </div>
                </div>

                <!-- Experience Card -->
                <div class="col-span-12 md:col-span-6 lg:col-span-4 card p-0 overflow-hidden hover:shadow-lg transition-all duration-300">
                    <div class="bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-b-2 border-gray-300 flex items-center gap-3">
                        <div class="rounded-lg p-3">
                            <i class="pi pi-briefcase text-gray-600 text-xl"></i>
                        </div>
                        <div>
                            <span class="text-xs text-gray-600 uppercase font-bold tracking-wider block">Experience</span>
                            <span class="text-gray-500 text-xs">Years in field</span>
                        </div>
                    </div>
                    <div class="p-6">
                        <p class="font-bold text-gray-700 text-lg">
                            {{ currentProfile?.yearsExperience }} <span class="text-gray-600 text-sm">y {{ currentProfile?.experienceMonths }} m</span>
                        </p>
                    </div>
                </div>

                <!-- Date of Birth Card -->
                <div class="col-span-12 md:col-span-6 lg:col-span-4 card p-0 overflow-hidden hover:shadow-lg transition-all duration-300">
                    <div class="bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-b-2 border-gray-300 flex items-center gap-3">
                        <div class="rounded-lg p-3">
                            <i class="pi pi-calendar text-gray-600 text-xl"></i>
                        </div>
                        <div>
                            <span class="text-xs text-gray-600 uppercase font-bold tracking-wider block">Born</span>
                            <span class="text-gray-500 text-xs">Date of birth</span>
                        </div>
                    </div>
                    <div class="p-6">
                        <p class="font-bold text-gray-900 text-lg">{{ currentProfile?.dob || 'N/A' }}</p>
                    </div>
                </div>

                <!-- Hiring Date Card -->
                <div class="col-span-12 md:col-span-6 lg:col-span-4 card p-0 overflow-hidden hover:shadow-lg transition-all duration-300">
                    <div class="bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-b-2 border-gray-300 flex items-center gap-3">
                        <div class="rounded-lg p-3">
                            <i class="pi pi-calendar-plus text-gray-600 text-xl"></i>
                        </div>
                        <div>
                            <span class="text-xs text-gray-600 uppercase font-bold tracking-wider block">Hired</span>
                            <span class="text-gray-500 text-xs">Joining date</span>
                        </div>
                    </div>
                    <div class="p-6">
                        <p class="font-bold text-gray-900 text-lg">{{ currentProfile?.hiringDate || 'N/A' }}</p>
                    </div>
                </div>
            }

            <!-- Insurance Card - Full Width -->
            <div class="col-span-12 card p-0 overflow-hidden hover:shadow-lg transition-all duration-300">
                <div class="bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-b-2 border-gray-300 flex items-center gap-3">
                    <div class="rounded-lg p-3">
                        <i class="pi pi-shield text-gray-600 text-xl"></i>
                    </div>
                    <div>
                        <span class="text-xs text-gray-600 uppercase font-bold tracking-wider block">Insurance Provider</span>
                        <span class="text-gray-500 text-xs">Health coverage</span>
                    </div>
                </div>
                <div class="p-6">
                    <p class="font-bold text-gray-900 text-lg">{{ currentProfile?.insurance || 'N/A' }}</p>
                </div>
            </div>

            <!-- Work Schedule Section Title -->
            @if (isMedicalStaff()) {
                <div class="col-span-12 mt-6">
                    <h3 class="text-2xl font-bold text-gray-900 flex items-center gap-3"><i class="pi pi-calendar text-gray-600 text-2xl"></i> Work Schedule</h3>
                </div>

                <!-- Duty Days Card -->
                <div class="col-span-12 md:col-span-6 xl:col-span-3">
                    <div class="card p-0! overflow-hidden flex flex-col">
                        <div class="flex items-center p-6">
                            <i class="pi pi-calendar text-5xl! text-gray-700"></i>
                            <div class="ml-6">
                                <span class="text-gray-700 block whitespace-nowrap">DUTY DAYS</span>
                                <span class="text-gray-700 block text-lg font-bold">
                                    @for (day of currentProfile?.dutyDays | slice: 0 : 3; track day) {
                                        <span>{{ day | uppercase }}</span>
                                    }
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Duty Hours Card -->
                <div class="col-span-12 md:col-span-6 xl:col-span-3">
                    <div class="card p-0! overflow-hidden flex flex-col">
                        <div class="flex items-center p-6">
                            <i class="pi pi-clock text-5xl! text-gray-700"></i>
                            <div class="ml-6">
                                <span class="text-gray-700 block whitespace-nowrap">WORK HOURS</span>
                                <span class="text-gray-700 block text-lg font-bold">{{ currentProfile?.dutyStart || 'N/A' }} - {{ currentProfile?.dutyEnd || 'N/A' }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            }

            <!-- Contact Information Section Title -->
            <div class="col-span-12 mt-6">
                <h3 class="text-2xl font-bold text-gray-900 flex items-center gap-3"><i class="pi pi-envelope text-gray-600 text-2xl"></i> Contact Information</h3>
            </div>

            <!-- Email Card -->
            <div class="col-span-12 md:col-span-6 xl:col-span-3">
                <div class="card p-0! overflow-hidden flex flex-col">
                    <div class="flex items-center p-6">
                        <i class="pi pi-envelope text-5xl! text-gray-700"></i>
                        <div class="ml-6">
                            <span class="text-gray-700 block whitespace-nowrap">EMAIL</span>
                            <span class="text-gray-700 block text-lg font-bold break-all">{{ currentProfile?.email || 'N/A' }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Phone Card -->
            <div class="col-span-12 md:col-span-6 xl:col-span-3">
                <div class="card p-0! overflow-hidden flex flex-col">
                    <div class="flex items-center p-6">
                        <i class="pi pi-phone text-5xl! text-gray-700"></i>
                        <div class="ml-6">
                            <span class="text-gray-700 block whitespace-nowrap">PHONE</span>
                            <span class="text-gray-700 block text-lg font-bold">{{ currentProfile?.phone || 'N/A' }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- QID Card -->
            <div class="col-span-12 md:col-span-6 xl:col-span-3">
                <div class="card p-0! overflow-hidden flex flex-col">
                    <div class="flex items-center p-6">
                        <i class="pi pi-id-card text-5xl! text-gray-700"></i>
                        <div class="ml-6">
                            <span class="text-gray-700 block whitespace-nowrap">QID</span>
                            <span class="text-gray-700 block text-lg font-bold font-mono">{{ currentProfile?.qid || 'N/A' }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- License Card -->
            <div class="col-span-12 md:col-span-6 xl:col-span-3">
                <div class="card p-0! overflow-hidden flex flex-col">
                    <div class="flex items-center p-6">
                        <i class="pi pi-certificate text-5xl! text-gray-700"></i>
                        <div class="ml-6">
                            <span class="text-gray-700 block whitespace-nowrap">LICENSE</span>
                            <span class="text-gray-700 block text-lg font-bold font-mono">{{ currentProfile?.licenseNumber || 'N/A' }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tabs Section - Full Width -->
            <div class="col-span-12 mt-8">
                <p-tabs>
                    <p-tablist>
                        <p-tab value="overview">
                            <ng-template pTemplate="header"> <i class="pi pi-info-circle mr-2"></i>Overview </ng-template>
                        </p-tab>
                        <p-tab value="schedule">
                            <ng-template pTemplate="header"> <i class="pi pi-calendar mr-2"></i>Appointments </ng-template>
                        </p-tab>
                        <p-tab value="activity">
                            <ng-template pTemplate="header"> <i class="pi pi-list mr-2"></i>Activity </ng-template>
                        </p-tab>
                    </p-tablist>
                    <p-tabpanels>
                        <!-- Overview -->
                        <p-tabpanel value="overview">
                            <p-card>
                                <div class="grid gap-4">
                                    <div class="col-12">
                                        <h4>Professional Summary</h4>
                                        <p class="text-gray-700">{{ currentProfile?.bio }}</p>
                                    </div>
                                    <div class="col-12 md:col-6">
                                        <h5>Total Patients</h5>
                                        <p class="text-2xl font-bold text-blue-600">{{ currentProfile?.totalPatients }}</p>
                                    </div>
                                    <div class="col-12 md:col-6">
                                        <h5>Success Rate</h5>
                                        <p-progressBar [value]="currentProfile?.successRate" [showValue]="true"></p-progressBar>
                                    </div>
                                </div>
                            </p-card>
                        </p-tabpanel>
                        <!-- Appointments -->
                        <p-tabpanel value="schedule">
                            <p-card>
                                <div class="mb-4">
                                    <button pButton label="+ Add Appointment" icon="pi pi-plus" class="p-button-sm" (click)="openAppointmentDialog()"></button>
                                </div>
                                <p-table [value]="appointments" [paginator]="true" [rows]="5">
                                    <ng-template pTemplate="header">
                                        <tr>
                                            <th>Date</th>
                                            <th>Time</th>
                                            <th>Patient</th>
                                            <th>Type</th>
                                            <th>Status</th>
                                        </tr>
                                    </ng-template>
                                    <ng-template pTemplate="body" let-appt>
                                        <tr>
                                            <td>{{ appt.date }}</td>
                                            <td>{{ appt.time }}</td>
                                            <td>{{ appt.patient }}</td>
                                            <td>{{ appt.type }}</td>
                                            <td><p-tag [value]="appt.status" [severity]="getStatusColor(appt.status)"></p-tag></td>
                                        </tr>
                                    </ng-template>
                                </p-table>
                            </p-card>
                        </p-tabpanel>
                        <!-- Activity -->
                        <p-tabpanel value="activity">
                            <p-card>
                                <p-timeline [value]="activities" align="left" layout="vertical">
                                    <ng-template #event let-activity="data">
                                        <div class="flex gap-4">
                                            <div class="text-sm font-semibold w-24">{{ activity.date }}</div>
                                            <div>
                                                <p class="font-semibold">{{ activity.type }}</p>
                                                <p class="text-sm text-gray-600">{{ activity.description }}</p>
                                            </div>
                                        </div>
                                    </ng-template>
                                </p-timeline>
                            </p-card>
                        </p-tabpanel>
                    </p-tabpanels>
                </p-tabs>
            </div>
        </div>

        <!-- Edit Dialog -->
        <p-dialog [(visible)]="editDialogVisible" header="Edit Profile" [modal]="true" [style]="{ width: '500px' }" [blockScroll]="true" [closeOnEscape]="true">
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div>
                    <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">Full Name</label>
                    <input pInputText [(ngModel)]="editForm.fullName" style="width: 100%;" />
                </div>
                <div>
                    <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">Email</label>
                    <input pInputText [(ngModel)]="editForm.email" style="width: 100%;" />
                </div>
                <div>
                    <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">Phone</label>
                    <input pInputText [(ngModel)]="editForm.phone" style="width: 100%;" />
                </div>
                <div>
                    <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">Bio</label>
                    <textarea pInputTextarea [(ngModel)]="editForm.bio" rows="4" style="width: 100%;"></textarea>
                </div>
            </div>
            <ng-template pTemplate="footer">
                <button pButton label="Save" icon="pi pi-check" class="p-button-primary" (click)="saveProfile()"></button>
                <button pButton label="Cancel" icon="pi pi-times" class="p-button-text" (click)="closeEditDialog()"></button>
            </ng-template>
        </p-dialog>

        <!-- Appointment Dialog -->
        <p-dialog [(visible)]="appointmentDialogVisible" header="Add Appointment" [modal]="true" [style]="{ width: '500px' }" [blockScroll]="true" [closeOnEscape]="true">
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div>
                    <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">Patient Name</label>
                    <input pInputText [(ngModel)]="newAppointment.patient" style="width: 100%;" />
                </div>
                <div>
                    <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">Date</label>
                    <input pInputText [(ngModel)]="newAppointment.date" placeholder="DD MM YYYY" style="width: 100%;" />
                </div>
                <div>
                    <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">Time</label>
                    <input pInputText [(ngModel)]="newAppointment.time" placeholder="HH:MM" style="width: 100%;" />
                </div>
                <div>
                    <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">Type</label>
                    <input pInputText [(ngModel)]="newAppointment.type" style="width: 100%;" />
                </div>
            </div>
            <ng-template pTemplate="footer">
                <button pButton label="Add" icon="pi pi-check" class="p-button-primary" (click)="addAppointment()"></button>
                <button pButton label="Cancel" icon="pi pi-times" class="p-button-text" (click)="closeAppointmentDialog()"></button>
            </ng-template>
        </p-dialog>

        <p-toast position="top-right"></p-toast>
    `,
        styles: [
            `
            :host ::ng-deep {
                .p-card {
                    border: none;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                    border-radius: 6px;
                }

                .p-tabs {
                    :deep(.p-tablist) {
                        border-bottom: 2px solid #e5e7eb;
                    }
                }

                .col-span-12 {
                    grid-column: span 12;
                }

                .col-span-6 {
                    grid-column: span 6;
                }

                .col-span-4 {
                    grid-column: span 4;
                }

                .col-span-3 {
                    grid-column: span 3;
                }

                @media (min-width: 640px) {
                    .sm\\:col-span-6 {
                        grid-column: span 6;
                    }
                }

                @media (min-width: 768px) {
                    .md\\:col-span-6 {
                        grid-column: span 6;
                    }

                    .md\\:col-span-4 {
                        grid-column: span 4;
                    }
                }

                @media (min-width: 1024px) {
                    .lg\\:col-span-4 {
                        grid-column: span 4;
                    }

                    .lg\\:col-span-6 {
                        grid-column: span 6;
                    }

                    .xl\\:col-span-3 {
                        grid-column: span 3;
                    }
                }

                .md\\:col-6 {
                    grid-column: span 6;
                }

                .grid {
                    display: grid;
                    grid-template-columns: repeat(12, minmax(0, 1fr));
                }

                .gap-6 {
                    gap: 1.5rem;
                }

                .gap-4 {
                    gap: 1rem;
                }

                .gap-3 {
                    gap: 0.75rem;
                }

                .gap-2 {
                    gap: 0.5rem;
                }

                .mt-6 {
                    margin-top: 1.5rem;
                }

                .mt-8 {
                    margin-top: 2rem;
                }

                .mb-10 {
                    margin-bottom: 2.5rem;
                }

                .mb-8 {
                    margin-bottom: 2rem;
                }

                .mb-6 {
                    margin-bottom: 1.5rem;
                }

                .mb-4 {
                    margin-bottom: 1rem;
                }

                .mb-3 {
                    margin-bottom: 0.75rem;
                }

                .mb-2 {
                    margin-bottom: 0.5rem;
                }

                .mb-1 {
                    margin-bottom: 0.25rem;
                }

                .p-6 {
                    padding: 1.5rem;
                }

                .p-8 {
                    padding: 2rem;
                }

                .p-4 {
                    padding: 1rem;
                }

                .text-2xl {
                    font-size: 1.5rem;
                }

                .text-xl {
                    font-size: 1.25rem;
                }

                .text-lg {
                    font-size: 1.125rem;
                }

                .text-sm {
                    font-size: 0.875rem;
                }

                .text-xs {
                    font-size: 0.75rem;
                }

                .font-bold {
                    font-weight: 700;
                }

                .font-semibold {
                    font-weight: 600;
                }

                .font-mono {
                    font-family: ui-monospace, 'Courier New', monospace;
                }

                .w-full {
                    width: 100%;
                }

                .min-h-screen {
                    min-height: 100vh;
                }

                .uppercase {
                    text-transform: uppercase;
                }
            }
        `
        ]
    })
], UserProfileComponent);
export { UserProfileComponent };

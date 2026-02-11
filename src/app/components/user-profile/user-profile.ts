import { Component, inject, OnInit } from '@angular/core';
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

interface UserProfile {
    id: string;
    fullName: string;
    role: string;
    department: string;
    email: string;
    phone: string;
    bio: string;
    licenseNumber: string;
    yearsExperience: number;
    patientRating: number;
    successRate: number;
    totalPatients: number;
    completedProcedures: number;
    avatarUrl: string;
}

interface Appointment {
    date: string;
    time: string;
    patient: string;
    type: string;
    status: 'scheduled' | 'completed' | 'cancelled';
}

interface Activity {
    date: string;
    type: string;
    description: string;
}

class UserProfileStore {
    private readonly _profile$!: BehaviorSubject<UserProfile>;
    private userDataLoaded = false;

    private initializeProfile(): void {
        const userDataStr = localStorage.getItem('userData');
        let userData: any = null;

        if (userDataStr) {
            try {
                userData = JSON.parse(userDataStr);
                this.userDataLoaded = true;
            } catch (e) {
                console.error('Failed to parse userData from localStorage', e);
            }
        }

        const fullName = userData?.name || 'Dr. John Smith';
        const email = userData?.email || 'john.smith@hospital.org';
        const phone = userData?.phone_number || '+974 55 77 99 55';

        this._profile$.next({
            id: userData?.sub || 'DOC-10234',
            fullName: fullName,
            role: 'Consultant Cardiologist',
            department: 'Cardiology',
            email: email,
            phone: phone,
            bio: 'Experienced cardiac specialist with 15+ years in interventional cardiology.',
            licenseNumber: 'QMC-123456',
            yearsExperience: 15,
            patientRating: 4.8,
            successRate: 98.5,
            totalPatients: 1250,
            completedProcedures: 450,
            avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=1e40af&color=fff&size=256`
        });
    }

    constructor() {
        this._profile$ = new BehaviorSubject<UserProfile>({
            id: 'DOC-10234',
            fullName: 'Dr. John Smith',
            role: 'Consultant Cardiologist',
            department: 'Cardiology',
            email: 'john.smith@hospital.org',
            phone: '+974 55 77 99 55',
            bio: 'Experienced cardiac specialist with 15+ years in interventional cardiology.',
            licenseNumber: 'QMC-123456',
            yearsExperience: 15,
            patientRating: 4.8,
            successRate: 98.5,
            totalPatients: 1250,
            completedProcedures: 450,
            avatarUrl: 'https://ui-avatars.com/api/?name=Dr+John+Smith&background=1e40af&color=fff&size=256'
        });

        // Initialize with current localStorage data
        this.initializeProfile();

        // Listen for storage changes from other tabs/windows
        window.addEventListener('storage', () => {
            this.initializeProfile();
        });

        // Listen for custom event dispatched from same-tab components (e.g., topbar)
        window.addEventListener('userDataChanged', () => {
            this.initializeProfile();
        });

        // Poll for userData for up to 5 seconds (in case it's being loaded asynchronously)
        if (!this.userDataLoaded) {
            let pollCount = 0;
            const pollInterval = setInterval(() => {
                this.initializeProfile();
                pollCount++;
                // Stop polling after 5 seconds (50 iterations of 100ms each)
                if (this.userDataLoaded || pollCount >= 50) {
                    clearInterval(pollInterval);
                }
            }, 100);
        }
    }

    get profile$() {
        return this._profile$.asObservable();
    }

    updateProfile(update: Partial<UserProfile>) {
        this._profile$.next({ ...this._profile$.value, ...update });
    }
}

@Component({
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
        <div class="p-6 bg-slate-50 min-h-screen">
            <!-- Header -->
            <div class="bg-blue-700 text-white p-4 rounded mb-6">
                <h1>Professional Profile</h1>
            </div>

            <!-- Main Content -->
            <div class="grid gap-6">
                <!-- Left Sidebar -->
                <div class="lg:col-4 col col-12">
                    <p-card class="shadow">
                        <!-- Profile Header -->
                        <div class="text-center pb-4">
                            <p-avatar [image]="currentProfile?.avatarUrl" shape="circle" size="xlarge" class="mb-3"></p-avatar>
                            <h2 class="text-xl font-bold">{{ currentProfile?.fullName }}</h2>
                            <p class="text-gray-600 mb-4">{{ currentProfile?.role }}</p>
                            <p-tag [value]="currentProfile?.department" severity="info"></p-tag>
                        </div>

                        <p-divider></p-divider>

                        <!-- Key Info -->
                        <div class="space-y-3 mb-4">
                            <div>
                                <p class="text-sm text-gray-600">Email</p>
                                <p class="font-semibold">{{ currentProfile?.email }}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">Phone</p>
                                <p class="font-semibold">{{ currentProfile?.phone }}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">License #</p>
                                <p class="font-semibold font-mono">{{ currentProfile?.licenseNumber }}</p>
                            </div>
                        </div>

                        <!-- Stats -->
                        <p-divider></p-divider>
                        <div class="grid gap-3 mt-4">
                            <div class="text-center">
                                <div class="text-2xl font-bold text-blue-600">{{ currentProfile?.yearsExperience }}</div>
                                <p class="text-xs text-gray-600 uppercase">Years Experience</p>
                            </div>
                            <div class="text-center">
                                <div class="text-2xl font-bold text-green-600">{{ currentProfile?.successRate }}%</div>
                                <p class="text-xs text-gray-600 uppercase">Success Rate</p>
                            </div>
                            <div class="text-center">
                                <div class="text-2xl font-bold text-orange-600">{{ currentProfile?.completedProcedures }}</div>
                                <p class="text-xs text-gray-600 uppercase">Procedures</p>
                            </div>
                        </div>

                        <!-- Rating -->
                        <p-divider></p-divider>
                        <div class="text-center mt-4">
                            <p class="text-sm font-semibold mb-2">Patient Rating</p>
                            <p-rating [ngModel]="currentProfile?.patientRating" [readonly]="true"></p-rating>
                            <p class="text-sm mt-1">{{ currentProfile?.patientRating }}/5.0</p>
                        </div>

                        <!-- Action Buttons -->
                        <div class="flex flex-column gap-2 mt-6">
                            <button pButton label="Edit Profile" icon="pi pi-pencil" class="p-button-primary" (click)="openEditDialog()"></button>
                            <button pButton label="Print" icon="pi pi-print" class="p-button-outlined" (click)="printProfile()"></button>
                            <button pButton label="Export" icon="pi pi-download" class="p-button-text" (click)="exportProfile()"></button>
                        </div>
                    </p-card>
                </div>

                <!-- Right Content -->
                <div class="lg:col-8 col col-12">
                    <p-tabs>
                        <p-tablist>
                            <p-tab value="overview">
                                <ng-template pTemplate="header">
                                    <i class="pi pi-info-circle mr-2"></i>
                                    Overview
                                </ng-template>
                            </p-tab>
                            <p-tab value="schedule">
                                <ng-template pTemplate="header">
                                    <i class="pi pi-calendar mr-2"></i>
                                    Appointments
                                </ng-template>
                            </p-tab>
                            <p-tab value="activity">
                                <ng-template pTemplate="header">
                                    <i class="pi pi-list mr-2"></i>
                                    Activity
                                </ng-template>
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
        </div>
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

                .grid {
                    display: grid;
                    grid-template-columns: repeat(12, 1fr);
                }

                .col {
                    grid-column: span 12;
                }

                @media (min-width: 1024px) {
                    .lg\\:col-4 {
                        grid-column: span 4;
                    }
                    .lg\\:col-8 {
                        grid-column: span 8;
                    }
                }

                @media (min-width: 768px) {
                    .md\\:col-6 {
                        grid-column: span 6;
                    }
                }

                .space-y-3 > div + div {
                    margin-top: 0.75rem;
                }

                .gap-2 {
                    gap: 0.5rem;
                }

                .gap-3 {
                    gap: 0.75rem;
                }

                .gap-4 {
                    gap: 1rem;
                }

                .gap-6 {
                    gap: 1.5rem;
                }

                .mb-1 {
                    margin-bottom: 0.25rem;
                }
                .mb-2 {
                    margin-bottom: 0.5rem;
                }
                .mb-3 {
                    margin-bottom: 0.75rem;
                }
                .mb-4 {
                    margin-bottom: 1rem;
                }
                .mb-6 {
                    margin-bottom: 1.5rem;
                }
                .mt-1 {
                    margin-top: 0.25rem;
                }
                .mt-2 {
                    margin-top: 0.5rem;
                }
                .mt-3 {
                    margin-top: 0.75rem;
                }
                .mt-4 {
                    margin-top: 1rem;
                }
                .mt-6 {
                    margin-top: 1.5rem;
                }
                .pb-4 {
                    padding-bottom: 1rem;
                }
                .p-4 {
                    padding: 1rem;
                }
                .p-6 {
                    padding: 1.5rem;
                }

                .text-xs {
                    font-size: 0.75rem;
                }
                .text-sm {
                    font-size: 0.875rem;
                }
                .text-xl {
                    font-size: 1.25rem;
                }
                .text-2xl {
                    font-size: 1.5rem;
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

                .text-center {
                    text-align: center;
                }
                .text-gray-600 {
                    color: #4b5563;
                }
                .text-gray-700 {
                    color: #374151;
                }
                .text-blue-600 {
                    color: #2563eb;
                }
                .text-green-600 {
                    color: #16a34a;
                }
                .text-orange-600 {
                    color: #ea580c;
                }

                .bg-blue-700 {
                    background-color: #1d4ed8;
                }
                .bg-slate-50 {
                    background-color: #f8fafc;
                }

                .rounded {
                    border-radius: 0.375rem;
                }
                .shadow {
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
                }

                .uppercase {
                    text-transform: uppercase;
                }
                .w-full {
                    width: 100%;
                }
                .min-h-screen {
                    min-height: 100vh;
                }
            }
        `
    ]
})
export class UserProfileComponent implements OnInit {
    private readonly store = inject(UserProfileStore);
    private readonly messageService = inject(MessageService);
    currentProfile: UserProfile | null = null;
    editDialogVisible = false;
    appointmentDialogVisible = false;

    editForm = { fullName: '', email: '', phone: '', bio: '' };

    newAppointment = { patient: '', date: '', time: '', type: '', status: 'scheduled' as const };

    appointments: Appointment[] = [
        { date: '11 Feb 2026', time: '09:30 AM', patient: 'Ali Hassan', type: 'Follow-up', status: 'scheduled' },
        { date: '11 Feb 2026', time: '11:00 AM', patient: 'Sara Al-Thani', type: 'Consultation', status: 'scheduled' },
        { date: '12 Feb 2026', time: '02:00 PM', patient: 'Mohammed Al-Mansoori', type: 'Procedure', status: 'completed' }
    ];

    activities: Activity[] = [
        { date: '10 Feb', type: 'Procedure', description: 'Coronary angioplasty – 2 stents placed' },
        { date: '09 Feb', type: 'OPD Clinic', description: '22 patients seen' },
        { date: '08 Feb', type: 'Emergency', description: 'STEMI code activation' }
    ];

    ngOnInit() {
        this.store.profile$.subscribe((profile) => {
            this.currentProfile = profile;
        });
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
        } else {
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

    getStatusColor(status: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
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
}

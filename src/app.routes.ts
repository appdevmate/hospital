import { Routes } from '@angular/router';
import { AppLayout } from '@/layout/components/app.layout';
import { ConfirmationService, MessageService } from 'primeng/api';
import { UserProfileComponent } from '@/components/user-profile/user-profile';
import { authGuard } from './app/guards/auth.guard';
import { roleGuard } from './app/guards/role.guard';
import { UserRole } from '@/services/auth.service';
// app.routes.ts - fix these two import paths
import { ConsultationDetailComponent } from '@/components/consultation/consultation-detail/consultation-detail';
import { ConsultationFormComponent } from '@/components/consultation/consultation-form/consultation-form';
import { AdminPanelComponent } from '@/components/admin-panel/admin-panel';
import { PharmacyComponent } from '@/components/pharmacy/pharmacy';

const PATIENTS_ROLES: UserRole[] = ['admin', 'developer', 'doctor'];
const ADMIN_ROLES: UserRole[] = ['admin', 'developer'];
const PHARMACY_ROLES: UserRole[] = ['pharmacist'];
const SCRIBE_ROLES: UserRole[] = ['developer', 'doctor'];
const DOCS_ROLES: UserRole[] = ['admin', 'developer', 'doctor'];

export const appRoutes: Routes = [
    {
        path: '',
        component: AppLayout,
        canActivate: [authGuard],
        children: [
            {
                path: '',
                data: { breadcrumb: 'Dashboard' },
                loadComponent: () => import('@/components/dashboard/dashboard').then((c) => c.DashboardComponent)
            },
            {
                path: 'doctors-management',
                data: { breadcrumb: 'Doctors Management' },
                canActivate: [roleGuard(ADMIN_ROLES)],
                loadComponent: () => import('@/components/Doctors Management/doctors-management').then((c) => c.DoctorsManagementComponent),
                providers: [ConfirmationService, MessageService]
            },
            {
                path: 'patients-management',
                data: { breadcrumb: 'Patients Management' },
                canActivate: [roleGuard(PATIENTS_ROLES)],
                loadComponent: () => import('@/components/Patients Management/patients-management').then((c) => c.PatientsManagementComponent),
                providers: [ConfirmationService, MessageService]
            },
            {
                path: 'patient-profile/:id',
                data: { breadcrumb: 'Patient Profile' },
                canActivate: [roleGuard(PATIENTS_ROLES)],
                loadComponent: () => import('@/components/patient-profile/patient-profile').then((m) => m.PatientProfileComponent)
            },

            // Consultations (renamed from examinations - URL changed, Lambda still uses /examinations)
            { path: 'consultation/:consultationId', canActivate: [roleGuard(PATIENTS_ROLES)], component: ConsultationFormComponent },
            { path: 'consultation/:consultationId/view', canActivate: [roleGuard(PATIENTS_ROLES)], component: ConsultationDetailComponent },

            // Pharmacy
            { path: 'pharmacy', canActivate: [roleGuard(PHARMACY_ROLES)], component: PharmacyComponent },

            // ScribeFirst Phase 1 — voice scribe
            {
                path: 'voice-scribe',
                data: { breadcrumb: 'Voice Scribe' },
                canActivate: [roleGuard(SCRIBE_ROLES)],
                loadComponent: () => import('@/components/voice-scribe/voice-scribe').then((m) => m.VoiceScribeComponent)
            },

            // Admin panel
            { path: 'admin-panel', canActivate: [roleGuard(ADMIN_ROLES)], component: AdminPanelComponent },

            // Open to all authenticated users
            { path: 'documents', data: { breadcrumb: 'Documents' }, canActivate: [roleGuard(DOCS_ROLES)], loadComponent: () => import('@/components/documents/document-manager/document-manager').then((m) => m.DocumentManagerComponent) },
            { path: 'calendar', data: { breadcrumb: 'Calendar' }, loadComponent: () => import('@/components/hospital-calendar/hospital-calendar').then((m) => m.HospitalCalendarComponent) },
            { path: 'appointments', data: { breadcrumb: 'Appointments' }, loadComponent: () => import('@/components/appointments/appointments').then((m) => m.AppointmentsComponent) },
            { path: 'invoices', data: { breadcrumb: 'Invoices' }, loadComponent: () => import('@/components/invoices/invoices').then((m) => m.InvoicesComponent) },
            { path: 'notifications', data: { breadcrumb: 'Notifications' }, loadComponent: () => import('@/components/notifications/notifications').then((m) => m.NotificationsComponent) },
            { path: 'user-profile', data: { breadcrumb: 'Profile' }, component: UserProfileComponent }
        ]
    },
    { path: 'notfound', loadComponent: () => import('@/components/notfound/notfound').then((c) => c.Notfound) },
    { path: '**', redirectTo: '/notfound' }
];

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
import { operatorGuard } from './app/guards/operator.guard';

const PATIENTS_ROLES: UserRole[] = ['admin', 'developer', 'doctor'];
const ADMIN_ROLES: UserRole[] = ['admin', 'developer'];
const PHARMACY_ROLES: UserRole[] = ['pharmacist'];
const SCRIBE_ROLES: UserRole[] = ['developer', 'doctor'];
const DOCS_ROLES: UserRole[] = ['admin', 'developer', 'doctor'];
const BLOODBANK_ROLES: UserRole[] = ['admin', 'developer', 'doctor', 'pharmacist'];

export const appRoutes: Routes = [
    {
        path: '',
        component: AppLayout,
        canActivate: [authGuard],
        children: [
            {
                path: '',
                // Step I — i18n: breadcrumb stores a translation KEY instead of a hard-coded
                // English label. The breadcrumb component resolves it through ngx-translate
                // so it renders in the user's current language and updates on language switch.
                data: { breadcrumb: 'menu.dashboard' },
                loadComponent: () => import('@/components/dashboard/dashboard').then((c) => c.DashboardComponent)
            },
            {
                path: 'doctors-management',
                data: { breadcrumb: 'pages.doctors.title' },
                canActivate: [roleGuard(ADMIN_ROLES)],
                loadComponent: () => import('@/components/Doctors Management/doctors-management').then((c) => c.DoctorsManagementComponent),
                providers: [ConfirmationService, MessageService]
            },
            {
                path: 'patients-management',
                data: { breadcrumb: 'pages.patients.title' },
                canActivate: [roleGuard(PATIENTS_ROLES)],
                loadComponent: () => import('@/components/Patients Management/patients-management').then((c) => c.PatientsManagementComponent),
                providers: [ConfirmationService, MessageService]
            },
            {
                path: 'patient-profile/:id',
                data: { breadcrumb: 'pages.patients.title' },
                canActivate: [roleGuard(PATIENTS_ROLES)],
                loadComponent: () => import('@/components/patient-profile/patient-profile').then((m) => m.PatientProfileComponent)
            },

            // Consultations (renamed from examinations - URL changed, Lambda still uses /examinations)
            { path: 'consultation/:consultationId', canActivate: [roleGuard(PATIENTS_ROLES)], component: ConsultationFormComponent },
            { path: 'consultation/:consultationId/view', canActivate: [roleGuard(PATIENTS_ROLES)], component: ConsultationDetailComponent },

            // Pharmacy
            { path: 'pharmacy', canActivate: [roleGuard(PHARMACY_ROLES)], component: PharmacyComponent },

            // Blood Bank
            {
                path: 'blood-bank',
                data: { breadcrumb: 'pages.bloodBank.title' },
                canActivate: [roleGuard(BLOODBANK_ROLES)],
                loadComponent: () => import('@/components/blood-bank/blood-bank').then((m) => m.BloodBankComponent)
            },

            // ScribeFirst Phase 1 — voice scribe
            {
                path: 'voice-scribe',
                data: { breadcrumb: 'pages.voiceScribe.title' },
                canActivate: [roleGuard(SCRIBE_ROLES)],
                loadComponent: () => import('@/components/voice-scribe/voice-scribe').then((m) => m.VoiceScribeComponent)
            },

            // Admin panel
            { path: 'admin-panel', data: { breadcrumb: 'pages.adminPanel.title' }, canActivate: [roleGuard(ADMIN_ROLES)], component: AdminPanelComponent },

            // Open to all authenticated users
            { path: 'documents', data: { breadcrumb: 'pages.documents.title' }, canActivate: [roleGuard(DOCS_ROLES)], loadComponent: () => import('@/components/documents/document-manager/document-manager').then((m) => m.DocumentManagerComponent) },
            { path: 'calendar', data: { breadcrumb: 'pages.calendar.title' }, loadComponent: () => import('@/components/hospital-calendar/hospital-calendar').then((m) => m.HospitalCalendarComponent) },
            { path: 'appointments', data: { breadcrumb: 'pages.appointments.title' }, loadComponent: () => import('@/components/appointments/appointments').then((m) => m.AppointmentsComponent) },
            { path: 'invoices', data: { breadcrumb: 'pages.invoices.title' }, loadComponent: () => import('@/components/invoices/invoices').then((m) => m.InvoicesComponent) },
            { path: 'notifications', data: { breadcrumb: 'pages.notifications.title' }, loadComponent: () => import('@/components/notifications/notifications').then((m) => m.NotificationsComponent) },
            { path: 'user-profile', data: { breadcrumb: 'pages.userProfile.title' }, component: UserProfileComponent },

            // Operator console (www.akwadona.com) — Step 7
            {
                path: 'operator',
                data: { breadcrumb: 'operatorConsole.breadcrumb' },
                canActivate: [operatorGuard],
                loadComponent: () => import('@/components/operator-console/operator-console').then((m) => m.OperatorConsoleComponent)
            },
            // Step 96 — Tenant onboarding wizard. Operator-only.
            {
                path: 'operator/onboard',
                data: { breadcrumb: 'Onboard tenant' },
                canActivate: [operatorGuard],
                loadComponent: () => import('@/components/operator-console/tenant-onboarding-wizard').then((m) => m.TenantOnboardingWizardComponent)
            }
        ]
    },
    { path: 'notfound', loadComponent: () => import('@/components/notfound/notfound').then((c) => c.Notfound) },
    // Phase 1 / Step 102 - custom Arabic-aware sign-in page. PUBLIC route
    // (no authGuard) and outside AppLayout so the sign-in screen renders
    // chromeless without the topbar/menu shell.
    { path: 'login', loadComponent: () => import('@/components/auth/login/login.component').then((c) => c.LoginComponent) },
    { path: '**', redirectTo: '/notfound' }
];

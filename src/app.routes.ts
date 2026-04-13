import { Routes } from '@angular/router';
import { AppLayout } from '@/layout/components/app.layout';
import { ConfirmationService, MessageService } from 'primeng/api';
import { UserProfileComponent } from '@/components/user-profile/user-profile';
import { authGuard } from './app/guards/auth.guard';
import { roleGuard } from './app/guards/role.guard';
import { UserRole } from '@/pages/service/auth.service';
import { ExaminationDetailComponent } from '@/components/examination/examination-detail/examination-detail';
import { ExaminationFormComponent } from '@/components/examination/examination-form/examination-form';
import { AdminPanelComponent } from '@/components/admin-panel/admin-panel';
import { PharmacyComponent } from '@/components/pharmacy/pharmacy';

const PATIENTS_ROLES: UserRole[] = ['admin', 'developer', 'doctor'];
const ADMIN_ROLES: UserRole[] = ['admin', 'developer'];
const PHARMACY_ROLES: UserRole[] = ['admin', 'developer', 'pharmacist'];

export const appRoutes: Routes = [
    {
        path: '',
        component: AppLayout,
        canActivate: [authGuard],
        children: [
            { path: '', data: { breadcrumb: 'Dashboard' }, loadComponent: () => import('@/components/dashboard/dashboard').then((c) => c.DashboardComponent) },
            { path: 'dashboard-sales', data: { breadcrumb: 'Sales Dashboard' }, loadComponent: () => import('@/pages/dashboard/salesdashboard').then((c) => c.SalesDashboard) },
            { path: 'uikit', data: { breadcrumb: 'UI Kit' }, loadChildren: () => import('@/pages/uikit/uikit.routes') },
            { path: 'documentation', data: { breadcrumb: 'Documentation' }, loadComponent: () => import('@/pages/documentation/documentation').then((c) => c.Documentation) },
            { path: 'pages', data: { breadcrumb: 'Pages' }, loadChildren: () => import('@/pages/pages.routes') },

            // Doctors Management — admin and developer only
            {
                path: 'doctors-management',
                data: { breadcrumb: 'Doctors Management' },
                canActivate: [roleGuard(ADMIN_ROLES)],
                loadComponent: () => import('@/components/Doctors Management/doctors-management').then((c) => c.DoctorsManagementComponent),
                providers: [ConfirmationService, MessageService]
            },

            // Patients module — admin, developer, doctor
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

            // Examinations — admin, developer, doctor
            { path: 'examination/:examId', canActivate: [roleGuard(PATIENTS_ROLES)], component: ExaminationFormComponent },
            { path: 'examination/:examId/view', canActivate: [roleGuard(PATIENTS_ROLES)], component: ExaminationDetailComponent },

            // Pharmacy — admin, developer, pharmacist
            { path: 'pharmacy', canActivate: [roleGuard(PHARMACY_ROLES)], component: PharmacyComponent },

            // Admin panel — admin and developer only
            { path: 'admin-panel', canActivate: [roleGuard(ADMIN_ROLES)], component: AdminPanelComponent },

            // Open to all authenticated users
            {
                path: 'documents',
                data: { breadcrumb: 'Documents' },
                loadComponent: () => import('@/components/documents/document-manager/document-manager').then((m) => m.DocumentManagerComponent)
            },
            {
                path: 'calendar',
                data: { breadcrumb: 'Calendar' },
                loadComponent: () => import('@/components/hospital-calendar/hospital-calendar').then((m) => m.HospitalCalendarComponent)
            },
            {
                path: 'appointments',
                data: { breadcrumb: 'Appointments' },
                loadComponent: () => import('@/components/appointments/appointments').then((m) => m.AppointmentsComponent)
            },
            {
                path: 'invoices',
                data: { breadcrumb: 'Invoices' },
                loadComponent: () => import('@/components/invoices/invoices').then((m) => m.InvoicesComponent)
            },
            {
                path: 'notifications',
                data: { breadcrumb: 'Notifications' },
                loadComponent: () => import('@/components/notifications/notifications').then((m) => m.NotificationsComponent)
            },
            { path: 'user-profile', data: { breadcrumb: 'Profile' }, component: UserProfileComponent },
            { path: 'apps', data: { breadcrumb: 'Apps' }, loadChildren: () => import('@/apps/apps.routes') },
            { path: 'ecommerce', data: { breadcrumb: 'E-Commerce' }, loadChildren: () => import('@/pages/ecommerce/ecommerce.routes') },
            { path: 'blocks', data: { breadcrumb: 'Prime Blocks' }, loadChildren: () => import('@/pages/blocks/blocks.routes') },
            { path: 'profile', data: { breadcrumb: 'User Management' }, loadChildren: () => import('@/pages/usermanagement/usermanagement.routes') }
        ]
    },
    { path: 'auth', loadChildren: () => import('@/pages/auth/auth.routes') },
    { path: 'landing', loadComponent: () => import('@/pages/landing/landing').then((c) => c.Landing) },
    { path: 'notfound', loadComponent: () => import('@/pages/notfound/notfound').then((c) => c.Notfound) },
    { path: '**', redirectTo: '/notfound' }
];

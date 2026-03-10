// app.routes.ts
import { Routes } from '@angular/router';
import { AppLayout } from '@/layout/components/app.layout';
import { ConfirmationService, MessageService } from 'primeng/api';
import { UserProfileComponent } from '@/components/user-profile/user-profile';
import { authGuard } from './app/guards/auth.guard';

export const appRoutes: Routes = [
    {
        path: '',
        component: AppLayout,
        canActivate: [authGuard],
        children: [
            { path: '', data: { breadcrumb: 'Saas Dashboard' }, loadComponent: () => import('@/pages/dashboard/saasdashboard').then((c) => c.SaasDashboard) },
            { path: 'dashboard-sales', data: { breadcrumb: 'Sales Dashboard' }, loadComponent: () => import('@/pages/dashboard/salesdashboard').then((c) => c.SalesDashboard) },
            { path: 'uikit', data: { breadcrumb: 'UI Kit' }, loadChildren: () => import('@/pages/uikit/uikit.routes') },
            { path: 'documentation', data: { breadcrumb: 'Documentation' }, loadComponent: () => import('@/pages/documentation/documentation').then((c) => c.Documentation) },
            { path: 'pages', data: { breadcrumb: 'Pages' }, loadChildren: () => import('@/pages/pages.routes') },

            // ✅ Correct lazy route. Ensure the file exports `DoctorsManagement`.
            {
                path: 'doctors-management',
                data: { breadcrumb: 'Doctors Management' },
                loadComponent: () => import('@/components/Doctors Management/doctors-management').then((c) => c.DoctorsManagementComponent),
                providers: [ConfirmationService, MessageService]
            },
            {
                path: 'patients-management',
                data: { breadcrumb: 'Doctors Management' },
                loadComponent: () => import('@/components/Patients Management/patients-management').then((c) => c.PatientsManagementComponent),
                providers: [ConfirmationService, MessageService]
            },
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
                path: 'patient-profile/:id',
                data: { breadcrumb: 'Patient Profile' },
                loadComponent: () => import('@/components/patient-profile/patient-profile').then((m) => m.PatientProfileComponent)
            },
            { path: 'user-profile', data: { breadcrumb: 'Profile' }, component: UserProfileComponent },
            { path: '', redirectTo: 'doctors-management', pathMatch: 'full' },
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

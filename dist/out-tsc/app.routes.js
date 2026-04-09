import { AppLayout } from '@/layout/components/app.layout';
import { ConfirmationService, MessageService } from 'primeng/api';
import { UserProfileComponent } from '@/components/user-profile/user-profile';
import { authGuard } from './app/guards/auth.guard';
import { roleGuard } from './app/guards/role.guard';
import { ExaminationDetailComponent } from '@/components/examination/examination-detail/examination-detail';
import { ExaminationFormComponent } from '@/components/examination/examination-form/examination-form';
import { AdminPanelComponent } from '@/components/admin-panel/admin-panel';
import { PharmacyComponent } from '@/components/pharmacy/pharmacy';
// Roles allowed to access the patients module
const PATIENTS_ROLES = ['admin', 'developer', 'doctor'];
export const appRoutes = [
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
            {
                path: 'doctors-management',
                data: { breadcrumb: 'Doctors Management' },
                loadComponent: () => import('@/components/Doctors Management/doctors-management').then((c) => c.DoctorsManagementComponent),
                providers: [ConfirmationService, MessageService]
            },
            // Patients module blocked for doctors
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
            { path: 'profile', data: { breadcrumb: 'User Management' }, loadChildren: () => import('@/pages/usermanagement/usermanagement.routes') },
            { path: 'examination/:examId', component: ExaminationFormComponent },
            { path: 'examination/:examId/view', component: ExaminationDetailComponent },
            { path: 'admin-panel', component: AdminPanelComponent },
            { path: 'pharmacy', component: PharmacyComponent }
        ]
    },
    { path: 'auth', loadChildren: () => import('@/pages/auth/auth.routes') },
    { path: 'landing', loadComponent: () => import('@/pages/landing/landing').then((c) => c.Landing) },
    { path: 'notfound', loadComponent: () => import('@/pages/notfound/notfound').then((c) => c.Notfound) },
    { path: '**', redirectTo: '/notfound' }
];

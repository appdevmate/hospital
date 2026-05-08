import { Routes } from '@angular/router';

export default [
    {
        path: '',
        loadComponent: () => import('./appointment-list/appointment-list').then((m) => m.AppointmentListComponent),
        data: { breadcrumb: 'Appointments' }
    },
    {
        path: 'new',
        loadComponent: () => import('./appointment-form/appointment-form').then((m) => m.AppointmentFormComponent),
        data: { breadcrumb: 'New Appointment' }
    },
    {
        path: ':id',
        loadComponent: () => import('./appointment-detail/appointment-detail').then((m) => m.AppointmentDetailComponent),
        data: { breadcrumb: 'Appointment Detail' }
    },
    {
        path: ':id/edit',
        loadComponent: () => import('./appointment-form/appointment-form').then((m) => m.AppointmentFormComponent),
        data: { breadcrumb: 'Edit Appointment' }
    }
] satisfies Routes;

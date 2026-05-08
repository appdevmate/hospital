import { Routes } from '@angular/router';

export default [
    {
        path: '',
        loadComponent: () => import('./consultation-list/consultation-list').then((m) => m.ConsultationListComponent),
        data: { breadcrumb: 'Consultations' }
    },
    {
        path: 'new',
        loadComponent: () => import('./consultation-form/consultation-form').then((m) => m.ConsultationFormComponent),
        data: { breadcrumb: 'New Consultation' }
    },
    {
        path: ':id',
        loadComponent: () => import('./consultation-detail/consultation-detail').then((m) => m.ConsultationDetailComponent),
        data: { breadcrumb: 'Consultation Detail' }
    },
    {
        path: ':id/edit',
        loadComponent: () => import('./consultation-form/consultation-form').then((m) => m.ConsultationFormComponent),
        data: { breadcrumb: 'Edit Consultation' }
    }
] satisfies Routes;

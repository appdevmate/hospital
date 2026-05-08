import { Routes } from '@angular/router';

export default [
    {
        path: '',
        loadComponent: () => import('./patient-list/patient-list').then((m) => m.PatientListComponent),
        data: { breadcrumb: 'Patients' }
    },
    {
        path: 'new',
        loadComponent: () => import('./patient-form/patient-form').then((m) => m.PatientFormComponent),
        data: { breadcrumb: 'New Patient' }
    },
    {
        path: ':id',
        loadComponent: () => import('./patient-detail/patient-detail').then((m) => m.PatientDetailComponent),
        data: { breadcrumb: 'Patient Detail' }
    },
    {
        path: ':id/edit',
        loadComponent: () => import('./patient-form/patient-form').then((m) => m.PatientFormComponent),
        data: { breadcrumb: 'Edit Patient' }
    }
] satisfies Routes;

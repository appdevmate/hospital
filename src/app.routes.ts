import { Routes } from '@angular/router';
import { AppLayout } from '@/layout/components/app.layout';

export const appRoutes: Routes = [
    {
        path: '',
        component: AppLayout,
        children: [
            { path: '', data: { breadcrumb: 'Saas Dashboard' }, loadComponent:() => import('@/pages/dashboard/saasdashboard').then(c => c.SaasDashboard)},
            { path: 'dashboard-sales', data: { breadcrumb: 'Sales Dashboard' },loadComponent:() => import('@/pages/dashboard/salesdashboard').then(c => c.SalesDashboard) },
            { path: 'uikit', data: { breadcrumb: 'UI Kit' }, loadChildren: () => import('@/pages/uikit/uikit.routes') },
            { path: 'documentation', data: { breadcrumb: 'Documentation' },loadComponent:() => import('@/pages/documentation/documentation').then(c => c.Documentation) },
            { path: 'pages', data: { breadcrumb: 'Pages' }, loadChildren: () => import('@/pages/pages.routes') },
            { path: 'apps', data: { breadcrumb: 'Apps' }, loadChildren: () => import('./app/apps/apps.routes') },
            { path: 'ecommerce',  data: { breadcrumb: 'E-Commerce' }, loadChildren: () => import('@/pages/ecommerce/ecommerce.routes') },
            { path: 'blocks',  data: { breadcrumb: 'Prime Blocks' }, loadChildren: () => import('@/pages/blocks/blocks.routes') },
            {path: 'profile', data: { breadcrumb: 'User Management' }, loadChildren: () => import('@/pages/usermanagement/usermanagement.routes')},
        ]
    },
    { path: 'auth', loadChildren: () => import('@/pages/auth/auth.routes') },
    { path: 'landing', loadComponent:() => import('@/pages/landing/landing').then(c => c.Landing) },
    { path: 'notfound', loadComponent:() => import('@/pages/notfound/notfound').then(c => c.Notfound) },
    { path: '**', redirectTo: '/notfound' }
];

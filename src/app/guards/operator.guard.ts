import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TenantService } from '@/services/tenant.service';

/**
 * Akwadona Operator Console guard (Step 7).
 *
 * Allows the route only when the JWT carries `role: operator`.
 * Non-operators get redirected to the dashboard — they will already have
 * been bounced off the `www` subdomain by authGuard, but this is a second
 * layer of defense for in-app navigation.
 */
export const operatorGuard: CanActivateFn = () => {
    const tenant = inject(TenantService);
    const router = inject(Router);
    if (tenant.isOperator) return true;
    return router.parseUrl('/');
};

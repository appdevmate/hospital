import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, UserRole } from '@/pages/service/auth.service';

/**
 * Usage in routes:
 *   canActivate: [roleGuard(['admin', 'developer'])]
 *
 * Redirects to /notfound if the logged-in user's role is not in the allowed list.
 */
export function roleGuard(allowedRoles: UserRole[]): CanActivateFn {
    return () => {
        const auth = inject(AuthService);
        const router = inject(Router);
        if (allowedRoles.includes(auth.current.role)) return true;
        return router.createUrlTree(['/notfound']);
    };
}

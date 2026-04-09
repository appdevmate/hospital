import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@/pages/service/auth.service';
/**
 * Usage in routes:
 *   canActivate: [roleGuard(['admin', 'developer'])]
 *
 * Redirects to /notfound if the logged-in user's role is not in the allowed list.
 */
export function roleGuard(allowedRoles) {
    return () => {
        const auth = inject(AuthService);
        const router = inject(Router);
        if (allowedRoles.includes(auth.current.role))
            return true;
        return router.createUrlTree(['/notfound']);
    };
}

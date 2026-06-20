import { Injectable } from '@angular/core';

export type UserRole = 'developer' | 'admin' | 'doctor' | 'pharmacist' | 'patient' | 'unknown';

export interface CurrentUser {
    role: UserRole;
    name: string;
    email: string;
    username: string;
    /** Step C.3 — for doctor users, the application doctorId UUID injected
     *  into the JWT by the pre-token-generation Lambda. Use this as the
     *  doctor's foreign key when creating appointments / consultations.
     */
    doctorId?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private _user: CurrentUser | null = null;
    private _groups: string[] = [];

    get current(): CurrentUser {
        if (this._user) return this._user;
        try {
            const raw = localStorage.getItem('userData');
            const data = raw ? JSON.parse(raw) : {};

            // Read groups + doctorId from access token (Step C.3)
            let groups: string[] = [];
            let doctorId: string | null = null;
            const accessToken = sessionStorage.getItem('accessToken') || '';
            if (accessToken && accessToken.split('.').length === 3) {
                try {
                    const part = accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
                    const pad = part + '='.repeat((4 - (part.length % 4)) % 4);
                    const payload = JSON.parse(atob(pad));
                    groups = payload['cognito:groups'] ?? [];
                    doctorId = payload['doctorId'] ?? null;
                } catch {}
            }

            this._groups = groups;
            const role = this.parseRole(data.role, groups);
            this._user = {
                role,
                name: (data.name || '').toLowerCase().trim(),
                email: (data.email || '').toLowerCase().trim(),
                username: data.username || '',
                doctorId
            };
            return this._user;
        } catch {
            return this.fallback();
        }
    }

    get isAdmin(): boolean {
        return this.current.role === 'admin';
    }

    get isDeveloper(): boolean {
        return this.current.role === 'developer';
    }

    get isDoctor(): boolean {
        return this.current.role === 'doctor';
    }

    get isPharmacist(): boolean {
        // Ensure current is loaded so _groups is populated
        void this.current;
        return this._groups.includes('Pharmacists');
    }

    invalidate() {
        this._user = null;
        this._groups = [];
    }

    private parseRole(role: string, groups: string[] = []): UserRole {
        if (role === 'developer' || groups.includes('Developers')) return 'developer';
        if (role === 'admin' || groups.includes('Admin')) return 'admin';
        if (role === 'doctor' || groups.includes('Doctors')) return 'doctor';
        if (role === 'pharmacist' || groups.includes('Pharmacists')) return 'pharmacist';
        if (role === 'patient' || groups.includes('Patients')) return 'patient';
        return 'unknown';
    }

    private fallback(): CurrentUser {
        return { role: 'unknown', name: '', email: '', username: '' };
    }
}

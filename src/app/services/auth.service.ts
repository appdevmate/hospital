import { Injectable } from '@angular/core';

export type UserRole = 'developer' | 'admin' | 'doctor' | 'patient' | 'unknown';

export interface CurrentUser {
    role: UserRole;
    name: string;
    email: string;
    username: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private _user: CurrentUser | null = null;

    get current(): CurrentUser {
        if (this._user) return this._user;
        try {
            const raw = localStorage.getItem('userData');
            if (!raw) return this.fallback();
            const data = JSON.parse(raw);
            const role = this.parseRole(data.role, data['cognito:groups']);
            this._user = {
                role,
                name: (data.name || '').toLowerCase().trim(),
                email: (data.email || '').toLowerCase().trim(),
                username: data.username || ''
            };
            return this._user;
        } catch {
            return this.fallback();
        }
    }

    get isAdmin(): boolean {
        return this.current.role === 'developer' || this.current.role === 'admin';
    }

    get isDoctor(): boolean {
        return this.current.role === 'doctor';
    }

    invalidate() {
        this._user = null;
    }

    private parseRole(role: string, groups: string[] = []): UserRole {
        if (role === 'developer' || groups.includes('Developers')) return 'developer';
        if (role === 'admin' || groups.includes('Admin')) return 'admin';
        if (role === 'doctor' || groups.includes('Doctors')) return 'doctor';
        if (role === 'patient' || groups.includes('Patients')) return 'patient';
        return 'unknown';
    }

    private fallback(): CurrentUser {
        return { role: 'unknown', name: '', email: '', username: '' };
    }
}

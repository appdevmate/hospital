import { __decorate } from "tslib";
import { Injectable } from '@angular/core';
let AuthService = class AuthService {
    _user = null;
    _groups = [];
    get current() {
        if (this._user)
            return this._user;
        try {
            const raw = localStorage.getItem('userData');
            const data = raw ? JSON.parse(raw) : {};
            // Read groups from access token
            let groups = [];
            const accessToken = sessionStorage.getItem('accessToken') || '';
            if (accessToken && accessToken.split('.').length === 3) {
                try {
                    const part = accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
                    const pad = part + '='.repeat((4 - (part.length % 4)) % 4);
                    const payload = JSON.parse(atob(pad));
                    groups = payload['cognito:groups'] ?? [];
                }
                catch { }
            }
            this._groups = groups;
            const role = this.parseRole(data.role, groups);
            this._user = {
                role,
                name: (data.name || '').toLowerCase().trim(),
                email: (data.email || '').toLowerCase().trim(),
                username: data.username || ''
            };
            return this._user;
        }
        catch {
            return this.fallback();
        }
    }
    get isAdmin() {
        return this.current.role === 'admin';
    }
    get isDeveloper() {
        return this.current.role === 'developer';
    }
    get isDoctor() {
        return this.current.role === 'doctor';
    }
    get isPharmacist() {
        // Ensure current is loaded so _groups is populated
        void this.current;
        return this._groups.includes('Pharmacists');
    }
    invalidate() {
        this._user = null;
        this._groups = [];
    }
    parseRole(role, groups = []) {
        if (role === 'developer' || groups.includes('Developers'))
            return 'developer';
        if (role === 'admin' || groups.includes('Admin'))
            return 'admin';
        if (role === 'doctor' || groups.includes('Doctors'))
            return 'doctor';
        if (role === 'pharmacist' || groups.includes('Pharmacists'))
            return 'pharmacist';
        if (role === 'patient' || groups.includes('Patients'))
            return 'patient';
        return 'unknown';
    }
    fallback() {
        return { role: 'unknown', name: '', email: '', username: '' };
    }
};
AuthService = __decorate([
    Injectable({ providedIn: 'root' })
], AuthService);
export { AuthService };

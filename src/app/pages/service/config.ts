import { environment } from '../../../environments/environment';

export class Config {
    private static readonly clinicUrl = environment.clinicApiUrl;
    private static readonly usersUrl  = environment.usersApiUrl;
    private static readonly hmsUrl    = environment.hmsApiUrl;

    static getEnvironment(): string {
        return environment.production ? 'production' : 'development';
    }

    /** Clinic API — doctors, payments, examinations, calendar, appointments */
    static getBaseUrl(): string { return this.clinicUrl; }
    static buildUrl(path: string): string { return `${this.clinicUrl}/${path}`; }

    /** Calendar sub-paths still go through the same clinic API */
    static buildCalendarUrl(path: string): string { return `${this.clinicUrl}/${path}`; }

    /** Users API */
    static getUsersBaseUrl(): string { return `${this.usersUrl}/users`; }
    static buildUsersUrl(path: string): string { return `${this.usersUrl}/${path}`; }

    /** HMS API */
    static buildHmsUrl(path: string): string { return `${this.hmsUrl}/${path}`; }
}

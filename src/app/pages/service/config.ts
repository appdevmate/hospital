export class Config {
    private static readonly tiryaqUrl = 'https://xy829e3qw2.execute-api.us-east-1.amazonaws.com';
    private static readonly calendarUrl = 'https://od8gx8kld8.execute-api.us-east-1.amazonaws.com';
    private static readonly environment = 'development';

    static getEnvironment(): string {
        return this.environment;
    }

    /** Builds a Tiryaq API endpoint URL */
    static getBaseUrl(): string {
        return this.tiryaqUrl;
    }

    /** Builds a full Tiryaq API URL for a given path */
    static buildUrl(path: string): string {
        return `${this.tiryaqUrl}/${path}`;
    }

    /** Builds a SaaS Calendar API endpoint URL */
    static buildCalendarUrl(path: string): string {
        return `${this.calendarUrl}/${path}`;
    }
}

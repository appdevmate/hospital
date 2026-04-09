export class Config {
    static tiryaqUrl = 'https://xy829e3qw2.execute-api.us-east-1.amazonaws.com';
    static calendarUrl = 'https://od8gx8kld8.execute-api.us-east-1.amazonaws.com';
    static environment = 'development';
    static getEnvironment() {
        return this.environment;
    }
    /** Builds a Tiryaq API endpoint URL */
    static getBaseUrl() {
        return this.tiryaqUrl;
    }
    /** Builds a full Tiryaq API URL for a given path */
    static buildUrl(path) {
        return `${this.tiryaqUrl}/${path}`;
    }
    /** Builds a SaaS Calendar API endpoint URL */
    static buildCalendarUrl(path) {
        return `${this.calendarUrl}/${path}`;
    }
}

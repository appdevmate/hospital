export class Config {
    private static readonly apiBaseUrl = 'https://a2s6jk35d9.execute-api.us-east-1.amazonaws.com';
    private static readonly environment = 'development';

    static getEnvironment(): string {
        return this.environment;
    }

    /** Builds an Akwadona API endpoint URL */
    static getBaseUrl(): string {
        return this.apiBaseUrl;
    }

    /** Builds a full Akwadona API URL for a given path */
    static buildUrl(path: string): string {
        return `${this.apiBaseUrl}/${path}`;
    }
}

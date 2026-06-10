export class Config {
    private static readonly tiryaqUrl = 'https://jxz59jh15f.execute-api.us-east-1.amazonaws.com';
    private static readonly environment = 'development';

    static getEnvironment(): string {
        return this.environment;
    }

    /** Builds an Akwadona API endpoint URL */
    static getBaseUrl(): string {
        return this.tiryaqUrl;
    }

    /** Builds a full Akwadona API URL for a given path */
    static buildUrl(path: string): string {
        return `${this.tiryaqUrl}/${path}`;
    }
}

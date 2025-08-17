// config.ts
export class Config {
    // Static constants (change values as needed)
    private static readonly baseUrl = 'https://vbm8co91rb.execute-api.eu-north-1.amazonaws.com';
    private static readonly environment = 'development'; // or 'development'

    /**
     * Returns the base API URL.
     */
    static getBaseUrl(): string {
        return this.baseUrl;
    }

    /**
     * Returns the current environment.
     */
    static getEnvironment(): string {
        return this.environment;
    }

    /**
     * Builds a complete endpoint URL.
     * @param path Endpoint path without leading slash
     */
    static buildUrl(path: string): string {
        return `${this.baseUrl}/${path}`;
    }
}

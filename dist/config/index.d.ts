/**
 * Configuration Management
 *
 * Centralized configuration for the application.
 * Uses environment variables with sensible defaults.
 */
export interface Config {
    server: {
        port: number;
        host: string;
    };
    redis: {
        host: string;
        port: number;
        password?: string;
        db: number;
        maxRetriesPerRequest: number;
        enableReadyCheck: boolean;
    };
    postgres: {
        host: string;
        port: number;
        database: string;
        user: string;
        password: string;
        max: number;
        idleTimeoutMillis: number;
        connectionTimeoutMillis: number;
    };
    bullmq: {
        connection: {
            host: string;
            port: number;
            password?: string;
            db: number;
        };
    };
}
/**
 * Load configuration from environment variables
 */
export declare function loadConfig(): Config;
export declare const config: Config;
//# sourceMappingURL=index.d.ts.map
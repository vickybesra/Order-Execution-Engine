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
    max: number; // Maximum number of clients in the pool
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
export function loadConfig(): Config {
  return {
    server: {
      port: parseInt(process.env.PORT || '3000', 10),
      host: process.env.HOST || '0.0.0.0',
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    },
    postgres: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      database: process.env.POSTGRES_DB || 'order_engine',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      max: parseInt(process.env.POSTGRES_MAX_POOL || '20', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    },
    bullmq: {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.BULLMQ_REDIS_DB || '1', 10), // Separate DB for BullMQ
      },
    },
  };
}

export const config = loadConfig();


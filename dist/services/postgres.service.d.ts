/**
 * PostgreSQL Service
 *
 * Manages PostgreSQL connection pool for:
 * - Persisting final order history
 * - Storing failure reasons
 */
import { Pool } from 'pg';
/**
 * Get or create PostgreSQL connection pool
 */
export declare function getPostgresPool(): Pool;
/**
 * Initialize PostgreSQL connection pool
 */
export declare function initializePostgres(): Promise<void>;
/**
 * Close PostgreSQL connection pool gracefully
 */
export declare function closePostgres(): Promise<void>;
/**
 * Health check for PostgreSQL
 */
export declare function checkPostgresHealth(): Promise<boolean>;
//# sourceMappingURL=postgres.service.d.ts.map
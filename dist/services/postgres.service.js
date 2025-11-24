"use strict";
/**
 * PostgreSQL Service
 *
 * Manages PostgreSQL connection pool for:
 * - Persisting final order history
 * - Storing failure reasons
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPostgresPool = getPostgresPool;
exports.initializePostgres = initializePostgres;
exports.closePostgres = closePostgres;
exports.checkPostgresHealth = checkPostgresHealth;
const pg_1 = require("pg");
const config_1 = require("../config");
let postgresPool = null;
/**
 * Get or create PostgreSQL connection pool
 */
function getPostgresPool() {
    if (postgresPool) {
        return postgresPool;
    }
    const poolConfig = {
        host: config_1.config.postgres.host,
        port: config_1.config.postgres.port,
        database: config_1.config.postgres.database,
        user: config_1.config.postgres.user,
        password: config_1.config.postgres.password,
        max: config_1.config.postgres.max,
        idleTimeoutMillis: config_1.config.postgres.idleTimeoutMillis,
        connectionTimeoutMillis: config_1.config.postgres.connectionTimeoutMillis,
    };
    postgresPool = new pg_1.Pool(poolConfig);
    postgresPool.on('connect', (_client) => {
        console.log('PostgreSQL client connected');
    });
    postgresPool.on('error', (err, _client) => {
        console.error('Unexpected PostgreSQL pool error:', err);
    });
    return postgresPool;
}
/**
 * Initialize PostgreSQL connection pool
 */
async function initializePostgres() {
    const pool = getPostgresPool();
    try {
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        console.log('PostgreSQL connection pool initialized successfully');
    }
    catch (error) {
        console.error('Failed to initialize PostgreSQL connection pool:', error);
        throw error;
    }
}
/**
 * Close PostgreSQL connection pool gracefully
 */
async function closePostgres() {
    if (postgresPool) {
        await postgresPool.end();
        postgresPool = null;
        console.log('PostgreSQL connection pool closed');
    }
}
/**
 * Health check for PostgreSQL
 */
async function checkPostgresHealth() {
    try {
        const pool = getPostgresPool();
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        return true;
    }
    catch (error) {
        console.error('PostgreSQL health check failed:', error);
        return false;
    }
}
//# sourceMappingURL=postgres.service.js.map
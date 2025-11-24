/**
 * PostgreSQL Service
 * 
 * Manages PostgreSQL connection pool for:
 * - Persisting final order history
 * - Storing failure reasons
 */

import { Pool, PoolClient, PoolConfig } from 'pg';
import { config } from '../config';

let postgresPool: Pool | null = null;

/**
 * Get or create PostgreSQL connection pool
 */
export function getPostgresPool(): Pool {
  if (postgresPool) {
    return postgresPool;
  }

  const poolConfig: PoolConfig = {
    host: config.postgres.host,
    port: config.postgres.port,
    database: config.postgres.database,
    user: config.postgres.user,
    password: config.postgres.password,
    max: config.postgres.max,
    idleTimeoutMillis: config.postgres.idleTimeoutMillis,
    connectionTimeoutMillis: config.postgres.connectionTimeoutMillis,
  };

  postgresPool = new Pool(poolConfig);

  postgresPool.on('connect', (_client: PoolClient) => {
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
export async function initializePostgres(): Promise<void> {
  const pool = getPostgresPool();
  
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('PostgreSQL connection pool initialized successfully');
  } catch (error) {
    console.error('Failed to initialize PostgreSQL connection pool:', error);
    throw error;
  }
}

/**
 * Close PostgreSQL connection pool gracefully
 */
export async function closePostgres(): Promise<void> {
  if (postgresPool) {
    await postgresPool.end();
    postgresPool = null;
    console.log('PostgreSQL connection pool closed');
  }
}

/**
 * Health check for PostgreSQL
 */
export async function checkPostgresHealth(): Promise<boolean> {
  try {
    const pool = getPostgresPool();
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('PostgreSQL health check failed:', error);
    return false;
  }
}


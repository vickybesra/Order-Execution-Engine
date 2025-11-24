/**
 * Redis Service
 * 
 * Manages Redis connection for:
 * - BullMQ queue broker
 * - Active order storage
 */

import Redis, { RedisOptions } from 'ioredis';
import { config } from '../config';

let redisClient: Redis | null = null;

/**
 * Get or create Redis client instance
 */
export function getRedisClient(): Redis {
  if (redisClient) {
    return redisClient;
  }

  const redisOptions: RedisOptions = {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: config.redis.db,
    maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
    enableReadyCheck: config.redis.enableReadyCheck,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  };

  redisClient = new Redis(redisOptions);

  redisClient.on('connect', () => {
    console.log('Redis client connected');
  });

  redisClient.on('error', (err) => {
    console.error('Redis client error:', err);
  });

  redisClient.on('close', () => {
    console.log('Redis client connection closed');
  });

  redisClient.on('reconnecting', () => {
    console.log('Redis client reconnecting...');
  });

  return redisClient;
}

/**
 * Initialize Redis connection
 */
export async function initializeRedis(): Promise<void> {
  const client = getRedisClient();
  
  try {
    await client.ping();
    console.log('Redis connection initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Redis connection:', error);
    throw error;
  }
}

/**
 * Close Redis connection gracefully
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('Redis connection closed');
  }
}

/**
 * Health check for Redis
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const client = getRedisClient();
    const result = await client.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}


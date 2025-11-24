/**
 * Redis Service
 *
 * Manages Redis connection for:
 * - BullMQ queue broker
 * - Active order storage
 */
import Redis from 'ioredis';
/**
 * Get or create Redis client instance
 */
export declare function getRedisClient(): Redis;
/**
 * Initialize Redis connection
 */
export declare function initializeRedis(): Promise<void>;
/**
 * Close Redis connection gracefully
 */
export declare function closeRedis(): Promise<void>;
/**
 * Health check for Redis
 */
export declare function checkRedisHealth(): Promise<boolean>;
//# sourceMappingURL=redis.service.d.ts.map
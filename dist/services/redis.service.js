"use strict";
/**
 * Redis Service
 *
 * Manages Redis connection for:
 * - BullMQ queue broker
 * - Active order storage
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisClient = getRedisClient;
exports.initializeRedis = initializeRedis;
exports.closeRedis = closeRedis;
exports.checkRedisHealth = checkRedisHealth;
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = require("../config");
let redisClient = null;
/**
 * Get or create Redis client instance
 */
function getRedisClient() {
    if (redisClient) {
        return redisClient;
    }
    const redisOptions = {
        host: config_1.config.redis.host,
        port: config_1.config.redis.port,
        password: config_1.config.redis.password,
        db: config_1.config.redis.db,
        maxRetriesPerRequest: config_1.config.redis.maxRetriesPerRequest,
        enableReadyCheck: config_1.config.redis.enableReadyCheck,
        retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
        },
    };
    redisClient = new ioredis_1.default(redisOptions);
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
async function initializeRedis() {
    const client = getRedisClient();
    try {
        await client.ping();
        console.log('Redis connection initialized successfully');
    }
    catch (error) {
        console.error('Failed to initialize Redis connection:', error);
        throw error;
    }
}
/**
 * Close Redis connection gracefully
 */
async function closeRedis() {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        console.log('Redis connection closed');
    }
}
/**
 * Health check for Redis
 */
async function checkRedisHealth() {
    try {
        const client = getRedisClient();
        const result = await client.ping();
        return result === 'PONG';
    }
    catch (error) {
        console.error('Redis health check failed:', error);
        return false;
    }
}
//# sourceMappingURL=redis.service.js.map
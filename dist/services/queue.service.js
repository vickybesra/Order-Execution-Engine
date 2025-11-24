"use strict";
/**
 * Queue Service
 *
 * Manages BullMQ queue for order processing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderQueue = void 0;
exports.createOrderQueue = createOrderQueue;
const bullmq_1 = require("bullmq");
const config_1 = require("../config");
/**
 * Create and configure the order queue
 */
function createOrderQueue() {
    const queue = new bullmq_1.Queue('order-execution', {
        connection: {
            host: config_1.config.bullmq.connection.host,
            port: config_1.config.bullmq.connection.port,
            password: config_1.config.bullmq.connection.password,
            db: config_1.config.bullmq.connection.db,
        },
        defaultJobOptions: {
            attempts: 3, // Maximum 3 retry attempts
            backoff: {
                type: 'exponential', // Exponential back-off for transient failures
                delay: 2000, // Initial delay of 2 seconds
            },
            removeOnComplete: {
                age: 3600, // Keep completed jobs for 1 hour
                count: 1000, // Keep last 1000 completed jobs
            },
            removeOnFail: {
                age: 86400, // Keep failed jobs for 24 hours for audit
            },
        },
    });
    queue.on('error', (error) => {
        console.error('[QueueService] Queue error:', error);
    });
    console.log('[QueueService] Order queue created');
    return queue;
}
// Export singleton queue instance
exports.orderQueue = createOrderQueue();
//# sourceMappingURL=queue.service.js.map
/**
 * Worker Service
 *
 * BullMQ worker that processes order execution jobs and emits status updates.
 * Configured for high-throughput: up to 10 concurrent jobs, 100 orders/minute processing rate.
 * Includes comprehensive error handling and retry logic with exponential back-off.
 */
import { Worker } from 'bullmq';
import { OrderJobData } from './queue.service';
/**
 * Custom error class for transient failures (network timeouts, etc.)
 */
export declare class TransientError extends Error {
    constructor(message: string);
}
/**
 * Create and configure the order worker
 *
 * Configured for high-throughput processing:
 * - Up to 10 concurrent jobs
 * - 100 orders per minute processing rate
 * - Exponential back-off retry (max 3 attempts)
 * - Comprehensive error handling
 */
export declare function createOrderWorker(): Worker<OrderJobData>;
export declare const orderWorker: Worker<OrderJobData, any, string>;
//# sourceMappingURL=worker.service.d.ts.map
/**
 * Queue Service
 *
 * Manages BullMQ queue for order processing.
 */
import { Queue } from 'bullmq';
import { ActiveOrder } from '../types/order';
/**
 * Order job data
 */
export interface OrderJobData {
    order: ActiveOrder;
}
/**
 * Create and configure the order queue
 */
export declare function createOrderQueue(): Queue<OrderJobData>;
export declare const orderQueue: Queue<OrderJobData, any, string, OrderJobData, any, string>;
//# sourceMappingURL=queue.service.d.ts.map
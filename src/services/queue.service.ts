/**
 * Queue Service
 * 
 * Manages BullMQ queue for order processing.
 */

import { Queue } from 'bullmq';
import { config } from '../config';
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
export function createOrderQueue(): Queue<OrderJobData> {
  const queue = new Queue<OrderJobData>('order-execution', {
    connection: {
      host: config.bullmq.connection.host,
      port: config.bullmq.connection.port,
      password: config.bullmq.connection.password,
      db: config.bullmq.connection.db,
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
export const orderQueue = createOrderQueue();


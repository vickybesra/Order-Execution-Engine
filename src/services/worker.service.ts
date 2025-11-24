/**
 * Worker Service
 * 
 * BullMQ worker that processes order execution jobs and emits status updates.
 * Configured for high-throughput: up to 10 concurrent jobs, 100 orders/minute processing rate.
 * Includes comprehensive error handling and retry logic with exponential back-off.
 */

import { Worker, Job } from 'bullmq';
import { config } from '../config';
import { OrderJobData } from './queue.service';
import { ActiveOrder, OrderStatus, StatusUpdate } from '../types/order';
import { mockDexRouter } from './mock-dex-router.service';
import { webSocketService } from './websocket.service';
import { updateOrderStatusInRedis, storeOrderInPostgres } from './order.service';

/**
 * Custom error class for transient failures (network timeouts, etc.)
 */
export class TransientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransientError';
  }
}

/**
 * Emit status update helper with error handling
 */
function emitStatus(orderId: string, status: OrderStatus, message?: string, data?: any): void {
  try {
    const statusUpdate: StatusUpdate = {
      orderId,
      status,
      timestamp: Date.now(),
      message,
      data,
    };

    webSocketService.emitStatusUpdate(orderId, statusUpdate);
  } catch (error) {
    console.error(`[Worker] Failed to emit status update for order ${orderId}:`, error);
    // Don't throw - status update failure shouldn't fail the job
  }
}

/**
 * Handle order failure with comprehensive error handling
 */
async function handleOrderFailure(
  orderId: string,
  order: ActiveOrder,
  error: unknown,
  attemptNumber: number,
  maxAttempts: number
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const isFinalAttempt = attemptNumber >= maxAttempts;
  
  console.error(
    `[Worker] Order ${orderId} failed (attempt ${attemptNumber}/${maxAttempts}):`,
    errorMessage
  );

  // Emit failed status
  emitStatus(
    orderId,
    'failed',
    isFinalAttempt
      ? `Order execution failed after ${maxAttempts} attempts: ${errorMessage}`
      : `Order execution failed (attempt ${attemptNumber}/${maxAttempts}): ${errorMessage}. Retrying...`,
    {
      failureReason: errorMessage,
      attemptNumber,
      maxAttempts,
    }
  );

  // Update Redis
  try {
    const failedOrder: ActiveOrder = {
      ...order,
      status: 'failed',
      failedAt: Date.now(),
      failureReason: isFinalAttempt
        ? `Failed after ${maxAttempts} attempts: ${errorMessage}`
        : `Attempt ${attemptNumber} failed: ${errorMessage}`,
    };

    await updateOrderStatusInRedis(orderId, 'failed', failedOrder);
  } catch (redisError) {
    console.error(`[Worker] Failed to update Redis for order ${orderId}:`, redisError);
  }

  // Persist to PostgreSQL only on final attempt
  if (isFinalAttempt) {
    try {
      const finalFailedOrder: ActiveOrder = {
        ...order,
        status: 'failed',
        failedAt: Date.now(),
        failureReason: `Failed after ${maxAttempts} attempts: ${errorMessage}`,
      };

      await storeOrderInPostgres(finalFailedOrder);
      console.log(`[Worker] Final failure persisted to PostgreSQL for order ${orderId}`);
    } catch (postgresError) {
      console.error(`[Worker] Failed to persist failure to PostgreSQL for order ${orderId}:`, postgresError);
      // Don't throw - we've already tried to persist
    }
  }
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
export function createOrderWorker(): Worker<OrderJobData> {
  const worker = new Worker<OrderJobData>(
    'order-execution',
    async (job: Job<OrderJobData>) => {
      const { order } = job.data;
      const orderId = order.orderId;
      const attemptNumber = (job.attemptsMade || 0) + 1;
      const maxAttempts = job.opts.attempts || 3;

      console.log(
        `[Worker] Processing order ${orderId} (attempt ${attemptNumber}/${maxAttempts})`
      );

      let routingDecision: any = null;
      let bestQuote: any = null;

      try {
        // 1. Status: pending -> routing
        try {
          emitStatus(orderId, 'routing', 'Fetching quotes from DEXs...');
          await updateOrderStatusInRedis(orderId, 'routing');
        } catch (error) {
          console.error(`[Worker] Failed to update status to routing for order ${orderId}:`, error);
          // Continue processing - status update failure shouldn't fail the job
        }

        // 2. Get best quote using MockDexRouter (critical step with error handling)
        try {
          const quoteResult = await mockDexRouter.getBestQuote(
            order.tokenIn,
            order.tokenOut,
            order.amount
          );

          bestQuote = quoteResult.bestQuote;
          routingDecision = {
            selectedDex: bestQuote.dex,
            raydiumQuote: quoteResult.raydiumQuote,
            meteoraQuote: quoteResult.meteoraQuote,
            selectionReason: `${bestQuote.dex} selected for best execution price`,
            routingTimestamp: Date.now(),
          };

          // Update order with routing decision
          await updateOrderStatusInRedis(orderId, 'routing', {
            routingDecision,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch quotes';
          console.error(`[Worker] Quote fetching failed for order ${orderId}:`, error);
          
          // Simulate transient network error for retry logic demonstration
          // In production, this would be based on actual error type
          if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
            throw new TransientError(`Network timeout during quote fetching: ${errorMessage}`);
          }
          
          throw error; // Re-throw for retry mechanism
        }

        // 3. Status: routing -> building
        try {
          emitStatus(orderId, 'building', 'Building transaction...', { routingDecision });
          await updateOrderStatusInRedis(orderId, 'building', { routingDecision });
        } catch (error) {
          console.error(`[Worker] Failed to update status to building for order ${orderId}:`, error);
        }

        // Simulate transaction building delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        // 4. Execute swap (critical step with error handling)
        let swapResult;
        try {
          swapResult = await mockDexRouter.executeSwap(bestQuote.dex, order);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to execute swap';
          console.error(`[Worker] Swap execution failed for order ${orderId}:`, error);
          
          // Simulate transient network error for retry logic demonstration
          if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
            throw new TransientError(`Network timeout during swap execution: ${errorMessage}`);
          }
          
          throw error; // Re-throw for retry mechanism
        }

        // 5. Status: building -> submitted
        try {
          emitStatus(orderId, 'submitted', 'Transaction submitted to blockchain', {
            routingDecision,
            txHash: swapResult.txHash,
          });
          await updateOrderStatusInRedis(orderId, 'submitted', {
            routingDecision,
            txHash: swapResult.txHash,
          });
        } catch (error) {
          console.error(`[Worker] Failed to update status to submitted for order ${orderId}:`, error);
        }

        // 6. Status: submitted -> confirmed
        try {
          emitStatus(orderId, 'confirmed', 'Order executed successfully', {
            routingDecision,
            txHash: swapResult.txHash,
            executionPrice: swapResult.executedPrice,
            executionAmount: swapResult.executedAmount,
          });
        } catch (error) {
          console.error(`[Worker] Failed to emit confirmed status for order ${orderId}:`, error);
        }

        // Update order with execution details (final persistence)
        const finalOrder: ActiveOrder = {
          ...order,
          status: 'confirmed',
          executedAt: Date.now(),
          exchangeId: bestQuote.dex,
          executionPrice: swapResult.executedPrice,
          executionAmount: swapResult.executedAmount,
          routingDecision,
          txHash: swapResult.txHash,
        };

        // Persist to Redis
        try {
          await updateOrderStatusInRedis(orderId, 'confirmed', finalOrder);
        } catch (error) {
          console.error(`[Worker] Failed to update Redis for confirmed order ${orderId}:`, error);
          throw error; // Redis persistence failure is critical
        }

        // Persist to PostgreSQL (final persistence for success)
        try {
          await storeOrderInPostgres(finalOrder);
          console.log(`[Worker] Order ${orderId} completed successfully and persisted to PostgreSQL`);
        } catch (error) {
          console.error(`[Worker] Failed to persist confirmed order ${orderId} to PostgreSQL:`, error);
          // PostgreSQL persistence failure is critical - re-throw to trigger retry
          throw error;
        }

        return {
          success: true,
          orderId,
          txHash: swapResult.txHash,
          executionPrice: swapResult.executedPrice,
          executionAmount: swapResult.executedAmount,
        };
      } catch (error) {
        // Handle order failure with comprehensive error handling
        await handleOrderFailure(orderId, order, error, attemptNumber, maxAttempts);

        // If this is the final attempt, don't re-throw (job will be marked as failed)
        // Otherwise, re-throw to trigger retry with exponential back-off
        if (attemptNumber >= maxAttempts) {
          console.error(`[Worker] Order ${orderId} failed after ${maxAttempts} attempts. Stopping processing.`);
          // Don't re-throw on final attempt - job will be marked as failed
          return {
            success: false,
            orderId,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }

        // Re-throw to trigger retry with exponential back-off
        throw error;
      }
    },
    {
      connection: {
        host: config.bullmq.connection.host,
        port: config.bullmq.connection.port,
        password: config.bullmq.connection.password,
        db: config.bullmq.connection.db,
      },
      concurrency: 10, // Process up to 10 orders concurrently
      limiter: {
        max: 100, // Max 100 jobs
        duration: 60000, // Per minute (100 orders/minute processing rate)
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} (order ${job.data.order.orderId}) completed successfully`);
  });

  worker.on('failed', (job, err) => {
    const orderId = job?.data?.order?.orderId || 'unknown';
    const attemptsMade = job?.attemptsMade || 0;
    console.error(
      `[Worker] Job ${job?.id} (order ${orderId}) failed after ${attemptsMade} attempts:`,
      err
    );
    
    // Ensure final failure status is emitted if not already done
    if (job?.data?.order) {
      const finalError = err instanceof Error ? err.message : 'Unknown error';
      emitStatus(
        orderId,
        'failed',
        `Order execution failed after ${attemptsMade} attempts: ${finalError}`,
        {
          failureReason: finalError,
          attemptNumber: attemptsMade,
        }
      );
    }
  });

  worker.on('error', (error) => {
    console.error('[Worker] Worker error:', error);
  });

  worker.on('stalled', (jobId) => {
    console.warn(`[Worker] Job ${jobId} stalled and will be retried`);
  });

  console.log('[Worker] Order worker started');
  console.log('[Worker] Configuration:');
  console.log('  - Concurrent jobs: 10');
  console.log('  - Processing rate: 100 orders/minute');
  console.log('  - Max retry attempts: 3');
  console.log('  - Retry strategy: Exponential back-off');

  return worker;
}

// Export singleton worker instance
export const orderWorker = createOrderWorker();


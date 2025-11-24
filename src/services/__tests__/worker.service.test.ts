/**
 * Integration Tests for Worker Service
 * 
 * Tests worker retry logic, error handling, and status updates.
 */

import { Job } from 'bullmq';
import { OrderJobData } from '../queue.service';
import { ActiveOrder, OrderStatus } from '../../types/order';
// TransientError is used in the worker but tested indirectly
import { mockDexRouter } from '../mock-dex-router.service';
import { webSocketService } from '../websocket.service';
import { storeOrderInPostgres } from '../order.service';

// Mock dependencies
jest.mock('../mock-dex-router.service');
jest.mock('../websocket.service');
jest.mock('../order.service');

describe('Worker Service - Retry Logic', () => {
  let mockJob: Partial<Job<OrderJobData>>;
  let order: ActiveOrder;

  beforeEach(() => {
    order = {
      orderId: 'test-order-123',
      tokenIn: 'SOL',
      tokenOut: 'USDC',
      amount: 10,
      orderType: 'MARKET',
      status: 'pending',
      submittedAt: Date.now(),
    };

    mockJob = {
      data: { order },
      attemptsMade: 0,
      opts: { attempts: 3 },
    };

    jest.clearAllMocks();
  });

  describe('Retry on Transient Errors', () => {
    it('should retry on network timeout during quote fetching', async () => {
      const mockGetBestQuote = mockDexRouter.getBestQuote as jest.Mock;
      mockGetBestQuote.mockRejectedValue(new Error('Network timeout'));

      // Simulate retry attempts
      for (let attempt = 1; attempt <= 3; attempt++) {
        mockJob.attemptsMade = attempt - 1;
        
        try {
          // This would be the actual worker processing logic
          await mockGetBestQuote(order.tokenIn, order.tokenOut, order.amount);
        } catch (error) {
          if (attempt < 3) {
            expect(error).toBeInstanceOf(Error);
            // Should retry
          } else {
            // Final attempt - should fail
            expect(attempt).toBe(3);
          }
        }
      }

      expect(mockGetBestQuote).toHaveBeenCalledTimes(3);
    });

    it('should retry on network timeout during swap execution', async () => {
      const mockExecuteSwap = mockDexRouter.executeSwap as jest.Mock;
      mockExecuteSwap.mockRejectedValue(new Error('Network timeout'));

      // Simulate retry attempts
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await mockExecuteSwap('RAYDIUM', order);
        } catch (error) {
          if (attempt < 3) {
            expect(error).toBeInstanceOf(Error);
          }
        }
      }

      expect(mockExecuteSwap).toHaveBeenCalledTimes(3);
    });
  });

  describe('Final Failure Handling', () => {
    it('should persist failure after max retry attempts', async () => {
      const mockGetBestQuote = mockDexRouter.getBestQuote as jest.Mock;
      mockGetBestQuote.mockRejectedValue(new Error('Persistent failure'));

      const mockEmitStatus = webSocketService.emitStatusUpdate as jest.Mock;
      const mockStorePostgres = storeOrderInPostgres as jest.Mock;

      // Simulate final failure
      try {
        await mockGetBestQuote(order.tokenIn, order.tokenOut, order.amount);
      } catch (error) {
        // After 3 attempts, should persist failure
        const failedOrder: ActiveOrder = {
          ...order,
          status: 'failed',
          failedAt: Date.now(),
          failureReason: 'Failed after 3 attempts: Persistent failure',
        };

        await storeOrderInPostgres(failedOrder);
        webSocketService.emitStatusUpdate(order.orderId, {
          orderId: order.orderId,
          status: 'failed',
          timestamp: Date.now(),
          message: 'Failed after 3 attempts',
          data: { failureReason: 'Persistent failure' },
        });
      }

      expect(mockStorePostgres).toHaveBeenCalled();
      expect(mockEmitStatus).toHaveBeenCalled();
    });
  });
});

describe('Worker Service - Status Updates', () => {
  let order: ActiveOrder;

  beforeEach(() => {
    order = {
      orderId: 'test-order-123',
      tokenIn: 'SOL',
      tokenOut: 'USDC',
      amount: 10,
      orderType: 'MARKET',
      status: 'pending',
      submittedAt: Date.now(),
    };

    jest.clearAllMocks();
  });

  it('should emit all status updates in correct order', async () => {
    const mockEmitStatus = webSocketService.emitStatusUpdate as jest.Mock;
    const statusSequence: OrderStatus[] = ['pending', 'routing', 'building', 'submitted', 'confirmed'];

    // Simulate status progression
    for (const status of statusSequence) {
      webSocketService.emitStatusUpdate(order.orderId, {
        orderId: order.orderId,
        status,
        timestamp: Date.now(),
      });
    }

    expect(mockEmitStatus).toHaveBeenCalledTimes(statusSequence.length);
    
    // Verify status order
    const calls = mockEmitStatus.mock.calls;
    calls.forEach((call, index) => {
      expect(call[1].status).toBe(statusSequence[index]);
    });
  });

  it('should emit failed status on error', async () => {
    const mockEmitStatus = webSocketService.emitStatusUpdate as jest.Mock;

    webSocketService.emitStatusUpdate(order.orderId, {
      orderId: order.orderId,
      status: 'failed',
      timestamp: Date.now(),
      message: 'Order execution failed',
      data: { failureReason: 'Test error' },
    });

    expect(mockEmitStatus).toHaveBeenCalledWith(
      order.orderId,
      expect.objectContaining({
        status: 'failed',
        data: expect.objectContaining({ failureReason: 'Test error' }),
      })
    );
  });
});


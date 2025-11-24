/**
 * Unit Tests for Queue Service
 * 
 * Tests queue configuration and concurrent processing limits.
 */

import { createOrderQueue } from '../queue.service';
import { Queue } from 'bullmq';

// Mock BullMQ
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    add: jest.fn(),
    close: jest.fn(),
  })),
}));

describe('Queue Service', () => {
  it('should create queue with correct configuration', () => {
    createOrderQueue();

    expect(Queue).toHaveBeenCalledWith(
      'order-execution',
      expect.objectContaining({
        defaultJobOptions: expect.objectContaining({
          attempts: 3,
          backoff: expect.objectContaining({
            type: 'exponential',
            delay: 2000,
          }),
        }),
      })
    );
  });

  it('should configure max 3 retry attempts', () => {
    createOrderQueue();
    const callArgs = (Queue as unknown as jest.Mock).mock.calls[0];
    const config = callArgs[1];

    expect(config.defaultJobOptions.attempts).toBe(3);
  });

  it('should configure exponential back-off', () => {
    createOrderQueue();
    const callArgs = (Queue as unknown as jest.Mock).mock.calls[0];
    const config = callArgs[1];

    expect(config.defaultJobOptions.backoff.type).toBe('exponential');
    expect(config.defaultJobOptions.backoff.delay).toBe(2000);
  });
});


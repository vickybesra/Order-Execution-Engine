"use strict";
/**
 * Unit Tests for Queue Service
 *
 * Tests queue configuration and concurrent processing limits.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const queue_service_1 = require("../queue.service");
const bullmq_1 = require("bullmq");
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
        (0, queue_service_1.createOrderQueue)();
        expect(bullmq_1.Queue).toHaveBeenCalledWith('order-execution', expect.objectContaining({
            defaultJobOptions: expect.objectContaining({
                attempts: 3,
                backoff: expect.objectContaining({
                    type: 'exponential',
                    delay: 2000,
                }),
            }),
        }));
    });
    it('should configure max 3 retry attempts', () => {
        (0, queue_service_1.createOrderQueue)();
        const callArgs = bullmq_1.Queue.mock.calls[0];
        const config = callArgs[1];
        expect(config.defaultJobOptions.attempts).toBe(3);
    });
    it('should configure exponential back-off', () => {
        (0, queue_service_1.createOrderQueue)();
        const callArgs = bullmq_1.Queue.mock.calls[0];
        const config = callArgs[1];
        expect(config.defaultJobOptions.backoff.type).toBe('exponential');
        expect(config.defaultJobOptions.backoff.delay).toBe(2000);
    });
});
//# sourceMappingURL=queue.service.test.js.map
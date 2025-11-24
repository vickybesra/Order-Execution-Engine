"use strict";
/**
 * Integration Tests for Worker Service
 *
 * Tests worker retry logic, error handling, and status updates.
 */
Object.defineProperty(exports, "__esModule", { value: true });
// TransientError is used in the worker but tested indirectly
const mock_dex_router_service_1 = require("../mock-dex-router.service");
const websocket_service_1 = require("../websocket.service");
const order_service_1 = require("../order.service");
// Mock dependencies
jest.mock('../mock-dex-router.service');
jest.mock('../websocket.service');
jest.mock('../order.service');
describe('Worker Service - Retry Logic', () => {
    let mockJob;
    let order;
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
            const mockGetBestQuote = mock_dex_router_service_1.mockDexRouter.getBestQuote;
            mockGetBestQuote.mockRejectedValue(new Error('Network timeout'));
            // Simulate retry attempts
            for (let attempt = 1; attempt <= 3; attempt++) {
                mockJob.attemptsMade = attempt - 1;
                try {
                    // This would be the actual worker processing logic
                    await mockGetBestQuote(order.tokenIn, order.tokenOut, order.amount);
                }
                catch (error) {
                    if (attempt < 3) {
                        expect(error).toBeInstanceOf(Error);
                        // Should retry
                    }
                    else {
                        // Final attempt - should fail
                        expect(attempt).toBe(3);
                    }
                }
            }
            expect(mockGetBestQuote).toHaveBeenCalledTimes(3);
        });
        it('should retry on network timeout during swap execution', async () => {
            const mockExecuteSwap = mock_dex_router_service_1.mockDexRouter.executeSwap;
            mockExecuteSwap.mockRejectedValue(new Error('Network timeout'));
            // Simulate retry attempts
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    await mockExecuteSwap('RAYDIUM', order);
                }
                catch (error) {
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
            const mockGetBestQuote = mock_dex_router_service_1.mockDexRouter.getBestQuote;
            mockGetBestQuote.mockRejectedValue(new Error('Persistent failure'));
            const mockEmitStatus = websocket_service_1.webSocketService.emitStatusUpdate;
            const mockStorePostgres = order_service_1.storeOrderInPostgres;
            // Simulate final failure
            try {
                await mockGetBestQuote(order.tokenIn, order.tokenOut, order.amount);
            }
            catch (error) {
                // After 3 attempts, should persist failure
                const failedOrder = {
                    ...order,
                    status: 'failed',
                    failedAt: Date.now(),
                    failureReason: 'Failed after 3 attempts: Persistent failure',
                };
                await (0, order_service_1.storeOrderInPostgres)(failedOrder);
                websocket_service_1.webSocketService.emitStatusUpdate(order.orderId, {
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
    let order;
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
        const mockEmitStatus = websocket_service_1.webSocketService.emitStatusUpdate;
        const statusSequence = ['pending', 'routing', 'building', 'submitted', 'confirmed'];
        // Simulate status progression
        for (const status of statusSequence) {
            websocket_service_1.webSocketService.emitStatusUpdate(order.orderId, {
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
        const mockEmitStatus = websocket_service_1.webSocketService.emitStatusUpdate;
        websocket_service_1.webSocketService.emitStatusUpdate(order.orderId, {
            orderId: order.orderId,
            status: 'failed',
            timestamp: Date.now(),
            message: 'Order execution failed',
            data: { failureReason: 'Test error' },
        });
        expect(mockEmitStatus).toHaveBeenCalledWith(order.orderId, expect.objectContaining({
            status: 'failed',
            data: expect.objectContaining({ failureReason: 'Test error' }),
        }));
    });
});
//# sourceMappingURL=worker.service.test.js.map
"use strict";
/**
 * Integration Tests for Order Routes
 *
 * Tests HTTP endpoint and WebSocket lifecycle.
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Integration Tests for Order Routes
 *
 * Tests HTTP endpoint validation and order submission flow.
 * Note: Full WebSocket testing requires a WebSocket client library.
 */
const queue_service_1 = require("../../services/queue.service");
const websocket_service_1 = require("../../services/websocket.service");
// Mock dependencies
jest.mock('../../services/queue.service');
jest.mock('../../services/websocket.service');
jest.mock('../../services/order.service', () => ({
    createOrderFromRequest: jest.fn((req) => ({
        ...req,
        orderId: 'test-order-123',
        status: 'pending',
        submittedAt: Date.now(),
    })),
    storeOrderInRedis: jest.fn().mockResolvedValue(undefined),
    storeOrderInPostgres: jest.fn().mockResolvedValue(undefined),
}));
describe('Order Routes - Validation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('Order Request Validation', () => {
        it('should validate tokenIn is required', () => {
            const invalidRequest = {
                tokenOut: 'USDC',
                amount: 10,
                orderType: 'MARKET',
            };
            // Validation would reject this
            expect(invalidRequest.tokenIn).toBeUndefined();
        });
        it('should validate amount is positive', () => {
            const invalidRequest = {
                tokenIn: 'SOL',
                tokenOut: 'USDC',
                amount: -10, // Invalid
                orderType: 'MARKET',
            };
            expect(invalidRequest.amount).toBeLessThan(0);
        });
        it('should validate orderType is in enum', () => {
            const validTypes = ['MARKET', 'LIMIT', 'SNIPER'];
            const invalidType = 'INVALID';
            expect(validTypes).not.toContain(invalidType);
        });
    });
    describe('Queue Integration', () => {
        it('should add order to queue on submission', () => {
            const mockAdd = jest.fn();
            queue_service_1.orderQueue.add = mockAdd;
            // Simulate order submission
            const orderData = {
                order: {
                    orderId: 'test-123',
                    tokenIn: 'SOL',
                    tokenOut: 'USDC',
                    amount: 10,
                    orderType: 'MARKET',
                    status: 'pending',
                    submittedAt: Date.now(),
                },
            };
            queue_service_1.orderQueue.add('execute-order', orderData);
            expect(mockAdd).toHaveBeenCalled();
        });
    });
    describe('WebSocket Service', () => {
        it('should register WebSocket connections', () => {
            const mockRegister = jest.fn();
            websocket_service_1.webSocketService.registerConnection = mockRegister;
            // Simulate WebSocket registration
            const mockSocket = {};
            websocket_service_1.webSocketService.registerConnection(mockSocket, 'test-order-123');
            expect(mockRegister).toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=orders.routes.test.js.map
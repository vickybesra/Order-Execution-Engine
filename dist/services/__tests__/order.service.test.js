"use strict";
/**
 * Unit Tests for Order Service
 *
 * Tests order persistence and retrieval logic.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const order_service_1 = require("../order.service");
const redis_service_1 = require("../redis.service");
// Mock Redis
jest.mock('../redis.service', () => ({
    getRedisClient: jest.fn(),
}));
describe('Order Service', () => {
    let mockRedis;
    beforeEach(() => {
        mockRedis = {
            setex: jest.fn().mockResolvedValue('OK'),
            get: jest.fn(),
            sadd: jest.fn().mockResolvedValue(1),
            srem: jest.fn().mockResolvedValue(1),
        };
        redis_service_1.getRedisClient.mockReturnValue(mockRedis);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('generateOrderId', () => {
        it('should generate unique order IDs', () => {
            const id1 = (0, order_service_1.generateOrderId)();
            const id2 = (0, order_service_1.generateOrderId)();
            expect(id1).toBeDefined();
            expect(id2).toBeDefined();
            expect(id1).not.toBe(id2);
            expect(id1).toMatch(/^order_\d+_[a-f0-9]+$/);
        });
    });
    describe('createOrderFromRequest', () => {
        it('should create order with all required fields', () => {
            const request = {
                tokenIn: 'SOL',
                tokenOut: 'USDC',
                amount: 10,
                orderType: 'MARKET',
            };
            const order = (0, order_service_1.createOrderFromRequest)(request);
            expect(order.orderId).toBeDefined();
            expect(order.tokenIn).toBe('SOL');
            expect(order.tokenOut).toBe('USDC');
            expect(order.amount).toBe(10);
            expect(order.orderType).toBe('MARKET');
            expect(order.status).toBe('pending');
            expect(order.submittedAt).toBeGreaterThan(0);
        });
    });
    describe('storeOrderInRedis', () => {
        it('should store order in Redis with TTL', async () => {
            const order = (0, order_service_1.createOrderFromRequest)({
                tokenIn: 'SOL',
                tokenOut: 'USDC',
                amount: 10,
                orderType: 'MARKET',
            });
            await (0, order_service_1.storeOrderInRedis)(order);
            expect(mockRedis.setex).toHaveBeenCalledWith(`order:${order.orderId}`, 86400, expect.stringContaining(order.orderId));
            expect(mockRedis.sadd).toHaveBeenCalledWith('orders:active', order.orderId);
        });
    });
    describe('getOrderFromRedis', () => {
        it('should retrieve order from Redis', async () => {
            const order = (0, order_service_1.createOrderFromRequest)({
                tokenIn: 'SOL',
                tokenOut: 'USDC',
                amount: 10,
                orderType: 'MARKET',
            });
            mockRedis.get.mockResolvedValue(JSON.stringify(order));
            const retrieved = await (0, order_service_1.getOrderFromRedis)(order.orderId);
            expect(retrieved).toEqual(order);
            expect(mockRedis.get).toHaveBeenCalledWith(`order:${order.orderId}`);
        });
        it('should return null if order not found', async () => {
            mockRedis.get.mockResolvedValue(null);
            const retrieved = await (0, order_service_1.getOrderFromRedis)('nonexistent');
            expect(retrieved).toBeNull();
        });
    });
    describe('updateOrderStatusInRedis', () => {
        it('should update order status in Redis', async () => {
            const order = (0, order_service_1.createOrderFromRequest)({
                tokenIn: 'SOL',
                tokenOut: 'USDC',
                amount: 10,
                orderType: 'MARKET',
            });
            mockRedis.get.mockResolvedValue(JSON.stringify(order));
            await (0, order_service_1.updateOrderStatusInRedis)(order.orderId, 'routing');
            expect(mockRedis.setex).toHaveBeenCalled();
            const callArgs = mockRedis.setex.mock.calls[0];
            const updatedOrder = JSON.parse(callArgs[2]);
            expect(updatedOrder.status).toBe('routing');
        });
        it('should remove from active orders when status is confirmed', async () => {
            const order = (0, order_service_1.createOrderFromRequest)({
                tokenIn: 'SOL',
                tokenOut: 'USDC',
                amount: 10,
                orderType: 'MARKET',
            });
            mockRedis.get.mockResolvedValue(JSON.stringify(order));
            await (0, order_service_1.updateOrderStatusInRedis)(order.orderId, 'confirmed');
            expect(mockRedis.srem).toHaveBeenCalledWith('orders:active', order.orderId);
        });
    });
});
//# sourceMappingURL=order.service.test.js.map
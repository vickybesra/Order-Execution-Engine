/**
 * Unit Tests for Order Service
 * 
 * Tests order persistence and retrieval logic.
 */

import {
  generateOrderId,
  createOrderFromRequest,
  storeOrderInRedis,
  getOrderFromRedis,
  updateOrderStatusInRedis,
} from '../order.service';
import { OrderRequest } from '../../types/order';
import { getRedisClient } from '../redis.service';

// Mock Redis
jest.mock('../redis.service', () => ({
  getRedisClient: jest.fn(),
}));

describe('Order Service', () => {
  let mockRedis: any;

  beforeEach(() => {
    mockRedis = {
      setex: jest.fn().mockResolvedValue('OK'),
      get: jest.fn(),
      sadd: jest.fn().mockResolvedValue(1),
      srem: jest.fn().mockResolvedValue(1),
    };
    (getRedisClient as jest.Mock).mockReturnValue(mockRedis);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateOrderId', () => {
    it('should generate unique order IDs', () => {
      const id1 = generateOrderId();
      const id2 = generateOrderId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^order_\d+_[a-f0-9]+$/);
    });
  });

  describe('createOrderFromRequest', () => {
    it('should create order with all required fields', () => {
      const request: OrderRequest = {
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amount: 10,
        orderType: 'MARKET',
      };

      const order = createOrderFromRequest(request);

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
      const order = createOrderFromRequest({
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amount: 10,
        orderType: 'MARKET',
      });

      await storeOrderInRedis(order);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        `order:${order.orderId}`,
        86400,
        expect.stringContaining(order.orderId)
      );
      expect(mockRedis.sadd).toHaveBeenCalledWith('orders:active', order.orderId);
    });
  });

  describe('getOrderFromRedis', () => {
    it('should retrieve order from Redis', async () => {
      const order = createOrderFromRequest({
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amount: 10,
        orderType: 'MARKET',
      });

      mockRedis.get.mockResolvedValue(JSON.stringify(order));

      const retrieved = await getOrderFromRedis(order.orderId);

      expect(retrieved).toEqual(order);
      expect(mockRedis.get).toHaveBeenCalledWith(`order:${order.orderId}`);
    });

    it('should return null if order not found', async () => {
      mockRedis.get.mockResolvedValue(null);

      const retrieved = await getOrderFromRedis('nonexistent');

      expect(retrieved).toBeNull();
    });
  });

  describe('updateOrderStatusInRedis', () => {
    it('should update order status in Redis', async () => {
      const order = createOrderFromRequest({
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amount: 10,
        orderType: 'MARKET',
      });

      mockRedis.get.mockResolvedValue(JSON.stringify(order));

      await updateOrderStatusInRedis(order.orderId, 'routing');

      expect(mockRedis.setex).toHaveBeenCalled();
      const callArgs = mockRedis.setex.mock.calls[0];
      const updatedOrder = JSON.parse(callArgs[2]);
      expect(updatedOrder.status).toBe('routing');
    });

    it('should remove from active orders when status is confirmed', async () => {
      const order = createOrderFromRequest({
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amount: 10,
        orderType: 'MARKET',
      });

      mockRedis.get.mockResolvedValue(JSON.stringify(order));

      await updateOrderStatusInRedis(order.orderId, 'confirmed');

      expect(mockRedis.srem).toHaveBeenCalledWith('orders:active', order.orderId);
    });
  });
});


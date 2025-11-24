"use strict";
/**
 * Order Service
 *
 * Handles order persistence in Redis (for active orders) and PostgreSQL (for history).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOrderId = generateOrderId;
exports.storeOrderInRedis = storeOrderInRedis;
exports.updateOrderStatusInRedis = updateOrderStatusInRedis;
exports.getOrderFromRedis = getOrderFromRedis;
exports.storeOrderInPostgres = storeOrderInPostgres;
exports.createOrderFromRequest = createOrderFromRequest;
const redis_service_1 = require("./redis.service");
const postgres_service_1 = require("./postgres.service");
const uuid_1 = require("uuid");
/**
 * Generate a unique order ID
 */
function generateOrderId() {
    return `order_${Date.now()}_${(0, uuid_1.v4)().split('-')[0]}`;
}
/**
 * Store order in Redis (for active status tracking)
 */
async function storeOrderInRedis(order) {
    const redis = (0, redis_service_1.getRedisClient)();
    const key = `order:${order.orderId}`;
    // Store as JSON with TTL of 24 hours
    await redis.setex(key, 86400, JSON.stringify(order));
    // Also add to set of active orders
    await redis.sadd('orders:active', order.orderId);
    console.log(`[OrderService] Stored order ${order.orderId} in Redis`);
}
/**
 * Update order status in Redis
 */
async function updateOrderStatusInRedis(orderId, status, updates) {
    const redis = (0, redis_service_1.getRedisClient)();
    const key = `order:${orderId}`;
    const existingOrderJson = await redis.get(key);
    if (!existingOrderJson) {
        console.warn(`[OrderService] Order ${orderId} not found in Redis`);
        return;
    }
    const order = JSON.parse(existingOrderJson);
    order.status = status;
    // Apply updates
    if (updates) {
        Object.assign(order, updates);
    }
    // Update timestamps based on status
    const now = Date.now();
    if (status === 'confirmed' && !order.executedAt) {
        order.executedAt = now;
    }
    else if (status === 'failed' && !order.failedAt) {
        order.failedAt = now;
    }
    await redis.setex(key, 86400, JSON.stringify(order));
    // Remove from active orders if completed or failed
    if (status === 'confirmed' || status === 'failed' || status === 'cancelled') {
        await redis.srem('orders:active', orderId);
    }
    console.log(`[OrderService] Updated order ${orderId} status to ${status} in Redis`);
}
/**
 * Get order from Redis
 */
async function getOrderFromRedis(orderId) {
    const redis = (0, redis_service_1.getRedisClient)();
    const key = `order:${orderId}`;
    const orderJson = await redis.get(key);
    if (!orderJson) {
        return null;
    }
    return JSON.parse(orderJson);
}
/**
 * Store order in PostgreSQL (for history)
 */
async function storeOrderInPostgres(order) {
    const pool = (0, postgres_service_1.getPostgresPool)();
    try {
        await pool.query(`
      INSERT INTO orders (
        order_id, token_in, token_out, amount, order_type, status,
        submitted_at, executed_at, failed_at, failure_reason,
        exchange_id, execution_price, execution_amount,
        routing_decision, tx_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (order_id) DO UPDATE SET
        status = EXCLUDED.status,
        executed_at = EXCLUDED.executed_at,
        failed_at = EXCLUDED.failed_at,
        failure_reason = EXCLUDED.failure_reason,
        exchange_id = EXCLUDED.exchange_id,
        execution_price = EXCLUDED.execution_price,
        execution_amount = EXCLUDED.execution_amount,
        routing_decision = EXCLUDED.routing_decision,
        tx_hash = EXCLUDED.tx_hash
    `, [
            order.orderId,
            order.tokenIn,
            order.tokenOut,
            order.amount,
            order.orderType,
            order.status,
            new Date(order.submittedAt),
            order.executedAt ? new Date(order.executedAt) : null,
            order.failedAt ? new Date(order.failedAt) : null,
            order.failureReason || null,
            order.exchangeId || null,
            order.executionPrice || null,
            order.executionAmount || null,
            order.routingDecision ? JSON.stringify(order.routingDecision) : null,
            order.txHash || null,
        ]);
        console.log(`[OrderService] Stored order ${order.orderId} in PostgreSQL`);
    }
    catch (error) {
        console.error(`[OrderService] Failed to store order ${order.orderId} in PostgreSQL:`, error);
        throw error;
    }
}
/**
 * Create initial order from request
 */
function createOrderFromRequest(request) {
    const orderId = generateOrderId();
    const now = Date.now();
    return {
        ...request,
        orderId,
        status: 'pending',
        submittedAt: now,
    };
}
//# sourceMappingURL=order.service.js.map
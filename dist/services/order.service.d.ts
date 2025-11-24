/**
 * Order Service
 *
 * Handles order persistence in Redis (for active orders) and PostgreSQL (for history).
 */
import { ActiveOrder, OrderRequest, OrderStatus } from '../types/order';
/**
 * Generate a unique order ID
 */
export declare function generateOrderId(): string;
/**
 * Store order in Redis (for active status tracking)
 */
export declare function storeOrderInRedis(order: ActiveOrder): Promise<void>;
/**
 * Update order status in Redis
 */
export declare function updateOrderStatusInRedis(orderId: string, status: OrderStatus, updates?: Partial<ActiveOrder>): Promise<void>;
/**
 * Get order from Redis
 */
export declare function getOrderFromRedis(orderId: string): Promise<ActiveOrder | null>;
/**
 * Store order in PostgreSQL (for history)
 */
export declare function storeOrderInPostgres(order: ActiveOrder): Promise<void>;
/**
 * Create initial order from request
 */
export declare function createOrderFromRequest(request: OrderRequest): ActiveOrder;
//# sourceMappingURL=order.service.d.ts.map
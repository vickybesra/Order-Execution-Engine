/**
 * Order Type Definitions
 *
 * Defines the structure of trade orders for the execution engine.
 */
/**
 * Supported order types
 */
export type OrderType = 'MARKET' | 'LIMIT' | 'SNIPER';
/**
 * Order status throughout the execution lifecycle
 */
export type OrderStatus = 'pending' | 'routing' | 'building' | 'submitted' | 'executing' | 'confirmed' | 'failed' | 'cancelled';
/**
 * Status update message sent via WebSocket
 */
export interface StatusUpdate {
    orderId: string;
    status: OrderStatus;
    timestamp: number;
    message?: string;
    data?: {
        routingDecision?: RoutingDecision;
        txHash?: string;
        failureReason?: string;
        executionPrice?: number;
        executionAmount?: number;
    };
}
/**
 * OrderRequest - Input payload for POST /api/orders/execute
 */
export interface OrderRequest {
    tokenIn: string;
    tokenOut: string;
    amount: number;
    orderType: OrderType;
}
/**
 * ActiveOrder - Stored data for orders in the system
 * Extends OrderRequest with execution metadata
 */
export interface ActiveOrder extends OrderRequest {
    orderId: string;
    status: OrderStatus;
    submittedAt: number;
    executedAt?: number;
    failedAt?: number;
    failureReason?: string;
    exchangeId?: string;
    executionPrice?: number;
    executionAmount?: number;
}
/**
 * DEX (Decentralized Exchange) identifier
 */
export type DexName = 'RAYDIUM' | 'METEORA';
/**
 * Quote from a DEX
 */
export interface DexQuote {
    dex: DexName;
    price: number;
    fee: number;
    netPrice: number;
    amountOut: number;
    liquidity?: number;
}
/**
 * Routing decision data
 */
export interface RoutingDecision {
    selectedDex: DexName;
    raydiumQuote: DexQuote;
    meteoraQuote: DexQuote;
    selectionReason: string;
    routingTimestamp: number;
}
/**
 * Swap execution result
 */
export interface SwapExecutionResult {
    success: boolean;
    txHash: string;
    executedPrice: number;
    executedAmount: number;
    dex: DexName;
    executionTimestamp: number;
}
/**
 * ActiveOrder - Stored data for orders in the system
 * Extends OrderRequest with execution metadata
 */
export interface ActiveOrder extends OrderRequest {
    orderId: string;
    status: OrderStatus;
    submittedAt: number;
    executedAt?: number;
    failedAt?: number;
    failureReason?: string;
    exchangeId?: string;
    executionPrice?: number;
    executionAmount?: number;
    routingDecision?: RoutingDecision;
    txHash?: string;
}
/**
 * Order Execution Result
 */
export interface OrderExecutionResult {
    orderId: string;
    status: OrderStatus;
    submittedAt: number;
    executedAt?: number;
    failureReason?: string;
    txHash?: string;
    routingDecision?: RoutingDecision;
}
//# sourceMappingURL=order.d.ts.map
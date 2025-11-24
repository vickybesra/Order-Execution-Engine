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
export type OrderStatus = 
  | 'pending'      // Order received, awaiting processing
  | 'routing'      // Order is being routed to exchange (fetching quotes)
  | 'building'     // Transaction is being built
  | 'submitted'    // Transaction submitted to blockchain
  | 'executing'    // Order is being executed on exchange
  | 'confirmed'    // Order successfully executed
  | 'failed'       // Order execution failed
  | 'cancelled';   // Order was cancelled

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
  tokenIn: string;      // The token the user is selling (e.g., 'SOL')
  tokenOut: string;     // The token the user wants to buy (e.g., 'USDC')
  amount: number;       // The quantity of tokenIn to sell
  orderType: OrderType; // The type of order (e.g., 'MARKET')
}

/**
 * ActiveOrder - Stored data for orders in the system
 * Extends OrderRequest with execution metadata
 */
export interface ActiveOrder extends OrderRequest {
  orderId: string;           // Unique identifier for the order
  status: OrderStatus;       // Current state of the order
  submittedAt: number;       // Timestamp of initial submission (Unix timestamp in milliseconds)
  executedAt?: number;       // Timestamp when order was executed (if successful)
  failedAt?: number;         // Timestamp when order failed (if failed)
  failureReason?: string;    // Reason for failure (if failed)
  exchangeId?: string;       // ID assigned by the exchange (if routed)
  executionPrice?: number;    // Price at which order was executed (if successful)
  executionAmount?: number;   // Actual amount executed (if different from requested)
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
  price: number;           // Price per unit of tokenOut in tokenIn
  fee: number;             // Fee amount in tokenIn
  netPrice: number;        // Final price after fees (price - fee)
  amountOut: number;       // Amount of tokenOut received
  liquidity?: number;      // Available liquidity (optional)
}

/**
 * Routing decision data
 */
export interface RoutingDecision {
  selectedDex: DexName;
  raydiumQuote: DexQuote;
  meteoraQuote: DexQuote;
  selectionReason: string; // Why this DEX was selected
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
  orderId: string;           // Unique identifier for the order
  status: OrderStatus;       // Current state of the order
  submittedAt: number;       // Timestamp of initial submission (Unix timestamp in milliseconds)
  executedAt?: number;       // Timestamp when order was executed (if successful)
  failedAt?: number;         // Timestamp when order failed (if failed)
  failureReason?: string;    // Reason for failure (if failed)
  exchangeId?: string;       // ID assigned by the exchange (if routed)
  executionPrice?: number;   // Price at which order was executed (if successful)
  executionAmount?: number;  // Actual amount executed (if different from requested)
  routingDecision?: RoutingDecision; // DEX routing decision and quotes
  txHash?: string;          // Transaction hash from swap execution
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


export type OrderType = 'MARKET' | 'LIMIT' | 'SNIPER';

export type OrderStatus = 
  | 'pending'
  | 'routing'
  | 'building'
  | 'submitted'
  | 'executing'
  | 'confirmed'
  | 'failed'
  | 'cancelled';

export interface OrderRequest {
  tokenIn: string;
  tokenOut: string;
  amount: number;
  orderType: OrderType;
}

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

export type DexName = 'RAYDIUM' | 'METEORA';

export interface DexQuote {
  dex: DexName;
  price: number;
  fee: number;
  netPrice: number;
  amountOut: number;
  liquidity?: number;
}

export interface RoutingDecision {
  selectedDex: DexName;
  raydiumQuote: DexQuote;
  meteoraQuote: DexQuote;
  selectionReason: string;
  routingTimestamp: number;
}

export interface Order {
  orderId: string;
  tokenIn: string;
  tokenOut: string;
  amount: number;
  orderType: OrderType;
  status: OrderStatus;
  submittedAt: number;
  executedAt?: number;
  failedAt?: number;
  failureReason?: string;
  executionPrice?: number;
  executionAmount?: number;
  routingDecision?: RoutingDecision;
  txHash?: string;
}


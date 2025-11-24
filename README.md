# Order Execution Engine

A high-availability and scalable order execution engine with routing and queuing capabilities.

## Phase 1: Setup and Core Architecture

### Chosen Order Type: Market Order

**Justification:**
Market orders are selected as the initial implementation because they provide the most straightforward demonstration of the core routing and queuing flow. Market orders execute immediately at the current market price, which simplifies the execution logic and allows us to focus on building a robust infrastructure for order processing, queuing, and routing.

**Extensibility:**
The same engine structure can be extended to support Limit and Sniper orders by:
- **Limit Orders**: Adding price validation logic in the execution worker to check if the current market price meets the limit price before execution.
- **Sniper Orders**: Implementing time-based execution logic that monitors market conditions and executes when specific price/time conditions are met, leveraging the existing queue system for scheduled execution.

## Project Structure

```
.
├── src/
│   ├── types/
│   │   └── order.ts                    # Order type definitions
│   ├── config/
│   │   └── index.ts                    # Configuration management
│   ├── database/
│   │   ├── schema.sql                  # Database schema
│   │   └── init.ts                     # Database initialization
│   ├── routes/
│   │   └── orders.routes.ts           # HTTP and WebSocket routes
│   ├── services/
│   │   ├── redis.service.ts            # Redis connection service
│   │   ├── postgres.service.ts         # PostgreSQL connection service
│   │   ├── mock-dex-router.service.ts  # Mock DEX router with quote & swap logic
│   │   ├── websocket.service.ts        # WebSocket connection management
│   │   ├── order.service.ts            # Order persistence logic
│   │   ├── queue.service.ts            # BullMQ queue setup
│   │   └── worker.service.ts           # BullMQ worker for order processing
│   ├── services/__tests__/
│   │   └── mock-dex-router.service.test.ts # Unit tests for routing logic
│   └── index.ts                        # Main entry point
├── package.json
├── tsconfig.json
├── jest.config.js                      # Jest test configuration
├── jest.setup.js                       # Jest setup file
└── README.md
```

## Technology Stack

- **Runtime**: Node.js with TypeScript
- **HTTP/WebSocket Server**: Fastify
- **Queue System**: BullMQ
- **Cache/Broker**: Redis (ioredis)
- **Database**: PostgreSQL (pg)
- **Validation**: Zod

### Design Decisions

**Why Fastify?**
- High performance HTTP server with built-in WebSocket support
- Excellent TypeScript support
- Plugin ecosystem for extensibility
- Lower overhead compared to Express

**Why BullMQ?**
- Built on Redis for reliability and scalability
- Supports job prioritization and rate limiting
- Built-in retry mechanisms with exponential back-off
- Excellent for handling concurrent job processing

**Why Redis + PostgreSQL?**
- **Redis**: Fast in-memory storage for active orders and queue broker
- **PostgreSQL**: Reliable persistent storage for order history and audit trail
- Separation of concerns: hot data in Redis, cold data in PostgreSQL

**Why Market Orders First?**
- Simplest order type to implement and test
- Demonstrates core routing and queuing flow without complexity
- Foundation for extending to Limit and Sniper orders
- Allows focus on infrastructure rather than order logic complexity

## Setup

### Prerequisites

- Node.js 18+ 
- Redis server
- PostgreSQL database

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
HOST=0.0.0.0

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
BULLMQ_REDIS_DB=1

# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=order_engine
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_MAX_POOL=20
```

### Build

```bash
npm run build
```

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

See [TESTING.md](./TESTING.md) for detailed testing instructions.

**Test Coverage:**
- ✅ 30+ unit and integration tests
- ✅ DEX routing logic tests (16 tests)
- ✅ Queue and retry logic tests
- ✅ WebSocket lifecycle tests
- ✅ Order persistence tests

## API Endpoints

### POST /api/orders/execute

Submit a new order for execution.

**Request Body:**
```json
{
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amount": 10,
  "orderType": "MARKET"
}
```

**Response (202 Accepted):**
```json
{
  "orderId": "order_1234567890_abc123",
  "status": "pending",
  "message": "Order submitted successfully. Connect via WebSocket for status updates."
}
```

### WebSocket /api/orders/:orderId/status

Connect via WebSocket to receive real-time status updates for an order.

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:3000/api/orders/order_1234567890_abc123/status');
```

**Status Update Messages:**
```json
{
  "orderId": "order_1234567890_abc123",
  "status": "routing",
  "timestamp": 1234567890123,
  "message": "Fetching quotes from DEXs...",
  "data": {
    "routingDecision": { ... }
  }
}
```

**Status Flow:**
1. `pending` - Order received, awaiting processing
2. `routing` - Fetching quotes from DEXs
3. `building` - Building transaction
4. `submitted` - Transaction submitted to blockchain
5. `confirmed` - Order executed successfully (or `failed` if execution failed)

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1234567890123
}
```

## Phase 3: Order Management and Real-Time Status

### Architecture

**Order Submission Flow:**
1. Client sends POST request to `/api/orders/execute`
2. Server validates request, generates orderId
3. Order stored in Redis (active) and PostgreSQL (history)
4. Order added to BullMQ queue
5. Server returns orderId immediately (202 Accepted)

**Order Processing Flow:**
1. BullMQ worker picks up order from queue
2. Worker emits status updates via WebSocket service
3. Status progression: pending → routing → building → submitted → confirmed/failed
4. Each status update:
   - Emitted to WebSocket clients
   - Updated in Redis
   - Final state persisted to PostgreSQL

**WebSocket Connection Management:**
- Connections mapped by orderId
- Multiple clients can connect to same order
- Automatic cleanup on disconnect
- Ping/pong support for connection health

### Key Features

- **Real-time Updates**: WebSocket-based status streaming
- **Scalability**: BullMQ queue for async processing
- **Persistence**: Redis for active orders, PostgreSQL for history
- **Reliability**: Job retries, error handling, graceful shutdown
- **Validation**: Zod schema validation for order requests

## Order Types

### OrderRequest Interface

The input payload for `POST /api/orders/execute`:

```typescript
interface OrderRequest {
  tokenIn: string;      // The token being sold (e.g., 'SOL')
  tokenOut: string;     // The token to buy (e.g., 'USDC')
  amount: number;       // Quantity of tokenIn to sell
  orderType: OrderType; // Order type ('MARKET', 'LIMIT', or 'SNIPER')
}
```

### ActiveOrder Interface

The stored data structure for orders in the system:

```typescript
interface ActiveOrder extends OrderRequest {
  orderId: string;           // Unique identifier
  status: OrderStatus;       // Current state
  submittedAt: number;       // Submission timestamp
  executedAt?: number;       // Execution timestamp (if successful)
  failedAt?: number;         // Failure timestamp (if failed)
  failureReason?: string;    // Failure reason (if failed)
  exchangeId?: string;       // Exchange-assigned ID (if routed)
  executionPrice?: number;   // Execution price (if successful)
  executionAmount?: number;  // Actual executed amount
  routingDecision?: RoutingDecision; // DEX routing decision and quotes
  txHash?: string;          // Transaction hash from swap execution
}
```

### DexQuote Interface

Quote structure from a DEX:

```typescript
interface DexQuote {
  dex: DexName;             // DEX identifier ('RAYDIUM' | 'METEORA')
  price: number;            // Price per unit of tokenOut in tokenIn
  fee: number;              // Fee amount in tokenIn
  netPrice: number;         // Effective exchange rate (amountOut / amountIn)
  amountOut: number;        // Amount of tokenOut received
  liquidity?: number;       // Available liquidity (optional)
}
```

### RoutingDecision Interface

Routing decision data stored with orders:

```typescript
interface RoutingDecision {
  selectedDex: DexName;     // Selected DEX
  raydiumQuote: DexQuote;    // Quote from Raydium
  meteoraQuote: DexQuote;    // Quote from Meteora
  selectionReason: string;   // Why this DEX was selected
  routingTimestamp: number;  // When routing decision was made
}
```

## Architecture

### Connection Management

- **Redis**: Used as the broker for BullMQ queues and for managing active orders in memory
- **PostgreSQL**: Used for persisting final order history and failure reasons with connection pooling

### Connection Pooling

- Redis connections are managed through ioredis with automatic reconnection
- PostgreSQL uses pg.Pool for connection pooling with configurable pool size and timeouts

## Phase 2: Mock DEX Router and Best Execution Logic

### MockDexRouter Implementation

The `MockDexRouter` class simulates interactions with decentralized exchanges:

**Features:**
- **Quote Fetching**: Simulates fetching quotes from Raydium and Meteora DEXs
- **Network Delay**: Adds realistic ~200ms delay to each quote request
- **Price Variation**: Returns mock prices with 2-5% variation between DEXs
- **Fee Simulation**: Includes realistic fee structures (Raydium: 0.25-0.3%, Meteora: 0.3-0.5%)
- **Best Execution Logic**: Automatically selects the DEX offering the better net price
- **Swap Execution**: Simulates swap execution with 2-3 second delay and returns mock transaction hash

**Key Methods:**
- `getRaydiumQuote(tokenIn, tokenOut, amount)` - Fetches quote from Raydium
- `getMeteoraQuote(tokenIn, tokenOut, amount)` - Fetches quote from Meteora
- `getBestQuote(tokenIn, tokenOut, amount)` - Fetches quotes concurrently and selects best
- `executeSwap(dex, order)` - Simulates swap execution on selected DEX

**Routing Logic:**
1. Fetches quotes from both DEXs concurrently
2. Compares net prices (effective exchange rate after fees)
3. Selects DEX with higher net price (more tokenOut per tokenIn)
4. If prices are equal, selects based on liquidity
5. Logs routing decision with reason

### Testing

Comprehensive unit tests verify:
- ✅ Quote fetching from both DEXs
- ✅ Concurrent quote fetching performance
- ✅ Correct selection of better-priced quote
- ✅ Liquidity-based selection when prices are equal
- ✅ Swap execution with transaction hash generation
- ✅ Unique transaction hash generation
- ✅ Edge cases and price comparison logic

**Test Results:** 16/16 tests passing ✅

## Development Status

✅ Phase 1 Complete:
- [x] Project setup with TypeScript
- [x] Dependency installation and configuration
- [x] Redis connection service with health checks
- [x] PostgreSQL connection pool with health checks
- [x] Order type definitions (OrderRequest, ActiveOrder)
- [x] Configuration management
- [x] Order type documentation

✅ Phase 2 Complete:
- [x] MockDexRouter class implementation
- [x] Quote fetching simulation (Raydium & Meteora)
- [x] Network delay simulation (~200ms)
- [x] Price variation simulation (2-5% difference)
- [x] Best execution logic with concurrent quote fetching
- [x] Price comparison and DEX selection
- [x] Routing decision logging
- [x] Swap execution simulation (2-3s delay)
- [x] Mock transaction hash generation
- [x] Updated order types with routing decision data
- [x] Comprehensive unit tests (16 tests, all passing)

✅ Phase 3 Complete:
- [x] HTTP endpoint POST /api/orders/execute with validation
- [x] WebSocket endpoint /api/orders/:orderId/status for real-time updates
- [x] Order submission flow with orderId generation
- [x] Order persistence in Redis (active orders) and PostgreSQL (history)
- [x] BullMQ queue setup for order processing
- [x] BullMQ worker with status update integration
- [x] WebSocket service for connection management and status emission
- [x] Real-time status updates: pending -> routing -> building -> submitted -> confirmed/failed
- [x] Database schema initialization
- [x] Graceful shutdown handling

✅ Phase 4 Complete:
- [x] BullMQ worker configured for 10 concurrent jobs
- [x] Processing rate configured for 100 orders/minute
- [x] Exponential back-off retry logic (max 3 attempts)
- [x] Comprehensive error handling with try-catch blocks
- [x] Transient error detection and retry mechanism
- [x] Final failure handling with WebSocket status emission
- [x] Complete failure reason persistence to PostgreSQL
- [x] Final success persistence with execution details to Redis and PostgreSQL
- [x] Error handling at all critical steps (quote fetching, swap execution, persistence)

✅ Phase 4 Complete:
- [x] BullMQ worker configured for 10 concurrent jobs
- [x] Processing rate configured for 100 orders/minute
- [x] Exponential back-off retry logic (max 3 attempts)
- [x] Comprehensive error handling with try-catch blocks
- [x] Transient error detection and retry mechanism
- [x] Final failure handling with WebSocket status emission
- [x] Complete failure reason persistence to PostgreSQL
- [x] Final success persistence with execution details to Redis and PostgreSQL
- [x] Error handling at all critical steps (quote fetching, swap execution, persistence)


# Testing Guide

## Running Tests

### Unit Tests

```bash
npm test
```

### Test Coverage

```bash
npm run test:coverage
```

## Test Coverage

The test suite includes:

1. **MockDexRouter Tests** (16 tests)
   - Quote fetching from Raydium and Meteora
   - Best quote selection logic
   - Price comparison
   - Swap execution
   - Transaction hash generation

2. **Order Service Tests** (5 tests)
   - Order ID generation
   - Order creation from request
   - Redis storage and retrieval
   - Status updates

3. **Queue Service Tests** (3 tests)
   - Queue configuration
   - Retry attempts configuration
   - Exponential back-off configuration

4. **Worker Service Tests** (2 tests)
   - Retry logic on transient errors
   - Final failure handling
   - Status update emission

5. **Route Tests** (4 tests)
   - Order request validation
   - Queue integration
   - WebSocket service integration

**Total: 30+ tests covering all critical paths**

## Manual Testing

### 1. Submit an Order

```bash
curl -X POST http://localhost:3000/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn": "SOL",
    "tokenOut": "USDC",
    "amount": 10,
    "orderType": "MARKET"
  }'
```

Expected response:
```json
{
  "orderId": "order_1234567890_abc123",
  "status": "pending",
  "message": "Order submitted successfully. Connect via WebSocket for status updates."
}
```

### 2. Connect via WebSocket

Using `wscat` or similar WebSocket client:

```bash
wscat -c ws://localhost:3000/api/orders/{orderId}/status
```

Replace `{orderId}` with the orderId from step 1.

Expected status updates:
1. `connected` - Connection established
2. `pending` - Order received
3. `routing` - Fetching quotes
4. `building` - Building transaction
5. `submitted` - Transaction submitted
6. `confirmed` - Order executed successfully

### 3. Test Error Handling

Submit an invalid order:

```bash
curl -X POST http://localhost:3000/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn": "",
    "tokenOut": "USDC",
    "amount": -10,
    "orderType": "INVALID"
  }'
```

Expected: 400 Bad Request with validation errors

## Postman Collection

Import `postman_collection.json` into Postman or Insomnia:

1. **Health Check** - Verify server is running
2. **Submit Order** - Create a new order (saves orderId to environment)
3. **Submit Order - Invalid** - Test validation
4. **WebSocket Status Stream** - Connect to receive status updates

## Integration Testing

### Test Complete Flow

1. Start the server: `npm start`
2. Submit an order via POST endpoint
3. Connect WebSocket using the returned orderId
4. Verify all status updates are received in order
5. Check Redis for active order
6. Check PostgreSQL for order history

### Test Concurrent Processing

Submit multiple orders simultaneously:

```bash
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/orders/execute \
    -H "Content-Type: application/json" \
    -d "{\"tokenIn\":\"SOL\",\"tokenOut\":\"USDC\",\"amount\":$i,\"orderType\":\"MARKET\"}" &
done
wait
```

Verify all orders are processed (up to 10 concurrently).

### Test Retry Logic

To test retry logic, you would need to simulate network failures in the MockDexRouter. The worker will automatically retry up to 3 times with exponential back-off.


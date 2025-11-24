# Final Testing Steps

## Quick Start Testing

### 1. Prerequisites Check

```bash
# Verify Node.js version
node --version  # Should be 18+

# Verify Redis is running
redis-cli ping  # Should return PONG

# Verify PostgreSQL is running
psql -U postgres -c "SELECT version();"
```

### 2. Install and Build

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

Expected: **24+ tests passing**

### 3. Start the Server

```bash
# Set environment variables (or use .env file)
export PORT=3000
export REDIS_HOST=localhost
export POSTGRES_HOST=localhost

# Start the server
npm start
```

Expected output:
```
[Server] Server listening on 0.0.0.0:3000
[Worker] Order worker started
[Worker] Configuration:
  - Concurrent jobs: 10
  - Processing rate: 100 orders/minute
  - Max retry attempts: 3
  - Retry strategy: Exponential back-off
```

## API Testing

### Test 1: Health Check

```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": 1234567890123
}
```

**Status Code:** `200 OK`

### Test 2: Submit Valid Order

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

**Expected Response:**
```json
{
  "orderId": "order_1234567890_abc123",
  "status": "pending",
  "message": "Order submitted successfully. Connect via WebSocket for status updates."
}
```

**Status Code:** `202 Accepted`

**Save the `orderId` for next test!**

### Test 3: Submit Invalid Order (Validation Test)

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

**Expected Response:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "path": ["tokenIn"],
      "message": "String must contain at least 1 character(s)"
    },
    {
      "path": ["amount"],
      "message": "Number must be greater than 0"
    },
    {
      "path": ["orderType"],
      "message": "Invalid enum value. Expected 'MARKET' | 'LIMIT' | 'SNIPER'"
    }
  ]
}
```

**Status Code:** `400 Bad Request`

### Test 4: WebSocket Status Updates

**Option A: Using wscat (install: `npm install -g wscat`)**

```bash
wscat -c ws://localhost:3000/api/orders/{orderId}/status
```

Replace `{orderId}` with the orderId from Test 2.

**Expected Status Flow:**
1. `{"type":"connected","orderId":"...","timestamp":...}`
2. `{"orderId":"...","status":"pending","timestamp":...}`
3. `{"orderId":"...","status":"routing","message":"Fetching quotes from DEXs...","timestamp":...}`
4. `{"orderId":"...","status":"building","message":"Building transaction...","timestamp":...}`
5. `{"orderId":"...","status":"submitted","message":"Transaction submitted to blockchain","data":{"txHash":"..."},"timestamp":...}`
6. `{"orderId":"...","status":"confirmed","message":"Order executed successfully","data":{"txHash":"...","executionPrice":...},"timestamp":...}`

**Option B: Using Browser Console**

```javascript
const ws = new WebSocket('ws://localhost:3000/api/orders/{orderId}/status');
ws.onmessage = (event) => {
  console.log('Status update:', JSON.parse(event.data));
};
```

### Test 5: Concurrent Order Processing

```bash
# Submit 10 orders simultaneously
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/orders/execute \
    -H "Content-Type: application/json" \
    -d "{\"tokenIn\":\"SOL\",\"tokenOut\":\"USDC\",\"amount\":$i,\"orderType\":\"MARKET\"}" &
done
wait

echo "All orders submitted"
```

**Expected:** All 10 orders should be accepted (202) and processed concurrently (up to 10 at a time).

### Test 6: Verify Order Persistence

**Check Redis:**
```bash
redis-cli
> GET order:{orderId}
> SMEMBERS orders:active
```

**Check PostgreSQL:**
```sql
psql -U postgres -d order_engine

SELECT order_id, status, token_in, token_out, amount, submitted_at, executed_at, tx_hash
FROM orders
ORDER BY submitted_at DESC
LIMIT 10;
```

## Postman Collection Testing

1. **Import Collection:**
   - Open Postman or Insomnia
   - Import `postman_collection.json`
   - Set environment variable `base_url` to `http://localhost:3000`

2. **Run Collection:**
   - Execute "Health Check" - Should return 200 OK
   - Execute "Submit Order" - Should return 202 with orderId
   - Note: orderId is automatically saved to environment
   - Execute "WebSocket Status Stream" - Connect and observe status updates

## Integration Test Scenarios

### Scenario 1: Complete Order Lifecycle

1. Submit order via POST
2. Connect WebSocket immediately
3. Observe all status updates in sequence
4. Verify order appears in PostgreSQL
5. Verify order removed from Redis active set

### Scenario 2: Multiple Clients, Same Order

1. Submit one order
2. Connect multiple WebSocket clients with same orderId
3. Verify all clients receive status updates
4. Verify order processed only once

### Scenario 3: Error Handling

1. Submit invalid order (should fail validation)
2. Submit valid order
3. Simulate network failure (if possible)
4. Verify retry logic (check logs)
5. Verify final failure persisted

## Performance Testing

### Load Test

```bash
# Install Apache Bench
# macOS: brew install httpd
# Linux: apt-get install apache2-utils

# Test 100 requests, 10 concurrent
# Note: Use 127.0.0.1 instead of localhost on macOS for ApacheBench
ab -n 100 -c 10 -p order.json -T application/json \
  http://127.0.0.1:3000/api/orders/execute
```

Create `order.json`:
```json
{
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amount": 10,
  "orderType": "MARKET"
}
```

## Verification Checklist

- [ ] Health endpoint returns 200 OK
- [ ] Valid order submission returns 202 with orderId
- [ ] Invalid order submission returns 400 with validation errors
- [ ] WebSocket connection establishes successfully
- [ ] All status updates received in correct order
- [ ] Order persisted to Redis (active)
- [ ] Order persisted to PostgreSQL (history)
- [ ] Concurrent orders processed (up to 10)
- [ ] Queue processes orders correctly
- [ ] Worker logs show processing
- [ ] No errors in server logs

## Troubleshooting

### Issue: Cannot connect to Redis

**Solution:**
```bash
# Check Redis is running
redis-cli ping

# Check connection settings
echo $REDIS_HOST
echo $REDIS_PORT
```

### Issue: Cannot connect to PostgreSQL

**Solution:**
```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT 1;"

# Verify database exists
psql -U postgres -c "CREATE DATABASE order_engine;"
```

### Issue: WebSocket connection fails

**Solution:**
- Verify server is running
- Check orderId is correct
- Use `ws://` for localhost, `wss://` for HTTPS
- Check browser console for errors

### Issue: Orders not processing

**Solution:**
- Check worker logs for errors
- Verify Redis connection for BullMQ
- Check queue is not full
- Verify worker is running

## Success Criteria

✅ All tests pass (24+ tests)
✅ Health endpoint responds
✅ Order submission works
✅ WebSocket status updates received
✅ Orders persisted to database
✅ Concurrent processing works
✅ Error handling works
✅ No critical errors in logs

## Next Steps

1. Deploy to production (see DEPLOYMENT.md)
2. Set up monitoring
3. Configure alerts
4. Set up CI/CD pipeline
5. Add more comprehensive tests


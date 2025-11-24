"use strict";
/**
 * Order Routes
 *
 * HTTP and WebSocket endpoints for order execution.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerOrderRoutes = registerOrderRoutes;
const order_service_1 = require("../services/order.service");
const queue_service_1 = require("../services/queue.service");
const websocket_service_1 = require("../services/websocket.service");
const zod_1 = require("zod");
/**
 * Order request validation schema
 */
const orderRequestSchema = zod_1.z.object({
    tokenIn: zod_1.z.string().min(1, 'tokenIn is required'),
    tokenOut: zod_1.z.string().min(1, 'tokenOut is required'),
    amount: zod_1.z.number().positive('amount must be positive'),
    orderType: zod_1.z.enum(['MARKET', 'LIMIT', 'SNIPER'], {
        errorMap: () => ({ message: 'orderType must be MARKET, LIMIT, or SNIPER' }),
    }),
});
/**
 * Register order routes
 */
async function registerOrderRoutes(fastify) {
    /**
     * POST /api/orders/execute
     *
     * Submit a new order for execution.
     * Returns orderId immediately and supports WebSocket upgrade for status updates.
     */
    fastify.post('/api/orders/execute', async (request, reply) => {
        try {
            // Validate request body
            const validationResult = orderRequestSchema.safeParse(request.body);
            if (!validationResult.success) {
                return reply.status(400).send({
                    error: 'Validation failed',
                    details: validationResult.error.errors,
                });
            }
            const orderRequest = validationResult.data;
            // Create order
            const order = (0, order_service_1.createOrderFromRequest)(orderRequest);
            // Store order in Redis and PostgreSQL
            await (0, order_service_1.storeOrderInRedis)(order);
            await (0, order_service_1.storeOrderInPostgres)(order);
            // Add order to queue
            await queue_service_1.orderQueue.add('execute-order', { order }, {
                jobId: order.orderId,
            });
            console.log(`[OrdersRoute] Order ${order.orderId} submitted`);
            // Return orderId immediately
            return reply.status(202).send({
                orderId: order.orderId,
                status: 'pending',
                message: 'Order submitted successfully. Connect via WebSocket for status updates.',
            });
        }
        catch (error) {
            console.error('[OrdersRoute] Error submitting order:', error);
            return reply.status(500).send({
                error: 'Failed to submit order',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    /**
     * WebSocket /api/orders/:orderId/status
     *
     * Connect via WebSocket to receive real-time status updates for an order.
     */
    fastify.get('/api/orders/:orderId/status', { websocket: true }, (connection, req) => {
        const orderId = req.params.orderId;
        if (!orderId) {
            connection.socket.close(1008, 'Order ID is required');
            return;
        }
        // Register WebSocket connection
        websocket_service_1.webSocketService.registerConnection(connection.socket, orderId);
        // Send initial connection confirmation
        connection.socket.send(JSON.stringify({
            type: 'connected',
            orderId,
            timestamp: Date.now(),
            message: 'Connected to order status stream',
        }));
        console.log(`[OrdersRoute] WebSocket connection established for order ${orderId}`);
        // Handle incoming messages (optional - for ping/pong)
        connection.socket.on('message', (message) => {
            try {
                const data = JSON.parse(message.toString());
                if (data.type === 'ping') {
                    connection.socket.send(JSON.stringify({
                        type: 'pong',
                        timestamp: Date.now(),
                    }));
                }
            }
            catch (error) {
                // Ignore invalid messages
            }
        });
    });
}
//# sourceMappingURL=orders.routes.js.map
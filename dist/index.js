"use strict";
/**
 * Order Execution Engine - Main Entry Point
 *
 * Initializes the application, starts the Fastify server with WebSocket support,
 * and starts the BullMQ worker for order processing.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const websocket_1 = __importDefault(require("@fastify/websocket"));
const redis_service_1 = require("./services/redis.service");
const postgres_service_1 = require("./services/postgres.service");
const init_1 = require("./database/init");
const orders_routes_1 = require("./routes/orders.routes");
const worker_service_1 = require("./services/worker.service");
const queue_service_1 = require("./services/queue.service");
const websocket_service_1 = require("./services/websocket.service");
const config_1 = require("./config");
let fastify = null;
/**
 * Initialize all services
 */
async function initializeServices() {
    try {
        console.log('Initializing services...');
        // Initialize Redis connection
        await (0, redis_service_1.initializeRedis)();
        // Initialize PostgreSQL connection pool
        await (0, postgres_service_1.initializePostgres)();
        // Initialize database schema
        await (0, init_1.initializeDatabase)();
        console.log('All services initialized successfully');
    }
    catch (error) {
        console.error('Failed to initialize services:', error);
        throw error;
    }
}
/**
 * Start Fastify server
 */
async function startServer() {
    fastify = (0, fastify_1.default)({
        logger: true,
    });
    // Register WebSocket plugin
    await fastify.register(websocket_1.default);
    // Register routes
    await fastify.register(orders_routes_1.registerOrderRoutes);
    // Health check endpoint
    fastify.get('/health', async () => {
        return { status: 'ok', timestamp: Date.now() };
    });
    // Start server
    const port = config_1.config.server.port;
    const host = config_1.config.server.host;
    try {
        await fastify.listen({ port, host });
        console.log(`[Server] Server listening on ${host}:${port}`);
    }
    catch (error) {
        console.error('Failed to start server:', error);
        throw error;
    }
}
/**
 * Graceful shutdown handler
 */
async function shutdown() {
    console.log('Shutting down gracefully...');
    try {
        // Close WebSocket connections
        websocket_service_1.webSocketService.closeAllConnections();
        // Close worker
        if (worker_service_1.orderWorker) {
            await worker_service_1.orderWorker.close();
            console.log('[Worker] Worker closed');
        }
        // Close queue
        if (queue_service_1.orderQueue) {
            await queue_service_1.orderQueue.close();
            console.log('[Queue] Queue closed');
        }
        // Close Fastify server
        if (fastify) {
            await fastify.close();
            console.log('[Server] Server closed');
        }
        // Close database connections
        await Promise.all([
            (0, redis_service_1.closeRedis)(),
            (0, postgres_service_1.closePostgres)(),
        ]);
        console.log('Shutdown complete');
        process.exit(0);
    }
    catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
}
// Handle graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    shutdown();
});
// Initialize and start
async function start() {
    try {
        await initializeServices();
        await startServer();
        console.log('[Application] Order Execution Engine started successfully');
    }
    catch (error) {
        console.error('Failed to start application:', error);
        process.exit(1);
    }
}
start();
//# sourceMappingURL=index.js.map
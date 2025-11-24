/**
 * Order Execution Engine - Main Entry Point
 * 
 * Initializes the application, starts the Fastify server with WebSocket support,
 * and starts the BullMQ worker for order processing.
 */

import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { initializeRedis, closeRedis } from './services/redis.service';
import { initializePostgres, closePostgres } from './services/postgres.service';
import { initializeDatabase } from './database/init';
import { registerOrderRoutes } from './routes/orders.routes';
import { orderWorker } from './services/worker.service';
import { orderQueue } from './services/queue.service';
import { webSocketService } from './services/websocket.service';
import { config } from './config';

let fastify: ReturnType<typeof Fastify> | null = null;

/**
 * Initialize all services
 */
async function initializeServices(): Promise<void> {
  try {
    console.log('Initializing services...');
    
    // Initialize Redis connection
    await initializeRedis();
    
    // Initialize PostgreSQL connection pool
    await initializePostgres();
    
    // Initialize database schema
    await initializeDatabase();
    
    console.log('All services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize services:', error);
    throw error;
  }
}

/**
 * Start Fastify server
 */
async function startServer(): Promise<void> {
  fastify = Fastify({
    logger: true,
  });

  // Register WebSocket plugin
  await fastify.register(fastifyWebsocket);

  // Register routes
  await fastify.register(registerOrderRoutes);

  // Health check endpoint
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: Date.now() };
  });

  // Start server
  const port = config.server.port;
  const host = config.server.host;

  try {
    await fastify.listen({ port, host });
    console.log(`[Server] Server listening on ${host}:${port}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    throw error;
  }
}

/**
 * Graceful shutdown handler
 */
async function shutdown(): Promise<void> {
  console.log('Shutting down gracefully...');
  
  try {
    // Close WebSocket connections
    webSocketService.closeAllConnections();

    // Close worker
    if (orderWorker) {
      await orderWorker.close();
      console.log('[Worker] Worker closed');
    }

    // Close queue
    if (orderQueue) {
      await orderQueue.close();
      console.log('[Queue] Queue closed');
    }

    // Close Fastify server
    if (fastify) {
      await fastify.close();
      console.log('[Server] Server closed');
    }

    // Close database connections
    await Promise.all([
      closeRedis(),
      closePostgres(),
    ]);

    console.log('Shutdown complete');
    process.exit(0);
  } catch (error) {
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
async function start(): Promise<void> {
  try {
    await initializeServices();
    await startServer();
    console.log('[Application] Order Execution Engine started successfully');
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

start();


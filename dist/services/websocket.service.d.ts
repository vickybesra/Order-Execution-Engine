/**
 * WebSocket Service
 *
 * Manages WebSocket connections and emits real-time status updates to clients.
 * Maps orderId to WebSocket connections for targeted status updates.
 */
import { WebSocket } from '@fastify/websocket';
import { StatusUpdate } from '../types/order';
/**
 * WebSocket Status Emitter Service
 */
export declare class WebSocketService {
    private connections;
    private orderConnections;
    /**
     * Generate a unique connection ID
     */
    private generateConnectionId;
    /**
     * Register a new WebSocket connection for an order
     *
     * @param socket - WebSocket connection
     * @param orderId - Order ID to associate with this connection
     * @returns Connection ID
     */
    registerConnection(socket: WebSocket, orderId: string): string;
    /**
     * Unregister a WebSocket connection
     */
    private unregisterConnection;
    /**
     * Emit a status update to all connections associated with an orderId
     *
     * @param orderId - Order ID
     * @param statusUpdate - Status update message
     */
    emitStatusUpdate(orderId: string, statusUpdate: StatusUpdate): void;
    /**
     * Get the number of active connections for an order
     */
    getConnectionCount(orderId: string): number;
    /**
     * Get total number of active connections
     */
    getTotalConnections(): number;
    /**
     * Close all connections for an order
     */
    closeOrderConnections(orderId: string): void;
    /**
     * Close all connections
     */
    closeAllConnections(): void;
}
export declare const webSocketService: WebSocketService;
//# sourceMappingURL=websocket.service.d.ts.map
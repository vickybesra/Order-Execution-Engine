/**
 * WebSocket Service
 * 
 * Manages WebSocket connections and emits real-time status updates to clients.
 * Maps orderId to WebSocket connections for targeted status updates.
 */
import type { SocketStream } from '@fastify/websocket';
import { StatusUpdate } from '../types/order';

//Extract socket type from SocketStream
type WebSocket = SocketStream['socket'];

/**
 * WebSocket connection with metadata
 */
interface WebSocketConnection {
  socket: WebSocket;
  orderId: string;
  connectedAt: number;
}

/**
 * WebSocket Status Emitter Service
 */
export class WebSocketService {
  private connections: Map<string, WebSocketConnection> = new Map();
  private orderConnections: Map<string, Set<string>> = new Map(); // orderId -> Set of connectionIds

  /**
   * Generate a unique connection ID
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Register a new WebSocket connection for an order
   * 
   * @param socket - WebSocket connection
   * @param orderId - Order ID to associate with this connection
   * @returns Connection ID
   */
  registerConnection(socket: WebSocket, orderId: string): string {
    const connectionId = this.generateConnectionId();
    const connection: WebSocketConnection = {
      socket,
      orderId,
      connectedAt: Date.now(),
    };

    this.connections.set(connectionId, connection);

    // Map orderId to connection
    if (!this.orderConnections.has(orderId)) {
      this.orderConnections.set(orderId, new Set());
    }
    this.orderConnections.get(orderId)!.add(connectionId);

    // Handle connection close
    socket.on('close', () => {
      this.unregisterConnection(connectionId);
    });

    // Handle errors
    socket.on('error', (error: Error) => {
      console.error(`WebSocket error for order ${orderId}:`, error);
      this.unregisterConnection(connectionId);
    });

    console.log(`[WebSocketService] Registered connection ${connectionId} for order ${orderId}`);

    return connectionId;
  }

  /**
   * Unregister a WebSocket connection
   */
  private unregisterConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    const { orderId } = connection;
    this.connections.delete(connectionId);

    // Remove from order mapping
    const orderConnections = this.orderConnections.get(orderId);
    if (orderConnections) {
      orderConnections.delete(connectionId);
      if (orderConnections.size === 0) {
        this.orderConnections.delete(orderId);
      }
    }

    console.log(`[WebSocketService] Unregistered connection ${connectionId} for order ${orderId}`);
  }

  /**
   * Emit a status update to all connections associated with an orderId
   * 
   * @param orderId - Order ID
   * @param statusUpdate - Status update message
   */
  emitStatusUpdate(orderId: string, statusUpdate: StatusUpdate): void {
    const connectionIds = this.orderConnections.get(orderId);
    if (!connectionIds || connectionIds.size === 0) {
      console.warn(`[WebSocketService] No connections found for order ${orderId}`);
      return;
    }

    const message = JSON.stringify(statusUpdate);
    let sentCount = 0;
    let failedCount = 0;

    connectionIds.forEach((connectionId) => {
      const connection = this.connections.get(connectionId);
      if (!connection) {
        // Clean up stale reference
        connectionIds.delete(connectionId);
        return;
      }

      try {
        if (connection.socket.readyState === connection.socket.OPEN) {
          connection.socket.send(message);
          sentCount++;
        } else {
          // Connection is not open, remove it
          this.unregisterConnection(connectionId);
          failedCount++;
        }
      } catch (error) {
        console.error(`[WebSocketService] Failed to send status update to ${connectionId}:`, error);
        this.unregisterConnection(connectionId);
        failedCount++;
      }
    });

    console.log(
      `[WebSocketService] Emitted status update for order ${orderId}: ${statusUpdate.status} ` +
      `(sent: ${sentCount}, failed: ${failedCount})`
    );
  }

  /**
   * Get the number of active connections for an order
   */
  getConnectionCount(orderId: string): number {
    return this.orderConnections.get(orderId)?.size || 0;
  }

  /**
   * Get total number of active connections
   */
  getTotalConnections(): number {
    return this.connections.size;
  }

  /**
   * Close all connections for an order
   */
  closeOrderConnections(orderId: string): void {
    const connectionIds = this.orderConnections.get(orderId);
    if (!connectionIds) {
      return;
    }

    connectionIds.forEach((connectionId) => {
      const connection = this.connections.get(connectionId);
      if (connection) {
        try {
          connection.socket.close();
        } catch (error) {
          console.error(`[WebSocketService] Error closing connection ${connectionId}:`, error);
        }
      }
      this.unregisterConnection(connectionId);
    });
  }

  /**
   * Close all connections
   */
  closeAllConnections(): void {
    this.connections.forEach((connection) => {
      try {
        connection.socket.close();
      } catch (error) {
        console.error('[WebSocketService] Error closing connection:', error);
      }
    });
    this.connections.clear();
    this.orderConnections.clear();
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();


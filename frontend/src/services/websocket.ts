import { StatusUpdate } from '../types/order';

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';

export class WebSocketService {
  private ws: WebSocket | null = null;
  private orderId: string;
  private onMessageCallback: (update: StatusUpdate) => void;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(orderId: string, onMessage: (update: StatusUpdate) => void) {
    this.orderId = orderId;
    this.onMessageCallback = onMessage;
  }

  connect(): void {
    try {
      const wsUrl = `${WS_BASE_URL}/api/orders/${this.orderId}/status`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log(`WebSocket connected for order ${this.orderId}`);
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle connection confirmation
          if (data.type === 'connected' || data.type === 'pong') {
            return;
          }

          // Handle status updates
          if (data.orderId && data.status) {
            this.onMessageCallback(data as StatusUpdate);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log(`WebSocket closed for order ${this.orderId}`);
        
        // Attempt to reconnect if not manually closed
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => {
            console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
            this.connect();
          }, this.reconnectDelay * this.reconnectAttempts);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  sendPing(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'ping' }));
    }
  }
}


import { useState, useEffect, useRef } from 'react';
import { Order, StatusUpdate } from '../types/order';
import { WebSocketService } from '../services/websocket';

export function useOrder(orderId: string, initialOrder?: Partial<Order>) {
  const [order, setOrder] = useState<Order | null>(null);
  const wsServiceRef = useRef<WebSocketService | null>(null);

  useEffect(() => {
    if (!orderId) return;

    // Create initial order state from props or defaults
    const initial: Order = {
      orderId,
      tokenIn: initialOrder?.tokenIn || '',
      tokenOut: initialOrder?.tokenOut || '',
      amount: initialOrder?.amount || 0,
      orderType: initialOrder?.orderType || 'MARKET',
      status: initialOrder?.status || 'pending',
      submittedAt: initialOrder?.submittedAt || Date.now(),
    };
    setOrder(initial);

    // Create WebSocket service
    const handleStatusUpdate = (update: StatusUpdate) => {
      setOrder((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: update.status,
          ...(update.data?.routingDecision && {
            routingDecision: update.data.routingDecision,
          }),
          ...(update.data?.txHash && { txHash: update.data.txHash }),
          ...(update.data?.failureReason && {
            failureReason: update.data.failureReason,
            failedAt: update.timestamp,
          }),
          ...(update.data?.executionPrice && {
            executionPrice: update.data.executionPrice,
            executedAt: update.timestamp,
          }),
          ...(update.data?.executionAmount && {
            executionAmount: update.data.executionAmount,
          }),
        };
      });
    };

    wsServiceRef.current = new WebSocketService(orderId, handleStatusUpdate);
    wsServiceRef.current.connect();

    // Cleanup on unmount
    return () => {
      if (wsServiceRef.current) {
        wsServiceRef.current.disconnect();
      }
    };
  }, [orderId]);

  return order;
}


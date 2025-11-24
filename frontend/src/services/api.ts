import { OrderRequest } from '../types/order';

// Use relative URLs in development (via Vite proxy) or absolute URL from env
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export async function submitOrder(order: OrderRequest): Promise<{ orderId: string; status: string; message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/orders/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(order),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to submit order');
  }

  return response.json();
}

export async function checkHealth(): Promise<{ status: string; timestamp: number }> {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error('Health check failed');
  }
  return response.json();
}


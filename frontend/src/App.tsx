import { useState, useEffect } from 'react';
import OrderForm from './components/OrderForm';
import OrderCard from './components/OrderCard';
import { useOrder } from './hooks/useOrder';
import { Order, OrderRequest } from './types/order';
import { checkHealth } from './services/api';

function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    // Check backend health on mount
    checkHealth()
      .then(() => setIsHealthy(true))
      .catch(() => setIsHealthy(false));
  }, []);

  const handleOrderSubmit = (orderId: string, orderRequest: OrderRequest) => {
    // Create order with initial data from form
    const newOrder: Order = {
      orderId,
      ...orderRequest,
      status: 'pending',
      submittedAt: Date.now(),
    };
    setOrders((prev) => [newOrder, ...prev]);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Order Execution Engine</h1>
          <p className="text-gray-600">Real-time order processing and DEX routing</p>
          <div className="mt-4 flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isHealthy === true ? 'bg-green-500' : isHealthy === false ? 'bg-red-500' : 'bg-gray-400'
              }`}
            />
            <span className="text-sm text-gray-600">
              {isHealthy === true
                ? 'Backend connected'
                : isHealthy === false
                ? 'Backend disconnected'
                : 'Checking connection...'}
            </span>
          </div>
        </header>

        {/* Order Form */}
        <div className="mb-8">
          <OrderForm onSubmit={handleOrderSubmit} />
        </div>

        {/* Orders List */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Orders ({orders.length})
          </h2>
          {orders.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-500">No orders yet. Submit an order to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <OrderCardWithWebSocket key={order.orderId} order={order} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Component that wraps OrderCard with WebSocket connection
function OrderCardWithWebSocket({ order }: { order: Order }) {
  const updatedOrder = useOrder(order.orderId, order);

  if (!updatedOrder) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-500">Loading order {order.orderId.slice(-8)}...</p>
      </div>
    );
  }

  return <OrderCard order={updatedOrder} />;
}

export default App;


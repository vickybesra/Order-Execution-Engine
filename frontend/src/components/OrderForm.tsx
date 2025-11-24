import { useState } from 'react';
import { OrderRequest, OrderType } from '../types/order';
import { submitOrder } from '../services/api';

interface OrderFormProps {
  onSubmit: (orderId: string, orderRequest: OrderRequest) => void;
}

export default function OrderForm({ onSubmit }: OrderFormProps) {
  const [formData, setFormData] = useState<OrderRequest>({
    tokenIn: 'SOL',
    tokenOut: 'USDC',
    amount: 10,
    orderType: 'MARKET',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await submitOrder(formData);
      onSubmit(result.orderId, formData);
      // Reset form
      setFormData({
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amount: 10,
        orderType: 'MARKET',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Submit New Order</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="tokenIn" className="block text-sm font-medium text-gray-700 mb-1">
              Token In
            </label>
            <input
              type="text"
              id="tokenIn"
              value={formData.tokenIn}
              onChange={(e) => setFormData({ ...formData, tokenIn: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="tokenOut" className="block text-sm font-medium text-gray-700 mb-1">
              Token Out
            </label>
            <input
              type="text"
              id="tokenOut"
              value={formData.tokenOut}
              onChange={(e) => setFormData({ ...formData, tokenOut: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
            Amount
          </label>
          <input
            type="number"
            id="amount"
            min="0.01"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label htmlFor="orderType" className="block text-sm font-medium text-gray-700 mb-1">
            Order Type
          </label>
          <select
            id="orderType"
            value={formData.orderType}
            onChange={(e) => setFormData({ ...formData, orderType: e.target.value as OrderType })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="MARKET">Market</option>
            <option value="LIMIT">Limit</option>
            <option value="SNIPER">Sniper</option>
          </select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Order'}
        </button>
      </form>
    </div>
  );
}


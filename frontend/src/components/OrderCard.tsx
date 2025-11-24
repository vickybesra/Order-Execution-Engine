import { Order } from '../types/order';

interface OrderCardProps {
  order: Order;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  routing: 'bg-blue-100 text-blue-800',
  building: 'bg-purple-100 text-purple-800',
  submitted: 'bg-indigo-100 text-indigo-800',
  executing: 'bg-orange-100 text-orange-800',
  confirmed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

export default function OrderCard({ order }: OrderCardProps) {
  const statusColor = statusColors[order.status] || 'bg-gray-100 text-gray-800';

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Order {order.orderId.slice(-8)}</h3>
          <p className="text-sm text-gray-500">
            {new Date(order.submittedAt).toLocaleString()}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
          {order.status.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">Trade</p>
          <p className="text-lg font-semibold text-gray-800">
            {order.amount} {order.tokenIn} → {order.tokenOut}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Order Type</p>
          <p className="text-lg font-semibold text-gray-800">{order.orderType}</p>
        </div>
      </div>

      {order.routingDecision && (
        <div className="mt-4 p-4 bg-gray-50 rounded-md">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Routing Decision</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Selected DEX:</span>
              <span className="text-sm font-medium text-gray-800">{order.routingDecision.selectedDex}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Reason:</span>
              <span className="text-sm text-gray-800">{order.routingDecision.selectionReason}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-200">
              <div>
                <p className="text-xs text-gray-500 mb-1">Raydium Quote</p>
                <p className="text-sm font-medium text-gray-800">
                  {order.routingDecision.raydiumQuote.amountOut.toFixed(4)} {order.tokenOut}
                </p>
                <p className="text-xs text-gray-500">
                  Fee: {order.routingDecision.raydiumQuote.fee.toFixed(4)} {order.tokenIn}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Meteora Quote</p>
                <p className="text-sm font-medium text-gray-800">
                  {order.routingDecision.meteoraQuote.amountOut.toFixed(4)} {order.tokenOut}
                </p>
                <p className="text-xs text-gray-500">
                  Fee: {order.routingDecision.meteoraQuote.fee.toFixed(4)} {order.tokenIn}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {order.executionPrice && (
        <div className="mt-4 p-4 bg-green-50 rounded-md">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Execution Price:</span>
            <span className="text-sm font-semibold text-green-800">
              {order.executionPrice.toFixed(4)}
            </span>
          </div>
          {order.executionAmount && (
            <div className="flex justify-between mt-1">
              <span className="text-sm text-gray-600">Executed Amount:</span>
              <span className="text-sm font-semibold text-green-800">
                {order.executionAmount.toFixed(4)} {order.tokenOut}
              </span>
            </div>
          )}
        </div>
      )}

      {order.txHash && (
        <div className="mt-4 p-4 bg-blue-50 rounded-md">
          <p className="text-sm text-gray-600">Transaction Hash</p>
          <p className="text-sm font-mono text-blue-800 break-all">{order.txHash}</p>
        </div>
      )}

      {order.failureReason && (
        <div className="mt-4 p-4 bg-red-50 rounded-md">
          <p className="text-sm font-semibold text-red-800">Failure Reason</p>
          <p className="text-sm text-red-700">{order.failureReason}</p>
        </div>
      )}

      {order.executedAt && (
        <div className="mt-4 text-xs text-gray-500">
          Executed at {new Date(order.executedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}


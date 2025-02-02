import React, { useMemo } from 'react';
import { Order } from '../types';
import { useFranchise } from '../contexts/FranchiseContext';

interface OrderSidebarProps {
  orders: Order[];
  selectedOrderId?: string;
  onSelectOrder: (orderId: string) => void;
}

export default function OrderSidebar({ orders, selectedOrderId, onSelectOrder }: OrderSidebarProps) {
  const { formatCurrency } = useFranchise();
  
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (err) {
      console.error('Error formatting time:', err);
      return '';
    }
  };

  const ordersList = useMemo(() => (
    orders.map(order => (
      <button
        key={order.id}
        onClick={() => onSelectOrder(order.id)}
        className={`w-full text-left p-4 hover:bg-gray-100 transition-colors ${
          selectedOrderId === order.id ? 'bg-gray-100' : ''
        }`}
      >
        <div className="flex justify-between items-start mb-1">
          <span className="font-medium">Table {order.table_number}</span>
          <span className="text-sm text-gray-500">
            {formatTime(order.created_at)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-sm capitalize ${
              order.status === 'served' ? 'text-green-600' :
              order.status === 'ready' ? 'text-orange-600' :
              order.status === 'preparing' ? 'text-blue-600' :
              'text-gray-600'
            }`}>
              {order.status}
            </span>
            {order.payment_status === 'paid' && (
              <span className="text-sm text-green-600">(Paid)</span>
            )}
          </div>
          <span className="text-sm font-medium">
            {formatCurrency(order.total)}
          </span>
        </div>
      </button>
    ))
  ), [orders, selectedOrderId, onSelectOrder, formatCurrency]);

  return (
    <div className="w-80 border-r bg-gray-50 overflow-hidden flex flex-col">
      <div className="p-4 border-b bg-white">
        <h2 className="text-lg font-medium">Orders</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {orders.length > 0 ? (
          <div className="divide-y">
            {ordersList}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            No orders found
          </div>
        )}
      </div>
    </div>
  );
}

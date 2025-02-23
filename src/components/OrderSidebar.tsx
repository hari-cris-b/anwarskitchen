import React, { useMemo } from 'react';
import { Order, OrderStatus } from '../types/orders';
import { formatCurrency } from '../utils/helpers';

interface OrderSidebarProps {
  orders: Order[];
  selectedOrderId?: string;
  onSelectOrder: (orderId: string) => void;
}

function getStatusColor(status: OrderStatus): string {
  switch (status) {
    case 'completed':
      return 'text-green-600';
    case 'ready':
      return 'text-orange-600';
    case 'preparing':
      return 'text-blue-600';
    case 'cancelled':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

export default function OrderSidebar({ orders, selectedOrderId, onSelectOrder }: OrderSidebarProps) {
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
          <span className="font-medium">
            {order.table_number ? `Table ${order.table_number}` : 'No Table'}
          </span>
          <span className="text-sm text-gray-500">
            {formatTime(order.created_at)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-sm capitalize ${getStatusColor(order.status)}`}>
              {order.status}
            </span>
          </div>
          <span className="text-sm font-medium">
            {typeof order.total === 'number'
              ? formatCurrency(order.total)
              : `Error: Invalid amount ${order.total}`}
          </span>
        </div>
      </button>
    ))
  ), [orders, selectedOrderId, onSelectOrder]);

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

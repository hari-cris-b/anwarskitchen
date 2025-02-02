import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Order } from '../types';
import { OrderService } from '../services/orderService';
import LoadingSpinner from '../components/LoadingSpinner';
import OrderSidebar from '../components/OrderSidebar';
import toast from 'react-hot-toast';
import { formatDateTime, getTimeDifference } from '../utils/dateUtils';

export default function Kitchen() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Filter orders to only show pending and preparing orders
  const kitchenOrders = useMemo(() => 
    orders.filter(order => order.status === 'pending' || order.status === 'preparing'),
    [orders]
  );

  const selectedOrder = useMemo(() => 
    orders.find(order => order.id === selectedOrderId),
    [orders, selectedOrderId]
  );

  const fetchOrders = useCallback(async () => {
    if (!profile?.franchise_id || !mountedRef.current) return;

    try {
      const fetchedOrders = await OrderService.getOrders(profile.franchise_id);
      if (mountedRef.current) {
        setOrders(fetchedOrders);
        
        // If selected order is no longer in kitchen orders, clear selection
        if (selectedOrderId && !fetchedOrders.some(order => 
          order.id === selectedOrderId && 
          (order.status === 'pending' || order.status === 'preparing')
        )) {
          setSelectedOrderId(undefined);
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        console.error('Error fetching orders:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch orders');
        toast.error('Failed to fetch orders');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [profile?.franchise_id, selectedOrderId]);

  useEffect(() => {
    // Reset mounted ref on mount
    mountedRef.current = true;

    const loadOrders = async () => {
      if (!profile?.franchise_id || !mountedRef.current) {
        setLoading(false);
        return;
      }

      await fetchOrders();
    };

    loadOrders();

    // Set up polling for kitchen orders
    const intervalId = setInterval(fetchOrders, 30000); // Refresh every 30 seconds

    // Cleanup function
    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [profile?.franchise_id, fetchOrders]);

  const handleStatusUpdate = useCallback(async (orderId: string, status: Order['status']) => {
    if (!mountedRef.current) return;

    try {
      await OrderService.updateOrderStatus(orderId, status);
      
      if (mountedRef.current) {
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId ? { ...order, status } : order
          )
        );

        // Clear selection when order is marked as ready
        if (status === 'ready') {
          setSelectedOrderId(undefined);
        }

        toast.success(`Order status updated to ${status}`);
      }
    } catch (err) {
      if (mountedRef.current) {
        console.error('Error updating order status:', err);
        toast.error('Failed to update order status');
      }
    }
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <OrderSidebar
        orders={kitchenOrders}
        selectedOrderId={selectedOrderId}
        onSelectOrder={setSelectedOrderId}
      />
      
      <div className="flex-1 overflow-hidden">
        {selectedOrder ? (
          <div className="h-full flex flex-col p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">
                  Table {selectedOrder.table_number}
                </h2>
                <p className="text-sm text-gray-600">
                  Server: {selectedOrder.server_name}
                </p>
              </div>
              <div className="flex gap-2">
                {selectedOrder.status === 'pending' ? (
                  <button
                    onClick={() => handleStatusUpdate(selectedOrder.id, 'preparing')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Start Preparing
                  </button>
                ) : selectedOrder.status === 'preparing' && (
                  <button
                    onClick={() => handleStatusUpdate(selectedOrder.id, 'ready')}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Mark as Ready
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="space-y-6">
                  <div className="border-b pb-4">
                    <h3 className="font-medium mb-4">Order Items</h3>
                    <div className="space-y-4">
                      {selectedOrder.items?.map(item => (
                        <div key={item.id} className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-gray-600">
                              Quantity: {item.quantity}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-b pb-4">
                    <h3 className="font-medium mb-4">Order Status</h3>
                    <p className={`text-lg font-medium capitalize ${
                      selectedOrder.status === 'preparing' ? 'text-blue-600' :
                      selectedOrder.status === 'pending' ? 'text-yellow-600' :
                      'text-gray-600'
                    }`}>
                      {selectedOrder.status}
                    </p>
                  </div>

                  <div className="border-b pb-4">
                    <h3 className="font-medium mb-4">Order Timeline</h3>
                    <div className="space-y-3">
                      <div className="flex items-center text-sm">
                        <div className="w-24 text-gray-600">Created:</div>
                        <div>{formatDateTime(selectedOrder.created_at)}</div>
                        <div className="ml-2 text-gray-500">
                          ({getTimeDifference(selectedOrder.created_at)})
                        </div>
                      </div>
                      {selectedOrder.preparing_at && (
                        <div className="flex items-center text-sm">
                          <div className="w-24 text-gray-600">Preparing:</div>
                          <div>{formatDateTime(selectedOrder.preparing_at)}</div>
                          <div className="ml-2 text-gray-500">
                            (took {getTimeDifference(selectedOrder.preparing_at, selectedOrder.created_at)})
                          </div>
                        </div>
                      )}
                      {selectedOrder.ready_at && (
                        <div className="flex items-center text-sm">
                          <div className="w-24 text-gray-600">Ready:</div>
                          <div>{formatDateTime(selectedOrder.ready_at)}</div>
                          <div className="ml-2 text-gray-500">
                            (took {getTimeDifference(selectedOrder.ready_at, selectedOrder.preparing_at)})
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500">Select an order to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Order } from '../types';
import { OrderService } from '../services/orderService';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import OrderSidebar from '../components/OrderSidebar';
import toast from 'react-hot-toast';

export default function Kitchen() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter orders to only show pending and preparing orders
  const kitchenOrders = useMemo(() => 
    orders.filter(order => order.status === 'pending' || order.status === 'preparing'),
    [orders]
  );

  const selectedOrder = orders.find(order => order.id === selectedOrderId);

  const fetchOrders = useCallback(async () => {
    if (!profile?.franchise_id) return;

    try {
      setLoading(true);
      setError(null);
      const fetchedOrders = await OrderService.getOrders(profile.franchise_id);
      setOrders(fetchedOrders);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [profile?.franchise_id]);

  useEffect(() => {
    let mounted = true;
    
    const loadOrders = async () => {
      if (!profile?.franchise_id) {
        if (mounted) {
          setLoading(false);
        }
        return;
      }

      try {
        const fetchedOrders = await OrderService.getOrders(profile.franchise_id);
        if (mounted) {
          setOrders(fetchedOrders);
        }
      } catch (err) {
        console.error('Error fetching orders:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch orders');
          toast.error('Failed to fetch orders');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadOrders();

    // Set up polling for kitchen orders
    const interval = setInterval(loadOrders, 30000); // Refresh every 30 seconds

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [profile?.franchise_id]);

  const handleStatusUpdate = useCallback(async (orderId: string, status: Order['status']) => {
    try {
      await OrderService.updateOrderStatus(orderId, status);
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
    } catch (err) {
      console.error('Error updating order status:', err);
      toast.error('Failed to update order status');
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
                          <p className="text-gray-900">
                            ${(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-b pb-4">
                    <h3 className="font-medium mb-4">Order Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Status</p>
                        <p className={`font-medium capitalize ${
                          selectedOrder.status === 'ready' ? 'text-green-600' :
                          selectedOrder.status === 'preparing' ? 'text-blue-600' :
                          'text-gray-900'
                        }`}>
                          {selectedOrder.status}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Created At</p>
                        <p className="font-medium">
                          {new Date(selectedOrder.created_at).toLocaleString()}
                        </p>
                      </div>
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

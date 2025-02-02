import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFranchise } from '../contexts/FranchiseContext';
import { Order } from '../types';
import { OrderService } from '../services/orderService';
import LoadingSpinner from '../components/LoadingSpinner';
import OrderSidebar from '../components/OrderSidebar';
import toast from 'react-hot-toast';
import { formatDateTime, getTimeDifference } from '../utils/dateUtils';

const Orders = () => {
  const { profile } = useAuth();
  const { formatCurrency } = useFranchise();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    return () => {
      mounted = false;
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
      toast.success(`Order status updated to ${status}`);
    } catch (err) {
      console.error('Error updating order status:', err);
      toast.error('Failed to update order status');
    }
  }, []);

  const handlePaymentStatus = useCallback(async (orderId: string, paymentStatus: Order['payment_status']) => {
    try {
      await OrderService.updatePaymentStatus(orderId, paymentStatus);
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, payment_status: paymentStatus } : order
        )
      );
      toast.success(`Payment status updated to ${paymentStatus}`);
    } catch (err) {
      console.error('Error updating payment status:', err);
      toast.error('Failed to update payment status');
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
        orders={orders}
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
                {selectedOrder.status === 'ready' && (
                  <button
                    onClick={() => handleStatusUpdate(selectedOrder.id, 'served')}
                    className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                  >
                    Mark as Served
                  </button>
                )}
                {selectedOrder.payment_status === 'unpaid' && selectedOrder.status !== 'pending' && (
                  <button
                    onClick={() => handlePaymentStatus(selectedOrder.id, 'paid')}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Mark as Paid
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
                            {formatCurrency(item.price * item.quantity)}
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
                          selectedOrder.status === 'served' ? 'text-green-600' :
                          selectedOrder.status === 'ready' ? 'text-orange-600' :
                          selectedOrder.status === 'preparing' ? 'text-blue-600' :
                          'text-gray-900'
                        }`}>
                          {selectedOrder.status}
                          {selectedOrder.payment_status === 'paid' && ' (Paid)'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Payment Status</p>
                        <p className={`font-medium capitalize ${
                          selectedOrder.payment_status === 'paid' ? 'text-green-600' :
                          'text-red-600'
                        }`}>
                          {selectedOrder.payment_status}
                        </p>
                      </div>
                    </div>
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
                      {selectedOrder.served_at && (
                        <div className="flex items-center text-sm">
                          <div className="w-24 text-gray-600">Served:</div>
                          <div>{formatDateTime(selectedOrder.served_at)}</div>
                          <div className="ml-2 text-gray-500">
                            (took {getTimeDifference(selectedOrder.served_at, selectedOrder.ready_at)})
                          </div>
                        </div>
                      )}
                      {selectedOrder.paid_at && (
                        <div className="flex items-center text-sm">
                          <div className="w-24 text-gray-600">Paid:</div>
                          <div>{formatDateTime(selectedOrder.paid_at)}</div>
                          <div className="ml-2 text-gray-500">
                            (took {getTimeDifference(selectedOrder.paid_at, selectedOrder.served_at)})
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-b pb-4">
                    <h3 className="font-medium mb-4">Bill Details</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <p className="text-gray-600">Subtotal</p>
                        <p className="font-medium">{formatCurrency(selectedOrder.subtotal)}</p>
                      </div>
                      <div className="flex justify-between">
                        <p className="text-gray-600">Tax</p>
                        <p className="font-medium">{formatCurrency(selectedOrder.tax)}</p>
                      </div>
                      {selectedOrder.discount > 0 && (
                        <div className="flex justify-between text-red-600">
                          <p>Discount</p>
                          <p className="font-medium">-{formatCurrency(selectedOrder.discount)}</p>
                        </div>
                      )}
                      {selectedOrder.additional_charges > 0 && (
                        <div className="flex justify-between">
                          <p className="text-gray-600">Additional Charges</p>
                          <p className="font-medium">{formatCurrency(selectedOrder.additional_charges)}</p>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t">
                        <p className="font-medium">Total</p>
                        <p className="font-medium">{formatCurrency(selectedOrder.total)}</p>
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

export default Orders;

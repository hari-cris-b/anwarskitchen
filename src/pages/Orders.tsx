import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFranchise } from '../contexts/FranchiseContext';
import { orderService, type OrderWithItems, type OrderStatus } from '../services/orderService';
import useOrderSubscription from '../hooks/useOrderSubscription';
import useNotification from '../hooks/useNotification';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import styles from '../styles/Orders.module.css';

const ITEMS_PER_PAGE = 10;

const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  preparing: 'bg-blue-100 text-blue-800',
  ready: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800'
};

const Orders: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { settings } = useFranchise();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const { 
    supported: notificationsSupported,
    isPermissionGranted,
    requestPermission,
    sendNotification
  } = useNotification({
    defaultIcon: '/favicon.ico',
    defaultTag: 'order-notification'
  });

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: settings?.currency || 'INR'
    }).format(amount);
  }, [settings?.currency]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const fetchOrders = useCallback(async () => {
    if (!profile?.franchise_id) {
      setError('No franchise ID available');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { orders: newOrders, total } = await orderService.getOrders(profile.franchise_id, {
        page: currentPage,
        limit: ITEMS_PER_PAGE
      });

      setOrders(newOrders);
      setTotalOrders(total);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [profile?.franchise_id, currentPage]);

  const handleNewOrder = useCallback((order: OrderWithItems) => {
    setOrders(prev => {
      const newOrders = [order, ...prev];
      if (newOrders.length > ITEMS_PER_PAGE) {
        newOrders.pop();
      }
      return newOrders;
    });
    setTotalOrders(prev => prev + 1);
    
    sendNotification({
      title: 'New Order Received',
      body: `Order #${order.id.slice(-6)} - ${formatCurrency(order.total)}`,
      onClick: () => {
        window.focus();
        const orderElement = document.getElementById(`order-${order.id}`);
        if (orderElement) {
          orderElement.scrollIntoView({ behavior: 'smooth' });
          orderElement.classList.add(styles.highlight);
          setTimeout(() => {
            orderElement.classList.remove(styles.highlight);
          }, 2000);
        }
      }
    });
  }, [sendNotification, formatCurrency]);

  const handleOrderUpdate = useCallback((updatedOrder: OrderWithItems) => {
    setOrders(prev => {
      const index = prev.findIndex(order => order.id === updatedOrder.id);
      if (index === -1) {
        // If order not in current page, check if it should be
        const shouldAdd = currentPage === 1; // Only add to first page
        return shouldAdd ? [updatedOrder, ...prev.slice(0, -1)] : prev;
      }
      // Update existing order
      const newOrders = [...prev];
      newOrders[index] = updatedOrder;
      return newOrders;
    });
  }, [currentPage]);

  const handleSubscriptionError = useCallback((err: Error) => {
    console.error('Subscription error:', err);
    setError('Failed to connect to real-time updates');
  }, []);

  useOrderSubscription({
    franchiseId: profile?.franchise_id ?? '',
    onNewOrder: handleNewOrder,
    onOrderUpdate: handleOrderUpdate,
    onError: handleSubscriptionError
  });


  // Background refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      void fetchOrders();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchOrders]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      setUpdatingOrderId(orderId);
      setError(null);

      // Find the current order
      const orderToUpdate = orders.find(o => o.id === orderId);
      if (!orderToUpdate) return;

      // Optimistically update the orders list based on status
      setOrders(prev => {
        const updatedOrders = prev.map(order => {
          if (order.id === orderId) {
            return {
              ...order,
              status: newStatus,
              updated_at: new Date().toISOString()
            };
          }
          return order;
        });

        // If status is completed or cancelled, move to end of list
        if (newStatus === 'completed' || newStatus === 'cancelled') {
          const orderToMove = updatedOrders.find(o => o.id === orderId);
          if (orderToMove) {
            return [
              ...updatedOrders.filter(o => o.id !== orderId),
              orderToMove
            ];
          }
        }

        return updatedOrders;
      });
      
      // Make the actual API call
      await orderService.updateOrder({ id: orderId, status: newStatus });
      
      // No need to fetch or update state here as the subscription will handle it
      // If the update fails, we'll revert in the catch block
      
    } catch (err) {
      console.error('Error updating order:', err);
      setError(err instanceof Error ? err.message : 'Failed to update order');
      // Revert optimistic update on error by fetching fresh data
      void fetchOrders();
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const totalPages = Math.ceil(totalOrders / ITEMS_PER_PAGE);

  if (!profile?.franchise_id) {
    return <div>Unauthorized</div>;
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 sm:px-0 flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Orders</h2>
          {notificationsSupported && !isPermissionGranted && (
            <button
              onClick={requestPermission}
              className="mt-1 text-sm text-blue-600 hover:text-blue-800"
            >
              Enable notifications for new orders
            </button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => navigate('/pos')}
              variant="secondary"
            >
              New Order
            </Button>
            <Button onClick={fetchOrders} disabled={loading}>
              {loading ? <LoadingSpinner size="small" /> : 'Refresh'}
            </Button>
          </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <LoadingSpinner />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No orders found
          </div>
        ) : (
          <>
            {orders.map((order) => (
              <div
                key={order.id}
                id={`order-${order.id}`}
                className={`${styles.orderCard} bg-white shadow rounded-lg overflow-hidden`}
              >
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Order #{order.id.slice(-6)}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formatDate(order.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[order.status]}`}>
                        {order.status}
                      </span>
                      {order.status !== 'completed' && order.status !== 'cancelled' && (
                        <div className="flex space-x-2">
                          {updatingOrderId === order.id ? (
                            <LoadingSpinner size="small" />
                          ) : (
                            <>
                              {order.status === 'pending' && (
                                <Button
                                  size="small"
                                  onClick={() => handleUpdateStatus(order.id, 'preparing')}
                                >
                                  Start Preparing
                                </Button>
                              )}
                              {order.status === 'preparing' && (
                                <Button
                                  size="small"
                                  onClick={() => handleUpdateStatus(order.id, 'ready')}
                                >
                                  Mark Ready
                                </Button>
                              )}
                              {order.status === 'ready' && (
                                <Button
                                  size="small"
                                  onClick={() => handleUpdateStatus(order.id, 'completed')}
                                >
                                  Complete
                                </Button>
                              )}
                              <Button
                                size="small"
                                variant="danger"
                                onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4">
                  <div className="space-y-4">
                    {order.customer_name && (
                      <p className="text-sm text-gray-600">
                        Customer: {order.customer_name}
                      </p>
                    )}
                    {order.table_number && (
                      <p className="text-sm text-gray-600">
                        Table: {order.table_number}
                      </p>
                    )}
                    {order.notes && (
                      <p className="text-sm text-gray-600">
                        Notes: {order.notes}
                      </p>
                    )}
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Items</h4>
                      <div className="space-y-2">
                        {order.order_items.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between items-center"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {item.menu_items.name}
                              </p>
                              {item.notes && (
                                <p className="text-sm text-gray-500">{item.notes}</p>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {item.quantity}x
                            </div>
                            <div className="ml-4 text-sm font-medium text-gray-900">
                              {formatCurrency(item.price_at_time * item.quantity)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="border-t border-gray-200 pt-4 flex justify-end">
                      <p className="text-lg font-medium text-gray-900">
                        Total: {formatCurrency(order.total)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {totalPages > 1 && (
              <div className="flex justify-center space-x-2 mt-6">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  variant="secondary"
                >
                  Previous
                </Button>
                <span className="px-4 py-2 text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  variant="secondary"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Orders;

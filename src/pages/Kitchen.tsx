import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFranchise } from '../contexts/FranchiseContext';
import { orderService, type OrderWithItems, type OrderStatus } from '../services/orderService';
import useOrderSubscription from '../hooks/useOrderSubscription';
import useNotification from '../hooks/useNotification';
import { playNotificationSound, ensureAudioInitialized, cleanupAudio } from '../utils/audioUtils';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { useLocalStorage } from '../hooks/useLocalStorage';

const ITEMS_PER_PAGE = 20;

const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  preparing: 'bg-blue-100 text-blue-800',
  ready: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800'
};

const KitchenPage: React.FC = () => {
  const { profile } = useAuth();
  const { settings } = useFranchise();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useLocalStorage('kitchen-audio-enabled', false);
  const [lastNotifiedOrders] = useState<Set<string>>(() => new Set());
  const isInitialMount = React.useRef(true);

  const { sendNotification } = useNotification({
    defaultIcon: '/favicon.ico',
    defaultTag: 'kitchen-notification'
  });

  const playSound = useCallback(async () => {
    if (!audioEnabled) {
      console.log('Audio notifications are disabled');
      return;
    }

    try {
      await playNotificationSound();
    } catch (error) {
      console.error('Failed to play notification sound:', error);
      setError('Failed to play sound - try toggling sound or check browser settings');
    }
  }, [audioEnabled]);

  const handleNewOrder = useCallback(async (order: OrderWithItems) => {
    if (order.status === 'preparing' && !lastNotifiedOrders.has(order.id)) {
      lastNotifiedOrders.add(order.id);
      setOrders(prev => [order, ...prev]);
      
      if (audioEnabled) {
        await playSound();
      }
      
      try {
        await sendNotification({
          title: 'New Order to Prepare',
          body: `Order #${order.id.slice(-6)} needs preparation`,
          onClick: () => {
            window.focus();
            const orderElement = document.getElementById(`order-${order.id}`);
            if (orderElement) {
              orderElement.scrollIntoView({ behavior: 'smooth' });
            }
          }
        });
      } catch (error) {
        console.error('Notification error:', error);
      }
    }
  }, [sendNotification, playSound]); // lastNotifiedOrders is stable

  const handleOrderUpdate = useCallback(async (updatedOrder: OrderWithItems & {
    previousStatus?: string;
    isNewToPreparing?: boolean;
  }) => {
    try {
      setError(null);

      const shouldNotify =
        updatedOrder.status === 'preparing' &&
        (!updatedOrder.previousStatus || updatedOrder.previousStatus === 'pending') &&
        !lastNotifiedOrders.has(updatedOrder.id);

      if (shouldNotify) {
        lastNotifiedOrders.add(updatedOrder.id);
      }

      setOrders(prev => {
        const orderExists = prev.some(o => o.id === updatedOrder.id);
        
        if (updatedOrder.status === 'preparing') {
          if (!orderExists) {
            return [updatedOrder, ...prev];
          }
          return prev.map(order =>
            order.id === updatedOrder.id ? updatedOrder : order
          );
        } else {
          return prev.filter(order => order.id !== updatedOrder.id);
        }
      });

      if (shouldNotify) {
        if (audioEnabled) {
          await playSound();
        }

        try {
          await sendNotification({
            title: 'New Order to Prepare',
            body: `Order #${updatedOrder.id.slice(-6)} needs preparation`,
            onClick: () => {
              window.focus();
              const orderElement = document.getElementById(`order-${updatedOrder.id}`);
              if (orderElement) {
                orderElement.scrollIntoView({ behavior: 'smooth' });
              }
            }
          });
        } catch (error) {
          console.error('Notification error:', error);
        }
      }
    } catch (error) {
      console.error('Order update error:', error);
      setError('Failed to process order update');
    }
  }, [playSound, sendNotification]); // Removed lastNotifiedOrders from dependencies

  const fetchOrders = useCallback(async () => {
    if (!profile?.franchise_id) {
      setError('No franchise ID available');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await orderService.getOrders(profile.franchise_id, {
        page: 1,
        limit: ITEMS_PER_PAGE,
        filter: {
          status: 'preparing'
        }
      });

      const isInitialLoad = orders.length === 0;

      if (isInitialLoad) {
        setOrders(result.orders);
        result.orders.forEach(order => lastNotifiedOrders.add(order.id));
        return;
      }

      const newOrders = result.orders.filter(order => !lastNotifiedOrders.has(order.id));
      setOrders(result.orders);

      if (newOrders.length > 0) {
        newOrders.forEach(order => lastNotifiedOrders.add(order.id));
        
        if (audioEnabled) {
          await playSound();
        }

        for (const order of newOrders) {
          try {
            await sendNotification({
              title: 'New Order to Prepare',
              body: `Order #${order.id.slice(-6)} needs preparation`,
              onClick: () => {
                window.focus();
                const orderElement = document.getElementById(`order-${order.id}`);
                if (orderElement) {
                  orderElement.scrollIntoView({ behavior: 'smooth' });
                }
              }
            });
          } catch (error) {
            console.error('Notification error:', error);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [profile?.franchise_id, playSound]);

  const toggleAudio = useCallback(async () => {
    try {
      setError(null);
      
      if (!audioEnabled) {
        setError('Initializing audio...');
        cleanupAudio();
        
        const success = await ensureAudioInitialized();
        if (!success) {
          setError('Failed to initialize audio. Please ensure your browser allows sound.');
          return;
        }

        try {
          await playNotificationSound();
          setAudioEnabled(true);
          setError(null);
          console.log('Audio enabled and tested successfully');
        } catch (playError) {
          console.error('Test sound failed:', playError);
          setError('Failed to play test sound. Please check your browser settings.');
        }
      } else {
        setAudioEnabled(false);
        setError(null);
        console.log('Audio disabled');
      }
    } catch (error) {
      console.error('Error toggling audio:', error);
      setError('Failed to toggle audio. Please check your browser settings and try again.');
      setAudioEnabled(false);
    }
  }, [audioEnabled, setAudioEnabled]);

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

  useEffect(() => {
    if (audioEnabled) {
      void ensureAudioInitialized();
    }

    void fetchOrders();

    const interval = setInterval(() => {
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }
      void fetchOrders();
    }, 30000);

    return () => {
      clearInterval(interval);
      cleanupAudio();
    };
  }, [profile?.franchise_id]);

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      setUpdatingOrderId(orderId);
      setError(null);
      
      setOrders(prev =>
        prev.filter(order => order.id !== orderId)
      );
      
      const updatedOrder = await orderService.updateOrder({ id: orderId, status: newStatus });
      
      if (newStatus === 'ready' || newStatus === 'cancelled') {
        try {
          await sendNotification({
            title: `Order ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
            body: `Order #${updatedOrder.id.slice(-6)} is ${newStatus}`,
            onClick: () => {
              window.focus();
              const orderElement = document.getElementById(`order-${updatedOrder.id}`);
              if (orderElement) {
                orderElement.scrollIntoView({ behavior: 'smooth' });
              }
            }
          });
        } catch (notificationError) {
          console.error('Failed to send notification:', notificationError);
        }
      }
      
    } catch (err) {
      console.error('Error updating order:', err);
      setError(err instanceof Error ? err.message : 'Failed to update order');
      void fetchOrders();
    } finally {
      setUpdatingOrderId(null);
    }
  };

  if (!profile?.franchise_id) {
    return <div>Unauthorized</div>;
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 sm:px-0 flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Kitchen Orders</h2>
          <button
            onClick={toggleAudio}
            className={`mt-2 inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${audioEnabled ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
          >
            {audioEnabled ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M9 12h6" />
                </svg>
                Sound On
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15.414a8 8 0 1112.828-12.828M19.513 12c0-3.314-2.686-6-6-6" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Sound Off
              </>
            )}
          </button>
        </div>
        <Button onClick={fetchOrders} disabled={loading}>
          {loading ? <LoadingSpinner size="small" /> : 'Refresh'}
        </Button>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center items-center min-h-[400px]">
            <LoadingSpinner />
          </div>
        ) : orders.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            No orders to prepare
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              id={`order-${order.id}`}
              className="bg-white shadow rounded-lg overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">
                    Order #{order.id.slice(-6)}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[order.status]}`}>
                    {order.status}
                  </span>
                </div>
                {order.table_number && (
                  <p className="mt-1 text-sm text-gray-600">
                    Table: {order.table_number}
                  </p>
                )}
              </div>
              
              <div className="px-6 py-4">
                <div className="space-y-4">
                  {order.order_items.map((item) => (
                    <div key={item.id} className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.quantity}x {item.menu_items.name}
                        </p>
                        {item.notes && (
                          <p className="text-sm text-gray-600">{item.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                {updatingOrderId === order.id ? (
                  <div className="flex justify-center">
                    <LoadingSpinner size="small" />
                  </div>
                ) : (
                  <div className="flex space-x-3">
                    <Button
                      size="small"
                      onClick={() => handleUpdateStatus(order.id, 'ready')}
                    >
                      Mark Ready
                    </Button>
                    <Button
                      size="small"
                      variant="danger"
                      onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default KitchenPage;

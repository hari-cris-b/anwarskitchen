import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Order } from '../types';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { useFranchise } from '../contexts/FranchiseContext';
import { useSupabaseSubscription } from '../hooks/useSupabaseSubscription';
import { useAuth } from '../contexts/AuthContext';
import ErrorAlert from '../components/ErrorAlert';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Kitchen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();
  const { loading: franchiseLoading, error: franchiseError } = useFranchise();

  // Fetch initial orders
  useEffect(() => {
    const loadOrders = async () => {
      try {
        if (!profile?.franchise_id) {
          throw new Error('No franchise ID available');
        }

        const { data, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .eq('franchise_id', profile.franchise_id)
          .in('status', ['pending', 'preparing'])
          .order('created_at', { ascending: true });

        if (ordersError) throw ordersError;

        setOrders(data || []);
      } catch (err) {
        console.error('Error loading orders:', err);
        setError(err instanceof Error ? err.message : 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [profile?.franchise_id]);

  // Subscribe to order updates
  useSupabaseSubscription<Order>(
    {
      table: 'orders',
      event: '*',
      filter: profile?.franchise_id ? `franchise_id=eq.${profile.franchise_id}` : undefined
    },
    (payload) => {
      if (!profile?.franchise_id) return;

      const newOrder = payload.new;
      const oldOrder = payload.old;

      // Ensure the order belongs to the current franchise
      if (newOrder && newOrder.franchise_id !== profile.franchise_id) return;
      if (oldOrder && oldOrder.franchise_id !== profile.franchise_id) return;

      if (!newOrder && oldOrder) {
        // Handle deleted order
        setOrders(prev => prev.filter(order => order.id !== oldOrder.id));
        return;
      }

      if (!newOrder) return;

      if (newOrder.status === 'pending' || newOrder.status === 'preparing') {
        setOrders(prev => {
          const exists = prev.some(order => order.id === newOrder.id);
          if (exists) {
            return prev.map(order => order.id === newOrder.id ? newOrder : order);
          }
          return [...prev, newOrder];
        });
      } else {
        setOrders(prev => prev.filter(order => order.id !== newOrder.id));
      }
    }
  );

  const handleStatusUpdate = async (orderId: string, newStatus: Order['status']) => {
    try {
      if (!profile?.franchise_id) {
        throw new Error('No franchise ID available');
      }

      // Validate status transition
      const order = orders.find(o => o.id === orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Check if the status transition is valid
      const validTransitions: Record<Order['status'], Order['status'][]> = {
        'pending': ['preparing'],
        'preparing': ['ready'],
        'ready': ['served'],
        'served': ['cancelled'],
        'cancelled': []
      };

      if (!validTransitions[order.status]?.includes(newStatus)) {
        throw new Error(`Invalid status transition from ${order.status} to ${newStatus}`);
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)
        .eq('franchise_id', profile.franchise_id);

      if (updateError) throw updateError;

      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));

      toast.success(`Order ${orderId} marked as ${newStatus}`);
    } catch (err) {
      console.error('Error updating order status:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update order status');
    }
  };

  if (loading || franchiseLoading) {
    return <LoadingSpinner />;
  }

  const errorMessage = error || franchiseError;
  if (errorMessage) {
    return <ErrorAlert message={errorMessage} />;
  }

  const pendingOrders = orders.filter(order => order.status === 'pending');
  const preparingOrders = orders.filter(order => order.status === 'preparing');

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Kitchen Display</h1>
          <p className="text-gray-600">Manage incoming orders</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Pending Orders */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Pending Orders</h2>
            <div className="space-y-4">
              {pendingOrders.map(order => (
                <div key={order.id} className="bg-white p-6 rounded-lg shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Table {order.table_number}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleStatusUpdate(order.id, 'preparing')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Start Preparing
                    </button>
                  </div>
                  <div className="space-y-2">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{item.name} x{item.quantity}</span>
                        {item.notes && (
                          <span className="text-sm text-gray-500">Note: {item.notes}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {pendingOrders.length === 0 && (
                <p className="text-center text-gray-500">No pending orders</p>
              )}
            </div>
          </div>

          {/* Preparing Orders */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Preparing Orders</h2>
            <div className="space-y-4">
              {preparingOrders.map(order => (
                <div key={order.id} className="bg-white p-6 rounded-lg shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Table {order.table_number}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleStatusUpdate(order.id, 'ready')}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Mark Ready
                    </button>
                  </div>
                  <div className="space-y-2">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{item.name} x{item.quantity}</span>
                        {item.notes && (
                          <span className="text-sm text-gray-500">Note: {item.notes}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {preparingOrders.length === 0 && (
                <p className="text-center text-gray-500">No orders being prepared</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

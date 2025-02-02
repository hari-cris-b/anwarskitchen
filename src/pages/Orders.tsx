import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFranchise } from '../contexts/FranchiseContext';
import { supabase } from '../lib/supabase';
import { Order, PaymentMethod, PaymentStatus, OrderStatus } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import { Search, Filter, Download } from 'lucide-react';

export default function Orders() {
  const { profile } = useAuth();
  const { settings, loading: franchiseLoading, error: franchiseError } = useFranchise();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState('today');

  const handlePaymentStatusUpdate = async (orderId: string, status: PaymentStatus, method?: PaymentMethod) => {
    try {
      if (!profile?.franchise_id) {
        throw new Error('No franchise ID available');
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_status: status,
          payment_method: method
        })
        .eq('id', orderId)
        .eq('franchise_id', profile.franchise_id);

      if (updateError) throw updateError;

      setOrders(prev =>
        prev.map(order =>
          order.id === orderId
            ? { ...order, payment_status: status, payment_method: method }
            : order
        )
      );

      toast.success('Payment status updated successfully');
    } catch (err) {
      console.error('Error updating payment status:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update payment status');
    }
  };

  useEffect(() => {
    const loadOrders = async () => {
      try {
        if (!profile?.franchise_id) {
          throw new Error('No franchise ID available');
        }

        let query = supabase
          .from('orders')
          .select('*, order_items(*)') // Include order items in the query
          .eq('franchise_id', profile.franchise_id)
          .order('created_at', { ascending: false });

        // Apply date filter
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);
        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        switch (dateFilter) {
          case 'today':
            query = query.gte('created_at', today.toISOString());
            break;
          case 'yesterday':
            query = query.gte('created_at', yesterday.toISOString()).lt('created_at', today.toISOString());
            break;
          case 'week':
            query = query.gte('created_at', lastWeek.toISOString());
            break;
          case 'month':
            query = query.gte('created_at', lastMonth.toISOString());
            break;
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        if (!data) {
          setOrders([]);
          return;
        }

        // Transform the data to match the Order type
        const transformedOrders: Order[] = data.map(order => ({
          ...order,
          items: order.order_items || [],
          created_at: order.created_at || new Date().toISOString(),
          id: order.id || '',
        }));

        setOrders(transformedOrders);
      } catch (err) {
        console.error('Error loading orders:', err);
        setError(err instanceof Error ? err.message : 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [profile?.franchise_id, dateFilter]);

  // Filter orders based on search term and filters
  const filteredOrders = orders.filter(order => {
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
    if (paymentFilter !== 'all' && order.payment_status !== paymentFilter) return false;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        order.table_number.toLowerCase().includes(searchLower) ||
        order.server_name.toLowerCase().includes(searchLower) ||
        order.items.some(item => item.name.toLowerCase().includes(searchLower))
      );
    }
    return true;
  });

  if (loading || franchiseLoading) {
    return <LoadingSpinner fullScreen text="Loading orders..." />;
  }

  if (error || franchiseError) {
    return <ErrorAlert message={error || franchiseError} />;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Orders</h1>
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
              className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="served">Served</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as PaymentStatus | 'all')}
              className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Payments</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="refunded">Refunded</option>
            </select>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.map(order => (
            <div key={order.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Table {order.table_number}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    order.status === 'served' ? 'bg-green-100 text-green-800' :
                    order.status === 'ready' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'preparing' ? 'bg-yellow-100 text-yellow-800' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.status}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    order.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                    order.payment_status === 'refunded' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {order.payment_status}
                  </span>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{item.name} x{item.quantity}</span>
                    <span>{settings?.currency || '₹'} {item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">Server: {order.server_name}</p>
                    {order.payment_method && (
                      <p className="text-sm text-gray-600">Payment Method: {order.payment_method}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">
                      Total: {settings?.currency || '₹'} {order.total}
                    </p>
                    {order.payment_status === 'unpaid' && (
                      <div className="mt-2 space-x-2">
                        <button
                          onClick={() => handlePaymentStatusUpdate(order.id, 'paid', 'cash')}
                          className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                          Mark Paid (Cash)
                        </button>
                        <button
                          onClick={() => handlePaymentStatusUpdate(order.id, 'paid', 'card')}
                          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          Mark Paid (Card)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredOrders.length === 0 && (
            <p className="text-center text-gray-500">No orders found</p>
          )}
        </div>
      </div>
    </Layout>
  );
}

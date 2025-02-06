import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Order } from '../types';
import { OrderService } from '../services/orderService';
import { PrintService } from '../services/printService';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDateTime, getTimeDifference } from '../utils/dateUtils';
import { Filter, SlidersHorizontal, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Kitchen() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<Order['status'] | 'all'>('all');
  const [groupByStatus, setGroupByStatus] = useState(false);

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
    const intervalId = setInterval(loadOrders, 10000); // Refresh every 10 seconds

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [profile?.franchise_id]);

  const handleStatusUpdate = async (orderId: string, status: Order['status']) => {
    try {
      await OrderService.updateOrderStatus(orderId, status);
      toast.success(`Order status updated to ${status}`);
      fetchOrders();
    } catch (err) {
      console.error('Error updating order status:', err);
      toast.error('Failed to update order status');
    }
  };

  
  const filteredOrders = orders.filter(order => {
    const statusMatch = statusFilter === 'all' ? true : order.status === statusFilter;
    // Only show relevant orders for kitchen
    const isKitchenOrder = ['pending', 'preparing'].includes(order.status);
    return statusMatch && isKitchenOrder;
  })
  // ?.filter(order => order.status !== 'ready' && order.status !== 'completed')
  .sort((a) => (a.status === 'pending' ? -1 : 1)); // Sort to show pending orders first

  // Sort orders by status
  const groupedOrders = groupByStatus
    ? filteredOrders.reduce((acc, order) => {
        if (!acc[order.status]) {
          acc[order.status] = [];
        }
        acc[order.status].push(order);
        return acc;
      }, {} as Record<Order['status'], Order[]>)
    : { all: filteredOrders };

  const kitchenStatuses: Order['status'][] = ['pending', 'preparing', 'ready'];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Kitchen Orders</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as Order['status'] | 'all')}
              className="text-sm border rounded-md px-2 py-1"
            >
              <option value="all">All Statuses</option>
              {kitchenStatuses.map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setGroupByStatus(!groupByStatus)}
            className={`flex items-center space-x-1 px-2 py-1 rounded-md text-sm ${
              groupByStatus ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Group</span>
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-gray-500">No orders found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(groupedOrders).map(([status, statusOrders]) => (
            <React.Fragment key={status}>
              {groupByStatus && (
                <div className="col-span-full bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600 rounded-md">
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                  <span className="ml-2 text-gray-400">({statusOrders.length})</span>
                </div>
              )}
              {statusOrders.map(order => (
                <div
                  key={order.id}
                  className="bg-white rounded-lg shadow-sm overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-medium">Table {order.table_number}</h3>
                        <p className="text-sm text-gray-500">
                          {formatDateTime(order.created_at)}
                          <span className="ml-2">
                            ({getTimeDifference(order.created_at)})
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            PrintService.printKOT(order)
                              .then(() => toast.success('KOT printed successfully'))
                              .catch(err => {
                                console.error('Error printing KOT:', err);
                                toast.error('Failed to print KOT');
                              });
                          }}
                          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                          title="Print KOT"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <div className={`px-2 py-1 rounded-full text-sm ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {order.status}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      {order.items?.map((item, index) => (
                        <div key={index} className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-gray-600">x{item.quantity}</div>
                            {item.notes && (
                              <div className="text-sm text-gray-500 mt-1">{item.notes}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end space-x-2">
                      {order.status === 'pending' && (
                        <button
                          onClick={() => handleStatusUpdate(order.id, 'preparing')}
                          className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                        >
                          Start Preparing
                        </button>
                      )}
                      {order.status === 'preparing' && (
                        <button
                          onClick={() => handleStatusUpdate(order.id, 'ready')}
                          className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
                        >
                          Mark Ready
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

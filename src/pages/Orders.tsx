import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFranchise } from '../contexts/FranchiseContext';
import { Order } from '../types';
import { OrderService } from '../services/orderService';
import { PrintService } from '../services/printService';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { formatDateTime, getTimeDifference } from '../utils/dateUtils';
import { 
  Filter, 
  SlidersHorizontal, 
  Printer, 
  Receipt, 
  Clock, 
  DollarSign, 
  ChevronRight, 
  Calendar,
  User,
  AlertCircle 
} from 'lucide-react';

const Orders = () => {
  const { profile } = useAuth();
  const { formatCurrency } = useFranchise();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<Order['status'] | 'all'>('all');
  const [groupByStatus, setGroupByStatus] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOrder = orders.find(order => order.id === selectedOrderId);

  const fetchOrders = useCallback(async () => {
    try {
      if (!profile?.franchise_id) {
        setError('No franchise found. Please contact your administrator.');
        return;
      }

      setLoading(true);
      setError(null);
      const fetchedOrders = await OrderService.getOrders(profile.franchise_id);
      setOrders(fetchedOrders);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [profile?.franchise_id]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Filter orders by status and search query
  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'all' ? true : order.status === statusFilter;
    const matchesSearch = searchQuery 
      ? order.table_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.server_name.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesStatus && matchesSearch;
  });

  const groupedOrders = groupByStatus
    ? filteredOrders.reduce((acc, order) => {
        if (!acc[order.status]) {
          acc[order.status] = [];
        }
        acc[order.status].push(order);
        return acc;
      }, {} as Record<Order['status'], Order[]>)
    : { all: filteredOrders };

  const orderStatuses: Order['status'][] = ['pending', 'preparing', 'ready', 'served', 'cancelled'];

  const getStatusColor = (status: Order['status']) => {
    const colors = {
      pending: 'yellow',
      preparing: 'blue',
      ready: 'green',
      served: 'purple',
      cancelled: 'red',
    };
    return colors[status] || 'gray';
  };

  const StatusPill = ({ status }: { status: Order['status'] }) => (
    <div className={`px-2 py-1 rounded-full text-sm bg-${getStatusColor(status)}-100 text-${getStatusColor(status)}-800`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </div>
  );

  const ActionButton = ({ icon: Icon, label, onClick, variant = 'default' }: any) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
        ${variant === 'primary' 
          ? 'bg-blue-600 text-white hover:bg-blue-700' 
          : 'text-gray-700 hover:bg-gray-100'}`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  const BillRow = ({ label, value, highlight = false, isDiscount = false }: any) => (
    <div className={`flex justify-between items-center py-1 ${highlight ? 'font-medium' : ''}`}>
      <span className={isDiscount ? 'text-red-600' : 'text-gray-600'}>{label}</span>
      <span className={isDiscount ? 'text-red-600' : ''}>
        {isDiscount ? '-' : ''}{formatCurrency(value)}
      </span>
    </div>
  );

  const handleStatusUpdate = async (orderId: string, newStatus: Order['status']) => {
    try {
      setLoading(true);
      await OrderService.updateOrderStatus(orderId, newStatus);
      // Fetch updated order to get new timestamps
      const updatedOrders = await OrderService.getOrders(profile?.franchise_id || '');
      setOrders(updatedOrders);
      toast.success(`Order status updated to ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update order status');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  const handlePaymentStatus = async (orderId: string, newPaymentStatus: Order['payment_status']) => {
    try {
      setLoading(true);
      await OrderService.updatePaymentStatus(orderId, newPaymentStatus);
      setOrders(orders.map(order => 
        order.id === orderId 
          ? { ...order, payment_status: newPaymentStatus }
          : order
      ));
      toast.success(`Payment status updated to ${newPaymentStatus}`);
    } catch (err) {
      toast.error('Failed to update payment status');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex">
      {/* Left sidebar with orders list */}
      <div className="w-96 border-r bg-white overflow-hidden flex flex-col">
        <div className="p-4 border-b space-y-4">
          <h2 className="text-lg font-semibold">Orders</h2>
          
          {/* Search input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search table or server..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 pl-9 border rounded-md text-sm"
            />
            <User className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as Order['status'] | 'all')}
                className="text-sm border rounded-md px-2 py-1.5"
              >
                <option value="all">All Statuses</option>
                {orderStatuses.map(status => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setGroupByStatus(!groupByStatus)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm
                ${groupByStatus ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>{groupByStatus ? 'Grouped' : 'Group by Status'}</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="p-4 flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          ) : orders.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 p-4">
              <Calendar className="w-12 h-12 mb-2 text-gray-400" />
              <p>No orders found</p>
              <p className="text-sm text-gray-400">Try adjusting your filters</p>
            </div>
          ) : (
            Object.entries(groupedOrders).map(([status, statusOrders]) => (
              <div key={status}>
                {groupByStatus && (
                  <div className="sticky top-0 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusPill status={status as Order['status']} />
                      <span className="text-gray-400">({statusOrders.length})</span>
                    </div>
                  </div>
                )}
                {statusOrders.map(order => (
                  <div
                    key={order.id}
                    className={`border-b cursor-pointer transition-colors
                      ${selectedOrderId === order.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">Table {order.table_number}</h3>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                            <Clock className="w-4 h-4" />
                            <span>{getTimeDifference(order.created_at)}</span>
                          </div>
                        </div>
                        <StatusPill status={order.status} />
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">{order.items?.length || 0} items</span>
                          <span className="text-gray-300">•</span>
                          <span className="text-gray-500">{order.server_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <span className={`font-medium ${order.payment_status === 'paid' ? 'text-green-600' : ''}`}>
                            {formatCurrency(order.total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right side order details */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {selectedOrder ? (
          <div className="h-full">
            <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
              <div className="bg-white shadow rounded-lg">
                {/* Header */}
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      Table {selectedOrder.table_number}
                      <StatusPill status={selectedOrder.status} />
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Server: {selectedOrder.server_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ActionButton
                      icon={Printer}
                      label="KOT"
                      onClick={async () => {
                        try {
                          // Fetch fresh order data before printing
                          const freshOrder = await OrderService.getOrderById(selectedOrder.id);
                          if (!freshOrder) {
                            throw new Error('Order not found');
                          }
                          console.log('Printing KOT for order:', {
                            id: freshOrder.id,
                            table: freshOrder.table_number,
                            items: freshOrder.items,
                            itemsCount: freshOrder.items?.length
                          });
                          // Configure for browser printing by default
                          PrintService.configure({ type: 'browser' });
                          await PrintService.printKOT(freshOrder);
                          toast.success('KOT printed successfully');
                        } catch (err: any) {
                          console.error('KOT print error:', err);
                          toast.error(`Failed to print KOT: ${err?.message || 'Unknown error'}`);
                        }
                      }}
                    />
                    <ActionButton
                      icon={Receipt}
                      label="Bill"
                      variant="primary"
                      onClick={async () => {
                        try {
                          // Fetch fresh order data before printing
                          const freshOrder = await OrderService.getOrderById(selectedOrder.id);
                          if (!freshOrder) {
                            throw new Error('Order not found');
                          }
                          console.log('Printing bill for order:', {
                            id: freshOrder.id,
                            table: freshOrder.table_number,
                            items: freshOrder.items,
                            itemsCount: freshOrder.items?.length,
                            total: freshOrder.total
                          });
                          // Configure for browser printing by default
                          PrintService.configure({ type: 'browser' });
                          await PrintService.printBill(freshOrder);
                          toast.success('Bill printed successfully');
                        } catch (err: any) {
                          console.error('Bill print error:', err);
                          toast.error(`Failed to print bill: ${err?.message || 'Unknown error'}`);
                        }
                      }}
                    />
                  </div>
                </div>

                {selectedOrder.payment_status !== 'paid' && (
                  <div className="px-6 py-4 border-b bg-gray-50">
                    <div className="grid grid-cols-2 gap-4">
                      <select
                        value={selectedOrder.status}
                        onChange={(e) => handleStatusUpdate(selectedOrder.id, e.target.value as Order['status'])}
                        className="px-3 py-2 border rounded-md text-sm w-full"
                      >
                        {orderStatuses.map(status => (
                          <option key={status} value={status}>
                            Set Status: {status.charAt(0).toUpperCase() + status.slice(1)}
                          </option>
                        ))}
                      </select>
                      <select
                        value={selectedOrder.payment_status}
                        onChange={(e) => handlePaymentStatus(selectedOrder.id, e.target.value as Order['payment_status'])}
                        className="px-3 py-2 border rounded-md text-sm w-full"
                      >
                        <option value="unpaid">Set Payment: Unpaid</option>
                        <option value="paid">Set Payment: Paid</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="divide-y">
                  {/* Order Items */}
                  <div className="px-6 py-4">
                    <h3 className="font-medium mb-4">Order Items</h3>
                    <div className="space-y-3">
                      {selectedOrder.items?.map((item, index) => (
                        <div key={index} className="flex items-start">
                          <div className="flex-1">
                            <div className="flex items-start">
                              <span className="font-medium flex-1">{item.name}</span>
                              <span className="text-gray-600 ml-2">×{item.quantity}</span>
                            </div>
                            {item.notes && (
                              <p className="text-sm text-gray-500 mt-1">{item.notes}</p>
                            )}
                          </div>
                          <div className="ml-4 text-right">
                            <div>{formatCurrency(item.price * item.quantity)}</div>
                            {item.tax_rate && (
                              <div className="text-xs text-gray-500">
                                Tax: {item.tax_rate}%
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="px-6 py-4 border-b">
                    <h3 className="font-medium mb-4">Order Timeline</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-[100px_1fr_auto] gap-2 items-center text-sm">
                        <div className="text-gray-600">Created:</div>
                        <div>{formatDateTime(selectedOrder.created_at)}</div>
                        <div className="text-gray-500">
                          ({getTimeDifference(selectedOrder.created_at)})
                        </div>
                      </div>
                      {selectedOrder.preparing_at && (
                        <div className="grid grid-cols-[100px_1fr_auto] gap-2 items-center text-sm">
                          <div className="text-gray-600">Preparing:</div>
                          <div>{formatDateTime(selectedOrder.preparing_at)}</div>
                          <div className="text-gray-500">
                            (took {getTimeDifference(selectedOrder.preparing_at, selectedOrder.created_at)})
                          </div>
                        </div>
                      )}
                      {selectedOrder.ready_at && (
                        <div className="grid grid-cols-[100px_1fr_auto] gap-2 items-center text-sm">
                          <div className="text-gray-600">Ready:</div>
                          <div>{formatDateTime(selectedOrder.ready_at)}</div>
                          <div className="text-gray-500">
                            (took {getTimeDifference(selectedOrder.ready_at, selectedOrder.preparing_at)})
                          </div>
                        </div>
                      )}
                      {selectedOrder.served_at && (
                        <div className="grid grid-cols-[100px_1fr_auto] gap-2 items-center text-sm">
                          <div className="text-gray-600">Served:</div>
                          <div>{formatDateTime(selectedOrder.served_at)}</div>
                          <div className="text-gray-500">
                            (took {getTimeDifference(selectedOrder.served_at, selectedOrder.ready_at)})
                          </div>
                        </div>
                      )}
                      {selectedOrder.paid_at && (
                        <div className="grid grid-cols-[100px_1fr_auto] gap-2 items-center text-sm">
                          <div className="text-gray-600">Paid:</div>
                          <div>{formatDateTime(selectedOrder.paid_at)}</div>
                          <div className="text-gray-500">
                            (took {getTimeDifference(selectedOrder.paid_at, selectedOrder.served_at)})
                          </div>
                        </div>
                      )}
                      {selectedOrder.cancelled_at && (
                        <div className="grid grid-cols-[100px_1fr_auto] gap-2 items-center text-sm">
                          <div className="text-red-600">Cancelled:</div>
                          <div>{formatDateTime(selectedOrder.cancelled_at)}</div>
                          <div className="text-gray-500">
                            ({getTimeDifference(selectedOrder.cancelled_at)})
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-6 py-4 border-b">
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
};

export default Orders;

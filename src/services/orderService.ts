import { supabase } from '../lib/supabase';
import { Order, CreateOrderRequest } from '../types';

const getCurrentTimestamp = () => {
  // Get current time in UTC
  const now = new Date();
  return now.toISOString();
};

export const OrderService = {
  async getOrders(franchiseId: string): Promise<Order[]> {
    const { data: orders, error } = await supabase
      .rpc('get_franchise_orders', { franchise_id_param: franchiseId })
      .returns<Order[]>();

    if (error) throw error;

    const orderIds = orders.map(order => order.id);
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .in('order_id', orderIds);

    if (itemsError) throw itemsError;

    const orderItemsMap = orderItems.reduce((acc, item) => {
      if (!acc[item.order_id]) {
        acc[item.order_id] = [];
      }
      acc[item.order_id].push(item);
      return acc;
    }, {} as Record<string, typeof orderItems>);

    return orders.map(order => ({
      ...order,
      items: orderItemsMap[order.id] || []
    }));
  },

  async getOrderById(orderId: string): Promise<Order | null> {
    const { data: order, error } = await supabase
      .rpc('get_order_by_id', { order_id_param: orderId })
      .single();

    if (error) throw error;

    return order as Order | null;
  },

  async placeOrder(orderRequest: CreateOrderRequest): Promise<Order> {
    const timestamp = getCurrentTimestamp();

    // Check for duplicate orders
    const { data: existingOrders, error: checkError } = await supabase
      .from('orders')
      .select('id')
      .eq('table_number', orderRequest.table_number)
      .eq('franchise_id', orderRequest.franchise_id)
      .eq('status', 'pending');

    if (checkError) throw checkError;

    if (existingOrders && existingOrders.length > 0) {
      throw new Error('Duplicate order detected. Please check the order status.');
    }

    // Create the order with UTC timestamps
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        table_number: orderRequest.table_number,
        server_id: orderRequest.server_id,
        server_name: orderRequest.server_name,
        franchise_id: orderRequest.franchise_id,
        status: 'pending' as const,
        payment_status: 'unpaid' as const,
        subtotal: orderRequest.subtotal,
        tax: orderRequest.tax,
        total: orderRequest.total,
        discount: orderRequest.discount || 0,
        additional_charges: orderRequest.additional_charges || 0,
        created_at: timestamp,
        updated_at: timestamp,
        pending_at: timestamp
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Insert order items
    if (order) {
      const orderItems = orderRequest.items.map(item => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        category: item.category,
        tax_rate: item.tax_rate
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;
    }

    return order;
  },

  async updateOrderStatus(orderId: string, status: Order['status']): Promise<void> {
    const timestamp = getCurrentTimestamp();
    const statusTimestamp = `${status}_at`;

    const { error } = await supabase
      .from('orders')
      .update({
        status,
        updated_at: timestamp,
        [statusTimestamp]: timestamp
      })
      .eq('id', orderId);

    if (error) throw error;
  },

  async updatePaymentStatus(
    orderId: string,
    paymentStatus: Order['payment_status'],
    paymentMethod?: string
  ): Promise<void> {
    const timestamp = getCurrentTimestamp();

    const { error } = await supabase
      .from('orders')
      .update({
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        updated_at: timestamp,
        paid_at: paymentStatus === 'paid' ? timestamp : null
      })
      .eq('id', orderId);

    if (error) throw error;
  }
};

export const isOrderEditable = (order: Order): boolean => {
  return order.payment_status !== 'paid';
};

export const updateOrder = async (orderId: string, updates: Partial<Order>): Promise<void> => {
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (fetchError) throw fetchError;
  if (!isOrderEditable(order)) {
    throw new Error('Cannot edit a paid order');
  }

  const { error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId);

  if (error) throw error;
};

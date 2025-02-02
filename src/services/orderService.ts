import { supabase } from '../lib/supabase';
import { Order, CreateOrderRequest } from '../types';

const getCurrentTimestamp = () => {
  // Get current time in IST
  const now = new Date();
  const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return istTime.toISOString();
};

export const OrderService = {
  async getOrders(franchiseId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*)
      `)
      .eq('franchise_id', franchiseId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async placeOrder(orderRequest: CreateOrderRequest): Promise<Order> {
    const timestamp = getCurrentTimestamp();
    
    // Create the order with proper timestamps
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
    if (!order) throw new Error('Failed to create order');

    // Insert order items
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(
        orderRequest.items.map(item => ({
          order_id: order.id,
          menu_item_id: item.menu_item_id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          category: item.category,
          tax_rate: item.tax_rate
        }))
      );

    if (itemsError) throw itemsError;

    // Fetch the complete order with items
    const { data: completeOrder, error: fetchError } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*)
      `)
      .eq('id', order.id)
      .single();

    if (fetchError) throw fetchError;
    if (!completeOrder) throw new Error('Failed to fetch complete order');

    return completeOrder as Order;
  },

  async updateOrderStatus(orderId: string, status: Order['status']): Promise<void> {
    const timestamp = getCurrentTimestamp();
    
    const updates: any = {
      status,
      updated_at: timestamp
    };

    // Add timestamp for the specific status
    updates[`${status}_at`] = timestamp;

    const { error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId);

    if (error) throw error;
  },

  async updatePaymentStatus(orderId: string, paymentStatus: Order['payment_status'], paymentMethod?: string): Promise<void> {
    const timestamp = getCurrentTimestamp();
    
    const updates: any = {
      payment_status: paymentStatus,
      updated_at: timestamp
    };

    if (paymentStatus === 'paid') {
      updates.paid_at = timestamp;
      if (paymentMethod) {
        updates.payment_method = paymentMethod;
      }
    }

    const { error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId);

    if (error) throw error;
  }
};

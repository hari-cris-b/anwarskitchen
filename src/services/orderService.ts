import { supabase } from '../lib/supabase';
import { Order, CreateOrderRequest } from '../types';

export class OrderService {
  static async getOrders(franchiseId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*)
      `)
      .eq('franchise_id', franchiseId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data as Order[]) || [];
  }

  static async placeOrder(orderRequest: CreateOrderRequest): Promise<Order> {
    // Create the order
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
        additional_charges: orderRequest.additional_charges || 0
      })
      .select()
      .single();

    if (orderError) throw new Error(orderError.message);
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

    if (itemsError) throw new Error(itemsError.message);

    // Fetch the complete order with items
    const { data: completeOrder, error: fetchError } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*)
      `)
      .eq('id', order.id)
      .single();

    if (fetchError) throw new Error(fetchError.message);
    if (!completeOrder) throw new Error('Failed to fetch complete order');

    return completeOrder as Order;
  }

  static async updateOrderStatus(orderId: string, status: Order['status']): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (error) throw new Error(error.message);
  }

  static async updatePaymentStatus(orderId: string, payment_status: Order['payment_status']): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({ payment_status })
      .eq('id', orderId);

    if (error) throw new Error(error.message);
  }
}

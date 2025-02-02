import { supabase } from '../lib/supabase';
import { Order, CreateOrderRequest } from '../types';

export class OrderService {
  static async placeOrder(order: CreateOrderRequest): Promise<{ data: Order | null; error: Error | null }> {
    try {
      // Create the order first
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          table_number: order.table_number,
          server_id: order.server_id,
          server_name: order.server_name,
          franchise_id: order.franchise_id,
          status: order.status,
          payment_status: order.payment_status,
          subtotal: order.subtotal,
          tax: order.tax,
          total: order.total
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Then create the order items
      const orderItems = order.items.map(item => ({
        order_id: orderData.id,
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

      // Return the complete order with items
      return { 
        data: { 
          ...orderData, 
          items: order.items 
        }, 
        error: null 
      };
    } catch (error) {
      console.error('Error placing order:', error);
      return { data: null, error: error as Error };
    }
  }

  static async getOrders(franchiseId: string): Promise<Order[]> {
    try {
      // Get all orders for the franchise
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('franchise_id', franchiseId)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Get all order items for these orders
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', orders.map(o => o.id));

      if (itemsError) throw itemsError;

      // Combine orders with their items
      return orders.map(order => ({
        ...order,
        items: items.filter(item => item.order_id === order.id)
      }));
    } catch (error) {
      console.error('Error getting orders:', error);
      return [];
    }
  }

  static async updateOrderStatus(orderId: string, status: Order['status']): Promise<void> {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  static async updatePaymentStatus(orderId: string, paymentStatus: Order['payment_status']): Promise<void> {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: paymentStatus })
        .eq('id', orderId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }
}

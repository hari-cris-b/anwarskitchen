import { supabase, withRetry, SupabaseError } from '../lib/supabase';
import type { Database } from '../types/database.types';

export type OrderStatus = Database['public']['Enums']['order_status'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export type MenuItem = Database['public']['Tables']['menu_items']['Row'];

export interface OrderWithItems extends Order {
  order_items: Array<OrderItem & {
    menu_items: MenuItem
  }>;
}

export interface OrderItemInput {
  menu_item_id: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface CreateOrderInput {
  franchise_id: string;
  table_number: string;
  server_id: string;
  server_name: string;
  customer_name?: string;
  notes?: string;
  subtotal: number;
  tax: number;
  discount: number;
  additional_charges: number;
  total: number;
  items: OrderItemInput[];
  payment_status?: string;
}

export interface UpdateOrderInput {
  id: string;
  status: OrderStatus;
  notes?: string;
}

export interface OrderFilter {
  status?: OrderStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface OrderQueryOptions {
  page?: number;
  limit?: number;
  filter?: OrderFilter;
}

const ORDER_CACHE_DURATION = 30_000; // 30 seconds
const orderCache = new Map<string, {
  orders: OrderWithItems[];
  timestamp: number;
  total: number;
}>();

export interface SalesReportData {
  dailySales: {
    date: string;
    total: number;
    orderCount: number;
  }[];
  topItems: {
    item_name: string;
    quantity: number;
    total: number;
  }[];
  summary: {
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
  };
}

export const orderService = {
  async getSalesReport(franchiseId: string, startDate: string, endDate: string): Promise<SalesReportData> {
    try {
      const { data: orders, error } = await withRetry(
        async () => await supabase
          .from('orders')
          .select(`
            id,
            franchise_id,
            total,
            created_at,
            order_items!inner (
              id,
              quantity,
              price_at_time,
              menu_items:menu_items!inner (
                id,
                name
              )
            )
          `)
          .eq('orders.franchise_id', franchiseId)
          .gte('orders.created_at', startDate)
          .lte('orders.created_at', endDate)
      );

      if (error) throw error;
      if (!orders) throw new Error('No orders data received');

      // Process daily sales
      const dailySalesMap = new Map<string, { total: number; orderCount: number }>();
      const itemSalesMap = new Map<string, { quantity: number; total: number }>();
      let totalSales = 0;

      orders.forEach((order) => {
        const date = new Date(order.created_at).toISOString().split('T')[0];
        const dailyData = dailySalesMap.get(date) || { total: 0, orderCount: 0 };
        dailyData.total += order.total;
        dailyData.orderCount += 1;
        dailySalesMap.set(date, dailyData);
        totalSales += order.total;

        // Process items
        order.order_items.forEach((item: any) => {
          const itemData = itemSalesMap.get(item.menu_items.name) || { quantity: 0, total: 0 };
          itemData.quantity += item.quantity;
          itemData.total += item.price_at_time * item.quantity;
          itemSalesMap.set(item.menu_items.name, itemData);
        });
      });

      // Format daily sales
      const dailySales = Array.from(dailySalesMap.entries()).map(([date, data]) => ({
        date,
        ...data
      })).sort((a, b) => a.date.localeCompare(b.date));

      // Format top items
      const topItems = Array.from(itemSalesMap.entries())
        .map(([item_name, data]) => ({
          item_name,
          ...data
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      return {
        dailySales,
        topItems,
        summary: {
          totalSales,
          totalOrders: orders.length,
          averageOrderValue: totalSales / orders.length
        }
      };
    } catch (err) {
      console.error('Error fetching sales report:', err);
      throw new SupabaseError('Failed to fetch sales report', err);
    }
  },
  async getOrders(
    franchiseId: string,
    options: OrderQueryOptions = {}
  ): Promise<{ orders: OrderWithItems[]; total: number }> {
    try {
      const { page = 1, limit = 10, filter } = options;
      const offset = (page - 1) * limit;

      const cacheKey = `${franchiseId}-${JSON.stringify({ page, limit, filter })}`;
      const cached = orderCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < ORDER_CACHE_DURATION) {
        return cached;
      }

      // Use the stored procedure that handles joins correctly
      // First get the total count for pagination
      const { count: totalCount, error: countError } = await withRetry(
        async () => await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('franchise_id', franchiseId)
      );

      if (countError) throw countError;
      if (totalCount === null) throw new Error('Failed to get order count');

      // Get orders with items using the stored procedure
      const { data, error } = await withRetry(
        async () => await supabase
          .rpc('get_orders_with_items', {
            p_franchise_id: franchiseId,
            p_limit: limit,
            p_offset: offset
          })
      );

      if (error) throw error;
      if (!data) throw new Error('No orders data received');

      // Transform the data to match OrderWithItems structure
      const orders: OrderWithItems[] = data.map((order: any) => {
        // Get order items from JSONB data
        let orderItems = [];
        try {
          const items = typeof order.order_items === 'string'
            ? JSON.parse(order.order_items)
            : order.order_items;

          orderItems = (items || []).map((item: any) => ({
            id: item.id,
            order_id: item.order_id,
            menu_item_id: item.menu_item_id,
            quantity: item.quantity,
            price_at_time: item.price_at_time,
            notes: item.notes,
            created_at: item.created_at,
            menu_items: {
              id: item.menu_items.id,
              franchise_id: item.menu_items.franchise_id,
              name: item.menu_items.name,
              description: item.menu_items.description || null,
              price: item.menu_items.price,
              category: item.menu_items.category,
              is_available: item.menu_items.is_available,
              created_at: item.menu_items.created_at,
              updated_at: item.menu_items.updated_at
            }
          }));
        } catch (err) {
          console.error('Error parsing order items:', err);
          orderItems = [];
        }

        return {
          id: order.id,
          franchise_id: order.franchise_id,
          status: order.status as OrderStatus,
          table_number: order.table_number,
          customer_name: order.customer_name,
          server_id: order.server_id,
          server_name: order.server_name,
          notes: order.notes,
          subtotal: order.subtotal,
          tax: order.tax,
          discount: order.discount,
          additional_charges: order.additional_charges,
          total: order.total,
          payment_status: order.payment_status,
          created_at: order.created_at,
          updated_at: order.updated_at,
          order_items: orderItems
        };
      });

      const result = { orders, total: totalCount };
      orderCache.set(cacheKey, { ...result, timestamp: Date.now() });
      return result;

    } catch (err) {
      console.error('Error fetching orders:', err);
      throw new SupabaseError('Failed to fetch orders', err);
    }
  },

  async createOrder(orderInput: CreateOrderInput): Promise<OrderWithItems> {
    try {
      const { data: order, error: orderError } = await withRetry(
        async () => await supabase
          .from('orders')
          .insert([{
            franchise_id: orderInput.franchise_id,
            table_number: orderInput.table_number,
            server_id: orderInput.server_id,
            server_name: orderInput.server_name,
            status: 'pending',
            payment_status: orderInput.payment_status || 'unpaid',
            customer_name: orderInput.customer_name,
            notes: orderInput.notes,
            subtotal: orderInput.subtotal,
            tax: orderInput.tax,
            discount: orderInput.discount,
            additional_charges: orderInput.additional_charges,
            total: orderInput.total
          }])
          .select()
          .single()
      );

      if (orderError) throw orderError;
      if (!order) throw new Error('Failed to create order');

      const orderItems = orderInput.items.map(item => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        price_at_time: item.price,
        notes: item.notes
      }));

      const { error: itemsError } = await withRetry(
        async () => await supabase
          .from('order_items')
          .insert(orderItems)
      );

      if (itemsError) throw itemsError;

      // Get complete order using stored procedure
      const { data: completeOrder, error: fetchError } = await withRetry(
        async () => await supabase
          .rpc('get_orders_with_items', {
            p_franchise_id: orderInput.franchise_id,
            p_limit: 1,
            p_offset: 0
          })
      );

      if (fetchError) throw fetchError;
      if (!completeOrder) throw new Error('Failed to fetch created order');

      // Clear relevant caches
      Array.from(orderCache.keys())
        .filter(key => key.startsWith(orderInput.franchise_id))
        .forEach(key => orderCache.delete(key));

      return completeOrder as OrderWithItems;

    } catch (err) {
      console.error('Error creating order:', err);
      throw new SupabaseError('Failed to create order', err);
    }
  },

  async updateOrder({ id, status, notes }: UpdateOrderInput): Promise<OrderWithItems> {
    try {
      const { error } = await withRetry(
        async () => await supabase
          .from('orders')
          .update({
            status,
            notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
      );

      if (error) throw error;
      orderCache.clear();

      // Fetch and return the updated order
      // Get updated order using stored procedure
      const { data, error: fetchError } = await withRetry(
        async () => {
          // First get the franchise_id for the order
          const { data: orderData } = await supabase
            .from('orders')
            .select('franchise_id')
            .eq('id', id)
            .single();

          if (!orderData) throw new Error('Order not found');

          // Then get complete order data using the stored procedure
          return await supabase
            .rpc('get_orders_with_items', {
              p_franchise_id: orderData.franchise_id,
              p_limit: 1,
              p_offset: 0
            });
        }
      );

      if (fetchError) throw fetchError;
      if (!data || !data.length) throw new Error('Failed to fetch updated order');

      const updatedOrder = data[0];

      if (fetchError) throw fetchError;
      if (!updatedOrder) throw new Error('Failed to fetch updated order');

      return updatedOrder as OrderWithItems;

    } catch (err) {
      console.error('Error updating order:', err);
      throw new SupabaseError('Failed to update order', err);
    }
  }
};

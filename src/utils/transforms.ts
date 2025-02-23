import type { Order, OrderItem, OrderWithItems, OrderStatus } from '../types/orders';

export const transformOrder = (rawOrder: any): OrderWithItems => {
  // Transform order items
  const orderItems: OrderItem[] = ((typeof rawOrder.order_items === 'string'
    ? JSON.parse(rawOrder.order_items)
    : rawOrder.order_items) || []).map((item: any) => ({
    id: item.id,
    order_id: item.order_id,
    menu_item_id: item.menu_item_id,
    quantity: item.quantity,
    price_at_time: item.price_at_time,
    notes: item.notes || null,
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

  // Transform main order
  const order: OrderWithItems = {
    id: rawOrder.id,
    franchise_id: rawOrder.franchise_id,
    table_number: rawOrder.table_number,
    customer_name: rawOrder.customer_name,
    server_id: rawOrder.server_id,
    server_name: rawOrder.server_name,
    status: rawOrder.status as OrderStatus,
    notes: rawOrder.notes,
    subtotal: rawOrder.subtotal,
    tax: rawOrder.tax,
    discount: rawOrder.discount,
    additional_charges: rawOrder.additional_charges,
    total: rawOrder.total,
    payment_status: rawOrder.payment_status,
    created_at: rawOrder.created_at,
    updated_at: rawOrder.updated_at,
    order_items: orderItems
  };

  return order;
};

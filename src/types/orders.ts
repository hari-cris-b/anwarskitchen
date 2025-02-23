export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  franchise_id: string;
  table_number: string | null;
  customer_name: string | null;
  server_id: string | null;
  server_name: string | null;
  status: OrderStatus;
  notes: string | null;
  subtotal: number;
  tax: number;
  discount: number;
  additional_charges: number;
  total: number;
  payment_status: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  price_at_time: number;
  notes: string | null;
  created_at: string;
  menu_items: {
    id: string;
    franchise_id: string;
    name: string;
    description: string | null;
    price: number;
    category: string;
    is_available: boolean;
    created_at: string;
    updated_at: string;
  };
}

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

export interface OrderSummary {
  id: string;
  customer_name: string | null;
  table_number: string | null;
  total: number;
  status: OrderStatus;
  created_at: string;
  item_count: number;
}

export type OrderSubscriptionCallback = (
  order: OrderWithItems & {
    previousStatus?: string;
    isNewToPreparing?: boolean;
    _updateId?: string;
  }
) => void;

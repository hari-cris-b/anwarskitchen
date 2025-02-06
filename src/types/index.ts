export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  gstRate: number;
  franchise_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderItem extends MenuItem {
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  table_number: string;
  server_id: string;
  server_name: string;
  franchise_id: string;
  items: OrderItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  additional_charges: number;
  discount: number;
  roundoff: number;
  total: number;
  status: OrderStatus;
  created_at: string;
  payment_status: PaymentStatus;
  payment_method?: PaymentMethod;
}

export interface BillCalculation {
  subtotal: number;
  cgst: number;
  sgst: number;
  additional_charges: number;
  discount: number;
  roundoff: number;
  total: number;
}

export interface DailySales {
  id: string;
  franchise_id: string;
  date: string;
  total_orders: number;
  total_sales: number;
  total_tax: number;
  total_discount: number;
  net_sales: number;
  created_at: string;
  updated_at: string;
}

export interface FranchiseSettings {
  id: string;
  franchise_id: string;
  currency: string;
  tax_rate: number;
  default_discount: number;
  opening_time: string;
  closing_time: string;
  timezone: string;
  menu_categories: string[];
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  franchise_id: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type PaymentMethod = 'cash' | 'card' | 'upi';
export type PaymentStatus = 'pending' | 'completed' | 'cancelled';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
export type UserRole = 'admin' | 'manager' | 'staff';

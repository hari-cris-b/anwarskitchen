import { User } from '@supabase/supabase-js';
import { ReactNode } from 'react';

export interface Category {
  id: string;
  name: string;
}

export type UserRole = 'admin' | 'manager' | 'staff';

export interface Profile {
  id: string;
  email: string;
  franchise_id: string;
  role: UserRole;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  phone?: string;
  is_active: boolean;
  joining_date?: string;
  salary?: number;
  shift?: 'morning' | 'evening' | 'night';
  franchise_id: string;
  last_sign_in_at?: string | null;
}

export interface GetStaffWithAuthResponse {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  is_active: boolean;
  joining_date: string | null;
  salary: number | null;
  shift: 'morning' | 'evening' | 'night' | null;
  franchise_id: string;
  last_sign_in_at: string | null;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string | null;
  image_url: string | null;
  is_available: boolean;
  tax_rate: number;
  franchise_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface OrderItem {
  id?: string;
  order_id?: string;
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  tax_rate?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BillCalculation {
  subtotal: number;
  tax: number;
  discount: number;
  additionalCharges: number;
  total: number;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';
export type PaymentMethod = 'cash' | 'card' | 'upi';

export interface BaseOrder {
  table_number: string;
  server_id: string;
  server_name: string;
  franchise_id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method?: PaymentMethod;
  subtotal: number;
  tax: number;
  discount: number;
  additional_charges: number;
  total: number;
}

export interface Order extends BaseOrder {
  id: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  pending_at: string;
  preparing_at: string | null;
  ready_at: string | null;
  served_at: string | null;
  paid_at: string | null;
  cancelled_at?: string | null;
}

export interface CreateOrderRequest extends BaseOrder {
  items: Omit<OrderItem, 'id' | 'created_at' | 'updated_at'>[];
}

export interface FranchiseSettings {
  id: string;
  franchise_id: string;
  franchise_code: string;
  agreement_start_date: Date | null;
  agreement_end_date: Date | null;
  royalty_percentage: number;
  security_deposit: number;
  brand_audit_score?: number;
  last_audit_date?: Date;
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

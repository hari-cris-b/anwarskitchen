import { Database } from './types/database.types';

export type OrderStatus = Database['public']['Enums']['order_status'];
export type UserRole = Database['public']['Enums']['user_role'];

export interface MenuItem {
  id: string;
  franchise_id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  is_available: boolean;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface BillCalculation {
  subtotal: number;
  tax: number;
  discount: number;
  additionalCharges: number;
  total: number;
}

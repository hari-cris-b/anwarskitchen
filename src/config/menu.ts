import { v4 as uuidv4 } from 'uuid';
import { MenuItem } from '../types';

// Define the base menu item type without the database-specific fields
type BaseMenuItem = Omit<MenuItem, 'id' | 'franchise_id' | 'created_at' | 'updated_at'>;

export const MENU_ITEMS: BaseMenuItem[] = [
  { name: 'Masala Dosa', price: 120, category: 'South Indian', tax_rate: 5, is_active: true },
  { name: 'Butter Naan', price: 40, category: 'North Indian', tax_rate: 5, is_active: true },
  { name: 'Paneer Butter Masala', price: 220, category: 'North Indian', tax_rate: 5, is_active: true },
  { name: 'Veg Biryani', price: 180, category: 'Rice', tax_rate: 5, is_active: true },
  { name: 'French Fries', price: 99, category: 'Snacks', tax_rate: 18, is_active: true },
  { name: 'Coca Cola', price: 40, category: 'Beverages', tax_rate: 18, is_active: true },
  { name: 'Lassi', price: 60, category: 'Beverages', tax_rate: 5, is_active: true },
];

export const CATEGORIES = Array.from(new Set(MENU_ITEMS.map(item => item.category)));

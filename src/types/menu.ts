export type Category = 'Main Course' | 'Appetizers' | 'Desserts' | 'Beverages' | 'Breads' | string;

export interface BaseMenuItem {
  name: string;
  description: string | null;
  price: number;
  category: Category;
  image_url: string | null;
  is_available: boolean;
  is_active: boolean;
  tax_rate: number;
}

export interface MenuItem {
  id: string;
  franchise_id: string;
  name: string;
  description: string | null;
  price: number;
  category: Category;
  image_url: string | null;
  is_available: boolean;
  is_active: boolean;
  tax_rate: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryGroup {
  name: Category;
  items: MenuItem[];
}

export interface MenuItemCreate {
  franchise_id: string;
  name: string;
  description?: string | null;
  price: number;
  category: Category;
  image_url?: string | null;
  is_available?: boolean;
  is_active?: boolean;
  tax_rate: number;
}

export interface MenuItemUpdate {
  id: string;
  name?: string;
  description?: string | null;
  price?: number;
  category?: Category;
  image_url?: string | null;
  is_available?: boolean;
  is_active?: boolean;
  tax_rate?: number;
}

export interface MenuSummary {
  total_items: number;
  categories: {
    name: Category;
    count: number;
  }[];
  available_items: number;
}

// Alias for backward compatibility
export type MenuCategory = CategoryGroup;

export interface MenuItem {
  id: string;
  franchise_id: string;
  name: string;
  price: number;
  category: string;
  description: string | null;
  is_available: boolean;
  tax_rate: number;
  image_url: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface MenuItemFormData {
  name: string;
  price: number;
  category: string;
  description: string | null;
  is_available: boolean;
  tax_rate: number;
  image_url?: string | null;
  is_active?: boolean;
}

export interface MenuItemCreateDTO {
  franchise_id: string;
  name: string;
  price: number;
  category: string;
  description: string | null;
  is_available: boolean;
  tax_rate: number;
  image_url: string | null;
  is_active: boolean;
}

export interface MenuSettings {
  currency: string;
  tax_rate: number;
  categories: Category[];
}

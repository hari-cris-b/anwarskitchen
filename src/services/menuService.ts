import { supabase } from '../lib/supabase';
import { MenuItem } from '../types';
import { MENU_ITEMS } from '../config/menu';
import { v4 as uuidv4 } from 'uuid';

export class MenuService {
  static async initializeMenuItems(franchiseId: string): Promise<void> {
    try {
      // Check if menu items exist for this franchise
      const { data: existingItems, error: checkError } = await supabase
        .from('menu_items')
        .select('id')
        .eq('franchise_id', franchiseId);

      if (checkError) throw checkError;

      // If no menu items exist, insert default ones
      if (!existingItems || existingItems.length === 0) {
        const now = new Date().toISOString();
        const defaultItems = MENU_ITEMS.map(item => ({
          id: uuidv4(),
          franchise_id: franchiseId,
          name: item.name,
          price: item.price,
          category: item.category,
          tax_rate: item.tax_rate,
          is_active: true,
          created_at: now,
          updated_at: now
        }));

        const { error: insertError } = await supabase
          .from('menu_items')
          .insert(defaultItems);

        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Error initializing menu items:', error);
      throw error;
    }
  }

  static async getMenuItems(franchiseId: string): Promise<MenuItem[]> {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('franchise_id', franchiseId)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        // Try to initialize menu items if none exist
        await this.initializeMenuItems(franchiseId);
        
        // Try to fetch again after initialization
        const { data: newData, error: retryError } = await supabase
          .from('menu_items')
          .select('*')
          .eq('franchise_id', franchiseId)
          .order('category')
          .order('name');
          
        if (retryError) throw retryError;
        return newData || [];
      }

      return data;
    } catch (error) {
      console.error('Error getting menu items:', error);
      throw error;
    }
  }

  static async addMenuItem(franchiseId: string, menuItem: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>): Promise<MenuItem> {
    try {
      const now = new Date().toISOString();
      const newItem = {
        ...menuItem,
        franchise_id: franchiseId,
        created_at: now,
        updated_at: now,
        is_active: true
      };

      const { data, error } = await supabase
        .from('menu_items')
        .insert([newItem])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding menu item:', error);
      throw error;
    }
  }

  static async updateMenuItem(itemId: string, updates: Partial<MenuItem>): Promise<MenuItem> {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating menu item:', error);
      throw error;
    }
  }

  static async deleteMenuItems(itemIds: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .in('id', itemIds);
        
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting menu items:', error);
      throw error;
    }
  }

  static async toggleItemAvailability(itemId: string, isAvailable: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ 
          is_available: isAvailable,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);
        
      if (error) throw error;
    } catch (error) {
      console.error('Error toggling item availability:', error);
      throw error;
    }
  }

  static async getBulkCategories(franchiseId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('category')
        .eq('franchise_id', franchiseId)
        .order('category');

      if (error) throw error;
      return Array.from(new Set(data.map(item => item.category)));
    } catch (error) {
      console.error('Error getting categories:', error);
      throw error;
    }
  }
}

import { supabase } from '../lib/supabase';
import { MenuItem } from '../types';
import { MENU_ITEMS } from '../config/menu';
import { v4 as uuidv4 } from 'uuid';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const menuCache = new Map<string, { items: MenuItem[], timestamp: number }>();

export class MenuService {
  private static isCacheValid(franchiseId: string): boolean {
    const cached = menuCache.get(franchiseId);
    if (!cached) return false;
    return Date.now() - cached.timestamp < CACHE_TTL;
  }

  private static setCache(franchiseId: string, items: MenuItem[]) {
    menuCache.set(franchiseId, {
      items,
      timestamp: Date.now()
    });
  }

  private static async checkAndInitializeMenu(franchiseId: string): Promise<void> {
    try {
      // Check if any menu items exist
      const { count, error: countError } = await supabase
        .from('menu_items')
        .select('*', { count: 'exact', head: true })
        .eq('franchise_id', franchiseId);

      if (countError) throw countError;

      // If no items exist, initialize with default menu
      if (!count) {
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
      console.error('Error checking/initializing menu:', error);
      throw error;
    }
  }

  static async getMenuItems(franchiseId: string): Promise<MenuItem[]> {
    try {
      // Check cache first
      if (this.isCacheValid(franchiseId)) {
        const cached = menuCache.get(franchiseId);
        if (cached) return cached.items;
      }

      // Ensure menu is initialized
      await this.checkAndInitializeMenu(franchiseId);

      // Fetch menu items
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('franchise_id', franchiseId)
        .order('category')
        .order('name');

      if (error) throw error;

      const items = data || [];
      this.setCache(franchiseId, items);
      return items;
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
      
      // Invalidate cache
      menuCache.delete(franchiseId);
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

      // Invalidate cache for the franchise
      if (data.franchise_id) {
        menuCache.delete(data.franchise_id);
      }
      return data;
    } catch (error) {
      console.error('Error updating menu item:', error);
      throw error;
    }
  }

  static async deleteMenuItems(itemIds: string[]): Promise<void> {
    try {
      // First get franchise_id to invalidate cache later
      const { data: items, error: fetchError } = await supabase
        .from('menu_items')
        .select('franchise_id')
        .in('id', itemIds)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('menu_items')
        .delete()
        .in('id', itemIds);
        
      if (error) throw error;

      // Invalidate cache
      if (items?.franchise_id) {
        menuCache.delete(items.franchise_id);
      }
    } catch (error) {
      console.error('Error deleting menu items:', error);
      throw error;
    }
  }

  static async toggleItemAvailability(itemId: string, isAvailable: boolean): Promise<void> {
    try {
      // First get franchise_id to invalidate cache later
      const { data: item, error: fetchError } = await supabase
        .from('menu_items')
        .select('franchise_id')
        .eq('id', itemId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('menu_items')
        .update({ 
          is_available: isAvailable,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);
        
      if (error) throw error;

      // Invalidate cache
      if (item?.franchise_id) {
        menuCache.delete(item.franchise_id);
      }
    } catch (error) {
      console.error('Error toggling item availability:', error);
      throw error;
    }
  }

  static async getBulkCategories(franchiseId: string): Promise<string[]> {
    try {
      const items = await this.getMenuItems(franchiseId);
      return Array.from(new Set(items.map(item => item.category))).sort();
    } catch (error) {
      console.error('Error getting categories:', error);
      throw error;
    }
  }
}

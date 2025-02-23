import { supabase } from '../lib/supabase';
import { withRetry } from '../lib/supabase';
import {
  MenuItem,
  MenuItemCreate,
  MenuItemUpdate,
  MenuSummary,
  BaseMenuItem
} from '../types/index';

export class MenuServiceError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'MenuServiceError';
  }
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Cache configuration
const CACHE_DURATION = 60_000; // 1 minute
const MIN_BETWEEN_REQUESTS = 2000; // 2 seconds

class MenuCache {
  private cache = new Map<string, CacheEntry<MenuItem[]>>();
  private lastRequestTime = 0;

  isValid(franchiseId: string): boolean {
    const entry = this.cache.get(franchiseId);
    return entry !== undefined && 
           Date.now() - entry.timestamp < CACHE_DURATION;
  }

  async shouldWaitForRequest(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < MIN_BETWEEN_REQUESTS) {
      await new Promise(resolve => setTimeout(resolve, MIN_BETWEEN_REQUESTS - timeSinceLastRequest));
    }
    this.lastRequestTime = now;
  }

  get(franchiseId: string): MenuItem[] | null {
    const entry = this.cache.get(franchiseId);
    return entry && this.isValid(franchiseId) ? entry.data : null;
  }

  set(franchiseId: string, data: MenuItem[]) {
    this.cache.set(franchiseId, {
      data,
      timestamp: Date.now()
    });
  }

  clear() {
    this.cache.clear();
  }
}

const menuCache = new MenuCache();

function convertToMenuItem(data: BaseMenuItem & { tax_rate?: number }): MenuItem {
  return {
    ...data,
    tax_rate: data.tax_rate || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

export const menuService = {
  async getMenuItems(franchiseId: string): Promise<MenuItem[]> {
    try {
      const cachedData = menuCache.get(franchiseId);
      if (cachedData) return cachedData;

      await menuCache.shouldWaitForRequest();

      const { data: menuData, error } = await withRetry(async () => await supabase
        .from('menu_items')
        .select('*')
        .eq('franchise_id', franchiseId)
        .order('category')
        .order('name'));

      if (error) throw new MenuServiceError(error.message, error.code);

      const items = (menuData || []).map(convertToMenuItem);
      menuCache.set(franchiseId, items);
      return items;

    } catch (err) {
      console.error('Error fetching menu items:', err);
      throw err instanceof MenuServiceError ? err : new MenuServiceError('Failed to fetch menu items');
    }
  },

  async addMenuItem(itemData: MenuItemCreate): Promise<MenuItem> {
    try {
      const { data, error } = await withRetry(
        async () => await supabase
          .from('menu_items')
          .insert([itemData])
          .select()
          .limit(1)
      );

      if (error) throw new MenuServiceError(error.message, error.code);
      if (!data?.length) throw new MenuServiceError('Failed to create menu item');

      menuCache.clear();
      return convertToMenuItem(data[0]);

    } catch (err) {
      console.error('Error adding menu item:', err);
      throw err instanceof MenuServiceError ? err : new MenuServiceError('Failed to add menu item');
    }
  },

  async updateMenuItem(itemData: MenuItemUpdate): Promise<MenuItem> {
    try {
      const { data, error } = await withRetry(
        async () => await supabase
          .from('menu_items')
          .update({
            ...itemData,
            updated_at: new Date().toISOString()
          })
          .eq('id', itemData.id)
          .select()
          .limit(1)
      );

      if (error) throw new MenuServiceError(error.message, error.code);
      if (!data?.length) throw new MenuServiceError('Menu item not found');

      menuCache.clear();
      return convertToMenuItem(data[0]);

    } catch (err) {
      console.error('Error updating menu item:', err);
      throw err instanceof MenuServiceError ? err : new MenuServiceError('Failed to update menu item');
    }
  },

  async deleteMenuItem(itemId: string): Promise<void> {
    try {
      const { error } = await withRetry(
        async () => await supabase
          .from('menu_items')
          .delete()
          .eq('id', itemId)
      );

      if (error) throw new MenuServiceError(error.message, error.code);
      menuCache.clear();

    } catch (err) {
      console.error('Error deleting menu item:', err);
      throw err instanceof MenuServiceError ? err : new MenuServiceError('Failed to delete menu item');
    }
  },

  async getMenuSummary(franchiseId: string): Promise<MenuSummary> {
    try {
      const { data, error } = await withRetry(
        async () => await supabase
          .rpc('get_menu_summary', { franchise_id_input: franchiseId })
      );

      if (error) throw new MenuServiceError(error.message, error.code);
      return data as MenuSummary;

    } catch (err) {
      console.error('Error getting menu summary:', err);
      throw err instanceof MenuServiceError ? err : new MenuServiceError('Failed to get menu summary');
    }
  }
};

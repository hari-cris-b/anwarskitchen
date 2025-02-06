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
        .rpc('get_franchise_menu_items', { franchise_id_param: franchiseId });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        // Try to initialize menu items if none exist
        await this.initializeMenuItems(franchiseId);
        
        // Try to fetch again after initialization
        const { data: newData, error: retryError } = await supabase
          .rpc('get_franchise_menu_items', { franchise_id_param: franchiseId });
          
        if (retryError) throw retryError;
        return newData || [];
      }

      return data;
    } catch (error) {
      console.error('Error getting menu items:', error);
      throw error;
    }
  }
}

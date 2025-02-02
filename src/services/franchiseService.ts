import { supabase } from '../lib/supabase';
import type { FranchiseSettings } from '../types';

class FranchiseService {
  async getFranchiseSettings(franchiseId: string): Promise<FranchiseSettings> {
    try {
      // First check if the user has an active session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session. Please log in.');
      }

      // Try to get existing settings
      const { data, error } = await supabase
        .from('franchise_settings')
        .select('*')
        .eq('franchise_id', franchiseId)
        .single();

      if (error) {
        if (error.code === '42501') {
          throw new Error('Permission denied. Please check your access rights.');
        }
        
        // If no settings found, create default settings
        const defaultSettings: FranchiseSettings = {
          id: crypto.randomUUID(),
          franchise_id: franchiseId,
          currency: 'INR',
          tax_rate: 5,
          default_discount: 0,
          opening_time: '09:00',
          closing_time: '22:00',
          timezone: 'Asia/Kolkata',
          menu_categories: ['All', 'South Indian', 'North Indian', 'Chinese', 'Beverages'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Try to create the settings
        const { data: newData, error: createError } = await supabase
          .from('franchise_settings')
          .insert([defaultSettings])
          .select()
          .single();

        if (createError) {
          if (createError.code === '42501') {
            throw new Error('Permission denied while creating settings. Please check your access rights.');
          }
          throw new Error(`Failed to create franchise settings: ${createError.message}`);
        }

        return newData;
      }

      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Handle aborted request
        throw new Error('Request was cancelled');
      }
      console.error('Error in getFranchiseSettings:', error);
      throw error;
    }
  }

  async updateFranchiseSettings(franchiseId: string, settings: Partial<FranchiseSettings>): Promise<FranchiseSettings> {
    const { data, error } = await supabase
      .from('franchise_settings')
      .update({ ...settings, updated_at: new Date().toISOString() })
      .eq('franchise_id', franchiseId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }
}

export const franchiseService = new FranchiseService();

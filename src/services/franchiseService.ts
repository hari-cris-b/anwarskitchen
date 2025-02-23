import { supabase } from '../lib/supabase';
import {
  Franchise,
  FranchiseSettings,
  FranchiseCreateInput,
  FranchiseUpdateInput,
  FranchiseDetail,
  FranchiseOverview
} from '../types/franchise';
import { Profile } from '../types/auth';
import { withRetry } from '../lib/supabase';
export class FranchiseServiceError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'FranchiseServiceError';
  }
}

interface FranchiseWithSettings {
  franchise: {
    id: string;
    name: string;
    address: string;
    created_at: string;
    updated_at: string;
    settings: FranchiseSettings;
  };
}

export const franchiseService = {
  async getFranchise(id: string): Promise<Franchise> {
    const { data, error } = await withRetry(
      async () => await supabase
        .from('franchises')
        .select('*, settings:franchise_settings(*)')
        .eq('id', id)
        .single()
    );

    if (error) throw new FranchiseServiceError(error.message, error.code);
    if (!data) throw new FranchiseServiceError('Franchise not found');

    return data as Franchise;
  },

  async createFranchise(franchiseData: FranchiseCreateInput): Promise<Franchise> {
    const { data, error } = await withRetry(
      async () => await supabase
        .from('franchises')
        .insert([{
          name: franchiseData.name,
          address: franchiseData.address
        }])
        .select()
        .single()
    );

    if (error) throw new FranchiseServiceError(error.message, error.code);
    if (!data) throw new FranchiseServiceError('Failed to create franchise');

    const franchiseId = data.id;

    // Create settings
    const { error: settingsError } = await withRetry(
      async () => await supabase
        .from('franchise_settings')
        .insert([{
          franchise_id: franchiseId,
          ...franchiseData.settings
        }])
    );

    if (settingsError) {
      // Rollback franchise creation
      await supabase
        .from('franchises')
        .delete()
        .eq('id', franchiseId);

      throw new FranchiseServiceError(settingsError.message, settingsError.code);
    }

    return this.getFranchise(franchiseId);
  },

  async updateFranchise(franchiseData: FranchiseUpdateInput): Promise<Franchise> {
    const updates: Record<string, unknown> = {};
    if (franchiseData.name) updates.name = franchiseData.name;
    if (franchiseData.address) updates.address = franchiseData.address;

    if (Object.keys(updates).length > 0) {
      const { error } = await withRetry(
        async () => await supabase
          .from('franchises')
          .update(updates)
          .eq('id', franchiseData.id)
      );

      if (error) throw new FranchiseServiceError(error.message, error.code);
    }

    if (franchiseData.settings) {
      const { error } = await withRetry(
        async () => await supabase
          .from('franchise_settings')
          .update(franchiseData.settings)
          .eq('franchise_id', franchiseData.id)
      );

      if (error) throw new FranchiseServiceError(error.message, error.code);
    }

    return this.getFranchise(franchiseData.id);
  },

  async deleteFranchise(id: string): Promise<void> {
    const { error } = await withRetry(
      async () => await supabase
        .from('franchises')
        .delete()
        .eq('id', id)
    );

    if (error) throw new FranchiseServiceError(error.message, error.code);
  },

  async getFranchiseSummary(id: string): Promise<FranchiseDetail> {
    const { data, error } = await withRetry(
      async () => await supabase
        .rpc('get_franchise_summary', { franchise_id_input: id })
    );

    if (error) throw new FranchiseServiceError(error.message, error.code);
    if (!data) throw new FranchiseServiceError('Failed to get franchise summary');

    return data as FranchiseDetail;
  },

  async getUserFranchises(userId: string): Promise<Franchise[]> {
    const { data, error } = await withRetry(
      async () => await supabase
        .from('user_franchise_access')
        .select('franchise:franchises(*, settings:franchise_settings(*))')
        .eq('auth_id', userId)
    ) as { data: FranchiseWithSettings[] | null; error: any };

    if (error) throw new FranchiseServiceError(error.message, error.code);
    if (!data) return [];

    return data.map(item => ({
      id: item.franchise.id,
      name: item.franchise.name,
      address: item.franchise.address,
      settings: item.franchise.settings,
      created_at: item.franchise.created_at,
      updated_at: item.franchise.updated_at
    }));
  }
};

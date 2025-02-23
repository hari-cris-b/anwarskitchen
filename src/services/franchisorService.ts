import { supabase } from '../lib/supabase';
import { withRetry } from '../lib/supabase';
import type {
  Franchise,
  FranchiseOverview,
  FranchiseDetail,
  DashboardStats,
  FranchiseCreateInput,
  FranchiseStatus,
  FranchiseSettings
} from '../types/franchise';

export class FranchisorServiceError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'FranchisorServiceError';
  }
}

function isValidSubscriptionStatus(status: string): status is 'active' | 'trial' | 'expired' {
  return ['active', 'trial', 'expired'].includes(status);
}

interface RawFranchiseData {
  id: string;
  name: string;
  settings: Array<{
    business_name: string;
    address: string;
    phone: string;
    email: string;
    subscription_status: string;
  }>;
  metrics: Array<{
    total_orders: number;
    total_revenue: number;
    active_staff: number;
  }>;
  status: FranchiseStatus;
  created_at: string;
  updated_at: string;
}

interface RawFranchiseDetail {
  id: string;
  name: string;
  address: string;
  settings: Array<FranchiseSettings>;
  metrics: Array<{
    daily_orders: number;
    monthly_revenue: number;
    average_order_value: number;
    total_staff: number;
    active_menu_items: number;
  }>;
  status: FranchiseStatus;
  created_at: string;
  updated_at: string;
}

function transformToFranchiseOverview(raw: RawFranchiseData): FranchiseOverview {
  const settings = raw.settings[0] || {};
  const metrics = raw.metrics[0] || {
    total_orders: 0,
    total_revenue: 0,
    active_staff: 0
  };

  return {
    id: raw.id,
    name: raw.name,
    settings: {
      business_name: settings.business_name,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      subscription_status: isValidSubscriptionStatus(settings.subscription_status) ? 
        settings.subscription_status : 
        undefined
    },
    metrics: {
      total_orders: metrics.total_orders,
      total_revenue: metrics.total_revenue,
      active_staff: metrics.active_staff
    },
    status: raw.status,
    created_at: raw.created_at,
    updated_at: raw.updated_at
  };
}

function transformToFranchiseDetail(raw: RawFranchiseDetail): FranchiseDetail {
  const settings = raw.settings[0];
  const metrics = raw.metrics[0] || {
    daily_orders: 0,
    monthly_revenue: 0,
    average_order_value: 0,
    total_staff: 0,
    active_menu_items: 0
  };

  if (!settings) {
    throw new FranchisorServiceError('Franchise settings not found');
  }

  return {
    id: raw.id,
    name: raw.name,
    address: raw.address,
    settings,
    metrics: {
      daily_orders: metrics.daily_orders,
      monthly_revenue: metrics.monthly_revenue,
      average_order_value: metrics.average_order_value,
      total_staff: metrics.total_staff,
      active_menu_items: metrics.active_menu_items
    },
    status: raw.status,
    created_at: raw.created_at,
    updated_at: raw.updated_at
  };
}

export const franchisorService = {
  async getFranchises(): Promise<FranchiseOverview[]> {
    try {
      const { data, error } = await withRetry(async () => await supabase
        .from('franchises')
        .select(`
          id,
          name,
          settings:franchise_settings (
            business_name,
            address,
            phone,
            email,
            subscription_status
          ),
          metrics:franchise_metrics (
            total_orders,
            total_revenue,
            active_staff
          ),
          status,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false }));

      if (error) throw new FranchisorServiceError(error.message, error.code);
      return (data || []).map(franchise => 
        transformToFranchiseOverview(franchise as RawFranchiseData)
      );

    } catch (err) {
      console.error('Error fetching franchises:', err);
      throw err instanceof FranchisorServiceError 
        ? err 
        : new FranchisorServiceError('Failed to fetch franchises');
    }
  },

  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const { data, error } = await withRetry(async () => await supabase
        .rpc('get_dashboard_stats'));

      if (error) throw new FranchisorServiceError(error.message, error.code);
      if (!data) throw new FranchisorServiceError('No dashboard data returned');

      return {
        total_franchises: data.total_franchises,
        active_franchises: data.active_franchises,
        total_revenue: data.total_revenue,
        total_orders: data.total_orders,
        total_staff: data.total_staff,
        top_franchises: data.top_franchises,
        recent_orders: data.recent_orders,
        revenue_by_franchise: data.revenue_by_franchise
      };

    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      throw err instanceof FranchisorServiceError 
        ? err 
        : new FranchisorServiceError('Failed to fetch dashboard statistics');
    }
  },

  async getFranchiseDetails(id: string): Promise<FranchiseDetail> {
    try {
      const { data, error } = await withRetry(async () => await supabase
        .from('franchises')
        .select(`
          id,
          name,
          address,
          settings:franchise_settings (*),
          metrics:franchise_metrics (
            daily_orders,
            monthly_revenue,
            average_order_value,
            total_staff,
            active_menu_items
          ),
          status,
          created_at,
          updated_at
        `)
        .eq('id', id)
        .single());

      if (error) throw new FranchisorServiceError(error.message, error.code);
      if (!data) throw new FranchisorServiceError('Franchise not found');

      return transformToFranchiseDetail(data as RawFranchiseDetail);

    } catch (err) {
      console.error('Error fetching franchise details:', err);
      throw err instanceof FranchisorServiceError 
        ? err 
        : new FranchisorServiceError('Failed to fetch franchise details');
    }
  },

  async updateFranchiseStatus(id: string, status: FranchiseStatus): Promise<void> {
    try {
      const { error } = await withRetry(async () => await supabase
        .from('franchises')
        .update({ status })
        .eq('id', id));

      if (error) throw new FranchisorServiceError(error.message, error.code);

    } catch (err) {
      console.error('Error updating franchise status:', err);
      throw err instanceof FranchisorServiceError 
        ? err 
        : new FranchisorServiceError('Failed to update franchise status');
    }
  },

  async createFranchise(input: FranchiseCreateInput): Promise<Franchise> {
    try {
      // Create franchise record
      const { data: franchise, error: franchiseError } = await withRetry(async () => 
        await supabase
          .from('franchises')
          .insert([{
            name: input.name,
            address: input.address,
            status: 'active' as const
          }])
          .select()
          .single()
      );

      if (franchiseError) throw new FranchisorServiceError(franchiseError.message, franchiseError.code);
      if (!franchise) throw new FranchisorServiceError('Failed to create franchise');

      // Create franchise settings
      const { error: settingsError } = await withRetry(async () => 
        await supabase
          .from('franchise_settings')
          .insert([{
            franchise_id: franchise.id,
            business_name: input.name,
            address: input.address,
            ...input.settings,
            subscription_status: 'trial' as const
          }])
      );

      if (settingsError) {
        // Rollback franchise creation
        await supabase
          .from('franchises')
          .delete()
          .eq('id', franchise.id);
        throw new FranchisorServiceError(settingsError.message, settingsError.code);
      }

      return this.getFranchiseDetails(franchise.id);

    } catch (err) {
      console.error('Error creating franchise:', err);
      throw err instanceof FranchisorServiceError 
        ? err 
        : new FranchisorServiceError('Failed to create franchise');
    }
  },

  async deleteFranchise(id: string): Promise<void> {
    try {
      const { error } = await withRetry(async () => await supabase
        .from('franchises')
        .delete()
        .eq('id', id));

      if (error) throw new FranchisorServiceError(error.message, error.code);

    } catch (err) {
      console.error('Error deleting franchise:', err);
      throw err instanceof FranchisorServiceError 
        ? err 
        : new FranchisorServiceError('Failed to delete franchise');
    }
  }
};

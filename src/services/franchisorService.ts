import { supabase } from '../lib/supabase';
import {
  handleApiResponse,
  handleApiArrayResponse,
  handleApiSingleResponse,
  handleRpcResponse
} from '../utils/apiUtils';
import type {
  FranchiseOverview,
  FranchiseDetail,
  DashboardStats,
  FranchiseSettings,
  FranchiseCreateInput,
  FranchiseStatus,
  FranchiseQueryResult
} from '../types/franchise';
import { ValidationError, AuthorizationError, DatabaseError } from '../types/errors';
import { withRetry } from '../utils/retryUtils';

interface TopPerformer {
  franchise_id: string;
  franchise_name: string;
  total_revenue: number;
  order_count: number;
  average_order_value: number;
}

function isNumber(data: unknown): data is number {
  return typeof data === 'number';
}

function isTopPerformer(data: unknown): data is TopPerformer {
  if (!data || typeof data !== 'object') return false;
  const performer = data as Partial<TopPerformer>;
  return (
    typeof performer.franchise_id === 'string' &&
    typeof performer.franchise_name === 'string' &&
    typeof performer.total_revenue === 'number' &&
    typeof performer.order_count === 'number' &&
    typeof performer.average_order_value === 'number'
  );
}

function isTopPerformerArray(data: unknown): data is TopPerformer[] {
  return Array.isArray(data) && data.every(isTopPerformer);
}

class FranchisorService {
  // Dashboard metrics
  getDashboardStats = async (): Promise<DashboardStats> => {
    try {
      console.debug('Fetching dashboard stats');

      const [
        franchisesResult,
        revenueTotalResult,
        staffCountResult,
        recentFranchisesResult,
        topPerformersResult
      ] = await Promise.allSettled([
        handleApiArrayResponse(
          supabase
            .from('franchises')
            .select('id, name, created_at, settings'),
          'fetching franchises'
        ),
        this.getFranchiseRevenue(30),
        this.getFranchiseStaffCount(),
        this.getRecentFranchises(5),
        this.getTopPerformers(30, 5)
      ]);

      // Handle results
      const franchises = franchisesResult.status === 'fulfilled' ? franchisesResult.value : [];
      const revenueTotal = revenueTotalResult.status === 'fulfilled' ? revenueTotalResult.value : 0;
      const staffCount = staffCountResult.status === 'fulfilled' ? staffCountResult.value : 0;
      const recentFranchises = recentFranchisesResult.status === 'fulfilled' ? recentFranchisesResult.value : [];
      const topPerformers = topPerformersResult.status === 'fulfilled' ? topPerformersResult.value : [];

      console.debug('Dashboard stats loaded:', {
        franchiseCount: franchises.length,
        revenue: revenueTotal,
        staff: staffCount,
        recent: recentFranchises.length,
        top: topPerformers.length
      });

      return {
        totalFranchises: franchises.length,
        activeFranchises: franchises.filter(f =>
          f.settings.subscription_status === 'active'
        ).length,
        totalRevenue: revenueTotal,
        totalStaff: staffCount,
        recentFranchises: recentFranchises.map(f => ({
          id: f.id,
          name: f.name,
          created_at: f.created_at,
          status: f.settings.subscription_status as FranchiseStatus
        })),
        topPerformers: topPerformers.map(f => ({
          id: f.franchise_id,
          name: f.franchise_name,
          revenue: f.total_revenue,
          orders: f.order_count,
          averageOrderValue: f.average_order_value
        }))
      };
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      throw error;
    }
  }

  async getFranchiseOverview(): Promise<FranchiseOverview[]> {
    try {
      console.debug('Fetching franchise overview');
      
      // Get basic franchise info including settings
      const franchises = await withRetry(
        () => handleApiArrayResponse<{
          id: string;
          name: string;
          address: string;
          created_at: string;
          settings: FranchiseSettings;
        }>(
          supabase
            .from('franchises')
            .select('id, name, address, created_at, settings')
            .order('created_at', { ascending: false }),
          'fetching franchises'
        ),
        {
          maxRetries: 3,
          delayMs: 1500,
          shouldRetry: (error: Error) =>
            error instanceof AuthorizationError ||
            (error instanceof DatabaseError && error.message.includes('permission'))
        }
      );

      // Get staff counts and revenue totals
      const [settings, staffCounts, revenueTotals] = await Promise.all([
        // Contact settings
        handleApiArrayResponse<{
          franchise_id: string;
          email: string;
          phone: string;
        }>(
          supabase
            .from('franchise_settings')
            .select('franchise_id, email, phone'),
          'fetching franchise settings'
        ),
        // Staff counts
        withRetry(
          () => handleApiArrayResponse<{ franchise_id: string; count: number }>(
            supabase.rpc('get_franchise_staff_counts'),
            'fetching staff counts'
          ),
          {
            maxRetries: 3,
            delayMs: 1500,
            shouldRetry: (error: Error) =>
              error instanceof AuthorizationError ||
              (error instanceof DatabaseError && error.message.includes('permission'))
          }
        ).catch(error => {
          console.error('Staff counts fetch error:', error);
          return [];
        }),
        // Revenue totals
        withRetry(
          () => handleApiArrayResponse<{ franchise_id: string; total: number }>(
            supabase.rpc('get_franchise_revenue_totals'),
            'fetching revenue totals'
          ),
          {
            maxRetries: 3,
            delayMs: 1500,
            shouldRetry: (error: Error) =>
              error instanceof AuthorizationError ||
              (error instanceof DatabaseError && error.message.includes('permission'))
          }
        ).catch(error => {
          console.error('Revenue totals fetch error:', error);
          return [];
        })
      ]);

      // Return enriched data
      return franchises.map(franchise => {
        const franchiseSettings = settings.find(s => s.franchise_id === franchise.id);
        const staffCount = staffCounts.find(s => s.franchise_id === franchise.id);
        const revenue = revenueTotals.find(r => r.franchise_id === franchise.id);

        return {
          id: franchise.id,
          name: franchise.name,
          address: franchise.address,
          created_at: franchise.created_at,
          email: franchiseSettings?.email || '',
          phone: franchiseSettings?.phone || '',
          total_staff: staffCount?.count || 0,
          total_revenue: revenue?.total || 0,
          status: franchise.settings.subscription_status
        };
      });
    } catch (error) {
      console.error('Failed to fetch franchise overview:', error);
      throw error;
    }
  }

  async getFranchiseById(id: string): Promise<FranchiseDetail> {
    try {
      console.debug('Fetching franchise by ID:', { id });

      const result = await withRetry(
        () => handleApiSingleResponse<{
          id: string;
          name: string;
          address: string;
          created_at: string;
          settings: FranchiseSettings;
          franchise_settings: Array<{ email: string; phone: string }>;
        }>(
          supabase
            .from('franchises')
            .select(`
              id,
              name,
              address,
              created_at,
              settings,
              franchise_settings (
                email,
                phone
              )
            `)
            .eq('id', id)
            .single(),
          'fetching franchise details'
        ),
        {
          maxRetries: 3,
          delayMs: 1500,
          shouldRetry: (error: Error) =>
            error instanceof AuthorizationError ||
            (error instanceof DatabaseError && error.message.includes('permission'))
        }
      );

      if (!result) {
        throw new ValidationError('Franchise not found');
      }

      // Get additional metrics with retries
      const [staffActivity, menuPerformance] = await Promise.all([
        withRetry(
          () => handleRpcResponse<{ active: number; total: number }>(
            supabase.rpc('get_franchise_staff_activity', { p_franchise_id: id }),
            'fetching staff activity'
          ),
          {
            maxRetries: 3,
            delayMs: 1500,
            shouldRetry: (error: Error) =>
              error instanceof AuthorizationError ||
              (error instanceof DatabaseError && error.message.includes('permission'))
          }
        ).catch(() => ({ active: 0, total: 0 })),
        withRetry(
          () => handleRpcResponse<{
            popular_items: Array<{ name: string; order_count: number; revenue: number }>;
            revenue_by_category: Record<string, number>;
          }>(
            supabase.rpc('get_franchise_menu_performance', { p_franchise_id: id }),
            'fetching menu performance'
          ),
          {
            maxRetries: 3,
            delayMs: 1500,
            shouldRetry: (error: Error) =>
              error instanceof AuthorizationError ||
              (error instanceof DatabaseError && error.message.includes('permission'))
          }
        ).catch(() => ({ popular_items: [], revenue_by_category: {} }))
      ]);

      return {
        id: result.id,
        name: result.name,
        address: result.address,
        created_at: result.created_at,
        email: result.franchise_settings[0]?.email || '',
        phone: result.franchise_settings[0]?.phone || '',
        settings: result.settings,
        staff_count: staffActivity.total || 0,
        active_staff: staffActivity.active || 0,
        total_revenue: 0,
        total_orders: 0,
        status: result.settings.subscription_status,
        performance_metrics: {
          popular_items: menuPerformance.popular_items.map(item => ({
            name: item.name,
            order_count: item.order_count,
            revenue: item.revenue
          })) || [],
          revenue_by_category: menuPerformance.revenue_by_category || {}
        }
      };
    } catch (error) {
      console.error('Error fetching franchise by ID:', error);
      throw error;
    }
  }

  async createFranchise(data: FranchiseCreateInput): Promise<string> {
    try {
      console.debug('Creating new franchise:', data);

      const result = await withRetry(
        () => handleApiSingleResponse<{ id: string }>(
          supabase
            .from('franchises')
            .insert([{
              name: data.name,
              address: data.address,
              settings: {
                subscription_status: data.settings.subscription_status || 'active',
                tax_rate: data.settings.tax_rate || 0,
                currency: data.settings.currency || 'INR',
                business_name: data.settings.business_name || data.name
              }
            }])
            .select('id')
            .single(),
          'creating franchise'
        ),
        {
          maxRetries: 3,
          delayMs: 1500,
          shouldRetry: (error: Error) =>
            error instanceof AuthorizationError ||
            (error instanceof DatabaseError && error.message.includes('permission'))
        }
      );

      if (!result?.id) {
        throw new ValidationError('Failed to create franchise');
      }

      // Create franchise settings
      await withRetry(
        () => handleApiSingleResponse(
          supabase
            .from('franchise_settings')
            .insert([{
              franchise_id: result.id,
              email: data.email,
              phone: data.phone
            }])
            .select('id')
            .single(),
          'creating franchise settings'
        ),
        {
          maxRetries: 3,
          delayMs: 1500,
          shouldRetry: (error: Error) =>
            error instanceof AuthorizationError ||
            (error instanceof DatabaseError && error.message.includes('permission'))
        }
      );

      console.debug('Successfully created franchise:', { id: result.id });
      return result.id;
    } catch (error) {
      console.error('Failed to create franchise:', error);
      throw error;
    }
  }

  async updateFranchiseSettings(franchiseId: string, settings: Partial<FranchiseSettings>): Promise<void> {
    try {
      console.debug('Updating franchise settings:', { franchiseId, settings });

      // Verify franchise exists and get current settings
      const franchise = await withRetry(
        () => handleApiSingleResponse<{ settings: FranchiseSettings }>(
          supabase
            .from('franchises')
            .select('settings')
            .eq('id', franchiseId)
            .single(),
          'verifying franchise exists'
        ),
        {
          maxRetries: 3,
          delayMs: 1500,
          shouldRetry: (error: Error) =>
            error instanceof AuthorizationError ||
            (error instanceof DatabaseError && error.message.includes('permission'))
        }
      );

      if (!franchise) {
        throw new ValidationError('Franchise not found');
      }

      // Merge settings
      const updatedSettings = {
        ...franchise.settings,
        ...settings,
        updated_at: new Date().toISOString()
      };

      // Update settings
      await withRetry(
        () => handleApiSingleResponse(
          supabase
            .from('franchises')
            .update({ settings: updatedSettings })
            .eq('id', franchiseId)
            .select()
            .single(),
          'updating franchise settings'
        ),
        {
          maxRetries: 3,
          delayMs: 1500,
          shouldRetry: (error: Error) =>
            error instanceof AuthorizationError ||
            (error instanceof DatabaseError && error.message.includes('permission'))
        }
      );

      console.debug('Successfully updated franchise settings');
    } catch (error) {
      console.error('Failed to update franchise settings:', error);
      throw error;
    }
  }

  private async getFranchiseRevenue(days: number): Promise<number> {
    return withRetry(
      () => handleRpcResponse<number>(
        supabase.rpc('get_total_revenue_last_30_days'),
        'fetching revenue data',
        isNumber
      ),
      {
        maxRetries: 3,
        delayMs: 1500,
        shouldRetry: (error: Error) =>
          error instanceof AuthorizationError ||
          (error instanceof DatabaseError && error.message.includes('permission'))
      }
    ).catch(error => {
      console.error('Revenue fetch error after retries:', error);
      return 0;
    });
  }

  private async getFranchiseStaffCount(): Promise<number> {
    return withRetry(
      () => handleRpcResponse<number>(
        supabase.rpc('get_total_active_staff_count'),
        'fetching staff count',
        isNumber
      ),
      {
        maxRetries: 3,
        delayMs: 1500,
        shouldRetry: (error: Error) =>
          error instanceof AuthorizationError ||
          (error instanceof DatabaseError && error.message.includes('permission'))
      }
    ).catch(error => {
      console.error('Staff count fetch error after retries:', error);
      return 0;
    });
  }

  private async getRecentFranchises(limit: number) {
    return handleApiArrayResponse(
      supabase
        .from('franchises')
        .select('id, name, created_at, settings')
        .order('created_at', { ascending: false })
        .limit(limit),
      'fetching recent franchises'
    );
  }

  private async getTopPerformers(days: number, limit: number): Promise<TopPerformer[]> {
    return withRetry(
      () => handleRpcResponse<TopPerformer[]>(
        supabase.rpc('get_top_performing_franchises', {
          days_ago: days,
          limit_count: limit
        }),
        'fetching top performers',
        isTopPerformerArray
      ),
      {
        maxRetries: 3,
        delayMs: 1500,
        shouldRetry: (error: Error) =>
          error instanceof AuthorizationError ||
          (error instanceof DatabaseError && error.message.includes('permission'))
      }
    ).catch(error => {
      console.error('Top performers fetch error after retries:', error);
      return [];
    });
  }
}

export const franchisorService = new FranchisorService();
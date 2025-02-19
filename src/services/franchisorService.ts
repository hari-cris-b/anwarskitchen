import { supabase } from '../lib/supabase';
import type {
  FranchiseOverview,
  FranchiseStats,
  DashboardStats,
  FranchiseSettings,
  FranchiseStatus,
  TopPerformingFranchise,
  FranchiseCreateInput,
  FranchiseWithSettings
} from '../types/franchise';

interface LogActivityParams {
  actionType: 'login' | 'franchise_create' | 'franchise_update' | 'franchise_delete' | 'staff_manage' | 'settings_update' | 'report_access';
  details: Record<string, any>;
}

// Database query result types
interface FranchiseQueryResult {
  id: string;
  name: string;
  address: string;
  created_at: string;
  franchise_settings: Array<{
    email: string;
    phone: string;
  }> | null;
  staff_count: number;
  total_revenue: number;
  settings: {
    subscription_status: FranchiseStatus;
  };
}

class FranchisorService {
  private async logActivity({ actionType, details }: LogActivityParams): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      const { data: superAdmin } = await supabase
        .from('super_admin')
        .select('id')
        .eq('auth_id', session.user.id)
        .single();

      if (!superAdmin?.id) return;

      await supabase.rpc('log_super_admin_activity', {
        p_super_admin_id: superAdmin.id,
        p_action_type: actionType,
        p_action_details: details,
        p_ip_address: null
      });
    } catch (error) {
      console.error('Failed to log super admin activity:', error);
    }
  }

  async getFranchiseOverview(): Promise<FranchiseOverview[]> {
    // First get franchise basic info with settings
    const { data: franchises, error: franchiseError } = await supabase
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
      .order('created_at', { ascending: false });

    if (franchiseError) throw franchiseError;

    // Get staff counts
    const { data: staffCounts, error: staffError } = await supabase
      .from('staff')
      .select('franchise_id, count')
      .select('count(*)', { count: 'exact', head: false })
      .groupBy('franchise_id');

    if (staffError) throw staffError;

    // Get revenue totals
    const { data: revenueTotals, error: revenueError } = await supabase
      .from('orders')
      .select('franchise_id, sum(total)')
      .groupBy('franchise_id');

    if (revenueError) throw revenueError;

    // Combine the data
    const staffCountMap = new Map(
      staffCounts?.map(({ franchise_id, count }) => [franchise_id, count]) || []
    );
    const revenueTotalMap = new Map(
      revenueTotals?.map(({ franchise_id, sum }) => [franchise_id, sum]) || []
    );

    await this.logActivity({
      actionType: 'report_access',
      details: { report: 'franchise_overview' }
    });

    return (franchises || []).map(franchise => ({
      id: franchise.id,
      name: franchise.name,
      address: franchise.address,
      created_at: franchise.created_at,
      email: franchise.franchise_settings?.[0]?.email || '',
      phone: franchise.franchise_settings?.[0]?.phone || '',
      total_staff: staffCountMap.get(franchise.id) || 0,
      total_revenue: revenueTotalMap.get(franchise.id) || 0,
      status: franchise.settings?.subscription_status || 'inactive'
    }));
  }

  async getDashboardStats(): Promise<DashboardStats> {
    // Get franchise counts
    const { data: franchises, error: franchiseError } = await supabase
      .from('franchises')
      .select(`
        id,
        name,
        created_at,
        settings
      `);

    if (franchiseError) throw franchiseError;

    // Get total revenue for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: revenueData, error: revenueError } = await supabase
      .from('orders')
      .select('total')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (revenueError) throw revenueError;

    // Get total staff count
    const { count: staffCount, error: staffError } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    if (staffError) throw staffError;

    // Get recent franchises
    const { data: recentFranchises, error: recentError } = await supabase
      .from('franchises')
      .select(`
        id,
        name,
        created_at,
        settings
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentError) throw recentError;

    // Get top performing franchises
    const { data: topPerformers, error: topError } = await supabase.rpc(
      'get_top_performing_franchises',
      { days_ago: 30, limit_count: 5 }
    ) as { data: TopPerformingFranchise[] | null; error: any };

    if (topError) throw topError;

    // Log dashboard access
    await this.logActivity({
      actionType: 'report_access',
      details: { report: 'dashboard_stats' }
    });

    return {
      totalFranchises: franchises.length,
      activeFranchises: franchises.filter(f => 
        (f.settings as FranchiseSettings)?.subscription_status === 'active'
      ).length,
      totalRevenue: revenueData.reduce((sum, order) => sum + (order.total || 0), 0),
      totalStaff: staffCount || 0,
      recentFranchises: (recentFranchises as FranchiseWithSettings[]).map(f => ({
        id: f.id,
        name: f.name,
        created_at: f.created_at,
        status: f.settings?.subscription_status || 'inactive'
      })),
      topPerformers: (topPerformers || []).map(f => ({
        id: f.franchise_id,
        name: f.franchise_name,
        revenue: f.total_revenue,
        orders: f.order_count
      }))
    };
  }

  async updateFranchiseSettings(
    franchiseId: string,
    settings: Partial<FranchiseSettings>
  ): Promise<void> {
    const { error } = await supabase
      .from('franchises')
      .update({ settings })
      .eq('id', franchiseId);

    if (error) throw error;

    await this.logActivity({
      actionType: 'franchise_update',
      details: { franchise_id: franchiseId, settings_updated: Object.keys(settings) }
    });
  }

  async createFranchise(data: FranchiseCreateInput): Promise<string> {
    const { data: franchise, error } = await supabase
      .from('franchises')
      .insert([{
        name: data.name,
        address: data.address,
        settings: {
          ...data.settings,
          subscription_status: data.settings.subscription_status || 'active'
        }
      }])
      .select('id')
      .single();

    if (error) throw error;

    // Create franchise settings
    const { error: settingsError } = await supabase
      .from('franchise_settings')
      .insert([{
        franchise_id: franchise.id,
        email: data.email,
        phone: data.phone
      }]);

    if (settingsError) throw settingsError;

    await this.logActivity({
      actionType: 'franchise_create',
      details: { franchise_id: franchise.id, name: data.name }
    });

    return franchise.id;
  }

  async deleteFranchise(id: string): Promise<void> {
    const { error } = await supabase
      .from('franchises')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await this.logActivity({
      actionType: 'franchise_delete',
      details: { franchise_id: id }
    });
  }

  async manageStaff(
    franchiseId: string,
    action: 'add' | 'update' | 'remove',
    staffData: { id?: string; [key: string]: any }
  ): Promise<void> {
    await this.logActivity({
      actionType: 'staff_manage',
      details: { 
        franchise_id: franchiseId,
        action,
        staff_id: staffData.id
      }
    });
  }
}

export const franchisorService = new FranchisorService();
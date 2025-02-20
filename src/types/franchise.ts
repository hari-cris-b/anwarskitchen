export type FranchiseStatus = 'active' | 'inactive' | 'suspended';

export interface FranchiseSettings {
  subscription_status: FranchiseStatus;
  tax_rate?: number;
  currency?: string;
  business_name?: string;
  business_hours?: Record<string, any>;
  theme?: Record<string, any>;
  phone?: string;
  email?: string;
  address?: string;
  gst_number?: string;
}

// Database settings interface extends base settings with database fields
export interface DbFranchiseSettings extends FranchiseSettings {
  id: string;
  franchise_id: string;
  created_at: string;
  updated_at: string;
}

export interface FranchiseOverview {
  id: string;
  name: string;
  address: string;
  created_at: string;
  email: string;
  phone: string;
  total_staff: number;
  total_revenue: number;
  status: FranchiseStatus;
}

export interface FranchiseDetail {
  id: string;
  name: string;
  address: string;
  created_at: string;
  email: string;
  phone: string;
  settings: FranchiseSettings;
  staff_count: number;
  active_staff: number;
  total_revenue: number;
  total_orders: number;
  status: FranchiseStatus;
  performance_metrics?: {
    popular_items: Array<{
      name: string;
      order_count: number;
      revenue: number;
    }>;
    revenue_by_category: Record<string, number>;
  };
}

export interface FranchiseWithSettings {
  id: string;
  name: string;
  created_at: string;
  settings: FranchiseSettings;
}

export interface TopPerformingFranchise {
  id: string;
  name: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
}

export interface DashboardStats {
  totalFranchises: number;
  activeFranchises: number;
  totalRevenue: number;
  totalStaff: number;
  recentFranchises: Array<{
    id: string;
    name: string;
    created_at: string;
    status: FranchiseStatus;
  }>;
  topPerformers: TopPerformingFranchise[];
}

export interface FranchiseCreateInput {
  name: string;
  address: string;
  email: string;
  phone: string;
  settings: {
    subscription_status?: FranchiseStatus;
    tax_rate?: number;
    currency?: string;
    business_name?: string;
  };
}

// Supabase Query Result Types
export interface OrdersAggregate {
  aggregate: {
    count?: number;
    sum?: {
      total: number;
    };
  };
}

export interface StaffCount {
  count: number;
}

export interface FranchiseQueryResult {
  id: string;
  name: string;
  address: string;
  created_at: string;
  franchise_settings: Array<{
    email: string;
    phone: string;
  }>;
  staff: Array<StaffCount>;
  orders_aggregate: OrdersAggregate;
  settings: FranchiseSettings;
}

// Franchise Performance Types
export interface FranchisePerformance {
  revenue: number;
  orders: number;
  averageOrderValue: number;
  comparisonPeriod?: {
    start: string;
    end: string;
    revenue: number;
    orders: number;
    percentageChange: number;
  };
}

export interface FranchiseStats {
  performance: FranchisePerformance;
  trends: {
    daily: Array<{
      date: string;
      revenue: number;
      orders: number;
    }>;
    weekly: Array<{
      week: string;
      revenue: number;
      orders: number;
    }>;
    monthly: Array<{
      month: string;
      revenue: number;
      orders: number;
    }>;
  };
  topProducts: Array<{
    id: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
  staffMetrics: {
    total: number;
    active: number;
    byRole: Record<string, number>;
  };
}

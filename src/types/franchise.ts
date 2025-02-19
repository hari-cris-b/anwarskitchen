export type FranchiseStatus = 'active' | 'inactive' | 'suspended';

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

export interface FranchiseStats {
  period: string;
  revenue: number;
  orders: number;
  average_order_value: number;
}

export interface TopPerformingFranchise {
  franchise_id: string;
  franchise_name: string;
  total_revenue: number;
  order_count: number;
  average_order_value: number;
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
  topPerformers: Array<{
    id: string;
    name: string;
    revenue: number;
    orders: number;
  }>;
}

export interface FranchiseSettings {
  subscription_status: FranchiseStatus;
  max_staff_count: number;
  features_enabled: string[];
  business_hours?: Record<string, { open: string; close: string }>;
  tax_rate?: number;
  currency?: string;
  theme?: {
    primaryColor: string;
    secondaryColor: string;
  };
}

// Supabase query result types
export interface SupabaseFranchiseQueryResult {
  id: string;
  name: string;
  address: string;
  created_at: string;
  franchise_settings: Array<{
    email: string;
    phone: string;
  }> | null;
  staff: Array<{
    count: number;
  }> | null;
  orders: Array<{
    sum: number;
  }> | null;
  subscription_status: FranchiseStatus | null;
}

export interface FranchiseWithSettings {
  id: string;
  name: string;
  settings: FranchiseSettings;
  created_at: string;
}

export interface FranchiseCreateInput {
  name: string;
  address: string;
  email: string;
  phone: string;
  settings: FranchiseSettings;
}

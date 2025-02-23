import { FranchiseStatus } from './franchise';

type TableDefinition<TRow, TInsert = TRow, TUpdate = Partial<TInsert>> = {
  Row: TRow;
  Insert: TInsert;
  Update: TUpdate;
};

export interface Database {
  public: {
    Tables: {
      franchises: TableDefinition<{
        id: string;
        name: string;
        address: string;
        created_at: string;
        settings: {
          subscription_status: FranchiseStatus;
          tax_rate?: number;
          currency?: string;
          business_name?: string;
        };
      }, {
        name: string;
        address: string;
        settings?: {
          subscription_status?: FranchiseStatus;
          tax_rate?: number;
          currency?: string;
          business_name?: string;
        };
      }>;
      franchise_settings: TableDefinition<{
        id: string;
        franchise_id: string;
        email: string;
        phone: string;
        created_at: string;
      }, {
        franchise_id: string;
        email: string;
        phone: string;
      }>;
      staff: TableDefinition<{
        id: string;
        franchise_id: string;
        auth_id: string;
        full_name: string;
        email: string;
        role: string;
        pin: string;
        status: 'active' | 'inactive';
        created_at: string;
      }>;
      orders: TableDefinition<{
        id: string;
        franchise_id: string;
        total: number;
        created_at: string;
      }>;
    };
    Functions: {
      get_franchise_staff_counts: {
        Args: Record<string, never>;
        Returns: Array<{
          franchise_id: string;
          staff_count: number;
        }>;
      };
      get_franchise_revenue_totals: {
        Args: Record<string, never>;
        Returns: Array<{
          franchise_id: string;
          total_revenue: number;
        }>;
      };
      get_franchise_metrics: {
        Args: {
          p_franchise_id: string;
        };
        Returns: {
          staff_count: number;
          total_orders: number;
          total_revenue: number;
        };
      };
      get_total_revenue_last_30_days: {
        Args: {
          days_ago: number;
        };
        Returns: number;
      };
      get_total_active_staff_count: {
        Args: Record<string, never>;
        Returns: number;
      };
      get_top_performing_franchises: {
        Args: {
          days_ago: number;
          limit_count: number;
        };
        Returns: Array<{
          franchise_id: string;
          franchise_name: string;
          total_revenue: number;
          order_count: number;
        }>;
      };
      log_super_admin_activity: {
        Args: {
          p_super_admin_id: string;
          p_action_type: string;
          p_action_details: Record<string, any>;
          p_ip_address: string | null;
        };
        Returns: void;
      };
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T];
export type TableRow<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TableInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TableUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
export type Functions<T extends keyof Database['public']['Functions']> = Database['public']['Functions'][T];
export type FunctionArgs<T extends keyof Database['public']['Functions']> = Database['public']['Functions'][T]['Args'];
export type FunctionReturns<T extends keyof Database['public']['Functions']> = Database['public']['Functions'][T]['Returns'];

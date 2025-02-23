export type Category = 'Main Course' | 'Appetizers' | 'Desserts' | 'Beverages' | 'Breads' | string;

export interface PrinterConfig {
  type: 'thermal' | 'normal';
  name: string;
  printer_ip?: string;
  printer_port?: number;
  paper_width: number;
  paper_size?: string;
  chars_per_line: number;
  font_size?: number;
  printer_type?: string;
  connected: boolean;
  print_kitchen_receipts?: boolean;
  invoice_prefix?: string;
  next_invoice_number?: number;
  accept_cash?: boolean;
  accept_card?: boolean;
  accept_upi?: boolean;
}

export interface NotificationSettings {
  order_alerts: boolean;
  low_stock_alerts: boolean;
  staff_notifications: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
}

export interface ReceiptTemplate {
  show_logo: boolean;
  show_tax_details: boolean;
  show_tax_breakdown?: boolean;
  show_gst?: boolean;
  show_order_id: boolean;
  custom_header: string;
  custom_footer: string;
}

export interface BusinessHours {
  open: string;
  close: string;
  is_closed?: boolean;
}

export interface BusinessDetails {
  business_type: 'restaurant' | 'cafe' | 'food_court' | 'cloud_kitchen';
  is_chain_business: boolean;
  seating_capacity: number;
  website?: string;
  social_media?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  location: {
    city: string;
    state: string;
    country: string;
    pincode: string;
  };
}

export type FranchiseStatus = 'active' | 'suspended' | 'closed';

export interface FranchiseSettings {
  id: string;
  franchise_id: string;
  business_name: string;
  tax_rate: number;
  currency: string;
  theme: Record<string, string>;
  business_hours: Record<string, BusinessHours>;
  phone: string;
  email: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  gst_number: string | null;
  receipt_header: string;
  receipt_footer: string;
  website?: string;
  business_type?: string;
  is_chain_business?: boolean;
  seating_capacity?: number;
  printer_config: PrinterConfig;
  notification_settings: NotificationSettings;
  receipt_template: ReceiptTemplate;
  business_details: BusinessDetails;
  subscription_status?: 'active' | 'trial' | 'expired';
  created_at: string;
  updated_at: string;
}

export interface Franchise {
  id: string;
  name: string;
  address: string;
  settings: FranchiseSettings;
  created_at: string;
  updated_at: string;
}

export interface FranchiseCreateInput {
  name: string;
  address: string;
  settings: Partial<FranchiseSettings>;
}

export interface FranchiseUpdateInput {
  id: string;
  name?: string;
  address?: string;
  settings?: Partial<FranchiseSettings>;
}

export interface FranchiseOverview {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: string;
  total_staff: number;
  total_revenue: number;
}

export interface FranchiseDetail extends Franchise {
  metrics: {
    daily_orders: number;
    monthly_revenue: number;
    average_order_value: number;
    total_staff: number;
    active_menu_items: number;
  };
  status: FranchiseStatus;
}

export interface DashboardStats {
  total_franchises: number;
  active_franchises: number;
  total_revenue: number;
  total_orders: number;
  total_staff: number;
  top_franchises: TopPerformingFranchise[];
  recent_orders: {
    id: string;
    franchise_name: string;
    amount: number;
    created_at: string;
  }[];
  revenue_by_franchise: {
    franchise_id: string;
    franchise_name: string;
    revenue: number;
  }[];
}

export interface TopPerformingFranchise {
  id: string;
  name: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
}

export interface FranchiseQueryResult {
  franchises: FranchiseOverview[];
  total: number;
  page: number;
  per_page: number;
}

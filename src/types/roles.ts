// Staff roles - for franchise staff members
export type StaffRole = 'admin' | 'manager' | 'kitchen' | 'staff';
export type StaffStatus = 'active' | 'inactive' | 'suspended' | 'on_leave';

// Super admin types - for system administration
export interface SuperAdmin {
  id: string;
  auth_id: string | null;
  email: string;
  full_name: string;
  created_at: string;
  updated_at: string;
}

export interface SuperAdminActivity {
  id: string;
  super_admin_id: string;
  action_type: string;
  action_details: Record<string, any>;
  ip_address: string | null;
  created_at: string;
}

export interface StaffPermissions {
  can_access_pos: boolean;
  can_access_kitchen: boolean;
  can_access_reports: boolean;
  can_manage_menu: boolean;
  can_manage_staff: boolean;
}

// Common access control types
export type UserRole = StaffRole | 'super_admin';

export interface UserAccess {
  auth_id: string;
  role_type: UserRole;
  franchise_id?: string;
  permissions?: StaffPermissions;
}
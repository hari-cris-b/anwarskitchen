export type StaffRole = 'super_admin' | 'admin' | 'manager' | 'staff' | 'kitchen';
export type StaffStatus = 'active' | 'inactive' | 'suspended' | 'on_leave';

export type CreateStaffDTO = Omit<Staff, 'id' | 'auth_id' | 'created_at' | 'updated_at'>;
export type UpdateStaffDTO = Partial<CreateStaffDTO> & { id: string };
export type UserRole = StaffRole;

export interface StaffPermissions {
  can_access_pos: boolean;
  can_access_kitchen: boolean;
  can_access_reports: boolean;
  can_manage_menu: boolean;
  can_manage_staff: boolean;
}

export interface Staff {
  id: string;
  franchise_id: string | null;
  auth_id: string | null;
  full_name: string;
  email: string;
  status: StaffStatus;
  can_void_orders: boolean;
  can_modify_menu: boolean;
  can_manage_staff: boolean;
  pin_code: string | null;
  staff_type: StaffRole;
  permissions: StaffPermissions;
  email_verified: boolean;
  phone: string | null;
  shift: string | null;
  hourly_rate: string | null;
  joining_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseStaff extends Staff {}
export interface FrontendStaff extends Staff {}

export type AuthUser = Staff;

export function convertToFrontendStaff(staff: DatabaseStaff): FrontendStaff {
  return {
    ...staff,
    permissions: staff.permissions || ROLE_PERMISSIONS[staff.staff_type]
  };
}

export const ROLE_PERMISSIONS: Record<StaffRole, StaffPermissions> = {
  super_admin: {
    can_access_pos: true,
    can_access_kitchen: true,
    can_access_reports: true,
    can_manage_menu: true,
    can_manage_staff: true
  },
  admin: {
    can_access_pos: true,
    can_access_kitchen: true,
    can_access_reports: true,
    can_manage_menu: true,
    can_manage_staff: true
  },
  manager: {
    can_access_pos: true,
    can_access_kitchen: true,
    can_access_reports: true,
    can_manage_menu: false,
    can_manage_staff: false
  },
  staff: {
    can_access_pos: true,
    can_access_kitchen: false,
    can_access_reports: false,
    can_manage_menu: false,
    can_manage_staff: false
  },
  kitchen: {
    can_access_pos: false,
    can_access_kitchen: true,
    can_access_reports: false,
    can_manage_menu: false,
    can_manage_staff: false
  }
};

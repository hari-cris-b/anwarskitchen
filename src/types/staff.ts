// Role Types
export type UserRole = 'admin' | 'manager' | 'staff' | 'kitchen';
export type ShiftType = 'morning' | 'evening' | 'night' | 'flexible';
export type StatusType = 'active' | 'inactive' | 'on_leave';

export enum StaffRole {
  MANAGER = 'MANAGER',
  STAFF = 'STAFF'
}


export type StaffPermissions = {
  canManageStaff: boolean;
  canViewStaff: boolean;
  canEditStaff: boolean;
  canDeleteStaff: boolean;
  canModifyMenu: boolean;
  canVoidOrders: boolean;
};

export interface DatabaseStaff {
  id: string;
  franchise_id: string;
  auth_id: string | null;
  full_name: string;
  role: UserRole;
  email: string;
  phone: string | null;
  shift: ShiftType | null;
  hourly_rate: number;
  status: StatusType;
  pin_code?: string;
  created_at: string;
  updated_at: string;
  joining_date: string | null;
  can_manage_staff: boolean;
  can_void_orders: boolean;
  can_modify_menu: boolean;
}

export interface Staff extends DatabaseStaff {
  permissions: StaffPermissions;
}

export interface StaffFormData {
  franchise_id: string;
  full_name: string;
  role: UserRole;
  email: string;
  phone: string;
  shift: ShiftType;
  hourly_rate: number;
  status: StatusType;
  joining_date: string;
  pin_code?: string;
}

export interface CreateStaffDTO {
  franchise_id: string;
  full_name: string;
  role: UserRole;
  email?: string;
  phone?: string;
  shift: ShiftType;
  hourly_rate: number;
  status?: StatusType;
  joining_date?: string;
  pin_code?: string;
}

export interface UpdateStaffDTO {
  id: string;
  full_name?: string;
  role?: UserRole;
  email?: string;
  phone?: string;
  shift?: ShiftType;
  hourly_rate?: number;
  status?: StatusType;
  pin_code?: string;
}

export interface StaffCountByRole {
  role: UserRole;
  count: number;
}

export interface StaffFilters {
  role?: UserRole;
  status?: StatusType;
  shift?: ShiftType;
}

export const SHIFT_TYPES: ShiftType[] = ['morning', 'evening', 'night', 'flexible'];
export const STATUS_TYPES: StatusType[] = ['active', 'inactive', 'on_leave'];

export const ROLE_PERMISSIONS: Record<UserRole, StaffPermissions> = {
  admin: {
    canManageStaff: true,
    canViewStaff: true,
    canEditStaff: true,
    canDeleteStaff: true,
    canModifyMenu: true,
    canVoidOrders: true
  },
  manager: {
    canManageStaff: true,
    canViewStaff: true,
    canEditStaff: true,
    canDeleteStaff: false,
    canModifyMenu: true,
    canVoidOrders: true
  },
  staff: {
    canManageStaff: false,
    canViewStaff: true,
    canEditStaff: false,
    canDeleteStaff: false,
    canModifyMenu: false,
    canVoidOrders: false
  },
  kitchen: {
    canManageStaff: false,
    canViewStaff: true,
    canEditStaff: false,
    canDeleteStaff: false,
    canModifyMenu: false,
    canVoidOrders: false
  }
};

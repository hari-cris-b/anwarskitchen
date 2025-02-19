import { UserRole } from './staff';

// Basic shared types
export type ShiftType = 'morning' | 'evening' | 'night' | null;
export type StatusType = 'active' | 'inactive';

// Staff related interfaces
export interface StaffPermissions {
  can_void_orders: boolean;
  can_give_discount: boolean;
  can_access_reports: boolean;
  can_modify_menu: boolean;
  can_manage_staff: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  staff_type: UserRole;
  shift: string | null;
  pin_code?: string;
  permissions: StaffPermissions;
  status: 'active' | 'inactive';
}

export interface StaffFormData {
  name: string;
  email: string;
  phone: string;
  staff_type: UserRole;
  shift: string | null;
  pin_code: string;
  permissions: StaffPermissions;
}


export type SetFormData<T> = (value: T | ((prev: T) => T)) => void;

export type RolePermissionsMap = Record<UserRole, StaffPermissions>;

// Helper type for form state
export type StaffFormState = {
  formData: StaffFormData;
  setFormData: SetFormData<StaffFormData>;
};

// Helper type for event handlers
export type FormChangeHandler = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;

export const defaultPermissions: StaffPermissions = {
  can_void_orders: false,
  can_give_discount: false,
  can_access_reports: false,
  can_modify_menu: false,
  can_manage_staff: false,
};

export const defaultStaffFormData: StaffFormData = {
  name: '',
  email: '',
  phone: '',
  staff_type: 'staff',
  shift: null,
  pin_code: '',
  permissions: defaultPermissions,
};

// Common database types
export interface TimestampFields {
  created_at: string;
  updated_at: string;
}

// Re-export other types that might be used across the application
export * from './database.types';

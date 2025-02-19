import { supabase } from '../lib/supabase';
import {
  Staff,
  CreateStaffDTO,
  UpdateStaffDTO,
  UserRole,
  StaffCountByType,
  DatabaseStaff,
  ROLE_PERMISSIONS
} from '../types/staff';
import {
  withRetry,
  withTimeout,
  SupabaseError,
  TablesRow
} from '../lib/supabase';

export class StaffServiceError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'StaffServiceError';
  }
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Cache configuration
const CACHE_DURATION = 60_000; // 1 minute
const REQUEST_DEBOUNCE = 1000; // 1 second
const MIN_BETWEEN_REQUESTS = 2000; // Minimum time between requests

class StaffCache {
  private cache = new Map<string, CacheEntry<Staff[]>>();
  private lastRequestTime = 0;

  isValid(franchiseId: string): boolean {
    const entry = this.cache.get(franchiseId);
    return entry !== undefined && 
           Date.now() - entry.timestamp < CACHE_DURATION;
  }

  async shouldWaitForDebounce(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < REQUEST_DEBOUNCE) {
      await new Promise(resolve => setTimeout(resolve, REQUEST_DEBOUNCE - timeSinceLastRequest));
      await new Promise(resolve => setTimeout(resolve, MIN_BETWEEN_REQUESTS));
    }
    this.lastRequestTime = now;
  }

  get(franchiseId: string): Staff[] | null {
    const entry = this.cache.get(franchiseId);
    return entry && this.isValid(franchiseId) ? entry.data : null;
  }

  set(franchiseId: string, data: Staff[]) {
    this.cache.set(franchiseId, {
      data,
      timestamp: Date.now()
    });
  }

  clear() {
    this.cache.clear();
  }
}

const staffCache = new StaffCache();

export const staffService = {
  async verifyPin(staffId: string, franchiseId: string, pin: string): Promise<boolean> {
    try {
      // Validate PIN format
      if (!/^\d{4}$/.test(pin)) {
        throw new StaffServiceError('PIN must be exactly 4 digits');
      }

      const { data, error } = await withRetry(
        async () => {
          return await supabase
            .rpc('verify_staff_pin', {
              p_staff_id: staffId,
              p_franchise_id: franchiseId,
              p_pin: pin
            });
        }
      );

      if (error) throw new StaffServiceError(error.message, error.code);
      return !!data;

    } catch (err) {
      console.error('Error in verifyPin:', err);
      throw err instanceof StaffServiceError ? err : new StaffServiceError('PIN verification failed');
    }
  },

  async setStaffPin(adminId: string, staffId: string, pin: string): Promise<void> {
    try {
      // Validate PIN format
      if (!/^\d{4}$/.test(pin)) {
        throw new StaffServiceError('PIN must be exactly 4 digits');
      }

      const { error } = await withRetry(
        async () => {
          return await supabase
            .rpc('admin_set_staff_pin', {
              p_admin_id: adminId,
              p_staff_id: staffId,
              p_pin: pin
            });
        }
      );

      if (error) throw new StaffServiceError(error.message, error.code);
    } catch (err) {
      console.error('Error in setStaffPin:', err);
      throw err instanceof StaffServiceError ? err : new StaffServiceError('Failed to set PIN');
    }
  },

  async getStaffByFranchise(franchiseId: string): Promise<Staff[]> {
    try {
      // Check cache first
      const cachedData = staffCache.get(franchiseId);
      if (cachedData) {
        return cachedData;
      }

      // Add request debouncing
      await staffCache.shouldWaitForDebounce();

      const { data: staffData, error } = await withRetry(async () => await supabase
        .from('staff')
        .select(`
          id,
          auth_id,
          created_at,
          updated_at,
          email,
          staff_type,
          franchise_id,
          full_name,
          status,
          phone,
          pin_code,
          shift,
          hourly_rate,
          joining_date
        `)
        .eq('franchise_id', franchiseId)
        .order('full_name'));

      if (error) throw new StaffServiceError(error.message, error.code);

      const transformedData = (staffData || []).map(staff => 
        this.convertToFrontendStaff(staff as TablesRow<'staff'>)
      );
      staffCache.set(franchiseId, transformedData);
      return transformedData;

    } catch (err) {
      console.error('Error fetching staff:', err);
      throw err instanceof StaffServiceError ? err : new StaffServiceError('Failed to fetch staff');
    }
  },

  async getStaffCountByType(franchiseId: string): Promise<StaffCountByType[]> {
    const { data, error } = await withRetry(
      async () => await supabase
        .rpc('get_staff_count_by_type', { franchise_id_input: franchiseId })
    );
    
    if (error) throw new Error(error.message);
    return data || [];
  },

  async addStaff(staffData: CreateStaffDTO): Promise<Staff> {
    try {
      // Validate PIN if provided
      if (staffData.pin_code && !/^\d{4}$/.test(staffData.pin_code)) {
        throw new StaffServiceError('PIN must be exactly 4 digits');
      }

      const newStaff = {
        franchise_id: staffData.franchise_id,
        full_name: staffData.full_name,
        staff_type: staffData.staff_type,
        email: staffData.email,
        phone: staffData.phone,
        shift: staffData.shift,
        hourly_rate: staffData.hourly_rate,
        status: staffData.status || 'active',
        joining_date: staffData.joining_date,
        pin_code: staffData.pin_code,
        can_manage_staff: staffData.staff_type === 'admin' || staffData.staff_type === 'manager',
        can_void_orders: staffData.staff_type === 'admin' || staffData.staff_type === 'manager',
        can_modify_menu: staffData.staff_type === 'admin'
      };

      const { data, error } = await withRetry(
        async () => await supabase
          .from('staff')
          .insert([newStaff])
          .select()
          .limit(1)
      );

      if (error) throw new StaffServiceError(error.message, error.code);
      if (!data?.length) throw new StaffServiceError('Failed to create staff record');

      staffCache.clear(); // Invalidate cache on staff changes
      return this.convertToFrontendStaff(data[0] as TablesRow<'staff'>);

    } catch (err) {
      console.error('Error adding staff:', err);
      throw err instanceof StaffServiceError ? err : new StaffServiceError('Failed to add staff');
    }
  },

  async updateStaff(staffData: UpdateStaffDTO): Promise<Staff> {
    try {
      // Validate PIN if provided
      if (staffData.pin_code && !/^\d{4}$/.test(staffData.pin_code)) {
        throw new StaffServiceError('PIN must be exactly 4 digits');
      }

      const updateData: Partial<DatabaseStaff> = {
        full_name: staffData.full_name,
        email: staffData.email,
        phone: staffData.phone,
        shift: staffData.shift,
        hourly_rate: staffData.hourly_rate,
        status: staffData.status,
        pin_code: staffData.pin_code,
        updated_at: new Date().toISOString()
      };

      if (staffData.staff_type) {
        updateData.staff_type = staffData.staff_type;
        updateData.can_manage_staff = staffData.staff_type === 'admin' || staffData.staff_type === 'manager';
        updateData.can_void_orders = staffData.staff_type === 'admin' || staffData.staff_type === 'manager';
        updateData.can_modify_menu = staffData.staff_type === 'admin';
      }

      const { data, error } = await withRetry(
        async () => await supabase
          .from('staff')
          .update(updateData)
          .eq('id', staffData.id)
          .select()
          .limit(1)
      );

      if (error) throw new StaffServiceError(error.message, error.code);
      if (!data?.length) throw new StaffServiceError('Staff record not found');

      staffCache.clear(); // Invalidate cache on staff changes
      return this.convertToFrontendStaff(data[0] as TablesRow<'staff'>);

    } catch (err) {
      console.error('Error updating staff:', err);
      throw err instanceof StaffServiceError ? err : new StaffServiceError('Failed to update staff');
    }
  },

  async deleteStaff(staffId: string): Promise<void> {
    try {
      const { error } = await withRetry(
        async () => await supabase
          .from('staff')
          .delete()
          .eq('id', staffId)
      );

      if (error) throw new StaffServiceError(error.message, error.code);
      
      staffCache.clear(); // Invalidate cache on staff changes
    } catch (err) {
      console.error('Error deleting staff:', err);
      throw err instanceof StaffServiceError ? err : new StaffServiceError('Failed to delete staff');
    }
  },

  convertToFrontendStaff(dbStaff: TablesRow<'staff'>): Staff {
    return {
      id: dbStaff.id,
      created_at: dbStaff.created_at,
      updated_at: dbStaff.updated_at,
      auth_id: dbStaff.auth_id,
      email: dbStaff.email,
      staff_type: dbStaff.staff_type,
      franchise_id: dbStaff.franchise_id,
      full_name: dbStaff.full_name,
      status: dbStaff.status,
      can_manage_staff: dbStaff.staff_type === 'admin' || dbStaff.staff_type === 'manager',
      can_void_orders: dbStaff.staff_type === 'admin' || dbStaff.staff_type === 'manager',
      can_modify_menu: dbStaff.staff_type === 'admin',
      permissions: ROLE_PERMISSIONS[dbStaff.staff_type],
      phone: dbStaff.phone,
      pin_code: dbStaff.pin_code,
      shift: dbStaff.shift,
      hourly_rate: dbStaff.hourly_rate,
      joining_date: dbStaff.joining_date
    };
  }
};

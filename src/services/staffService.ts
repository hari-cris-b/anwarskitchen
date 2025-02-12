import { supabase } from '../lib/supabase';
import { 
  Staff, 
  CreateStaffDTO, 
  UpdateStaffDTO, 
  UserRole,
  StaffCountByRole,
  DatabaseStaff,
  ROLE_PERMISSIONS
} from '../types/staff';

export const staffService = {
  // Convert database staff to frontend staff
  convertToFrontendStaff(dbStaff: DatabaseStaff): Staff {
    return {
      ...dbStaff,
      permissions: ROLE_PERMISSIONS[dbStaff.role]
    };
  },

  async getStaffByFranchise(franchiseId: string): Promise<Staff[]> {
    console.log('Fetching staff for franchise:', franchiseId); // Debug log

    const { data: staffData, error } = await supabase
      .from('staff')
      .select('*')
      .eq('franchise_id', franchiseId)
      .order('full_name');

    if (error) {
      console.error('Error fetching staff:', error); // Debug log
      throw new Error(error.message);
    }

    console.log('Staff data received:', staffData); // Debug log
    return staffData.map(staff => this.convertToFrontendStaff(staff as DatabaseStaff));
  },

  async getStaffCountByRole(franchiseId: string): Promise<StaffCountByRole[]> {
    const { data, error } = await supabase
      .rpc('get_staff_count_by_role', { franchise_id_input: franchiseId });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async getStaffByRole(franchiseId: string, role: UserRole): Promise<Staff[]> {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('franchise_id', franchiseId)
      .eq('role', role)
      .order('full_name');

    if (error) throw new Error(error.message);
    return (data || []).map(staff => this.convertToFrontendStaff(staff as DatabaseStaff));
  },

  async addStaff(staffData: CreateStaffDTO): Promise<Staff> {
    console.log('Adding staff member:', staffData); // Debug log

    const { data, error } = await supabase
      .from('staff')
      .insert([{
        franchise_id: staffData.franchise_id,
        full_name: staffData.full_name,
        role: staffData.role,
        email: staffData.email,
        phone: staffData.phone,
        shift: staffData.shift,
        hourly_rate: staffData.hourly_rate,
        status: staffData.status || 'active',
        joining_date: staffData.joining_date,
        pin_code: staffData.pin_code,
        can_manage_staff: staffData.role === 'admin' || staffData.role === 'manager',
        can_void_orders: staffData.role === 'admin' || staffData.role === 'manager',
        can_modify_menu: staffData.role === 'admin'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding staff:', error); // Debug log
      throw new Error(error.message);
    }

    return this.convertToFrontendStaff(data as DatabaseStaff);
  },

  async updateStaff(staffData: UpdateStaffDTO): Promise<Staff> {
    console.log('Updating staff member:', staffData); // Debug log

    const updateData: Partial<DatabaseStaff> = {
      full_name: staffData.full_name,
      email: staffData.email,
      phone: staffData.phone,
      shift: staffData.shift,
      hourly_rate: staffData.hourly_rate,
      status: staffData.status,
      pin_code: staffData.pin_code
    };

    if (staffData.role) {
      updateData.role = staffData.role;
      updateData.can_manage_staff = staffData.role === 'admin' || staffData.role === 'manager';
      updateData.can_void_orders = staffData.role === 'admin' || staffData.role === 'manager';
      updateData.can_modify_menu = staffData.role === 'admin';
    }

    const { data, error } = await supabase
      .from('staff')
      .update(updateData)
      .eq('id', staffData.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating staff:', error); // Debug log
      throw new Error(error.message);
    }

    return this.convertToFrontendStaff(data as DatabaseStaff);
  },

  async updateStaffStatus(staffId: string, status: 'active' | 'inactive' | 'on_leave'): Promise<Staff> {
    console.log('Updating staff status:', { staffId, status }); // Debug log

    const { data, error } = await supabase
      .from('staff')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', staffId)
      .select()
      .single();

    if (error) {
      console.error('Error updating staff status:', error); // Debug log
      throw new Error(error.message);
    }

    return this.convertToFrontendStaff(data as DatabaseStaff);
  },

  async deleteStaff(staffId: string): Promise<void> {
    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', staffId);

    if (error) throw new Error(error.message);
  },

  subscribeToStaffUpdates(franchiseId: string, callback: (payload: any) => void) {
    return supabase
      .channel('staff_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'staff',
        filter: `franchise_id=eq.${franchiseId}`
      }, callback)
      .subscribe();
  }
};

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { DatabaseStaff, FrontendStaff, StaffRole } from '../types/staff';
import { convertToFrontendStaff } from '../types/staff';
import { useAuth } from '../contexts/AuthContext';
import { authLogger } from '../utils/authLogger';

interface UseStaffOptions {
  franchiseId?: string;
  role?: StaffRole;
  enableSubscription?: boolean;
}

interface UseStaffReturn {
  staff: FrontendStaff[];
  loading: boolean;
  error: Error | null;
  refreshStaff: () => Promise<void>;
  addStaff: (data: Partial<DatabaseStaff>) => Promise<void>;
  updateStaff: (data: Partial<DatabaseStaff>) => Promise<void>;
  deleteStaff: (id: string) => Promise<void>;
}

export function useStaff({ 
  franchiseId, 
  role, 
  enableSubscription = true 
}: UseStaffOptions = {}): UseStaffReturn {
  const [staff, setStaff] = useState<FrontendStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { profile } = useAuth();

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError(null);

      authLogger.debug('useStaff', 'Fetching staff', { franchiseId, role });

      let query = supabase
        .from('staff')
        .select('*')
        .order('created_at', { ascending: false });

      if (franchiseId) {
        query = query.eq('franchise_id', franchiseId);
      }

      if (role) {
        query = query.eq('staff_type', role);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const frontendStaff = (data as DatabaseStaff[]).map(convertToFrontendStaff);
      
      authLogger.debug('useStaff', 'Staff fetched successfully', { 
        count: frontendStaff.length 
      });

      setStaff(frontendStaff);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch staff');
      authLogger.error('useStaff', 'Error fetching staff', { error });
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStaff();

    if (!enableSubscription) return;

    const subscription = supabase
      .channel('staff-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'staff',
        filter: franchiseId ? `franchise_id=eq.${franchiseId}` : undefined
      }, () => {
        void fetchStaff();
      })
      .subscribe();

    return () => {
      void subscription.unsubscribe();
    };
  }, [franchiseId, role, enableSubscription]);

  const addStaff = async (data: Partial<DatabaseStaff>) => {
    try {
      console.log('Adding staff with data:', data);
      const { data: result, error } = await supabase
        .from('staff')
        .insert(data);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      await fetchStaff();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to add staff');
      authLogger.error('useStaff', 'Error adding staff', { error });
      throw error;
    }
  };

  const updateStaff = async (data: Partial<DatabaseStaff>) => {
    try {
      const { error } = await supabase
        .from('staff')
        .update(data)
        .eq('id', data.id);

      if (error) throw error;
      await fetchStaff();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update staff');
      authLogger.error('useStaff', 'Error updating staff', { error });
      throw error;
    }
  };

  const deleteStaff = async (id: string) => {
    try {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchStaff();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete staff');
      authLogger.error('useStaff', 'Error deleting staff', { error });
      throw error;
    }
  };

  return {
    staff,
    loading,
    error,
    refreshStaff: fetchStaff,
    addStaff,
    updateStaff,
    deleteStaff
  };
}

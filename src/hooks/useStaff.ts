import { useState, useEffect } from 'react';
import { staffService } from '../services/staffService';
import { Staff, CreateStaffDTO, UpdateStaffDTO, DatabaseStaff, StatusType } from '../types/staff';
import { useSupabaseSubscription } from './useSupabaseSubscription';
import { useFranchise } from '../contexts/FranchiseContext';

export interface UseStaffReturn {
  staff: Staff[];
  loading: boolean;
  error: string | null;
  addStaff: (data: CreateStaffDTO) => Promise<void>;
  updateStaff: (data: UpdateStaffDTO) => Promise<void>;
  deactivateStaff: (staffId: string) => Promise<void>;
  reactivateStaff: (staffId: string) => Promise<void>;
  updateStaffStatus: (staffId: string, status: StatusType) => Promise<void>;
  refreshStaff: () => Promise<void>;
}

export const useStaff = (): UseStaffReturn => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { franchise } = useFranchise();

  const fetchStaff = async () => {
    if (!franchise) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await staffService.getStaffByFranchise(franchise.id);
      setStaff(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch staff');
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to real-time updates
  useSupabaseSubscription(
    {
      table: 'staff',
      filter: franchise ? `franchise_id=eq.${franchise.id}` : undefined,
      event: '*'
    },
    (payload) => {
      if (!payload.new) return;
      
      switch (payload.type) {
        case 'INSERT':
          setStaff((prev) => [...prev, staffService.convertToFrontendStaff(payload.new as DatabaseStaff)]);
          break;
        case 'UPDATE':
          setStaff((prev) => 
            prev.map((staff) => 
              payload.new && staff.id === payload.new.id
                ? staffService.convertToFrontendStaff(payload.new as DatabaseStaff)
                : staff
            )
          );
          break;
        case 'DELETE':
          setStaff((prev) => prev.filter((staff) => payload.old ? staff.id !== payload.old.id : true));
          break;
      }
    }
  );

  // Initial fetch
  useEffect(() => {
    if (franchise?.id) {
      fetchStaff();
    }
  }, [franchise?.id]);

  const addStaff = async (data: CreateStaffDTO): Promise<void> => {
    try {
      setError(null);
      await staffService.addStaff(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add staff member');
      throw err;
    }
  };

  const updateStaff = async (data: UpdateStaffDTO): Promise<void> => {
    try {
      setError(null);
      await staffService.updateStaff(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update staff member');
      throw err;
    }
  };

  const updateStaffStatus = async (staffId: string, status: StatusType): Promise<void> => {
    try {
      setError(null);
      await staffService.updateStaffStatus(staffId, status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update staff status');
      throw err;
    }
  };

  const deactivateStaff = async (staffId: string): Promise<void> => {
    return updateStaffStatus(staffId, 'inactive');
  };

  const reactivateStaff = async (staffId: string): Promise<void> => {
    return updateStaffStatus(staffId, 'active');
  };

  return {
    staff,
    loading,
    error,
    addStaff,
    updateStaff,
    deactivateStaff,
    reactivateStaff,
    updateStaffStatus,
    refreshStaff: fetchStaff
  };
};

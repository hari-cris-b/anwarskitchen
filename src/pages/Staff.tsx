import React, { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStaff } from '../hooks/useStaff';
import { Staff as StaffType, ROLE_PERMISSIONS } from '../types/staff';
import StaffTable from '../components/StaffTable';
import StaffForm from '../components/StaffForm';
import Modal from '../components/Modal';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';

const Staff: React.FC = () => {
  const { profile } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffType | undefined>();
  const {
    staff,
    loading,
    error,
    addStaff,
    updateStaff,
    deleteStaff,
    refreshStaff
  } = useStaff();

  const handleFormSubmit = useCallback(async (data: Partial<StaffType>) => {
    try {
      if ('id' in data && data.id) {
        await updateStaff(data);
      } else {
        const staffType = data.staff_type || 'staff';
        const staffTypePermissions = ROLE_PERMISSIONS[staffType];
        // Remove empty id and clean up data for new staff
        const { id: _id, created_at: _c, updated_at: _u, auth_id: _a, ...cleanData } = data;
        
        await addStaff({
          ...cleanData,
          franchise_id: profile?.franchise_id as string,
          staff_type: staffType,
          can_void_orders: staffType === 'admin' || staffType === 'manager',
          can_modify_menu: staffType === 'admin',
          can_manage_staff: staffType === 'admin',
          permissions: staffTypePermissions
        });
      }
      setIsModalOpen(false);
      setSelectedStaff(undefined);
      await refreshStaff();
    } catch (err) {
      console.error('Failed to save staff:', err);
      throw err;
    }
  }, [addStaff, updateStaff, refreshStaff, profile?.franchise_id]);

  const handleEditStaff = useCallback((staff: StaffType) => {
    setSelectedStaff(staff);
    setIsModalOpen(true);
  }, []);

  const handleDeactivateStaff = useCallback(async (staff: StaffType) => {
    try {
      await updateStaff({
        id: staff.id,
        status: 'inactive'
      });
      await refreshStaff();
    } catch (err) {
      console.error('Failed to deactivate staff:', err);
    }
  }, [updateStaff, refreshStaff]);

  const handleReactivateStaff = useCallback(async (staff: StaffType) => {
    try {
      await updateStaff({
        id: staff.id,
        status: 'active'
      });
      await refreshStaff();
    } catch (err) {
      console.error('Failed to reactivate staff:', err);
    }
  }, [updateStaff, refreshStaff]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedStaff(undefined);
  }, []);

  if (!profile?.franchise_id) {
    return <div>Unauthorized</div>;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600">
        Error loading staff: {error.message}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Staff Management</h1>
        <Button onClick={() => setIsModalOpen(true)}>Add Staff</Button>
      </div>

      <StaffTable
        staff={staff}
        onEdit={handleEditStaff}
        onDeactivate={handleDeactivateStaff}
        onReactivate={handleReactivateStaff}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedStaff ? 'Edit Staff' : 'Add Staff'}
      >
        <StaffForm
          initialData={selectedStaff}
          onSubmit={handleFormSubmit}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
};

export default Staff;

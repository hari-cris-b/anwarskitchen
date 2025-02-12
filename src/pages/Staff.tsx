import { useEffect, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFranchise } from '../contexts/FranchiseContext';
import { useStaff } from '../hooks/useStaff';
import { StaffTable } from '../components/StaffTable';
import { StaffTableSkeleton } from '../components/StaffTableSkeleton';
import { StaffForm } from '../components/StaffForm';
import { Staff, StaffFormData } from '../types/staff';
import Modal from '../components/Modal';
import ErrorAlert from '../components/ErrorAlert';

const defaultFormData = (franchiseId: string = ''): StaffFormData => ({
  franchise_id: franchiseId,
  full_name: '',
  role: 'staff',
  email: '',
  phone: '',
  shift: 'morning',
  hourly_rate: 15.00,
  status: 'active',
  joining_date: new Date().toISOString().split('T')[0],
  pin_code: ''
});

export const StaffPage = () => {
  const navigate = useNavigate();
  const { franchise } = useFranchise();
  const { staff, loading, error, addStaff, updateStaff, updateStaffStatus } = useStaff();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState<StaffFormData>(() => 
    defaultFormData(franchise?.id)
  );

  useEffect(() => {
    if (!franchise) {
      navigate('/');
      return;
    }
  }, [franchise, navigate]);

  // Handle staff selection for editing
  const handleSelectStaff = (staff: Staff) => {
    setSelectedStaff(staff);
    setFormData({
      franchise_id: staff.franchise_id,
      full_name: staff.full_name,
      role: staff.role,
      email: staff.email,
      phone: staff.phone || '',
      shift: staff.shift || 'morning',
      hourly_rate: staff.hourly_rate,
      status: staff.status,
      joining_date: staff.joining_date || new Date().toISOString().split('T')[0],
      pin_code: staff.pin_code || ''
    });
    setShowEditModal(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData(defaultFormData(franchise?.id));
    setSelectedStaff(null);
    setFormError(null);
  };

  // Handle add staff
  const handleAddStaff = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setFormError(null);
      if (!franchise) return;

      await addStaff({
        ...formData,
        franchise_id: franchise.id
      });

      setShowAddModal(false);
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add staff member');
    }
  };

  // Handle edit staff
  const handleEditStaff = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setFormError(null);
      if (!selectedStaff) return;

      await updateStaff({
        id: selectedStaff.id,
        full_name: formData.full_name,
        role: formData.role,
        email: formData.email,
        phone: formData.phone,
        shift: formData.shift,
        hourly_rate: formData.hourly_rate,
        status: formData.status,
        pin_code: formData.pin_code
      });

      setShowEditModal(false);
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update staff member');
    }
  };

  // Handle status updates
  const handleStatusUpdate = async (member: Staff, status: 'active' | 'inactive') => {
    try {
      await updateStaffStatus(member.id, status);
    } catch (err) {
      console.error(`Failed to ${status === 'active' ? 'reactivate' : 'deactivate'} staff:`, err);
    }
  };

  if (!franchise) {
    return null;
  }

  if (loading) {
    return <StaffTableSkeleton />;
  }

  if (error) {
    return <ErrorAlert message={error} />;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Staff Management</h1>
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add Staff Member
        </button>
      </div>

      <StaffTable
        staff={staff}
        onEdit={handleSelectStaff}
        onDeactivate={(member) => handleStatusUpdate(member, 'inactive')}
        onReactivate={(member) => handleStatusUpdate(member, 'active')}
      />

      <Modal
        title="Add Staff Member"
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
      >
        <StaffForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleAddStaff}
          onCancel={() => {
            setShowAddModal(false);
            resetForm();
          }}
          isEditing={false}
          error={formError}
        />
      </Modal>
      
      <Modal
        title="Edit Staff Member"
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          resetForm();
        }}
      >
        <StaffForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleEditStaff}
          onCancel={() => {
            setShowEditModal(false);
            resetForm();
          }}
          isEditing={true}
          error={formError}
        />
      </Modal>
    </div>
  );
};

export default StaffPage;

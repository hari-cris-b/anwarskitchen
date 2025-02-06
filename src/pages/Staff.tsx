// src/pages/Staff.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';

import { StaffMember, GetStaffWithAuthResponse, UserRole } from '../types';

interface EditModalProps {
  staff: StaffMember;
  onClose: () => void;
  onSave: (updatedStaff: StaffMember) => Promise<void>;
}

const EditModal: React.FC<EditModalProps> = ({ staff, onClose, onSave }) => {
  const [formData, setFormData] = useState(staff);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit Staff Member">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => setFormData({...formData, full_name: e.target.value})}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Role</label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({...formData, role: e.target.value as StaffMember['role']})}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="staff">Staff</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Phone</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Shift</label>
          <select
            value={formData.shift}
            onChange={(e) => setFormData({...formData, shift: e.target.value as StaffMember['shift']})}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="morning">Morning</option>
            <option value="evening">Evening</option>
            <option value="night">Night</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Joining Date</label>
          <input
            type="date"
            value={formData.joining_date}
            onChange={(e) => setFormData({...formData, joining_date: e.target.value})}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Salary</label>
          <input
            type="number"
            value={formData.salary}
            onChange={(e) => setFormData({...formData, salary: parseFloat(e.target.value)})}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-900">Active</label>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default function Staff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'staff' as StaffMember['role'],
    phone: '',
    password: '',
    is_active: true,
    joining_date: new Date().toISOString().split('T')[0],
    salary: 0,
    shift: 'morning' as StaffMember['shift']
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      // Get current user's franchise
      const { data: currentUser, error: currentUserError } = await supabase
        .from('profiles')
        .select('franchise_id')
        .single();

      if (currentUserError) throw currentUserError;
      if (!currentUser?.franchise_id) throw new Error('No franchise associated with current user');

      // Get all staff members in the same franchise
      const { data: profilesData, error: profilesError } = await supabase
        .rpc('get_staff_with_auth', { franchise_id_param: currentUser.franchise_id }) as {
          data: GetStaffWithAuthResponse[] | null,
          error: any
        };

      if (profilesError) throw profilesError;

      // Format the data
      if (profilesData) {
        const formattedData: StaffMember[] = profilesData.map(profile => ({
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email || '',
          role: profile.role as UserRole,
          phone: profile.phone || '',
          is_active: profile.is_active,
          joining_date: profile.joining_date || '',
          salary: profile.salary || 0,
          shift: profile.shift || 'morning',
          franchise_id: profile.franchise_id,
          last_sign_in_at: profile.last_sign_in_at || ''
        }));
        setStaff(formattedData);
      } else {
        setStaff([]);
      }
    } catch (error) {
      toast.error('Error fetching staff members');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Create auth user
      // Get current user's franchise
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('franchise_id')
        .single();

      if (userError) throw userError;
      if (!userData?.franchise_id) throw new Error('No franchise associated with current user');

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No user returned');

      // Create profile with franchise association
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: authData.user.id,
          full_name: formData.full_name,
          role: formData.role,
          phone: formData.phone,
          is_active: formData.is_active,
          joining_date: formData.joining_date,
          salary: formData.salary,
          shift: formData.shift,
          franchise_id: userData.franchise_id
        }]);

      if (profileError) throw profileError;

      toast.success('Staff member added successfully');
      setIsAddingStaff(false);
      fetchStaff();
    } catch (error) {
      toast.error('Error adding staff member');
    }
  };

  const handleUpdate = async (updatedStaff: StaffMember) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: updatedStaff.full_name,
          role: updatedStaff.role,
          phone: updatedStaff.phone,
          is_active: updatedStaff.is_active,
          joining_date: updatedStaff.joining_date,
          salary: updatedStaff.salary,
          shift: updatedStaff.shift
        })
        .eq('id', updatedStaff.id);

      if (error) throw error;
      toast.success('Staff member updated successfully');
      fetchStaff();
    } catch (error) {
      toast.error('Error updating staff member');
    }
  };

  const handlePasswordReset = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      toast.success('Password reset email sent');
    } catch (error) {
      toast.error('Error sending password reset email');
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!window.confirm('Are you sure you want to deactivate this staff member?')) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', staffId);

      if (error) throw error;
      toast.success('Staff member deactivated successfully');
      fetchStaff();
    } catch (error) {
      toast.error('Error deactivating staff member');
    }
  };

  const handleExportStaff = () => {
    const csvContent = staff.map(member => {
      return [
        member.full_name,
        member.email,
        member.role,
        member.phone,
        member.shift,
        member.is_active ? 'Active' : 'Inactive',
        member.joining_date,
        member.salary,
        member.last_sign_in_at ? new Date(member.last_sign_in_at).toLocaleDateString() : 'Never'
      ].join(',');
    });
    
    const headers = ['Name,Email,Role,Phone,Shift,Status,Joining Date,Salary,Last Login'].join(',');
    const csv = [headers, ...csvContent].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `staff-list-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleBulkStatusUpdate = async (setActive: boolean) => {
    if (!window.confirm(`Are you sure you want to ${setActive ? 'activate' : 'deactivate'} all selected staff members?`)) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: setActive })
        .in('id', selectedStaff);

      if (error) throw error;
      toast.success(`Selected staff members ${setActive ? 'activated' : 'deactivated'} successfully`);
      setSelectedStaff([]);
      fetchStaff();
    } catch (error) {
      toast.error(`Error ${setActive ? 'activating' : 'deactivating'} staff members`);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Staff Management</h1>
          <button
            onClick={() => setIsAddingStaff(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add Staff
          </button>
        </div>

        {/* Staff List */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Shift
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 bg-gray-50"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {staff.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedStaff.includes(member.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStaff([...selectedStaff, member.id]);
                          } else {
                            setSelectedStaff(selectedStaff.filter(id => id !== member.id));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{member.full_name}</div>
                        <div className="text-sm text-gray-500">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${member.role === 'admin' ? 'bg-purple-100 text-purple-800' : 
                        member.role === 'manager' ? 'bg-blue-100 text-blue-800' : 
                        'bg-green-100 text-green-800'}`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{member.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{member.shift}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${member.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {member.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {member.last_sign_in_at ? new Date(member.last_sign_in_at).toLocaleDateString() : 'Never'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setEditingStaff(member)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handlePasswordReset(member.email)}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        Reset
                      </button>
                      <button
                        onClick={() => handleDeleteStaff(member.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Deactivate
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bulk Actions and Export */}
        <div className="mt-6 flex justify-between items-center">
          <div className="flex space-x-4">
            <button
              onClick={() => handleBulkStatusUpdate(true)}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              disabled={selectedStaff.length === 0}
            >
              Activate Selected
            </button>
            <button
              onClick={() => handleBulkStatusUpdate(false)}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
              disabled={selectedStaff.length === 0}
            >
              Deactivate Selected
            </button>
          </div>
          <button
            onClick={handleExportStaff}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Export Staff List
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      {editingStaff && (
        <EditModal
          staff={editingStaff}
          onClose={() => setEditingStaff(null)}
          onSave={handleUpdate}
        />
      )}

      {/* Add Staff Modal */}
      {isAddingStaff && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddingStaff(false)}
          title="Add Staff Member"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value as StaffMember['role']})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Shift</label>
              <select
                value={formData.shift}
                onChange={(e) => setFormData({...formData, shift: e.target.value as StaffMember['shift']})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="morning">Morning</option>
                <option value="evening">Evening</option>
                <option value="night">Night</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Joining Date</label>
              <input
                type="date"
                value={formData.joining_date}
                onChange={(e) => setFormData({...formData, joining_date: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Salary</label>
              <input
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({...formData, salary: parseFloat(e.target.value)})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsAddingStaff(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Add Staff Member
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

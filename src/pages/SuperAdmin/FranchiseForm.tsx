import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import type { Database } from '../../types/database.types';

type Tables = Database['public']['Tables'];
type Franchise = Tables['franchises']['Row'];
type FranchiseInsert = Tables['franchises']['Insert'];
import { franchisorService } from '../../services/franchisorService';

interface FranchiseFormData extends Partial<FranchiseInsert> {
  admin_email: string;
  admin_name: string;
}

export default function FranchiseForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const defaultValues: Partial<FranchiseFormData> = {
    status: 'active',
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<FranchiseFormData>({
    defaultValues
  });

  React.useEffect(() => {
    if (isEditing && id) {
      loadFranchise(id);
    }
  }, [id]);

  const loadFranchise = async (franchiseId: string) => {
    try {
      const franchise = await franchisorService.getFranchiseById(franchiseId);
      if (franchise) {
        // Get the admin user for this franchise
        const staffMembers = await franchisorService.getStaffByFranchise(franchiseId);
        const admin = staffMembers.find(staff => staff.staff_type === 'admin');

        // Set form values
        reset({
          ...franchise,
          admin_name: admin?.full_name || '',
          admin_email: admin?.email || ''
        });
      }
    } catch (err) {
      console.error('Error loading franchise:', err);
      toast.error('Failed to load franchise details');
      navigate('/super-admin/franchises');
    }
  };

  const onSubmit = async (data: FranchiseFormData) => {
    try {
      const { admin_name, admin_email, ...franchiseData } = data;

      if (!isEditing) {
        const newFranchise: FranchiseInsert & { admin_name: string; admin_email: string } = {
          name: franchiseData.name,
          address: franchiseData.address,
          phone: franchiseData.phone,
          email: franchiseData.email,
          status: franchiseData.status || 'active',
          admin_name,
          admin_email
        };
        await franchisorService.createFranchise(newFranchise);
        toast.success('Franchise created successfully');
      } else if (id) {
        await franchisorService.updateFranchise(id, franchiseData);
        
        // Update admin user if it exists
        const staffMembers = await franchisorService.getStaffByFranchise(id);
        const admin = staffMembers.find(staff => staff.staff_type === 'admin');
        if (admin) {
          await franchisorService.updateStaffMember(admin.id, {
            full_name: admin_name,
            email: admin_email
          });
        }
        toast.success('Franchise updated successfully');
      }

      navigate('/super-admin/franchises');
    } catch (err) {
      console.error('Error saving franchise:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save franchise');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">
          {isEditing ? 'Edit Franchise' : 'Add New Franchise'}
        </h1>
        <p className="text-gray-600">
          {isEditing 
            ? 'Update franchise details and settings'
            : 'Create a new franchise in your network'
          }
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Franchise Details */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Franchise Details</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Franchise Name *
                </label>
                <input
                  type="text"
                  {...register('name', { required: 'Name is required' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Address *
                </label>
                <textarea
                  {...register('address', { required: 'Address is required' })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                />
                {errors.address && (
                  <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone *
                </label>
                <input
                  type="tel"
                  {...register('phone', { 
                    required: 'Phone is required',
                    pattern: {
                      value: /^[0-9]{10}$/,
                      message: 'Please enter a valid 10-digit phone number'
                    }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email *
                </label>
                <input
                  type="email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Please enter a valid email address'
                    }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
            </div>

            {/* Admin Details */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Admin Details</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Admin Name *
                </label>
                <input
                  type="text"
                  {...register('admin_name', { required: 'Admin name is required' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                />
                {errors.admin_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.admin_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Admin Email *
                </label>
                <input
                  type="email"
                  {...register('admin_email', {
                    required: 'Admin email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Please enter a valid email address'
                    }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                />
                {errors.admin_email && (
                  <p className="mt-1 text-sm text-red-600">{errors.admin_email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  {...register('status')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6">
            <button
              type="button"
              onClick={() => navigate('/super-admin/franchises')}
              className="px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Franchise' : 'Create Franchise'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
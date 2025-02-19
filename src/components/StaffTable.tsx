import React from 'react';
import { Staff, StaffStatus, UserRole } from '../types/staff';

interface StaffTableProps {
  staff: Staff[];
  onEdit?: (staff: Staff) => void;
  onDeactivate?: (staff: Staff) => void;
  onReactivate?: (staff: Staff) => void;
}

type StatusBadgeProps = {
  status: StaffStatus;
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusColor = (status: StaffStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'on_leave':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

type RoleBadgeProps = {
  role: UserRole;
};

const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'manager':
        return 'bg-indigo-100 text-indigo-800';
      case 'kitchen':
        return 'bg-yellow-100 text-yellow-800';
      case 'staff':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(role)}`}>
      {role.replace('_', ' ')}
    </span>
  );
};

export const StaffTable: React.FC<StaffTableProps> = ({
  staff,
  onEdit,
  onDeactivate,
  onReactivate
}) => {
  return (
    <div className="overflow-x-auto relative">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Email
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Role
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {staff.map((member) => (
            <tr key={member.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{member.full_name}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{member.email}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <RoleBadge role={member.staff_type} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <StatusBadge status={member.status} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex space-x-4">
                  <button
                    onClick={() => onEdit?.(member)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    Edit
                  </button>
                  {member.status === 'active' ? (
                    <button
                      onClick={() => onDeactivate?.(member)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => onReactivate?.(member)}
                      className="text-green-600 hover:text-green-900"
                    >
                      Reactivate
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StaffTable;

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authLogger } from '../../utils/authLogger';
import { DatabaseError } from '../../types/errors';

const SuperAdminProfile: React.FC = () => {
  const { profile, updatePassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      setLoading(true);
      await updatePassword(newPassword);
      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      authLogger.info('SuperAdminProfile', 'Password updated successfully');
    } catch (err) {
      console.error('Password update error:', err);
      if (err instanceof DatabaseError) {
        setError(err.message);
      } else {
        setError('Failed to update password');
      }
      authLogger.error('SuperAdminProfile', 'Password update failed', { error: err });
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Super Admin Profile
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Profile information and account settings
          </p>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Full name</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {profile.full_name}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Email address</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {profile.email}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Role</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                Super Administrator
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Password Update Form */}
      <div className="mt-6 bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Update Password
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Ensure your account is secure by using a strong password.</p>
          </div>
          <form className="mt-5 sm:flex flex-col sm:items-start" onSubmit={handlePasswordUpdate}>
            <div className="w-full sm:max-w-xs mb-4">
              <label htmlFor="new-password" className="sr-only">
                New Password
              </label>
              <input
                type="password"
                name="new-password"
                id="new-password"
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="w-full sm:max-w-xs mb-4">
              <label htmlFor="confirm-password" className="sr-only">
                Confirm New Password
              </label>
              <input
                type="password"
                name="confirm-password"
                id="confirm-password"
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              } inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
          {error && (
            <div className="mt-2 text-sm text-red-600">{error}</div>
          )}
          {success && (
            <div className="mt-2 text-sm text-green-600">
              Password updated successfully
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminProfile;
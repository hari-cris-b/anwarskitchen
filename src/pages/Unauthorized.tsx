import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authLogger } from '../utils/authLogger';

const Unauthorized = () => {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const from = location.state?.from;

  useEffect(() => {
    authLogger.warn('Unauthorized', 'Access denied page viewed', {
      userType: profile?.staff_type,
      attemptedPath: from?.pathname,
      currentPath: location.pathname,
      permissions: profile?.permissions,
      franchiseId: profile?.franchise_id
    });
  }, [profile, from, location]);

  const handleSignOut = async () => {
    try {
      authLogger.info('Unauthorized', 'User signing out from unauthorized page', {
        userType: profile?.staff_type,
        attemptedPath: from?.pathname
      });
      await signOut();
      navigate('/login');
    } catch (error) {
      authLogger.error('Unauthorized', 'Error signing out', { error });
    }
  };

  const getErrorMessage = () => {
    if (!profile) {
      return 'You need to be logged in to access this page.';
    }

    if (profile.staff_type === 'super_admin') {
      if (from?.pathname.startsWith('/pos')) {
        return 'Super admins cannot access POS features. Please use the admin panel.';
      }
      return 'You do not have permission to access this area. Please use the super admin panel.';
    }

    if (!profile.franchise_id) {
      return 'Your account is not associated with any franchise. Please contact support.';
    }

    // Check specific permission-based scenarios
    if (from?.pathname === '/menu' && !profile.permissions?.can_manage_menu) {
      return 'You do not have permission to manage the menu. Please contact your administrator.';
    }
    if (from?.pathname === '/staff' && !profile.permissions?.can_manage_staff) {
      return 'You do not have permission to manage staff. Please contact your administrator.';
    }
    if (from?.pathname === '/kitchen' && !profile.permissions?.can_access_kitchen) {
      return 'You do not have permission to access the kitchen area. Please contact your administrator.';
    }
    if (from?.pathname === '/reports' && !profile.permissions?.can_access_reports) {
      return 'You do not have permission to access reports. Please contact your administrator.';
    }
    if (from?.pathname === '/pos' && !profile.permissions?.can_access_pos) {
      return 'You do not have permission to access the POS system. Please contact your administrator.';
    }

    return 'You do not have permission to access this page. If you believe this is an error, please contact your administrator.';
  };

  const getPrimaryAction = () => {
    if (!profile) {
      return {
        text: 'Sign In',
        to: '/login',
        variant: 'primary'
      };
    }

    if (profile.staff_type === 'super_admin') {
      return {
        text: 'Go to Admin Panel',
        to: '/super-admin/dashboard',
        variant: 'primary'
      };
    }

    if (profile.staff_type === 'admin') {
      return {
        text: 'Go to Dashboard',
        to: '/',
        variant: 'primary'
      };
    }

    return {
      text: 'Return to Home',
      to: '/',
      variant: 'primary'
    };
  };

  const primaryAction = getPrimaryAction();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
          <svg
            className="h-6 w-6 text-red-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Access Denied
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 max-w-md mx-auto">
          {getErrorMessage()}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Link
                to={primaryAction.to}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {primaryAction.text}
              </Link>

              {profile && (
                <button
                  onClick={handleSignOut}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Sign out and try another account
                </button>
              )}

              {from && from.pathname !== '/' && (
                <button
                  onClick={() => navigate(-1)}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Go back to previous page
                </button>
              )}
            </div>

            <div className="mt-6">
              <p className="text-xs text-center text-gray-500">
                If you continue to experience issues, please contact support
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;

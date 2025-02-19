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
      currentPath: location.pathname
    });
  }, [profile, from, location]);

  const handleSignOut = async () => {
    try {
      authLogger.info('Unauthorized', 'User signing out from unauthorized page');
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

    if (profile.staff_type === 'super_admin' && from?.pathname.startsWith('/pos')) {
      return 'Super admins cannot access POS features. Please use the admin panel.';
    }

    if (!profile.franchise_id && profile.staff_type !== 'super_admin') {
      return 'Your account is not associated with any franchise. Please contact support.';
    }

    return 'You do not have permission to access this page. If you believe this is an error, please contact your administrator.';
  };

  const getActionButton = () => {
    if (!profile) {
      return (
        <Link
          to="/login"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Sign In
        </Link>
      );
    }

    if (profile.staff_type === 'super_admin') {
      return (
        <Link
          to="/super-admin/franchises"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Go to Admin Panel
        </Link>
      );
    }

    return (
      <button
        onClick={handleSignOut}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Sign Out
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
          <svg
            className="h-6 w-6 text-red-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
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
        <p className="mt-2 text-center text-sm text-gray-600">
          {getErrorMessage()}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div>
              <div className="flex flex-col items-center justify-center space-y-4">
                {getActionButton()}

                <Link
                  to="/"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Return to Home
                </Link>

                {profile && (
                  <button
                    onClick={handleSignOut}
                    className="text-sm font-medium text-gray-500 hover:text-gray-700"
                  >
                    Sign out and try another account
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;

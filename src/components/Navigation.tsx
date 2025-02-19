import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authLogger } from '../utils/authLogger';

const Navigation: React.FC = () => {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const isSuperAdmin = profile?.staff_type === 'super_admin';

  const handleSignOut = async () => {
    try {
      authLogger.info('Navigation', 'User signing out', { 
        userType: profile?.staff_type 
      });
      await signOut();
    } catch (error) {
      authLogger.error('Navigation', 'Error signing out', { error });
    }
  };

  // Don't show navigation on login or unauthorized pages
  if (['/login', '/unauthorized', '/create-account'].includes(location.pathname)) {
    return null;
  }

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
                {/* Logo/Brand */}
                <img src="/icon.png" alt="Logo" className="h-8 w-8 mr-2" />
              <Link to="/" className="text-xl font-bold text-indigo-600">
                {isSuperAdmin ? 'Admin Portal' : 'CustoDesk'}
              </Link>
            </div>

            {/* Super Admin Navigation */}
            {isSuperAdmin && (
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  to="/super-admin/franchises"
                  className={`${
                    location.pathname.startsWith('/super-admin/franchises')
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  Franchises
                </Link>
                <Link
                  to="/super-admin/dashboard"
                  className={`${
                    location.pathname.startsWith('/super-admin/dashboard')
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  Dashboard
                </Link>
              </div>
            )}

            {/* Staff Navigation */}
            {!isSuperAdmin && profile && (
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link to="/"
                  className={`${
                    location.pathname === '/' || location.pathname === '/pos'
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  POS
                </Link>
                <Link
                  to="/orders"
                  className={`${
                    location.pathname === '/orders'
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  Orders
                </Link>
                <Link
                  to="/kitchen"
                  className={`${
                    location.pathname === '/kitchen'
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  Kitchen
                </Link>
                <Link
                  to="/menu"
                  className={`${
                    location.pathname === '/menu'
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  Menu
                </Link>
                <Link
                  to="/reports"
                  className={`${
                    location.pathname === '/reports'
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  Reports
                </Link>
                <Link
                  to="/staff"
                  className={`${
                    location.pathname === '/staff'
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  Staff
                </Link>
                <Link
                  to="/settings"
                  className={`${
                    location.pathname === '/settings'
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  Settings
                </Link>
              </div>
            )}
          </div>

          {/* Right side navigation */}
          <div className="flex items-center">
            {profile && (
              <>
                <div className="hidden md:flex md:items-center md:ml-6">
                  <Link
                    to="/profile"
                    className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    {profile.full_name}
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="ml-3 px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700"
                  >
                    Sign Out
                  </button>
                </div>

                {/* Mobile menu button */}
                <div className="flex items-center md:hidden">
                  <button
                    type="button"
                    className="p-2 rounded-md text-gray-500 hover:text-gray-700"
                    aria-controls="mobile-menu"
                    aria-expanded="false"
                  >
                    <span className="sr-only">Open main menu</span>
                    <svg
                      className="h-6 w-6"
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
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="md:hidden" id="mobile-menu">
        {isSuperAdmin ? (
          <div className="pt-2 pb-3 space-y-1">
            <Link
              to="/super-admin/franchises"
              className={`${
                location.pathname.startsWith('/super-admin/franchises')
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
              } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
            >
              Franchises
            </Link>
            <Link
              to="/super-admin/dashboard"
              className={`${
                location.pathname.startsWith('/super-admin/dashboard')
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
              } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
            >
              Dashboard
            </Link>
          </div>
        ) : (
          <div className="pt-2 pb-3 space-y-1">
            <Link
              to="/"
              className={`${
                location.pathname === '/' || location.pathname === '/pos'
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
              } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
            >
              POS
            </Link>
            <Link
              to="/menu"
              className={`${
                location.pathname === '/menu'
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
              } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
            >
              Menu
            </Link>
            <Link
              to="/orders"
              className={`${
                location.pathname === '/orders'
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
              } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
            >
              Orders
            </Link>
            <Link
              to="/kitchen"
              className={`${
                location.pathname === '/kitchen'
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
              } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
            >
              Kitchen
            </Link>
            <Link
              to="/reports"
              className={`${
                location.pathname === '/reports'
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
              } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
            >
              Reports
            </Link>
            <Link
              to="/staff"
              className={`${
                location.pathname === '/staff'
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
              } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
            >
              Staff
            </Link>
            <Link
              to="/settings"
              className={`${
                location.pathname === '/settings'
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
              } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
            >
              Settings
            </Link>
          </div>
        )}

        {profile && (
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="flex items-center px-4">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-indigo-600 font-medium">
                    {profile.full_name.charAt(0)}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <div className="text-base font-medium text-gray-800">
                  {profile.full_name}
                </div>
                <div className="text-sm font-medium text-gray-500">
                  {profile.email}
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <Link
                to="/profile"
                className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              >
                Profile
              </Link>
              <button
                onClick={handleSignOut}
                className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;

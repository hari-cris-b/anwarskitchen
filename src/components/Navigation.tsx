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

  const navLinkStyle = (isActive: boolean) => `${
    isActive
      ? 'border-indigo-500 text-gray-900'
      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`;

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <img src="/icon.png" alt="Logo" className="h-8 w-8 mr-2" />
              <Link to="/" className="text-xl font-bold text-indigo-600">
                {isSuperAdmin ? 'Admin Portal' : 'CustoDesk'}
              </Link>
            </div>

            {/* Main Navigation */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {isSuperAdmin ? (
                <>
                  <Link to="/super-admin"
                    className={navLinkStyle(location.pathname === '/super-admin')}
                  >
                    Dashboard
                  </Link>
                  <Link to="/super-admin/franchises"
                    className={navLinkStyle(location.pathname.startsWith('/super-admin/franchises'))}
                  >
                    Franchises
                  </Link>
                  <Link to="/super-admin/reports"
                    className={navLinkStyle(location.pathname === '/super-admin/reports')}
                  >
                    Reports
                  </Link>
                  <Link to="/super-admin/settings"
                    className={navLinkStyle(location.pathname === '/super-admin/settings')}
                  >
                    Settings
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/"
                    className={navLinkStyle(location.pathname === '/' || location.pathname === '/pos')}
                  >
                    POS
                  </Link>
                  <Link to="/orders"
                    className={navLinkStyle(location.pathname === '/orders')}
                  >
                    Orders
                  </Link>
                  <Link to="/kitchen"
                    className={navLinkStyle(location.pathname === '/kitchen')}
                  >
                    Kitchen
                  </Link>
                  <Link to="/menu"
                    className={navLinkStyle(location.pathname === '/menu')}
                  >
                    Menu
                  </Link>
                  <Link to="/reports"
                    className={navLinkStyle(location.pathname === '/reports')}
                  >
                    Reports
                  </Link>
                  <Link to="/staff"
                    className={navLinkStyle(location.pathname === '/staff')}
                  >
                    Staff
                  </Link>
                  <Link to="/settings"
                    className={navLinkStyle(location.pathname === '/settings')}
                  >
                    Settings
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Right side navigation */}
          <div className="flex items-center">
            {profile && (
              <>
                <div className="hidden md:flex md:items-center md:ml-6">
                  <Link
                    to={isSuperAdmin ? "/super-admin/profile" : "/profile"}
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
                      className="block h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
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
        <div className="pt-2 pb-3 space-y-1">
          {isSuperAdmin ? (
            <>
              <Link to="/super-admin"
                className={`${
                  location.pathname === '/super-admin'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
              >
                Dashboard
              </Link>
              <Link to="/super-admin/franchises"
                className={`${
                  location.pathname.startsWith('/super-admin/franchises')
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
              >
                Franchises
              </Link>
              <Link to="/super-admin/reports"
                className={`${
                  location.pathname === '/super-admin/reports'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
              >
                Reports
              </Link>
            </>
          ) : (
            <>
              <Link to="/"
                className={`${
                  location.pathname === '/' || location.pathname === '/pos'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
              >
                POS
              </Link>
              <Link to="/menu"
                className={`${
                  location.pathname === '/menu'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
              >
                Menu
              </Link>
              <Link to="/orders"
                className={`${
                  location.pathname === '/orders'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
              >
                Orders
              </Link>
              <Link to="/kitchen"
                className={`${
                  location.pathname === '/kitchen'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
              >
                Kitchen
              </Link>
            </>
          )}
        </div>

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
                to={isSuperAdmin ? "/super-admin/profile" : "/profile"}
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

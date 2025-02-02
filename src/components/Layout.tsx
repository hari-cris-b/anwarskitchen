import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFranchise } from '../contexts/FranchiseContext';
import { LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { settings } = useFranchise();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center py-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <h1 className="text-lg font-semibold text-gray-900">
                {settings?.name || 'POS System'}
              </h1>
              <nav className="ml-10 space-x-4">
                <Link
                  to="/"
                  className={`${
                    isActive('/') 
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-500 hover:text-gray-900'
                  } px-3 py-2 rounded-md text-sm font-medium`}
                >
                  Orders
                </Link>
                <Link
                  to="/kitchen"
                  className={`${
                    isActive('/kitchen')
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-500 hover:text-gray-900'
                  } px-3 py-2 rounded-md text-sm font-medium`}
                >
                  Kitchen
                </Link>
                <Link
                  to="/settings"
                  className={`${
                    isActive('/settings')
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-500 hover:text-gray-900'
                  } px-3 py-2 rounded-md text-sm font-medium`}
                >
                  Settings
                </Link>
              </nav>
            </div>
            {profile && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  {profile.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

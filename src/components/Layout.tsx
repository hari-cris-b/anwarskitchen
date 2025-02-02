import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Store,
  ChefHat,
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Receipt,
  ClipboardList
} from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  const menuItems = [
    { path: '/pos', label: 'POS', icon: Store, roles: ['staff', 'manager', 'admin'] },
    { path: '/kitchen', label: 'Kitchen', icon: ChefHat, roles: ['staff', 'manager', 'admin'] },
    { path: '/orders', label: 'Orders', icon: ClipboardList, roles: ['staff', 'manager', 'admin'] },
    { path: '/bills', label: 'Bills', icon: Receipt, roles: ['staff', 'manager', 'admin'] },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['manager', 'admin'] },
    { path: '/users', label: 'Users', icon: Users, roles: ['admin'] },
    { path: '/settings', label: 'Settings', icon: Settings, roles: ['admin'] },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-4">
          <div className="flex items-center space-x-2">
            <Store className="h-8 w-8 text-orange-600" />
            <span className="text-xl font-bold text-gray-900">Restaurant POS</span>
          </div>
        </div>
        
        <nav className="mt-8">
          <div className="px-4 space-y-1">
            {menuItems
              .filter(item => item.roles.includes(profile?.role || ''))
              .map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive(item.path)
                      ? 'bg-orange-100 text-orange-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.label}
                </Link>
              ))}

            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sign Out
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

interface NavItem {
  path: string;
  label: string;
  roles: UserRole[];
  icon: string;
}

const navItems: NavItem[] = [
  {
    path: '/pos',
    label: 'POS',
    roles: ['staff', 'manager', 'admin'],
    icon: '💰'
  },
  {
    path: '/kitchen',
    label: 'Kitchen',
    roles: ['staff', 'manager', 'admin'],
    icon: '🍳'
  },
  {
    path: '/orders',
    label: 'Orders',
    roles: ['staff', 'manager', 'admin'],
    icon: '📋'
  },
  {
    path: '/menu',
    label: 'Menu Management',
    roles: ['manager', 'admin'],
    icon: '🍽️'
  },
  {
    path: '/reports',
    label: 'Reports',
    roles: ['manager', 'admin'],
    icon: '📊'
  },
  {
    path: '/settings',
    label: 'Settings',
    roles: ['admin'],
    icon: '⚙️'
  },
  {
    path: '/staff',
    label: 'Staff Management',
    roles: ['admin'],
    icon: '👥'
  }
];

export default function Navigation() {
  const { profile } = useAuth();
  const location = useLocation();

  if (!profile) return null;

  const allowedNavItems = navItems.filter(item => item.roles.includes(profile.role));

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold text-orange-600">AK POS</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {allowedNavItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    location.pathname === item.path
                      ? 'border-orange-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="relative inline-block text-left">
                <div className="flex items-center">
                  <span className="text-sm text-gray-700 mr-2">
                    {profile.full_name || profile.email}
                  </span>
                  <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800 capitalize">
                    {profile.role}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="sm:hidden">
        <div className="pt-2 pb-3 space-y-1">
          {allowedNavItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-3 py-2 text-base font-medium ${
                location.pathname === item.path
                  ? 'bg-orange-50 border-l-4 border-orange-500 text-orange-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:border-l-4 hover:border-gray-300'
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

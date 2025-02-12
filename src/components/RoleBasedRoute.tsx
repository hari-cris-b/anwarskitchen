import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/staff';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export default function RoleBasedRoute({ children, allowedRoles }: RoleBasedRouteProps) {
  const { profile } = useAuth();

  if (!profile) {
    console.log('No profile found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(profile.role)) {
    console.log(`Access denied for role ${profile.role}`, { allowedRoles });
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
